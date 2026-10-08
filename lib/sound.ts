import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import type { RingtoneKey } from "@/lib/preferences-defaults";

/* eslint-disable @typescript-eslint/no-require-imports */
export const RINGTONES: Record<RingtoneKey, { name: string; note: string; source: number }> = {
  crystal: { name: "Crystal chime", note: "Bright, like a glass bell", source: require("../assets/sounds/crystal.wav") },
  marimba: { name: "Marimba", note: "Warm, a soft mallet", source: require("../assets/sounds/marimba.wav") },
  glass: { name: "Glass bell", note: "One clean, lingering ring", source: require("../assets/sounds/glass.wav") },
  musicbox: { name: "Music box", note: "A gentle little lullaby", source: require("../assets/sounds/musicbox.wav") },
};
export const HORN: number = require("../assets/sounds/horn.wav");

export const RINGTONE_KEYS = Object.keys(RINGTONES) as RingtoneKey[];

let player: AudioPlayer | null = null;
let modeReady = false;

export async function playSound(source: number, volume = 1): Promise<void> {
  try {
    if (!modeReady) {
      modeReady = true;
      await setAudioModeAsync({ playsInSilentMode: true });
    }
    stopSound();
    player = createAudioPlayer(source);
    player.volume = Math.max(0, Math.min(1, volume));
    player.play();
  } catch {
    // No audio output available - the visual alert still shows.
  }
}

export function stopSound(): void {
  try {
    player?.remove();
  } catch {
    // already released
  }
  player = null;
}
