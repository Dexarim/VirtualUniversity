// core/DataManager.js
// Утилита для загрузки, редактирования и экспорта структуры здания (JSON).

export class DataManager {
  constructor(url = "/data/structure.json") {
    this.url = url;
    this.data = null;
  }

  // === Загрузка JSON ===
  async load() {
    try {
      const res = await fetch(this.url, { cache: "no-store" });
      if (!res.ok) throw new Error(`Не удалось загрузить ${this.url}`);
      this.data = await res.json();

      // Проверка структуры (если вдруг формат старый)
      if (!this.data.building) {
        console.warn(
          "[DataManager] JSON без поля building — добавляю структуру по умолчанию"
        );
        this.data = {
          building: {
            name: "Здание",
            meshName: "Building",
            floors: this.data.floors || [],
          },
        };
      }

      console.log("[DEBUG] DataManager: JSON успешно загружен:", this.data);
      return this.data;
    } catch (err) {
      console.warn("[DataManager] Ошибка загрузки:", err);

      // Создаём базовую структуру по умолчанию
      this.data = {
        building: {
          name: "Новое здание",
          meshName: "Building",
          description: "",
          floors: [],
        },
      };
      return this.data;
    }
  }

  // === Получить метаданные по имени меша ===
  getMetaByMeshName(meshName) {
    if (!this.data) return null;

    const building = this.data.building;
    if (!building) return null;

    // Проверяем здание
    if (building.meshName === meshName) return building;

    // Проверяем этажи
    for (const floor of building.floors || []) {
      if (floor.meshName === meshName) return floor;

      // Проверяем комнаты на этаже
      for (const room of floor.rooms || []) {
        if (room.meshName === meshName) return room;
      }
    }

    return null;
  }

  // === Добавить или обновить элемент по meshName ===
  setMeta(meshName, meta) {
    if (!this.data) {
      console.warn("[DataManager] setMeta вызван до загрузки данных!");
      return;
    }

    const building = this.data.building;
    if (!building) return;

    // Если редактируем само здание
    if (building.meshName === meshName) {
      Object.assign(building, meta);
      return;
    }

    // Этаж
    for (const floor of building.floors || []) {
      if (floor.meshName === meshName) {
        Object.assign(floor, meta);
        return;
      }

      // Комната
      for (const room of floor.rooms || []) {
        if (room.meshName === meshName) {
          Object.assign(room, meta);
          return;
        }
      }
    }

    // Если не нашли — добавим как новый этаж
    building.floors.push({
      meshName,
      name: meta.name || meshName,
      description: meta.description || "",
      rooms: [],
    });
  }

  // === Получить список этажей ===
  getFloors() {
    return this.data?.building?.floors || [];
  }

  // === Получить список комнат по meshName этажа ===
  getRoomsByFloorMesh(floorMeshName) {
    const floors = this.getFloors();
    const floor = floors.find((f) => f.meshName === floorMeshName);
    return floor?.rooms || [];
  }

  // === Получить здание ===
  getBuilding() {
    return this.data?.building || null;
  }

  // === Экспорт JSON (в файл) ===
  exportJSON(filename = "structure_export.json") {
    if (!this.data) {
      console.warn("[DataManager] Нет данных для экспорта");
      return;
    }

    const blob = new Blob([JSON.stringify(this.data, null, 2)], {
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

    console.log("[DEBUG] JSON экспортирован:", filename);
  }

  // === Сериализация JSON (для сохранения без скачивания) ===
  toJSON() {
    return JSON.stringify(this.data, null, 2);
  }
}
