import { vec3 } from 'math';
import VertexData from '../vertexData';

export default function Hull(renderer, verts, faces) {
  const numVertices = faces.reduce((c, f) => c + f.length, 0);
  const vertices = new VertexData(numVertices);
  const indices = [];
  const tn = vec3.create(), tx = vec3.create(), ty = vec3.create(), tmp1 = vec3.create();
  faces.forEach(face => {
    const n = face.length, fv = face.map(idx => verts[idx]);
    vec3.cross(tn, fv[n - 1], fv[0]);
    for (let i = 0; i < n - 1; ++i) {
      vec3.add(tn, tn, vec3.cross(tmp1, fv[i], fv[i + 1]));
    }
    vec3.normalize(tn, tn);
    vec3.makeBasis(tn, tx, ty);

    const fi = fv.map(v => vertices.add({POSITION: v, NORMAL: tn, TEXCOORD_0: [vec3.dot(v, tx), vec3.dot(v, ty)]}));
    for (let i = 1; i + 2 <= fi.length; ++i) {
      indices.push(fi[0], fi[i], fi[i + 1]);
    }
  });
  return vertices.build(renderer, indices);
}
