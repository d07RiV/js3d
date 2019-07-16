/**
 * Create a new AABB
 * 
 * @returns {AABB} a new AABB
 */
export function create() {
  return new Float32Array(6);
}

/**
 * Copy the values from one AABB to another
 * 
 * @param {AABB} out receiving AABB
 * @param {AABB} a source AABB
 * @returns {AABB} out
 */
export function copy(out, a) {
  out[0] = a[0]; out[1] = a[1]; out[2] = a[2];
  out[3] = a[3]; out[4] = a[4]; out[5] = a[5];
  return out;
}

/**
 * Creates a new AABB with values from an existing box
 * 
 * @param {AABB} a source AABB
 * @returns {AABB} new AABB
 */
export function clone(a) {
  return new Float32Array(a);
}

/**
 * Sets the coordinates of AABB to given values
 * 
 * @param {AABB} out receiving AABB
 * @param {Number} x0 minimum X
 * @param {Number} y0 minimum Y
 * @param {Number} z0 minimum Z
 * @param {Number} x1 maximum X
 * @param {Number} y1 maximum Y
 * @param {Number} z1 maximum Z
 * @returns {AABB} out
 */
export function set(out, x0, y0, z0, x1, y1, z1) {
  out[0] = x0; out[1] = y0; out[2] = z0;
  out[3] = x1; out[4] = y1; out[5] = z1;
  return out;
}

/**
 * Sets the minimum and maximum coordinates of AABB to the same vector
 * 
 * @param {AABB} out receiving AABB
 * @param {vec3} v source vector
 * @returns {AABB} out
 */
export function setVec3(out, v) {
  out[0] = out[3] = v[0];
  out[1] = out[4] = v[1];
  out[2] = out[5] = v[2];
  return out;
}

/**
 * Creates a new AABB from given values
 * 
 * @param {Number} x0 minimum X
 * @param {Number} y0 minimum Y
 * @param {Number} z0 minimum Z
 * @param {Number} x1 maximum X
 * @param {Number} y1 maximum Y
 * @param {Number} z1 maximum Z
 * @returns {AABB} a new AABB initialized with given values
 */
export function fromValues(x0, y0, z0, x1, y1, z1) {
  const out = new Float32Array(6);
  out[0] = x0; out[1] = y0; out[2] = z0;
  out[3] = x1; out[4] = y1; out[5] = z1;
  return out;
}

/**
 * Calculate the minimal AABB containing two given boxes
 * 
 * @param {AABB} out receiving box
 * @param {AABB} a first box
 * @param {AABB} b second box
 * @returns {AABB} out
 */
export function combine(out, a, b) {
  out[0] = Math.min(a[0], b[0]);
  out[1] = Math.min(a[1], b[1]);
  out[2] = Math.min(a[2], b[2]);
  out[3] = Math.max(a[3], b[3]);
  out[4] = Math.max(a[4], b[4]);
  out[5] = Math.max(a[5], b[5]);
  return out;
}

/**
 * Calculate the intersection of two given boxes
 * 
 * @param {AABB} out receiving box
 * @param {AABB} a first box
 * @param {AABB} b second box
 * @returns {AABB} out
 */
export function intersect(out, a, b) {
  out[0] = Math.max(a[0], b[0]);
  out[1] = Math.max(a[1], b[1]);
  out[2] = Math.max(a[2], b[2]);
  out[3] = Math.min(a[3], b[3]);
  out[4] = Math.min(a[4], b[4]);
  out[5] = Math.min(a[5], b[5]);
  return out;
}

/**
 * Check whether the box is empty
 * 
 * @param {AABB} a input box
 * @returns {Boolean} true if box is empty
 */
export function empty(a) {
  return (a[0] >= a[3]) || (a[1] >= a[4]) || (a[2] >= a[5]);
}

/**
 * Check if box contains a given point
 * 
 * @param {AABB} a input box
 * @param {vec3} p input vector
 * @returns {Boolean} true if box contains given point
 */
