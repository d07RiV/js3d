import { vec3 } from './vector';
import * as plane from './plane';

const tmp1 = vec3.create();

export default class Frustum {
  constructor(rays, near, far) {
    this.rays = rays;
    this.near = near;
    this.far = far;
  }

  get origin() {
    return this.rays[0].pos;
  }

  numPlanes() {
    return this.rays.length + 2;
  }
  getPlane(out, index) {
    if (index === 0) {
      plane.copy(out, this.near);
    } else if (index === 1) {
      plane.copy(out, this.far);
    } else {
      const first = index - 2;
      const second = (first + 1) % this.rays.length;
      const d1 = this.rays[first].dir, d2 = this.rays[second].dir, org = this.rays[first].pos;
      vec3.cross(tmp1, d1, d2);
      plane.setDirPoint(out, tmp1, org);
    }
    return out;
  }

  numPoints() {
    return this.rays.length * 2;
  }
  getPoint(out, index) {
    if (index < this.rays.length) {
      plane.intersectRay(out, this.near, this.rays[index]);
    } else {
      plane.intersectRay(out, this.far, this.rays[index - this.rays.length]);
    }
    return out;
  }
}
