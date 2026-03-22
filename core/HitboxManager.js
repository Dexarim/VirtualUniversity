// HitboxManager.js
import { ClickableObject } from "./ClickableObject.js";

export class HitboxManager {
  constructor(scene, camera, debug) {
    this.scene = scene;
    this.camera = camera;
    this.debug = debug || { enabled: false };
    this.events = new EventTarget();

    this.hitboxes = {
      building: null, // ClickableObject
      floors: [], // ClickableObject[]
      rooms: {}, // { floorName: ClickableObject[] }
    };

    this.level = "building";
    this._visibleRoomsForLevel = [];
  }

  // Возвращает плоский массив всех ClickableObject для комнат
  _allRoomClickables() {
    const out = [];
    const rooms = this.hitboxes.rooms || {};
    // rooms is an object keyed by floorName -> array
    for (const key of Object.keys(rooms)) {
      const arr = rooms[key];
      if (Array.isArray(arr)) out.push(...arr);
    }
    return out;
  }

  // Скрытие всех визуальных хитбоксов (только showDebug(false))
  hideAllHitboxes() {
    if (this.hitboxes.building) this.hitboxes.building.showDebug(false);
    (this.hitboxes.floors || []).forEach((f) => f.showDebug(false));
    this._allRoomClickables().forEach((r) => r.showDebug(false));
  }

  // Включить/выключить debug и синхронизировать показ в соответствии с текущим уровнем
  enableDebug(value) {
    const dbg = !!value;
    if (this.debug) this.debug.enabled = dbg;
    // обновляем визуальное состояние (но не трогаем активность для raycast)
    this.setLevel(this.level, this._visibleRoomsForLevel);
  }

  // Создание хитбокса для здания
  createBuildingHitbox(group) {
    const dbg = !!this.debug?.enabled;
    const clickable = new ClickableObject(group, this.camera, this.scene, {
      id: 0,
      name: "Building",
      parentObject: group,
      debugVisible: dbg,
    });
    clickable.updateHitbox(true);
    clickable.showDebug(dbg);
    this.hitboxes.building = clickable;
  }

  // Создание хитбоксов для этажей (массив мешей)
  createFloorHitboxes(floors) {
    const dbg = !!this.debug?.enabled;
    this.hitboxes.floors = (floors || []).filter(Boolean).map((mesh, i) => {
      const clickable = new ClickableObject(mesh, this.camera, this.scene, {
        id: i + 1,
        name: mesh.name || `Floor_${i + 1}`,
        parentObject: mesh,
        debugVisible: dbg,
      });
      clickable.updateHitbox(true);
      clickable.showDebug(dbg);
      return clickable;
    });
  }

  // Создание хитбоксов для комнат (rooms — массив мешей), привязанных к floorName
  createRoomHitboxes(floorName, rooms) {
    if (!this.hitboxes.rooms) this.hitboxes.rooms = {};
    const dbg = !!this.debug?.enabled;
    this.hitboxes.rooms[floorName] = (rooms || []).map((r, i) => {
      const clickable = new ClickableObject(r, this.camera, this.scene, {
        id: i + 100,
        name: r.name,
        parentObject: r,
        debugVisible: dbg,
      });
      clickable.updateHitbox(true);
      // по умолчанию показываем/скрываем согласно debug
      clickable.showDebug(dbg && this.level === "rooms");
      return clickable;
    });
  }

