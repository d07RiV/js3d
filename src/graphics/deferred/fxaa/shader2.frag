uniform sampler2D u_Texture;

layout(location=0) out vec4 o_Color;

float rgb2luma(vec3 rgb) {
  return sqrt(dot(rgb, vec3(0.299, 0.587, 0.144)));
}

#define EDGE_THRESHOLD_MIN 0.0312
#define EDGE_THRESHOLD_MAX 0.125
#define ITERATIONS 12
float QUALITY(int i) {
  if (i < 5) {
    return 1.0;
  } else if (i == 5) {
    return 1.5;
  } else if (i < 10) {
    return 2.0;
  } else if (i == 10) {
    return 4.0;
  } else {
    return 8.0;
  }
}
#define SUBPIXEL_QUALITY 0.75

void main() {
  vec2 rcpFrame = 1.0 / vec2(textureSize(u_Texture, 0));
  vec2 coord = gl_FragCoord.xy * rcpFrame;

  vec4 texColor = texture(u_Texture, coord);
  float lumaM = rgb2luma(texColor.xyz);

  float lumaN = rgb2luma(texture(u_Texture, coord + vec2(0, -rcpFrame.y)).xyz);
  float lumaW = rgb2luma(texture(u_Texture, coord + vec2(-rcpFrame.x, 0)).xyz);
  float lumaE = rgb2luma(texture(u_Texture, coord + vec2(rcpFrame.y, 0)).xyz);
  float lumaS = rgb2luma(texture(u_Texture, coord + vec2(0, rcpFrame.y)).xyz);

  float lumaMin = min(lumaM, min(min(lumaN, lumaS), min(lumaW, lumaE)));
  float lumaMax = max(lumaM, max(max(lumaN, lumaS), max(lumaW, lumaE)));

  float lumaRange = lumaMax - lumaMin;
  if (lumaRange < max(EDGE_THRESHOLD_MIN, lumaMax * EDGE_THRESHOLD_MAX)) {
    fragColor = texColor;
    return;
  }

  float lumaNW = rgb2luma(texture(u_Texture, coord - rcpFrame).xyz);
  float lumaNE = rgb2luma(texture(u_Texture, coord + vec2(rcpFrame.x, -rcpFrame.y)).xyz);
  float lumaSW = rgb2luma(texture(u_Texture, coord + vec2(-rcpFrame.x, rcpFrame.y)).xyz);
  float lumaSE = rgb2luma(texture(u_Texture, coord - rcpFrame).xyz);

  float lumaNS = lumaN + lumaS;
  float lumaWE = lumaE + lumaW;

  float lumaNc = lumaNW + lumaNE;
  float lumaWc = lumaNW + lumaSW;
  float lumaEc = lumaNE + lumaSE;
  float lumaSc = lumaSW + lumaSE;

  float edgeNS = abs(-2.0 * lumaN + lumaNc) + abs(-2.0 * lumaM + lumaWE) + abs(-2.0 * lumaS + lumaSc);
  float edgeWE = abs(-2.0 * lumaW + lumaWc) + abs(-2.0 * lumaM + lumaNS) + abs(-2.0 * lumaE + lumaEc);

  bool horizontal = edgeWE >= edgeNS;

  float luma1 = horizontal ? lumaN : lumaW;
  float luma2 = horizontal ? lumaS : lumaE;

  float grad1 = luma1 - lumaM;
  float grad2 = luma2 - lumaM;

  bool steep1 = abs(grad1) >= abs(grad2);

  float gradScaled = 0.25 * max(abs(grad1), abs(grad2));

  float stepLength = horizontal ? rcpFrame.y : rcpFrame.x;

  float lumaLocalAverage = 0.0;

  if (steep1) {
    stepLength = -stepLength;
    lumaLocalAverage = 0.5 * (luma1 + lumaM);
  } else {
    lumaLocalAverage = 0.5 * (luma2 + lumaM);
  }

  vec2 pos = coord;
  if (horizontal) {
    pos.y += stepLength * 0.5;
  } else {
    pos.x += stepLength * 0.5;
  }

  vec2 offset = horizontal ? vec2(rcpFrame.x, 0.0) : vec2(0.0, rcpFrame.y);
  vec2 pos1 = pos - offset;
  vec2 pos2 = pos + offset;

  float lumaEnd1 = rgb2luma(texture(u_Texture, pos1).xyz);
  float lumaEnd2 = rgb2luma(texture(u_Texture, pos2).xyz);
  lumaEnd1 -= lumaLocalAverage;
  lumaEnd2 -= lumaLocalAverage;

  bool reached1 = abs(lumaEnd1) >= gradScaled;
  bool reached2 = abs(lumaEnd2) >= gradScaled;
  bool reachedBoth = reached1 && reached2;

  if (!reached1) {
    pos1 -= offset;
  }
  if (!reached2) {
    pos2 += offset;
  }

  if (!reachedBoth) {
    for (int i = 2; i < ITERATIONS; i++) {
      if (!reached1) {
        lumaEnd1 = rgb2luma(texture(u_Texture, pos1).xyz);
        lumaEnd1 -= lumaLocalAverage;
      }
      if (!reached2) {
        lumaEnd2 = rgb2luma(texture(u_Texture, pos2).xyz);
        lumaEnd2 -= lumaLocalAverage;
      }

      reached1 = abs(lumaEnd1) >= gradScaled;
      reached2 = abs(lumaEnd2) >= gradScaled;
      reachedBoth = reached1 && reached2;

      if (!reached1) {
        pos1 -= offset * QUALITY(i);
      }
      if (!reached2) {
        pos2 += offset * QUALITY(i);
      }

      if (reachedBoth) {
        break;
      }
    }
  }

  float dist1 = horizontal ? coord.x - pos1.x : coord.y - pos1.y;
  float dist2 = horizontal ? pos2.x - coord.x : pos2.y - coord.y;

  bool isDirection1 = dist1 < dist2;
  float distFinal = min(dist1, dist2);

  float thickness = dist1 + dist2;
  float pixelOffset = -distFinal / thickness + 0.5;

  bool centerSmaller = lumaM < lumaLocalAverage;
  bool correctVariation = ((isDirection1 ? lumaEnd1 : lumaEnd2) < 0.0) != centerSmaller;
  float finalOffset = correctVariation ? pixelOffset : 0.0;

  float lumaAverage = (1.0 / 12.0) * (2.0 * (lumaNS + lumaWE) + lumaWc + lumaEc);
  float subOffset1 = clamp(abs(lumaAverage - lumaM) / lumaRange, 0.0, 1.0);
  float subOffset2 = (-2.0 * subOffset1 + 3.0) * subOffset1 * subOffset1;
  float subOffsetFinal = subOffset2 * subOffset2 * SUBPIXEL_QUALITY;

  finalOffset = max(finalOffset, subOffsetFinal);

  vec2 finalPos = coord;
  if (horizontal) {
    finalPos.y += finalOffset * stepLength;
  } else {
    finalPos.x += finalOffset * stepLength;
  }

  vec3 finalColor = texture(u_Texture, finalPos).xyz;
  o_Color = vec4(finalColor, texColor.w);
}
