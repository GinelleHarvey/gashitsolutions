/* =========================================================
   A7 — Drag & Drop (Cards) — Vanilla JS (no jQuery)
   Piles: fixed height with internal cascade (no panel growth)
   Images live in /assets (e.g., ace_of_spades.png or 1_of_spades.png)
   ========================================================= */

(() => {
  // ---------- Constants ----------
  const SUITS = ['S','H','D','C'];
  const RANKS = Array.from({length:13}, (_,i)=> i+1);

  const suitLong  = { S:'spades', H:'hearts', D:'diamonds', C:'clubs' };
  const suitTitle = { S:'Spades', H:'Hearts', D:'Diamonds', C:'Clubs' };
  const rankWord  = { 1:'ace', 11:'jack', 12:'queen', 13:'king' };
  const rankLabel = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

  // layout offsets (px)
  const TABLEAU_OFFSET = 36;  // vertical gap between cards in a column
  const FOUNDATION_OFFSET = 22;

  // ---------- DOM ----------
  const $ = id => document.getElementById(id);
  const tableau = $('tableau');
  const tPiles = Array.from(tableau.querySelectorAll('.pile[data-role="tableau"]'));
  const fPiles = ['fS','fH','fD','fC'].map(id => $(id));
  const deckZone = $('deckZone');
  const discardZone = $('discardZone');
  const statusEl = $('status');
  const liveRegion = $('liveRegion');
  const winBanner = $('winBanner');
  const playAgainBtn = $('playAgainBtn');

  // Buttons (optional)
  const dealBtn = $('dealBtn'), drawBtn = $('drawBtn'), resetBtn = $('resetBtn');
  const autoOneBtn = $('autoOneBtn'), autoSomeBtn = $('autoSomeBtn');
  const autoAllBtn = $('autoAllBtn'), sendRunsBtn = $('sendRunsBtn');

  // ---------- State ----------
  let undealt = [];
  const nodes = new Map();
  let firstDiscardAlerted = false;

  // ---------- Helpers ----------
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

  // robust image resolver for /assets
  function imageCandidates(code){
    const s = suitLong[code[0]];
    const r = Number(code.slice(1));
    const word = rankWord[r] || String(r);
    const aceNum = (r===1) ? '1' : String(r);
    return [
      `assets/${word}_of_${s}.png`,
      `assets/${aceNum}_of_${s}.png`
    ];
  }

  // ---------- Node builder ----------
  function buildCardNode(code){
    const a = document.createElement('a');
    a.href = '#';
    a.className = 'card-tile';
    a.draggable = true;
    a.dataset.code = code;
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

  // ---------- Game actions ----------
  function clearAll(){
    tPiles.forEach(p => p.innerHTML = '');
    fPiles.forEach(p => { p.innerHTML=''; p.dataset.top=''; });
    if (deckZone) deckZone.innerHTML = '';
    if (discardZone) discardZone.innerHTML = '';
    nodes.clear(); undealt = [];
    firstDiscardAlerted = false;
    if (winBanner) winBanner.hidden = true;
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

  function randomTableau(){
    return tPiles[Math.floor(Math.random()*tPiles.length)];
  }

  // ---------- Drag & Drop ----------
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
    if (container === discardZone){ moveToDiscard(code); layoutAll(); return; }
    if (container === deckZone){ moveToDeck(code); layoutAll(); return; }

    // insert before/after inside tableau based on cursor Y
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

  // ---------- Zone helpers ----------
  function moveToDiscard(code){
    const n = nodes.get(code); if (!n || !discardZone) return;
    n.classList.add('mini'); discardZone.appendChild(n); settle(n);
    if (!firstDiscardAlerted){ alert(`${human(code)} discarded — event captured.`); firstDiscardAlerted = true; }
    setStatus(`${human(code)} moved to discard.`);
  }

  function moveToDeck(code){
    const n = nodes.get(code); if (!n || !deckZone) return;
    n.classList.add('mini'); deckZone.appendChild(n); settle(n);
    setStatus(`${human(code)} moved to deck area.`);
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

  function requiredRankForFoundation(zone){
    return zone.querySelectorAll('.card-tile').length + 1;
  }

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

  // small settle animation
  function settle(n){ n.classList.add('settle'); setTimeout(()=> n.classList.remove('settle'), 160); }

  // ---------- Layout: tableau cascade + foundation cascade ----------
  function layoutTableau(){
    tPiles.forEach(zone => {
      const cards = Array.from(zone.querySelectorAll('.card-tile'));
      cards.forEach((c,i) => {
        c.style.top = `${i * TABLEAU_OFFSET}px`;
        c.style.zIndex = `${i}`;
      });
    });
  }

  function layoutFoundations(){
    fPiles.forEach(zone => {
      const cards = Array.from(zone.querySelectorAll('.card-tile'));
      cards.forEach((c,i) => {
        c.style.top = `${i * FOUNDATION_OFFSET}px`;
        c.style.zIndex = `${i}`;
      });
      const top = cards[cards.length-1];
      zone.dataset.top = top ? `Top: ${human(top.dataset.code)}` : 'Empty';
    });
  }

  function layoutAll(){
    layoutTableau();
    layoutFoundations();
  }

  // ---------- Auto-moves ----------
  function findFirstMovable(){
    const areas = [...tPiles, discardZone, deckZone].filter(Boolean);
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

  // ---------- Win ----------
  function checkWin(){
    const complete = fPiles.every(p => p.querySelectorAll('.card-tile').length === 13);
    if (complete){
      if (winBanner) winBanner.hidden = false;
      else alert('🎉 All foundations complete — you win!');
      setStatus('All foundations complete — you win!');
    }
  }

  // ---------- Bind zones ----------
  tPiles.forEach(p => makeDropzone(p, (code, zone) => { dropToTableau(code, zone); }));
  fPiles.forEach(p => makeDropzone(p, (code, zone) => { dropToFoundation(code, zone); }));
  makeDropzone(discardZone, (code)=> { moveToDiscard(code); layoutAll(); });
  makeDropzone(deckZone,    (code)=> { moveToDeck(code); layoutAll(); });

  // ---------- Buttons ----------
  dealBtn?.addEventListener('click', () => { dealAll(); });
  drawBtn?.addEventListener('click', () => { drawOne(); });
  resetBtn?.addEventListener('click', () => { clearAll(); layoutAll(); });
  autoOneBtn?.addEventListener('click', () => { autoMoveOne(); });
  autoSomeBtn?.addEventListener('click', () => { autoMoveSome(5); });
  autoAllBtn?.addEventListener('click', () => { autoMoveAll(); });
  sendRunsBtn?.addEventListener('click', () => { sendCompletedSuit(); });
  playAgainBtn?.addEventListener('click', () => { if (winBanner) winBanner.hidden = true; clearAll(); dealAll(); });

  // ---------- Mobile tap-to-move fallback ----------
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
        } else if (pile === discardZone) moveToDiscard(selectedCode);
        else if (pile === deckZone)     moveToDeck(selectedCode);

        selectedCode=null; layoutAll(); e.preventDefault();
      }
    }, {passive:false});
  })();

  // ---------- Auto-deal on load ----------
  dealAll();
})();