  // Установить уровень отображения: "building", "floors", "rooms", "none"
  // visibleRooms — массив мешей (parentObject), которые должны быть активны/видимы при уровне "rooms"
  setLevel(level, visibleRooms = []) {
    this.level = level;
    this._visibleRoomsForLevel = visibleRooms || [];

    // Всегда сбрасываем визуальные состояния
    this.hideAllHitboxes();

    // Если debug выключен — мы не показываем визуальные хитбоксы, но сохраняем уровень
    if (!this.debug || !this.debug.enabled) {
      // просто сохраняем уровень — активность для raycast будет по level
      return;
    }

    // Если debug включён — показываем визуально в соответствии с уровнем
    if (level === "building") {
      if (this.hitboxes.building) this.hitboxes.building.showDebug(true);
    } else if (level === "floors") {
      (this.hitboxes.floors || []).forEach((f) => f.showDebug(true));
    } else if (level === "rooms") {
      const dbg = this.debug.enabled;
      const visibleSet = new Set(visibleRooms || []);
      for (const arr of Object.values(this.hitboxes.rooms || {})) {
        for (const r of arr) {
          const should = visibleSet.has(r.parentObject);
          r.showDebug(dbg && should);
        }
      }
    } else if (level === "none") {
      // ничего не показываем
    }
  }

  // Возвращает массив Mesh (hitbox meshes) активных хитбоксов для raycast
  // ВАЖНО: теперь возвращаем hitbox meshes независимо от debug.enabled — визуальность отдельно.
  getActiveHitboxes() {
    if (this.level === "building") {
      return this.hitboxes.building?.hitbox
        ? [this.hitboxes.building.hitbox]
        : [];
    }
    if (this.level === "floors") {
      return (this.hitboxes.floors || []).map((c) => c.hitbox).filter(Boolean);
    }
    if (this.level === "rooms") {
      // ФИКС: возвращаем только хитбоксы видимых комнат (из _visibleRoomsForLevel)
      const visibleSet = new Set(this._visibleRoomsForLevel || []);
      let all = [];
      for (const arr of Object.values(this.hitboxes.rooms || {})) {
        for (const r of arr) {
          if (visibleSet.has(r.parentObject)) {
            all.push(r.hitbox);
          }
        }
      }
      return all.filter(Boolean);
    }

    return [];
  }

  // Обновление хитбоксов (в animate loop)
  update() {
    this.hitboxes.building?.updateHitbox?.();
    (this.hitboxes.floors || []).forEach((f) => f.updateHitbox?.());
    // обновляем все room clickables
    this._allRoomClickables().forEach((r) => r.updateHitbox?.());
  }

  // Обработка клика — использует активные хитбоксы
  handleClick(raycaster) {
    const meshes = this.getActiveHitboxes();
    if (!meshes.length) return null;
    const intersects = raycaster.intersectObjects(meshes, true);
    if (!intersects.length) return null;
    const hit = intersects[0].object;

    const all = [
      ...(this.hitboxes.floors || []),
      ...this._allRoomClickables(),
      this.hitboxes.building,
    ].filter(Boolean);

    const clickable = all.find(
      (c) => c.hitbox === hit || c.hitbox?.children?.includes(hit)
    );
    if (clickable) {
      this.events.dispatchEvent(
        new CustomEvent("objectClicked", {
          detail: { parent: clickable.parentObject },
        })
      );
      return clickable.parentObject;
    }
    return null;
  }

  // Hover — ставим hover только на найденный хитбокс (и сбрасываем у остальных)
  handleHover(raycaster) {
    const meshes = this.getActiveHitboxes();
    if (!meshes.length) {
      (this.hitboxes.floors || []).forEach((f) => f.setHover(false));
      this._allRoomClickables().forEach((r) => r.setHover(false));
      this.hitboxes.building?.setHover?.(false);
      return null;
    }

    const intersects = raycaster.intersectObjects(meshes, true);
    const all = [
      ...(this.hitboxes.floors || []),
      ...this._allRoomClickables(),
      this.hitboxes.building,
    ].filter(Boolean);
    all.forEach((c) => c.setHover(false));

    if (!intersects.length) return null;
    const hit = intersects[0].object;
    const clickable = all.find(
      (c) => c.hitbox === hit || c.hitbox?.children?.includes(hit)
    );
    if (clickable) {
      clickable.setHover(true);
      return clickable;
    }
    return null;
  }
}
