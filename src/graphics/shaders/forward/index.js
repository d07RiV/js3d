import GeometryShader from '../geometry';

import sourceFrag from './forward.frag';

export default class ForwardShader extends GeometryShader {
  static shaderName = "Forward";
  static useMaterials = true;

  constructor(renderer, attributes, defines) {
    super(renderer, attributes, sourceFrag, {defines});
  }
}
