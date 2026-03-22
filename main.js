import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { HitboxManager } from "./core/HitboxManager.js";
import { DebugManager } from "./core/DebugManager.js";
import { DataManager } from "./core/DataManager.js";

import { InfoPanel } from "./ui/InfoPanel.js";
import { PanoramaOverlay } from "./ui/PanoramaOverlay.js";
import { Tooltip } from "./ui/Tooltip.js";
import { RoomFilter } from "./ui/RoomFilter.js";

// ---------------- globals ----------------

let scene, camera, renderer, controls;
let debugManager, dataManager;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

// Тултип для объектов
let tooltip = null;
let lastHoveredObject = null;
let mouseX = 0;
let mouseY = 0;

// RoomFilter — фильтр и поиск кабинетов
let roomFilter = null;
let highlightedRoomsMeshes = new Map(); // { meshName: original mesh }
let highlightedRoomsStates = new Map(); // { meshName: { originalMaterial, highlighted: bool } }

// Map<buildingKey, { cfg, group, floorsMeshes, roomsMeshes, hitboxManager }>
const buildingStates = new Map();
let navStack = [];

// Панорамный оверлей
let panoOverlay = null;

// ---------------- camera configuration ----------------
const CAMERA_SETTINGS = {
  overviewFactor: 0.6,
  buildingFactor: 0.7,
  floorFactor: 0.5,
};

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

const hoverPulseStates = new Map();
const breathingRoomStates = new Map();

// ---------------- NAV helpers ----------------
function pushNav(state, meta = {}) {
  const last = navStack[navStack.length - 1];
  try {
    const sameState = last && last.state === state;
    const sameMeta = last && JSON.stringify(last.meta) === JSON.stringify(meta);
    if (sameState && sameMeta) return;
  } catch (e) {}
  navStack.push({ state, meta });
}

function popNav() {
  navStack.pop();
  return navStack[navStack.length - 1];
}

function getCurrentNavState() {
  return navStack[navStack.length - 1]?.state || null;
}

function getCurrentNavEntry() {
  return navStack[navStack.length - 1] || null;
}

