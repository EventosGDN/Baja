// Crear partículas de fuego
function createFireParticles() {
const container = document.getElementById('fireParticles');
const particleCount = 20;
for (let i = 0; i < particleCount; i++) {
const particle = document.createElement('div');
particle.className = 'fire-particle';
particle.style.left = Math.random() * 100 + '%';
particle.style.animationDelay = Math.random() * 3 + 's';
particle.style.animationDuration = (2 + Math.random() * 2) + 's';
container.appendChild(particle);
}
}
// Inicializar partículas al cargar la página
document.addEventListener('DOMContentLoaded', () => {
createFireParticles();
});
// Variables para grabación de audio
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let recordingTimer = null;
let recordingStartTime = null;
// Elementos del DOM
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const recordBtn = document.getElementById('recordBtn');
const modeSelect = document.getElementById('modeSelect');
const chatContainer = document.getElementById('chatContainer');
const loading = document.getElementById('loading');
const loadingText = document.getElementById('loadingText');
const toast = document.getElementById('toast');
const audioStatus = document.getElementById('audioStatus');
const recordingTimerElement = document.getElementById('recordingTimer');
// Auto-resize textarea
messageInput.addEventListener('input', function() {
this.style.height = 'auto';
this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});
// Enviar con Enter
messageInput.addEventListener('keydown', function(e) {
if (e.key === 'Enter' && !e.shiftKey) {
e.preventDefault();
sendMessage();
}
});
// Event listeners
sendBtn.addEventListener('click', sendMessage);
recordBtn.addEventListener('click', toggleRecording);
// FUNCIÓN ACTUALIZADA PARA TRANSFORMAR TEXTO CON MENSAJES SEPARADOS
async function transformText(text, mode) {
const PROMPTS = {
  formal: `Actuás como un experto en comunicación profesional en Argentina.
Convertí el siguiente mensaje emocional en una versión firme y profesional, adecuada para contextos laborales.
Mantené la intención del mensaje, pero usá lenguaje claro, directo y sin agresividad.
Dame 1 o 2 versiones reformuladas, separadas por " ||| ".
No uses etiquetas ni explicaciones. Respondé solo con el texto final.

Mensaje: "${text}"`,

  amigable: `Actuás como una persona cálida y directa, con estilo argentino.
Reformulá este mensaje fuerte en uno más amigable, relajado y copado, pero sin perder la firmeza.
Podés dar hasta 2 versiones distintas separadas por " ||| ".
No agregues etiquetas, títulos ni explicaciones. Solo el texto transformado.

Mensaje: "${text}"`,

  directo: `Reformulá este mensaje en un tono directo y respetuoso.
Debe ser claro, sin vueltas, pero sin sonar agresivo.
Dame una o dos versiones separadas por " ||| ".
No uses etiquetas, números ni explicaciones. Solo el texto final.

Mensaje: "${text}"`,

  diplomatico: `Sos un experto en comunicación estratégica y diplomacia.
Convertí este mensaje fuerte en una versión persuasiva, hábil y profesional.
Transmití la firmeza con elegancia y lenguaje medido.
Podés ofrecer una o dos versiones separadas por " ||| ".
No agregues títulos, aclaraciones ni introducciones. Solo el texto transformado.

Mensaje: "${text}"`
};

try {
console.log('Enviando a API real:', text, mode);
const response = await fetch('/api/transform', {
method: 'POST',
headers: {
'Content-Type': 'application/json',
},
body: JSON.stringify({
prompt: PROMPTS[mode],
mode: mode
})
});
if (!response.ok) {
const errorData = await response.json().catch(() => ({}));
throw new Error(`Error ${response.status}: ${errorData.error ||
response.statusText}`);
}
const data = await response.json();
console.log('Respuesta de API:', data);
return data;
} catch (error) {
console.error('Error llamando a la API real:', error);
throw new Error(`No se pudo transformar el mensaje:
${error.message}`);
}
}
// FUNCIÓN ACTUALIZADA PARA PROCESAR MENSAJES CON OPCIONES MÚLTIPLES
async function processTextMessage(text) {
  const canUse = await consumeUse();
    if (!canUse) return;
const mode = modeSelect.value;
// Limpiar empty state si existe
const emptyState = chatContainer.querySelector('.empty-state');
if (emptyState) {
emptyState.remove();
}
// Agregar mensaje original
addMessage(text, 'original');
// Mostrar loading
showLoading('Transformando mensaje...');
try {
const response = await transformText(text, mode);
hideLoading();
// Agregar primera transformación
addMessage(response.result, 'transformed');
// Si hay segunda opción, agregar conector y segunda opción con delay
if (response.hasSecondOption && response.secondOption) {
// Delay para que se sienta más natural
setTimeout(() => {
// Agregar mensaje conector (ahora como mensaje transformado)
addMessage(response.connector, 'connector');
// Otro pequeño delay para la segunda opción
setTimeout(() => {
addMessage(response.secondOption, 'transformed');
}, 800);
}, 1200);
}
} catch (error) {
hideLoading();
showToast(
'❌ Error al transformar el mensaje: ' 
+ error.message);
console.error(error);
}
}
// Verificar límites del usuario
async function checkUserLimits() {
    if (isCheckingLimits || !currentUser) return;
    
    isCheckingLimits = true;
    try {
        const response = await fetch('/api/check-limits', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: currentUser.uid,
                action: 'check'
            })
        });

        if (response.ok) {
            userLimits = await response.json();
            updateUIForLimits();
        } else {
            console.error('Error checking limits:', response.status);
            userLimits = { canUse: false, usesLeft: 0, subscriptionStatus: 'free' };
        }
    } catch (error) {
        console.error('Error verificando límites:', error);
        userLimits = { canUse: false, usesLeft: 0, subscriptionStatus: 'free' };
    } finally {
        isCheckingLimits = false;
    }
}

