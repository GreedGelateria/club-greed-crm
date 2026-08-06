import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, doc, addDoc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, orderBy, limit, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBwAZb_A3IjPv7iL0cLhVnWO-Cuw_DD5g4",
  authDomain: "club-greed.firebaseapp.com",
  projectId: "club-greed",
  storageBucket: "club-greed.firebasestorage.app",
  messagingSenderId: "704669833762",
  appId: "1:704669833762:web:917f4c7b104bc8ad39087b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// -- UTILS --
window.db = db;
window.collection = collection;
window.doc = doc;
window.setDoc = setDoc;
window.addDoc = addDoc;
window.getDoc = getDoc;
window.getDocs = getDocs;
window.updateDoc = updateDoc;
window.query = query;
window.orderBy = orderBy;
window.limit = limit;
window.where = where;
window.serverTimestamp = serverTimestamp;

window.deleteDoc = deleteDoc;
window.allClienti = [];
window.currentEditId = null;
window.currentCassaCliente = null;

function getLivello(punti) {
  if (punti >= 500) return { nome: 'Custode del Gusto', moltiplicatore: 4, badge: 'badge-custode', next: null, nextPunti: null };
  if (punti >= 200) return { nome: 'Ambasciatore', moltiplicatore: 3, badge: 'badge-ambasciatore', next: 'Custode del Gusto', nextPunti: 500 - punti };
  return { nome: 'Esploratore', moltiplicatore: 2, badge: 'badge-esploratore', next: 'Ambasciatore', nextPunti: 200 - punti };
}
// Livello sempre da puntiStorici (mai scende)
function getLivelloCliente(c) {
  return getLivello(c.puntiStorici || c.punti || 0);
}
window.getLivelloCliente = getLivelloCliente;

window.filtraClientiPerLivello = function(livello) {
  showView('clienti');
  setTimeout(() => {
    const tutti = window.allClienti || [];
    let filtrati;
    if (livello === 'custode') filtrati = tutti.filter(c => (c.puntiStorici||c.punti||0) >= 500);
    else if (livello === 'ambasciatore') filtrati = tutti.filter(c => { const ps = c.puntiStorici||c.punti||0; return ps >= 200 && ps < 500; });
    else filtrati = tutti.filter(c => (c.puntiStorici||c.punti||0) < 200);
    
    // Renderizza i risultati nella vista clienti
    renderClienti(filtrati);
  }, 200);
};


window.quickSearch = function(q) {
  const drop = document.getElementById('quickSearchDrop');
  if (!q || q.length < 2) { drop.innerHTML = ''; drop.style.display = 'none'; return; }
  drop.style.display = 'block';
  const qLow = q.toLowerCase();
  const results = (window.allClienti || []).filter(c => {
    const nome = ((c.nome||'') + ' ' + (c.cognome||'')).toLowerCase();
    const tel = (c.telefono||'').replace(/\s/g,'');
    const email = (c.email||'').toLowerCase();
    return nome.includes(qLow) || tel.includes(q) || email.includes(qLow);
  }).slice(0, 8);

  if (!results.length) {
    drop.innerHTML = '<div style="padding:12px 16px;color:rgba(255,255,255,.5);font-size:13px">Nessun cliente trovato</div>';
    return;
  }

  drop.innerHTML = results.map(c => {
    const lv = getLivelloCliente(c);
    const nome = (c.nome||'') + ' ' + (c.cognome||'');
    const badgeColor = lv.badge === 'badge-custode' ? '#d4a800' : lv.badge === 'badge-ambasciatore' ? '#6fcf97' : 'rgba(255,255,255,.4)';
    return `<div onclick="quickSearchApri('${c.id}')" style="padding:10px 16px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;gap:10px" onmouseover="this.style.background='rgba(255,255,255,.08)'" onmouseout="this.style.background=''">
      <div style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0">${(c.nome||'?')[0].toUpperCase()}</div>
      <div style="flex:1;min-width:0">
        <div style="color:#fff;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${nome.trim()}</div>
        <div style="color:rgba(255,255,255,.5);font-size:11px">${c.telefono||''} · <span style="color:${badgeColor}">${lv.nome}</span> · ${c.puntiStorici||c.punti||0} pt storici</div>
      </div>
    </div>`;
  }).join('');
};

window.quickSearchApri = function(id) {
  document.getElementById('quickSearchInput').value = '';
  document.getElementById('quickSearchDrop').style.display = 'none';
  const cliente = (window.allClienti||[]).find(c => c.id === id);
  if (!cliente) return;
  // Apre la scheda cliente in un overlay senza cambiare pagina
  const lv = getLivelloCliente(cliente);
  const colLv = lv.badge === 'badge-custode' ? '#d4a800' : lv.badge === 'badge-ambasciatore' ? '#6fcf97' : '#888';
  const overlay = document.createElement('div');
  overlay.id = 'quickClienteOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;align-items:center;justify-content:center';
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:28px;width:420px;max-width:95vw;box-shadow:0 20px 60px rgba(0,0,0,.3)">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
        <div style="width:48px;height:48px;border-radius:50%;background:#1a2e1c;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:#fff">${(cliente.nome||'?')[0].toUpperCase()}</div>
        <div>
          <div style="font-size:18px;font-weight:700;color:#1a2e1c">${(cliente.nome||'')} ${(cliente.cognome||'')}</div>
          <div style="font-size:13px;color:#666">${cliente.email||''} · ${cliente.telefono||''}</div>
        </div>
        <button onclick="document.getElementById('quickClienteOverlay').remove()" style="margin-left:auto;background:none;border:none;font-size:20px;cursor:pointer;color:#999">✕</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px">
        <div style="background:#f8f6f0;border-radius:10px;padding:12px;text-align:center">
          <div style="font-size:10px;color:#999;margin-bottom:4px">PUNTI SPENDIBILI</div>
          <div style="font-size:28px;font-weight:700;color:#1a2e1c">${cliente.punti||0}</div>
        </div>
        <div style="background:#f8f6f0;border-radius:10px;padding:12px;text-align:center">
          <div style="font-size:10px;color:#999;margin-bottom:4px">PUNTI STORICI</div>
          <div style="font-size:28px;font-weight:700;color:#d4a800">${cliente.puntiStorici||cliente.punti||0}</div>
        </div>
        <div style="background:#f8f6f0;border-radius:10px;padding:12px;text-align:center">
          <div style="font-size:10px;color:#999;margin-bottom:4px">LIVELLO</div>
          <div style="font-size:13px;font-weight:700;color:${colLv}">${lv.nome}</div>
        </div>
      </div>
      <div style="display:flex;gap:8px">
        <button onclick="document.getElementById('quickClienteOverlay').remove();showView('cassa');setTimeout(()=>apriClienteCassa(window.allClienti.find(c=>c.id==='${cliente.id}')),300)" 
          style="flex:1;background:#1a2e1c;color:#fff;border:none;border-radius:8px;padding:10px;cursor:pointer;font-size:13px;font-weight:600">💳 Apri in Cassa</button>
        <button onclick="document.getElementById('quickClienteOverlay').remove();showView('clienti');setTimeout(()=>apriSchedaCliente('${cliente.id}'),300)"
          style="flex:1;background:#f0ece0;color:#1a2e1c;border:none;border-radius:8px;padding:10px;cursor:pointer;font-size:13px;font-weight:600">👤 Scheda completa</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if(e.target===overlay) overlay.remove(); });
};

document.addEventListener('click', function(e) {
  if (!e.target.closest('#quickSearchInput') && !e.target.closest('#quickSearchDrop')) {
    const drop = document.getElementById('quickSearchDrop');
    if (drop) drop.style.display = 'none';
  }
});



function formatDate(ts) {
  if (!ts) return '-';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit', year:'numeric' });
}

function puntiBar(punti) {
  const max = punti >= 500 ? 650 : punti >= 200 ? 500 : 200;
  const pct = Math.min(100, Math.round((punti / max) * 100));
  return `<div class="punti-bar-wrap"><div class="punti-bar"><div class="punti-bar-fill" style="width:${pct}%"></div></div><span class="punti-num">${punti}</span></div>`;
}

// -- TOAST --
window.showToast = function(msg, type='') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => t.className = 'toast', 3000);
}

// -- VIEWS --
window.showView = function(name) {
  if (name === 'giftcard') { setTimeout(function(){ if(typeof loadGiftCards==='function') loadGiftCards(); }, 200); }
  if (name === 'ordini') { setTimeout(function(){ if(typeof loadOrdini==='function') loadOrdini(); }, 200); }
  if (name === 'campagne') { setTimeout(function(){ if(typeof aggiornaCampCount==='function') aggiornaCampCount(); if(typeof loadOraFurba==='function') loadOraFurba(); }, 200); }
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => {
    if (b.textContent.toLowerCase().includes(name === 'checkin' ? 'check' : name === 'iscrizione' ? 'form' : name)) b.classList.add('active');
  });
  if (name === 'dashboard') loadDashboard();
  if (name === 'clienti') loadClienti();
  if (name === 'checkin') loadCheckin();
  if (name === 'cassa') loadClienti();
}

// -- LOAD DASHBOARD --
function getRFM(c) {
  const ora = Date.now();
  const ultimo = c.ultimoAcquisto?.seconds ? c.ultimoAcquisto.seconds * 1000 : null;
  const freq = c.numeroAcquisti || 0;
  const spesa = c.totaleSpeso || 0;
  // Mai attivato: iscritto ma senza alcun acquisto tracciato — NON è un cliente perso
  if (freq === 0 && !ultimo) return { label: 'Mai attivato', color: '#546e7a', bg: '#eceff1', icon: '🆕' };
  const giorniInattivo = ultimo ? Math.floor((ora - ultimo) / 86400000) : 999;
  if (giorniInattivo <= 30 && freq >= 3 && spesa >= 30) return { label: 'Champion', color: '#2d6a2d', bg: '#e8f5e9', icon: '🏆' };
  if (giorniInattivo <= 45 && freq >= 2) return { label: 'Fedele', color: '#1565c0', bg: '#e3f2fd', icon: '⭐' };
  if (giorniInattivo <= 30 && freq === 1) return { label: 'Nuovo', color: '#6a1e6a', bg: '#f3e5f5', icon: '🌱' };
  if (giorniInattivo > 30 && giorniInattivo <= 60 && freq >= 2) return { label: 'A Rischio', color: '#e65100', bg: '#fff3e0', icon: '⚠️' };
  if (giorniInattivo > 60) return { label: 'Perso', color: '#b71c1c', bg: '#ffebee', icon: '💤' };
  return { label: 'Potenziale', color: '#827717', bg: '#f9fbe7', icon: '💡' };
}

async function loadDashboard() {
  try {
    const snap = await getDocs(collection(db, 'clienti'));
    const clienti = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    window.allClienti = clienti;

    const totali = clienti.length;
    const esploratori = clienti.filter(c => (c.puntiStorici||c.punti||0) < 200).length;
    const ambas = clienti.filter(c => (c.puntiStorici||c.punti||0) >= 200 && (c.puntiStorici||c.punti||0) < 500).length;
    const custodi = clienti.filter(c => (c.puntiStorici||c.punti||0) >= 500).length;
    const puntiTot = clienti.reduce((s, c) => s + (c.puntiStorici||c.punti||0), 0);

    document.getElementById('statTotali').textContent = totali;
    document.getElementById('statEsploratori').textContent = esploratori;
    document.getElementById('statAmbasciatori').textContent = ambas;
    document.getElementById('statCustodi').textContent = custodi;
    document.getElementById('statPunti').textContent = puntiTot;

    // ── RFM Segmentation ──
    const segmenti = { Champion:[], Fedele:[], Nuovo:[], 'A Rischio':[], Perso:[], Potenziale:[], 'Mai attivato':[] };
    clienti.forEach(c => { const r = getRFM(c); if(segmenti[r.label]) segmenti[r.label].push(c); });

    const rfmEl = document.getElementById('rfmSection');
    if (rfmEl) {
      rfmEl.innerHTML = Object.entries(segmenti).map(([label, lista]) => {
        const info = { Champion:{color:'#2d6a2d',bg:'#e8f5e9',icon:'🏆'}, Fedele:{color:'#1565c0',bg:'#e3f2fd',icon:'⭐'}, Nuovo:{color:'#6a1e6a',bg:'#f3e5f5',icon:'🌱'}, 'A Rischio':{color:'#e65100',bg:'#fff3e0',icon:'⚠️'}, Perso:{color:'#b71c1c',bg:'#ffebee',icon:'💤'}, Potenziale:{color:'#827717',bg:'#f9fbe7',icon:'💡'}, 'Mai attivato':{color:'#546e7a',bg:'#eceff1',icon:'🆕'} }[label];
        return `<div style="background:${info.bg};border-radius:12px;padding:16px 20px;cursor:pointer;border:1.5px solid ${info.color}22" onclick="filtraRFM('${label}')">
          <div style="font-size:22px;margin-bottom:4px">${info.icon}</div>
          <div style="font-weight:700;color:${info.color};font-size:15px">${label}</div>
          <div style="font-size:28px;font-weight:800;color:${info.color}">${lista.length}</div>
          <div style="font-size:11px;color:${info.color};opacity:0.8">clienti</div>
        </div>`;
      }).join('');
    }

    // ── Tabella ultimi iscritti ──
    const recenti = [...clienti].sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0)).slice(0,5);
    const tbody = document.getElementById('dashboardTable');
    if (!recenti.length) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty"><div class="empty-icon"></div><div class="empty-text">Nessun cliente ancora</div></div></td></tr>`;
      return;
    }
    tbody.innerHTML = recenti.map(c => {
      const lv = getLivelloCliente(c);
      const rfm = getRFM(c);
      return `<tr>
        <td><strong>${c.nome} ${c.cognome}</strong><br><span style="font-size:12px;color:var(--text-muted)">${c.email}</span></td>
        <td><span class="badge ${lv.badge}">${lv.nome}</span></td>
        <td>${puntiBar(c.punti||0)}</td>
        <td><span style="background:${rfm.bg};color:${rfm.color};padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600">${rfm.icon} ${rfm.label}</span></td>
        <td style="font-size:13px;color:var(--text-muted)">${formatDate(c.createdAt)}</td>
      </tr>`;
    }).join('');
  } catch(e) {
    console.error(e);
    showToast('Errore caricamento dati', 'error');
  }
}

window.filtraRFM = function(label) {
  const filtrati = window.allClienti.filter(c => getRFM(c).label === label);
  showView('clienti');
  setTimeout(() => renderClienti(filtrati), 200);
  showToast(`${filtrati.length} clienti segmento "${label}"`);
}


