

/* ===============================
   Elements
   =============================== */
const form = document.getElementById('contactForm');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const messageInput = document.getElementById('message');
const fileInput = document.getElementById('fileInput');

const nameError = document.getElementById('nameError');
const emailError = document.getElementById('emailError');
const messageError = document.getElementById('messageError');

const charCount = document.getElementById('charCount');
const wordCount = document.getElementById('wordCount');
const livePreview = document.getElementById('livePreview');
const progressBar = document.getElementById('progressBar');

const submitBtn = document.getElementById('submitBtn');
const btnLoader = document.getElementById('btnLoader');

const modalBackdrop = document.getElementById('modalBackdrop');
const modalTitle = document.getElementById('modalTitle');
const modalMsg = document.getElementById('modalMsg');
const modalOk = document.getElementById('modalOk');
const modalCancel = document.getElementById('modalCancel');

const saveDraftBtn = document.getElementById('saveDraft');
const clearDraftBtn = document.getElementById('clearDraft');
const themeToggle = document.getElementById('themeToggle');
const topBtn = document.getElementById('topBtn');
const fileInfo = document.getElementById('fileInfo');

const confettiCanvas = document.getElementById('confettiCanvas');
const confettiCtx = confettiCanvas.getContext('2d');

let lastMessage = '';
let lastSubmitTime = 0;

/* ===============================
   Config + Helpers
   =============================== */
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DKEY = 'contact_form_draft_v1';
const THEME_KEY = 'contact_form_theme_v1';
const FILE_MAX = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg','image/png','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

/* small DOM helpers */
function setValid(el){ el.classList.remove('invalid'); el.classList.add('valid'); }
function setInvalid(el){ el.classList.remove('valid'); el.classList.add('invalid'); }
function clearState(el){ el.classList.remove('valid','invalid'); }

/* ===============================
   Validation functions
   =============================== */
function validateName(){
  const v = nameInput.value.trim();
  if(v === ''){
    nameError.textContent = 'Name is required.';
    setInvalid(nameInput); return false;
  }
  if(v.length < 2){
    nameError.textContent = 'Use at least 2 characters.';
    setInvalid(nameInput); return false;
  }
  nameError.textContent = '';
  setValid(nameInput); return true;
}

function validateEmail(){
  const v = emailInput.value.trim();
  if(v === ''){
    emailError.textContent = 'Email is required.';
    setInvalid(emailInput); return false;
  }
  if(!emailRegex.test(v)){
    emailError.textContent = 'Enter a valid email address.';
    setInvalid(emailInput); return false;
  }
  emailError.textContent = '';
  setValid(emailInput); return true;
}

function validateMessage(){
  const v = messageInput.value.trim();
  if(v === ''){
    messageError.textContent = 'Message is required.';
    setInvalid(messageInput); return false;
  }
  if(v.length < 6){
    messageError.textContent = 'Message is too short.';
    setInvalid(messageInput); return false;
  }
  messageError.textContent = '';
  setValid(messageInput); return true;
}

/* file validation */
function validateFile(){
  const f = fileInput.files[0];
  if(!f){
    fileInfo.textContent = 'No file selected';
    return true;
  }
  if(f.size > FILE_MAX){
    fileInfo.textContent = 'File too large (max 2MB).';
    fileInput.value = '';
    return false;
  }
  if(!ALLOWED_TYPES.includes(f.type)){
    fileInfo.textContent = 'Unsupported file type.';
    fileInput.value = '';
    return false;
  }
  // ok
  fileInfo.textContent = f.name;
  return true;
}

/* ===============================
   Live UI updates
   =============================== */
function escapeHtml(s){
  return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
}

function updateCharCount(){
  const left = 250 - messageInput.value.length;
  charCount.textContent = `${left} chars left`;
  const words = messageInput.value.trim() ? messageInput.value.trim().split(/\s+/).length : 0;
  wordCount.textContent = `${words} words`;
}

