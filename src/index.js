import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import './style.css';
import { vertexShader, fragmentShader } from './shaders/blobShaders.js';
import { gsap } from 'gsap';


class ThreeJSScene {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.sphere = null;
        this.loader = new ColladaLoader();
        this.mixer = null;
        this.scrollY = 0;
        this.targetScrollY = 0;
        this.scrollSpeed = 0.1;
        this.cameraPath = [];
        this.totalPathLength = 100;

        this.container = document.getElementById('scene-container');
        
        this.clock = new THREE.Clock();
        
        this.init();
        this.animate();
    }

    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x333333);
        
        this.camera = new THREE.PerspectiveCamera(
            30, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            2000
        );
        this.camera.position.x = 0;
        this.camera.position.y = 2000;
        this.camera.position.z = 5;
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.container.appendChild(this.renderer.domElement);
        
        this.setupControls();
        this.addShapes();
        this.addLights();
        window.addEventListener('resize', () => this.onWindowResize());
        window.addEventListener('wheel', (e) => this.onScroll(e), { passive: false });
    }
    
    setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        
        this.controls.screenSpacePanning = false;
        
        this.mixer = new THREE.AnimationMixer();
        this.controls.minDistance = 2; 
        this.controls.maxDistance = 10;
        
        this.controls.maxPolarAngle = Math.PI;
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
            // gère les couleurs
            // fragmentShader: fragmentShader,
            wireframe: false
        });
        
        this.sphere = new THREE.Mesh(sphereGeometry, blobMaterial);

        this.loader.load('./model.dae', ( collada ) => {
            const avatar = collada.scene;
            avatar.scale.set(2,2,2);
            avatar.position.y = -2;

            const animations = collada.animations;
            this.mixer = new THREE.AnimationMixer( avatar );
            if (animations && animations.length) {
                animations.forEach( ( clip ) => {
                    this.mixer.clipAction(clip).play();
                } );
            }
            this.scene.add( avatar );

            this.generateCameraPath();
        } );
    }

    generateCameraPath(){
        for (let i = 0; i < this.totalPathLength; i++) {
            const t = i / this.totalPathLength;
            const point = {
            position: new THREE.Vector3(
                Math.sin(t * Math.PI * 2) * 5,
                t * 10, // Moving upward along the model
                Math.cos(t * Math.PI * 2) * 5
            ),
            lookAt: new THREE.Vector3(0, t * 10, 0) // Look at the center of the model
            };
        this.cameraPath.push(point);
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
        this.scrollY += (this.targetScrollY - this.scrollY) * this.scrollSpeed;
        if (this.cameraPath.length > 0) {
          const pathIndex = Math.floor(this.scrollY);
          const pathPercent = this.scrollY - pathIndex;
          
          if (pathIndex < this.cameraPath.length - 1) {
            // Interpolate between two points on the path
            const currentPoint = this.cameraPath[pathIndex];
            const nextPoint = this.cameraPath[pathIndex + 1];
            
            // Position
            this.camera.position.lerpVectors(
              currentPoint.position,
              nextPoint.position,
              pathPercent
            );
            
            // Look at point
            const lookAtPos = new THREE.Vector3();
            lookAtPos.lerpVectors(
              currentPoint.lookAt,
              nextPoint.lookAt,
              pathPercent
            );
            this.camera.lookAt(lookAtPos);
          }
        }
      }

    update() {
        if (this.mixer) {
            const delta = this.clock.getDelta();
            this.mixer.update(delta);
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());

        this.update();
        this.updateCamera();
        
        this.controls.update();
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