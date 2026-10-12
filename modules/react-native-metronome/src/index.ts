import { requireNativeModule } from 'expo-modules-core';

/**
 * ループ再生するスネアの 1 打。beat は拍位置、sec はそこからの秒ずれ（負なら前打ち）。
 * pan は -1（左）〜 1（右）で、省略すると中央。
 */
export interface SnareHit {
  beat: number;
  sec: number;
  velocity: number;
  pan?: number;
}

/** 拍ごとに届くイベント。beat は再生開始からの通し番号（1 始まり、カウントインを含む） */
export interface BeatEvent {
  /** startWithCountIn が返した番号。前の再生の拍を見分けるのに使う */
  session: number;
  beat: number;
  /** この再生のカウントインの拍数（カウントインなしなら 0） */
  countInBeats: number;
}

interface MetronomeModuleInterface {
  start(bpm: number): void;
  startWithCountIn(bpm: number): number;
  stop(): void;
  setBpm(bpm: number): void;
  preWarmSpeech(): void;
  loadDrumSoundFont(uri: string): void;
  setSnareLoop(notes: SnareHit[], loopBeats: number): void;
  setClickVolume(volume: number): void;
  setSnareVolume(volume: number): void;
  setDrumKit(program: number): void;
  setBeatsPerMeasure(n: number): void;
  addListener(eventName: string, listener: (event: BeatEvent) => void): { remove: () => void };
}

let cachedModule: MetronomeModuleInterface | null = null;

function getModule(): MetronomeModuleInterface {
  if (!cachedModule) {
    cachedModule = requireNativeModule<MetronomeModuleInterface>('Metronome');
  }
  return cachedModule;
}

const MetronomeModule = {
  start(bpm: number) { getModule().start(bpm); },
  /** カウントイン付きで頭から鳴らし、この再生のセッション番号を返す */
  startWithCountIn(bpm: number): number { return getModule().startWithCountIn(bpm); },
  stop() { getModule().stop(); },
  setBpm(bpm: number) { getModule().setBpm(bpm); },
  preWarmSpeech() { getModule().preWarmSpeech(); },
  loadDrumSoundFont(uri: string) { getModule().loadDrumSoundFont(uri); },
  setSnareLoop(notes: SnareHit[], loopBeats: number) {
    getModule().setSnareLoop(notes, loopBeats);
  },
  /** クリックの音量（0〜1）。カウントイン中は 0 でも一定の音量で鳴る */
  setClickVolume(volume: number) { getModule().setClickVolume(volume); },
  /** 見本演奏のスネアの音量（0〜1） */
  setSnareVolume(volume: number) { getModule().setSnareVolume(volume); },
  setDrumKit(program: number) { getModule().setDrumKit(program); },
  setBeatsPerMeasure(n: number) { getModule().setBeatsPerMeasure(n); },
  addBeatListener(listener: (event: BeatEvent) => void) {
    return getModule().addListener('onBeat', listener);
  },
};

export default MetronomeModule;
