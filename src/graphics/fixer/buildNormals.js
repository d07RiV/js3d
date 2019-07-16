import { vec3 } from 'math';

/**
 * Build normals for given vertex data and triangle list.
 * Returns ArrayBuffer spanning from minIndex to maxIndex (inclusive).
 * Updates vertices with new normals.
 * 
 * @param {*} vertices Array of vertex objects
 * @param {*} triangles Array of triangle objects
 * @param {*} minIndex Smallest used index
 * @param {*} maxIndex Largest used index
 */
export default function buildNormals(vertices, triangles, minIndex, maxIndex) {
  const stride = 3 * Float32Array.BYTES_PER_ELEMENT;
  const buffer = new ArrayBuffer((maxIndex - minIndex + 1) * stride);
  const tv1 = vec3.create(), tv2 = vec3.create();
  const vertSet = new Set();
  triangles.forEach(tri => {
    const v0 = vertices[tri[0]].POSITION, v1 = vertices[tri[1]].POSITION, v2 = vertices[tri[2]].POSITION;
    vec3.subtract(tv1, v1, v0);
    vec3.subtract(tv2, v2, v0);
    const n = vec3.cross(tv1, tv1, v2);
    for (let i = 0; i < 3; ++i) {
      const v = vertices[tri[i]];
      vertSet.add(v);
      if (!v.NORMAL) {
        v.NORMAL = new Float32Array(buffer, (tri[i] - minIndex) * stride, 3);
        vec3.copy(v.NORMAL, n);
      } else {
        vec3.add(v.NORMAL, v.NORMAL, n);
      }
    }
  });
  vertSet.forEach(v => vec3.normalize(v.NORMAL, v.NORMAL));
  return buffer;
}
