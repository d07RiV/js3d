#version 300 es
precision mediump float;

in vec3 vNormal;
in vec2 vTex;

uniform Material {
  vec3 uDiffuse;
  vec2 uSpecular;
};
uniform sampler2D uTexture;

layout(location=0) out vec4 oColor;
layout(location=1) out vec4 oNormal;

void main() {
  vec2 texc = vTex / 512.0;
  vec3 color = texture(uTexture, texc).xyz * uDiffuse;
  vec3 normal = normalize(vNormal);
  oColor = vec4(color, uSpecular.x);
  oNormal = vec4(normal, uSpecular.y);
}
