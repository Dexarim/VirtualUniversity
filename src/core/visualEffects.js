import * as THREE from "three";

const MILKY_MODEL_COLOR = new THREE.Color(0xf4efe6);
const HOVER_TINT_COLOR = new THREE.Color(0xb7b7b7);
const HOVER_PULSE_LERP = 0.18;
const BREATHING_DURATION_MS = 5000;
const BREATHING_SPEED = 0.005;
const ROOM_HIGHLIGHT_BASE_OPACITY = 0.82;
const ROOM_HIGHLIGHT_BREATH_MIN_OPACITY = 0.28;
const ROOM_HIGHLIGHT_BREATH_MAX_OPACITY = 0.98;
const ROOM_HIGHLIGHT_BASE_EMISSIVE = 0.22;
const ROOM_HIGHLIGHT_BREATH_MIN_EMISSIVE = 0.08;
const ROOM_HIGHLIGHT_BREATH_MAX_EMISSIVE = 0.72;

export function setHoverPulseState(hoverPulseStates, clickable, active) {
  if (!clickable || !["building", "floor"].includes(clickable.kind)) return;

  const targetObject = clickable.parentObject;
  if (!targetObject) return;

  const key = targetObject.uuid;
  let state = hoverPulseStates.get(key);
  if (!state) {
    state = {
      object: targetObject,
      kind: clickable.kind,
      tintTargets:
        clickable.kind === "building"
          ? collectHoverTintTargets(targetObject, 3)
          : clickable.kind === "floor"
            ? collectHoverTintTargets(targetObject, 2)
            : [],
      hoverMaterials: null,
      baseScale: targetObject.scale.clone(),
      weight: 0,
      active: false,
    };
    hoverPulseStates.set(key, state);
  }

  state.active = !!active;
}

export function setRoomHoverBreathingState(
  breathingRoomStates,
  clickable,
  active
) {
  if (!clickable || clickable.kind !== "room") return;

  const targetRoom = clickable.parentObject;
  if (!targetRoom) return;

  const meshName = targetRoom.name || targetRoom.uuid;
  let state = breathingRoomStates.get(meshName);
  if (!state) {
    state = {
      meshName,
      hoverActive: false,
      searchStartTime: null,
    };
    breathingRoomStates.set(meshName, state);
  }

  state.hoverActive = !!active;
  if (!state.hoverActive && state.searchStartTime == null) {
    breathingRoomStates.delete(meshName);
  }
}

export function highlightRoom({
  mesh,
  type,
  roomFilter,
  highlightedRoomsMeshes,
  highlightedRoomsStates,
}) {
  if (!mesh || !mesh.isMesh) return;

  const color = roomFilter.getColorForType(type);
  const meshName = mesh.name || mesh.uuid;

  if (!highlightedRoomsStates.has(meshName)) {
    highlightedRoomsStates.set(meshName, {
      originalMaterial: mesh.material || null,
      highlightedMaterial: null,
      highlighted: false,
    });
  }

  const state = highlightedRoomsStates.get(meshName);
  if (!state) return;

  disposeMaterialSet(state.highlightedMaterial);

  const highlightedMaterial = createHighlightedMaterial(
    state.originalMaterial || mesh.material,
    color
  );

  mesh.material = highlightedMaterial;
  highlightedRoomsMeshes.set(meshName, mesh);

  state.highlightedMaterial = highlightedMaterial;
  state.highlighted = true;
}

export function clearRoomHighlights({
  breathingRoomStates,
  highlightedRoomsMeshes,
  highlightedRoomsStates,
}) {
  breathingRoomStates.clear();

  for (const [meshName, mesh] of highlightedRoomsMeshes.entries()) {
    const state = highlightedRoomsStates.get(meshName);
    if (state && state.originalMaterial) {
      mesh.material = state.originalMaterial;
    }
    if (state) {
      disposeMaterialSet(state.highlightedMaterial);
      state.highlightedMaterial = null;
      state.highlighted = false;
    }
  }
  highlightedRoomsMeshes.clear();
}

