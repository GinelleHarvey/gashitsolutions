// A14 – Memory Match Game
// Themes: Emoji symbols, Text playing cards, PNG playing cards from /assets
// Features: difficulty up to 26 pairs, full deck button, preview + visible shuffle,
// accuracy, best time per theme, bonus preview mini-game, stronger match burst effects.

// ---------- Card Definitions ----------

// Emoji / symbol set for card faces (up to 26)
const memSymbolIcons = [
  "💻","📱","🖱️","⌨️","📡","💾",
  "🧠","🛰️","🧪","🎮","📚","📊",
  "📔","🖊️","🧮","🕹️","🎧","💡",
  "🔐","🔧","⚙️","📂","🧱","📶",
  "🧬","🌐"
];

// PNG / text card definitions based on your assets folder.
// We only need 26 unique cards (26 pairs = 52 cards).
const memPngCards = (() => {
  const ranks = ["2","3","4","5","6","7","8","9","10"];
  const suits = ["clubs","diamonds","hearts","spades"];
  const suitSymbols = {
    clubs: "♣",
    diamonds: "♦",
    hearts: "♥",
    spades: "♠"
  };

  const defs = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      if (defs.length >= 26) break;
      const key   = `${rank}_of_${suit}`;          // matches assets: 2_of_clubs.png
      const label = `${rank}${suitSymbols[suit]}`; // "10♠"
      const img   = `${key}.png`;                  // "2_of_clubs.png"
      defs.push({ key, label, img });
    }
    if (defs.length >= 26) break;
  }
  return defs;
})();

// ---------- DOM Elements ----------

const memPairRange       = document.getElementById("memPairRange");
const memPairCountSpan   = document.getElementById("memPairCount");
const memStartBtn        = document.getElementById("memStartBtn");
const memFullDeckBtn     = document.getElementById("memFullDeckBtn");
const memThemeSelect     = document.getElementById("memTheme");

const memBoard           = document.getElementById("memBoard");
const memTimeDisplay     = document.getElementById("memTime");
const memMovesDisplay    = document.getElementById("memMoves");
const memAccuracyDisplay = document.getElementById("memAccuracy");
const memBestTimeDisplay = document.getElementById("memBestTime");

const memWinModal        = document.getElementById("memWinModal");
const memFinalTimeSpan   = document.getElementById("memFinalTime");
const memFinalMovesSpan  = document.getElementById("memFinalMoves");
const memPlayAgainBtn    = document.getElementById("memPlayAgainBtn");

const memBonusBtn        = document.getElementById("memBonusBtn");

// ---------- Game State ----------

let memNumberOfPairs = memPairRange ? parseInt(memPairRange.value, 10) : 10;
let memCards          = [];
let memFirstCardEl    = null;
let memSecondCardEl   = null;
let memLockBoard      = false;
let memIsPreviewing   = false;

let memTimerId        = null;
let memElapsedSeconds = 0;
let memMoves          = 0;
let memMatchedPairs   = 0;

let memTheme          = memThemeSelect ? memThemeSelect.value : "symbols";

let memBonusAvailable = false;

// ---------- Helpers ----------