function updatePreview(){
  const n = escapeHtml(nameInput.value.trim() || '—');
  const e = escapeHtml(emailInput.value.trim() || '—');
  const mRaw = messageInput.value.trim() || '(empty)';
  const m = escapeHtml(mRaw).replace(/\n/g,'<br/>');
  const f = fileInput.files[0] ? `<div style="margin-top:8px;color:var(--muted)"><small>Attachment: ${escapeHtml(fileInput.files[0].name)}</small></div>` : '';
  livePreview.innerHTML = `<strong>${n}</strong> <span style="color:var(--muted)">(${e})</span><hr style="opacity:.06;margin:8px 0"/>${m}${f}`;
}

function updateProgress(){
  let score = 0;
  if(nameInput.value.trim().length > 0) score += 30;
  if(emailInput.value.trim().length > 0) score += 30;
  score += Math.min(40, Math.floor((messageInput.value.trim().length/250)*40));
  progressBar.style.width = score + '%';
}

function updateAll(){
  updateCharCount();
  updatePreview();
  updateProgress();
  // clear state if empty
  if(!nameInput.value) clearState(nameInput);
  if(!emailInput.value) clearState(emailInput);
  if(!messageInput.value) clearState(messageInput);
  // file info
  validateFile();
}

/* ===============================
   LocalStorage draft
   =============================== */
function saveDraftToLocal(){
  const payload = {
    name:nameInput.value,
    email:emailInput.value,
    message:messageInput.value,
    fileName: (fileInput.files[0] ? fileInput.files[0].name : ''),
    ts: Date.now()
  };
  localStorage.setItem(DKEY, JSON.stringify(payload));
  // transient feedback
  saveDraftBtn.textContent = 'Saved ✓';
  setTimeout(()=> saveDraftBtn.textContent = 'Save Draft', 1200);
}

function clearDraftFromLocal(confirmFirst = true){
  if(confirmFirst){
    showConfirm('Clear draft?', 'This will clear the saved draft and the form. Continue?', ()=>{
      // confirmed
      localStorage.removeItem(DKEY);
      form.reset();
      fileInfo.textContent = 'No file selected';
      updateAll();
      clearState(nameInput); clearState(emailInput); clearState(messageInput);
      modalBackdrop.style.display = 'none';
    });
  }else{
    localStorage.removeItem(DKEY);
    form.reset();
    fileInfo.textContent = 'No file selected';
    updateAll();
  }
}

function restoreDraft(){
  const raw = localStorage.getItem(DKEY);
  if(!raw) return;
  try{
    const p = JSON.parse(raw);
    nameInput.value = p.name || '';
    emailInput.value = p.email || '';
    messageInput.value = p.message || '';
    // note: we can't restore file contents, only the filename placeholder
    if(p.fileName) fileInfo.textContent = p.fileName;
  }catch(e){}
  updateAll();
}

/* ===============================
   Auto-focus behaviours
   =============================== */
/* move to next field when maxlength reached on name/email/message */
[nameInput,emailInput,messageInput].forEach(el=>{
  el.addEventListener('input', (e)=>{
    // if cursor at end and reached maxlength, focus next
    if(el.maxLength && el.value.length >= el.maxLength){
      const formEls = [nameInput, emailInput, messageInput];
      const idx = formEls.indexOf(el);
      if(idx >=0 && idx < formEls.length-1) formEls[idx+1].focus();
    }
  });
});
/* also move to next on Enter key for name/email */
nameInput.addEventListener('keydown', (e)=>{ if(e.key === 'Enter'){ e.preventDefault(); emailInput.focus(); }});
emailInput.addEventListener('keydown', (e)=>{ if(e.key === 'Enter'){ e.preventDefault(); messageInput.focus(); }});

/* ===============================
   Event listeners for live feedback
   =============================== */
[nameInput, emailInput].forEach(i => {
  i.addEventListener('input', ()=>{ validateName(); validateEmail(); updateAll(); });
});
messageInput.addEventListener('input', ()=>{ validateMessage(); updateAll(); });
fileInput.addEventListener('change', ()=>{ validateFile(); updateAll(); });

/* ===============================
   Form submit handling (demo)
   =============================== */
