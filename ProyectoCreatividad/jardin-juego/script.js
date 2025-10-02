const container = document.getElementById('canvas-container');
const scoreDiv = document.getElementById('score');
const startBtn = document.getElementById('startBtn');

// Configuración de Three.js
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);

const camera = new THREE.PerspectiveCamera(45, 1200/700, 0.1, 2000);
camera.position.set(0, 800, 600);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(1200, 700);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// Iluminación
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(100, 200, 100);
directionalLight.castShadow = true;
directionalLight.shadow.camera.left = -600;
directionalLight.shadow.camera.right = 600;
directionalLight.shadow.camera.top = 400;
directionalLight.shadow.camera.bottom = -400;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// Plano del suelo
const groundGeometry = new THREE.PlaneGeometry(1200, 700);
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const sndPlantar = new Audio('assets/plantar.mp3');
const sndMalvado = new Audio('assets/malvado.mp3');
const sndMover = new Audio('assets/mover.mp3');

let gameActive = false;
let scoreArbol = 0;
let scorePlanta = 0;
let arboles = [];
let plantas = [];
let malvados = [];
let jardinero = { x: -400, z: 250, mesh: null, moving: false, target: null, attackTarget: null };
let malvadoInterval;
let gameEnd = false;
let hasPlanted = false;
let contextMenu = null;

// Raycaster para clics
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Crear jardinero 3D
function createJardinero() {
    const group = new THREE.Group();
    
    // Cuerpo
    const bodyGeometry = new THREE.BoxGeometry(40, 60, 30);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 30;
    body.castShadow = true;
    group.add(body);
    
    // Cabeza
    const headGeometry = new THREE.SphereGeometry(15);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xFFDBAC });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 70;
    head.castShadow = true;
    group.add(head);
    
    // Sombrero
    const hatGeometry = new THREE.ConeGeometry(18, 15, 8);
    const hatMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const hat = new THREE.Mesh(hatGeometry, hatMaterial);
    hat.position.y = 85;
    hat.castShadow = true;
    group.add(hat);
    
    group.position.set(jardinero.x, 0, jardinero.z);
    scene.add(group);
    jardinero.mesh = group;
}

// Crear árbol 3D
function createArbol(x, z) {
    const group = new THREE.Group();
    
    // Tronco
    const trunkGeometry = new THREE.CylinderGeometry(15, 15, 80);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 40;
    trunk.castShadow = true;
    group.add(trunk);
    
    // Hojas
    const leavesGeometry = new THREE.SphereGeometry(50);
    const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
    const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
    leaves.position.y = 100;
    leaves.castShadow = true;
    group.add(leaves);
    
    group.position.set(x, 0, z);
    scene.add(group);
    return { x, z, mesh: group };
}

// Crear planta 3D
function createPlanta(x, z) {
    const group = new THREE.Group();
    
    // Tallo
    const stemGeometry = new THREE.CylinderGeometry(2, 2, 20);
    const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    stem.position.y = 10;
    stem.castShadow = true;
    group.add(stem);
    
    // Flor
    const flowerGeometry = new THREE.SphereGeometry(10);
    const flowerMaterial = new THREE.MeshStandardMaterial({ color: 0xFF69B4 });
    const flower = new THREE.Mesh(flowerGeometry, flowerMaterial);
    flower.position.y = 25;
    flower.castShadow = true;
    group.add(flower);
    
    group.position.set(x, 0, z);
    scene.add(group);
    return { x, z, mesh: group };
}

