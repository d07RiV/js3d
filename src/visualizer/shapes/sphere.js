import ObjectNode from '../objectNode';
import { vec3, mat4 } from 'math';

export default class SphereObject extends ObjectNode {
  matrix = mat4.create();

  constructor(renderer, shape) {
    super(shape.name, renderer.primitives.Sphere.clone());
    const tr = this.matrix;
    tr[0] = shape.radius;
    tr[5] = shape.radius;
    tr[10] = shape.radius;
    vec3.copy(tr.subarray(12, 15), shape.localCenter);
  }
}
