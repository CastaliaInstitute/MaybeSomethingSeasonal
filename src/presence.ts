/*
 * Camera-based presence ("person detection") for the MSS kiosk display.
 *
 * A low-resolution camera stream is downscaled to a tiny grayscale canvas and
 * compared frame-to-frame. A person moving in front of the display produces a
 * small, localized burst of changed pixels; global lighting changes hit (or
 * blank) nearly the whole frame and are ignored. While nobody is present the
 * app fades to a near-black overlay so the screen stays on for detection but
 * appears off, and after a longer idle period the screen wake lock is
 * released so the OS can sleep the display. Motion — or a touch/keypress —
 * wakes it instantly.
 *
 * Everything is feature-detected: browsers without getUserMedia or the wake
 * lock API (e.g. the legacy iPad2 build) simply never dim.
 *
 * Tuning happens via URL parameters, kept in the kiosk bookmark:
 *   ?presence=1|0           force on/off (default: on in kiosk mode)
 *   ?sensitivity=1-20       motion threshold; higher = more sensitive (default 6)
 *   ?dimLevel=0-100         idle overlay darkness (default 94)
 *   ?dimDelaySec=...        idle seconds before fading out (default 45)
 *   ?sleepAfterMin=...      idle minutes before allowing OS screen sleep (default 30)
 *   ?presenceDiagnostics=1  show a tiny status pill with the current state
 */

interface PresenceInstance {
  destroy(): void;
}

interface PresenceOptions {
  sampleMs: number;
  captureWidth: number;
  captureHeight: number;
  sensitivity: number;
  dimLevel: number;
  dimDelaySec: number;
  sleepAfterMin: number;
  diagnostics: boolean;
}

interface WakeLockSentinelLike {
  release(): Promise<void>;
}
type WakeLockNavigator = Navigator & {
  wakeLock?: {
    request(type: string): Promise<WakeLockSentinelLike>;
  };
};

const STYLE_ID = "mss-presence-style";
const OVERLAY_ID = "mss-presence-dim";
const HINT_ID = "mss-presence-hint";

const injectStyles = () => {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .mss-presence-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: #000;
      opacity: 0;
      transition: opacity 2.5s ease-in-out;
      pointer-events: none;
    }
    .mss-presence-overlay.mss-presence-dimming {
      pointer-events: auto;
    }
    .mss-presence-video {
      position: fixed;
      right: 0;
      bottom: 0;
      width: 2px;
      height: 2px;
      opacity: 0.01;
      pointer-events: none;
    }
    .mss-presence-hint {
      position: fixed;
      left: 6px;
      bottom: 6px;
      z-index: 9998;
      max-width: 60vw;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.55);
      color: #fff;
      font: 500 10px/1.4 system-ui, sans-serif;
      opacity: 0.75;
      pointer-events: none;
    }
    .mss-presence-hidden {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
};

const readParams = (search: string): PresenceOptions & { forced?: boolean } => {
  const params = new URLSearchParams(search);
  const numberParam = (name: string) => {
    const raw = params.get(name);
    if (raw === null || raw === "") {
      return undefined;
    }
    const value = Number(raw);
    return Number.isFinite(value) ? value : undefined;
  };
  const presenceParam = (params.get("presence") || "").toLowerCase();
  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));
  return {
    forced:
      presenceParam === "1" || presenceParam === "true"
        ? true
        : presenceParam === "0" || presenceParam === "false"
          ? false
          : undefined,
    sampleMs: Math.max(100, numberParam("sampleMs") || 500),
    captureWidth: 32,
    captureHeight: 24,
    sensitivity: clamp(numberParam("sensitivity") || 6, 1, 40),
    dimLevel: clamp(numberParam("dimLevel") || 94, 0, 100),
    dimDelaySec: Math.max(3, numberParam("dimDelaySec") || 45),
    sleepAfterMin: Math.max(0, numberParam("sleepAfterMin") || 30),
    diagnostics: params.get("presenceDiagnostics") === "1",
  };
};

export const presenceWantedInLocation = (
  isKioskMode: boolean,
  enabled = true,
): boolean => {
  const { forced } = readParams(window.location.search);
  // A forced ?presence= wins over everything; otherwise kiosk + user toggle.
  return forced !== undefined ? forced : isKioskMode && enabled;
};

