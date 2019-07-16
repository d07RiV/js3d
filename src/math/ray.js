import { vec3 } from './vector';

const tmp1 = vec3.create();

export default class Ray {
  constructor(pos, dir) {
    this.pos = pos;
    this.dir = dir;
  }

  distance(point) {
    const rel = vec3.subtract(tmp1, point, this.pos);
    const len = vec3.length(rel);
    const proj = vec3.dot(this.dir, rel);
    if (proj < 0) return len;
    return Math.sqrt(len * len - proj * proj);
  }

  along(point) {
    const rel = vec3.subtract(tmp1, point, this.pos);
    return vec3.dot(this.dir, rel);
  }
}
