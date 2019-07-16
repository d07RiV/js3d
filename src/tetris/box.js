import VertexData from 'graphics/vertexData';
import VertexType from 'graphics/vertexType';
import * as WebGL from 'graphics/constants';
import { vec3 } from 'math';

const type = new VertexType({POSITION: WebGL.FLOAT, NORMAL: WebGL.FLOAT});

export default function RoundBox(renderer) {
  const sections = 4;
  const radius = 0.2;

  const sphereSteps = [];
  for (let i = 0; i < sections; ++i) {
    const angle = (i / sections) * Math.PI / 2;
    const rad = Math.cos(angle) - 0.001;
    sphereSteps.push(Math.ceil(rad * sections));
  }
  sphereSteps.push(0);

  const numVertsCylinder = 2 * (sections + 1) * 12;
  const numVertsFaces = 4 * 6;
  const numVertsSpheres = sphereSteps.reduce((x, y) => x + y + 1, 0) * 8;
  const vertices = new VertexData(numVertsCylinder + numVertsFaces + numVertsSpheres, type);

  const tmp1 = vec3.create(), tmp2 = vec3.create();
  const indices = [];

  const lerp = (v0, v1, i, s) => {
    if (i === 0) {
      return v0;
    } else if (i === s) {
      return v1;
    } else {
      const angle = (i / s) * Math.PI / 2;
      const v = vec3.scale(new Float32Array(3), v0, Math.cos(angle));
      return vec3.scaleAndAdd(v, v, v1, Math.sin(angle));
    }
  };

  const cylinder = (v0, v1, dx, dy) => {
    const left = [], right = [];
    for (let i = 0; i <= sections; ++i) {
      const dir = lerp(dx, dy, i, sections);
      vec3.scaleAndAdd(tmp2, v0, dir, radius);
      left.push(vertices.add({POSITION: tmp2, NORMAL: dir}));
      vec3.scaleAndAdd(tmp2, v1, dir, radius);
      right.push(vertices.add({POSITION: tmp2, NORMAL: dir}));
    }
    for (let i = 0; i < sections; ++i) {
      const a = left[i], b = left[i + 1], c = right[i], d = right[i + 1];
      indices.push(a, b, d, a, d, c);
    }
  };
  const face = (v0, v1, v2, v3, norm) => {
    vec3.subtract(tmp1, v1, v0);
    vec3.subtract(tmp2, v2, v0);
    vec3.cross(tmp1, tmp1, tmp2);
    if (vec3.dot(tmp1, norm) < 0) {
      debugger;
    }
    vec3.scaleAndAdd(tmp1, v0, norm, radius);
    const a = vertices.add({POSITION: tmp1, NORMAL: norm});
    vec3.scaleAndAdd(tmp1, v1, norm, radius);
    const b = vertices.add({POSITION: tmp1, NORMAL: norm});
    vec3.scaleAndAdd(tmp1, v2, norm, radius);
    const c = vertices.add({POSITION: tmp1, NORMAL: norm});
    vec3.scaleAndAdd(tmp1, v3, norm, radius);
    const d = vertices.add({POSITION: tmp1, NORMAL: norm});
    indices.push(a, b, d, a, d, c);
  };
  const sphere = (v0, dx, dy, dz) => {
    const rows = [];
    for (let i = 0; i <= sections; ++i) {
      rows[i] = [];
      const steps = sphereSteps[i];
      for (let j = 0; j <= steps; ++j) {
        const dir = lerp(lerp(dx, dy, j, steps), dz, i, sections);
        vec3.scaleAndAdd(tmp2, v0, dir, radius);
        rows[i].push({index: vertices.add({POSITION: tmp2, NORMAL: dir}), t: j / steps});
      }
    }
    for (let i = 0; i < sections; ++i) {
      const ax = rows[i], bx = rows[i + 1];
      let a = 1, b = 1, pa = ax[0].index, pb = bx[0].index;
      while (a < ax.length || b < bx.length) {
        if (b >= bx.length || (a < ax.length && ax[a].t < bx[b].t)) {
          indices.push(pa, ax[a].index, pb);
          pa = ax[a++].index;
        } else {
          indices.push(pa, bx[b].index, pb);
          pb = bx[b++].index;
        }
      }
    }
  };

  const t0 = -1 + radius, t1 = 1 - radius;
  const v000 = [t0, t0, t0];
  const v001 = [t1, t0, t0];
  const v010 = [t0, t1, t0];
  const v011 = [t1, t1, t0];
  const v100 = [t0, t0, t1];
  const v101 = [t1, t0, t1];
  const v110 = [t0, t1, t1];
  const v111 = [t1, t1, t1];

  face(v010, v000, v110, v100, vec3.negX);
  face(v001, v011, v101, v111, vec3.posX);
  face(v000, v001, v100, v101, vec3.negY);
  face(v011, v010, v111, v110, vec3.posY);
  face(v001, v000, v011, v010, vec3.negZ);
  face(v100, v101, v110, v111, vec3.posZ);

  cylinder(v000, v001, vec3.negY, vec3.negZ);
  cylinder(v010, v011, vec3.negZ, vec3.posY);
  cylinder(v100, v101, vec3.posZ, vec3.negY);
  cylinder(v110, v111, vec3.posY, vec3.posZ);

  cylinder(v000, v010, vec3.negZ, vec3.negX);
  cylinder(v001, v011, vec3.posX, vec3.negZ);
  cylinder(v100, v110, vec3.negX, vec3.posZ);
  cylinder(v101, v111, vec3.posZ, vec3.posX);

  cylinder(v000, v100, vec3.negX, vec3.negY);
  cylinder(v001, v101, vec3.negY, vec3.posX);
  cylinder(v010, v110, vec3.posY, vec3.negX);
  cylinder(v011, v111, vec3.posX, vec3.posY);

  sphere(v000, vec3.negX, vec3.negZ, vec3.negY);
  sphere(v001, vec3.posX, vec3.negY, vec3.negZ);
  sphere(v010, vec3.negX, vec3.posY, vec3.negZ);
  sphere(v011, vec3.posX, vec3.negZ, vec3.posY);
  sphere(v100, vec3.negX, vec3.negY, vec3.posZ);
  sphere(v101, vec3.posX, vec3.posZ, vec3.negY);
  sphere(v110, vec3.negX, vec3.posZ, vec3.posY);
  sphere(v111, vec3.posX, vec3.posY, vec3.posZ);

  return vertices.build(renderer, indices);
}
