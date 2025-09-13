const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDiv = document.getElementById('score');
const startBtn = document.getElementById('startBtn');

// Imágenes
const campoImg = new Image();
campoImg.src = 'assets/fondo.jpg';
// Sonidos
const sndPlantar = new Audio('assets/plantar.mp3');
const sndMalvado = new Audio('assets/malvado.mp3');
const sndMover = new Audio('assets/mover.mp3');
const jardineroImg = new Image();
jardineroImg.src = 'assets/jardinero.png';
const arbolImg = new Image();
arbolImg.src = 'assets/arbol.png';
const plantaImg = new Image();
plantaImg.src = 'assets/planta.png';
const leniadorImg = new Image();
leniadorImg.src = 'assets/leniador.png';
const hormigaImg = new Image();
hormigaImg.src = 'assets/hormiga.png';

let gameActive = false;
let scoreArbol = 0;
let scorePlanta = 0;
let arboles = [];
let plantas = [];
let malvados = [];
let jardinero = { x: 100, y: 600, w: 80, h: 100, moving: false, target: null };
let malvadoInterval;
let gameEnd = false;

function drawFondo() {
    ctx.drawImage(campoImg, 0, 0, canvas.width, canvas.height);
}

function drawJardinero() {
    ctx.drawImage(jardineroImg, jardinero.x, jardinero.y, jardinero.w, jardinero.h);
}

function drawArbol(arbol) {
    ctx.drawImage(arbolImg, arbol.x, arbol.y, arbol.w, arbol.h);
}

function drawPlanta(planta) {
    ctx.drawImage(plantaImg, planta.x, planta.y, planta.w, planta.h);
}

function drawMalvado(malvado) {
    ctx.drawImage(malvado.tipo === 'leniador' ? leniadorImg : hormigaImg, malvado.x, malvado.y, malvado.w, malvado.h);
}

function resetGame() {
    scoreArbol = 0;
    scorePlanta = 0;
    arboles = [];
    plantas = [];
    malvados = [];
    jardinero.x = 100;
    jardinero.y = 600;
    jardinero.moving = false;
    jardinero.target = null;
    scoreDiv.textContent = 'Árboles: 0 | Plantas: 0';
    startBtn.style.display = 'none';
    gameActive = true;
    gameEnd = false;
    clearInterval(malvadoInterval);
    // Espera unos segundos antes de que aparezcan los malvados
    setTimeout(() => {
        malvadoInterval = setInterval(spawnMalvado, 4000);
    }, 6000);
    requestAnimationFrame(gameLoop);
}

function spawnMalvado() {
    if (!gameActive) return;
    // Alterna entre leniador y hormiga
    const tipo = Math.random() < 0.5 ? 'leniador' : 'hormiga';
    const x = canvas.width - 100;
    const y = 100 + Math.random() * 500;
    malvados.push({ tipo, x, y, w: tipo === 'leniador' ? 80 : 40, h: tipo === 'leniador' ? 100 : 40 });
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawFondo();
    drawJardinero();
    arboles.forEach(drawArbol);
    plantas.forEach(drawPlanta);
    malvados.forEach(drawMalvado);
    updateJardinero();
    updateMalvados();
    if (gameEnd) return;
    if (gameActive) requestAnimationFrame(gameLoop);
}

function updateJardinero() {
    if (jardinero.moving && jardinero.target) {
        const dx = jardinero.target.x - jardinero.x;
        const dy = jardinero.target.y - jardinero.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 5) {
            jardinero.x = jardinero.target.x;
            jardinero.y = jardinero.target.y;
            jardinero.moving = false;
            jardinero.target = null;
        } else {
            jardinero.x += dx/dist * 6;
            jardinero.y += dy/dist * 6;
        }
    }
}

function updateMalvados() {
    for (let i = malvados.length - 1; i >= 0; i--) {
        if (malvados[i].tipo === 'leniador') {
            // El leniador avanza hacia el árbol más cercano
            let target = arboles[0];
            if (target) {
                const dx = target.x - malvados[i].x;
                const dy = target.y - malvados[i].y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < 10) {
                    arboles.splice(arboles.indexOf(target), 1);
                    scoreArbol--;
                    scoreDiv.textContent = `Árboles: ${scoreArbol} | Plantas: ${scorePlanta}`;
                    malvados.splice(i, 1);
                    continue;
                } else {
                    malvados[i].x += dx/dist * 3;
                    malvados[i].y += dy/dist * 3;
                }
            } else {
                malvados[i].x -= 2;
            }
        } else {
            // La hormiga avanza hacia la planta más cercana
            let target = plantas[0];
            if (target) {
                const dx = target.x - malvados[i].x;
                const dy = target.y - malvados[i].y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < 10) {
                    plantas.splice(plantas.indexOf(target), 1);
                    scorePlanta--;
                    scoreDiv.textContent = `Árboles: ${scoreArbol} | Plantas: ${scorePlanta}`;
                    malvados.splice(i, 1);
                    continue;
                } else {
                    malvados[i].x += dx/dist * 2.5;
                    malvados[i].y += dy/dist * 2.5;
                }
            } else {
                malvados[i].x -= 2.5;
            }
        }
        // Si sale de la pantalla
        if (malvados[i].x < -100) malvados.splice(i, 1);
    }
    // Condición de derrota SOLO si ya plantaste algo
    if ((scoreArbol > 0 || scorePlanta > 0) && scoreArbol <= 0 && scorePlanta <= 0 && (arboles.length === 0 && plantas.length === 0)) {
        endGame(false);
    }
}

