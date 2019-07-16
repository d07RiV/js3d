uniform sampler2D u_Color;
uniform sampler2D u_Emissive;

#if USE_REFLECTION
uniform sampler2D u_Reflection;
#endif

layout(location=0) out vec4 o_Color;

void main() {
  ivec2 coord = ivec2(gl_FragCoord.xy);
  vec3 tColor = texelFetch(u_Color, coord, 0).rgb;
  vec4 tEmissive = texelFetch(u_Emissive, coord, 0);

  vec3 color = tColor * tEmissive.a + tEmissive.rgb;

#if USE_REFLECTION
  vec2 tCoord = gl_FragCoord.xy / vec2(textureSize(u_Reflection, 0));
  vec4 tReflected = texelFetch(u_Reflection, coord, 0);
  vec4 factors = pow(vec4(1.0, 0.6, 0.4, 0.2), vec4(1.0 * (1.0 - tReflected.a)));
  factors /= dot(factors, vec4(1.0, 4.0, 4.0, 4.0));
  color += tReflected.rgb * factors.x;
  color += textureOffset(u_Reflection, tCoord, ivec2(-1,  0)).rgb * factors.y;
  color += textureOffset(u_Reflection, tCoord, ivec2( 1,  0)).rgb * factors.y;
  color += textureOffset(u_Reflection, tCoord, ivec2( 0, -1)).rgb * factors.y;
  color += textureOffset(u_Reflection, tCoord, ivec2( 0,  1)).rgb * factors.y;
  color += textureOffset(u_Reflection, tCoord, ivec2(-1,  1)).rgb * factors.z;
  color += textureOffset(u_Reflection, tCoord, ivec2( 1,  1)).rgb * factors.z;
  color += textureOffset(u_Reflection, tCoord, ivec2(-1, -1)).rgb * factors.z;
  color += textureOffset(u_Reflection, tCoord, ivec2( 1, -1)).rgb * factors.z;
  color += textureOffset(u_Reflection, tCoord, ivec2(-2,  0)).rgb * factors.w;
  color += textureOffset(u_Reflection, tCoord, ivec2( 2,  0)).rgb * factors.w;
  color += textureOffset(u_Reflection, tCoord, ivec2( 0, -2)).rgb * factors.w;
  color += textureOffset(u_Reflection, tCoord, ivec2( 0,  2)).rgb * factors.w;
#endif

  o_Color = vec4(pow(color, vec3(1.0 / 2.2)), 1.0);
}
