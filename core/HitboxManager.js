import { ClickableObject } from "./ClickableObject.js";

export class HitboxManager {
  constructor(scene, camera, debug) {
    this.scene = scene;
    this.camera = camera;
    this.debug = debug || { enabled: false };
    this.events = new EventTarget();

    this.hitboxes = {
      building: null,
      floors: [],
      rooms: {},
    };

    this.level = "building";
    this._visibleRoomsForLevel = [];
  }

  _allRoomClickables() {
    const out = [];
    for (const key of Object.keys(this.hitboxes.rooms || {})) {
      const arr = this.hitboxes.rooms[key];
      if (Array.isArray(arr)) out.push(...arr);
    }
    return out;
  }

  hideAllHitboxes() {
    if (this.hitboxes.building) this.hitboxes.building.showDebug(false);
    (this.hitboxes.floors || []).forEach((f) => f.showDebug(false));
    this._allRoomClickables().forEach((r) => r.showDebug(false));
  }

  enableDebug(value) {
    const dbg = !!value;
    if (this.debug) this.debug.enabled = dbg;
    this.setLevel(this.level, this._visibleRoomsForLevel);
  }

  createBuildingHitbox(group) {
    const dbg = !!this.debug?.enabled;
    const clickable = new ClickableObject(group, this.camera, this.scene, {
      id: 0,
      name: "Building",
      parentObject: group,
      kind: "building",
      hitboxMode: "box",
      debugVisible: dbg,
    });
    clickable.updateHitbox(true);
    clickable.showDebug(dbg);
    this.hitboxes.building = clickable;
  }

  createFloorHitboxes(floors) {
    const dbg = !!this.debug?.enabled;
    this.hitboxes.floors = (floors || []).filter(Boolean).map((mesh, i) => {
      const clickable = new ClickableObject(mesh, this.camera, this.scene, {
        id: i + 1,
        name: mesh.name || `Floor_${i + 1}`,
        parentObject: mesh,
        kind: "floor",
        hitboxMode: mesh?.isMesh ? "geometry" : "box",
        debugVisible: dbg,
      });
      clickable.updateHitbox(true);
      clickable.showDebug(dbg);
      return clickable;
    });
  }

  createRoomHitboxes(floorName, rooms) {
    if (!this.hitboxes.rooms) this.hitboxes.rooms = {};
    const dbg = !!this.debug?.enabled;
    this.hitboxes.rooms[floorName] = (rooms || []).map((room, i) => {
      const clickable = new ClickableObject(room, this.camera, this.scene, {
        id: i + 100,
        name: room.name,
        parentObject: room,
        kind: "room",
        hitboxMode: "box",
        debugVisible: dbg,
      });
      clickable.updateHitbox(true);
      clickable.showDebug(dbg && this.level === "rooms");
      return clickable;
    });
  }

  setLevel(level, visibleRooms = []) {
    this.level = level;
    this._visibleRoomsForLevel = visibleRooms || [];

    this.hideAllHitboxes();

    if (!this.debug || !this.debug.enabled) {
      return;
    }

    if (level === "building") {
      if (this.hitboxes.building) this.hitboxes.building.showDebug(true);
      return;
    }

    if (level === "floors") {
      (this.hitboxes.floors || []).forEach((f) => f.showDebug(true));
      return;
    }

    if (level === "rooms") {
      const visibleSet = new Set(visibleRooms || []);
      for (const arr of Object.values(this.hitboxes.rooms || {})) {
        for (const roomClickable of arr) {
          roomClickable.showDebug(this.debug.enabled && visibleSet.has(roomClickable.parentObject));
        }
      }
    }
  }

  getActiveHitboxes() {
    if (this.level === "building") {
      return this.hitboxes.building?.hitbox ? [this.hitboxes.building.hitbox] : [];
    }

    if (this.level === "floors") {
      return (this.hitboxes.floors || []).map((c) => c.hitbox).filter(Boolean);
    }

    if (this.level === "rooms") {
      const visibleSet = new Set(this._visibleRoomsForLevel || []);
      const all = [];
      for (const arr of Object.values(this.hitboxes.rooms || {})) {
        for (const roomClickable of arr) {
          if (visibleSet.has(roomClickable.parentObject)) {
            all.push(roomClickable.hitbox);
          }
        }
      }
      return all.filter(Boolean);
    }

    return [];
  }

  update() {
    this.hitboxes.building?.updateHitbox?.();
    (this.hitboxes.floors || []).forEach((f) => f.updateHitbox?.());
    this._allRoomClickables().forEach((r) => r.updateHitbox?.());
  }

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
    if (!clickable) return null;

    this.events.dispatchEvent(
      new CustomEvent("objectClicked", {
        detail: { parent: clickable.parentObject },
      })
    );
    return clickable.parentObject;
  }

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
