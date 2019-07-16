import { vec3 } from 'math';
import config from '../config';

const tmp1 = new Float32Array(3), tmp2 = new Float32Array(3),
      tmp3 = new Float32Array(3);

export default function colBoxSphere(box, sp) {
  vec3.subtract(tmp1, sp.center, box.center);
  const local = vec3.inverseMat3(tmp2, tmp1, box.orient);
  const s0 = Math.abs(local[0]), s1 = Math.abs(local[1]), s2 = Math.abs(local[2]);
  if (s0 < box.halfSize[0] + config.delta &&
      s1 < box.halfSize[1] + config.delta &&
      s2 < box.halfSize[2] + config.delta) {
    // center is inside the box, use box face normal
    let axis;
    if (s0 > s1 && s0 > s2) {
      axis = 0;
    } else if (s1 > s2) {
      axis = 1;
    } else {
      axis = 2;
    }
    let feature = axis;
    vec3.copy(this.normal, box.axes[axis]);
    if (local[axis] < 0) {
      vec3.negate(this.normal, this.normal);
      feature += 3;
    }
    this.sync(sp, box);
    vec3.scaleAndAdd(tmp3, sp.center, this.normal, 1 - Math.abs(local[axis]));
    this.add(tmp3, 1 - Math.abs(local[axis]) + sp.radius, feature);
  } else {
    // center is outside, use sphere normal
    let feature = 0;
    if (local[0] < -box.halfSize[0]) {
      local[0] = -box.halfSize[0];
      feature += 1;
    }
    if (local[0] > box.halfSize[0]) {
      local[0] = box.halfSize[0];
      feature += 2;
    }
    if (local[1] < -box.halfSize[1]) {
      local[1] = -box.halfSize[1];
      feature += 4;
    }
    if (local[1] > box.halfSize[1]) {
      local[1] = box.halfSize[1];
      feature += 8;
    }
    if (local[2] < -box.halfSize[2]) {
      local[2] = -box.halfSize[2];
      feature += 16;
    }
    if (local[2] > box.halfSize[2]) {
      local[2] = box.halfSize[2];
      feature += 32;
    }
    const onBox = vec3.transformMat3(tmp3, local, box.orient);
    vec3.add(onBox, onBox, box.center);
    const dist = vec3.distance(onBox, sp.center);
    if (dist > sp.radius + config.delta) {
      return;
    }
    vec3.subtract(this.normal, onBox, sp.center);
    vec3.scale(this.normal, this.normal, 1 / dist); // dist can't be zero since center is outside
    this.sync(box, sp);
    this.add(onBox, sp.radius - dist, feature);
  }
}