export function startRoomBreathing(breathingRoomStates, mesh) {
  if (!mesh) return;

  const meshName = mesh.name || mesh.uuid;
  const existing = breathingRoomStates.get(meshName);
  breathingRoomStates.set(meshName, {
    meshName,
    hoverActive: existing?.hoverActive || false,
    searchStartTime: performance.now(),
  });
}

export function animateBreathingRooms(
  time,
  { breathingRoomStates, highlightedRoomsStates }
) {
  for (const [meshName, state] of breathingRoomStates.entries()) {
    const roomState = highlightedRoomsStates.get(meshName);
    if (!roomState?.highlightedMaterial) {
      breathingRoomStates.delete(meshName);
      continue;
    }

    const hasSearchAnimation = typeof state.searchStartTime === "number";
    const elapsed = hasSearchAnimation ? time - state.searchStartTime : 0;
    const searchExpired = hasSearchAnimation && elapsed >= BREATHING_DURATION_MS;

    if (!state.hoverActive && searchExpired) {
      updateHighlightedMaterialAppearance(
        roomState.highlightedMaterial,
        ROOM_HIGHLIGHT_BASE_OPACITY,
        ROOM_HIGHLIGHT_BASE_EMISSIVE
      );
      breathingRoomStates.delete(meshName);
      continue;
    }

    if (searchExpired) {
      state.searchStartTime = null;
    }

    const pulse = (Math.sin(time * BREATHING_SPEED) + 1) * 0.5;
    const opacity = THREE.MathUtils.lerp(
      ROOM_HIGHLIGHT_BREATH_MIN_OPACITY,
      ROOM_HIGHLIGHT_BREATH_MAX_OPACITY,
      pulse
    );
    const emissiveIntensity = THREE.MathUtils.lerp(
      ROOM_HIGHLIGHT_BREATH_MIN_EMISSIVE,
      ROOM_HIGHLIGHT_BREATH_MAX_EMISSIVE,
      pulse
    );

    updateHighlightedMaterialAppearance(
      roomState.highlightedMaterial,
      opacity,
      emissiveIntensity
    );
  }
}

export function animateHoverPulses(time, hoverPulseStates) {
  void time;

  for (const [key, state] of hoverPulseStates.entries()) {
    if (!state.object) {
      hoverPulseStates.delete(key);
      continue;
    }

    state.weight = THREE.MathUtils.lerp(
      state.weight,
      state.active ? 1 : 0,
      HOVER_PULSE_LERP
    );

    if (!state.active && state.weight < 0.001) {
      state.object.scale.copy(state.baseScale);
      if (state.kind === "building" || state.kind === "floor") {
        releaseHoverMaterials(state);
      }
      hoverPulseStates.delete(key);
      continue;
    }

    state.object.scale.copy(state.baseScale);

    if (state.kind === "building" || state.kind === "floor") {
      setMeshCollectionTintBlend(
        state.tintTargets,
        MILKY_MODEL_COLOR,
        HOVER_TINT_COLOR,
        Math.min(1, state.weight * 0.95),
        state
      );
    }
  }
}

export function tintMaterialToMilky(material) {
  const tintOne = (mat) => {
    if (!mat) return;

    if (mat.color?.set) {
      mat.color.set(MILKY_MODEL_COLOR);
    }

    if (mat.emissive?.set) {
      mat.emissive.set(0x241f1a);
      mat.emissiveIntensity = Math.min(mat.emissiveIntensity || 0, 0.04);
    }

    if ("roughness" in mat && typeof mat.roughness === "number") {
      mat.roughness = Math.max(mat.roughness, 0.88);
    }

    if ("metalness" in mat && typeof mat.metalness === "number") {
      mat.metalness = Math.min(mat.metalness, 0.12);
    }

    mat.needsUpdate = true;
  };

  if (Array.isArray(material)) {
    material.forEach((mat) => tintOne(mat));
    return;
  }

  tintOne(material);
}

