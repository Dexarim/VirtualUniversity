import * as THREE from "three";

export function buildFloorRoomsMap(cfg, group) {
  const map = new Map();

  (cfg?.floors || []).forEach((floorCfg) => {
    const roomMeshes = (floorCfg.rooms || [])
      .map((room) => group.getObjectByName(room.meshName))
      .filter(Boolean);
    map.set(floorCfg.meshName, roomMeshes);
  });

  return map;
}

export function getTopLevelGroupChild(group, object) {
  if (!group || !object) return null;

  let current = object;
  while (current && current.parent && current.parent !== group) {
    current = current.parent;
  }

  return current?.parent === group ? current : null;
}

export function isDescendantOf(object, ancestor) {
  let current = object;
  while (current) {
    if (current === ancestor) return true;
    current = current.parent;
  }
  return false;
}

export function attachObjectToGroup(group, object) {
  if (!group || !object || isDescendantOf(object, group)) return object;

  if (typeof group.attach === "function") {
    group.attach(object);
    return object;
  }

  if (object.parent) {
    object.parent.remove(object);
  }
  group.add(object);
  return object;
}

export function getSceneObjectMeshNames(cfg) {
  const names = new Set();

  if (cfg?.meshName) {
    names.add(cfg.meshName);
  }

  (cfg?.displayMeshes || []).forEach((meshName) => {
    if (meshName) names.add(meshName);
  });

  return Array.from(names);
}

export function isSceneObjectVisibleInMode(cfg, mode = "overview") {
  const visibleIn =
    Array.isArray(cfg?.visibleIn) && cfg.visibleIn.length
      ? cfg.visibleIn
      : ["overview"];
  return visibleIn.includes(mode);
}

export function setSceneObjectsVisibility(sceneObjectStates, mode = "overview") {
  for (const [, st] of sceneObjectStates.entries()) {
    const shouldShow = isSceneObjectVisibleInMode(st.cfg, mode);
    (st.objects || []).forEach((object) => {
      if (object) object.visible = shouldShow;
    });
  }
}

export function getSupportiveMeshNames(cfg) {
  const names = cfg?.supportiveMeshes || cfg?.alwaysVisibleMeshes || [];
  return Array.isArray(names) ? names : [];
}

export function collectConfiguredVisualMeshNames(cfg) {
  const names = new Set();

  getSupportiveMeshNames(cfg).forEach((meshName) => {
    if (meshName) names.add(meshName);
  });

  (cfg?.floors || []).forEach((floorCfg) => {
    (floorCfg.displayMeshes || []).forEach((meshName) => {
      if (meshName) names.add(meshName);
    });
  });

  return Array.from(names);
}

export function attachConfiguredVisualMeshes(modelScene, group, cfg, key) {
  const attached = [];

  collectConfiguredVisualMeshNames(cfg).forEach((meshName) => {
    let object = group.getObjectByName(meshName);
    if (!object) {
      object = modelScene.getObjectByName(meshName);
    }

    if (!object) {
      console.warn(
        "[WARN] Configured visual mesh not found in GLB:",
        meshName,
        "for",
        key
      );
      return;
    }

    attachObjectToGroup(group, object);
    attached.push(object);
  });

  return attached;
}

