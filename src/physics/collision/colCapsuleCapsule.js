import { vec3 } from 'math';
import config from '../config';
import closestSegmentSegment from './utils/closestSegmentSegment';
import capsuleParallel from './utils/capsuleParallel';

const tmp1 = new Float32Array(3), tmp2 = new Float32Array(3);

export default function colCapsuleCapsule(cap1, cap2) {
  if (capsuleParallel.call(this, cap1, cap2, cap2.start, cap2.end, cap2.radius, "")) {
    return;
  }
  const closest = closestSegmentSegment(cap1.start, cap1.end, cap2.start, cap2.end);
  const r = cap1.radius + cap2.radius;
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
  vec3.scaleAndAdd(tmp2, closest[1], this.normal, 0.5 * (cap2.radius + dist - cap1.radius));
  this.sync(cap1, cap2);
  this.add(tmp2, r - dist, 0);
}
