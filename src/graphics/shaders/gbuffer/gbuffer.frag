#include "../geometry.frag"
#include "../material.frag"
#include "../normal.frag"

layout(location=0) out vec4 o_Color; // rgb=baseColor, a=metallic
layout(location=1) out vec4 o_Normal; // xyz=normal, w=roughness
layout(location=2) out vec4 o_Emissive; // rgb=emissiveColor, w=occlusion

void main() {
  vec4 color = u_Material.baseColorFactor;
#ifdef ATTRIBUTE_COLOR_0
  color *= v_Color;
#endif
#ifdef MATERIAL_BASE_COLOR_TEXTURE
  color *= texture(u_BaseColorTexture, v_TexCoord[MATERIAL_BASE_COLOR_TEXTURE]);
#endif
#ifdef MATERIAL_ALPHA_MASK
  if (color.a < u_Material.alphaCutoff) {
    discard;
  }
#endif
#ifdef MATERIAL_ALPHA_BLEND
  if (color.a < 0.01) {
    discard;
  }
#endif

  float metallic = u_Material.metallicFactor;
  float roughness = u_Material.roughnessFactor;
#ifdef MATERIAL_METALLIC_ROUGHNESS_TEXTURE
  vec4 mrSample = texture(u_MetallicRoughnessTexture, v_TexCoord[MATERIAL_METALLIC_ROUGHNESS_TEXTURE]);
  metallic *= mrSample.b;
  roughness *= mrSample.g;
#endif

  vec3 normal = getNormal();

  float occlusion = 1.0;
#ifdef MATERIAL_OCCLUSION_TEXTURE
  occlusion = texture(u_OcclusionTexture, v_TexCoord[MATERIAL_OCCLUSION_TEXTURE]).r;
  occlusion = mix(1.0, occlusion, u_Material.occlusionStrength);
#endif

  vec3 emissive = u_Material.emissiveFactor;
#ifdef MATERIAL_EMISSIVE_TEXTURE
  emissive *= texture(u_EmissiveTexture, v_TexCoord[MATERIAL_EMISSIVE_TEXTURE]);
#endif

  o_Color = vec4(color.rgb, metallic);
  o_Normal = vec4(normal, roughness);
  o_Emissive = vec4(emissive, occlusion);
}
