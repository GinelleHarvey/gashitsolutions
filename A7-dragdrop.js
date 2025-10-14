// ===== Paths & constants =====
const IMG_BASE = 'assets';
const SUITS = ['S','H','D','C'];
const RANKS = Array.from({length:13}, (_,i)=> i+1); // 1..13

const suitName = { S:'spades', H:'hearts', D:'diamonds', C:'clubs' };
const rankName = { 1:'ace', 11:'jack', 12:'queen', 13:'king' };

const el = id => document.getElementById(id);
const tableau = el('tableau');
const tPiles = Array.from(tableau.querySelectorAll('.pile[data-role="tableau"]'));
const fPiles = ['fS','fH','fD','fC'].map(id => el(id));
const deckZone = el('deckZone'), deckStack = el('deckStack');
const discardZone = el('discardZone'), discardStack = el('discardStack');

let mainDeck = [];              // undealt codes
let nodes = new Map();          // code -> DOM <a>
let firstDiscardAlerted = false;

// ===== helpers =====
const codeToFilename = code => {
  const s = code[0], n = Number(code.slice(1));
  const rank = rankName[n] || n;
  return `${rank}_of_${suitName[s]}.png`;
};
const imgPath = code => `${IMG_BASE}/${codeToFilename(code)}`;

function human(code){
  const suit = {S:'Spades', H:'Hearts', D:'Diamonds', C:'Clubs'}[code[0]];
  const names = {1:'Ace', 11:'Jack', 12:'Queen', 13:'King'};
  const n = Number(code.slice(1));
  return `${names[n] || n} of ${suit}`;
}
const rankOf = code => Number(code.slice(1));
const suitOf = code => code[0];

