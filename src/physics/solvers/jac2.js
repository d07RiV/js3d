import { vec3, mat2 } from 'math';
const vec3dot = vec3.dot;
const tmp1 = new Float32Array(3);

export default class Jac2 {
  v11 = new Float32Array(3);
  w11 = new Float32Array(3);
  v21 = new Float32Array(3);
  w21 = new Float32Array(3);
  v11a = new Float32Array(3);
  w11a = new Float32Array(3);
  v21a = new Float32Array(3);
  w21a = new Float32Array(3);
  v12 = new Float32Array(3);
  w12 = new Float32Array(3);
  v22 = new Float32Array(3);
  w22 = new Float32Array(3);
  v12a = new Float32Array(3);
  w12a = new Float32Array(3);
  v22a = new Float32Array(3);
  w22a = new Float32Array(3);
  mass = new Float32Array(4);

  constructor(body1, body2) {
    this.body1 = body1;
    this.body2 = body2;
  }

  apply(t1, t2) {
    const v1 = this.body1.velocity, w1 = this.body1.angVelocity,
          v2 = this.body2.velocity, w2 = this.body2.angVelocity;
    const v11a = this.v11a, w11a = this.w11a, v21a = this.v21a, w21a = this.w21a,
          v12a = this.v12a, w12a = this.w12a, v22a = this.v22a, w22a = this.w22a;
    v1[0] += v11a[0] * t1 + v12a[0] * t2; v1[1] += v11a[1] * t1 + v12a[1] * t2; v1[2] += v11a[2] * t1 + v12a[2] * t2;
    w1[0] += w11a[0] * t1 + w12a[0] * t2; w1[1] += w11a[1] * t1 + w12a[1] * t2; w1[2] += w11a[2] * t1 + w12a[2] * t2;
    v2[0] += v21a[0] * t1 + v22a[0] * t2; v2[1] += v21a[1] * t1 + v22a[1] * t2; v2[2] += v21a[2] * t1 + v22a[2] * t2;
    w2[0] += w21a[0] * t1 + w22a[0] * t2; w2[1] += w21a[1] * t1 + w22a[1] * t2; w2[2] += w21a[2] * t1 + w22a[2] * t2;
  }

  force(out) {
    vec3.scale(out, this.v11a, this.lambda1 * this.body1.mass);
    vec3.scaleAndAdd(out, out, this.v12a, this.lambda2 * this.body1.mass);
  }

  linear(pos1, pos2, axis1, axis2) {
    vec3.copy(this.v11, axis1);
    vec3.copy(this.v12, axis2);
    vec3.subtract(tmp1, pos1, this.body1.position);
    vec3.cross(this.w11, tmp1, axis1);
    vec3.cross(this.w12, tmp1, axis2);
    vec3.negate(this.v21, axis1);
    vec3.negate(this.v22, axis2);
    vec3.subtract(tmp1, pos2, this.body2.position);
    vec3.cross(this.w21, axis1, tmp1);
    vec3.cross(this.w22, axis2, tmp1);
    vec3.transformMat3(this.v11a, this.v11, this.body1.invMass);
    vec3.transformMat3(this.v12a, this.v12, this.body1.invMass);
    vec3.transformMat3(this.w11a, this.w11, this.body1.invInertia);
    vec3.transformMat3(this.w12a, this.w12, this.body1.invInertia);
    vec3.transformMat3(this.v21a, this.v21, this.body2.invMass);
    vec3.transformMat3(this.v22a, this.v22, this.body2.invMass);
    vec3.transformMat3(this.w21a, this.w21, this.body2.invInertia);
    vec3.transformMat3(this.w22a, this.w22, this.body2.invInertia);
    this.mass[0] = vec3dot(this.v11a, this.v11) + vec3dot(this.w11a, this.w11) +
                   vec3dot(this.v21a, this.v21) + vec3dot(this.w21a, this.w21);
    this.mass[1] = vec3dot(this.v11a, this.v12) + vec3dot(this.w11a, this.w12) +
                   vec3dot(this.v21a, this.v22) + vec3dot(this.w21a, this.w22);
    this.mass[2] = vec3dot(this.v12a, this.v11) + vec3dot(this.w12a, this.w11) +
                   vec3dot(this.v22a, this.v21) + vec3dot(this.w22a, this.w21);
    this.mass[3] = vec3dot(this.v12a, this.v12) + vec3dot(this.w12a, this.w12) +
                   vec3dot(this.v22a, this.v22) + vec3dot(this.w22a, this.w22);
    mat2.invert(this.mass, this.mass);
    if (this.lambda1 !== undefined) {
       this.apply(this.lambda1, this.lambda2);
    } else {
      this.lambda1 = 0;
      this.lambda2 = 0;
    }
  }

  resolve(limit) {
    const c1 = vec3dot(this.v11, this.body1.velocity) + vec3dot(this.w11, this.body1.angVelocity) +
               vec3dot(this.v21, this.body2.velocity) + vec3dot(this.w21, this.body2.angVelocity);
    const c2 = vec3dot(this.v12, this.body1.velocity) + vec3dot(this.w12, this.body1.angVelocity) +
               vec3dot(this.v22, this.body2.velocity) + vec3dot(this.w22, this.body2.angVelocity);
    const prev1 = this.lambda1, prev2 = this.lambda2;
    this.lambda1 -= this.mass[0] * c1 + this.mass[1] * c2;
    this.lambda2 -= this.mass[2] * c1 + this.mass[3] * c2;
    let len = Math.sqrt(this.lambda1 * this.lambda1 + this.lambda2 * this.lambda2);
    if (len > 1e-4 && len > limit) {
      len = limit / len;
      this.lambda1 *= len;
      this.lambda2 *= len;
    }
    this.apply(this.lambda1 - prev1, this.lambda2 - prev2);
  }
}