// Crear malvado 3D (enemigo)
function createMalvado(tipo, x, z) {
    const group = new THREE.Group();
    
    if (tipo === 'leniador') {
        // Cuerpo
        const bodyGeometry = new THREE.BoxGeometry(35, 50, 25);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x8B0000 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 25;
        body.castShadow = true;
        group.add(body);
        
        // Cabeza
        const headGeometry = new THREE.SphereGeometry(12);
        const headMaterial = new THREE.MeshStandardMaterial({ color: 0xFFDBAC });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 55;
        head.castShadow = true;
        group.add(head);
        
        // Mango del hacha
        const axeHandleGeometry = new THREE.CylinderGeometry(2, 2, 40);
        const axeHandleMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const axeHandle = new THREE.Mesh(axeHandleGeometry, axeHandleMaterial);
        axeHandle.position.set(20, 30, 0);
        axeHandle.rotation.z = Math.PI / 4;
        axeHandle.castShadow = true;
        group.add(axeHandle);
    } else {
        // Cuerpo de hormiga
        const bodyGeometry = new THREE.SphereGeometry(15, 8, 8);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 10;
        body.castShadow = true;
        group.add(body);
        
        // Cabeza de hormiga
        const headGeometry = new THREE.SphereGeometry(10, 8, 8);
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.position.set(18, 10, 0);
        head.castShadow = true;
        group.add(head);
    }
    
    group.position.set(x, 0, z);
    group.userData.clickable = true;
    scene.add(group);
    return { tipo, x, z, mesh: group };
}

function resetGame() {
    scoreArbol = 0;
    scorePlanta = 0;
    hasPlanted = false;
    
    // Remover objetos existentes
    arboles.forEach(a => scene.remove(a.mesh));
    plantas.forEach(p => scene.remove(p.mesh));
    malvados.forEach(m => scene.remove(m.mesh));
    if (jardinero.mesh) scene.remove(jardinero.mesh);
    
    // Limpiar menú contextual si existe
    if (contextMenu && document.body.contains(contextMenu)) {
        document.body.removeChild(contextMenu);
        contextMenu = null;
    }
    
    arboles = [];
    plantas = [];
    malvados = [];
    jardinero.x = -400;
    jardinero.z = 250;
    jardinero.moving = false;
    jardinero.target = null;
    jardinero.attackTarget = null;
    
    createJardinero();
    
    scoreDiv.textContent = 'Árboles: 0 | Plantas: 0';
    startBtn.style.display = 'none';
    gameActive = true;
    gameEnd = false;
    clearInterval(malvadoInterval);
    
    setTimeout(() => {
        malvadoInterval = setInterval(spawnMalvado, 4000);
    }, 6000);
    
    animate();
}

function spawnMalvado() {
    if (!gameActive) return;
    const tipo = Math.random() < 0.5 ? 'leniador' : 'hormiga';
    const x = 500;
    const z = -250 + Math.random() * 500;
    const malvado = createMalvado(tipo, x, z);
    malvados.push(malvado);
}

function animate() {
    if (!gameActive && !gameEnd) return;
    
    updateJardinero();
    updateMalvados();
    
    renderer.render(scene, camera);
    
    if (gameEnd) return;
    if (gameActive) requestAnimationFrame(animate);
}

function updateJardinero() {
    if (jardinero.moving && jardinero.target) {
        const dx = jardinero.target.x - jardinero.x;
        const dz = jardinero.target.z - jardinero.z;
        const dist = Math.sqrt(dx*dx + dz*dz);
        if (dist < 5) {
            jardinero.x = jardinero.target.x;
            jardinero.z = jardinero.target.z;
            jardinero.mesh.position.set(jardinero.x, 0, jardinero.z);
            jardinero.moving = false;
            jardinero.target = null;
            
            // Verificar si hay un objetivo de ataque para eliminar
            if (jardinero.attackTarget) {
                const index = malvados.indexOf(jardinero.attackTarget);
                if (index !== -1) {
                    scene.remove(malvados[index].mesh);
                    malvados.splice(index, 1);
                    sndMalvado.currentTime = 0;
                    sndMalvado.play();
                }
                jardinero.attackTarget = null;
            }
        } else {
            // El oso se mueve más rápido que los enemigos (velocidad 7 vs máximo enemigo 3)
            jardinero.x += dx/dist * 7;
            jardinero.z += dz/dist * 7;
            jardinero.mesh.position.set(jardinero.x, 0, jardinero.z);
        }
    }
}

