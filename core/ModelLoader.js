import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export class ModelLoader {
  constructor() {
    this.loader = new GLTFLoader();
    this.cache = new Map(); // url -> Promise<gltf>
  }

  // Загружает модель и кэширует промис. Возвращает Promise<gltfClone>
  load(url) {
    if (this.cache.has(url)) {
      return this.cache.get(url).then((gltf) => this._cloneGltf(gltf));
    }

    const promise = new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => {
          // кэшируем оригинальный gltf (объект)
          resolve(gltf);
        },
        undefined,
        (err) => {
          reject(err);
        }
      );
    });

    // сохраняем промис в кэше
    this.cache.set(url, promise);
    return promise.then((gltf) => this._cloneGltf(gltf));
  }

  // Простой клонинг сцены
  _cloneGltf(gltf) {
    const sceneClone = gltf.scene.clone(true);
    return { ...gltf, scene: sceneClone };
  }

  // Очистка кэша (включая dispose материалов)
  clearCache() {
    this.cache.clear();
  }
}
