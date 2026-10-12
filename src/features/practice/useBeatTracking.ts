import { useCallback, useEffect, useState } from 'react';
import MetronomeModule from 'react-native-metronome';

export interface BeatTracking {
  /** ループ頭から数えた拍（カウントイン中・停止中は null） */
  activeBeat: number | null;
  /** カウントインの残り拍数（カウントイン中でなければ 0） */
  countInLeft: number;
  /** 再生を頭から始める直前に呼んで数え直す */
  reset: () => void;
}

/**
 * ネイティブの onBeat を数えて、いまループのどの拍にいるかを返す。
 * カウントインは beatsPerMeasure * 2 拍（クリック 1 小節 + 発声 1 小節）。
 * 開始直後の拍を取りこぼさないよう、購読は再生前から張っておく。
 */
export default function useBeatTracking(
  playing: boolean,
  beatsPerMeasure: number,
  loopBeats: number,
): BeatTracking {
  const [beatCount, setBeatCount] = useState(0);
  const countInBeats = beatsPerMeasure * 2;

  useEffect(() => {
    const subscription = MetronomeModule.addBeatListener(() => {
      setBeatCount((count) => count + 1);
    });
    return () => subscription.remove();
  }, []);

  const reset = useCallback(() => setBeatCount(0), []);

  if (!playing) return { activeBeat: null, countInLeft: 0, reset };
  if (beatCount <= countInBeats) {
    return { activeBeat: null, countInLeft: countInBeats - beatCount + 1, reset };
  }
  return { activeBeat: (beatCount - countInBeats - 1) % loopBeats, countInLeft: 0, reset };
}
