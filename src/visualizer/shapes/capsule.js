import ObjectNode from '../objectNode';
import Sphere from 'graphics/primitives/sphere';
import { vec3, mat4 } from 'math';

export default class CapsuleObject extends ObjectNode {
  matrix = mat4.create();
  constructor(renderer, shape) {
    const height = vec3.distance(shape.localStart, shape.localEnd);
    super(shape.name, Sphere(renderer, height / shape.radius));
    const tr = this.matrix;
    const vX = tr.subarray(0, 3);
    const vY = tr.subarray(4, 7);
    const vZ = tr.subarray(8, 11);
    vec3.subtract(vZ, shape.localEnd, shape.localStart);
    vec3.scale(vZ, vZ, 1 / height);
    vec3.makeBasis(vZ, vX, vY);
    vec3.scale(vX, vX, shape.radius);
    vec3.scale(vY, vY, shape.radius);
    vec3.scale(vZ, vZ, shape.radius);
    vec3.copy(tr.subarray(12, 15), shape.localStart);
  }
}