function updateMalvados() {
    for (let i = malvados.length - 1; i >= 0; i--) {
        if (malvados[i].tipo === 'leniador') {
            // Encontrar el árbol más cercano
            let target = null;
            let minDist = Infinity;
            for (let tree of arboles) {
                const dx = tree.x - malvados[i].x;
                const dz = tree.z - malvados[i].z;
                const dist = Math.sqrt(dx*dx + dz*dz);
                if (dist < minDist) {
                    minDist = dist;
                    target = tree;
                }
            }
            
            if (target) {
                const dx = target.x - malvados[i].x;
                const dz = target.z - malvados[i].z;
                const dist = Math.sqrt(dx*dx + dz*dz);
                if (dist < 10) {
                    scene.remove(target.mesh);
                    arboles.splice(arboles.indexOf(target), 1);
                    scoreArbol--;
                    scoreDiv.textContent = `Árboles: ${scoreArbol} | Plantas: ${scorePlanta}`;
                    scene.remove(malvados[i].mesh);
                    malvados.splice(i, 1);
                    continue;
                } else {
                    malvados[i].x += dx/dist * 3;
                    malvados[i].z += dz/dist * 3;
                    malvados[i].mesh.position.set(malvados[i].x, 0, malvados[i].z);
                }
            } else {
                malvados[i].x -= 2;
                malvados[i].mesh.position.x = malvados[i].x;
            }
        } else {
            // Encontrar la planta más cercana
            let target = null;
            let minDist = Infinity;
            for (let plant of plantas) {
                const dx = plant.x - malvados[i].x;
                const dz = plant.z - malvados[i].z;
                const dist = Math.sqrt(dx*dx + dz*dz);
                if (dist < minDist) {
                    minDist = dist;
                    target = plant;
                }
            }
            
            if (target) {
                const dx = target.x - malvados[i].x;
                const dz = target.z - malvados[i].z;
                const dist = Math.sqrt(dx*dx + dz*dz);
                if (dist < 10) {
                    scene.remove(target.mesh);
                    plantas.splice(plantas.indexOf(target), 1);
                    scorePlanta--;
                    scoreDiv.textContent = `Árboles: ${scoreArbol} | Plantas: ${scorePlanta}`;
                    scene.remove(malvados[i].mesh);
                    malvados.splice(i, 1);
                    continue;
                } else {
                    malvados[i].x += dx/dist * 2.5;
                    malvados[i].z += dz/dist * 2.5;
                    malvados[i].mesh.position.set(malvados[i].x, 0, malvados[i].z);
                }
            } else {
                malvados[i].x -= 2.5;
                malvados[i].mesh.position.x = malvados[i].x;
            }
        }
        
        if (malvados[i] && malvados[i].x < -700) {
            scene.remove(malvados[i].mesh);
            malvados.splice(i, 1);
        }
    }
    
    if (hasPlanted && arboles.length === 0 && plantas.length === 0) {
        endGame(false);
    }
}

// Manejador de clics
renderer.domElement.addEventListener('click', e => {
    if (!gameActive) return;
    
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    // Verificar si se hizo clic en un enemigo
    const enemyMeshes = malvados.map(m => m.mesh);
    const enemyIntersects = raycaster.intersectObjects(enemyMeshes, true);
    
    if (enemyIntersects.length > 0) {
        // Encontrar qué enemigo fue clickeado
        for (let i = 0; i < malvados.length; i++) {
            if (enemyIntersects[0].object.parent === malvados[i].mesh) {
                // Establecer enemigo como objetivo de ataque y mover al oso a la posición del enemigo
                jardinero.attackTarget = malvados[i];
                jardinero.target = { x: malvados[i].x, z: malvados[i].z };
                jardinero.moving = true;
                sndMover.currentTime = 0;
                sndMover.play();
                return;
            }
        }
    }
    
    // Mover jardinero a posición del suelo (cancela cualquier ataque)
    const intersects = raycaster.intersectObject(ground);
    if (intersects.length > 0) {
        const point = intersects[0].point;
        jardinero.target = { x: point.x, z: point.z };
        jardinero.moving = true;
        jardinero.attackTarget = null; // Cancelar ataque
        sndMover.currentTime = 0;
        sndMover.play();
    }
});

