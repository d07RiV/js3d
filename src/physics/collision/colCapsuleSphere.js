import { vec3 } from 'math';
import config from '../config';
import closestSegmentSegment from './utils/closestSegmentSegment';

const tmp1 = new Float32Array(3);

export default function colCapsuleSphere(cap, sp) {
  const closest = closestSegmentSegment(cap.start, cap.end, sp.center, sp.center);
  const r = cap.radius + sp.radius;
  const diff = vec3.subtract(tmp1, closest[0], closest[1]);
  const dist = vec3.length(diff);
  if (dist > r + config.delta) {
    return;
  }
  if (dist > config.delta) {
    vec3.scale(this.normal, diff, 1 / dist);
  } else {
    vec3.set(this.normal, 0, 0, 1);
  }
  vec3.scaleAndAdd(tmp1, closest[1], this.normal, 0.5 * (sp.radius + dist - cap.radius));
  this.sync(cap, sp);
  this.add(tmp1, r - dist, 0);
}
