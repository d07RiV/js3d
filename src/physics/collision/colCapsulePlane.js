import { vec3 } from 'math';
import config from '../config';

const tmp1 = new Float32Array(3);

export default function colCapsuleSphere(cap, pl) {
  let dist = vec3.dot(pl.normal, cap.start) - pl.offset - cap.radius;
  if (dist < config.delta) {
    vec3.copy(this.normal, pl.normal);
    this.sync(cap, pl);
    this.add(vec3.scaleAndAdd(tmp1, cap.start, pl.normal, -cap.radius), -dist, 0);
  }
  dist = vec3.dot(pl.normal, cap.end) - pl.offset - cap.radius;
  if (dist < config.delta) {
    vec3.copy(this.normal, pl.normal);
    this.sync(cap, pl);
    this.add(vec3.scaleAndAdd(tmp1, cap.end, pl.normal, -cap.radius), -dist, 1);
  }
}
