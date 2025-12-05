// A14 – Memory Match Game
// Themes: Emoji symbols, Text playing cards, PNG playing cards from /assets
// Features: difficulty up to 26 pairs, full deck button, preview + visible shuffle,
// accuracy, best time per theme, streak-based bonus mini-game with leveling bonuses.

// ---------- Card Definitions ----------

const memSymbolIcons = [
  "💻","📱","🖱️","⌨️","📡","💾",
  "🧠","🛰️","🧪","🎮","📚","📊",
  "📔","🖊️","🧮","🕹️","🎧","💡",
  "🔐","🔧","⚙️","📂","🧱","📶",
  "🧬","🌐"
];

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
      const key   = `${rank}_of_${suit}`;
      const label = `${rank}${suitSymbols[suit]}`;
      const img   = `${key}.png`;
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
const memBonusStreakSpan = document.getElementById("memBonusStreak");
const memBonusFill       = document.getElementById("memBonusFill");
const memBonusLevelSpan  = document.getElementById("memBonusLevel");

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

// Bonus / streak
let memStreak       = 0; // consecutive correct matches
let memBonusCharges = 0; // usable bonus matches
let memBonusLevel   = 1; // each 3-in-a-row awards this many charges

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

function memUpdateBonusUI() {
  if (memBonusStreakSpan) {
    memBonusStreakSpan.textContent = memStreak.toString();
  }
  if (memBonusFill) {
    const pct = Math.max(0, Math.min(memStreak / 3, 1)) * 100;
    memBonusFill.style.width = pct + "%";
  }
  if (memBonusBtn) {
    memBonusBtn.disabled = memBonusCharges <= 0;
    if (memBonusCharges > 0) {
      memBonusBtn.textContent = `Bonus Match ✨ (x${memBonusCharges})`;
    } else {
      memBonusBtn.textContent = "Bonus Match ✨";
    }
  }
  if (memBonusLevelSpan) {
    memBonusLevelSpan.textContent = memBonusLevel.toString();
  }
}

function memSpawnMatchBurst(targetEl) {
  if (!memBoard || !targetEl) return;

  const boardRect = memBoard.getBoundingClientRect();
  const rect      = targetEl.getBoundingClientRect();

  const centerX = rect.left - boardRect.left + rect.width / 2;
  const centerY = rect.top  - boardRect.top  + rect.height / 2;

  const icons = ["✨","🎉","💥","🌟","💜","⚡"];

  const count = 5;
  for (let i = 0; i < count; i++) {
    const burst = document.createElement("div");
    burst.className = "mem-burst";
    burst.textContent = icons[Math.floor(Math.random() * icons.length)];

    const offsetX = (Math.random() - 0.5) * 40;
    const offsetY = (Math.random() - 0.5) * 20;

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
    img.src = "assets/" + card.img;
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

// ---------- Visible Shuffle ----------

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

  const boardHeight = boardRect.height;
  memBoard.style.height = boardHeight + "px";

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

  const indices  = cards.map((_, idx) => idx);
  const shuffled = memShuffle(indices);
  const newOrder = new Array(cards.length);

  shuffled.forEach((targetIndex, i) => {
    const card      = cards[i];
    const targetPos = positions[targetIndex];

    card.style.left = `${targetPos.left}px`;
    card.style.top  = `${targetPos.top}px`;

    const angle = (Math.random() - 0.5) * 8;
    card.style.transform = `scale(1.03) rotate(${angle}deg)`;

    newOrder[targetIndex] = card;
  });

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

    newOrder.forEach(card => memBoard.appendChild(card));

    memLockBoard = false;
  }, 620);
}

// ---------- Preview + Shuffle ----------

function memPreviewBoard({ resetTime = false, shuffleAfter = false } = {}) {
  if (!memBoard) return;
  const cards = memBoard.querySelectorAll(".mem-card");
  if (!cards.length) return;

  cards.forEach(c => c.classList.remove("flipped","matched","mismatch"));

  memIsPreviewing = true;
  memLockBoard    = true;

  const startDelay = 350;

  setTimeout(() => {
    cards.forEach(c => c.classList.add("flipped"));
  }, startDelay);

  let previewTime;
  if (memNumberOfPairs <= 8)       previewTime = 1600;
  else if (memNumberOfPairs <= 16) previewTime = 2100;
  else                             previewTime = 2600;

  setTimeout(() => {
    cards.forEach(c => c.classList.remove("flipped"));
    memIsPreviewing = false;
    memLockBoard    = false;

    if (resetTime) {
      memElapsedSeconds = 0;
      memTimeDisplay.textContent = "0";
    }

    if (shuffleAfter) {
      memVisibleShuffle();
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

  memStreak       = 0;
  memBonusCharges = 0;
  memBonusLevel   = 1;
  memUpdateBonusUI();

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
  memSpawnMatchBurst(memSecondCardEl);

  // Leveling bonus: every 3 matches in a row
  // → award memBonusLevel charges, reset streak to 0, increase level
  memStreak++;
  if (memStreak >= 3) {
    memBonusCharges += memBonusLevel;
    memStreak = 0;
    memBonusLevel++;
  }
  memUpdateBonusUI();

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

    memStreak = 0;
    memUpdateBonusUI();
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

// ---------- Bonus Match Logic ----------

function memAutoMatchRandomPair() {
  if (!memBoard) return false;

  const unmatched = [];
  memCards.forEach((c, idx) => {
    if (!c.matched) unmatched.push(idx);
  });
  if (unmatched.length < 2) return false;

  const randomIndex = unmatched[Math.floor(Math.random() * unmatched.length)];
  const chosenKey   = memCards[randomIndex].key;

  const pairIndices = unmatched.filter(i => memCards[i].key === chosenKey);
  if (pairIndices.length < 2) return false;

  const [i1, i2] = pairIndices;

  const cardEls = Array.from(memBoard.querySelectorAll(".mem-card"));
  const cardEl1 = cardEls.find(el => parseInt(el.dataset.index, 10) === i1);
  const cardEl2 = cardEls.find(el => parseInt(el.dataset.index, 10) === i2);
  if (!cardEl1 || !cardEl2) return false;

  cardEl1.classList.add("flipped","matched");
  cardEl2.classList.add("flipped","matched");
  memCards[i1].matched = true;
  memCards[i2].matched = true;

  memMatchedPairs++;
  memSpawnMatchBurst(cardEl2);

  memUpdateAccuracy();

  if (memMatchedPairs === memNumberOfPairs) {
    memHandleWin();
  }

  return true;
}

function memGrantBonusMatch() {
  if (memBonusCharges <= 0) return;

  if (memFirstCardEl && !memSecondCardEl) {
    memFirstCardEl.classList.remove("flipped");
  }
  memFirstCardEl  = null;
  memSecondCardEl = null;
  memLockBoard    = false;
  memIsPreviewing = false;

  let pairsToReveal = 1;
  if (memBonusCharges >= 3) {
    pairsToReveal = 3;
  } else if (memBonusCharges === 2) {
    pairsToReveal = 2;
  }

  let used = 0;
  for (let i = 0; i < pairsToReveal; i++) {
    const success = memAutoMatchRandomPair();
    if (!success) break;
    used++;
  }

  memBonusCharges = Math.max(0, memBonusCharges - used);
  memUpdateBonusUI();
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

if (memBonusBtn) {
  memBonusBtn.addEventListener("click", () => {
    memGrantBonusMatch();
  });
}

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
  memUpdateBonusUI();
  memStartGame();
}
