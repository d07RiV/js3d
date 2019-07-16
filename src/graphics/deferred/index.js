import dedent from 'dedent';
import { vec2, vec3, mat3, mat4, Ray } from 'math';
import * as WebGL from '../constants';

import Renderer from '../renderer';
import FXAAPass from './fxaa';
import UnitBox from './box';
import * as Shadows from './shadow';
import * as Lights from './light';

import ScreenQuad from './quad';

import lightPassVert from './lightPass.vert';
import lightPassFrag from './lightPass.frag';
import finalPassVert from './finalPass.vert';
import finalPassFrag from './finalPass.frag';
import ssrPassFrag from './ssrPass.frag';

import GBufferShader from '../shaders/gbuffer';

export default class DeferredRenderer extends Renderer {
  globalTransform = mat4.create();
  vpMatrix = mat4.create();
  invVpMatrix = mat4.create();
  viewNormalMatrix = mat3.create();

  Lights = {};
  Shadows = {};

  constructor(canvas) {
    super(canvas);

    for (let type in Lights) {
      this.Lights[type] = Lights[type].bind(null, this);
    }
    for (let type in Shadows) {
      this.Shadows[type] = Shadows[type].bind(null, this);
    }

    if (!this.gl.getExtension("EXT_color_buffer_float")) {
      throw "FLOAT color buffer not available";
    }
    //if (!this.gl.getExtension("OES_texture_float_linear")) {
    //  throw "FLOAT linear filtering not available";
    //}

    this.noShadow = new Shadows.None(this);

    this.quad = ScreenQuad(this, -1, -1, 1, 1);

    this.gbuffer = new this.RenderTarget(this.width, this.height, {
      color: {
        attachment: WebGL.COLOR_ATTACHMENT0,
        format: WebGL.RGBA16F,
        filter: WebGL.NEAREST,
        wrap: WebGL.CLAMP_TO_EDGE,
        clear: [0, 0, 0, 0],
      },
      normal: {
        attachment: WebGL.COLOR_ATTACHMENT1,
        format: WebGL.RGBA32F,
        filter: WebGL.NEAREST,
        wrap: WebGL.CLAMP_TO_EDGE,
        clear: [0, 0, 0, 0],
      },
      emissive: {
        attachment: WebGL.COLOR_ATTACHMENT2,
        format: WebGL.RGBA8,
        filter: WebGL.NEAREST,
        wrap: WebGL.CLAMP_TO_EDGE,
        clear: [0, 0, 0, 0],
      },
      depth: {
        format: WebGL.DEPTH_COMPONENT32F,
        filter: WebGL.NEAREST,
        wrap: WebGL.CLAMP_TO_EDGE,
        clear: 1,
      },
    }, {
      depthTest: true,
      depthMask: true,
      blend: false,
      cull: true,
    });
    this.accumBuffer = new this.RenderTarget(this.width, this.height, {
      color: {
        format: WebGL.RGBA16F,
        filter: WebGL.NEAREST,
        wrap: WebGL.CLAMP_TO_EDGE,
        clear: [0, 0, 0, 0],
      }
    }, {
      depthTest: false,
      depthMask: false,
      blend: true,
      blendFunc: [WebGL.ONE, WebGL.ONE],
    });
    this.ssrBuffer = new this.RenderTarget(this.width, this.height, {
      color: {
        format: WebGL.RGBA16F,
        filter: WebGL.NEAREST,
        wrap: WebGL.CLAMP_TO_EDGE,
        clear: [0, 0, 0, 0],
      },
    }, {
      depthTest: false,
      depthMask: false,
      blend: false,
    });
    this.screenBuffer = new this.RenderTarget(this.width, this.height, {
      color: {
        format: WebGL.RGBA8,
        filter: WebGL.LINEAR,
        wrap: WebGL.CLAMP_TO_EDGE,
      },
    }, {
      depthTest: false,
      depthMask: false,
      blend: false,
    });
  
    this.finalPass = new this.Shader(finalPassVert, finalPassFrag, {defines: {USE_REFLECTION: 0}});
    this.finalPassSSR = new this.Shader(finalPassVert, finalPassFrag, {defines: {USE_REFLECTION: 1}});
    this.ssrPass = new this.Shader(finalPassVert, ssrPassFrag);
    
    const mat = mat4.create();
    const dirX = mat.subarray(0, 3),
      dirY = mat.subarray(4, 7),
      dirZ = mat.subarray(8, 11);
    vec3.normalize(dirZ, [0, 0, 1]);
    vec3.makeBasis(dirZ, dirX, dirY);

    const sun = new this.Lights.Directional(mat4.create(), [1, 1, 1]);


    this.shadowTypes = {
      none: this.noShadow,
      pcf: new this.Shadows.PCF(1024, 1),
      vsm: new this.Shadows.VSM(512, 4, true),
//      savsm: new this.Shadows.SAVSM(2048, 4, 169, 64),
    };

    sun.shadow = this.shadowTypes.pcf;

    this.lights = [];//sun];

    this.box = UnitBox(this);

    this.fxaa = new FXAAPass(this);
  }

