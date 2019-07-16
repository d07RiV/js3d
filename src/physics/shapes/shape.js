import { AABB, mat3, vec3 } from 'math';
import config from '../config';

class Shape {
  constructor() {
    this.material = {...config.defaultMaterial};
    this.aabb = AABB.create();
  }
  update() {
  }
  getInfo(center, inertia) {
    vec3.set(center, 0, 0, 0);
    mat3.zero(inertia);
    return 0;
  }
  intersect(/*ray*/) {
    return false;
  }

  get type() {
    return this.constructor.type;
  }
}

export default Shape;
