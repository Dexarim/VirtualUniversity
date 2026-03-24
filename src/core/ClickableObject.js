import * as THREE from "three";

const DEFAULTS = {
  padding: 0.0,
  baseColor: 0x00ffff,
  hoverColor: 0xffa500,
  baseOpacity: 0.25,
  hoverOpacity: 0.4,
  debugVisible: false,
  hitboxMode: "box",
  kind: "generic",
};

export class ClickableObject {
  constructor(mesh, camera, scene, options = {}) {
    this.mesh = mesh;
    this.camera = camera;
    this.scene = scene;

    this.opts = { ...DEFAULTS, ...(options || {}) };

    this.id = options.id ?? 0;
    this.name = options.name ?? mesh.name ?? "Unnamed";
    this.parentObject = options.parentObject ?? mesh;
    this.kind = this.opts.kind;

    this.isHovered = false;
    this.visible = true;
    this._dirty = true;
    this._lastMatrixWorld = new THREE.Matrix4();

    this._hitbox = null;
    this._material = new THREE.MeshBasicMaterial({
      color: this.opts.baseColor,
      transparent: true,
      opacity: this.opts.baseOpacity,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this._geometry = this._createHitboxGeometry();
  }

  _createHitboxGeometry() {
    if (
      this.opts.hitboxMode === "geometry" &&
      this.mesh?.isMesh &&
      this.mesh.geometry
    ) {
      return this.mesh.geometry.clone();
    }

    return new THREE.BoxGeometry(1, 1, 1);
  }

  _ensureHitbox() {
    if (this._hitbox) return;

    this._hitbox = new THREE.Mesh(this._geometry, this._material);
    this._hitbox.name = `hitbox_${this.name}_${this.id}`;
    this._hitbox.userData.parentObject = this.parentObject;
    this._hitbox.userData.kind = this.kind;
    this._hitbox.visible = !!this.opts.debugVisible;

    this.hitbox = this._hitbox;
    this.scene.add(this._hitbox);
    this._dirty = true;
    this.updateHitbox(true);
  }

  ensureHitbox() {
    this._ensureHitbox();
  }

  markDirty() {
    this._dirty = true;
  }

  updateHitbox(force = false) {
    this._ensureHitbox();

    const currentMatrix = this.mesh.matrixWorld;
    if (!force && !this._dirty && currentMatrix.equals(this._lastMatrixWorld)) {
      return;
    }

    if (this.opts.hitboxMode === "geometry") {
      currentMatrix.decompose(
        this._hitbox.position,
        this._hitbox.quaternion,
        this._hitbox.scale
      );
      this._lastMatrixWorld.copy(currentMatrix);
      this._dirty = false;
      return;
    }

    const box = new THREE.Box3().setFromObject(this.mesh);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    size.addScalar(this.opts.padding);
    this._hitbox.position.copy(center);
    this._hitbox.quaternion.identity();
    this._hitbox.scale.copy(size);

    this._lastMatrixWorld.copy(currentMatrix);
    this._dirty = false;
  }

  setHover(state) {
    if (this.isHovered === state) return;
    this.isHovered = state;
    if (!this._hitbox) return;

    if (this.opts.debugVisible) {
      this._material.color.set(state ? this.opts.hoverColor : this.opts.baseColor);
      this._material.opacity = state ? this.opts.hoverOpacity : this.opts.baseOpacity;
    }
  }

  checkClick(raycaster) {
    if (!this._hitbox) return false;
    const intersects = raycaster.intersectObject(this._hitbox, true);
    return intersects.length > 0;
  }

  showDebug(state) {
    this._ensureHitbox();
    this._hitbox.visible = !!state;
    this.opts.debugVisible = !!state;
  }

  setVisible(state) {
    this.visible = !!state;
  }

  dispose() {
    if (this._hitbox) {
      this.scene.remove(this._hitbox);
      this._hitbox.geometry?.dispose?.();
      this._hitbox.geometry = null;
      this._hitbox.material = null;
      this._hitbox = null;
      this.hitbox = null;
    }

    if (this._material) {
      this._material.dispose();
      this._material = null;
    }
  }
}