let modalMostrado = false;

// Actualizar UI según los límites
function updateUIForLimits() {
  if (!userLimits) return;

  let emptyState = chatContainer.querySelector('.empty-state');
  const botonSuscripcion = document.getElementById('botonSuscripcion');

  // Si no existe, crearla de nuevo
  if (!emptyState) {
    emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    chatContainer.appendChild(emptyState);
    setTimeout(() => {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }, 50);
  }

  if (userLimits.canUse) {
    // Usuario premium
    if (userLimits.subscriptionStatus === 'premium') {
      emptyState.innerHTML = '💎 Usuario Premium - Escribí tu mensaje o grabá un audio y te ayudo a "bajar un cambio"';
      if (botonSuscripcion) botonSuscripcion.style.display = 'none';
    } else {
      // Tiene usos gratis
      emptyState.innerHTML = `✨ Tenés ${userLimits.usesLeft} usos gratis`;
      if (botonSuscripcion) botonSuscripcion.style.display = 'none';
    }
    // Si vuelve a tener usos o premium, asegurate de cerrar el modal si está abierto
    if (typeof cerrarModalSuscripcion === "function") cerrarModalSuscripcion();
    modalMostrado = false;
  } else {
    // No tiene usos: mostrar mensaje y botón flotante
    emptyState.innerHTML = "";
    if (botonSuscripcion) botonSuscripcion.style.display = 'flex';

    // Mostrar el modal automáticamente solo la primera vez
    if (!modalMostrado && typeof mostrarModalSuscripcion === "function") {
      mostrarModalSuscripcion();
      modalMostrado = true;
    }
  }
}


function scrollChatToBottom() {
  if (chatContainer) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
}


