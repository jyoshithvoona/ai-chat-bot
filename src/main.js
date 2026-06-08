import { marked } from 'marked';
import confetti from 'canvas-confetti';
import { TEMPLATES } from './templates.js';
import { generateContent } from './api.js';

// Safe markdown parser
function md(text) {
  if (!text) return '';
  try {
    if (typeof marked === 'function') return marked(text);
    if (marked && typeof marked.parse === 'function') return marked.parse(text);
    if (marked && marked.marked) return marked.marked(text);
  } catch (e) { console.error('MD parse error', e); }
  // Fallback: basic HTML escaping with line breaks
  return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}

// ===== STATE =====
const state = {
  mode: 'welcome',   // 'welcome' | 'chat' | template id
  apiKey: localStorage.getItem('gemini_api_key') || '',
  sessionId: null,
  history: JSON.parse(localStorage.getItem('gemini_history') || '[]'),
  chatMessages: []    // current chat session's Gemini API history
};

// ===== DOM =====
const $ = id => document.getElementById(id);
const dom = {
  sidebar: $('sidebar'), sidebarOverlay: $('sidebarOverlay'), sidebarClose: $('sidebarClose'),
  menuBtn: $('menuBtn'), clearBtn: $('clearBtn'), newChatBtn: $('newChatBtn'),
  toolList: $('toolList'), historyList: $('historyList'),
  settingsBtn: $('settingsBtn'), statusDot: $('statusDot'),
  topTitle: $('topTitle'),
  chatScroll: $('chatScroll'), chatCenter: $('chatCenter'),
  welcomeScreen: $('welcomeScreen'), quickCards: $('quickCards'),
  apiWarning: $('apiWarning'), inlineSettingsBtn: $('inlineSettingsBtn'),
  toolFormCard: $('toolFormCard'), toolFormTitle: $('toolFormTitle'),
  toolForm: $('toolForm'), toolFormFields: $('toolFormFields'),
  closeToolForm: $('closeToolForm'), submitBtn: $('submitBtn'), submitBtnText: $('submitBtnText'),
  messages: $('messages'),
  inputBar: $('inputBar'), inputForm: $('inputForm'), chatInput: $('chatInput'), sendBtn: $('sendBtn'),
  settingsModal: $('settingsModal'), closeModal: $('closeModal'), cancelModal: $('cancelModal'),
  settingsForm: $('settingsForm'), apiKeyInput: $('apiKeyInput'), toggleKey: $('toggleKey'),
  toasts: $('toasts')
};

// ===== TOAST =====
function toast(msg, type='info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  dom.toasts.appendChild(el);
  setTimeout(() => { el.classList.add('removing'); el.addEventListener('transitionend', () => el.remove()); }, 4000);
}

