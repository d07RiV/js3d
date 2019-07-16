#include "../geometry.frag"
#include "../material.frag"
#include "../normal.frag"
#include "../pbr.frag"

uniform vec3 u_Camera;
uniform vec3 u_LightDirection;
uniform vec3 u_LightColor;

layout(location=0) out vec4 o_Color;

void main() {
  vec4 baseColor = u_Material.baseColorFactor;
#ifdef ATTRIBUTE_COLOR_0
  baseColor *= v_Color;
#endif
#ifdef MATERIAL_BASE_COLOR_TEXTURE
  baseColor *= texture(u_BaseColorTexture, v_TexCoord[MATERIAL_BASE_COLOR_TEXTURE]);
#endif
#ifdef MATERIAL_ALPHA_MASK
  if (baseColor.a < u_Material.alphaCutoff) {
    discard;
  }
#endif
#ifdef MATERIAL_ALPHA_BLEND
  if (baseColor.a < 0.01) {
    discard;
  }
#endif
#ifdef MATERIAL_OPAQUE
  baseColor.a = 1.0;
#endif

  float metallic = u_Material.metallicFactor;
  float roughness = u_Material.roughnessFactor;
#ifdef MATERIAL_METALLIC_ROUGHNESS_TEXTURE
  vec4 mrSample = texture(u_MetallicRoughnessTexture, v_TexCoord[MATERIAL_METALLIC_ROUGHNESS_TEXTURE]);
  metallic *= mrSample.b;
  roughness *= mrSample.g;
#endif

  float occlusion = 1.0;
#ifdef MATERIAL_OCCLUSION_TEXTURE
  occlusion = texture(u_OcclusionTexture, v_TexCoord[MATERIAL_OCCLUSION_TEXTURE]).r;
  occlusion = mix(1.0, occlusion, u_Material.occlusionStrength);
#endif

  vec3 emissive = u_Material.emissiveFactor;
#ifdef MATERIAL_EMISSIVE_TEXTURE
  emissive *= texture(u_EmissiveTexture, v_TexCoord[MATERIAL_EMISSIVE_TEXTURE]);
#endif

  vec3 normal = getNormal();
  vec3 view = normalize(u_Camera - v_Position);
  vec3 light = normalize(-u_LightDirection);

  vec3 pbr = calculateColor(baseColor.rgb, metallic, roughness, normal, view, light);

  vec3 color = pbr * u_LightColor * occlusion + emissive;
  o_Color = vec4(pow(color, vec3(1.0 / 2.2)), baseColor.a);
}
