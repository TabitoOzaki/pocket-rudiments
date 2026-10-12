import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Hand } from '@/types/rudiment';

const STORAGE_KEY = 'pocket-rudiments/settings';

export interface PracticeSettings {
  rudimentId: number;
  bpm: number;
  lead: Hand;
  clickEnabled: boolean;
  snareEnabled: boolean;
}

export const DEFAULT_SETTINGS: PracticeSettings = {
  rudimentId: 16,
  bpm: 80,
  lead: 'R',
  clickEnabled: true,
  snareEnabled: true,
};

/** 前回の練習状態を復元し、変更のたびに保存する */
export default function useSettings() {
  const [settings, setSettings] = useState<PracticeSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((json) => {
        if (json) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(json) });
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const updateSettings = useCallback((patch: Partial<PracticeSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return { settings, loaded, updateSettings };
}
