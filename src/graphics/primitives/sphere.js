import VertexData from '../vertexData';

export default function Sphere(renderer, height = 0, slices = 8) {
  const LatSlices = slices;
  const LonSlices = slices * 4;
  const Pitch = LonSlices + 1;
  const numVertices = 2 * (LatSlices + 1) * (LonSlices + 1);
  const bottom = (x, y) => y * Pitch + x;
  const top = (x, y) => Pitch * (LatSlices + 1 + y) + x;

  const vertices = new VertexData(numVertices);
  const setVertex = (i, lat, lon, h) => {
    const c = Math.cos(lat);
    const x = Math.cos(lon) * c, y = Math.sin(lon) * c, z = Math.sin(lat);
    vertices.set(i, {
      POSITION: [x, y, z + h],
      NORMAL: [x, y, z],
      TEXCOORD_0: [Math.round(lon * 512 / Math.PI), Math.round(512 * (0.5 - lat / Math.PI + h))],
    });
  };
  for (let y = 0; y <= LatSlices; ++y) {
    for (let x = 0; x <= LonSlices; ++x) {
      const lat = y * Math.PI / 2 / LatSlices;
      const lon = x * Math.PI * 2 / LonSlices;
      setVertex(bottom(x, y), -lat, lon, 0);
      setVertex(top(x, y), lat, lon, height);
    }
  }

  const indices = [];
  const quad = (a, b, c, d) => indices.push(a, b, c, a, c, d);
  for (let y = 0; y < LatSlices; ++y) {
    for (let x = 0; x < LonSlices; ++x) {
      quad(bottom(x, y + 1), bottom(x + 1, y + 1), bottom(x + 1, y), bottom(x, y));
      quad(top(x, y), top(x + 1, y), top(x + 1, y + 1), top(x, y + 1));
    }
  }
  if (height) {
    for (let x = 0; x < LonSlices; ++x) {
      quad(bottom(x, 0), bottom(x + 1, 0), top(x + 1, 0), top(x, 0));
    }
  }
  return vertices.build(renderer, indices);
}
