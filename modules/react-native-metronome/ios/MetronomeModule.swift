import ExpoModulesCore
import AVFoundation

public class MetronomeModule: Module {
  private var audioEngine = AVAudioEngine()
  private var playerNode = AVAudioPlayerNode()
  private var speechPlayerNode = AVAudioPlayerNode()
  // 左右の手で定位を変えるため、スネアは手ごとに別のサンプラーで鳴らす（ノードの pan はそのノードの音すべてに効く）
  private let rightSampler = AVAudioUnitSampler()
  private let leftSampler = AVAudioUnitSampler()
  // ループ再生するスネアの打点。beat は小節頭からの拍位置、sec は拍位置からの秒ずれ（装飾音の前打ちなど）
  // pan は -1（左）〜 1（右）。負なら左手用、それ以外は右手用のサンプラーで鳴らす
  private var snareNotes: [(beat: Double, sec: Double, velocity: UInt8, pan: Float)] = []
  private var snareLoopBeats: Double = 0
  // 0〜1 の音量（ゲイン）。クリックはバッファの振幅、スネアはサンプラーの出力音量に掛ける
  private var clickVolume: Float = 1
  private var snareVolume: Float = 1
  private var timer: DispatchSourceTimer?
  // タイマーの処理と開始・停止を同じ直列キューで行い、停止直後に古いタイマーが拍を進めないようにする
  private let timerQueue = DispatchQueue(label: "react-native-metronome.timer", qos: .userInteractive)
  // 再生を始めるたびに増やす。onBeat に載せて、JS 側が前の再生の拍を捨てられるようにする
  private var session: Int = 0
  private var bpm: Double = 120
  private var isPlaying = false

  private var beatCounter: Int = 0
  private var subdivCount: Int = 0
  private var beatsPerMeasure: Int = 4
  private var countInActive: Bool = false
  private let countWords = ["one", "two", "three", "four", "five"]
  private let speechAdvance: Double = 0.05

  private var soundFontURL: URL?
  private var drumProgram: UInt8 = 32

  // 事前レンダリング済み音声バッファ（index 0-4 = "one"-"five"）
  private var speechBuffers: [Int: AVAudioPCMBuffer] = [:]
  private var timebaseInfo = mach_timebase_info_data_t()

  // AVAudioTime 計算用に 44100Hz mono フォーマットを固定
  private let speechFormat = AVAudioFormat(standardFormatWithSampleRate: 44100, channels: 1)!

  public func definition() -> ModuleDefinition {
    Name("Metronome")
    Events("onBeat")

    Function("start") { [weak self] (bpm: Double) in
      self?.startMetronome(bpm: bpm, countIn: false)
    }
    Function("startWithCountIn") { [weak self] (bpm: Double) -> Int in
      self?.startMetronome(bpm: bpm, countIn: true) ?? 0
    }
    Function("stop") { [weak self] in
      self?.stopMetronome()
    }
    Function("setBpm") { [weak self] (bpm: Double) in
      self?.updateBpm(bpm: bpm)
    }
    Function("preWarmSpeech") { [weak self] in
      self?.prerenderSpeech()
    }
    Function("loadDrumSoundFont") { [weak self] (uri: String) in
      self?.loadDrumSoundFont(uri: uri)
    }
    // 拍単位で持つので BPM を変えてもループの位相が崩れない。差し替えは次の 16 分から反映される
    Function("setSnareLoop") { [weak self] (notes: [[String: Double]], loopBeats: Double) in
      self?.snareNotes = notes.map { note in
        (beat: note["beat"] ?? 0,
         sec: note["sec"] ?? 0,
         velocity: UInt8(clamping: Int(note["velocity"] ?? 100)),
         pan: Float(min(max(note["pan"] ?? 0, -1), 1)))
      }
      self?.snareLoopBeats = loopBeats.isFinite ? max(0, loopBeats) : 0
    }
    Function("setClickVolume") { [weak self] (volume: Double) in
      self?.clickVolume = Float(volume.isFinite ? min(max(volume, 0), 1) : 1)
    }
    Function("setSnareVolume") { [weak self] (volume: Double) in
      guard let self = self else { return }
      self.snareVolume = Float(volume.isFinite ? min(max(volume, 0), 1) : 1)
      self.rightSampler.volume = self.snareVolume
      self.leftSampler.volume = self.snareVolume
    }
    Function("setDrumKit") { [weak self] (program: Int) in
      self?.setDrumKit(program: program)
    }
    Function("setBeatsPerMeasure") { [weak self] (n: Int) in
      self?.beatsPerMeasure = max(1, n)
    }
  }

