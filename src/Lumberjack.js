const THREE = window.THREE;

export class Lumberjack {
  constructor(x, z, game) {
    this.speed = 2 + Math.random();
    this.targetTree = null;
    this.state = 'walking'; // walking | chopping
    this.chopTimer = 0;
    // Modelo humanoide básico compuesto por primitivas
    this.mesh = new THREE.Group();
    // torso
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x7a4a2b, roughness: 0.6 });
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 1.2, 12), bodyMat);
    torso.position.y = 1.0;
    torso.castShadow = true;
    this.mesh.add(torso);
    // head
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.8 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 12), headMat);
    head.position.y = 1.9;
    head.castShadow = true;
    this.mesh.add(head);
  // hair (simple cap)
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x2b1b0b, roughness: 0.9 });
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.345, 12, 12), hairMat);
  hair.position.y = 1.95;
  hair.scale.z = 1.05;
  hair.castShadow = false;
  this.mesh.add(hair);
  // evil eyes
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.5 });
  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), eyeMat);
  const rightEye = leftEye.clone();
  leftEye.position.set(-0.09, 1.95, 0.26);
  rightEye.position.set(0.09, 1.95, 0.26);
  this.mesh.add(leftEye);
  this.mesh.add(rightEye);
    // legs
    const legMat = new THREE.MeshStandardMaterial({ color: 0x5b2e1a, roughness: 0.9 });
    const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.8, 8), legMat);
    const rightLeg = leftLeg.clone();
    leftLeg.position.set(-0.15, 0.3, 0);
    rightLeg.position.set(0.15, 0.3, 0);
    leftLeg.castShadow = rightLeg.castShadow = true;
    this.mesh.add(leftLeg);
    this.mesh.add(rightLeg);
    // arms
    const armMat = new THREE.MeshStandardMaterial({ color: 0x7a4a2b, roughness: 0.7 });
    const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.9, 8), armMat);
    const rightArm = leftArm.clone();
    leftArm.position.set(-0.55, 1.05, 0);
    rightArm.position.set(0.55, 1.05, 0);
    leftArm.rotation.z = 0.2;
    rightArm.rotation.z = -0.2;
    leftArm.castShadow = rightArm.castShadow = true;
    this.mesh.add(leftArm);
    this.mesh.add(rightArm);
    // axe held by right arm: simple box blade + handle
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.0, 6), new THREE.MeshStandardMaterial({ color: 0x603813 }));
    handle.position.set(0.9, 1.05, 0);
    handle.rotation.z = -0.9;
    handle.castShadow = true;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.6), new THREE.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 0.3 }));
    blade.position.set(1.2, 1.05, 0);
    blade.rotation.z = -0.6;
    blade.castShadow = true;
    this.mesh.add(handle);
    this.mesh.add(blade);
    // position the group
    this.mesh.position.set(x, 0, z);
    // Bounding box
  this.box = new THREE.Box3().setFromObject(this.mesh);
    // Collision sphere radius
  this.radius = 1.0;
    this.game = game || null;
  }

  update(dt, trees) {
    if (!this.targetTree || !this.targetTree.alive) {
      // Busca el árbol más cercano
      let minDist = Infinity;
      for (const tree of trees) {
        if (!tree.alive) continue;
        const dist = this.mesh.position.distanceTo(tree.group.position);
        if (dist < minDist) {
          minDist = dist;
          this.targetTree = tree;
        }
      }
    }
    if (this.targetTree && this.targetTree.alive) {
      const toTree = new THREE.Vector3().subVectors(this.targetTree.group.position, this.mesh.position);
      const dist = toTree.length();
      if (dist > 1.2) {
        // caminar hacia el árbol
        const dir = toTree.normalize();
        this.mesh.position.addScaledVector(dir, dt * this.speed);
        this.state = 'walking';
      } else {
        // empezar a talar
        this.state = 'chopping';
        this.chopTimer += dt;
        // cada 1.2s talará el árbol
        if (this.chopTimer > 1.2) {
          if (this.targetTree && this.targetTree.alive) {
            // animate talar and notify game when finished
            const treeRef = this.targetTree;
            treeRef.talarAnimated(() => {
              if (this.game) this.game.onTreeCut(treeRef);
            });
          }
          this.chopTimer = 0;
        }
      }
      this.box.setFromObject(this.mesh);
    }
  }

  checkCollision(tree) {
    // Sphere collision based on radius
    const d = this.mesh.position.distanceTo(tree.group.position);
    return d < (this.radius + (tree.radius || 1.5));
  }
}
