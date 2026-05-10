import { useEffect, useCallback, useRef } from 'react';
import { useAtom } from 'jotai';
import { proctorStateAtom, type ProctorState } from '@/lib/store';
import { toast } from 'sonner';

const MAX_VIOLATIONS = 3;

export function useProctoring(enabled: boolean = true) {
  const [proctorState, setProctorState] = useAtom(proctorStateAtom);
  const lastVisibilityTime = useRef<Date>(new Date());

  const addViolation = useCallback((reason: string) => {
    setProctorState((prev: ProctorState) => {
      const newCount = prev.violationCount + 1;
      const isNowCancelled = newCount >= MAX_VIOLATIONS;
      
      if (isNowCancelled) {
        toast.error('Exam Cancelled', {
          description: `Maximum violations (${MAX_VIOLATIONS}) reached. Your exam has been auto-cancelled.`,
          duration: 10000,
        });
      } else {
        toast.warning(`Warning ${newCount}/${MAX_VIOLATIONS}`, {
          description: reason,
          duration: 5000,
        });
      }

      return {
        ...prev,
        violationCount: newCount,
        warnings: [...prev.warnings, `${new Date().toISOString()}: ${reason}`],
        isExamCancelled: isNowCancelled,
      };
    });
  }, [setProctorState]);

  const enterFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
      setProctorState((prev: ProctorState) => ({ ...prev, isFullscreen: true }));
    } catch (err) {
      console.error('Failed to enter fullscreen:', err);
    }
  }, [setProctorState]);

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    setProctorState((prev: ProctorState) => ({ ...prev, isFullscreen: false }));
  }, [setProctorState]);

  // Handle visibility change (tab switching)
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        lastVisibilityTime.current = new Date();
      } else {
        const timeDiff = new Date().getTime() - lastVisibilityTime.current.getTime();
        if (timeDiff > 500) { // More than 500ms away
          setProctorState((prev: ProctorState) => {
            const newTabCount = prev.tabSwitchCount + 1;
            return { ...prev, tabSwitchCount: newTabCount };
          });
          addViolation('Tab switching detected. Please stay on the exam window.');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [enabled, addViolation, setProctorState]);

  // Handle fullscreen exit
  useEffect(() => {
    if (!enabled) return;

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setProctorState((prev: ProctorState) => {
        if (prev.isFullscreen && !isCurrentlyFullscreen) {
          // User exited fullscreen during exam
          addViolation('Fullscreen mode exited. Please return to fullscreen.');
        }
        return { ...prev, isFullscreen: isCurrentlyFullscreen };
      });
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [enabled, addViolation, setProctorState]);

  // Prevent right-click
  useEffect(() => {
    if (!enabled) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      toast.info('Right-click is disabled during the exam.');
    };

    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, [enabled]);

  // Prevent copy/paste
  useEffect(() => {
    if (!enabled) return;

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      toast.info('Copy is disabled during the exam.');
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      toast.info('Paste is disabled during the exam.');
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
    };
  }, [enabled]);

  const resetProctoring = useCallback(() => {
    setProctorState({
      isFullscreen: false,
      violationCount: 0,
      warnings: [],
      isExamCancelled: false,
      tabSwitchCount: 0,
      lastActivity: new Date(),
    });
  }, [setProctorState]);

  return {
    proctorState,
    enterFullscreen,
    exitFullscreen,
    addViolation,
    resetProctoring,
    remainingWarnings: MAX_VIOLATIONS - proctorState.violationCount,
  };
}
