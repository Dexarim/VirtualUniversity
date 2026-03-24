import { PanoramaOverlay } from "./PanoramaOverlay.js";

// CabinetPanoramaOverlay configures PanoramaOverlay to render full 360-degree spheres.
export class CabinetPanoramaOverlay extends PanoramaOverlay {
  constructor(options = {}) {
    super({ projectionType: "sphere", ...options });
  }
}
