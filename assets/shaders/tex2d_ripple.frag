#version 100

precision mediump float;
uniform sampler2D texture;
uniform float alpha;
varying vec2 st;
uniform float time;
uniform float amplitude;
uniform float frequency;
uniform vec2 center;

void main() {

    vec2 p = st - center;
    float len = length(p);
    float ripple = sin(len * frequency - time) * amplitude;
    vec2 uv = st + (p / max(len, 1e-4)) * ripple;
    vec4 dst = texture2D(texture,uv);
    gl_FragColor = dst * alpha;
}

