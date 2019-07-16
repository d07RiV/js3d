import { mat2, mat2d, mat3, mat4 } from 'gl-matrix';

/**
 * Create orthonormal basis matrix from given direction
 * 
 * @param {mat3} m in/out matrix with the first row containing desired X direction
 */
mat3.makeBasis = function(m) {
  const xx = m[0], xy = m[1], xz = m[2];
  if (Math.abs(xx) > Math.abs(xy)) {
    // y <- (0,1,0)
    const s = 1.0 / Math.sqrt(xx * xx + xz * xz);
    m[6] = -xz * s;
    m[7] = 0;
    m[8] = xx * s;
    m[3] = -xy * m[8];
    m[4] = xx * m[8] - xz * m[6];
    m[5] = xy * m[6];
  } else {
    // y <- (1,0,0)
    const s = 1.0 / Math.sqrt(xy * xy + xz * xz);
    m[6] = 0;
    m[7] = xz * s;
    m[8] = -xy * s;
    m[3] = xz * m[7] - xy * m[8];
    m[4] = xx * m[8];
    m[5] = -xx * m[7];
  }
};

/**
 * Reset matrix to zero
 * 
 * @param {mat3} out matrix to reset
 * @returns {mat3} out
 */
mat3.zero = function(out) {
  out[0] = 0; out[1] = 0; out[2] = 0;
  out[3] = 0; out[4] = 0; out[5] = 0;
  out[6] = 0; out[7] = 0; out[8] = 0;
  return out;
};

/**
 * Set matrix to a diagonal with given values
 * 
 * @param {mat3} out receiving matrix
 * @param {Number} x first diagonal element
 * @param {Number} y second diagonal element
 * @param {Number} z third diagonal element
 * @returns {mat3} out
 */
mat3.diagonal = function(out, x, y, z) {
  out[0] = x; out[1] = 0; out[2] = 0;
  out[3] = 0; out[4] = y; out[5] = 0;
  out[6] = 0; out[7] = 0; out[8] = z;
  return out;
};

/**
 * Calculate w^T m w
 * 
 * @param {mat3} out receiving matrix
 * @param {mat3} m source matrix
 * @param {mat3} w transformation matrix
 * @returns {mat3} out
 */
mat3.transform = function(out, m, w) {
  const w00 = w[0], w01 = w[1], w02 = w[2],
        w10 = w[3], w11 = w[4], w12 = w[5],
        w20 = w[6], w21 = w[7], w22 = w[8];
  const m00 = m[0], m01 = m[1], m02 = m[2],
        m10 = m[3], m11 = m[4], m12 = m[5],
        m20 = m[6], m21 = m[7], m22 = m[8];
  const t00 = w00 * m00 + w10 * m10 + w20 * m20,
        t01 = w00 * m01 + w10 * m11 + w20 * m21,
        t02 = w00 * m02 + w10 * m12 + w20 * m22,

        t10 = w01 * m00 + w11 * m10 + w21 * m20,
        t11 = w01 * m01 + w11 * m11 + w21 * m21,
        t12 = w01 * m02 + w11 * m12 + w21 * m22,

        t20 = w02 * m00 + w12 * m10 + w22 * m20,
        t21 = w02 * m01 + w12 * m11 + w22 * m21,
        t22 = w02 * m02 + w12 * m12 + w22 * m22;
  out[0] = t00 * w00 + t01 * w10 + t02 * w20;
  out[1] = t00 * w01 + t01 * w11 + t02 * w21;
  out[2] = t00 * w02 + t01 * w12 + t02 * w22;

  out[3] = t10 * w00 + t11 * w10 + t12 * w20;
  out[4] = t10 * w01 + t11 * w11 + t12 * w21;
  out[5] = t10 * w02 + t11 * w12 + t12 * w22;

  out[6] = t20 * w00 + t21 * w10 + t22 * w20;
  out[7] = t20 * w01 + t21 * w11 + t22 * w21;
  out[8] = t20 * w02 + t21 * w12 + t22 * w22;
  return out;
};

