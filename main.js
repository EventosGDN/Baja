function showLoading(message) {
  const loading = document.getElementById('loading');
  const loadingText = document.getElementById('loadingText');
  loadingText.textContent = message || 'Transformando mensaje...';
  loading.style.display = 'flex';
}

function hideLoading() {
  const loading = document.getElementById('loading');
  loading.style.display = 'none';
}


function addMessage(text, type, container) {
  const div = document.createElement('div');

  if (type === 'original') {
    div.className = 'message-bubble message-original';
    div.innerHTML = `<div class="message-label">Texto original</div>${text}`;
  } else if (type === 'connector') {
    div.className = 'message-bubble message-transformed connector';
    div.innerHTML = text;
  } else if (type === 'reflection') {
    div.className = 'message-bubble message-reflection';
    div.innerHTML = `<div class="message-label">🌿 Reflexión</div>${text}`;
  } else {
    div.className = 'message-bubble message-transformed';
    div.innerHTML = `<div class="message-label">Texto bajando un cambio</div>${text}<button class="copy-btn" onclick="copyMessage(this)">📋</button>`;
  }

  container.appendChild(div);

  const scrollAnchor = document.getElementById('scrollAnchor');
  const spacer = document.getElementById('chatSpacer');
  if (scrollAnchor && spacer) {
    container.insertBefore(scrollAnchor, spacer);
  }
}


let lastScrollTop = 0;
const chatContainer = document.getElementById('chatContainer');
const header = document.getElementById('appHeader');

chatContainer.addEventListener('scroll', () => {
  const scrollTop = chatContainer.scrollTop;

  if (scrollTop > 50 && scrollTop > lastScrollTop) {
    header.classList.add('oculto');
  } else if (scrollTop < 50 || scrollTop < lastScrollTop) {
    header.classList.remove('oculto');
  }

  lastScrollTop = scrollTop;
});



function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

async function copyMessage(btn) {
  const text = btn.parentElement.textContent.replace('Texto bajando un cambio', '').replace('📋', '').trim();
  try {
    await navigator.clipboard.writeText(text);
    showToast('📋 Copiado al portapapeles');
  } catch {
    showToast('❌ Error al copiar');
  }
}

async function transformText(text, mode, includeReflection = false) {
  const prompts = {
    formal: `Actuás como un experto en comunicación profesional... Mensaje: "${text}"`,
    amigable: `Actuás como una persona cálida... Mensaje: "${text}"`,
    directo: `Reformulá este mensaje... Mensaje: "${text}"`,
    diplomatico: `Sos un experto en comunicación estratégica... Mensaje: "${text}"`
  };

  const reflectionPrompt = `Actuás como un guía empático y contenedor. Recibiste el siguiente mensaje de una persona que atraviesa un momento emocional intenso. Brindale una reflexión breve que le ayude a calmarse, comprender mejor lo que siente, o tomar perspectiva: "${text}"`;

  const body = {
    prompt: prompts[mode],
    mode,
    includeReflection,
    reflectionPrompt
  };

  const response = await fetch('/api/transform', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) throw new Error(await response.text());
  return await response.json();
}


async function transcribeAudio(audioBlob, mode, chatContainer) {
  try {
    showLoading('Transcribiendo audio...');
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.webm');
    const response = await fetch('/api/transcribe', { method: 'POST', body: formData });
    if (!response.ok) throw new Error('Error al transcribir');
    const data = await response.json();
    hideLoading();
    if (data.transcription?.trim()) {
      await processTextMessage(data.transcription.trim(), mode, chatContainer);
    } else {
      showToast('❌ No se pudo transcribir el audio');
    }
  } catch (error) {
    hideLoading();
    showToast('❌ Error al transcribir audio: ' + error.message);
  }
}

function scrollToLastMessage(extra = 180) {
  const chatContainer = document.getElementById('chatContainer');
  requestAnimationFrame(() => {
    chatContainer.scrollTo({
      top: chatContainer.scrollHeight + extra,
      behavior: 'smooth'
    });
  });
}





async function processTextMessage(text, mode, chatContainer) {
  const reflectionEnabled = document.getElementById('reflectionToggle')?.checked;
  const emptyState = chatContainer.querySelector('.empty-state');
  if (emptyState) emptyState.remove();

  addMessage(text, 'original', chatContainer);
  scrollToLastMessage();
  header.classList.add('oculto');

  // 🌿 Si está activado el Modo Reflexión, solo mostrar reflexión y salir
  if (reflectionEnabled) {
    showLoading('Reflexionando...');

    try {
      const reflectionPrompt = `Actuás como un guía empático y contenedor. Recibiste el siguiente mensaje de una persona que atraviesa un momento emocional intenso. Brindale una reflexión breve que le ayude a calmarse, comprender mejor lo que siente, o tomar perspectiva: "${text}"`;

      const reflectionRes = await fetch('/api/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: reflectionPrompt, mode: 'reflexion' })
      });

      hideLoading();

      if (reflectionRes.ok) {
        const reflection = await reflectionRes.json();
        addMessage(reflection.result, 'reflection', chatContainer);
        scrollToLastMessage();
      } else {
        showToast('❌ No se pudo generar la reflexión');
      }
    } catch (err) {
      hideLoading();
      showToast('❌ Error: ' + err.message);
    }

    return; // Detenemos la ejecución si modo reflexión está activo
  }

  // 🔁 Modo normal (con transformación + opción alternativa)
  showLoading('Transformando mensaje...');
  try {
    const response = await transformText(text, mode);
    console.log('Respuesta de API:', response);

    hideLoading();
    addMessage(response.result, 'transformed', chatContainer);
    scrollToLastMessage();

    if (response.hasSecondOption && response.secondOption) {
      setTimeout(() => {
        addMessage(response.connector, 'connector', chatContainer);
        scrollToLastMessage();
        setTimeout(() => {
          addMessage(response.secondOption, 'transformed', chatContainer);
          scrollToLastMessage();
        }, 1200);
      }, 1600);
    }
  } catch (error) {
    hideLoading();
    showToast('❌ Error al transformar el mensaje: ' + error.message);
  }
}


