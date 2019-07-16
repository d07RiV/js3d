import { vec3 } from 'math';
import closestSegmentSegment from './closestSegmentSegment';
import config from '../../config';

const tmp1 = vec3.create(), tmp2 = vec3.create(), tmp3 = vec3.create(),
      tmp4 = vec3.create(), tmp5 = vec3.create(), tmp6 = vec3.create();

export default function SAT(sh1, sh2) {
  const result = {};
  let best = -1e+9;
  sh1.faces.forEach(({plane}, i) => {
    vec3.negate(tmp1, plane);
    const r = sh2.support(tmp1);
    const dist = vec3.dot(plane, r) + plane[3];
    if (dist > best) {
      result.shape1 = sh1;
      result.shape2 = sh2;
      result.normal = plane;
      result.point = r;
      result.face = i;
      result.distance = best = dist;
    }
  });
  best += config.delta * 2;
  if (best > config.delta) {
    return result;
  }
  sh2.faces.forEach(({plane}, i) => {
    vec3.negate(tmp1, plane);
    const r = sh1.support(tmp1);
    const dist = vec3.dot(plane, r) + plane[3];
    if (dist > best) {
      result.shape1 = sh2;
      result.shape2 = sh1;
      result.normal = plane;
      result.point = r;
      result.face = i;
      result.distance = best = dist;
    }
  });
  best += config.delta * 2;
  if (best > config.delta) {
    return result;
  }
  for (let id1 in sh1.edges) {
    const e1 = sh1.edges[id1];
    vec3.subtract(tmp1, e1.b, e1.a);
    const ref = vec3.subtract(tmp6, e1.a, sh1.center);
    for (let id2 in sh2.edges) {
      const e2 = sh2.edges[id2];
      vec3.subtract(tmp2, e2.b, e2.a);
      const cba = vec3.dot(e2.n1, tmp1);
      const dba = vec3.dot(e2.n2, tmp1);
      const adc = -vec3.dot(e1.n1, tmp2);
      const bdc = -vec3.dot(e1.n2, tmp2);
      if (cba * dba < 0 && adc * bdc < 0 && cba * bdc > 0) {
        vec3.cross(tmp3, tmp1, tmp2);
        const len = vec3.length(tmp3)
        if (len > 0.01) {
          vec3.scale(tmp3, tmp3, 1 / len);
          if (vec3.dot(tmp3, ref) < 0) {
            vec3.negate(tmp3, tmp3);
          }
          var dist = vec3.dot(e2.a, tmp3) - vec3.dot(e1.a, tmp3);
          if (dist > best) {
            delete result.face;
            result.shape1 = sh1;
            result.shape2 = sh2;
            result.edge1 = id1;
            result.edge2 = id2;
            result.normal = vec3.copy(tmp5, tmp3);
            const nearest = closestSegmentSegment(e1.a, e1.b, e2.a, e2.b);
            result.point = vec3.lerp(tmp4, nearest[0], nearest[1], 0.5);
            result.distance = best = dist;
          }
        }
      }
    }
  }
  return result;
}
