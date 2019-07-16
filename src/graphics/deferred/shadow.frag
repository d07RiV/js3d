#version 300 es
precision mediump float;

in float depth;
out vec4 fragColor;

#define SHADOW_MID -0.5
#define SHADOW_PADDING 0.5

vec2 moments(float depth) {
  float dx = dFdx(depth);
  float dy = dFdy(depth);
  return vec2(depth, depth * depth + 0.25 * (dx * dx + dy * dy));
}

void main() {
  vec2 mom0 = moments(min(depth, SHADOW_MID + SHADOW_PADDING));
  vec2 mom1 = moments(max(depth, SHADOW_MID - SHADOW_PADDING));
  fragColor = vec4(mom0, mom1);
}