function setHoverPulseState(clickable, active) {
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
          ? collectHoverTintTargets(targetObject, Number.POSITIVE_INFINITY)
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

function setRoomHoverBreathingState(clickable, active) {
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

function resetHoverState() {
  setHoverPulseState(lastHoveredObject, false);
  setRoomHoverBreathingState(lastHoveredObject, false);
  lastHoveredObject?.setHover?.(false);
  lastHoveredObject = null;
  tooltip?.hide();
}

function goBack() {
  if (navStack.length <= 1) {
    navStack.length = 0;
    showAllBuildingsOverview();
    return;
  }
  navStack.pop();
  const last = navStack[navStack.length - 1];
  if (!last) {
    showAllBuildingsOverview();
    return;
  }
  switch (last.state) {
    case "buildings_overview":
      showAllBuildingsOverview();
      break;
    case "building_floors":
      showFloorsForBuilding(last.meta.buildingKey);
      break;
    case "building_floor":
      showSingleFloorForBuilding(
        last.meta.buildingKey,
        last.meta.floorMeshName
      );
      break;
    default:
      showAllBuildingsOverview();
      break;
  }
}

// ---------------- camera helper ----------------
function safeSetCameraToBox(box, factor = 1.2) {
  if (!box || box.isEmpty()) {
    camera.position.set(5, 5, 5);
    controls.target.set(0, 0, 0);
    controls.update();
    return;
  }
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3()).length();
  camera.position.set(
    center.x + size * factor,
    center.y + size * factor * 0.6,
    center.z + size * factor
  );
  controls.target.copy(center);
  controls.update();
}

// ---------------- three init ----------------
function initThree() {
  const container = document.getElementById("app") || document.body;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222);

  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  camera.position.set(2, 2, 2);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
  hemi.position.set(0, 10, 0);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(-5, 10, 5);
  scene.add(dir);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // делегируем pointer события всем HitboxManager-ам
  renderer.domElement.addEventListener("pointermove", (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    // Сохраняем позицию мыши для тултипа
    mouseX = e.clientX;
    mouseY = e.clientY;

    let hoveredObject = null;

    for (const st of buildingStates.values()) {
      try {
        hoveredObject = st.hitboxManager?.handleHover(raycaster);
        if (hoveredObject) break;
      } catch (err) {
        // игнорируем manager'ы с ошибками
      }
    }

    // Обновляем тултип при изменении наведённого объекта
    if (hoveredObject !== lastHoveredObject) {
      setHoverPulseState(lastHoveredObject, false);
      setRoomHoverBreathingState(lastHoveredObject, false);
      setHoverPulseState(hoveredObject, true);
      setRoomHoverBreathingState(hoveredObject, true);
      lastHoveredObject = hoveredObject;

      if (hoveredObject && hoveredObject.parentObject) {
        const obj = hoveredObject.parentObject;
        tooltip?.show(
          {
            name: obj.userData?.name || obj.name || "Объект",
            description: obj.userData?.description || "",
          },
          mouseX,
          mouseY
        );
      } else {
        tooltip?.hide();
      }
    } else if (hoveredObject && tooltip) {
      // Обновляем позицию тултипа при движении мыши над одним объектом
      tooltip.updatePosition(mouseX, mouseY);
    }
  });

  renderer.domElement.addEventListener("pointerleave", () => {
    setHoverPulseState(lastHoveredObject, false);
    setRoomHoverBreathingState(lastHoveredObject, false);
    lastHoveredObject?.setHover?.(false);
    tooltip?.hide();
    lastHoveredObject = null;
  });

  renderer.domElement.addEventListener("pointerdown", (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    for (const [key, st] of buildingStates.entries()) {
      try {
        const clicked = st.hitboxManager?.handleClick(raycaster);
        if (clicked) {
          handleClickableClick(key, st, clicked);
          break;
        }
      } catch (err) {}
    }
  });
}

// ---------------- model loader ----------------
async function loadModelScene(url) {
  const loader = new GLTFLoader();
  return await new Promise((res, rej) =>
    loader.load(url, (g) => res(g.scene), undefined, rej)
  );
}

// ---------------- click handling ----------------
function handleClickableClick(buildingKey, state, clickableParent) {
  const meshName = clickableParent?.name;
  const cfg = state.cfg;
  console.log("[click] building:", buildingKey, "mesh:", meshName);

  // клик по группе/зданию
  if (clickableParent === state.group || meshName === cfg.meshName) {
    showFloorsForBuilding(buildingKey);
    return;
  }

  // клик по этажу
  const floorCfg = (cfg.floors || []).find((f) => f.meshName === meshName);
  if (floorCfg) {
    showSingleFloorForBuilding(buildingKey, floorCfg.meshName);
    return;
  }

  // клик по кабинету
  // клик по кабинету — заменяем старый блок на этот
  for (const f of cfg.floors || []) {
    const room = (f.rooms || []).find((r) => r.meshName === meshName);
    if (room) {
      // показываем панель с информацией (если есть)
      if (window._infoPanel?.show) window._infoPanel.show(room);

      // Открываем панораму (поддерживаем несколько форматов)
      const panoOverlay = window._panoOverlay;
      if (panoOverlay) {
        // 1) Если есть массив panoramas — открываем последовательность
        if (Array.isArray(room.panoramas) && room.panoramas.length > 0) {
          // ожидаемый элемент массива: { id, url, title, hotspots, startYaw, startPitch }
          panoOverlay.openSequence(room.panoramas, 0);
        }
        // 2) Совместимость: если поле panorama — строка (URL)
        else if (typeof room.panorama === "string" && room.panorama.trim()) {
          panoOverlay.open(room.panorama);
        }
        // 3) Если panorama — объект с { url, ... } — конвертируем в массив
        else if (
          room.panorama &&
          typeof room.panorama === "object" &&
          room.panorama.url
        ) {
          panoOverlay.openSequence(
            [
              {
                id: room.panorama.id || "__single",
                url: room.panorama.url,
                ...room.panorama,
              },
            ],
            0
          );
        }
      }

      return;
    }
  }

  console.log("[click] нераспознанный объект:", meshName);
}

