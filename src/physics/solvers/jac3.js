import { vec3, mat3 } from 'math';

const tmp1 = new Float32Array(3), tmp2 = new Float32Array(3);
const uim1 = new Float32Array(9);

function vec3addmul(out, v, m) {
  const x = v[0], y = v[1], z = v[2];
  out[0] += x * m[0] + y * m[3] + z * m[6];
  out[1] += x * m[1] + y * m[4] + z * m[7];
  out[2] += x * m[2] + y * m[5] + z * m[8];
}
function vec3submul(out, v, m) {
  const x = v[0], y = v[1], z = v[2];
  out[0] -= x * m[0] + y * m[3] + z * m[6];
  out[1] -= x * m[1] + y * m[4] + z * m[7];
  out[2] -= x * m[2] + y * m[5] + z * m[8];
}

export default class Jac3 {
  w1 = new Float32Array(9);
  w2 = new Float32Array(9);
  w1a = new Float32Array(9);
  w2a = new Float32Array(9);
  bias = vec3.create();
  mass = new Float32Array(9);

  constructor(body1, body2) {
    this.body1 = body1;
    this.body2 = body2;
  }

  apply(t) {
    const v1 = this.body1.velocity, v2 = this.body2.velocity;
    vec3addmul(v1, t, this.body1.invMass);
    vec3addmul(this.body1.angVelocity, t, this.w1a);
    vec3submul(v2, t, this.body2.invMass);
    vec3addmul(this.body2.angVelocity, t, this.w2a);
  }

  force(out) {
    vec3.copy(out, this.lambda);
  }

  linear(pos1, pos2) {
    vec3.subtract(tmp1, pos1, this.body1.position);
    this.w1[5] = -(this.w1[7] = tmp1[0]);
    this.w1[6] = -(this.w1[2] = tmp1[1]);
    this.w1[1] = -(this.w1[3] = tmp1[2]);
    vec3.subtract(tmp1, pos2, this.body2.position);
    this.w2[7] = -(this.w2[5] = tmp1[0]);
    this.w2[2] = -(this.w2[6] = tmp1[1]);
    this.w2[3] = -(this.w2[1] = tmp1[2]);
    mat3.multiplyT(this.w1a, this.body1.invInertia, this.w1);
    mat3.multiplyT(this.w2a, this.body2.invInertia, this.w2);
    mat3.multiply(this.mass, this.w1, this.w1a);
    mat3.multiply(uim1, this.w2, this.w2a);
    mat3.add(this.mass, this.mass, uim1);
    mat3.add(this.mass, this.mass, this.body1.invMass);
    mat3.add(this.mass, this.mass, this.body2.invMass);
    mat3.invert(this.mass, this.mass);
    if (this.lambda !== undefined) {
      this.apply(this.lambda);
    } else {
      this.lambda = vec3.create();
    }
  }

  resolve() {
    vec3.subtract(tmp2, this.body1.velocity, this.body2.velocity);
    vec3addmul(tmp2, this.body1.angVelocity, this.w1);
    vec3addmul(tmp2, this.body2.angVelocity, this.w2);
    vec3.add(tmp2, tmp2, this.bias);
    vec3.transformMat3(tmp2, tmp2, this.mass);
    vec3.negate(tmp2, tmp2);
    if (this.limit) {
      var len = vec3.length(this.lambda);
      if (len > this.limit) vec3.scale(this.lambda, this.lambda, len, this.limit / len);
    }
    vec3.add(this.lambda, this.lambda, tmp2);
    this.apply(tmp2);
  }
}
