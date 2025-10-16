const THREE = window.THREE;

export class Tree {
  constructor(x, z) {
    this.alive = true;
    this.group = new THREE.Group();
    this.group.position.set(x, 0, z);
    // Variación aleatoria para aspecto orgánico
    const height = 1.6 + Math.random() * 1.2;
    const trunkRadius = 0.18 + Math.random() * 0.18;
    // Tronco
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(trunkRadius * 0.6, trunkRadius, height, 10),
      new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.85 })
    );
    trunk.position.y = height / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    this.group.add(trunk);
    // Copa: varias esferas para más organicidad
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x1f7a1f, roughness: 0.6 });
    const n = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const s = 0.9 + Math.random() * 0.6;
      const sx = (Math.random() - 0.5) * 0.6;
      const sz = (Math.random() - 0.5) * 0.6;
      const leaves = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 10), foliageMat);
      leaves.position.set(sx, height - 0.1 + Math.random() * 0.8, sz);
      leaves.castShadow = true;
      this.group.add(leaves);
    }
    // Bounding box
    this.box = new THREE.Box3();
    this.updateBox();
    this.radius = 1.5; // used for sphere collisions
  }

  updateBox() {
    this.box.setFromObject(this.group);
  }

  talar() {
    // instant talar without animation
    if (!this.alive) return;
    this.alive = false;
    this.group.visible = false;
    this.updateBox();
  }

  // Called when a lumberjack chops the tree: animate a shake and then talar
  talarAnimated(callback) {
    if (!this.alive) return;
    this.alive = false;
    let elapsed = 0;
    const duration = 0.8;
    const origY = this.group.position.y;
    const tick = (dt) => {
      elapsed += dt;
      const t = elapsed / duration;
      // shake
      this.group.position.x += (Math.random() - 0.5) * 0.02;
      this.group.rotation.z = Math.sin(elapsed * 20) * 0.05;
      if (elapsed >= duration) {
        // hide
        this.group.visible = false;
        this.updateBox();
        if (callback) callback();
        return true; // finished
      }
      return false; // not finished
    };
    // register to global animation loop via a simple interval on the group
    const self = this;
    let last = performance.now();
    function rafStep() {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      const done = tick(dt);
      if (!done) requestAnimationFrame(rafStep);
    }
    requestAnimationFrame(rafStep);
  }
}
