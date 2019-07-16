import { mat4 } from 'math';
import * as WebGL from './constants';

import * as Objects from './objects';
import PlaneMesh from './primitives/plane';
import BoxMesh from './primitives/box';
import SphereMesh from './primitives/sphere';
import WebGLState from './state';
import * as Filters from './filters';

export default class Renderer {
  matApplied = false;
  matStack = [mat4.create()];
  matStackPos = 0;

  activeTexture = [];
  activeProgram = null;
  activeRenderTargetStack = [];
  activeVertexArray = null;
  objectCache = {};
  Filters = {};

  extensions = {};

  constructor(canvas) {
    for (let name in Objects) {
      this[name] = Objects[name].bind(null, this);
    }
    for (let name in Filters) {
      this.Filters[name] = Filters[name].bind(null, this);
    }

    this.canvas = canvas;
    const gl = this.gl = canvas.getContext("webgl2", {
      alpha: false,
      premultipliedAlpha: false,
    });
    if (!gl) return;

    this.width = gl.drawingBufferWidth;
    this.height = gl.drawingBufferHeight;

    gl.clearColor(0, 0, 0, 1);
    gl.clearDepth(1);

    gl.enable(WebGL.DEPTH_TEST);
    gl.enable(WebGL.BLEND);
    gl.blendFunc(WebGL.SRC_ALPHA, WebGL.ONE_MINUS_SRC_ALPHA);

    const whiteBuf = new Uint8Array(8 * 8 * 4);
    for (let i = 0; i < whiteBuf.length; ++i) {
      whiteBuf[i] = 255;
    }
    this.white = new this.Texture();
    this.white.bind().loadPixels(8, 8, whiteBuf).filter(WebGL.LINEAR).wrap(WebGL.REPEAT);

    this.primitives = {
      Plane: PlaneMesh(this),
      Box: BoxMesh(this),
      Sphere: SphereMesh(this),
    };

    this.state = new WebGLState(gl);
  }

  beginFrame(camera) {
    const gl = this.gl;
    this.width = gl.drawingBufferWidth;
    this.height = gl.drawingBufferHeight;
    if (document.hidden === true) {
      return false;
    }

    this.camera = camera;
    this.camera.update(this.width / this.height);

    this.activeTexture.length = 0;
    this.activeProgram = null;
    this.activeRenderTargetStack.length = 0;
    this.activeVertexArray = null;

    gl.viewport(0, 0, this.width, this.height);
    gl.clear(WebGL.COLOR_BUFFER_BIT | WebGL.DEPTH_BUFFER_BIT | WebGL.STENCIL_BUFFER_BIT);
    return true;
  }

  endFrame() {
    const gl = this.gl;
    gl.flush();
  }

  setState(state) {
    const prev = {};
    for (let p in state) {
      prev[p] = this.state[p];
      this.state[p] = state[p];
    }
    return prev;
  }

  cache(name, func) {
    let obj = this.objectCache[name];
    if (!obj) {
      obj = this.objectCache[name] = func();
    }
    return obj;
  }

  extension(name) {
    if (this.extensions.hasOwnProperty(name)) {
      return this.extensions[name];
    }
    return this.extensions[name] = this.gl.getExtension(name);
  }

  get defaultMaterial() {
    if (this.defaultMaterial_) {
      return this.defaultMaterial_;
    }
    return this.defaultMaterial_ = new this.Material();
  }
}
