function createFpsController(container = document.body) {
  let overlay = null;
  const state = {
    enabled: false,
    lastSampleTime: 0,
    frameCount: 0,
  };

  const ensureOverlay = () => {
    if (overlay?.isConnected) return overlay;

    overlay = document.createElement("div");
    overlay.id = "fps-overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      top: "16px",
      left: "16px",
      zIndex: "9999",
      padding: "6px 10px",
      borderRadius: "10px",
      background: "rgba(20, 24, 31, 0.72)",
      color: "#f4efe6",
      fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
      fontSize: "12px",
      fontWeight: "600",
      letterSpacing: "0.04em",
      pointerEvents: "none",
      userSelect: "none",
      boxShadow: "0 10px 28px rgba(0, 0, 0, 0.18)",
      display: "none",
    });
    overlay.textContent = "FPS: --";
    container.appendChild(overlay);
    return overlay;
  };

  const setEnabled = (enabled) => {
    state.enabled = !!enabled;
    state.lastSampleTime = performance.now();
    state.frameCount = 0;

    const nextOverlay = ensureOverlay();
    nextOverlay.style.display = state.enabled ? "block" : "none";
    nextOverlay.textContent = state.enabled ? "FPS: --" : "FPS: off";

    console.log(`FPS counter: ${state.enabled ? "enabled" : "disabled"}`);
    return state.enabled;
  };

  return {
    enable() {
      return setEnabled(true);
    },
    disable() {
      return setEnabled(false);
    },
    toggle() {
      return setEnabled(!state.enabled);
    },
    isEnabled() {
      return state.enabled;
    },
    update(now) {
      if (!state.enabled) return;

      state.frameCount += 1;

      const elapsed = now - state.lastSampleTime;
      if (elapsed < 250) return;

      const fps = Math.round((state.frameCount * 1000) / elapsed);
      ensureOverlay().textContent = `FPS: ${fps}`;
      state.lastSampleTime = now;
      state.frameCount = 0;
    },
  };
}

export function installDebugConsole({
  container = document.body,
  debugManager,
  buildingStates,
  cameraSettings,
  performanceController = null,
}) {
  const fpsController = createFpsController(container);

  const setHitboxDebug = (enabled) => {
    const nextValue = !!enabled;
    debugManager?.set?.(nextValue);

    for (const st of buildingStates?.values?.() || []) {
      st.hitboxManager?.enableDebug?.(nextValue);
    }

    console.log(`Hitbox debug: ${nextValue ? "enabled" : "disabled"}`);
    return nextValue;
  };

  const Hitbox = {
    enable() {
      return setHitboxDebug(true);
    },
    disable() {
      return setHitboxDebug(false);
    },
    toggle() {
      return setHitboxDebug(!debugManager?.enabled);
    },
    status() {
      const enabled = !!debugManager?.enabled;
      console.log("Hitbox debug:", enabled);
      return enabled;
    },
  };

  const FPS = {
    enable() {
      return fpsController.enable();
    },
    disable() {
      return fpsController.disable();
    },
    toggle() {
      return fpsController.toggle();
    },
    status() {
      const enabled = fpsController.isEnabled();
      console.log("FPS counter:", enabled);
      return enabled;
    },
  };

  const Camera = {
    setFactor(nextSettings = {}) {
      Object.assign(cameraSettings, nextSettings || {});
      console.log("CAMERA_SETTINGS updated:", cameraSettings);
      return { ...cameraSettings };
    },
    status() {
      console.log("CAMERA_SETTINGS:", cameraSettings);
      return { ...cameraSettings };
    },
  };

  const Debug = {
    enable() {
      return Hitbox.enable();
    },
    disable() {
      return Hitbox.disable();
    },
    toggle() {
      return Hitbox.toggle();
    },
    status() {
      const snapshot = {
        hitbox: !!debugManager?.enabled,
        fps: fpsController.isEnabled(),
        camera: { ...cameraSettings },
        performance: performanceController?.getSnapshot?.() || null,
      };
      console.log("Debug status:", snapshot);
      return snapshot;
    },
  };

  const Performance = {
    status() {
      const snapshot = performanceController?.getSnapshot?.() || null;
      console.log("Performance:", snapshot);
      return snapshot;
    },
    adaptiveOn() {
      return performanceController?.setAdaptiveEnabled?.(true);
    },
    adaptiveOff() {
      return performanceController?.setAdaptiveEnabled?.(false);
    },
    pixelRatio(value) {
      return performanceController?.setPixelRatio?.(value);
    },
  };

  window.Debug = Debug;
  window.Hitbox = Hitbox;
  window.FPS = FPS;
  window.Camera = Camera;
  window.Performance = Performance;

  // Backward-compatible aliases for the existing console calls.
  window.enableGlobalDebug = (value) => setHitboxDebug(value);
  window.setCameraFactor = (value) => Camera.setFactor(value);
  window.fps = FPS;

  return {
    update(now) {
      fpsController.update(now);
    },
    isFpsEnabled() {
      return fpsController.isEnabled();
    },
    commands: { Debug, Hitbox, FPS, Camera, Performance },
  };
}
