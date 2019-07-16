#include "../shaders/pbr.frag"

in vec2 v_Position;
uniform vec4 u_InvProj;
uniform mat4 u_InverseViewMatrix;
uniform sampler2D u_Color;
uniform sampler2D u_Normal;
uniform sampler2D u_Depth;

${lightCode}
${shadowCode}

layout(location=0) out vec4 o_Color;

void main() {
  ivec2 coord = ivec2(gl_FragCoord.xy);
  vec4 tColor = texelFetch(u_Color, coord, 0);
  vec4 tNormal = texelFetch(u_Normal, coord, 0);
  float tDepth = texelFetch(u_Depth, coord, 0).x;

  vec4 worldPos = vec4(vec3(v_Position, -1) / (tDepth * u_InvProj.z + u_InvProj.w), 1.0);
  worldPos = u_InverseViewMatrix * worldPos;
  LightInfo light;
  if (!${lightFunction}(worldPos, light)) {
    discard;
  }
#if CALCULATE_DERIVATIVES
  vec3 tPos = (light.shadow.xyz / light.shadow.w) * 0.5 + 0.5;
  light.shadowDx = dFdx(tPos);
  light.shadowDy = dFdy(tPos);
#endif

  float shadow = getShadow(light);

  vec3 viewDir = normalize(u_InverseViewMatrix[3].xyz - worldPos.xyz);
  vec3 lightDir = normalize(-light.direction);
  vec3 pbr = calculateColor(tColor.rgb, tColor.a, tNormal.w, normalize(tNormal.xyz), viewDir, lightDir);

  //o_Color = vec4(pow(pbr * light.color, vec3(1.0 / 2.2)) * shadow, 1.0);
  o_Color = vec4(pbr * light.color * shadow, 1.0);
}