function setupAuth(firebaseAuth, onLogin, onLogout) {
  const auth = firebaseAuth.auth;
  const provider = firebaseAuth.provider;
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const userInfo = document.getElementById('userInfo');
  const userName = document.getElementById('userName');
  const userPhoto = document.getElementById('userPhoto');


  
  loginBtn.addEventListener('click', () => {
    firebaseAuth.signInWithPopup(auth, provider)
      .then(result => onLogin?.(result.user))
      .catch(err => console.error("Login error:", err));
  });

  logoutBtn.addEventListener('click', () => {
    firebaseAuth.signOut(auth)
      .then(() => onLogout?.())
      .catch(err => console.error("Logout error:", err));
  });

  firebaseAuth.onAuthStateChanged(auth, (user) => {
    if (user) {
      loginBtn.style.display = 'none';
      userInfo.style.display = 'flex';
      userName.textContent = user.displayName;
      userPhoto.src = user.photoURL;
      onLogin?.(user);
    } else {
      loginBtn.style.display = 'block';
      userInfo.style.display = 'none';
      onLogout?.();
    }
  });
}
function createFireParticles() {
  const container = document.getElementById('fireParticles');
  if (!container) return;

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

document.addEventListener('DOMContentLoaded', () => {
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const modeSelect = document.getElementById('modeSelect');
  const chatContainer = document.getElementById('chatContainer');
  const header = document.getElementById('appHeader');
  const imago = document.getElementById('imagoSticky');
  const inputSection = document.getElementById('inputSection');
  const recordBtn = document.getElementById('recordBtn');
  const audioStatus = document.getElementById('audioStatus');
  const recordingTimer = document.getElementById('recordingTimer');
  const reflectionToggle = document.getElementById('reflectionToggle');
if (reflectionToggle) {
  reflectionToggle.addEventListener('change', () => {
    modoReflexionActivo = reflectionToggle.checked;
  });
}

  createFireParticles();
  createFireParticles();

  if (messageInput) {
  messageInput.addEventListener('focus', () => {
    window.scrollTo(0, 0);
  });
}

  let mediaRecorder;
  let audioChunks = [];
  let recordingInterval;

  sendBtn.addEventListener('click', () => {
    const text = messageInput.value.trim();
    if (text) {
      processTextMessage(text, modeSelect.value, chatContainer);
      messageInput.value = '';
    }
  });

  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendBtn.click();
    }
  });

  window.addEventListener('scroll', () => {
    if (window.scrollY > 80) {
      header.classList.add('oculto');
      imago.style.display = 'block';
    } else {
      header.classList.remove('oculto');
      imago.style.display = 'none';
    }
  });

  recordBtn.addEventListener('click', async () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        clearInterval(recordingInterval);
        recordingTimer.textContent = '00:00';
        recordBtn.classList.remove('recording');
        audioStatus.classList.remove('show');

        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'audio.webm');

        try {
          showLoading('Transcribiendo audio...');
          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) throw new Error('Error al transcribir');
          const data = await response.json();
          hideLoading();

          if (data.transcription?.trim()) {
            processTextMessage(data.transcription.trim(), modeSelect.value, chatContainer);
          } else {
            showToast('❌ No se pudo transcribir el audio');
          }
        } catch {
          hideLoading();
          showToast('❌ Error al transcribir audio');
        }
      };

      mediaRecorder.start();
      recordBtn.classList.add('recording');
      audioStatus.classList.add('show');

      let seconds = 0;
      recordingInterval = setInterval(() => {
        seconds++;
        const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
        const secs = String(seconds % 60).padStart(2, '0');
        recordingTimer.textContent = `${mins}:${secs}`;
      }, 1000);
    } catch {
      showToast('❌ No se pudo acceder al micrófono');
    }
  });

    // Ajuste visual para teclado móvil

if ('visualViewport' in window) {
  const spacer = document.getElementById('chatSpacer');
  const scrollAnchor = document.getElementById('scrollAnchor');

  function ajustarAlturaVisible() {
    const offset = window.innerHeight - visualViewport.height;
    const altura = 140 + Math.max(offset, 0); // ajustá según tu inputSection

    if (spacer) {
      spacer.style.height = `${altura}px`;
    }

    requestAnimationFrame(() => {
      if (scrollAnchor) {
        scrollAnchor.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    });
  }

  visualViewport.addEventListener('resize', ajustarAlturaVisible);
  ajustarAlturaVisible();
}


  // Configurar autenticación de Google
  setupAuth(window.firebaseAuth, (user) => {
    showToast(`¡Hola ${user.displayName}! 👋`);
  }, () => {
    chatContainer.innerHTML = `<div class="empty-state">Iniciá sesión para usar "Bajá un cambio"</div>`;
  });


}); 

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/serviceWorker.js')
      .then(reg => console.log('✅ Service Worker registrado:', reg))
      .catch(err => console.error('❌ Error al registrar Service Worker:', err));
  });
}

let modoReflexionActivo = false;


function mostrarHintReflexion() {
  if (!localStorage.getItem('reflectionHintShown')) {
    document.getElementById('reflectionHint').style.display = 'flex';
  }
}

function cerrarHint() {
  document.getElementById('reflectionHint').style.display = 'none';
  localStorage.setItem('reflectionHintShown', 'true');
}

window.addEventListener('load', mostrarHintReflexion);