// ---------------- view functions ----------------
function showAllBuildingsOverview() {
  resetHoverState();
  clearRoomHighlights();

  for (const [k, st] of buildingStates.entries()) {
    st.group.visible = true;
    st.group.traverse((o) => (o.visible = true));
    try {
      st.hitboxManager?.setLevel("building");
    } catch {}
    // по умолчанию скрыть визуальные хитбоксы этажей и комнат
    try {
      // отключаем визуальные хитбоксы этажей по умолчанию
      (st.hitboxManager?.hitboxes?.floors || []).forEach((hb) =>
        hb.showDebug?.(false)
      );

      const roomsStore = st.hitboxManager?.hitboxes?.rooms || {};
      for (const arr of Object.values(roomsStore)) {
        (arr || []).forEach((r) => {
          // скрываем визуал; оставляем hitbox.mesh в сцене чтобы raycast мог работать,
          // но сделаем его прозрачным ниже если debug выключен
          try {
            r.showDebug?.(false);
            // логическая видимость (активность) — true/false
            r.setVisible?.(false);
            if (r.hitbox) {
              // при обзорном уровне мы не хотим, чтобы комнаты были активными
              r.hitbox.visible = debugManager?.enabled ? false : true;
              if (!debugManager?.enabled) {
                // если debug выключен — сделаем прозрачным, но видимым (чтобы raycast сработал)
                try {
                  r.hitbox.material && (r.hitbox.material.opacity = 0);
                } catch (e) {}
              }
            }
          } catch (e) {}
        });
      }
    } catch (e) {}
  }

  pushNav("buildings_overview");

  const box = new THREE.Box3();
  for (const st of buildingStates.values()) box.expandByObject(st.group);
  safeSetCameraToBox(box, CAMERA_SETTINGS.overviewFactor);

  syncRoomHighlightsWithCurrentState();
}

function showFloorsForBuilding(buildingKey) {
  const st = buildingStates.get(buildingKey);
  if (!st) return;
  resetHoverState();
  clearRoomHighlights();

  for (const [k, other] of buildingStates.entries()) {
    if (k === buildingKey) {
      other.group.visible = true;
      other.group.children.forEach(
        (ch) => (ch.visible = st.floorsMeshes.includes(ch))
      );
      try {
        other.hitboxManager?.setLevel("floors");
      } catch {}
      try {
        other.hitboxManager?.hitboxes?.building?.showDebug(false);
      } catch {}
    } else {
      other.group.visible = false;
      try {
        other.hitboxManager?.setLevel("none");
      } catch {}
    }
  }

  if (window._infoPanel?.show) window._infoPanel.show(st.cfg);
  pushNav("building_floors", { buildingKey });
  safeSetCameraToBox(
    new THREE.Box3().setFromObject(st.group),
    CAMERA_SETTINGS.buildingFactor
  );
  syncRoomHighlightsWithCurrentState();
}

