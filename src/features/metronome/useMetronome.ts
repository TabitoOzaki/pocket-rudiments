import {
  useCallback, useState, useRef, useEffect,
} from 'react';
import { AppState } from 'react-native';
import MetronomeModule from 'react-native-metronome';

export const MIN_BPM = 30;
export const MAX_BPM = 300;

/** Sight Pocket と同じ SF2 のキット番号（Jazz） */
export const DRUM_KIT_PROGRAM = 32;

/** スライダーの値（0〜1）を聴感に合うよう 2 乗してゲインにする */
const toGain = (volume: number) => volume * volume;

export interface UseMetronomeResult {
  bpm: number;
  playing: boolean;
  /** 直近の再生のセッション番号（onBeat の session と突き合わせる） */
  session: number;
  /** スライダーの値（0〜1） */
  clickVolume: number;
  snareVolume: number;
  /** カウントイン（1 小節のクリック + 1 小節の発声）付きで頭から鳴らす */
  start: () => void;
  stop: () => void;
  toggle: () => void;
  changeBpm: (val: number) => void;
  setClickVolume: (volume: number) => void;
  setSnareVolume: (volume: number) => void;
}

export function useMetronome(
  initialBpm: number,
  initialClickVolume: number,
  initialSnareVolume: number,
): UseMetronomeResult {
  const [bpm, setBpmState] = useState(initialBpm);
  const [playing, setPlaying] = useState(false);
  const [session, setSession] = useState(0);
  const [clickVolume, setClickVolumeState] = useState(initialClickVolume);
  const [snareVolume, setSnareVolumeState] = useState(initialSnareVolume);
  const bpmRef = useRef(initialBpm);
  const playingRef = useRef(false);

  useEffect(() => {
    MetronomeModule.setClickVolume(toGain(initialClickVolume));
    MetronomeModule.setSnareVolume(toGain(initialSnareVolume));
    // 初期値だけを反映する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stop = useCallback(() => {
    MetronomeModule.stop();
    playingRef.current = false;
    setPlaying(false);
  }, []);

  const start = useCallback(() => {
    MetronomeModule.stop();
    setSession(MetronomeModule.startWithCountIn(bpmRef.current));
    playingRef.current = true;
    setPlaying(true);
  }, []);

  const toggle = useCallback(() => {
    if (playingRef.current) {
      stop();
    } else {
      start();
    }
  }, [start, stop]);

  // バックグラウンドに回ったら止める（戻ったときに途中から鳴り出さないよう停止状態にする）
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if ((nextState === 'background' || nextState === 'inactive') && playingRef.current) {
        stop();
      }
    });
    return () => subscription.remove();
  }, [stop]);

  const changeBpm = useCallback((val: number) => {
    const v = Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(val)));
    if (v === bpmRef.current) return;
    bpmRef.current = v;
    setBpmState(v);
    if (playingRef.current) {
      MetronomeModule.setBpm(v);
    }
  }, []);

  const setClickVolume = useCallback((volume: number) => {
    setClickVolumeState(volume);
    MetronomeModule.setClickVolume(toGain(volume));
  }, []);

  const setSnareVolume = useCallback((volume: number) => {
    setSnareVolumeState(volume);
    MetronomeModule.setSnareVolume(toGain(volume));
  }, []);

  return {
    bpm,
    playing,
    session,
    clickVolume,
    snareVolume,
    start,
    stop,
    toggle,
    changeBpm,
    setClickVolume,
    setSnareVolume,
  };
}
