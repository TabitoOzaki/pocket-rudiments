import {
  View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import Slider from '@react-native-community/slider';

interface BpmControlProps {
  bpm: number;
  min: number;
  max: number;
  onChangeBpm: (bpm: number) => void;
}

const STEPS = [-5, -1, 1, 5];

/** BPM の表示と、スライダー・±ボタンによる調整 */
export default function BpmControl({
  bpm, min, max, onChangeBpm,
}: BpmControlProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {STEPS.slice(0, 2).map((step) => (
          <TouchableOpacity
            key={step}
            style={styles.stepBtn}
            onPress={() => onChangeBpm(bpm + step)}
          >
            <Text style={styles.stepText}>{step}</Text>
          </TouchableOpacity>
        ))}
        <View style={styles.value}>
          <Text style={styles.bpmValue}>{bpm}</Text>
          <Text style={styles.bpmLabel}>BPM</Text>
        </View>
        {STEPS.slice(2).map((step) => (
          <TouchableOpacity
            key={step}
            style={styles.stepBtn}
            onPress={() => onChangeBpm(bpm + step)}
          >
            <Text style={styles.stepText}>{`+${step}`}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Slider
        style={styles.slider}
        minimumValue={min}
        maximumValue={max}
        step={1}
        value={bpm}
        onValueChange={onChangeBpm}
        minimumTrackTintColor="#5b9bd5"
        maximumTrackTintColor="#3a3a3a"
        thumbTintColor="#d0d0d0"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stepBtn: {
    width: 48,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    color: '#d0d0d0',
    fontSize: 15,
    fontWeight: '600',
  },
  value: {
    width: 92,
    alignItems: 'center',
  },
  bpmValue: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  bpmLabel: {
    color: '#888888',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: -2,
  },
  slider: {
    width: '100%',
    height: 36,
    marginTop: 4,
  },
});
