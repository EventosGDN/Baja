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
  div.className = type === 'original'
    ? 'message-bubble message-original'
    : type === 'connector'
    ? 'message-bubble message-transformed connector'
    : 'message-bubble message-transformed';
  div.innerHTML = type === 'original'
    ? `<div class="message-label">Texto original</div>${text}`
    : type === 'connector'
    ? text
    : `<div class="message-label">Texto bajando un cambio</div>${text}<button class="copy-btn" onclick="copyMessage(this)">📋</button>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

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

async function transformText(text, mode) {
  const prompts = {
    formal: `Actuás como un experto en comunicación profesional en Argentina.
Convertí el siguiente mensaje emocional en una versión firme y profesional...
Mensaje: "${text}"`,
    amigable: `Actuás como una persona cálida y directa...
Mensaje: "${text}"`,
    directo: `Reformulá este mensaje en un tono directo...
Mensaje: "${text}"`,
    diplomatico: `Sos un experto en comunicación estratégica...
Mensaje: "${text}"`
  };

  const response = await fetch('/api/transform', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: prompts[mode], mode })
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

async function processTextMessage(text, mode, chatContainer) {
  const canUse = true; // Simulación: reemplazar por verificación real si usás control de uso
  if (!canUse) return;

  const emptyState = chatContainer.querySelector('.empty-state');
  if (emptyState) emptyState.remove();

  addMessage(text, 'original', chatContainer);
  showLoading('Transformando mensaje...');

  try {
    const response = await transformText(text, mode);
    hideLoading();
    addMessage(response.result, 'transformed', chatContainer);
    if (response.hasSecondOption && response.secondOption) {
      setTimeout(() => {
        addMessage(response.connector, 'connector', chatContainer);
        setTimeout(() => {
          addMessage(response.secondOption, 'transformed', chatContainer);
        }, 800);
      }, 1200);
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

document.addEventListener('DOMContentLoaded', () => {
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const modeSelect = document.getElementById('modeSelect');
  const chatContainer = document.getElementById('chatContainer');
  const header = document.getElementById('appHeader');
  const imago = document.getElementById('imagoSticky');

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

  setupAuth(window.firebaseAuth, (user) => {
    showToast(`¡Hola ${user.displayName}! 👋`);
  }, () => {
    chatContainer.innerHTML = `<div class="empty-state">Iniciá sesión para usar "Bajá un cambio"</div>`;
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
});


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
  createFireParticles();
});