// Manejador de clic derecho
renderer.domElement.addEventListener('contextmenu', e => {
    e.preventDefault();
    if (!gameActive) return;
    
    // Limpiar menú existente si hay alguno
    if (contextMenu && document.body.contains(contextMenu)) {
        document.body.removeChild(contextMenu);
        contextMenu = null;
    }
    
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(ground);
    
    if (intersects.length > 0) {
        const point = intersects[0].point;
        
        contextMenu = document.createElement('div');
        contextMenu.style.position = 'absolute';
        contextMenu.style.left = `${e.clientX + 10}px`;
        contextMenu.style.top = `${e.clientY + 10}px`;
        contextMenu.style.background = '#fff';
        contextMenu.style.border = '2px solid #228B22';
        contextMenu.style.borderRadius = '8px';
        contextMenu.style.padding = '8px';
        contextMenu.style.zIndex = 1000;
        contextMenu.innerHTML = '<button id="plantArbol">Plantar Árbol</button><br><button id="plantPlanta">Plantar Planta</button>';
        document.body.appendChild(contextMenu);
        
        document.getElementById('plantArbol').onclick = () => {
            const arbol = createArbol(point.x, point.z);
            arboles.push(arbol);
            scoreArbol++;
            hasPlanted = true;
            scoreDiv.textContent = `Árboles: ${scoreArbol} | Plantas: ${scorePlanta}`;
            sndPlantar.currentTime = 0;
            sndPlantar.play();
            document.body.removeChild(contextMenu);
            contextMenu = null;
        };
        
        document.getElementById('plantPlanta').onclick = () => {
            const planta = createPlanta(point.x, point.z);
            plantas.push(planta);
            scorePlanta++;
            hasPlanted = true;
            scoreDiv.textContent = `Árboles: ${scoreArbol} | Plantas: ${scorePlanta}`;
            sndPlantar.currentTime = 0;
            sndPlantar.play();
            document.body.removeChild(contextMenu);
            contextMenu = null;
        };
        
        setTimeout(() => {
            document.addEventListener('click', function handler(ev) {
                if (contextMenu && !contextMenu.contains(ev.target)) {
                    if (document.body.contains(contextMenu)) {
                        document.body.removeChild(contextMenu);
                        contextMenu = null;
                    }
                    document.removeEventListener('click', handler);
                }
            });
        }, 100);
    }
});

let gameOverlay = null;

function endGame(win) {
    gameActive = false;
    gameEnd = true;
    clearInterval(malvadoInterval);
    
    // Crear superposición
    gameOverlay = document.createElement('div');
    gameOverlay.style.position = 'absolute';
    gameOverlay.style.top = '0';
    gameOverlay.style.left = '0';
    gameOverlay.style.width = '100%';
    gameOverlay.style.height = '100%';
    gameOverlay.style.background = win ? 'rgba(178, 247, 239, 0.85)' : 'rgba(215, 38, 61, 0.85)';
    gameOverlay.style.display = 'flex';
    gameOverlay.style.alignItems = 'center';
    gameOverlay.style.justifyContent = 'center';
    gameOverlay.style.fontSize = '48px';
    gameOverlay.style.fontWeight = 'bold';
    gameOverlay.style.color = win ? '#228B22' : '#fff';
    gameOverlay.style.textAlign = 'center';
    gameOverlay.style.padding = '20px';
    gameOverlay.textContent = win ? '¡Ganaste! El jardín está protegido.' : '¡Perdiste! Los malvados destruyeron tu jardín.';
    container.appendChild(gameOverlay);
    
    startBtn.textContent = win ? 'Jugar de nuevo' : 'Intentar otra vez';
    startBtn.style.display = 'inline-block';
}

startBtn.addEventListener('click', () => {
    if (gameOverlay && container.contains(gameOverlay)) {
        container.removeChild(gameOverlay);
        gameOverlay = null;
    }
    resetGame();
});

// Renderizado inicial
renderer.render(scene, camera);