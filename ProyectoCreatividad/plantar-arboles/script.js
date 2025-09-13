const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDiv = document.getElementById('score');
const startBtn = document.getElementById('startBtn');

// Imágenes SVG
const fondo = new Image();
fondo.src = 'assets/fondo.jpg';
const arbolImg = new Image();
arbolImg.src = 'assets/arbol.png';
const plantaImg = new Image();
plantaImg.src = 'assets/planta.png';
const palaImg = new Image();
palaImg.src = 'assets/pala.svg';
const jardineroImg = new Image();
jardineroImg.src = 'assets/jardinero.png';
const leniadorImg = new Image();
leniadorImg.src = 'assets/leniador.png';
const hormigaImg = new Image();
hormigaImg.src = 'assets/hormiga.png';


let gameActive = false;
let score = 0;
let arboles = [];
let taladores = [];
let hormigas = [];
let maxArboles = 5;
let maxHormigas = 5;
let arbolesPorCiclo = 3;
let cicloPlantacion = 0;
let pala = { x: 60, y: 420, w: 40, h: 80, anim: false, animFrame: 0 };
let jardinero = { x: 0, y: 0, w: 60, h: 100, targetX: 0, targetY: 0, speed: 4 };
let lastPlantTime = 0;
let plantCooldown = 1200; // ms
let taladorInterval;
let hormigaInterval;
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


function drawJardinero() {
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.drawImage(jardineroImg, jardinero.x, jardinero.y, jardinero.w, jardinero.h);
    ctx.restore();
}

function drawTalador(talador) {
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.drawImage(leniadorImg, talador.x, talador.y, talador.w, talador.h);
    ctx.restore();
}

function drawHormiga(hormiga) {
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.drawImage(hormigaImg, hormiga.x, hormiga.y, hormiga.w, hormiga.h);
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
    hormigas.forEach(drawHormiga);
    drawJardinero();
    updateArboles();
    updateTaladores();
    updateHormigas();
    updateJardinero();
    if (gameActive) requestAnimationFrame(gameLoop);
}
function updateJardinero() {
    // Movimiento suave hacia el objetivo
    let dx = jardinero.targetX - jardinero.x;
    let dy = jardinero.targetY - jardinero.y;
    let dist = Math.sqrt(dx*dx + dy*dy);
    if (dist > 2) {
        jardinero.x += dx / dist * jardinero.speed;
        jardinero.y += dy / dist * jardinero.speed;
    }
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
    // Mover jardinero a la posición clickeada
    jardinero.targetX = mx - jardinero.w/2;
    jardinero.targetY = my - jardinero.h/2;
});

startBtn.addEventListener('click', resetGame);

// Mensaje inicial
fondo.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawFondo();
    drawJardinero();
    drawPala();
    ctx.font = 'bold 32px Segoe UI';
    ctx.fillStyle = '#228B22';
    ctx.fillText('Haz crecer tu jardín', 400, 120);
    ctx.font = 'bold 24px Segoe UI';
    ctx.fillStyle = '#555';
    ctx.fillText('Haz clic derecho para plantar árbol o planta', 320, 180);
    ctx.fillText('Haz clic para mover al jardinero', 320, 220);
    ctx.font = 'bold 20px Segoe UI';
    ctx.fillStyle = '#d7263d';
    ctx.fillText('Presiona "Iniciar Juego"', 480, 320);
    startBtn.style.display = 'block';
};
