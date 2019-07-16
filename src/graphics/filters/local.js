import dedent from 'dedent';
import Filter from './filter';

export default class LocalFilter extends Filter {
  constructor(renderer, func, outType="vec4", inType="sampler2D") {
    super(renderer, dedent`
      precision PRECISION ${inType};
      uniform ${inType} u_Source;
      layout(location=0) out ${outType} o_Color;
      #define get(x,y) textureOffset(u_Source,v_Position,ivec2(x,y))
      ${outType} func() {
        ${func};
      }
    `);
  }
}
