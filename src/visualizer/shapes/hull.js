import ObjectNode from '../objectNode';
import Hull from 'graphics/primitives/hull';

export default class HullObject extends ObjectNode {
  constructor(renderer, shape) {
    const faces = shape.faces.map(face => face.vertices);
    super(shape.name, Hull(renderer, shape.verticesLocal, faces));
  }
}
