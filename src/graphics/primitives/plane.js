import VertexData from '../vertexData';

export default function Plane(renderer) {
  const vertices = new VertexData(4);
  vertices.add({POSITION: [ 1, 1, 0], NORMAL: [0, 0, 1], TEXCOORD_0: [1, 1]});
  vertices.add({POSITION: [-1, 1, 0], NORMAL: [0, 0, 1], TEXCOORD_0: [1, 0]});
  vertices.add({POSITION: [-1,-1, 0], NORMAL: [0, 0, 1], TEXCOORD_0: [0, 0]});
  vertices.add({POSITION: [ 1,-1, 0], NORMAL: [0, 0, 1], TEXCOORD_0: [0, 1]});
  return vertices.build(renderer, [0, 1, 2, 0, 2, 3]);
}