// ===== HELPERS =====
function esc(t) { const d = document.createElement('div'); d.innerText = t; return d.innerHTML; }
function cleanJson(raw) {
  let s = raw.trim();
  if (s.startsWith('```')) { s = s.replace(/^```(?:json)?\n?/i, '').replace(/```\s*$/, '').trim(); }
  
  try {
    return JSON.parse(s);
  } catch (err) {
    console.warn("JSON parse failed, attempting sanitization...", err);
    // Fix invalid escape sequences (e.g., \0, \x) which LLMs often output in C/C++ questions
    // JSON only allows \", \\, \/, \b, \f, \n, \r, \t, \u
    let sanitized = s.replace(/\\([^"\\/bfnrtu])/g, (match, p1) => '\\\\' + p1);
    
    // Fix trailing commas in arrays/objects
    sanitized = sanitized.replace(/,\s*([\]}])/g, '$1');
    
    try {
      return JSON.parse(sanitized);
    } catch (err2) {
      console.error("Sanitization failed", err2);
      throw err; // throw original error
    }
  }
}
function scrollDown() { dom.chatScroll.scrollTop = dom.chatScroll.scrollHeight; }

// ===== INIT =====
function init() {
  updateStatus();
  renderTools();
  renderHistory();
  bindEvents();
}

function updateStatus() {
  dom.statusDot.className = 'status-dot ' + (state.apiKey ? 'on' : 'off');
  if (state.apiKey && dom.apiWarning) dom.apiWarning.classList.add('hidden');
  if (!state.apiKey && dom.apiWarning) dom.apiWarning.classList.remove('hidden');
}

// ===== RENDER SIDEBAR =====
function renderTools() {
  const icons = {
    explainer: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
    quiz: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
    flashcards: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-10 5 10 5 10-5-10-5Z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',
    summarize: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    rewrite: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>',
    translate: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>'
  };
  dom.toolList.innerHTML = Object.values(TEMPLATES).map(t =>
    `<li class="tool-item" data-tool="${t.id}">${icons[t.id] || ''}<span>${t.name}</span></li>`
  ).join('');
}

function renderHistory() {
  if (!state.history.length) { dom.historyList.innerHTML = '<li class="empty-hint">No history yet</li>'; return; }
  dom.historyList.innerHTML = state.history.map(s => `
    <li class="hist-item" data-id="${s.id}">
      <div class="hist-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span>${esc(s.title)}</span></div>
      <button class="hist-del"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
    </li>
  `).join('');
}

// ===== EVENTS =====
function bindEvents() {
  // Sidebar mobile
  dom.menuBtn.addEventListener('click', () => { dom.sidebar.classList.add('open'); dom.sidebarOverlay.classList.add('show'); });
  const closeSidebar = () => { dom.sidebar.classList.remove('open'); dom.sidebarOverlay.classList.remove('show'); };
  dom.sidebarClose.addEventListener('click', closeSidebar);
  dom.sidebarOverlay.addEventListener('click', closeSidebar);

  // New chat
  dom.newChatBtn.addEventListener('click', () => { switchMode('chat'); closeSidebar(); });

  // Tool list clicks
  dom.toolList.addEventListener('click', e => {
    const item = e.target.closest('.tool-item');
    if (item) { switchMode(item.dataset.tool); closeSidebar(); }
  });

  // Quick cards on welcome
  dom.quickCards.addEventListener('click', e => {
    const card = e.target.closest('.qcard');
    if (card) switchMode(card.dataset.tool);
  });

  // History clicks
  dom.historyList.addEventListener('click', e => {
    const del = e.target.closest('.hist-del');
    const item = e.target.closest('.hist-item');
    if (del && item) { e.stopPropagation(); deleteSession(item.dataset.id); }
    else if (item) { loadSession(item.dataset.id); closeSidebar(); }
  });

  // Clear all history
  dom.clearBtn.addEventListener('click', () => {
    if (confirm('Clear all history?')) {
      state.history = []; localStorage.setItem('gemini_history', '[]');
      state.sessionId = null; renderHistory(); switchMode('welcome');
      toast('History cleared', 'info');
    }
  });

  // Settings
  dom.settingsBtn.addEventListener('click', () => showSettings(true));
  dom.inlineSettingsBtn?.addEventListener('click', () => showSettings(true));
  dom.closeModal.addEventListener('click', () => showSettings(false));
  dom.cancelModal.addEventListener('click', () => showSettings(false));
  dom.settingsForm.addEventListener('submit', e => {
    e.preventDefault();
    state.apiKey = dom.apiKeyInput.value.trim();
    localStorage.setItem('gemini_api_key', state.apiKey);
    updateStatus(); showSettings(false);
    toast('API Key saved!', 'success');
  });
  dom.toggleKey.addEventListener('click', () => {
    dom.apiKeyInput.type = dom.apiKeyInput.type === 'password' ? 'text' : 'password';
  });

  // Tool form submit
  dom.toolForm.addEventListener('submit', handleToolSubmit);
  dom.closeToolForm.addEventListener('click', () => { dom.toolFormCard.classList.add('hidden'); });

  // Chat input
  dom.chatInput.addEventListener('input', () => {
    dom.chatInput.style.height = 'auto';
    dom.chatInput.style.height = Math.min(dom.chatInput.scrollHeight, 120) + 'px';
  });
  dom.chatInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); }
  });
  dom.inputForm.addEventListener('submit', e => { e.preventDefault(); handleChatSend(); });
}

function showSettings(open) {
  if (open) { dom.apiKeyInput.value = state.apiKey; dom.settingsModal.classList.remove('hidden'); }
  else dom.settingsModal.classList.add('hidden');
}

