// ═══════════════════════════════════════════════════════════════════════════
// 🧾 FOGLIETTO PRODOTTO — vaschette e semifreddi da asporto
// Si scelgono i gusti, si stampa sulla Epson del banco: ingredienti (allergeni in evidenza),
// allergeni, tracce e come conservarlo. Ingredienti presi dalle ricette del gestionale
// (ricette_lab), con le basi e gli ingredienti composti aperti come nel Libro ingredienti.
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  const ALLERGENI_REGOLE = [
    { k: 'LATTE', re: /\blatte\b(?!\s+di\s+(cocco|soia|mandorl|riso|avena))|panna(?!\s+(soia|vegetale|da cucina alpro))|\bburro\b(?!\s+di\s+(cacao|arachid))|yogurt(?!\s+soia)|ricotta|mascarpone|philadelphia|stracchino|pecorino|parmigiano|caseina|siero di latte|lattosio|formaggi/i },
    { k: 'UOVA', re: /tuorl|\buov[oa]|albume|maionese|savoiard/i },
    { k: 'GLUTINE', re: /frumento|\bgrano\b|farina\s+(di\s+)?(grano|frumento|00|0\b|farro|orzo|segale)|\borzo\b|segale|\bavena\b(?!.*senza glutine)|farro|kamut|biscott(?!.*senza glutine)|\bpane\b|pangrattato|briciole|birra|\bmalto\b/i },
    { k: 'FRUTTA A GUSCIO', re: /pistacch|mandorl|nocciol|\bnoc[ei]\b(?!\s+moscata)|anacard|\bpecan|macadamia|noci del brasile|gianduia|pralinat|torrone/i },
    { k: 'ARACHIDI', re: /arachid|peanut/i },
    { k: 'SOIA', re: /\bsoia\b|tofu|edamame/i },
    { k: 'PESCE', re: /\balic[ie]\b|acciug|colatura|tonno|baccal|salmone|merluzz|pesce|sgombr|sardin|worcestershire/i },
    { k: 'CROSTACEI', re: /gamber|scamp|aragost|granchi|crostace/i },
    { k: 'MOLLUSCHI', re: /cozz|vongol|polp[oi]|calamar|seppi|ostric/i },
    { k: 'SEDANO', re: /sedano/i },
    { k: 'SENAPE', re: /senape/i },
    { k: 'SESAMO', re: /sesamo|tahin/i },
    { k: 'SOLFITI', re: /\bvino\b|marsala|barolo|frascati|moscato|prosecco|vin santo|pedro xim|\baceto\b|spumante|passito|solfit|anidride solforosa/i },
    { k: 'LUPINI', re: /lupin/i },
  ];
  const MAN_ALG = { latte: 'LATTE', uov: 'UOVA', glutin: 'GLUTINE', guscio: 'FRUTTA A GUSCIO', arachid: 'ARACHIDI', soia: 'SOIA', pesce: 'PESCE', crostace: 'CROSTACEI', mollusc: 'MOLLUSCHI', sedano: 'SEDANO', senape: 'SENAPE', sesamo: 'SESAMO', solfit: 'SOLFITI', lupin: 'LUPINI' };
  const ORDINE_ALG = ALLERGENI_REGOLE.map(a => a.k);
  // Stessi componenti del Libro ingredienti (schede tecniche dei fornitori)
  const PRECOMPILATI = [
    { re: /pasta.*pistacch|pistacchio.*(pasta|green|puro)/i, componenti: 'pistacchi 100%', tracce: 'altra frutta a guscio (mandorle, nocciole)' },
    { re: /pasta.*nocciol.*igp|nocciol.*igp.*pasta|nocciola piemonte/i, componenti: 'nocciole Piemonte IGP tostate 100%', tracce: '' },
    { re: /pasta.*nocciol|nocciol.*pasta/i, componenti: 'nocciole tostate 100% (Tonda Gentile Romana)', tracce: '' },
    { re: /meringa/i, componenti: 'zucchero, albume d\'uovo, acqua', tracce: '' },
    { re: /bombe|bomba/i, componenti: 'zucchero, tuorlo d\'uovo, acqua', tracce: '' },
    { re: /proteine.*patata/i, componenti: 'proteine di patata', tracce: 'latte' },
    { re: /pan di spagna/i, componenti: 'uova, fecola di patate, zucchero, sciroppo di glucosio, umidificante: glicerolo; emulsionante: mono e digliceridi degli acidi grassi (E471); fibra di barbabietola, addensante: gomma di guar; sale, conservante: E202; aroma', tracce: 'latte, lupini' },
    { re: /con[oi]\b.*(senza glutine|gf)|mini ?con|conett/i, componenti: 'farina di riso, amido di mais, fecola di patate, farina di soia, zucchero, olio di semi di girasole alto oleico, emulsionante: lecitina di soia; sale, zucchero caramellizzato, agente lievitante: bicarbonato di sodio; addensanti: gomma guar, gomma xantano; aroma naturale', tracce: '' },
  ];
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const slug = s => norm(s).replace(/ /g, '-').slice(0, 120) || 'x';
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function bello(n) {
    const piccole = new Set(['di', 'del', 'della', 'delle', 'dei', 'e', 'con', 'al', 'alla', 'allo', 'ai', 'd', 'in', 'da', 'a']);
    const sigle = new Set(['dop', 'igp', 'bio', 'gf']);
    return String(n || '').toLowerCase().split(/\s+/).map((w, i) => sigle.has(w) ? w.toUpperCase() : (i > 0 && piccole.has(w)) ? w : w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
  const minuscolo = n => String(n || '').toLowerCase().replace(/\b(dop|igp|bio|gf)\b/g, m => m.toUpperCase());
  const eBase = r => r && (r.tipo === 'base' || /^base\b|\bbase\s+(bianca|gialla|latte|frutta|neutra|vegan)/i.test(r.nome));

  let RIC = [], COMP = {}, VOCI = {}, VETRINA = [], SCELTI = [], CERCA = '', CARICATO = false;

  const trovaBase = nome => { const n = norm(nome); return RIC.find(r => eBase(r) && norm(r.nome) === n); };
  function dicitura(nome, prof = 0) {
    const base = prof < 2 && trovaBase(nome);
    if (base && (base.ingredienti || []).length) {
      const dentro = [...base.ingredienti].filter(i => +i.d > 0).sort((a, b) => b.d - a.d).map(i => dicitura(i.nome, prof + 1));
      return { testo: `${minuscolo(nome)} (${dentro.map(x => x.testo).join(', ')})`, tracce: dentro.flatMap(x => x.tracce) };
    }
    const c = COMP[slug(nome)];
    if (c && !c.semplice && c.componenti) return { testo: `${minuscolo(nome)} (${c.componenti})`, tracce: c.tracce ? [c.tracce] : [] };
    const p = !c && PRECOMPILATI.find(x => x.re.test(nome));
    if (p) return { testo: `${minuscolo(nome)} (${p.componenti})`, tracce: p.tracce ? [p.tracce] : [] };
    return { testo: minuscolo(nome), tracce: [] };
  }
  // Un gusto pronto per il foglietto: nome (quello delle etichette, se c'è), ingredienti, allergeni, tracce
  function prodotto(r, k) {
    const v = VOCI[k] || {};
    const ing = [...(r.ingredienti || [])].filter(i => i.nome && +i.d > 0).sort((a, b) => b.d - a.d);
    const parti = ing.map(i => dicitura(i.nome));
    const testo = parti.length ? parti.map(p => p.testo).join(', ') : String(r.lista_ing || '').trim();
    const set = new Set();
    ALLERGENI_REGOLE.forEach(a => { if (a.re.test(testo)) set.add(a.k); });
    const man = String(r.allergeni || '').toLowerCase();
    Object.entries(MAN_ALG).forEach(([x, y]) => { if (man.includes(x)) set.add(y); });
    (v.al_extra || []).forEach(a => set.add(a));
    const allergeni = [...set].sort((a, b) => ORDINE_ALG.indexOf(a) - ORDINE_ALG.indexOf(b));
    const tracce = [...new Set(parti.flatMap(p => p.tracce).join(', ').split(/,\s*/).map(s => s.trim()).filter(Boolean))];
    const nome = String(v.it || '').trim() || bello(r.nome);
    const semifreddo = r.tipo === 'semifreddo' || /semifredd/i.test(r.nome);
    return { k, nome: v.sub ? `${nome} - ${v.sub}` : nome, testo, allergeni, tracce, semifreddo };
  }
  // Gusti che si possono scegliere: ricette (anche semifreddi) + copie create nelle etichette; niente basi e niente doppioni tolti
  function catalogo() {
    const per = {}; RIC.forEach(r => { if (!eBase(r)) per[String(r.nome).toUpperCase()] = r; });
    const out = [];
    Object.entries(per).forEach(([k, r]) => { if (!(VOCI[k] || {}).nascosta && ((r.ingredienti || []).length || r.lista_ing)) out.push(prodotto(r, k)); });
    Object.entries(VOCI).forEach(([k, v]) => { if (v && v.copiaDi && per[v.copiaDi]) out.push(prodotto(per[v.copiaDi], k)); });
    const inV = p => VETRINA.some(n => { const a = norm(n), b = norm(p.nome); return a === b || (a.length > 4 && (b.includes(a) || a.includes(b))); });
    return out.map(p => ({ ...p, vetrina: inV(p) })).sort((a, b) => (b.vetrina - a.vetrina) || a.nome.localeCompare(b.nome, 'it'));
  }

  async function carica() {
    const box = document.getElementById('fogliettoLista');
    box.innerHTML = '<div style="padding:20px;color:var(--text-muted)">⏳ Carico le ricette…</div>';
    try {
      const [ric, comp, voci, gusti] = await Promise.all([
        getDocs(collection(db, 'ricette_lab')),
        getDocs(collection(db, 'ingredienti_composti')).catch(() => null),
        getDoc(doc(db, 'config', 'etichette')).catch(() => null),
        getDoc(doc(db, 'config', 'gusti')).catch(() => null),
      ]);
      RIC = ric.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => r.nome && !r.eliminata);
      COMP = {}; if (comp) comp.forEach(d => COMP[d.id] = d.data());
      VOCI = (voci && voci.exists() && voci.data().voci) || {};
      VETRINA = ((gusti && gusti.exists() && gusti.data().lista) || []).filter(g => g && (g.a || g.attivo) && g.n).map(g => g.n);
      CARICATO = true; disegna();
    } catch (e) { box.innerHTML = '<div style="padding:20px;color:var(--red)">⚠️ Ricette non disponibili: ' + esc(e.message) + '</div>'; }
  }

  function disegna() {
    const tutti = catalogo(), q = norm(CERCA);
    const lista = tutti.filter(p => !q || norm(p.nome).includes(q));
    const scelti = SCELTI.map(k => tutti.find(p => p.k === k)).filter(Boolean);
    document.getElementById('fogliettoScelti').innerHTML = scelti.length
      ? scelti.map((p, i) => `<span style="display:inline-flex;align-items:center;gap:6px;background:var(--green);color:#fff;border-radius:20px;padding:6px 12px;margin:3px;font-size:14px">${esc(p.nome)}${p.semifreddo ? ' 🍰' : ''}<a href="#" onclick="fogliettoTogli(${i});return false" style="color:var(--yellow);text-decoration:none;font-weight:700">✕</a></span>`).join('')
      : '<span style="color:var(--text-muted)">Tocca i gusti della vaschetta qui sotto.</span>';
    document.getElementById('fogliettoStampa').disabled = !scelti.length;
    document.getElementById('fogliettoLista').innerHTML = lista.length ? lista.map(p => `<button type="button" onclick="fogliettoAggiungi('${esc(p.k).replace(/'/g, "\\'")}')"
      style="text-align:left;background:${SCELTI.includes(p.k) ? 'var(--cream-dark)' : 'var(--white)'};border:1px solid var(--border);border-radius:10px;padding:10px 12px;cursor:pointer;font-family:inherit;font-size:14px;min-height:48px">
      <b>${esc(p.nome)}</b>${p.semifreddo ? ' 🍰' : ''}${p.vetrina ? ' <span style="font-size:11px;color:var(--success)">● oggi</span>' : ''}
      <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${p.allergeni.length ? esc(p.allergeni.join(', ')) : 'nessun allergene'}</div></button>`).join('')
      : '<div style="padding:20px;color:var(--text-muted)">Nessun gusto trovato.</div>';
    document.getElementById('fogliettoAnteprima').innerHTML = scelti.length ? anteprimaHtml(scelti) : '';
  }

  // ── Testo del foglietto (uguale per stampa e anteprima) ──
  function conservazione(scelti) {
    const r = ['Conservare in freezer a -18 °C.'];
    const g = scelti.some(p => !p.semifreddo), s = scelti.some(p => p.semifreddo);
    if (g) r.push('Gelato: toglierlo dal freezer 30-40 minuti prima di servirlo.');
    if (s) r.push('Semifreddo: toglierlo dal freezer 15 minuti prima di servirlo.');
    r.push('Da gustare il prima possibile. Una volta scongelato non ricongelare.');
    return r;
  }
  const senzaGlutine = scelti => !scelti.some(p => p.allergeni.includes('GLUTINE'));
  // Spezza il testo degli ingredienti in parole, segnando in grassetto (e maiuscolo) le parole con allergeni
  function paroleConAllergeni(testo) {
    const segni = new Array(testo.length).fill(false);
    ALLERGENI_REGOLE.forEach(a => { const re = new RegExp(a.re.source, 'gi'); let m; while ((m = re.exec(testo))) { for (let i = m.index; i < m.index + m[0].length; i++) segni[i] = true; if (!m[0].length) re.lastIndex++; } });
    const out = []; const re = /\S+/g; let m;
    while ((m = re.exec(testo))) { let b = false; for (let i = m.index; i < m.index + m[0].length; i++) if (segni[i]) b = true; out.push({ t: b ? m[0].toUpperCase() : m[0], b }); }
    return out;
  }
  function anteprimaHtml(scelti) {
    const parola = w => w.b ? `<b>${esc(w.t)}</b>` : esc(w.t);
    return `<div style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;line-height:1.45;background:#fff;border:1px dashed var(--border);border-radius:8px;padding:14px;max-width:380px">
      <div style="text-align:center"><b style="font-size:18px">GREED</b><br>Gelateria Naturale · Frascati<br>- - - - - - - - - - - - - - - -</div>
      ${scelti.map(p => `<div style="margin:10px 0"><b style="font-size:14px">${esc(p.nome.toUpperCase())}</b>${p.semifreddo ? ' (semifreddo)' : ''}<br>
        Ingredienti: ${paroleConAllergeni(p.testo).map(parola).join(' ')}<br>
        <b>Allergeni: ${p.allergeni.length ? esc(p.allergeni.join(', ')) : 'nessuno'}</b>${p.tracce.length ? `<br>Può contenere tracce di: ${esc(p.tracce.join(', '))}` : ''}</div>`).join('<div>- - - - - - - - - - - - - - - -</div>')}
      <div style="text-align:center">- - - - - - - - - - - - - - - -</div>
      <div>${conservazione(scelti).map(esc).join('<br>')}</div>
      ${senzaGlutine(scelti) ? '<div style="margin-top:6px;text-align:center"><b>Prodotto senza glutine</b></div>' : ''}
      <div style="text-align:center;margin-top:6px">GREED Srl · Piazza Roma 16, Frascati</div></div>`;
  }

  // ── ESC/POS per la Epson TM-m30III (rotolo 80 mm, 48 caratteri per riga) ──
  const COLONNE = 48;
  function codifica(s) { // _cp858 del programma del banco + il simbolo dei gradi
    const parti = String(s).split('°'), pezzi = [];
    parti.forEach((p, i) => { if (i) pezzi.push(new Uint8Array([0xF8])); pezzi.push(_cp858(p)); });
    const out = new Uint8Array(pezzi.reduce((t, x) => t + x.length, 0)); let o = 0; pezzi.forEach(x => { out.set(x, o); o += x.length; }); return out;
  }
  function escPos(scelti) {
    const ch = [], cmd = (...b) => ch.push(new Uint8Array(b)), txt = s => ch.push(codifica(s));
    const bold = on => cmd(0x1B, 0x45, on ? 1 : 0);
    // a capo a 48 colonne rispettando le parole, con il grassetto parola per parola
    const paragrafo = (parole) => { let riga = 0;
      parole.forEach(w => { const lung = w.t.length + (riga ? 1 : 0);
        if (riga && riga + lung > COLONNE) { txt('\n'); riga = 0; }
        if (riga) txt(' '); bold(w.b); txt(w.t); bold(false); riga += w.t.length + (riga ? 1 : 0);
        while (riga > COLONNE) riga -= COLONNE; });
      txt('\n'); };
    const semplice = (s, b) => paragrafo(String(s).split(/\s+/).filter(Boolean).map(t => ({ t, b: !!b })));
    cmd(0x1B, 0x40); cmd(0x1B, 0x74, 19);             // init + tabella caratteri CP858
    cmd(0x1B, 0x61, 1); cmd(0x1D, 0x21, 0x11); txt('GREED\n'); cmd(0x1D, 0x21, 0x00);
    txt('Gelateria Naturale \xB7 Frascati\n'.replace('\xB7', '-'));
    txt('- - - - - - - - - - - - - - - - - - - - - - - -\n');
    cmd(0x1B, 0x61, 0);
    scelti.forEach((p, i) => {
      if (i) txt('- - - - - - - - - - - - - - - - - - - - - - - -\n');
      txt('\n'); bold(true); cmd(0x1D, 0x21, 0x01); semplice(p.nome.toUpperCase() + (p.semifreddo ? ' (semifreddo)' : ''), true); cmd(0x1D, 0x21, 0x00); bold(false);
      paragrafo([{ t: 'Ingredienti:', b: false }, ...paroleConAllergeni(p.testo)]);
      semplice('Allergeni: ' + (p.allergeni.length ? p.allergeni.join(', ') : 'nessuno'), true);
      if (p.tracce.length) semplice('Può contenere tracce di: ' + p.tracce.join(', '));
    });
    txt('\n- - - - - - - - - - - - - - - - - - - - - - - -\n');
    conservazione(scelti).forEach(r => semplice(r));
    if (senzaGlutine(scelti)) { cmd(0x1B, 0x61, 1); txt('\n'); semplice('PRODOTTO SENZA GLUTINE', true); }
    cmd(0x1B, 0x61, 1); txt('\nGREED Srl - Piazza Roma 16, Frascati\n\n\n\n');
    cmd(0x1D, 0x56, 0x41, 0x03);
    const out = new Uint8Array(ch.reduce((t, c) => t + c.length, 0)); let o = 0; ch.forEach(c => { out.set(c, o); o += c.length; }); return out;
  }
  // Stesso foglietto in formato ePOS XML, per la stampa tramite il server quando la USB non risponde
  function xmlEpos(scelti) {
    const e = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const t = (s, o = {}) => `<text${o.al ? ` align="${o.al}"` : ''} em="${o.b ? 'true' : 'false'}"${o.dh ? ' dh="true"' : ' dh="false"'}${o.dw ? ' dw="true"' : ' dw="false"'}>${e(s)}</text>`;
    let x = t('GREED\n', { al: 'center', b: true, dh: true, dw: true }) + t('Gelateria Naturale - Frascati\n', { al: 'center' }) + t('- - - - - - - - - - - - - - - -\n', { al: 'center' });
    scelti.forEach((p, i) => {
      if (i) x += t('- - - - - - - - - - - - - - - -\n', { al: 'center' });
      x += t('\n' + p.nome.toUpperCase() + (p.semifreddo ? ' (semifreddo)' : '') + '\n', { al: 'left', b: true, dh: true });
      x += t('Ingredienti: ', { al: 'left' }) + paroleConAllergeni(p.testo).map(w => t(w.t + ' ', { b: w.b })).join('') + t('\n');
      x += t('Allergeni: ' + (p.allergeni.length ? p.allergeni.join(', ') : 'nessuno') + '\n', { b: true });
      if (p.tracce.length) x += t('Può contenere tracce di: ' + p.tracce.join(', ') + '\n');
    });
    x += t('- - - - - - - - - - - - - - - -\n', { al: 'center' }) + t(conservazione(scelti).join('\n') + '\n', { al: 'left' });
    if (senzaGlutine(scelti)) x += t('\nPRODOTTO SENZA GLUTINE\n', { al: 'center', b: true });
    x += t('\nGREED Srl - Piazza Roma 16, Frascati\n', { al: 'center' });
    return `<?xml version="1.0" encoding="utf-8"?>
<PrintRequestInfo Version="2.00"><ePOSPrint><Parameter><devid>local_printer</devid><timeout>10000</timeout><printjobid>FP${Date.now()}</printjobid></Parameter>
<PrintData><epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">${x}<feed line="3"/><cut type="feed"/></epos-print></PrintData></ePOSPrint></PrintRequestInfo>`;
  }

  window.fogliettoAggiungi = k => { if (!SCELTI.includes(k)) SCELTI.push(k); CERCA = ''; const c = document.getElementById('fogliettoCerca'); if (c) c.value = ''; disegna(); };
  window.fogliettoTogli = i => { SCELTI.splice(i, 1); disegna(); };
  window.fogliettoSvuota = () => { SCELTI = []; disegna(); };
  window.fogliettoCerca = v => { CERCA = v; disegna(); };
  window.fogliettoStampa = async () => {
    const tutti = catalogo(), scelti = SCELTI.map(k => tutti.find(p => p.k === k)).filter(Boolean);
    if (!scelti.length) return;
    const b = document.getElementById('fogliettoStampa'); b.disabled = true; b.textContent = '⏳ Stampo…';
    let ok = await _stampaUSB(escPos(scelti));
    if (!ok) ok = await _stampaFirestore({ tipo: 'foglietto', _rawXml: xmlEpos(scelti) });
    b.textContent = '🖨️ Stampa foglietto'; b.disabled = false;
    if (ok) { showToast('🖨️ Foglietto stampato ✓'); SCELTI = []; disegna(); }
    else showToast('❌ Stampa non riuscita: controlla la stampante', 'error');
  };
  window.fogliettoApri = () => { if (!CARICATO) carica(); else disegna(); };
  window.fogliettoRicarica = () => { CARICATO = false; carica(); };
  // per le prove
  window.__foglietto = { escPos, xmlEpos, catalogo, set: (d) => { RIC = d.RIC || RIC; COMP = d.COMP || COMP; VOCI = d.VOCI || VOCI; VETRINA = d.VETRINA || VETRINA; CARICATO = true; } };
})();