form.addEventListener('submit', (e)=>{
  e.preventDefault();
  const nOk = validateName();
  const eOk = validateEmail();
  const mOk = validateMessage();
  const fOk = validateFile();

  if(!(nOk && eOk && mOk && fOk)){
    // focus first invalid
    if(!nOk) nameInput.focus();
    else if(!eOk) emailInput.focus();
    else if(!mOk) messageInput.focus();
    return;
  }

  // Prevent repeated exact message within 10s (simple spam guard)
  const now = Date.now();
  if(messageInput.value.trim() === lastMessage && (now - lastSubmitTime) < 10000){
    // subtle inline feedback instead of alert
    showToast('Please avoid sending the same message repeatedly so quickly.');
    return;
  }

  // simulate submit loading
  submitBtn.classList.add('loading');
  btnLoader.style.display = 'block';
  submitBtn.disabled = true;

  // small delay to show loader
  setTimeout(()=>{
    submitBtn.classList.remove('loading'); btnLoader.style.display='none';
    submitBtn.disabled = false;

    // show modal success
    document.getElementById('modalMsg').textContent = `Hi ${nameInput.value.trim() || 'there'} — your message is validated. (Demo: not actually sent.)`;
    document.getElementById('modalTitle').textContent = 'Thanks — message ready';
    modalCancel.style.display = 'none';
    modalOk.textContent = 'Close';
    showModal();

    // confetti
    startConfetti(2200);

    // store last message/time
    lastMessage = messageInput.value.trim();
    lastSubmitTime = Date.now();

    // clear form but keep draft saved optionally
    form.reset(); updateAll();
    clearState(nameInput); clearState(emailInput); clearState(messageInput);

  }, 1400);
});

/* ===============================
   Modal helpers (generic)
   =============================== */
function showModal(){
  modalBackdrop.style.display = 'flex';
  modalBackdrop.setAttribute('aria-hidden','false');
}

function hideModal(){
  modalBackdrop.style.display = 'none';
  modalBackdrop.setAttribute('aria-hidden','true');
}

/* confirmation dialog using same modal */
function showConfirm(title, message, yesCb){
  modalTitle.textContent = title || 'Confirm';
  modalMsg.textContent = message || '';
  modalCancel.style.display = 'inline-block';
  modalOk.textContent = 'Yes';
  showModal();

  const onYes = ()=>{
    modalOk.removeEventListener('click', onYes);
    modalCancel.removeEventListener('click', onNo);
    yesCb && yesCb();
  };
  const onNo = ()=>{
    modalOk.removeEventListener('click', onYes);
    modalCancel.removeEventListener('click', onNo);
    hideModal();
  };
  modalOk.addEventListener('click', onYes);
  modalCancel.addEventListener('click', onNo);
}

/* close modal */
modalBackdrop.addEventListener('click', (e)=>{ if(e.target === modalBackdrop) hideModal(); });
modalOk.addEventListener('click', hideModal);
modalCancel.addEventListener('click', hideModal);

/* ===============================
   Save / clear draft buttons
   =============================== */
saveDraftBtn.addEventListener('click', saveDraftToLocal);
clearDraftBtn.addEventListener('click', ()=> clearDraftFromLocal(true));

/* restore on load */
window.addEventListener('load', ()=>{
  restoreDraft();
  updateAll();
  // show top button logic
  window.addEventListener('scroll', handleScroll);

  // restore theme
  const savedTheme = localStorage.getItem(THEME_KEY);
  if(savedTheme) document.body.setAttribute('data-theme', savedTheme);

  // make sure confetti canvas sized
  resizeConfettiCanvas();
});

/* ===============================
   Theme toggle
   =============================== */
themeToggle.addEventListener('click', ()=>{
  const root = document.body;
  const t = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', t);
  localStorage.setItem(THEME_KEY, t);
});

/* ===============================
   Back to top
   =============================== */
function handleScroll(){
  if(window.scrollY > 240) topBtn.style.display = 'block'; else topBtn.style.display = 'none';
}
topBtn.addEventListener('click', ()=> window.scrollTo({top:0, behavior:'smooth'}));

/* ===============================
   Accessibility: save draft on ctrl+s or cmd+s
   =============================== */
