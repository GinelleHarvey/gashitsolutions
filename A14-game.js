// Assignment 14 – Memory Match Game with themes + animation

// Emoji / symbol set for the card faces
const memSymbolIcons = [
  "💻", "📱", "🖱️", "⌨️", "📡",
  "💾", "🧠", "🛰️", "🧪", "🎮"
]; // up to 10 pairs

// Playing card style set
const memCardIcons = [
  "A♠", "K♥", "Q♣", "J♦", "10♠",
  "9♥", "8♣", "7♦", "6♠", "5♥"
]; // also up to 10 pairs

// DOM elements
const memPairRange = document.getElementById("memPairRange");
const memPairCountSpan = document.getElementById("memPairCount");
const memStartBtn = document.getElementById("memStartBtn");
const memThemeSelect = document.getElementById("memTheme");

const memBoard = document.getElementById("memBoard");
const memTimeDisplay = document.getElementById("memTime");
const memMovesDisplay = document.getElementById("memMoves");
const memBestTimeDisplay = document.getElementById("memBestTime");

const memWinModal = document.getElementById("memWinModal");
const memFinalTimeSpan = document.getElementById("memFinalTime");
const memFinalMovesSpan = document.getElementById("memFinalMoves");
const memPlayAgainBtn = document.getElementById("memPlayAgainBtn");

// Game state
let memNumberOfPairs = memPairRange ? parseInt(memPairRange.value, 10) : 6;
let memCards = [];
let memFirstCardEl = null;
let memSecondCardEl = null;
let memLockBoard = false;

let memTimerId = null;
let memElapsedSeconds = 0;
let memMoves = 0;
let memMatchedPairs = 0;

let memTheme = memThemeSelect ? memThemeSelect.value : "symbols";

// Utilities
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
  memElapsedSeconds = 0;
  memTimeDisplay.textContent = "0";
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
  return memTheme === "cards" ? "A14MemoryBestTimeCards" : "A14MemoryBestTimeSymbols";
}

function memUpdateBestTimeDisplay() {
  const key = memGetBestKey();
  const best = localStorage.getItem(key);
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

// Build deck based on theme
function memGenerateDeck() {
  const baseIcons = memTheme === "cards" ? memCardIcons : memSymbolIcons;
  const icons = baseIcons.slice(0, memNumberOfPairs);
  const deck = [];
  icons.forEach(icon => {
    deck.push({ icon, matched: false });
    deck.push({ icon, matched: false });
  });
  return memShuffle(deck);
}

// Create DOM card
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
  front.textContent = card.icon;

  inner.appendChild(back);
  inner.appendChild(front);
  cardEl.appendChild(inner);

  cardEl.addEventListener("click", () => memHandleCardClick(cardEl));
  return cardEl;
}

function memRenderBoard() {
  if (!memBoard) return;

  // reset board animation
  memBoard.classList.remove("ready");
  memBoard.innerHTML = "";

  memCards.forEach((card, index) => {
    const el = memCreateCardElement(card, index);
    memBoard.appendChild(el);
  });

  // trigger fade-in
  requestAnimationFrame(() => {
    memBoard.classList.add("ready");
  });
}

// Reset state
function memResetState() {
  memFirstCardEl = null;
  memSecondCardEl = null;
  memLockBoard = false;
  memMoves = 0;
  memMatchedPairs = 0;
  memMovesDisplay.textContent = "0";
  memElapsedSeconds = 0;
  memTimeDisplay.textContent = "0";
}

// Start game
function memStartGame() {
  if (!memPairRange) return;

  memNumberOfPairs = parseInt(memPairRange.value, 10);
  memPairCountSpan.textContent = memNumberOfPairs.toString();

  memResetState();
  memCards = memGenerateDeck();
  memRenderBoard();
  memStartTimer();
  memUpdateBestTimeDisplay();
}

// Card click handling
function memHandleCardClick(cardEl) {
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

  const isMatch = memCards[i1].icon === memCards[i2].icon;

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
    memStartGame(); // restart game when theme changes
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