// Показать этаж и подготовить комнаты
function showSingleFloorForBuilding(buildingKey, floorMeshName) {
  const st = buildingStates.get(buildingKey);
  if (!st) return;
  resetHoverState();
  clearRoomHighlights();

  const floorMesh = st.group.getObjectByName(floorMeshName);
  if (!floorMesh) {
    console.warn("showSingleFloorForBuilding: floor not found:", floorMeshName);
    return;
  }

  // показываем только этот этаж в группе
  st.group.children.forEach((ch) => (ch.visible = ch === floorMesh));

  // находим конфигурацию этажа и его комнаты (массы мешей)
  const floorCfg = (st.cfg.floors || []).find(
    (f) => f.meshName === floorMeshName
  );
  const roomsArr = (floorCfg?.rooms || [])
    .map((r) => st.group.getObjectByName(r.meshName))
    .filter(Boolean);

  // сначала скрываем все комнаты-объекты (mesh)
  st.roomsMeshes?.forEach?.((m) => {
    if (m) m.visible = false;
  });

  // показываем только те меши, которые относятся к этому этажу
  roomsArr.forEach((rm) => {
    rm.visible = true;
  });

  // устанавливаем уровень хитбоксов в rooms и передаём массив видимых комнат для debug-показа
  try {
    st.hitboxManager?.setLevel("rooms", roomsArr);
  } catch (e) {}

  // Поскольку HitboxManager.getActiveHitboxes может возвращать все room-hitboxes,
  // мы дополнительно выставим логическую активность и визуальную прозрачность для хитбоксов:
  try {
    const roomsStore = st.hitboxManager?.hitboxes?.rooms || {};
    for (const [floorKey, arr] of Object.entries(roomsStore)) {
      (arr || []).forEach((clickable) => {
        const shouldBeActive = roomsArr.includes(clickable.parentObject);
        // логическое состояние (используется нами/интерфейсом)
        clickable.setVisible?.(shouldBeActive);
        // Визуальная часть:
        if (clickable.hitbox) {
          if (debugManager?.enabled) {
            // если debug включён — показываем только активные хитбоксы
            clickable.showDebug?.(shouldBeActive);
            // и делаем их полупрозрачными/цветными как обычно
          } else {
            // если debug выключен — хотим, чтобы хитбокс был невидим, но кликабельным
            // создаём хитбокс без переключения debugVisible
            clickable.ensureHitbox?.(); // гарантируем, что _hitbox создан и в сцене
            clickable.hitbox.visible = true;
            try {
              if (clickable.hitbox.material) {
                clickable.hitbox.material.transparent = true;
                clickable.hitbox.material.opacity = 0; // полностью прозрачный
                clickable.hitbox.material.needsUpdate = true;
              }
            } catch (e) {}
          }
        }
      });
    }
  } catch (e) {
    console.warn("Ошибка при конфигурировании room-hitboxes:", e);
  }

  if (window._infoPanel?.show) window._infoPanel.show(floorCfg || st.cfg);
  pushNav("building_floor", { buildingKey, floorMeshName });
  safeSetCameraToBox(
    new THREE.Box3().setFromObject(floorMesh),
    CAMERA_SETTINGS.floorFactor
  );
  syncRoomHighlightsWithCurrentState();
}

// =============== RoomFilter Functions ===============

// Навигация к кабинету: показываем его на сцене и фокусируем камеру
function goToRoom(roomData) {
  if (!roomData || !roomData.buildingKey) return;

  const st = buildingStates.get(roomData.buildingKey);
  if (!st) return;
  resetHoverState();
  clearRoomHighlights();

  // Показываем здание
  for (const [k, other] of buildingStates.entries()) {
    other.group.visible = k === roomData.buildingKey;
  }

  // Показываем только этот этаж
  st.group.children.forEach((ch) => (ch.visible = false));
  const floorMesh = st.group.getObjectByName(
    // Ищем этаж, на котором находится кабинет
    (st.cfg.floors || []).find((f) =>
      (f.rooms || []).some((r) => r.meshName === roomData.meshName)
    )?.meshName || roomData.floorName
  );

  if (floorMesh) {
    floorMesh.visible = true;
  }

  // Показываем только эту комнату
  st.roomsMeshes?.forEach?.((m) => {
    if (m) m.visible = false;
  });

  // Устанавливаем уровень хитбоксов
  try {
    st.hitboxManager?.setLevel("rooms", [roomData.mesh]);
  } catch (e) {}

  // Фокусируем камеру на кабинете
  if (roomData.mesh) {
    const box = new THREE.Box3().setFromObject(roomData.mesh);
    safeSetCameraToBox(box, 0.5); // плотнее фокус на кабинет
  }

  // Скрываем фильтр
  if (roomFilter) roomFilter.hide();

  // Обновляем навигацию
  pushNav("building_room", {
    buildingKey: roomData.buildingKey,
    roomMeshName: roomData.meshName,
  });

  syncRoomHighlightsWithCurrentState(roomData.meshName);

  if (roomData.mesh) {
    startRoomBreathing(roomData.mesh);
  }
}

