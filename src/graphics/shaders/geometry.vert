layout(location=ATTRIBUTE_POSITION) in vec3 a_Position;
out vec3 v_Position;
#ifdef ATTRIBUTE_POSITION_1
layout(location=ATTRIBUTE_POSITION_1) in vec3 a_Position_1;
#endif
#ifdef ATTRIBUTE_POSITION_2
layout(location=ATTRIBUTE_POSITION_2) in vec3 a_Position_2;
#endif
#ifdef ATTRIBUTE_POSITION_3
layout(location=ATTRIBUTE_POSITION_3) in vec3 a_Position_3;
#endif
#ifdef ATTRIBUTE_POSITION_4
layout(location=ATTRIBUTE_POSITION_4) in vec3 a_Position_4;
#endif

#ifdef ATTRIBUTE_NORMAL
  layout(location=ATTRIBUTE_NORMAL) in vec3 a_Normal;
  #ifdef ATTRIBUTE_NORMAL_1
  layout(location=ATTRIBUTE_NORMAL_1) in vec3 a_Normal_1;
  #endif
  #ifdef ATTRIBUTE_NORMAL_2
  layout(location=ATTRIBUTE_NORMAL_2) in vec3 a_Normal_2;
  #endif
  #ifdef ATTRIBUTE_NORMAL_3
  layout(location=ATTRIBUTE_NORMAL_3) in vec3 a_Normal_3;
  #endif
  #ifdef ATTRIBUTE_NORMAL_4
  layout(location=ATTRIBUTE_NORMAL_4) in vec3 a_Normal_4;
  #endif

  #ifdef ATTRIBUTE_TANGENT
    layout(location=ATTRIBUTE_TANGENT) in vec4 a_Tangent;
    #ifdef ATTRIBUTE_TANGENT_1
    layout(location=ATTRIBUTE_TANGENT_1) in vec3 a_Tangent_1;
    #endif
    #ifdef ATTRIBUTE_TANGENT_2
    layout(location=ATTRIBUTE_TANGENT_2) in vec3 a_Tangent_1;
    #endif
    #ifdef ATTRIBUTE_TANGENT_3
    layout(location=ATTRIBUTE_TANGENT_3) in vec3 a_Tangent_1;
    #endif
    #ifdef ATTRIBUTE_TANGENT_4
    layout(location=ATTRIBUTE_TANGENT_4) in vec3 a_Tangent_1;
    #endif

    out mat3 v_TBN;
  #else
    out vec3 v_Normal;
  #endif
#endif

#if defined ATTRIBUTE_POSITION_1 || defined ATTRIBUTE_NORMAL_1 || defined ATTRIBUTE_TANGENT_1
uniform vec4 u_MorphWeights;
#endif

#ifdef ATTRIBUTE_TEXCOORD_0
layout(location=ATTRIBUTE_TEXCOORD_0) in vec2 a_TexCoord_0;
#endif
#ifdef ATTRIBUTE_TEXCOORD_1
layout(location=ATTRIBUTE_TEXCOORD_1) in vec2 a_TexCoord_1;
#endif
#ifdef ATTRIBUTE_TEXCOORD_2
layout(location=ATTRIBUTE_TEXCOORD_2) in vec2 a_TexCoord_2;
#endif
#ifdef ATTRIBUTE_TEXCOORD_3
layout(location=ATTRIBUTE_TEXCOORD_3) in vec2 a_TexCoord_3;
out vec2 v_TexCoord[4];
#elif defined ATTRIBUTE_TEXCOORD_2
out vec2 v_TexCoord[3];
#elif defined ATTRIBUTE_TEXCOORD_1
out vec2 v_TexCoord[2];
#elif defined ATTRIBUTE_TEXCOORD_0
out vec2 v_TexCoord[1];
#endif

#ifdef ATTRIBUTE_COLOR_0
layout(location=ATTRIBUTE_COLOR_0) in vec4 a_Color_0;
out vec4 v_Color;
#endif
#ifdef ATTRIBUTE_COLOR_1
layout(location=ATTRIBUTE_COLOR_1) in vec4 a_Color_1;
#endif

#ifdef ATTRIBUTE_JOINTS_0
layout(location=ATTRIBUTE_JOINTS_0) in uvec4 a_Joints_0;
#endif
#ifdef ATTRIBUTE_JOINTS_1
layout(location=ATTRIBUTE_JOINTS_1) in uvec4 a_Joints_1;
#endif
#ifdef ATTRIBUTE_WEIGHTS_0
layout(location=ATTRIBUTE_WEIGHTS_0) in vec4 a_Weights_0;
#endif
#ifdef ATTRIBUTE_WEIGHTS_1
layout(location=ATTRIBUTE_WEIGHTS_1) in vec4 a_Weights_1;
#endif

