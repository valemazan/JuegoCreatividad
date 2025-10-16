const THREE = window.THREE;
import { Environment } from './Environment.js';
import { Player } from './Player.js';
import { Tree } from './Tree.js';
import { Lumberjack } from './Lumberjack.js';
import { Projectile } from './Projectile.js';

export class Game {
  constructor() {
    this.trees = [];
    this.lumberjacks = [];
    this.projectiles = [];
    this.treesAlive = 0;
    //this.timeLeft = 45; //
    this.initialTimeLeft = 15; // segundos (ajustable)
    this.timeLeft = this.initialTimeLeft;

    this.lumberjackInterval = 3; // cada 3 segundos
    this.lastLumberjack = 0;
    this.gameOver = false;
    this.win = false;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 1000);
  this.camera.position.set(0, 12, 28);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    if (!THREE.WebGLRenderer) {
      throw new Error('Three.js WebGLRenderer no disponible');
    }
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    // estilo del canvas para asegurar que se muestre
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    document.body.appendChild(this.renderer.domElement);
  // Color de fondo
  this.renderer.setClearColor(0x87ceeb, 1);

    // Simple manual orbit controls (no external examples dependency)
    this.controls = {
      enabled: true,
      target: new THREE.Vector3(0, 0, 0),
      theta: 0,
      phi: 0.5,
      distance: 28
    };
    this.initOrbitControls();

    this.environment = new Environment(this.scene);
    this.player = new Player(this);
  // Mensaje de estado inicial
  // NOTA: no escribimos el mensaje de resultado en la UI superior.
  // Si quieres mostrar instrucciones iniciales, crea un elemento específico (por ejemplo #instructions).
  try {
    const instructions = document.getElementById('instructions');
    if (instructions) instructions.textContent = 'Click izquierdo: plantar / disparo. Click derecho: lanzar semilla (sniper).';
  } catch(e) {}

  // Asegurar que la cámara mira al origen
  this.camera.lookAt(0, 0, 0);

    this.uiTrees = document.getElementById('trees');
    this.uiTime = document.getElementById('time');
    this.uiMsg = document.getElementById('msg');

