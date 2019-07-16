import VertexType from '../vertexType';
import VertexData from '../vertexData';
import * as WebGL from '../constants';

const type = new VertexType({POSITION: {type: WebGL.FLOAT, size: 2}});

export default function ScreenQuad(renderer, x0, y0, x1, y1) {
  const vertices = new VertexData(4, type);
  vertices.add({POSITION: [x0, y0]});
  vertices.add({POSITION: [x1, y0]});
  vertices.add({POSITION: [x0, y1]});
  vertices.add({POSITION: [x1, y1]});
  return vertices.build(renderer, [0, 1, 3, 0, 3, 2]);
}
