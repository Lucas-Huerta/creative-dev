import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import './style.css';
import { vertexShader, fragmentShader } from './shaders/blobShaders.js';

class ThreeJSScene {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.sphere = null;

        this.container = document.getElementById('scene-container');
        
        this.clock = new THREE.Clock();
        
        this.init();
        this.animate();
    }

    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x333333);
        
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        this.camera.position.z = 5;
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.container.appendChild(this.renderer.domElement);
        
        this.setupControls();
        this.addShapes();
        this.addLights();
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        
        this.controls.screenSpacePanning = false;
        
        this.controls.minDistance = 2;     // Distance minimale de zoom
        this.controls.maxDistance = 10;    // Distance maximale de zoom
        
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
            fragmentShader: fragmentShader,
            wireframe: false
        });
        
        this.sphere = new THREE.Mesh(sphereGeometry, blobMaterial);
        this.scene.add(this.sphere);
    }
    
    addLights() {
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1, 1, 1);
        this.scene.add(directionalLight);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const elapsedTime = this.clock.getElapsedTime();
        
        // Mettre à jour l'uniform de temps pour l'animation du blob
        if (this.sphere && this.sphere.material.uniforms) {
            this.sphere.material.uniforms.uTime.value = elapsedTime;
            
            // Animer également l'intensité du bruit pour plus de dynamisme
            this.sphere.material.uniforms.uNoiseIntensity.value = 0.1 + Math.sin(elapsedTime * 0.5) * 0.1;
            // Animer la fréquence pour varier la vitesse de déformation
            this.sphere.material.uniforms.uFrequency.value = 1.0 + Math.sin(elapsedTime * 0.2) * 0.2;
        }
        
        this.sphere.rotation.x += 0.005;
        this.sphere.rotation.y += 0.005;
        
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// Créer une instance de la scène
window.addEventListener('DOMContentLoaded', () => {
    new ThreeJSScene();
});