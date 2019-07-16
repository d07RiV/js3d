export default class GraphicsObject {
  static InstanceCounter = 0;
  constructor(renderer, name) {
    this.renderer = renderer;
    if (name) this.name = name;
    this.instanceId = ++GraphicsObject.InstanceCounter;
  }
}