// Consumir un uso
async function consumeUse() {
    if (!currentUser || !userLimits) return false;

    if (userLimits.subscriptionStatus === 'premium') return true;

    if (userLimits.usesLeft <= 0) {
        // IMPORTANTE: Siempre refrescar la UI aunque no haya usos
        updateUIForLimits();
        if (result.usesLeft === 0) {
        setTimeout(() => {
        showToast('🎯 ¡Último uso gratis! Suscribite para continuar');
        updateUIForLimits(); // <-- asegurate de refrescar la UI
         }, 2000);
         // Refresca también al instante por si el usuario manda mensaje rápido
        updateUIForLimits();
        }
        showToast('🚫 Sin usos disponibles. Suscribite para continuar');
        return false;
        
         
    }

    try {
        const response = await fetch('/api/check-limits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser.uid,
                action: 'consume'
            })
        });

        if (response.ok) {
            const result = await response.json();
            userLimits.usesLeft = result.usesLeft;
            updateUIForLimits();

            if (result.usesLeft === 0) {
                setTimeout(() => {
                    showToast('🎯 ¡Último uso gratis! Suscribite para continuar');
                }, 2000);
                // REFRESCA LA UI cuando llegás a 0 usos
                updateUIForLimits();
            } else if (typeof result.usesLeft === 'number') {
                setTimeout(() => {
                    showToast(`✨ Te quedan ${result.usesLeft} usos gratis`);
                }, 1500);
            }

            return true;
        } else {
            // Si hay error porque no quedan usos, FORZÁ la actualización
            updateUIForLimits();
            const error = await response.json();
            showToast(`❌ ${error.error}`);
            return false;
        }

    } catch (error) {
        console.error('Error consumiendo uso:', error);
        showToast('❌ Error verificando límites');
        updateUIForLimits();
        return false;
    }
}

// Enviar mensaje de texto
async function sendMessage() {
    if (!currentUser) {
        showToast('🔐 Iniciá sesión para usar la app');
        return;
    }

    if (!userLimits?.canUse) {
        showToast('🚫 Sin usos disponibles. Suscribite para continuar');
        updateUIForLimits(); // <-- ¡SIEMPRE refrescar!
        return;
    }
    const text = messageInput.value.trim();
    if (!text) return;
    await processTextMessage(text);
    messageInput.value = '';
    messageInput.style.height = 'auto';
}

// FUNCIÓN ADDMESSAGE ACTUALIZADA - SIN ETIQUETAS "OPCIÓN 1", "OPCIÓN 2"
function addMessage(text, type) {
  const messageDiv = document.createElement('div');
  if (type === 'original') {
    messageDiv.className = 'message-bubble message-original';
    messageDiv.innerHTML = `
      <div class="message-label">Texto original</div>
      ${text}
    `;
  } else if (type === 'connector') {
    messageDiv.className = 'message-bubble message-transformed connector';
    messageDiv.innerHTML = `${text}`;
  } else {
    messageDiv.className = 'message-bubble message-transformed';
    messageDiv.innerHTML = `
      <div class="message-label">Texto bajando un cambio</div>
      ${text}
      <button class="copy-btn" onclick="copyMessage(this)">📋</button>
    `;
  }
  chatContainer.appendChild(messageDiv);
  scrollChatToBottom();
}


