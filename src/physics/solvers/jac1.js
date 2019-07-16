import { vec3 } from 'math';
const vec3dot = vec3.dot;
const tmp1 = new Float32Array(3);

export default class Jac1 {
  v1 = new Float32Array(3);
  w1 = new Float32Array(3);
  v2 = new Float32Array(3);
  w2 = new Float32Array(3);
  v1a = new Float32Array(3);
  w1a = new Float32Array(3);
  v2a = new Float32Array(3);
  w2a = new Float32Array(3);
  bias = 0;
  restitution = 0;
  lower = -1e+9;
  upper = 1e+9;
  ok = true;

  constructor(body1, body2) {
    this.body1 = body1;
    this.body2 = body2;
  }

  apply(t) {
    //t *= 1 + this.restitution;
    const v1 = this.body1.velocity, w1 = this.body1.angVelocity,
          v2 = this.body2.velocity, w2 = this.body2.angVelocity;
    const v1a = this.v1a, w1a = this.w1a, v2a = this.v2a, w2a = this.w2a;
    v1[0] += v1a[0] * t; v1[1] += v1a[1] * t; v1[2] += v1a[2] * t;
    w1[0] += w1a[0] * t; w1[1] += w1a[1] * t; w1[2] += w1a[2] * t;
    v2[0] += v2a[0] * t; v2[1] += v2a[1] * t; v2[2] += v2a[2] * t;
    w2[0] += w2a[0] * t; w2[1] += w2a[1] * t; w2[2] += w2a[2] * t;
  }

  force(out) {
    vec3.scale(out, this.v1a, this.lambda * this.body1.mass);
  }

  linear(pos1, pos2, axis) {
    vec3.copy(this.v1, axis);
    vec3.subtract(tmp1, pos1, this.body1.position);
    vec3.cross(this.w1, tmp1, axis);
    vec3.negate(this.v2, axis);
    vec3.subtract(tmp1, pos2, this.body2.position);
    vec3.cross(this.w2, axis, tmp1);
    vec3.transformMat3(this.v1a, this.v1, this.body1.invMass);
    vec3.transformMat3(this.w1a, this.w1, this.body1.invInertia);
    vec3.transformMat3(this.v2a, this.v2, this.body2.invMass);
    vec3.transformMat3(this.w2a, this.w2, this.body2.invInertia);
    const invMass = vec3dot(this.v1a, this.v1) + vec3dot(this.w1a, this.w1) + vec3dot(this.v2a, this.v2) + vec3dot(this.w2a, this.w2);
    if (invMass < 1e-6) {
      this.ok = false;
    }
    this.mass = 1.0 / invMass;
    if (this.lambda !== undefined) {
      this.apply(this.lambda);
    } else {
      this.lambda = 0;
    }
  }

  angular(axis) {
    vec3.copy(this.w1, axis);
    vec3.negate(this.w2, axis);
    vec3.transformMat3(this.w1a, this.w1, this.body1.invInertia);
    vec3.transformMat3(this.w2a, this.w2, this.body2.invInertia);
    this.mass = 1 / (vec3dot(this.w1a, this.w1) + vec3dot(this.w2a, this.w2));
    if (this.lambda !== undefined) {
      this.apply(this.lambda);
    } else {
      this.lambda = 0;
    }
  }

  resolve() {
    if (!this.ok) {
      return;
    }
    const jv = vec3dot(this.v1, this.body1.velocity) + vec3dot(this.w1, this.body1.angVelocity) +
               vec3dot(this.v2, this.body2.velocity) + vec3dot(this.w2, this.body2.angVelocity);
    const c = jv/* - Math.max(0, -jv * this.restitution)*/ + this.bias;
    const prev = this.lambda;
    this.lambda -= this.mass * c;
    if (this.lambda < this.lower) this.lambda = this.lower;
    if (this.lambda > this.upper) this.lambda = this.upper;
    this.apply(this.lambda - prev);
  }
}
