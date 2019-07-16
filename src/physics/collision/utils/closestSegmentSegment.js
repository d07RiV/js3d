// ~3 times faster than GJK
// https://www.geometrictools.com/GTEngine/Include/Mathematics/GteDistSegmentSegment.h

import { vec3 } from 'math';

const P1mP0 = vec3.create(), Q1mQ0 = vec3.create(), P0mQ0 = vec3.create(),
      result = [vec3.create(), vec3.create()];

function getClampedRoot(slope, h0, h1) {
  if (h0 > -1e-6) return 0;
  if (h1 < 1e-6) return 1;
  var r = -h0 / slope;
  if (r > 1) r = 0.5;
  return r;
}

/**
 * Find a pair of closest points on two segments. Return value must be used immediately,
 * before another call to closestSegmentSegment.
 * 
 * @param {*} p0 first point of first segment
 * @param {*} p1 second point of first segment
 * @param {*} q0 first point of second segment
 * @param {*} q1 second point of second segment
 * @returns {Array} array with four elements: first point, second point, first parameter (0-1), second parameter
 */
export default function closestSegmentSegment(p0, p1, q0, q1) {
  var a, b, c, d, e, f00, f10, f01, f11, g00, g10, g01, g11, t0, t1,
    s0, s1, c0, c1, edge0, edge1, e00, e01, e10, e11, delta, h0, h1, z, omz;
  vec3.subtract(P1mP0, p1, p0);
  vec3.subtract(Q1mQ0, q1, q0);
  vec3.subtract(P0mQ0, p0, q0);
  a = vec3.dot(P1mP0, P1mP0);
  b = vec3.dot(P1mP0, Q1mQ0);
  c = vec3.dot(Q1mQ0, Q1mQ0);
  d = vec3.dot(P1mP0, P0mQ0);
  e = vec3.dot(Q1mQ0, P0mQ0);
  f00 = d; f10 = f00 + a; f01 = f00 - b; f11 = f10 - b;
  g00 = -e; g10 = g00 - b; g01 = g00 + c; g11 = g10 + c;

  if (a > 1e-6 && c > 1e-6) {
    s0 = getClampedRoot(a, f00, f10);
    s1 = getClampedRoot(a, f01, f11);
    c0 = (s0 < 1e-6 ? -1 : (s0 > 1-1e-6 ? 1 : 0));
    c1 = (s1 < 1e-6 ? -1 : (s1 > 1-1e-6 ? 1 : 0));
    if (c0 == -1 && c1 == -1) {
      t0 = 0; t1 = getClampedRoot(c, g00, g01);
    } else if (c0 == 1 && c1 == 1) {
      t0 = 1; t1 = getClampedRoot(c, g10, g11);
    } else {
      if (c0 < 0) {
        edge0 = 0; e00 = 0; e01 = f00 / b;
        if (e01 < 0 || e01 > 1) e01 = 0.5;
      } else if (c0 == 0) {
        edge0 = 2; e00 = s0; e01 = 0;
      } else {
        edge0 = 1; e00 = 1; e01 = f10 / b;
        if (e01 < 0 || e01 > 1) e01 = 0.5;
      }
      if (c1 < 0) {
        edge1 = 0; e10 = 0; e11 = f00 / b;
        if (e11 < 0 || e11 > 1) e11 = 0.5;
      } else if (c1 == 0) {
        edge1 = 3; e10 = s1; e11 = 1;
      } else {
        edge1 = 1; e10 = 1; e11 = f10 / b;
        if (e11 < 0 || e11 > 1) e11 = 0.5;
      }
      delta = e11 - e01;
      h0 = delta * (c * e01 - b * e00 - e);
      if (h0 > -1e-6) {
        if (edge0 == 0) {
          t0 = 0; t1 = getClampedRoot(c, g00, g01);
        } else if (edge0 == 1) {
          t0 = 1; t1 = getClampedRoot(c, g10, g11);
        } else {
          t0 = e00; t1 = e01;
        }
      } else {
        h1 = delta * (c * e11 - b * e10 - e);
        if (h1 < 1e-6) {
          if (edge1 == 0) {
            t0 = 0; t1 = getClampedRoot(c, g00, g01);
          } else if (edge1 == 1) {
            t0 = 1; t1 = getClampedRoot(c, g10, g11);
          } else {
            t0 = e10; t1 = e11;
          }
        } else {
          z = Math.min(Math.max(h0 / (h0 - h1), 0), 1); omz = 1 - z;
          t0 = omz * e00 + z * e10;
          t1 = omz * e01 + z * e11;
        }
      }
    }
  } else {
    if (a > 1e-6) {
      t0 = getClampedRoot(a, f00, f10); t1 = 0;
    } else if (c > 1e-6) {
      t0 = 0; t1 = getClampedRoot(c, g00, g01);
    } else {
      t0 = 0; t1 = 0;
    }
  }
  vec3.lerp(result[0], p0, p1, t0);
  vec3.lerp(result[1], q0, q1, t1);
  result[2] = t0;
  result[3] = t1;
  return result;
}
