/**
 * biometric-auth.ts — Behavioral Biometric Verification (Future Enhancement)
 *
 * Provides scaffolding for:
 *  1. WebAuthn-based device biometric authentication (fingerprint / Face ID)
 *  2. Keystroke dynamics analysis during exam
 *  3. Mouse movement pattern monitoring
 *
 * Current status: Stubs with working WebAuthn registration/authentication.
 * Behavioral analytics collection is active; ML model integration is marked
 * TODO for the next sprint.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface KeystrokeEvent {
  key: string;
  dwellTime: number;    // ms key was held down
  flightTime: number;   // ms between this keydown and previous keyup
  timestamp: number;
}

export interface MouseEvent_ {
  x: number;
  y: number;
  velocity: number;     // px/ms
  timestamp: number;
}

export interface BiometricProfile {
  userId: string;
  keystrokeBaseline: KeystrokeEvent[];
  mouseBaseline: MouseEvent_[];
  createdAt: number;
}

export interface VerificationResult {
  verified: boolean;
  confidence: number;  // 0–1
  method: "webauthn" | "keystroke" | "mouse" | "fallback";
  message: string;
}

// ─── WebAuthn Registration ───────────────────────────────────────────────────

/**
 * registerBiometric — registers a WebAuthn credential for the user.
 * Must be called from a user gesture (button click).
 *
 * TODO: Store the credential ID server-side and associate with userId.
 */
export async function registerBiometric(userId: string): Promise<boolean> {
  if (!window.PublicKeyCredential) {
    console.warn("WebAuthn not supported in this browser.");
    return false;
  }

  try {
    const challengeBytes = crypto.getRandomValues(new Uint8Array(32));
    const userIdBytes = new TextEncoder().encode(userId);

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: challengeBytes,
        rp: { name: "ExamVault", id: window.location.hostname },
        user: {
          id: userIdBytes,
          name: userId,
          displayName: userId,
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7  }, // ES256
          { type: "public-key", alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform", // device biometric (Touch ID, Windows Hello)
          userVerification: "required",
        },
        timeout: 60000,
      },
    });

    if (credential) {
      // TODO: Send credential.response to /api/biometric/register for server-side storage
      console.info("Biometric credential registered:", credential.id);
      return true;
    }
    return false;
  } catch (err) {
    console.error("Biometric registration failed:", err);
    return false;
  }
}

/**
 * authenticateWithBiometric — verifies the user using a stored WebAuthn credential.
 *
 * TODO: Fetch the challenge and allowCredentials from the server
 *       at /api/biometric/challenge before calling this.
 */
export async function authenticateWithBiometric(
  challenge: Uint8Array,
  credentialId: string
): Promise<VerificationResult> {
  if (!window.PublicKeyCredential) {
    return {
      verified: false,
      confidence: 0,
      method: "fallback",
      message: "WebAuthn not supported; using password fallback.",
    };
  }

  try {
    const credIdBytes = Uint8Array.from(atob(credentialId), (c) => c.charCodeAt(0));

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ type: "public-key", id: credIdBytes }],
        userVerification: "required",
        timeout: 60000,
      },
    });

    if (assertion) {
      // TODO: Send assertion to /api/biometric/verify for server-side signature check
      return {
        verified: true,
        confidence: 0.99,
        method: "webauthn",
        message: "Biometric authentication successful.",
      };
    }

    return { verified: false, confidence: 0, method: "webauthn", message: "Authentication cancelled." };
  } catch (err) {
    return { verified: false, confidence: 0, method: "fallback", message: String(err) };
  }
}

// ─── Keystroke Dynamics Collector ────────────────────────────────────────────

/**
 * createKeystrokeCollector — attaches listeners to a DOM element and
 * collects keystroke timing data for behavioral analysis.
 *
 * Returns a function to stop collection and retrieve events.
 */
export function createKeystrokeCollector(target: HTMLElement): {
  stop: () => KeystrokeEvent[];
} {
  const events: KeystrokeEvent[] = [];
  let lastKeyUpTime = 0;
  let keyDownTime: Record<string, number> = {};

  const onKeyDown = (e: KeyboardEvent) => {
    keyDownTime[e.key] = performance.now();
  };

  const onKeyUp = (e: KeyboardEvent) => {
    const now = performance.now();
    const dwell = keyDownTime[e.key] ? now - keyDownTime[e.key] : 0;
    const flight = lastKeyUpTime ? now - lastKeyUpTime : 0;
    lastKeyUpTime = now;

    events.push({
      key: e.key.length === 1 ? "[char]" : e.key, // anonymize actual chars
      dwellTime: Math.round(dwell),
      flightTime: Math.round(flight),
      timestamp: now,
    });
  };

  target.addEventListener("keydown", onKeyDown);
  target.addEventListener("keyup", onKeyUp);

  return {
    stop: () => {
      target.removeEventListener("keydown", onKeyDown);
      target.removeEventListener("keyup", onKeyUp);
      return events;
    },
  };
}

// ─── Behavioral Similarity (TODO: replace with ML model) ─────────────────────

/**
 * compareKeystrokeProfiles — simple statistical similarity check.
 * Returns a confidence score 0–1.
 *
 * TODO: Replace with a trained ML model (e.g. LSTM or SVM) in future sprint.
 */
export function compareKeystrokeProfiles(
  baseline: KeystrokeEvent[],
  current: KeystrokeEvent[]
): number {
  if (baseline.length < 5 || current.length < 5) return 0.5; // not enough data

  const avgDwell = (arr: KeystrokeEvent[]) =>
    arr.reduce((s, e) => s + e.dwellTime, 0) / arr.length;

  const avgFlight = (arr: KeystrokeEvent[]) =>
    arr.reduce((s, e) => s + e.flightTime, 0) / arr.length;

  const dwellDiff = Math.abs(avgDwell(baseline) - avgDwell(current));
  const flightDiff = Math.abs(avgFlight(baseline) - avgFlight(current));

  // Normalize: typical dwell ~100ms, flight ~200ms
  const dwellScore = Math.max(0, 1 - dwellDiff / 150);
  const flightScore = Math.max(0, 1 - flightDiff / 300);

  return (dwellScore + flightScore) / 2;
}
