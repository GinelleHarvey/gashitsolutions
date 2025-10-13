// ===== Paths & constants =====
const IMG_BASE = 'assets';
const SUITS = ['S','H','D','C'];
const RANKS = Array.from({length:13}, (_,i)=> i+1); // 1..13

// Map "S1" -> "ace_of_spades.png"
function codeToFilename(code){
  const s = code[0], n = Number(code.slice(1));
  const suits = { S:'spades', H:'hearts', D:'diamonds', C:'clubs' };
  const ranks = { 1:'ace', 11:'jack', 12:'queen', 13:'king' };
  const rank = ranks[n] || n;
  return `${rank}_of_${suits[s]}.png`;
}
const imgPath = (code) => `${IMG_BASE}/${codeToFilename(code)}`;

function human(code){
  const suit = {S:'Spades', H:'Hearts', D:'Diamonds', C:'Clubs'}[code[0]];
  const names = {1:'Ace', 11:'Jack', 12:'Queen', 13:'King'};
  const n = Number(code.slice(1));
  return `${names[n] || n} of ${suit}`;
}

// ===== State =====
let mainDeck = [];              // remaining undealt cards (codes)
let nodes = new Map();          // code -> DOM node (single instance moved around)
let firstDiscardAlerted = false;

// ===== DOM =====
const el = (id) => document.getElementById(id);
const table = el('table');
const deckZone = el('deckZone');
const discardZone = el('discardZone');
const deckStack = el('deckStack');
const discardStack = el('discardStack');

// ===== Deck helpers =====
function freshShuffledDeck(){
  const all = [];
  for (const s of SUITS) for (const r of RANKS) all.push(`${s}${r}`);
  for (let i=all.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

// ===== Build a single card node (one DOM node per code) =====
function buildCardNode(code){
  const a = document.createElement('a');
  a.href = '#';
  a.className = 'card-tile';
  a.draggable = true;
  a.dataset.code = code;
  a.setAttribute('aria-label', `Card ${human(code)} draggable`);
  a.addEventListener('click', (e)=> e.preventDefault());
  a.addEventListener('dragstart', onDragStart);
  // accept drop ON a card (swap within table)
  a.addEventListener('dragover', (ev)=> {
    // Only enable swap if both cards are on the table
    const draggingCode = ev.dataTransfer && ev.dataTransfer.types.includes('text/plain')
      ? null : null; // allow default; we'll handle in drop
    ev.preventDefault();
  });
  a.addEventListener('drop', onDropOnCard);

  const img = document.createElement('img');
  img.src = imgPath(code);
  img.alt = human(code);
  img.onerror = ()=> { img.alt += ' (image not found)'; };
  a.appendChild(img);
  return a;
}

// ===== Moves =====
function moveToTable(code){
  const node = nodes.get(code);
  if (!node) return;
  node.classList.remove('mini');
  table.appendChild(node);
  setStatus(`${human(code)} moved to table.`);
}

function moveToDiscard(code){
  const node = nodes.get(code);
  if (!node) return;
  node.classList.add('mini');
  discardStack.appendChild(node);
  if (!firstDiscardAlerted){
    alert(`${human(code)} discarded — event captured.`);
    firstDiscardAlerted = true;
  }
  setStatus(`${human(code)} moved to discard.`);
}

function moveToDeckZone(code){
  const node = nodes.get(code);
  if (!node) return;
  node.classList.add('mini');
  deckStack.appendChild(node);
  setStatus(`${human(code)} moved to deck zone.`);
}

// ===== UI actions =====
function dealAll(){
  // Reset everything, build nodes once
  clearAll();
  mainDeck = freshShuffledDeck();

  // Create DOM nodes for all 52 (keeps drag fast later)
  mainDeck.forEach(code => {
    const node = buildCardNode(code);
    nodes.set(code, node);
  });

  // Deal the first 20 to the table for room to play; rest remain in mainDeck
  const initial = 20;
  for (let i = 0; i < initial; i++){
    const code = mainDeck.shift();
    moveToTable(code);
  }
  setStatus(`Dealt ${initial} to table. ${mainDeck.length} in deck.`);
}

function drawOne(){
  if (mainDeck.length === 0){
    setStatus('Deck empty.');
    return;
  }
  const code = mainDeck.shift();
  moveToTable(code);
  setStatus(`${human(code)} drawn. ${mainDeck.length} left in deck.`);
}

function clearAll(){
  // wipe containers
  table.innerHTML = '';
  deckStack.innerHTML = '';
  discardStack.innerHTML = '';
  // reset state (keep nodes map; rebuilt on new deal)
  nodes.clear();
  mainDeck = [];
  firstDiscardAlerted = false;
  setStatus('Table cleared.');
}

function setStatus(msg){
  const s = el('status'); if (s) s.textContent = msg;
  const lr = el('liveRegion'); if (lr) lr.textContent = msg;
}

// ===== Drag & drop =====
function onDragStart(ev){
  const code = ev.currentTarget.dataset.code;
  ev.dataTransfer.setData('text/plain', code);
  ev.dataTransfer.effectAllowed = 'move';
}

// 1) Drop onto empty areas (zones)
function makeDropzone(zoneEl, handler){
  zoneEl.addEventListener('dragover', (ev)=> { ev.preventDefault(); zoneEl.classList.add('highlight'); });
  zoneEl.addEventListener('dragleave', ()=> zoneEl.classList.remove('highlight'));
  zoneEl.addEventListener('drop', (ev)=> {
    ev.preventDefault();
    zoneEl.classList.remove('highlight');
    const code = ev.dataTransfer.getData('text/plain');
    if (!code) return;
    handler(code);
  });
}
makeDropzone(discardZone, moveToDiscard);
makeDropzone(deckZone, moveToDeckZone);
makeDropzone(table, moveToTable); // drop on table background appends to end

// 2) Drop onto another CARD on the table = SWAP positions
function onDropOnCard(ev){
  ev.preventDefault();
  const targetCard = ev.currentTarget;
  const targetInTable = targetCard.parentElement === table;
  const draggingCode = ev.dataTransfer.getData('text/plain');
  if (!draggingCode) return;
  const draggingNode = nodes.get(draggingCode);
  if (!draggingNode) return;

  const draggingInTable = draggingNode.parentElement === table;

  // If you drop on a card in a stack (discard/deck), treat as move into that stack
  if (!targetInTable){
    if (targetCard.parentElement === discardStack) return moveToDiscard(draggingCode);
    if (targetCard.parentElement === deckStack) return moveToDeckZone(draggingCode);
  }

  // If both nodes are on the table, swap their positions
  if (draggingInTable && targetInTable){
    const a = draggingNode;
    const b = targetCard;
    const aNext = a.nextSibling === b ? a : a.nextSibling;
    b.replaceWith(a);
    if (aNext) aNext.before(b); else table.appendChild(b);
    setStatus(`Swapped ${human(draggingCode)} with ${b.dataset.code ? human(b.dataset.code) : 'card'}.`);
    return;
  }

  // Otherwise, move the dragging card to the table and insert before the target
  if (targetInTable){
    draggingNode.classList.remove('mini');
    table.insertBefore(draggingNode, targetCard);
    setStatus(`${human(draggingCode)} placed before ${human(targetCard.dataset.code)}.`);
    return;
  }
}

// ===== Wire up =====
el('dealBtn').addEventListener('click', dealAll);
el('drawBtn').addEventListener('click', drawOne);
el('resetBtn').addEventListener('click', clearAll);

// (no auto-deal; keep instructor’s flow obvious)
