// ui/PanoramaOverlay.js
import * as THREE from "three";
import { InfoPanel } from "./InfoPanel.js";

/*
  PanoramaOverlay
  - open(imageUrl)            : backward-compatible (открывает одну панораму)
  - openSequence(panos, idx) : открыть массив панорам (panos = [{id, url, title, hotspots, name, description}, ...])
  hotspots: [{id, to, u, v, label}]
  u: 0..1 (лево->право), v: 0..1 (верх->низ)
*/

export class PanoramaOverlay {
  constructor(options = {}) {
    this.options = {
      radius: 500,
      transitionMs: 300,
      projectionType: "cylinder",
      ...options,
    };
    this._currentProjection = this.options.projectionType || "cylinder";

    // overlay
    this.overlay = document.createElement("div");
    Object.assign(this.overlay.style, {
      position: "fixed",
      inset: "0",
      background: "rgba(0,0,0,0.85)",
      zIndex: "999999",
      display: "none",
      alignItems: "center",
      justifyContent: "center",
    });

    // inner area (80% x 80% -> 10% margin all sides by default)
    this.inner = document.createElement("div");
    Object.assign(this.inner.style, {
      width: "80%",
      height: "80%",
      background: "#000",
      borderRadius: "8px",
      overflow: "hidden",
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    });
    this.overlay.appendChild(this.inner);

    // canvas holder
    this.canvasHolder = document.createElement("div");
    Object.assign(this.canvasHolder.style, {
      position: "absolute",
      inset: "0",
      overflow: "hidden",
      touchAction: "none",
    });
    this.inner.appendChild(this.canvasHolder);

    // hotspot layer (DOM on top)
    this.hotspotLayer = document.createElement("div");
    Object.assign(this.hotspotLayer.style, {
      position: "absolute",
      inset: "0",
      pointerEvents: "none",
    });
    this.inner.appendChild(this.hotspotLayer);

    // glow layer (floor + ceiling)
    this.glowLayer = document.createElement("div");
    Object.assign(this.glowLayer.style, {
      position: "absolute",
      inset: "0",
      pointerEvents: "none",
      zIndex: 5,
      display: "none",
    });
    this.inner.appendChild(this.glowLayer);

    // floor glow
    this.floorGlow = document.createElement("div");
    Object.assign(this.floorGlow.style, {
      position: "absolute",
      bottom: "0",
      left: "0",
      right: "0",
      height: "30%",
      background:
        "radial-gradient(ellipse at center bottom, rgba(0,0,0,0.5) 0%, transparent 70%)",
      pointerEvents: "none",
      display: "none",
    });
    this.inner.appendChild(this.floorGlow);

    // ceiling glow
    this.ceilingGlow = document.createElement("div");
    Object.assign(this.ceilingGlow.style, {
      position: "absolute",
      top: "0",
      left: "0",
      right: "0",
      height: "30%",
      background:
        "radial-gradient(ellipse at center top, rgba(0,0,0,0.5) 0%, transparent 70%)",
      pointerEvents: "none",
      display: "none",
    });
    this.inner.appendChild(this.ceilingGlow);

    // info panel (нижняя панель с информацией) — без кнопки в панораме
    this.infoPanel = new InfoPanel({
      container: this.inner,
      onBack: null,
      showBackBtn: false,
    });

    // controls: close / prev / next
    this.closeBtn = document.createElement("button");
    this.closeBtn.innerText = "✕";
    Object.assign(this.closeBtn.style, {
      position: "absolute",
      top: "12px",
      right: "12px",
      zIndex: 1000,
      padding: "6px 10px",
      background: "rgba(0,0,0,0.5)",
      color: "#fff",
      border: "1px solid #fff",
      borderRadius: "6px",
      cursor: "pointer",
    });
    this.inner.appendChild(this.closeBtn);

    this.prevBtn = document.createElement("button");
    this.prevBtn.innerText = "‹";
    Object.assign(this.prevBtn.style, {
      position: "absolute",
      left: "8px",
      top: "50%",
      transform: "translateY(-50%)",
      zIndex: 900,
      padding: "6px 10px",
      background: "rgba(0,0,0,0.4)",
      color: "#fff",
      border: "1px solid #fff",
      borderRadius: "6px",
      cursor: "pointer",
    });
    // this.inner.appendChild(this.prevBtn);

    this.nextBtn = document.createElement("button");
    this.nextBtn.innerText = "›";
    Object.assign(this.nextBtn.style, {
      position: "absolute",
      right: "8px",
      top: "50%",
      transform: "translateY(-50%)",
      zIndex: 900,
      padding: "6px 10px",
      background: "rgba(0,0,0,0.4)",
      color: "#fff",
      border: "1px solid #fff",
      borderRadius: "6px",
      cursor: "pointer",
    });
    // this.inner.appendChild(this.nextBtn);

    document.body.appendChild(this.overlay);

    // listeners
    this.closeBtn.addEventListener("click", () => this.close());
    // this.prevBtn.addEventListener("click", () => this.prev());
    // this.nextBtn.addEventListener("click", () => this.next());

    // internal state
    this.three = null; // { renderer, scene, camera, mesh, listeners, runningRef }
    this.sequence = null;
    this.currentIndex = 0;
    this._isDown = false;
    this._sx = 0;
    this._sy = 0;
    this._yaw = 0;
    this._pitch = 0;
    this._minPitch = -Math.PI * 0.45;
    this._maxPitch = Math.PI * 0.45;
    this._zoomMin = 25;
    this._zoomMax = 100;
    this._onKey = null;
  }

