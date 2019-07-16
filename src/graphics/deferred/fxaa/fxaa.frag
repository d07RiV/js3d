/*============================================================================


                    NVIDIA FXAA 3.11 by TIMOTHY LOTTES


------------------------------------------------------------------------------
COPYRIGHT (C) 2010, 2011 NVIDIA CORPORATION. ALL RIGHTS RESERVED.
------------------------------------------------------------------------------
TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THIS SOFTWARE IS PROVIDED
*AS IS* AND NVIDIA AND ITS SUPPLIERS DISCLAIM ALL WARRANTIES, EITHER EXPRESS
OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE. IN NO EVENT SHALL NVIDIA
OR ITS SUPPLIERS BE LIABLE FOR ANY SPECIAL, INCIDENTAL, INDIRECT, OR
CONSEQUENTIAL DAMAGES WHATSOEVER (INCLUDING, WITHOUT LIMITATION, DAMAGES FOR
LOSS OF BUSINESS PROFITS, BUSINESS INTERRUPTION, LOSS OF BUSINESS INFORMATION,
OR ANY OTHER PECUNIARY LOSS) ARISING OUT OF THE USE OF OR INABILITY TO USE
THIS SOFTWARE, EVEN IF NVIDIA HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH
DAMAGES.

============================================================================*/

    // Choose the amount of sub-pixel aliasing removal.
    // This can effect sharpness.
    //   1.00 - upper limit (softer)
    //   0.75 - default amount of filtering
    //   0.50 - lower limit (sharper, less sub-pixel aliasing removal)
    //   0.25 - almost off
    //   0.00 - completely off
#define FXAA_QUALITY_SUBPIX 0.75
    // The minimum amount of local contrast required to apply algorithm.
    //   0.333 - too little (faster)
    //   0.250 - low quality
    //   0.166 - default
    //   0.125 - high quality 
    //   0.063 - overkill (slower)
#define FXAA_QUALITY_EDGE_THRESHOLD 0.166
    // Trims the algorithm from processing darks.
    //   0.0833 - upper limit (default, the start of visible unfiltered edges)
    //   0.0625 - high quality (faster)
    //   0.0312 - visible limit (slower)
#define FXAA_QUALITY_EDGE_THRESHOLD_MIN 0.0833

/*============================================================================

                           FXAA QUALITY - PRESETS

============================================================================*/

/*============================================================================
                     FXAA QUALITY - MEDIUM DITHER PRESETS
============================================================================*/
#if FXAA_QUALITY_PRESET <= 10
  #define FXAA_QUALITY_PS 3
  #define FXAA_QUALITY_P0 1.5
  #define FXAA_QUALITY_P1 3.0
  #define FXAA_QUALITY_P2 12.0
#endif
#if FXAA_QUALITY_PRESET == 11
  #define FXAA_QUALITY_PS 4
  #define FXAA_QUALITY_P0 1.0
  #define FXAA_QUALITY_P1 1.5
  #define FXAA_QUALITY_P2 3.0
  #define FXAA_QUALITY_P3 12.0
#endif
#if FXAA_QUALITY_PRESET == 12
  #define FXAA_QUALITY_PS 5
  #define FXAA_QUALITY_P0 1.0
  #define FXAA_QUALITY_P1 1.5
  #define FXAA_QUALITY_P2 2.0
  #define FXAA_QUALITY_P3 4.0
  #define FXAA_QUALITY_P4 12.0
#endif
#if FXAA_QUALITY_PRESET == 13
  #define FXAA_QUALITY_PS 6
  #define FXAA_QUALITY_P0 1.0
  #define FXAA_QUALITY_P1 1.5
  #define FXAA_QUALITY_P2 2.0
  #define FXAA_QUALITY_P3 2.0
  #define FXAA_QUALITY_P4 4.0
  #define FXAA_QUALITY_P5 12.0
