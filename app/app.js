/* HPP Trainer – vanilla JS, no build step. All question content comes from data.enc (built by pipeline/build_data.py). */
'use strict';
const DATA_V = '6967cff94d';
const LS_STATE = 'hpp.state.v1', LS_KEY = 'hpp.key.v1';
const $ = (s, el = document) => el.querySelector(s);
const app = $('#app');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => Math.floor(Date.now() / 86400000);
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const fmtDate = (t) => new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' + new Date(t).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
const POOL_NAMES = { official: 'Original-Prüfungen', husum: 'Husum', likamundi: 'Likamundi' };
const TYPE_NAMES = { einfach: 'Einfachauswahl', mehrfach: 'Mehrfachauswahl', kombination: 'Aussagenkombination' };
const BOX_DAYS = [0, 1, 3, 7, 14, 30];
// inline stroke icons (no emoji)
const _svg = (d, extra = '') => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${d}</svg>`;
const ICON = {
  settings: _svg('<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"></path>'),
  bolt: _svg('<path d="M13 2 4 14h7l-1 8 9-12h-7z"></path>', ' width="26" height="26" stroke-width="2.4"'),
  cap: _svg('<path d="M22 10 12 5 2 10l10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path>'),
  layers: _svg('<path d="m12 2 9 5-9 5-9-5z"></path><path d="m3 12 9 5 9-5"></path><path d="m3 17 9 5 9-5"></path>', ' width="24" height="24"'),
  book: _svg('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>', ' width="24" height="24"'),
  wave: _svg('<path d="M2 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0"></path><path d="M2 18c2-3 4-3 6 0s4 3 6 0 4-3 6 0"></path>', ' width="24" height="24"'),
  bookOpen: _svg('<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>', ' width="24" height="24"'),
  clock: _svg('<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>', ' width="24" height="24"'),
  chart: _svg('<path d="M4 20V10"></path><path d="M10 20V4"></path><path d="M16 20v-8"></path><path d="M22 20H2"></path>', ' width="24" height="24"'),
  star: _svg('<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"></path>'),
  starFill: `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true" style="color:var(--warn)"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"></path></svg>`,
  x: _svg('<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>', ' width="20" height="20" stroke-width="2.2"'),
  back: _svg('<path d="m15 6-6 6 6 6"></path>', ' stroke-width="2.2"'),
  chevron: _svg('<path d="m9 6 6 6-6 6"></path>', ' width="20" height="20" style="color:var(--muted)"'),
  arrow: _svg('<path d="M5 12h14"></path><path d="m13 6 6 6-6 6"></path>', ' width="18" height="18" stroke-width="2.4"'),
  check: _svg('<path d="m5 12 4 4L19 6"></path>', ' width="16" height="16" stroke-width="2.6"'),
  xs: _svg('<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>', ' width="16" height="16" stroke-width="2.6"'),
  download: _svg('<path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M4 21h16"></path>'),
  upload: _svg('<path d="M12 21V9"></path><path d="m7 14 5-5 5 5"></path><path d="M4 3h16"></path>'),
  trash: _svg('<path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M6 6l1 14h10l1-14"></path>'),
  info: _svg('<circle cx="12" cy="12" r="9"></circle><path d="M12 11v5"></path><path d="M12 8h.01"></path>'),
  lock: _svg('<rect x="4" y="11" width="16" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path>'),
  bulb: _svg('<path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"></path>', ' width="16" height="16" stroke-width="2.2"'),
};


let DATA = null, Q = [], QBY = {}, VOCAB = [];
let S = loadState();
let cur = null; // running session
let timerHandle = null;

// ---------- state ----------
function loadState() {
  try { const s = JSON.parse(localStorage.getItem(LS_STATE)); if (s && s.answers) return withDefaults(s); } catch (e) { /* ignore */ }
  return withDefaults({});
}
function withDefaults(s) {
  s.answers ||= []; s.vanswers ||= []; s.srs ||= {}; s.sessions ||= []; s.flags ||= {}; s.vocab ||= {};
  s.settings = Object.assign({ len: 20, pools: { official: true, husum: false, likamundi: true }, theme: 'auto', haptic: true, examTimer: 0 }, s.settings || {});
  return s;
}
function save() { try { localStorage.setItem(LS_STATE, JSON.stringify(S)); } catch (e) { toast('Speichern fehlgeschlagen (Speicher voll?)'); } }
function applyTheme() { const t = S.settings.theme; if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t); }

// ---------- crypto / data ----------
const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function deriveKey(pass, salt) {
  const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: b64(salt), iterations: 200000, hash: 'SHA-256' }, km, 256));
}
async function decrypt(enc, raw) {
  const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(enc.iv) }, key, b64(enc.ct));
  return JSON.parse(new TextDecoder().decode(pt));
}
async function fetchEnc() { const r = await fetch('data.enc?v=' + DATA_V, { cache: 'force-cache' }); if (!r.ok) throw new Error('data.enc fehlt'); return r.json(); }
function setData(d) {
  DATA = d; Q = d.questions; QBY = {}; Q.forEach((q) => { QBY[q.id] = q; }); VOCAB = d.vocab || []; buildVocab();
}
async function boot() {
  applyTheme();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  let enc; try { enc = await fetchEnc(); } catch (e) { app.innerHTML = `<div class="view"><div class="center"><p>Daten konnten nicht geladen werden.</p><button class="btn primary" onclick="location.reload()">Neu laden</button></div></div>`; return; }
  const saved = localStorage.getItem(LS_KEY);
  if (saved) { try { setData(await decrypt(enc, b64(saved))); route(); return; } catch (e) { localStorage.removeItem(LS_KEY); } }
  renderUnlock(enc);
}
function renderUnlock(enc, err) {
  app.innerHTML = `<div class="view"><div class="center">
    <img src="icon.svg" width="88" height="88" alt="">
    <h1>HPP Trainer</h1><p class="muted">Gib den Zugangscode ein, den du bekommen hast. Danach musst du ihn nicht mehr eingeben.</p>
    <form id="unlock" style="width:100%;max-width:360px" class="stack">
      <input type="password" id="pass" placeholder="Zugangscode" autocomplete="off" autocapitalize="none">
      ${err ? `<p class="muted" style="color:var(--bad)">${esc(err)}</p>` : ''}
      <button class="btn primary big" type="submit">Los geht's</button>
    </form></div></div>`;
  $('#unlock').onsubmit = async (e) => {
    e.preventDefault();
    const btn = $('#unlock button'); btn.disabled = true; btn.textContent = 'Prüfe…';
    try { const raw = await deriveKey($('#pass').value.trim(), enc.salt); setData(await decrypt(enc, raw)); localStorage.setItem(LS_KEY, btoa(String.fromCharCode(...raw))); route(); }
    catch (er) { renderUnlock(enc, 'Code stimmt nicht.'); }
  };
  setTimeout(() => $('#pass')?.focus(), 50);
}

// ---------- router ----------
function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
window.addEventListener('hashchange', route);
function route() {
  if (!DATA) return;
  const [name, arg] = location.hash.replace(/^#\/?/, '').split('/');
  window.scrollTo(0, 0);
  const views = { '': renderHome, home: renderHome, quiz: renderQuiz, result: renderResult, history: renderHistory, session: () => renderSession(arg), stats: renderStats, topics: renderTopics, vocab: renderVocab, vsession: renderVSession, settings: renderSettings, about: renderAbout, review: () => renderReview(arg), flagged: renderFlagged };
  (views[name] || renderHome)();
}
function topbar(title, right = '') { return `<div class="topbar"><button class="iconbtn" data-back aria-label="Zurück">${ICON.back}</button><div class="title">${esc(title)}</div><div class="tb-right">${right}</div></div>`; }
app.addEventListener('click', (e) => { const b = e.target.closest('[data-back]'); if (b) { e.preventDefault(); if (history.length > 1) history.back(); else go('#/home'); } });
function toast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 1800); }
function haptic(ok) { if (S.settings.haptic && navigator.vibrate) navigator.vibrate(ok ? 12 : [25, 35, 25]); }

// ---------- selection helpers ----------
function poolQuestions(pools) { return Q.filter((q) => pools[q.pool]); }
function pickLearning(pools, topic, n) {
  const t = today();
  const qs = poolQuestions(pools).filter((q) => !topic || q.topic === topic);
  const wrong = [], due = [], fresh = [], rest = [];
  qs.forEach((q) => { const r = S.srs[q.id]; if (!r) fresh.push(q); else if (r.box === 0) wrong.push(q); else if (r.due <= t) due.push(q); else rest.push(q); });
  shuffle(wrong); shuffle(due); shuffle(fresh); rest.sort((a, b) => S.srs[a.id].due - S.srs[b.id].due);
  return [...wrong, ...due, ...fresh, ...rest].slice(0, n).map((q) => q.id);
}
function pickExam() {
  const qs = Q.filter((q) => q.pool === 'official');
  const unseen = shuffle(qs.filter((q) => !S.srs[q.id])), seen = shuffle(qs.filter((q) => S.srs[q.id]));
  return [...unseen, ...seen].slice(0, DATA.meta.exam_size || 28).map((q) => q.id);
}
function isCorrect(q, sel) { const a = [...q.answer].sort().join(''), s = [...sel].sort().join(''); return a === s; }
function srsUpdate(qid, ok) {
  const r = S.srs[qid] || { box: 0, due: 0, seen: 0, wrong: 0 };
  r.seen++; if (ok) r.box = Math.min(r.box + 1, 5); else { r.box = 0; r.wrong++; }
  r.due = today() + BOX_DAYS[r.box]; r.last = Date.now(); S.srs[qid] = r;
}

// ---------- home ----------
function renderHome() {
  const t = today();
  const all = poolQuestions(S.settings.pools);
  const due = all.filter((q) => { const r = S.srs[q.id]; return r && (r.box === 0 || r.due <= t); }).length;
  const fresh = all.filter((q) => !S.srs[q.id]).length;
  const todayAns = S.answers.concat(S.vanswers).filter((a) => Math.floor(a.t / 86400000) === t);
  const todayOk = todayAns.filter((a) => a.ok).length;
  const streak = calcStreak();
  const mastered = Object.values(S.srs).filter((r) => r.box >= 3).length;
  const c = DATA.meta.counts;
  const tile = (go, icon, label) => `<button class="tile" ${go.startsWith('#') ? `onclick="location.hash='${go}'"` : `data-go="${go}"`}>${icon}<span>${label}</span></button>`;
  app.innerHTML = `<div class="view home">
    <div class="home-head"><div><div class="muted strong">Hallo Phine</div><h1>Heute dran.</h1></div><button class="iconbtn card-btn" onclick="location.hash='#/settings'" aria-label="Einstellungen">${ICON.settings}</button></div>
    <div class="statcard"><div><b class="num accent">${streak}</b><span>Tage in Folge</span></div><div><b class="num">${todayOk}<small>/${todayAns.length}</small></b><span>heute richtig</span></div><div><b class="num">${mastered}</b><span>sicher</span></div></div>
    <button class="cta" data-go="learn"><span class="grow"><b class="display">Lernen</b><small>${due} fällig · ${fresh} neu · ${S.settings.len} pro Runde</small></span><span class="ring">${ICON.bolt}</span></button>
    <button class="cta2" data-go="exam"><span class="ico-box">${ICON.cap}</span><span class="grow"><b>Prüfung simulieren</b><small>28 Originalfragen · 21 zum Bestehen</small></span>${ICON.chevron}</button>
    <div class="tiles">${tile('#/topics', ICON.layers, 'Themen')}${tile('#/vocab', ICON.book, 'Begriffe')}${tile('husum', ICON.wave, 'Husum')}${tile('lika', ICON.bookOpen, 'Likamundi')}${tile('#/history', ICON.clock, 'Verlauf')}${tile('#/stats', ICON.chart, 'Statistik')}</div>
    ${Object.keys(S.flags).length ? `<button class="cta2" onclick="location.hash='#/flagged'"><span class="ico-box">${ICON.starFill}</span><span class="grow"><b>Markierte Fragen</b><small>${Object.keys(S.flags).length} markiert</small></span>${ICON.chevron}</button>` : ''}
    <p class="hint foot">${c.official} Originalfragen 2018–2026 · ${c.husum} Husum · ${c.likamundi} Likamundi · ${c.vocab + (c.cards || 0)} Begriffe</p>
  </div>`;
  app.querySelectorAll('[data-go]').forEach((b) => b.onclick = () => {
    const k = b.dataset.go;
    if (k === 'learn') startSession({ mode: 'lernen', ids: pickLearning(S.settings.pools, null, S.settings.len), feedback: true, label: 'Lernen' });
    if (k === 'exam') startSession({ mode: 'pruefung', ids: pickExam(), feedback: false, label: 'Prüfungssimulation' });
    if (k === 'husum') startSession({ mode: 'husum', ids: pickLearning({ husum: true }, null, S.settings.len), feedback: true, label: 'Husum' });
    if (k === 'lika') startSession({ mode: 'likamundi', ids: pickLearning({ likamundi: true }, null, S.settings.len), feedback: true, label: 'Likamundi' });
  });
}
function calcStreak() {
  const days = new Set(S.answers.concat(S.vanswers).map((a) => Math.floor(a.t / 86400000)));
  let d = today(), n = 0; if (!days.has(d)) d--;
  while (days.has(d)) { n++; d--; }
  return n;
}

// ---------- quiz ----------
function startSession(o) {
  if (!o.ids.length) { toast('Keine Fragen in dieser Auswahl'); return; }
  cur = { sid: Date.now().toString(36), mode: o.mode, label: o.label, ids: o.ids, i: 0, res: {}, start: Date.now(), feedback: o.feedback, sel: [] };
  go('#/quiz');
}
function renderQuiz() {
  if (!cur) { go('#/home'); return; }
  if (cur.i >= cur.ids.length) { finishSession(); return; }
  const q = QBY[cur.ids[cur.i]];
  const done = cur.res[q.id];
  const n = cur.ids.length, answered = Object.keys(cur.res).length;
  const elapsed = Math.floor((Date.now() - cur.start) / 1000);
  const sid = cur.sid;
  app.innerHTML = `<div class="view quiz${done && cur.feedback ? ' has-sheet' : ''}">
    <div class="topbar compact">
      <button class="iconbtn" id="qclose" aria-label="Beenden">${ICON.x}</button>
      <div class="progress"><i style="width:${(answered / n) * 100}%"></i></div>
      <div class="tb-right" style="min-width:56px;justify-content:flex-end"><span id="qcount">${cur.i + 1}<span class="muted">/${n}</span></span>${cur.mode === 'pruefung' ? `<span class="muted small" id="timer">${fmtTime(elapsed)}</span>` : ''}</div>
      <button class="iconbtn" id="qflag" aria-label="Merken">${S.flags[q.id] ? ICON.starFill : ICON.star}</button>
    </div>
    <div class="qcard entering" id="qcard">${questionHTML(q)}</div>
    <div class="options${compactLabels(q) ? ' compact' : ''}" id="opts">${optionsHTML(q, done ? done.sel : cur.sel, done && cur.feedback ? q : null)}</div>
    ${done ? '' : `<p class="hint">${q.type === 'mehrfach' ? 'Zwei Antworten antippen' : 'Antwort antippen'}</p>`}
    ${done && cur.feedback ? sheetHTML(q, done.sel) : ''}
  </div>`;
  $('#qclose').onclick = () => { if (answered === 0) { cur = null; go('#/home'); } else if (confirm('Runde beenden und auswerten?')) finishSession(); };
  $('#qflag').onclick = () => { if (S.flags[q.id]) delete S.flags[q.id]; else S.flags[q.id] = 1; save(); $('#qflag').innerHTML = S.flags[q.id] ? ICON.starFill : ICON.star; };
  app.querySelectorAll('.opt').forEach((b) => b.onclick = () => choose(q, b.dataset.k));
  if (done) bindSheet(q);
  bindSwipe($('#qcard'), q);
  if (cur.mode === 'pruefung') { clearInterval(timerHandle); timerHandle = setInterval(() => { const el = $('#timer'); if (!el || !cur || cur.sid !== sid) { clearInterval(timerHandle); return; } el.textContent = fmtTime(Math.floor((Date.now() - cur.start) / 1000)); }, 1000); }
}
function fmtTime(s) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
// Short labels for the standard "Nur die Aussagen 1, 3 und 4 sind richtig" options (derived by fixed patterns only).
function shortLabel(text) {
  const t = text.trim().replace(/\.$/, '');
  let m = t.match(/^Nur die Aussagen? (.+?) (?:ist|sind) richtig$/i); if (m) return m[1];
  if (/^Alle Aussagen? (?:ist|sind) richtig$/i.test(t)) return 'Alle';
  if (/^Keine der Aussagen ist richtig$/i.test(t)) return 'Keine';
  return null;
}
function compactLabels(q) { const ls = Object.values(q.options).map(shortLabel); return ls.length === 5 && ls.every(Boolean) ? ls : null; }
function questionHTML(q) {
  const meta = `${esc(q.exam)}${q.pool === 'official' ? ' · Nr. ' + q.nr : ''} · ${esc(q.topic)}`;
  const stmts = q.statements && q.statements.length ? `<ol class="statements">${q.statements.map((s, i) => `<li><b>${i + 1}</b><span>${esc(s)}</span></li>`).join('')}</ol>` : '';
  const instr = q.instruction ? `<div class="instr">${esc(q.instruction)}</div>` : (q.type === 'mehrfach' ? '<div class="instr">Wählen Sie zwei Antworten!</div>' : '');
  const numbered = q.numbered_options ? '<div class="muted small" style="margin-top:6px">Im Original waren die Antworten 1–5 nummeriert.</div>' : '';
  const long = (q.stem.length + q.statements.join('').length) > 500;
  return `<div class="qmeta">${meta}</div><div class="stem${long ? ' small' : ''}">${esc(q.stem)}</div>${stmts}${instr}${numbered}`;
}
function optionsHTML(q, sel, reveal) {
  const labels = compactLabels(q);
  return Object.entries(q.options).map(([k, v], i) => {
    let cls = 'opt'; const chosen = sel.includes(k);
    if (reveal) { const right = q.answer.includes(k); if (right) cls += ' correct'; else if (chosen) cls += ' wrong'; else cls += ' dim'; }
    else if (chosen) cls += ' selected';
    const text = labels ? labels[i] : v;
    return `<button class="${cls}" data-k="${k}" ${reveal ? 'disabled' : ''} title="${esc(v)}"><span class="letter">${k}</span><span>${esc(text)}</span></button>`;
  }).join('');
}
function choose(q, k) {
  if (cur.res[q.id]) return;
  if (q.type === 'mehrfach') {
    if (cur.sel.includes(k)) cur.sel = cur.sel.filter((x) => x !== k); else cur.sel.push(k);
    if (cur.sel.length < 2) { $('#opts').innerHTML = optionsHTML(q, cur.sel, null); app.querySelectorAll('.opt').forEach((b) => b.onclick = () => choose(q, b.dataset.k)); return; }
  } else cur.sel = [k];
  const sel = cur.sel.slice(); cur.sel = [];
  const ok = isCorrect(q, sel);
  cur.res[q.id] = { sel, ok };
  S.answers.push({ t: Date.now(), q: q.id, a: sel, ok, m: cur.mode, s: cur.sid });
  srsUpdate(q.id, ok); save();
  if (!cur.feedback) { setTimeout(next, 120); return; }
  haptic(ok);
  $('#opts').innerHTML = optionsHTML(q, sel, q);
  const hint = $('.quiz .hint'); if (hint) hint.remove();
  $('.quiz').classList.add('has-sheet');
  $('.quiz').insertAdjacentHTML('beforeend', sheetHTML(q, sel));
  bindSheet(q);
  if (ok) { const streak = recentStreak(); if (streak && streak % 5 === 0) { confetti(60); toast(`${streak} in Folge!`); } }
}
function recentStreak() { let n = 0; for (let i = S.answers.length - 1; i >= 0 && S.answers[i].ok; i--) n++; return n; }
function sheetHTML(q, sel) {
  const ok = isCorrect(q, sel);
  const heads = ok ? ['Richtig!', 'Sauber!', 'Genau so.', 'Sitzt.', 'Stark!'] : ['Leider nein.', 'Knapp daneben.', 'Merken!', 'Nochmal anschauen.'];
  const head = heads[Math.floor(Math.random() * heads.length)];
  const hasExpl = Object.keys(q.expl || {}).length || q.general;
  const labels = compactLabels(q);
  const ansLabel = labels ? q.answer.map((k) => labels['ABCDE'.indexOf(k)]).join(' / ') : '';
  return `<div class="sheet ${ok ? 'ok' : 'bad'}" id="sheet">
    <div class="sheet-head"><div><div class="head display">${head}</div><div class="sol">Lösung <b>${q.answer.join(' + ')}</b>${ansLabel ? ` · ${esc(ansLabel)}` : ''}</div></div>
      <button class="btn primary next" id="next">${cur.i + 1 < cur.ids.length ? 'Weiter' : 'Auswertung'} ${ICON.arrow}</button></div>
    ${q.disputed ? `<div class="warnbox">Schulen uneins: ${esc(Object.entries(q.keys).map(([s, a]) => `${s}: ${a}`).join(' · '))}</div>` : ''}
    ${hasExpl ? `<details class="sheet-expl"><summary>Erklärung anzeigen</summary>${explHTML(q)}</details>` : `<div class="srcline">Lösung laut ${esc(Object.entries(q.keys).map(([s, a]) => `${s} (${a})`).join(', '))} – ohne Gewähr</div>`}
  </div>`;
}
function bindSheet(q) {
  const nx = $('#next'); if (nx) nx.onclick = next;
  const sh = $('#sheet'); if (!sh) return;
  let x0 = null;
  sh.addEventListener('pointerdown', (e) => { x0 = e.clientX; }, { passive: true });
  sh.addEventListener('pointerup', (e) => { if (x0 !== null && e.clientX - x0 < -70) next(); x0 = null; });
}
function explHTML(q) {
  let h = '';
  const ex = q.expl || {}; const keys = Object.keys(ex);
  if (keys.length || q.general) {
    h += `<div class="expl">${keys.map((k) => `<div class="o"><b>${k})</b> ${esc(ex[k])}</div>`).join('')}${q.general ? `<div class="o">${esc(q.general)}</div>` : ''}</div>`;
  }
  const src = Object.entries(q.keys).map(([s, a]) => `${s} (${a})`).join(', ');
  h += `<div class="srcline">Lösung laut ${esc(src)} – ohne Gewähr${q.expl_source ? ` · Erklärung: ${esc(q.expl_source)}` : ''}</div>`;
  return h;
}
function next() {
  const card = $('#qcard'); if (card) card.classList.add('leaving');
  setTimeout(() => { cur.i++; cur.sel = []; renderQuiz(); }, 160);
}
function bindSwipe(card, q) {
  let x0 = null, dx = 0;
  card.addEventListener('pointerdown', (e) => { x0 = e.clientX; dx = 0; card.style.transition = 'none'; }, { passive: true });
  card.addEventListener('pointermove', (e) => { if (x0 === null) return; dx = e.clientX - x0; if (Math.abs(dx) > 8) card.style.transform = `translateX(${dx * 0.6}px) rotate(${dx / 40}deg)`; }, { passive: true });
  const end = () => { if (x0 === null) return; card.style.transition = ''; card.style.transform = ''; const d = dx; x0 = null;
    if (d < -70 && cur.res[q.id]) next(); else if (d > 70 && cur.i > 0) { cur.i--; cur.sel = []; renderQuiz(); } };
  card.addEventListener('pointerup', end); card.addEventListener('pointercancel', end);
}
function finishSession() {
  clearInterval(timerHandle);
  const ids = cur.ids.filter((id) => cur.res[id]);
  const ok = ids.filter((id) => cur.res[id].ok).length;
  const sess = { sid: cur.sid, mode: cur.mode, label: cur.label, t: cur.start, dur: Date.now() - cur.start, n: ids.length, ok, items: ids.map((id) => ({ q: id, a: cur.res[id].sel, ok: cur.res[id].ok })) };
  S.sessions.unshift(sess); save();
  cur = null;
  go('#/result');
}
function renderResult() {
  const s = S.sessions[0]; if (!s) { go('#/home'); return; }
  renderSession(s.sid, true);
}
function renderSession(sid, fresh = false) {
  const s = S.sessions.find((x) => x.sid === sid); if (!s) { go('#/history'); return; }
  if (s.mode === 'begriffe') { renderVocabSession(s); return; }
  const pct = s.n ? Math.round((s.ok / s.n) * 100) : 0;
  const exam = s.mode === 'pruefung';
  const full = s.n === (DATA.meta.exam_size || 28);
  const passed = exam && full && s.ok >= (DATA.meta.pass_mark || 21);
  const byTopic = {};
  s.items.forEach((it) => { const q = QBY[it.q]; if (!q) return; const b = byTopic[q.topic] ||= { n: 0, ok: 0 }; b.n++; if (it.ok) b.ok++; });
  const verdict = exam ? (full ? (passed ? `<span class="pill ok">${ICON.check} Bestanden</span>` : `<span class="pill bad">${ICON.xs} Nicht bestanden</span>`) : '<span class="pill gray">Abgebrochen</span>') : `<span class="pill ${pct >= 75 ? 'ok' : 'warn'}">${pct} %</span>`;
  const wrong = s.items.filter((i) => !i.ok).length;
  app.innerHTML = `<div class="view">${topbar(s.label || 'Runde')}
    <div class="card scorecard">
      <div class="score">${s.ok}<small>/${s.n}</small></div>
      ${verdict}
      <div class="muted strong small">${fmtDate(s.t)} · ${fmtTime(Math.round(s.dur / 1000))}${exam ? ' · 21 nötig' : ''}</div>
    </div>
    <div class="stack" style="margin-top:12px">
      ${wrong ? `<button class="btn primary big" id="redo">Fehler nochmal üben (${wrong})</button>` : ''}
      <button class="btn" onclick="location.hash='#/home'"><span class="grow" style="text-align:center">Zurück zur Übersicht</span></button>
    </div>
    <h2>Nach Thema</h2>
    <div class="stack">${Object.entries(byTopic).sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n).map(([t, b]) => `<div><div class="barrow"><span>${esc(t)}</span><span>${b.ok}/${b.n}</span></div><div class="bar"><i style="width:${(b.ok / b.n) * 100}%;background:${b.ok / b.n >= 0.75 ? 'var(--ok)' : 'var(--warn)'}"></i></div></div>`).join('')}</div>
    <h2>Fragen</h2>
    <div class="list">${s.items.map((it, i) => { const q = QBY[it.q]; if (!q) return ''; return `<div class="row" onclick="location.hash='#/review/${q.id}'"><span class="badge ${it.ok ? 'ok' : 'bad'}">${it.ok ? ICON.check : ICON.xs}</span><div class="grow"><div class="t">${i + 1}. ${esc(q.stem)}</div><div class="s">Deine Antwort ${it.a.join('+')} · Lösung ${q.answer.join('+')}</div></div></div>`; }).join('')}</div>
  </div>`;
  if ($('#redo')) $('#redo').onclick = () => startSession({ mode: 'lernen', ids: shuffle(s.items.filter((i) => !i.ok).map((i) => i.q)), feedback: true, label: 'Fehler wiederholen' });
  if (fresh && passed) confetti(160);
}
function renderReview(id) {
  const q = QBY[id]; if (!q) { go('#/home'); return; }
  const hist = S.answers.filter((a) => a.q === id).slice(-5).reverse();
  const last = hist[0];
  app.innerHTML = `<div class="view quiz">${topbar('Frage ansehen', `<button class="iconbtn" id="qflag">${S.flags[q.id] ? ICON.starFill : ICON.star}</button>`)}
    <div class="qcard">${questionHTML(q)}</div>
    <div class="options">${optionsHTML(q, last ? last.a : [], q)}</div>
    <div class="feedback neutral"><div class="head">Lösung ${q.answer.join(' + ')}</div>${q.disputed ? `<div class="warnbox">Schulen uneins: ${esc(Object.entries(q.keys).map(([s, a]) => `${s}: ${a}`).join(' · '))}</div>` : ''}${explHTML(q)}</div>
    ${hist.length ? `<div class="card"><b>Deine Versuche</b>${hist.map((a) => `<div class="small muted" style="display:flex;align-items:center;gap:6px;margin-top:4px"><span class="badge ${a.ok ? 'ok' : 'bad'}" style="width:20px;height:20px;flex-basis:20px">${a.ok ? ICON.check : ICON.xs}</span>${fmtDate(a.t)} · ${a.a.join('+')}</div>`).join('')}</div>` : ''}
    <div class="bottombar"><button class="btn primary" data-back>Zurück</button></div>
  </div>`;
  $('#qflag').onclick = () => { if (S.flags[q.id]) delete S.flags[q.id]; else S.flags[q.id] = 1; save(); $('#qflag').innerHTML = S.flags[q.id] ? ICON.starFill : ICON.star; };
}

// ---------- history / stats ----------
function renderHistory() {
  app.innerHTML = `<div class="view">${topbar('Verlauf')}
    ${S.sessions.length ? `<div class="list">${S.sessions.map((s) => `<div class="row" onclick="location.hash='#/session/${s.sid}'"><div class="grow"><div class="t">${esc(s.label || s.mode)} · ${s.ok}/${s.n}</div><div class="s">${fmtDate(s.t)} · ${fmtTime(Math.round(s.dur / 1000))}</div></div><span class="pill ${s.n && s.ok / s.n >= 0.75 ? 'ok' : 'warn'}">${s.n ? Math.round((s.ok / s.n) * 100) : 0} %</span></div>`).join('')}</div>` : '<p class="muted">Noch keine Runden. Leg los!</p>'}
  </div>`;
}
function renderStats() {
  const n = S.answers.length, ok = S.answers.filter((a) => a.ok).length;
  const week = S.answers.filter((a) => a.t > Date.now() - 7 * 86400000).length;
  const topics = {};
  S.answers.forEach((a) => { const q = QBY[a.q]; if (!q) return; const b = topics[q.topic] ||= { n: 0, ok: 0 }; b.n++; if (a.ok) b.ok++; });
  const boxes = [0, 0, 0, 0, 0, 0]; Object.values(S.srs).forEach((r) => boxes[r.box]++);
  const exams = {};
  Q.filter((q) => q.pool === 'official').forEach((q) => { const e = exams[q.exam] ||= { n: 0, seen: 0, ok: 0 }; e.n++; const r = S.srs[q.id]; if (r) { e.seen++; if (r.box > 0) e.ok++; } });
  app.innerHTML = `<div class="view">${topbar('Statistik')}
    <div class="statcard"><div><b class="num">${n}</b><span>Antworten</span></div><div><b class="num">${n ? Math.round((ok / n) * 100) : 0}<small>%</small></b><span>richtig gesamt</span></div><div><b class="num">${week}</b><span>letzte 7 Tage</span></div></div>
    <h2>Nach Thema</h2>
    <div class="stack">${Object.entries(topics).sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n).map(([t, b]) => `<div onclick="startTopic('${esc(t).replace(/'/g, '&#39;')}')"><div class="barrow"><span>${esc(t)}</span><span>${Math.round((b.ok / b.n) * 100)} % · ${b.n}</span></div><div class="bar"><i style="width:${(b.ok / b.n) * 100}%;background:${b.ok / b.n >= 0.75 ? 'var(--ok)' : 'var(--warn)'}"></i></div></div>`).join('') || '<p class="muted">Noch keine Daten.</p>'}</div>
    <h2>Lernstufen</h2>
    <div class="card small">${['neu/falsch', '1× richtig', '2× richtig', '3× richtig', '4× richtig', 'sicher'].map((l, i) => `<div class="barrow" style="margin:3px 0"><span style="font-weight:600">${l}</span><span style="color:var(--text)">${boxes[i]}</span></div>`).join('')}<div class="muted" style="margin-top:6px">Falsche Fragen kommen sofort wieder, richtige nach 1, 3, 7, 14 und 30 Tagen.</div></div>
    <h2>Begriffe</h2>
    <div class="stack">${DECKS.map((d) => { const v = deckStats(d); if (!v.n) return ''; return `<div><div class="barrow"><span>${d}</span><span>${v.seen}/${v.n} gesehen · ${v.mastered} sicher</span></div><div class="bar"><i style="width:${(v.mastered / v.n) * 100}%"></i></div></div>`; }).join('')}</div>
    <h2>Prüfungen abgedeckt</h2>
    <div class="stack">${Object.entries(exams).map(([e, v]) => `<div><div class="barrow"><span>${esc(e)}</span><span>${v.seen}/${v.n} gesehen · ${v.ok} richtig</span></div><div class="bar"><i style="width:${(v.seen / v.n) * 100}%"></i></div></div>`).join('')}</div>
  </div>`;
}
window.startTopic = (t) => startSession({ mode: 'lernen', ids: pickLearning({ official: true, husum: true, likamundi: true }, t, S.settings.len), feedback: true, label: t });
function renderTopics() {
  const pools = { official: true, husum: true, likamundi: true };
  const topics = {};
  poolQuestions(pools).forEach((q) => { const b = topics[q.topic] ||= { n: 0, ok: 0, seen: 0 }; b.n++; const r = S.srs[q.id]; if (r) { b.seen++; if (r.box > 0) b.ok++; } });
  app.innerHTML = `<div class="view">${topbar('Themen')}
    <p class="muted small">Themen sind automatisch per Stichwort zugeordnet. Antippen startet eine Runde mit ${S.settings.len} Fragen aus allen Pools.</p>
    <div class="list">${Object.entries(topics).sort((a, b) => b[1].n - a[1].n).map(([t, b]) => `<div class="row" onclick="startTopic('${esc(t).replace(/'/g, '&#39;')}')"><div class="grow"><div class="t">${esc(t)}</div><div class="s">${b.n} Fragen · ${b.seen} gesehen · ${b.ok} gerade richtig</div><div class="bar" style="margin-top:6px"><i style="width:${(b.ok / b.n) * 100}%"></i></div></div></div>`).join('')}</div>
  </div>`;
}
function renderFlagged() {
  const ids = Object.keys(S.flags).filter((id) => QBY[id]);
  app.innerHTML = `<div class="view">${topbar('Markierte Fragen')}
    ${ids.length ? `<button class="btn primary" id="go">Markierte üben (${ids.length})</button><div class="list" style="margin-top:10px">${ids.map((id) => `<div class="row" onclick="location.hash='#/review/${id}'"><div class="grow"><div class="t">${esc(QBY[id].stem)}</div><div class="s">${esc(QBY[id].exam)}</div></div></div>`).join('')}</div>` : '<p class="muted">Noch nichts markiert. Tippe den Stern bei einer Frage.</p>'}</div>`;
  if ($('#go')) $('#go').onclick = () => startSession({ mode: 'lernen', ids: shuffle(ids), feedback: true, label: 'Markierte' });
}

// ---------- vocab (Begriffe) ----------
const DECKS = ['Fachbegriffe', 'Abwehrmechanismen', 'Abkürzungen', 'Wortbausteine', 'Allgemein', 'Medizinisch', 'Fremdwörter'];
const DECK_INFO = { Fachbegriffe: 'aus der Fachbegriffe-Liste, mit Quiz', Abwehrmechanismen: 'Freud & Co.', Abkürzungen: 'ICD, DSM, AMDP …', Wortbausteine: 'Vor- und Nachsilben aus dem Latein', Allgemein: 'allgemeine Vokabeln', Medizinisch: 'medizinische Vokabeln', Fremdwörter: 'Liste von Donatella' };
let VC = [], VCBY = {};
function buildVocab() {
  VC = VOCAB.map((v) => ({ deck: 'Fachbegriffe', term: v.term, text: v.explanation, note: v.mnemonic, category: v.category, quiz: v }))
    .concat((DATA.cards || []).map((c) => ({ deck: c.deck, term: c.term, text: c.text, note: c.note || '', category: c.category || '' })));
  VCBY = {}; VC.forEach((c) => { c.k = c.deck + '|' + c.term; VCBY[c.k] = c; });
}
function vUpdate(k, ok) {
  const r = (S.vocab[k] && typeof S.vocab[k].box === 'number') ? S.vocab[k] : { box: 0, due: 0, seen: 0, wrong: 0 };
  r.seen++; if (ok) r.box = Math.min(r.box + 1, 5); else { r.box = 0; r.wrong++; }
  r.due = today() + BOX_DAYS[r.box]; r.last = Date.now(); S.vocab[k] = r;
  S.vanswers.push({ t: Date.now(), k, ok });
}
function vState(k) { const r = S.vocab[k]; return r && typeof r.box === 'number' ? r : null; }
function pickVocab(deck, n) {
  const t = today();
  const cs = VC.filter((c) => !deck || c.deck === deck);
  const wrong = [], due = [], fresh = [], rest = [];
  cs.forEach((c) => { const r = vState(c.k); if (!r) fresh.push(c); else if (r.box === 0) wrong.push(c); else if (r.due <= t) due.push(c); else rest.push(c); });
  shuffle(wrong); shuffle(due); shuffle(fresh); rest.sort((a, b) => vState(a.k).due - vState(b.k).due);
  return [...wrong, ...due, ...fresh, ...rest].slice(0, n).map((c) => c.k);
}
function deckStats(deck) {
  const t = today(); let n = 0, seen = 0, mastered = 0, due = 0;
  VC.forEach((c) => { if (c.deck !== deck) return; n++; const r = vState(c.k); if (r) { seen++; if (r.box >= 3) mastered++; if (r.box === 0 || r.due <= t) due++; } });
  return { n, seen, mastered, due };
}
function renderVocab() {
  const q = deckStats('Fachbegriffe');
  app.innerHTML = `<div class="view">${topbar('Begriffe')}
    <button class="cta" id="vquiz"><span class="grow"><b class="display">Begriffe-Quiz</b><small>${q.n} Fachbegriffe · ${q.due} fällig · ${q.n - q.seen} neu · ${S.settings.len} pro Runde</small></span><span class="ring">${ICON.bolt}</span></button>
    <p class="muted small" style="margin:10px 2px 2px">Karteikarten: Begriff sehen, antippen zum Aufdecken, dann „Wusste ich“ oder „Nochmal“. Falsche kommen sofort wieder, richtige nach 1, 3, 7, 14 und 30 Tagen.</p>
    <div class="list">${DECKS.map((d) => { const s = deckStats(d); if (!s.n) return ''; return `<div class="row" data-deck="${d}"><div class="grow"><div class="t">${d}</div><div class="s">${s.n} Karten · ${s.due} fällig · ${s.mastered} sicher · ${esc(DECK_INFO[d] || '')}</div><div class="bar" style="margin-top:6px"><i style="width:${(s.mastered / s.n) * 100}%"></i></div></div>${ICON.chevron}</div>`; }).join('')}</div>
  </div>`;
  $('#vquiz').onclick = () => startVocab('quiz', 'Fachbegriffe');
  app.querySelectorAll('[data-deck]').forEach((r) => r.onclick = () => startVocab('cards', r.dataset.deck));
}
let vs = null;
function startVocab(kind, deck, keys) {
  const items = keys || pickVocab(deck, S.settings.len);
  if (!items.length) { toast('Keine Karten in diesem Stapel'); return; }
  vs = { sid: Date.now().toString(36), kind, deck, items, i: 0, res: {}, start: Date.now(), revealed: false, flip: items.map(() => Math.random() < 0.5) };
  go('#/vsession');
}
function renderVSession() {
  if (!vs) { go('#/vocab'); return; }
  if (vs.i >= vs.items.length) { finishVocab(); return; }
  const c = VCBY[vs.items[vs.i]]; if (!c) { vs.i++; renderVSession(); return; }
  const n = vs.items.length, answered = Object.keys(vs.res).length;
  const head = `<div class="topbar compact"><button class="iconbtn" id="qclose" aria-label="Beenden">${ICON.x}</button><div class="progress"><i style="width:${(answered / n) * 100}%"></i></div><div class="tb-right" style="min-width:56px;justify-content:flex-end"><span>${vs.i + 1}<span class="muted">/${n}</span></span></div><div style="width:44px"></div></div>`;
  if (vs.kind === 'quiz') {
    const v = c.quiz;
    const opts = vs.opts || (vs.opts = shuffle([{ t: v.correct, ok: true }, { t: v.distractor, ok: false }]));
    app.innerHTML = `<div class="view quiz">${head}
      <div class="vocab-card"><div class="cat">${esc(c.category || 'Begriff')}</div><div class="term">${esc(c.term)}</div>${c.note ? `<div class="mnemo">${ICON.bulb}<span>${esc(c.note)}</span></div>` : ''}</div>
      <div class="options">${opts.map((o, i) => `<button class="opt tall" data-ok="${o.ok}"><span class="letter">${'AB'[i]}</span><span>${esc(o.t)}</span></button>`).join('')}</div>
      <div id="fb"></div>
      <p class="hint">Antippen – geht automatisch weiter</p>
    </div>`;
    app.querySelectorAll('.opt').forEach((b) => b.onclick = () => {
      if (vs.res[c.k]) return;
      const ok = b.dataset.ok === 'true';
      app.querySelectorAll('.opt').forEach((x) => { x.disabled = true; x.classList.add(x.dataset.ok === 'true' ? 'correct' : (x === b ? 'wrong' : 'dim')); });
      vs.res[c.k] = { ok }; vUpdate(c.k, ok); save(); haptic(ok);
      if (c.text) $('#fb').innerHTML = `<div class="feedback neutral"><div class="small" style="font-weight:600">${esc(c.text)}</div></div>`;
      setTimeout(() => { vs.i++; vs.opts = null; renderVSession(); }, ok ? 700 : 1600);
    });
  } else {
    const flipped = vs.flip[vs.i] && c.deck !== 'Wortbausteine';
    const front = flipped ? c.text : c.term, back = flipped ? c.term : c.text;
    app.innerHTML = `<div class="view quiz">${head}
      <button class="flash${vs.revealed ? ' open' : ''}" id="flash">
        <span class="cat">${esc(c.deck)}${c.category ? ' · ' + esc(c.category) : ''}</span>
        <span class="${flipped ? 'text' : 'term'}">${esc(front)}</span>
        ${vs.revealed ? `<span class="divider"></span><span class="${flipped ? 'term' : 'text'}">${esc(back)}</span>${c.note ? `<span class="mnemo">${ICON.bulb}<span>${esc(c.note)}</span></span>` : ''}` : `<span class="muted small">Antippen zum Aufdecken</span>`}
      </button>
      ${vs.revealed ? `<div class="rate"><button class="btn bad" id="no">${ICON.xs} Nochmal</button><button class="btn ok" id="yes">${ICON.check} Wusste ich</button></div>` : '<p class="hint">Erst überlegen, dann aufdecken</p>'}
    </div>`;
    const flash = $('#flash');
    flash.onclick = () => { if (!vs.revealed) { vs.revealed = true; renderVSession(); } };
    const rate = (ok) => { if (vs.res[c.k]) return; vs.res[c.k] = { ok }; vUpdate(c.k, ok); save(); haptic(ok); flash.classList.add(ok ? 'swipe-r' : 'swipe-l'); setTimeout(() => { vs.i++; vs.revealed = false; renderVSession(); }, 180); };
    if (vs.revealed) { $('#no').onclick = () => rate(false); $('#yes').onclick = () => rate(true); }
    let x0 = null, dx = 0;
    flash.addEventListener('pointerdown', (e) => { x0 = e.clientX; dx = 0; }, { passive: true });
    flash.addEventListener('pointermove', (e) => { if (x0 === null) return; dx = e.clientX - x0; if (Math.abs(dx) > 8) flash.style.transform = `translateX(${dx * 0.6}px) rotate(${dx / 40}deg)`; }, { passive: true });
    const end = () => { if (x0 === null) return; flash.style.transform = ''; const d = dx; x0 = null; if (vs.revealed && d < -70) rate(false); else if (vs.revealed && d > 70) rate(true); };
    flash.addEventListener('pointerup', end); flash.addEventListener('pointercancel', end);
  }
  $('#qclose').onclick = () => { if (answered === 0) { vs = null; go('#/vocab'); } else if (confirm('Runde beenden und auswerten?')) finishVocab(); };
}
function finishVocab() {
  const items = vs.items.filter((k) => vs.res[k]);
  const ok = items.filter((k) => vs.res[k].ok).length;
  S.sessions.unshift({ sid: vs.sid, mode: 'begriffe', kind: vs.kind, deck: vs.deck, label: `${vs.deck} · ${vs.kind === 'quiz' ? 'Quiz' : 'Karten'}`, t: vs.start, dur: Date.now() - vs.start, n: items.length, ok, items: items.map((k) => ({ k, ok: vs.res[k].ok })) });
  save(); vs = null; go('#/result');
}
function renderVocabSession(s) {
  const pct = s.n ? Math.round((s.ok / s.n) * 100) : 0;
  const wrong = s.items.filter((i) => !i.ok);
  app.innerHTML = `<div class="view">${topbar(s.label)}
    <div class="card scorecard"><div class="score">${s.ok}<small>/${s.n}</small></div><span class="pill ${pct >= 75 ? 'ok' : 'warn'}">${pct} %</span><div class="muted strong small">${fmtDate(s.t)} · ${fmtTime(Math.round(s.dur / 1000))}</div></div>
    <div class="stack" style="margin-top:12px">
      ${wrong.length ? `<button class="btn primary big" id="redo">Nochmal üben (${wrong.length})</button>` : ''}
      <button class="btn" onclick="location.hash='#/vocab'"><span class="grow" style="text-align:center">Zurück zu den Begriffen</span></button>
    </div>
    <h2>Karten</h2>
    <div class="list">${s.items.map((it) => { const c = VCBY[it.k]; if (!c) return ''; return `<div class="row"><span class="badge ${it.ok ? 'ok' : 'bad'}">${it.ok ? ICON.check : ICON.xs}</span><div class="grow"><div class="t">${esc(c.term)}</div><div class="s" style="white-space:normal">${esc(c.text)}</div></div></div>`; }).join('')}</div>
  </div>`;
  if ($('#redo')) $('#redo').onclick = () => startVocab(s.kind, s.deck, shuffle(wrong.map((i) => i.k)));
}

// ---------- settings ----------
function renderSettings() {
  const s = S.settings;
  app.innerHTML = `<div class="view">${topbar('Einstellungen')}
    <h2>Fragen pro Runde</h2>
    <div class="seg" id="len">${[10, 20, 28, 50].map((n) => `<button class="${s.len === n ? 'on' : ''}" data-n="${n}">${n}</button>`).join('')}</div>
    <h2>Pools für „Lernen“</h2>
    <div class="chips" id="pools">${Object.entries(POOL_NAMES).map(([k, n]) => `<button class="chip ${s.pools[k] ? 'on' : ''}" data-p="${k}">${n} (${DATA.meta.counts[k]})</button>`).join('')}</div>
    <h2>Darstellung</h2>
    <div class="seg" id="theme">${[['auto', 'Auto'], ['light', 'Hell'], ['dark', 'Dunkel']].map(([k, n]) => `<button class="${s.theme === k ? 'on' : ''}" data-t="${k}">${n}</button>`).join('')}</div>
    <div class="chips" style="margin-top:10px"><button class="chip ${s.haptic ? 'on' : ''}" id="haptic">Vibration bei Antwort</button></div>
    <h2>Fortschritt</h2>
    <div class="stack">
      <button class="btn" id="export"><span class="ico">${ICON.download}</span><span class="grow">Sicherung exportieren<span class="sub">${S.answers.length} Antworten, ${S.sessions.length} Runden</span></span></button>
      <button class="btn" id="import"><span class="ico">${ICON.upload}</span><span class="grow">Sicherung importieren</span></button>
      <input type="file" id="file" accept="application/json" style="display:none">
      <button class="btn" id="reset"><span class="ico">${ICON.trash}</span><span class="grow">Fortschritt löschen</span></button>
      <button class="btn" onclick="location.hash='#/about'"><span class="ico">${ICON.info}</span><span class="grow">Quellen & Hinweise</span></button>
      <button class="btn" id="lock"><span class="ico">${ICON.lock}</span><span class="grow">Abmelden (Code erneut nötig)</span></button>
    </div>
    <p class="hint" style="margin-top:16px">iPhone: Teilen ▸ „Zum Home-Bildschirm“ – dann läuft die App wie eine echte App, auch offline.</p>
  </div>`;
  $('#len').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; s.len = +b.dataset.n; save(); renderSettings(); };
  $('#pools').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; s.pools[b.dataset.p] = !s.pools[b.dataset.p]; if (!Object.values(s.pools).some(Boolean)) s.pools.official = true; save(); renderSettings(); };
  $('#theme').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; s.theme = b.dataset.t; save(); applyTheme(); renderSettings(); };
  $('#haptic').onclick = () => { s.haptic = !s.haptic; save(); renderSettings(); };
  $('#export').onclick = () => { const blob = new Blob([JSON.stringify(S)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `hpp-fortschritt-${new Date().toISOString().slice(0, 10)}.json`; a.click(); };
  $('#import').onclick = () => $('#file').click();
  $('#file').onchange = (e) => { const f = e.target.files[0]; if (!f) return; f.text().then((t) => { const d = JSON.parse(t); if (!d.answers) throw 0; S = withDefaults(d); save(); toast('Importiert'); renderSettings(); }).catch(() => toast('Datei ungültig')); };
  $('#reset').onclick = () => { if (confirm('Wirklich allen Fortschritt löschen?')) { S = withDefaults({}); save(); toast('Gelöscht'); go('#/home'); } };
  $('#lock').onclick = () => { localStorage.removeItem(LS_KEY); location.hash = ''; location.reload(); };
}
function renderAbout() {
  app.innerHTML = `<div class="view">${topbar('Quellen & Hinweise')}
    <div class="card small" style="user-select:text;-webkit-user-select:text">
      <p><b>Fragen</b> sind wortgleich aus den PDFs der schriftlichen Heilpraktikerprüfungen (Psychotherapie) März 2018 bis März 2026 übernommen, dazu die Prüfungen des Gesundheitsamts Nordfriesland (Husum) 2018–2025 und kommentierte Übungsfragen der Heilpraktikerschule Likamundi.</p>
      <p><b>Lösungen</b> stammen nicht von den Behörden, sondern von Schulen (Institut Ehlert, heilpraktiker-akademie.de, ON, Margit Allmeroth, Likamundi) und sind „ohne Gewähr“. Wo sich die Schlüssel widersprechen, zeigt die App eine Warnung mit allen Lesarten.</p>
      <p><b>Erklärungen</b> gibt es nur, wo eine Quelle vorliegt (Likamundi-Kommentare). Nichts in dieser App wurde frei formuliert.</p>
      <p><b>Themen</b> sind automatisch per Stichwort zugeordnet und können daneben liegen.</p>
      <p><b>Wertung</b>: 1 Punkt pro vollständig richtig beantworteter Frage, 21 von 28 zum Bestehen.</p>
      <p><b>Speicherung</b>: Dein Fortschritt liegt nur auf diesem Gerät (Browser-Speicher). Sicherung über Einstellungen ▸ Exportieren.</p>
      <p class="muted">Datenstand: ${esc(DATA.meta.built)}</p>
    </div></div>`;
}

// ---------- confetti ----------
function confetti(n) {
  const c = $('#confetti'), ctx = c.getContext('2d'); c.width = innerWidth; c.height = innerHeight;
  const cols = ['#5b5bd6', '#1f9d63', '#f2b04a', '#e0474c', '#3ccf8a'];
  const ps = Array.from({ length: n }, () => ({ x: c.width / 2 + (Math.random() - .5) * 120, y: c.height * .45, vx: (Math.random() - .5) * 14, vy: -Math.random() * 14 - 4, r: Math.random() * 6 + 3, col: cols[Math.floor(Math.random() * cols.length)], a: Math.random() * Math.PI }));
  let t = 0;
  (function frame() { ctx.clearRect(0, 0, c.width, c.height); ps.forEach((p) => { p.x += p.vx; p.y += p.vy; p.vy += .45; p.a += .1; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.col; ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); ctx.restore(); }); if (++t < 90) requestAnimationFrame(frame); else ctx.clearRect(0, 0, c.width, c.height); })();
}

boot();
