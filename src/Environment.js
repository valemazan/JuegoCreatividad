const THREE = window.THREE;

export class Environment {
  constructor(scene) {
    // Niebla atmosférica (exponencial)
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.002);

    // Cielo (esfera simple)
    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(200, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0x87ceeb, side: THREE.BackSide })
    );
    scene.add(this.sky);

    // Suelo con textura de pasto procedimental
    const groundGeo = new THREE.PlaneGeometry(80, 80);
    const grassTex = this._createGrassTexture();
    grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;
    grassTex.repeat.set(20, 20);
    this.ground = new THREE.Mesh(
      groundGeo,
      new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 })
    );
    this.ground.rotation.x = -Math.PI/2;
    this.ground.position.y = 0;
    this.ground.receiveShadow = true;
    scene.add(this.ground);

    // Luces: sol direccional + ambiente suave
    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(10, 20, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.left = -40;
    sun.shadow.camera.right = 40;
    sun.shadow.camera.top = 40;
    sun.shadow.camera.bottom = -40;
    sun.shadow.camera.far = 100;
    scene.add(sun);

    const ambient = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(ambient);

    // Opcional hemisferic para tonos cielo/tierra suaves
    const hemi = new THREE.HemisphereLight(0x88aaff, 0x443322, 0.25);
    scene.add(hemi);

    // Elementos decorativos: piedras y flores
    this._populateDecorations(scene);

    // Nubes
    this.clouds = [];
    this._createClouds(scene);
  }

  _createClouds(scene) {
    const cloudTex = this._createCloudTexture();
    const cloudMat = new THREE.MeshBasicMaterial({ map: cloudTex, transparent: true, depthWrite: false });
    for (let i = 0; i < 8; i++) {
      const w = 6 + Math.random() * 10;
      const h = w * 0.5;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), cloudMat.clone());
      mesh.position.set((Math.random()-0.5) * 100, 25 + Math.random() * 10, (Math.random()-0.5) * 100);
      mesh.rotation.y = Math.random() * Math.PI;
      mesh.material.opacity = 0.85 - Math.random() * 0.4;
      mesh.receiveShadow = false;
      mesh.castShadow = false;
      scene.add(mesh);
      this.clouds.push({ mesh, speed: 0.5 + Math.random() * 0.6 });
    }
  }

  _createCloudTexture() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    // clear
    ctx.clearRect(0,0,size,size);
    // draw several overlapping circles
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    for (let i=0;i<12;i++){
      const x = size/2 + (Math.random()-0.5) * 60;
      const y = size/2 + (Math.random()-0.5) * 30;
      const r = 30 + Math.random()*40;
      ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    }
    return new THREE.CanvasTexture(canvas);
  }

  update(dt) {
    // move clouds slowly
    for (const c of this.clouds) {
      c.mesh.position.x += c.speed * dt * 2;
      if (c.mesh.position.x > 80) c.mesh.position.x = -80;
    }
  }

  _createGrassTexture() {
    // Genera una textura de césped procedural con ruido simple
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    // base
    ctx.fillStyle = '#4a7a2a';
    ctx.fillRect(0, 0, size, size);
    // hojas ligeras
    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const w = Math.random() * 2 + 0.5;
      const h = Math.random() * 6 + 2;
      ctx.fillStyle = `rgba(${80+Math.random()*30|0}, ${120+Math.random()*40|0}, ${40+Math.random()*30|0}, ${0.6})`;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((Math.random()-0.5) * 0.6);
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    return tex;
  }

  _populateDecorations(scene) {
    const deco = new THREE.Group();
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x7a7a7a, roughness: 0.9 });
    const flowerColors = [0xffc0cb, 0xffe066, 0xff9f1c, 0xff66b2];
    for (let i = 0; i < 40; i++) {
      const x = (Math.random() - 0.5) * 70;
      const z = (Math.random() - 0.5) * 70;
      // piedras
      if (Math.random() < 0.6) {
        const s = 0.2 + Math.random() * 0.8;
        const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), stoneMat);
        stone.position.set(x, s * 0.5, z);
        stone.castShadow = false;
        deco.add(stone);
      }
      // pequeñas flores
      if (Math.random() < 0.5) {
        const fc = flowerColors[Math.floor(Math.random() * flowerColors.length)];
        const f = new THREE.Mesh(new THREE.CircleGeometry(0.08, 6), new THREE.MeshStandardMaterial({ color: fc, roughness: 0.8 }));
        f.rotation.x = -Math.PI/2;
        f.position.set(x + (Math.random()-0.5)*1.2, 0.01, z + (Math.random()-0.5)*1.2);
        deco.add(f);
      }
    }
    scene.add(deco);
  }
}
