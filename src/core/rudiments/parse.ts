/**
 * ルーディメンツ譜面の短い記法を Measure に変換する。
 *
 * 記法（トークンは空白区切り、小節は `|` 区切り）:
 * - 音符: `[f|d]<音価>[.]<R|L>[^][~n][z]`
 *   - 先頭の f = フラム、d = ドラッグ（装飾音は主音と反対の手）
 *   - 音価 2/4/8/16/32、`.` で付点
 *   - `^` アクセント、`~n` トレモロ斜線 n 本、`z` バズ
 * - 休符: `<音価>[.]-`
 * - `[` 〜 `]` 連桁グループ（括弧の外の音符は 1 音ずつ独立した音符になる）
 * - `(3` 〜 `)` 連符（3 連・6 連とも 2/3 倍の長さ）。連桁グループの中に書く
 * - `{9` 〜 `}` ロールの打数表示とスラー（グループをまたいでよい）
 */
import type {
  BeamGroup, Hand, Measure, NoteValue, RollMark, RudimentNote,
} from '@/types/rudiment';

export const TICKS_PER_QUARTER = 48;

const TUPLET_RATIOS: Record<string, number> = {
  3: 2 / 3,
  6: 2 / 3,
};

const NOTE_PATTERN = /^([fd]?)(2|4|8|16|32)(\.?)(?:([RL])(\^?)(?:~(\d))?(z?)|(-))$/;

/** 音価（付点込み）の tick 数 */
export const valueTicks = (value: NoteValue, dotted: boolean): number => {
  const base = (TICKS_PER_QUARTER * 4) / value;
  return dotted ? base * 1.5 : base;
};

const parseNote = (token: string, start: number, ratio: number): RudimentNote => {
  const match = NOTE_PATTERN.exec(token);
  if (!match) throw new Error(`Unknown token: ${token}`);
  const [, ornament, valueText, dot, hand, accent, tremolo, buzz, rest] = match;
  const value = Number(valueText) as NoteValue;
  const dotted = dot === '.';
  let grace: RudimentNote['grace'] = null;
  if (ornament === 'f') grace = 'flam';
  if (ornament === 'd') grace = 'drag';
  return {
    isRest: rest === '-',
    value,
    dotted,
    ticks: valueTicks(value, dotted) * ratio,
    start,
    hand: (hand ?? 'R') as Hand,
    accent: accent === '^',
    grace,
    tremolo: Number(tremolo ?? 0),
    buzz: buzz === 'z',
  };
};

export const parseMeasure = (source: string): Measure => {
  const groups: BeamGroup[] = [];
  const rolls: RollMark[] = [];
  let current: BeamGroup | null = null;
  let tuplet: { label: string; from: number } | null = null;
  let roll: { label: string; from: number } | null = null;
  let tick = 0;
  let noteCount = 0;

  const addNote = (token: string) => {
    const ratio = tuplet ? TUPLET_RATIOS[tuplet.label] : 1;
    const note = parseNote(token, tick, ratio);
    tick += note.ticks;
    noteCount += 1;
    if (current) {
      current.notes.push(note);
    } else {
      groups.push({ notes: [note], tuplets: [] });
    }
  };

  source.trim().split(/\s+/).forEach((token) => {
    if (token === '[') {
      current = { notes: [], tuplets: [] };
    } else if (token === ']') {
      if (!current) throw new Error('Unbalanced ]');
      groups.push(current);
      current = null;
    } else if (/^\(\d$/.test(token)) {
      if (!current) throw new Error('Tuplet must be inside a beam group');
      tuplet = { label: token.slice(1), from: current.notes.length };
    } else if (token === ')') {
      if (!current || !tuplet) throw new Error('Unbalanced )');
      current.tuplets.push({ ...tuplet, to: current.notes.length - 1 });
      tuplet = null;
    } else if (/^\{\d+$/.test(token)) {
      roll = { label: token.slice(1), from: noteCount };
    } else if (token === '}') {
      if (!roll) throw new Error('Unbalanced }');
      rolls.push({ ...roll, to: noteCount - 1 });
      roll = null;
    } else {
      addNote(token);
    }
  });
  if (current || tuplet || roll) throw new Error(`Unclosed bracket in: ${source}`);
  return { groups, rolls };
};

/** `|` 区切りの複数小節を変換する */
export const parseMeasures = (source: string): Measure[] => (
  source.split('|').map(parseMeasure)
);

/** 小節内の音符を位置順に並べる（RollMark の添字はこの並びの番号） */
export const flattenNotes = (measure: Measure): RudimentNote[] => (
  measure.groups.flatMap((group) => group.notes)
);

/** 小節の長さ（tick） */
export const measureTicks = (measure: Measure): number => (
  flattenNotes(measure).reduce((sum, note) => sum + note.ticks, 0)
);