export function buildChildVisibilityMeta(group, cfg, floorsMeshes, floorRoomsMap) {
  const floorInfos = (floorsMeshes || []).map((mesh) => {
    const box = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    return {
      mesh,
      floorMeshName: mesh.name,
      centerY: center.y,
      height: size.y,
    };
  });

  const buildingBox = new THREE.Box3().setFromObject(group);
  const buildingHeight = buildingBox.getSize(new THREE.Vector3()).y || 1;
  const roomFloorMap = new Map();
  for (const [floorMeshName, roomMeshes] of floorRoomsMap.entries()) {
    roomMeshes.forEach((mesh) => roomFloorMap.set(mesh.uuid, floorMeshName));
  }

  const metaByUuid = new Map();
  const priorityByUuid = new Map();

  const assignMeta = (child, meta, priority = 1) => {
    if (!child) return;

    const currentPriority = priorityByUuid.get(child.uuid) ?? -1;
    if (currentPriority > priority) return;

    metaByUuid.set(child.uuid, meta);
    priorityByUuid.set(child.uuid, priority);
  };

  getSupportiveMeshNames(cfg).forEach((meshName) => {
    const object = group.getObjectByName(meshName);
    const child = getTopLevelGroupChild(group, object);
    assignMeta(
      child,
      { role: "supportive", floorMeshName: null, persistent: false },
      10
    );
  });

  (cfg?.floors || []).forEach((floorCfg) => {
    const floorObject = group.getObjectByName(floorCfg.meshName);
    assignMeta(
      getTopLevelGroupChild(group, floorObject),
      { role: "floor", floorMeshName: floorCfg.meshName, persistent: false },
      8
    );

    (floorCfg.displayMeshes || []).forEach((meshName) => {
      const object = group.getObjectByName(meshName);
      assignMeta(
        getTopLevelGroupChild(group, object),
        { role: "decor", floorMeshName: floorCfg.meshName, persistent: false },
        7
      );
    });

    (floorCfg.rooms || []).forEach((roomCfg) => {
      const object = group.getObjectByName(roomCfg.meshName);
      assignMeta(
        getTopLevelGroupChild(group, object),
        { role: "room", floorMeshName: floorCfg.meshName, persistent: false },
        9
      );
    });
  });

  group.children.forEach((child) => {
    if (metaByUuid.has(child.uuid)) {
      return;
    }

    const directFloorInfo = floorInfos.find((item) => item.mesh === child);
    if (directFloorInfo) {
      metaByUuid.set(child.uuid, {
        role: "floor",
        floorMeshName: directFloorInfo.floorMeshName,
        persistent: false,
      });
      return;
    }

    const roomFloorName = roomFloorMap.get(child.uuid);
    if (roomFloorName) {
      metaByUuid.set(child.uuid, {
        role: "room",
        floorMeshName: roomFloorName,
        persistent: false,
      });
      return;
    }

    const childBox = new THREE.Box3().setFromObject(child);
    const childCenter = childBox.getCenter(new THREE.Vector3());
    const childSize = childBox.getSize(new THREE.Vector3());
    const spansBuilding = childSize.y >= buildingHeight * 0.6;

    if (spansBuilding || floorInfos.length === 0) {
      metaByUuid.set(child.uuid, {
        role: "global",
        floorMeshName: null,
        persistent: false,
      });
      return;
    }

    let nearestFloor = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    floorInfos.forEach((floorInfo) => {
      const distance = Math.abs(childCenter.y - floorInfo.centerY);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestFloor = floorInfo.floorMeshName;
      }
    });

    metaByUuid.set(child.uuid, {
      role: nearestFloor ? "decor" : "global",
      floorMeshName: nearestFloor,
      persistent: false,
    });
  });

  return metaByUuid;
}

export function setBuildingVisualState(st, mode = "overview", floorMeshName = null) {
  if (!st?.group) return;

  st.group.children.forEach((child) => {
    const meta = st.childVisibilityMeta?.get(child.uuid);
    if (!meta) {
      child.visible = true;
      return;
    }

    if (mode === "overview") {
      child.visible = meta.role !== "room";
      return;
    }

    if (mode === "building") {
      if (meta.role === "room" || meta.role === "supportive") {
        child.visible = false;
        return;
      }

      child.visible = true;
      return;
    }

    if (mode === "floor") {
      if (meta.role === "room" || meta.role === "supportive") {
        child.visible = false;
        return;
      }

      if (meta.role === "floor") {
        child.visible = meta.floorMeshName === floorMeshName;
        return;
      }

      child.visible = true;
    }
  });
}
