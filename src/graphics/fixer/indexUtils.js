import * as WebGL from '../constants';

export function getIndexView(type) {
  switch (type) {
  case WebGL.UNSIGNED_BYTE:
    return Uint8Array;
  case WebGL.UNSIGNED_SHORT:
    return Uint16Array;
  case WebGL.UNSIGNED_INT:
    return Uint32Array;
  default:
    throw new Error(`invalid index type ${type}`);
  }
}

export function restartIndex(indices) {
  if (Array.isArray(indices)) {
    return null;
  } else {
    return (~0) >>> (32 - indices.BYTES_PER_ELEMENT * 8);
  }
}

export function readIndices(gl, buffer) {
  if (!buffer) return null;
  gl.bindBuffer(WebGL.ELEMENT_ARRAY_BUFFER, buffer);
  const size = gl.getBufferParameter(WebGL.ELEMENT_ARRAY_BUFFER, WebGL.BUFFER_SIZE);
  const array = new ArrayBuffer(size);
  gl.getBufferSubData(WebGL.ELEMENT_ARRAY_BUFFER, 0, new DataView(array));
  gl.bindBuffer(WebGL.ELEMENT_ARRAY_BUFFER, null);
  return array;
}
  