/**
 * Calculate w m w^T
 * 
 * @param {mat3} out receiving matrix
 * @param {mat3} m source matrix
 * @param {mat3} w transformation matrix
 * @returns {mat3} out
 */
mat3.transformInv = function(out, m, w) {
  const w00 = w[0], w01 = w[1], w02 = w[2],
        w10 = w[3], w11 = w[4], w12 = w[5],
        w20 = w[6], w21 = w[7], w22 = w[8];
  const m00 = m[0], m01 = m[1], m02 = m[2],
        m10 = m[3], m11 = m[4], m12 = m[5],
        m20 = m[6], m21 = m[7], m22 = m[8];
  const t00 = w00 * m00 + w01 * m10 + w02 * m20,
        t01 = w00 * m01 + w01 * m11 + w02 * m21,
        t02 = w00 * m02 + w01 * m12 + w02 * m22,

        t10 = w10 * m00 + w11 * m10 + w12 * m20,
        t11 = w10 * m01 + w11 * m11 + w12 * m21,
        t12 = w10 * m02 + w11 * m12 + w12 * m22,

        t20 = w20 * m00 + w21 * m10 + w22 * m20,
        t21 = w20 * m01 + w21 * m11 + w22 * m21,
        t22 = w20 * m02 + w21 * m12 + w22 * m22;
  out[0] = t00 * w00 + t01 * w01 + t02 * w02;
  out[1] = t00 * w10 + t01 * w11 + t02 * w12;
  out[2] = t00 * w20 + t01 * w21 + t02 * w22;

  out[3] = t10 * w00 + t11 * w01 + t12 * w02;
  out[4] = t10 * w10 + t11 * w11 + t12 * w12;
  out[5] = t10 * w20 + t11 * w21 + t12 * w22;

  out[6] = t20 * w00 + t21 * w01 + t22 * w02;
  out[7] = t20 * w10 + t21 * w11 + t22 * w12;
  out[8] = t20 * w20 + t21 * w21 + t22 * w22;
  return out;
};

/**
 * Calculate a^T b
 * 
 * @param {mat3} out receiving matrix
 * @param {mat3} a first matrix
 * @param {mat3} b second matrix
 * @returns {mat3} out
 */
mat3.multiplyT = function (out, a, b) {
  const a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8],

        b00 = b[0], b01 = b[1], b02 = b[2],
        b10 = b[3], b11 = b[4], b12 = b[5],
        b20 = b[6], b21 = b[7], b22 = b[8];

  out[0] = b00 * a00 + b10 * a10 + b20 * a20;
  out[1] = b00 * a01 + b10 * a11 + b20 * a21;
  out[2] = b00 * a02 + b10 * a12 + b20 * a22;

  out[3] = b01 * a00 + b11 * a10 + b21 * a20;
  out[4] = b01 * a01 + b11 * a11 + b21 * a21;
  out[5] = b01 * a02 + b11 * a12 + b21 * a22;

  out[6] = b02 * a00 + b12 * a10 + b22 * a20;
  out[7] = b02 * a01 + b12 * a11 + b22 * a21;
  out[8] = b02 * a02 + b12 * a12 + b22 * a22;
  return out;
};

/**
 * Calculate a b^T for vectors
 * 
 * @param {mat3} out receiving matrix
 * @param {vec3} a first vector
 * @param {vec3} b second vector
 * @returns {mat3} out
 */
mat3.vectorT = function (out, a, b) {
  const a0 = a[0], a1 = a[1], a2 = a[2],
        b0 = b[0], b1 = b[1], b2 = b[2];

  out[0] = a0 * b0; out[1] = a1 * b0; out[2] = a2 * b0;
  out[3] = a0 * b1; out[4] = a1 * b1; out[5] = a2 * b1;
  out[6] = a0 * b2; out[7] = a1 * b2; out[8] = a2 * b2;
  return out;
};

