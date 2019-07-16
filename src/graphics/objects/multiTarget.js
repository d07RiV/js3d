import GraphicsObject from './object';

export default class MultiTarget extends GraphicsObject {
  constructor(renderer, width, height, attachments, params) {
    super(renderer);
    this.source = new renderer.RenderTarget(width, height, attachments, params);
    this.target = new renderer.RenderTarget(width, height, attachments, params);
    for (let id in attachments) {
      Object.defineProperty(this, id, {get: () => this.source[id]});
    }
  }

  get width() {
    return this.source.width;
  }
  get height() {
    return this.target.height;
  }

  destroy() {
    this.source.destroy();
    this.target.destroy();
  }

  bind() {
    this.target.bind();
    return this;
  }

  clear() {
    this.target.clear();
    return this;
  }

  unbind() {
    if (this.target.unbind()) {
      this.swap();
      return true;
    }
    return false;
  }

  swap() {
    const tmp = this.target;
    this.target = this.source;
    this.source = tmp;
    const rts = this.renderer.activeRenderTargetStack;
    if (rts.length && rts[rts.length - 1] === tmp) {
      for (let i = rts.length - 1; i >= 0 && rts[i] === tmp; --i) {
        rts[i] = this.target;
      }
      this.target.prevParams = tmp.prevParams;
      delete tmp.prevParams;
      this.target.buffer.unbind();
      tmp.buffer.bind();
    }
    return this;
  }

  resize(width, height) {
    this.source.resize(width, height);
    this.target.resize(width, height);
    return this;
  }
}
