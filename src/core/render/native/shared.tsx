/**
 * 1 線譜の描画部品。Sight Pocket（core/render/native/beats/shared.tsx）の寸法と部品をそのまま使う。
 */
import {
  Ellipse, Line, Path, G, Text, Rect,
} from 'react-native-svg';
import type { Hand } from '@/types/rudiment';

export const SPACE = 10;
export const LINE_Y = 70;
export const STAFF_H = 87;

export const HEAD_RX = 7.2;
export const HEAD_RY = 5.0;
export const HEAD_TILT = -25;

export const STEM_W = 1.3;
export const STEM_X_OFF = 5.8;
export const STEM_Y_TOP = LINE_Y - 3.5 * SPACE;

export const BEAM_H = 5;
export const BEAM_GAP = 9;

export const BAR_TOP = LINE_Y - 2 * SPACE;
export const BAR_BOT = LINE_Y + 2 * SPACE;

export const INK = '#111111';
export const STROKE_W = 1.5;

export const HAND_COLORS: Record<Hand, string> = {
  R: '#1f5fa8',
  L: '#c0392b',
};

export const BRAVURA_SIZE = 4 * SPACE;

export const SMUFL_FLAGS: Record<number, string> = {
  1: '',
  2: '',
  3: '',
};

export const SMUFL_RESTS: Record<number, string> = {
  2: '',
  4: '',
  8: '',
  16: '',
  32: '',
};

/** 拍子記号の数字（timeSig0 = U+E080） */
export const smuflTimeSigDigits = (value: number): string => String(value)
  .split('')
  .map((digit) => String.fromCharCode(0xE080 + Number(digit)))
  .join('');

export function NoteHead({ cx, filled }: { cx: number; filled: boolean }) {
  return (
    <Ellipse
      cx={cx}
      cy={LINE_Y}
      rx={HEAD_RX}
      ry={HEAD_RY}
      fill={filled ? INK : '#ffffff'}
      stroke={INK}
      strokeWidth={filled ? 0 : 1.5}
      rotation={HEAD_TILT}
      originX={cx}
      originY={LINE_Y}
    />
  );
}

export function Stem({ cx, top = STEM_Y_TOP }: { cx: number; top?: number }) {
  return (
    <Line
      x1={cx + STEM_X_OFF}
      y1={LINE_Y}
      x2={cx + STEM_X_OFF}
      y2={top}
      stroke={INK}
      strokeWidth={STEM_W}
      strokeLinecap="butt"
    />
  );
}

export function Flag({ cx, flagCount, notationFont }: {
  cx: number;
  flagCount: number;
  notationFont: string;
}) {
  return (
    <Text
      x={cx + STEM_X_OFF}
      y={STEM_Y_TOP}
      fontSize={BRAVURA_SIZE}
      fontFamily={notationFont}
      textAnchor="start"
      fill={INK}
    >
      {SMUFL_FLAGS[flagCount]}
    </Text>
  );
}

export function RestSymbol({ x, value, notationFont }: {
  x: number;
  value: number;
  notationFont: string;
}) {
  return (
    <Text
      x={x}
      y={LINE_Y}
      fontSize={BRAVURA_SIZE}
      fontFamily={notationFont}
      textAnchor="middle"
      fill={INK}
    >
      {SMUFL_RESTS[value]}
    </Text>
  );
}

export function AccentMark({ cx }: { cx: number }) {
  const cy = STEM_Y_TOP - 12;
  return (
    <Path
      d={`M ${cx - 2} ${cy - 4} L ${cx + 10} ${cy} L ${cx - 2} ${cy + 4}`}
      fill="none"
      stroke={INK}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

export function Tie({ x1, x2 }: { x1: number; x2: number }) {
  const y = LINE_Y + HEAD_RY + 3;
  const rawWidth = x2 - x1;
  // 近い音符ほどクリアランスを小さくして弧の幅を確保
  const clearance = rawWidth < 24 ? HEAD_RX * 0.4 : HEAD_RX;
  const sx = x1 + clearance;
  const ex = x2 - clearance;
  const arcW = ex - sx;
  const depth = arcW < 20 ? 11 : 7;
  const mx = (sx + ex) / 2;
  return (
    <Path
      d={`M ${sx} ${y} Q ${mx} ${y + depth} ${ex} ${y}`}
      fill="none"
      stroke={INK}
      strokeWidth={1.3}
      strokeLinecap="round"
    />
  );
}

export function Beam({
  x1, x2, level,
}: { x1: number; x2: number; level: number }) {
  return (
    <Rect
      x={x1}
      y={STEM_Y_TOP + (level - 1) * BEAM_GAP}
      width={Math.max(0, x2 - x1)}
      height={BEAM_H}
      fill={INK}
    />
  );
}

/** 符尾に付けるトレモロの斜線（下から順に積む） */
export function TremoloSlashes({ cx, count }: { cx: number; count: number }) {
  const sx = cx + STEM_X_OFF;
  return (
    <G>
      {Array.from({ length: count }, (_, index) => {
        const y = LINE_Y - 13 - index * 6;
        return (
          <Line
            key={index}
            x1={sx - 5}
            y1={y + 2.5}
            x2={sx + 5.5}
            y2={y - 2.5}
            stroke={INK}
            strokeWidth={3}
          />
        );
      })}
    </G>
  );
}

/** バズ（z 記号）を符尾に重ねる */
export function BuzzMark({ cx }: { cx: number }) {
  const sx = cx + STEM_X_OFF;
  const y = LINE_Y - 18;
  return (
    <Path
      d={`M ${sx - 4.5} ${y - 4} L ${sx + 4.5} ${y - 4} L ${sx - 4.5} ${y + 4} L ${sx + 4.5} ${y + 4}`}
      fill="none"
      stroke={INK}
      strokeWidth={1.8}
      strokeLinejoin="miter"
    />
  );
}

export function Barline({ x }: { x: number }) {
  return <Line x1={x} y1={BAR_TOP} x2={x} y2={BAR_BOT} stroke={INK} strokeWidth={STROKE_W} />;
}

/** 反復記号（start = 太線・細線・点、end = 点・細線・太線）。x は記号の外側の端 */
export function RepeatBar({ x, side }: { x: number; side: 'start' | 'end' }) {
  const dir = side === 'start' ? 1 : -1;
  return (
    <G>
      <Rect x={side === 'start' ? x : x - 4} y={BAR_TOP} width={4} height={BAR_BOT - BAR_TOP} fill={INK} />
      <Line
        x1={x + dir * 7}
        y1={BAR_TOP}
        x2={x + dir * 7}
        y2={BAR_BOT}
        stroke={INK}
        strokeWidth={1.2}
      />
      <Ellipse cx={x + dir * 12} cy={LINE_Y - 7} rx={2.2} ry={2.2} fill={INK} />
      <Ellipse cx={x + dir * 12} cy={LINE_Y + 7} rx={2.2} ry={2.2} fill={INK} />
    </G>
  );
}

/** 反復記号の横幅 */
export const REPEAT_W = 16;
