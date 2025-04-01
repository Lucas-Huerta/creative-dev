import * as THREE from 'three';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
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
        this.mouse = new THREE.Vector2();
        this.textMesh = null;
        this.textOpacity = 1.0;
        this.targetTextOpacity = 1.0;
        this.textFadeSpeed = 0.05;
        this.loadingManager = new THREE.LoadingManager();
        this.loadingComplete = false;
        this.setupLoadingManager();

        this.container = document.getElementById('scene-container');
        
        this.clock = new THREE.Clock();
        
        this.init();
        this.animate();
    }

    setupLoadingManager() {
        const loadingElement = document.createElement('div');
        loadingElement.id = 'loading-screen';
        loadingElement.innerHTML = `
            <div class="loading-container">
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
                <div class="loading-percentage">0%</div>
            </div>
        `;
        document.body.appendChild(loadingElement);

        this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
            const progressPercent = Math.round((itemsLoaded / itemsTotal) * 100);
            document.querySelector('.progress-fill').style.width = `${progressPercent}%`;
            document.querySelector('.loading-percentage').textContent = `${progressPercent}%`;
        };

        this.loadingManager.onLoad = () => {
            this.loadingComplete = true;
            document.getElementById('loading-screen').style.opacity = '0';
            setTimeout(() => {
                document.getElementById('loading-screen').style.display = 'none';
            }, 1000);
        };

        this.loadingManager.onError = (url) => {
            console.error('Error loading:', url);
            document.querySelector('.loading-container h2').textContent = 'Error loading 3D content';
        };
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
        this.addText();
        
        this.cardManager = new CardManager(this.scene);
        
        window.addEventListener('resize', () => this.onWindowResize());
        window.addEventListener('wheel', (e) => this.onScroll(e), { passive: false });
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
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
            avatar.position.copy(center).multiplyScalar(-0.75);
            
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

    addText() {
        const fontLoader = new FontLoader(this.loadingManager);
        
        fontLoader.load('./typos/helvetiker_regular.typeface.json', (font) => {
            const textGeometry = new TextGeometry('Lucas Huerta', {
                font: font,
                size: 1,
                height: 0.2,
                curveSegments: 12,
                bevelEnabled: true,
                bevelThickness: 0.03,
                bevelSize: 0.02,
                bevelOffset: 0,
                bevelSegments: 5
            });
            
            // Center the text
            textGeometry.computeBoundingBox();
            const textWidth = textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x;
            
            const textMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    uTime: { value: 0.0 },
                    uMouse: { value: new THREE.Vector2(0, 0) },
                    uHover: { value: 0.0 },
                    uOpacity: { value: 1.0 }
                },
                vertexShader: `
                    uniform float uTime;
                    uniform vec2 uMouse;
                    uniform float uHover;
                    
                    varying vec2 vUv;
                    varying vec3 vPosition;
                    
                    void main() {
                        vUv = uv;
                        vPosition = position;
                        
                        // Calculate distance to mouse position for distortion
                        float dist = distance(vec3(uMouse.x, uMouse.y, 0.0), position);
                        float distortionFactor = 0.2 * uHover * smoothstep(0.8, 0.0, dist);
                        
                        // Apply wave distortion based on hover
                        vec3 newPosition = position;
                        newPosition.x += sin(position.y * 10.0 + uTime * 4.0) * distortionFactor;
                        newPosition.y += cos(position.x * 10.0 + uTime * 4.0) * distortionFactor;
                        
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
                    }
                `,
                fragmentShader: `
                varying vec2 vUv;
                varying vec3 vPosition;

                uniform float uTime;
                uniform float uHover;
                uniform vec2 uMouse;
                uniform float uOpacity;

                void main() {
                    // Calculate distance from position to mouse for the hover effect
                    float dist = distance(vec2(vPosition.x, vPosition.y), uMouse);
                    float glow = smoothstep(0.8, 0.0, dist) * uHover;
                    
                    // Base white color
                    vec3 baseColor = vec3(1.0);
                    
                    // Blue accent color (royal blue)
                    vec3 accentColor = vec3(0.0, 0.28, 0.67);
                    
                    // Mix between white and blue based on hover and distance
                    vec3 finalColor = mix(baseColor, accentColor, glow);
                    
                    gl_FragColor = vec4(finalColor, uOpacity); 
                }
                    `,
                transparent: true,
            });
            
            this.textMesh = new THREE.Mesh(textGeometry, textMaterial);
            // Position text in center of the hero section
            this.textMesh.position.set(-textWidth/2, 8, -10);

            // Create a fixed camera and scene specifically for the text
            this.textScene = new THREE.Scene();
            this.textCamera = new THREE.PerspectiveCamera(
                30, 
                window.innerWidth / window.innerHeight, 
                0.1, 
                100
            );
            this.textCamera.position.set(0, 8, 10);
            this.textCamera.lookAt(0, 8, 0);
            this.textScene.add(this.textMesh);
            const ambientLight = new THREE.AmbientLight(0x404040);
            this.textScene.add(ambientLight);
            
            const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight.position.set(1, 1, 1);
            this.textScene.add(directionalLight);
            }, 
        (xhr) => {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        (error) => {
            console.error('An error happened while loading the font:', error);
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
        
        if (this.scrollY < 1.0) {
            this.targetTextOpacity = 1.0;
        } else {
            this.targetTextOpacity = 0.0;
        }
        
        this.textOpacity += (this.targetTextOpacity - this.textOpacity) * this.textFadeSpeed;
        
        if (this.textMesh && this.textMesh.material.uniforms) {
            this.textMesh.material.uniforms.uOpacity.value = this.textOpacity;
        }
        
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

        if (this.textMesh && this.textMesh.material.uniforms) {
            this.textMesh.material.uniforms.uTime.value = this.clock.getElapsedTime();
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (!this.loadingComplete) {
            // Only render loading screen
            return;
        }
        
        this.update();
        this.updateCamera();
        this.renderer.render(this.scene, this.camera);
        
        // Render text scene on top with its own fixed camera
        if (this.textScene && this.textCamera) {
            // Enable autoClear false to avoid clearing the first render
            this.renderer.autoClear = false;
            this.renderer.render(this.textScene, this.textCamera);
            this.renderer.autoClear = true;
        }
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        
        // Also update text camera if it exists
        if (this.textCamera) {
            this.textCamera.aspect = window.innerWidth / window.innerHeight;
            this.textCamera.updateProjectionMatrix();
        }
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onScroll(event) {
        this.targetScrollY += event.deltaY * 0.01;
        this.targetScrollY = Math.max(0, Math.min(this.totalPathLength - 1, this.targetScrollY));
        event.preventDefault();
    }

    onMouseMove(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        if (this.textMesh) {
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(this.mouse, this.textCamera);
            
            const intersects = raycaster.intersectObject(this.textMesh);
            
            if (intersects.length > 0) {
                // Text is hovered, increase hover value for distortion
                this.textMesh.material.uniforms.uHover.value = 1.0;
                
                // Calculate local intersection point for more precise hover effect
                const intersectionPoint = intersects[0].point.clone();
                this.textMesh.worldToLocal(intersectionPoint);
                
                // Update mouse position in the material with local coordinates
                this.textMesh.material.uniforms.uMouse.value.set(
                    intersectionPoint.x,
                    intersectionPoint.y
                );
            } else {
                // Gradually reduce hover value when not hovering
                if (this.textMesh.material.uniforms.uHover.value > 0) {
                    this.textMesh.material.uniforms.uHover.value *= 0.95;
                }
            }
        }
    }
}

// Créer une instance de la scène
window.addEventListener('DOMContentLoaded', () => {
    new ThreeJSScene();
});