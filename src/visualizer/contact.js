import { vec3, mat4 } from 'math';
import ObjectNode from './objectNode';

export default class ContactObject extends ObjectNode {
  matrix = mat4.create();

  constructor(renderer, contact) {
    super(contact.name, renderer.primitives.Box.clone());
    this.contact = contact;
    this.nx = this.matrix.subarray(0, 3);
    this.ny = this.matrix.subarray(4, 7);
    this.nz = this.matrix.subarray(8, 11);
    this.pos = this.matrix.subarray(12, 15);
  }

  update(config) {
    this.noDepth = config.contactNoDepth;
    this.contact.force(this.nx);
    const norm = vec3.length(this.nx);
    if (config.contactVector && norm > 0.01) {
      vec3.scaleAndAdd(this.pos, this.contact.pos, this.nx, 0.5);
      vec3.scale(this.nx, this.nx, 1 / norm);
      vec3.makeBasis(this.nx, this.ny, this.nz);
      vec3.scale(this.nx, this.nx, norm * 2);
      vec3.scale(this.ny, this.ny, 0.02);
      vec3.scale(this.nz, this.nz, 0.02);
    } else {
      vec3.copy(this.pos, this.contact.pos);
      vec3.set(this.nx, 0.02, 0, 0);
      vec3.set(this.ny, 0, 0.02, 0);
      vec3.set(this.nz, 0, 0, 0.02);
    }
  }
}