export const initPresence = (
  root: HTMLElement = document.body,
): PresenceInstance => {
  const options = readParams(window.location.search);
  injectStyles();

  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.className = "mss-presence-overlay";
  overlay.setAttribute("aria-hidden", "true");
  root.appendChild(overlay);

  const hint = document.createElement("div");
  hint.id = HINT_ID;
  hint.className = "mss-presence-hint mss-presence-hidden";
  root.appendChild(hint);

  let destroyed = false;
  let awake = true;
  let wakeLock: WakeLockSentinelLike | null = null;
  let lastMotionAt = Date.now();
  let stream: MediaStream | null = null;

  // The pill exists for warnings (camera missing/blocked) and diagnostics.
  const setHint = (text: string) => {
    if (destroyed || (!options.diagnostics && !text)) {
      return;
    }
    hint.textContent = text || "";
    hint.classList.toggle("mss-presence-hidden", !text);
  };

  const wakeLockNavigator = navigator as WakeLockNavigator;
  const acquireWakeLock = async () => {
    if (!wakeLockNavigator.wakeLock || wakeLock) {
      return;
    }
    try {
      wakeLock = await wakeLockNavigator.wakeLock.request("screen");
    } catch {
      // Reflect the failure on the next diagnostics tick instead of dying.
      wakeLock = null;
    }
  };
  const releaseWakeLock = async () => {
    const sentinel = wakeLock;
    wakeLock = null;
    try {
      await sentinel?.release();
    } catch {
      /* released automatically */
    }
  };

  const wake = () => {
    if (destroyed) {
      return;
    }
    lastMotionAt = Date.now();
    if (!awake) {
      awake = true;
      overlay.style.opacity = "0";
      overlay.classList.remove("mss-presence-dimming");
      if (options.diagnostics) {
        setHint("waking");
      } else {
        setHint("");
      }
    }
    void acquireWakeLock();
  };

  const dim = () => {
    if (destroyed) {
      return;
    }
    awake = false;
    overlay.style.opacity = `${options.dimLevel / 100}`;
    overlay.classList.add("mss-presence-dimming");
  };

  const onGesture = () => {
    wake();
  };
  overlay.addEventListener("pointerdown", onGesture);
  window.addEventListener("pointerdown", onGesture);
  window.addEventListener("keydown", onGesture);

  // Wake locks are dropped whenever the page is hidden; re-arm on return.
  const onVisibility = () => {
    if (document.visibilityState === "visible" && awake) {
      void acquireWakeLock();
    }
  };
  document.addEventListener("visibilitychange", onVisibility);

  const presenceVideo = document.createElement("video");
  presenceVideo.className = "mss-presence-video";
  presenceVideo.muted = true;
  presenceVideo.playsInline = true;
  presenceVideo.autoplay = true;
  root.appendChild(presenceVideo);

  const captureCanvas = document.createElement("canvas");
  captureCanvas.width = options.captureWidth;
  captureCanvas.height = options.captureHeight;

  let previousLuma: Uint8Array | null = null;
  let warmupFrames = 2;
  let context: CanvasRenderingContext2D | null = null;

  const analyzeFrame = () => {
    if (!presenceVideo.videoWidth || destroyed) {
      return;
    }
    if (!context) {
      context = captureCanvas.getContext("2d", {
        willReadFrequently: true,
      }) as CanvasRenderingContext2D | null;
      if (!context) {
        return;
      }
    }
    context.drawImage(
      presenceVideo,
      0,
      0,
      options.captureWidth,
      options.captureHeight,
    );
    const data = context.getImageData(
      0,
      0,
      options.captureWidth,
      options.captureHeight,
    ).data;

    const total = options.captureWidth * options.captureHeight;
    if (!previousLuma) {
      previousLuma = new Uint8Array(total);
    }
    let changed = 0;
    for (let channel = 0, pixel = 0; pixel < total; pixel += 1, channel += 4) {
      const luma =
        (data[channel] * 299 +
          data[channel + 1] * 587 +
          data[channel + 2] * 114) /
        1000;
      if (Math.abs(previousLuma[pixel] - luma) > options.sensitivity) {
        changed += 1;
      }
      previousLuma[pixel] = luma;
    }
    if (warmupFrames > 0) {
      // Discard the first frames: camera gain settles at power-on.
      warmupFrames -= 1;
      return;
    }

    const coverage = changed / total;
    // Person-sized, not camera-wide: ignore exposure shifts/flicker.
    if (coverage > 0.008 && coverage < 0.85) {
      lastMotionAt = Date.now();
      if (!awake) {
        wake();
      }
    }
  };

  const ticker = window.setInterval(() => {
    if (destroyed) {
      return;
    }
    analyzeFrame();
    const idleSec = (Date.now() - lastMotionAt) / 1000;
    if (awake) {
      if (idleSec > options.dimDelaySec) {
        dim();
      }
    } else if (
      options.sleepAfterMin > 0 &&
      idleSec / 60 > options.sleepAfterMin
    ) {
      // Long idle: let the OS put the display to sleep. Detection suspends
      // with the page; the wake lock is re-armed when the page returns.
      void releaseWakeLock();
    }
    if (options.diagnostics && !destroyed) {
      setHint(
        `${awake ? "watching" : "dimmed"} · idle ${idleSec.toFixed(0)}s`,
      );
    }
  }, options.sampleMs);
  void acquireWakeLock();

  const startCamera = async () => {
    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices || typeof mediaDevices.getUserMedia !== "function") {
      setHint("Camera unsupported — presence dimming is disabled");
      return;
    }
    try {
      stream = await mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 320 },
          height: { ideal: 240 },
          frameRate: { ideal: 10, max: 15 },
        },
        audio: false,
      });
    } catch (error) {
      const denied =
        error instanceof DOMException &&
        (error.name === "NotAllowedError" || error.name === "SecurityError");
      setHint(
        denied
          ? "Camera blocked — enable it in browser settings for auto-dim"
          : "No camera available — presence dimming is disabled",
      );
      return;
    }
    presenceVideo.srcObject = stream;
    try {
      await presenceVideo.play();
    } catch {
      /* playback continues once the stream settles */
    }
  };
  void startCamera();

  return {
    destroy() {
      destroyed = true;
      window.clearInterval(ticker);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("keydown", onGesture);
      window.removeEventListener("pointerdown", onGesture);
      overlay.removeEventListener("pointerdown", onGesture);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        stream = null;
      }
      presenceVideo.srcObject = null;
      overlay.remove();
      hint.remove();
      presenceVideo.remove();
      void releaseWakeLock();
    },
  };
};