function memShuffle(arr) {
  const array = arr.slice();
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function memStartTimer() {
  memStopTimer();
  memTimerId = setInterval(() => {
    memElapsedSeconds++;
    memTimeDisplay.textContent = memElapsedSeconds.toString();
  }, 1000);
}

function memStopTimer() {
  if (memTimerId !== null) {
    clearInterval(memTimerId);
    memTimerId = null;
  }
}

function memGetBestKey() {
  if (memTheme === "png")  return "A14BestTimePNG";
  if (memTheme === "text") return "A14BestTimeText";
  return "A14BestTimeSymbols";
}

function memUpdateBestTimeDisplay() {
  const best = localStorage.getItem(memGetBestKey());
  memBestTimeDisplay.textContent = best ? `${best}s` : "N/A";
}

function memSaveBestTimeIfNeeded() {
  const key  = memGetBestKey();
  const best = localStorage.getItem(key);
  if (!best || memElapsedSeconds < parseInt(best, 10)) {
    localStorage.setItem(key, memElapsedSeconds.toString());
  }
}

function memUpdateAccuracy() {
  if (!memAccuracyDisplay) return;
  const totalFlips   = memMoves * 2;
  const correctFlips = memMatchedPairs * 2;
  const acc = totalFlips ? Math.round((correctFlips / totalFlips) * 100) : 0;
  memAccuracyDisplay.textContent = acc.toString();
}

// Stronger burst effect when you get a match (multiple particles)
function memSpawnMatchBurst(targetEl) {
  if (!memBoard || !targetEl) return;

  const boardRect = memBoard.getBoundingClientRect();
  const rect      = targetEl.getBoundingClientRect();

  const centerX = rect.left - boardRect.left + rect.width / 2;
  const centerY = rect.top  - boardRect.top  + rect.height / 2;

  const icons = ["✨","🎉","💥","🌟","💜","⚡"];

  // Create multiple sparkles for a bigger effect
  const count = 5;
  for (let i = 0; i < count; i++) {
    const burst = document.createElement("div");
    burst.className = "mem-burst";
    burst.textContent = icons[Math.floor(Math.random() * icons.length)];

    // Slight random offset so they don't stack perfectly
    const offsetX = (Math.random() - 0.5) * 40; // -20 to 20 px
    const offsetY = (Math.random() - 0.5) * 20; // -10 to 10 px

    burst.style.left = `${centerX + offsetX}px`;
    burst.style.top  = `${centerY + offsetY}px`;

    memBoard.appendChild(burst);

    setTimeout(() => burst.remove(), 1000);
  }
}

// ---------- Deck Generation ----------

function memGenerateDeck() {
  const deck = [];

  if (memTheme === "png" || memTheme === "text") {
    const defs = memPngCards.slice(0, memNumberOfPairs);
    defs.forEach(def => {
      deck.push({
        key: def.key,
        type: memTheme === "png" ? "png" : "text",
        img: def.img,
        label: def.label
      });
      deck.push({
        key: def.key,
        type: memTheme === "png" ? "png" : "text",
        img: def.img,
        label: def.label
      });
    });
  } else {
    const icons = memSymbolIcons.slice(0, memNumberOfPairs);
    icons.forEach(icon => {
      deck.push({ key: icon, type: "emoji", icon });
      deck.push({ key: icon, type: "emoji", icon });
    });
  }

  return memShuffle(deck);
}

// ---------- Rendering ----------

function memCreateCardElement(card, index) {
  const cardEl = document.createElement("button");
  cardEl.classList.add("mem-card");
  cardEl.type = "button";
  cardEl.dataset.index = index;

  const inner = document.createElement("div");
  inner.classList.add("mem-card-inner");

  const back = document.createElement("div");
  back.classList.add("mem-card-face", "back");
  back.setAttribute("aria-hidden", "true");

  const front = document.createElement("div");
  front.classList.add("mem-card-face", "front");

  if (card.type === "png") {
    const img = document.createElement("img");
    img.src = "assets/" + card.img;   // e.g. assets/2_of_clubs.png
    img.alt = card.label || card.key;
    front.appendChild(img);
  } else if (card.type === "text") {
    front.classList.add("text-cards");
    front.textContent = card.label;
  } else {
    front.textContent = card.icon;
  }

  inner.appendChild(back);
  inner.appendChild(front);
  cardEl.appendChild(inner);

  cardEl.addEventListener("click", () => memHandleCardClick(cardEl));
  return cardEl;
}

function memRenderBoard() {
  if (!memBoard) return;

  memBoard.classList.remove("ready");
  memBoard.innerHTML = "";

  memCards.forEach((card, index) => {
    const el = memCreateCardElement(card, index);
    memBoard.appendChild(el);
  });

  requestAnimationFrame(() => {
    memBoard.classList.add("ready");
  });
}

// ---------- Visible Shuffle (cards move to new slots) ----------

function memVisibleShuffle() {
  if (!memBoard) return;
  const cards = Array.from(memBoard.querySelectorAll(".mem-card"));
  if (!cards.length) return;

  memLockBoard = true;

  const boardRect = memBoard.getBoundingClientRect();
  const positions = cards.map(card => {
    const r = card.getBoundingClientRect();
    return {
      card,
      left:  r.left - boardRect.left,
      top:   r.top  - boardRect.top,
      width: r.width,
      height:r.height
    };
  });

  // Freeze board height so it doesn't collapse while cards go absolute
  const boardHeight = boardRect.height;
  memBoard.style.height = boardHeight + "px";

  // Turn cards into absolutely positioned at their current spots
  positions.forEach(pos => {
    const card = pos.card;
    card.style.position   = "absolute";
    card.style.left       = `${pos.left}px`;
    card.style.top        = `${pos.top}px`;
    card.style.width      = `${pos.width}px`;
    card.style.height     = `${pos.height}px`;
    card.style.transition = "left 0.55s ease, top 0.55s ease, transform 0.55s ease";
    card.style.transform  = "scale(1)";
  });

  // Build a shuffled index mapping
  const indices  = cards.map((_, idx) => idx);
  const shuffled = memShuffle(indices);

  const newOrder = new Array(cards.length);

  shuffled.forEach((targetIndex, i) => {
    const card      = cards[i];
    const targetPos = positions[targetIndex];

    card.style.left = `${targetPos.left}px`;
    card.style.top  = `${targetPos.top}px`;

    // slight random wobble
    const angle = (Math.random() - 0.5) * 8; // -4deg to 4deg
    card.style.transform = `scale(1.03) rotate(${angle}deg)`;

    newOrder[targetIndex] = card;
  });

  // After animation completes, clean up and restore grid layout
  setTimeout(() => {
    memBoard.style.height = "";

    newOrder.forEach(card => {
      card.style.position   = "";
      card.style.left       = "";
      card.style.top        = "";
      card.style.width      = "";
      card.style.height     = "";
      card.style.transition = "";
      card.style.transform  = "";
    });

    // Re-append in new order so DOM order matches visual order
    newOrder.forEach(card => memBoard.appendChild(card));

    memLockBoard = false;
  }, 620);
}

// ---------- Fancy Intro: Preview + Shuffle ----------

// Preview all cards, then flip back and (optionally) shuffle.
// options: { resetTime: boolean, shuffleAfter: boolean }
function memPreviewBoard(options = {}) {
  const { resetTime = false, shuffleAfter = false } = options;
  if (!memBoard) return;
  const cards = memBoard.querySelectorAll(".mem-card");
  if (!cards.length) return;

  // Ensure all cards start face-down.
  cards.forEach(c => c.classList.remove("flipped","matched","mismatch"));

  memIsPreviewing = true;
  memLockBoard    = true;

  // Small delay so players see the face-down layout first.
  const startDelay = 350;

  setTimeout(() => {
    cards.forEach(c => c.classList.add("flipped")); // show fronts
  }, startDelay);

  let previewTime;
  if (memNumberOfPairs <= 8)       previewTime = 1600;
  else if (memNumberOfPairs <= 16) previewTime = 2100;
  else                             previewTime = 2600;

  setTimeout(() => {
    // Flip them back down.
    cards.forEach(c => c.classList.remove("flipped"));
    memIsPreviewing = false;
    memLockBoard    = false;

    if (resetTime) {
      memElapsedSeconds = 0;
      memTimeDisplay.textContent = "0";
    }

    if (shuffleAfter) {
      memVisibleShuffle(); // visibly move them to new slots
    }
  }, startDelay + previewTime);
}

// ---------- Game Reset / Start ----------

function memResetState() {
  memFirstCardEl  = null;
  memSecondCardEl = null;
  memLockBoard    = false;
  memIsPreviewing = false;

  memMatchedPairs   = 0;
  memMoves          = 0;
  memElapsedSeconds = 0;

  memMovesDisplay.textContent = "0";
  memTimeDisplay.textContent  = "0";
  memUpdateAccuracy();

  memBonusAvailable = false;
  if (memBonusBtn) memBonusBtn.style.display = "none";

  memStopTimer();
}

function memStartGame() {
  if (!memPairRange) return;

  memNumberOfPairs = parseInt(memPairRange.value, 10);
  memPairCountSpan.textContent = memNumberOfPairs.toString();

  memResetState();
  memCards = memGenerateDeck();
  memRenderBoard();
  memUpdateBestTimeDisplay();

  // Sequence: cards down → brief preview → flip back → visible shuffle.
  memPreviewBoard({ resetTime: true, shuffleAfter: true });
}

// ---------- Core Game Logic ----------

function memHandleCardClick(cardEl) {
  if (memIsPreviewing) return;
  if (memLockBoard)    return;
  if (cardEl.classList.contains("flipped") || cardEl.classList.contains("matched")) return;

  if (!memTimerId) {
    memStartTimer();
  }

  cardEl.classList.add("flipped");

  if (!memFirstCardEl) {
    memFirstCardEl = cardEl;
    return;
  }

  memSecondCardEl = cardEl;
  memLockBoard    = true;

  memMoves++;
  memMovesDisplay.textContent = memMoves.toString();

  memCheckForMatch();
}

function memCheckForMatch() {
  const i1 = parseInt(memFirstCardEl.dataset.index, 10);
  const i2 = parseInt(memSecondCardEl.dataset.index, 10);

  const isMatch = memCards[i1].key === memCards[i2].key;

  if (isMatch) {
    memHandleMatch(i1, i2);
  } else {
    memHandleMismatch();
  }
}

function memHandleMatch(i1, i2) {
  memCards[i1].matched = true;
  memCards[i2].matched = true;

  memFirstCardEl.classList.add("matched");
  memSecondCardEl.classList.add("matched");

  memMatchedPairs++;
  memSpawnMatchBurst(memSecondCardEl); // bigger sparkle burst on match

  // Bonus mini-game: every 3 matches, unlock a Bonus Peek (if game not done).
  if (memMatchedPairs % 3 === 0 && memMatchedPairs < memNumberOfPairs && memBonusBtn) {
    memBonusAvailable = true;
    memBonusBtn.style.display = "inline-block";
  }

  memResetSelection();
  memUpdateAccuracy();

  if (memMatchedPairs === memNumberOfPairs) {
    memHandleWin();
  }
}

function memHandleMismatch() {
  memFirstCardEl.classList.add("mismatch");
  memSecondCardEl.classList.add("mismatch");

  setTimeout(() => {
    memFirstCardEl.classList.remove("flipped", "mismatch");
    memSecondCardEl.classList.remove("flipped", "mismatch");
    memResetSelection();
    memUpdateAccuracy();
  }, 350);
}

function memResetSelection() {
  memFirstCardEl  = null;
  memSecondCardEl = null;
  memLockBoard    = false;
}

function memHandleWin() {
  memStopTimer();
  memSaveBestTimeIfNeeded();
  memUpdateBestTimeDisplay();

  memFinalTimeSpan.textContent  = memElapsedSeconds.toString();
  memFinalMovesSpan.textContent = memMoves.toString();

  if (memWinModal) {
    memWinModal.classList.add("show");
    memWinModal.setAttribute("aria-hidden", "false");
  }
}

// ---------- Event Listeners ----------

if (memPairRange) {
  memPairRange.addEventListener("input", () => {
    memPairCountSpan.textContent = memPairRange.value;
  });
}

if (memThemeSelect) {
  memThemeSelect.addEventListener("change", () => {
    memTheme = memThemeSelect.value;
    memStartGame();
  });
}

if (memStartBtn) {
  memStartBtn.addEventListener("click", () => {
    if (memWinModal) {
      memWinModal.classList.remove("show");
      memWinModal.setAttribute("aria-hidden", "true");
    }
    memStartGame();
  });
}

if (memFullDeckBtn && memPairRange) {
  memFullDeckBtn.addEventListener("click", () => {
    memPairRange.value = "26";
    memPairCountSpan.textContent = "26";
    if (memWinModal) {
      memWinModal.classList.remove("show");
      memWinModal.setAttribute("aria-hidden", "true");
    }
    memStartGame();
  });
}

if (memPlayAgainBtn) {
  memPlayAgainBtn.addEventListener("click", () => {
    if (memWinModal) {
      memWinModal.classList.remove("show");
      memWinModal.setAttribute("aria-hidden", "true");
    }
    memStartGame();
  });
}

// Bonus Peek mini-game
if (memBonusBtn) {
  memBonusBtn.addEventListener("click", () => {
    if (!memBonusAvailable) return;
    if (memIsPreviewing || memLockBoard) return;

    // Using the bonus costs one extra "move" – tiny tradeoff
    memMoves++;
    memMovesDisplay.textContent = memMoves.toString();

    memBonusAvailable = false;
    memBonusBtn.style.display = "none";

    // Preview again, but do NOT reset timer or shuffle this time.
    memPreviewBoard({ resetTime: false, shuffleAfter: false });
  });
}

// Close win modal by clicking outside
if (memWinModal) {
  memWinModal.addEventListener("click", (e) => {
    if (e.target === memWinModal) {
      memWinModal.classList.remove("show");
      memWinModal.setAttribute("aria-hidden", "true");
    }
  });
}

// ---------- Init ----------

if (memBoard && memPairRange) {
  memUpdateBestTimeDisplay();
  memStartGame();
}
