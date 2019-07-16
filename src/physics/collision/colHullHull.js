import { vec3 } from 'math';
import config from '../config';
import clipFace from './utils/clipFace';
import closestSegmentSegment from './utils/closestSegmentSegment';
import SAT from './utils/SAT';
import boxSAT from './utils/boxSAT';

const tmp1 = new Float32Array(3), tmp2 = new Float32Array(3),
      tmp3 = new Float32Array(3), tmp4 = new Float32Array(3),
      tmp5 = new Float32Array(3), tmp6 = new Float32Array(3);

function tryFace(sh1, sh2, faceId) {
  const fromFace = sh1.faces[faceId];
  let ref, dp = 0;
  for (let i = 0; i < sh2.faces.length; ++i) {
    const face = sh2.faces[i];
    const cur = vec3.dot(face.plane, fromFace.plane);
    if (cur < dp) {
      dp = cur;
      ref = face;
    }
  }
  if (!ref) {
    return;
  }
  return clipFace(sh1, fromFace, sh2, ref, faceId * 1439);
}

export default function colHullHull(sh1, sh2) {
  if (this.cacheAxis) {
    // test separation
    const a = this.cache1.support(this.cacheAxis);
    vec3.negate(tmp1, this.cacheAxis);
    const b = this.cache2.support(tmp1);
    if (vec3.dot(vec3.subtract(tmp2, b, a), this.cacheAxis) > config.delta) {
      return;
    }
  }

  if (this.cacheFace != null) {
    const clip = tryFace(this.cache1, this.cache2, this.cacheFace);
    if (clip && clip.pos.length) {
      vec3.copy(this.cacheAxis, this.cache1.faces[this.cacheFace].plane);
      vec3.negate(this.normal, this.cacheAxis);
      this.sync(this.cache1, this.cache2);
      for (let i = 0; i < clip.pos.length; ++i) {
        this.add(clip.pos[i], clip.dist[i], clip.id[i]);
      }
      return;
    }
    delete this.cacheFace;
  }

  if (this.cacheEdge1 != null) {
    const e1 = this.cache1.edges[this.cacheEdge1], e2 = this.cache2.edges[this.cacheEdge2];
    const closest = closestSegmentSegment(e1.a, e1.b, e2.a, e2.b);
    if (closest[2] > config.delta && closest[2] < 1 - config.delta && closest[3] > config.delta && closest[3] < 1 - config.delta) {
      vec3.cross(this.cacheAxis, vec3.subtract(tmp3, e1.b, e1.a), vec3.subtract(tmp4, e2.b, e2.a));
      vec3.normalize(this.cacheAxis, this.cacheAxis);
      if (vec3.dot(vec3.subtract(tmp5, this.cache2.center, this.cache1.center), this.cacheAxis) < 0) {
        vec3.negate(this.cacheAxis, this.cacheAxis);
      }
      const dist = vec3.dot(vec3.subtract(tmp5, closest[1], closest[0]), this.cacheAxis);
      if (dist < config.delta) {
        vec3.negate(this.normal, this.cacheAxis);
        this.sync(this.cache1, this.cache2);
        this.add(vec3.lerp(tmp6, closest[0], closest[1], 0.5), -dist, `${this.cacheEdge1}+${this.cacheEdge2}`);
        return;
      }
    }
    delete this.cacheEdge1;
    delete this.cacheEdge2;
  }

  // run SAT
  let sat;
  if (sh1.type === "Box" && sh2.type === "Box") {
    sat = boxSAT(sh1, sh2);
  } else {
    sat = SAT(sh1, sh2);
  }

  // cache axis to test separation in the next frame
  if (!this.cacheAxis) {
    this.cacheAxis = new Float32Array(3);
  }
  this.cache1 = sat.shape1;
  this.cache2 = sat.shape2;
  vec3.copy(this.cacheAxis, sat.normal);

  if (sat.distance > config.delta) {
    return;
  }

  vec3.negate(this.normal, sat.normal);
  this.sync(sat.shape1, sat.shape2);
  if (sat.face != null) {
    this.cacheFace = sat.face;
    const clip = tryFace(this.cache1, this.cache2, this.cacheFace);
    if (!clip) {
      return;
    }
    for (let i = 0; i < clip.pos.length; ++i) {
      this.add(clip.pos[i], clip.dist[i], clip.id[i]);
    }
  } else {
    this.cacheEdge1 = sat.edge1;
    this.cacheEdge2 = sat.edge2;
    this.add(sat.point, -sat.distance, `${sat.edge1}+${sat.edge2}`);
  }
}
