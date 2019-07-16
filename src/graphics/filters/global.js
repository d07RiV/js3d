import dedent from 'dedent';
import Filter from './filter';

export default class LocalFilter extends Filter {
  constructor(renderer, func, outType="vec4", inType="sampler2D") {
    super(renderer, dedent`
      precision PRECISION ${inType};
      uniform ${inType} u_Source;
      layout(location=0) out ${outType} o_Color;
      #define get(x,y) texelFetch(u_Source,ivec2(x,y),0)
      ${outType} func() {
        int x = int(gl_FragCoord.x);
        int y = int(gl_FragCoord.y);
        ${func};
      }
    `);
  }
}