// ===== MODE SWITCHING =====
function switchMode(mode) {
  state.mode = mode;
  state.sessionId = null;
  state.chatMessages = [];

  // Update sidebar active
  document.querySelectorAll('.tool-item').forEach(i => i.classList.toggle('active', i.dataset.tool === mode));

  // Reset UI
  dom.messages.innerHTML = '';
  dom.toolFormCard.classList.add('hidden');

  if (mode === 'welcome') {
    dom.topTitle.textContent = 'Learnmate AI';
    dom.welcomeScreen.classList.remove('hidden');
    dom.inputBar.classList.add('hidden');
    return;
  }

  dom.welcomeScreen.classList.add('hidden');

  if (mode === 'chat') {
    dom.topTitle.textContent = 'Chat with Learnmate';
    dom.inputBar.classList.remove('hidden');
    setTimeout(() => dom.chatInput.focus(), 100);
  } else {
    // Tool mode
    const tool = TEMPLATES[mode];
    if (!tool) return;
    dom.topTitle.textContent = tool.name;
    dom.inputBar.classList.add('hidden');
    showToolForm(tool);
  }
}

function showToolForm(tool) {
  dom.toolFormTitle.textContent = tool.name;
  dom.toolFormFields.innerHTML = tool.fields.map(f => {
    if (f.type === 'select') {
      return `<div class="field-group"><label>${f.label}</label><select name="${f.id}">${f.options.map(o =>
        `<option value="${o.value}" ${o.value === f.defaultValue ? 'selected' : ''}>${o.label}</option>`).join('')}</select></div>`;
    }
    if (f.type === 'textarea') {
      return `<div class="field-group"><label>${f.label}</label><textarea name="${f.id}" placeholder="${f.placeholder}" ${f.required ? 'required' : ''}></textarea></div>`;
    }
    return `<div class="field-group"><label>${f.label}</label><input type="text" name="${f.id}" placeholder="${f.placeholder}" ${f.required ? 'required' : ''} autocomplete="off"></div>`;
  }).join('');
  dom.toolFormCard.classList.remove('hidden');
  scrollDown();
}

