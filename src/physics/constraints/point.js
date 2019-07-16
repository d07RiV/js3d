import { vec3, mat3, quat } from 'math';
import config from '../config';
import { Jac1, Jac3 } from '../solvers';

const tmp1 = vec3.create(), tmp2 = vec3.create(), tmp3 = vec3.create(),
      rel1 = vec3.create(), rel2 = vec3.create(),
      cmp1 = vec3.create(), cmp2 = vec3.create(), cmp3 = vec3.create(), cmp4 = vec3.create();
const uim1 = mat3.create(), uim2 = mat3.create();

export default class Point {
  pos1 = vec3.create();
  pos2 = vec3.create();
  massTensor = mat3.create();
  biasVector = vec3.create();
  normal = vec3.create();
  mode = -1;

  constructor(body1, body2, pos1, pos2, minDistance, maxDistance) {
    this.body1 = body1;
    this.body2 = body2;
    this.pos1_local = vec3.clone(pos1);
    this.pos2_local = vec3.clone(pos2);
    this.minDistance = minDistance || 0;
    this.maxDistance = maxDistance || this.minDistance;
  }

  init() {
    this.body1.localToWorld(this.pos1, this.pos1_local);
    this.body2.localToWorld(this.pos2, this.pos2_local);

    vec3.subtract(tmp1, this.pos1, this.pos2);
    const distance = vec3.length(tmp1);

    if (this.maxDistance > 1e-4) {
      let useMin = this.minDistance > 1e-4 && distance < this.minDistance + config.delta;
      let useMax = distance > this.maxDistance - config.delta;
      if (!useMin && !useMax) {
        this.mode = -1;
        return;
      }

      if (this.maxDistance - this.minDistance < config.delta * 2) {
        useMin = true;
        useMax = true;
      }

      if (distance > 1e-4) {
        vec3.scale(this.normal, tmp1, 1 / distance);
      } else {
        vec3.set(this.normal, 0, 0, 1);
      }

      if (!this.jac1) {
        this.jac1 = new Jac1(this.body1, this.body2);
      }
      this.jac1.linear(this.pos1, this.pos2, this.normal);

      let target = this.maxDistance;
      if (useMin && useMax) {
        this.jac1.lower = -1e+9;
        this.jac1.upper = 1e+9;
        this.mode = 1;
      } else if (useMin) {
        this.jac1.lower = 0;
        this.jac1.upper = 1e+9;
        this.mode = 2;
        target = this.minDistance;
      } else if (useMax) {
        this.jac1.lower = -1e+9;
        this.jac1.upper = 0;
        this.mode = 3;
      }

      const bias = distance - target;
      if (bias > config.delta) {
        this.jac1.bias = 0.2 * (bias - config.delta) / config.step;
      } else if (bias < -config.delta) {
        this.jac1.bias = 0.2 * (bias + config.delta) / config.step;
      } else {
        this.jac1.bias = 0;
      }
    } else {
      this.mode = 0;
      if (!this.jac3) {
        this.jac3 = new Jac3(this.body1, this.body2);
      }
      this.jac3.linear(this.pos1, this.pos2);

      if (distance > config.delta) {
        vec3.scale(this.jac3.bias, tmp1, 0.2 * (distance - config.delta) / distance / config.step);
      } else {
        vec3.set(this.jac3.bias, 0, 0, 0);
      }
    }
  }

  resolve() {
    if (this.mode === 0) {
      this.jac3.resolve();
    } else if (this.mode > 0) {
      this.jac1.resolve();
    }
  }

  force(out) {
    if (this.mode === 0) {
      this.jac3.force(out);
    } else if (this.mode > 0) {
      this.jac1.force(out);
    } else {
      vec3.set(out, 0, 0, 0);
    }
  }

  initPosition() {
  }
  resolvePosition() {
    vec3.subtract(rel1, this.pos1_local, this.body1.center);
    vec3.subtract(rel2, this.pos2_local, this.body2.center);
    vec3.transformQuat(rel1, rel1, this.body1.orientation);
    vec3.transformQuat(rel2, rel2, this.body2.orientation);
    vec3.add(tmp1, rel1, this.body1.position);
    vec3.add(tmp2, rel2, this.body2.position);

    vec3.subtract(tmp3, tmp1, tmp2);
    const distance = vec3.length(tmp3);

    let impulse = null;
    if (this.maxDistance < 1e-4) {
      if (distance < config.delta) {
        return;
      }
      // 3D problem, calculate UIM
      this.body1.unitImpulseMatrix(uim1, tmp1);
      this.body2.unitImpulseMatrix(uim2, tmp2);
      mat3.add(uim1, uim1, uim2);
      mat3.invert(uim1, uim1);
      vec3.scale(tmp3, tmp3, -0.2 * (distance - config.delta) / distance);
      impulse = vec3.transformMat3(tmp3, tmp3, uim1);

      vec3.transformMat3(cmp3, impulse, this.body1.invMass);
      vec3.transformMat3(cmp4, impulse, this.body2.invMass);
      vec3.cross(cmp1, rel1, impulse);
      vec3.cross(cmp2, rel2, impulse);
      vec3.transformMat3(rel1, cmp1, this.body1.invInertia);
      vec3.transformMat3(rel2, cmp2, this.body2.invInertia);
      vec3.add(this.body1.position, this.body1.position, cmp3);
      vec3.subtract(this.body2.position, this.body2.position, cmp4);
      quat.adjustVec3(this.body1.orientation, this.body1.orientation, rel1, 1);
      quat.adjustVec3(this.body2.orientation, this.body2.orientation, rel2, -1);
    } else if (distance > this.maxDistance + config.delta || distance < this.minDistance - config.delta) {
      // 1D problem
      if (distance < 1e-4) {
        vec3.set(tmp3, 0, 0, 1);
      } else {
        vec3.scale(tmp3, tmp3, 1 / distance);
      }
      vec3.transformMat3(cmp3, tmp3, this.body1.invMass);
      vec3.transformMat3(cmp4, tmp3, this.body2.invMass);
      vec3.cross(cmp1, rel1, tmp3);
      vec3.cross(cmp2, rel2, tmp3);
      vec3.transformMat3(rel1, cmp1, this.body1.invInertia);
      vec3.transformMat3(rel2, cmp2, this.body2.invInertia);
      const mass = vec3.dot(tmp3, cmp3) + vec3.dot(tmp3, cmp4) + vec3.dot(rel1, cmp1) + vec3.dot(rel2, cmp2);
      let lambda;
      if (distance > this.maxDistance) {
        lambda = -0.2 * (distance - this.maxDistance - config.delta) / mass;
      } else {
        lambda = 0.2 * (this.minDistance - distance - config.delta) / mass;
      }
      vec3.scaleAndAdd(this.body1.position, this.body1.position, cmp3, lambda);
      quat.adjustVec3(this.body1.orientation, this.body1.orientation, rel1, lambda);
      vec3.scaleAndAdd(this.body2.position, this.body2.position, cmp4, -lambda);
      quat.adjustVec3(this.body2.orientation, this.body2.orientation, rel2, -lambda);
    } else {
      return;
    }

    this.body1.calculateInertia();
    this.body2.calculateInertia();
}
}
