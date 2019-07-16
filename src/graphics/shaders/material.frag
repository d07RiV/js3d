uniform MaterialBlock {
  vec4 baseColorFactor;
  vec3 emissiveFactor;
  float metallicFactor;
  float roughnessFactor;
  float normalScale;
  float occlusionStrength;
  float alphaCutoff;
} u_Material;

#ifdef ATTRIBUTE_TEXCOORD_COUNT
#endif

#ifdef MATERIAL_BASE_COLOR_TEXTURE
#if defined ATTRIBUTE_TEXCOORD_COUNT && ATTRIBUTE_TEXCOORD_COUNT <= MATERIAL_BASE_COLOR_TEXTURE
#undef MATERIAL_BASE_COLOR_TEXTURE
#else
uniform sampler2D u_BaseColorTexture;
#endif
#endif

#ifdef MATERIAL_METALLIC_ROUGHNESS_TEXTURE
#if defined ATTRIBUTE_TEXCOORD_COUNT && ATTRIBUTE_TEXCOORD_COUNT <= MATERIAL_METALLIC_ROUGHNESS_TEXTURE
#undef MATERIAL_METALLIC_ROUGHNESS_TEXTURE
#else
uniform sampler2D u_MetallicRoughnessTexture;
#endif
#endif

#ifdef MATERIAL_NORMAL_TEXTURE
#if defined ATTRIBUTE_TEXCOORD_COUNT && ATTRIBUTE_TEXCOORD_COUNT <= MATERIAL_NORMAL_TEXTURE
#undef MATERIAL_NORMAL_TEXTURE
#else
uniform sampler2D u_NormalTexture;
#endif
#endif

#ifdef MATERIAL_OCCLUSSION_TEXTURE
#if defined ATTRIBUTE_TEXCOORD_COUNT && ATTRIBUTE_TEXCOORD_COUNT <= MATERIAL_OCCLUSSION_TEXTURE
#undef MATERIAL_OCCLUSSION_TEXTURE
#else
uniform sampler2D u_OcclusionTexture;
#endif
#endif

#ifdef MATERIAL_EMISSIVE_TEXTURE
#if defined ATTRIBUTE_TEXCOORD_COUNT && ATTRIBUTE_TEXCOORD_COUNT <= MATERIAL_EMISSIVE_TEXTURE
#undef MATERIAL_EMISSIVE_TEXTURE
#else
uniform sampler2D u_EmissiveTexture;
#endif
#endif