/**
 * Multiply mat4 by mat3 (result is another mat3)
 * 
 * @param {mat3} out receiving matrix
 * @param {mat4} a input 4D matrix
 * @param {mat3} b input 3D matrix
 * @returns {mat3} out
 */
mat4.multiplyMat3 = function(out, a, b) {
  const a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[4], a11 = a[5], a12 = a[6],
        a20 = a[8], a21 = a[9], a22 = a[10],

        b00 = b[0], b01 = b[1], b02 = b[2],
        b10 = b[3], b11 = b[4], b12 = b[5],
        b20 = b[6], b21 = b[7], b22 = b[8];

  out[0] = b00 * a00 + b01 * a10 + b02 * a20;
  out[1] = b00 * a01 + b01 * a11 + b02 * a21;
  out[2] = b00 * a02 + b01 * a12 + b02 * a22;

  out[3] = b10 * a00 + b11 * a10 + b12 * a20;
  out[4] = b10 * a01 + b11 * a11 + b12 * a21;
  out[5] = b10 * a02 + b11 * a12 + b12 * a22;

  out[6] = b20 * a00 + b21 * a10 + b22 * a20;
  out[7] = b20 * a01 + b21 * a11 + b22 * a21;
  out[8] = b20 * a02 + b21 * a12 + b22 * a22;
  return out;
};

/**
 * Copy contents of mat3 into a 4x3 matrix.
 * @param {array} out output 4x3 matrix
 * @param {mat3} a input matrix
 */
mat3.copyTo4x3 = function(out, a) {
  out[0] = a[0]; out[1] = a[1]; out[2] = a[2];
  out[4] = a[3]; out[5] = a[4]; out[6] = a[5];
  out[8] = a[6]; out[9] = a[7]; out[10] = a[8];
};

/**
 * Obtain transform matrix from AABB, that transforms (-1,1) coordinates into box space.
 * @param {mat4} out output matrix
 * @param {AABB} a input AABB
 * @returns {mat4} out
 */
mat4.fromAABB = function(out, a) {
  const dx = (a[3] - a[0]) / 2, dy = (a[4] - a[1]) / 2, dz = (a[5] - a[2]) / 2;
  const cx = a[0] + dx, cy = a[1] + dy, cz = a[2] + dz;
  out[0] = dx; out[1] = 0; out[2] = 0; out[3] = cx;
  out[4] = 0; out[5] = dy; out[6] = 0; out[7] = cy;
  out[8] = 0; out[9] = 0; out[10] = dz; out[11] = cz;
  out[12] = 0; out[13] = 0; out[14] = 0; out[15] = 1;
  return out;
};

/**
 * Obtain a matrix with columns set to given vectors
 * @param {vec3} col1 
 * @param {vec3} col2 
 * @param {vec3} col3 
 * @param {vec3?} col4 
 * @returns {mat4} result
 */
mat4.fromColumns = function(col1, col2, col3, col4) {
  const out = new Float32Array(16);
  out.set(col1, 0);
  out.set(col2, 4);
  out.set(col3, 8);
  if (col4) {
    out.set(col4, 11);
  }
  out[15] = 1;
  return out;
};

/**
 * Obtain a matrix with rows set to given vectors
 * @param {vec3} row1 
 * @param {vec3} row2 
 * @param {vec3} row3 
 * @param {vec3?} row4 
 * @returns {mat4} result
 */
mat4.fromRows = function(row1, row2, row3, row4) {
  const out = new Float32Array(16);
  out[0] = row1[0]; out[4] = row1[1]; out[8] = row1[2];
  out[1] = row2[0]; out[5] = row2[1]; out[9] = row2[2];
  out[2] = row3[0]; out[6] = row3[1]; out[10] = row3[2];
  if (row4) {
    out[3] = row4[0]; out[7] = row4[1]; out[11] = row4[2];
  }
  out[15] = 1;
  return out;
};

export { mat2, mat2d, mat3, mat4 };
