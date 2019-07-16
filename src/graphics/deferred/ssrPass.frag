uniform sampler2D u_Color;
uniform sampler2D u_Normal;
uniform sampler2D u_Emissive;
uniform sampler2D u_Accum;
uniform sampler2D u_Depth;
uniform vec4 u_InvProj;
uniform mat3 u_ViewMatrix;
uniform mat4 u_InverseViewMatrix;

layout(location=0) out vec4 o_Color;

float rand(vec2 c) {
	return fract(sin(dot(c.xy ,vec2(12.9898,78.233))) * 43758.5453);
}
vec3 randVec() {
  vec2 c = gl_FragCoord.xy;
  return vec3(rand(c), rand(c + vec2(1.5, 3.5)), rand(c - vec2(1.5, 3.5)));
}

void main() {
  ivec2 coord = ivec2(gl_FragCoord.xy);

  vec4 tColor = texelFetch(u_Color, coord, 0);
  vec4 tNormal = texelFetch(u_Normal, coord, 0);
  float tDepth = texelFetch(u_Depth, coord, 0).x;

  float metallic = tColor.a;
  float roughness = tNormal.w;

  if (metallic < 0.01) {
    discard;
  }

  vec3 specularColor = mix(vec3(0.04), tColor.rgb, metallic);

  vec3 screenPos = vec3(gl_FragCoord.xy / vec2(textureSize(u_Depth, 0)), tDepth);

  vec2 position = screenPos.xy * 2.0 - 1.0;
  position *= u_InvProj.xy;
  vec3 viewPos = vec3(position, -1) / (tDepth * u_InvProj.z + u_InvProj.w);
  vec3 viewNormal = normalize(u_ViewMatrix * tNormal.xyz);
  vec3 reflected = normalize(reflect(viewPos, viewNormal));

  vec4 worldPos = u_InverseViewMatrix * vec4(viewPos, 1.0);

  vec3 randNormal = normalize(vec3(rand(worldPos.xy), rand(worldPos.xz), rand(worldPos.yz)));
  randNormal *= sign(dot(randNormal, viewNormal));
  reflected = normalize(mix(reflected, randNormal, 0.25 * pow(roughness, 8.0)));

  vec3 screenDir = vec3(-reflected.xy / (2.0 * u_InvProj.xy * reflected.z) + 0.5, -u_InvProj.w / u_InvProj.z) - screenPos;
  screenDir *= -sign(reflected.z);
  float screenDist = length(screenDir.xy);
  screenDir /= screenDist;
  float travelDist = min(screenDist, 1.5);
  if (screenDir.x < 0.0) {
    travelDist = min(travelDist, -screenPos.x / screenDir.x);
  } else if (screenDir.x > 0.0) {
    travelDist = min(travelDist, (1.0 - screenPos.x) / screenDir.x);
  }
  if (screenDir.y < 0.0) {
    travelDist = min(travelDist, -screenPos.y / screenDir.y);
  } else if (screenDir.y > 0.0) {
    travelDist = min(travelDist, (1.0 - screenPos.y) / screenDir.y);
  }
  int steps = min(128, int(float(textureSize(u_Depth, 0).x) * travelDist));

  vec3 color = vec3(0.0, 0.0, 0.0);

  for (int t = int(float(steps) * 0.01 / travelDist); t < steps; ++t) {
    float tx = float(t) / float(steps) * travelDist;
    vec3 samplePos = screenPos + tx * screenDir;
    float depthAt = texture(u_Depth, samplePos.xy).x;
    if (depthAt < samplePos.z) {
      vec3 aColor = texture(u_Accum, samplePos.xy).rgb;
      vec4 aEmissive = texture(u_Emissive, samplePos.xy);
      aColor = aColor * aEmissive.a + aEmissive.rgb;
      color = aColor;
      break;
    }
  }

  o_Color = vec4(color * specularColor, roughness);
}