#ifdef NUM_SKIN_MATRICES
uniform mat4 u_SkinMatrices[NUM_SKIN_MATRICES];
#else
uniform mat4 u_ModelMatrix;
uniform mat3 u_NormalMatrix;
#endif

${declarations}

void main() {
#ifdef NUM_SKIN_MATRICES
  mat4 u_ModelMatrix =
    a_Weights_0.x * u_SkinMatrices[a_JOINTS_0.x] +
    a_Weights_0.y * u_SkinMatrices[a_JOINTS_0.y] +
    a_Weights_0.z * u_SkinMatrices[a_JOINTS_0.z] +
    a_Weights_0.w * u_SkinMatrices[a_JOINTS_0.w];
#ifdef ATTRIBUTE_JOINTS_1
  u_ModelMatrix +=
    a_Weights_1.x * u_SkinMatrices[a_JOINTS_1.x] +
    a_Weights_1.y * u_SkinMatrices[a_JOINTS_1.y] +
    a_Weights_1.z * u_SkinMatrices[a_JOINTS_1.z] +
    a_Weights_1.w * u_SkinMatrices[a_JOINTS_1.w];
#endif
#ifdef ATTRIBUTE_NORMAL
  mat3 u_NormalMatrix = transpose(inverse(mat3(u_ModelMatrix)));
#endif
#endif

  vec3 pos = a_Position;
#ifdef ATTRIBUTE_POSITION_1
  pos += a_Position_1 * u_MorphWeights.x;
#endif
#ifdef ATTRIBUTE_POSITION_2
  pos += a_Position_2 * u_MorphWeights.y;
#endif
#ifdef ATTRIBUTE_POSITION_3
  pos += a_Position_3 * u_MorphWeights.z;
#endif
#ifdef ATTRIBUTE_POSITION_4
  pos += a_Position_4 * u_MorphWeights.w;
#endif
  vec4 posW = u_ModelMatrix * vec4(pos, 1.0);
  v_Position = posW.xyz / posW.w;

#ifdef ATTRIBUTE_NORMAL
  vec3 normal = a_Normal;
#ifdef ATTRIBUTE_NORMAL_1
  normal += a_Normal_1 * u_MorphWeights.x;
#endif
#ifdef ATTRIBUTE_NORMAL_2
  normal += a_Normal_2 * u_MorphWeights.y;
#endif
#ifdef ATTRIBUTE_NORMAL_3
  normal += a_Normal_3 * u_MorphWeights.z;
#endif
#ifdef ATTRIBUTE_NORMAL_4
  normal += a_Normal_4 * u_MorphWeights.w;
#endif
  normal = normalize(u_NormalMatrix * normal);

#ifdef ATTRIBUTE_TANGENT
  vec3 tangent = a_Tangent.xyz;
#ifdef ATTRIBUTE_TANGENT_1
  tangent += a_Tangent_1 * u_MorphWeights.x;
#endif
#ifdef ATTRIBUTE_TANGENT_2
  tangent += a_Tangent_2 * u_MorphWeights.y;
#endif
#ifdef ATTRIBUTE_TANGENT_3
  tangent += a_Tangent_3 * u_MorphWeights.z;
#endif
#ifdef ATTRIBUTE_TANGENT_4
  tangent += a_Tangent_4 * u_MorphWeights.w;
#endif
  tangent = normalize(vec3(u_ModelMatrix * vec4(tangent, 0.0)));
  vec3 bitangent = cross(normal, tangent) * a_Tangent.w;
  v_TBN = mat3(tangent, bitangent, normal);
#else
  v_Normal = normal;
#endif
#endif

#ifdef ATTRIBUTE_TEXCOORD_0
  v_TexCoord[0] = a_TexCoord_0;
#endif
#ifdef ATTRIBUTE_TEXCOORD_1
  v_TexCoord[1] = a_TexCoord_1;
#endif
#ifdef ATTRIBUTE_TEXCOORD_2
  v_TexCoord[2] = a_TexCoord_2;
#endif
#ifdef ATTRIBUTE_TEXCOORD_3
  v_TexCoord[3] = a_TexCoord_3;
#endif

#ifdef ATTRIBUTE_COLOR_0
  v_Color = a_Color_0;
#ifdef ATTRIBUTE_COLOR_1
  v_Color *= a_Color_1;
#endif
#endif

  ${output_func}
}
