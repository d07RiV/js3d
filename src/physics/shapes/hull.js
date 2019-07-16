import { vec3, vec4, mat3, AABB } from 'math';
import Shape from './shape';

const tmp1 = vec3.create(), tmp2 = vec3.create(), tmp3 = vec3.create();
const tmpm = mat3.create();

class Hull extends Shape {
  static type = "Hull";

  constructor() {
    super();
    this.vertices = [];
    this.faces = [];
    this.edges = {};
    this.verticesLocal = this.vertices;
  }

  _edge(i, j) {
    const id = `${i}_${j}`;
    if (this.edges[id]) return this.edges[id];
    return this.edges[id] = {a: this.vertices[i], b: this.vertices[j]};
  }

  updateNormal(face) {
    const v = this.vertices, vi = face.vertices, n = vi.length;
    vec3.copy(tmp2, v[vi[n - 1]]);
    vec3.cross(face.plane, tmp2, v[vi[0]]);
    for (let i = 0; i < n - 1; ++i) {
      vec3.add(face.plane, face.plane, vec3.cross(tmp1, v[vi[i]], v[vi[i + 1]]));
      vec3.add(tmp2, tmp2, v[vi[i]]);
    }
    vec3.scale(tmp2, tmp2, 1 / n);
    vec3.normalize(face.plane, face.plane);
    face.plane[3] = -vec3.dot(face.plane, tmp2);
    face.planeLocal = vec4.clone(face.plane);
  }

  addFace(...args) {
    if (!args.length || typeof args[0] === "object") {
      args.forEach(arg => this.addFace(...arg));
      return;
    }
    const face = {vertices: [...args]};
    face.plane = vec4.create();
    this.updateNormal(face);
    this.faces.push(face);
    const n = args.length;
    for (let i = 0; i < n; ++i) {
      const a = args[i], b = args[i === n - 1 ? 0 : i + 1];
      if (a < b) {
        this._edge(a, b).n1 = face.plane;
      } else {
        this._edge(b, a).n2 = face.plane;
      }
    }
  }

  updateCenter() {
    if (!this.center) {
      this.centerLocal = this.verticesLocal.reduce((c, v) => vec3.add(c, c, v), vec3.create());
      vec3.scale(this.centerLocal, this.centerLocal, 1 / this.verticesLocal.length);
      this.center = vec3.clone(this.centerLocal);
    }
    if (this.body) {
      vec3.transformMat4(this.center, this.centerLocal, this.body.transform);
    }
  }

  update() {
    const b = this.aabb, v = this.vertices;
    let l = this.verticesLocal;
    this.updateCenter();
    if (this.body) {
      const t = this.body.transform;
      if (l === v) {
        l = this.verticesLocal = v.map(x => vec3.clone(x));
      }
      for (let i = 0; i < v.length; ++i) {
        vec3.transformMat4(v[i], l[i], t);
      }
      mat3.normalFromMat4(tmpm, t);
      const sv = t.subarray(12, 15);
      this.faces.forEach(({plane, planeLocal}) => {
        vec3.transformMat3(plane, planeLocal, tmpm);
        plane[3] = planeLocal[3] - vec3.dot(sv, plane);
        vec4.scale(plane, plane, 1 / vec3.length(plane));
      });
    }
    AABB.setVec3(b, v[0]);
    for (let i = 1; i < v.length; ++i) {
      AABB.combineVec3(b, b, v[i]);
    }
  }

  support(dir) {
    const v = this.vertices;
    let res = v[0], d = vec3.dot(res, dir);
    for (let i = 1; i < v.length; ++i) {
      const c = vec3.dot(dir, v[i]);
      if (c > d) { d = c; res = v[i]; }
    }
    return res;
  }