  // Открыть одиночную панораму
  async open(imageUrl, options = {}) {
    await this.openSequence([{ id: "__single", url: imageUrl, ...options }], 0);
  }

  // Открыть массив панорам
  async openSequence(panoramas = [], startIndex = 0) {
    this.overlay.style.display = "flex";
    this._setGlowVisibilityForProjection(this._currentProjection);

    // нормализуем вход
    this.sequence = panoramas.map((p, i) =>
      typeof p === "string" ? { id: String(i), url: p } : { ...p }
    );
    this.currentIndex = Math.max(
      0,
      Math.min(startIndex || 0, this.sequence.length - 1)
    );

    if (!this.three) {
      await this._initThreeOnce();
    }
    await this._gotoIndex(this.currentIndex, { instant: true });
    this._bindKeyboard();
  }

  // Закрыть и очистить
  close() {
    this.overlay.style.display = "none";
    this.glowLayer.style.display = "none";
    this.floorGlow.style.display = "none";
    this.ceilingGlow.style.display = "none";
    if (this.infoPanel) this.infoPanel.hide();

    this._unbindKeyboard();

    if (this.three) {
      const { renderer, scene, mesh, listeners, runningRef } = this.three;
      runningRef && runningRef(false);

      try {
        if (listeners) {
          if (listeners.pointerdownEl)
            listeners.pointerdownEl.removeEventListener(
              "pointerdown",
              listeners.onDown
            );
          window.removeEventListener("pointermove", listeners.onMove);
          window.removeEventListener("pointerup", listeners.onUp);
          window.removeEventListener("wheel", listeners.onWheel);
          window.removeEventListener("resize", listeners.onResize);
        }
      } catch (e) {}

      // dispose mesh/material/texture
      try {
        if (mesh) {
          if (mesh.geometry) mesh.geometry.dispose();
          if (mesh.material) {
            if (mesh.material.map) mesh.material.map.dispose();
            mesh.material.dispose();
          }
          scene.remove(mesh);
        }
      } catch (e) {}

      try {
        renderer && renderer.dispose();
      } catch (e) {}

      this.three = null;
    }

    this.sequence = null;
    this.currentIndex = 0;
    this.hotspotLayer.innerHTML = "";
    this.canvasHolder.innerHTML = "";
  }

  // Prev / Next
  prev() {
    if (!this.sequence) return;
    const idx =
      (this.currentIndex - 1 + this.sequence.length) % this.sequence.length;
    this._gotoIndex(idx);
  }
  next() {
    if (!this.sequence) return;
    const idx = (this.currentIndex + 1) % this.sequence.length;
    this._gotoIndex(idx);
  }