window.loadCodiciPromo = async function() {
  const tbody = document.getElementById('codiciPromoTable');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="5"><div class="loading"><div class="spinner"></div> Caricamento...</div></td></tr>`;
  try {
    const snap = await getDocs(query(collection(db, 'codiciPromo'), orderBy('createdAt', 'desc'), limit(100)));
    const totali = snap.size;
    const usati = snap.docs.filter(d => d.data().usato).length;
    const tasso = totali > 0 ? ((usati/totali)*100).toFixed(1) : '0.0';

    document.getElementById('statCodiciTotali').textContent = totali;
    document.getElementById('statCodiciUsati').textContent = usati;
    document.getElementById('statCodiciTasso').textContent = tasso + '%';

    if (snap.empty) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:20px">Nessun codice promo inviato</td></tr>`;
      return;
    }

    const ora = new Date();
    tbody.innerHTML = snap.docs.map(d => {
      const p = d.data();
      const scadenza = p.scadenzaAt instanceof Object && p.scadenzaAt.toDate
        ? p.scadenzaAt.toDate() : (p.scadenzaAt ? new Date(p.scadenzaAt) : null);
      const scaduto = scadenza && scadenza < ora;
      const scadenzaStr = scadenza ? scadenza.toLocaleString('it-IT', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) : '—';

      let statoHtml;
      if (p.usato) statoHtml = `<span style="color:var(--success);font-weight:700">✅ Usato</span>`;
      else if (scaduto) statoHtml = `<span style="color:var(--text-muted)">⏱ Scaduto</span>`;
      else statoHtml = `<span style="color:var(--yellow-dark);font-weight:600">⏳ In attesa</span>`;

      return `<tr>
        <td><strong>${p.nomeCliente||'—'}</strong><br><span style="font-size:11px;color:var(--text-muted)">${p.telefono||''}</span></td>
        <td><code style="background:var(--cream);padding:3px 8px;border-radius:6px;font-size:12px;letter-spacing:1px">${p.codice||'—'}</code></td>
        <td style="font-weight:700;color:var(--green)">${p.sconto||30}%</td>
        <td style="font-size:12px;color:var(--text-muted)">${scadenzaStr}</td>
        <td>${statoHtml}</td>
      </tr>`;
    }).join('');
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:var(--red);text-align:center">Errore: ${e.message}</td></tr>`;
    console.error(e);
  }
};

window.loadConversioni = async function() {
  const tbody = document.getElementById('conversioniTable');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="5"><div class="loading"><div class="spinner"></div> Caricamento...</div></td></tr>`;
  try {
    const trenta = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const snap = await getDocs(query(collection(db, 'campagne'), where('ultimoInvio', '>=', trenta)));
    if (snap.empty) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:20px">Nessuna campagna negli ultimi 30 giorni</td></tr>`;
      return;
    }
    const righe = snap.docs.map(d => {
      const c = d.data();
      const inviati = c.totaleInvii || 0;
      const conv = c.totaleConversioni || 0;
      const tasso = inviati > 0 ? ((conv/inviati)*100).toFixed(1) : '0.0';
      const colore = parseFloat(tasso) >= 15 ? '#2d6a2d' : parseFloat(tasso) >= 5 ? '#e65100' : '#b71c1c';
      const data = c.ultimoInvio?.toDate ? c.ultimoInvio.toDate().toLocaleDateString('it-IT') : '—';
      return `<tr>
        <td><strong>${c.template||d.id}</strong></td>
        <td style="font-size:13px;color:var(--text-muted)">${data}</td>
        <td>${inviati}</td>
        <td>${conv}</td>
        <td><span style="font-weight:700;color:${colore}">${tasso}%</span></td>
      </tr>`;
    }).join('');
    tbody.innerHTML = righe;
  } catch(e) { tbody.innerHTML = `<tr><td colspan="5" style="color:var(--red);text-align:center">Errore caricamento</td></tr>`; console.error(e); }
}

// -- LOAD CLIENTI --
async function loadClienti() {
  try {
    const snap = await getDocs(collection(db, 'clienti'));
    window.allClienti = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderClienti(window.allClienti);
  } catch(e) {
    showToast('Errore caricamento clienti', 'error');
  }
}

