import { useCallback, useEffect, useRef } from 'react';

export type VoiceResult = {
  transcript: string;
  isFinal: boolean;
};

export type VoiceCaptureOptions = {
  onResult: (result: VoiceResult) => void;
  onError?: (reason?: string) => void;
  onEnd?: () => void;
};

type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
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
      const entry = event.results?.[event.resultIndex ?? event.results.length - 1];
      const result = entry?.[0];
      if (!result?.transcript) return;
      optionsRef.current.onResult({ transcript: result.transcript, isFinal: Boolean(entry?.isFinal) });
    };
    recognition.onerror = (event: { error?: string }) => optionsRef.current.onError?.(event?.error);
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
