export class HierarchyController {
  constructor(hitboxManager) {
    this.hitboxManager = hitboxManager;
  }

  // Пометить все объекты на этаже как dirty (например, при анимации)
  markFloorDirty(floorName) {
    const list = this.hitboxManager.hitboxes.rooms.get(floorName);
    if (!list) return;
    list.forEach((clickable) => clickable.markDirty());
  }

  // Удалить хитбоксы этажа и освободить ресурсы
  removeFloor(floorName) {
    const list = this.hitboxManager.hitboxes.rooms.get(floorName);
    if (!list) return;
    list.forEach((clickable) => clickable.dispose());
    this.hitboxManager.hitboxes.rooms.delete(floorName);
  }
}
