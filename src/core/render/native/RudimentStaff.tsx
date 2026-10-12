import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { G, Rect } from 'react-native-svg';
import type { Rudiment } from '@/types/rudiment';
import { layoutMeasure, minMeasureWidth } from '@/core/render/layout';
import MeasureView from './MeasureView';
import {
  BAR_TOP, LINE_Y, REPEAT_W, STAFF_H,
} from './shared';

/** 符尾の上の連符・ロールの数字が切れないよう、譜表全体を下げる量 */
const TOP_PAD = 14;
/** 譜表の下に書く手順の行の高さ */
const STICKING_H = 32;
export const ROW_H = TOP_PAD + STAFF_H + STICKING_H;

/** 4 分音符 1 つぶんに最低限ほしい横幅（これを下回るなら小節ごとに改行する） */
const MIN_QUARTER_W = 92;
const TIME_SIG_W = 24;
const INNER_PAD = 4;

const HIGHLIGHT_COLOR = 'rgba(91,155,213,0.22)';

interface Props {
  rudiment: Rudiment;
  width: number;
  /** ループ頭から数えた再生中の拍（再生していなければ null） */
  activeBeat: number | null;
  notationFont?: string;
}

export default function RudimentStaff({
  rudiment, width, activeBeat, notationFont = 'Bravura',
}: Props) {
  const measureTicks = rudiment.beatTicks * rudiment.beatsPerMeasure;
  const measureCount = rudiment.measures.length;
  // 小節線・拍子記号ぶんを含めた、1 小節に最低限ほしい幅
  const chromeW = INNER_PAD * 2 + REPEAT_W * 2 + TIME_SIG_W;
  const minMeasureW = Math.max(
    (measureTicks / 48) * MIN_QUARTER_W,
    ...rudiment.measures.map((measure) => minMeasureWidth(measure, measureTicks) + chromeW),
  );
  const perRow = Math.max(1, Math.min(measureCount, Math.floor(width / minMeasureW)));
  // 1 小節でも収まらないときは、必要な幅で描いてから画面幅に縮小する（横スクロールさせない）
  const staffW = Math.max(width, perRow * minMeasureW);
  const scale = width / staffW;
  const measureW = staffW / perRow;

  const placed = useMemo(() => rudiment.measures.map((measure, index) => {
    const left = (index % perRow) * measureW;
    const right = left + measureW - 1;
    const repeatStart = index === 0;
    const repeatEnd = index === measureCount - 1;
    const contentLeft = left + INNER_PAD + (repeatStart ? REPEAT_W + TIME_SIG_W : 0);
    const contentRight = right - INNER_PAD - (repeatEnd ? REPEAT_W : 0);
    return {
      measure,
      row: Math.floor(index / perRow),
      left,
      right,
      repeatStart,
      repeatEnd,
      layout: layoutMeasure(measure, measureTicks, contentLeft, contentRight - contentLeft),
    };
  }), [rudiment.measures, perRow, measureW, measureCount, measureTicks]);

  const rowCount = Math.ceil(measureCount / perRow);

  let highlight: { row: number; x: number; w: number } | null = null;
  if (activeBeat !== null) {
    const measureIndex = Math.floor(activeBeat / rudiment.beatsPerMeasure);
    const target = placed[measureIndex];
    if (target) {
      const beatInMeasure = activeBeat % rudiment.beatsPerMeasure;
      const x1 = target.layout.tickX(beatInMeasure * rudiment.beatTicks);
      const x2 = target.layout.tickX((beatInMeasure + 1) * rudiment.beatTicks);
      highlight = { row: target.row, x: x1, w: x2 - x1 };
    }
  }

  return (
    <View>
      {Array.from({ length: rowCount }, (_, row) => (
        <Svg key={row} width={width} height={ROW_H * scale} viewBox={`0 0 ${staffW} ${ROW_H}`}>
          <G y={TOP_PAD}>
            {highlight && highlight.row === row && (
              <Rect
                x={highlight.x}
                y={BAR_TOP - 6}
                width={highlight.w}
                height={LINE_Y - BAR_TOP + STAFF_H - LINE_Y + 34}
                rx={6}
                fill={HIGHLIGHT_COLOR}
              />
            )}
            {placed.filter((item) => item.row === row).map((item) => (
              <MeasureView
                key={`${rudiment.id}-${item.left}-${item.row}`}
                measure={item.measure}
                layout={item.layout}
                left={item.left}
                right={item.right}
                repeatStart={item.repeatStart}
                repeatEnd={item.repeatEnd}
                timeSignature={item.repeatStart ? rudiment.timeSignature : null}
                notationFont={notationFont}
              />
            ))}
          </G>
        </Svg>
      ))}
    </View>
  );
}
