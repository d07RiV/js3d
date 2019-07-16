import * as WebGL from '../constants';
import Texture from './texture';
import RenderBuffer from './renderBuffer';
import GraphicsObject from './object';

const attachmentTypes = {
  "color": WebGL.COLOR_ATTACHMENT0,
  "color0": WebGL.COLOR_ATTACHMENT0,
  "color1": WebGL.COLOR_ATTACHMENT1,
  "color2": WebGL.COLOR_ATTACHMENT2,
  "color3": WebGL.COLOR_ATTACHMENT3,
  "color4": WebGL.COLOR_ATTACHMENT4,
  "color5": WebGL.COLOR_ATTACHMENT5,
  "color6": WebGL.COLOR_ATTACHMENT6,
  "color7": WebGL.COLOR_ATTACHMENT7,
  "color8": WebGL.COLOR_ATTACHMENT8,
  "color9": WebGL.COLOR_ATTACHMENT9,
  "color10": WebGL.COLOR_ATTACHMENT10,
  "color11": WebGL.COLOR_ATTACHMENT11,
  "color12": WebGL.COLOR_ATTACHMENT12,
  "color13": WebGL.COLOR_ATTACHMENT13,
  "color14": WebGL.COLOR_ATTACHMENT14,
  "color15": WebGL.COLOR_ATTACHMENT15,
  "depth": WebGL.DEPTH_ATTACHMENT,
  "stencil": WebGL.STENCIL_ATTACHMENT,
  "depth_stencil": WebGL.DEPTH_STENCIL_ATTACHMENT,
};

function defaultFormat(type) {
  switch (type) {
    case "depth": return WebGL.DEPTH_COMPONENT16;
    case "stencil": return WebGL.STENCIL_INDEX8;
    case "depth_stencil": return WebGL.DEPTH24_STENCIL8;
    default: return WebGL.RGBA8;
  }
}

const IntFormats = [
  WebGL.R8I,
  WebGL.RG8I,
  WebGL.RGB8I,
  WebGL.RGBA8I,
  WebGL.R16I,
  WebGL.RG16I,
  WebGL.RGB16I,
  WebGL.RGBA16I,
  WebGL.R32I,
  WebGL.RG32I,
  WebGL.RGB32I,
  WebGL.RGBA32I,
];
const UintFormats = [
  WebGL.R8UI,
  WebGL.RG8UI,
  WebGL.RGB8UI,
  WebGL.RGBA8UI,
  WebGL.R16UI,
  WebGL.RG16UI,
  WebGL.RGB16UI,
  WebGL.RGBA16UI,
  WebGL.R32UI,
  WebGL.RG32UI,
  WebGL.RGB32UI,
  WebGL.RGBA32UI,
  WebGL.RGB10_A2UI,
];

function makeClearCall(attachment, format, value) {
  if (typeof value === "number") {
    value = [value];
  }
  switch (attachment) {
  case WebGL.DEPTH_ATTACHMENT:
    return gl => gl.clearBufferfv(WebGL.DEPTH, 0, value);
  case WebGL.STENCIL_ATTACHMENT:
    return gl => gl.clearBufferiv(WebGL.STENCIL, 0, value);
  case WebGL.DEPTH_STENCIL_ATTACHMENT:
    return gl => gl.clearBufferfi(WebGL.DEPTH_STENCIL, 0, value[0], value[1]);
  default:
    const index = attachment - WebGL.COLOR_ATTACHMENT0;
    if (IntFormats.includes(format)) {
      return gl => gl.clearBufferiv(WebGL.COLOR, index, value);
    } else if (UintFormats.includes(format)) {
      return gl => gl.clearBufferuiv(WebGL.COLOR, index, value);
    } else {
      return gl => gl.clearBufferfv(WebGL.COLOR, index, value);
    }
  }
}

/*
attachments:
  key: attachment name
  value: true || number || string || Texture || RenderBuffer || object
    object: {
      attachment: attachment target (default: deduced from name)
      clear: clear value (default: zeros)
      ONE OF [
        texture: Texture object
        type: "buffer"/"renderbuffer"
        target: texture target (default: TEXTURE_2D)
      ]
      width: owned texture/renderbuffer width (default: target width)
      height: owned texture/renderbuffer height (default: target height)
      format: owned texture/renderbuffer format (default: deduced from attachment, see defaultFormat)
      samples: owned renderbuffer samples (default: 1)
      layers: owned texture layers for TEXTURE_2D_ARRAY (default: 1)
      levels: owned texture levels (default: 1)
      level: selected level (default: 0)
      layer: selected layer (default: 0)
      filter: number|array owned texture filtering
      wrap: number|array owned texture wrapping
      mipmap: [base, max]
      lod: [min, max]
      compare: true|constant depth texture compare
    }
    true: use renderbuffer with default format for attachment type
    number/string: use texture with format equal to value or WebGL[value]
    Texture/RenderBuffer: use 
*/

export default class RenderTarget extends GraphicsObject {
  ownedAttachments = [];

