/**
 * 1 小節ぶんの横方向の配置。音符は時間に比例して並べ、装飾音の幅だけ後ろへずらす。
 * 描画（native/）とハイライト位置の計算で共有する。
 */
import type { Measure, RudimentNote } from '@/types/rudiment';
import { flattenNotes } from '@/core/rudiments/parse';

/** 装飾音 1 つぶんの横幅 */
export const GRACE_SLOT_W = 15;

/** 拍の区切りから符頭の中心までの余白 */
export const HEAD_PAD = 12;

export const graceSlotWidth = (note: RudimentNote): number => {
  if (note.grace === 'flam') return GRACE_SLOT_W + 6;
  if (note.grace === 'drag') return GRACE_SLOT_W * 2;
  return 0;
};

/** 隣り合う音符の間に最低限あける幅（符頭と手順の文字が重ならない幅） */
export const MIN_NOTE_GAP = 15;

export interface MeasureLayout {
  /** 小節内の通し番号順の符頭 x */
  noteX: number[];
  /** 小節頭からの tick を x に変換する（装飾音の手前の位置を返す） */
  tickX: (tick: number) => number;
}

/** 各音符が次の音符（最後は小節の終わり）までに占める tick */
const spans = (notes: RudimentNote[], totalTicks: number) => notes
  .map((note, i) => (i + 1 < notes.length ? notes[i + 1].start : totalTicks) - note.start);

const contentWidth = (graces: number[], ticks: number[], scale: number) => ticks
  .reduce((sum, t, i) => sum + graces[i] + Math.max(t * scale, MIN_NOTE_GAP), 0);

/** 最小間隔を保ったまま 1 小節を描くのに必要な幅 */
export const minMeasureWidth = (measure: Measure, totalTicks: number): number => {
  const notes = flattenNotes(measure);
  return contentWidth(notes.map(graceSlotWidth), spans(notes, totalTicks), 0);
};

/**
 * 音符は時間に比例して並べるが、短い音符は最低 MIN_NOTE_GAP あける。
 * 比例の倍率は全体が width に収まる最大の値を二分探索で求める。
 */
export const layoutMeasure = (
  measure: Measure,
  totalTicks: number,
  left: number,
  width: number,
): MeasureLayout => {
  const notes = flattenNotes(measure);
  const graces = notes.map(graceSlotWidth);
  const ticks = spans(notes, totalTicks);
  let lo = 0;
  let hi = width / totalTicks;
  for (let i = 0; i < 30; i += 1) {
    const mid = (lo + hi) / 2;
    if (contentWidth(graces, ticks, mid) <= width) lo = mid; else hi = mid;
  }
  const slotX: number[] = [];
  let x = left;
  notes.forEach((note, i) => {
    slotX.push(x);
    x += graces[i] + Math.max(ticks[i] * lo, MIN_NOTE_GAP);
  });
  const noteX = notes.map((_, i) => slotX[i] + graces[i] + HEAD_PAD);
  const gaps = ticks.map((t) => Math.max(t * lo, MIN_NOTE_GAP));
  const tickX = (tick: number) => {
    if (tick >= totalTicks) return Math.max(x, left + width);
    const i = notes.findLastIndex((note) => note.start <= tick);
    if (i < 0) return left;
    if (notes[i].start === tick) return slotX[i];
    // 長い音符の途中にある拍は、その音符の幅の中で按分する
    return slotX[i] + graces[i] + ((tick - notes[i].start) / ticks[i]) * gaps[i];
  };
  return { noteX, tickX };
};
