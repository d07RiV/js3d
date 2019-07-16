import * as WebGL from '../constants';
import RenderBuffer from './renderBuffer';
import GraphicsObject from './object';

export default class FrameBuffer extends GraphicsObject {
  ownedBuffers = [];

  constructor(renderer, width, height) {
    super(renderer);
    this.width = width;
    this.height = height;
    this.buffer = renderer.gl.createFramebuffer();
  }

  bind() {
    this.prevBuffer = this.renderer.gl.getParameter(WebGL.FRAMEBUFFER_BINDING);
    this.renderer.gl.bindFramebuffer(WebGL.FRAMEBUFFER, this.buffer);
    return this;
  }

  unbind() {
    this.renderer.gl.bindFramebuffer(WebGL.FRAMEBUFFER, this.prevBuffer);
    delete this.prevBuffer;
    return this;
  }

  read(dst, x, y, width, height, format=WebGL.RGBA, type=WebGL.UNSIGNED_BYTE, buffer=WebGL.COLOR_ATTACHMENT0) {
    this.renderer.gl.readBuffer(buffer);
    this.renderer.gl.readPixels(x, y, width, height, format, type, dst);
    return this;
  }

  texture(attachment, texture, textarget=WebGL.TEXTURE_2D, level=0) {
    this.renderer.gl.framebufferTexture2D(WebGL.FRAMEBUFFER, attachment, textarget, texture.texture, level);
    return this;
  }

  textureLayer(attachment, texture, layer, level=0) {
    this.renderer.gl.framebufferTextureLayer(WebGL.FRAMEBUFFER, attachment, texture.texture, level, layer);
    return this;
  }

  renderbuffer(attachment, buffer) {
    this.renderer.gl.framebufferRenderbuffer(WebGL.FRAMEBUFFER, attachment, WebGL.RENDERBUFFER, buffer.buffer);
    return this;
  }

  createBuffer(attachment, format, samples=1) {
    const buffer = new RenderBuffer(this.renderer, this.width, this.height, format, samples);
    this.ownedBuffers.push(buffer);
    return this.renderbuffer(attachment, buffer);
  }

  createColor(format=WebGL.RGBA8, attachment=WebGL.COLOR_ATTACHMENT0) {
    return this.createBuffer(attachment, format);
  }
  createDepth(format=WebGL.DEPTH_COMPONENT16) {
    return this.createBuffer(WebGL.DEPTH_ATTACHMENT, format);
  }
  createStencil(format=WebGL.STENCIL_INDEX8) {
    return this.createBuffer(WebGL.STENCIL_ATTACHMENT, format);
  }
  createDepthStencil(format=WebGL.DEPTH_STENCIL) {
    return this.createBuffer(WebGL.DEPTH_STENCIL_ATTACHMENT, format);
  }

  blit(source, srcX0, srcY0, srcX1, srcY1, dstX0, dstY0, dstX1, dstY1,
      mask=WebGL.COLOR_BUFFER_BIT | WebGL.DEPTH_BUFFER_BIT | WebGL.STENCIL_BUFFER_BIT, filter=WebGL.NEAREST) {
    const gl = this.renderer.gl;
    gl.bindFramebuffer(WebGL.READ_FRAMEBUFFER, source.buffer);
    gl.blitFramebuffer(srcX0, srcY0, srcX1, srcY1, dstX0, dstY0, dstX1, dstY1, mask, filter);
    gl.bindFramebuffer(WebGL.READ_FRAMEBUFFER, null);
    return this;
  }

  destroy() {
    this.ownedBuffers.forEach(buffer => buffer.destroy());
    this.renderer.gl.deleteFramebuffer(this.buffer);
  }

  checkStatus() {
    const status = this.renderer.gl.checkFramebufferStatus(WebGL.FRAMEBUFFER);
    switch (status) {
    case WebGL.FRAMEBUFFER_COMPLETE:
      return true;
    case WebGL.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
      throw "The attachment types are mismatched or not all framebuffer attachment points are framebuffer attachment complete.";
    case WebGL.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
      throw "There is no attachment.";
    case WebGL.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
      throw "Height and width of the attachment are not the same.";
    case WebGL.FRAMEBUFFER_UNSUPPORTED:
      throw "The format of the attachment is not supported or depth and stencil attachments are not the same renderbuffer.";
    case WebGL.FRAMEBUFFER_INCOMPLETE_MULTISAMPLE:
      throw "The values of RENDERBUFFER_SAMPLES are different among attached renderbuffers, " +
        "or are non-zero if the attached images are a mix of renderbuffers and textures.";
    }
  }
}
