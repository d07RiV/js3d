import { vec3 } from 'math';
import config from '../config';

export default function colHullPlane(hull, pl) {
  vec3.copy(this.normal, pl.normal);
  this.sync(hull, pl);
  hull.vertices.forEach((v, i) => {
    const dist = vec3.dot(pl.normal, v) - pl.offset;
    if (dist < config.delta) {
      this.add(v, -dist, i);
    }
  });
}
