/* jshint browser: true */

(function () {
    "use strict";

    var year = document.getElementById("year");
    var navToggle = document.getElementById("navToggle");
    var navMenu = document.getElementById("navMenu");
    var requestForm = document.getElementById("homeRequestForm");

    if (year) {
        year.textContent = String(new Date().getFullYear());
    }

    function closeMenu() {
        if (!navMenu || !navToggle) {
            return;
        }

        navMenu.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
    }

    if (navToggle && navMenu) {
        navToggle.addEventListener("click", function () {
            var isOpen = navMenu.classList.toggle("is-open");

            navToggle.setAttribute(
                "aria-expanded",
                String(isOpen)
            );
        });

        navMenu.addEventListener("click", function (event) {
            if (event.target.tagName === "A") {
                closeMenu();
            }
        });

        document.addEventListener("keydown", function (event) {
            if (
                event.key === "Escape" &&
                navMenu.classList.contains("is-open")
            ) {
                closeMenu();
                navToggle.focus();
            }
        });

        document.addEventListener("click", function (event) {
            var clickedInsideNav = event.target.closest(".site-nav");

            if (
                !clickedInsideNav &&
                navMenu.classList.contains("is-open")
            ) {
                closeMenu();
            }
        });
    }

    if (requestForm) {
        requestForm.addEventListener("submit", function (event) {
            var name;
            var email;
            var service;
            var phone;
            var message;
            var recipient;
            var subject;
            var body;
            var mailto;

            event.preventDefault();

            if (!requestForm.checkValidity()) {
                requestForm.reportValidity();
                return;
            }

            name = requestForm.elements.name.value.trim();
            email = requestForm.elements.email.value.trim();
            service = requestForm.elements.service.value.trim();
            phone = requestForm.elements.phone.value.trim();
            message = requestForm.elements.message.value.trim();

            recipient = "gharvey@gashitsolutions.com";

            subject = "Website inquiry - " +
                (service || "General request");

            body = [
                "Name: " + name,
                "Email: " + email,
                "Phone: " + phone,
                "Service: " + service,
                "",
                "Message:",
                message
            ].join("\n");

            mailto = "mailto:" + recipient +
                "?subject=" + encodeURIComponent(subject) +
                "&body=" + encodeURIComponent(body);

            window.location.href = mailto;
        });
    }
}());
