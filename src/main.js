// Punto de entrada principal
import { Game } from './Game.js';

try {
	const game = new Game();
	game.start();
} catch (err) {
	console.error('Error al iniciar el juego:', err);
	// Mostrar en la UI si existe
	const uiMsg = document.getElementById('msg');
	if (uiMsg) uiMsg.textContent = 'Error al iniciar: ' + (err.message || err);
	// También alert para que el usuario lo vea sin abrir consola
	alert('Error al iniciar el juego: ' + (err.message || err));
}

// audio UI
const bgAudio = document.getElementById('bgAudio');
const throwSound = document.getElementById('throwSound');
let audioToggleBtn = document.getElementById('audioToggle'); // puede venir del HTML
let audioStarted = false;
let audioEnabled = true; // estado global de audio

// crear botón si no existe (evita duplicados)
if (!audioToggleBtn) {
  const ui = document.getElementById('ui') || document.body;
  audioToggleBtn = document.createElement('button');
  audioToggleBtn.id = 'audioToggle';
  ui.appendChild(audioToggleBtn);
}

// actualizar texto/estado del botón según audioEnabled
function updateAudioButton() {
  if (!audioToggleBtn) return;
  audioToggleBtn.textContent = audioEnabled ? 'Silenciar' : 'Activar sonido';
  audioToggleBtn.setAttribute('aria-pressed', String(audioEnabled));
}

// Habilita / deshabilita todos los audios de la página
function setAllAudioEnabled(enabled) {
  audioEnabled = Boolean(enabled);
  const audios = Array.from(document.querySelectorAll('audio'));
  audios.forEach(a => {
    a.muted = !audioEnabled;
    if (!audioEnabled) {
      // detener sonidos cortos inmediatamente
      try { a.pause(); a.currentTime = 0; } catch (e) {}
    }
  });
  // si habilitamos, intentamos reanudar el audio de fondo
  if (audioEnabled && bgAudio) {
    bgAudio.play().catch(() => { /* autoplay puede fallar; se reintentará con gesto */ });
  }
  updateAudioButton();
}

// Intentar adjuntar el handler solo una vez para evitar listeners duplicados
if (!audioToggleBtn._audioHandlerAttached) {
  audioToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setAllAudioEnabled(!audioEnabled);
    // botón cuenta como gesto del usuario: intentar reproducir bgAudio si activamos
    if (audioEnabled && bgAudio) {
      bgAudio.play().catch(() => {});
      audioStarted = true;
    }
  });
  audioToggleBtn._audioHandlerAttached = true;
}

// mantener sincronía si el audio cambia por otros medios
if (bgAudio) {
  bgAudio.addEventListener('play', updateAudioButton);
  bgAudio.addEventListener('pause', updateAudioButton);
}

// intentar arrancar en el primer gesto del usuario (una sola vez)
async function startBackgroundAudio() {
  if (audioStarted || !bgAudio) return;
  bgAudio.volume = 0.6;
  try {
    await bgAudio.play();
    audioStarted = true;
    setAllAudioEnabled(true);
  } catch (err) {
    console.warn('No se pudo reproducir audio automáticamente:', err);
    audioStarted = false;
  }
  updateAudioButton();
}
window.addEventListener('pointerdown', startBackgroundAudio, { once: true });

// -----------------------------
// sonido click derecho (throwSound) - sin cambios
// -----------------------------
window.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('pointerdown', (e) => {
  if (e.button !== 2) return;
  if (!throwSound || !audioEnabled) return; // no reproducir si audio global está desactivado
  try {
    throwSound.currentTime = 0;
    throwSound.play().catch(err => console.warn('No se pudo reproducir sonido de arrojar:', err));
  } catch (err) {
    console.warn('Error al reproducir throwSound:', err);
  }
});

// iniciar estado visual del botón
updateAudioButton();