function renderClienti(clienti) {
  const tbody = document.getElementById('clientiTable');
  if (!clienti.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty"><div class="empty-icon"></div><div class="empty-text">Nessun cliente trovato</div></div></td></tr>`;
    return;
  }
  tbody.innerHTML = clienti.map(c => {
    const lv = getLivelloCliente(c);
    return `<tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:34px;height:34px;border-radius:50%;background:var(--green);color:var(--yellow);font-family:'Cormorant Garamond',serif;font-size:15px;display:flex;align-items:center;justify-content:center;font-weight:600;flex-shrink:0">${(c.nome||'?')[0].toUpperCase()}</div>
          <div><strong>${c.nome} ${c.cognome}</strong></div>
        </div>
      </td>
      <td><span style="font-size:13px">${c.email}</span><br><span style="font-size:12px;color:var(--text-muted)">${c.telefono||''}</span></td>
      <td><span class="badge ${lv.badge}">${lv.nome}</span></td>
      <td>${puntiBar(c.punti||0)}</td>
      <td style="font-size:12px;color:var(--text-muted)">${formatDate(c.createdAt)}</td>
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn btn-secondary btn-sm" onclick="openPunti('${c.id}')">+ Punti</button>
          <button class="btn btn-ghost btn-sm" onclick="openQrCliente('${c.id}')">QR</button>
          <button class="btn btn-ghost btn-sm" onclick="openStorico('${c.id}')">📋</button>
          <button class="btn btn-ghost btn-sm" onclick="openModifica('${c.id}')">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="window.eliminaCliente('${c.id}','${c.nome} ${c.cognome}')" title="Elimina cliente">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// -- ELIMINA CLIENTE --
window.eliminaCliente = async function(id, nomeCompleto) {
  const conferma = confirm(`Eliminare definitivamente "${nomeCompleto}" dal Club Greed?\n\nQuesta operazione non può essere annullata.`);
  if (!conferma) return;
  try {
    await deleteDoc(doc(db, 'clienti', id));
    window.allClienti = window.allClienti.filter(c => c.id !== id);
    renderClienti(window.allClienti);
    // aggiorna stats dashboard se visibile
    const dash = document.getElementById('view-dashboard');
    if (dash && dash.classList.contains('active')) loadDashboard();
    // aggiorna contatori live
    const totali = window.allClienti.length;
    const esploratori = window.allClienti.filter(c => (c.punti||0) < 200).length;
    const ambas = window.allClienti.filter(c => (c.punti||0) >= 200 && (c.punti||0) < 500).length;
    const custodi = window.allClienti.filter(c => (c.punti||0) >= 500).length;
    const puntiTot = window.allClienti.reduce((s,c) => s + (c.punti||0), 0);
    const el = id => document.getElementById(id);
    if (el('statTotali')) el('statTotali').textContent = totali;
    if (el('statEsploratori')) el('statEsploratori').textContent = esploratori;
    if (el('statAmbasciatori')) el('statAmbasciatori').textContent = ambas;
    if (el('statCustodi')) el('statCustodi').textContent = window.allClienti.filter(c=>(c.puntiStorici||c.punti||0)>=500).length;
    if (el('statPunti')) el('statPunti').textContent = puntiTot;
    showToast(`"${nomeCompleto}" eliminato dal Club v`);
  } catch(e) {
    console.error(e);
    showToast('Errore durante l\'eliminazione', 'error');
  }
}

window.filterClienti = function() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  const filtered = window.allClienti.filter(c =>
    `${c.nome} ${c.cognome} ${c.email}`.toLowerCase().includes(q)
  );
  renderClienti(filtered);
}

// -- MODALS --
window.openModal = function(id) { document.getElementById(id).classList.add('open'); }
window.closeModal = function(id) { document.getElementById(id).classList.remove('open'); }

window.openNuovoCliente = function() {
  currentEditId = null;
  document.getElementById('modalClienteTitle').textContent = 'Nuovo Cliente';
  document.getElementById('btnSalvaCliente').textContent = 'Salva cliente';
  ['mNome','mCognome','mEmail','mTel','mNascita'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('mPunti').value = '0';
  ['mPrivacy','mMarketing','mSms'].forEach(id => document.getElementById(id).checked = false);
  openModal('modalCliente');
}

window.openModifica = function(id) {
  const c = window.allClienti.find(x => x.id === id);
  if (!c) return;
  currentEditId = id;
  document.getElementById('modalClienteTitle').textContent = 'Modifica Cliente';
  document.getElementById('btnSalvaCliente').textContent = 'Aggiorna cliente';
  document.getElementById('mNome').value = c.nome||'';
  document.getElementById('mCognome').value = c.cognome||'';
  document.getElementById('mEmail').value = c.email||'';
  document.getElementById('mTel').value = c.telefono||'';
  document.getElementById('mNascita').value = c.dataNascita||'';
  document.getElementById('mPunti').value = c.punti||0;
  document.getElementById('mPrivacy').checked = c.privacy||false;
  document.getElementById('mMarketing').checked = c.marketing||false;
  document.getElementById('mSms').checked = c.sms||false;
  openModal('modalCliente');
}

window.salvaCliente = async function() {
  const nome = document.getElementById('mNome').value.trim();
  const cognome = document.getElementById('mCognome').value.trim();
  const email = document.getElementById('mEmail').value.trim();
  if (!nome || !cognome || !email) { showToast('Nome, cognome ed email sono obbligatori', 'error'); return; }

  const data = {
    nome, cognome, email,
    telefono: document.getElementById('mTel').value.trim(),
    dataNascita: document.getElementById('mNascita').value,
    privacy: document.getElementById('mPrivacy').checked,
    marketing: document.getElementById('mMarketing').checked,
    sms: document.getElementById('mSms').checked,
  };
  // I punti vengono aggiunti solo alla creazione — mai sovrascritti in modifica
  if (!currentEditId) data.punti = 0;

  try {
    const btn = document.getElementById('btnSalvaCliente');
    btn.textContent = 'Salvataggio...'; btn.disabled = true;

    if (currentEditId) {
      await updateDoc(doc(db, 'clienti', currentEditId), data);
      showToast('Cliente aggiornato v');
    } else {
      data.createdAt = serverTimestamp();
      data.qrCode = 'GRD-' + Date.now();
      await addDoc(collection(db, 'clienti'), data);
      showToast('Cliente aggiunto v');
    }
    closeModal('modalCliente');
    loadClienti();
    btn.textContent = currentEditId ? 'Aggiorna cliente' : 'Salva cliente';
    btn.disabled = false;
  } catch(e) {
    showToast('Errore nel salvataggio', 'error');
    document.getElementById('btnSalvaCliente').textContent = 'Salva cliente';
    document.getElementById('btnSalvaCliente').disabled = false;
  }
}

// -- STORICO PUNTI --
window.openStorico = async function(id) {
  const c = window.allClienti.find(x => x.id === id);
  if (!c) return;
  document.getElementById('storicoNome').textContent = `${c.nome} ${c.cognome||''}`;
  document.getElementById('storicoTotPunti').textContent = c.punti||0;
  document.getElementById('storicoList').innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:20px">Caricamento...</div>';
  openModal('modalStorico');

  try {
    const snap = await getDocs(query(
      collection(db, 'clienti', id, 'storico'),
      orderBy('data', 'desc')
    ));
    const movimenti = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (!movimenti.length) {
      document.getElementById('storicoList').innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:20px">Nessun movimento registrato ancora.<br><span style="font-size:12px">I movimenti vengono registrati da ora in avanti.</span></div>';
      return;
    }

    const tipoIcon = { acquisto: '🛒', checkin: '✓', social: '📸', ordine: '📦', bonus: '🎁', manuale: '✏️' };
    const tipoLabel = { acquisto: 'Acquisto', checkin: 'Check-in', social: 'Premio social', ordine: 'Ordine online', bonus: 'Bonus', manuale: 'Manuale' };

    document.getElementById('storicoList').innerHTML = movimenti.map(m => {
      const data = m.data?.toDate ? m.data.toDate().toLocaleString('it-IT', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
      const icon = tipoIcon[m.tipo] || '•';
      const label = tipoLabel[m.tipo] || m.tipo;
      const importo = m.totale ? ` · €${m.totale.toFixed(2)}` : '';
      return `<div style="display:flex;align-items:center;gap:14px;padding:12px 14px;background:var(--cream);border-radius:10px;border:1px solid var(--border)">
        <div style="font-size:20px;flex-shrink:0">${icon}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:500;font-size:14px">${label}${importo}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${m.note||''} · ${data}</div>
        </div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:700;color:var(--green);flex-shrink:0">+${m.punti}</div>
      </div>`;
    }).join('');
  } catch(e) {
    document.getElementById('storicoList').innerHTML = '<div style="text-align:center;color:var(--red);padding:20px">Errore caricamento storico</div>';
    console.error(e);
  }
};
window.openQrCliente = async function(id) {
  const c = window.allClienti.find(x => x.id === id) || (await getDoc(doc(db, 'clienti', id))).data();
  if (!c) return;
  const lv = getLivelloCliente(c);
  document.getElementById('qrName').textContent = `${c.nome} ${c.cognome}`;
  document.getElementById('qrLevel').textContent = lv.nome;
  document.getElementById('qrPoints').textContent = c.punti||0;
  const qrData = JSON.stringify({ id: id, qr: c.qrCode || id, nome: c.nome });
  const qrEl = document.getElementById('qrCanvas');
  qrEl.innerHTML = '';
  new QRCode(qrEl, { text: qrData, width: 200, height: 200, colorDark: '#1a2e1c', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.H });
  openModal('modalQr');
}

// -- GESTIONE PUNTI --
let currentPuntiId = null;
window.openPunti = function(id) {
  const c = window.allClienti.find(x => x.id === id);
  if (!c) return;
  currentPuntiId = id;
  const lv = getLivelloCliente(c);
  document.getElementById('modalPuntiAttuali').textContent = c.punti||0;
  document.getElementById('modalLivelloAttuale').innerHTML = `<span class="badge ${lv.badge}">${lv.nome}</span>`;
  document.getElementById('importoAcquisto').value = '';
  document.getElementById('puntiDaAggiungere').value = '';
  openModal('modalPunti');
}

window.aggiornaCalcoloPunti = function() {
  const importo = parseFloat(document.getElementById('importoAcquisto').value)||0;
  const c = window.allClienti.find(x => x.id === currentPuntiId);
  if (!c) return;
  const lv = getLivelloCliente(c);
  document.getElementById('puntiDaAggiungere').value = Math.round(importo * lv.moltiplicatore);
}

window.syncPuntiManuali = function() {}

window.riscattaPremio = async function(nomePremio, costoP) {
  const c = window.allClienti.find(x => x.id === currentPuntiId);
  if (!c) return;
  const puntiAttuali = c.punti || 0;
  if (puntiAttuali < costoP) {
    showToast(`Punti insufficienti! Servono ${costoP} punti, il cliente ne ha ${puntiAttuali}`, 'error');
    return;
  }
  const ok = confirm(`Riscattare "${nomePremio}" per ${costoP} punti?\n\nPunti attuali: ${puntiAttuali}\nPunti dopo: ${puntiAttuali - costoP}`);
  if (!ok) return;
  const nuovi = puntiAttuali - costoP;
  try {
    await updateDoc(doc(db, 'clienti', currentPuntiId), { punti: nuovi });
    await addDoc(collection(db, 'clienti', currentPuntiId, 'storico'), {
      tipo: 'premio',
      punti: -costoP,
      premio: nomePremio,
      data: serverTimestamp(),
      note: `Premio riscattato: ${nomePremio}`
    });
    showToast(`✅ Premio "${nomePremio}" riscattato! -${costoP} punti`);
    document.getElementById('modalPuntiAttuali').textContent = nuovi;
    closeModal('modalPunti');
    loadClienti();
  } catch(e) {
    showToast('Errore riscatto premio', 'error');
  }
}

window.confermaPunti = async function() {
  const puntiAdd = parseInt(document.getElementById('puntiDaAggiungere').value)||0;
  if (!puntiAdd || puntiAdd <= 0) { showToast('Inserisci un importo valido', 'error'); return; }
  const c = window.allClienti.find(x => x.id === currentPuntiId);
  const nuovi = (c.punti||0) + puntiAdd;
  try {
    await updateDoc(doc(db, 'clienti', currentPuntiId), { punti: nuovi });
    // Registra storico
    await addDoc(collection(db, 'clienti', currentPuntiId, 'storico'), {
      tipo: 'acquisto',
      punti: puntiAdd,
      totale: parseFloat(document.getElementById('importoAcquisto').value)||0,
      data: serverTimestamp(),
      note: 'Aggiunto da CRM'
    });
    showToast(`+${puntiAdd} punti aggiunti a ${c.nome} v`);
    closeModal('modalPunti');
    loadClienti();
  } catch(e) {
    showToast('Errore aggiornamento punti', 'error');
  }
}

// -- CASSA --
window.cercaClienteCassa = function() {
  let q = document.getElementById('cassaSearch').value.trim();
  if (!q) return;
  // Se il QR contiene JSON (es: {"id":"...","qr":"...","nome":"..."}) estrai l'id e seleziona direttamente
  try {
    const parsed = JSON.parse(q);
    if (parsed.id) {
      selezionaClienteCassa(parsed.id);
      document.getElementById('cassaSearch').value = '';
      return;
    }
  } catch(e) {}
  // Gestisce QR formato GRD-<ID>
  let searchId = q;
  if (q.toLowerCase().startsWith('grd-')) searchId = q.slice(4);
  q = q.toLowerCase();
  const risultati = window.allClienti.filter(c =>
    (c.nome+' '+c.cognome+' '+(c.email||'')+' '+(c.qrCode||'')+' '+c.id+' GRD-'+c.id).toLowerCase().includes(q)
    || c.id.toLowerCase().includes(searchId.toLowerCase())
  ).slice(0, 4);

  const div = document.getElementById('cassaResults');
  if (!risultati.length) {
    div.innerHTML = `<div style="color:var(--text-muted);font-size:13px">Nessun cliente trovato</div>`;
    return;
  }
  div.innerHTML = risultati.map(c => `
    <div onclick="selezionaClienteCassa('${c.id}')" style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--white);border:1.5px solid var(--border);border-radius:8px;margin-bottom:8px;cursor:pointer;transition:border-color 0.2s" onmouseover="this.style.borderColor='var(--green)'" onmouseout="this.style.borderColor='var(--border)'">
      <div style="width:36px;height:36px;border-radius:50%;background:var(--green);color:var(--yellow);font-family:'Cormorant Garamond',serif;font-size:16px;display:flex;align-items:center;justify-content:center;font-weight:600;flex-shrink:0">${(c.nome||'?')[0].toUpperCase()}</div>
      <div>
        <div style="font-weight:600;font-size:14px">${c.nome} ${c.cognome}</div>
        <div style="font-size:12px;color:var(--text-muted)">${c.email} . ${c.punti||0} punti</div>
      </div>
    </div>
  `).join('');
}

window.selezionaClienteCassa = function(id) {
  const c = window.allClienti.find(x => x.id === id);
  if (!c) return;
  window.currentCassaCliente = id;
  const lv = getLivelloCliente(c);
  document.getElementById('foundAvatar').textContent = (c.nome||'?')[0].toUpperCase();
  document.getElementById('foundName').textContent = `${c.nome} ${c.cognome}`;
  document.getElementById('foundMeta').textContent = `${c.email} . ${c.telefono||''}`;
  document.getElementById('foundPunti').textContent = c.punti||0;
  const fsEl = document.getElementById('foundPuntiStorici'); if(fsEl) fsEl.textContent = c.puntiStorici||c.punti||0;
  document.getElementById('foundLevel').innerHTML = `<span class="badge ${lv.badge}">${lv.nome}</span>`;
  document.getElementById('cassaResults').innerHTML = '';
  document.getElementById('cassaSearch').value = '';
  document.getElementById('cassaImporto').value = '';
  document.getElementById('cassaPuntiCalc').value = '';
  document.getElementById('clienteFound').classList.add('visible');
}

window.calcolaPunti = function() {
  const importo = parseFloat(document.getElementById('cassaImporto').value)||0;
  const c = window.allClienti.find(x => x.id === currentCassaCliente);
  if (!c) return;
  const lv = getLivelloCliente(c);
  document.getElementById('cassaPuntiCalc').value = Math.round(importo * lv.moltiplicatore);
}

window.aggiungiPuntiCassa = async function() {
  const puntiAdd = parseInt(document.getElementById('cassaPuntiCalc').value)||0;
  if (!puntiAdd) { showToast('Inserisci un importo', 'error'); return; }
  const c = window.allClienti.find(x => x.id === currentCassaCliente);
  const nuovi = (c.punti||0) + puntiAdd;
  try {
    await updateDoc(doc(db, 'clienti', currentCassaCliente), { punti: nuovi });
    // Registra storico
    await addDoc(collection(db, 'clienti', currentCassaCliente, 'storico'), {
      tipo: 'acquisto',
      punti: puntiAdd,
      totale: parseFloat(document.getElementById('cassaImporto').value)||0,
      data: serverTimestamp(),
      note: 'Aggiunto da Cassa'
    });
    document.getElementById('foundPunti').textContent = nuovi;
    const lv = getLivello(nuovi);
    document.getElementById('foundLevel').innerHTML = `<span class="badge ${lv.badge}">${lv.nome}</span>`;
    document.getElementById('cassaImporto').value = '';
    document.getElementById('cassaPuntiCalc').value = '';
    const ci = window.allClienti.find(x => x.id === currentCassaCliente);
    if (ci) ci.punti = nuovi;
    showToast(`+${puntiAdd} punti aggiunti a ${c.nome} v`);
  } catch(e) { showToast('Errore', 'error'); }
}

window.premiaSocial = async function(piattaforma, punti) {
  if (!currentCassaCliente) return;
  const c = window.allClienti.find(x => x.id === currentCassaCliente);
  if (!c) return;
  const nuovi = (c.punti||0) + punti;
  const label = { google: 'Google', tripadvisor: 'TripAdvisor', instagram: 'Story Instagram', facebook: 'Story Facebook', tiktok: 'Story TikTok' };
  try {
    await updateDoc(doc(db, 'clienti', currentCassaCliente), { punti: nuovi });
    await addDoc(collection(db, 'clienti', currentCassaCliente, 'storico'), {
      tipo: 'social',
      punti: punti,
      piattaforma: piattaforma,
      data: serverTimestamp(),
      note: `Premio ${label[piattaforma]||piattaforma}`
    });
    document.getElementById('foundPunti').textContent = nuovi;
    const lv = getLivello(nuovi);
    document.getElementById('foundLevel').innerHTML = `<span class="badge ${lv.badge}">${lv.nome}</span>`;
    const ci = window.allClienti.find(x => x.id === currentCassaCliente);
    if (ci) ci.punti = nuovi;
    showToast(`+${punti} punti ${label[piattaforma]} a ${c.nome} ✓`);
  } catch(e) { showToast('Errore assegnazione punti', 'error'); }
};

window.aggiungiCheckinCassa = async function() {
  const c = window.allClienti.find(x => x.id === currentCassaCliente);
  const nuovi = (c.punti||0) + 5;
  try {
    await updateDoc(doc(db, 'clienti', currentCassaCliente), { punti: nuovi });
    await addDoc(collection(db, 'clienti', currentCassaCliente, 'storico'), {
      tipo: 'checkin',
      punti: 5,
      data: serverTimestamp(),
      note: 'Check-in giornaliero'
    });
    document.getElementById('foundPunti').textContent = nuovi;
    const ci = window.allClienti.find(x => x.id === currentCassaCliente);
    if (ci) ci.punti = nuovi;
    showToast(`Check-in: +5 punti a ${c.nome} v`);
  } catch(e) { showToast('Errore', 'error'); }
}

window.resetCassa = function() {
  currentCassaCliente = null;
  document.getElementById('clienteFound').classList.remove('visible');
  document.getElementById('cassaSearch').value = '';
  document.getElementById('cassaResults').innerHTML = '';
}

// -- CHECKIN QR GIORNALIERO --
async function loadCheckin() {
  const oggi = new Date();
  const dateStr = oggi.toLocaleDateString('it-IT', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  document.getElementById('checkinDate').textContent = dateStr;
  const dayCode = oggi.toISOString().slice(0,10).replace(/-/g,'');
  const qrData = 'https://greedgelateria.github.io/checkin/?code=GREED-CHECKIN-' + dayCode;
  const container = document.getElementById('checkinQrCanvas');
  container.innerHTML = ''; // svuota se già generato
  try {
    new QRCode(container, {
      text: qrData,
      width: 220,
      height: 220,
      colorDark: '#1a2e1c',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });
  } catch(err) {
    console.error('QR error:', err);
    container.innerHTML = '<div style="padding:20px;font-size:11px;word-break:break-all;color:#666">' + qrData + '</div>';
  }

  // Carica check-in di oggi
  try {
    const oggi = new Date();
    const inizioGiorno = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate());
    const snap = await getDocs(query(
      collection(db, 'checkins'),
      where('timestamp', '>=', inizioGiorno),
      orderBy('timestamp', 'desc')
    ));
    const tbody = document.getElementById('checkinTable');
    if (snap.empty) {
      tbody.innerHTML = `<tr><td colspan="3"><div class="empty"><div class="empty-icon">☕</div><div class="empty-text">Nessun check-in oggi</div></div></td></tr>`;
    } else {
      tbody.innerHTML = snap.docs.map(d => {
        const c = d.data();
        const ora = c.timestamp?.toDate ? c.timestamp.toDate().toLocaleTimeString('it-IT', {hour:'2-digit',minute:'2-digit'}) : '—';
        return `<tr><td>${c.nome||'—'}</td><td>${ora}</td><td>+${c.puntiAssegnati||5}</td></tr>`;
      }).join('');
    }
  } catch(e) { console.error('Errore checkin:', e); }
}

// -- REGISTRAZIONE PUBBLICA --
window.registraCliente = async function() {
  const nome = document.getElementById('regNome').value.trim();
  const cognome = document.getElementById('regCognome').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const telefono = document.getElementById('regTel').value.trim();
  const privacy = document.getElementById('regPrivacy').checked;

  if (!nome || !cognome) { showToast('Nome e cognome sono obbligatori', 'error'); return; }
  if (!telefono) { showToast('Il numero di telefono è obbligatorio', 'error'); return; }
  if (!privacy) { showToast('Devi accettare la privacy per iscriverti', 'error'); return; }

  const data = {
    nome, cognome, email, telefono,
    dataNascita: document.getElementById('regNascita').value,
    punti: 0,
    privacy: true,
    marketing: document.getElementById('regMarketing').checked,
    sms: document.getElementById('regSms').checked,
    createdAt: serverTimestamp(),
    qrCode: 'GRD-' + Date.now(),
  };

  try {
    const btn = document.querySelector('#iscrizioneForm button');
    btn.textContent = 'Iscrizione in corso...'; btn.disabled = true;
    await addDoc(collection(db, 'clienti'), data);
    document.getElementById('iscrizioneForm').style.display = 'none';
    document.getElementById('successText').innerHTML = `Ciao <strong>${nome}</strong>! Sei ufficialmente un <strong>Esploratore</strong> del Club Greed.<br><br>Riceverai a breve un messaggio WhatsApp con il tuo QR personale. Ti aspettiamo in gelateria!<br><br><span style="font-size:12px;color:var(--text-muted)">Scrivi <strong>BONUS</strong> su WhatsApp per ricevere 20 punti regalo! 🎁</span>`;
    document.getElementById('iscrizioneSuccess').classList.add('visible');
  } catch(e) {
    showToast('Errore nella registrazione', 'error');
    const btn = document.querySelector('#iscrizioneForm button');
    btn.textContent = 'Iscriviti al Club Greed →'; btn.disabled = false;
  }
}

window.resetForm = function() {
  document.getElementById('iscrizioneForm').style.display = 'block';
  document.getElementById('iscrizioneForm').querySelector('button').textContent = 'Iscriviti al Club Greed ->';
  document.getElementById('iscrizioneForm').querySelector('button').disabled = false;
  document.getElementById('iscrizioneSuccess').classList.remove('visible');
  ['regNome','regCognome','regEmail','regTel','regNascita'].forEach(id => document.getElementById(id).value = '');
  ['regPrivacy','regMarketing','regSms'].forEach(id => document.getElementById(id).checked = false);
}

// -- INIT --
async function init() {
  await loadDashboard();
  // Pre-carica clienti per la cassa
  const snap = await getDocs(collection(db, 'clienti'));
  window.allClienti = snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

init();

/* -- QR SCANNER FOTOCAMERA (Cassa) -- */
window._scannerStream = null;
window._scannerRAF = null;
window._scannerCanvas = document.createElement('canvas');

window.avviaScanner = function() {
  document.getElementById('qrStartArea').style.display = 'none';
  document.getElementById('qrScanArea').style.display = 'block';
  var video = document.getElementById('qrVideo');
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(function(stream) {
      window._scannerStream = stream;
      video.srcObject = stream;
      video.play();
      video.addEventListener('loadedmetadata', function() {
        window._scannerRAF = requestAnimationFrame(window._scanFrame);
      });
    })
    .catch(function(err) {
      fermaScanner();
      alert('Fotocamera non disponibile: ' + err.message);
    });
};

window._scanFrame = function() {
  var video = document.getElementById('qrVideo');
  if (!video || video.readyState < 2) {
    window._scannerRAF = requestAnimationFrame(window._scanFrame);
    return;
  }
  var canvas = window._scannerCanvas;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  var ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);
  var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  var code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
  if (code && code.data) {
    var raw = code.data.trim();
    fermaScanner();

    // QR ordine: contiene ORD-
    if (raw.indexOf('ORD-') !== -1) {
      var ordMatch = raw.match(/(ORD-[0-9]+)/);
      var ordineId = ordMatch ? ordMatch[1] : raw;
      mostraDettaglioOrdine(ordineId);
      return;
    }

    // QR personale cliente: estrai GRD-xxx da URL se necessario
    var qr = raw;
    var urlMatch = raw.match(/[?&]qr=(GRD-[^&]+)/);
    if (urlMatch) qr = urlMatch[1];

    // Cerca per qrCode, per ID documento, o per GRD-<ID>
    var idDaQr = qr.startsWith('GRD-') ? qr.slice(4) : qr;
    var cliente = window.allClienti && window.allClienti.find(function(c) {
      return c.qrCode === qr || c.id === qr || c.id === idDaQr;
    });
    if (cliente) {
      selezionaClienteCassa(cliente.id);
    } else {
      document.getElementById('cassaSearch').value = qr;
      cercaClienteCassa();
      document.getElementById('qrStartArea').style.display = 'block';
    }
    return;
  }
  window._scannerRAF = requestAnimationFrame(window._scanFrame);
};

window.fermaScanner = function() {
  if (window._scannerRAF) { cancelAnimationFrame(window._scannerRAF); window._scannerRAF = null; }
  if (window._scannerStream) { window._scannerStream.getTracks().forEach(function(t){ t.stop(); }); window._scannerStream = null; }
  var video = document.getElementById('qrVideo');
  if (video) { video.srcObject = null; }
  document.getElementById('qrScanArea').style.display = 'none';
  document.getElementById('qrStartArea').style.display = 'block';
};


/* -- GESTIONE ORDINI QR -- */
window._ordineCorrente = null;

window.mostraDettaglioOrdine = async function(ordineId) {
  try {
    const snap = await getDocs(query(collection(db, 'ordini'), where('ordineId','==',ordineId), limit(1)));
    if (snap.empty) {
      showToast('Ordine non trovato: ' + ordineId, 'error');
      return;
    }
    const ordine = snap.docs[0].data();
    const docId = snap.docs[0].id;
    window._ordineCorrente = { docId, ordine };

    document.getElementById('modalOrdineId').textContent = ordineId;
    
    const stato = ordine.stato === 'consegnato' 
      ? '<span style="color:var(--green)">v Già consegnato</span>'
      : '<span style="color:var(--gold)"> In attesa di ritiro</span>';
    document.getElementById('modalOrdineStato').innerHTML = stato;

    let html = `<div style="background:var(--cream);border-radius:10px;padding:14px;margin-bottom:14px">
      <div style="font-size:15px;font-weight:600">${ordine.nome} ${ordine.cognome||''}</div>
      <div style="font-size:13px;color:var(--text-muted)"> ${ordine.telefono||'-'}</div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:4px">EUR ${ordine.totale?.toFixed(2)||'-'}</div>
    </div>`;

    if (ordine.carrello && ordine.carrello.length) {
      ordine.carrello.forEach((item, i) => {
        html += `<div style="border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:10px">
          <div style="font-weight:600;margin-bottom:6px">${item.vaschetta}</div>
          <div style="font-size:13px"> ${item.gusti?.join(', ')||'-'}</div>
          ${item.scorta ? `<div style="font-size:12px;color:#c8860a;margin-top:4px">* Scorta: ${item.scorta}</div>` : ''}
          ${item.panna ? `<div style="font-size:12px;color:var(--text-muted)">+ Panna EUR${item.pannaCosto?.toFixed(2)||'-'}</div>` : ''}
          ${item.miniconi ? `<div style="font-size:12px;color:var(--text-muted)">+ Kit 9 miniconi EUR1,50</div>` : ''}
          ${item.cono ? `<div style="font-size:12px;color:var(--text-muted)">+ ${item.cono}</div>` : ''}
          ${item.note ? `<div style="font-size:12px;color:var(--text-muted);margin-top:4px"> ${item.note}</div>` : ''}
        </div>`;
      });
    }

    document.getElementById('modalOrdineBody').innerHTML = html;
    document.getElementById('btnConsegna').style.display = ordine.stato === 'consegnato' ? 'none' : 'block';
    document.getElementById('ordineModal').style.display = 'flex';
  } catch(e) {
    showToast('Errore caricamento ordine', 'error');
    console.error(e);
  }
};

window.consegnaOrdine = async function() {
  if (!window._ordineCorrente) return;
  try {
    await updateDoc(doc(db, 'ordini', window._ordineCorrente.docId), { stato: 'consegnato' });
    showToast('Ordine consegnato v');
    chiudiOrdineModal();
  } catch(e) {
    showToast('Errore', 'error');
  }
};

window.chiudiOrdineModal = function() {
  document.getElementById('ordineModal').style.display = 'none';
  window._ordineCorrente = null;
};


/* -- VISTA ORDINI -- */
window._ordiniCache = [];

window.showView = window.showView || function(){};
const _origShowView = window.showView;

window.loadOrdini = async function() {
  const filtro = document.getElementById('ordiniFilter')?.value || 'tutti';
  const tableDiv = document.getElementById('ordiniTable');
  if(tableDiv) tableDiv.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-muted)">Caricamento...</div>';

  try {
    let q;
    if(filtro === 'tutti') {
      q = query(collection(db, 'ordini'), orderBy('createdAt','desc'), limit(200));
    } else {
      q = query(collection(db, 'ordini'), where('stato','==',filtro), orderBy('createdAt','desc'), limit(200));
    }
    const snap = await getDocs(q);
    window._ordiniCache = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
    renderOrdiniTable(window._ordiniCache);
    aggiornaStatOrdini(window._ordiniCache);
  } catch(e) {
    if(tableDiv) tableDiv.innerHTML = '<div style="padding:24px;color:var(--red)">Errore caricamento ordini.</div>';
    console.error(e);
  }
};

function aggiornaStatOrdini(ordini) {
  const oggi = new Date().toLocaleDateString('it-IT');
  const ordiniOggi = ordini.filter(o => {
    const d = o.createdAt?.toDate ? o.createdAt.toDate().toLocaleDateString('it-IT') : '';
    return d === oggi;
  });
  const attesa = ordini.filter(o => o.stato === 'pagato');
  const incasso = ordini.filter(o => o.stato === 'consegnato').reduce((s,o) => s+(o.totale||0), 0);
  const meseCorrente = new Date().getMonth();
  const incassoMese = ordini.filter(o => {
    const d = o.createdAt?.toDate ? o.createdAt.toDate() : null;
    return d && d.getMonth() === meseCorrente && o.stato === 'consegnato';
  }).reduce((s,o) => s+(o.totale||0), 0);

  document.getElementById('statOggi').textContent = ordiniOggi.length;
  document.getElementById('statAttesa').textContent = attesa.length;
  document.getElementById('statIncasso').textContent = 'EUR ' + incasso.toFixed(2);
  document.getElementById('statMese').textContent = 'EUR ' + incassoMese.toFixed(2);
}

function renderOrdiniTable(ordini) {
  const div = document.getElementById('ordiniTable');
  if(!ordini.length) {
    div.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-muted)">Nessun ordine trovato.</div>';
    return;
  }

  let html = `<table style="width:100%;border-collapse:collapse">
    <thead>
      <tr style="background:var(--cream);font-size:11px;font-weight:600;letter-spacing:.8px;text-transform:uppercase;color:var(--text-muted)">
        <th style="padding:12px 16px;text-align:left">Ordine</th>
        <th style="padding:12px 16px;text-align:left">Cliente</th>
        <th style="padding:12px 16px;text-align:left">Telefono</th>
        <th style="padding:12px 16px;text-align:left">Data</th>
        <th style="padding:12px 16px;text-align:right">Totale</th>
        <th style="padding:12px 16px;text-align:center">Stato</th>
        <th style="padding:12px 16px;text-align:center">Azioni</th>
      </tr>
    </thead>
    <tbody>`;

  ordini.forEach(o => {
    const data = o.createdAt?.toDate ? o.createdAt.toDate().toLocaleString('it-IT') : '-';
    const statoColor = o.stato === 'consegnato' ? 'var(--green)' : 'var(--gold)';
    const statoLabel = o.stato === 'consegnato' ? 'v Consegnato' : ' Attesa ritiro';
    const gusti = o.carrello?.map(i => i.gusti?.join(', ')).join(' | ') || '-';

    html += `<tr style="border-top:1px solid var(--border);transition:background .15s" onmouseover="this.style.background='var(--cream)'" onmouseout="this.style.background=''">
      <td style="padding:12px 16px;font-family:'Cormorant Garamond',serif;font-weight:600;color:var(--green)">${o.ordineId||'-'}</td>
      <td style="padding:12px 16px"><div style="font-weight:500">${o.nome||''} ${o.cognome||''}</div><div style="font-size:11px;color:var(--text-muted)">${gusti}</div></td>
      <td style="padding:12px 16px;color:var(--text-muted)">${o.telefono||'-'}</td>
      <td style="padding:12px 16px;color:var(--text-muted);font-size:12px">${data}</td>
      <td style="padding:12px 16px;text-align:right;font-weight:600">EUR ${(o.totale||0).toFixed(2)}</td>
      <td style="padding:12px 16px;text-align:center"><span style="font-size:11px;font-weight:600;color:${statoColor}">${statoLabel}</span></td>
      <td style="padding:12px 16px;text-align:center">
        <button onclick="apriDettaglioOrdineAdmin('${o.docId}')" style="background:none;border:1px solid var(--border);padding:4px 10px;border-radius:4px;cursor:pointer;font-size:11px">Dettaglio</button>
        <button onclick="eliminaOrdine('${o.docId}','${o.ordineId||o.docId}')" style="background:none;border:1px solid #f5c6c2;color:var(--red);padding:4px 10px;border-radius:4px;cursor:pointer;font-size:11px;margin-left:4px">🗑</button>
      </td>
    </tr>`;
  });

  html += '</tbody></table>';
  div.innerHTML = html;
}

window.eliminaOrdine = async function(docId, ordineId) {
  const pin = prompt(`Inserisci il PIN titolare per eliminare l'ordine "${ordineId}":`);
  if (pin !== '3737') { showToast('PIN errato — eliminazione annullata', 'error'); return; }
  const conferma = confirm(`Eliminare definitivamente l'ordine "${ordineId}"?\n\nQuesta operazione non può essere annullata.`);
  if (!conferma) return;
  try {
    await deleteDoc(doc(db, 'ordini', docId));
    window._ordiniCache = window._ordiniCache.filter(o => o.docId !== docId);
    renderOrdiniTable(window._ordiniCache);
    aggiornaStatOrdini(window._ordiniCache);
    showToast(`Ordine ${ordineId} eliminato ✓`);
  } catch(e) {
    showToast('Errore eliminazione ordine', 'error');
  }
};

window.apriDettaglioOrdineAdmin = function(docId) {
  const o = window._ordiniCache.find(x => x.docId === docId);
  if(!o) return;
  window._ordineCorrente = { docId, ordine: o };

  document.getElementById('modalOrdineId').textContent = o.ordineId || docId;
  const stato = o.stato === 'consegnato'
    ? '<span style="color:var(--green)">v Già consegnato</span>'
    : '<span style="color:var(--gold)"> In attesa di ritiro</span>';
  document.getElementById('modalOrdineStato').innerHTML = stato;

  let html = `<div style="background:var(--cream);border-radius:10px;padding:14px;margin-bottom:14px">
    <div style="font-size:15px;font-weight:600">${o.nome} ${o.cognome||''}</div>
    <div style="font-size:13px;color:var(--text-muted)"> ${o.telefono||'-'}</div>
    <div style="font-size:12px;color:var(--text-muted);margin-top:4px">EUR ${(o.totale||0).toFixed(2)}</div>
  </div>`;

  if(o.carrello?.length) {
    o.carrello.forEach(item => {
      html += `<div style="border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:10px">
        <div style="font-weight:600;margin-bottom:6px">${item.vaschetta}</div>
        <div style="font-size:13px"> ${item.gusti?.join(', ')||'-'}</div>
        ${item.scorta ? `<div style="font-size:12px;color:#c8860a;margin-top:4px">* Scorta: ${item.scorta}</div>` : ''}
        ${item.panna ? `<div style="font-size:12px;color:var(--text-muted)">+ Panna EUR${item.pannaCosto?.toFixed(2)||'-'}</div>` : ''}
        ${item.miniconi ? `<div style="font-size:12px;color:var(--text-muted)">+ Kit 9 miniconi EUR1,50</div>` : ''}
        ${item.cono ? `<div style="font-size:12px;color:var(--text-muted)">+ ${item.cono}</div>` : ''}
        ${item.note ? `<div style="font-size:12px;color:var(--text-muted);margin-top:4px"> ${item.note}</div>` : ''}
      </div>`;
    });
  }

  document.getElementById('modalOrdineBody').innerHTML = html;
  document.getElementById('btnConsegna').style.display = o.stato === 'consegnato' ? 'none' : 'block';
  document.getElementById('ordineModal').style.display = 'flex';
};

/* ─────────────────────────────────────────
   ORA FURBA
───────────────────────────────────────── */
let ofAttiva = false;

async function loadOraFurba() {
  try {
    const snap = await getDoc(doc(db, 'config', 'oraFurba'));
    if (snap.exists()) {
      const d = snap.data();
      ofAttiva = d.attiva !== false;
      document.getElementById('ofMaxOrdini').value = d.maxOrdini || 10;
      document.getElementById('ofOrdiniOggi').textContent = d.ordiniOggi || 0;
      aggiornaToggleOF();
    }
  } catch(e) { console.error(e); }
}

function aggiornaToggleOF() {
  const toggle = document.getElementById('ofToggle');
  const dot = document.getElementById('ofToggleDot');
  const label = document.getElementById('ofToggleLabel');
  if (ofAttiva) {
    toggle.style.background = 'var(--green)';
    dot.style.left = '25px';
    label.textContent = 'Attiva';
    label.style.color = 'var(--green)';
  } else {
    toggle.style.background = 'var(--border)';
    dot.style.left = '3px';
    label.textContent = 'Disattiva';
    label.style.color = 'var(--text-muted)';
  }
}

window.toggleOraFurba = function() {
  ofAttiva = !ofAttiva;
  aggiornaToggleOF();
};

window.salvaOraFurba = async function() {
  const maxOrdini = parseInt(document.getElementById('ofMaxOrdini').value) || 10;
  try {
    await updateDoc(doc(db, 'config', 'oraFurba'), { attiva: ofAttiva, maxOrdini });
    showToast('Ora Furba aggiornata ✓');
  } catch(e) {
    showToast('Errore salvataggio', 'error');
  }
};

window.resetOrdiniOggi = async function() {
  const conferma = confirm('Azzerare il contatore ordini oggi?');
  if (!conferma) return;
  try {
    await updateDoc(doc(db, 'config', 'oraFurba'), { ordiniOggi: 0 });
    document.getElementById('ofOrdiniOggi').textContent = '0';
    showToast('Contatore azzerato ✓');
  } catch(e) {
    showToast('Errore', 'error');
  }
};

/* ─────────────────────────────────────────
   CAMPAGNE WHATSAPP
───────────────────────────────────────── */
const N8N_CAMPAGNA_URL = 'https://inviacampagna-u3jmxuuypq-ey.a.run.app';
let campClientiSelezionati = new Set();
let campClientiFiltrati = [];

// Configurazione campagne: template Meta, descrizione, campi, testo preview
const CAMP_CONFIG = {
  ora_furba: {
    template: 'greed_ora_furba',
    desc: 'Promozione Ora Furba — ricorda ai clienti che ogni mattina lun-ven dalle 10 alle 11 possono ordinare con il 20% di sconto.',
    bottone: true,
    campi: [],
    preview: (v, nome) => `⏰ Ciao ${nome}, scopri l'*ORA FURBA* da Gelateria GREED!\n\nOgni mattina dal lunedì al venerdì, dalle 10:00 alle 11:00, puoi ordinare la tua vaschetta di gelato artigianale con il 20% di sconto 🍨\n\n📦 Slot limitati ogni giorno — chi prima arriva, meglio alloggia!\n\n➡️ Ordina su:\ngreedgelateria.github.io\n\n🕕 Ritiro in gelateria a partire dalle 18:00\n\nGelateria GREED — Piazza Roma 16, Frascati`,
    payload: (c, v, imgUrl) => ({
      template: 'greed_ora_furba',
      telefono: tel(c), nome: c.nome,
      immagineUrl: imgUrl
    })
  },
  ora_furba_dormienti: {
    template: 'greed_ora_furba_speciale',
    desc: 'Riattivazione inattivi — sconto personale 30% con codice univoco. Ogni cliente riceve un codice usa-e-getta valido 24h, solo vaschette.',
    bottone: true,
    richiedeImmagine: false,
    generaCodice: true,
    campi: [
      { id: 'c_orario', label: 'Giorno e fascia oraria ({{2}})', tipo: 'text', placeholder: 'domani, dalle 11:00 alle 16:00' },
      { id: 'c_sconto', label: 'Sconto ({{3}})', tipo: 'text', placeholder: '30%' },
    ],
    preview: (v, nome, codice) => `Ciao ${nome}, ti mancava GREED? 🍦\n\nSolo per te, ${v.c_orario||'...'}: ordina su gelateriagreed.it/i-gusti e ottieni il ${v.c_sconto||'...'} di sconto su tutta la tua vaschetta di gelato artigianale.\n\nUsa il codice ${codice||'GREED-NOME-XXXX'} al checkout. Solo per te. Non fartela scappare 🍨`,
    payload: (c, v, imgUrl, codice) => ({
      template: 'greed_ora_furba_speciale',
      telefono: tel(c), nome: c.nome,
      var2: v.c_orario, var3: v.c_sconto, var4: codice
    })
  },
  reminder_bonus: {
    template: 'greed_reminder_bonus',
    desc: 'Reminder BONUS — inviato solo a chi non ha ancora riscattato il bonus di benvenuto.',
    bottone: false,
    soloSenzaBonus: true,
    campi: [],
    preview: (v, nome) => `Ciao ${nome}! 🎁\n\nHai un regalo che ti aspetta nel Club GREED.\n\nScrivi *BONUS* in questa chat e ricevi subito *20 punti* da usare in gelateria!\n\n— GREED Gelateria Naturale · Frascati 🍦`,
    payload: (c, v, imgUrl) => ({
      template: 'greed_reminder_bonus',
      telefono: tel(c), nome: c.nome,
      immagineUrl: imgUrl || 'https://greedgelateria.github.io/assets/img/punti-banner.jpg'
    })
  },
  promo_flash: {
    template: 'greed_promo_flash',
    desc: 'Offerta flash con sconto o gusto in esclusiva. Invia a tutti o per livello.',
    bottone: true,
    campi: [
      { id: 'c_testo',    label: 'Testo offerta ({{2}})', tipo: 'textarea', placeholder: 'Vaschetta Media con sconto 20% solo oggi!' },
      { id: 'c_scadenza', label: 'Valida fino a ({{3}})',  tipo: 'text',     placeholder: 'domenica 30 marzo' },
    ],
    preview: (v, nome) => `Ciao ${nome}! 🍦\n\n${v.c_testo||'...'}\n\nOfferta valida fino a ${v.c_scadenza||'...'}.\nNon perdere questa occasione — solo per i membri del Club Greed.\n\n— GREED Gelateria Naturale · Frascati`,
    payload: (c, v, imgUrl) => ({
      template: 'greed_promo_flash',
      telefono: tel(c), nome: c.nome,
      immagineUrl: imgUrl,
      var2: v.c_testo, var3: v.c_scadenza
    })
  },

  recensione_social: {
    template: 'greed_recensione_social',
    desc: 'Chiedi una story su Instagram o Facebook in cambio di punti.',
    bottone: false,
    campi: [
      { id: 'c_punti', label: 'Punti in regalo ({{2}})', tipo: 'text', placeholder: '10' },
    ],
    preview: (v, nome) => `Ciao ${nome}! 📸\n\nPubblica una story su Instagram o Facebook taggando @greedavididigelato e guadagni ${v.c_punti||'...'} punti extra!\n\nMostraci il tuo gelato preferito.\n\n— GREED Gelateria Naturale · Frascati`,
    payload: (c, v, imgUrl) => ({
      template: 'greed_recensione_social',
      telefono: tel(c), nome: c.nome,
      immagineUrl: imgUrl,
      var2: v.c_punti
    })
  },
  compleanno: {
    template: 'greed_compleanno',
    desc: 'Auguri personalizzati con regalo. Filtra automaticamente i compleanni del mese.',
    bottone: true,
    campi: [
      { id: 'c_regalo', label: 'Regalo ({{2}})', tipo: 'text', placeholder: 'una vaschetta piccola in omaggio' },
    ],
    preview: (v, nome) => `Tanti auguri ${nome}! 🎂🍦\n\nIl Club Greed ti fa un regalo: ${v.c_regalo||'...'}.\n\nValido tutta la settimana del tuo compleanno — vieni a trovarci a Piazza Roma 16, Frascati.\n\n— GREED Gelateria Naturale · Frascati`,
    payload: (c, v, imgUrl) => ({
      template: 'greed_compleanno',
      telefono: tel(c), nome: c.nome,
      immagineUrl: imgUrl,
      var2: v.c_regalo
    })
  },

  evento: {
    template: 'greed_appuntamento',
    desc: 'Invito evento — invia a tutti i soci Club GREED con anti-blocco Meta integrato.',
    bottone: false,
    richiedeImmagine: false,
    campi: [
      { id: 'c_dettagli', label: 'Data, ora e luogo ({{2}})', tipo: 'text', placeholder: 'venerdì 25 luglio, dalle 18:00 alle 20:00 – Frascati, Piazza Roma 16' },
    ],
    preview: (v, nome) => `Ciao ${nome},\n\ndomani ti aspettiamo in gelateria per qualcosa che non hai mai assaggiato.\n\n🆕 Anteprima esclusiva — solo per i soci Club GREED\nPresentiamo Vellutà al Tiramisù: il nostro nuovo dessert al cucchiaio, un tiramisù espresso come non l'hai mai vissuto.\n\n🎁 Degustazione gratuita\n📅 ${v.c_dettagli||'...'}\n\nPosti limitati. Solo per te — Club GREED.`,
    payload: (c, v, imgUrl) => ({
      template: 'greed_appuntamento',
      telefono: tel(c), nome: c.nome,
      var2: v.c_dettagli
    })
  },
  delivery_lancio: {
    template: 'greed_delivery_lancio',
    desc: 'Annuncio lancio delivery — invia a tutti gli iscritti. Nessuna immagine richiesta.',
    bottone: false,
    richiedeImmagine: false,
    campi: [],
    preview: (v, nome) => `🚀 Ciao ${nome}, una novità per te!\n\nDa oggi puoi ordinare il gelato GREED direttamente a casa tua.\n\n🎁 Con ogni consegna ti regaliamo una vaschetta piccola di panna fresca — sempre.\n\n🕓 Ordina entro le 16:00\n🛵 Consegna dalle 19:00 alle 20:00\n⚠️ Solo 10 consegne al giorno — prenota il tuo posto prima che finiscano.\n\n👉 greedgelateria.github.io/i-gusti`,
    payload: (c, v, imgUrl) => ({
      template: 'greed_delivery_lancio',
      telefono: tel(c), nome: c.nome,
      var1: c.nome || 'amico'
    })
  },

  riattivazione: {
    template: 'greed_riattivazione',
    desc: 'Per clienti inattivi da 1-2 mesi. Offri una gratificazione per farli tornare.',
    bottone: true,
    campi: [
      { id: 'c_regalo', label: 'Gratificazione ({{2}})', tipo: 'text', placeholder: 'una vaschetta di panna gratis con il tuo prossimo ordine' },
      { id: 'c_scad',   label: 'Valido fino a ({{3}})',  tipo: 'text', placeholder: 'domenica 13 aprile' },
    ],
    preview: (v, nome) => `Ciao ${nome}, ci manchi! 🍦\n\nÈ un po' che non ti vediamo da GREED — e vogliamo che tu torni con un sorriso.\n\nPer te: ${v.c_regalo||'...'}\n\nValido fino a ${v.c_scad||'...'}. Ti aspettiamo a Piazza Roma 16, Frascati.\n\n— GREED Gelateria Naturale`,
    payload: (c, v, imgUrl) => ({
      template: 'greed_riattivazione',
      telefono: tel(c), nome: c.nome,
      immagineUrl: imgUrl,
      var2: v.c_regalo, var3: v.c_scad
    })
  },
  festa_papa: {
    template: 'greed_festa_papa',
    desc: 'Campagna Festa del Papà — 19 marzo.',
    bottone: true,
    campi: [
      { id: 'c_offerta', label: 'Offerta speciale ({{2}})', tipo: 'textarea', placeholder: 'Vaschetta Grande per tutta la famiglia a prezzo speciale!' },
    ],
    preview: (v, nome) => `Ciao ${nome}! 👨‍👧\n\nFesta del Papà si festeggia con il gelato migliore di Frascati 🍦\n\n${v.c_offerta||'...'}\n\nValido il 19 marzo — vieni a trovarci con la tua famiglia a Piazza Roma 16.\n\n— GREED Gelateria Naturale · Frascati`,
    payload: (c, v, imgUrl) => ({
      template: 'greed_festa_papa',
      telefono: tel(c), nome: c.nome,
      immagineUrl: imgUrl,
      var2: v.c_offerta
    })
  },
  festa_mamma: {
    template: 'greed_festa_mamma_2',
    desc: 'Campagna Festa della Mamma — seconda domenica di maggio.',
    bottone: true,
    campi: [
      { id: 'c_offerta', label: 'Offerta speciale ({{2}})', tipo: 'textarea', placeholder: 'Porta la tua mamma e ricevi una vaschetta di panna in omaggio!' },
    ],
    preview: (v, nome) => `Ciao ${nome}! 💐\n\nLa mamma merita il meglio — e noi abbiamo il gelato perfetto per lei 🍦\n\n${v.c_offerta||'...'}\n\nTi aspettiamo a Piazza Roma 16, Frascati.\n\n— GREED Gelateria Naturale · Frascati`,
    payload: (c, v, imgUrl) => ({
      template: 'greed_festa_mamma_2',
      telefono: tel(c), nome: c.nome,
      immagineUrl: imgUrl,
      var2: v.c_offerta
    })
  }
};

function tel(c) {
  return (c.telefono||'').startsWith('+') ? c.telefono : `+39${c.telefono}`;
}

window.aggiornaCampCount = function() {
  if (!window.allClienti || !window.allClienti.length) {
    getDocs(collection(db, 'clienti')).then(snap => {
      window.allClienti = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderCampClienti(window.allClienti);
    });
  } else {
    renderCampClienti(window.allClienti);
  }
};

window.campagnaTipoChanged = function() {
  const tipo = document.getElementById('campTipo').value;
  const cfg = CAMP_CONFIG[tipo];
  document.getElementById('campTipoDesc').textContent = cfg ? cfg.desc : '';

  if (!cfg) {
    document.getElementById('campContenutoWrap').style.display = 'none';
    document.getElementById('campDestinatariWrap').style.display = 'none';
    return;
  }

  // Mostra sezione contenuto
  document.getElementById('campContenutoWrap').style.display = 'block';
  document.getElementById('campDestinatariWrap').style.display = 'block';

  // Reset immagine
  document.getElementById('campImmagineUrl').value = '';
  document.getElementById('campImgPreviewWrap').style.display = 'none';
  document.getElementById('campImgPlaceholder').style.display = 'block';
  document.getElementById('campImgStatus').textContent = '';
  document.getElementById('campImgGroup').style.display = cfg.richiedeImmagine === false ? 'none' : 'block';

  // Genera campi dinamici
  let html = '';
  cfg.campi.forEach(f => {
    html += `<div class="form-group">
      <label class="form-label">${f.label}</label>`;
    if (f.tipo === 'textarea') {
      html += `<textarea class="form-input" id="${f.id}" rows="3" placeholder="${f.placeholder}" oninput="aggiornaAnteprimaCamp()" style="resize:vertical;line-height:1.5"></textarea>`;
    } else {
      html += `<input type="text" class="form-input" id="${f.id}" placeholder="${f.placeholder}" oninput="aggiornaAnteprimaCamp()">`;
    }
    html += `</div>`;
  });
  document.getElementById('campCampiDinamici').innerHTML = html;
  document.getElementById('campAnteprimaWrap').style.display = 'none';
  document.getElementById('campAnteprimaTesto').textContent = '';

  // Selezione automatica per tipo campagna
 else if (tipo === 'compleanno') {
    setTimeout(() => selezionaCompleannoMese(), 300);
  } else if (tipo === 'reminder_bonus') {
    // Template con header immagine — imposta il banner bonus
    document.getElementById('campImmagineUrl').value = 'https://greedgelateria.github.io/assets/img/punti-banner.jpg';
    document.getElementById('campImgStatus').textContent = '✅ Banner BONUS (header template)';
    setTimeout(() => {
      // Filtra senza bonus + ordina per data iscrizione (più recenti prima)
      const senzaBonus = (window.allClienti || [])
        .filter(c => !c.bonusRiscattato && c.telefono)
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      window._reminderBonusLista = senzaBonus;

      // Inserisci selettore "primi N" sopra la lista (una sola volta)
      if (!document.getElementById('reminderLimitWrap')) {
        const badge = document.getElementById('campBadge');
        const wrap = document.createElement('div');
        wrap.id = 'reminderLimitWrap';
        wrap.style.cssText = 'background:#eceff1;border:1px solid #546e7a33;border-radius:8px;padding:14px 16px;margin:12px 0;font-size:14px';
        wrap.innerHTML = `
          <div style="font-weight:600;color:#37474f;margin-bottom:8px">🧪 Invio di test — proteggi il quality rating WhatsApp</div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <span>Invia solo ai primi</span>
            <select id="reminderLimit" onchange="applicaLimiteReminder()" style="padding:6px 12px;border-radius:6px;border:1px solid #546e7a55;font-family:inherit;font-size:14px;background:#fff;cursor:pointer">
              <option value="25">25</option>
              <option value="50" selected>50</option>
              <option value="100">100</option>
              <option value="0">Tutti</option>
            </select>
            <span>contatti più recenti</span>
          </div>
          <div style="font-size:12px;color:#546e7a;margin-top:8px">Ordinati dal più recente. Parti dai primi 50 per testare la risposta, poi scala se converte.</div>`;
        if (badge && badge.parentNode) badge.parentNode.insertBefore(wrap, badge);
      }
      applicaLimiteReminder();
    }, 300);
  } else {
    renderCampClienti(window.allClienti || []);
  }
};

window.applicaLimiteReminder = function() {
  const lista = window._reminderBonusLista || [];
  const limite = parseInt(document.getElementById('reminderLimit')?.value || 50);
  const selezionati = limite > 0 ? lista.slice(0, limite) : lista;
  campClientiSelezionati.clear();
  selezionati.forEach(c => campClientiSelezionati.add(c.id));
  renderCampClienti(lista);
  const totale = lista.length;
  const nSel = selezionati.length;
  document.getElementById('campBadge').textContent = `${nSel} di ${totale} selezionati per l'invio (senza bonus, con telefono)`;
}

window.aggiornaAnteprimaCamp = function() {
  const tipo = document.getElementById('campTipo').value;
  const cfg = CAMP_CONFIG[tipo];
  if (!cfg) return;
  const v = {};
  cfg.campi.forEach(f => { v[f.id] = (document.getElementById(f.id)||{}).value || ''; });
  const testo = cfg.preview(v, 'Mario');
  document.getElementById('campAnteprimaTesto').textContent = testo;
  document.getElementById('campAnteprimaWrap').style.display = 'block';
};

// ── UPLOAD IMMAGINE FIREBASE STORAGE ──
window.campHandleFile = async function(file) {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { showToast('Immagine troppo grande (max 5MB)', 'error'); return; }

  document.getElementById('campImgPlaceholder').style.display = 'none';
  document.getElementById('campImgPreviewWrap').style.display = 'none';
  document.getElementById('campImgUploading').style.display = 'block';
  document.getElementById('campImgStatus').textContent = '';
  document.getElementById('campImmagineUrl').value = '';

  try {
    const { getStorage, ref, uploadBytes, getDownloadURL } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js');
    const storage = getStorage();
    const fileName = `campagne/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._]/g,'_')}`;
    const storageRef = ref(storage, fileName);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    document.getElementById('campImmagineUrl').value = url;

    // mostra preview
    const img = document.getElementById('campImgPreview');
    img.src = URL.createObjectURL(file);
    document.getElementById('campImgUploading').style.display = 'none';
    document.getElementById('campImgPreviewWrap').style.display = 'block';
    document.getElementById('campImgStatus').innerHTML = '<span style="color:var(--success)">Immagine caricata</span>';
  } catch(e) {
    document.getElementById('campImgUploading').style.display = 'none';
    document.getElementById('campImgPlaceholder').style.display = 'block';
    console.error(e);
    if (e.code === 'storage/unauthorized') {
      document.getElementById('campImgStatus').innerHTML = '<span style="color:var(--red)">Storage non abilitato — vedi istruzioni sotto</span>';
      showToast('Abilita Firebase Storage prima', 'error');
    } else {
      document.getElementById('campImgStatus').innerHTML = `<span style="color:var(--red)">Errore upload: ${e.message}</span>`;
    }
  }
};

window.campHandleDrop = function(e) {
  e.preventDefault();
  document.getElementById('campImgUploadArea').style.borderColor = 'var(--border)';
  const file = e.dataTransfer.files[0];
  if (file) campHandleFile(file);
};

// ── CLIENTI ──
function renderCampClienti(lista) {
  campClientiFiltrati = lista;
  const div = document.getElementById('campClientiList');
  if (!lista.length) {
    div.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Nessun cliente trovato</div>';
    aggiornaBadgeCamp(); return;
  }
  div.innerHTML = lista.map(c => {
    const checked = campClientiSelezionati.has(c.id) ? 'checked' : '';
    const lv = getLivelloCliente(c);
    const tel2 = c.telefono
      ? `<span style="color:var(--text-muted);font-size:11px">${c.telefono}</span>`
      : '<span style="color:var(--red);font-size:11px">Nessun telefono</span>';
    return `<label style="display:flex;align-items:center;gap:14px;padding:11px 20px;border-bottom:1px solid var(--cream-dark);cursor:pointer;transition:background .15s" onmouseover="this.style.background='var(--cream)'" onmouseout="this.style.background=''">
      <input type="checkbox" ${checked} ${!c.telefono?'disabled title="Telefono mancante"':''} onchange="toggleCampCliente('${c.id}',this.checked)" style="width:16px;height:16px;accent-color:var(--green);flex-shrink:0;cursor:${c.telefono?'pointer':'not-allowed'}">
      <div style="width:32px;height:32px;border-radius:50%;background:var(--green);color:var(--yellow);font-family:'Cormorant Garamond',serif;font-size:14px;display:flex;align-items:center;justify-content:center;font-weight:600;flex-shrink:0">${(c.nome||'?')[0].toUpperCase()}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:500;font-size:14px">${c.nome} ${c.cognome||''}</div>
        <div style="display:flex;gap:10px;align-items:center;margin-top:2px">${tel2}</div>
      </div>
      <span class="badge ${lv.badge}" style="font-size:10px;flex-shrink:0">${lv.nome}</span>
    </label>`;
  }).join('');
  aggiornaBadgeCamp();
}

window.toggleCampCliente = function(id, checked) {
  if (checked) campClientiSelezionati.add(id);
  else campClientiSelezionati.delete(id);
  aggiornaBadgeCamp();
};

window.selezionaTuttiCamp = function() {
  campClientiFiltrati.filter(c => c.telefono).forEach(c => campClientiSelezionati.add(c.id));
  renderCampClienti(campClientiFiltrati);
};

window.deselezionaTuttiCamp = function() {
  campClientiSelezionati.clear();
  renderCampClienti(campClientiFiltrati);
};

window.selezionaLivelloCamp = function(livello) {
  const tutti = window.allClienti || [];
  campClientiSelezionati.clear();
  tutti.filter(c => {
    const p = c.punti||0;
    const ps = c.puntiStorici || c.punti || 0;
    if (livello === 'esploratore') return ps < 200 && c.telefono;
    if (livello === 'ambasciatore') return ps >= 200 && ps < 500 && c.telefono;
    if (livello === 'custode') return ps >= 500 && c.telefono;
    return false;
  }).forEach(c => campClientiSelezionati.add(c.id));
  renderCampClienti(tutti);
};

window.selezionaSegmentoCamp = function(label) {
  const tutti = window.allClienti || [];
  campClientiSelezionati.clear();
  tutti.filter(c => getRFM(c).label === label && c.telefono).forEach(c => campClientiSelezionati.add(c.id));
  renderCampClienti(tutti);
  showToast(`Selezionati ${campClientiSelezionati.size} clienti — segmento "${label}"`);
};

window.selezionaCompleannoMese = function() {
  const tutti = window.allClienti || [];
  const meseOggi = new Date().getMonth() + 1;
  campClientiSelezionati.clear();
  tutti.filter(c => {
    if (!c.dataNascita || !c.telefono) return false;
    const sep = c.dataNascita.includes('-') ? '-' : '/';
    const p = c.dataNascita.split(sep);
    const mese = sep === '-' ? parseInt(p[1]) : parseInt(p[1]);
    return mese === meseOggi;
  }).forEach(c => campClientiSelezionati.add(c.id));;
  renderCampClienti(tutti);
  showToast(`Selezionati ${campClientiSelezionati.size} compleanni di questo mese`);
};

window.filtraCampClienti = function() {
  const q = document.getElementById('campSearch').value.toLowerCase();
  renderCampClienti((window.allClienti||[]).filter(c =>
    `${c.nome} ${c.cognome} ${c.email} ${c.telefono||''}`.toLowerCase().includes(q)
  ));
};

function aggiornaBadgeCamp() {
  const n = campClientiSelezionati.size;
  document.getElementById('campBadge').textContent = n === 0
    ? 'Nessun cliente selezionato'
    : `${n} client${n===1?'e':'i'} selezionat${n===1?'o':'i'}`;
}

window.resetCampagna = function() {
  document.getElementById('campTipo').value = '';
  document.getElementById('campTipoDesc').textContent = '';
  document.getElementById('campContenutoWrap').style.display = 'none';
  document.getElementById('campDestinatariWrap').style.display = 'none';
  document.getElementById('campProgressWrap').style.display = 'none';
  document.getElementById('campImmagineUrl').value = '';
  document.getElementById('campImgPreviewWrap').style.display = 'none';
  document.getElementById('campImgPlaceholder').style.display = 'block';
  document.getElementById('campImgStatus').textContent = '';
  document.getElementById('campCampiDinamici').innerHTML = '';
  document.getElementById('campAnteprimaWrap').style.display = 'none';
  campClientiSelezionati.clear();
  campClientiFiltrati = [];
  document.getElementById('campBadge').textContent = 'Nessun cliente selezionato';
  document.getElementById('btnInviaCamp').disabled = false;
  document.getElementById('btnInviaCamp').textContent = '📤 Invia campagna';
};


function _generaCodicePromo(nome) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  const nomeClean = (nome||'GREED').toUpperCase().replace(/[^A-Z]/g,'').substring(0,6);
  return 'GREED-' + nomeClean + '-' + suffix;
}