  // AVSpeechSynthesizer.write() で "one"-"five" を PCM バッファに事前レンダリング。
  // 44100Hz に変換して AVAudioPlayerNode で sample-accurate 発火できるようにする。
  private func prerenderSpeech() {
    mach_timebase_info(&timebaseInfo)
    DispatchQueue.global(qos: .userInitiated).async { [weak self] in
      guard let self = self else { return }
      let synth = AVSpeechSynthesizer()
      for (i, word) in self.countWords.enumerated() {
        let sema = DispatchSemaphore(value: 0)
        var chunks: [AVAudioPCMBuffer] = []
        let u = AVSpeechUtterance(string: word)
        u.voice = AVSpeechSynthesisVoice(language: "en-US")
        u.rate = 0.52; u.volume = 1.0
        synth.write(u) { buffer in
          if let pcm = buffer as? AVAudioPCMBuffer {
            if pcm.frameLength > 0 { chunks.append(pcm) } else { sema.signal() }
          } else { sema.signal() }
        }
        sema.wait()
        self.speechBuffers[i] = Self.mergeAndConvert(chunks, to: self.speechFormat)
      }
    }
  }

  // チャンクを結合し targetFormat（44100Hz）へ変換
  private static func mergeAndConvert(_ chunks: [AVAudioPCMBuffer],
                                       to targetFormat: AVAudioFormat) -> AVAudioPCMBuffer? {
    guard let first = chunks.first else { return nil }
    let totalFrames = chunks.reduce(AVAudioFrameCount(0)) { $0 + $1.frameLength }
    guard let merged = AVAudioPCMBuffer(pcmFormat: first.format, frameCapacity: totalFrames) else { return nil }
    merged.frameLength = totalFrames
    var offset = AVAudioFrameCount(0)
    for chunk in chunks {
      for ch in 0..<Int(first.format.channelCount) {
        if let dst = merged.floatChannelData?[ch], let src = chunk.floatChannelData?[ch] {
          memcpy(dst.advanced(by: Int(offset)), src, Int(chunk.frameLength) * MemoryLayout<Float>.size)
        }
      }
      offset += chunk.frameLength
    }
    guard first.format.sampleRate != targetFormat.sampleRate,
          let converter = AVAudioConverter(from: first.format, to: targetFormat) else { return merged }
    let ratio = targetFormat.sampleRate / first.format.sampleRate
    let targetFrames = AVAudioFrameCount(Double(merged.frameLength) * ratio)
    guard let converted = AVAudioPCMBuffer(pcmFormat: targetFormat, frameCapacity: targetFrames) else { return merged }
    var inputDone = false
    var convError: NSError?
    converter.convert(to: converted, error: &convError) { _, statusPtr in
      if inputDone { statusPtr.pointee = .endOfStream; return nil }
      inputDone = true; statusPtr.pointee = .haveData; return merged
    }
    return convError == nil ? converted : nil
  }

  private func loadDrumSoundFont(uri: String) {
    guard let url = URL(string: uri) else { return }
    soundFontURL = url
    applySoundFont(url: url)
  }

  private func setDrumKit(program: Int) {
    drumProgram = UInt8(clamping: program)
    guard let url = soundFontURL else { return }
    applySoundFont(url: url)
  }

  private func applySoundFont(url: URL) {
    for sampler in [rightSampler, leftSampler] {
      do {
        try sampler.loadSoundBankInstrument(at: url, program: drumProgram, bankMSB: 0x78, bankLSB: 0)
      } catch {
        try? sampler.loadSoundBankInstrument(at: url, program: drumProgram, bankMSB: 0x00, bankLSB: 0)
      }
    }
  }