  getInfo(center, inertia) {
    // http://geometrictools.com/Documentation/PolyhedralMassProperties.pdf
    const v = this.verticesLocal;
    let v0=0, v1=0, v2=0, v3=0, v4=0, v5=0, v6=0, v7=0, v8=0, v9=0;
    let t0, t1, t2;
    this.this.faces.forEach(({vertices: vi}) => {
      const i0 = vi[0], x0 = v[i0][0], y0 = v[i0][1], z0 = v[i0][2];
      for (let j = 1; j + 2 <= vi.length; ++j) {
        const i1 = vi[j], i2 = vi[j + 1];
        const x1 = v[i1][0], y1 = v[i1][1], z1 = v[i1][2],
              x2 = v[i2][0], y2 = v[i2][1], z2 = v[i2][2];
        const a1 = x1 - x0, b1 = y1 - y0, c1 = z1 - z0,
              a2 = x2 - x0, b2 = y2 - y0, c2 = z2 - z0,
              d0 = b1 * c2 - b2 * c1, d1 = a2 * c1 - a1 * c2, d2 = a1 * b2 - a2 * b1;
        t0 = x0 + x1, t1 = x0 * x0, t2 = t1 + x1 * t0;
        const f1x = t0 + x2, f2x = t2 + x2 * f1x, f3x = x0 * t1 + x1 * t2 + x2 * f2x;
        const g0x = f2x + x0 * (f1x + x0), g1x = f2x + x1 * (f1x + x1), g2x = f2x + x2 * (f1x + x2);
        t0 = y0 + y1, t1 = y0 * y0, t2 = t1 + y1 * t0;
        const f1y = t0 + y2, f2y = t2 + y2 * f1y, f3y = y0 * t1 + y1 * t2 + y2 * f2y;
        const g0y = f2y + y0 * (f1y + y0), g1y = f2y + y1 * (f1y + y1), g2y = f2y + y2 * (f1y + y2);
        t0 = z0 + z1, t1 = z0 * z0, t2 = t1 + z1 * t0;
        const f1z = t0 + z2, f2z = t2 + z2 * f1z, f3z = z0 * t1 + z1 * t2 + z2 * f2z;
        const g0z = f2z + z0 * (f1z + z0), g1z = f2z + z1 * (f1z + z1), g2z = f2z + z2 * (f1z + z2);
        v0 += d0 * f1x;
        v1 += d0 * f2x, v2 += d1 * f2y, v3 += d2 * f2z;
        v4 += d0 * f3x, v5 += d1 * f3y, v6 += d2 * f3z;
        v7 += d0 * (y0 * g0x + y1 * g1x + y2 * g2x);
        v8 += d1 * (z0 * g0y + z1 * g1y + z2 * g2y);
        v9 += d2 * (x0 * g0z + x1 * g1z + x2 * g2z);
      }
    });
    v0 /= 6, v1 /= 24, v2 /= 24, v3 /= 24, v4 /= 60, v5 /= 60, v6 /= 60, v7 /= 120, v8 /= 120, v9 /= 120;
    const d = this.material.density;
    const mass = d * v0;
    center[0] = v1 / v0;
    center[1] = v2 / v0;
    center[2] = v3 / v0;
    const xx = center[0] * center[0], yy = center[1] * center[1], zz = center[2] * center[2];
    inertia[0] = d * (v5 + v6 - v0 * (yy + zz));
    inertia[4] = d * (v4 + v6 - v0 * (zz + xx));
    inertia[8] = d * (v4 + v5 - v0 * (xx + yy));
    inertia[1] = inertia[3] = -d * (v7 - v0 * center[0] * center[1]);
    inertia[5] = inertia[7] = -d * (v8 - v0 * center[1] * center[2]);
    inertia[2] = inertia[6] = -d * (v9 - v0 * center[2] * center[0]);
    return mass;
  }

  intersect(ray) {
    for (let i = 0; i < this.faces.length; ++i) {
      const face = this.faces[i];
      const fpos = vec3.dot(ray.pos, face.plane) + face.plane[3];
      const fdir = vec3.dot(ray.dir, face.plane);
      if (fdir > -1e-4 || fpos < -1e-4) continue;
      const delta = Math.max(0, -fpos / fdir);
      vec3.scaleAndAdd(tmp1, ray.pos, ray.dir, delta);
      const n = face.vertices.length;
      let inside = true;
      for (let j = 0; j < n; ++j) {
        const cur = this.vertices[face.vertices[j]];
        const next = this.vertices[face.vertices[j == n - 1 ? 0 : j + 1]];
        vec3.subtract(tmp2, next, cur);
        vec3.subtract(tmp3, tmp1, cur);
        vec3.cross(tmp2, tmp2, tmp3);
        if (vec3.dot(tmp2, face.plane) < 0) {
          inside = false;
          break;
        }
      }
      if (inside) return delta;
    }
    return false;
  }
}

export default Hull;
