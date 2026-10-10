#version 100
precision mediump float;

uniform float time;
uniform float amplitude;
uniform float frequency;
uniform vec2 center;
varying vec2 st;

void main() {

    vec2 p = st - center;
    float len = length(p);
    float ripple = sin(len * frequency - time) * amplitude;
    vec2 uv = st + (p / len) * ripple;
    gl_FragColor = vec4(uv, 0.5 + 0.5 * ripple, 1.0);
}