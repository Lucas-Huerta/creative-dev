export const cardVertexShader = `
  uniform float uTime;
  uniform float uDistortionFrequency;
  uniform float uDistortionStrength;
  uniform float uVisibility;
  
  varying vec2 vUv;
  varying float vVisibility;
  
  void main() {
    vUv = uv;
    vVisibility = uVisibility;
    
    // Calculate wave distortion
    float distortion = sin(uv.x * uDistortionFrequency + uTime) * 
                      sin(uv.y * uDistortionFrequency + uTime) * 
                      uDistortionStrength * uVisibility;
    
    // Apply distortion only when card is visible
    vec3 newPosition = position + normal * distortion;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

export const cardFragmentShader = `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uVisibility;
  uniform sampler2D uTexture;
  
  varying vec2 vUv;
  varying float vVisibility;
  
  void main() {
    // Dynamic color effect
    vec2 distortedUv = vUv;
    distortedUv.x += sin(vUv.y * 10.0 + uTime * 0.5) * 0.02 * vVisibility;
    distortedUv.y += cos(vUv.x * 10.0 + uTime * 0.5) * 0.02 * vVisibility;
    
    vec4 texColor = texture2D(uTexture, distortedUv);
    
    // Mix with base color
    vec3 finalColor = mix(uColor, texColor.rgb, texColor.a * 0.8);
    
    // Apply visibility to alpha for fade effect
    gl_FragColor = vec4(finalColor, vVisibility);
  }
`;