uniform sampler2D u_Texture;

layout(location=0) out vec4 o_Color;

void main() {
  vec2 rcpFrame = 1.0 / vec2(textureSize(u_Texture, 0));
  vec2 coord = gl_FragCoord.xy * rcpFrame;

  vec3 luma = vec3(0.299, 0.587, 0.114);

  vec3 rgbNW = texture(u_Texture, coord - rcpFrame).xyz;
  vec3 rgbNE = texture(u_Texture, coord + vec2(rcpFrame.x, -rcpFrame.y)).xyz;
  vec3 rgbSW = texture(u_Texture, coord + vec2(-rcpFrame.x, rcpFrame.y)).xyz;
  vec3 rgbSE = texture(u_Texture, coord + rcpFrame).xyz;
  vec4 texColor = texture(u_Texture, coord);
  vec3 rgbM = texColor.xyz;

  float lumaNW = dot(rgbNW, luma);
  float lumaNE = dot(rgbNE, luma);
  float lumaSW = dot(rgbSW, luma);
  float lumaSE = dot(rgbSE, luma);
  float lumaM = dot(rgbM, luma);
  float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
  float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));

  vec2 dir;
  dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));
  dir.y = ((lumaNW + lumaSW) - (lumaNE + lumaSE));

  float dirReduce = max((lumaNW + lumaNE + lumaSW + lumaSE) / 32.0, 1.0 / 128.0);
  float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);
  dir = clamp(dir * rcpDirMin, vec2(-8.0, -8.0), vec2(8.0, 8.0)) * rcpFrame;

  vec3 rgbA = 0.5 * (texture(u_Texture, coord + dir * (1.0 / 3.0 - 0.5)) + texture(u_Texture, coord + dir * (2.0 / 3.0 - 0.5))).xyz;
  vec3 rgbB = rgbA * 0.5 + 0.25 * (texture(u_Texture, coord - dir * 0.5) + texture(u_Texture, coord + dir * 0.5)).xyz;

  float lumaB = dot(rgbB, luma);
  if (lumaB < lumaMin || lumaB > lumaMax) {
    o_Color = vec4(rgbA, texColor.a);
  } else {
    o_Color = vec4(rgbB, texColor.a);
  }
}
