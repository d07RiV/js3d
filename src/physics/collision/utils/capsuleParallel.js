import { vec3 } from 'math';
import config from '../../config';

const tmp1 = new Float32Array(3), tmp2 = new Float32Array(3),
      tmp3 = new Float32Array(3), tmp4 = new Float32Array(3),
      tmp5 = new Float32Array(3), tmp6 = new Float32Array(3),
      tmp7 = new Float32Array(3), tmp8 = new Float32Array(3),
      tmp9 = new Float32Array(3);

export default function capsuleParallel(cap1, sh2, start2, end2, radius2, f0) {
  const dir = vec3.subtract(tmp1, end2, start2);
  const len = vec3.length(dir), r = cap1.radius + radius2;
  if (len < config.delta) {
    return false;
  }
  vec3.scale(dir, dir, 1 / len);
  const v1 = vec3.subtract(tmp2, cap1.start, start2), v2 = vec3.subtract(tmp3, cap1.end, start2);
  let d1 = vec3.length(vec3.cross(tmp4, dir, v1));
  let d2 = vec3.length(vec3.cross(tmp4, dir, v2));
  if (Math.abs(d1 - d2) > Math.max(0.1, 0.1 * d1)) {
    return false;
  }
  let a = v1, at = vec3.dot(v1, dir), b = v2, bt = vec3.dot(v2, dir), t;
  if (bt < at) {
    t = a; a = b; b = t;
    t = at; at = bt; bt = t;
    t = d1; d1 = d2; d2 = t;
  }
  const t0 = Math.max(at, 0), t1 = Math.min(bt, len);
  if (t1 - t0 < config.delta) {
    return false;
  }
  const s0 = (t0 - at) / (bt - at), s1 = (t1 - at) / (bt - at);
  const A = vec3.lerp(tmp6, a, b, s0);
  const B = vec3.lerp(tmp7, a, b, s1);
  const dA = d1 + (d2 - d1) * s0;
  const dB = d1 + (d2 - d1) * s1;
  if (dA < r + config.delta || dB < r + config.delta) {
    const pA = vec3.scaleAndAdd(tmp4, A, dir, -t0);
    const pB = vec3.scaleAndAdd(tmp5, B, dir, -t1);
    if (dA > dB && dA > 1e-4) {
      vec3.normalize(this.normal, pA);
    } else if (dB > 1e-4) {
      vec3.normalize(this.normal, pB);
    } else {
      vec3.set(this.normal, 0, 0, 1);
    }
    vec3.copy(tmp8, this.normal);
    this.sync(cap1, sh2);
    if (dA < r + config.delta) {
      vec3.add(tmp9, start2, A);
      vec3.scaleAndAdd(tmp9, tmp9, tmp8, -0.5 * (dA - radius2 + (radius2 ? cap1.radius : dA)));
      this.add(tmp9, r - dA, f0 + "a");
    }
    if (dB < r + config.delta) {
      vec3.add(tmp9, start2, B);
      vec3.scaleAndAdd(tmp9, tmp9, tmp8, -0.5 * (dB - radius2 + (radius2 ? cap1.radius : dB)));
      this.add(tmp9, r - dB, f0 + "b");
    }
    return true;
  }
}