const DORMIENTI_URL = 'https://europe-west3-club-greed.cloudfunctions.net/inviaCampagnaDormienti';

window.testInviaCampagna = async function() {
  const tipo = document.getElementById('campTipo').value;
  const cfg = CAMP_CONFIG[tipo];
  if (!cfg) { showToast('Seleziona un tipo di campagna', 'error'); return; }
  const imgUrl = document.getElementById('campImmagineUrl').value.trim();
  if (cfg.richiedeImmagine !== false && !imgUrl) { showToast("Carica l'immagine intestazione", 'error'); return; }
  const numeroTest = (document.getElementById('campNumeroTest').value || '+393476236679').replace(/\s/g,'');
  if (!confirm('Inviare messaggio TEST a ' + numeroTest + '?')) return;
  const btn = document.getElementById('btnTestCamp');
  btn.disabled = true; btn.textContent = 'Invio...';
  try {
    // Campagna dormienti: usa la Function dedicata con testNumero
    if (tipo === 'ora_furba_dormienti') {
      const res = await fetch(DORMIENTI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testNumero: numeroTest })
      });
      if (res.ok) alert('✅ Messaggio test inviato a ' + numeroTest + '!\nControlla il tuo WhatsApp.');
      else alert('❌ Errore HTTP ' + res.status);
    } else {
      const v = {};
      cfg.campi.forEach(f => { v[f.id] = (document.getElementById(f.id)||{}).value?.trim() || 'Test'; });
      const clienteFinto = { id: 'test', nome: 'Test', cognome: '', telefono: numeroTest, punti: 0, puntiStorici: 0, numeroAcquisti: 0 };
      const codiceTest = cfg.generaCodice ? _generaCodicePromo('Test') : null;
      const payload = cfg.payload(clienteFinto, v, imgUrl, codiceTest);
      const res = await fetch(N8N_CAMPAGNA_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) alert('✅ Messaggio test inviato a ' + numeroTest + '!\nControlla il tuo WhatsApp.');
      else alert('❌ Errore HTTP ' + res.status);
    }
  } catch(e) { alert('❌ Errore: ' + e.message); }
  btn.disabled = false; btn.textContent = '🧪 Test su di me';
};

