import * as WebGL from '../constants';
import GraphicsObject from './object';

function arrayDef(type, size) {
  return (ctx, offset, count=1) => ({
    get: () => {
      ctx.invalidate();
      return new window[type](ctx.array, offset, count * size);
    },
    set: val => {
      ctx.invalidate();
      new window[type](ctx.array, offset, count * size).set(val);
    },
  });
}
function basicDef(type) {
  return (ctx, offset, count) => {
    if (count != null) {
      return arrayDef(`${type}Array`, count)(ctx, offset);
    }
    return {
      get: () => ctx.view[`get${type}`](offset, true),
      set: val => {
        ctx.invalidate();
        ctx.view[`set${type}`](offset, val, true);
      },
    };
  };
}

const scalarInfo = {
  "bool": [4, 4, (ctx, offset, count) => {
    if (count != null) {
      return arrayDef("Uint32Array", count)(ctx, offset);
    }
    return {
      get: () => ctx.view.getUint32(offset, true) != 0,
      set: val => {
        ctx.invalidate();
        ctx.view.setUint32(offset, val ? 1 : 0, true);
      },
    };
  }],
  "int": [4, 4, basicDef("Int32")],
  "uint": [4, 4, basicDef("Uint32")],
  "float": [4, 4, basicDef("Float32")],
  "double": [8, 8, basicDef("Float64")],
  "bvec2": [8, 8, arrayDef("Uint32Array", 2)],
  "bvec3": [12, 16, arrayDef("Uint32Array", 3)],
  "bvec4": [16, 16, arrayDef("Uint32Array", 4)],
  "ivec2": [8, 8, arrayDef("Int32Array", 2)],
  "ivec3": [12, 16, arrayDef("Int32Array", 3)],
  "ivec4": [16, 16, arrayDef("Int32Array", 4)],
  "uvec2": [8, 8, arrayDef("Uint32Array", 2)],
  "uvec3": [12, 16, arrayDef("Uint32Array", 3)],
  "uvec4": [16, 16, arrayDef("Uint32Array", 4)],
  "vec2": [8, 8, arrayDef("Float32Array", 2)],
  "vec3": [12, 16, arrayDef("Float32Array", 3)],
  "vec4": [16, 16, arrayDef("Float32Array", 4)],
  "dvec2": [16, 16, arrayDef("Float64Array", 2)],
  "dvec3": [24, 32, arrayDef("Float64Array", 3)],
  "dvec4": [32, 32, arrayDef("Float64Array", 4)],
};

function roundUp(num, factor) {
  const rem = num % factor;
  return num + (rem ? factor - rem : 0);
}

function structInfo(elems) {
  let totalSize = 0, maxAlign = 0;
  const items = elems.map(([type, name, count]) => {
    let m;
    if (typeof type === "string" && (m = type.match(/([biud]?)mat([234])(?:x([234]))?/))) {
      const cols = parseInt(m[2]), rows = m[3] ? parseInt(m[3]) : cols;
      type = `${m[1]}vec${rows}`;
      count = (count != null ? count : 1) * cols;
    }
    if (type in scalarInfo) {
      let [size, align, baseBuilder] = scalarInfo[type];
      if (count != null) {
        align = roundUp(align, 16);
        size = roundUp(size, align) * count;
      }
      const baseOffset = roundUp(totalSize, align);
      maxAlign = Math.max(align, maxAlign);
      totalSize = baseOffset + size;
      return (ctx, dst, offset) => Object.defineProperty(dst, name, {...baseBuilder(ctx, offset + baseOffset, count), enumerable: true});
    } else if (Array.isArray(type)) {
      let [size, align, structBuilder] = structInfo(type);
      align = roundUp(align, 16);
      size = roundUp(size, align);
      const baseOffset = roundUp(totalSize, align);
      maxAlign = Math.max(align, maxAlign);
      totalSize = baseOffset + size * (count == null ? 1 : count);
      if (count == null) {
        return (ctx, dst, offset) => dst[name] = structBuilder(ctx, {}, offset + baseOffset);
      } else {
        return (ctx, dst, offset) => {
          const res = dst[name] = new Array(count);
          for (let i = 0; i < count; ++i) {
            res[i] = structBuilder(ctx, {}, offset + baseOffset + size * i);
          }
        };
      }
    } else {
      throw `Unknown uniform type ${type}`;
    }
  });
  const builder = (ctx, dst, offset) => {
    items.forEach(func => func(ctx, dst, offset));
    return dst;
  };
  return [totalSize, maxAlign, builder];
}

function structDecl(elems, indent="") {
  return `{\n${elems.map(([type, name, count]) => {
    count = (count != null ? `[${count}]` : "");
    if (Array.isArray(type)) {
      type = `struct ${structDecl(type, indent + "  ")}`;
    }
    return `${indent}  ${type} ${name}${count};\n`;
  }).join("")}${indent}}`;
}

export default function UniformStruct(renderer, elems) {
  const [size,, builder] = structInfo(elems);
  const $buffer = Symbol("buffer");
  const $data = Symbol("data");
  const $dirty = Symbol("dirty");
  return class UniformBuffer extends GraphicsObject {
    static declaration = structDecl(elems);
    constructor(renderer2, name) {
      super(renderer2 || renderer, name);
      const gl = this.renderer.gl;
      this[$buffer] = gl.createBuffer();
      this[$data] = new ArrayBuffer(size);
      gl.bindBufferBase(WebGL.UNIFORM_BUFFER, 0, this[$buffer]);
      gl.bufferData(WebGL.UNIFORM_BUFFER, size, WebGL.DYNAMIC_DRAW);

      builder({
        array: this[$data],
        view: new DataView(this[$data]),
        invalidate: () => this[$dirty] = true,
      }, this, 0);
    }

    bind(unit=0) {
      const gl = this.renderer.gl;
      gl.bindBufferBase(WebGL.UNIFORM_BUFFER, unit, this[$buffer]);
      if (this[$dirty]) {
        gl.bufferSubData(WebGL.UNIFORM_BUFFER, 0, this[$data]);
        this[$dirty] = false;
      }
      return this;
    }

    destroy() {
      this.renderer.gl.deleteBuffer(this[$buffer]);
    }
  };
}