function collectAllRooms() {
  const allRooms = [];
  for (const [buildingKey, st] of buildingStates.entries()) {
    const cfg = st.cfg;
    const buildingName = cfg.name || buildingKey;

    (cfg.floors || []).forEach((floorCfg) => {
      (floorCfg.rooms || []).forEach((roomCfg) => {
        const roomMesh = st.group.getObjectByName(roomCfg.meshName);
        if (roomMesh) {
          allRooms.push({
            name: roomCfg.name || roomCfg.meshName,
            buildingKey,
            buildingName,
            floorName: floorCfg.name || floorCfg.meshName,
            floorMeshName: floorCfg.meshName,
            meshName: roomCfg.meshName,
            mesh: roomMesh,
            type: roomCfg.type || "other",
            description: roomCfg.description || "",
          });
        }
      });
    });
  }

  return allRooms;
}

function getRoomsForCurrentState() {
  const entry = getCurrentNavEntry();
  const allRooms = collectAllRooms();
  if (!entry) return [];

  switch (entry.state) {
    case "buildings_overview":
      return allRooms;
    case "building_floor":
      return allRooms.filter(
        (room) =>
          room.buildingKey === entry.meta.buildingKey &&
          room.floorMeshName === entry.meta.floorMeshName
      );
    case "building_room":
      return allRooms.filter(
        (room) =>
          room.buildingKey === entry.meta.buildingKey &&
          room.meshName === entry.meta.roomMeshName
      );
    default:
      return [];
  }
}

function syncRoomHighlightsWithCurrentState(forceRoomMeshName = null) {
  const filters = roomFilter?.getActiveFilters?.().filters || [];
  const navEntry = getCurrentNavEntry();
  const allRooms = collectAllRooms();
  const scopedRooms = getRoomsForCurrentState();
  const visibleScopedNames = new Set(scopedRooms.map((room) => room.meshName));
  const activeRoomMeshes = [];

  clearRoomHighlights();

  allRooms.forEach((room) => {
    if (room.mesh) room.mesh.visible = false;
  });

  if (getCurrentNavState() === "building_floors") {
    return;
  }

  scopedRooms.forEach((room) => {
    const shouldForceShow = forceRoomMeshName && room.meshName === forceRoomMeshName;
    const isFilterEnabled = filters.includes(room.type);
    const shouldShow = shouldForceShow || isFilterEnabled;

    if (!room.mesh || !visibleScopedNames.has(room.meshName) || !shouldShow) {
      return;
    }

    room.mesh.visible = true;
    highlightRoom(room.mesh, room.type);
    activeRoomMeshes.push(room.mesh);
  });

  if (navEntry?.state === "building_floor" || navEntry?.state === "building_room") {
    const currentBuilding = buildingStates.get(navEntry.meta.buildingKey);
    currentBuilding?.hitboxManager?.setLevel?.("rooms", activeRoomMeshes);
  }
}