    window.addEventListener('resize', () => this.onResize());
  this.renderer.domElement.addEventListener('pointerdown', e => this.onPointerDown(e));
  // prevenir menu contextual y usar click derecho para disparar semillas
  window.addEventListener('contextmenu', e => e.preventDefault());
    // attempt to remove any leftover debug/red boxes that may persist from earlier runs
    try { this.removeDebugObjects(); } catch (e) { /* ignore */ }
     // crear overlay central para mostrar mensaje de fin y botón de reinicio
    this._createGameOverOverlay();
  }

  start() {
    this.lastTime = performance.now();
    this.animate();
    this.spawnInitialTrees();
    // cleanup any debug objects after initial spawn
    try { setTimeout(() => this.removeDebugObjects(), 50); } catch (e) {}
  }

  removeDebugObjects() {
    const toRemove = [];
    this.scene.traverse(obj => {
      if (obj.isMesh && obj.material && obj.material.color) {
        const c = obj.material.color;
        // detect reddish materials
        if (c.r > 0.8 && c.g < 0.3 && c.b < 0.3) {
          // estimate size
          const box = new THREE.Box3().setFromObject(obj);
          const size = new THREE.Vector3();
          box.getSize(size);
          const vol = Math.abs(size.x * size.y * size.z);
          if (vol > 0.4) {
            toRemove.push(obj);
          }
        }
      }
    });
    for (const o of toRemove) {
      if (o.parent) o.parent.remove(o);
    }
  }

  spawnInitialTrees() {
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * 18 - 9;
      const z = Math.random() * 18 - 9;
      this.plantTree(x, z);
    }
  }

  plantTree(x, z) {
    const tree = new Tree(x, z);
    this.scene.add(tree.group);
    this.trees.push(tree);
    this.treesAlive++;
    tree.updateBox();
    this.updateUI();
  }

  spawnLumberjack() {
    // Aparece en el borde
    const edge = Math.random() < 0.5 ? -20 : 20;
    const x = Math.random() < 0.5 ? edge : Math.random() * 18 - 9;
    const z = Math.random() < 0.5 ? Math.random() * 18 - 9 : edge;
    const lumberjack = new Lumberjack(x, z, this);
    this.scene.add(lumberjack.mesh);
    this.lumberjacks.push(lumberjack);
  }

  onTreeCut(tree) {
    // Ensure tree removed only once
    if (!tree) return;
    tree.group.visible = false;
    tree.alive = false;
    tree.updateBox();
    this.trees = this.trees.filter(t => t !== tree);
    this.treesAlive = Math.max(0, this.treesAlive - 1);
    this.updateUI();
  }

  onPointerDown(e) {
    if (this.gameOver) return;
    // Right-click (button 2) => fire seed sniper
    if (e.button === 2) {
      const mouse = new THREE.Vector2();
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, this.camera);
      const intersects = raycaster.intersectObject(this.environment.ground);
      let dir;
      if (intersects.length > 0) {
        const point = intersects[0].point;
        dir = new THREE.Vector3().subVectors(point, this.camera.position).normalize();
      } else {
        dir = this.camera.getWorldDirection(new THREE.Vector3());
      }
      const seed = Projectile.makeSeed(this.camera.position, dir);
      this.scene.add(seed.mesh);
      this.projectiles.push(seed);
      return;
    }
    // Raycast para plantar árbol o atacar leñador
    const mouse = new THREE.Vector2();
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);
    // Suelo
    const intersects = raycaster.intersectObject(this.environment.ground);
    if (intersects.length > 0) {
      const point = intersects[0].point;
      this.plantTree(point.x, point.z);
      return;
    }
    // Leñadores
    const lumberjackMeshes = this.lumberjacks.map(l => l.mesh);
    const hits = raycaster.intersectObjects(lumberjackMeshes);
    if (hits.length > 0) {
      const lj = this.lumberjacks.find(l => l.mesh === hits[0].object);
      if (lj) {
        this.scene.remove(lj.mesh);
        this.lumberjacks = this.lumberjacks.filter(l => l !== lj);
      }
      return;
    }
    // Lanzar proyectil
    if (this.trees.length > 0) {
      const proj = new Projectile(this.camera.position, this.camera.getWorldDirection(new THREE.Vector3()));
      this.scene.add(proj.mesh);
      this.projectiles.push(proj);
    }
  }

  updateUI() {
    this.uiTrees.textContent = `Árboles: ${this.treesAlive}`;
    this.uiTime.textContent = `Tiempo: ${Math.max(0, Math.floor(this.timeLeft))}`;

    if (this.gameOver) {
      // mostramos el resultado SOLO en el overlay central
      document.getElementById('ui').className = this.win ? 'win' : 'lose';
      if (this._overlay) this._showGameOverOverlay(this.win ? '¡Ganaste! El bosque está a salvo.' : '¡Perdiste! Los leñadores arrasaron el bosque.');
    } else {
      // durante el juego no mostramos texto de resultado en la UI superior
      document.getElementById('ui').className = '';
      if (this._overlay) this._hideGameOverOverlay();
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (!this.gameOver) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        this.win = true;
        this.gameOver = true;
      }
      // Spawnea leñadores
      if (now - this.lastLumberjack > this.lumberjackInterval * 1000) {
        this.spawnLumberjack();
        this.lastLumberjack = now;
      }
      // Actualiza environment (nubes, etc.)
      if (this.environment && typeof this.environment.update === 'function') this.environment.update(dt);
      // Actualiza leñadores
      for (const lj of this.lumberjacks) {
        lj.update(dt, this.trees);
        // Colisión con árbol
        for (const tree of this.trees) {
          if (!tree.alive) continue;
          if (lj.checkCollision(tree)) {
            tree.talar();
            this.treesAlive--;
            this.updateUI();
            if (this.treesAlive <= 0) {
              this.gameOver = true;
              this.win = false;
            }
          }
        }
      }
      // Actualiza proyectiles (usar copia de arrays para evitar modificaciones durante iteración)
      for (const proj of [...this.projectiles]) {
        proj.update(dt);
        // quitar proyectiles fuera de rango
        if (proj.mesh.position.length() > 200) {
          this.scene.remove(proj.mesh);
          this.projectiles = this.projectiles.filter(p => p !== proj);
          continue;
        }
        for (const lj of [...this.lumberjacks]) {
          if (proj.checkCollision(lj)) {
            this.scene.remove(lj.mesh);
            this.lumberjacks = this.lumberjacks.filter(l => l !== lj);
            this.scene.remove(proj.mesh);
            this.projectiles = this.projectiles.filter(p => p !== proj);
            break;
          }
        }
      }
    }
    this.updateUI();
    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  initOrbitControls() {
    const onPointerDown = (e) => {
      if (!this.controls.enabled) return;
      this.isPointerDown = true;
      this.pointerStart = { x: e.clientX, y: e.clientY };
    };
    const onPointerMove = (e) => {
      if (!this.isPointerDown) return;
      const dx = (e.clientX - this.pointerStart.x) * 0.005;
      const dy = (e.clientY - this.pointerStart.y) * 0.005;
      this.controls.theta -= dx;
      this.controls.phi = Math.max(0.1, Math.min(Math.PI/2 - 0.1, this.controls.phi + dy));
      this.pointerStart = { x: e.clientX, y: e.clientY };
    };
    const onPointerUp = () => { this.isPointerDown = false; };
    const onWheel = (e) => { this.controls.distance = Math.max(5, Math.min(80, this.controls.distance + e.deltaY * 0.05)); };
    this.renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    this.renderer.domElement.addEventListener('wheel', onWheel);
  }

    _createGameOverOverlay() {
    if (document.getElementById('game-over-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'game-over-overlay';
    overlay.style.position = 'fixed';
    overlay.style.left = '0';
    overlay.style.top = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.fontFamily = 'Arial';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '9999';

    const box = document.createElement('div');
    box.style.minWidth = '320px';
    box.style.maxWidth = '90%';
    box.style.padding = '24px';
    box.style.borderRadius = '12px';
    box.style.textAlign = 'center';
    box.style.background = 'rgba(241, 239, 239, 0.9)';
    box.style.boxShadow = '0 6px 24px rgba(0,0,0,0.3)';
    box.style.pointerEvents = 'auto';

    const msg = document.createElement('div');
    msg.id = 'game-over-message';
    msg.style.fontSize = '22px';
    msg.style.fontWeight = '700';
    msg.style.color = '#222';
    msg.style.marginBottom = '16px';

    const btn = document.createElement('button');
    btn.id = 'game-over-restart';
    btn.textContent = 'Jugar de nuevo';
    btn.style.padding = '10px 18px';
    btn.style.fontSize = '16px';
    btn.style.border = 'none';
    btn.style.borderRadius = '8px';
    btn.style.cursor = 'pointer';
    btn.style.background = '#dd940cff';
    btn.style.color = '#fdfbfbff';

    btn.addEventListener('click', () => {
      try { this.reset(); } catch (e) { console.warn(e); }
    });

    box.appendChild(msg);
    box.appendChild(btn);
    overlay.appendChild(box);
    overlay.style.display = 'none';
    document.body.appendChild(overlay);
    this._overlay = overlay;
    this._overlayMsg = msg;
    this._overlayBtn = btn;
  }

  _showGameOverOverlay(text) {
    if (!this._overlay) this._createGameOverOverlay();
    this._overlayMsg.textContent = text || '';
    this._overlay.style.display = 'flex';
    this._overlay.style.pointerEvents = 'auto';
  }

  _hideGameOverOverlay() {
    if (!this._overlay) return;
    this._overlay.style.display = 'none';
    this._overlay.style.pointerEvents = 'none';
  }

  reset() {
    // limpiar árboles
    for (const t of [...this.trees]) {
      try { this.scene.remove(t.group); } catch(e) {}
    }
    // limpiar leñadores
    for (const l of [...this.lumberjacks]) {
      try { this.scene.remove(l.mesh); } catch(e) {}
    }
    // limpiar proyectiles
    for (const p of [...this.projectiles]) {
      try { this.scene.remove(p.mesh); } catch(e) {}
    }
    // reset arrays y estado
    this.trees = [];
    this.lumberjacks = [];
    this.projectiles = [];
    this.treesAlive = 0;
    this.gameOver = false;
    this.win = false;
    this.timeLeft = this.initialTimeLeft;
    this.lastLumberjack = performance.now();
    this.lastTime = performance.now();
    // respawnear árboles iniciales y ocultar overlay
    this.spawnInitialTrees();
    this._hideGameOverOverlay();
    this.updateUI();
  }
}
