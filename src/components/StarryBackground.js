import * as THREE from 'three';

export class StarryBackground {
    constructor(scene) {
        this.scene = scene;
        this.stars = [];
        this.starCount = 1000;
        this.createStars();
    }

    createStars() {
        const starGeometry = new THREE.BufferGeometry();
        const starMaterial = new THREE.PointsMaterial({
            color: 0xFFFFFF,
            size: 0.05,
            transparent: true,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });

        const starVertices = [];
        const starSizes = [];
        const starColors = [];

        // Colors for stars (from white to blue/yellow tints)
        const colors = [
            new THREE.Color(0xFFFFFF), // white
            new THREE.Color(0xCCCCFF), // light blue
            new THREE.Color(0xFFFFCC), // light yellow
            new THREE.Color(0xDDEEFF)  // light blue-white
        ];

        for (let i = 0; i < this.starCount; i++) {
            // Create stars in a large sphere around the scene
            const radius = 50 + Math.random() * 50;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);
            
            starVertices.push(x, y, z);
            
            // Random star size
            starSizes.push(0.5 + Math.random() * 1.5);
            
            // Random star color
            const color = colors[Math.floor(Math.random() * colors.length)];
            starColors.push(color.r, color.g, color.b);
        }

        starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
        starGeometry.setAttribute('size', new THREE.Float32BufferAttribute(starSizes, 1));
        starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));

        // Create custom shader material to control sizes and fading
        const starShaderMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0.0 },
                uPixelRatio: { value: window.devicePixelRatio }
            },
            vertexShader: `
                attribute float size;
                attribute vec3 color;
                uniform float uTime;
                uniform float uPixelRatio;
                varying vec3 vColor;
                
                void main() {
                    vColor = color;
                    
                    // Twinkle effect
                    float twinkle = sin(uTime * 0.5 + position.x * 0.1 + position.y * 0.1 + position.z * 0.1) * 0.5 + 0.5;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (150.0 / -mvPosition.z) * uPixelRatio * (0.7 + 0.3 * twinkle);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                
                void main() {
                    // Create circular points with soft edges
                    float distanceFromCenter = length(gl_PointCoord - vec2(0.5));
                    float alpha = 1.0 - smoothstep(0.4, 0.5, distanceFromCenter);
                    
                    gl_FragColor = vec4(vColor, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        const stars = new THREE.Points(starGeometry, starShaderMaterial);
        this.scene.add(stars);
        this.stars.push(stars);
    }

    update(time) {
        this.stars.forEach(stars => {
            if (stars.material.uniforms) {
                stars.material.uniforms.uTime.value = time;
            }
            
            // Slowly rotate stars
            stars.rotation.y = time * 0.02;
            stars.rotation.x = time * 0.01;
        });
    }
}
