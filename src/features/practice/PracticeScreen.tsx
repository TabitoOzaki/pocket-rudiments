import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  ScrollView, Text, TouchableOpacity, View, StyleSheet, useWindowDimensions,
} from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MetronomeModule from 'react-native-metronome';
import type { Hand } from '@/types/rudiment';
import { CATEGORY_LABELS, RUDIMENTS } from '@/core/rudiments/catalog';
import { swapHands } from '@/core/rudiments/hands';
import { HAND_PAN, buildSnareLoop, loopBeatsOf } from '@/core/rudiments/schedule';
import RudimentStaff from '@/core/render/native/RudimentStaff';
import { HAND_COLORS } from '@/core/render/native/shared';
import BpmControl from '@/components/BpmControl';
import VolumeControl from '@/components/VolumeControl';
import MetronomeIcon from '@/components/icons/MetronomeIcon';
import { MAX_BPM, MIN_BPM, useMetronome } from '@/features/metronome/useMetronome';
import RudimentPicker from './RudimentPicker';
import useBeatTracking from './useBeatTracking';
import type { PracticeSettings } from './useSettings';

const SCREEN_PAD = 16;
const PAPER_PAD = 8;
const ACTIVE = '#5b9bd5';
const INACTIVE = '#555555';

interface PracticeScreenProps {
  initialSettings: PracticeSettings;
  onSettingsChange: (patch: Partial<PracticeSettings>) => void;
}

