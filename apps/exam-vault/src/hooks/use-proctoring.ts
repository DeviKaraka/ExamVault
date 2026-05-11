/**
 * use-proctoring.ts
 *
 * Full proctoring implementation:
 *  - Webcam + microphone capture via navigator.mediaDevices.getUserMedia
 *  - Periodic snapshot screenshots stored as base64 data URLs
 *  - Tab-switch / focus-loss detection (Page Visibility API)
 *  - Fullscreen enforcement
 *  - Copy / paste / right-click prevention
 *  - Violation counter with configurable auto-terminate threshold
 *  - Audio level monitoring for suspicious background noise
 */

import { useCallback, useEffect, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ViolationType =
  | "tab_switch"
  | "fullscreen_exit"
  | "copy_paste"
  | "right_click"
  | "window_blur"
  | "suspicious_audio"
  | "multiple_faces"
  | "no_face_detected";

export interface ProctoringViolation {
  id: string;
  type: ViolationType;
  timestamp: string;
  screenshotDataUrl?: string;
  details?: string;
}

export interface ProctoringSnapshot {
  id: string;
  timestamp: string;
  dataUrl: string;
}

export interface ProctoringState {
  isActive: boolean;
  hasPermissions: boolean;
  permissionError: string | null;
  violations: ProctoringViolation[];
  snapshots: ProctoringSnapshot[];
  isFullscreen: boolean;
  tabSwitchCount: number;
  audioLevel: number;           // 0–100
  isTerminated: boolean;
  terminationReason?: string;
}

export interface ProctoringOptions {
  /** How often to capture a screenshot (ms). Default: 30000 */
  snapshotIntervalMs?: number;
  /** Max violations before auto-termination. Default: 5 */
  maxViolations?: number;
  /** Enable audio level monitoring. Default: true */
  enableAudioMonitoring?: boolean;
  /** Called on every new violation */
  onViolation?: (violation: ProctoringViolation) => void;
  /** Called when max violations are reached */
  onTerminate?: (reason: string, violations: ProctoringViolation[]) => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useProctoring(options: ProctoringOptions = {}) {
  const {
    snapshotIntervalMs    = 30_000,
    maxViolations         = 5,
    enableAudioMonitoring = true,
    onViolation,
    onTerminate,
  } = options;

  const [state, setState] = useState<ProctoringState>({
    isActive: false,
    hasPermissions: false,
    permissionError: null,
    violations: [],
    snapshots: [],
    isFullscreen: false,
    tabSwitchCount: 0,
    audioLevel: 0,
    isTerminated: false,
  });

  // Refs — survive renders without causing re-renders themselves
  const videoRef       = useRef<HTMLVideoElement | null>(null);
  const canvasRef      = useRef<HTMLCanvasElement | null>(null);
  const streamRef      = useRef<MediaStream | null>(null);
  const audioCtxRef    = useRef<AudioContext | null>(null);
  const analyserRef    = useRef<AnalyserNode | null>(null);
  const snapshotTimer  = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioAnimFrame = useRef<number | null>(null);
  const violationsRef  = useRef<ProctoringViolation[]>([]);
  const isTerminatedRef = useRef(false);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const generateId = () =>
    crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const captureSnapshot = useCallback((): string | undefined => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return undefined;

    canvas.width  = video.videoWidth  || 320;
    canvas.height = video.videoHeight || 240;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.6);
  }, []);

  const recordViolation = useCallback(
    (type: ViolationType, details?: string) => {
      if (isTerminatedRef.current) return;

      const screenshotDataUrl = captureSnapshot();
      const violation: ProctoringViolation = {
        id: generateId(),
        type,
        timestamp: new Date().toISOString(),
        screenshotDataUrl,
        details,
      };

      violationsRef.current = [...violationsRef.current, violation];

      setState((prev) => {
        const newViolations = [...prev.violations, violation];
        const tabSwitchCount =
          type === "tab_switch" ? prev.tabSwitchCount + 1 : prev.tabSwitchCount;

        // Auto-terminate if threshold reached
        if (newViolations.length >= maxViolations && !isTerminatedRef.current) {
          isTerminatedRef.current = true;
          const reason = `Exam terminated: ${maxViolations} violations detected.`;
          onTerminate?.(reason, newViolations);
          return {
            ...prev,
            violations: newViolations,
            tabSwitchCount,
            isTerminated: true,
            terminationReason: reason,
          };
        }

        return { ...prev, violations: newViolations, tabSwitchCount };
      });

      onViolation?.(violation);
    },
    [captureSnapshot, maxViolations, onViolation, onTerminate]
  );

  // ── Audio monitoring ──────────────────────────────────────────────────────────

  const startAudioMonitoring = useCallback((stream: MediaStream) => {
    if (!enableAudioMonitoring) return;
    try {
      const audioCtx = new AudioContext();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let sustainedHighAudio = 0;

      const checkAudio = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const level = Math.round((avg / 255) * 100);

        setState((prev) => ({ ...prev, audioLevel: level }));

        // Flag sustained high audio as suspicious (> 70 for 3 consecutive checks)
        if (level > 70) {
          sustainedHighAudio++;
          if (sustainedHighAudio >= 3) {
            recordViolation("suspicious_audio", `Audio level: ${level}%`);
            sustainedHighAudio = 0;
          }
        } else {
          sustainedHighAudio = 0;
        }

        audioAnimFrame.current = requestAnimationFrame(checkAudio);
      };

      audioAnimFrame.current = requestAnimationFrame(checkAudio);
    } catch (err) {
      console.warn("Audio monitoring failed to start:", err);
    }
  }, [enableAudioMonitoring, recordViolation]);

  // ── Snapshot scheduling ───────────────────────────────────────────────────────

  const startSnapshotSchedule = useCallback(() => {
    snapshotTimer.current = setInterval(() => {
      const dataUrl = captureSnapshot();
      if (!dataUrl) return;

      const snapshot: ProctoringSnapshot = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        dataUrl,
      };

      setState((prev) => ({
        ...prev,
        snapshots: [...prev.snapshots.slice(-19), snapshot], // keep last 20
      }));
    }, snapshotIntervalMs);
  }, [captureSnapshot, snapshotIntervalMs]);

  // ── Start proctoring ──────────────────────────────────────────────────────────

  const startProctoring = useCallback(async () => {
    if (state.isActive) return;

    try {
      // Request webcam + microphone permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: enableAudioMonitoring,
      });

      streamRef.current = stream;

      // Attach stream to hidden video element for snapshots
      if (!videoRef.current) {
        videoRef.current = document.createElement("video");
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.setAttribute("muted", "true");
        videoRef.current.style.display = "none";
        document.body.appendChild(videoRef.current);
      }
      if (!canvasRef.current) {
        canvasRef.current = document.createElement("canvas");
        canvasRef.current.style.display = "none";
        document.body.appendChild(canvasRef.current);
      }

      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      // Request fullscreen
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        // Fullscreen may be blocked in some browsers; record as a warning
        recordViolation("fullscreen_exit", "Fullscreen request was denied or not supported");
      }

      if (enableAudioMonitoring) startAudioMonitoring(stream);
      startSnapshotSchedule();

      setState((prev) => ({
        ...prev,
        isActive: true,
        hasPermissions: true,
        permissionError: null,
        isFullscreen: !!document.fullscreenElement,
      }));
    } catch (err) {
      const errorMessage =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Camera and microphone access was denied. Please allow permissions to proceed."
          : err instanceof Error
          ? err.message
          : "Failed to start proctoring";

      setState((prev) => ({
        ...prev,
        hasPermissions: false,
        permissionError: errorMessage,
      }));
    }
  }, [state.isActive, enableAudioMonitoring, startAudioMonitoring, startSnapshotSchedule, recordViolation]);

  // ── Stop proctoring ───────────────────────────────────────────────────────────

  const stopProctoring = useCallback(() => {
    // Stop media stream
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    // Teardown audio context
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;

    // Cancel animation frame
    if (audioAnimFrame.current !== null) {
      cancelAnimationFrame(audioAnimFrame.current);
      audioAnimFrame.current = null;
    }

    // Clear snapshot interval
    if (snapshotTimer.current !== null) {
      clearInterval(snapshotTimer.current);
      snapshotTimer.current = null;
    }

    // Remove hidden video/canvas from DOM
    videoRef.current?.remove();
    videoRef.current = null;
    canvasRef.current?.remove();
    canvasRef.current = null;

    // Exit fullscreen
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    setState((prev) => ({ ...prev, isActive: false, audioLevel: 0 }));
  }, []);

  // ── Event listeners ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!state.isActive) return;

    // Tab switch / visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) recordViolation("tab_switch", "Tab hidden or switched");
    };

    // Window blur
    const handleWindowBlur = () => {
      recordViolation("window_blur", "Browser window lost focus");
    };

    // Fullscreen change
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement;
      setState((prev) => ({ ...prev, isFullscreen: isFs }));
      if (!isFs) {
        recordViolation("fullscreen_exit", "Exited fullscreen mode");
        // Re-request fullscreen
        document.documentElement.requestFullscreen().catch(() => {});
      }
    };

    // Copy/paste prevention
    const handleCopy  = (e: ClipboardEvent) => { e.preventDefault(); recordViolation("copy_paste", "Copy attempted"); };
    const handlePaste = (e: ClipboardEvent) => { e.preventDefault(); recordViolation("copy_paste", "Paste attempted"); };
    const handleCut   = (e: ClipboardEvent) => { e.preventDefault(); recordViolation("copy_paste", "Cut attempted"); };

    // Right-click prevention
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      recordViolation("right_click", "Right-click attempted");
    };

    // Keyboard shortcuts (PrintScreen, etc.)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") {
        recordViolation("copy_paste", "PrintScreen key pressed");
      }
      // Block browser devtools shortcuts
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ["I", "J", "C"].includes(e.key)) {
        e.preventDefault();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("cut", handleCut);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("cut", handleCut);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [state.isActive, recordViolation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopProctoring();
    };
  }, [stopProctoring]);

  return {
    ...state,
    startProctoring,
    stopProctoring,
    recordViolation,
    captureSnapshot,
    getViolationReport: () => ({
      totalViolations: state.violations.length,
      byType: state.violations.reduce<Partial<Record<ViolationType, number>>>((acc, v) => {
        acc[v.type] = (acc[v.type] ?? 0) + 1;
        return acc;
      }, {}),
      violations: state.violations,
      snapshots: state.snapshots,
    }),
  };
}
