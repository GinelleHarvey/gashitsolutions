/* tj-app.js
   Trader Joe’s Rewards App (Mock) — tab nav + small interactions
   Works with your existing HTML ids/classes.
*/

(function () {
  "use strict";

  // ---------- Helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Toast (inside phone)
  const toastEl = $("#tjToast");
  let toastTimer = null;

  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;

    // ✅ Match CSS: .tjapp-toast.show
    toastEl.classList.add("show");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
  }

  // ---------- Tabs ----------
  const tabButtons = $$(".tjapp-navbtn");
  const tabs = $$(".tjapp-tab");

  function setActiveTab(tabKey) {
    // Buttons
    tabButtons.forEach((btn) => {
      const isActive = btn.dataset.tab === tabKey;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
      btn.tabIndex = isActive ? 0 : -1;
    });

    // Panels
    tabs.forEach((panel) => {
      const isActive = panel.id === `tab-${tabKey}`;
      panel.classList.toggle("is-active", isActive);
      panel.hidden = !isActive; // accessibility + prevents focus
    });

    // Move focus to heading of the panel (nice for keyboard users)
    const activePanel = $(`#tab-${tabKey}`);
    const h2 = activePanel ? $(".tjapp-h2", activePanel) : null;

    if (h2) {
      h2.setAttribute("tabindex", "-1");
      h2.focus({ preventScroll: true });

      // ✅ Optional: remove tabindex after focus so it doesn't stay in tab order
      setTimeout(() => h2.removeAttribute("tabindex"), 0);
    }
  }

  // init hidden states (only home visible)
  tabs.forEach((panel) => {
    const isHome = panel.id === "tab-home";
    panel.hidden = !isHome;
    panel.classList.toggle("is-active", isHome);
  });

  // Click to switch
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
  });

  // Keyboard nav for tab bar (Left/Right, Home/End)
  const tabsNav = $(".tjapp-nav");
  if (tabsNav) {
    tabsNav.addEventListener("keydown", (e) => {
      const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
      if (!keys.includes(e.key)) return;

      const activeIndex = tabButtons.findIndex((b) => b.classList.contains("is-active"));
      let nextIndex = activeIndex;

      if (e.key === "ArrowLeft") nextIndex = (activeIndex - 1 + tabButtons.length) % tabButtons.length;
      if (e.key === "ArrowRight") nextIndex = (activeIndex + 1) % tabButtons.length;
      if (e.key === "Home") nextIndex = 0;
      if (e.key === "End") nextIndex = tabButtons.length - 1;

      e.preventDefault();
      tabButtons[nextIndex].focus();
      tabButtons[nextIndex].click();
    });
  }

  // Buttons inside UI that jump to another tab (data-go="rewards")
  $$("[data-go]").forEach((el) => {
    el.addEventListener("click", () => {
      const go = el.getAttribute("data-go");
      if (!go) return;
      setActiveTab(go);
    });
  });

  // Buttons that just show a message (data-toast="...")
  $$("[data-toast]").forEach((el) => {
    el.addEventListener("click", () => {
      const msg = el.getAttribute("data-toast") || "Feature coming soon.";
      showToast(msg);
    });
  });

  // ---------- Rewards logic ----------
  const pointsEl = $("#tjPoints");
  const earnBtn = $("#tjEarnPoints");
  const redeemBtn = $("#tjRedeem");
  const noteEl = $("#tjRewardNote");
  const couponsEl = $("#tjCoupons");

  const POINTS_KEY = "tjapp_points";
  const COUPONS_KEY = "tjapp_coupons";

  function getPoints() {
    const saved = Number(localStorage.getItem(POINTS_KEY));
    if (!Number.isFinite(saved) || saved < 0) return Number(pointsEl?.textContent || 1250);
    return saved;
  }

  function setPoints(val) {
    if (pointsEl) pointsEl.textContent = String(val);
    localStorage.setItem(POINTS_KEY, String(val));
  }

  function getCoupons() {
    try {
      const raw = localStorage.getItem(COUPONS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function setCoupons(arr) {
    localStorage.setItem(COUPONS_KEY, JSON.stringify(arr));
  }

  function renderCoupons() {
    if (!couponsEl) return;
    const coupons = getCoupons();

    couponsEl.innerHTML = "";
    if (!coupons.length) {
      const li = document.createElement("li");
      li.className = "tjapp-coupon tjapp-muted";
      li.textContent = "No coupons yet — redeem points to generate one.";
      couponsEl.appendChild(li);
      return;
    }

    coupons.forEach((c) => {
      const li = document.createElement("li");
      li.className = "tjapp-coupon";
      li.innerHTML = `
        <strong>${c.title}</strong>
        <span class="tjapp-muted">${c.detail}</span>
      `;
      couponsEl.appendChild(li);
    });
  }

  function setNote(msg) {
    if (noteEl) noteEl.textContent = msg;
  }

  // Load saved state
  if (pointsEl) setPoints(getPoints());
  renderCoupons();

  if (earnBtn) {
    earnBtn.addEventListener("click", () => {
      const current = getPoints();
      const next = current + 150;
      setPoints(next);
      setNote("Scan simulated: +150 points added.");
      showToast("+150 points!");
    });
  }

  if (redeemBtn) {
    redeemBtn.addEventListener("click", () => {
      const current = getPoints();
      const cost = 500;

      if (current < cost) {
        setNote(`Not enough points to redeem. Need ${cost}, you have ${current}.`);
        showToast("Not enough points.");
        return;
      }

      const next = current - cost;
      setPoints(next);

      const coupons = getCoupons();
      const newCoupon = makeCoupon();
      coupons.unshift(newCoupon);
      setCoupons(coupons);
      renderCoupons();

      setNote(`Redeemed ${cost} points. Coupon added to your list.`);
      showToast("Coupon redeemed!");
    });
  }

  function makeCoupon() {
    // Simple randomized coupon for the mock
    const options = [
      { title: "10% Off Frozen Foods", detail: "Valid 7 days • In-store only" },
      { title: "$2 Off Any Snack", detail: "Valid 5 days • One-time use" },
      { title: "Free Beverage", detail: "With any purchase • Valid 3 days" },
      { title: "BOGO Bakery Item", detail: "Valid 7 days • Select items" },
    ];
    return options[Math.floor(Math.random() * options.length)];
  }

  // ---------- Shopping List ----------
  const itemInput = $("#tjItem");
  const addItemBtn = $("#tjAddItem");
  const listEl = $("#tjList");

  const LIST_KEY = "tjapp_list";

  function getList() {
    try {
      const raw = localStorage.getItem(LIST_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function setList(arr) {
    localStorage.setItem(LIST_KEY, JSON.stringify(arr));
  }

  function renderList() {
    if (!listEl) return;
    const items = getList();
    listEl.innerHTML = "";

    if (!items.length) {
      const li = document.createElement("li");
      li.className = "tjapp-list-empty tjapp-muted";
      li.textContent = "Your list is empty — add your first item.";
      listEl.appendChild(li);
      return;
    }

    items.forEach((text, idx) => {
      const li = document.createElement("li");
      li.className = "tjapp-list-item";
      li.innerHTML = `
        <button class="tjapp-check" type="button" aria-label="Mark ${escapeAttr(text)} as purchased" data-check="${idx}">✓</button>
        <span class="tjapp-list-text">${escapeHTML(text)}</span>
        <button class="tjapp-remove" type="button" aria-label="Remove ${escapeAttr(text)}" data-remove="${idx}">Remove</button>
      `;
      listEl.appendChild(li);
    });
  }

  function addItem() {
    if (!itemInput) return;
    const text = itemInput.value.trim();
    if (!text) {
      showToast("Type an item first.");
      itemInput.focus();
      return;
    }

    const items = getList();
    items.unshift(text);
    setList(items);
    itemInput.value = "";
    renderList();
    showToast("Added to list.");
  }

  if (addItemBtn) addItemBtn.addEventListener("click", addItem);
  if (itemInput) {
    itemInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") addItem();
    });
  }

  if (listEl) {
    listEl.addEventListener("click", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;

      // Remove
      if (t.matches("[data-remove]")) {
        const idx = Number(t.getAttribute("data-remove"));
        const items = getList();
        if (Number.isInteger(idx) && idx >= 0 && idx < items.length) {
          items.splice(idx, 1);
          setList(items);
          renderList();
          showToast("Removed.");
        }
      }

      // Check (just a cute mock — strikes text then auto-removes)
      if (t.matches("[data-check]")) {
        const idx = Number(t.getAttribute("data-check"));
        const row = t.closest(".tjapp-list-item");
        if (row) row.classList.add("is-done");
        setTimeout(() => {
          const items = getList();
          if (Number.isInteger(idx) && idx >= 0 && idx < items.length) {
            items.splice(idx, 1);
            setList(items);
            renderList();
            showToast("Purchased ✓");
          }
        }, 350);
      }
    });
  }

  // Load list state
  renderList();

  // ---------- Store locator mock ----------
  const zipInput = $("#tjZip");
  const findBtn = $("#tjFindStore");
  const storeResult = $("#tjStoreResult");

  function setStoreResult(msg) {
    if (storeResult) storeResult.textContent = msg;
  }

  function findStore() {
    const zip = (zipInput?.value || "").trim();
    if (!zip) {
      setStoreResult("Enter a ZIP code to search.");
      showToast("Enter ZIP code.");
      zipInput?.focus();
      return;
    }
    if (!/^\d{5}$/.test(zip)) {
      setStoreResult("Please enter a valid 5-digit ZIP code.");
      showToast("Invalid ZIP.");
      zipInput?.focus();
      return;
    }

    // Mock response
    const samples = [
      "Trader Joe’s — 2.1 miles away • Open until 9 PM",
      "Trader Joe’s — 4.7 miles away • Open until 10 PM",
      "Trader Joe’s — 1.4 miles away • Open until 9 PM",
    ];
    setStoreResult(`Results for ${zip}: ${samples[Math.floor(Math.random() * samples.length)]}`);
    showToast("Store found (mock).");
  }

  if (findBtn) findBtn.addEventListener("click", findStore);
  if (zipInput) {
    zipInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") findStore();
    });
  }

  // ---------- Small safety: escape helpers ----------
  function escapeHTML(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function escapeAttr(str) {
    return escapeHTML(str).replaceAll("`", "&#96;");
  }
})();
