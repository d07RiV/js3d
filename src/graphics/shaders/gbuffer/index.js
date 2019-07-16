import GeometryShader from '../geometry';

import sourceFrag from './gbuffer.frag';

export default class GBufferShader extends GeometryShader {
  static shaderName = "GBuffer";
  static useMaterials = true;

  constructor(renderer, attributes, defines) {
    super(renderer, attributes, sourceFrag, {defines});
  }
}
