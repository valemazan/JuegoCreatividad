const THREE = window.THREE;

export class Projectile {
  constructor(origin, direction, opts = {}) {
    this.speed = opts.speed || 12;
    const size = opts.size || 0.25;
    const color = opts.color || 0x44ccff;
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(size, 10, 10),
      new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.1 })
    );
    this.mesh.position.copy(origin.clone());
    this.direction = direction.clone().normalize();
    this.box = new THREE.Box3();
    this.updateBox();
  }

  update(dt) {
    this.mesh.position.addScaledVector(this.direction, dt * this.speed);
    this.updateBox();
  }

  checkCollision(lumberjack) {
    const d = this.mesh.position.distanceTo(lumberjack.mesh.position);
    return d < (0.25 + (lumberjack.radius || 0.8));
  }

  updateBox() {
    this.box.setFromObject(this.mesh);
  }

  static makeSeed(origin, direction) {
    return new Projectile(origin, direction, { speed: 28, size: 0.18, color: 0x88ff66 });
  }
}
