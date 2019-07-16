import { vec3 } from 'math';
import config from '../../config';

const tmp1 = new Float32Array(3), tmp2 = new Float32Array(3);

let pos1 = [], pos2 = [], id1 = [], id2 = [], tmp;
const result = {pos: [], id: [], dist: []}, d1 = [], cpos = [];
const randDir = vec3.fromValues(1, 2, 3);

export default function clipFace(sh1, face1, sh2, face2, id) {
  const vi1 = face1.vertices, n = vi1.length, vi2 = face2.vertices, m = vi2.length, v1 = sh1.vertices, v2 = sh2.vertices, p = face1.plane;
  while (pos1.length < n + m) {
    pos1.push(vec3.create());
    pos2.push(vec3.create());
  }
  let num1 = m, num2;
  for (let i = 0; i < m; ++i) {
    vec3.copy(pos1[i], v2[vi2[i]]);
    id1[i] = id + i;
  }
  for (let ei = 0; ei < n && num1; ++ei) {
    const va = vi1[ei], vb = vi1[ei === n - 1 ? 0 : ei + 1];
    const eid = (va + 2351 * vb) * 3221;
    vec3.subtract(tmp2, v1[vb], v1[va]);
    const normal = vec3.cross(tmp1, p, tmp2);
    const offset = vec3.dot(normal, v1[va]) - config.delta;
    let pi = num1 - 1;
    let pd = vec3.dot(pos1[pi], normal) - offset;
    num2 = 0;
    for (let j = 0; j < num1; ++j) {
      const cd = vec3.dot(pos1[j], normal) - offset;
      if (pd * cd < 0) {
        if (Math.abs(pd - cd) > 1e-4) {
          vec3.lerp(pos2[num2], pos1[pi], pos1[j], pd / (pd - cd));
        } else {
          vec3.copy(pos2[num2], pos1[pi]);
        }
        id2[num2++] = (id1[pi] + id1[j] * 1877 + eid) & 0xffffffff;
      }
      if (cd >= 0) {
        vec3.copy(pos2[num2], pos1[j]);
        id2[num2++] = id1[j];
      }
      pi = j;
      pd = cd;
    }
    tmp = pos1;
    pos1 = pos2;
    pos2 = tmp;
    tmp = id1;
    id1 = id2;
    id2 = tmp;
    num1 = num2;
  }
  num2 = 0;
  for (let i = 0; i < num1; ++i) {
    const dist = vec3.dot(pos1[i], p) + p[3];
    if (dist < config.delta) {
      vec3.scaleAndAdd(pos2[num2], pos1[i], p, -dist);
      d1[num2] = -dist;
      id2[num2++] = id1[i];
    }
  }
  tmp = pos1;
  pos1 = pos2;
  pos2 = tmp;
  tmp = id1;
  id1 = id2;
  id2 = tmp;
  num1 = num2;
  const rp = result.pos, ri = result.id, rd = result.dist;
  rp.length = 0; ri.length = 0; rd.length = 0;
  if (num1 > 4) {
    let best = 0, dp = vec3.dot(pos1[0], randDir);
    cpos[0] = pos1[0];
    for (let i = 1; i < num1; ++i) {
      const cur = vec3.dot(pos1[i], randDir);
      if (cur > dp) {
        best = i;
        dp = cur;
      }
      cpos[i] = pos1[i];
    }
    rp.push(pos1[best]);
    ri.push(id1[best]);
    rd.push(d1[best]);
    cpos[best] = cpos[--num1];
    id1[best] = id1[num1];
    d1[best] = d1[num1];
    best = 0;
    dp = vec3.squaredDistance(cpos[0], rp[0]);
    for (let i = 1; i < num1; ++i) {
      const cur = vec3.squaredDistance(cpos[i], rp[0]);
      if (cur > dp) {
        best = i;
        dp = cur;
      }
    }
    rp.push(cpos[best]);
    ri.push(id1[best]);
    rd.push(d1[best]);
    cpos[best] = cpos[--num1];
    id1[best] = id1[num1];
    d1[best] = d1[num1];
    vec3.cross(tmp1, p, vec3.subtract(tmp2, rp[1], rp[0]));
    best = 0;
    dp = vec3.dot(tmp1, cpos[0]);
    let best2 = best, dp2 = dp;
    for (let i = 1; i < num1; ++i) {
      const cur = vec3.dot(tmp1, cpos[i]);
      if (cur > dp) {
        best = i;
        dp = cur;
      }
      if (cur < dp2) {
        best2 = i;
        dp2 = cur;
      }
    }
    rp.push(cpos[best]);
    ri.push(id1[best]);
    rd.push(d1[best]);
    if (best2 !== best) {
      rp.push(cpos[best2]);
      ri.push(id1[best2]);
      rd.push(d1[best2]);
    }
  } else {
    for (let i = 0; i < num1; ++i) {
      rp.push(pos1[i]);
      ri.push(id1[i]);
      rd.push(d1[i]);
    }
  }
  return result;
}