window.inviaCampagna = async function() {
  const tipo = document.getElementById('campTipo').value;
  const cfg = CAMP_CONFIG[tipo];
  if (!cfg) { showToast('Seleziona un tipo di campagna', 'error'); return; }

  // Campagna dormienti: loop nel BROWSER — un messaggio per volta, pausa controllata
  if (tipo === 'ora_furba_dormienti') {
    const v = {};
    cfg.campi.forEach(f => { v[f.id] = (document.getElementById(f.id)||{}).value?.trim() || ''; });
    if (!v.c_orario || !v.c_sconto) { showToast('Compila giorno/fascia oraria e sconto', 'error'); return; }
    if (v.c_orario.toLowerCase().includes('domani')) { showToast('⚠️ Aggiorna prima il campo con la data corretta!', 'error'); return; }

    // Filtra dormienti (stesso criterio Firebase: freq=0 e nessun ultimoAcquisto)
    const dormienti = (window.allClienti||[]).filter(c => {
      return c.telefono && c.sms !== false &&
        (c.numeroAcquisti||0) === 0 && !c.ultimoAcquisto;
    });

    if (!dormienti.length) { showToast('Nessun cliente "Mai attivato" trovato', 'error'); return; }

    const ok = confirm(`Inviare campagna DORMIENTI?

✉️ Destinatari: ${dormienti.length} clienti mai attivati
📅 Finestra: ${v.c_orario}
💰 Sconto: ${v.c_sconto}

⏱ Tempo stimato: ~${Math.ceil(dormienti.length*2/60)} minuti

NON chiudere il browser durante l'invio.`);
    if (!ok) return;

    const btn = document.getElementById('btnInviaCamp');
    const campagnaId = `dormienti_${Date.now()}`;
    btn.disabled = true;
    let inviati = 0, errori = 0;

    const wrap = document.getElementById('campProgressWrap');
    const count = document.getElementById('campProgressCount');
    const label = document.getElementById('campProgressLabel');
    if (wrap) wrap.style.display = 'block';

    // Blocchi: 50 messaggi poi pausa 5 minuti
    const BLOCCO = 50;
    const PAUSA_BLOCCO = 5 * 60 * 1000;
    const PAUSA_MSG = 2000;

    for (let i = 0; i < dormienti.length; i++) {
      const c = dormienti[i];
      if (count) count.textContent = `${i+1} / ${dormienti.length}`;
      if (label) label.textContent = `Invio a ${c.nome||''}...`;
      btn.textContent = `Invio ${i+1}/${dormienti.length}...`;

      try {
        const res = await fetch(DORMIENTI_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telefono: c.telefono,
            nome: c.nome || 'amico',
            clienteId: c.id,
            campagnaId,
            finestraOrdine: v.c_orario,
            percentuale: v.c_sconto
          })
        });
        if (res.ok) inviati++;
        else { errori++; console.warn(`Errore invio ${c.nome}:`, res.status); }
      } catch(e) {
        errori++;
        console.error(`Errore invio ${c.nome}:`, e.message);
      }

      // Pausa anti-blocco
      if (i < dormienti.length - 1) {
        if ((i+1) % BLOCCO === 0) {
          btn.textContent = `⏸ Pausa 5 min (blocco ${Math.ceil((i+1)/BLOCCO)})...`;
          if (label) label.textContent = `Pausa anti-blocco Meta — ripresa tra 5 minuti`;
          await new Promise(r => setTimeout(r, PAUSA_BLOCCO));
        } else {
          await new Promise(r => setTimeout(r, PAUSA_MSG));
        }
      }
    }

    btn.disabled = false;
    btn.textContent = '📤 Invia campagna';
    if (wrap) wrap.style.display = 'none';
    showToast(`✅ Campagna completata: ${inviati} inviati, ${errori} errori`);
    return;
  }

  const imgUrl = document.getElementById('campImmagineUrl').value.trim();
  if (cfg.richiedeImmagine !== false && !imgUrl) { showToast('Carica l\'immagine intestazione', 'error'); return; }

  const v = {};
  let campiOk = true;
  cfg.campi.forEach(f => {
    const val = (document.getElementById(f.id)||{}).value?.trim() || '';
    v[f.id] = val;
    if (!val) campiOk = false;
  });
  if (!campiOk) { showToast('Compila tutti i campi del messaggio', 'error'); return; }
  if (campClientiSelezionati.size === 0) { showToast('Seleziona almeno un cliente', 'error'); return; }

  const destinatari = (window.allClienti||[]).filter(c => campClientiSelezionati.has(c.id) && c.telefono);
  if (!destinatari.length) { showToast('Nessun destinatario con telefono', 'error'); return; }

  const ok = confirm(`Inviare "${document.getElementById('campTipo').selectedOptions[0].text}" a ${destinatari.length} client${destinatari.length===1?'e':'i'}?\n\nQuesta operazione non è reversibile.`);
  if (!ok) return;

  const btn = document.getElementById('btnInviaCamp');
  btn.disabled = true;
  btn.textContent = 'Invio in corso...';

  const wrap = document.getElementById('campProgressWrap');
  const bar = document.getElementById('campProgressBar');
  const count = document.getElementById('campProgressCount');
  const label = document.getElementById('campProgressLabel');
  const log = document.getElementById('campLogList');
  wrap.style.display = 'block';
  log.innerHTML = '';
  bar.style.width = '0%';

  let inviati = 0, errori = 0;
  const bloccoSize = parseInt(document.getElementById('campBloccoSize').value) || 50;
  const pausaMin = parseInt(document.getElementById('campPausaMin').value) || 5;
  const pausaSec = parseInt(document.getElementById('campPausaSec').value) || 2;

  // Genera ID univoco per questa campagna (per tracking conversioni)
  const campagnaId = `${tipo}_${Date.now()}`;

  for (let i = 0; i < destinatari.length; i++) {
    const c = destinatari[i];
    count.textContent = `${i+1} / ${destinatari.length}`;
    label.textContent = `Invio a ${c.nome} ${c.cognome||''}...`;

    try {
      // Genera codice promo personale se la campagna lo richiede
      let codicePersonale = null;
      if (cfg.generaCodice) {
        codicePersonale = _generaCodicePromo(c.nome);
        const scadenzaAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
        await addDoc(collection(db, 'codiciPromo'), {
          codice: codicePersonale,
          clienteId: c.id,
          telefono: tel(c),
          nomeCliente: c.nome + ' ' + (c.cognome||''),
          sconto: parseInt((v.c_sconto||'30').replace('%','')) || 30,
          tipo: 'percentuale',
          descrizione: 'Sconto riattivazione Club GREED',
          campagnaId,
          usato: false,
          scadenzaAt,
          createdAt: serverTimestamp()
        });
      }

      const payload = cfg.payload(c, v, imgUrl, codicePersonale);
      payload.clienteId = c.id;
      payload.campagnaId = campagnaId;
      const res = await fetch(N8N_CAMPAGNA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        inviati++;
        log.innerHTML += `<div style="color:var(--success)">✅ ${c.nome} ${c.cognome||''} (${tel(c)})</div>`;
      } else {
        errori++;
        log.innerHTML += `<div style="color:var(--red)">❌ ${c.nome} ${c.cognome||''} — HTTP ${res.status}</div>`;
      }
    } catch(e) {
      errori++;
      log.innerHTML += `<div style="color:var(--red)">❌ ${c.nome} ${c.cognome||''} — errore di rete</div>`;
    }

    bar.style.width = `${Math.round(((i+1)/destinatari.length)*100)}%`;
    log.scrollTop = log.scrollHeight;

    // Pausa tra messaggi
    if (i < destinatari.length - 1) {
      // Pausa lunga tra blocchi
      if ((i+1) % bloccoSize === 0) {
        const pausaMs = pausaMin * 60 * 1000;
        log.innerHTML += `<div style="color:var(--gold);font-weight:600">⏸ Pausa di ${pausaMin} min tra blocchi (${i+1}/${destinatari.length} inviati)...</div>`;
        log.scrollTop = log.scrollHeight;
        label.textContent = `⏸ Pausa di ${pausaMin} minuti...`;
        await new Promise(r => setTimeout(r, pausaMs));
      } else {
        // Pausa normale tra messaggi
        await new Promise(r => setTimeout(r, pausaSec * 1000));
      }
    }
  }

  label.textContent = `Completato: ${inviati} inviati${errori ? `, ${errori} errori` : ''}`;
  count.textContent = `${destinatari.length} / ${destinatari.length}`;
  btn.textContent = 'v Campagna inviata';
  showToast(`Campagna completata: ${inviati} messaggi inviati`, errori ? 'error' : '');
};

