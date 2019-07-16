import { vec2, vec3, vec4 } from 'math';

export default function buildTangents(modifier, texCoord) {
  const stride = 4 * Float32Array.BYTES_PER_ELEMENT;
  const coord = `TEXCOORD_${texCoord}`;

  // Build a list of triangles for current texCoord
  const triangles = modifier.triangles.filter(t => t.texCoord === texCoord);

  const vertices = modifier.vertices;
  const mapPos = new Map(), mapNeg = new Map();
  const d1 = vec3.create(), d2 = vec3.create(), vt = vec3.create(), tn = vec3.create();
  const t1 = vec2.create(), t2 = vec2.create();
  const degenerate = [];
  triangles.forEach(t => {
    // Build initial tangent, and determine orientation
    const v0 = vertices[t[0]], v1 = vertices[t[1]], v2 = vertices[t[2]];
    vec3.subtract(d1, v1.POSITION, v0.POSITION);
    vec3.subtract(d2, v2.POSITION, v0.POSITION);
    vec3.cross(vt, d1, d2);
    const triArea = vec3.length(vt);
    vec2.subtract(t1, v1[coord], v0[coord]);
    vec2.subtract(t2, v2[coord], v0[coord]);
    const area = t1[0] * t2[1] - t1[1] * t2[0];
    vec3.scale(vt, d1, t2[1]);
    vec3.scaleAndAdd(vt, vt, d2, -t1[1]);
    const tLen = vec3.length(vt);
    if (triArea < 1e-6 || Math.abs(area) < 1e-6 || tLen < 1e-6) {
      // Degenerate triangles will be processed in a separate pass
      degenerate.push(t);
    } else {
      const tmap = (area > 0 ? mapPos : mapNeg);
      const asign = Math.sign(area);
      vec3.scale(vt, vt, asign / tLen);
      for (let i = 0; i < 3; ++i) {
        let index = t[i];
        if (tmap.has(index)) {
          // We already checked this vertex, use it
          index = tmap.get(index);
        } else {
          if (vertices[index].TANGENT) {
            // Vertex already has a tangent, that means we need to create a new one
            index = modifier.cloneVertex(index);
          }
          tmap.set(t[i], index);
          if (index <= modifier.maxIndex) {
            vertices[index].TANGENT = new Float32Array(modifier.newTangents, (index - modifier.minIndex) * stride, 4);
          } else {
            // This should only happen when cloning a vertex
            vertices[index].TANGENT = new Float32Array(4);
          }
          vec4.set(vertices[index].TANGENT, 0.0, 0.0, 0.0, asign);
        }
        if (index !== t[i]) {
          // We changed vertex index: primitive needs to be re-indexed
          t.primitive.needReindex_ = true;
          t[i] = index;
        }
        const { POSITION, NORMAL, TANGENT } = vertices[index];
        // Project sides and tangent onto normal plane
        vec3.subtract(d1, vertices[t[(i + 1) % 3]].POSITION, POSITION);
        vec3.subtract(d2, vertices[t[(i + 2) % 3]].POSITION, POSITION);
        vec3.scaleAndAdd(d1, d1, NORMAL, -vec3.dot(d1, NORMAL));
        vec3.scaleAndAdd(d2, d2, NORMAL, -vec3.dot(d2, NORMAL));
        vec3.scaleAndAdd(tn, vt, NORMAL, -vec3.dot(vt, NORMAL));
        vec3.normalize(d1, d1);
        vec3.normalize(d2, d2);
        vec3.normalize(tn, tn);
        // Calculate angle
        const fCos = vec3.dot(d1, d2);
        const angle = Math.acos(Math.max(-1.0, Math.min(1.0, fCos)));
        vec3.scaleAndAdd(TANGENT, TANGENT, tn, angle);
      }
    }
  });
  // Normalize tangents
  mapPos.forEach(index => vec3.normalize(vertices[index].TANGENT, vertices[index].TANGENT));
  mapNeg.forEach(index => vec3.normalize(vertices[index].TANGENT, vertices[index].TANGENT));
  // For degenerate triangles, choose orientation based on first processed vertex and use it to replace other verts, if possible
  degenerate.forEach(t => {
    let tmap = null;
    for (let i = 0; i < 3; ++i) {
      let index = t[i];
      if (tmap && tmap.has(index)) {
        index = tmap.get(index);
      } else if (mapPos.has(index)) {
        index = mapPos.get(index);
        if (!tmap) tmap = mapPos;
      } else if (mapNeg.has(index)) {
        index = mapNeg.get(index);
        if (!tmap) tmap = mapNeg;
      }
      if (index !== t[i]) {
        t.primitive.needReindex_ = true;
        t[i] = index;
      }
    }
  });
}
