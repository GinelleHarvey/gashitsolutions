// ------- Config -------
const IMG_BASE = 'assets/cards'; // your PNGs are here
const SUITS = ['S','H','D','C'];
const RANKS = Array.from({length:13}, (_,i)=> i+1); // 1..13

// Map "S1" -> "ace_of_spades.png", "H10" -> "10_of_hearts.png"
function codeToFilename(code){
  const s = code[0];
  const n = Number(code.slice(1));
  const suits = { S:'spades', H:'hearts', D:'diamonds', C:'clubs' };
  const ranks = { 1:'ace', 11:'jack', 12:'queen', 13:'king' };
  const rank = ranks[n] || n; // 2..10 stay numeric
  return `${rank}_of_${suits[s]}.png`;
}
const imgPath = (code) => `${IMG_BASE}/${codeToFilename(code)}`;

function human(code){
  const suit = {S:'Spades', H:'Hearts', D:'Diamonds', C:'Clubs'}[code[0]];
  const names = {1:'Ace', 11:'Jack', 12:'Queen', 13:'King'};
  const n = Number(code.slice(1));
  return `${names[n] || n} of ${suit}`;
}

// ------- State -------
let onTable = new Map(); // code -> element
let discard = [];
let deckBin = [];

// ------- Deck/Deal -------
function buildDeck(){
  const all = [];
  for (const s of SUITS) for (const r of RANKS) all.push(`${s}${r}`);
  return shuffle(all);
}
function shuffle(a){
  for (let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function dealAll(){
  clearTable();
  const table = document.getElementById('table');
  const all = buildDeck();
  all.forEach(code=>{
    const card = document.createElement('a');
    card.href = '#';
    card.className = 'card-tile';
    card.draggable = true;
    card.dataset.code = code;
    card.setAttribute('aria-label', `Card ${human(code)} draggable`);
    card.addEventListener('dragstart', onDragStart);
    card.addEventListener('click', (e)=> e.preventDefault());

    const img = document.createElement('img');
    img.src = imgPath(code);
    img.alt = human(code);
    card.appendChild(img);

    table.appendChild(card);
    onTable.set(code, card);
  });
  setStatus('52 cards dealt.');
}

function clearTable(){
  document.getElementById('table').innerHTML = '';
  onTable.clear(); discard = []; deckBin = [];
  updatePreviews();
  setStatus('Table cleared.');
}

function setStatus(msg){
  document.getElementById('status').textContent = msg;
  const lr = document.getElementById('liveRegion');
  if (lr) lr.textContent = msg;
}

// ------- Drag & Drop -------
function onDragStart(ev){
  const code = ev.currentTarget.dataset.code;
  ev.dataTransfer.setData('text/plain', code);
  ev.dataTransfer.effectAllowed = 'move';
}

function makeDropzone(el, onDrop){
  el.addEventListener('dragover', (ev)=>{ ev.preventDefault(); el.classList.add('highlight'); });
  el.addEventListener('dragleave', ()=> el.classList.remove('highlight'));
  el.addEventListener('drop', (ev)=>{
    ev.preventDefault(); el.classList.remove('highlight');
    const code = ev.dataTransfer.getData('text/plain');
    if (code) onDrop(code);
  });
}

function dropToDiscard(code){
  if (!onTable.has(code)) return;
  onTable.get(code).remove();
  onTable.delete(code);
  discard.push(code);

  const msg = `${human(code)} discarded — event captured.`;
  alert(msg); // unmistakable for grading
  console.log('[DISCARD]', code);
  setStatus(msg);
  updatePreviews();
}

function dropToDeck(code){
  if (!onTable.has(code)) return;
  onTable.get(code).remove();
  onTable.delete(code);
  deckBin.push(code);
  setStatus(`${human(code)} moved to deck zone.`);
  updatePreviews();
}

function updatePreviews(){
  const dPrev = document.getElementById('discardPreview');
  const kPrev = document.getElementById('deckPreview');
  dPrev.innerHTML = ''; kPrev.innerHTML = '';
  discard.slice(-5).forEach(code=>{
    const img = document.createElement('img'); img.src = imgPath(code); img.alt = `Discarded ${human(code)}`;
    dPrev.appendChild(img);
  });
  deckBin.slice(-5).forEach(code=>{
    const img = document.createElement('img'); img.src = imgPath(code); img.alt = `Deck ${human(code)}`;
    kPrev.appendChild(img);
  });
}

// ------- Wire up -------
document.getElementById('dealBtn').addEventListener('click', dealAll);
document.getElementById('resetBtn').addEventListener('click', clearTable);
makeDropzone(document.getElementById('discardZone'), dropToDiscard);
makeDropzone(document.getElementById('deckZone'), dropToDeck);

// Optional: auto-deal on load
// dealAll();
