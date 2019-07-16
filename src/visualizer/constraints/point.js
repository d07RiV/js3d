import { vec3, mat4 } from 'math';
import ObjectNode from '../objectNode';

export default class PointObject extends ObjectNode {
  matrix = mat4.create();

  constructor(renderer, constraint) {
    super(constraint.name, renderer.primitives.Box.clone());
    this.constraint = constraint;
    this.nx = this.matrix.subarray(0, 3);
    this.ny = this.matrix.subarray(4, 7);
    this.nz = this.matrix.subarray(8, 11);
    this.pos = this.matrix.subarray(12, 15);
  }

  update() {
    if (!this.constraint.maxDistance) {
      this.visible = false;
      return false;
    }
    this.visible = true;
    vec3.subtract(this.nx, this.constraint.pos2, this.constraint.pos1);
    vec3.scaleAndAdd(this.pos, this.constraint.pos1, this.nx, 0.5);
    const norm = vec3.length(this.nx);
    vec3.scale(this.nx, this.nx, 1 / norm);
    vec3.makeBasis(this.nx, this.ny, this.nz);
    vec3.scale(this.nx, this.nx, norm / 2);
    vec3.scale(this.ny, this.ny, 0.01);
    vec3.scale(this.nz, this.nz, 0.01);
  }
}
