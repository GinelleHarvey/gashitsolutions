/* A7-dragdrop.js — HTML5 drag & drop solitaire demo (scoped to your page structure) */

const IMG_BASE = 'assets';
const SUITS = ['S','H','D','C'];
const RANKS = Array.from({length:13}, (_,i)=> i+1);

const suitName = { S:'spades', H:'hearts', D:'diamonds', C:'clubs' };
const rankName = { 1:'ace', 11:'jack', 12:'queen', 13:'king' };

const el = id => document.getElementById(id);
const tableau = el('tableau');
const tPiles = tableau ? Array.from(tableau.querySelectorAll('.pile[data-role="tableau"]')) : [];
const fPiles = ['fS','fH','fD','fC'].map(id => el(id)).filter(Boolean);
const deckZone = el('deckZone'), deckStack = el('deckStack');
const discardZone = el('discardZone'), discardStack = el('discardStack');

const dealBtn = el('dealBtn'), drawBtn = el('drawBtn'), resetBtn = el('resetBtn');
const autoAllBtn = el('autoAllBtn'), autoMoveBtn = el('autoMoveBtn');
const autoOneBtn = el('autoOneBtn'), autoSomeBtn = el('autoSomeBtn'), sendRunsBtn = el('sendRunsBtn');
const winBanner = el('winBanner'), playAgainBtn = el('playAgainBtn');

let mainDeck = [];
let nodes = new Map();
let firstDiscardAlerted = false;

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
  a.addEventListener('dblclick', () => tryMoveToFoundation(code));

  const img = document.createElement('img');
  img.src = imgPath(code);
  img.alt = human(code);
  img.onerror = () => { img.alt += ' (image not found)'; };
  a.appendChild(img);
  return a;
}

/* === UI === */
function dealAll(){
  clearAll();
  mainDeck = freshShuffledDeck();
  mainDeck.forEach(code => nodes.set(code, buildCardNode(code)));

  const counts = [7,8,9,10,11,12,13];
  counts.forEach((n, i) => {
    for (let k=0; k<n; k++){
      const code = mainDeck.shift();
      const node = nodes.get(code);
      tPiles[i % tPiles.length].appendChild(node);
    }
  });

  setStatus(`Dealt to tableau. ${mainDeck.length} in deck.`);
  layoutFoundations();
}

function drawOne(){
  if (mainDeck.length === 0){ setStatus('Deck empty.'); return; }
  const code = mainDeck.shift();
  moveNodeToPile(nodes.get(code), randomTableauPile());
  setStatus(`${human(code)} drawn. ${mainDeck.length} left in deck.`);
}

function randomTableauPile(){
  return tPiles[Math.floor(Math.random()*tPiles.length)];
}

function clearAll(){
  tPiles.forEach(p => p.innerHTML = '');
  fPiles.forEach(p => { p.innerHTML=''; p.dataset.top=''; });
  if (deckStack) deckStack.innerHTML = '';
  if (discardStack) discardStack.innerHTML = '';
  nodes.clear();
  mainDeck = [];
  firstDiscardAlerted = false;
  if (winBanner) winBanner.hidden = true;
  setStatus('Table cleared.');
}

/* === DnD === */
function onDragStart(ev){
  const code = ev.currentTarget.dataset.code;
  ev.dataTransfer.setData('text/plain', code);
  ev.dataTransfer.effectAllowed = 'move';
}

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

function onDropOnCard(ev){
  ev.preventDefault();
  const targetCard = ev.currentTarget;
  const code = ev.dataTransfer.getData('text/plain');
  if (!code) return;
  const dragNode = nodes.get(code);
  if (!dragNode) return;

  const container = targetCard.parentElement;

  if (container.dataset.role === 'foundation'){
    dropToFoundation(code, container);
    return;
  }
  if (container === discardStack) { moveToDiscard(code); return; }
  if (container === deckStack)    { moveToDeckZone(code); return; }

  if (container.dataset.role === 'tableau'){
    const rect = targetCard.getBoundingClientRect();
    const after = ev.clientY > rect.top + rect.height/2;
    dragNode.classList.remove('mini');
    if (after) container.insertBefore(dragNode, targetCard.nextSibling);
    else       container.insertBefore(dragNode, targetCard);
    settle(dragNode);
    setStatus(`${human(code)} placed ${after?'after':'before'} ${human(targetCard.dataset.code)}.`);
  }

  layoutFoundations();
  checkWin();
}

/* === Zone handlers === */
function moveToDiscard(code){
  const n = nodes.get(code); if (!n) return;
  n.classList.add('mini');
  discardStack.appendChild(n);
  settle(n);
  if (!firstDiscardAlerted){ alert(`${human(code)} discarded — event captured.`); firstDiscardAlerted = true; }
  setStatus(`${human(code)} moved to discard.`);
}

function moveToDeckZone(code){
  const n = nodes.get(code); if (!n) return;
  n.classList.add('mini');
  deckStack.appendChild(n);
  settle(n);
  setStatus(`${human(code)} moved to deck zone.`);
}

function moveNodeToPile(node, pile){
  if (!node || !pile) return;
  node.classList.remove('mini');
  pile.appendChild(node);
  settle(node);
  setStatus(`${human(node.dataset.code)} moved to ${pile.id}.`);
}

