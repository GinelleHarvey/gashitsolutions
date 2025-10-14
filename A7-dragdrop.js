/* =========================================================
   Assignment 7 – Drag/Drop Card Game
   Supports desktop drag & mobile tap-to-move
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

  // ====== Constants ======
  const SUITS = ['S', 'H', 'D', 'C']; // Spades, Hearts, Diamonds, Clubs
  const RANKS = [1,2,3,4,5,6,7,8,9,10,11,12,13];
  const foundationMap = {
    'fS': 'Spades',
    'fH': 'Hearts',
    'fD': 'Diamonds',
    'fC': 'Clubs'
  };

  // ====== DOM Elements ======
  const tableau = document.getElementById('tableau');
  const foundations = document.getElementById('foundations');
  const deckZone = document.getElementById('deckZone');
  const discardZone = document.getElementById('discardZone');
  const status = document.getElementById('status');
  const winBanner = document.getElementById('winBanner');

  // ====== Utility ======
  const human = code => {
    const suit = {S:'Spades',H:'Hearts',D:'Diamonds',C:'Clubs'}[code[0]];
    const r = parseInt(code.slice(1));
    const rank = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"][r-1];
    return `${rank} of ${suit}`;
  };

  const setStatus = txt => { status.textContent = txt; };

  // ====== Deck Setup ======
  const deck = [];
  SUITS.forEach(suit => RANKS.forEach(rank => deck.push(`${suit}${rank}`)));

  function shuffle(arr){
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  // ====== Create Cards ======
  function createCard(code){
    const div = document.createElement('div');
    div.className = 'card-tile';
    div.dataset.code = code;
    const img = document.createElement('img');
    img.src = `assets/cards/${code}.png`;
    img.alt = human(code);
    div.appendChild(img);
    return div;
  }

  // ====== Initialize Board ======
  function initGame(){
    tableau.innerHTML = '';
    foundations.innerHTML = '';
    discardZone.innerHTML = '';
    deckZone.innerHTML = '';
    winBanner.hidden = true;

    shuffle(deck);
    const piles = 7;
    for(let i=0; i<piles; i++){
      const pile = document.createElement('div');
      pile.className = 'slot pile';
      pile.dataset.role = 'tableau';
      pile.id = `t${i}`;
      for(let j=0; j<=i; j++){
        const cardCode = deck.pop();
        const card = createCard(cardCode);
        if(j === i) card.classList.add('top');
        pile.appendChild(card);
      }
      tableau.appendChild(pile);
    }

    // Create named foundation slots
    for (let id in foundationMap){
      const f = document.createElement('div');
      f.className = 'slot pile';
      f.dataset.role = 'foundation';
      f.id = id;
      f.dataset.name = foundationMap[id];
      const label = document.createElement('span');
      label.className = 'slot-name';
      label.textContent = foundationMap[id];
      f.appendChild(label);
      foundations.appendChild(f);
    }

    // Remaining cards to deck
    deck.forEach(code => deckZone.appendChild(createCard(code)));

    setStatus('Game ready. Drag or tap a card to play.');
    makeDraggable();
  }

  // ====== Draggable Setup ======
  function makeDraggable(){
    $('.card-tile').draggable({
      revert: 'invalid',
      stack: '.card-tile',
      start: function(){ $(this).addClass('dragging'); },
      stop: function(){ $(this).removeClass('dragging'); }
    });

    $('.slot').droppable({
      accept: '.card-tile',
      drop: function(e, ui){
        const cardCode = ui.draggable.data('code');
        const role = this.dataset.role;
        if (role === 'foundation') {
          dropToFoundation(cardCode, this);
        } else if (role === 'tableau') {
          this.appendChild(ui.draggable[0]);
          setStatus(`${human(cardCode)} moved to tableau.`);
          layoutFoundations(); checkWin();
        }
      }
    });
  }

  // ====== Drop to Foundation ======
  function dropToFoundation(code, slot){
    slot.appendChild(document.querySelector(`[data-code="${code}"]`));
    layoutFoundations();
    checkWin();
    setStatus(`${human(code)} moved to ${slot.dataset.name}.`);
  }

  // ====== Layout Foundation Stacks ======
  function layoutFoundations(){
    document.querySelectorAll('[data-role="foundation"]').forEach(f=>{
      const cards = f.querySelectorAll('.card-tile');
      cards.forEach((c,i)=>{
        c.style.position='absolute';
        c.style.top = `${i*4}px`;
        c.style.left = `${i*2}px`;
        c.style.zIndex = i;
      });
      if(cards.length>0){
        const topCard = cards[cards.length-1];
        f.dataset.top = human(topCard.dataset.code);
      } else {
        f.dataset.top = f.dataset.name;
      }
    });
  }

  // ====== Check for Win ======
  function checkWin(){
    const full = [...document.querySelectorAll('[data-role="foundation"]')]
      .every(f => f.querySelectorAll('.card-tile').length === 13);
    if(full){
      winBanner.hidden = false;
      setStatus('🎉 Congratulations! You win!');
    }
  }

  // ====== Event Buttons ======
  document.getElementById('newGameBtn')?.addEventListener('click', initGame);
  document.getElementById('resetBtn')?.addEventListener('click', initGame);

  // ====== Start ======
  initGame();

  // ====== Mobile Tap-to-Move Fallback ======
  (function(){
    const isCoarse = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
    if (!isCoarse) return; // desktop keeps native drag

    let selectedCode = null;

    function highlight(node, on){
      if (!node) return;
      node.style.outline = on ? '3px solid var(--accent)' : '';
      node.style.outlineOffset = on ? '2px' : '';
    }

    document.getElementById('a7').addEventListener('click', (e)=>{
      const card = e.target.closest('.card-tile');
      const pile = e.target.closest('.slot');

      // Select / deselect a card
      if (card) {
        const code = card.dataset.code;
        if (selectedCode && selectedCode === code) {
          highlight(card, false); selectedCode = null;
        } else {
          if (selectedCode) {
            const prev = document.querySelector(`.card-tile[data-code="${selectedCode}"]`);
            highlight(prev, false);
          }
          selectedCode = code;
          highlight(card, true);
        }
        e.preventDefault();
        return;
      }

      // Move to a slot if selected
      if (pile && selectedCode){
        const node = document.querySelector(`.card-tile[data-code="${selectedCode}"]`);
        highlight(node, false);

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
          layoutFoundations(); checkWin();
        } else if (pile.id === 'discardZone') {
          discardZone.appendChild(node);
        } else if (pile.id === 'deckZone') {
          deckZone.appendChild(node);
        }

        selectedCode = null;
        e.preventDefault();
      }
    }, { passive:false });
  })();
});
