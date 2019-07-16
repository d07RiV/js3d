import { vec3 } from 'math';
import config from '../config';

const tmp1 = new Float32Array(3), tmp2 = new Float32Array(3);

export default function colSphereSphere(sp1, sp2) {
  vec3.subtract(tmp1, sp1.center, sp2.center);
  const dist = vec3.length(tmp1);
  const pen = dist - sp1.radius - sp2.radius;
  if (pen > config.delta) {
    return;
  }
  if (dist < 1e-4) {
    vec3.set(this.normal, 1, 0, 0);
  } else {
    vec3.scale(this.normal, tmp1, 1 / dist);
  }
  vec3.scaleAndAdd(tmp2, sp2.center, this.normal, 0.5 * (dist + sp2.radius - sp1.radius));
  this.sync(sp1, sp2);
  this.add(tmp2, -pen, 0);
}