function dropToTableau(code, zone){
  moveNodeToPile(nodes.get(code), zone);
  layoutFoundations();
}

function requiredRankForFoundation(zone){
  return zone.childElementCount + 1; // A=1
}

function dropToFoundation(code, zone){
  const suit = zone.dataset.suit;
  const need = requiredRankForFoundation(zone);
  const cardSuit = suitOf(code);
  const cardRank = rankOf(code);
  if (cardSuit !== suit){ setStatus(`Only ${suitName[suit]} allowed here.`); return; }
  if (cardRank !== need){ setStatus(`Need ${human(`${suit}${need}`)} next.`); return; }
  const n = nodes.get(code);
  n.classList.remove('mini');
  zone.appendChild(n);
  settle(n);
  setStatus(`${human(code)} placed on foundation.`);
  layoutFoundations();
  checkWin();
}

function tryMoveToFoundation(code){
  const suit = suitOf(code);
  const zone = el('f'+suit);
  const need = requiredRankForFoundation(zone);
  if (rankOf(code) === need){
    dropToFoundation(code, zone);
  } else {
    setStatus(`Not ready for foundation. ${human(`${suit}${need}`)} is next.`);
  }
}

/* small settle animation */
function settle(n){
  n.classList.add('settle');
  setTimeout(()=> n.classList.remove('settle'), 200);
}

/* === Foundation layout (cascade + label) === */
function layoutFoundations(){
  fPiles.forEach(zone => {
    const cards = Array.from(zone.querySelectorAll('.card-tile'));
    const top = cards[cards.length-1];
    zone.dataset.top = top ? `Top: ${human(top.dataset.code)}` : 'Empty';
  });
}

/* === Auto-move logic === */
function findFirstMovableToFoundation(){
  const scanAreas = [...tPiles, discardStack, deckStack].filter(Boolean);
  for (const area of scanAreas){
    const cards = Array.from(area.querySelectorAll('.card-tile'));
    for (const n of cards){
      const code = n.dataset.code;
      const zone = el('f'+suitOf(code));
      const need = requiredRankForFoundation(zone);
      if (rankOf(code) === need){
        return { code, zone };
      }
    }
  }
  return null;
}

function autoMoveOne(){
  const mv = findFirstMovableToFoundation();
  if (!mv){ setStatus('No auto-move available.'); return false; }
  dropToFoundation(mv.code, mv.zone);
  return true;
}

async function autoMoveSome(count=5){
  let moved = 0;
  while (moved < count && autoMoveOne()) {
    moved++;
    await new Promise(r=>setTimeout(r,120));
  }
  if (moved === 0) setStatus('No auto-moves available.');
}

function autoMoveAllPossible(){
  let moved;
  do { moved = autoMoveOne(); } while (moved);
  if (!moved) setStatus('No more auto-moves available.');
}

/* Completed suit on a single pile (A..K same suit) */
function autoMoveCompletedSuit(){
  for (const pile of tPiles){
    const codes = Array.from(pile.querySelectorAll('.card-tile')).map(n => n.dataset.code);
    if (codes.length === 13){
      const suit = suitOf(codes[0]);
      const isSameSuit = codes.every(c => suitOf(c) === suit);
      const isOrdered = codes.every((c, i) => rankOf(c) === i+1);
      if (isSameSuit && isOrdered){
        const foundation = el('f'+suit);
        for (const c of codes){ dropToFoundation(c, foundation); }
        setStatus(`Moved complete ${suitName[suit]} suit to foundation.`);
        checkWin();
        return;
      }
    }
  }
  setStatus('No completed A..K suit found on a single pile.');
}

/* Win handling */
function showWin(){
  if (winBanner){ winBanner.hidden = false; }
  else { alert('🎉 All foundations complete — you win!'); }
  setStatus('All foundations complete — you win!');
}

function checkWin(){
  const complete = fPiles.every(p => p.childElementCount === 13);
  if (complete) showWin();
}

/* Activate zones & buttons */
tPiles.forEach(p => makeDropzone(p, (code, zone) => dropToTableau(code, zone)));
fPiles.forEach(p => makeDropzone(p, (code, zone) => dropToFoundation(code, zone)));
if (discardZone) makeDropzone(discardZone, (code)=> moveToDiscard(code));
if (deckZone)    makeDropzone(deckZone,    (code)=> moveToDeckZone(code));

if (dealBtn) dealBtn.addEventListener('click', dealAll);
if (drawBtn) drawBtn.addEventListener('click', drawOne);
if (resetBtn) resetBtn.addEventListener('click', clearAll);
if (autoAllBtn) autoAllBtn.addEventListener('click', autoMoveAllPossible);
if (autoMoveBtn) autoMoveBtn.addEventListener('click', autoMoveCompletedSuit);
if (sendRunsBtn) sendRunsBtn.addEventListener('click', autoMoveCompletedSuit);
if (autoOneBtn) autoOneBtn.addEventListener('click', autoMoveOne);
if (autoSomeBtn) autoSomeBtn.addEventListener('click', () => autoMoveSome(5));
if (playAgainBtn) playAgainBtn.addEventListener('click', () => { if (winBanner) winBanner.hidden = true; clearAll(); dealAll(); });

// Optional on-load deal:
// dealAll();