export function containsVec3(a, p) {
  return p[0] >= a[0] && p[0] < a[3] && p[1] >= a[1] && p[1] < a[4] && p[2] >= a[2] && p[2] < a[5];
}

/**
 * Check if box fully contains another box
 * 
 * @param {AABB} a input box
 * @param {AABB} b another box
 * @returns {Boolean} true if a fully contains b
 */
export function contains(a, b) {
  return b[0] >= a[0] && b[1] >= a[1] && b[2] >= a[2] && b[3] <= a[3] && b[4] <= a[4] && b[5] <= a[5];
}

/**
 * Check if two boxes intersect
 * 
 * @param {AABB} a first box
 * @param {AABB} b second box
 * @returns {Boolean} true if two boxes intersect
 */
export function intersects(a, b) {
  return b[3] > a[0] && b[0] < a[3] && b[4] > a[1] && b[1] < a[4] && b[5] > a[2] && b[2] < a[5];
}

/**
 * Calculate the minimal AABB containing a given box and a point
 * 
 * @param {AABB} out receiving box
 * @param {AABB} a input box
 * @param {AABB} p input point
 * @returns {AABB} out
 */
export function combineVec3(out, a, p) {
  out[0] = Math.min(a[0], p[0]);
  out[1] = Math.min(a[1], p[1]);
  out[2] = Math.min(a[2], p[2]);
  out[3] = Math.max(a[3], p[0]);
  out[4] = Math.max(a[4], p[1]);
  out[5] = Math.max(a[5], p[2]);
  return out;
}

/**
 * Expand AABB by a given amount
 * 
 * @param {AABB} out receiving box
 * @param {AABB} a source box
 * @param {Number} s expand amount
 * @returns {AABB} out
 */
export function grow(out, a, s) {
  out[0] = a[0] - s;
  out[1] = a[1] - s;
  out[2] = a[2] - s;
  out[3] = a[3] + s;
  out[4] = a[4] + s;
  out[5] = a[5] + s;
  return out;
}

/**
 * Calculate surface area of AABB
 * @param {AABB} a input box
 * @returns {Number} surface area
 */
export function area(a) {
  const x = a[3] - a[0], y = a[4] - a[1], z = a[5] - a[2];
  return 2 * (x * (y + z) + y * z);
}

/**
 * Calculate the projection of box onto given direction vector
 * 
 * @param {vec2} out output array that will receive min and max values
 * @param {AABB} a input box
 * @param {vec3} d input diection
 * @returns {vec2} out
 */
export function extents(out, a, d) {
  const x = d[0], y = d[1], z = d[2];
  if (x > 0) {
    out[0] = a[0] * x;
    out[1] = a[3] * x;
  } else {
    out[0] = a[3] * x;
    out[1] = a[0] * x;
  }
  if (y > 0) {
    out[0] += a[0] * y;
    out[1] += a[3] * y;
  } else {
    out[0] += a[3] * y;
    out[1] += a[0] * y;
  }
  if (z > 0) {
    out[0] += a[0] * z;
    out[1] += a[3] * z;
  } else {
    out[0] += a[3] * z;
    out[1] += a[0] * z;
  }
  return out;
}

/**
 * Reconstructs box from transform matrix (applied to vector of -1..1)
 * 
 * @param {AABB} out output box
 * @param {mat4} m input matrix
 * @returns {AABB} out
 */
export function fromMat4(out, m) {
  const x0 = m[12], y0 = m[13], z0 = m[14];
  const dx = Math.abs(m[0]) + Math.abs(m[4]) + Math.abs(m[8]);
  const dy = Math.abs(m[1]) + Math.abs(m[5]) + Math.abs(m[9]);
  const dz = Math.abs(m[2]) + Math.abs(m[6]) + Math.abs(m[10]);
  out[0] = x0 - dx;
  out[1] = y0 - dy;
  out[2] = z0 - dz;
  out[3] = x0 + dx;
  out[4] = y0 + dy;
  out[5] = z0 + dz;
  return out;
}