window.addEventListener('keydown', (e)=>{
  if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's'){
    e.preventDefault(); saveDraftToLocal();
    showToast('Draft saved (Ctrl+S).');
  }
});

/* ===============================
   Auto-save every 8 seconds (only if changed)
   =============================== */
let lastAuto = '';
setInterval(()=>{
  const cur = JSON.stringify({n:nameInput.value,e:emailInput.value,m:messageInput.value});
  if(cur !== lastAuto){
    lastAuto = cur;
    localStorage.setItem(DKEY, JSON.stringify({name:nameInput.value, email: emailInput.value, message: messageInput.value, ts:Date.now(), fileName: (fileInput.files[0]?fileInput.files[0].name:'')}));
  }
}, 8000);

/* ===============================
   Small toast (non-blocking)
   =============================== */
let toastTimeout;
function showToast(msg){
  // create a small transient toast in the card (sr-only-friendly)
  let t = document.getElementById('smallToast');
  if(!t){
    t = document.createElement('div');
    t.id = 'smallToast';
    t.style.position = 'fixed';
    t.style.left = '50%';
    t.style.transform = 'translateX(-50%)';
    t.style.bottom = '24px';
    t.style.padding = '8px 12px';
    t.style.borderRadius = '8px';
    t.style.background = 'rgba(0,0,0,0.6)';
    t.style.color = 'white';
    t.style.zIndex = 90;
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(()=> t.style.display = 'none', 1800);
}

/* ===============================
   Confetti (lightweight) - canvas-based
   =============================== */
let confettiParticles = [];
let confettiRunning = false;

function resizeConfettiCanvas(){
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeConfettiCanvas);

function startConfetti(duration = 2000){
  // create particles
  confettiParticles = [];
  const count = Math.min(200, Math.floor(window.innerWidth / 6));
  const colors = ['#7c5cff','#4ade80','#60a5fa','#f472b6','#f59e0b'];
  for(let i=0;i<count;i++){
    confettiParticles.push({
      x: Math.random() * confettiCanvas.width,
      y: -Math.random() * 200,
      vx: (Math.random()-0.5) * 2.4,
      vy: 1 + Math.random() * 3,
      size: 6 + Math.random()*8,
      rot: Math.random() * Math.PI*2,
      vr: (Math.random()-0.5) * 0.2,
      color: colors[Math.floor(Math.random() * colors.length)],
      sway: Math.random() * 0.02
    });
  }
  if(!confettiRunning){
    confettiRunning = true;
    resizeConfettiCanvas();
    const t0 = Date.now();
    (function anim(){
      const now = Date.now();
      const elapsed = now - t0;
      confettiCtx.clearRect(0,0,confettiCanvas.width, confettiCanvas.height);
      confettiParticles.forEach(p=>{
        p.x += p.vx + Math.sin(elapsed * p.sway)*2;
        p.y += p.vy;
        p.rot += p.vr;
        confettiCtx.save();
        confettiCtx.translate(p.x, p.y);
        confettiCtx.rotate(p.rot);
        confettiCtx.fillStyle = p.color;
        confettiCtx.fillRect(-p.size/2, -p.size/2, p.size, p.size*0.6);
        confettiCtx.restore();
      });
      // remove particles off-screen
      confettiParticles = confettiParticles.filter(p=>p.y < confettiCanvas.height + 40);
      if((elapsed < duration) || confettiParticles.length > 0){
        requestAnimationFrame(anim);
      }else{
        confettiRunning = false;
        confettiCtx.clearRect(0,0,confettiCanvas.width, confettiCanvas.height);
      }
    })();
  }
}

/* ===============================
   Initial small validation triggers
   =============================== */
updateAll();

/* ===============================
   Extra: confirm-before-refresh or navigation when form has content
   =============================== */
let warnOnLeave = true;
window.addEventListener('beforeunload', (e)=>{
  if(warnOnLeave && (nameInput.value || emailInput.value || messageInput.value)){
    e.preventDefault();
    e.returnValue = '';
    return '';
  }
});

/* End of main script */
