import phy from 'physics';

export default class Scene {
  world = new phy.World();
  ground = new phy.RigidBody("ground");

  constructor() {
    this.ground.setMoves(false);
    this.world.addBody(this.ground);
  }

  update(time) {
    this.world.update(time);
  }

  get name() {
    return this.constructor.sceneName;
  }
}