/* ─────────────────────────────────────────
   GIFT CARD
───────────────────────────────────────── */
const N8N_GIFT_URL = 'https://inviacampagna-u3jmxuuypq-ey.a.run.app';
let gcCorrenteId = null;

function generaCodiceGC() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'GREED-GIFT-';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

window.selezionaValore = function(val) {
  document.getElementById('gcValore').value = val;
  ['15','25','50'].forEach(v => {
    const btn = document.getElementById('gcBtn'+v);
    btn.className = 'btn ' + (String(val) === v ? 'btn-secondary' : 'btn-ghost');
  });
};

window.deselezionaBottoni = function() {
  ['15','25','50'].forEach(v => document.getElementById('gcBtn'+v).className = 'btn btn-ghost');
};

window.testGeneraGiftCard = async function() {
  const valore = parseFloat(document.getElementById('gcValore').value) || 15;
  const nome = document.getElementById('gcNome').value.trim() || 'Test';
  const numeroTest = (document.getElementById('gcNumeroTest').value || '+393476236679').replace(/\s/g,'');
  if (!confirm('Inviare gift card TEST (€' + valore + ') a ' + numeroTest + '?')) return;
  const btn = document.getElementById('btnTestGC');
  btn.disabled = true; btn.textContent = 'Invio...';
  try {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let codice = 'GREED-GIFT-TEST-';
    for (let i = 0; i < 4; i++) codice += chars[Math.floor(Math.random() * chars.length)];
    const res = await fetch(N8N_GIFT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template: 'greed_gift_card', telefono: numeroTest, nome, var2: '€' + valore, var3: codice, var4: '31 dicembre 2026' })
    });
    if (res.ok) alert('✅ Gift card test inviata a ' + numeroTest + '!\nCodice: ' + codice);
    else alert('❌ Errore HTTP ' + res.status);
  } catch(e) { alert('❌ Errore: ' + e.message); }
  btn.disabled = false; btn.textContent = '🧪 Test su di me';
};

