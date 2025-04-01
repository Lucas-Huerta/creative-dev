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
        // Increase the number of cards and distribute them more evenly
        const cardCount = 10; // Increased from the original number
        const cardSpacing = cameraPath.length / (cardCount + 1);
        
        for (let i = 0; i < cardCount; i++) {
            // Calculate the path index with better spacing
            const pathIndex = Math.floor((i + 1) * cardSpacing);
            
            if (pathIndex < cameraPath.length) {
                const pathPoint = cameraPath[pathIndex];
                
                // Create a wider radius around the character to avoid crowding
                const angle = Math.random() * Math.PI * 2;
                const radiusMin = 8; // Minimum distance from character
                const radiusMax = 15; // Maximum distance
                const radius = radiusMin + Math.random() * (radiusMax - radiusMin);
                
                // Randomize height within a reasonable range around the path point
                const heightVariation = 2;
                const height = pathPoint.position.y + (Math.random() * heightVariation * 2 - heightVariation);
                
                // Create a card with these randomly distributed positions
                const cardPosition = new THREE.Vector3(
                    Math.sin(angle) * radius,
                    height,
                    Math.cos(angle) * radius
                );
                
                // Add the card at this position
                this.addCard(cardPosition, pathIndex);
            }
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
    

    addCard(position, pathIndex) {
        const card = this.createCard(this.cards.length);
        card.position.copy(position);
        this.scene.add(card);
        this.cards.push(card);
        
        // Store trigger point for this card
        this.triggerPoints.push({
            pathPosition: pathIndex,
            fadeDuration: 20 // Distance in scroll units where card fades in/out
        });
        
        // Store initial visibility for this card
        this.cardVisibility.push(0);
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
