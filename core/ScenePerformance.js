import * as THREE from "three";

const DEFAULT_SAMPLE_MS = 1500;
const DEFAULT_MIN_PIXEL_RATIO = 0.7;
const DEFAULT_MAX_PIXEL_RATIO = 1;
const DEFAULT_DROP_STEP = 0.1;
const DEFAULT_RAISE_STEP = 0.05;

export function getRecommendedPixelRatio(
  devicePixelRatio = 1,
  maxPixelRatio = DEFAULT_MAX_PIXEL_RATIO
) {
  return Math.max(
    DEFAULT_MIN_PIXEL_RATIO,
    Math.min(devicePixelRatio || 1, maxPixelRatio)
  );
}

export function createPerformanceController({
  renderer,
  width,
  height,
  devicePixelRatio = 1,
  minPixelRatio = DEFAULT_MIN_PIXEL_RATIO,
  maxPixelRatio = DEFAULT_MAX_PIXEL_RATIO,
  sampleMs = DEFAULT_SAMPLE_MS,
  lowFpsThreshold = 28,
  highFpsThreshold = 55,
} = {}) {
  const state = {
    adaptiveEnabled: true,
    width: Math.max(1, width || window.innerWidth || 1),
    height: Math.max(1, height || window.innerHeight || 1),
    minPixelRatio,
    maxPixelRatio,
    currentPixelRatio: getRecommendedPixelRatio(devicePixelRatio, maxPixelRatio),
    sampleMs,
    lowFpsThreshold,
    highFpsThreshold,
    frameCount: 0,
    lastSampleTime: 0,
    lastFps: 0,
  };

  const applyRendererSize = () => {
    renderer.setPixelRatio(state.currentPixelRatio);
    renderer.setSize(state.width, state.height, true);
  };

  applyRendererSize();

  return {
    resize(widthValue, heightValue) {
      state.width = Math.max(1, widthValue || state.width);
      state.height = Math.max(1, heightValue || state.height);
      applyRendererSize();
    },
    update(now) {
      state.frameCount += 1;
      if (!state.lastSampleTime) {
        state.lastSampleTime = now;
        return;
      }

      const elapsed = now - state.lastSampleTime;
      if (elapsed < state.sampleMs) return;

      state.lastFps = (state.frameCount * 1000) / elapsed;
      state.frameCount = 0;
      state.lastSampleTime = now;

      if (!state.adaptiveEnabled) return;

      if (
        state.lastFps < state.lowFpsThreshold &&
        state.currentPixelRatio > state.minPixelRatio
      ) {
        state.currentPixelRatio = Math.max(
          state.minPixelRatio,
          Number((state.currentPixelRatio - DEFAULT_DROP_STEP).toFixed(2))
        );
        applyRendererSize();
        return;
      }

      if (
        state.lastFps > state.highFpsThreshold &&
        state.currentPixelRatio < state.maxPixelRatio
      ) {
        state.currentPixelRatio = Math.min(
          state.maxPixelRatio,
          Number((state.currentPixelRatio + DEFAULT_RAISE_STEP).toFixed(2))
        );
        applyRendererSize();
      }
    },
    setAdaptiveEnabled(enabled) {
      state.adaptiveEnabled = !!enabled;
      return state.adaptiveEnabled;
    },
    setPixelRatio(value) {
      if (!Number.isFinite(value)) return state.currentPixelRatio;
      state.currentPixelRatio = Math.max(
        state.minPixelRatio,
        Math.min(state.maxPixelRatio, value)
      );
      applyRendererSize();
      return state.currentPixelRatio;
    },
    getSnapshot() {
      return {
        adaptiveEnabled: state.adaptiveEnabled,
        pixelRatio: state.currentPixelRatio,
        lastFps: Math.round(state.lastFps),
        width: state.width,
        height: state.height,
      };
    },
  };
}

function applyMaterialSet(material, handler) {
  if (Array.isArray(material)) {
    material.forEach((item) => handler(item));
    return;
  }
  handler(material);
}

export function optimizeStaticModelScene(
  modelScene,
  { onMaterial = null } = {}
) {
  modelScene.traverse((obj) => {
    if (!obj.isMesh) return;

    if (!obj.userData._originalMaterial) {
      obj.userData._originalMaterial = obj.material;
    }

    if (!obj.isSkinnedMesh && !obj.morphTargetInfluences) {
      obj.matrixAutoUpdate = false;
      obj.updateMatrix();
    }

    obj.frustumCulled = true;

    applyMaterialSet(obj.material, (material) => {
      if (!material) return;

      material.polygonOffset = false;
      material.needsUpdate = true;

      if (typeof onMaterial === "function") {
        onMaterial(material, obj);
      }
    });
  });
}
