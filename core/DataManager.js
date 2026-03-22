// core/DataManager.js
// DataManager — гибкий менеджер структуры зданий.
// Поддерживает новый формат:
// { "buildings": { "main": {...}, "new": {...}, ... } }
// А также старый (backward compatible): { "building": {...} }

export class DataManager {
  constructor(url = "/data/structure.json") {
    this.url = url;
    this.data = null; // raw loaded JSON
    this._buildings = new Map(); // key -> cfg
  }

  // Загрузка JSON и нормализация в this._buildings
  async load() {
    try {
      const res = await fetch(this.url, { cache: "no-store" });
      if (!res.ok)
        throw new Error(`Не удалось загрузить ${this.url}: ${res.status}`);
      this.data = await res.json();

      // Нормализация:
      if (this.data && typeof this.data === "object") {
        // Новый формат: top-level "buildings" (объект)
        if (this.data.buildings && typeof this.data.buildings === "object") {
          Object.keys(this.data.buildings).forEach((key) => {
            const cfg = this.data.buildings[key];
            this._normalizeBuilding(cfg, key);
          });
        }
        // Старый формат: single building at "building"
        else if (this.data.building && typeof this.data.building === "object") {
          this._normalizeBuilding(
            this.data.building,
            this.data.building.key || "main"
          );
        }
        // Если JSON — массив зданий
        else if (Array.isArray(this.data)) {
          this.data.forEach((cfg, idx) => {
            const key = cfg.key || cfg.meshName || `building_${idx}`;
            this._normalizeBuilding(cfg, key);
          });
        }
        // Если JSON — объект, но не имеет "buildings" — попробуем интерпретировать все поля как здания
        else {
          // Например: { "main": {...}, "new": {...} }
          const maybeBuildings = this.data;
          let mapped = 0;
          Object.keys(maybeBuildings).forEach((k) => {
            const v = maybeBuildings[k];
            if (v && typeof v === "object" && v.meshName) {
              this._normalizeBuilding(v, k);
              mapped++;
            }
          });
          if (mapped === 0) {
            console.warn(
              "[DataManager] JSON не содержит узнаваемых описаний зданий — создаю пустой дефолт."
            );
            this._normalizeBuilding(
              { name: "Новое здание", meshName: "Building", floors: [] },
              "building_0"
            );
          }
        }
      } else {
        throw new Error("Некорректный формат JSON");
      }

      console.log(
        "[DataManager] JSON успешно загружен. Buildings:",
        Array.from(this._buildings.keys())
      );
      return this;
    } catch (err) {
      console.warn("[DataManager] Ошибка загрузки или парсинга:", err);
      // Fallback — создаём пустую структуру
      this.data = {};
      this._normalizeBuilding(
        { name: "Новое здание", meshName: "Building", floors: [] },
        "building_0"
      );
      return this;
    }
  }

  // Вспомогательная нормализация одного building cfg
  _normalizeBuilding(rawCfg, key) {
    if (!rawCfg || typeof rawCfg !== "object") return;
    const cfg = Object.assign(
      {
        name: rawCfg.name || key,
        description: rawCfg.description || "",
        meshName: rawCfg.meshName || rawCfg.name || key,
        floors: Array.isArray(rawCfg.floors) ? rawCfg.floors : [],
      },
      rawCfg
    );
    // ensure floors/rooms arrays exist
    cfg.floors = cfg.floors.map((f) =>
      Object.assign(
        {
          name: f.name || f.meshName || "Floor",
          meshName: f.meshName || f.name,
          rooms: Array.isArray(f.rooms) ? f.rooms : [],
        },
        f
      )
    );
    this._buildings.set(key, cfg);
  }

  // Вернуть все здания в виде массива [{ key, cfg }, ...]
  getBuildings() {
    return Array.from(this._buildings.entries()).map(([key, cfg]) => ({
      key,
      cfg,
    }));
  }

  // Вернуть список ключей зданий
  getBuildingKeys() {
    return Array.from(this._buildings.keys());
  }

