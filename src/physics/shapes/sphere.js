import { vec3, mat3, AABB } from 'math';
import Shape from './shape';

const tmp1 = vec3.create();

class Sphere extends Shape {
  static type = "Sphere";

  constructor(center, radius) {
    super();
    this.localCenter = vec3.clone(center);
    this.radius = radius;
    this.center = vec3.clone(center);
  }

  update() {
    if (this.body) vec3.transformMat4(this.center, this.localCenter, this.body.transform);
    AABB.setVec3(this.aabb, this.center);
    AABB.grow(this.aabb, this.aabb, this.radius);
  }

  getInfo(center, inertia) {
    vec3.copy(center, this.localCenter);
    const r2 = this.radius * this.radius;
    const mass = (Math.PI * this.radius * r2 * 4 / 3) * this.material.density;
    const ii = 0.4 * mass * r2;
    mat3.diagonal(inertia, ii, ii, ii);
    return mass;
  }

  intersect(ray) {
    const rel = vec3.subtract(tmp1, this.center, ray.pos);
    const len = vec3.length(rel);
    const proj = vec3.dot(ray.dir, rel);
    const dist2 = len * len - proj * proj, r2 = this.radius * this.radius;
    if (r2 - dist2 < 0) return false;
    const delta = Math.sqrt(r2 - dist2);
    if (proj - delta < 0) return false;
    return proj - delta;
  }
}

export default Sphere;
