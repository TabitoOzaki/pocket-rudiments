/**
 * PAS International Drum Rudiments（40 種）。
 * 譜面と手順は PAS 公式の譜例（https://pas.org/wp-content/uploads/2024/04/pas-rudiments.pdf）を写したもの。
 * 記法は ./parse.ts を参照。
 */
import type { Rudiment, RudimentCategory } from '@/types/rudiment';
import { TICKS_PER_QUARTER, parseMeasures } from './parse';

type Meter = '2/4' | '3/4' | '4/4' | '6/8';

interface Definition {
  id: number;
  name: string;
  meter: Meter;
  source: string;
  subcategory?: string;
  isOriginal26?: boolean;
}

interface MeterSpec {
  numerator: number;
  denominator: number;
  beatTicks: number;
  beats: number;
}

const METERS: Record<Meter, MeterSpec> = {
  '2/4': {
    numerator: 2, denominator: 4, beatTicks: TICKS_PER_QUARTER, beats: 2,
  },
  '3/4': {
    numerator: 3, denominator: 4, beatTicks: TICKS_PER_QUARTER, beats: 3,
  },
  '4/4': {
    numerator: 4, denominator: 4, beatTicks: TICKS_PER_QUARTER, beats: 4,
  },
  // 6/8 は付点 4 分を 1 拍として 2 拍で数える
  '6/8': {
    numerator: 6, denominator: 8, beatTicks: TICKS_PER_QUARTER * 1.5, beats: 2,
  },
};

const SINGLE_STROKE = 'Single Stroke Roll Rudiments';
const MULTIPLE_BOUNCE = 'Multiple Bounce Roll Rudiments';
const DOUBLE_STROKE = 'Double Stroke Open Roll Rudiments';

const ROLLS: Definition[] = [
  {
    id: 1,
    name: 'Single Stroke Roll',
    meter: '2/4',
    subcategory: SINGLE_STROKE,
    isOriginal26: true,
    source: '[ 32R 32L 32R 32L ] [ 32R 32L 32R 32L ] [ 32R 32L 32R 32L ] [ 32R 32L 32R 32L ]',
  },
  {
    id: 2,
    name: 'Single Stroke Four',
    meter: '2/4',
    subcategory: SINGLE_STROKE,
    source: '[ (3 16R 16L 16R ) 8L ] [ (3 16R 16L 16R ) 8L ]',
  },
  {
    id: 3,
    name: 'Single Stroke Seven',
    meter: '2/4',
    subcategory: SINGLE_STROKE,
    source: '[ (6 16R 16L 16R 16L 16R 16L ) ] 4R',
  },
  {
    id: 4,
    name: 'Multiple Bounce Roll',
    meter: '2/4',
    subcategory: MULTIPLE_BOUNCE,
    // PAS は手順なしの 2 分音符 + z。練習用に 8 分のバズを左右交互で書く
    source: '[ 8Rz 8Lz 8Rz 8Lz ]',
  },
  {
    id: 5,
    name: 'Triple Stroke Roll',
    meter: '2/4',
    subcategory: MULTIPLE_BOUNCE,
    source: '[ (3 16R 16R 16R ) (3 16L 16L 16L ) ] [ (3 16R 16R 16R ) (3 16L 16L 16L ) ]',
  },
  {
    id: 6,
    name: 'Double Stroke Open Roll',
    meter: '2/4',
    subcategory: DOUBLE_STROKE,
    isOriginal26: true,
    // PAS はトレモロ 3 本の 2 分音符。手順が読めるよう 16 分で書き出す
    source: '[ 16R 16R 16L 16L ] [ 16R 16R 16L 16L ]',
  },
  {
    id: 7,
    name: 'Five Stroke Roll',
    meter: '2/4',
    subcategory: DOUBLE_STROKE,
    isOriginal26: true,
    source: '{5 [ 8R~2 8R^ ] } {5 [ 8L~2 8L^ ] }',
  },
  {
    id: 8,
    name: 'Six Stroke Roll',
    meter: '2/4',
    subcategory: DOUBLE_STROKE,
    source: '{6 [ 16R^ 8L~2 16L^ ] } {6 [ 16R^ 8L~2 16L^ ] }',
  },
  {
    id: 9,
    name: 'Seven Stroke Roll',
    meter: '2/4',
    subcategory: DOUBLE_STROKE,
    isOriginal26: true,
    source: '{7 [ 8.R~2 16L^ ] } {7 [ 8.L~2 16R^ ] }',
  },
  {
    id: 10,
    name: 'Nine Stroke Roll',
    meter: '2/4',
    subcategory: DOUBLE_STROKE,
    isOriginal26: true,
    source: '{9 4R~3 4R^ } | {9 4L~3 4L^ }',
  },
  {
    id: 11,
    name: 'Ten Stroke Roll',
    meter: '2/4',
    subcategory: DOUBLE_STROKE,
    isOriginal26: true,
    source: '{10 4R~3 [ 16R^ 16L^ ] } 8- | {10 4L~3 [ 16L^ 16R^ ] } 8-',
  },
  {
    id: 12,
    name: 'Eleven Stroke Roll',
    meter: '2/4',
    subcategory: DOUBLE_STROKE,
    isOriginal26: true,
    source: '{11 4R~3 [ 16R~1 16L^ ] } 8- | {11 4L~3 [ 16L~1 16R^ ] } 8-',
  },
  {
    id: 13,
    name: 'Thirteen Stroke Roll',
    meter: '2/4',
    subcategory: DOUBLE_STROKE,
    isOriginal26: true,
    source: '{13 4R~3 [ 8R~2 8R^ ] } | {13 4L~3 [ 8L~2 8L^ ] }',
  },
  {
    id: 14,
    name: 'Fifteen Stroke Roll',
    meter: '2/4',
    subcategory: DOUBLE_STROKE,
    isOriginal26: true,
    source: '{15 4R~3 [ 8.R~2 16L^ ] } | {15 4R~3 [ 8.R~2 16L^ ] }',
  },
  {
    id: 15,
    name: 'Seventeen Stroke Roll',
    meter: '3/4',
    subcategory: DOUBLE_STROKE,
    source: '{17 2R~3 4R^ } | {17 2L~3 4L^ }',
  },
];

