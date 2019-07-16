in vec3 v_Position;
#ifdef ATTRIBUTE_NORMAL
  #ifdef ATTRIBUTE_TANGENT
    in mat3 v_TBN;
  #else
    in vec3 v_Normal;
  #endif
#endif

#ifdef ATTRIBUTE_TEXCOORD_3
in vec2 v_TexCoord[4];
#define ATTRIBUTE_TEXCOORD_COUNT 4
#elif defined ATTRIBUTE_TEXCOORD_2
in vec2 v_TexCoord[3];
#define ATTRIBUTE_TEXCOORD_COUNT 3
#elif defined ATTRIBUTE_TEXCOORD_1
in vec2 v_TexCoord[2];
#define ATTRIBUTE_TEXCOORD_COUNT 2
#elif defined ATTRIBUTE_TEXCOORD_0
in vec2 v_TexCoord[1];
#define ATTRIBUTE_TEXCOORD_COUNT 1
#else
#define ATTRIBUTE_TEXCOORD_COUNT 0
#endif

#ifdef ATTRIBUTE_COLOR_0
in vec4 v_Color;
#endif