// Mostrar/ocultar loading
function showLoading(message = 'Transformando mensaje...') {
loadingText.textContent = message;
loading.style.display = 'flex';
sendBtn.disabled = true;
recordBtn.disabled = true;
}
function hideLoading() {
loading.style.display = 'none';
sendBtn.disabled = false;
recordBtn.disabled = false;
}
// Copiar mensaje
async function copyMessage(btn) {
const messageText = btn.parentElement.textContent
.replace('Texto bajando un cambio', '')
.replace('📋', '')
.trim();
try {
await navigator.clipboard.writeText(messageText);
showToast('📋 Copiado al portapapeles');
} catch (error) {
showToast('❌ Error al copiar');
}
}
// Mostrar toast
function showToast(message) {
toast.textContent = message;
toast.classList.add('show');
setTimeout(() => {
toast.classList.remove('show');
}, 2000);
}
// Toggle grabación
async function toggleRecording() {
    if (!currentUser) {
    showToast('🔐 Iniciá sesión para grabar audio');
    return;
}

if (!userLimits?.canUse) {
    showToast('🚫 Sin usos disponibles. Suscribite para continuar');
    return;
}
if (!isRecording) {
try {
const stream = await navigator.mediaDevices.getUserMedia({
audio: {
echoCancellation: true,
noiseSuppression: true,
sampleRate: 44100
}
});
startRecording(stream);
} catch (error) {
console.error('Error accediendo al micrófono:', error);
showToast('❌ No se pudo acceder al micrófono');
}
} else {
stopRecording();
}
}
// Iniciar grabación REAL
function startRecording(stream) {
isRecording = true;
recordBtn.classList.add('recording');
audioStatus.classList.add('show');
recordingStartTime = Date.now();
updateRecordingTimer();
recordingTimer = setInterval(updateRecordingTimer, 1000);
audioChunks = [];
mediaRecorder = new MediaRecorder(stream, {
mimeType: 'audio/webm;codecs=opus'
});
mediaRecorder.ondataavailable = (event) => {
if (event.data.size > 0) {
audioChunks.push(event.data);
}
};
mediaRecorder.onstop = async () => {
const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
await transcribeAudio(audioBlob);
stream.getTracks().forEach(track => track.stop());
};
mediaRecorder.start();
showToast('🎤 Grabando audio...');
}
// Detener grabación REAL
function stopRecording() {
if (mediaRecorder && isRecording) {
isRecording = false;
recordBtn.classList.remove('recording');
audioStatus.classList.remove('show');
clearInterval(recordingTimer);
mediaRecorder.stop();
showToast('⏹ Procesando audio...');
}
}
// Transcribir audio REAL usando tu API
async function transcribeAudio(audioBlob) {
try {
showLoading('Transcribiendo audio...');
const formData = new FormData();
formData.append('audio', audioBlob, 'audio.webm');
const response = await fetch('/api/transcribe', {
method: 'POST',
body: formData
});
if (!response.ok) {
const errorData = await response.json().catch(() => ({}));
throw new Error(`Error ${response.status}: ${errorData.error ||
response.statusText}`);
}
const data = await response.json();
console.log('Transcripción recibida:', data);
hideLoading();
if (data.transcription && data.transcription.trim()) {
await processTextMessage(data.transcription.trim());
} else {
showToast('❌ No se pudo transcribir el audio');
}
} catch (error) {
hideLoading();
console.error('Error transcribiendo audio:', error);
showToast('❌ Error al transcribir audio: ' + error.message);
}
}
// Actualizar timer de grabación
function updateRecordingTimer() {
if (recordingStartTime) {
const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
const minutes = Math.floor(elapsed / 60);
const seconds = elapsed % 60;
recordingTimerElement.textContent =
`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
}

// Variables de autenticación
let userLimits = null;
let isCheckingLimits = false;

// Elementos de auth
const authSection = document.getElementById('authSection');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userInfo = document.getElementById('userInfo');
const userPhoto = document.getElementById('userPhoto');
const userName = document.getElementById('userName');

// Función para inicializar autenticación cuando Firebase esté listo
function initializeAuth() {
    if (!window.firebaseAuth) {
        // Si Firebase no está listo, intentar de nuevo en 100ms
        setTimeout(initializeAuth, 100);
        return;
    }
    
    console.log('Firebase Auth inicializado');
    setupAuthListeners();
}

function setupAuthListeners() {

// Login con Google
async function loginWithGoogle() {
    try {
        const result = await window.firebaseAuth.signInWithPopup(
            window.firebaseAuth.auth,
            window.firebaseAuth.provider
        );
        console.log('Login exitoso:', result.user);
    } catch (error) {
        console.error('Error en login:', error);
        showToast('❌ Error al iniciar sesión');
    }
}

// Logout
async function logout() {
    try {
        await window.firebaseAuth.signOut(window.firebaseAuth.auth);
        console.log('Logout exitoso');
    } catch (error) {
        console.error('Error en logout:', error);
        showToast('❌ Error al cerrar sesión');
    }
}

    // Listener del estado de autenticación
    window.firebaseAuth.onAuthStateChanged(window.firebaseAuth.auth, async (user) => {
    if (user) {
        // Usuario logueado
        currentUser = user;
        loginBtn.style.display = 'none';
        userInfo.style.display = 'flex';
        userName.textContent = user.displayName;
        userPhoto.src = user.photoURL;

        // NUEVO: Verificar límites del usuario
        await checkUserLimits();

        showToast(`¡Hola ${user.displayName}! 👋`);
    } else {
        // Usuario no logueado
        currentUser = null;
        userLimits = null;
        loginBtn.style.display = 'block';
        userInfo.style.display = 'none';
        
        chatContainer.innerHTML = `
            <div class="empty-state">
                Iniciá sesión para usar "Bajá un cambio"
            </div>
        `;
    }
});
    
    // Event listeners para auth
    loginBtn.addEventListener('click', loginWithGoogle);
    logoutBtn.addEventListener('click', logout);
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    initializeAuth();
    
    // Verificar soporte de grabación de audio
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        recordBtn.style.display = 'none';
        showToast('⚠ Grabación de audio no soportada en este navegador');
    }
});

async function iniciarPago() {
  try {
    const response = await fetch('/api/create-preference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.uid }),
    });

    const contentType = response.headers.get("Content-Type");

    // Intenta parsear como JSON solo si es JSON
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      if (data.id) {
        //window.location.href = `https://www.mercadopago.com.ar/checkout/v1/redirect?preference_id=${data.id}`;
        window.location.href = `https://sandbox.mercadopago.com.ar/checkout/v1/redirect?preference_id=${data.id}`;

      } else {
        showToast('❌ No se pudo iniciar el pago');
        console.error("Respuesta sin ID:", data);
      }
    } else {
      const text = await response.text();
      showToast("❌ Error inesperado del servidor");
      console.error("Respuesta no JSON:", text);
    }

  } catch (error) {
    showToast('❌ Error al iniciar el pago');
    console.error("Error en iniciarPago:", error);
  }
}

