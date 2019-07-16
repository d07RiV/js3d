import dedent from 'dedent';
import GeometryShader from '../../shaders/geometry';
import Shader from '../../objects/shader';

export default class ShadowTechnique {
  constructor(renderer) {
    this.renderer = renderer;
  }

  get type() {
    return this.constructor.name;
  }

  getShadowmapShader(light) {
    const that = this;
    return this.renderer.cache(`shadowmap_shader_${that.type}_${light.type}`, () => (
      class ShadowmapShader extends GeometryShader {
        static shaderName = `Shadowmap_${that.type}_${light.type}`;
        static useMaterials = false;

        constructor(renderer, attributes, defines={}) {
          super(renderer, attributes, that.shadowmapFrag, {
            defines: {...defines, RENDER_SHADOWMAP: 1},
            filter: name => name.match(/POSITION|JOINTS|WEIGHTS/),
            fragments: {
              declarations: dedent`
                ${light.constructor.lightInfo}
                ${light.constructor.arraySize ? "uniform int u_ShadowMapIndex;" : ""}
                uniform LightBlock ${light.constructor.declaration} u_Light;
                ${light.shaderCode}
                out float v_Depth;
              `,
              output_func: dedent`
                LightInfo light;
                ${light.shaderFunc}(posW, light);
                gl_Position = light.shadow;
                v_Depth = light.distance;
              `,
            },
          });
        }
      }
    ));
  }
  
  getLightShader(light) {
    return this.renderer.cache(`render_shader_${this.type}_${light.type}`, () => {
      const smType = (light.constructor.arraySize ? this.constructor.shadowmapTypeArray : this.constructor.shadowmapType);
      let smDecl = "";
      if (smType) {
        smDecl = dedent`
          precision PRECISION ${smType};
          uniform ${smType} u_ShadowMap;
        `;
      }
      return this.renderer.lightPassShader(light, this, dedent`
        ${smDecl}
        float getShadow(in LightInfo light) ${this.shadowFunc}
      `);
    });
  }
}
