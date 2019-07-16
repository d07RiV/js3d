import ObjectNode from '../objectNode';

export default class BoxObject extends ObjectNode {
  constructor(renderer, shape) {
    super(shape.name, renderer.primitives.Box.clone());
    this.matrix = shape.transformLocal;
  }
}
