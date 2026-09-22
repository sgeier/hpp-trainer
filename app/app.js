/* HPP Trainer – vanilla JS, no build step. All question content comes from data.enc (built by pipeline/build_data.py). */
'use strict';
const DATA_V = '6138b66be1';
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
  s.answers ||= []; s.srs ||= {}; s.sessions ||= []; s.flags ||= {}; s.vocab ||= {};
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
  DATA = d; Q = d.questions; QBY = {}; Q.forEach((q) => { QBY[q.id] = q; }); VOCAB = d.vocab || [];
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
  const views = { '': renderHome, home: renderHome, quiz: renderQuiz, result: renderResult, history: renderHistory, session: () => renderSession(arg), stats: renderStats, topics: renderTopics, vocab: renderVocab, settings: renderSettings, about: renderAbout, review: () => renderReview(arg), flagged: renderFlagged };
  (views[name] || renderHome)();
}
function topbar(title, right = '') { return `<div class="topbar"><button class="iconbtn" data-back aria-label="Zurück">‹</button><div class="title">${esc(title)}</div><div>${right}</div></div>`; }
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
  const todayAns = S.answers.filter((a) => Math.floor(a.t / 86400000) === t);
  const todayOk = todayAns.filter((a) => a.ok).length;
  const streak = calcStreak();
  const mastered = Object.values(S.srs).filter((r) => r.box >= 3).length;
  app.innerHTML = `<div class="view">
    <div class="topbar"><div class="title" style="font-size:22px">HPP Trainer</div><button class="iconbtn" onclick="location.hash='#/settings'" aria-label="Einstellungen">⚙︎</button></div>
    <div class="stats-row">
      <div class="stat"><div class="v">${streak}🔥</div><div class="l">Tage in Folge</div></div>
      <div class="stat"><div class="v">${todayOk}/${todayAns.length}</div><div class="l">heute richtig</div></div>
      <div class="stat"><div class="v">${mastered}</div><div class="l">sicher (3+ richtig)</div></div>
    </div>
    <div class="stack" style="margin-top:14px">
      <button class="btn primary big" data-go="learn"><span class="ico">⚡️</span><span class="grow">Lernen<span class="sub">${due} fällig · ${fresh} neu · ${S.settings.len} Fragen pro Runde</span></span></button>
      <button class="btn big" data-go="exam"><span class="ico">🎓</span><span class="grow">Prüfung simulieren<span class="sub">28 Originalfragen, Auswertung am Ende · 21 zum Bestehen</span></span></button>
      <div class="grid2">
        <button class="btn" onclick="location.hash='#/topics'"><span class="ico">🗂</span><span class="grow">Themen</span></button>
        <button class="btn" onclick="location.hash='#/vocab'"><span class="ico">🔤</span><span class="grow">Begriffe</span></button>
        <button class="btn" data-go="husum"><span class="ico">🌊</span><span class="grow">Husum</span></button>
        <button class="btn" data-go="lika"><span class="ico">📗</span><span class="grow">Likamundi</span></button>
        <button class="btn" onclick="location.hash='#/history'"><span class="ico">🕘</span><span class="grow">Verlauf</span></button>
        <button class="btn" onclick="location.hash='#/stats'"><span class="ico">📊</span><span class="grow">Statistik</span></button>
      </div>
      ${Object.keys(S.flags).length ? `<button class="btn" onclick="location.hash='#/flagged'"><span class="ico">⭐️</span><span class="grow">Markierte Fragen<span class="sub">${Object.keys(S.flags).length}</span></span></button>` : ''}
    </div>
    <p class="hint" style="margin-top:auto;padding-top:16px">${DATA.meta.counts.official} Originalfragen 2018–2026 · ${DATA.meta.counts.husum} Husum · ${DATA.meta.counts.likamundi} Likamundi · ${DATA.meta.counts.vocab} Begriffe</p>
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
  const days = new Set(S.answers.map((a) => Math.floor(a.t / 86400000)));
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
  app.innerHTML = `<div class="view quiz">
    <div class="topbar">
      <button class="iconbtn" id="qclose" aria-label="Beenden">✕</button>
      <div class="progress"><i style="width:${(answered / n) * 100}%"></i></div>
      <div class="muted" style="min-width:64px;text-align:right"><span id="qcount">${cur.i + 1}/${n}</span>${cur.mode === 'pruefung' ? ` · <span id="timer">${fmtTime(elapsed)}</span>` : ''}</div>
      <button class="iconbtn" id="qflag" aria-label="Merken">${S.flags[q.id] ? '⭐️' : '☆'}</button>
    </div>
    <div class="qcard entering" id="qcard">${questionHTML(q)}</div>
    <div class="options" id="opts">${optionsHTML(q, done ? done.sel : cur.sel, done && cur.feedback ? q : null)}</div>
    <div id="fb">${done && cur.feedback ? feedbackHTML(q, done.sel) : ''}</div>
    ${done ? `<div class="bottombar"><button class="btn primary big" id="next">${cur.i + 1 < n ? 'Weiter →' : 'Auswertung'}</button></div>` : `<p class="hint">${q.type === 'mehrfach' ? 'Zwei Antworten antippen' : 'Antwort antippen'}</p>`}
  </div>`;
  $('#qclose').onclick = () => { if (answered === 0) { cur = null; go('#/home'); } else if (confirm('Runde beenden und auswerten?')) finishSession(); };
  $('#qflag').onclick = () => { if (S.flags[q.id]) delete S.flags[q.id]; else S.flags[q.id] = 1; save(); $('#qflag').textContent = S.flags[q.id] ? '⭐️' : '☆'; };
  app.querySelectorAll('.opt').forEach((b) => b.onclick = () => choose(q, b.dataset.k));
  if (done) $('#next').onclick = next;
  bindSwipe($('#qcard'), q);
  if (cur.mode === 'pruefung') { clearInterval(timerHandle); timerHandle = setInterval(() => { const el = $('#timer'); if (!el || !cur || cur.sid !== sid) { clearInterval(timerHandle); return; } el.textContent = fmtTime(Math.floor((Date.now() - cur.start) / 1000)); }, 1000); }
}
function fmtTime(s) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
function questionHTML(q) {
  const meta = [`<span class="pill">${esc(q.topic)}</span>`, `<span class="pill gray">${esc(q.exam)}${q.pool === 'official' ? ' · Nr. ' + q.nr : ''}</span>`, `<span class="pill gray">${TYPE_NAMES[q.type]}</span>`];
  const stmts = q.statements && q.statements.length ? `<ol class="statements">${q.statements.map((s, i) => `<li><b>${i + 1}.</b><span>${esc(s)}</span></li>`).join('')}</ol>` : '';
  const instr = q.instruction ? `<div class="instr">${esc(q.instruction)}</div>` : (q.type === 'mehrfach' ? '<div class="instr">Wählen Sie zwei Antworten!</div>' : '');
  const numbered = q.numbered_options ? '<div class="muted small" style="margin-top:6px">Im Original waren die Antworten 1–5 nummeriert.</div>' : '';
  return `<div class="qmeta">${meta.join('')}</div><div class="stem${q.stem.length > 420 ? ' small' : ''}">${esc(q.stem)}</div>${stmts}${instr}${numbered}`;
}
function optionsHTML(q, sel, reveal) {
  return Object.entries(q.options).map(([k, v]) => {
    let cls = 'opt'; const chosen = sel.includes(k);
    if (reveal) { const right = q.answer.includes(k); if (right) cls += ' correct'; else if (chosen) cls += ' wrong'; else cls += ' dim'; }
    else if (chosen) cls += ' selected';
    return `<button class="${cls}" data-k="${k}" ${reveal ? 'disabled' : ''}><span class="letter">${k}</span><span>${esc(v)}</span></button>`;
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
  $('#fb').innerHTML = feedbackHTML(q, sel);
  const hint = $('.quiz .hint'); if (hint) hint.remove();
  $('#fb').insertAdjacentHTML('afterend', `<div class="bottombar"><button class="btn primary big" id="next">${cur.i + 1 < cur.ids.length ? 'Weiter →' : 'Auswertung'}</button></div>`);
  $('#next').onclick = next;
  setTimeout(() => $('#fb')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  if (ok) { const streak = recentStreak(); if (streak && streak % 5 === 0) { confetti(60); toast(`${streak} in Folge!`); } }
}
function recentStreak() { let n = 0; for (let i = S.answers.length - 1; i >= 0 && S.answers[i].ok; i--) n++; return n; }
function feedbackHTML(q, sel) {
  const ok = isCorrect(q, sel);
  const heads = ok ? ['Richtig!', 'Sauber!', 'Genau so.', 'Sitzt.', 'Stark!'] : ['Leider nein.', 'Knapp daneben.', 'Merken!', 'Nochmal anschauen.'];
  const head = heads[Math.floor(Math.random() * heads.length)];
  return `<div class="feedback ${ok ? 'ok' : 'bad'}"><div class="head">${head} <span class="muted" style="font-weight:600">Lösung: ${q.answer.join(' + ')}</span></div>${explHTML(q)}</div>`;
}
function explHTML(q) {
  let h = '';
  if (q.disputed) h += `<div class="warnbox">⚠️ Die Lösungsschlüssel der Schulen sind hier uneinheitlich: ${esc(Object.entries(q.keys).map(([s, a]) => `${s}: ${a}`).join(' · '))}. Im Zweifel beide Lesarten nachlesen.</div>`;
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
  const pct = s.n ? Math.round((s.ok / s.n) * 100) : 0;
  const exam = s.mode === 'pruefung';
  const passed = exam && s.n === (DATA.meta.exam_size || 28) && s.ok >= (DATA.meta.pass_mark || 21);
  const byTopic = {};
  s.items.forEach((it) => { const q = QBY[it.q]; if (!q) return; const b = byTopic[q.topic] ||= { n: 0, ok: 0 }; b.n++; if (it.ok) b.ok++; });
  app.innerHTML = `<div class="view">${topbar(s.label || 'Runde')}
    <div class="card" style="text-align:center">
      <div class="score">${s.ok}<span class="muted" style="font-size:26px">/${s.n}</span></div>
      <p>${exam ? (s.n === (DATA.meta.exam_size || 28) ? (passed ? '<span class="pill ok">Bestanden 🎉</span>' : '<span class="pill bad">Nicht bestanden – 21 nötig</span>') : '<span class="pill gray">Abgebrochen</span>') : `<span class="pill ${pct >= 75 ? 'ok' : 'warn'}">${pct} %</span>`} <span class="muted">· ${fmtDate(s.t)} · ${fmtTime(Math.round(s.dur / 1000))}</span></p>
    </div>
    <div class="stack" style="margin-top:12px">
      ${s.items.some((i) => !i.ok) ? `<button class="btn primary" id="redo">Fehler nochmal üben (${s.items.filter((i) => !i.ok).length})</button>` : ''}
      <button class="btn" onclick="location.hash='#/home'"><span class="grow">Zurück zur Übersicht</span></button>
    </div>
    <h2>Nach Thema</h2>
    <div class="stack">${Object.entries(byTopic).sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n).map(([t, b]) => `<div><div style="display:flex;justify-content:space-between" class="small"><span>${esc(t)}</span><span class="muted">${b.ok}/${b.n}</span></div><div class="bar"><i style="width:${(b.ok / b.n) * 100}%"></i></div></div>`).join('')}</div>
    <h2>Fragen</h2>
    <div class="list">${s.items.map((it, i) => { const q = QBY[it.q]; if (!q) return ''; return `<div class="row ${it.ok ? 'right' : 'wrong'}" onclick="location.hash='#/review/${q.id}'"><div class="grow"><div class="t">${i + 1}. ${esc(q.stem)}</div><div class="s">Deine Antwort: ${it.a.join('+')} · Lösung: ${q.answer.join('+')}</div></div><span>${it.ok ? '✅' : '❌'}</span></div>`; }).join('')}</div>
  </div>`;
  if ($('#redo')) $('#redo').onclick = () => startSession({ mode: 'lernen', ids: shuffle(s.items.filter((i) => !i.ok).map((i) => i.q)), feedback: true, label: 'Fehler wiederholen' });
  if (fresh && passed) confetti(160);
}
function renderReview(id) {
  const q = QBY[id]; if (!q) { go('#/home'); return; }
  const hist = S.answers.filter((a) => a.q === id).slice(-5).reverse();
  const last = hist[0];
  app.innerHTML = `<div class="view quiz">${topbar('Frage ansehen', `<button class="iconbtn" id="qflag">${S.flags[q.id] ? '⭐️' : '☆'}</button>`)}
    <div class="qcard">${questionHTML(q)}</div>
    <div class="options">${optionsHTML(q, last ? last.a : [], q)}</div>
    <div class="feedback neutral"><div class="head">Lösung: ${q.answer.join(' + ')}</div>${explHTML(q)}</div>
    ${hist.length ? `<div class="card"><b>Deine Versuche</b>${hist.map((a) => `<div class="small muted">${fmtDate(a.t)} · ${a.a.join('+')} ${a.ok ? '✅' : '❌'}</div>`).join('')}</div>` : ''}
    <div class="bottombar"><button class="btn primary" data-back>Zurück</button></div>
  </div>`;
  $('#qflag').onclick = () => { if (S.flags[q.id]) delete S.flags[q.id]; else S.flags[q.id] = 1; save(); $('#qflag').textContent = S.flags[q.id] ? '⭐️' : '☆'; };
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
    <div class="stats-row"><div class="stat"><div class="v">${n}</div><div class="l">Antworten</div></div><div class="stat"><div class="v">${n ? Math.round((ok / n) * 100) : 0} %</div><div class="l">richtig gesamt</div></div><div class="stat"><div class="v">${week}</div><div class="l">letzte 7 Tage</div></div></div>
    <h2>Nach Thema</h2>
    <div class="stack">${Object.entries(topics).sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n).map(([t, b]) => `<div onclick="startTopic('${esc(t).replace(/'/g, '&#39;')}')"><div style="display:flex;justify-content:space-between" class="small"><span>${esc(t)}</span><span class="muted">${Math.round((b.ok / b.n) * 100)} % · ${b.n}</span></div><div class="bar"><i style="width:${(b.ok / b.n) * 100}%;background:${b.ok / b.n >= 0.75 ? 'var(--ok)' : 'var(--warn)'}"></i></div></div>`).join('') || '<p class="muted">Noch keine Daten.</p>'}</div>
    <h2>Lernstufen</h2>
    <div class="card small">${['neu/falsch', '1× richtig', '2× richtig', '3× richtig', '4× richtig', 'sicher'].map((l, i) => `<div style="display:flex;justify-content:space-between"><span>${l}</span><b>${boxes[i]}</b></div>`).join('')}<div class="muted" style="margin-top:6px">Falsche Fragen kommen sofort wieder, richtige nach 1, 3, 7, 14 und 30 Tagen.</div></div>
    <h2>Prüfungen abgedeckt</h2>
    <div class="stack">${Object.entries(exams).map(([e, v]) => `<div><div style="display:flex;justify-content:space-between" class="small"><span>${esc(e)}</span><span class="muted">${v.seen}/${v.n} gesehen · ${v.ok} richtig</span></div><div class="bar"><i style="width:${(v.seen / v.n) * 100}%"></i></div></div>`).join('')}</div>
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
    ${ids.length ? `<button class="btn primary" id="go">Markierte üben (${ids.length})</button><div class="list" style="margin-top:10px">${ids.map((id) => `<div class="row" onclick="location.hash='#/review/${id}'"><div class="grow"><div class="t">${esc(QBY[id].stem)}</div><div class="s">${esc(QBY[id].exam)}</div></div></div>`).join('')}</div>` : '<p class="muted">Noch nichts markiert. Tippe ☆ bei einer Frage.</p>'}</div>`;
  if ($('#go')) $('#go').onclick = () => startSession({ mode: 'lernen', ids: shuffle(ids), feedback: true, label: 'Markierte' });
}

