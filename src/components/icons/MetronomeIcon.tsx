import React from 'react';
import Svg, { Line, Polygon } from 'react-native-svg';

interface MetronomeIconProps {
  color?: string;
  size?: number;
}

export default function MetronomeIcon({ color = '#555', size = 26 }: MetronomeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* 台形ボディ */}
      <Polygon points="2,23 7,2 17,2 22,23" fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      {/* 下部の横仕切り */}
      <Line x1="3.2" y1="18" x2="20.8" y2="18" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      {/* 中心縦線 */}
      <Line x1="12" y1="18" x2="12" y2="3.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      {/* 目盛り（3本） */}
      <Line x1="9.5" y1="7" x2="14.5" y2="7" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <Line x1="9.5" y1="11" x2="14.5" y2="11" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <Line x1="9.5" y1="15" x2="14.5" y2="15" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      {/* 振り子 */}
      <Line x1="12" y1="21" x2="21" y2="2" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}
