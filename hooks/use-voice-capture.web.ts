import { useCallback, useEffect, useRef } from 'react';
import type { VoiceCaptureOptions } from './use-voice-capture';

type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: any) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type WindowWithSpeech = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

export function useVoiceCapture(options: VoiceCaptureOptions) {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const getConstructor = useCallback(() => {
    if (typeof window === 'undefined') return null;
    const w = window as WindowWithSpeech;
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
  }, []);

  const start = useCallback(async () => {
    const Constructor = getConstructor();
    if (!Constructor) return false;

    const recognition = new Constructor();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const result = event.results?.[event.resultIndex ?? event.results.length - 1]?.[0];
      if (!result?.transcript) return;
      const isFinal = Boolean(event.results?.[event.resultIndex ?? 0]?.isFinal);
      optionsRef.current.onResult({ transcript: result.transcript, isFinal });
    };
    recognition.onerror = () => optionsRef.current.onError?.();
    recognition.onend = () => optionsRef.current.onEnd?.();

    recognitionRef.current = recognition;
    try {
      recognition.start();
      return true;
    } catch {
      recognitionRef.current = null;
      optionsRef.current.onError?.();
      return false;
    }
  }, [getConstructor]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }, []);

  useEffect(() => () => stop(), [stop]);

  return {
    start,
    stop,
    isSupported: Boolean(getConstructor()),
  };
}
