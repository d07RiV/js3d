import * as WebGL from '../constants';
import { getIndexView, restartIndex, readIndices } from './indexUtils';
import VertexType from '../vertexType';

export default function verifyArray(array, primitives) {
  const gl = array.renderer.gl;
  const indexArray = readIndices(gl, array.getIndices());
  const attributes = array.getAttributes();
  const elements = new VertexType(attributes).elements;
  let minSize = null;
  for (let name in attributes) {
    const {stride: baseStride} = elements[name];
    const {buffer, stride: strideRaw, offset} = attributes[name];
    const stride = strideRaw || baseStride;
    gl.bindBuffer(WebGL.ARRAY_BUFFER, buffer);
    const bufferSize = gl.getBufferParameter(WebGL.ARRAY_BUFFER, WebGL.BUFFER_SIZE);
    // offset + index * stride + baseStride <= bufferSize
    const curSize = Math.floor((bufferSize - baseStride - offset) / stride) + 1;
    if (minSize == null || minSize > curSize) {
      minSize = curSize;
    }
  }

  primitives.forEach(p => {
    if (p.indices) {
      const view = getIndexView(p.indices.type);
      const indices = new view(indexArray, p.indices.offset || 0, p.count);
      const restart = restartIndex(indices);
      indices.forEach(idx => {
        if (idx !== restart && idx >= minSize) {
          throw new Error(`buffer size ${minSize}, found index ${idx}`);
        }
      });
    } else {
      if (p.count > minSize) {
        throw new Error(`primitive size ${p.count}, buffer size ${minSize}`);
      }
    }
  });
}
