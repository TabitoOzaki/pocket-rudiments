/**
 * ルーディメンツの見本演奏の打点を作る。
 * ネイティブ側（react-native-metronome の setSnareLoop）は拍位置でループするので、
 * BPM に依存するのは装飾音とバズの秒ずれだけ（BPM を変えたら作り直す）。
 */
import type { Hand, Rudiment } from '@/types/rudiment';
import { graceHands, tremoloHands } from './hands';
import { TICKS_PER_QUARTER, flattenNotes } from './parse';

export interface ScheduledHit {
  /** ループ頭からの拍位置 */
  beat: number;
  /** 拍位置からの秒ずれ（装飾音は負＝前打ち） */
  sec: number;
  velocity: number;
  hand: Hand;
}

export const VELOCITY = {
  accent: 90,
  tap: 74,
  rollLead: 80,
  rollRebound: 66,
  grace: 42,
  buzz: 52,
};

/** 見本演奏の定位。右手は少し右、左手は少し左から聞こえるようにする（-1 = 左端、1 = 右端） */
export const HAND_PAN: Record<Hand, number> = {
  R: 0.35,
  L: -0.35,
};

/** フラムの装飾音を主音より前に打つ秒数 */
const FLAM_GAP_SEC = 0.03;

/** バズ 1 打あたりの間隔（秒） */
const BUZZ_GAP_SEC = 0.03;

export const loopBeatsOf = (rudiment: Rudiment): number => (
  rudiment.measures.length * rudiment.beatsPerMeasure
);

export const buildSnareLoop = (rudiment: Rudiment, bpm: number): ScheduledHit[] => {
  const secPerBeat = 60 / bpm;
  const secPerQuarter = (secPerBeat * TICKS_PER_QUARTER) / rudiment.beatTicks;
  // ドラッグの 2 打は速めの 32 分程度、遅いテンポでも間延びしないよう上限を設ける
  const dragGapSec = Math.min(0.05, secPerQuarter / 8);
  const measureTicks = rudiment.beatTicks * rudiment.beatsPerMeasure;
  const hits: ScheduledHit[] = [];

  rudiment.measures.forEach((measure, measureIndex) => {
    flattenNotes(measure).forEach((note) => {
      if (note.isRest) return;
      const startTicks = measureIndex * measureTicks + note.start;
      const beat = startTicks / rudiment.beatTicks;

      graceHands(note).forEach((hand, index, graces) => {
        const gap = note.grace === 'flam' ? FLAM_GAP_SEC : dragGapSec;
        hits.push({
          beat, sec: -gap * (graces.length - index), velocity: VELOCITY.grace, hand,
        });
      });

      if (note.buzz) {
        const durationSec = (note.ticks / rudiment.beatTicks) * secPerBeat;
        const count = Math.max(2, Math.floor(durationSec / BUZZ_GAP_SEC));
        for (let index = 0; index < count; index += 1) {
          const lead = note.accent ? VELOCITY.accent : VELOCITY.tap;
          hits.push({
            beat,
            sec: (durationSec * index) / count,
            velocity: index === 0 ? lead : VELOCITY.buzz - Math.min(20, index * 2),
            hand: note.hand,
          });
        }
        return;
      }

      const strokes = tremoloHands(note);
      const strokeTicks = note.ticks / strokes.length;
      strokes.forEach((hand, index) => {
        let velocity = VELOCITY.tap;
        // ダブルストロークの 2 打目は跳ね返りなので少し弱く
        if (strokes.length > 1) {
          velocity = index % 2 === 0 ? VELOCITY.rollLead : VELOCITY.rollRebound;
        }
        if (note.accent && index === 0) velocity = VELOCITY.accent;
        hits.push({
          beat: (startTicks + strokeTicks * index) / rudiment.beatTicks,
          sec: 0,
          velocity,
          hand,
        });
      });
    });
  });
  return hits;
};