const DIDDLES: Definition[] = [
  {
    id: 16,
    name: 'Single Paradiddle',
    meter: '2/4',
    isOriginal26: true,
    source: '[ 16R^ 16L 16R 16R ] [ 16L^ 16R 16L 16L ]',
  },
  {
    id: 17,
    name: 'Double Paradiddle',
    meter: '6/8',
    isOriginal26: true,
    source: '[ 16R^ 16L 16R 16L 16R 16R ] [ 16L^ 16R 16L 16R 16L 16L ]',
  },
  {
    id: 18,
    name: 'Triple Paradiddle',
    meter: '4/4',
    source: '[ 16R^ 16L 16R 16L ] [ 16R 16L 16R 16R ] [ 16L^ 16R 16L 16R ] [ 16L 16R 16L 16L ]',
  },
  {
    id: 19,
    name: 'Single Paradiddle-diddle',
    meter: '6/8',
    source: '[ 16R^ 16L 16R 16R 16L 16L ] [ 16R^ 16L 16R 16R 16L 16L ]',
  },
];

const FLAMS: Definition[] = [
  {
    id: 20, name: 'Flam', meter: '2/4', isOriginal26: true, source: 'f4R f4L',
  },
  {
    id: 21,
    name: 'Flam Accent',
    meter: '6/8',
    isOriginal26: true,
    source: '[ f8R^ 8L 8R ] [ f8L^ 8R 8L ]',
  },
  {
    id: 22,
    name: 'Flam Tap',
    meter: '2/4',
    isOriginal26: true,
    source: '[ f16R^ 16R f16L^ 16L ] [ f16R^ 16R f16L^ 16L ]',
  },
  {
    id: 23,
    name: 'Flamacue',
    meter: '2/4',
    isOriginal26: true,
    source: '[ f16R 16L^ 16R 16L ] f4R',
  },
  {
    id: 24,
    name: 'Flam Paradiddle',
    meter: '2/4',
    isOriginal26: true,
    source: '[ f16R^ 16L 16R 16R ] [ f16L^ 16R 16L 16L ]',
  },
  {
    id: 25,
    name: 'Single Flammed Mill',
    meter: '2/4',
    source: '[ f16R^ 16R 16L 16R ] [ f16L^ 16L 16R 16L ]',
  },
  {
    id: 26,
    name: 'Flam Paradiddle-diddle',
    meter: '6/8',
    isOriginal26: true,
    source: '[ f16R^ 16L 16R 16R 16L 16L ] [ f16L^ 16R 16L 16L 16R 16R ]',
  },
  {
    id: 27,
    name: 'Pataflafla',
    meter: '2/4',
    source: '[ f16R^ 16L 16R f16L^ ] [ f16R^ 16L 16R f16L^ ]',
  },
  {
    id: 28,
    name: 'Swiss Army Triplet',
    meter: '2/4',
    source: '[ (3 f16R^ 16R 16L ) (3 f16R^ 16R 16L ) ] [ (3 f16R^ 16R 16L ) (3 f16R^ 16R 16L ) ]',
  },
  {
    id: 29,
    name: 'Inverted Flam Tap',
    meter: '2/4',
    source: '[ f16R^ 16L f16L^ 16R ] [ f16R^ 16L f16L^ 16R ]',
  },
  {
    id: 30,
    name: 'Flam Drag',
    meter: '6/8',
    source: '[ f8R^ 16L 16L 8R ] [ f8L^ 16R 16R 8L ]',
  },
];

