import { useEffect } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Asset } from 'expo-asset';
import MetronomeModule from 'react-native-metronome';

import PracticeScreen from '@/features/practice/PracticeScreen';
import useSettings from '@/features/practice/useSettings';
import { DRUM_KIT_PROGRAM } from '@/features/metronome/useMetronome';
import { DRUM_SOUND_FONT, NOTATION_FONTS } from '@/assets';

export default function App() {
  const [fontsLoaded] = useFonts(NOTATION_FONTS);
  const { settings, loaded, updateSettings } = useSettings();

  // 起動時に SF2 ロードと TTS プリウォームを実行
  useEffect(() => {
    MetronomeModule.preWarmSpeech();
    MetronomeModule.setDrumKit(DRUM_KIT_PROGRAM);
    Asset.fromModule(DRUM_SOUND_FONT).downloadAsync().then((asset) => {
      if (asset.localUri) MetronomeModule.loadDrumSoundFont(asset.localUri);
    });
  }, []);

  if (!fontsLoaded || !loaded) return null;

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <PracticeScreen initialSettings={settings} onSettingsChange={updateSettings} />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
});
