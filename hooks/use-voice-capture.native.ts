import { useCallback } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import type { VoiceCaptureOptions } from './use-voice-capture';

export function useVoiceCapture(options: VoiceCaptureOptions) {
  useSpeechRecognitionEvent('result', (event) => {
    const result = event.results?.[0];
    const transcript = result?.transcript ?? '';
    if (!transcript) return;
    options.onResult({ transcript, isFinal: Boolean(event.isFinal) });
  });

  useSpeechRecognitionEvent('error', () => options.onError?.());

  const start = useCallback(async () => {
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) return false;
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      continuous: false,
    });
    return true;
  }, []);

  const stop = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
  }, []);

  return { start, stop, isSupported: true };
}
