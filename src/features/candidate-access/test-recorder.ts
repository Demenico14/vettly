"use client";

import * as React from "react";
import { services } from "@/services";

export type RecorderStatus = "idle" | "starting" | "live" | "blocked" | "unavailable" | "stopped";
type Config = { mode: "photos" | "video"; audio: boolean };

const PHOTO_EVERY_MS = 20_000;
const VIDEO_SLICE_MS = 10_000;
const WIDTH = 320;
const HEIGHT = 240;

/**
 * Records a candidate during a test's scored questions, as agreed in writing: a photo every 20 seconds, or
 * low-resolution video in 10-second pieces. Pieces upload one at a time as the test goes, with retries, so a
 * dropped connection loses little; `stop` waits for the last piece before the answers are sent. Nothing is
 * recorded during practice, and the camera is released when the test closes.
 */
export function useTestRecorder(token: string, testId: string, config: Config | null) {
  const mode = config?.mode;
  const [status, setStatus] = React.useState<RecorderStatus>("idle");
  const stream = React.useRef<MediaStream | null>(null);
  const preview = React.useRef<HTMLVideoElement | null>(null);
  const queue = React.useRef<Promise<void>>(Promise.resolve());
  const seq = React.useRef(0);
  const timer = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const recorder = React.useRef<MediaRecorder | null>(null);
  const cameraOff = React.useRef(0);

  const upload = React.useCallback(
    (blob: Blob) => {
      if (!blob.size) return;
      const n = seq.current++;
      queue.current = queue.current.then(async () => {
        const data = await toBase64(blob);
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            await services.candidateAccess.uploadRecording(token, testId, n, blob.type || (mode === "photos" ? "image/jpeg" : "video/webm"), data);
            return;
          } catch {
            await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
          }
        }
      });
    },
    [token, testId, mode],
  );

  /** Asks for the camera (and microphone, for video with sound) and shows the preview. */
  const prepare = React.useCallback(async () => {
    if (!config) return;
    if (!navigator.mediaDevices?.getUserMedia) return setStatus("unavailable");
    setStatus("starting");
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: WIDTH }, height: { ideal: HEIGHT }, facingMode: "user", frameRate: { ideal: 15, max: 15 } },
        audio: config.mode === "video" && config.audio,
      });
      stream.current = s;
      s.getVideoTracks()[0]?.addEventListener("ended", () => {
        cameraOff.current++;
        setStatus("stopped");
      });
      if (preview.current) preview.current.srcObject = s;
      setStatus("live");
    } catch (e) {
      setStatus(e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError") ? "blocked" : "unavailable");
    }
  }, [config]);

  /** Starts recording once the scored questions open. */
  const begin = React.useCallback(() => {
    const s = stream.current;
    if (!config || !s || timer.current || recorder.current) return;
    if (config.mode === "photos") {
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.srcObject = s;
      void video.play();
      const canvas = document.createElement("canvas");
      canvas.width = WIDTH;
      canvas.height = HEIGHT;
      const snap = () => {
        if (video.readyState < 2) return;
        canvas.getContext("2d")?.drawImage(video, 0, 0, WIDTH, HEIGHT);
        canvas.toBlob((b) => b && upload(b), "image/jpeg", 0.7);
      };
      setTimeout(snap, 800);
      timer.current = setInterval(snap, PHOTO_EVERY_MS);
      return;
    }
    const mimeType = ["video/webm;codecs=vp8,opus", "video/webm;codecs=vp8", "video/webm", "video/mp4"].find((t) => MediaRecorder.isTypeSupported(t));
    const r = new MediaRecorder(s, { mimeType, videoBitsPerSecond: 250_000, audioBitsPerSecond: 32_000 });
    r.ondataavailable = (e) => upload(e.data);
    r.start(VIDEO_SLICE_MS);
    recorder.current = r;
  }, [config, upload]);

  /** Stops recording and waits (up to 15 seconds) for the last pieces to upload. */
  const stop = React.useCallback(async () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    const r = recorder.current;
    recorder.current = null;
    if (r && r.state !== "inactive") {
      await new Promise<void>((done) => {
        r.addEventListener("stop", () => done(), { once: true });
        r.stop();
      });
    }
    await Promise.race([queue.current, new Promise((r2) => setTimeout(r2, 15_000))]);
  }, []);

  // Release the camera when the test closes.
  React.useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  /** Keeps the visible preview attached when the element changes (camera check, then the corner thumbnail). */
  const attachPreview = React.useCallback((el: HTMLVideoElement | null) => {
    preview.current = el;
    if (el && stream.current) el.srcObject = stream.current;
  }, []);

  return { status, prepare, begin, stop, attachPreview, cameraOffCount: () => cameraOff.current };
}

function toBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",", 2)[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