// ===== CHAT MESSAGE RENDERING =====
function addMsg(role, html, isSkeleton = false) {
  const div = document.createElement('div');
  div.className = `msg ${role === 'user' ? 'user-msg' : 'ai-msg'}`;
  const avatarCls = role === 'user' ? 'user' : 'ai';
  const avatarTxt = role === 'user' ? 'ME' : 'AI';
  const nameTxt = role === 'user' ? 'You' : 'Learnmate';

  let body;
  if (isSkeleton) {
    body = `<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
  } else {
    body = `<div class="md">${html}</div>`;
  }

  div.innerHTML = `
    <div class="msg-avatar ${avatarCls}">${avatarTxt}</div>
    <div class="msg-body"><div class="msg-name">${nameTxt}</div><div class="msg-content">${body}</div></div>
  `;
  dom.messages.appendChild(div);
  scrollDown();
  return div;
}

function setLoading(on) {
  dom.submitBtn.disabled = on;
  dom.sendBtn.disabled = on;
  dom.chatInput.disabled = on;
  dom.submitBtnText.textContent = on ? 'Generating...' : 'Generate';
}

// ===== TOOL SUBMIT =====
async function handleToolSubmit(e) {
  e.preventDefault();
  if (!state.apiKey) { toast('Set your API key first!', 'error'); showSettings(true); return; }

  const tool = TEMPLATES[state.mode];
  if (!tool) return;

  const fd = new FormData(dom.toolForm);
  const vals = {};
  let missing = false;
  tool.fields.forEach(f => {
    vals[f.id] = (fd.get(f.id) || '').trim();
    if (f.required && !vals[f.id]) missing = true;
  });
  if (missing) { toast('Please fill all required fields.', 'error'); return; }

  // Hide the form, show the messages
  dom.toolFormCard.classList.add('hidden');

  // User bubble
  const summary = Object.entries(vals).map(([k,v]) => `**${k}**: ${v}`).join('\n');
  addMsg('user', md(`**${tool.name}**\n${summary}`));

  // AI skeleton
  const aiEl = addMsg('ai', '', true);
  setLoading(true);

  try {
    const res = await generateContent({
      apiKey: state.apiKey,
      prompt: tool.getPrompt(vals),
      systemInstruction: tool.getSystemInstruction(vals),
      jsonMode: tool.jsonMode || false
    });

    const content = aiEl.querySelector('.msg-content');
    content.innerHTML = '';

    let saved = res;

    if (tool.jsonMode) {
      try {
        const data = cleanJson(res);
        saved = data;
        if (state.mode === 'quiz') renderQuiz(content, data);
        else if (state.mode === 'flashcards') renderFlashcards(content, data);
        else content.innerHTML = `<div class="md">${md(res)}</div>`;
      } catch (err) {
        console.error('JSON parse fail', err);
        content.innerHTML = `<div class="md"><p style="color:var(--red)">Failed to parse response.</p><pre>${esc(res)}</pre></div>`;
      }
    } else {
      content.innerHTML = `<div class="md">${md(res)}</div>`;
    }

    // Save to history
    const titleVal = vals.concept || vals.topic || vals.subject || vals.text || 'Tool';
    const title = titleVal.length > 25 ? titleVal.slice(0,22) + '...' : titleVal;
    const session = { 
      id: 'sess_' + Date.now(), 
      title: `${tool.name}: ${title}`, 
      type: state.mode, 
      values: vals, 
      content: saved,
      messages: [
        { role: 'user', parts: [{ text: tool.getPrompt(vals) }] },
        { role: 'model', parts: [{ text: res }] }
      ],
      createdAt: new Date().toISOString() 
    };
    state.history.unshift(session);
    localStorage.setItem('gemini_history', JSON.stringify(state.history));
    state.sessionId = session.id;
    renderHistory();
    
    // Unhide the input bar so user can continue chat
    dom.inputBar.classList.remove('hidden');

  } catch (err) {
    console.error(err);
    const content = aiEl.querySelector('.msg-content');
    content.innerHTML = `<div class="md"><p style="color:var(--red);font-weight:bold">⚠️ API Error</p><p style="color:var(--text-mid);font-size:.85rem">${esc(err.message)}</p></div>`;
    toast(err.message, 'error');
  } finally {
    setLoading(false);
  }
}

// ===== FREEFORM CHAT =====
async function handleChatSend() {
  const text = dom.chatInput.value.trim();
  if (!text) return;
  if (!state.apiKey) { toast('Set your API key first!', 'error'); showSettings(true); return; }

  dom.chatInput.value = '';
  dom.chatInput.style.height = 'auto';

  // Find or create session
  let isNew = false;
  let session = state.history.find(s => s.id === state.sessionId);
  if (!session) {
    isNew = true;
    session = { id: 'sess_' + Date.now(), title: text.length > 25 ? text.slice(0,22) + '...' : text, type: 'chat', messages: [], createdAt: new Date().toISOString() };
    state.sessionId = session.id;
  }

  session.messages.push({ role: 'user', parts: [{ text }] });
  addMsg('user', md(text));
  const aiEl = addMsg('ai', '', true);
  setLoading(true);

  try {
    const history = session.messages.slice(0, -1);
    const tool = TEMPLATES[session.type];
    const sysInst = tool ? tool.getSystemInstruction(session.values) : 'You are Learnmate, a helpful, friendly AI assistant. Give clear, well-structured answers using Markdown with headers, bold text, and bullet points for readability.';
    const jsonMode = tool ? (tool.jsonMode || false) : false;

    const res = await generateContent({
      apiKey: state.apiKey,
      prompt: text,
      systemInstruction: sysInst,
      history,
      jsonMode
    });

    const content = aiEl.querySelector('.msg-content');
    content.innerHTML = '';

    if (jsonMode) {
      try {
        const data = cleanJson(res);
        if (session.type === 'quiz') renderQuiz(content, data);
        else if (session.type === 'flashcards') renderFlashcards(content, data);
        else content.innerHTML = `<div class="md">${md(res)}</div>`;
      } catch (err) {
        console.error('JSON parse fail', err);
        content.innerHTML = `<div class="md"><p style="color:var(--red)">Failed to parse response.</p><pre>${esc(res)}</pre></div>`;
      }
    } else {
      content.innerHTML = `<div class="md">${md(res)}</div>`;
    }

    session.messages.push({ role: 'model', parts: [{ text: res }] });

    if (isNew) state.history.unshift(session);
    else { const i = state.history.findIndex(s => s.id === session.id); if (i > 0) { state.history.splice(i, 1); state.history.unshift(session); } }
    localStorage.setItem('gemini_history', JSON.stringify(state.history));
    renderHistory();
    scrollDown();

  } catch (err) {
    console.error(err);
    aiEl.querySelector('.msg-content').innerHTML = `<div class="md"><p style="color:var(--red);font-weight:bold">⚠️ API Error</p><p style="color:var(--text-mid);font-size:.85rem">${esc(err.message)}</p></div>`;
    toast(err.message, 'error');
    session.messages.pop();
  } finally {
    setLoading(false);
  }
}

// ===== SESSION MANAGEMENT =====
function loadSession(id) {
  const s = state.history.find(x => x.id === id);
  if (!s) return;

  state.sessionId = s.id;
  state.mode = s.type;
  dom.messages.innerHTML = '';
  dom.toolFormCard.classList.add('hidden');
  dom.welcomeScreen.classList.add('hidden');

  document.querySelectorAll('.tool-item').forEach(i => i.classList.toggle('active', i.dataset.tool === s.type));

  if (s.type === 'chat') {
    dom.topTitle.textContent = 'Chat with Learnmate';
    dom.inputBar.classList.remove('hidden');
    s.messages.forEach(m => addMsg(m.role === 'user' ? 'user' : 'ai', md(m.parts[0].text)));
  } else {
    const tool = TEMPLATES[s.type];
    dom.topTitle.textContent = tool?.name || 'Saved';
    dom.inputBar.classList.remove('hidden');

    addMsg('user', md(`**${tool?.name}**\n${Object.entries(s.values || {}).map(([k,v]) => `**${k}**: ${v}`).join('\n')}`));
    const aiEl = addMsg('ai', '');
    const content = aiEl.querySelector('.msg-content');
    content.innerHTML = '';

    if (s.type === 'quiz' && s.content?.questions) renderQuiz(content, s.content, true);
    else if (s.type === 'flashcards' && s.content?.flashcards) renderFlashcards(content, s.content);
    else if (typeof s.content === 'string') content.innerHTML = `<div class="md">${md(s.content)}</div>`;
    else content.innerHTML = `<div class="md"><pre>${esc(JSON.stringify(s.content, null, 2))}</pre></div>`;
    
    // Render follow-up chat messages if any
    if (s.messages && s.messages.length > 2) {
      s.messages.slice(2).forEach(m => {
        if (m.role === 'user') {
          addMsg('user', md(m.parts[0].text));
        } else {
          const aiEl = addMsg('ai', '');
          const contentEl = aiEl.querySelector('.msg-content');
          if (tool && tool.jsonMode) {
            try {
              const data = cleanJson(m.parts[0].text);
              if (s.type === 'quiz') renderQuiz(contentEl, data, true);
              else if (s.type === 'flashcards') renderFlashcards(contentEl, data);
              else contentEl.innerHTML = `<div class="md">${md(m.parts[0].text)}</div>`;
            } catch(e) {
              contentEl.innerHTML = `<div class="md"><pre>${esc(m.parts[0].text)}</pre></div>`;
            }
          } else {
            contentEl.innerHTML = `<div class="md">${md(m.parts[0].text)}</div>`;
          }
        }
      });
    }
  }
  scrollDown();
}

function deleteSession(id) {
  state.history = state.history.filter(s => s.id !== id);
  localStorage.setItem('gemini_history', JSON.stringify(state.history));
  if (state.sessionId === id) { state.sessionId = null; switchMode('welcome'); }
  else renderHistory();
  toast('Session deleted', 'info');
}

// ===== INTERACTIVE QUIZ =====
function renderQuiz(container, data, isStatic = false) {
  const qs = data.questions;
  if (!qs?.length) { container.innerHTML = '<p style="color:var(--red)">Invalid quiz data.</p>'; return; }

  let idx = 0, score = 0;
  const frame = document.createElement('div');
  frame.className = 'quiz-mod';
  container.appendChild(frame);

  if (isStatic) { showQuizDone(frame, qs.length, qs.length, true); return; }

  function showQ() {
    const q = qs[idx];
    frame.innerHTML = `
      <div class="quiz-head"><span class="label">Quiz</span><span class="prog">Q${idx+1}/${qs.length}</span></div>
      <div class="quiz-body">
        <p class="quiz-q">${esc(q.question)}</p>
        <div class="quiz-opts">${q.options.map((o,i) => `<button class="quiz-opt" data-i="${i}">${esc(o)}</button>`).join('')}</div>
        <div class="quiz-expl hidden" id="qExpl"><strong>Explanation</strong><p>${esc(q.explanation)}</p></div>
      </div>
      <div class="quiz-foot hidden" id="qFoot"><button class="quiz-next" id="qNext">${idx === qs.length - 1 ? 'Finish' : 'Next'}</button></div>
    `;

    frame.querySelectorAll('.quiz-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        const si = parseInt(btn.dataset.i);
        frame.querySelectorAll('.quiz-opt').forEach(b => b.classList.add('locked'));
        if (si === q.answerIndex) { btn.classList.add('correct'); score++; }
        else { btn.classList.add('wrong'); frame.querySelector(`.quiz-opt[data-i="${q.answerIndex}"]`)?.classList.add('reveal'); }
        frame.querySelector('#qExpl').classList.remove('hidden');
        frame.querySelector('#qFoot').classList.remove('hidden');
      });
    });

    frame.querySelector('#qNext').addEventListener('click', () => {
      idx++;
      if (idx < qs.length) showQ();
      else showQuizDone(frame, score, qs.length);
    });
  }
  showQ();
}

function showQuizDone(container, score, total, isStatic = false) {
  const pct = Math.round(score / total * 100);
  let emoji = '📝', msg = 'Keep practicing!';
  if (pct === 100) { emoji = '👑'; msg = 'Perfect score!'; }
  else if (pct >= 75) { emoji = '🧠'; msg = 'Great job!'; }
  else if (pct >= 50) { emoji = '✏️'; msg = 'Good effort!'; }

  container.innerHTML = `<div class="quiz-done">
    <div class="quiz-emoji">${emoji}</div>
    <div class="quiz-score">${score} / ${total}</div>
    <p class="quiz-msg">${msg} (${pct}%)</p>
    ${isStatic ? '<p style="font-size:.75rem;color:var(--text-dim)">Completed quiz session</p>' : ''}
  </div>`;

  if (!isStatic && pct >= 75) confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
}

// ===== INTERACTIVE FLASHCARDS =====
function renderFlashcards(container, data) {
  const cards = data.flashcards;
  if (!cards?.length) { container.innerHTML = '<p style="color:var(--red)">Invalid flashcard data.</p>'; return; }

  let mastered = 0;
  const wrap = document.createElement('div');
  wrap.className = 'fc-wrap';
  container.appendChild(wrap);

  wrap.innerHTML = `
    <div class="fc-header"><span class="title">Study Deck</span><div class="info"><span id="fcProg">Mastered: 0/${cards.length}</span><button class="fc-reset" id="fcReset">Reset</button></div></div>
    <div class="fc-grid">${cards.map((c, i) => `
      <div class="fc-card-wrap" data-i="${i}">
        <button class="fc-check"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></button>
        <div class="fc-card"><div class="fc-face front"><p>${esc(c.front)}</p></div><div class="fc-face back"><p>${esc(c.back)}</p></div></div>
      </div>
    `).join('')}</div>
  `;

  const prog = wrap.querySelector('#fcProg');
  const grid = wrap.querySelector('.fc-grid');

  grid.addEventListener('click', e => {
    const cw = e.target.closest('.fc-card-wrap');
    const chk = e.target.closest('.fc-check');
    if (!cw) return;

    if (chk) {
      e.stopPropagation();
      const is = cw.classList.toggle('mastered');
      mastered += is ? 1 : -1;
      prog.textContent = `Mastered: ${mastered}/${cards.length}`;
      if (mastered === cards.length) { toast('Entire deck mastered! 🎉', 'success'); confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } }); }
      return;
    }
    cw.querySelector('.fc-card').classList.toggle('flipped');
  });

  wrap.querySelector('#fcReset').addEventListener('click', () => {
    mastered = 0;
    prog.textContent = `Mastered: 0/${cards.length}`;
    wrap.querySelectorAll('.fc-card-wrap').forEach(w => { w.classList.remove('mastered'); w.querySelector('.fc-card').classList.remove('flipped'); });
    toast('Deck reset', 'info');
  });
}

// ===== BOOT =====
document.addEventListener('DOMContentLoaded', init);