  // Инициализация three один раз
  async _initThreeOnce() {
    this.canvasHolder.innerHTML = "";
    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    this.canvasHolder.appendChild(canvas);

    // Force layout recalc to get proper canvas dimensions
    this.canvasHolder.offsetWidth; // trigger reflow

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    console.log(
      "[PanoramaOverlay] Renderer initialized, pixelRatio:",
      renderer.getPixelRatio()
    );

    const scene = new THREE.Scene();
    const w = Math.max(1, this.canvasHolder.clientWidth || 1);
    const h = Math.max(1, this.canvasHolder.clientHeight || 1);
    console.log("[PanoramaOverlay] Canvas dimensions:", w, "x", h);
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 5000);
    camera.position.set(0, 0, 0);
    camera.rotation.order = "YXZ"; // важно — избегаем крена

    const { mesh, floorDisk, ceilingDisk } = this._createProjectionGeometry(
      scene,
      this._currentProjection
    );

    console.log(
      "[PanoramaOverlay] Scene mesh added, projection:",
      this.options.projectionType
    );

    // handlers
    const onDown = (e) => {
      this._isDown = true;
      this._sx =
        e.clientX || (e.touches && e.touches[0] && e.touches[0].clientX) || 0;
      this._sy =
        e.clientY || (e.touches && e.touches[0] && e.touches[0].clientY) || 0;
    };
    const onMove = (e) => {
      if (!this._isDown) return;
      const x =
        e.clientX || (e.touches && e.touches[0] && e.touches[0].clientX) || 0;
      const y =
        e.clientY || (e.touches && e.touches[0] && e.touches[0].clientY) || 0;
      const dx = x - this._sx;
      const dy = y - this._sy;
      this._sx = x;
      this._sy = y;

      this._yaw += dx * 0.005;
      this._pitch -= dy * 0.0035;
      this._pitch = Math.max(
        this._minPitch,
        Math.min(this._maxPitch, this._pitch)
      );
      camera.rotation.set(this._pitch, this._yaw, 0);
      mesh.rotation.set(0, 0, 0); // цилиндр стоит ровно

      this._updateHotspotsPositions();
    };
    const onUp = () => (this._isDown = false);

