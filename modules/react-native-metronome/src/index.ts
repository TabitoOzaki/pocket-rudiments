import { requireNativeModule } from 'expo-modules-core';

/** ループ再生するスネアの 1 打。beat は拍位置、sec はそこからの秒ずれ（負なら前打ち） */
export interface SnareHit {
  beat: number;
  sec: number;
  velocity: number;
}

interface MetronomeModuleInterface {
  start(bpm: number): void;
  startWithCountIn(bpm: number): void;
  stop(): void;
  setBpm(bpm: number): void;
  preWarmSpeech(): void;
  loadDrumSoundFont(uri: string): void;
  setSnareLoop(notes: SnareHit[], loopBeats: number): void;
  setClickEnabled(enabled: boolean): void;
  setDrumKit(program: number): void;
  setBeatsPerMeasure(n: number): void;
  addListener(eventName: string, listener: () => void): { remove: () => void };
}

let cachedModule: MetronomeModuleInterface | null = null;

function getModule(): MetronomeModuleInterface {
  if (!cachedModule) {
    cachedModule = requireNativeModule<MetronomeModuleInterface>('Metronome');
  }
  return cachedModule;
}

const MetronomeModule = {
  start(bpm: number) { getModule().start(bpm); },
  startWithCountIn(bpm: number) { getModule().startWithCountIn(bpm); },
  stop() { getModule().stop(); },
  setBpm(bpm: number) { getModule().setBpm(bpm); },
  preWarmSpeech() { getModule().preWarmSpeech(); },
  loadDrumSoundFont(uri: string) { getModule().loadDrumSoundFont(uri); },
  setSnareLoop(notes: SnareHit[], loopBeats: number) {
    getModule().setSnareLoop(notes, loopBeats);
  },
  setClickEnabled(enabled: boolean) { getModule().setClickEnabled(enabled); },
  setDrumKit(program: number) { getModule().setDrumKit(program); },
  setBeatsPerMeasure(n: number) { getModule().setBeatsPerMeasure(n); },
  addBeatListener(listener: () => void) {
    return getModule().addListener('onBeat', listener);
  },
};

export default MetronomeModule;
