/* penguin-app.js
   Penguin Auto Specialists Mobile App (Prototype)
   Customer-facing app: tabs + appointment form interactions
*/

(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const toastEl = $("#appToast");
  let toastTimer = null;

  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
  }

  const tabButtons = $$(".pengapp-navbtn");
  const tabs = $$(".pengapp-tab");

  function setActiveTab(tabKey) {
    tabButtons.forEach((btn) => {
      const isActive = btn.dataset.tab === tabKey;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
      btn.tabIndex = isActive ? 0 : -1;
    });

    tabs.forEach((panel) => {
      const isActive = panel.id === `tab-${tabKey}`;
      panel.classList.toggle("is-active", isActive);
      panel.hidden = !isActive;
    });

    const activePanel = $(`#tab-${tabKey}`);
    const h2 = activePanel ? $(".pengapp-h2", activePanel) : null;

    if (h2) {
      h2.setAttribute("tabindex", "-1");
      h2.focus({ preventScroll: true });
      setTimeout(() => h2.removeAttribute("tabindex"), 0);
    }
  }

  tabs.forEach((panel) => {
    const isHome = panel.id === "tab-home";
    panel.hidden = !isHome;
    panel.classList.toggle("is-active", isHome);
  });

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
  });

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

  $$("[data-go]").forEach((el) => {
    el.addEventListener("click", () => {
      const go = el.getAttribute("data-go");
      if (!go) return;
      setActiveTab(go);
    });
  });

  const apptName = $("#apptName");
  const apptVehicle = $("#apptVehicle");
  const apptNeed = $("#apptNeed");
  const apptDate = $("#apptDate");
  const btnRequestAppt = $("#btnRequestAppt");
  const btnClearAppt = $("#btnClearAppt");
  const scheduleNote = $("#scheduleNote");

  function setScheduleNote(msg) {
    if (scheduleNote) scheduleNote.textContent = msg;
  }

  function clearScheduleForm() {
    if (apptName) apptName.value = "";
    if (apptVehicle) apptVehicle.value = "";
    if (apptNeed) apptNeed.value = "";
    if (apptDate) apptDate.value = "";
    setScheduleNote("");
  }

  if (btnRequestAppt) {
    btnRequestAppt.addEventListener("click", () => {
      const name = (apptName?.value || "").trim();
      const vehicle = (apptVehicle?.value || "").trim();
      const need = (apptNeed?.value || "").trim();
      const date = (apptDate?.value || "").trim();

      if (!name || !vehicle || !need || !date) {
        setScheduleNote("Please complete all fields before requesting an appointment.");
        showToast("Complete all fields first.");
        return;
      }

      setScheduleNote(`Appointment request submitted for ${name}.`);
      showToast("Appointment request submitted.");
      setActiveTab("appointments");
    });
  }

  if (btnClearAppt) {
    btnClearAppt.addEventListener("click", () => {
      clearScheduleForm();
      showToast("Form cleared.");
    });
  }
})();
