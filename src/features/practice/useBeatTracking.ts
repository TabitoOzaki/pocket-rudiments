import { useEffect, useState } from 'react';
import MetronomeModule, { type BeatEvent } from 'react-native-metronome';

export interface BeatTracking {
  /** ループ頭から数えた拍（カウントイン中・停止中は null） */
  activeBeat: number | null;
  /** カウントインの残り拍数（カウントイン中でなければ 0） */
  countInLeft: number;
}

/**
 * ネイティブの onBeat から、いまループのどの拍にいるかを返す。
 * イベントを数えるのではなく、ネイティブが付ける通し番号から計算するので、
 * 取りこぼしや前の再生の遅れて届いた拍があっても位置がずれない。
 * 開始直後の拍を取りこぼさないよう、購読は再生前から張っておく。
 */
export default function useBeatTracking(
  playing: boolean,
  session: number,
  loopBeats: number,
): BeatTracking {
  const [lastBeat, setLastBeat] = useState<BeatEvent | null>(null);

  useEffect(() => {
    const subscription = MetronomeModule.addBeatListener(setLastBeat);
    return () => subscription.remove();
  }, []);

  // 前の再生の拍や、新しい再生の 1 拍目が届く前は「カウントイン開始前」として扱う
  if (!playing || lastBeat === null || lastBeat.session !== session) {
    return { activeBeat: null, countInLeft: 0 };
  }
  const { beat, countInBeats } = lastBeat;
  if (beat <= countInBeats) {
    return { activeBeat: null, countInLeft: countInBeats - beat + 1 };
  }
  return { activeBeat: (beat - countInBeats - 1) % loopBeats, countInLeft: 0 };
}
