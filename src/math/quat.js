import { quat, quat2 } from 'gl-matrix';

/**
 * Adjust quaternion by rotation vector
 * 
 * @param {quat} out the receiving quaternion
 * @param {quat} q initial quaternion
 * @param {vec3} v rotation vector
 * @param {Number} t scaling factor
 * @returns {quat} out
 */
quat.adjustVec3 = function(out, q, v, t=1.0) {
  const qx = q[0], qy = q[1], qz = q[2], qw = q[3], vx = v[0] * t * 0.5, vy = v[1] * t * 0.5, vz = v[2] * t * 0.5;
  out[0] = qx + qw * vx + qz * vy - qy * vz;
  out[1] = qy + qx * vz + qw * vy - qz * vx;
  out[2] = qz + qy * vx - qx * vy + qw * vz;
  out[3] = qw - qx * vx - qy * vy - qz * vz;
  quat.normalize(out, out);
  return out;
};

export { quat, quat2 };