function mostrarModalSuscripcion() {
  document.getElementById("suscripcionModal").style.display = "flex";
}
function cerrarModalSuscripcion() {
  document.getElementById("suscripcionModal").style.display = "none";
}
const header = document.getElementById('appHeader');
const imagoSticky = document.getElementById('imagoSticky');
let headerHidden = false;

function handleHeaderAndImagoOnScroll() {
  if (chatContainer.scrollTop > 40) {
    if (!headerHidden) {
      header.classList.add('oculto');
      imagoSticky.classList.add('visible');
      headerHidden = true;
    }
  } else {
    if (headerHidden) {
      header.classList.remove('oculto');
      imagoSticky.classList.remove('visible');
      headerHidden = false;
    }
  }
}

chatContainer.addEventListener('scroll', handleHeaderAndImagoOnScroll);

function scrollChatToBottom() {
  if (chatContainer) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
    handleHeaderAndImagoOnScroll();
  }
}

imagoSticky.addEventListener('click', () => {
  header.classList.remove('oculto');
  imagoSticky.classList.remove('visible');
  headerHidden = false;
  setTimeout(() => {
    if (chatContainer.scrollTop > 40) {
      header.classList.add('oculto');
      imagoSticky.classList.add('visible');
      headerHidden = true;
    }
  }, 5000);
});

// --- LOGICA PARA GLASS HEADER SEGUN SCROLL ---

chatContainer.addEventListener('scroll', () => {
  // Si scrolleás un poquito, pero no lo suficiente para ocultar el header
  if (chatContainer.scrollTop > 8 && chatContainer.scrollTop <= 80) {
    header.classList.add('glass');
  } else {
    header.classList.remove('glass');
  }
  // Esta es la lógica para ocultar el header y mostrar imagoSticky, no la dupliques si ya la tenés:
  handleHeaderAndImagoOnScroll();
});





//document.addEventListener('DOMContentLoaded', () => {
  // Esto mete 10 mensajes de prueba al chat para que scrollee
 // for (let i = 0; i < 10; i++) {
   // addMessage('Mensaje de prueba ' + (i+1), 'original');
 // }
//});


// Ajuste automático para visibilidad del input en mobile
const adjustForKeyboard = () => {
  // Pequeño timeout para esperar el resize real (algunos browsers lo retrasan)
  setTimeout(() => {
    // Fuerza scroll al bottom del chat (dentro del contenedor)
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    // Si se puede, también hace scroll en la ventana
    window.scrollTo(0, document.body.scrollHeight);
  }, 120);
};

// Detectar cuando el textarea gana foco (probable aparición del teclado)
messageInput.addEventListener('focus', adjustForKeyboard);

// Si querés que también lo haga cuando se escribe, descomentá esto:
// messageInput.addEventListener('input', adjustForKeyboard);

// Opcional: cuando se envía el mensaje, también asegurate de que baja al bottom
sendBtn.addEventListener('click', () => {
  setTimeout(adjustForKeyboard, 180);
});

messageInput.addEventListener('focus', () => {
  document.querySelector('.input-section').classList.add('keyboard-open');
  adjustForKeyboard();
});
messageInput.addEventListener('blur', () => {
  document.querySelector('.input-section').classList.remove('keyboard-open');
});