// ---------- vocab ----------
let vq = null;
function renderVocab() {
  if (!VOCAB.length) { app.innerHTML = `<div class="view">${topbar('Begriffe')}<p class="muted">Keine Begriffe geladen.</p></div>`; return; }
  const stats = S.vocab;
  const pick = () => { const cands = VOCAB.map((v, i) => ({ v, i, w: (stats[v.term]?.wrong || 0) * 3 + (stats[v.term] ? 0 : 2) + Math.random() })); cands.sort((a, b) => b.w - a.w); return cands[0].v; };
  const v = vq || pick(); vq = v;
  const opts = shuffle([{ t: v.correct, ok: true }, { t: v.distractor, ok: false }]);
  const seen = Object.keys(stats).length, right = Object.values(stats).filter((s) => s.ok).length;
  app.innerHTML = `<div class="view quiz">${topbar('Begriffe', `<span class="muted small">${right}/${seen}</span>`)}
    <div class="vocab-card"><div class="muted small">${esc(v.category || '')}</div><div class="term">${esc(v.term)}</div>${v.mnemonic ? `<div class="muted small" style="margin-top:8px">💡 ${esc(v.mnemonic)}</div>` : ''}</div>
    <div class="options">${opts.map((o, i) => `<button class="opt" data-ok="${o.ok}" style="min-height:64px"><span class="letter">${'AB'[i]}</span><span>${esc(o.t)}</span></button>`).join('')}</div>
    <div id="fb"></div>
    <p class="hint">Antippen – geht automatisch weiter</p>
  </div>`;
  app.querySelectorAll('.opt').forEach((b) => b.onclick = () => {
    const ok = b.dataset.ok === 'true';
    app.querySelectorAll('.opt').forEach((x) => { x.disabled = true; x.classList.add(x.dataset.ok === 'true' ? 'correct' : (x === b ? 'wrong' : 'dim')); });
    const st = stats[v.term] ||= { seen: 0, wrong: 0, ok: false }; st.seen++; if (ok) st.ok = true; else st.wrong++; save(); haptic(ok);
    if (v.explanation) $('#fb').innerHTML = `<div class="feedback ${ok ? 'ok' : 'bad'}"><div class="small">${esc(v.explanation)}</div></div>`;
    vq = null; setTimeout(renderVocab, ok ? 700 : 1600);
  });
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
      <button class="btn" id="export"><span class="ico">⬇️</span><span class="grow">Sicherung exportieren<span class="sub">${S.answers.length} Antworten, ${S.sessions.length} Runden</span></span></button>
      <button class="btn" id="import"><span class="ico">⬆️</span><span class="grow">Sicherung importieren</span></button>
      <input type="file" id="file" accept="application/json" style="display:none">
      <button class="btn" id="reset" style="color:var(--bad)"><span class="ico">🗑</span><span class="grow">Fortschritt löschen</span></button>
      <button class="btn" onclick="location.hash='#/about'"><span class="ico">ℹ️</span><span class="grow">Quellen & Hinweise</span></button>
      <button class="btn" id="lock"><span class="ico">🔒</span><span class="grow">Abmelden (Code erneut nötig)</span></button>
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