  // Вернуть config здания по ключу (key)
  getBuilding(key) {
    if (!key) {
      // возвращаем первый, если ключ не указан
      const first = this._buildings.entries().next();
      return first.done ? null : first.value[1];
    }
    return this._buildings.get(key) || null;
  }

  // Возвращает массив этажей для buildingKey (или для первого здания, если key не указан)
  getFloors(buildingKey) {
    const b = this.getBuilding(buildingKey);
    return b && Array.isArray(b.floors) ? b.floors : [];
  }

  // Возвращает список комнат для конкретного floorMeshName в рамках buildingKey
  getRooms(buildingKey, floorMeshName) {
    const floors = this.getFloors(buildingKey);
    const floor = floors.find(
      (f) => f.meshName === floorMeshName || f.name === floorMeshName
    );
    return floor && Array.isArray(floor.rooms) ? floor.rooms : [];
  }

  // Поиск метаданных по meshName во всех зданиях / этажах / комнатах.
  // Возвращает объект вида:
  // { type: 'building'|'floor'|'room', buildingKey, building, floor?, room? }
  getMetaByMeshName(meshName) {
    if (!meshName) return null;
    for (const [key, cfg] of this._buildings.entries()) {
      if (cfg.meshName === meshName) {
        return { type: "building", buildingKey: key, building: cfg };
      }
      for (const floor of cfg.floors || []) {
        if (floor.meshName === meshName) {
          return { type: "floor", buildingKey: key, building: cfg, floor };
        }
        for (const room of floor.rooms || []) {
          if (room.meshName === meshName) {
            return {
              type: "room",
              buildingKey: key,
              building: cfg,
              floor,
              room,
            };
          }
        }
      }
    }
    return null;
  }

  // Добавить или обновить метаданные по meshName.
  // Если нашли существующий — обновляем. Если не нашли, можно указать addToBuildingKey, куда добавить (как этаж).
  setMeta(meshName, meta = {}, options = {}) {
    if (!meshName) return null;
    for (const [key, cfg] of this._buildings.entries()) {
      if (cfg.meshName === meshName) {
        Object.assign(cfg, meta);
        this._buildings.set(key, cfg);
        return { updated: true, where: "building", buildingKey: key };
      }
      for (const floor of cfg.floors || []) {
        if (floor.meshName === meshName) {
          Object.assign(floor, meta);
          return { updated: true, where: "floor", buildingKey: key };
        }
        for (const room of floor.rooms || []) {
          if (room.meshName === meshName) {
            Object.assign(room, meta);
            return { updated: true, where: "room", buildingKey: key };
          }
        }
      }
    }

    // если не нашли — добавим как этаж в указанный buildingKey или в первый
    const targetKey = options.addToBuildingKey || this.getBuildingKeys()[0];
    if (!targetKey) return { updated: false, reason: "no_building" };
    const targetCfg = this._buildings.get(targetKey);
    if (!targetCfg) return { updated: false, reason: "invalid_building_key" };

    const newFloor = {
      meshName,
      name: meta.name || meshName,
      description: meta.description || "",
      rooms: [],
    };
    targetCfg.floors.push(newFloor);
    this._buildings.set(targetKey, targetCfg);
    return { updated: true, where: "new_floor", buildingKey: targetKey };
  }

  // Экспорт всей структуры (object) в оригинальном формате { buildings: {...} }
  exportJSON(filename = "structure_export.json") {
    const payload = { buildings: {} };
    for (const [key, cfg] of this._buildings.entries()) {
      payload.buildings[key] = cfg;
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    console.log("[DataManager] JSON экспортирован:", filename);
  }

  // Вернуть сырой JSON (normalized)
  toJSON() {
    const payload = { buildings: {} };
    for (const [key, cfg] of this._buildings.entries())
      payload.buildings[key] = cfg;
    return JSON.stringify(payload, null, 2);
  }

  // получить внутренние данные (для отладки)
  getRaw() {
    return { data: this.data, buildingsMap: this._buildings };
  }
}
