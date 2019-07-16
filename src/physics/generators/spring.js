import { vec3 } from 'math';

const tmp1 = vec3.create(), tmp2 = vec3.create(), tmp3 = vec3.create();

export class String {
  constructor(body1, body2, pos1, pos2, restLength, stiffness) {
    this.body1 = body1;
    this.body2 = body2;
    this.pos1 = vec3.clone(pos1);
    this.pos2 = vec3.clone(pos2);
    this.restLength = restLength;
    this.stiffness = stiffness;
  }

  resolve() {
    const pos1 = this.body1.localToWorld(tmp1, this.pos1);
    const pos2 = this.body2.localToWorld(tmp2, this.pos2);
    const rel = vec3.subtract(tmp3, tmp1, tmp2);
    const length = vec3.length(rel);
    const coeff = this.stiffness * (this.restLength - length);
    if (length > 1e-4) {
      vec3.scale(rel, rel, coeff / length);
    } else {
      vec3.set(rel, 0, 0, coeff);
    }
    this.body1.addForceAt(rel, pos1);
    vec3.negate(rel, rel);
    this.body2.addForceAt(rel, pos2);
  }
}