#endif
#if FXAA_QUALITY_PRESET == 14
  #define FXAA_QUALITY_PS 7
  #define FXAA_QUALITY_P0 1.0
  #define FXAA_QUALITY_P1 1.5
  #define FXAA_QUALITY_P2 2.0
  #define FXAA_QUALITY_P3 2.0
  #define FXAA_QUALITY_P4 2.0
  #define FXAA_QUALITY_P5 4.0
  #define FXAA_QUALITY_P6 12.0
#endif
#if FXAA_QUALITY_PRESET >= 15 && FXAA_QUALITY_PRESET <= 19
  #define FXAA_QUALITY_PS 8
  #define FXAA_QUALITY_P0 1.0
  #define FXAA_QUALITY_P1 1.5
  #define FXAA_QUALITY_P2 2.0
  #define FXAA_QUALITY_P3 2.0
  #define FXAA_QUALITY_P4 2.0
  #define FXAA_QUALITY_P5 2.0
  #define FXAA_QUALITY_P6 4.0
  #define FXAA_QUALITY_P7 12.0
#endif

/*============================================================================
                     FXAA QUALITY - LOW DITHER PRESETS
============================================================================*/
#if FXAA_QUALITY_PRESET == 20
  #define FXAA_QUALITY_PS 3
  #define FXAA_QUALITY_P0 1.5
  #define FXAA_QUALITY_P1 2.0
  #define FXAA_QUALITY_P2 8.0
#endif
#if FXAA_QUALITY_PRESET == 21
  #define FXAA_QUALITY_PS 4
  #define FXAA_QUALITY_P0 1.0
  #define FXAA_QUALITY_P1 1.5
  #define FXAA_QUALITY_P2 2.0
  #define FXAA_QUALITY_P3 8.0
#endif
#if FXAA_QUALITY_PRESET == 22
  #define FXAA_QUALITY_PS 5
  #define FXAA_QUALITY_P0 1.0
  #define FXAA_QUALITY_P1 1.5
  #define FXAA_QUALITY_P2 2.0
  #define FXAA_QUALITY_P3 2.0
  #define FXAA_QUALITY_P4 8.0
#endif
#if FXAA_QUALITY_PRESET == 23
  #define FXAA_QUALITY_PS 6
  #define FXAA_QUALITY_P0 1.0
  #define FXAA_QUALITY_P1 1.5
  #define FXAA_QUALITY_P2 2.0
  #define FXAA_QUALITY_P3 2.0
  #define FXAA_QUALITY_P4 2.0
  #define FXAA_QUALITY_P5 8.0
#endif
#if FXAA_QUALITY_PRESET == 24
  #define FXAA_QUALITY_PS 7
  #define FXAA_QUALITY_P0 1.0
  #define FXAA_QUALITY_P1 1.5
  #define FXAA_QUALITY_P2 2.0
  #define FXAA_QUALITY_P3 2.0
  #define FXAA_QUALITY_P4 2.0
  #define FXAA_QUALITY_P5 3.0
  #define FXAA_QUALITY_P6 8.0
#endif
#if FXAA_QUALITY_PRESET == 25
  #define FXAA_QUALITY_PS 8
  #define FXAA_QUALITY_P0 1.0
  #define FXAA_QUALITY_P1 1.5
  #define FXAA_QUALITY_P2 2.0
  #define FXAA_QUALITY_P3 2.0
  #define FXAA_QUALITY_P4 2.0
  #define FXAA_QUALITY_P5 2.0
  #define FXAA_QUALITY_P6 4.0
  #define FXAA_QUALITY_P7 8.0
#endif
#if FXAA_QUALITY_PRESET == 26
  #define FXAA_QUALITY_PS 9
  #define FXAA_QUALITY_P0 1.0
  #define FXAA_QUALITY_P1 1.5
  #define FXAA_QUALITY_P2 2.0
  #define FXAA_QUALITY_P3 2.0
  #define FXAA_QUALITY_P4 2.0
  #define FXAA_QUALITY_P5 2.0
  #define FXAA_QUALITY_P6 2.0
  #define FXAA_QUALITY_P7 4.0
  #define FXAA_QUALITY_P8 8.0
