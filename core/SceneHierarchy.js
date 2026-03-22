export function safeDispose(obj) {
  if (!obj) return;
  if (obj.geometry) {
    try {
      obj.geometry.dispose();
    } catch (e) {}
  }
  if (obj.material) {
    if (Array.isArray(obj.material)) {
      obj.material.forEach((m) => {
        try {
          m.dispose();
        } catch (e) {}
      });
    } else {
      try {
        obj.material.dispose();
      } catch (e) {}
    }
  }
  if (obj.parent) obj.parent.remove(obj);
}

export function findMeshesByName(root, name) {
  const out = [];
  root.traverse((child) => {
    if (child.isMesh && child.name && child.name.includes(name))
      out.push(child);
  });
  return out;
}
