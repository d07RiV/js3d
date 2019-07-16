#version 300 es
precision mediump float;

in vec2 pos2d;

uniform vec4 uInvProj;
uniform sampler2D uColorBuffer;
uniform sampler2D uNormalBuffer;
uniform sampler2D uDepthBuffer;

uniform LightParams {
  vec3 position;
  vec3 color;
  float radius;
  float attenuation;
} uLight;

out vec4 fragColor;

void main() {
  ivec2 coord = ivec2(gl_FragCoord.xy);
  vec4 tColor = texelFetch(uColorBuffer, coord, 0);
  vec4 tNormal = texelFetch(uNormalBuffer, coord, 0);
  float tDepth = texelFetch(uDepthBuffer, coord, 0).x;

  vec3 viewPos = vec3(pos2d, -1) / (tDepth * uInvProj.z + uInvProj.w);
  vec3 diffuse = tColor.xyz;
  vec3 normal = tNormal.xyz;
  vec2 specular = vec2(tColor.w, tNormal.w);

  vec3 lightDir = viewPos - uLight.position;
  float lightDist = length(lightDir);
  if (lightDist < uLight.radius) {
    lightDir /= lightDist;
    float power = pow(1.0 - lightDist / uLight.radius, uLight.attenuation);
    float cdiffuse = max(0.0, -dot(normal, lightDir));
    float cspecular = specular.x * pow(max(0.0, -dot(reflect(lightDir, normal), normalize(viewPos))), specular.y);
    fragColor = vec4(diffuse * uLight.color * (power * (cdiffuse + cspecular)), 1);
  } else {
    discard;
  }
}
