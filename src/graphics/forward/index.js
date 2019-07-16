import { vec3, mat4, Ray } from 'math';
import * as WebGL from '../constants';

import Renderer from '../renderer';
import ForwardShader from '../shaders/forward';

export default class ForwardRenderer extends Renderer {
  lightDir = vec3.create();
  lightColor = vec3.create();
  globalTransform = mat4.create();
  vpMatrix = mat4.create();
  
  constructor(canvas) {
    super(canvas);

    vec3.normalize(this.lightDir, [-0.3, -0.3, -1]);
    vec3.set(this.lightColor, 1.0, 1.0, 1.0);
  }

  pickRay(x, y) {
    const dir = vec3.fromValues(x / this.width * 2 - 1, 1 - y / this.height * 2, -1);
    dir[0] *= this.camera.tanX;
    dir[1] *= this.camera.tanY;
    vec3.transformMat4(dir, dir, this.camera.world);
    vec3.subtract(dir, dir, this.camera.pos);
    vec3.normalize(dir, dir);
    return new Ray(this.camera.pos, dir);
  }

  render(camera, scene) {
    const renderList = new this.RenderList();
    scene.resolve(this.globalTransform, renderList);
    if (!this.beginFrame(camera)) {
      return;
    }

    const gl = this.gl;

    gl.enable(WebGL.DEPTH_TEST);
    gl.depthMask(true);
    gl.enable(WebGL.BLEND);
    gl.blendFunc(WebGL.SRC_ALPHA, WebGL.ONE_MINUS_SRC_ALPHA);

    mat4.multiply(this.vpMatrix, camera.projection, camera.view);
    
    renderList.render(ForwardShader, shader => {
      shader.vec3("u_LightDirection", this.lightDir);
      shader.vec3("u_LightColor", this.lightColor);
      shader.vec3("u_Camera", this.camera.pos);
      shader.mat4("u_ViewProjectionMatrix", this.vpMatrix);
    });

    this.endFrame();
  }
}