function createHighlightedMaterial(material, color) {
  const tintMaterial = (sourceMaterial) => {
    if (!sourceMaterial) {
      return new THREE.MeshPhongMaterial({
        color,
        emissive: color,
        emissiveIntensity: ROOM_HIGHLIGHT_BASE_EMISSIVE,
        transparent: true,
        opacity: ROOM_HIGHLIGHT_BASE_OPACITY,
        side: THREE.DoubleSide,
      });
    }

    const nextMaterial = sourceMaterial.clone
      ? sourceMaterial.clone()
      : new THREE.MeshPhongMaterial();

    if (nextMaterial.color?.set) {
      nextMaterial.color.set(color);
    }

    if (nextMaterial.emissive?.set) {
      nextMaterial.emissive.set(color);
      nextMaterial.emissiveIntensity = Math.max(
        nextMaterial.emissiveIntensity || 0,
        ROOM_HIGHLIGHT_BASE_EMISSIVE
      );
    }

    nextMaterial.transparent = true;
    nextMaterial.opacity = Math.min(
      nextMaterial.opacity ?? 1,
      ROOM_HIGHLIGHT_BASE_OPACITY
    );
    nextMaterial.side = THREE.DoubleSide;
    nextMaterial.needsUpdate = true;
    return nextMaterial;
  };

  return Array.isArray(material)
    ? material.map((item) => tintMaterial(item))
    : tintMaterial(material);
}

function disposeMaterialSet(material) {
  if (!material) return;

  if (Array.isArray(material)) {
    material.forEach((item) => item?.dispose?.());
    return;
  }

  material.dispose?.();
}

function updateHighlightedMaterialAppearance(
  material,
  opacity,
  emissiveIntensity
) {
  const updateOne = (mat) => {
    if (!mat) return;
    mat.transparent = true;
    mat.opacity = opacity;
    if (mat.emissiveIntensity !== undefined) {
      mat.emissiveIntensity = emissiveIntensity;
    }
  };

  if (Array.isArray(material)) {
    material.forEach((mat) => updateOne(mat));
    return;
  }

  updateOne(material);
}

function collectHoverTintTargets(object, maxDepth = 2) {
  const targets = [];

  const visit = (node, depth) => {
    if (!node) return;

    if (node.isMesh) {
      targets.push(node);
      return;
    }

    if (depth >= maxDepth) {
      return;
    }

    node.children?.forEach((child) => visit(child, depth + 1));
  };

  visit(object, 0);
  return targets;
}

function cloneMaterialSet(material) {
  if (!material) return material;
  if (Array.isArray(material)) {
    return material.map((item) => item?.clone?.() || item);
  }
  return material.clone?.() || material;
}

function disposeMaterialCloneSet(material) {
  if (!material) return;
  if (Array.isArray(material)) {
    material.forEach((item) => item?.dispose?.());
    return;
  }
  material.dispose?.();
}

function ensureHoverMaterials(state) {
  if (!state?.tintTargets?.length || state.hoverMaterials) return;

  state.hoverMaterials = state.tintTargets.map((mesh) => {
    const originalMaterial = mesh.material;
    const hoverMaterial = cloneMaterialSet(originalMaterial);
    mesh.material = hoverMaterial;
    return { mesh, originalMaterial, hoverMaterial };
  });
}

function releaseHoverMaterials(state) {
  if (!state?.hoverMaterials) return;

  state.hoverMaterials.forEach(({ mesh, originalMaterial, hoverMaterial }) => {
    mesh.material = originalMaterial;
    disposeMaterialCloneSet(hoverMaterial);
  });

  state.hoverMaterials = null;
}

function setMeshCollectionTintBlend(
  targets,
  fromColor,
  toColor,
  blend,
  state = null
) {
  if (!targets?.length) return;

  if (state?.kind === "building" || state?.kind === "floor") {
    ensureHoverMaterials(state);
  }

  const applyTint = (mesh) => {
    const setMaterialColor = (material) => {
      if (!material?.color?.lerpColors) return;
      material.color.lerpColors(fromColor, toColor, blend);
    };

    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((material) => setMaterialColor(material));
      return;
    }

    setMaterialColor(mesh.material);
  };

  targets.forEach((mesh) => applyTint(mesh));
}
