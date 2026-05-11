/**
 * use-proctoring.test.ts
 *
 * Unit tests for the ExamVault proctoring hook.
 * Run with: npx vitest run
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useProctoring } from "@/hooks/use-proctoring";

// ── Mock browser APIs ──────────────────────────────────────────────────────────

const mockGetUserMedia = vi.fn();
const mockTracks = [{ stop: vi.fn(), kind: "video" }, { stop: vi.fn(), kind: "audio" }];
const mockStream = { getTracks: () => mockTracks } as unknown as MediaStream;

beforeEach(() => {
  // navigator.mediaDevices
  Object.defineProperty(navigator, "mediaDevices", {
    value: { getUserMedia: mockGetUserMedia },
    writable: true,
  });
  mockGetUserMedia.mockResolvedValue(mockStream);

  // document.documentElement.requestFullscreen
  Object.defineProperty(document.documentElement, "requestFullscreen", {
    value: vi.fn().mockResolvedValue(undefined),
    writable: true,
  });

  // document.exitFullscreen
  Object.defineProperty(document, "exitFullscreen", {
    value: vi.fn().mockResolvedValue(undefined),
    writable: true,
  });

  // document.fullscreenElement
  Object.defineProperty(document, "fullscreenElement", {
    value: null,
    writable: true,
  });

  // AudioContext
  const mockAnalyser = {
    fftSize: 256,
    frequencyBinCount: 128,
    getByteFrequencyData: vi.fn(),
    connect: vi.fn(),
  };
  const mockAudioCtx = {
    createAnalyser: () => mockAnalyser,
    createMediaStreamSource: () => ({ connect: vi.fn() }),
    close: vi.fn(),
  };
  vi.stubGlobal("AudioContext", vi.fn(() => mockAudioCtx));
  vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ── Initial state ─────────────────────────────────────────────────────────────

describe("useProctoring — initial state", () => {
  it("starts inactive with no violations", () => {
    const { result } = renderHook(() => useProctoring());
    expect(result.current.isActive).toBe(false);
    expect(result.current.violations).toHaveLength(0);
    expect(result.current.hasPermissions).toBe(false);
    expect(result.current.isTerminated).toBe(false);
  });

  it("exposes startProctoring and stopProctoring functions", () => {
    const { result } = renderHook(() => useProctoring());
    expect(typeof result.current.startProctoring).toBe("function");
    expect(typeof result.current.stopProctoring).toBe("function");
  });
});

// ── Permission request ────────────────────────────────────────────────────────

describe("useProctoring — permissions", () => {
  it("requests camera and microphone on startProctoring", async () => {
    const { result } = renderHook(() => useProctoring());

    await act(async () => {
      await result.current.startProctoring();
    });

    expect(mockGetUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({ video: expect.any(Object), audio: true })
    );
    expect(result.current.hasPermissions).toBe(true);
  });

  it("sets permissionError when getUserMedia is denied", async () => {
    mockGetUserMedia.mockRejectedValueOnce(
      Object.assign(new DOMException("Permission denied"), { name: "NotAllowedError" })
    );

    const { result } = renderHook(() => useProctoring());

    await act(async () => {
      await result.current.startProctoring();
    });

    expect(result.current.hasPermissions).toBe(false);
    expect(result.current.permissionError).toContain("denied");
  });

  it("marks isActive true after successful start", async () => {
    const { result } = renderHook(() => useProctoring());

    await act(async () => {
      await result.current.startProctoring();
    });

    expect(result.current.isActive).toBe(true);
  });
});

// ── Violation recording ───────────────────────────────────────────────────────

describe("useProctoring — violations", () => {
  it("records a tab_switch violation", async () => {
    const { result } = renderHook(() => useProctoring());

    await act(async () => {
      await result.current.startProctoring();
    });

    act(() => {
      result.current.recordViolation("tab_switch", "Tab hidden");
    });

    expect(result.current.violations).toHaveLength(1);
    expect(result.current.violations[0].type).toBe("tab_switch");
    expect(result.current.violations[0].timestamp).toBeTruthy();
  });

  it("increments tabSwitchCount on tab_switch violations", async () => {
    const { result } = renderHook(() => useProctoring());

    await act(async () => {
      await result.current.startProctoring();
    });

    act(() => { result.current.recordViolation("tab_switch"); });
    act(() => { result.current.recordViolation("tab_switch"); });

    expect(result.current.tabSwitchCount).toBe(2);
  });

  it("records a fullscreen_exit violation", async () => {
    const { result } = renderHook(() => useProctoring());

    await act(async () => {
      await result.current.startProctoring();
    });

    act(() => {
      result.current.recordViolation("fullscreen_exit");
    });

    expect(result.current.violations[0].type).toBe("fullscreen_exit");
  });

  it("records a copy_paste violation", async () => {
    const { result } = renderHook(() => useProctoring());

    await act(async () => {
      await result.current.startProctoring();
    });

    act(() => {
      result.current.recordViolation("copy_paste", "Copy attempted");
    });

    expect(result.current.violations[0].details).toBe("Copy attempted");
  });
});

// ── Auto-termination ──────────────────────────────────────────────────────────

describe("useProctoring — auto-termination", () => {
  it("terminates exam when maxViolations is reached", async () => {
    const onTerminate = vi.fn();
    const { result } = renderHook(() =>
      useProctoring({ maxViolations: 3, onTerminate })
    );

    await act(async () => {
      await result.current.startProctoring();
    });

    act(() => { result.current.recordViolation("tab_switch"); });
    act(() => { result.current.recordViolation("fullscreen_exit"); });
    act(() => { result.current.recordViolation("copy_paste"); });

    expect(result.current.isTerminated).toBe(true);
    expect(result.current.terminationReason).toBeTruthy();
    expect(onTerminate).toHaveBeenCalledOnce();
  });

  it("calls onViolation callback on each violation", async () => {
    const onViolation = vi.fn();
    const { result } = renderHook(() => useProctoring({ onViolation }));

    await act(async () => {
      await result.current.startProctoring();
    });

    act(() => { result.current.recordViolation("tab_switch"); });
    act(() => { result.current.recordViolation("right_click"); });

    expect(onViolation).toHaveBeenCalledTimes(2);
  });

  it("does not record further violations after termination", async () => {
    const { result } = renderHook(() => useProctoring({ maxViolations: 2 }));

    await act(async () => {
      await result.current.startProctoring();
    });

    act(() => { result.current.recordViolation("tab_switch"); });
    act(() => { result.current.recordViolation("tab_switch"); }); // triggers termination
    act(() => { result.current.recordViolation("copy_paste"); }); // should be ignored

    expect(result.current.violations).toHaveLength(2);
  });
});

// ── Stop / cleanup ────────────────────────────────────────────────────────────

describe("useProctoring — stop", () => {
  it("stops all media tracks on stopProctoring", async () => {
    const { result } = renderHook(() => useProctoring());

    await act(async () => {
      await result.current.startProctoring();
    });

    act(() => {
      result.current.stopProctoring();
    });

    mockTracks.forEach((track) => {
      expect(track.stop).toHaveBeenCalled();
    });
    expect(result.current.isActive).toBe(false);
  });
});

// ── Violation report ──────────────────────────────────────────────────────────

describe("useProctoring — getViolationReport", () => {
  it("returns a summary with counts by type", async () => {
    const { result } = renderHook(() => useProctoring());

    await act(async () => {
      await result.current.startProctoring();
    });

    act(() => { result.current.recordViolation("tab_switch"); });
    act(() => { result.current.recordViolation("tab_switch"); });
    act(() => { result.current.recordViolation("copy_paste"); });

    const report = result.current.getViolationReport();
    expect(report.totalViolations).toBe(3);
    expect(report.byType.tab_switch).toBe(2);
    expect(report.byType.copy_paste).toBe(1);
  });
});
