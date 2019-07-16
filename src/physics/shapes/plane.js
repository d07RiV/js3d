import { vec3, AABB } from 'math';
import Shape from './shape';

class Plane extends Shape {
  static type = "Plane";
  renderSize = 25;

  constructor(normal, offset) {
    super();
    this.normal = vec3.clone(normal);
    vec3.normalize(this.normal, this.normal);
    this.offset = offset;

    AABB.set(this.aabb, -1e+4, -1e+4, -1e+4, 1e+4, 1e+4, 1e+4);
    for (let i = 0; i < 3; ++i) {
      if (this.normal[i] > 1 - 1e-4) {
        this.aabb[i + 3] = this.normal[i] * offset;
        break;
      } else if (this.normal[i] < -1 + 1e-4) {
        this.aabb[i] = this.normal[i] * offset;
        break;
      }
    }
  }

  intersect(ray) {
    const fpos = vec3.dot(ray.pos, this.normal) - this.offset;
    const fdir = vec3.dot(ray.dir, this.normal);
    if (fdir > -1e-4 && fdir < 1e-4) return false;
    const t = -fpos / fdir;
    if (t < 0) return false;
    return t; 
  }
}

export default Plane;