  // bpmがNaN/Infinite/極端な値の場合にInt変換でクラッシュ（fatal trap）するのを防ぐ
  private func subdivInterval(forBpm bpm: Double) -> DispatchTimeInterval {
    let safeBpm = bpm.isFinite ? min(max(bpm, 20.0), 400.0) : 120.0
    return .microseconds(Int(15_000_000 / safeBpm))
  }

  /** 再生を始め、その再生のセッション番号を返す */
  @discardableResult
  private func startMetronome(bpm: Double, countIn: Bool) -> Int {
    stopMetronome()
    let current: Int = timerQueue.sync {
      session += 1
      self.bpm = bpm; beatCounter = 0; subdivCount = 0
      countInActive = countIn; isPlaying = true
      return session
    }
    do {
      let s = AVAudioSession.sharedInstance()
      try s.setCategory(.playback, mode: .default); try s.setActive(true)
    } catch { return current }
    setupAudioEngine()
    let subInterval = subdivInterval(forBpm: bpm)
    let t = DispatchSource.makeTimerSource(queue: timerQueue)
    t.schedule(deadline: .now(), repeating: subInterval, leeway: .microseconds(100))
    t.setEventHandler { [weak self] in
      guard let self = self, self.isPlaying, self.session == current else { return }
      self.playSubdiv()
    }
    t.resume(); timer = t
    return current
  }

  private func updateBpm(bpm: Double) {
    self.bpm = bpm
    guard isPlaying, let t = timer else { return }
    let subInterval = subdivInterval(forBpm: bpm)
    t.schedule(deadline: .now(), repeating: subInterval, leeway: .microseconds(100))
  }

  private func stopMetronome() {
    timerQueue.sync {
      timer?.cancel(); timer = nil
      isPlaying = false
    }
    if audioEngine.isRunning { audioEngine.stop() }
  }

  private func setupAudioEngine() {
    audioEngine = AVAudioEngine()
    playerNode = AVAudioPlayerNode()
    speechPlayerNode = AVAudioPlayerNode()
    audioEngine.attach(playerNode)
    audioEngine.attach(speechPlayerNode)
    audioEngine.attach(rightSampler)
    audioEngine.attach(leftSampler)
    let fmt = AVAudioFormat(standardFormatWithSampleRate: 44100, channels: 1)!
    audioEngine.connect(playerNode, to: audioEngine.mainMixerNode, format: fmt)
    audioEngine.connect(speechPlayerNode, to: audioEngine.mainMixerNode, format: speechFormat)
    audioEngine.connect(rightSampler, to: audioEngine.mainMixerNode, format: nil)
    audioEngine.connect(leftSampler, to: audioEngine.mainMixerNode, format: nil)
    rightSampler.volume = snareVolume
    leftSampler.volume = snareVolume
    try? audioEngine.start()
    playerNode.play()
    speechPlayerNode.play()
    if let url = soundFontURL { applySoundFont(url: url) }
  }

  private func playSubdiv() {
    subdivCount += 1
    let isBeat = (subdivCount - 1) % 4 == 0
    if isBeat {
      beatCounter += 1
      // beat は再生開始からの通し番号（1 始まり）。カウントインの拍も含む
      sendEvent("onBeat", [
        "session": session,
        "beat": beatCounter,
        "countInBeats": countInActive ? beatsPerMeasure * 2 : 0,
      ])
      // カウントインも本編もbeatsPerMeasure拍ごとの1拍目（beatCounter ≡ 1 mod beatsPerMeasure）を常にアクセント
      let isDownbeat = (beatCounter - 1) % beatsPerMeasure == 0
      // カウントイン中はクリックの音量を絞っていても聞こえるようにする（入りの合図が無くなるため）
      let inCountIn = countInActive && subdivCount <= countInSubdivs
      let gain = inCountIn ? max(clickVolume, Self.countInMinVolume) : clickVolume
      if gain > 0 {
        playClickSound(accented: isDownbeat, gain: gain)
      }
      scheduleCountInSpeech()
    }
    if countInActive && subdivCount > countInSubdivs {
      fireSnareForSubdiv(musicSubdiv: subdivCount - countInSubdivs)
    }
  }

