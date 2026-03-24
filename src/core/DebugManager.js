export class DebugManager {
  constructor(initial = false) {
    this.enabled = !!initial;
  }

  set(value) {
    this.enabled = !!value;
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
}