window.generaGiftCard = async function() {
  const valore = parseFloat(document.getElementById('gcValore').value);
  const nome = document.getElementById('gcNome').value.trim();
  const telefono = document.getElementById('gcTelefono').value.trim();
  const note = document.getElementById('gcNote').value.trim();

  if (!valore || valore < 5) { showToast('Inserisci un valore valido', 'error'); return; }
  if (!nome) { showToast('Inserisci il nome del destinatario', 'error'); return; }
  if (!telefono) { showToast('Inserisci il telefono del destinatario', 'error'); return; }

  const btn = document.getElementById('btnGeneraGC');
  btn.disabled = true; btn.textContent = 'Generazione...';

  // Aggiorna label scadenza
  const annoLabel = document.getElementById('gcScadenzaLabel');
  if (annoLabel) annoLabel.textContent = `31 dicembre ${new Date().getFullYear()}`;

  const codice = generaCodiceGC();
  const annoCorrente = new Date().getFullYear();
  const scadenza = `31 dicembre ${annoCorrente}`;
  const tel = telefono.startsWith('+') ? telefono : `+39${telefono}`;

  try {
    // Salva su Firestore
    await addDoc(collection(db, 'giftcard'), {
      codice, valore, nome, telefono: tel, note,
      scadenza, annoScadenza: annoCorrente,
      stato: 'attiva',
      createdAt: serverTimestamp()
    });

    // Invia WhatsApp via Firebase Function
    await fetch(N8N_GIFT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template: 'greed_gift_card',
        telefono: tel,
        nome: nome.split(' ')[0],
        immagineUrl: 'https://firebasestorage.googleapis.com/v0/b/club-greed.firebasestorage.app/o/campagne%2Fgift_card_default.jpg?alt=media',
        var2: `€${valore}`,
        var3: codice,
        var4: scadenza
      })
    });

    showToast(`Gift Card ${codice} generata e inviata ✓`);
    document.getElementById('gcNome').value = '';
    document.getElementById('gcTelefono').value = '';
    document.getElementById('gcNote').value = '';
    document.getElementById('gcValore').value = '';
    deselezionaBottoni();
    loadGiftCards();
  } catch(e) {
    console.error(e);
    showToast('Errore generazione gift card', 'error');
  }

  btn.disabled = false; btn.textContent = '🎁 Genera e invia Gift Card';
};

