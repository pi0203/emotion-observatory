/**
 * Small pieces of the voice note (2026-11-16, owner's decision: recording only).
 * The sound is recorded and played back in this browser; nothing here turns it
 * into words, reads anything from it, or sends it anywhere.
 */

/** One recording stops on its own at three minutes and keeps what it has. */
export const MAX_VOICE_SECONDS = 180;

/**
 * Formats the browser can record, in the order tried. Safari before 18.4 has no
 * WebM, so MP4 comes next. The chosen name is kept with the recording, so a
 * record moved to another browser says what it was made in.
 */
const CANDIDATES = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"];

/** The first format this browser says it can record; "" lets the browser pick its own. */
export const pickMimeType = (isTypeSupported: (type: string) => boolean = (type) => MediaRecorder.isTypeSupported(type)): string =>
  CANDIDATES.find((type) => {
    try {
      return isTypeSupported(type);
    } catch {
      return false;
    }
  }) ?? "";

/**
 * How loud the last frame was, from AnalyserNode.getByteTimeDomainData: each
 * byte is a sample around 128. The root mean square, scaled so ordinary speech
 * fills most of the bar, kept between 0 and 1.
 */
export const levelOf = (samples: Uint8Array): number => {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (const sample of samples) {
    const centred = (sample - 128) / 128;
    sum += centred * centred;
  }
  return Math.min(1, Math.sqrt(sum / samples.length) * 4);
};

/** 12 → "0:12", 180 → "3:00". */
export const formatClock = (seconds: number) => {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
};
