import type { Hand, Rudiment, RudimentNote } from '@/types/rudiment';
import { TICKS_PER_QUARTER } from './parse';

export const otherHand = (hand: Hand): Hand => (hand === 'R' ? 'L' : 'R');

/** 左手始まりにするため、すべての手順（装飾音を含む）を左右入れ替える */
export const swapHands = (rudiment: Rudiment): Rudiment => ({
  ...rudiment,
  measures: rudiment.measures.map((measure) => ({
    ...measure,
    groups: measure.groups.map((group) => ({
      ...group,
      notes: group.notes.map((note) => ({ ...note, hand: otherHand(note.hand) })),
    })),
  })),
});

/** 符尾の旗・連桁の本数 */
export const beamCount = (note: RudimentNote): number => {
  switch (note.value) {
    case 8: return 1;
    case 16: return 2;
    case 32: return 3;
    default: return 0;
  }
};

/** トレモロ（斜線）付き音符を展開したときの各打の手順。ダブルストローク（RRLL…）で主音の手から始める */
export const tremoloHands = (note: RudimentNote): Hand[] => {
  if (note.tremolo === 0) return [note.hand];
  // 斜線は連桁と同じく音価を半分ずつにする（4 分音符 + 斜線 3 本 = 32 分の連打）
  const strokeTicks = TICKS_PER_QUARTER / 2 ** (beamCount(note) + note.tremolo);
  const count = Math.round(note.ticks / strokeTicks);
  return Array.from({ length: count }, (_, index) => (
    Math.floor(index / 2) % 2 === 0 ? note.hand : otherHand(note.hand)
  ));
};

/** 装飾音の手順（主音と反対の手。フラム 1 打、ドラッグ 2 打） */
export const graceHands = (note: RudimentNote): Hand[] => {
  if (note.grace === 'flam') return [otherHand(note.hand)];
  if (note.grace === 'drag') return [otherHand(note.hand), otherHand(note.hand)];
  return [];
};