    const onWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY || e.wheelDelta || -e.detail;
      let f = camera.fov + (delta > 0 ? 1.8 : -1.8);
      f = Math.max(this._zoomMin, Math.min(this._zoomMax, f));
      camera.fov = f;
      camera.updateProjectionMatrix();
      this._updateHotspotsPositions();
    };

    const onResize = () => {
      const w = Math.max(1, this.canvasHolder.clientWidth);
      const h = Math.max(1, this.canvasHolder.clientHeight);
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      this._updateHotspotsPositions();
    };

    this.canvasHolder.addEventListener("pointerdown", onDown, {
      passive: true,
    });
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", onResize, { passive: true });

    // render loop
    let running = true;
    const runningRef = (v) => {
      if (typeof v === "boolean") running = v;
      return running;
    };
    let frameCount = 0;
    const animate = () => {
      if (!runningRef()) return;
      requestAnimationFrame(animate);
      frameCount++;
      if (frameCount === 1) console.log("[PanoramaOverlay] First render frame");
      renderer.render(scene, camera);
    };
    animate();
    console.log("[PanoramaOverlay] Animation loop started");

    this.three = {
      renderer,
      scene,
      camera,
      mesh,
      floorDisk,
      ceilingDisk,
      listeners: {
        onDown,
        onMove,
        onUp,
        onWheel,
        onResize,
        pointerdownEl: this.canvasHolder,
      },
      _runningFlagRef: runningRef,
    };

    this._toggleFloorCeilingVisibility(
      !this._isSphereProjection(this._currentProjection)
    );

    // initial resize
    requestAnimationFrame(onResize);
    console.log("[PanoramaOverlay] _initThreeOnce complete");
  }

  // Перейти на индекс: загрузить текстуру, пересоздать геометрию, нарисовать хотспоты
  async _gotoIndex(idx, opts = {}) {
    if (!this.sequence || idx < 0 || idx >= this.sequence.length) return;
    this.currentIndex = idx;
    const pano = this.sequence[idx];
    console.log("[PanoramaOverlay] Going to index:", idx, "url:", pano.url);
    const projection = this._resolveProjectionForPano(pano);
    this._currentProjection = projection;
    this._setGlowVisibilityForProjection(projection);

    let tex;
    try {
      tex = await this._loadTexture(pano.url);
      console.log(
        "[PanoramaOverlay] Texture loaded, size:",
        tex.image?.width,
        "x",
        tex.image?.height
      );
    } catch (e) {
      console.error("[PanoramaOverlay] Failed to load texture", pano.url, e);
      alert("Failed to load panorama image: " + pano.url);
      return;
    }

    try {
      tex.encoding = THREE.sRGBEncoding;
    } catch (e) {}
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;

    const imgW = Math.max(1, tex.image?.width || 4096);
    const imgH = Math.max(1, tex.image?.height || 1024);
    const { mesh } = this.three;
    if (!mesh) {
      console.warn("[PanoramaOverlay] Missing mesh for projection");
      return;
    }

    if (this._isSphereProjection(projection)) {
      this._applySphereProjection(tex);
    } else {
      this._applyCylinderProjection(tex, imgW, imgH);
    }
    this._toggleFloorCeilingVisibility(!this._isSphereProjection(projection));
    console.log("[PanoramaOverlay] Geometry & texture updated");

    // optional pano.startYaw / startPitch
    if (pano.startYaw !== undefined) this._yaw = pano.startYaw;
    if (pano.startPitch !== undefined) this._pitch = pano.startPitch;

    mesh.rotation.y = this._yaw;
    this.three.camera.rotation.set(this._pitch, this._yaw, 0);

    // build hotspots
    this._updateHotspotsForCurrent();
    console.log("[PanoramaOverlay] _gotoIndex complete");

    // показать информационную панель если есть название/описание
    if (pano.name || pano.description) {
      this.infoPanel.show({
        name: pano.name || pano.title || "Объект",
        description: pano.description || "",
      });
    } else {
      this.infoPanel.hide();
    }
  }

  _isSphereProjection(mode = this._currentProjection) {
    return (mode || "cylinder") === "sphere";
  }

  _createProjectionGeometry(scene, mode = this._currentProjection) {
    const R = this.options.radius || 500;
    const isSphere = this._isSphereProjection(mode);
    const baseGeometry = isSphere
      ? new THREE.SphereGeometry(R, 128, 64)
      : new THREE.CylinderGeometry(R, R, 2 * R, 128, 1, true);
    baseGeometry.scale(-1, 1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: 0x111111,
      side: THREE.BackSide,
    });
    const mesh = new THREE.Mesh(baseGeometry, material);
    scene.add(mesh);

    const floorMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
    });
    const floorGeometry = new THREE.CircleGeometry(R * 0.98, 64);
    const floorDisk = new THREE.Mesh(floorGeometry, floorMaterial);
    floorDisk.rotation.x = -Math.PI / 2;
    floorDisk.position.y = -(R);
    floorDisk.visible = !isSphere;
    scene.add(floorDisk);

    const ceilingMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });
    const ceilingGeometry = new THREE.CircleGeometry(R * 0.98, 64);
    const ceilingDisk = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceilingDisk.rotation.x = Math.PI / 2;
    ceilingDisk.position.y = R;
    ceilingDisk.visible = !isSphere;
    scene.add(ceilingDisk);

    return { mesh, floorDisk, ceilingDisk };
  }

  _setGlowVisibilityForProjection(mode) {
    const show = !this._isSphereProjection(mode);
    const display = show ? "block" : "none";
    if (this.glowLayer) this.glowLayer.style.display = display;
    if (this.floorGlow) this.floorGlow.style.display = display;
    if (this.ceilingGlow) this.ceilingGlow.style.display = display;
  }

  _toggleFloorCeilingVisibility(show) {
    if (this.three?.floorDisk) this.three.floorDisk.visible = !!show;
    if (this.three?.ceilingDisk) this.three.ceilingDisk.visible = !!show;
  }

  _resolveProjectionForPano(pano) {
    if (!pano) {
      return (
        this._currentProjection || this.options.projectionType || "cylinder"
      );
    }
    const candidate =
      pano.projection ||
      pano.projectionType ||
      pano.mode ||
      pano.view ||
      (typeof pano.type === "string" ? pano.type : null);
    if (candidate) return candidate;
    if (pano.sphere === true) return "sphere";
    return this.options.projectionType || this._currentProjection || "cylinder";
  }

  _applyCylinderProjection(tex, imgW, imgH) {
    const { mesh, floorDisk, ceilingDisk } = this.three;
    if (!mesh) return;
    const R = this.options.radius || 500;
    const aspect = imgW / imgH;
    const height = Math.max(0.1, (2 * Math.PI * R) / Math.max(0.0001, aspect));
    try {
      mesh.geometry?.dispose();
    } catch (e) {}
    const geometry = new THREE.CylinderGeometry(R, R, height, 128, 1, true);
    geometry.scale(-1, 1, 1);
    mesh.geometry = geometry;
    if (floorDisk) floorDisk.position.y = -height / 2;
    if (ceilingDisk) ceilingDisk.position.y = height / 2;
    mesh.rotation.set(0, 0, 0);
    this._applyTexture(mesh, tex);
  }

  _applySphereProjection(tex) {
    const { mesh } = this.three;
    if (!mesh) return;
    const R = this.options.radius || 500;
    try {
      mesh.geometry?.dispose();
    } catch (e) {}
    const geometry = new THREE.SphereGeometry(R, 128, 64);
    geometry.scale(-1, 1, 1);
    mesh.geometry = geometry;
    mesh.rotation.set(0, 0, 0);
    this._applyTexture(mesh, tex);
  }

  _applyTexture(mesh, tex) {
    if (!mesh || !tex) return;
    try {
      if (mesh.material.map) mesh.material.map.dispose();
    } catch (e) {}
    mesh.material.map = tex;
    if (mesh.material.color) mesh.material.color.set(0xffffff);
    mesh.material.side = THREE.DoubleSide;
    mesh.material.needsUpdate = true;
    tex.encoding = THREE.sRGBEncoding;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.x = 1;
    tex.center.set(0, 0);
    tex.offset.set(1, 0);
    tex.needsUpdate = true;
  }

  _computeHotspotPosition(u, v, mesh) {
    const yaw = (u - 0.5) * Math.PI * 2;
    const R = this.options.radius || 500;
    if (this._isSphereProjection()) {
      const pitch = (0.5 - v) * Math.PI;
      const cosPitch = Math.cos(pitch);
      return new THREE.Vector3(
        R * Math.sin(yaw) * cosPitch,
        R * Math.sin(pitch),
        R * Math.cos(yaw) * cosPitch
      );
    }

    const height = this._getCylinderHeight(mesh);
    const y = (0.5 - v) * height;
    return new THREE.Vector3(R * Math.sin(yaw), y, R * Math.cos(yaw));
  }

  _getCylinderHeight(mesh) {
    if (mesh?.geometry?.parameters?.height) {
      return mesh.geometry.parameters.height;
    }
    const box = new THREE.Box3().setFromObject(mesh);
    return box.getSize(new THREE.Vector3()).y || this.options.radius || 500;
  }

  // Построить DOM хотспоты для текущей панорамы
  _updateHotspotsForCurrent() {
    this.hotspotLayer.innerHTML = "";
    const pano = this.sequence && this.sequence[this.currentIndex];
    if (!pano || !pano.hotspots) return;

    for (const hs of pano.hotspots) {
      const el = document.createElement("button");
      el.className = "pano-hotspot";
      el.innerText = hs.label || "→";
      Object.assign(el.style, {
        position: "absolute",
        transform: "translate(-50%,-50%)",
        pointerEvents: "auto",
        background: "rgba(255,255,255,0.9)",
        padding: "6px 8px",
        borderRadius: "6px",
        border: "1px solid rgba(0,0,0,0.15)",
        cursor: "pointer",
        whiteSpace: "nowrap",
        fontSize: "13px",
      });
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (hs.to) {
          const targetIndex = this.sequence.findIndex((p) => p.id === hs.to);
          if (targetIndex >= 0) this._gotoIndex(targetIndex);
        }
      });
      this.hotspotLayer.appendChild(el);
      hs._el = el;
    }
    this._updateHotspotsPositions();
  }

  // Позиционируем хотспоты: u->yaw, v->y, проекция в экран
  _updateHotspotsPositions() {
    if (!this.three) return;
    const { camera, mesh } = this.three;
    const pano = this.sequence && this.sequence[this.currentIndex];
    if (!pano || !pano.hotspots) return;

    for (const hs of pano.hotspots) {
      const el = hs._el;
      if (!el) continue;
      const u = hs.u === undefined ? 0.5 : hs.u;
      const v = hs.v === undefined ? 0.5 : hs.v;
      const pos = this._computeHotspotPosition(u, v, mesh);
      if (!pos) continue;
      mesh.updateMatrixWorld(true);
      pos.applyMatrix4(mesh.matrixWorld);

      pos.project(camera);
      const sx = (pos.x * 0.5 + 0.5) * this.inner.clientWidth;
      const sy = (-pos.y * 0.5 + 0.5) * this.inner.clientHeight;

      el.style.left = `${sx}px`;
      el.style.top = `${sy}px`;

      if (pos.z > 1 || pos.z < -1) el.style.display = "none";
      else el.style.display = "";
    }
  }

  // Keyboard
  _bindKeyboard() {
    this._onKey = (e) => {
      if (!this.three) return;
      const cam = this.three.camera;
      if (e.key === "ArrowLeft") {
        this._yaw += 0.1;
        this.three.mesh.rotation.y = this._yaw;
      } else if (e.key === "ArrowRight") {
        this._yaw -= 0.1;
        this.three.mesh.rotation.y = this._yaw;
      } else if (e.key === "ArrowUp") {
        this._pitch = Math.max(this._minPitch, this._pitch - 0.05);
        cam.rotation.x = this._pitch;
      } else if (e.key === "ArrowDown") {
        this._pitch = Math.min(this._maxPitch, this._pitch + 0.05);
        cam.rotation.x = this._pitch;
      } else if (e.key === "+" || e.key === "=") {
        cam.fov = Math.max(this._zoomMin, cam.fov - 4);
        cam.updateProjectionMatrix();
      } else if (e.key === "-" || e.key === "_") {
        cam.fov = Math.min(this._zoomMax, cam.fov + 4);
        cam.updateProjectionMatrix();
      }
      this._updateHotspotsPositions();
    };
    window.addEventListener("keydown", this._onKey);
  }
  _unbindKeyboard() {
    if (this._onKey) window.removeEventListener("keydown", this._onKey);
    this._onKey = null;
  }

  // Загрузка текстуры
  _loadTexture(url) {
    return new Promise((res, rej) => {
      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin && loader.setCrossOrigin("anonymous");
      const timeout = setTimeout(() => {
        console.error("[PanoramaOverlay] Texture load timeout:", url);
        rej(new Error("Texture load timeout"));
      }, 30000);
      loader.load(
        url,
        (t) => {
          clearTimeout(timeout);
          t.needsUpdate = true;
          console.log("[PanoramaOverlay] Texture loaded successfully", url);
          res(t);
        },
        (progress) => {
          console.log(
            "[PanoramaOverlay] Texture loading...",
            Math.round((progress.loaded / progress.total) * 100) + "%"
          );
        },
        (err) => {
          clearTimeout(timeout);
          console.error("[PanoramaOverlay] texture load error:", url, err);
          rej(err);
        }
      );
    });
  }
}
