import { useCallback, useEffect } from 'react';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';

const scanBeepSource = require('../../assets/sounds/scan-beep.wav');

export function useScanSuccessBeep() {
  const player = useAudioPlayer(scanBeepSource);

  useEffect(() => {
    setAudioModeAsync({
      interruptionMode: 'mixWithOthers',
      playsInSilentMode: true,
      shouldPlayInBackground: false,
    }).catch(() => {});
  }, []);

  return useCallback(async () => {
    try {
      await player.seekTo(0);
    } catch (_) {}

    try {
      player.play();
    } catch (_) {}
  }, [player]);
}