function freshShuffledDeck(){
  const all = [];
  for (const s of SUITS) for (const r of RANKS) all.push(`${s}${r}`);
  for (let i=all.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

function setStatus(msg){
  const s = el('status'); if (s) s.textContent = msg;
  const lr = el('liveRegion'); if (lr) lr.textContent = msg;
}

function buildCardNode(code){
  const a = document.createElement('a');
  a.href = '#';
  a.className = 'card-tile';
  a.draggable = true;
  a.dataset.code = code;
  a.setAttribute('aria-label', `Card ${human(code)} draggable`);
  a.addEventListener('click', e => e.preventDefault());
  a.addEventListener('dragstart', onDragStart);
  a.addEventListener('dragover', e => { e.preventDefault(); });
  a.addEventListener('drop', onDropOnCard);

  const img = document.createElement('img');
  img.src = imgPath(code);
  img.alt = human(code);
  img.onerror = () => { img.alt += ' (image not found)'; };
  a.appendChild(img);
  return a;
}

// ===== UI actions =====
function dealAll(){
  clearAll();
  mainDeck = freshShuffledDeck();

  // create nodes for all 52
  mainDeck.forEach(code => nodes.set(code, buildCardNode(code)));

  // deal 7,8,9,10,11,12,13 across the tableau like solitaire spacing
  const counts = [7,8,9,10,11,12,13];
  counts.forEach((n, i) => {
    for (let k=0; k<n; k++){
      const code = mainDeck.shift();
      const node = nodes.get(code);
      tPiles[i % tPiles.length].appendChild(node);
    }
  });

  setStatus(`Dealt to tableau. ${mainDeck.length} in deck.`);
}

function drawOne(){
  if (mainDeck.length === 0){ setStatus('Deck empty.'); return; }
  const code = mainDeck.shift();
  moveNodeToPile(nodes.get(code), randomTableauPile()); // drop onto a random tableau pile for convenience
  setStatus(`${human(code)} drawn. ${mainDeck.length} left in deck.`);
}

function randomTableauPile(){
  return tPiles[Math.floor(Math.random()*tPiles.length)];
}

function clearAll(){
  tPiles.forEach(p => p.innerHTML = '');
  fPiles.forEach(p => p.innerHTML = '');
  deckStack.innerHTML = '';
  discardStack.innerHTML = '';
  nodes.clear();
  mainDeck = [];
  firstDiscardAlerted = false;
  setStatus('Table cleared.');
}

// ===== drag & drop core =====
function onDragStart(ev){
  const code = ev.currentTarget.dataset.code;
  ev.dataTransfer.setData('text/plain', code);
  ev.dataTransfer.effectAllowed = 'move';
}

// drop on empty zone/pile
function makeDropzone(zoneEl, handler){
  zoneEl.addEventListener('dragover', ev => { ev.preventDefault(); zoneEl.classList.add('highlight'); });
  zoneEl.addEventListener('dragleave', () => zoneEl.classList.remove('highlight'));
  zoneEl.addEventListener('drop', ev => {
    ev.preventDefault(); zoneEl.classList.remove('highlight');
    const code = ev.dataTransfer.getData('text/plain');
    if (!code) return;
    handler(code, zoneEl, ev);
  });
}

// drop on a card (insert before/after based on cursor)
function onDropOnCard(ev){
  ev.preventDefault();
  const targetCard = ev.currentTarget;
  const code = ev.dataTransfer.getData('text/plain');
  if (!code) return;
  const dragNode = nodes.get(code);
  if (!dragNode) return;

  const container = targetCard.parentElement;

  // If dropping onto a foundation card, treat as foundation pile rules
  if (container.dataset.role === 'foundation'){
    dropToFoundation(code, container);
    return;
  }

  // If dropping onto a stack mini card, treat as its zone move
  if (container === discardStack) { moveToDiscard(code); return; }
  if (container === deckStack)    { moveToDeckZone(code); return; }

  // Otherwise it's a tableau pile — insert before/after target based on cursor Y
  if (container.dataset.role === 'tableau'){
    const rect = targetCard.getBoundingClientRect();
    const after = ev.clientY > rect.top + rect.height/2;
    dragNode.classList.remove('mini');
    if (after) {
      container.insertBefore(dragNode, targetCard.nextSibling);
    } else {
      container.insertBefore(dragNode, targetCard);
    }
    setStatus(`${human(code)} placed ${after?'after':'before'} ${human(targetCard.dataset.code)}.`);
  }

  checkWin();
}

// zone handlers
function moveToDiscard(code){
  const n = nodes.get(code); if (!n) return;
  n.classList.add('mini'); discardStack.appendChild(n);
  if (!firstDiscardAlerted){ alert(`${human(code)} discarded — event captured.`); firstDiscardAlerted = true; }
  setStatus(`${human(code)} moved to discard.`);
}
function moveToDeckZone(code){
  const n = nodes.get(code); if (!n) return;
  n.classList.add('mini'); deckStack.appendChild(n);
  setStatus(`${human(code)} moved to deck zone.`);
}
function moveNodeToPile(node, pile){
  if (!node || !pile) return;
  node.classList.remove('mini');
  pile.appendChild(node);
  setStatus(`${human(node.dataset.code)} moved to ${pile.id}.`);
}

function dropToTableau(code, zone){
  // append to end of that tableau pile
  moveNodeToPile(nodes.get(code), zone);
}

function dropToFoundation(code, zone){
  const suit = zone.dataset.suit; // 'S','H','D','C'
  const need = zone.childElementCount + 1; // next required rank
  const cardSuit = suitOf(code);
  const cardRank = rankOf(code);
  if (cardSuit !== suit){
    setStatus(`Only ${suitName[suit]} allowed here.`);
    return;
  }
  if (cardRank !== need){
    setStatus(`Need ${human(`${suit}${need}`)} next.`);
    return;
  }
  const n = nodes.get(code);
  n.classList.remove('mini');
  zone.appendChild(n);
  setStatus(`${human(code)} placed on foundation.`);
  checkWin();
}

function checkWin(){
  const complete = fPiles.every(p => p.childElementCount === 13);
  if (complete) {
    alert('🎉 All foundations complete — you win!');
    setStatus('All foundations complete — you win!');
  }
}

// Make zones live
tPiles.forEach(p => makeDropzone(p, (code, zone) => dropToTableau(code, zone)));
fPiles.forEach(p => makeDropzone(p, (code, zone) => dropToFoundation(code, zone)));
makeDropzone(discardZone, (code)=> moveToDiscard(code));
makeDropzone(deckZone,    (code)=> moveToDeckZone(code));

// Utility stacks accept drops on their mini cards via onDropOnCard

// ===== buttons =====
el('dealBtn').addEventListener('click', dealAll);
el('drawBtn').addEventListener('click', drawOne);
el('resetBtn').addEventListener('click', clearAll);
el('autoMoveBtn').addEventListener('click', autoMoveCompletedSuit);

// ===== Auto-move any completed A..K suit from a single tableau pile to its foundation =====
function autoMoveCompletedSuit(){
  for (const pile of tPiles){
    const codes = Array.from(pile.querySelectorAll('.card-tile')).map(n => n.dataset.code);
    if (codes.length === 13){
      const suit = suitOf(codes[0]);
      const isSameSuit = codes.every(c => suitOf(c) === suit);
      const isOrdered = codes.every((c, i) => rankOf(c) === i+1); // A..K
      if (isSameSuit && isOrdered){
        const foundation = el('f'+suit);
        for (const c of codes){
          dropToFoundation(c, foundation);
        }
        setStatus(`Moved complete ${suitName[suit]} suit to foundation.`);
        checkWin();
        return;
      }
    }
  }
  setStatus('No completed A..K suit found on a single pile.');
}
