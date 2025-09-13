const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDiv = document.getElementById('score');
const startBtn = document.getElementById('startBtn');

// Imágenes SVG
const fondo = new Image();
fondo.src = 'assets/fondo-jardin.svg';
const arbolImg = new Image();
arbolImg.src = 'assets/arbol.svg';
const palaImg = new Image();
palaImg.src = 'assets/pala.svg';
const personaImg = new Image();
personaImg.src = 'assets/persona.svg';

let gameActive = false;
let score = 0;
let arboles = [];
let taladores = [];
let maxArboles = 5;
let arbolesPorCiclo = 3;
let cicloPlantacion = 0;
let pala = { x: 60, y: 420, w: 40, h: 80, anim: false, animFrame: 0 };
let lastPlantTime = 0;
let plantCooldown = 1200; // ms
let taladorInterval;
let taladorSpeed = 2.2;
let animInterval;

function drawFondo() {
    ctx.drawImage(fondo, 0, 0, canvas.width, canvas.height);
}

function drawPala() {
    ctx.save();
    if (pala.anim) {
        ctx.translate(pala.x + pala.w/2, pala.y + pala.h/2);
        ctx.rotate(Math.sin(pala.animFrame/6) * 0.5);
        ctx.drawImage(palaImg, -pala.w/2, -pala.h/2, pala.w, pala.h);
        ctx.restore();
    } else {
        ctx.drawImage(palaImg, pala.x, pala.y, pala.w, pala.h);
    }
}

function drawArbol(arbol) {
    ctx.save();
    ctx.globalAlpha = arbol.grow < 1 ? arbol.grow : 1;
    ctx.drawImage(arbolImg, arbol.x, arbol.y - arbol.h * arbol.grow, arbol.w, arbol.h * arbol.grow);
    ctx.restore();
}

function drawTalador(talador) {
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.drawImage(personaImg, talador.x, talador.y, talador.w, talador.h);
    ctx.restore();
}

function resetGame() {
    score = 0;
    arboles = [];
    taladores = [];
    cicloPlantacion = 0;
    pala.anim = false;
    pala.animFrame = 0;
    scoreDiv.textContent = 'Árboles plantados: 0';
    startBtn.style.display = 'none';
    gameActive = true;
    lastPlantTime = 0;
    taladorSpeed = 2.2;
    clearInterval(taladorInterval);
    taladorInterval = setInterval(spawnTalador, 3500);
    animInterval = setInterval(() => {
        if (pala.anim) pala.animFrame++;
    }, 60);
    requestAnimationFrame(gameLoop);
}

function spawnTalador() {
    if (!gameActive) return;
    // Talador aparece en el borde derecho
    const y = 320 + Math.random() * 60;
    taladores.push({ x: canvas.width, y, w: 60, h: 100, hit: false });
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawFondo();
    drawPala();
    arboles.forEach(drawArbol);
    taladores.forEach(drawTalador);
    updateArboles();
    updateTaladores();
    if (gameActive) requestAnimationFrame(gameLoop);
}

function updateArboles() {
    for (const arbol of arboles) {
        if (arbol.grow < 1) arbol.grow += 0.008;
    }
}

function updateTaladores() {
    for (let i = taladores.length - 1; i >= 0; i--) {
        taladores[i].x -= taladorSpeed;
        // Si el talador toca un árbol adulto, lo tala
        for (let j = arboles.length - 1; j >= 0; j--) {
            const arbol = arboles[j];
            if (arbol.grow >= 1 &&
                taladores[i].x < arbol.x + arbol.w &&
                taladores[i].x + taladores[i].w > arbol.x &&
                taladores[i].y < arbol.y &&
                taladores[i].y + taladores[i].h > arbol.y - arbol.h) {
                arboles.splice(j, 1);
                scoreDiv.textContent = 'Árboles plantados: ' + arboles.length;
            }
        }
        // Si el talador sale de la pantalla
        if (taladores[i].x + taladores[i].w < 0) taladores.splice(i, 1);
    }
}

canvas.addEventListener('click', e => {
    if (!gameActive) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    // Plantar árbol
    if (my > 340 && arboles.length < maxArboles && Date.now() - lastPlantTime > plantCooldown) {
        arboles.push({ x: mx - 30, y: 420, w: 60, h: 100, grow: 0.1 });
        scoreDiv.textContent = 'Árboles plantados: ' + arboles.length;
        pala.anim = true;
        pala.animFrame = 0;
        lastPlantTime = Date.now();
        setTimeout(() => { pala.anim = false; }, 600);
    }
    // Golpear talador
    for (let i = taladores.length - 1; i >= 0; i--) {
        const t = taladores[i];
        if (
            mx > t.x && mx < t.x + t.w &&
            my > t.y && my < t.y + t.h
        ) {
            taladores.splice(i, 1);
            pala.anim = true;
            pala.animFrame = 0;
            setTimeout(() => { pala.anim = false; }, 400);
        }
    }
});

startBtn.addEventListener('click', resetGame);

// Mensaje inicial
fondo.onload = () => {
    ctx.drawImage(fondo, 0, 0, canvas.width, canvas.height);
    ctx.drawImage(palaImg, pala.x, pala.y, pala.w, pala.h);
    ctx.font = 'bold 32px Segoe UI';
    ctx.fillStyle = '#228B22';
    ctx.fillText('Haz crecer tu jardín', 300, 120);
    ctx.font = 'bold 24px Segoe UI';
    ctx.fillStyle = '#555';
    ctx.fillText('Haz clic en la tierra para plantar árboles', 220, 180);
    ctx.fillText('Haz clic en los taladores para ahuyentarlos', 220, 220);
    ctx.font = 'bold 20px Segoe UI';
    ctx.fillStyle = '#d7263d';
    ctx.fillText('Presiona "Iniciar Juego"', 340, 320);
};