canvas.addEventListener('click', e => {
    if (!gameActive) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    // Mover jardinero
    jardinero.target = { x: mx - jardinero.w/2, y: my - jardinero.h/2 };
    jardinero.moving = true;
    sndMover.currentTime = 0;
    sndMover.play();
    // Mostrar mensaje de movimiento
    ctx.save();
    ctx.font = 'bold 18px Segoe UI';
    ctx.fillStyle = '#228B22';
    ctx.fillText('Moverme aquí', mx, my - 10);
    ctx.restore();
});

canvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    if (!gameActive) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    // Opciones de plantar
    const menu = document.createElement('div');
    menu.style.position = 'absolute';
    menu.style.left = `${mx + 10}px`;
    menu.style.top = `${my + 10}px`;
    menu.style.background = '#fff';
    menu.style.border = '2px solid #228B22';
    menu.style.borderRadius = '8px';
    menu.style.padding = '8px';
    menu.style.zIndex = 1000;
    menu.innerHTML = '<button id="plantArbol">Plantar Árbol</button><br><button id="plantPlanta">Plantar Planta</button>';
    document.body.appendChild(menu);
    document.getElementById('plantArbol').onclick = () => {
      //  arboles.push({ x: mx - 40, y: my - 100, w: 80, h: 100 });
        arboles.push({ x: mx - 40, y: my - 100, w: 120, h: 160 }); // árbol más grande
        scoreArbol++;
        scoreDiv.textContent = `Árboles: ${scoreArbol} | Plantas: ${scorePlanta}`;
        sndPlantar.currentTime = 0;
        sndPlantar.play();
        document.body.removeChild(menu);
    };
    document.getElementById('plantPlanta').onclick = () => {
        plantas.push({ x: mx - 20, y: my - 40, w: 40, h: 40 });
        scorePlanta++;
        scoreDiv.textContent = `Árboles: ${scoreArbol} | Plantas: ${scorePlanta}`;
        sndPlantar.currentTime = 0;
        sndPlantar.play();
        document.body.removeChild(menu);
    };
    // Cerrar menú si se hace click fuera
    setTimeout(() => {
        document.addEventListener('click', function handler(ev) {
            if (!menu.contains(ev.target)) {
                if (document.body.contains(menu)) document.body.removeChild(menu);
                document.removeEventListener('click', handler);
            }
        });
    }, 100);
});

canvas.addEventListener('mousedown', e => {
    if (!gameActive) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    // Eliminar malvados
    for (let i = malvados.length - 1; i >= 0; i--) {
        const m = malvados[i];
        if (mx > m.x && mx < m.x + m.w && my > m.y && my < m.y + m.h) {
            malvados.splice(i, 1);
            sndMalvado.currentTime = 0;
            sndMalvado.play();
        }
    }
});

function endGame(win) {
    gameActive = false;
    gameEnd = true;
    clearInterval(malvadoInterval);
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = win ? '#b2f7ef' : '#d7263d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    ctx.font = 'bold 60px Segoe UI';
    ctx.fillStyle = win ? '#228B22' : '#fff';
    ctx.fillText(win ? '¡Ganaste! El jardín está protegido.' : '¡Perdiste! Los malvados destruyeron tu jardín.', 120, 350);
    startBtn.textContent = win ? 'Jugar de nuevo' : 'Intentar otra vez';
    startBtn.style.display = 'inline-block';
    ctx.restore();
}

startBtn.addEventListener('click', resetGame);

// Mensaje inicial
fondo.onload = () => {
    ctx.drawImage(fondo, 0, 0, canvas.width, canvas.height);
    ctx.drawImage(jardineroImg, jardinero.x, jardinero.y, jardinero.w, jardinero.h);
    ctx.font = 'bold 48px Segoe UI';
    ctx.fillStyle = '#228B22';
    ctx.fillText('Cuida el jardín', 400, 120);
    ctx.font = 'bold 32px Segoe UI';
    ctx.fillStyle = '#555';
    ctx.fillText('Haz click para mover al jardinero', 320, 180);
    ctx.fillText('Click derecho para plantar árbol o planta', 320, 220);
    ctx.fillText('Haz click en los malvados para eliminarlos', 320, 260);
    ctx.font = 'bold 28px Segoe UI';
    ctx.fillStyle = '#d7263d';
    ctx.fillText('Presiona "Iniciar Juego"', 500, 320);
};
