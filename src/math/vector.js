import { vec2, vec3, vec4 } from 'gl-matrix';

/**
 * Create orthonormal basis given vector x
 * 
 * @param {vec3} x input X direction
 * @param {vec3} y output Y direction
 * @param {vec3} z output Z direction
 */
vec3.makeBasis = function(x, y, z) {
  const xx = x[0], xy = x[1], xz = x[2];
  if (Math.abs(xx) > Math.abs(xy)) {
    // y <- (0,1,0)
    const s = 1.0 / Math.sqrt(xx * xx + xz * xz);
    z[0] = -xz * s;
    z[1] = 0;
    z[2] = xx * s;
    y[0] = -xy * z[2];
    y[1] = xx * z[2] - xz * z[0];
    y[2] = xy * z[0];
  } else {
    // y <- (1,0,0)
    const s = 1.0 / Math.sqrt(xy * xy + xz * xz);
    z[0] = 0;
    z[1] = xz * s;
    z[2] = -xy * s;
    y[0] = xz * z[1] - xy * z[2];
    y[1] = xx * z[2];
    y[2] = -xx * z[1];
  }
};

/**
 * Convert quat rotation to scaled vec3
 * 
 * @param {vec3} out the receiving vector
 * @param {quat} q input quaternion
 * @returns {vec3} out
 */
vec3.fromQuat = function(out, q) {
  const x = q[0], y = q[1], z = q[2], w = q[3];
  const s = Math.sqrt(x * x + y * y + z * z);
  if (s < 1e-6) {
    out[0] = 0; out[1] = 0; out[2] = 0;
    return out;
  }
  const f = 2 * Math.atan2(s, w) / s;
  out[0] = f * x;
  out[1] = f * y;
  out[2] = f * z;
  return out;
};

/**
 * Multiply vector by the inverse of an orthonormal matrix
 * 
 * @param {vec3} out receiving vector
 * @param {vec3} a source vector
 * @param {mat3} m orthonormal matrix
 * @returns {vec3} out
 */
vec3.inverseMat3 = function(out, a, m) {
  const x = a[0], y = a[1], z = a[2];
  out[0] = m[0] * x + m[1] * y + m[2] * z;
  out[1] = m[3] * x + m[4] * y + m[5] * z;
  out[2] = m[6] * x + m[7] * y + m[8] * z;
  return out;
};

/**
 * Multiply vector by the inverse of an orthonormal 4D matrix
 * 
 * @param {vec3} out receiving vector
 * @param {vec3} a source vector
 * @param {mat4} m orthonormal matrix
 * @returns {vec3} out
 */
vec3.inverseMat4 = function(out, a, m) {
  const x = a[0] - m[12], y = a[1] - m[13], z = a[2] - m[14];
  out[0] = m[0] * x + m[1] * y + m[2] * z;
  out[1] = m[4] * x + m[5] * y + m[6] * z;
  out[2] = m[8] * x + m[9] * y + m[10] * z;
  return out;
};

/**
 * Multiply vector by a 4D rotation matrix
 * 
 * @param {vec3} out receiving vector
 * @param {vec3} a source vector
 * @param {mat4} m rotation matrix
 * @returns {vec3} out
 */
vec3.rotateMat4 = function(out, a, m) {
  const x = a[0], y = a[1], z = a[2];
  out[0] = m[0] * x + m[4] * y + m[8] * z;
  out[1] = m[1] * x + m[5] * y + m[9] * z;
  out[2] = m[2] * x + m[6] * y + m[10] * z;
  return out;
};

/**
 * Multiply vector by the inverse of an orthonormal 4D rotation matrix
 * 
 * @param {vec3} out receiving vector
 * @param {vec3} a source vector
 * @param {mat4} m orthonormal rotation matrix
 * @returns {vec3} out
 */
vec3.invRotateMat4 = function(out, a, m) {
  const x = a[0], y = a[1], z = a[2];
  out[0] = m[0] * x + m[1] * y + m[2] * z;
  out[1] = m[4] * x + m[5] * y + m[6] * z;
  out[2] = m[8] * x + m[9] * y + m[10] * z;
  return out;
};

/**
 * Caltulate the result of a^T M a
 * @param {vec3} a input vector
 * @param {mat3} m norm matrix
 * @returns {Number} result
 */
vec3.quadMat3 = function(a, m) {
  const x = a[0], y = a[1], z = a[2];
  return x * (x * m[0] + y * m[3] + z * m[6]) +
         y * (x * m[1] + y * m[4] + z * m[7]) +
         z * (x * m[2] + y * m[5] + z * m[8]);
};

/**
 * Calculate euler angles (yaw, pitch, roll) from rotation matrix
 * 
 * @param {vec3} out receiving vector
 * @param {mat3} mat rotation matrix
 * @returns {Boolean} true if successfully converted, false in degenerate case (pitch = +- pi/2)
 */
vec3.eulerFromMat3 = function(out, mat) {
  if (mat[2] < 1.0) {
    if (mat[2] > -1.0) {
      out[0] = Math.atan2(-mat[5], mat[8]);
      out[1] = Math.asin(mat[2]);
      out[2] = Math.atan2(-mat[1], mat[0]);
      return true;
    } else {
      out[0] = -Math.atan2(mat[3], mat[4]);
      out[1] = -Math.PI * 0.5;
      out[2] = 0;
    }
  } else {
    out[0] = Math.atan2(mat[3], mat[4]);
    out[1] = Math.PI * 0.5;
    out[2] = 0;
  }
};

vec3.posX = vec3.fromValues(1, 0, 0);
vec3.posY = vec3.fromValues(0, 1, 0);
vec3.posZ = vec3.fromValues(0, 0, 1);
vec3.negX = vec3.fromValues(-1, 0, 0);
vec3.negY = vec3.fromValues(0, -1, 0);
vec3.negZ = vec3.fromValues(0, 0, -1);

export { vec2, vec3, vec4 };
