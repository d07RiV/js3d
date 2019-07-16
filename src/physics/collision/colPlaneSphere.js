import { vec3 } from 'math';
import config from '../config';

const tmp1 = new Float32Array(3);

export default function colPlaneSphere(pl, sp) {
  const dist = vec3.dot(pl.normal, sp.center) - pl.offset - sp.radius;
  if (dist > config.delta) {
    return;
  }
  vec3.copy(this.normal, pl.normal);
  this.sync(sp, pl);
  this.add(vec3.scaleAndAdd(tmp1, sp.center, pl.normal, -sp.radius), -dist, 0);
}
