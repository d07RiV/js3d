struct PBRInfo {
  float NdotL;
  float NdotV;
  float NdotH;
  float LdotH;
  float VdotH;
  float metallic;
  float roughness;
  float alphaRoughness;
  vec3 diffuseColor;
  vec3 specularColor;
  vec3 reflectance0;
  vec3 reflectance90;
};

const float M_PI = 3.141592653589793;

// Lambertian diffuse
vec3 diffuse(in PBRInfo pbr) {
  return pbr.diffuseColor / M_PI;
}

// Frensel reflectance
vec3 specularReflection(in PBRInfo pbr) {
  return mix(pbr.reflectance0, pbr.reflectance90, pow(clamp(1.0 - pbr.VdotH, 0.0, 1.0), 5.0));
}

// Schlick geometric occlusion
float geometricOcclusion(in PBRInfo pbr) {
  float r = pbr.alphaRoughness;
  float NdotL = pbr.NdotL;
  float NdotV = pbr.NdotV;
  float attenuationL = 2.0 * NdotL / (NdotL + sqrt(mix(r * r, 1.0, NdotL * NdotL)));
  float attenuationV = 2.0 * NdotV / (NdotV + sqrt(mix(r * r, 1.0, NdotV * NdotV)));
  return attenuationL * attenuationV;
}

// Schlick geometric occlusion
const float Sqrt2overPi = sqrt(2.0 / M_PI);
float geometricOcclusion2(in PBRInfo pbr) {
  float k = pbr.roughness * Sqrt2overPi;
  float LdotH = pbr.LdotH;
  float NdotH = pbr.NdotH;
  float attenuationL = LdotH / (LdotH * (1.0 - k) * k);
  float attenuationN = NdotH / (NdotH * (1.0 - k) * k);
  return attenuationL * attenuationN;
}

// Trowbridge-Reitz microfacet distribution
float microfacetDistribution(in PBRInfo pbr) {
  float roughnessSq = pbr.alphaRoughness * pbr.alphaRoughness;
  float f = (pbr.NdotH * roughnessSq - pbr.NdotH) * pbr.NdotH + 1.0;
  return roughnessSq / (M_PI * f * f);
}

vec3 calculateColor(in vec3 baseColor, in float metallic, in float roughness, in vec3 normal, in vec3 view, in vec3 light) {
  PBRInfo pbr;
  pbr.metallic = metallic;
  pbr.roughness = roughness;
  pbr.alphaRoughness = pbr.roughness * pbr.roughness;

  vec3 f0 = vec3(0.04);
  pbr.diffuseColor = baseColor * (vec3(1.0) - f0) * (1.0 - pbr.metallic);
  pbr.specularColor = mix(f0, baseColor, pbr.metallic);

  float reflectance = max(max(pbr.specularColor.r, pbr.specularColor.g), pbr.specularColor.b);
  float reflectance90 = clamp(reflectance * 25.0, 0.0, 1.0);
  pbr.reflectance0 = pbr.specularColor;
  pbr.reflectance90 = vec3(1.0, 1.0, 1.0) * reflectance90;

  vec3 halfDir = normalize(light + view);

  pbr.NdotL = clamp(dot(normal, light), 0.001, 1.0);
  pbr.NdotV = clamp(abs(dot(normal, view)), 0.001, 1.0);
  pbr.NdotH = clamp(dot(normal, halfDir), 0.0, 1.0);
  pbr.LdotH = clamp(dot(light, halfDir), 0.0, 1.0);
  pbr.VdotH = clamp(dot(view, halfDir), 0.0, 1.0);

  vec3 F = specularReflection(pbr);
  float G = geometricOcclusion(pbr);
  float D = microfacetDistribution(pbr);

  vec3 fDiffuse = (1.0 - F) * diffuse(pbr);
  vec3 fSpecular = F * G * D / (4.0 * pbr.NdotL * pbr.NdotV);
  return pbr.NdotL * (fDiffuse + fSpecular);
}
