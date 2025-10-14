/* =========================================================
   A7 — Drag & Drop (Cards) — compact & fluid
   - auto-compress fans so piles always fit (with padding)
   - utilities A/B/C/D all accept and fan mini cards
   - clear corner labels & suit tags
========================================================= */
(() => {
  // ---------- constants ----------
  const SUITS = ['S','H','D','C'];
  const RANKS = Array.from({length:13}, (_,i)=> i+1);

  const suitLong  = { S:'spades', H:'hearts', D:'diamonds', C:'clubs' };
  const suitTitle = { S:'Spades', H:'Hearts', D:'Diamonds', C:'Clubs' };
  const rankWord  = { 1:'ace', 11:'jack', 12:'queen', 13:'king' };
  const rankLabel = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  const suitGlyph = { S:'♠', H:'♥', D:'♦', C:'♣' };

  // preferred spacing (auto-compress if tall)
  const PREF_TABLEAU_STEP = 28; // tighter by default
  const PREF_FOUND_STEP   = 22;

  // ---------- dom ----------
  const $ = id => document.getElementById(id);
  const tableau = $('tableau');
  const tPiles = Array.from(tableau.querySelectorAll('.pile[data-role="tableau"]'));
  const fPiles = ['fS','fH','fD','fC'].map(id => $(id));
  const utilIds = ['deckZone','discardZone','uC','uD'];
  const utilPiles = utilIds.map(id => $(id)).filter(Boolean);

  const statusEl = $('status');
  const liveRegion = $('liveRegion');
  const winBanner = $('winBanner');
  const playAgainBtn = $('playAgainBtn');

  // controls
  const dealBtn = $('dealBtn'), drawBtn = $('drawBtn'), resetBtn = $('resetBtn');
  const autoOneBtn = $('autoOneBtn'), autoSomeBtn = $('autoSomeBtn');
  const autoAllBtn = $('autoAllBtn'), sendRunsBtn = $('sendRunsBtn');

  // ---------- state ----------
  let undealt = [];
  const nodes = new Map();

  // ---------- helpers ----------
  function human(code){
    const s = suitTitle[code[0]];
    const r = Number(code.slice(1));
    return `${rankLabel[r-1]} of ${s}`;
  }
  const rankOf = c => Number(c.slice(1));
  const suitOf = c => c[0];

  function setStatus(msg){
    if (statusEl) statusEl.textContent = msg;
    if (liveRegion) liveRegion.textContent = msg;
  }

  function freshDeck(){
    const all = [];
    for (const s of SUITS) for (const r of RANKS) all.push(`${s}${r}`);
    for (let i=all.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [all[i],all[j]] = [all[j],all[i]];
    }
    return all;
  }

  // image candidates: numeric first (your set), fallbacks to worded & lettered
  function imageCandidates(code){
    const s = suitLong[code[0]];
    const r = Number(code.slice(1));
    const word   = rankWord[r] || String(r);
    const letter = ({1:'A',11:'J',12:'Q',13:'K'})[r];
    const num    = String(r===1 ? 1 : r);
    return [
      `assets/${num}_of_${s}.png`,
      `assets/${word}_of_${s}.png`,
      letter ? `assets/${letter}_of_${s}.png` : null
    ].filter(Boolean);
  }

  // build a card node
  function buildCardNode(code){
    const a = document.createElement('a');
    a.href = '#';
    a.className = 'card-tile';
    a.draggable = true;
    a.dataset.code = code;

    const r = Number(code.slice(1));
    a.dataset.label = `${rankLabel[r-1]}${suitGlyph[code[0]]}`;

    a.setAttribute('aria-label', `Card ${human(code)} draggable`);
    a.addEventListener('click', e => e.preventDefault());
    a.addEventListener('dragstart', onDragStart);
    a.addEventListener('dragover', e => e.preventDefault());
    a.addEventListener('drop', onDropOnCard);
    a.addEventListener('dblclick', () => tryMoveToFoundation(code));

    const img = document.createElement('img');
    const candidates = imageCandidates(code);
    let i = 0;
    img.src = candidates[i];
    img.alt = human(code);
    img.onerror = () => {
      i++;
      if (i < candidates.length) img.src = candidates[i];
      else { img.onerror = null; img.alt += ' (image not found)'; }
    };
    a.appendChild(img);
    return a;
  }

  // layout helper: compute fan that fits all cards in a zone height (with bottom pad)
  function fitFan(zone, preferred, minStep){
    const cards = zone.querySelectorAll('.card-tile');
    const n = cards.length;
    if (n <= 1) return 0;
    const imgH = (cards[0].querySelector('img')?.clientHeight) || 176;
    const h = zone.clientHeight || 260;
    const padBottom = 12; // keep breathing room
    const maxStep = Math.floor((h - imgH - padBottom) / (n - 1));
    return Math.max(minStep, Math.min(preferred, maxStep));
  }

  // ---------- actions ----------
  function clearAll(){
    tPiles.forEach(p => p.innerHTML = '');
    fPiles.forEach(p => { p.innerHTML=''; p.dataset.top=''; });
    utilPiles.forEach(p => p.innerHTML = `<span class="slot-name">${p.querySelector('.slot-name')?.textContent||''}</span>`);
    nodes.clear(); undealt = [];
    winBanner && (winBanner.hidden = true);
    setStatus('Table cleared.');
  }

  function dealAll(){
    clearAll();
    undealt = freshDeck();
    undealt.forEach(code => nodes.set(code, buildCardNode(code)));

    // 7 columns with 1..7 cards
    for (let col=0; col<7; col++){
      for (let k=0; k<=col; k++){
        const code = undealt.shift();
        tPiles[col].appendChild(nodes.get(code));
      }
    }
    setStatus(`Dealt to tableau. ${undealt.length} in deck.`);
    layoutAll();
  }

  function drawOne(){
    if (!undealt.length){ setStatus('Deck empty.'); return; }
    const code = undealt.shift();
    moveNodeToPile(nodes.get(code), randomTableau());
    setStatus(`${human(code)} drawn. ${undealt.length} left in deck.`);
    layoutAll();
  }

  const randomTableau = () => tPiles[Math.floor(Math.random()*tPiles.length)];

  // ---------- dnd ----------
  function onDragStart(ev){
    const code = ev.currentTarget.dataset.code;
    ev.dataTransfer.setData('text/plain', code);
    ev.dataTransfer.effectAllowed = 'move';
    ev.currentTarget.classList.add('dragging');
  }

  function makeDropzone(zoneEl, handler){
    if (!zoneEl) return;
    zoneEl.addEventListener('dragover', ev => { ev.preventDefault(); zoneEl.classList.add('highlight'); });
    zoneEl.addEventListener('dragleave', () => zoneEl.classList.remove('highlight'));
    zoneEl.addEventListener('drop', ev => {
      ev.preventDefault(); zoneEl.classList.remove('highlight');
      document.querySelectorAll('.dragging').forEach(n=>n.classList.remove('dragging'));
      const code = ev.dataTransfer.getData('text/plain');
      if (!code) return;
      handler(code, zoneEl, ev);
    });
  }

  function onDropOnCard(ev){
    ev.preventDefault();
    const targetCard = ev.currentTarget;
    const code = ev.dataTransfer.getData('text/plain');
    if (!code) return;
    const dragNode = nodes.get(code); if (!dragNode) return;
    const container = targetCard.parentElement;

    if (container.dataset.role === 'foundation'){ dropToFoundation(code, container); layoutAll(); return; }
    if (utilPiles.includes(container)){ moveToUtility(code, container); layoutAll(); return; }

    if (container.dataset.role === 'tableau'){
      const rect = targetCard.getBoundingClientRect();
      const after = ev.clientY > rect.top + rect.height/2;
      dragNode.classList.remove('mini');
      if (after) container.insertBefore(dragNode, targetCard.nextSibling);
      else       container.insertBefore(dragNode, targetCard);
      settle(dragNode);
      setStatus(`${human(code)} placed ${after?'after':'before'} ${human(targetCard.dataset.code)}.`);
      layoutAll(); checkWin();
    }
  }

  // ---------- zone helpers ----------
  function moveToUtility(code, zone){
    const n = nodes.get(code); if (!n || !zone) return;
    n.classList.add('mini'); zone.appendChild(n); settle(n);
    setStatus(`${human(code)} moved to ${zone.querySelector('.slot-name')?.textContent || 'Utility'}.`);
  }

  function moveNodeToPile(node, pile){
    if (!node || !pile) return;
    node.classList.remove('mini');
    pile.appendChild(node); settle(node);
  }

  function dropToTableau(code, zone){
    moveNodeToPile(nodes.get(code), zone);
    setStatus(`${human(code)} moved to ${zone.id}.`);
    layoutAll();
  }

  const requiredRankForFoundation = zone =>
    zone.querySelectorAll('.card-tile').length + 1;

  function dropToFoundation(code, zone){
    const suit = zone.dataset.suit;
    const need = requiredRankForFoundation(zone);
    const cs = suitOf(code), cr = rankOf(code);
    if (cs !== suit){ setStatus(`Only ${suitTitle[suit]} allowed here.`); return; }
    if (cr !== need){ setStatus(`Need ${human(`${suit}${need}`)} next.`); return; }

    const n = nodes.get(code);
    n.classList.remove('mini');
    zone.appendChild(n); settle(n);
    setStatus(`${human(code)} placed on ${suitTitle[suit]} foundation.`);
    layoutAll(); checkWin();
  }

  function tryMoveToFoundation(code){
    const s = suitOf(code);
    const zone = document.getElementById(`f${s}`);
    const need = requiredRankForFoundation(zone);
    if (rankOf(code) === need) dropToFoundation(code, zone);
    else setStatus(`Not ready for foundation. ${human(`${s}${need}`)} is next.`);
  }

  const settle = n => { n.classList.add('settle'); setTimeout(()=> n.classList.remove('settle'), 160); };

  // ---------- layout ----------
  function layoutTableau(){
    tPiles.forEach(zone => {
      const cards = Array.from(zone.querySelectorAll('.card-tile'));
      const step = fitFan(zone, PREF_TABLEAU_STEP, 12);
      cards.forEach((c,i) => {
        c.style.top = `${i * step}px`;
        c.style.zIndex = String(100 + i);
      });
    });
  }

  function layoutFoundations(){
    fPiles.forEach(zone => {
      const cards = Array.from(zone.querySelectorAll('.card-tile'));
      const step = fitFan(zone, PREF_FOUND_STEP, 9);
      cards.forEach((c,i) => {
        c.style.top = `${i * step}px`;
        c.style.zIndex = String(200 + i);
      });
      const top = cards[cards.length-1];
      zone.dataset.top = top ? `Top: ${human(top.dataset.code)}` : 'Empty';
    });
  }

  function layoutUtilities(){
    const fan = 16; // horizontal mini fan
    utilPiles.forEach(zone=>{
      const cards = Array.from(zone.querySelectorAll('.card-tile'));
      cards.forEach((c,i) => {
        c.style.left = `${10 + i*fan}px`;
        c.style.top  = `10px`;
        c.style.zIndex = String(50 + i);
      });
    });
  }

  function layoutAll(){
    layoutTableau();
    layoutFoundations();
    layoutUtilities();
  }

  // ---------- auto moves ----------
  function findFirstMovable(){
    const areas = [...tPiles, ...utilPiles].filter(Boolean);
    for (const area of areas){
      const cards = Array.from(area.querySelectorAll('.card-tile'));
      for (const n of cards){
        const code = n.dataset.code;
        const zone = document.getElementById(`f${suitOf(code)}`);
        if (rankOf(code) === requiredRankForFoundation(zone)) return { code, zone };
      }
    }
    return null;
  }

  function autoMoveOne(){
    const mv = findFirstMovable();
    if (!mv){ setStatus('No auto-move available.'); return false; }
    dropToFoundation(mv.code, mv.zone);
    layoutAll();
    return true;
  }

  async function autoMoveSome(count=5){
    let moved = 0;
    while (moved < count && autoMoveOne()){
      moved++;
      await new Promise(r=>setTimeout(r,100));
    }
    if (moved === 0) setStatus('No auto-moves available.');
  }

  function autoMoveAll(){
    let did;
    do { did = autoMoveOne(); } while (did);
    if (!did) setStatus('No more auto-moves available.');
  }

  function sendCompletedSuit(){
    for (const pile of tPiles){
      const codes = Array.from(pile.querySelectorAll('.card-tile')).map(n=>n.dataset.code);
      if (codes.length === 13){
        const s = suitOf(codes[0]);
        const same = codes.every(c=> suitOf(c)===s);
        const ordered = codes.every((c,i)=> rankOf(c) === i+1);
        if (same && ordered){
          const f = document.getElementById(`f${s}`);
          for (const c of codes) dropToFoundation(c, f);
          setStatus(`Moved complete ${suitTitle[s]} to foundation.`);
          layoutAll(); checkWin(); return;
        }
      }
    }
    setStatus('No completed A..K suit found on a single pile.');
  }

  // ---------- win ----------
  function checkWin(){
    const complete = fPiles.every(p => p.querySelectorAll('.card-tile').length === 13);
    if (complete){
      if (winBanner) winBanner.hidden = false;
      else alert('🎉 All foundations complete — you win!');
      setStatus('All foundations complete — you win!');
    }
  }

  // ---------- bind zones ----------
  tPiles.forEach(p => makeDropzone(p, (code, zone) => { dropToTableau(code, zone); }));
  fPiles.forEach(p => makeDropzone(p, (code, zone) => { dropToFoundation(code, zone); }));
  utilPiles.forEach(p => makeDropzone(p, (code, zone)=> { moveToUtility(code, zone); layoutAll(); }));

  // ---------- buttons ----------
  dealBtn?.addEventListener('click', () => { dealAll(); });
  drawBtn?.addEventListener('click', () => { drawOne(); });
  resetBtn?.addEventListener('click', () => { clearAll(); layoutAll(); });
  autoOneBtn?.addEventListener('click', () => { autoMoveOne(); });
  autoSomeBtn?.addEventListener('click', () => { autoMoveSome(5); });
  autoAllBtn?.addEventListener('click', () => { autoMoveAll(); });
  sendRunsBtn?.addEventListener('click', () => { sendCompletedSuit(); });
  playAgainBtn?.addEventListener('click', () => { if (winBanner) winBanner.hidden = true; clearAll(); dealAll(); });

  // ---------- mobile tap-to-move ----------
  (function(){
    const isCoarse = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
    if (!isCoarse) return;

    let selectedCode = null;
    function hi(node,on){ if(!node) return; node.style.outline = on?'3px solid var(--accent)':''; node.style.outlineOffset = on?'2px':''; }

    $('a7')?.addEventListener('click', (e)=>{
      const card = e.target.closest('.card-tile');
      const pile = e.target.closest('.slot');

      if (card){
        const code = card.dataset.code;
        if (selectedCode === code){ hi(card,false); selectedCode=null; }
        else {
          if (selectedCode){
            const prev = document.querySelector(`.card-tile[data-code="${selectedCode}"]`);
            hi(prev,false);
          }
          selectedCode = code; hi(card,true);
        }
        e.preventDefault(); return;
      }

      if (pile && selectedCode){
        const node = document.querySelector(`.card-tile[data-code="${selectedCode}"]`);
        hi(node,false);
        const role = pile.dataset.role;

        if (role === 'foundation') {
          dropToFoundation(selectedCode, pile);
        } else if (role === 'tableau') {
          const targetCard = e.target.closest('.card-tile');
          node.classList.remove('mini');
          if (targetCard && targetCard.parentElement === pile) {
            pile.insertBefore(node, targetCard);
            setStatus(`${human(selectedCode)} placed before ${human(targetCard.dataset.code)}.`);
          } else {
            pile.appendChild(node);
            setStatus(`${human(selectedCode)} moved to ${pile.id}.`);
          }
          checkWin();
        } else if (utilPiles.includes(pile)) {
          moveToUtility(selectedCode, pile);
        }

        selectedCode=null; layoutAll(); e.preventDefault();
      }
    }, {passive:false});
  })();

  // ---------- start ----------
  dealAll();
})();
