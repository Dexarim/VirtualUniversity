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
}

function showFloorsForBuilding(buildingKey) {
  const st = buildingStates.get(buildingKey);
  if (!st) return;

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
}

// Показать этаж и подготовить комнаты
function showSingleFloorForBuilding(buildingKey, floorMeshName) {
  const st = buildingStates.get(buildingKey);
  if (!st) return;

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
}

// =============== RoomFilter Functions ===============

// Навигация к кабинету: показываем его на сцене и фокусируем камеру
function goToRoom(roomData) {
  if (!roomData || !roomData.buildingKey) return;

  const st = buildingStates.get(roomData.buildingKey);
  if (!st) return;

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

  if (roomData.mesh) {
    roomData.mesh.visible = true;
  }

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
}

function applyRoomFilter(config) {
  const { filters, search } = config;

  // Очищаем предыдущую подсветку
  clearRoomHighlights();

  // Собираем все кабинеты с их типами и корпусами
  const allRooms = []; // { name, buildingKey, buildingName, floorName, mesh, type }
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
            meshName: roomCfg.meshName,
            mesh: roomMesh,
            type: roomCfg.type || "other",
            description: roomCfg.description || "",
          });
        }
      });
    });
  }

  // Фильтруем по типам и поиску
  let filtered = allRooms;

  // Фильтр по типам
  if (filters.length > 0) {
    filtered = filtered.filter((r) => filters.includes(r.type));
  }

  // Фильтр по поиску (имя/номер кабинета)
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.name.toLowerCase().includes(q) || r.meshName.toLowerCase().includes(q)
    );
  }

  // Если фильтров нет, ничего не подсвечиваем
  if (filtered.length === 0) {
    if (roomFilter) roomFilter.updateSearchResults([]);
    return;
  }

  // Обновляем результаты поиска в UI
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

  // Подсвечиваем найденные кабинеты
  filtered.forEach((r) => {
    highlightRoom(r.mesh, r.type);
  });
}

function highlightRoom(mesh, type) {
  if (!mesh || !mesh.isMesh) return;

  const color = roomFilter.getColorForType(type);
  const meshName = mesh.name || mesh.uuid;

  // Сохраняем оригинальный материал
  if (!highlightedRoomsStates.has(meshName)) {
    highlightedRoomsStates.set(meshName, {
      originalMaterial: mesh.material ? mesh.material.clone() : null,
      highlighted: false,
    });
  }

  // Создаём новый материал для подсветки
  const hMaterial = new THREE.MeshPhongMaterial({
    color: color,
    emissive: color,
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
  });

  mesh.material = hMaterial;
  highlightedRoomsMeshes.set(meshName, mesh);

  const state = highlightedRoomsStates.get(meshName);
  if (state) state.highlighted = true;
}

function clearRoomHighlights() {
  for (const [meshName, mesh] of highlightedRoomsMeshes.entries()) {
    const state = highlightedRoomsStates.get(meshName);
    if (state && state.originalMaterial) {
      mesh.material = state.originalMaterial;
    }
    state.highlighted = false;
  }
  highlightedRoomsMeshes.clear();
}

// Подсветить все кабинеты при старте (делает меши видимыми и применяет цвет подсветки)
function highlightAllRoomsAtStart() {
  for (const [buildingKey, st] of buildingStates.entries()) {
    const cfg = st.cfg || {};
    (cfg.floors || []).forEach((floorCfg) => {
      (floorCfg.rooms || []).forEach((roomCfg) => {
        try {
          const mesh = st.group.getObjectByName(roomCfg.meshName);
          if (mesh) {
            mesh.visible = true;
            highlightRoom(mesh, roomCfg.type || "other");
          }
        } catch (e) {
          console.warn(
            "highlightAllRoomsAtStart error for",
            roomCfg.meshName,
            e
          );
        }
      });
    });
  }
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

  // Создаём кнопку открытия фильтра кабинетов
  createFilterButton();

  // удобные глобальные ссылки для отладки
  window._scene = scene;
  window._buildingStates = buildingStates;
  window._debugManager = debugManager;
  // Гарантированно выключаем глобальный debug (на всякий случай)
  window.enableGlobalDebug && window.enableGlobalDebug(false);
  window._roomFilter = roomFilter;

  // стартовое представление
  // подсветить все кабинеты по умолчанию, затем показать обзор зданий
  try {
    highlightAllRoomsAtStart();
  } catch (e) {
    console.warn("highlightAllRoomsAtStart failed:", e);
  }
  showAllBuildingsOverview();

  // render tweaks (опционально, для корректности отображения)
  modelScene.traverse((obj) => {
    if (!obj.isMesh) return;
    try {
      if (!obj.userData._originalMaterial)
        obj.userData._originalMaterial = obj.material;
      if (obj.material) {
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
  controls.update();
  for (const st of buildingStates.values()) {
    try {
      st.hitboxManager?.update();
    } catch (e) {}
  }
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

// =============== Filter Button Helper ===============
function createFilterButton() {
  const btn = document.createElement("button");
  btn.id = "room-filter-btn";
  btn.textContent = "Фильтр";
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
  btn.onmouseover = () => (btn.style.background = "rgba(115, 167, 250, 1);");
  btn.onmouseout = () => (btn.style.background = "rgb(58, 134, 255)");
  btn.onclick = () => {
    if (roomFilter) roomFilter.show();
  };
  document.body.appendChild(btn);
}

export {}; // модульный файл
