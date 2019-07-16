import { vec3, mat3, AABB } from 'math';
import Shape from './shape';

const tmpm = mat3.create();

class Capsule extends Shape {
  static type = "Capsule";

  constructor(start, end, radius) {
    super();
    this.localStart = vec3.clone(start);
    this.localEnd = vec3.clone(end);
    this.radius = radius;
    this.start = vec3.clone(start);
    this.end = vec3.clone(end);
  }

  update() {
    if (this.body) {
      vec3.transformMat4(this.start, this.localStart, this.body.transform);
      vec3.transformMat4(this.end, this.localEnd, this.body.transform);
    }
    AABB.setVec3(this.aabb, this.start);
    AABB.combineVec3(this.aabb, this.aabb, this.end);
    AABB.grow(this.aabb, this.aabb, this.radius);
  }

  getInfo(center, inertia) {
    vec3.lerp(center, this.localStart, this.localEnd, 0.5);

    const r2 = this.radius * this.radius;
    const ht = vec3.distance(this.localStart, this.localEnd);
    const cM = Math.PI * ht * r2;
    const hsM = Math.PI * 2 * r2 * this.radius / 3;
    let i22 = r2 * cM * 0.5;
    let i11 = i22 * 0.5 + cM * ht * ht / 12;
    let i33 = i11;

    const t0 = hsM * r2 * 0.4;
    i22 += t0 * 2;
    const t1 = ht * 0.5;
    const t2 = t0 + hsM * (t1 * t1 + 3 * ht * this.radius / 8);
    i11 += t2 * 2;
    i33 += t2 * 2;

    const mass = (cM + 2 * hsM) * this.material.density;
    i11 *= this.material.density;
    i22 *= this.material.density;
    i33 *= this.material.density;

    const orient = tmpm;
    const vX = orient.subarray(0, 3), vY = orient.subarray(3, 6), vZ = orient.subarray(6, 9);
    vec3.subtract(vY, this.localEnd, this.localStart);
    vec3.scale(vY, vY, 1 / ht);
    vec3.makeBasis(vY, vX, vZ);

    mat3.diagonal(inertia, i11, i22, i33);
    mat3.transformInv(inertia, inertia, orient);
    
    return mass;
  }
}

export default Capsule;