window.verificaGiftCard = async function() {
  const codice = document.getElementById('gcCodiceRiscatto').value.trim().toUpperCase();
  if (!codice) { showToast('Inserisci un codice', 'error'); return; }

  try {
    const snap = await getDocs(query(collection(db, 'giftcard'), where('codice', '==', codice)));
    if (snap.empty) { showToast('Codice non trovato', 'error'); return; }

    const gc = snap.docs[0];
    const data = gc.data();
    gcCorrenteId = gc.id;

    const annoOggi = new Date().getFullYear();
    const scaduta = data.annoScadenza < annoOggi;
    const usata = data.stato === 'utilizzata';

    let info = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <div style="font-weight:600;font-size:16px">${data.nome}</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:700;color:var(--green)">€${data.valore}</div>
    </div>
    <div style="font-size:12px;color:var(--text-muted)">Codice: <strong>${data.codice}</strong></div>
    <div style="font-size:12px;color:var(--text-muted)">Scadenza: ${data.scadenza}</div>`;

    if (usata) {
      info += `<div style="margin-top:8px;color:var(--red);font-weight:600;font-size:13px">✗ Già utilizzata</div>`;
      document.getElementById('btnRiscatta').style.display = 'none';
    } else if (scaduta) {
      info += `<div style="margin-top:8px;color:var(--red);font-weight:600;font-size:13px">✗ Scaduta</div>`;
      document.getElementById('btnRiscatta').style.display = 'none';
    } else {
      info += `<div style="margin-top:8px;color:var(--success);font-weight:600;font-size:13px">✓ Valida</div>`;
      document.getElementById('btnRiscatta').style.display = 'block';
    }

    document.getElementById('gcVerificaInfo').innerHTML = info;
    document.getElementById('gcVerificaResult').style.display = 'block';
  } catch(e) {
    showToast('Errore verifica', 'error');
  }
};

window.riscattaGiftCard = async function() {
  if (!gcCorrenteId) return;
  try {
    await updateDoc(doc(db, 'giftcard', gcCorrenteId), {
      stato: 'utilizzata',
      utilizzataAt: serverTimestamp()
    });
    showToast('Gift Card riscattata ✓');
    document.getElementById('gcCodiceRiscatto').value = '';
    document.getElementById('gcVerificaResult').style.display = 'none';
    gcCorrenteId = null;
    loadGiftCards();
  } catch(e) {
    showToast('Errore riscatto', 'error');
  }
};

window.loadGiftCards = async function() {
  const div = document.getElementById('gcList');
  div.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Caricamento...</div>';
  try {
    const snap = await getDocs(query(collection(db, 'giftcard'), orderBy('createdAt', 'desc'), limit(100)));
    const cards = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (!cards.length) {
      div.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-muted)">Nessuna gift card emessa</div>';
      return;
    }
    div.innerHTML = `<table style="width:100%;border-collapse:collapse">
      <thead><tr style="background:var(--cream);font-size:11px;font-weight:600;letter-spacing:.8px;text-transform:uppercase;color:var(--text-muted)">
        <th style="padding:10px 16px;text-align:left">Codice</th>
        <th style="padding:10px 16px;text-align:left">Destinatario</th>
        <th style="padding:10px 16px;text-align:left">Telefono</th>
        <th style="padding:10px 16px;text-align:right">Valore</th>
        <th style="padding:10px 16px;text-align:center">Scadenza</th>
        <th style="padding:10px 16px;text-align:center">Stato</th>
      </tr></thead>
      <tbody>${cards.map(gc => {
        const statoColor = gc.stato === 'utilizzata' ? 'var(--text-muted)' : 'var(--success)';
        const statoLabel = gc.stato === 'utilizzata' ? '✗ Usata' : '✓ Attiva';
        return `<tr style="border-top:1px solid var(--border)">
          <td style="padding:10px 16px;font-family:monospace;font-size:13px;font-weight:600;color:var(--green)">${gc.codice}</td>
          <td style="padding:10px 16px;font-size:13px">${gc.nome}</td>
          <td style="padding:10px 16px;font-size:12px;color:var(--text-muted)">${gc.telefono||'-'}</td>
          <td style="padding:10px 16px;text-align:right;font-weight:700;font-family:'Cormorant Garamond',serif;font-size:18px">€${gc.valore}</td>
          <td style="padding:10px 16px;text-align:center;font-size:12px;color:var(--text-muted)">${gc.scadenza}</td>
          <td style="padding:10px 16px;text-align:center;font-size:12px;font-weight:600;color:${statoColor}">${statoLabel}</td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
  } catch(e) {
    div.innerHTML = '<div style="padding:24px;text-align:center;color:var(--red)">Errore caricamento</div>';
  }
};

/* -- EXPORT EXCEL 3 FOGLI -- */
window.exportOrdiniExcel = async function() {
  const ordini = window._ordiniCache;
  if (!ordini.length) { showToast('Nessun ordine da esportare', 'error'); return; }

  // Carica SheetJS
  if (!window.XLSX) {
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  const XLSX = window.XLSX;

  function rigaOrdine(o, metodo) {
    const data = o.createdAt?.toDate ? o.createdAt.toDate() : null;
    const dataStr = data ? data.toLocaleDateString('it-IT') : '-';
    const oraStr = data ? data.toLocaleTimeString('it-IT', {hour:'2-digit',minute:'2-digit'}) : '-';
    const gusti = o.carrello?.map(i => i.gusti?.join('+') + (i.scorta?' [scorta:'+i.scorta+']':'')).join(' | ') || '-';
    return {
      'ID Ordine': o.ordineId || '-',
      'Data': dataStr,
      'Ora': oraStr,
      'Nome': (o.nome||'') + ' ' + (o.cognome||''),
      'Telefono': o.telefono || '-',
      'Email': o.email || '-',
      'Gusti': gusti,
      'Totale (€)': parseFloat((o.totale||0).toFixed(2)),
      'Promo': o.promo ? 'Sì' : 'No',
      'Metodo': metodo,
      'Stato': o.stato || '-'
    };
  }

  const tuttiStripe = ordini.filter(o => !o.metodoPagamento || o.metodoPagamento === 'stripe' || o.stripeSessionId);
  const tuttiPaypal = ordini.filter(o => o.metodoPagamento === 'paypal');

  const foglio1 = ordini.map(o => rigaOrdine(o, o.metodoPagamento === 'paypal' ? 'PayPal' : 'Stripe'));
  const foglio2 = tuttiStripe.map(o => rigaOrdine(o, 'Stripe'));
  const foglio3 = tuttiPaypal.map(o => rigaOrdine(o, 'PayPal'));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(foglio1.length ? foglio1 : [{'Info':'Nessuna transazione'}]), 'Tutte le transazioni');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(foglio2.length ? foglio2 : [{'Info':'Nessuna transazione Stripe'}]), 'Stripe');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(foglio3.length ? foglio3 : [{'Info':'Nessuna transazione PayPal'}]), 'PayPal');

  // Larghezze colonne
  [foglio1, foglio2, foglio3].forEach((_, i) => {
    const ws = wb.Sheets[wb.SheetNames[i]];
    ws['!cols'] = [
      {wch:18},{wch:12},{wch:8},{wch:22},{wch:16},{wch:28},{wch:40},{wch:10},{wch:8},{wch:10},{wch:14}
    ];
  });

  const filename = `GREED_Transazioni_${new Date().toISOString().slice(0,10)}.xlsx`;
  XLSX.writeFile(wb, filename);
  showToast('Excel scaricato ✓');
};


// ══════════════════════════════════════════════════════════════
// SEZIONE EVENTI — Firebase v9 modular SDK
// ══════════════════════════════════════════════════════════════

let _eventoCorrente = {
  nome: 'Degustazione Vellutà al Tiramisù',
  data: '2026-07-20',
  ora: '18:00',
  luogo: 'Frascati, Piazza Roma 16',
  template: 'greed_appuntamento',
  id: 'evt_20260720_' + Date.now()
};
let _eventoFiltro = 'tutti';
let _eventoDestinatari = [];
let _eventoPresentiUnsub = null;

window.openModalEvento = function openModalEvento() {
  document.getElementById('eventoNomeInput').value = _eventoCorrente.nome;
  document.getElementById('eventoDataInput').value = _eventoCorrente.data;
  document.getElementById('eventoOraInput').value = _eventoCorrente.ora;
  document.getElementById('eventoLuogoInput').value = _eventoCorrente.luogo;
  document.getElementById('eventoTemplateInput').value = _eventoCorrente.template;
  openModal('modalEvento');
}

window.salvaEvento = function salvaEvento() {
  _eventoCorrente.nome = document.getElementById('eventoNomeInput').value.trim() || _eventoCorrente.nome;
  _eventoCorrente.data = document.getElementById('eventoDataInput').value || _eventoCorrente.data;
  _eventoCorrente.ora = document.getElementById('eventoOraInput').value || _eventoCorrente.ora;
  _eventoCorrente.luogo = document.getElementById('eventoLuogoInput').value.trim() || _eventoCorrente.luogo;
  _eventoCorrente.template = document.getElementById('eventoTemplateInput').value.trim() || _eventoCorrente.template;
  _eventoCorrente.id = 'evt_' + _eventoCorrente.data.replace(/-/g,'') + '_' + Date.now();

  document.getElementById('eventoNomeDisplay').textContent = _eventoCorrente.nome;
  const dataFmt = new Date(_eventoCorrente.data + 'T12:00:00').toLocaleDateString('it-IT', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  document.getElementById('eventoInfoDisplay').textContent = dataFmt + ' · ore ' + _eventoCorrente.ora + ' · ' + _eventoCorrente.luogo;

  addDoc(collection(db, 'eventi'), {
    ..._eventoCorrente,
    createdAt: serverTimestamp()
  }).catch(e => console.error('Errore salva evento:', e));

  closeModal('modalEvento');
  _caricaDestinatari();
}

window.setFiltroEvento = function setFiltroEvento(filtro, btn) {
  _eventoFiltro = filtro;
  document.querySelectorAll('.filtro-evt').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  _caricaDestinatari();
}

async function _caricaDestinatari() {
  const countEl = document.getElementById('eventoDestinatariCount');
  if (countEl) countEl.textContent = 'Caricamento...';
  try {
    const snap = await getDocs(collection(db, 'clienti'));
    const ora = Date.now();
    let lista = [];
    snap.forEach(docSnap => {
      const c = { id: docSnap.id, ...docSnap.data() };
      if (!c.telefono) return;
      const freq = c.numeroAcquisti || 0;
      const ultimo = c.ultimoAcquisto?.seconds ? c.ultimoAcquisto.seconds * 1000 : null;
      const giorniInattivo = ultimo ? Math.floor((ora - ultimo) / 86400000) : 999;
      const rfm = typeof getRFM === 'function' ? getRFM(c) : { label: '-' };

      if (_eventoFiltro === 'tutti') lista.push(c);
      else if (_eventoFiltro === 'attivi' && giorniInattivo <= 60 && freq > 0) lista.push(c);
      else if (_eventoFiltro === 'dormienti' && (freq === 0 || giorniInattivo > 60)) lista.push(c);
      else if (_eventoFiltro === 'champion' && (rfm.label === 'Champion' || rfm.label === 'Fedele')) lista.push(c);
    });
    _eventoDestinatari = lista;
    if (countEl) countEl.textContent = lista.length + ' destinatari selezionati';
    document.getElementById('statInvitati').textContent = lista.length;
  } catch(e) {
    console.error('Errore carica destinatari:', e);
    const countEl = document.getElementById('eventoDestinatariCount');
    if (countEl) countEl.textContent = 'Errore caricamento';
  }
}

window.setOrarioSubito = function() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('eventoOrarioInvio').value = now.toISOString().slice(0,16);
};


window.testInvioEvento = async function testInvioEvento() {
  const btn = document.getElementById('btnTestEvento');
  const numeroTest = (document.getElementById('eventoNumeroTest').value || '+393476236679').replace(/\s/g,'');
  if (!numeroTest) { alert('Inserisci un numero di test'); return; }
  if (!confirm('Inviare messaggio di test a ' + numeroTest + '?')) return;
  btn.disabled = true;
  btn.textContent = 'Invio test...';
  try {
    const FUNCTION_URL = 'https://europe-west3-club-greed.cloudfunctions.net/inviaMessaggiEvento';
    const res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        eventoId: _eventoCorrente.id, 
        testNumero: numeroTest,
        eventoData: _eventoCorrente
      })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Errore server');
    alert('✅ Messaggio test inviato a ' + numeroTest + '!\nControlla il tuo WhatsApp.');
  } catch(e) {
    alert('❌ Errore: ' + e.message);
  }
  btn.disabled = false;
  btn.textContent = '🧪 Test su di me';
};

window.inviaInvitiEvento = async function inviaInvitiEvento() {
  const btn = document.getElementById('btnInviaEvento');
  if (!_eventoDestinatari.length) { alert('Nessun destinatario selezionato'); return; }

  const orarioInput = document.getElementById('eventoOrarioInvio').value;
  if (!orarioInput) { alert('Seleziona un orario di invio oppure clicca "Invia subito"'); return; }

  const orarioPianificato = new Date(orarioInput);
  const ora = new Date();
  const minutiDiff = Math.round((orarioPianificato - ora) / 60000);

  let messaggio = 'Inviare inviti a ' + _eventoDestinatari.length + ' clienti';
  if (minutiDiff > 1) {
    messaggio += '\nInvio pianificato tra ' + minutiDiff + ' minuti (' + orarioPianificato.toLocaleTimeString('it-IT', {hour:'2-digit',minute:'2-digit'}) + ')';
  } else {
    messaggio += '\nInvio immediato';
  }
  if (!confirm(messaggio + '?')) return;

  // Se è pianificato nel futuro, aspetta
  if (minutiDiff > 1) {
    btn.disabled = true;
    btn.textContent = 'In attesa... (' + orarioPianificato.toLocaleTimeString('it-IT', {hour:'2-digit',minute:'2-digit'}) + ')';
    const msAttesa = orarioPianificato - new Date();
    await new Promise(r => setTimeout(r, msAttesa));
  }

  btn.disabled = true;
  btn.textContent = 'Invio in corso...';

  try {
    // 1) Assicura che l'evento esista su Firestore con il filtro corrente
    const eventoId = _eventoCorrente.id;
    await setDoc(doc(db, 'eventi', eventoId), {
      ..._eventoCorrente,
      filtroDestinatari: _eventoFiltro,
      updatedAt: serverTimestamp()
    }, { merge: true });

    // 2) Chiama la Firebase Function che fa l'invio reale
    const FUNCTION_URL = 'https://europe-west3-club-greed.cloudfunctions.net/inviaMessaggiEvento';
    const res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventoId })
    });
    const result = await res.json();

    if (!res.ok) throw new Error(result.error || 'Errore server');

    btn.disabled = false;
    btn.textContent = 'Invia inviti →';
    alert('✅ Messaggi inviati: ' + result.inviati +
      (result.errori > 0 ? '\n⚠️ Errori: ' + result.errori : ''));

  } catch(e) {
    console.error('Errore inviaInvitiEvento:', e);
    btn.disabled = false;
    btn.textContent = 'Invia inviti →';
    alert('❌ Errore durante l\'invio: ' + e.message);
  }
}

function _avviaListenerPresenti() {
  if (_eventoPresentiUnsub) _eventoPresentiUnsub();
  const { Timestamp } = window._fbTimestamp || {};
  try {
    const dataInizio = new Date(_eventoCorrente.data + 'T00:00:00');
    const dataFine = new Date(_eventoCorrente.data + 'T23:59:59');
    
    import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js').then(({ onSnapshot, query: q2, where: w2, collection: col2, Timestamp: TS }) => {
      const qSnap = q2(col2(db, 'checkins'),
        w2('timestamp', '>=', TS.fromDate(dataInizio)),
        w2('timestamp', '<=', TS.fromDate(dataFine))
      );
      _eventoPresentiUnsub = onSnapshot(qSnap, snap => {
        const tbody = document.getElementById('eventoPresentiTable');
        if (!tbody) return;
        if (snap.empty) {
          tbody.innerHTML = '<tr><td colspan="6"><div class="empty"><div class="empty-icon">🎉</div><div class="empty-text">Nessuna presenza ancora</div></div></td></tr>';
          document.getElementById('statPresenti').textContent = '0';
          document.getElementById('statMedPunti').textContent = '0';
          document.getElementById('statConv').textContent = '0%';
          return;
        }
        let rows = ''; let totalePunti = 0; let count = 0;
        snap.forEach(d => {
          const ch = d.data();
          const ora = ch.timestamp?.toDate ? ch.timestamp.toDate().toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit' }) : '--:--';
          const livello = typeof getLivello === 'function' ? getLivello(ch.punti || 0) : { nome: '-', colore: '#999' };
          totalePunti += ch.punti || 0; count++;
          rows += '<tr><td><strong>' + (ch.nome||'') + ' ' + (ch.cognome||'') + '</strong></td>' +
            '<td>' + ora + '</td>' +
            '<td><span style="background:' + (livello.colore||'#eee') + '22;color:' + (livello.colore||'#666') + ';padding:2px 8px;border-radius:20px;font-size:12px">' + (livello.nome||'-') + '</span></td>' +
            '<td>' + (ch.punti||0) + '</td>' +
            '<td>' + (ch.numeroAcquisti||0) + '</td>' +
            '<td><small>' + (ch.rfm||'-') + '</small></td></tr>';
        });
        tbody.innerHTML = rows;
        document.getElementById('statPresenti').textContent = count;
        document.getElementById('statMedPunti').textContent = count ? Math.round(totalePunti/count) : 0;
        const conv = _eventoDestinatari.length ? Math.round(count/_eventoDestinatari.length*100) : 0;
        document.getElementById('statConv').textContent = conv + '%';
      });
    });
  } catch(e) { console.error('Errore listener presenti:', e); }
}

window.esportaPresenti = function esportaPresenti() {
  const rows = document.querySelectorAll('#eventoPresentiTable tr');
  if (!rows.length) return;
  let csv = 'Nome,Ora arrivo,Livello,Punti,Visite,Segmento\n';
  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    if (!cells.length) return;
    const vals = Array.from(cells).map(c => '"' + c.innerText.replace(/\n.*/,'').trim() + '"');
    csv += vals.join(',') + '\n';
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'presenti_' + _eventoCorrente.id + '.csv';
  a.click();
}

// Hook in showView
const _origShowViewEventi = window.showView;
window.showView = function(name) {
  _origShowViewEventi(name);
  if (name === 'eventi') {
    // Aggiorna display evento
    const dataFmt = new Date(_eventoCorrente.data + 'T12:00:00').toLocaleDateString('it-IT', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
    document.getElementById('eventoNomeDisplay').textContent = _eventoCorrente.nome;
    document.getElementById('eventoInfoDisplay').textContent = dataFmt + ' · ore ' + _eventoCorrente.ora + ' · ' + _eventoCorrente.luogo;
    _caricaDestinatari();
    _avviaListenerPresenti();
  }
};