import VertexData from '../vertexData';

export default function Box(renderer) {
  const vertices = new VertexData(24);
  const vpos = [
    [1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1],
    [1, 1, -1], [-1, 1, -1], [-1, 1, 1], [1, 1, 1],
    [-1, 1, -1], [-1, -1, -1], [-1, -1, 1], [-1, 1, 1],
    [-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1],
    [1, -1, 1], [1, 1, 1], [-1, 1, 1], [-1, -1, 1],
    [-1, -1, -1], [-1, 1, -1], [1, 1, -1], [1, -1, -1],
  ];
  const vnorm = [[1, 0, 0], [0, 1, 0], [-1, 0, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const vtex = [[0, 1], [1, 1], [1, 0], [0, 0]];
  for (let i = 0; i < 24; ++i) {
    vertices.add({POSITION: vpos[i], NORMAL: vnorm[Math.floor(i / 4)], TEXCOORD_0: vtex[i % 4]});
  }
  const indices = [];
  for (let i = 0; i < 24; i += 4) {
    indices.push(i, i + 1, i + 2, i, i + 2, i + 3);
  }
  return vertices.build(renderer, indices);
}
