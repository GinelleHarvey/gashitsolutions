/* penguin-app.js
   Penguin Auto Specialists Mobile App (Prototype) — tab nav + small interactions
   Works with penguin-app.html ids/classes.
*/

(function () {
  "use strict";

  // ---------- Helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ---------- Toast (inside phone) ----------
  const toastEl = $("#appToast");
  let toastTimer = null;

  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;

    // CSS supports .show AND .is-show; we use .show
    toastEl.classList.add("show");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
  }

  // ---------- Tabs ----------
  const tabButtons = $$(".pengapp-navbtn");
  const tabs = $$(".pengapp-tab");

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
      panel.hidden = !isActive;
    });

    // Focus heading of active panel (keyboard-friendly)
    const activePanel = $(`#tab-${tabKey}`);
    const h2 = activePanel ? $(".pengapp-h2", activePanel) : null;

    if (h2) {
      h2.setAttribute("tabindex", "-1");
      h2.focus({ preventScroll: true });
      setTimeout(() => h2.removeAttribute("tabindex"), 0);
    }
  }

  // Init: only dashboard visible
  tabs.forEach((panel) => {
    const isDash = panel.id === "tab-dashboard";
    panel.hidden = !isDash;
    panel.classList.toggle("is-active", isDash);
  });

  // Click to switch
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
  });

  // Keyboard nav for tab bar (Left/Right, Home/End)
  const tabsNav = $(".pengapp-nav");
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

  // Jump to another tab (data-go="customers"/"parts"/"transactions")
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

  // ---------- Dashboard metric (Open Tickets) ----------
  const ticketsEl = $("#openTickets");
  const TICKETS_KEY = "pengapp_open_tickets";

  function getTickets() {
    const saved = Number(localStorage.getItem(TICKETS_KEY));
    const fallback = Number(ticketsEl?.textContent || 12);
    if (!Number.isFinite(saved) || saved < 0) return fallback;
    return saved;
  }

  function setTickets(val) {
    if (ticketsEl) ticketsEl.textContent = String(val);
    localStorage.setItem(TICKETS_KEY, String(val));
  }

  // Load saved state
  if (ticketsEl) setTickets(getTickets());

  // ---------- Customers: simulate ticket activity ----------
  const newTicketBtn = $("#btnNewTicket");
  const closeTicketBtn = $("#btnCloseTicket");
  const customerNote = $("#customerNote");
  const recentActivity = $("#recentActivity");

  const ACTIVITY_KEY = "pengapp_recent_activity";

  function setCustomerNote(msg) {
    if (customerNote) customerNote.textContent = msg;
  }

  function getActivity() {
    try {
      const raw = localStorage.getItem(ACTIVITY_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function setActivity(arr) {
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(arr));
  }

  function renderActivity() {
    if (!recentActivity) return;
    const items = getActivity();
    recentActivity.innerHTML = "";

    if (!items.length) {
      const li = document.createElement("li");
      li.className = "pengapp-muted";
      li.textContent = "No recent activity yet — use the prototype buttons above to simulate updates.";
      recentActivity.appendChild(li);
      return;
    }

    items.forEach((text) => {
      const li = document.createElement("li");
      li.textContent = text;
      recentActivity.appendChild(li);
    });
  }

  function addActivityLine(text) {
    const items = getActivity();
    items.unshift(text);
    setActivity(items.slice(0, 8)); // keep it short
    renderActivity();
  }

  if (newTicketBtn) {
    newTicketBtn.addEventListener("click", () => {
      const current = getTickets();
      const next = current + 1;
      setTickets(next);

      setCustomerNote("New repair ticket created (prototype simulation).");
      addActivityLine(`New ticket opened • Open Tickets: ${next}`);
      showToast("Ticket created (+1).");
    });
  }

  if (closeTicketBtn) {
    closeTicketBtn.addEventListener("click", () => {
      const current = getTickets();
      if (current <= 0) {
        setCustomerNote("No open tickets to close.");
        showToast("Nothing to close.");
        return;
      }

      const next = current - 1;
      setTickets(next);

      setCustomerNote("Ticket closed (prototype simulation).");
      addActivityLine(`Ticket closed • Open Tickets: ${next}`);
      showToast("Ticket closed (-1).");
    });
  }

  renderActivity();

  // ---------- Parts: add simple list ----------
  const partInput = $("#partItem");
  const addPartBtn = $("#btnAddPart");
  const partsList = $("#partsList");

  const PARTS_KEY = "pengapp_parts_list";

  function getParts() {
    try {
      const raw = localStorage.getItem(PARTS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function setParts(arr) {
    localStorage.setItem(PARTS_KEY, JSON.stringify(arr));
  }

  function renderParts() {
    if (!partsList) return;
    const items = getParts();
    partsList.innerHTML = "";

    if (!items.length) {
      const li = document.createElement("li");
      li.className = "pengapp-muted";
      li.textContent = "No parts listed — add the first part needed for a repair.";
      partsList.appendChild(li);
      return;
    }

    items.forEach((text, idx) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span>${escapeHTML(text)}</span>
        <button class="pengapp-btn pengapp-btn--ghost" type="button" data-remove-part="${idx}" style="margin-left:.5rem;">
          Remove
        </button>
      `;
      partsList.appendChild(li);
    });
  }

  function addPart() {
    if (!partInput) return;
    const text = partInput.value.trim();
    if (!text) {
      showToast("Type a part name first.");
      partInput.focus();
      return;
    }

    const items = getParts();
    items.unshift(text);
    setParts(items);
    partInput.value = "";
    renderParts();
    showToast("Part added.");
  }

  if (addPartBtn) addPartBtn.addEventListener("click", addPart);
  if (partInput) {
    partInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") addPart();
    });
  }

  if (partsList) {
    partsList.addEventListener("click", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      if (!t.matches("[data-remove-part]")) return;

      const idx = Number(t.getAttribute("data-remove-part"));
      const items = getParts();
      if (Number.isInteger(idx) && idx >= 0 && idx < items.length) {
        items.splice(idx, 1);
        setParts(items);
        renderParts();
        showToast("Removed.");
      }
    });
  }

  renderParts();

  // ---------- Transactions: mock lookup validation ----------
  const txnInput = $("#txnLookup");
  const txnBtn = $("#btnSearchTxn");
  const txnResult = $("#txnResult");

  function setTxnResult(msg) {
    if (txnResult) txnResult.textContent = msg;
  }

  function searchTxn() {
    const q = (txnInput?.value || "").trim();
    if (!q) {
      setTxnResult("Enter a VIN, Repair #, or Invoice # to search.");
      showToast("Enter a value.");
      txnInput?.focus();
      return;
    }

    // Mock response samples
    const samples = [
      "Payment Status: Paid • Method: Card • Amount: $245.00",
      "Payment Status: Pending • Method: Cash • Amount: $180.00",
      "Payment Status: Paid • Method: Card • Amount: $92.50",
      "Payment Status: Pending • Method: Check • Amount: $410.00",
    ];

    setTxnResult(`Results for "${q}": ${samples[Math.floor(Math.random() * samples.length)]}`);
    showToast("Search complete (mock).");
  }

  if (txnBtn) txnBtn.addEventListener("click", searchTxn);
  if (txnInput) {
    txnInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") searchTxn();
    });
  }

  // ---------- Small safety: escape helper ----------
  function escapeHTML(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
})();

