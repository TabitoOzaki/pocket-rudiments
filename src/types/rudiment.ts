/** 手順（右手・左手） */
export type Hand = 'R' | 'L';

/** 装飾音の種類（フラム = 1 打、ドラッグ = 2 打。どちらも主音と反対の手で打つ） */
export type Grace = 'flam' | 'drag';

/** 書かれた音価（2 = 2 分音符、4 = 4 分音符 …） */
export type NoteValue = 2 | 4 | 8 | 16 | 32;

export interface RudimentNote {
  /** 休符なら true（hand などの奏法情報は無視される） */
  isRest: boolean;
  value: NoteValue;
  dotted: boolean;
  /** 連符の比率を反映した実際の長さ（4 分音符 = TICKS_PER_QUARTER） */
  ticks: number;
  /** 小節頭からの位置（tick） */
  start: number;
  hand: Hand;
  accent: boolean;
  grace: Grace | null;
  /** 符尾に付くトレモロ斜線の本数（ロールの省略記法） */
  tremolo: number;
  /** バズ（マルチプル・バウンス）の z 記号 */
  buzz: boolean;
}

/** 連桁でつながる音符のまとまり（1 音だけなら旗付きの単独音符） */
export interface BeamGroup {
  /** グループ内の音符（位置順） */
  notes: RudimentNote[];
  /** 連符表示（label を from〜to の音符の上に書く。添字はグループ内） */
  tuplets: { label: string; from: number; to: number }[];
}

/** ロールの打数表示とスラー（添字は小節内の通し番号） */
export interface RollMark {
  label: string;
  from: number;
  to: number;
}

export interface Measure {
  groups: BeamGroup[];
  rolls: RollMark[];
}

export interface TimeSignature {
  numerator: number;
  denominator: number;
}

export type RudimentCategory = 'roll' | 'diddle' | 'flam' | 'drag';

export interface Rudiment {
  /** PAS の番号（1〜40） */
  id: number;
  name: string;
  category: RudimentCategory;
  /** I. Roll Rudiments の中の小分類（Single Stroke など） */
  subcategory?: string;
  timeSignature: TimeSignature;
  /** メトロノーム 1 拍の長さ（tick）。6/8 は付点 4 分を 1 拍にする */
  beatTicks: number;
  beatsPerMeasure: number;
  measures: Measure[];
  /** PAS 26 Standard American Drum Rudiments（PAS 譜面の * 印） */
  isOriginal26: boolean;
}
