import VertexType from '../vertexType';
import VertexData from '../vertexData';
import * as WebGL from '../constants';

const type = new VertexType({POSITION: WebGL.FLOAT});

export default function UnitBox(renderer) {
  const vertices = new VertexData(8, type);
  vertices.add({POSITION: [-1, -1, -1]});
  vertices.add({POSITION: [ 1, -1, -1]});
  vertices.add({POSITION: [-1,  1, -1]});
  vertices.add({POSITION: [ 1,  1, -1]});
  vertices.add({POSITION: [-1, -1,  1]});
  vertices.add({POSITION: [ 1, -1,  1]});
  vertices.add({POSITION: [-1,  1,  1]});
  vertices.add({POSITION: [ 1,  1,  1]});
  const indices = [
    0, 2, 3, 0, 3, 1,
    0, 1, 5, 0, 5, 4,
    0, 4, 6, 0, 6, 2,
    1, 3, 7, 1, 7, 5,
    2, 6, 7, 2, 7, 3,
    4, 5, 7, 4, 7, 6,
  ];
  return vertices.build(renderer, indices);
}
