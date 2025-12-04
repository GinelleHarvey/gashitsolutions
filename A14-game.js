// A14 – Memory Match Game with Emoji + Text Cards + PNG Cards

// Emoji / symbol set for card faces (up to 26)
const memSymbolIcons = [
  "💻","📱","🖱️","⌨️","📡","💾",
  "🧠","🛰️","🧪","🎮","📚","📊",
  "📔","🖊️","🧮","🕹️","🎧","💡",
  "🔐","🔧","⚙️","📂","🧱","📶",
  "🧬","🌐"
];

// Build PNG / text card definitions from your assets folder.
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
      const key = `${rank}_of_${suit}`;          // matches assets: 2_of_clubs.png etc.
      const label = `${rank}${suitSymbols[suit]}`; // for text theme
      const img = `${key}.png`;                 // e.g. "2_of_clubs.png"
      defs.push({ key, label, img });
    }
    if (defs.length >= 26) break;
  }
  return defs;
})();

// DOM elements
const memPairRange = document.getElementById("memPairRange");
const memPairCountSpan = document.getElementById("memPairCount");
const memStartBtn = document.getElementById("memStartBtn");
const memFullDeckBtn = document.getElementById("memFullDeckBtn");
const memThemeSelect = document.getElementById("memTheme");

const memBoard = document.getElementById("memBoard");
const memTimeDisplay = document.getElementById("memTime");
const memMovesDisplay = document.getElementById("memMoves");
const memAccuracyDisplay = document.getElementById("memAccuracy");
const memBestTimeDisplay = document.getElementById("memBestTime");

const memWinModal = document.getElementById("memWinModal");
const memFinalTimeSpan = document.getElementById("memFinalTime");
const memFinalMovesSpan = document.getElementById("memFinalMoves");
const memPlayAgainBtn = document.getElementById("memPlayAgainBtn");

// Game state
let memNumberOfPairs = memPairRange ? parseInt(memPairRange.value, 10) : 10;
let memCards = [];
let memFirstCardEl = null;
let memSecondCardEl = null;
let memLockBoard = false;
let memIsPreviewing = false;

let memTimerId = null;
let memElapsedSeconds = 0;
let memMoves = 0;
let memMatchedPairs = 0;

let memTheme = memThemeSelect ? memThemeSelect.value : "symbols";

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
  if (memTheme === "png") return "A14BestTimePNG";
  if (memTheme === "text") return "A14BestTimeText";
  return "A14BestTimeSymbols";
}

function memUpdateBestTimeDisplay() {
  const best = localStorage.getItem(memGetBestKey());
  if (best) {
    memBestTimeDisplay.textContent = best + "s";
  } else {
    memBestTimeDisplay.textContent = "N/A";
  }
}

function memSaveBestTimeIfNeeded() {
  const key = memGetBestKey();
  const best = localStorage.getItem(key);
  if (!best || memElapsedSeconds < parseInt(best, 10)) {
    localStorage.setItem(key, memElapsedSeconds.toString());
  }
}

function memUpdateAccuracy() {
  if (!memAccuracyDisplay) return;
  const totalFlips = memMoves * 2;
  const correctFlips = memMatchedPairs * 2;
  const acc = totalFlips ? Math.round((correctFlips / totalFlips) * 100) : 0;
  memAccuracyDisplay.textContent = acc.toString();
}

// Build deck based on theme
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
    img.src = "assets/" + card.img; // e.g. "assets/2_of_clubs.png"
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

// Quick preview at start of each game
function memPreviewBoard() {
  if (!memBoard) return;
  const cards = memBoard.querySelectorAll(".mem-card");
  if (!cards.length) return;

  memIsPreviewing = true;

  cards.forEach(c => c.classList.add("flipped"));

  let previewTime;
  if (memNumberOfPairs <= 8) previewTime = 1800;
  else if (memNumberOfPairs <= 16) previewTime = 2300;
  else previewTime = 2800;

  setTimeout(() => {
    cards.forEach(c => c.classList.remove("flipped"));
    memIsPreviewing = false;
    memElapsedSeconds = 0;
    memTimeDisplay.textContent = "0";
  }, previewTime);
}

function memResetState() {
  memFirstCardEl = null;
  memSecondCardEl = null;
  memLockBoard = false;
  memMatchedPairs = 0;
  memMoves = 0;
  memElapsedSeconds = 0;
  memTimeDisplay.textContent = "0";
  memMovesDisplay.textContent = "0";
  memUpdateAccuracy();
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
  memPreviewBoard(); // timer starts on first click
}

function memHandleCardClick(cardEl) {
  if (memIsPreviewing) return;
  if (memLockBoard) return;
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
  memLockBoard = true;

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
  memFirstCardEl = null;
  memSecondCardEl = null;
  memLockBoard = false;
}

function memHandleWin() {
  memStopTimer();
  memSaveBestTimeIfNeeded();
  memUpdateBestTimeDisplay();

  memFinalTimeSpan.textContent = memElapsedSeconds.toString();
  memFinalMovesSpan.textContent = memMoves.toString();

  if (memWinModal) {
    memWinModal.classList.add("show");
    memWinModal.setAttribute("aria-hidden", "false");
  }
}

// Event listeners
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

// Close modal by clicking outside
if (memWinModal) {
  memWinModal.addEventListener("click", (e) => {
    if (e.target === memWinModal) {
      memWinModal.classList.remove("show");
      memWinModal.setAttribute("aria-hidden", "true");
    }
  });
}

// Initialize when on this page
if (memBoard && memPairRange) {
  memUpdateBestTimeDisplay();
  memStartGame();
}
