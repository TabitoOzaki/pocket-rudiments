import type { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';

interface VolumeControlProps {
  icon: ReactNode;
  label: string;
  /** 0〜1 */
  value: number;
  onChange: (value: number) => void;
  /** 指を離したとき（保存などの重い処理はこちらで行う） */
  onChangeEnd?: (value: number) => void;
}

/** アイコン・名前・スライダー・パーセント表示を 1 行に並べた音量バー */
export default function VolumeControl({
  icon, label, value, onChange, onChangeEnd,
}: VolumeControlProps) {
  return (
    <View style={styles.row}>
      <View style={styles.icon}>{icon}</View>
      <Text style={styles.label}>{label}</Text>
      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={1}
        step={0.05}
        value={value}
        onValueChange={onChange}
        onSlidingComplete={onChangeEnd}
        minimumTrackTintColor="#5b9bd5"
        maximumTrackTintColor="#3a3a3a"
        thumbTintColor="#d0d0d0"
      />
      <Text style={styles.value}>{`${Math.round(value * 100)}%`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
  },
  icon: {
    width: 30,
    alignItems: 'center',
  },
  label: {
    width: 48,
    marginLeft: 6,
    color: '#d0d0d0',
    fontSize: 14,
    fontWeight: '600',
  },
  slider: {
    flex: 1,
    height: 40,
  },
  value: {
    width: 44,
    textAlign: 'right',
    color: '#888888',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
});