#endif
#if FXAA_QUALITY_PRESET == 27
  #define FXAA_QUALITY_PS 10
  #define FXAA_QUALITY_P0 1.0
  #define FXAA_QUALITY_P1 1.5
  #define FXAA_QUALITY_P2 2.0
  #define FXAA_QUALITY_P3 2.0
  #define FXAA_QUALITY_P4 2.0
  #define FXAA_QUALITY_P5 2.0
  #define FXAA_QUALITY_P6 2.0
  #define FXAA_QUALITY_P7 2.0
  #define FXAA_QUALITY_P8 4.0
  #define FXAA_QUALITY_P9 8.0
#endif
#if FXAA_QUALITY_PRESET == 28
  #define FXAA_QUALITY_PS 11
  #define FXAA_QUALITY_P0 1.0
  #define FXAA_QUALITY_P1 1.5
  #define FXAA_QUALITY_P2 2.0
  #define FXAA_QUALITY_P3 2.0
  #define FXAA_QUALITY_P4 2.0
  #define FXAA_QUALITY_P5 2.0
  #define FXAA_QUALITY_P6 2.0
  #define FXAA_QUALITY_P7 2.0
  #define FXAA_QUALITY_P8 2.0
  #define FXAA_QUALITY_P9 4.0
  #define FXAA_QUALITY_P10 8.0
#endif
#if FXAA_QUALITY_PRESET == 29
  #define FXAA_QUALITY_PS 12
  #define FXAA_QUALITY_P0 1.0
  #define FXAA_QUALITY_P1 1.5
  #define FXAA_QUALITY_P2 2.0
  #define FXAA_QUALITY_P3 2.0
  #define FXAA_QUALITY_P4 2.0
  #define FXAA_QUALITY_P5 2.0
  #define FXAA_QUALITY_P6 2.0
  #define FXAA_QUALITY_P7 2.0
  #define FXAA_QUALITY_P8 2.0
  #define FXAA_QUALITY_P9 2.0
  #define FXAA_QUALITY_P10 4.0
  #define FXAA_QUALITY_P11 8.0
#endif

/*============================================================================
                     FXAA QUALITY - EXTREME QUALITY
============================================================================*/
#if FXAA_QUALITY_PRESET >= 30
  #define FXAA_QUALITY_PS 12
  #define FXAA_QUALITY_P0 1.0
  #define FXAA_QUALITY_P1 1.0
  #define FXAA_QUALITY_P2 1.0
  #define FXAA_QUALITY_P3 1.0
  #define FXAA_QUALITY_P4 1.0
  #define FXAA_QUALITY_P5 1.5
  #define FXAA_QUALITY_P6 2.0
  #define FXAA_QUALITY_P7 2.0
  #define FXAA_QUALITY_P8 2.0
  #define FXAA_QUALITY_P9 2.0
  #define FXAA_QUALITY_P10 4.0
  #define FXAA_QUALITY_P11 8.0
#endif

float FxaaLuma(vec4 rgba) {
  return sqrt(dot(rgba.xyz, vec3(0.299, 0.587, 0.144)));
}

