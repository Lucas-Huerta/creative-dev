import * as THREE from 'three';
import { cardVertexShader, cardFragmentShader } from '../shaders/cardShaders.js';

export class CardManager {
    constructor(scene) {
        this.scene = scene;
        this.cards = [];
        this.triggerPoints = [];
        this.cardVisibility = [];
    }
    
    setupCardTriggers(cameraPath, modelBox) {
        const numCards = 2;
        
        // Calculate even spacing along the entire path
        const pathLength = cameraPath.length - 1;
        const spacing = pathLength / (numCards + 1);
        
        const centerX = (modelBox.min.x + modelBox.max.x) / 2;
        const centerZ = (modelBox.min.z + modelBox.max.z) / 2;
        const modelWidth = modelBox.max.x - modelBox.min.x;
        
        for (let i = 0; i < numCards; i++) {
            const pathIndex = Math.floor(spacing * (i + 1));
            
            this.triggerPoints.push({
                pathPosition: pathIndex,
                fadeDuration: 40,
            });
            
            // Create the card
            const card = this.createCard(i);
            
            // Position card to the side of the model
            const sideOffset = modelWidth * 1.5;
            const side = i % 2 === 0 ? 1 : -1; // Alternate sides
            
            // Position at same height as the corresponding camera path point
            card.position.set(
                centerX + (sideOffset * side),
                cameraPath[pathIndex].position.y,
                centerZ
            );
            
            // Rotate card to face the camera path
            card.lookAt(cameraPath[pathIndex].position);
            
            this.cards.push(card);
            this.cardVisibility.push(0); // Start with 0 visibility
            this.scene.add(card);
        }
    }
    
    createCard(index) {
        const geometry = new THREE.PlaneGeometry(2, 1.5, 32, 32);
        
        // Create unique material with different colors and settings for each card
        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uColor: { value: new THREE.Color(this.getCardColor(index)) },
                uDistortionFrequency: { value: 2.0 + index * 0.5 },
                uDistortionStrength: { value: 0.2 },
                uVisibility: { value: 0.0 },
                uTexture: { value: null }
            },
            vertexShader: cardVertexShader,
            // fragmentShader: cardFragmentShader,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        return new THREE.Mesh(geometry, material);
    }
    
    getCardColor(index) {
        const colors = [0x2196F3, 0x4CAF50, 0xFFC107, 0xE91E63];
        return colors[index % colors.length];
    }
    
    updateCards(scrollY) {
        this.triggerPoints.forEach((trigger, index) => {
            const distance = Math.abs(scrollY - trigger.pathPosition);
            
            // Card is visible when scroll position is near the trigger point
            if (distance < trigger.fadeDuration) {
                // Calculate visibility factor (1 at trigger point, fading to 0)
                this.cardVisibility[index] = 1 - (distance / trigger.fadeDuration);
            } else {
                this.cardVisibility[index] = 0;
            }
            
            // Apply visibility to shader
            if (this.cards[index] && this.cards[index].material) {
                this.cards[index].material.uniforms.uVisibility.value = this.cardVisibility[index];
            }
        });
    }
    
    update(time) {
        // Update time uniform for all cards to animate shaders
        this.cards.forEach(card => {
            if (card.material && card.material.uniforms) {
                card.material.uniforms.uTime.value = time;
            }
        });
    }
}
