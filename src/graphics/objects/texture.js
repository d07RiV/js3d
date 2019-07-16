import dedent from 'dedent';
import * as WebGL from '../constants';
import GraphicsObject from './object';

export default class Texture extends GraphicsObject {
  unit = 0;

  constructor(renderer, target=WebGL.TEXTURE_2D) {
    super(renderer);
    const gl = renderer.gl;
    this.texture = gl.createTexture();
    this.target = target;
  }

  bind(unit=0) {
    this.unit = unit;
    if (this.renderer.activeTexture[unit] !== this) {
      this.renderer.activeTexture[unit] = this;
      const gl = this.renderer.gl;
      gl.activeTexture(WebGL.TEXTURE0 + unit);
      gl.bindTexture(this.target, this.texture);
    }
    return this;
  }

  load(image, format=WebGL.RGBA, type=WebGL.UNSIGNED_BYTE, internalFormat=format, level=0) {
    this.bind(this.unit);
    this.renderer.gl.texImage2D(this.target, level, internalFormat, format, type, image);
    this.format = internalFormat;
    return this;
  }

  loadPixels(width, height, pixels, format=WebGL.RGBA, type=WebGL.UNSIGNED_BYTE, internalFormat=format, level=0) {
    this.bind(this.unit);
    this.renderer.gl.texImage2D(this.target, level, internalFormat, width, height, 0, format, type, pixels);
    this.format = internalFormat;
    return this;
  }

  create(width, height, internalFormat, levels=1) {
    this.bind(this.unit);
    this.renderer.gl.texStorage2D(this.target, levels, internalFormat, width, height);
    this.format = internalFormat;
    return this;
  }

  loadPixels3D(width, height, depth, pixels, format=WebGL.RGBA, type=WebGL.UNSIGNED_BYTE, internalFormat=format, level=0) {
    this.bind(this.unit);
    this.renderer.gl.texImage3D(this.target, level, internalFormat, width, height, depth, 0, format, type, pixels);
    this.format = internalFormat;
    this.depth = depth;
    return this;
  }

  create3D(width, height, depth, internalFormat, levels=1) {
    this.bind(this.unit);
    this.renderer.gl.texStorage3D(this.target, levels, internalFormat, width, height, depth);
    this.format = internalFormat;
    this.depth = depth;
    return this;
  }

  generateMipmap() {
    this.bind(this.unit);
    this.renderer.gl.generateMipmap(this.target);
    return this;
  }

  destroy() {
    this.renderer.gl.deleteTexture(this.texture);
  }

  filter(mag, min=mag) {
    this.bind(this.unit);
    const gl = this.renderer.gl;
    gl.texParameteri(this.target, WebGL.TEXTURE_MAG_FILTER, mag === WebGL.NEAREST ? WebGL.NEAREST : WebGL.LINEAR);
    gl.texParameteri(this.target, WebGL.TEXTURE_MIN_FILTER, min);
    return this;
  }

  wrap(s, t=s, r=t) {
    this.bind(this.unit);
    const gl = this.renderer.gl;
    gl.texParameteri(this.target, WebGL.TEXTURE_WRAP_S, s);
    gl.texParameteri(this.target, WebGL.TEXTURE_WRAP_T, t);
    if (this.target === WebGL.TEXTURE_3D) {
      gl.texParameteri(this.target, WebGL.TEXTURE_WRAP_R, r);
    }
    return this;
  }

  mipmapLevels(base, max) {
    this.bind(this.unit);
    const gl = this.renderer.gl;
    gl.texParameteri(this.target, WebGL.TEXTURE_BASE_LEVEL, base);
    gl.texParameteri(this.target, WebGL.TEXTURE_MAX_LEVEL, max);
    return this;
  }

  clampLod(min, max) {
    this.bind(this.unit);
    const gl = this.renderer.gl;
    gl.texParameteri(this.target, WebGL.TEXTURE_MIN_LOD, min);
    gl.texParameteri(this.target, WebGL.TEXTURE_MAX_LOD, max);
    return this;
  }

  compareMode(mode, func=WebGL.LEQUAL) {
    this.bind(this.unit);
    const gl = this.renderer.gl;
    gl.texParameteri(this.target, WebGL.TEXTURE_COMPARE_MODE, mode);
    gl.texParameteri(this.target, WebGL.TEXTURE_COMPARE_FUNC, func);
    return this;
  }

  getPixels(width, height, format, layer=0) {
    const buffer = new this.renderer.FrameBuffer();
    buffer.bind();
    if (this.target === WebGL.TEXTURE_2D_ARRAY) {
      buffer.textureLayer(WebGL.COLOR_ATTACHMENT0, this, layer);
    } else {
      buffer.texture(WebGL.COLOR_ATTACHMENT0, this);
    }
    this.renderer.gl.readBuffer(WebGL.COLOR_ATTACHMENT0);
    const data = new (format === WebGL.FLOAT ? Float32Array : Uint8Array)(width * height * 4);
    this.renderer.gl.readPixels(0, 0, width, height, WebGL.RGBA, format, data);
    buffer.unbind();
    buffer.destroy();
    return data;
  }

  getDepth(width, height, layer=0) {
    const target = new this.renderer.RenderTarget(width, height, {
      color: WebGL.R32F,
    }, {
      depthTest: false,
      depthMask: false,
      blend: false,
    });
    let filter;
    if (this.target === WebGL.TEXTURE_2D_ARRAY) {
      filter = new this.renderer.Filters.Local(`return texelFetch(u_Source,ivec3(ivec2(gl_FragCoord.xy), ${layer}), 0).r`, "float", "sampler2DArray");
    } else {
      filter = new this.renderer.Filters.Local("return get(0, 0).r", "float");
    }
    filter.apply(this, target);
    const data = target.color.getPixels(width, height, WebGL.FLOAT);
    target.destroy();
    return data;
  }

  download(width, height, format, layers=0) {
    const getLayer = layer => {
      let data = format < 0 ? this.getDepth(width, height, layer) : this.getPixels(width, height, format, layer);
      if (format === WebGL.FLOAT || format < 0) {
        const array = new Uint8ClampedArray(data.length);
        for (let i = 0; i < data.length; ++i) {
          array[i] = data[i] * 255;
        }
        data = array;
      } else {
        data = new Uint8ClampedArray(data);
      }
      return new ImageData(data, width, height);
    };
    let twidth = width;
    if (this.target === WebGL.TEXTURE_2D_ARRAY) {
      twidth *= layers;
    }

    const canvas = document.createElement("canvas");
    canvas.width = twidth;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (this.target === WebGL.TEXTURE_2D_ARRAY) {
      for (let i = 0; i < layers; ++i) {
        ctx.putImageData(getLayer(i), i * width, 0);
      }
    } else {
      ctx.putImageData(getLayer(0), 0, 0);
    }
    const url = canvas.toDataURL("image/png");
    const elt = document.createElement("a");
    elt.setAttribute("href", url);
    elt.setAttribute("download", "image.png");
    elt.style.display = "none";
    document.body.appendChild(elt);
    elt.click();
    document.body.removeChild(elt);
  }
}
