import WasmMemory from './memory';
import createBindings from './webglapi';

export default class WebGLApi {
  objects_ = new Map();
  objectsReverse_ = new Map();
  uniformLocations_ = new Map();
  uniformLocationsReverse_ = new Map();
  extensions_ = {};

  getExtension(name) {
    if (this.extensions_.hasOwnProperty(name)) {
      return this.extensions_[name];
    }
    return this.extensions_[name] = this.context.getExtension(name);
  }

  constructor(gl) {
    this.context = gl;
    this.memory = WasmMemory();

    this.bindings = createBindings(this, this.memory);

  }
}