vec4 FxaaPixelShader(vec2 pos, sampler2D tex, vec2 rcpFrame) {
  vec2 posM;
  posM.x = pos.x;
  posM.y = pos.y;
  vec4 rgbyM = textureLod(tex, posM, 0.0);
  float lumaM = FxaaLuma(rgbyM);
  float lumaS = FxaaLuma(textureLodOffset(tex, posM, 0.0, ivec2( 0, 1)));
  float lumaE = FxaaLuma(textureLodOffset(tex, posM, 0.0, ivec2( 1, 0)));
  float lumaN = FxaaLuma(textureLodOffset(tex, posM, 0.0, ivec2( 0,-1)));
  float lumaW = FxaaLuma(textureLodOffset(tex, posM, 0.0, ivec2(-1, 0)));

  float maxSM = max(lumaS, lumaM);
  float minSM = min(lumaS, lumaM);
  float maxESM = max(lumaE, maxSM);
  float minESM = min(lumaE, minSM);
  float maxWN = max(lumaN, lumaW);
  float minWN = min(lumaN, lumaW);
  float rangeMax = max(maxWN, maxESM);
  float rangeMin = min(minWN, minESM);
  float rangeMaxScaled = rangeMax * FXAA_QUALITY_EDGE_THRESHOLD;
  float range = rangeMax - rangeMin;
  float rangeMaxClamped = max(FXAA_QUALITY_EDGE_THRESHOLD_MIN, rangeMaxScaled);

  if (range < rangeMaxClamped) {
    return rgbyM;
  }

  float lumaNW = FxaaLuma(textureLodOffset(tex, posM, 0.0, ivec2(-1,-1)));
  float lumaSE = FxaaLuma(textureLodOffset(tex, posM, 0.0, ivec2( 1, 1)));
  float lumaNE = FxaaLuma(textureLodOffset(tex, posM, 0.0, ivec2( 1,-1)));
  float lumaSW = FxaaLuma(textureLodOffset(tex, posM, 0.0, ivec2(-1, 1)));

  float lumaNS = lumaN + lumaS;
  float lumaWE = lumaW + lumaE;
  float subpixRcpRange = 1.0/range;
  float subpixNSWE = lumaNS + lumaWE;
  float edgeHorz1 = (-2.0 * lumaM) + lumaNS;
  float edgeVert1 = (-2.0 * lumaM) + lumaWE;

  float lumaNESE = lumaNE + lumaSE;
  float lumaNWNE = lumaNW + lumaNE;
  float edgeHorz2 = (-2.0 * lumaE) + lumaNESE;
  float edgeVert2 = (-2.0 * lumaN) + lumaNWNE;

  float lumaNWSW = lumaNW + lumaSW;
  float lumaSWSE = lumaSW + lumaSE;
  float edgeHorz4 = (abs(edgeHorz1) * 2.0) + abs(edgeHorz2);
  float edgeVert4 = (abs(edgeVert1) * 2.0) + abs(edgeVert2);
  float edgeHorz3 = (-2.0 * lumaW) + lumaNWSW;
  float edgeVert3 = (-2.0 * lumaS) + lumaSWSE;
  float edgeHorz = abs(edgeHorz3) + edgeHorz4;
  float edgeVert = abs(edgeVert3) + edgeVert4;

  float subpixNWSWNESE = lumaNWSW + lumaNESE;
  float lengthSign = rcpFrame.x;
  bool horzSpan = edgeHorz >= edgeVert;
  float subpixA = subpixNSWE * 2.0 + subpixNWSWNESE;

  if (!horzSpan) lumaN = lumaW;
  if (!horzSpan) lumaS = lumaE;
  if (horzSpan) lengthSign = rcpFrame.y;
  float subpixB = (subpixA * (1.0/12.0)) - lumaM;

  float gradientN = lumaN - lumaM;
  float gradientS = lumaS - lumaM;
  float lumaNN = lumaN + lumaM;
  float lumaSS = lumaS + lumaM;
  bool pairN = abs(gradientN) >= abs(gradientS);
  float gradient = max(abs(gradientN), abs(gradientS));
  if (pairN) lengthSign = -lengthSign;
  float subpixC = clamp(abs(subpixB) * subpixRcpRange, 0.0, 1.0);

  vec2 posB;
  posB.x = posM.x;
  posB.y = posM.y;
  vec2 offNP;
  offNP.x = (!horzSpan) ? 0.0 : rcpFrame.x;
  offNP.y = ( horzSpan) ? 0.0 : rcpFrame.y;
  if (!horzSpan) posB.x += lengthSign * 0.5;
  if ( horzSpan) posB.y += lengthSign * 0.5;

  vec2 posN;
  posN.x = posB.x - offNP.x * FXAA_QUALITY_P0;
  posN.y = posB.y - offNP.y * FXAA_QUALITY_P0;
  vec2 posP;
  posP.x = posB.x + offNP.x * FXAA_QUALITY_P0;
  posP.y = posB.y + offNP.y * FXAA_QUALITY_P0;
  float subpixD = ((-2.0)*subpixC) + 3.0;
  float lumaEndN = FxaaLuma(textureLod(tex, posN, 0.0));
  float subpixE = subpixC * subpixC;
  float lumaEndP = FxaaLuma(textureLod(tex, posP, 0.0));

  if (!pairN) lumaNN = lumaSS;
  float gradientScaled = gradient * 1.0/4.0;
  float lumaMM = lumaM - lumaNN * 0.5;
  float subpixF = subpixD * subpixE;
  bool lumaMLTZero = lumaMM < 0.0;

  lumaEndN -= lumaNN * 0.5;
  lumaEndP -= lumaNN * 0.5;
  bool doneN = abs(lumaEndN) >= gradientScaled;
  bool doneP = abs(lumaEndP) >= gradientScaled;
  if (!doneN) posN.x -= offNP.x * FXAA_QUALITY_P1;
  if (!doneN) posN.y -= offNP.y * FXAA_QUALITY_P1;
  bool doneNP = (!doneN) || (!doneP);
  if (!doneP) posP.x += offNP.x * FXAA_QUALITY_P1;
  if (!doneP) posP.y += offNP.y * FXAA_QUALITY_P1;

  if (doneNP) {
    if (!doneN) lumaEndN = FxaaLuma(textureLod(tex, posN.xy, 0.0));
    if (!doneP) lumaEndP = FxaaLuma(textureLod(tex, posP.xy, 0.0));
    if (!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;
    if (!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;
    doneN = abs(lumaEndN) >= gradientScaled;
    doneP = abs(lumaEndP) >= gradientScaled;
    if (!doneN) posN.x -= offNP.x * FXAA_QUALITY_P2;
    if (!doneN) posN.y -= offNP.y * FXAA_QUALITY_P2;
    doneNP = (!doneN) || (!doneP);
    if (!doneP) posP.x += offNP.x * FXAA_QUALITY_P2;
    if (!doneP) posP.y += offNP.y * FXAA_QUALITY_P2;

    #if FXAA_QUALITY_PS > 3
    if (doneNP) {
      if (!doneN) lumaEndN = FxaaLuma(textureLod(tex, posN.xy, 0.0));
      if (!doneP) lumaEndP = FxaaLuma(textureLod(tex, posP.xy, 0.0));
      if (!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;
      if (!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;
      doneN = abs(lumaEndN) >= gradientScaled;
      doneP = abs(lumaEndP) >= gradientScaled;
      if (!doneN) posN.x -= offNP.x * FXAA_QUALITY_P3;
      if (!doneN) posN.y -= offNP.y * FXAA_QUALITY_P3;
      doneNP = (!doneN) || (!doneP);
      if (!doneP) posP.x += offNP.x * FXAA_QUALITY_P3;
      if (!doneP) posP.y += offNP.y * FXAA_QUALITY_P3;

      #if FXAA_QUALITY_PS > 4
      if (doneNP) {
        if (!doneN) lumaEndN = FxaaLuma(textureLod(tex, posN.xy, 0.0));
        if (!doneP) lumaEndP = FxaaLuma(textureLod(tex, posP.xy, 0.0));
        if (!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;
        if (!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;
        doneN = abs(lumaEndN) >= gradientScaled;
        doneP = abs(lumaEndP) >= gradientScaled;
        if (!doneN) posN.x -= offNP.x * FXAA_QUALITY_P4;
        if (!doneN) posN.y -= offNP.y * FXAA_QUALITY_P4;
        doneNP = (!doneN) || (!doneP);
        if (!doneP) posP.x += offNP.x * FXAA_QUALITY_P4;
        if (!doneP) posP.y += offNP.y * FXAA_QUALITY_P4;

        #if FXAA_QUALITY_PS > 5
        if (doneNP) {
          if (!doneN) lumaEndN = FxaaLuma(textureLod(tex, posN.xy, 0.0));
          if (!doneP) lumaEndP = FxaaLuma(textureLod(tex, posP.xy, 0.0));
          if (!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;
          if (!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;
          doneN = abs(lumaEndN) >= gradientScaled;
          doneP = abs(lumaEndP) >= gradientScaled;
          if (!doneN) posN.x -= offNP.x * FXAA_QUALITY_P5;
          if (!doneN) posN.y -= offNP.y * FXAA_QUALITY_P5;
          doneNP = (!doneN) || (!doneP);
          if (!doneP) posP.x += offNP.x * FXAA_QUALITY_P5;
          if (!doneP) posP.y += offNP.y * FXAA_QUALITY_P5;

          #if FXAA_QUALITY_PS > 6
          if (doneNP) {
            if (!doneN) lumaEndN = FxaaLuma(textureLod(tex, posN.xy, 0.0));
            if (!doneP) lumaEndP = FxaaLuma(textureLod(tex, posP.xy, 0.0));
            if (!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;
            if (!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;
            doneN = abs(lumaEndN) >= gradientScaled;
            doneP = abs(lumaEndP) >= gradientScaled;
            if (!doneN) posN.x -= offNP.x * FXAA_QUALITY_P6;
            if (!doneN) posN.y -= offNP.y * FXAA_QUALITY_P6;
            doneNP = (!doneN) || (!doneP);
            if (!doneP) posP.x += offNP.x * FXAA_QUALITY_P6;
            if (!doneP) posP.y += offNP.y * FXAA_QUALITY_P6;

            #if FXAA_QUALITY_PS > 7
            if (doneNP) {
              if (!doneN) lumaEndN = FxaaLuma(textureLod(tex, posN.xy, 0.0));
              if (!doneP) lumaEndP = FxaaLuma(textureLod(tex, posP.xy, 0.0));
              if (!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;
              if (!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;
              doneN = abs(lumaEndN) >= gradientScaled;
              doneP = abs(lumaEndP) >= gradientScaled;
              if (!doneN) posN.x -= offNP.x * FXAA_QUALITY_P7;
              if (!doneN) posN.y -= offNP.y * FXAA_QUALITY_P7;
              doneNP = (!doneN) || (!doneP);
              if (!doneP) posP.x += offNP.x * FXAA_QUALITY_P7;
              if (!doneP) posP.y += offNP.y * FXAA_QUALITY_P7;

              #if FXAA_QUALITY_PS > 8
              if (doneNP) {
                if (!doneN) lumaEndN = FxaaLuma(textureLod(tex, posN.xy, 0.0));
                if (!doneP) lumaEndP = FxaaLuma(textureLod(tex, posP.xy, 0.0));
                if (!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;
                if (!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;
                doneN = abs(lumaEndN) >= gradientScaled;
                doneP = abs(lumaEndP) >= gradientScaled;
                if (!doneN) posN.x -= offNP.x * FXAA_QUALITY_P8;
                if (!doneN) posN.y -= offNP.y * FXAA_QUALITY_P8;
                doneNP = (!doneN) || (!doneP);
                if (!doneP) posP.x += offNP.x * FXAA_QUALITY_P8;
                if (!doneP) posP.y += offNP.y * FXAA_QUALITY_P8;

                #if FXAA_QUALITY_PS > 9
                if (doneNP) {
                  if (!doneN) lumaEndN = FxaaLuma(textureLod(tex, posN.xy, 0.0));
                  if (!doneP) lumaEndP = FxaaLuma(textureLod(tex, posP.xy, 0.0));
                  if (!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;
                  if (!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;
                  doneN = abs(lumaEndN) >= gradientScaled;
                  doneP = abs(lumaEndP) >= gradientScaled;
                  if (!doneN) posN.x -= offNP.x * FXAA_QUALITY_P9;
                  if (!doneN) posN.y -= offNP.y * FXAA_QUALITY_P9;
                  doneNP = (!doneN) || (!doneP);
                  if (!doneP) posP.x += offNP.x * FXAA_QUALITY_P9;
                  if (!doneP) posP.y += offNP.y * FXAA_QUALITY_P9;

                  #if FXAA_QUALITY_PS > 10
                  if (doneNP) {
                    if (!doneN) lumaEndN = FxaaLuma(textureLod(tex, posN.xy, 0.0));
                    if (!doneP) lumaEndP = FxaaLuma(textureLod(tex, posP.xy, 0.0));
                    if (!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;
                    if (!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;
                    doneN = abs(lumaEndN) >= gradientScaled;
                    doneP = abs(lumaEndP) >= gradientScaled;
                    if (!doneN) posN.x -= offNP.x * FXAA_QUALITY_P10;
                    if (!doneN) posN.y -= offNP.y * FXAA_QUALITY_P10;
                    doneNP = (!doneN) || (!doneP);
                    if (!doneP) posP.x += offNP.x * FXAA_QUALITY_P10;
                    if (!doneP) posP.y += offNP.y * FXAA_QUALITY_P10;

                    #if FXAA_QUALITY_PS > 11
                    if (doneNP) {
                      if (!doneN) lumaEndN = FxaaLuma(textureLod(tex, posN.xy, 0.0));
                      if (!doneP) lumaEndP = FxaaLuma(textureLod(tex, posP.xy, 0.0));
                      if (!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;
                      if (!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;
                      doneN = abs(lumaEndN) >= gradientScaled;
                      doneP = abs(lumaEndP) >= gradientScaled;
                      if (!doneN) posN.x -= offNP.x * FXAA_QUALITY_P11;
                      if (!doneN) posN.y -= offNP.y * FXAA_QUALITY_P11;
                      doneNP = (!doneN) || (!doneP);
                      if (!doneP) posP.x += offNP.x * FXAA_QUALITY_P11;
                      if (!doneP) posP.y += offNP.y * FXAA_QUALITY_P11;

                      #if FXAA_QUALITY_PS > 12
                      if (doneNP) {
                        if (!doneN) lumaEndN = FxaaLuma(textureLod(tex, posN.xy, 0.0));
                        if (!doneP) lumaEndP = FxaaLuma(textureLod(tex, posP.xy, 0.0));
                        if (!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;
                        if (!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;
                        doneN = abs(lumaEndN) >= gradientScaled;
                        doneP = abs(lumaEndP) >= gradientScaled;
                        if (!doneN) posN.x -= offNP.x * FXAA_QUALITY_P12;
                        if (!doneN) posN.y -= offNP.y * FXAA_QUALITY_P12;
                        doneNP = (!doneN) || (!doneP);
                        if (!doneP) posP.x += offNP.x * FXAA_QUALITY_P12;
                        if (!doneP) posP.y += offNP.y * FXAA_QUALITY_P12;
                      }
                      #endif
                    }
                    #endif
                  }
                  #endif
                }
                #endif
              }
              #endif
            }
            #endif
          }
          #endif
        }
        #endif
      }
      #endif
    }
    #endif
  }

  float dstN = posM.x - posN.x;
  float dstP = posP.x - posM.x;
  if (!horzSpan) dstN = posM.y - posN.y;
  if (!horzSpan) dstP = posP.y - posM.y;

  bool goodSpanN = (lumaEndN < 0.0) != lumaMLTZero;
  float spanLength = (dstP + dstN);
  bool goodSpanP = (lumaEndP < 0.0) != lumaMLTZero;
  float spanLengthRcp = 1.0/spanLength;

  bool directionN = dstN < dstP;
  float dst = min(dstN, dstP);
  bool goodSpan = directionN ? goodSpanN : goodSpanP;
  float subpixG = subpixF * subpixF;
  float pixelOffset = (dst * (-spanLengthRcp)) + 0.5;
  float subpixH = subpixG * FXAA_QUALITY_SUBPIX;

  float pixelOffsetGood = goodSpan ? pixelOffset : 0.0;
  float pixelOffsetSubpix = max(pixelOffsetGood, subpixH);
  if (!horzSpan) posM.x += pixelOffsetSubpix * lengthSign;
  if ( horzSpan) posM.y += pixelOffsetSubpix * lengthSign;

  return vec4(textureLod(tex, posM, 0.0).xyz, rgbyM.w);
}

uniform sampler2D u_Texture;

layout(location=0) out vec4 o_Color;

void main() {
  vec2 rcpFrame = 1.0 / vec2(textureSize(u_Texture, 0));
  o_Color = FxaaPixelShader(gl_FragCoord.xy * rcpFrame, u_Texture, rcpFrame);
}
