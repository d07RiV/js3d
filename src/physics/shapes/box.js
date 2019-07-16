import { vec3, mat3, mat4 } from 'math';
import Hull from './hull';

const tmp1 = vec3.create();

class Box extends Hull {
  static type = "Box";

  constructor(...args) {
    super();
    const tl = this.transformLocal = mat4.create();
    if (args.length === 3) {
      const x = args[0] * 0.5, y = args[1] * 0.5, z = args[2] * 0.5;
      tl[0] = x;
      tl[5] = y;
      tl[10] = z;
      tl[12] = x;
      tl[13] = y;
      tl[14] = z;
    } else if (args.length === 6) {
      const cx = args[0], cy = args[1], cz = args[2];
      const x = args[3] * 0.5, y = args[4] * 0.5, z = args[5] * 0.5;
      tl[0] = x;
      tl[5] = y;
      tl[10] = z;
      tl[12] = cx + x;
      tl[13] = cy + y;
      tl[14] = cz + z;
    } else if (args.length === 4) {
      tl.set(args[0], 12);
      tl.set(args[1], 0);
      tl.set(args[2], 4);
      tl.set(args[3], 8);
    } else {
      tl.set(args.slice(0, 3), 12);
      tl.set(args.slice(3, 6), 0);
      tl.set(args.slice(6, 9), 4);
      tl.set(args.slice(9, 12), 8);
    }
    const dx = tl.subarray(0, 3), dy = tl.subarray(4, 7), dz = tl.subarray(8, 11);
    if (vec3.dot(vec3.cross(tmp1, dx, dy), dz) < 0) {
      vec3.copy(tmp1, dy);
      vec3.copy(dy, dz);
      vec3.copy(dz, tmp1);
    }
    this.orientLocal = mat3.create();
    mat3.fromMat4(this.orientLocal, tl);
    const nx = this.orientLocal.subarray(0, 3), lx = vec3.length(nx); vec3.scale(nx, nx, 1 / lx);
    const ny = this.orientLocal.subarray(3, 6), ly = vec3.length(ny); vec3.scale(ny, ny, 1 / ly);
    const nz = this.orientLocal.subarray(6, 9), lz = vec3.length(nz); vec3.scale(nz, nz, 1 / lz);

    this.halfSize = vec3.fromValues(lx, ly, lz);
    this.transform = mat4.clone(tl);
    this.center = this.transform.subarray(12, 15);
    this.dx = this.transform.subarray(0, 3);
    this.dy = this.transform.subarray(4, 7);
    this.dz = this.transform.subarray(8, 11);
    this.orient = mat3.clone(this.orientLocal);
    this.nx = this.orient.subarray(0, 3);
    this.ny = this.orient.subarray(3, 6);
    this.nz = this.orient.subarray(6, 9);
    this.axes = [this.nx, this.ny, this.nz];
    this.extents = [this.dx, this.dy, this.dz];

    const v = this.vertices, tc = this.center;
    var cv;
    cv = v[0] = vec3.clone(tc); vec3.sub(cv, cv, dx); vec3.sub(cv, cv, dy); vec3.sub(cv, cv, dz);
    cv = v[1] = vec3.clone(tc); vec3.add(cv, cv, dx); vec3.sub(cv, cv, dy); vec3.sub(cv, cv, dz);
    cv = v[2] = vec3.clone(tc); vec3.sub(cv, cv, dx); vec3.add(cv, cv, dy); vec3.sub(cv, cv, dz);
    cv = v[3] = vec3.clone(tc); vec3.add(cv, cv, dx); vec3.add(cv, cv, dy); vec3.sub(cv, cv, dz);
    cv = v[4] = vec3.clone(tc); vec3.sub(cv, cv, dx); vec3.sub(cv, cv, dy); vec3.add(cv, cv, dz);
    cv = v[5] = vec3.clone(tc); vec3.add(cv, cv, dx); vec3.sub(cv, cv, dy); vec3.add(cv, cv, dz);
    cv = v[6] = vec3.clone(tc); vec3.sub(cv, cv, dx); vec3.add(cv, cv, dy); vec3.add(cv, cv, dz);
    cv = v[7] = vec3.clone(tc); vec3.add(cv, cv, dx); vec3.add(cv, cv, dy); vec3.add(cv, cv, dz);
    this.addFace([0, 4, 6, 2], [1, 3, 7, 5],
                 [0, 1, 5, 4], [2, 6, 7, 3],
                 [0, 2, 3, 1], [4, 5, 7, 6]);
  }

  updateCenter() {
  }
  update() {
    super.update();
    if (this.body) {
      mat4.multiply(this.transform, this.body.transform, this.transformLocal);
      mat4.multiplyMat3(this.orient, this.body.transform, this.orientLocal);
    }
  }

  getInfo(center, inertia) {
    vec3.copy(center, this.transformLocal.subarray(12, 15));
    const x = this.halfSize[0], y = this.halfSize[1], z = this.halfSize[2];
    const mass = 8 * x * y * z * this.material.density;
    const i11 = mass * (y * y + z * z) / 3;
    const i22 = mass * (x * x + z * z) / 3;
    const i33 = mass * (x * x + y * y) / 3;
    mat3.diagonal(inertia, i11, i22, i33);
    mat3.transform(inertia, inertia, this.orientLocal);
    return mass;
  }

  extentsAlong(axis) {
    return Math.abs(vec3.dot(axis, this.dx)) +
           Math.abs(vec3.dot(axis, this.dy)) +
           Math.abs(vec3.dot(axis, this.dz));
  }

  support(dir) {
    let i = 0;
    if (vec3.dot(dir, this.dx) > 0) i += 1;
    if (vec3.dot(dir, this.dy) > 0) i += 2;
    if (vec3.dot(dir, this.dz) > 0) i += 4;
    return this.vertices[i];
  }
}

export default Box;
