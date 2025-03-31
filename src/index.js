import * as THREE from 'three';
import './style.css';

class ThreeJSScene {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.cube = null;
        this.sphere = null;
        this.cone = null;

        this.container = document.getElementById('scene-container');
        
        this.init();
        this.animate();
    }

    init() {
        // Créer la scène
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x333333);
        
        // Créer la caméra
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        this.camera.position.z = 5;
        
        // Créer le renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.container.appendChild(this.renderer.domElement);
        
        // Ajouter des formes
        this.addShapes();
        
        // Ajouter de la lumière
        this.addLights();
        
        // Gérer le redimensionnement de la fenêtre
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    addShapes() {
        // Cube
        const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
        const cubeMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
        this.cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
        this.cube.position.x = -2;
        this.scene.add(this.cube);
        
        // Sphère
        const sphereGeometry = new THREE.SphereGeometry(0.8, 32, 32);
        const sphereMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
        this.sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        this.scene.add(this.sphere);
        
        // Cône
        const coneGeometry = new THREE.ConeGeometry(0.7, 1.5, 32);
        const coneMaterial = new THREE.MeshPhongMaterial({ color: 0x0000ff });
        this.cone = new THREE.Mesh(coneGeometry, coneMaterial);
        this.cone.position.x = 2;
        this.scene.add(this.cone);
    }
    
    addLights() {
        // Lumière ambiante
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);
        
        // Lumière directionnelle
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1, 1, 1);
        this.scene.add(directionalLight);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Faire tourner les objets
        this.cube.rotation.x += 0.01;
        this.cube.rotation.y += 0.01;
        
        this.sphere.rotation.x += 0.01;
        this.sphere.rotation.y += 0.01;
        
        this.cone.rotation.x += 0.01;
        this.cone.rotation.y += 0.01;
        
        // Rendre la scène
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