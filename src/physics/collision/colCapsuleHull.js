import { vec3 } from 'math';
import config from '../config';
import GJK from './utils/GJK';
import capsuleParallel from './utils/capsuleParallel';
import closestSegmentSegment from './utils/closestSegmentSegment';

const tmp1 = new Float32Array(3), tmp2 = new Float32Array(3),
      tmp3 = new Float32Array(3), tmp4 = new Float32Array(3);

function capsuleFace(sh, face, cap) {
  let t0 = 0, t1 = 1;
  const v = sh.vertices, vi = face.vertices, n = vi.length, p = face.plane;
  for (let ei = 0; ei < n; ++ei) {
    const va = vi[ei], vb = vi[ei === n - 1 ? 0 : ei + 1];
    vec3.subtract(tmp2, v[vb], v[va]);
    const normal = vec3.cross(tmp1, p, tmp2);
    const offset = vec3.dot(normal, v[va]) - config.delta;
    const fa = vec3.dot(normal, cap.start) - offset;
    const fb = vec3.dot(normal, cap.end) - offset;
    if (fa < config.delta && fb < config.delta) {
      return;
    }
    if (fa > 0 && fb > 0) {
      continue;
    }
    const t = -fa / (fb - fa);
    if (fa < fb) {
      if (t > t0) {
        t0 = t;
      }
    } else {
      if (t < t1) {
        t1 = t;
      }
    }
    if (t0 >= t1) {
      return;
    }
  }
  vec3.lerp(tmp1, cap.start, cap.end, t0);
  vec3.lerp(tmp2, cap.start, cap.end, t1);
  const d0 = vec3.dot(p, tmp1) + p[3];
  const d1 = vec3.dot(p, tmp2) + p[3];
  if (d0 >= cap.radius + config.delta && d1 >= cap.radius + config.delta) {
    return;
  }
  vec3.copy(this.normal, p);
  this.sync(cap, sh);
  if (d0 < cap.radius + config.delta) {
    vec3.scaleAndAdd(tmp1, tmp1, p, -d0);
    this.add(tmp1, -d0 + cap.radius, 0);
  }
  if (d1 < cap.radius + config.delta) {
    vec3.scaleAndAdd(tmp2, tmp2, p, -d1);
    this.add(tmp2, -d1 + cap.radius, 1);
  }
  return true;
}

class Segment {
  dir = vec3.create();
  set(a, b) {
    this.a = a;
    this.b = b;
    vec3.subtract(this.dir, b, a);
  }
  support(d) {
    return vec3.dot(d, this.dir) > 0 ? this.b : this.a;
  }
}
const segment = new Segment();

export default function colCapsuleHull(cap, hull) {
  segment.set(cap.start, cap.end);
  const gjk = GJK(hull, segment);
  if (gjk) {
    const dir = vec3.subtract(tmp4, gjk[1], gjk[0]);
    const dist = vec3.length(dir);
    if (dist > config.delta && dist < cap.radius + config.delta) {
      vec3.scale(this.normal, dir, 1 / dist);
      for (let fi = 0; fi < hull.faces.length; ++fi) {
        if (vec3.dot(this.normal, hull.faces[fi].plane) > 0.99) {
          if (capsuleFace.call(this, hull, hull.faces[fi], cap)) {
            return;
          }
        }
      }
      for (let ei in hull.edges) {
        const e = hull.edges[ei];
        if (vec3.dot(gjk[1], e.n1) + e.n1[3] > -config.delta && vec3.dot(gjk[1], e.n2) + e.n2[3] > -config.delta) {
          if (capsuleParallel.call(this, cap, hull, e.a, e.b, 0, ei)) {
            return;
          }
        }
      }
      this.sync(cap, hull);
      this.add(gjk[0], cap.radius - dist, 0);
    }
    if (dist > config.delta) {
      return;
    }
  }

  // custom SAT
  // we know that it intersects..
  let face, edge, dist = -1e+9, enorm = tmp3;
  for (let i = 0; i < hull.faces.length; ++i) {
    const p = hull.faces[i].plane;
    const d = Math.min(vec3.dot(p, cap.start), vec3.dot(p, cap.end)) + p[3];
    if (d > dist) {
      face = hull.faces[i];
      dist = d;
    }
  }
  const cdir = segment.dir;
  for (let id in hull.edges) {
    const e = hull.edges[id];
    if (vec3.dot(cdir, e.n1) * vec3.dot(cdir, e.n2) < 0) {
      vec3.cross(tmp1, cdir, vec3.subtract(tmp2, e.b, e.a));
      const len = vec3.length(tmp1);
      if (len < 1e-4) {
        continue;
      }
      vec3.scale(tmp1, tmp1, 1 / len);
      if (vec3.dot(tmp1, vec3.subtract(tmp2, e.a, hull.center)) < 0) {
        vec3.negate(tmp1, tmp1);
      }
      const d = vec3.dot(vec3.subtract(tmp2, cap.start, e.a), tmp1);
      if (d > dist) {
        face = undefined;
        edge = id;
        dist = d;
        vec3.copy(enorm, tmp1);
      }
    }
  }
  dist -= cap.radius;
  if (dist > config.delta) {
    return; // how?
  }
  if (face) {
    capsuleFace.call(this, hull, face, cap);
  } else if (edge) {
    vec3.copy(this.normal, enorm);
    this.sync(cap, hull);
    const e = hull.edges[edge];
    const closest = closestSegmentSegment(cap.start, cap.end, e.a, e.b);
    this.add(closest[1], -dist, edge);
  }
}
