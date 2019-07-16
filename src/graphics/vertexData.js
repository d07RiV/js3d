import { AABB } from 'math';
import VertexType from './vertexType';
import * as WebGL from './constants';

function isIntegral(array) {
  return array instanceof Uint8Array || array instanceof Uint16Array || array instanceof Uint32Array ||
    array instanceof Int8Array || array instanceof Int16Array || array instanceof Int32Array;
}

export default class VertexData {
  length = 0;
  
  constructor(size, type=VertexType.default) {
    this.type = type;
    this.size = size;
    let totalSize = 0;
    for (let id in type.elements) {
      totalSize += type.elements[id].stride * size;
    }
    this.array = new ArrayBuffer(totalSize);
    this.views = {};
    totalSize = 0;
    for (let id in type.elements) {
      const { view, stride } = type.elements[id];
      this.views[id] = new view(this.array, totalSize, size * stride / view.BYTES_PER_ELEMENT);
      totalSize += stride * size;
    }
  }

  set(index, data) {
    if (!data.POSITION) {
      throw new Error(`every vertex must have POSITION attribute`);
    }
    if (!this.box) {
      this.box = AABB.create();
      AABB.setVec3(this.box, data.POSITION);
    } else {
      AABB.combineVec3(this.box, this.box, data.POSITION);
    }
    for (let id in data) {
      if (!this.type.elements[id]) {
        throw new Error(`attribute ${id} not in vertex declaration`)
      }
      const { view, stride, normalized, type } = this.type.elements[id];
      if (normalized && [WebGL.UNSIGNED_BYTE, WebGL.UNSIGNED_SHORT, WebGL.BYTE, WebGL.SHORT].includes(type) && !isIntegral(data[id])) {
        // Need to re-normalize
        let pos = index * stride / view.BYTES_PER_ELEMENT;
        if (type === WebGL.UNSIGNED_BYTE) {
          data[id].forEach(value => this.views[id][pos++] = value * 255 + 0.5);
        } else if (type === WebGL.UNSIGNED_SHORT) {
          data[id].forEach(value => this.views[id][pos++] = value * 65535 + 0.5);
        } else if (type === WebGL.BYTE) {
          data[id].forEach(value => this.views[id][pos++] = Math.floor(value * 255 / 2));
        } else if (type === WebGL.SHORT) {
          data[id].forEach(value => this.views[id][pos++] = Math.floor(value * 65535 / 2));
        }
      } else {
        this.views[id].set(data[id], index * stride / view.BYTES_PER_ELEMENT);
      }
    }
    return index;
  }
  add(data) {
    return this.set(this.length++, data);
  }

  get(index) {
    const result = {};
    for (let id in this.type.elements) {
      const { size, view, stride } = this.type.elements[id];
      const pos = index * stride / view.BYTES_PER_ELEMENT;
      result[id] = this.views[id].subarray(pos, pos + size);
    }
    return result;
  }

  buildAttributes(gl) {
    const attributes = {};

    const buffer = gl.createBuffer();
    gl.bindBuffer(WebGL.ARRAY_BUFFER, buffer);
    gl.bufferData(WebGL.ARRAY_BUFFER, this.array, WebGL.STATIC_DRAW);
    
    for (let id in this.type.elements) {
      const { size, type, normalized, stride } = this.type.elements[id];
      attributes[id] = {
        buffer, size, type, normalized, stride,
        offset: this.views[id].byteOffset,
      };
    }
    return attributes;
  }

  build(renderer, indices) {
    const gl = renderer.gl;

    const attributes = this.buildAttributes(gl);

    let count = this.size;
    if (indices) {
      if (Array.isArray(indices)) {
        if (this.size >= 65536) {
          indices = new Uint32Array(indices);
        } else {
          indices = new Uint16Array(indices);
        }
      }
      let type;
      if (indices instanceof Uint8Array) {
        type = WebGL.UNSIGNED_BYTE;
      } else if (indices instanceof Uint16Array) {
        type = WebGL.UNSIGNED_SHORT;
      } else if (indices instanceof Uint32Array) {
        type = WebGL.UNSIGNED_INT;
      } else {
        throw new Error(`invalid index type`);
      }
      count = indices.length;
      const buffer = gl.createBuffer();
      gl.bindBuffer(WebGL.ELEMENT_ARRAY_BUFFER, buffer);
      gl.bufferData(WebGL.ELEMENT_ARRAY_BUFFER, indices, WebGL.STATIC_DRAW);
      indices = {buffer, type};
    }
    return new renderer.Primitive(attributes, indices, count, this.box);
  }
}
