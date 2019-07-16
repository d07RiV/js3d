/**
 * Creates a new plane
 * 
 * @returns {plane} a new plane
 */
export function create() {
  const out = new Float32Array(4);
  out[0] = 1.0;
  return out;
}

/**
 * Creates a new plane initialized with values from an existing plane
 * 
 * @param {plane} a plane to clone
 * @returns {plane} a new plane
 */
export function clone(a) {
  return new Float32Array(a);
}

/**
 * Copy the values from one plane to another
 * 
 * @param {plane} out the receiving plane
 * @param {plane} a the source plane
 * @returns {plane} out
 */
export function copy(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  return out;
}

/**
 * Creates a new plane initialized with the given values (ax+by+cz+d=0)
 * Plane will not be re-normalized
 * 
 * @param {Number} a X coefficient
 * @param {Number} b Y coefficient
 * @param {Number} c Z coefficient
 * @param {Number} d W coefficient
 * @returns {plane} new plane
 */
export function fromValues(a, b, c, d) {
  const out = new Float32Array(4);
  out[0] = a;
  out[1] = b;
  out[2] = c;
  out[3] = d;
  return out;
}

/**
 * Sets plane to given values (ax+by+cz+d=0)
 * Plane will not be re-normalized
 * 
 * @param {plane} out output plane
 * @param {Number} a X coefficient
 * @param {Number} b Y coefficient
 * @param {Number} c Z coefficient
 * @param {Number} d W coefficient
 * @returns {plane} out
 */
export function set(out, a, b, c, d) {
  out[0] = a;
  out[1] = b;
  out[2] = c;
  out[3] = d;
  return out;
}

/**
 * Normalize a plane's normal
 * 
 * @param {plane} out output plane
 * @param {plane} a input plane
 * @returns {plane} out
 */
export function normalize(out, a) {
  const x = a[0], y = a[1], z = a[2];
  const f = 1.0 / Math.sqrt(x * x + y * y + z * z);
  out[0] = x * f;
  out[1] = y * f;
  out[2] = z * f;
  out[3] = a[3] * f;
  return out;
}

/**
 * Initializes a plane from given direction and distance
 * 
 * @param {plane} out output plane
 * @param {vec3} dir direction vector
 * @param {Number} dist distance along the direction
 * @returns {plane} out
 */
export function setDirDist(out, dir, dist) {
  const x = dir[0], y = dir[1], z = dir[2];
  const len = Math.sqrt(x * x + y * y + z * z);
  const inv = 1.0 / len;
  out[0] = x * inv;
  out[1] = y * inv;
  out[2] = z * inv;
  out[3] = -dist * len;
  return out;
}

/**
 * Initializes a plane from given direction and point
 * 
 * @param {plane} out output plane
 * @param {vec3} dir direction vector
 * @param {vec3} point point on plane
 * @returns {plane} out
 */
export function setDirPoint(out, dir, point) {
  const x = dir[0], y = dir[1], z = dir[2];
  const dist = x * point[0] + y * point[1] + z * point[2];
  const inv = 1.0 / Math.sqrt(x * x + y * y + z * z);
  out[0] = x * inv;
  out[1] = y * inv;
  out[2] = z * inv;
  out[3] = -dist * inv;
  return out;
}

/**
 * Calculates signed distance from plane to given point
 * 
 * @param {plane} p input plane
 * @param {vec3} v input point
 * @returns {Number} signed distance from p to v
 */
export function distanceToPoint(p, v) {
  return p[0] * v[0] + p[1] * v[1] + p[2] * v[2] + p[3];
}

/**
 * Calculate intersection between plane and ray
 * 
 * @param {vec3} out output vector
 * @param {plane} p input plane
 * @param {Ray} r input ray
 * @returns {Number} distance along ray, or `false` if no intersection
 */
export function intersectRay(out, p, r) {
  const rp = r.pos, rd = r.dir;
  const rpx = rp[0], rpy = rp[1], rpz = rp[2];
  const rdx = rd[0], rdy = rd[1], rdz = rd[2];
  const px = p[0], py = p[1], pz = p[2];
  const d0 = px * rpx + py * rpy + pz * rpz + p[3];
  const dd = px * rdx + py * rdy + pz * rdz;
  let t;
  if (dd > -1e-6 && dd < 1e-6) {
    if (d0 > -1e-6 && d0 < 1e-6) {
      t = 0;
    } else {
      return false;
    }
  } else {
    t = -d0 / dd;
    if (t < -1e-6) {
      return false;
    }
  }
  out[0] = rpx + rdx * t;
  out[1] = rpy + rdy * t;
  out[2] = rpz + rdz * t;
  return Math.max(t, 0);
}