  // カウントインはbeatsPerMeasure拍のクリックのみ(3/4ならtan tan tan、4/4ならtan tan tan tan、5/4なら5回)
  // に続けて、beatsPerMeasure拍ぶんの発話(3/4ならone two three、4/4ならone two three four、5/4ならone〜five)。
  // 合計はbeatsPerMeasure*2拍(クリックのみ1小節+発話1小節)。
  private var countInSubdivs: Int { beatsPerMeasure * 2 * 4 }

  // 事前レンダリング済みバッファを AVAudioTime で sample-accurate スケジュール。
  // mach_absolute_time ベースなので asyncAfter / AVSpeechSynthesizer 起動遅延が不要。
  // ※delaySecondsが約1拍分あるため、実際に発話が聞こえるのは呼び出しの1拍後。
  // そのため呼び出し自体はbeatsPerMeasure拍目(1拍前倒し)で行う。
  private func scheduleCountInSpeech() {
    guard countInActive && beatCounter >= beatsPerMeasure && beatCounter <= beatsPerMeasure * 2 - 1 else { return }
    guard let buffer = speechBuffers[beatCounter - beatsPerMeasure] else { return }
    let delaySeconds = max(0.0, 60.0 / bpm - speechAdvance)
    let nanos = UInt64(delaySeconds * 1_000_000_000)
    let ticks = timebaseInfo.denom > 0
      ? nanos * UInt64(timebaseInfo.denom) / UInt64(timebaseInfo.numer)
      : nanos
    let targetTime = AVAudioTime(hostTime: mach_absolute_time() + ticks)
    speechPlayerNode.scheduleBuffer(buffer, at: targetTime, options: [], completionHandler: nil)
  }

  // musicSubdiv 番目の 16 分（拍位置 [ (n-1)/4, n/4 )）に入る打点を、ループを展開しながら発音予約する
  private func fireSnareForSubdiv(musicSubdiv: Int) {
    let loopBeats = snareLoopBeats
    let notes = snareNotes
    guard !notes.isEmpty, loopBeats > 0 else { return }
    let secPerBeat = 60.0 / bpm
    let windowStart = Double(musicSubdiv - 1) / 4.0
    let windowEnd = Double(musicSubdiv) / 4.0

    for note in notes {
      let position = note.beat + note.sec / secPerBeat
      // windowStart 以上になる最初のループ周回
      let lap = max(0.0, ceil((windowStart - position) / loopBeats - 1e-9))
      let absolute = lap * loopBeats + position
      guard absolute >= windowStart && absolute < windowEnd else { continue }
      let noteOffset = (absolute - windowStart) * secPerBeat
      let velocity = note.velocity
      let sampler = note.pan < 0 ? leftSampler : rightSampler
      if sampler.pan != note.pan { sampler.pan = note.pan }
      if noteOffset < 0.002 {
        sampler.startNote(38, withVelocity: velocity, onChannel: 9)
      } else {
        let delayUs = DispatchTimeInterval.microseconds(Int(noteOffset * 1_000_000))
        DispatchQueue.global(qos: .userInteractive).asyncAfter(deadline: .now() + delayUs) { [weak self] in
          guard let self = self, self.isPlaying else { return }
          sampler.startNote(38, withVelocity: velocity, onChannel: 9)
        }
      }
    }
  }

  private static let countInMinVolume: Float = 0.5

  private func playClickSound(accented: Bool, gain: Float) {
    let sr = 44100.0; let dur = 0.02
    let freq = accented ? 1500.0 : 1000.0
    let fc = AVAudioFrameCount(sr * dur)
    guard let buf = AVAudioPCMBuffer(
      pcmFormat: AVAudioFormat(standardFormatWithSampleRate: sr, channels: 1)!,
      frameCapacity: fc) else { return }
    buf.frameLength = fc
    let ch = buf.floatChannelData![0]
    for i in 0..<Int(fc) {
      let t = Double(i) / sr
      ch[i] = Float(sin(2 * .pi * freq * t) * max(0, 1 - t / dur) * 0.8) * gain
    }
    playerNode.scheduleBuffer(buf, completionHandler: nil)
  }
}
