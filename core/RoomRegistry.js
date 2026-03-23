export class RoomRegistry {
  constructor({
    buildingStates,
    getLocalizedName,
    getLocalizedDescription,
  } = {}) {
    this.buildingStates = buildingStates || new Map();
    this.getLocalizedName = getLocalizedName || ((value, fallback = "") => fallback);
    this.getLocalizedDescription =
      getLocalizedDescription || ((value, fallback = "") => fallback);

    this.rooms = [];
    this.roomsByBuilding = new Map();
    this.roomsByFloor = new Map();
    this.roomsByBuildingRoom = new Map();
  }

  rebuild() {
    this.rooms = [];
    this.roomsByBuilding.clear();
    this.roomsByFloor.clear();
    this.roomsByBuildingRoom.clear();

    for (const [buildingKey, st] of this.buildingStates.entries()) {
      const cfg = st.cfg;
      const buildingName = this.getLocalizedName(cfg, cfg.name || buildingKey);
      const rawBuildingName = cfg.name || buildingKey;

      (cfg.floors || []).forEach((floorCfg) => {
        const floorName = this.getLocalizedName(
          floorCfg,
          floorCfg.name || floorCfg.meshName
        );

        (floorCfg.rooms || []).forEach((roomCfg) => {
          const roomMesh = st.group.getObjectByName(roomCfg.meshName);
          if (!roomMesh) return;

          const roomName = this.getLocalizedName(
            roomCfg,
            roomCfg.name || roomCfg.meshName
          );
          const description = this.getLocalizedDescription(
            roomCfg,
            roomCfg.description || ""
          );

          const roomRecord = {
            name: roomName,
            originalName: roomCfg.name || roomCfg.meshName,
            buildingKey,
            buildingName,
            originalBuildingName: rawBuildingName,
            floorName,
            originalFloorName: floorCfg.name || floorCfg.meshName,
            floorMeshName: floorCfg.meshName,
            meshName: roomCfg.meshName,
            mesh: roomMesh,
            type: roomCfg.type || "other",
            description,
            searchText: [
              roomName,
              roomCfg.name,
              roomCfg.meshName,
              floorName,
              floorCfg.name,
              buildingName,
              rawBuildingName,
              description,
              roomCfg.description,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase(),
          };

          this.rooms.push(roomRecord);

          if (!this.roomsByBuilding.has(buildingKey)) {
            this.roomsByBuilding.set(buildingKey, []);
          }
          this.roomsByBuilding.get(buildingKey).push(roomRecord);

          const floorKey = this._makeFloorKey(buildingKey, floorCfg.meshName);
          if (!this.roomsByFloor.has(floorKey)) {
            this.roomsByFloor.set(floorKey, []);
          }
          this.roomsByFloor.get(floorKey).push(roomRecord);

          const roomKey = this._makeRoomKey(buildingKey, roomCfg.meshName);
          this.roomsByBuildingRoom.set(roomKey, roomRecord);
        });
      });
    }

    return this.rooms;
  }

  getAllRooms() {
    return this.rooms;
  }

  getRoomsForNavEntry(entry) {
    if (!entry) return [];

    switch (entry.state) {
      case "buildings_overview":
        return this.rooms;
      case "building_floor":
        return this.roomsByFloor.get(
          this._makeFloorKey(entry.meta.buildingKey, entry.meta.floorMeshName)
        ) || [];
      case "building_room": {
        const room = this.roomsByBuildingRoom.get(
          this._makeRoomKey(entry.meta.buildingKey, entry.meta.roomMeshName)
        );
        return room ? [room] : [];
      }
      default:
        return [];
    }
  }

  search(query = "") {
    const normalized = String(query || "").trim().toLowerCase();
    if (!normalized) return [];
    return this.rooms.filter((room) => room.searchText.includes(normalized));
  }

  _makeFloorKey(buildingKey, floorMeshName) {
    return `${buildingKey}::${floorMeshName}`;
  }

  _makeRoomKey(buildingKey, roomMeshName) {
    return `${buildingKey}::${roomMeshName}`;
  }
}
