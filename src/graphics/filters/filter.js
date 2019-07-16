import dedent from 'dedent';

const shaderVert = dedent`
  layout(location=0) in vec2 a_Position;
  out vec2 v_Position;
  void main() {
    gl_Position = vec4(a_Position, 0.0, 1.0);
    v_Position = a_Position * 0.5 + 0.5;
  }
`;
const shaderFrag = body => dedent`
  in vec2 v_Position;
  ${body}
  void main() {
    o_Color = func();
  }
`;

export default class Filter {
  constructor(renderer, body) {
    this.renderer = renderer;
    this.shader = new renderer.Shader(shaderVert, shaderFrag(body));
  }

  apply(source, target) {
    if (target) {
      target.bind();
      target.clear();
    }
    this.shader.sampler("u_Source", source);
    this.shader.render(this.renderer.quad);
    if (target) {
      target.unbind();
    }
    return target;
  }
}
