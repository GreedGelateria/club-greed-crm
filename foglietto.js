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
    { k: 'GLUTINE', re: /frumento|\bgrano\b|farina\s+(di\s+)?(grano|frumento|00|0\b|farro|orzo|segale)|\borzo\b|segale|\bavena\b(?!.*senza glutine)|farro|kamut|biscott(?!.*senza glutine)|savoiard(?!.*senza glutine)|\bpane\b|pangrattato|briciole|birra|\bmalto\b/i },
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
    { re: /pan di spagna/i, fonte: 'scheda tecnica Nocciolcono, Pan di Spagna senza glutine cod. 145', componenti: 'uova, fecola di patate, zucchero, sciroppo di glucosio, umidificante: glicerolo; emulsionante: mono e digliceridi degli acidi grassi (E471); fibra di barbabietola, addensante: gomma di guar; sale, conservante: E202; aroma', tracce: 'latte, lupini' },
    { re: /gel[eé]e/i, fonte: 'ricetta GREED della gelée di frutta', componenti: 'purea di frutta (fragole, lamponi o visciole, secondo disponibilità), zucchero, gelificante: agar agar', tracce: '' },
    { re: /bagna.*(caff|marsala)/i, fonte: 'ricetta GREED (bagna dei savoiardi)', componenti: 'caffè, zucchero, vino Marsala', tracce: '' },
    { re: /savoiard.*(senza glutine|\bgf\b)/i, fonte: 'confezione Savoiardi senza glutine Selex (prodotti da Farmo S.p.A.)', componenti: 'zucchero, uova da allevamento a terra 28,8%, fecola di patate, farina di riso, agente lievitante: carbonati di ammonio; succo di limone (contiene anidride solforosa e solfiti), addensanti: gomma di xanthan, gomma di guar; aroma, sale', tracce: 'latte, frutta a guscio, semi di sesamo' },
    { re: /con[oi]\b.*(senza glutine|gf)|mini ?con|conett/i, fonte: 'scheda tecnica Nocciolcono, mini coni senza glutine cod. 047', componenti: 'farina di riso, amido di mais, fecola di patate, farina di soia, zucchero, olio di semi di girasole alto oleico, emulsionante: lecitina di soia; sale, zucchero caramellizzato, agente lievitante: bicarbonato di sodio; addensanti: gomma guar, gomma xantano; aroma naturale', tracce: '' },
  ];
  const RE_COMPOSTO = /pasta|crema|cioccolat|copertura|neutro|stabilizz|addensant|meringa|bombe|biscott|cialda|\bcon[oi]\b|pan di spagna|savoiard|granella|pralinat|variegat|marmellat|confettura|salsa|sciroppo(?! di glucosio)|amarett|caramell|gianduia|frollin|wafer|topping|aroma|liquore|\brum\b|vino|marsala|solubile|preparato|\bmix\b|base\b|fondente|gocce|scaglie|praline|crumble|cookie|brownie|torrone|sorbetto/i;
  const pulito = n => String(n || '').replace(/\s+/g, ' ').trim();
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

  let RIC = [], COMP = {}, VOCI = {}, VETRINA = [], SCELTI = [], CERCA = '', CARICATO = false, TORTE = [], GESTIONE = false, MODIFICA = null;

  const trovaBase = nome => { const n = norm(nome); return RIC.find(r => eBase(r) && norm(r.nome) === n); };
  function dicitura(nome, prof = 0) {
    nome = pulito(nome);
    const base = prof < 2 && trovaBase(nome);
    if (base && (base.ingredienti || []).length) {
      const dentro = [...base.ingredienti].filter(i => +i.d > 0).sort((a, b) => b.d - a.d).map(i => dicitura(i.nome, prof + 1));
      return { testo: `${minuscolo(nome)} (${dentro.map(x => x.testo).join(', ')})`, tracce: dentro.flatMap(x => x.tracce), mancanti: dentro.flatMap(x => x.mancanti) };
    }
    const c = COMP[slug(nome)];
    if (c && c.semplice) return { testo: minuscolo(nome), tracce: [], mancanti: [] };
    if (c && c.componenti) return { testo: `${minuscolo(nome)} (${c.componenti})`, tracce: c.tracce ? [c.tracce] : [], mancanti: [] };
    const p = !c && PRECOMPILATI.find(x => x.re.test(nome));
    if (p) return { testo: `${minuscolo(nome)} (${p.componenti})`, tracce: p.tracce ? [p.tracce] : [], mancanti: [] };
    return { testo: minuscolo(nome), tracce: [], mancanti: RE_COMPOSTO.test(nome) ? [nome] : [] };
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
    const tracce = [...new Set(parti.flatMap(p => p.tracce).join(', ').split(/,\s*(?![^()]*\))/).map(s => s.replace(/^(pu[oò]'? contenere )?(tracce di|tracce:?)\s*/i, '').trim()).filter(Boolean))];
    const nome = String(v.it || '').trim() || bello(r.nome);
    const semifreddo = r.tipo === 'semifreddo' || /semifredd/i.test(r.nome);
    const mancanti = [...new Set(parti.flatMap(p => p.mancanti))];
    return { k, nome: v.sub ? `${nome} - ${v.sub}` : nome, testo, allergeni, tracce, semifreddo, mancanti };
  }
  // Componenti già noti di un ingrediente: Libro ingredienti (ingredienti_composti) o schede tecniche dei fornitori
  function daScheda(nome) {
    const c = COMP[slug(pulito(nome))];
    if (c && c.componenti) return { ingredienti: c.componenti, tracce: c.tracce || '', fonte: c.fonte || 'Libro ingredienti' };
    const p = PRECOMPILATI.find(x => x.re.test(nome));
    return p ? { ingredienti: p.componenti, tracce: p.tracce || '', fonte: p.fonte || 'scheda tecnica del fornitore' } : null;
  }
  // Torte e semifreddi composti della vetrina: unione delle ricette scelte + componenti scritti a mano (pan di spagna, glassa…)
  function prodottoTorta(t, per) {
    const parti = [], set = new Set(), tracce = new Set(), mancanti = new Set();
    (t.componenti || []).forEach(c => {
      if (c.tipo === 'ricetta') { const r = per[c.k]; if (!r) return; const p = prodotto(r, c.k);
        parti.push(`${minuscolo(p.nome)} (${p.testo})`); p.allergeni.forEach(a => set.add(a)); p.tracce.forEach(x => tracce.add(x)); p.mancanti.forEach(x => mancanti.add(x)); }
      else if (c.nome) { const sc = !pulito(c.ingredienti) && daScheda(c.nome); const ing = pulito(c.ingredienti) || (sc ? sc.ingredienti : ''); const tr = sc ? sc.tracce : (c.tracce || (c.fonte && (daScheda(c.nome) || {}).tracce)); if (tr) tracce.add(tr); parti.push(ing ? `${minuscolo(c.nome)} (${ing})` : minuscolo(c.nome)); if (!ing) mancanti.add(c.nome);
        ALLERGENI_REGOLE.forEach(a => { if (a.re.test(c.nome + ' ' + ing)) set.add(a.k); }); }
    });
    const allergeni = [...set].sort((a, b) => ORDINE_ALG.indexOf(a) - ORDINE_ALG.indexOf(b));
    const giaDentro = x => ALLERGENI_REGOLE.some(a => set.has(a.k) && a.re.test(x)) || (/latte/i.test(x) && set.has('LATTE'));   // niente "può contenere latte" se il latte c'è già
    const tr = [...new Set([...tracce].join(', ').split(/,\s*(?![^()]*\))/).map(x => x.replace(/^(pu[oò]'? contenere )?(tracce di|tracce:?)\s*/i, '').trim()).filter(x => x && !giaDentro(x)))];
    return { k: 'V:' + t.id, nome: t.nome, testo: parti.join(', '), allergeni, tracce: tr, semifreddo: true, mancanti: [...mancanti], torta: true, inVetrina: !!t.inVetrina };
  }
  // Gusti che si possono scegliere: ricette (anche semifreddi) + copie create nelle etichette; niente basi e niente doppioni tolti
  function catalogo() {
    const per = {}; RIC.forEach(r => { if (!eBase(r)) per[String(r.nome).toUpperCase()] = r; });
    const out = [];
    Object.entries(per).forEach(([k, r]) => { if (!(VOCI[k] || {}).nascosta && ((r.ingredienti || []).length || r.lista_ing)) out.push(prodotto(r, k)); });
    Object.entries(VOCI).forEach(([k, v]) => { if (v && v.copiaDi && per[v.copiaDi]) out.push(prodotto(per[v.copiaDi], k)); });
    TORTE.forEach(t => out.push(prodottoTorta(t, per)));
    const inV = p => p.torta ? p.inVetrina : VETRINA.some(n => { const a = norm(n), b = norm(p.nome); return a === b || (a.length > 4 && (b.includes(a) || a.includes(b))); });
    return out.map(p => ({ ...p, vetrina: inV(p) })).sort((a, b) => ((b.torta && b.inVetrina ? 1 : 0) - (a.torta && a.inVetrina ? 1 : 0)) || (b.vetrina - a.vetrina) || a.nome.localeCompare(b.nome, 'it'));   // prima le torte in vetrina
  }

  async function carica() {
    const box = document.getElementById('fogliettoLista');
    box.innerHTML = '<div style="padding:20px;color:var(--text-muted)">⏳ Carico le ricette…</div>';
    try {
      const [ric, comp, voci, gusti, torte] = await Promise.all([
        getDocs(collection(db, 'ricette_lab')),
        getDocs(collection(db, 'ingredienti_composti')).catch(() => null),
        getDoc(doc(db, 'config', 'etichette')).catch(() => null),
        getDoc(doc(db, 'config', 'gusti')).catch(() => null),
        getDocs(collection(db, 'vetrina_semifreddi')).catch(() => null),
      ]);
      TORTE = torte ? torte.docs.map(d => ({ id: d.id, ...d.data() })) : [];
      RIC = ric.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => r.nome && !r.eliminata);
      COMP = {}; if (comp) comp.forEach(d => COMP[d.id] = d.data());
      VOCI = (voci && voci.exists() && voci.data().voci) || {};
      VETRINA = ((gusti && gusti.exists() && gusti.data().lista) || []).filter(g => g && (g.a || g.attivo) && g.n).map(g => g.n);
      CARICATO = true; disegna();
    } catch (e) { box.innerHTML = '<div style="padding:20px;color:var(--red)">⚠️ Ricette non disponibili: ' + esc(e.message) + '</div>'; }
  }

  function disegna() {
    const tutti = catalogo(), q = norm(CERCA);
    const lista = tutti.filter(p => !q || norm(p.nome).includes(q)).filter(p => !p.torta || p.inVetrina || q);
    disegnaVetrina(tutti);
    const scelti = SCELTI.map(k => tutti.find(p => p.k === k)).filter(Boolean);
    document.getElementById('fogliettoScelti').innerHTML = scelti.length
      ? scelti.map((p, i) => `<span style="display:inline-flex;align-items:center;gap:6px;background:var(--green);color:#fff;border-radius:20px;padding:6px 12px;margin:3px;font-size:14px">${esc(p.nome)}${p.semifreddo ? ' 🍰' : ''}<a href="#" onclick="fogliettoTogli(${i});return false" style="color:var(--yellow);text-decoration:none;font-weight:700">✕</a></span>`).join('')
      : '<span style="color:var(--text-muted)">Tocca i gusti della vaschetta qui sotto.</span>';
    document.getElementById('fogliettoStampa').disabled = !scelti.length;
    document.getElementById('fogliettoLista').innerHTML = lista.length ? lista.map(p => `<button type="button" onclick="fogliettoAggiungi('${esc(p.k).replace(/'/g, "\\'")}')"
      style="text-align:left;background:${SCELTI.includes(p.k) ? 'var(--cream-dark)' : 'var(--white)'};border:1px solid var(--border);border-radius:10px;padding:10px 12px;cursor:pointer;font-family:inherit;font-size:14px;min-height:48px">
      ${p.torta ? '<span style="font-size:10px;background:var(--yellow);color:var(--green);border-radius:4px;padding:1px 5px;font-weight:700">VETRINA SEMIFREDDI</span><br>' : ''}<b>${esc(p.nome)}</b>${p.semifreddo ? ' 🍰' : ''}${p.vetrina && !p.torta ? ' <span style="font-size:11px;color:var(--success)">● oggi</span>' : ''}
      <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${p.allergeni.length ? esc(p.allergeni.join(', ')) : 'nessun allergene'}</div>${p.mancanti.length ? '<div style="font-size:11px;color:#a33;margin-top:2px">⚠️ elenco da completare</div>' : ''}</button>`).join('')
      : '<div style="padding:20px;color:var(--text-muted)">Nessun gusto trovato.</div>';
    const manc = [...new Set(scelti.flatMap(p => p.mancanti))];
    document.getElementById('fogliettoAnteprima').innerHTML = (manc.length ? `<div style="background:#fdecea;color:#a33;border-radius:8px;padding:10px 12px;margin-bottom:8px;font-size:13px">⚠️ Di questi ingredienti composti mancano i componenti: <b>${esc(manc.map(minuscolo).join(', '))}</b>. Sul foglietto escono senza l'elenco tra parentesi: completali nel <a href="https://greedgelateria.github.io/greed-brain/libro.html#ingredienti" target="_blank">Libro ingredienti</a>.</div>` : '') + (scelti.length ? anteprimaHtml(scelti) : '');
  }

  // ── Testo del foglietto (uguale per stampa e anteprima) ──
  function conservazione(scelti) {
    const r = ['Conservare in freezer a -18 °C.'];
    const g = scelti.some(p => !p.semifreddo), s = scelti.some(p => p.semifreddo);
    if (g) r.push('Vaschetta: dalla gelateria al freezer di casa entro 40 minuti.');
    if (s) r.push('Semifreddo: dalla gelateria al freezer di casa entro 15 minuti.');
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
      ${scelti.map(p => `<div style="margin:10px 0"><b style="font-size:14px">${esc(p.nome.toUpperCase())}</b>${p.semifreddo && !/semifredd/i.test(p.nome) ? ' (semifreddo)' : ''}<br>
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
    cmd(0x1B, 0x40);                                  // init, stessa codifica della classifica (che stampa)
    cmd(0x1B, 0x61, 1); cmd(0x1D, 0x21, 0x11); txt('GREED\n'); cmd(0x1D, 0x21, 0x00);
    txt('Gelateria Naturale \xB7 Frascati\n'.replace('\xB7', '-'));
    txt('- - - - - - - - - - - - - - - - - - - - - - - -\n');
    cmd(0x1B, 0x61, 0);
    scelti.forEach((p, i) => {
      if (i) txt('- - - - - - - - - - - - - - - - - - - - - - - -\n');
      txt('\n'); bold(true); cmd(0x1D, 0x21, 0x01); semplice(p.nome.toUpperCase() + (p.semifreddo && !/semifredd/i.test(p.nome) ? ' (semifreddo)' : ''), true); cmd(0x1D, 0x21, 0x00); bold(false);
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
      x += t('\n' + p.nome.toUpperCase() + (p.semifreddo && !/semifredd/i.test(p.nome) ? ' (semifreddo)' : '') + '\n', { al: 'left', b: true, dh: true });
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

  // ── Vetrina semifreddi: Dario crea le torte, tutti possono metterle o toglierle dalla vetrina ──
  const admin = () => window.RUOLO !== 'staff';
  function disegnaVetrina(tutti) {
    const box = document.getElementById('vetrinaGestione'); if (!box) return;
    if (!GESTIONE) { box.innerHTML = ''; return; }
    const torte = tutti.filter(p => p.torta).sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
    let h = `<div style="background:var(--white);border:1.5px solid var(--yellow-dark);border-radius:14px;padding:14px 16px;margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px"><b style="font-size:16px">🍰 Vetrina semifreddi</b>
      <span>${admin() ? '<button class="btn btn-primary btn-sm" onclick="vetrinaNuova()">+ Nuova torta</button> ' : ''}<button class="btn btn-ghost btn-sm" onclick="vetrinaChiudi()">Chiudi</button></span></div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">Accendi le torte che sono in vetrina: compaiono tra i gusti da scegliere per il foglietto.</div>`;
    h += torte.length ? torte.map(p => { const id = p.k.slice(2);
      return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--border);flex-wrap:wrap">
        <label style="display:flex;align-items:center;gap:8px;flex:1;min-width:200px;cursor:pointer;font-size:15px"><input type="checkbox" ${p.inVetrina ? 'checked' : ''} onchange="vetrinaAccendi('${id}',this.checked)" style="width:22px;height:22px"> <b>${esc(p.nome)}</b></label>
        <span style="font-size:11px;color:var(--text-muted)">${p.allergeni.length ? esc(p.allergeni.join(', ')) : 'nessun allergene'}${p.mancanti.length ? ' · <span style="color:#a33">⚠️ elenco da completare</span>' : ''}</span>
        ${p.inVetrina ? `<button class="btn btn-primary btn-sm" onclick="fogliettoAggiungi('${p.k}')">➕ Nella vaschetta</button>` : ''}
        ${admin() ? `<button class="btn btn-ghost btn-sm" onclick="vetrinaModifica('${id}')">✏️ Modifica</button>` : ''}</div>`; }).join('')
      : '<div style="color:var(--text-muted);padding:8px 0">Nessuna torta ancora.' + (admin() ? ' Premi "+ Nuova torta".' : ' Le crea Dario.') + '</div>';
    if (MODIFICA && admin()) h += editorTorta(tutti);
    box.innerHTML = h + '</div>';
  }
  function editorTorta(tutti) {
    const t = MODIFICA, ricette = tutti.filter(p => !p.torta);
    // Semifreddi in cima, tutti con "Semifreddo …" davanti, così si trovano subito
    const etichetta = p => p.semifreddo ? 'Semifreddo ' + p.nome.replace(/\s*semifredd[oi]\s*/gi, ' ').replace(/\s+/g, ' ').trim() : p.nome;
    const ordina = l => l.map(p => ({ p, n: etichetta(p) })).sort((a, b) => a.n.localeCompare(b.n, 'it'));
    const voce = sel => ({ p, n }) => `<option value="${esc(p.k)}" ${p.k === sel ? 'selected' : ''}>${esc(n)}</option>`;
    const opz = sel => '<option value="">— scegli una ricetta —</option>'
      + `<optgroup label="🍰 Semifreddi">${ordina(ricette.filter(p => p.semifreddo)).map(voce(sel)).join('')}</optgroup>`
      + `<optgroup label="🍨 Gelati">${ordina(ricette.filter(p => !p.semifreddo)).map(voce(sel)).join('')}</optgroup>`;
    return `<div style="margin-top:12px;padding:12px;background:var(--cream);border-radius:10px">
      <b>${t.id ? 'Modifica torta' : 'Nuova torta'}</b>
      <input id="vtNome" value="${esc(t.nome || '')}" placeholder="Nome (es. Semifreddo cioccolato e nocciola)" oninput="MODIFICA_set('nome',this.value)" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;margin:8px 0;box-sizing:border-box;font-size:15px">
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">Di cosa è fatta, dallo strato più abbondante al meno abbondante. Le ricette prendono ingredienti e allergeni dal gestionale; per pan di spagna, glassa, biscotto o crumble scrivi tu gli ingredienti.</div>
      ${(t.componenti || []).map((c, i) => `<div style="display:flex;gap:6px;margin-bottom:6px;flex-wrap:wrap;align-items:flex-start">
        ${c.tipo === 'ricetta'
          ? `<select onchange="MODIFICA_comp(${i},'k',this.value)" style="flex:1;min-width:220px;padding:8px;border:1px solid var(--border);border-radius:8px">${opz(c.k)}</select>`
          : `<input value="${esc(c.nome || '')}" placeholder="es. Pan di spagna" oninput="MODIFICA_comp(${i},'nome',this.value)" onchange="MODIFICA_nome(${i})" style="width:160px;padding:8px;border:1px solid var(--border);border-radius:8px">
             <div style="flex:1;min-width:220px"><textarea placeholder="ingredienti come sulla scheda tecnica, es. uova, fecola di patate, zucchero…" oninput="MODIFICA_comp(${i},'ingredienti',this.value)" style="width:100%;box-sizing:border-box;padding:8px;border:1px solid var(--border);border-radius:8px;min-height:40px">${esc(c.ingredienti || '')}</textarea>
             ${c.fonte ? `<div style="font-size:11px;color:var(--success)">✓ preso da: ${esc(c.fonte)} — controlla</div>` : (c.nome && !pulito(c.ingredienti) ? '<div style="font-size:11px;color:#a33">Scheda tecnica non trovata: scrivi gli ingredienti</div>' : '')}</div>`}
        <button class="btn btn-ghost btn-sm" onclick="MODIFICA_sposta(${i},-1)" title="Su">▲</button><button class="btn btn-ghost btn-sm" onclick="MODIFICA_sposta(${i},1)" title="Giù">▼</button>
        <button class="btn btn-ghost btn-sm" onclick="MODIFICA_togli(${i})" title="Togli">✕</button></div>`).join('')}
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 10px">
        <button class="btn btn-ghost btn-sm" onclick="MODIFICA_aggiungi('ricetta')">+ Ricetta del gestionale</button>
        ${['Pan di spagna', 'Savoiardi senza glutine', 'Bagna caffè e marsala', 'Base frolla e burro', 'Gelée di frutta', 'Glassa', 'Biscotto', 'Crumble', 'Altro'].map(n => `<button class="btn btn-ghost btn-sm" onclick="MODIFICA_aggiungi('extra','${n === 'Altro' ? '' : n}')">+ ${n}</button>`).join('')}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="vetrinaSalva()">💾 Salva torta</button>
        <button class="btn btn-ghost" onclick="vetrinaAnnulla()">Annulla</button>
        ${t.id ? `<button class="btn btn-danger btn-sm" style="margin-left:auto" onclick="vetrinaElimina('${t.id}')">🗑️ Elimina torta</button>` : ''}
      </div></div>`;
  }
  window.fogliettoDisegna = () => disegna();
  window.vetrinaAnnulla = () => { MODIFICA = null; disegna(); };
  window.__vetrinaModifica = () => MODIFICA;
  window.vetrinaApri = () => { GESTIONE = true; disegna(); document.getElementById('vetrinaGestione').scrollIntoView({ block: 'start', behavior: 'smooth' }); };
  window.vetrinaChiudi = () => { GESTIONE = false; MODIFICA = null; disegna(); };
  window.vetrinaNuova = () => { MODIFICA = { nome: '', componenti: [{ tipo: 'ricetta', k: '' }], inVetrina: true }; disegna(); };
  window.vetrinaModifica = id => { const t = TORTE.find(x => x.id === id); if (t) { MODIFICA = JSON.parse(JSON.stringify(t)); disegna(); } };
  window.MODIFICA_set = (c, v) => { MODIFICA[c] = v; };
  window.MODIFICA_comp = (i, c, v) => { MODIFICA.componenti[i][c] = v; if (c === 'k') disegna(); };
  const precompila = c => { if (c.tipo !== 'ricetta' && !pulito(c.ingredienti)) { const sc = daScheda(c.nome || ''); if (sc) { c.ingredienti = sc.ingredienti; c.fonte = sc.fonte; c.tracce = sc.tracce || ''; } } };
  window.MODIFICA_aggiungi = (tipo, nome) => { const c = tipo === 'ricetta' ? { tipo, k: '' } : { tipo, nome: nome || '', ingredienti: '' }; precompila(c); MODIFICA.componenti.push(c); disegna(); };
  window.MODIFICA_nome = i => { const c = MODIFICA.componenti[i]; if (!pulito(c.ingredienti)) { precompila(c); if (c.ingredienti) disegna(); } };
  window.MODIFICA_togli = i => { MODIFICA.componenti.splice(i, 1); disegna(); };
  window.MODIFICA_sposta = (i, d) => { const c = MODIFICA.componenti, j = i + d; if (j < 0 || j >= c.length) return; [c[i], c[j]] = [c[j], c[i]]; disegna(); };
  window.vetrinaSalva = async () => {
    const t = MODIFICA; t.nome = pulito(t.nome);
    t.componenti = (t.componenti || []).filter(c => c.tipo === 'ricetta' ? c.k : pulito(c.nome));
    if (!t.nome) { showToast('Scrivi il nome della torta', 'error'); return; }
    if (!t.componenti.length) { showToast('Aggiungi almeno una ricetta o un componente', 'error'); return; }
    const id = t.id || slug(t.nome) + '-' + Date.now().toString(36);
    const dati = { nome: t.nome, componenti: t.componenti, inVetrina: t.inVetrina !== false, _ts: Date.now() };
    try { await setDoc(doc(db, 'vetrina_semifreddi', id), dati); TORTE = TORTE.filter(x => x.id !== id).concat({ id, ...dati }); MODIFICA = null; disegna(); showToast('✓ Torta salvata'); }
    catch (e) { showToast('Non salvata: ' + e.message, 'error'); return; }
    // Ingredienti scritti a mano (es. savoiardi dalla confezione): li ricordo nel Libro ingredienti, così la prossima volta si compilano da soli
    for (const c of t.componenti) {
      if (c.tipo !== 'extra' || !pulito(c.ingredienti) || c.fonte) continue;
      const k = slug(pulito(c.nome)); if (COMP[k] && COMP[k].componenti) continue;
      const v = { nome: pulito(c.nome), semplice: false, componenti: pulito(c.ingredienti), tracce: '', fonte: 'scritto in vetrina (' + t.nome + ')' };
      try { await setDoc(doc(db, 'ingredienti_composti', k), v); COMP[k] = v; } catch (e) { /* non blocca la torta */ }
    }
  };
  window.vetrinaElimina = async id => {
    const b = event && event.target; if (b && b.dataset.conferma !== '1') { b.dataset.conferma = '1'; b.textContent = 'Premi ancora per eliminare'; return; }
    try { await deleteDoc(doc(db, 'vetrina_semifreddi', id)); TORTE = TORTE.filter(x => x.id !== id); MODIFICA = null; SCELTI = SCELTI.filter(k => k !== 'V:' + id); disegna(); showToast('Torta eliminata'); }
    catch (e) { showToast('Non eliminata: ' + e.message, 'error'); }
  };
  window.vetrinaAccendi = async (id, on) => {
    const t = TORTE.find(x => x.id === id); if (!t) return; t.inVetrina = on; disegna();
    try { await updateDoc(doc(db, 'vetrina_semifreddi', id), { inVetrina: on }); } catch (e) { t.inVetrina = !on; disegna(); showToast('Non salvato: ' + e.message, 'error'); }
  };
  window.fogliettoAggiungi = k => { if (!SCELTI.includes(k)) SCELTI.push(k); CERCA = ''; const c = document.getElementById('fogliettoCerca'); if (c) c.value = ''; disegna(); };
  window.fogliettoTogli = i => { SCELTI.splice(i, 1); disegna(); };
  window.fogliettoSvuota = () => { SCELTI = []; disegna(); };
  window.fogliettoCerca = v => { CERCA = v; disegna(); };
  window.fogliettoStampa = async () => {
    const tutti = catalogo(), scelti = SCELTI.map(k => tutti.find(p => p.k === k)).filter(Boolean);
    if (!scelti.length) return;
    const b = document.getElementById('fogliettoStampa'); b.disabled = true; b.textContent = '⏳ Stampo…';
    // Registro di ogni tentativo (per capire cosa succede se non esce niente)
    const reg = { quando: Date.now(), gusti: scelti.map(p => p.nome), utente: (window.RUOLO || '?'), dispositivo: navigator.userAgent.slice(0, 120), usbApi: !!navigator.usb, usbCollegata: false, canale: '', ok: false, errore: '' };
    let ok = false;
    try {
      const dati = escPos(scelti); reg.bytes = dati.length;
      reg.usbCollegata = !!(window._usbDevice || (navigator.usb && (await navigator.usb.getDevices()).some(d => d.vendorId === 0x04b8)));
      ok = await _stampaUSB(dati); if (ok) reg.canale = 'usb';
      if (!ok) { ok = await _stampaFirestore({ tipo: 'foglietto', _rawXml: xmlEpos(scelti) }); if (ok) reg.canale = 'server'; }
    } catch (e) { reg.errore = e.message; }
    reg.ok = ok;
    let registro = 'ok';
    try { await addDoc(collection(db, 'log_stampe_foglietto'), reg); } catch (e) { registro = e.message; }
    b.textContent = '🖨️ Stampa foglietto'; b.disabled = false;
    if (ok && reg.canale === 'usb') { alert('🖨️ Foglietto inviato alla stampante USB (' + reg.bytes + ' byte).' + (registro === 'ok' ? '' : '\n[registro non salvato: ' + registro + ']')); SCELTI = []; disegna(); }
    else if (ok) alert('La stampante USB non è collegata a questo dispositivo: il foglietto è stato mandato al server, ma potrebbe non uscire.\nSul tablet del banco premi "🖨️ Connetti USB" in alto e riprova.');
    else alert('❌ Stampa non riuscita' + (reg.errore ? ': ' + reg.errore : '') + '.\nControlla che la stampante sia accesa e collegata, poi premi "🖨️ Connetti USB" e riprova.');
  };
  window.fogliettoApri = () => { if (!CARICATO) carica(); else disegna(); };
  window.fogliettoRicarica = () => { CARICATO = false; carica(); };
  // per le prove
  window.__foglietto = { escPos, xmlEpos, catalogo, set: (d) => { RIC = d.RIC || RIC; COMP = d.COMP || COMP; VOCI = d.VOCI || VOCI; VETRINA = d.VETRINA || VETRINA; TORTE = d.TORTE || TORTE; CARICATO = true; } };
})();