function applyRoomFilter(config = {}) {
  const search = (config?.search || "").trim().toLowerCase();
  syncRoomHighlightsWithCurrentState();

  const allRooms = collectAllRooms();

  if (!search) {
    roomFilter?.resetSearchResults();
    return;
  }

  const filtered = allRooms.filter(
    (r) =>
      r.name.toLowerCase().includes(search) ||
      r.meshName.toLowerCase().includes(search)
  );

  if (filtered.length === 0) {
    if (roomFilter) roomFilter.updateSearchResults([]);
    return;
  }

  if (roomFilter) {
    roomFilter.updateSearchResults(
      filtered.map((r) => ({
        name: r.name,
        building: r.buildingName,
        buildingKey: r.buildingKey,
        floorName: r.floorName,
        meshName: r.meshName,
        mesh: r.mesh,
        type: r.type,
        description: r.description,
      }))
    );
  }
}

function highlightRoom(mesh, type) {
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

function clearRoomHighlights() {
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

function updateHighlightedMaterialAppearance(material, opacity, emissiveIntensity) {
  const updateOne = (mat) => {
    if (!mat) return;
    mat.transparent = true;
    mat.opacity = opacity;
    if (mat.emissiveIntensity !== undefined) {
      mat.emissiveIntensity = emissiveIntensity;
    }
    mat.needsUpdate = true;
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

function setMeshCollectionTintBlend(targets, fromColor, toColor, blend, state = null) {
  if (!targets?.length) return;

  if (state?.kind === "building" || state?.kind === "floor") {
    ensureHoverMaterials(state);
  }

  const applyTint = (mesh) => {
    const setMaterialColor = (material) => {
      if (!material?.color?.lerpColors) return;
      material.color.lerpColors(fromColor, toColor, blend);
      material.needsUpdate = true;
    };

    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((material) => setMaterialColor(material));
      return;
    }

    setMaterialColor(mesh.material);
  };

  targets.forEach((mesh) => applyTint(mesh));
}

function startRoomBreathing(mesh) {
  if (!mesh) return;

  const meshName = mesh.name || mesh.uuid;
  const existing = breathingRoomStates.get(meshName);
  breathingRoomStates.set(meshName, {
    meshName,
    hoverActive: existing?.hoverActive || false,
    searchStartTime: performance.now(),
  });
}

function animateBreathingRooms(time) {
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

function animateHoverPulses(time) {
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

function tintMaterialToMilky(material) {
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

// =============== End RoomFilter Functions ===============

// ---------------- main init ----------------
async function initApp() {
  initThree();

  // инициализация тултипа
  tooltip = new Tooltip();

  // инициализация RoomFilter
  roomFilter = new RoomFilter({
    container: document.body,
    onFilterChange: (config) => applyRoomFilter(config),
    onRoomClicked: (roomData) => goToRoom(roomData),
  });

  // debug manager — контролирует отображение визуальных хитбоксов
  debugManager = new DebugManager({ container: document.body, enabled: false });
  debugManager.set && debugManager.set(false);

  // dataManager загружает /data/structure.json (в нём — описание зданий/этажей/кабинетов)
  dataManager = new DataManager("/data/structure.json");
  await dataManager.load();

  // инициализация панорамы (любой UI-оверлей, у тебя должен быть PanoramaOverlay.js)
  panoOverlay = new PanoramaOverlay();
  window._panoOverlay = panoOverlay;

  // загружаем общую модель (all.glb / Untitled.glb / etc.)
  const modelScene = await loadModelScene("/models/all_new.glb");
  console.log("[DEBUG] modelScene loaded. Listing names:");
  modelScene.traverse((o) => {
    if ((o.isMesh || o.type === "Group") && o.name) console.log(o.type, o.name);
  });

  const buildings = dataManager.getBuildings(); // [{ key, cfg }, ...]
  for (const b of buildings) {
    const key = b.key;
    const cfg = b.cfg;
    console.log("[DEBUG] Processing building:", key, cfg);

    // пытаемся найти группу по meshName
    let group = modelScene.getObjectByName(cfg.meshName);
    if (group) {
      if (group.parent && group.parent !== scene) group.parent.remove(group);
      if (!scene.children.includes(group)) scene.add(group);
      group.name = cfg.meshName || key;
    } else {
      // пробуем вывести по родителю первого этажа
      let inferred = null;
      if (cfg.floors && cfg.floors.length > 0) {
        const firstFloor = modelScene.getObjectByName(cfg.floors[0].meshName);
        if (firstFloor && firstFloor.parent && firstFloor.parent !== modelScene)
          inferred = firstFloor.parent;
      }
      if (inferred) {
        group = inferred;
        if (group.parent && group.parent !== scene) group.parent.remove(group);
        if (!scene.children.includes(group)) scene.add(group);
        group.name = cfg.meshName || group.name || key;
      } else {
        // fallback — пустая группа
        group = new THREE.Group();
        group.name = cfg.meshName || key;
        scene.add(group);
        console.log("[DEBUG] Created fallback group for", key);
      }
    }

    // собираем этажи
    const floorsMeshes = [];
    (cfg.floors || []).forEach((f, idx) => {
      const m = modelScene.getObjectByName(f.meshName);
      if (m) {
        if (m.parent !== group) {
          if (m.parent) m.parent.remove(m);
          group.add(m);
        }
        // Сохраняем информацию об этаже в userData
        m.userData = m.userData || {};
        m.userData.name = f.name || `Этаж ${idx + 1}`;
        m.userData.description = f.description || "";
        floorsMeshes.push(m);
      } else {
        console.warn(
          "[WARN] Floor mesh not found in GLB:",
          f.meshName,
          "for",
          key
        );
      }
    });

    // собираем комнаты по этажам, скрываем их по умолчанию
    const roomsMeshes = [];
    (cfg.floors || []).forEach((f) => {
      (f.rooms || []).forEach((r) => {
        const rm = modelScene.getObjectByName(r.meshName);
        if (rm) {
          if (rm.parent !== group) {
            if (rm.parent) rm.parent.remove(rm);
            group.add(rm);
          }
          // Сохраняем информацию о кабинете в userData
          rm.userData = rm.userData || {};
          rm.userData.name = r.name || r.meshName;
          rm.userData.description = r.description || "";
          rm.visible = false;
          roomsMeshes.push(rm);
        }
      });
    });

    // Сохраняем информацию о здании в userData группы
    group.userData = group.userData || {};
    group.userData.name = cfg.name || key;
    group.userData.description = cfg.description || "";

    // создаём HitboxManager для здания
    const manager = new HitboxManager(scene, camera, debugManager);
    if (manager.events?.addEventListener) {
      manager.events.addEventListener("objectClicked", (e) => {
        const parent = e.detail?.parent;
        if (!parent) return;
        handleClickableClick(
          key,
          { cfg, group, floorsMeshes, roomsMeshes, hitboxManager: manager },
          parent
        );
      });
    }

    // регистрируем хитбоксы
    try {
      manager.createBuildingHitbox(group);
    } catch (e) {
      console.warn("createBuildingHitbox failed:", e);
    }
    try {
      manager.createFloorHitboxes(floorsMeshes);
    } catch (e) {
      console.warn("createFloorHitboxes failed:", e);
    }

    // создаём хитбоксы комнат по этажам (под именем floor.meshName)
    for (const f of cfg.floors || []) {
      const roomsForFloor = (f.rooms || [])
        .map((r) => group.getObjectByName(r.meshName))
        .filter(Boolean);
      if (roomsForFloor.length > 0) {
        try {
          manager.createRoomHitboxes(f.meshName, roomsForFloor);
        } catch (e) {
          console.warn("createRoomHitboxes failed for", f.meshName, e);
        }
      }
    }

    // misc rooms (если есть)
    const miscRooms = roomsMeshes.filter(
      (rm) =>
        !(cfg.floors || []).some((f) =>
          f.rooms?.some((rr) => rr.meshName === rm.name)
        )
    );
    if (miscRooms.length > 0) {
      try {
        manager.createRoomHitboxes("misc", miscRooms);
      } catch (e) {
        console.warn("createRoomHitboxes misc failed", e);
      }
    }

    buildingStates.set(key, {
      cfg,
      group,
      floorsMeshes,
      roomsMeshes,
      hitboxManager: manager,
    });

    console.log(
      "[DEBUG] saved buildingState:",
      key,
      "floors:",
      floorsMeshes.length,
      "rooms:",
      roomsMeshes.length
    );
  }

  // InfoPanel (с кнопкой назад)
  const info = new InfoPanel({ container: document.body, onBack: goBack });
  window._infoPanel = info;

  // Создаём кнопку открытия поиска кабинетов
  createSearchButton();

  // удобные глобальные ссылки для отладки
  window._scene = scene;
  window._buildingStates = buildingStates;
  window._debugManager = debugManager;
  // Гарантированно выключаем глобальный debug (на всякий случай)
  window.enableGlobalDebug && window.enableGlobalDebug(false);
  window._roomFilter = roomFilter;

  showAllBuildingsOverview();

  // render tweaks (опционально, для корректности отображения)
  modelScene.traverse((obj) => {
    if (!obj.isMesh) return;
    try {
      if (!obj.userData._originalMaterial)
        obj.userData._originalMaterial = obj.material;
      if (obj.material) {
        tintMaterialToMilky(obj.material);
        obj.material.side = THREE.DoubleSide;
        obj.material.transparent = false;
        obj.material.polygonOffset = true;
        obj.material.polygonOffsetFactor = 1;
        obj.material.polygonOffsetUnits = 1;
        obj.material.needsUpdate = true;
      }
    } catch (e) {}
    obj.frustumCulled = false;
    try {
      const g = obj.geometry;
      if (g && typeof g.computeVertexNormals === "function") {
        g.computeVertexNormals();
        if (g.attributes.normal) g.attributes.normal.needsUpdate = true;
      }
    } catch (e) {}
  });

  animate();
}

// ---------------- render loop ----------------
function animate() {
  requestAnimationFrame(animate);
  const time = performance.now();
  controls.update();
  for (const st of buildingStates.values()) {
    try {
      st.hitboxManager?.update();
    } catch (e) {}
  }
  animateHoverPulses(time);
  animateBreathingRooms(time);
  renderer.render(scene, camera);
}

// ---------------- start ----------------
window.addEventListener("DOMContentLoaded", () => {
  initApp().catch((err) => {
    console.error("🔥 FULL initApp error:", err);
    alert("Ошибка инициализации:\n" + (err?.message || err));
  });
});

// ---------------- helpers для отладки ----------------
window.setCameraFactor = function (obj = {}) {
  Object.assign(CAMERA_SETTINGS, obj);
  console.log("CAMERA_SETTINGS updated:", CAMERA_SETTINGS);
};

window.enableGlobalDebug = function (v) {
  debugManager && debugManager.set && debugManager.set(!!v);
  for (const st of buildingStates.values()) {
    st.hitboxManager &&
      st.hitboxManager.enableDebug &&
      st.hitboxManager.enableDebug(!!v);
  }
  console.log("Debug:", !!v);
};

// =============== Search Button Helper ===============
function createSearchButton() {
  const btn = document.createElement("button");
  btn.id = "room-search-btn";
  btn.textContent = "Поиск";
  btn.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    padding: 10px 16px;
    background: rgb(58, 134, 255);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: bold;
    z-index: 9998;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  `;
  btn.onmouseover = () => (btn.style.background = "rgb(115, 167, 250)");
  btn.onmouseout = () => (btn.style.background = "rgb(58, 134, 255)");
  btn.onclick = () => {
    if (roomFilter) roomFilter.show();
  };
  document.body.appendChild(btn);
}

export {}; // модульный файл
