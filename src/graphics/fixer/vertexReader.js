import VertexType from '../vertexType';
import { Float16Array } from '@petamoriken/float16';
import * as WebGL from '../constants';

export default class VertexReader {
  constructor(gl, attributes, minIndex, maxIndex) {
    // minIndex and maxIndex are both inclusive
    this.minIndex = minIndex;
    this.maxIndex = maxIndex;
    const elements = new VertexType(attributes).elements;
    const bufferRanges = new Map();
    for (let name in attributes) {
      const {buffer, stride=elements[name].stride, offset} = attributes[name];
      const min = offset + minIndex * stride;
      const max = offset + maxIndex * stride + elements[name].stride;
      // maxOffset is not inclusive
      if (bufferRanges.has(buffer)) {
        const range = bufferRanges.get(buffer);
        range.min = Math.min(range.min, min);
        range.max = Math.max(range.max, max);
      } else {
        bufferRanges.set(buffer, {min, max});
      }
    }
    const bufferArrays = new Map();
    this.attributes = {};
    for (let name in attributes) {
      const {stride: baseStride, view, normalized} = elements[name];
      const {buffer, stride: strideRaw, offset=0, size} = attributes[name];
      const stride = strideRaw || baseStride;
      const range = bufferRanges.get(buffer);
      let array;
      if (!bufferArrays.has(buffer)) {
        array = new ArrayBuffer(range.max - range.min);
        gl.bindBuffer(WebGL.ARRAY_BUFFER, buffer);
        gl.getBufferSubData(WebGL.ARRAY_BUFFER, range.min, new DataView(array));
        bufferArrays.set(buffer, array);
      } else {
        array = bufferArrays.get(buffer);
      }
      const min = offset + minIndex * stride;
      const max = offset + maxIndex * stride + baseStride;
      this.attributes[name] = {
        view: new view(array, min - range.min, (max - min) / view.BYTES_PER_ELEMENT),
        stride: stride / view.BYTES_PER_ELEMENT,
        size,
        normalized
      };
    }
  }

  getVertex(index, asFloat) {
    if (index < this.minIndex || index > this.maxIndex) {
      return null;
    }
    const vertex = {};
    for (let name in this.attributes) {
      const {view, stride, size, normalized} = this.attributes[name];
      const offset = (index - this.minIndex) * stride;
      vertex[name] = view.subarray(offset, offset + size);
      if (asFloat && ((normalized && view !== Float32Array) || view === Float16Array)) {
        const arr = vertex[name] = new Float32Array(vertex[name]);
        if (normalized) {
          if (view === Uint8Array) {
            for (let i = 0; i < size; ++i) {
              arr[i] = arr[i] / 255.0;
            }
          } else if (view === Uint16Array) {
            for (let i = 0; i < size; ++i) {
              arr[i] = arr[i] / 65535.0;
            }
          } else if (view === Int8Array) {
            for (let i = 0; i < size; ++i) {
              arr[i] = (2 * arr[i] + 1) / 255.0;
            }
          } else if (view === Int16Array) {
            for (let i = 0; i < size; ++i) {
              arr[i] = (2 * arr[i] + 1) / 65535.0;
            }
          }
        }
      }
    }
    return vertex;
  }
}
