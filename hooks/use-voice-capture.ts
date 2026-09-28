import { useCallback, useEffect, useRef } from 'react';

export type VoiceResult = {
  transcript: string;
  isFinal: boolean;
};

export type VoiceCaptureOptions = {
  onResult: (result: VoiceResult) => void;
  onError?: () => void;
  onEnd?: () => void;
};

export function useVoiceCapture(options: VoiceCaptureOptions) {
  const optionsRef = useRef(options);
  const activeRef = useRef(false);
  optionsRef.current = options;

  const start = useCallback(async () => false, []);
  const stop = useCallback(() => undefined, []);

  useEffect(() => () => stop(), [stop]);

  return {
    start,
    stop,
    isSupported: false,
    activeRef,
  };
}
