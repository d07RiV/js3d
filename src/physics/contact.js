import { vec3, quat } from 'math';
import { Jac1, Jac2 } from './solvers';
import config from './config';

const vec3dot = vec3.dot;
const tmp1 = new Float32Array(3), tmp2 = new Float32Array(3);
const rel1 = new Float32Array(3), rel2 = new Float32Array(3);
const cmp1 = new Float32Array(3), cmp2 = new Float32Array(3);
const cmp3 = new Float32Array(3), cmp4 = new Float32Array(3);

export default class Contact {
  constructor(sh1, sh2, pos, pen, norm) {
    this.shape1 = sh1;
    this.shape2 = sh2;
    this.pos = vec3.clone(pos);
    this.penetration = pen;
    this.normal = vec3.clone(norm);

    this.body1 = sh1.body;
    this.body2 = sh2.body;

    this.jac1 = new Jac1(sh1.body, sh2.body);
    this.jac1.lower = 0;
    this.jac2 = new Jac2(sh1.body, sh2.body);

    this.init();
  }

  get friction() {
    return this.shape1.material.frictionCombine(this.shape1.material.friction, this.shape2.material.friction);
  }
  get restitution() {
    return this.shape1.material.restitutionCombine(this.shape1.material.restitution, this.shape2.material.restitution);
  }

  init() {
    this.jac1.linear(this.pos, this.pos, this.normal);
    if (this.friction > 1e-4) {
      vec3.makeBasis(this.normal, rel1, rel2);
      this.jac2.linear(this.pos, this.pos, rel1, rel2);
    }

    this.body1.lastVelocityAt(tmp1, this.pos);
    this.body2.lastVelocityAt(tmp2, this.pos);
    const relVel = vec3dot(vec3.sub(tmp1, tmp1, tmp2), this.normal);
    this.jac1.bias = (relVel < -0.5 ? this.restitution * relVel : 0);
    if (!config.positionIterations) {
      this.jac1.bias = Math.min(-0.2 * Math.max(0, this.penetration - config.delta) / config.step, this.jac1.bias);
    }
    return true;
  }

  resolve() {
    this.jac1.resolve();
    if (this.friction > 1e-4) {
      this.jac2.resolve(this.jac1.lambda * this.friction);
    }
  }

  force(out) {
    this.jac1.force(out);
    if (this.friction > 1e-4) {
      this.jac2.force(tmp1);
      vec3.add(out, out, tmp1);
    }
  }

  initPosition() {
    if (!this.pos1) this.pos1 = vec3.create();
    if (!this.pos2) this.pos2 = vec3.create();
    vec3.inverseMat4(this.pos1, this.pos, this.body1.transform);
    vec3.subtract(this.pos1, this.pos1, this.body1.center);
    vec3.inverseMat4(this.pos2, this.pos, this.body2.transform);
    vec3.subtract(this.pos2, this.pos2, this.body2.center);
  }

  resolvePosition() {
    vec3.transformQuat(tmp1, this.pos1, this.body1.orientation);
    vec3.cross(cmp1, tmp1, this.normal);
    vec3.add(tmp1, tmp1, this.body1.position);
    vec3.transformQuat(tmp2, this.pos2, this.body2.orientation);
    vec3.cross(cmp2, tmp2, this.normal);
    vec3.add(tmp2, tmp2, this.body2.position);

    vec3.subtract(rel1, tmp1, tmp2);
    const penetration = this.penetration - vec3.dot(rel1, this.normal);
    if (penetration < config.delta) return penetration;

    vec3.transformMat3(rel1, cmp1, this.body1.invInertia);
    vec3.transformMat3(rel2, cmp2, this.body2.invInertia);

    vec3.transformMat3(cmp3, this.normal, this.body1.invMass);
    vec3.transformMat3(cmp4, this.normal, this.body2.invMass);

    const mass = vec3.dot(cmp3, this.normal) + vec3.dot(cmp4, this.normal) + vec3.dot(rel1, cmp1) + vec3.dot(rel2, cmp2);
    const lambda = (penetration - config.delta) * 0.2 / mass;

    vec3.scaleAndAdd(this.body1.position, this.body1.position, cmp3, lambda);
    quat.adjustVec3(this.body1.orientation, this.body1.orientation, rel1, lambda);
    vec3.scaleAndAdd(this.body2.position, this.body2.position, cmp4, -lambda);
    quat.adjustVec3(this.body2.orientation, this.body2.orientation, rel2, -lambda);
    this.body1.calculateInertia();
    this.body2.calculateInertia();

    return penetration;
  }
}
