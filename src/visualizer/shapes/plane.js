import ObjectNode from '../objectNode';
import { vec3, mat4 } from 'math';

export default class PlaneObject extends ObjectNode {
  matrix = mat4.create();
  constructor(renderer, shape) {
    super(shape.name, renderer.primitives.Plane.clone());
    const tr = this.matrix;
    const vX = tr.subarray(0, 3);
    const vY = tr.subarray(4, 7);
    const vZ = tr.subarray(8, 11);
    const vT = tr.subarray(12, 15);
    vec3.copy(vZ, shape.normal);
    vec3.makeBasis(vZ, vX, vY);
    vec3.scale(vX, vX, shape.renderSize);
    vec3.scale(vY, vY, shape.renderSize);
    vec3.scale(vZ, vZ, shape.renderSize);
    vec3.scale(vT, shape.normal, shape.offset);
  }
}