  createAttachments(attachments) {
    const { buffer, width, height, renderer } = this;
    const drawBuffers = [];
    for (let type in attachments) {
      const desc = attachments[type];
      if (!desc) continue;
      let att = desc, textureLayer = 0, textureTarget = WebGL.TEXTURE_2D, textureLevel = 0;
      let attachment = null, clearValue = null;
      if (desc === true) {
        att = new renderer.RenderBuffer(width, height, defaultFormat(type));
      } else if (typeof desc === "number" || WebGL[desc]) {
        att = new renderer.Texture().create(width, height, typeof desc === "number" ? desc : WebGL[desc]);
      } else if (!(att instanceof Texture) && !(att instanceof RenderBuffer)) {
        attachment = desc.attachment;
        clearValue = desc.clear;
        if (desc.texture instanceof Texture) {
          att = desc.texture;
          textureLevel = desc.level || 0
          textureLayer = desc.layer || 0;
        } else if (desc.type === "buffer" || desc.type === "renderbuffer") {
          att = new renderer.RenderBuffer(desc.width || width, desc.height || height, desc.format || defaultFormat(type), desc.samples || 1);
        } else {
          textureTarget = desc.target || WebGL.TEXTURE_2D;
          att = new renderer.Texture(textureTarget);
          if (textureTarget === WebGL.TEXTURE_2D_ARRAY) {
            att.create3D(desc.width || width, desc.height || height, desc.layers || 1, desc.format || defaultFormat(type), desc.levels || 1);
          } else {
            att.create(desc.width || width, desc.height || height, desc.format || defaultFormat(type), desc.levels || 1);            
          }
          if (desc.filter) {
            if (Array.isArray(desc.filter)) {
              att.filter(...desc.filter);
            } else {
              att.filter(desc.filter);
            }
          }
          if (desc.wrap) {
            if (Array.isArray(desc.wrap)) {
              att.wrap(...desc.wrap);
            } else {
              att.wrap(desc.wrap);
            }
          }
          if (desc.mipmap) {
            att.mipmapLevels(...desc.mipmap);
          }
          if (desc.lod) {
            att.clampLod(...desc.lod);
          }
          if (desc.compare) {
            att.compareMode(WebGL.COMPARE_REF_TO_TEXTURE, desc.compare === true ? WebGL.LEQUAL : desc.compare);
          }
          textureLevel = desc.level || 0;
          textureLayer = desc.layer || 0;
        }
      }
      if (att !== desc && att !== desc.texture) {
        this.ownedAttachments.push(att);
      }
      if (!attachment) {
        if (!attachmentTypes.hasOwnProperty(type)) {
          throw new TypeError(`new RenderTarget(): invalid attachment type ${type}`);
        }
        attachment = attachmentTypes[type];
      }
      this[type] = att;
      if (attachment >= WebGL.COLOR_ATTACHMENT0 && attachment <= WebGL.COLOR_ATTACHMENT15) {
        drawBuffers.push(attachment);
      }
      if (att instanceof Texture) {
        if (att.target === WebGL.TEXTURE_2D_ARRAY) {
          buffer.textureLayer(attachment, att, textureLayer, textureLevel);
        } else {
          buffer.texture(attachment, att, textureTarget, textureLevel);
        }
      } else if (att instanceof RenderBuffer) {
        buffer.renderbuffer(attachment, att);
      }
      if (!clearValue && IntFormats.includes(att.format)) {
        clearValue = new Int32Array([0, 0, 0, 0]);
      } else if (!clearValue && UintFormats.includes(att.format)) {
        clearValue = new Uint32Array([0, 0, 0, 0]);
      }
      if (clearValue) {
        this.clearFunc = this.clearFunc || [];
        this.clearFunc.push(makeClearCall(attachment, att.format, clearValue));
      }
    }
    renderer.gl.drawBuffers(this.drawBuffers || drawBuffers);
  }

  constructor(renderer, width, height, attachments, params) {
    super(renderer);

    this.width = width;
    this.height = height;
    this.attachments = attachments;
    this.drawBuffers = params && params.drawBuffers;

    const buffer = this.buffer = new renderer.FrameBuffer(width, height);
    buffer.bind();
    this.createAttachments(attachments);
    buffer.checkStatus();
    buffer.unbind();

    this.defViewport = [0, 0, width, height];

    this.params = Object.assign({
      viewport: this.defViewport,
    }, params);
    if (!this.params.viewport) {
      delete this.params.viewport;
    }
    delete this.params.drawBuffers;
  }

  destroy() {
    this.ownedAttachments.forEach(att => att.destroy());
    this.buffer.destroy();
  }

  bind() {
    const rts = this.renderer.activeRenderTargetStack;
    if (!rts.length || rts[rts.length - 1] !== this) {
      if (this.prevParams) {
        throw "RenderTarget.bind(): non-consecutive nested bind call";
      }
      this.buffer.bind();
      this.prevParams = this.renderer.setState(this.params);
    }
    rts.push(this);
    return this;
  }

  unbind() {
    const rts = this.renderer.activeRenderTargetStack;
    rts.pop();
    if (!rts.length || rts[rts.length - 1] !== this) {
      this.buffer.unbind();
      this.renderer.setState(this.prevParams);
      delete this.prevParams;
      return true;
    }
    return false;
  }

  clear() {
    if (this.clearFunc) {
      this.clearFunc.forEach(func => func(this.renderer.gl));
    } else {
      this.renderer.gl.clear(WebGL.COLOR_BUFFER_BIT | WebGL.DEPTH_BUFFER_BIT | WebGL.STENCIL_BUFFER_BIT);
    }
    return this;
  }

  blit(source, mask=WebGL.COLOR_BUFFER_BIT | WebGL.DEPTH_BUFFER_BIT | WebGL.STENCIL_BUFFER_BIT, filter=WebGL.NEAREST) {
    this.buffer.blit(source.buffer, 0, 0, source.width, source.height, 0, 0, this.width, this.height, mask, filter);
  }

  resize(width, height) {
    if (width === this.width && height === this.height) {
      return this;
    }
    this.width = width;
    this.height = height;

    this.defViewport[2] = width;
    this.defViewport[3] = height;

    this.buffer.bind();
    this.ownedAttachments.forEach(att => att.destroy());
    this.createAttachments(this.attachments);
    this.buffer.checkStatus();
    this.buffer.unbind();

    return this;     
  }
}
