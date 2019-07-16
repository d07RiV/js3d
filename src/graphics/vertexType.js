import { Float16Array } from '@petamoriken/float16';
import * as WebGL from './constants';

function defaultComponents(semantic) {
  const m = semantic.match(/^([a-zA-Z]+)(?:_\d+)?$/);
  if (!m) {
    throw new Error(`invalid attribute semantic ${semantic}`);
  }
  switch (m[1]) {
  case "POSITION":
    return 3;
  case "NORMAL":
    return 3;
  case "TANGENT":
    return 4;
  case "TEXCOORD":
    return 2;
  case "COLOR":
    return 3;
  case "JOINTS":
    return 4;
  case "WEIGHTS":
    return 4;
  default:
    throw new Error(`invalid attribute semantic ${semantic}`);
  }
}

export default class VertexType {
  static views = {
    [WebGL.BYTE]: Int8Array,
    [WebGL.SHORT]: Int16Array,
    [WebGL.UNSIGNED_BYTE]: Uint8Array,
    [WebGL.UNSIGNED_SHORT]: Uint16Array,
    [WebGL.FLOAT]: Float32Array,
    [WebGL.HALF_FLOAT]: Float16Array,
  };
  
  constructor(elems) {
    this.elements = {};
    for (let semantic in elems) {
      const info = (typeof elems[semantic] === "object" ? elems[semantic] : {type: elems[semantic]});
      const {type, size=defaultComponents(semantic), normalized=true} = info;
      const view = this.constructor.views[type];
      if (!view) {
        throw new Error(`invalid component type ${type}`);
      }
      const stride = Math.ceil(view.BYTES_PER_ELEMENT * size / 4) * 4;
      this.elements[semantic] = {type, size, normalized, view, stride};
    }
  }
}

VertexType.default = new VertexType({POSITION: WebGL.FLOAT, NORMAL: WebGL.HALF_FLOAT, TEXCOORD_0: WebGL.HALF_FLOAT});
