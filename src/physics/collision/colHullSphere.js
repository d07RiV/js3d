import { vec3 } from 'math';
import config from '../config';
import GJK from './utils/GJK';

const tmp1 = new Float32Array(3);

export default function colHullphere(hull, sp) {
  sp.support = function() { return this.center; };
  const gjk = GJK(hull, sp);
  if (gjk) {
    const dist = vec3.squaredDistance(gjk[0], gjk[1]);
    if (dist > config.delta && dist < sp.radius * sp.radius + config.delta) {
      vec3.subtract(this.normal, gjk[0], gjk[1]);
      vec3.normalize(this.normal, this.normal);
      this.sync(hull, sp);
      this.add(gjk[0], sp.radius - Math.sqrt(dist), 0);
    }
    if (dist > config.delta) {
      return;
    }
  }
  let best = 0, p = hull.faces[0].plane, dist = vec3.dot(p, sp.center) + p[3];
  for (let i = 1; i < hull.faces.length; ++i) {
    p = hull.faces[i].plane;
    const cur = vec3.dot(p, sp.center) + p[3];
    if (cur > dist) {
      best = i;
      dist = cur;
    }
  }
  vec3.copy(this.normal, hull.faces[best].plane);
  this.sync(sp, hull);
  this.add(vec3.scaleAndAdd(tmp1, sp.center, hull.faces[best].plane, -dist), -dist, 1234 + best);
}