/** 譜面・手順・メトロノーム・見本演奏を 1 画面にまとめた練習画面 */
export default function PracticeScreen({ initialSettings, onSettingsChange }: PracticeScreenProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [rudimentId, setRudimentId] = useState(initialSettings.rudimentId);
  const [lead, setLead] = useState<Hand>(initialSettings.lead);
  const [pickerVisible, setPickerVisible] = useState(false);
  const metronome = useMetronome(
    initialSettings.bpm,
    initialSettings.clickVolume,
    initialSettings.snareVolume,
  );
  const {
    bpm,
    playing,
    session,
    clickVolume,
    snareVolume,
    start,
    stop,
    changeBpm,
    setClickVolume,
    setSnareVolume,
  } = metronome;

  const baseRudiment = RUDIMENTS.find((rudiment) => rudiment.id === rudimentId) ?? RUDIMENTS[0];
  const rudiment = useMemo(
    () => (lead === 'L' ? swapHands(baseRudiment) : baseRudiment),
    [baseRudiment, lead],
  );
  const loopBeats = loopBeatsOf(rudiment);
  const beats = useBeatTracking(playing, session, loopBeats);

  // 見本演奏のパターン（BPM で装飾音の間隔が変わるので BPM ごとに作り直す）
  useEffect(() => {
    const hits = buildSnareLoop(rudiment, bpm);
    MetronomeModule.setSnareLoop(
      hits.map(({
        beat, sec, velocity, hand,
      }) => ({
        beat, sec, velocity, pan: HAND_PAN[hand],
      })),
      loopBeats,
    );
  }, [rudiment, bpm, loopBeats]);

  // ルーディメンツを変えたら拍子を合わせ、再生中ならカウントインからやり直す
  const playingRef = useRef(playing);
  playingRef.current = playing;
  useEffect(() => {
    MetronomeModule.setBeatsPerMeasure(baseRudiment.beatsPerMeasure);
    if (playingRef.current) start();
  }, [baseRudiment, start]);

  // BPM はスライダー操作中に何度も変わるので、落ち着いてから保存する
  useEffect(() => {
    const timer = setTimeout(() => onSettingsChange({ bpm }), 500);
    return () => clearTimeout(timer);
  }, [bpm, onSettingsChange]);

  const handlePlay = useCallback(() => {
    if (playing) {
      stop();
    } else {
      start();
    }
  }, [playing, start, stop]);

  const selectRudiment = useCallback((id: number) => {
    setRudimentId(id);
    onSettingsChange({ rudimentId: id });
  }, [onSettingsChange]);

  const step = (delta: number) => {
    const index = RUDIMENTS.findIndex((item) => item.id === rudimentId);
    const next = RUDIMENTS[(index + delta + RUDIMENTS.length) % RUDIMENTS.length];
    selectRudiment(next.id);
  };

  const changeLead = (hand: Hand) => {
    setLead(hand);
    onSettingsChange({ lead: hand });
  };

  const contentWidth = Math.min(width, 900) - SCREEN_PAD * 2 - insets.left - insets.right;
  const { numerator, denominator } = rudiment.timeSignature;
  let status = `${CATEGORY_LABELS[rudiment.category]} · ${numerator}/${denominator}`;
  if (rudiment.subcategory) status = `${CATEGORY_LABELS[rudiment.category]} · ${rudiment.subcategory}`;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, {
          paddingBottom: insets.bottom + 12,
          paddingLeft: insets.left + SCREEN_PAD,
          paddingRight: insets.right + SCREEN_PAD,
        }]}
      >
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => step(-1)} hitSlop={10} style={styles.arrow}>
            <Ionicons name="chevron-back" size={28} color="#d0d0d0" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.titleBtn} onPress={() => setPickerVisible(true)}>
            <Text style={styles.title} numberOfLines={1}>
              {`${rudiment.id}. ${rudiment.name}`}
              <Text style={styles.titleCaret}>{' ▾'}</Text>
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>{status}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => step(1)} hitSlop={10} style={styles.arrow}>
            <Ionicons name="chevron-forward" size={28} color="#d0d0d0" />
          </TouchableOpacity>
        </View>

        <View style={styles.paper}>
          <RudimentStaff
            rudiment={rudiment}
            width={contentWidth - PAPER_PAD * 2}
            activeBeat={beats.activeBeat}
          />
          {beats.countInLeft > 0 && (
            <View style={styles.countIn} pointerEvents="none">
              <Text style={styles.countInText}>{`Count-in ${beats.countInLeft}`}</Text>
            </View>
          )}
        </View>

        <View style={styles.leadRow}>
          <Text style={styles.sectionLabel}>Lead hand</Text>
          <View style={styles.segment}>
            {(['R', 'L'] as Hand[]).map((hand) => (
              <TouchableOpacity
                key={hand}
                style={[
                  styles.segmentItem,
                  lead === hand && { backgroundColor: HAND_COLORS[hand] },
                ]}
                onPress={() => changeLead(hand)}
              >
                <Text style={[styles.segmentText, lead === hand && styles.segmentTextActive]}>
                  {hand === 'R' ? 'Right' : 'Left'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.volumes}>
          <Text style={styles.sectionLabel}>Volume</Text>
          <VolumeControl
            icon={<FontAwesome5 name="drum" size={20} color={snareVolume > 0 ? ACTIVE : INACTIVE} />}
            label="Snare"
            value={snareVolume}
            onChange={setSnareVolume}
            onChangeEnd={(volume) => onSettingsChange({ snareVolume: volume })}
          />
          <VolumeControl
            icon={<MetronomeIcon color={clickVolume > 0 ? ACTIVE : INACTIVE} size={24} />}
            label="Click"
            value={clickVolume}
            onChange={setClickVolume}
            onChangeEnd={(volume) => onSettingsChange({ clickVolume: volume })}
          />
        </View>

        <View style={styles.transport}>
          <BpmControl bpm={bpm} min={MIN_BPM} max={MAX_BPM} onChangeBpm={changeBpm} />
          <TouchableOpacity
            style={[styles.playBtn, playing && styles.playBtnActive]}
            onPress={handlePlay}
            activeOpacity={0.8}
          >
            <Ionicons name={playing ? 'stop' : 'play'} size={36} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <RudimentPicker
        visible={pickerVisible}
        selectedId={rudimentId}
        onSelect={(id) => {
          selectRudiment(id);
          setPickerVisible(false);
        }}
        onClose={() => setPickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scroll: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  arrow: {
    padding: 4,
  },
  titleBtn: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  titleCaret: {
    color: '#888888',
    fontSize: 16,
  },
  subtitle: {
    color: '#888888',
    fontSize: 12,
    marginTop: 2,
  },
  paper: {
    marginTop: 16,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: PAPER_PAD,
  },
  countIn: {
    position: 'absolute',
    top: 6,
    right: 10,
  },
  countInText: {
    color: '#2c6fad',
    fontSize: 13,
    fontWeight: '700',
  },
  leadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#262626',
    borderRadius: 10,
    padding: 3,
  },
  segmentItem: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 8,
  },
  segmentText: {
    color: '#888888',
    fontSize: 14,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#ffffff',
  },
  transport: {
    marginTop: 'auto',
    paddingTop: 28,
    alignItems: 'center',
  },
  volumes: {
    marginTop: 18,
  },
  sectionLabel: {
    color: '#888888',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  playBtn: {
    marginTop: 10,
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#2c6fad',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnActive: {
    backgroundColor: '#c0392b',
  },
});
