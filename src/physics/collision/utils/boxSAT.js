import { vec3 } from 'math';
import config from '../../config';
import closestSegmentSegment from './closestSegmentSegment';

const tmp1 = new Float32Array(3), tmp2 = new Float32Array(3),
      tmp3 = new Float32Array(3);

// special optimized SAT for boxes
export default function boxSAT(sh1, sh2) {
  const result = {};
  let best = -1e+9;
  const dir = vec3.subtract(tmp1, sh2.center, sh1.center);
  for (let i = 0; i < 3; ++i) {
    const axis = sh1.axes[i];
    const cd = vec3.dot(dir, axis);
    const dist = Math.abs(cd) - sh1.extentsAlong(axis) - sh2.extentsAlong(axis);
    if (dist > best) {
      result.shape1 = sh1;
      result.shape2 = sh2;
      result.normal = axis;
      let face = i * 2 + 1;
      if (cd < 0) {
        result.normal = vec3.negate(tmp2, axis);
        face -= 1;
      }
      vec3.negate(tmp3, result.normal);
      result.point = sh2.support(tmp3);
      result.face = face;
      result.distance = best = dist;
    }
  }
  best += config.delta * 2;
  if (best > config.delta) {
    return result;
  }
  for (let i = 0; i < 3; ++i) {
    const axis = sh2.axes[i];
    const cd = -vec3.dot(dir, axis);
    const dist = Math.abs(cd) - sh1.extentsAlong(axis) - sh2.extentsAlong(axis);
    if (dist > best) {
      result.shape1 = sh2;
      result.shape2 = sh1;
      result.normal = axis;
      let face = i * 2 + 1;
      if (cd < 0) {
        result.normal = vec3.negate(tmp2, axis);
        face -= 1;
      }
      vec3.negate(tmp3, result.normal);
      result.point = sh1.support(tmp3);
      result.face = face;
      result.distance = best = dist;
    }
  }
  best += config.delta * 2;
  if (best > config.delta) {
    return result;
  }
  for (let ax1 = 0; ax1 < 3; ++ax1) {
    const e1 = sh1.axes[ax1];
    for (let ax2 = 0; ax2 < 3; ++ax2) {
      const e2 = sh2.axes[ax2];

      const axis = vec3.cross(tmp3, e1, e2);
      if (vec3.squaredLength(axis) < config.delta) {
        continue;
      }
      vec3.normalize(axis, axis);
      const cd = vec3.dot(dir, axis);
      if (cd < 0) {
        vec3.negate(axis, axis);
      }
      const dist = Math.abs(cd) - sh1.extentsAlong(axis) - sh2.extentsAlong(axis);
      if (dist > best) {
        let v1 = 0, v2 = 0;
        for (let i = 0; i < 3; ++i) {
          if (i != ax1 && vec3.dot(sh1.axes[i], axis) > 0) v1 += (1 << i);
          if (i != ax2 && vec3.dot(sh2.axes[i], axis) < 0) v2 += (1 << i);
        }
        const closest = closestSegmentSegment(
          sh1.vertices[v1], sh1.vertices[v1 + (1 << ax1)],
          sh2.vertices[v2], sh2.vertices[v2 + (1 << ax2)]
        );

        delete result.face;
        result.shape1 = sh1;
        result.shape2 = sh2;
        result.edge1 = `${v1}_${v1 + (1 << ax1)}`;
        result.edge2 = `${v2}_${v2 + (1 << ax2)}`;
        result.normal = vec3.copy(tmp2, axis);
        result.point = vec3.lerp(tmp3, closest[0], closest[1], 0.5);
        result.distance = best = dist;
      }
    }
  }
  return result;
}
