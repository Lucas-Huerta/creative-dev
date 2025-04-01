import * as THREE from 'three';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import './style.css';
import { vertexShader } from './shaders/blobShaders.js';
import { CardManager } from './components/CardManager.js';

class ThreeJSScene {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.sphere = null;
        this.loader = new ColladaLoader();
        this.mixer = null;
        this.scrollY = 0;
        this.targetScrollY = 0;
        this.scrollSpeed = 0.1;
        this.cameraPath = [];
        this.totalPathLength = 100;
        this.modelLoaded = false;
        this.modelHeight = 0;
        this.cardManager = null;

        this.container = document.getElementById('scene-container');
        
        this.clock = new THREE.Clock();
        
        this.init();
        this.animate();
    }

    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1F1F1F);
        
        this.camera = new THREE.PerspectiveCamera(
            30, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            2000
        );
        this.camera.position.set(0, 5, 10);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.container.appendChild(this.renderer.domElement);
        
        this.addShapes();
        this.addLights();
        
        this.cardManager = new CardManager(this.scene);
        
        window.addEventListener('resize', () => this.onWindowResize());
        window.addEventListener('wheel', (e) => this.onScroll(e), { passive: false });
    }
    
    addShapes() {        
        const sphereGeometry = new THREE.SphereGeometry(0.8, 64, 64);
        
        const blobMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uColor: { value: new THREE.Color(0xff0000) },
                uNoiseScale: { value: 3.0 },  
                uNoiseIntensity: { value: 0.4 },
                uFrequency: { value: 1.5 }
            },
            vertexShader: vertexShader,
            wireframe: false
        });
        
        this.sphere = new THREE.Mesh(sphereGeometry, blobMaterial);

        this.loader.load('./HeadYes.dae', (collada) => {
            const avatar = collada.scene;
            avatar.scale.set(2, 2, 2);
            
            const box = new THREE.Box3().setFromObject(avatar);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            
            this.modelHeight = size.y;            
            avatar.position.copy(center).multiplyScalar(-1);
            
            const animations = collada.animations;
            this.mixer = new THREE.AnimationMixer(avatar);
            if (animations && animations.length) {
                animations.forEach((clip) => {
                    this.mixer.clipAction(clip).play();
                });
            }
            
            this.scene.add(avatar);
            this.generateCameraPath(box);
            
            // Start camera at the head position
            this.modelLoaded = true;
            this.camera.position.copy(this.cameraPath[0].position);
            this.camera.lookAt(this.cameraPath[0].lookAt);
        });
    }

    generateCameraPath(modelBox) {
        this.cameraPath = [];
        
        const topY = modelBox.max.y;
        const bottomY = modelBox.min.y;
        const centerX = (modelBox.min.x + modelBox.max.x) / 2;
        const centerZ = (modelBox.min.z + modelBox.max.z) / 2;
        
        // Create a path from top (head) to bottom (feet)
        for (let i = 0; i < this.totalPathLength; i++) {
            const t = i / (this.totalPathLength - 1);
            
            // Interpolate Y from top to bottom
            const y = topY - t * (topY - bottomY);
            
            // Create a slight circular path around the model
            const angle = t * Math.PI * 2;
            const radius = 5; // Distance from model
            
            const point = {
                position: new THREE.Vector3(
                    centerX + Math.sin(angle) * radius,
                    y,
                    centerZ + Math.cos(angle) * radius
                ),
                lookAt: new THREE.Vector3(centerX, y, centerZ) // Look at the spine of the model at current height
            };
            
            this.cameraPath.push(point);
        }
        
        if (this.cardManager) {
            this.cardManager.setupCardTriggers(this.cameraPath, modelBox);
        }
    }
    
    addLights() {
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1, 1, 1);
        this.scene.add(directionalLight);
    }

    updateCamera() {
        if (!this.modelLoaded || this.cameraPath.length === 0) return;
        
        this.scrollY += (this.targetScrollY - this.scrollY) * this.scrollSpeed;
        const pathIndex = Math.floor(this.scrollY);
        const pathPercent = this.scrollY - pathIndex;
        
        if (this.cardManager) {
            this.cardManager.updateCards(this.scrollY);
        }
        
        if (pathIndex < this.cameraPath.length - 1) {
            const currentPoint = this.cameraPath[pathIndex];
            const nextPoint = this.cameraPath[pathIndex + 1];
            
            this.camera.position.lerpVectors(
                currentPoint.position,
                nextPoint.position,
                pathPercent
            );
            
            const lookAtPos = new THREE.Vector3();
            lookAtPos.lerpVectors(
                currentPoint.lookAt,
                nextPoint.lookAt,
                pathPercent
            );
            this.camera.lookAt(lookAtPos);
        }
    }

    update() {
        if (this.mixer) {
            const delta = this.clock.getDelta();
            this.mixer.update(delta);
        }
        
        if (this.sphere && this.sphere.material.uniforms) {
            this.sphere.material.uniforms.uTime.value = this.clock.getElapsedTime();
        }
        
        if (this.cardManager) {
            this.cardManager.update(this.clock.getElapsedTime());
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.update();
        this.updateCamera();
        this.renderer.render(this.scene, this.camera);
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onScroll(event) {
        this.targetScrollY += event.deltaY * 0.01;
        this.targetScrollY = Math.max(0, Math.min(this.totalPathLength - 1, this.targetScrollY));
        event.preventDefault();
    }
}

// Créer une instance de la scène
window.addEventListener('DOMContentLoaded', () => {
    new ThreeJSScene();
});