  lightPassShader(light, shadow, shadowCode) {
    const shader = new this.Shader(lightPassVert, lightPassFrag, {
      fragments: {
        lightCode: dedent`
          ${light.constructor.lightInfo}
          uniform LightBlock ${light.constructor.declaration} u_Light;
          ${light.shaderCode}
        `,
        lightFunction: light.shaderFunc,
        shadowCode
      },
      defines: {
        SHADOWMAP_ARRAY: light.constructor.arraySize || 0,
        NEEDS_DERIVATIVES: (shadow.constructor.needsDerivatives ? 1 : 0),
        CALCULATE_DERIVATIVES: (shadow.constructor.needsDerivatives && !light.constructor.providesDerivatives ? 1 : 0),
      },
    });
    shader.vec4("u_Transform", [1, 1, 0, 0]); //TODO: fix?
    return shader;
  }

  updateLightShader(shader) {
    shader.sampler("u_Color", this.gbuffer.color);
    shader.sampler("u_Normal", this.gbuffer.normal);
    shader.sampler("u_Depth", this.gbuffer.depth);
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
    this.lights = [];
    scene.resolve(this.globalTransform, renderList, this.lights);
    if (!this.beginFrame(camera)) {
      return;
    }

    //this.sun.shadow = this.shadowTypes[this.shadowType || "vsm"];

    this.gbuffer.resize(this.width, this.height);
    this.accumBuffer.resize(this.width, this.height);
    this.ssrBuffer.resize(this.width, this.height);
    this.screenBuffer.resize(this.width, this.height);

    this.finalPass.sampler("u_Color", this.accumBuffer.color);
    this.finalPass.sampler("u_Emissive", this.gbuffer.emissive);
    this.finalPassSSR.sampler("u_Color", this.accumBuffer.color);
    this.finalPassSSR.sampler("u_Emissive", this.gbuffer.emissive);
    this.finalPassSSR.sampler("u_Reflection", this.ssrBuffer.color);
    this.ssrPass.sampler("u_Color", this.gbuffer.color);
    this.ssrPass.sampler("u_Normal", this.gbuffer.normal);
    this.ssrPass.sampler("u_Emissive", this.gbuffer.emissive);
    this.ssrPass.sampler("u_Accum", this.accumBuffer.color);
    this.ssrPass.sampler("u_Depth", this.gbuffer.depth);

    mat4.multiply(this.vpMatrix, camera.projection, camera.view);
    mat4.invert(this.invVpMatrix, this.vpMatrix);

    this.gbuffer.bind().clear();
    renderList.render(GBufferShader, shader => {
      shader.mat4("u_ViewProjectionMatrix", this.vpMatrix);
    });
    this.gbuffer.unbind();

    this.accumBuffer.bind().clear();
    this.lights.forEach(light => light.render(camera, renderList));
    this.accumBuffer.unbind();

    if (this.reflection) {
      this.ssrBuffer.bind().clear();
      this.ssrPass.vec4("u_InvProj", camera.inverseProj());
      mat3.normalFromMat4(this.viewNormalMatrix, camera.view);
      this.ssrPass.mat3("u_ViewMatrix", this.viewNormalMatrix);
      this.ssrPass.mat4("u_InverseViewMatrix", camera.world);
      this.ssrPass.render(this.quad);
      this.ssrBuffer.unbind();

      this.screenBuffer.bind();
      this.finalPassSSR.render(this.quad);
      this.screenBuffer.unbind();
    } else {
      this.screenBuffer.bind();
      this.finalPass.render(this.quad);
      this.screenBuffer.unbind();
    }

    this.state.depthTest = false;
    this.state.depthMask = false;
    this.state.blend = false;
    this.fxaa.apply(this.screenBuffer.color);

    this.endFrame();
  }
}
