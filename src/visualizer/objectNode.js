import RenderNode from 'graphics/renderNode';
import Mesh from 'graphics/mesh';

export default class ObjectNode extends RenderNode {
  constructor(name, primitive) {
    super(name);
    this.mesh = new Mesh(name, [primitive])
  }

  get material() {
    return this.mesh.primitives[0].material;
  }
  set material(value) {
    this.mesh.primitives[0].material = value;
  }
}
