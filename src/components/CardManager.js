import * as THREE from 'three';
import { cardVertexShader } from '../shaders/cardShaders.js';
import { tabProjectCard } from '../lib/index.ts';

export class CardManager {
    constructor(scene) {
        this.scene = scene;
        this.cards = [];
        this.cardLabels = [];
        this.triggerPoints = [];
        this.cardVisibility = [];
        this.textureLoader = new THREE.TextureLoader();
    }
    
    setupCardTriggers(cameraPath, modelBox) {
        // Only start cards after the hero section (first 10% of the path)
        const startPathIndex = Math.floor(cameraPath.length * 0.1);
        
        // Define fixed positions for cards
        const cardPositions = [
            { x: 8, y: 4, z: 5, pathIndex: startPathIndex + 5 },
            { x: -9, y: 2, z: 3, pathIndex: startPathIndex + 15 },
            { x: 7, y: 0, z: -6, pathIndex: startPathIndex + 25 },
            { x: -6, y: -2, z: -8, pathIndex: startPathIndex + 35 },
            { x: 10, y: -1, z: 4, pathIndex: startPathIndex + 45 },
            { x: -10, y: 1, z: -5, pathIndex: startPathIndex + 55 },
            { x: 8, y: -3, z: -7, pathIndex: startPathIndex + 65 },
            { x: -7, y: 3, z: 6, pathIndex: startPathIndex + 75 }
        ];
        
        // Create cards using data from tabProjectCard
        const projectCount = Math.min(tabProjectCard.length, cardPositions.length);
        
        for (let i = 0; i < projectCount; i++) {
            const project = tabProjectCard[i];
            const pos = cardPositions[i];
            const cardPosition = new THREE.Vector3(pos.x, pos.y, pos.z);
            this.addCard(cardPosition, pos.pathIndex, project);
        }
    }
    
    createCard(index, project) {
        const geometry = new THREE.PlaneGeometry(3, 2, 32, 32);
        
        // Load texture from project URL
        const texture = this.textureLoader.load(project.url);
        texture.encoding = THREE.sRGBEncoding;
        
        // Create material with texture
        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uColor: { value: new THREE.Color(this.getCardColor(index)) },
                uDistortionFrequency: { value: 3.0 + index * 0.5 },
                uDistortionStrength: { value: 0.3 },
                uVisibility: { value: 0.0 },
                uTexture: { value: texture }
            },
            vertexShader: cardVertexShader,
            fragmentShader: `
                uniform float uTime;
                uniform vec3 uColor;
                uniform float uVisibility;
                uniform sampler2D uTexture;
                
                varying vec2 vUv;
                
                void main() {
                    vec2 uv = vUv;
                    vec4 textureColor = texture2D(uTexture, uv);
                    
                    // Apply slight color tint while preserving the texture
                    vec3 finalColor = mix(textureColor.rgb, uColor, 0.2);
                    
                    // Apply visibility for fade in/out effect
                    gl_FragColor = vec4(finalColor, textureColor.a * uVisibility);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        return new THREE.Mesh(geometry, material);
    }
    
    createCardLabel(position, project) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const context = canvas.getContext('2d');
        
        // Clear background
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw text
        context.font = 'bold 48px Syne, Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = 'white';
        context.fillText(project.name, canvas.width / 2, canvas.height / 2);
        
        // Create texture
        const texture = new THREE.CanvasTexture(canvas);
        
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0
        });
        
        const geometry = new THREE.PlaneGeometry(3, 0.75);
        const label = new THREE.Mesh(geometry, material);
        
        // Position label above the card
        label.position.copy(position);
        label.position.y += 1.5;
        
        return label;
    }
    
    getCardColor(index) {
        const colors = [0x2196F3, 0x4CAF50, 0xFFC107, 0xE91E63];
        return colors[index % colors.length];
    }
    
    updateCards(scrollY) {
        this.triggerPoints.forEach((trigger, index) => {
            const distance = Math.abs(scrollY - trigger.pathPosition);
            
            if (distance > -trigger.fadeDuration && distance < 0) {
                this.cardVisibility[index] = 1 + (distance / trigger.fadeDuration);
            } else if (distance >= 0) {
                this.cardVisibility[index] = 1;
            } else {
                this.cardVisibility[index] = 0;
            }
            
            if (this.cards[index] && this.cards[index].material) {
                this.cards[index].material.uniforms.uVisibility.value = this.cardVisibility[index];
            }
            
            if (this.cardLabels[index]) {
                this.cardLabels[index].material.opacity = this.cardVisibility[index];
            }
        });
    }
    
    addCard(position, pathIndex, project) {
        const card = this.createCard(this.cards.length, project);
        card.position.copy(position);
        card.lookAt(0, position.y, 0);
        
        this.scene.add(card);
        this.cards.push(card);
        
        // Create and add label
        const label = this.createCardLabel(position, project);
        label.lookAt(0, position.y, 0);
        this.scene.add(label);
        this.cardLabels.push(label);
        
        // Store trigger point for this card
        this.triggerPoints.push({
            pathPosition: pathIndex,
            fadeDuration: 20
        });
        
        // Store initial visibility for this card
        this.cardVisibility.push(0);
    }
    
    update(time) {
        this.cards.forEach(card => {
            if (card.material && card.material.uniforms) {
                card.material.uniforms.uTime.value = time;
            }
        });
    }
}
