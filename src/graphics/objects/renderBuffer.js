import * as WebGL from '../constants';
import GraphicsObject from './object';

export default class RenderBuffer extends GraphicsObject {
  constructor(renderer, width, height, format, samples=1) {
    super(renderer);
    const gl = renderer.gl;
    this.buffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(WebGL.RENDERBUFFER, this.buffer);
    if (samples > 1) {
      gl.renderbufferStorageMultisample(WebGL.RENDERBUFFER, samples, format, width, height);
    } else {
      gl.renderbufferStorage(WebGL.RENDERBUFFER, format, width, height);
    }
    gl.bindRenderbuffer(WebGL.RENDERBUFFER, null);
    this.format = format;
  }

  destroy() {
    this.renderer.gl.deleteRenderbuffer(this.buffer);
  }
}
