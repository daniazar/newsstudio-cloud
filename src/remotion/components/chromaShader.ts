/**
 * src/remotion/components/chromaShader.ts
 *
 * Shared WebGL2 Chroma Keying Shader Pipeline for NewsStudio.
 * Used by both ChromaKeyVideo (video streams) and ChromaKeyImage (static fallback images).
 *
 * Pipeline features:
 * 1. Euclidean Chroma Key Distance thresholding
 * 2. Multi-tap Matte Choke (Erosion) to eradicate green edge halos
 * 3. Optical Spill Suppression (Despill) with skin tone preservation
 * 4. Ambient Studio Light Harmonization (tint matching set plate)
 * 5. Edge Rim Light Injection (subtle cyan/gold contour glow)
 * 6. Boundary Seam Feathering / Crop (eradicates outer 2% compression artifacts)
 */

export const VERTEX_SHADER = `#version 300 es
precision highp float;

in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;

void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
}
`;

export const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_videoTexture;
uniform vec3 u_keyColor;
uniform float u_similarity;
uniform float u_smoothness;
uniform float u_despillStrength;
uniform vec2 u_texelSize;
uniform vec3 u_rimColor;
uniform float u_rimStrength;
uniform vec3 u_ambientTint;

void main() {
    vec2 uv = v_texCoord;
    vec4 videoCol = texture(u_videoTexture, uv);
    
    // 1. Precise Euclidean Chroma Key Distance
    float dist = distance(videoCol.rgb, u_keyColor);
    float maxRB = max(videoCol.r, videoCol.b);
    
    // Soft alpha edge thresholding
    float edgeStart = u_similarity;
    float edgeEnd = u_similarity + u_smoothness;
    float rawAlpha = smoothstep(edgeStart, edgeEnd, dist);
    
    // Multi-tap Matte Choke (Erosion)
    float distL = distance(texture(u_videoTexture, clamp(uv - vec2(u_texelSize.x, 0.0), 0.001, 0.999)).rgb, u_keyColor);
    float distR = distance(texture(u_videoTexture, clamp(uv + vec2(u_texelSize.x, 0.0), 0.001, 0.999)).rgb, u_keyColor);
    float distU = distance(texture(u_videoTexture, clamp(uv - vec2(0.0, u_texelSize.y), 0.001, 0.999)).rgb, u_keyColor);
    float distD = distance(texture(u_videoTexture, clamp(uv + vec2(0.0, u_texelSize.y), 0.001, 0.999)).rgb, u_keyColor);

    float alphaL = smoothstep(edgeStart, edgeEnd, distL);
    float alphaR = smoothstep(edgeStart, edgeEnd, distR);
    float alphaU = smoothstep(edgeStart, edgeEnd, distU);
    float alphaD = smoothstep(edgeStart, edgeEnd, distD);

    float erodedAlpha = min(rawAlpha, min(min(alphaL, alphaR), min(alphaU, alphaD)));
    float alpha = clamp(erodedAlpha, 0.0, 1.0);
    
    // 2. Optical Spill Suppression (Despill)
    vec3 despilled = videoCol.rgb;
    if (videoCol.g > maxRB) {
        despilled.g = mix(videoCol.g, maxRB, u_despillStrength);
    }
    
    // 3. Ambient Studio Light Harmonization
    vec3 tinted = despilled * u_ambientTint;
    
    // 4. Edge Rim Light Injection
    float edgeMask = smoothstep(0.05, 0.65, alpha) * (1.0 - smoothstep(0.70, 0.98, alpha));
    vec3 rimLight = u_rimColor * edgeMask * u_rimStrength;
    
    // 5. Boundary Seam Feathering / Crop
    // Smoothly force alpha to 0.0 at the outer 2.2% margin of the frame.
    vec2 borderDist = min(uv, vec2(1.0) - uv);
    float borderCrop = smoothstep(0.0, 0.022, min(borderDist.x, borderDist.y));
    alpha *= borderCrop;

    vec3 finalRgb = tinted + rimLight;
    
    // WebGL premultiplied alpha output
    fragColor = vec4(finalRgb * alpha, alpha);
}
`;

export function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("ChromaShader compile error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}