const DRAGS: Definition[] = [
  {
    id: 31, name: 'Drag', meter: '2/4', isOriginal26: true, source: 'd4R d4L',
  },
  {
    id: 32,
    name: 'Single Drag Tap',
    meter: '2/4',
    isOriginal26: true,
    source: '[ d8R 8L^ ] [ d8L 8R^ ]',
  },
  {
    id: 33,
    name: 'Double Drag Tap',
    meter: '6/8',
    isOriginal26: true,
    source: '[ d8R d8R 8L^ ] [ d8L d8L 8R^ ]',
  },
  {
    id: 34,
    name: 'Lesson 25',
    meter: '2/4',
    isOriginal26: true,
    source: '[ d16R 16L 8R^ ] [ d16R 16L 8R^ ]',
  },
  {
    id: 35,
    name: 'Single Dragadiddle',
    meter: '2/4',
    source: '[ 16R^~1 16L 16R 16R ] [ 16L^~1 16R 16L 16L ]',
  },
  {
    id: 36,
    name: 'Drag Paradiddle #1',
    meter: '6/8',
    isOriginal26: true,
    source: '[ 8R^ d16R 16L 16R 16R ] [ 8L^ d16L 16R 16L 16L ]',
  },
  {
    id: 37,
    name: 'Drag Paradiddle #2',
    meter: '4/4',
    isOriginal26: true,
    source: '[ 8R^ d8R ] [ d16R 16L 16R 16R ] [ 8L^ d8L ] [ d16L 16R 16L 16L ]',
  },
  {
    id: 38,
    name: 'Single Ratamacue',
    meter: '2/4',
    isOriginal26: true,
    source: '[ (3 d16R 16L 16R ) 8L^ ] [ (3 d16L 16R 16L ) 8R^ ]',
  },
  {
    id: 39,
    name: 'Double Ratamacue',
    meter: '3/4',
    isOriginal26: true,
    source: '[ d8R (3 d16R 16L 16R ) 8L^ ] [ d8L (3 d16L 16R 16L ) 8R^ ]',
  },
  {
    id: 40,
    name: 'Triple Ratamacue',
    meter: '4/4',
    isOriginal26: true,
    source: '[ d8R d8R ] [ (3 d16R 16L 16R ) 8L^ ] [ d8L d8L ] [ (3 d16L 16R 16L ) 8R^ ]',
  },
];

const build = (category: RudimentCategory) => (definition: Definition): Rudiment => {
  const meter = METERS[definition.meter];
  return {
    id: definition.id,
    name: definition.name,
    category,
    subcategory: definition.subcategory,
    timeSignature: { numerator: meter.numerator, denominator: meter.denominator },
    beatTicks: meter.beatTicks,
    beatsPerMeasure: meter.beats,
    measures: parseMeasures(definition.source),
    isOriginal26: definition.isOriginal26 ?? false,
  };
};

export const RUDIMENTS: Rudiment[] = [
  ...ROLLS.map(build('roll')),
  ...DIDDLES.map(build('diddle')),
  ...FLAMS.map(build('flam')),
  ...DRAGS.map(build('drag')),
];

export const CATEGORY_LABELS: Record<RudimentCategory, string> = {
  roll: 'I. Roll Rudiments',
  diddle: 'II. Diddle Rudiments',
  flam: 'III. Flam Rudiments',
  drag: 'IV. Drag Rudiments',
};
