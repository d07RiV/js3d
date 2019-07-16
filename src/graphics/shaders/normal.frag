vec3 getNormal() {
#ifdef MATERIAL_NORMAL_TEXTURE
  vec2 uv = v_TexCoord[MATERIAL_NORMAL_TEXTURE];

#if defined ATTRIBUTE_TANGENT && defined ATTRIBUTE_NORMAL
  mat3 tbn = v_TBN;
#else
  vec3 posDx = dFdx(v_Position);
  vec3 posDy = dFdy(v_Position);
  vec2 texDx = dFdx(uv);
  vec2 texDy = dFdy(uv);
  float area = sign(texDx.x * texDy.y - texDx.y * texDy.x);
  vec3 t = (texDy.y * posDx - texDx.y * posDy) * area;
#ifdef ATTRIBUTE_NORMAL
  vec3 n = normalize(v_Normal);
#else
  vec3 n = normalize(cross(posDx, posDy));
#ifdef MATERIAL_DOUBLE_SIDED
  if (!gl_FrontFacing) {
    n = -n;
  }
#endif
#endif
  //t = cross(vec3(1.0, 0.0, 0.0), n);
  t = normalize(t - n * dot(n, t));
  vec3 b = normalize(cross(n, t)) * area;
  mat3 tbn = mat3(t, b, n);
#endif

  vec3 normal = texture(u_NormalTexture, uv).xyz;
  normal = (2.0 * normal - 1.0) * vec3(u_Material.normalScale, u_Material.normalScale, 1.0);
  normal = normalize(tbn * normal);
#ifdef MATERIAL_DOUBLE_SIDED
  if (!gl_FrontFacing) {
    normal = -normal;
  }
#endif
  return normal;

#else

#ifdef ATTRIBUTE_NORMAL

#ifdef ATTRIBUTE_TANGENT
  vec3 normal = normalize(v_TBN[2].xyz);
#else
  vec3 normal = normalize(v_Normal);
#endif
#ifdef MATERIAL_DOUBLE_SIDED
  if (!gl_FrontFacing) {
    normal = -normal;
  }
#endif
  return normal;

#else
  // No normal, calculate using position
  vec3 posDx = dFdx(v_Position);
  vec3 posDy = dFdy(v_Position);
  return normalize(cross(posDx, posDy));
#endif

#endif
}
