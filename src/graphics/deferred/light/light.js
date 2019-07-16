import dedent from 'dedent';
import UniformStruct from '../../objects/uniformBuffer';
import { isString } from 'util';

/**
 * @class
 * Base class for all light objects
 * Derived classes must have the following static members
 * 
 * @static {string} type: identifies light type
 * @static {string} shaderFunc: contents of GLSL function with the following signature
 *   bool getLightParams(in ParamStruct params, in vec4 pos, out LightInfo info)
 *     params is a struct of type defined by `paramStruct
 *     pos is sample point coordinates (w=1)
 *     info is a struct with the following members that must be filled in
 *       vec4 shadow - shadowmap coordinates (textureProj for plain maps, texture & sampler2DArray for cube maps)
 *       float distance - distance from light source
 *       vec3 direction - incident direction
 *       vec3 color - color value
 *     return value is true if light affects the given point
 */
export default function Light(...decl) {
  return class Light extends UniformStruct(null, decl) {
    // angle = 1 / (penumbra.x * dist + penumbra.y)
    // texelsizeZ = penumbra.z * dist + penumbra.w
    static lightInfo = dedent`struct LightInfo {
      vec4 shadow;
      vec3 shadowDx, shadowDy;
      int shadowLayer;
      float distance;
      vec4 penumbra;
      vec3 direction;
      vec3 color;
    };`

    get type() {
      return this.constructor.type;
    }
    get shaderFunc() {
      return `${this.type}_Func`;
    }

    get shaderCode() {
      return dedent`
        bool ${this.shaderFunc}(in vec4 pos, out LightInfo info) ${this.constructor.shaderFunc}
      `;
    }

    renderShadowmap(camera, list) {
      const shadow = this.shadow || this.renderer.noShadow;
      list = this.prepare(camera, list, {
        zNear: camera.near,
        zFar: camera.far,
        resolution: shadow.resolution,
        padding: shadow.padding,
      });
      list = list.filter(({primitive}) => {
        if (primitive.noShadow || (primitive.noShadowFor && primitive.noShadowFor.indexOf(this) >= 0)) {
          return false;
        }
        return true;
      });

      if (!list.length || !shadow.renderMap) {
        return null;
      }

      const shaderClass = shadow.getShadowmapShader(this);

      if (!this.constructor.arraySize) {
        return shadow.renderMap(() => {
          list.render(shaderClass, shader => {
            shader.uniforms("LightBlock", this);
          });
        });
      } else {
        return shadow.renderMapArray(index => {
          list.render(shaderClass, shader => {
            shader.int("u_ShadowMapIndex", index);
            shader.uniforms("LightBlock", this);
          });
        }, this.constructor.arraySize);
      }
    }

    render(camera, list) {
      const shadowMap = this.renderShadowmap(camera, list);
      const shadow = shadowMap && this.shadow || this.renderer.noShadow;
      const shader = shadow.getLightShader(this);
      this.renderer.updateLightShader(shader);
      shader.vec4("u_InvProj", camera.inverseProj());
      shader.mat4("u_InverseViewMatrix", camera.world);
      shader.sampler("u_ShadowMap", shadowMap);
      shader.uniforms("LightBlock", this);
      shader.render(this.renderer.quad);
    }
  }
}
