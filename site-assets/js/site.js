(function () {
    "use strict";

    var year = document.getElementById("year");
    var navToggle = document.getElementById("navToggle");
    var navMenu = document.getElementById("navMenu");
    var requestForm = document.getElementById("homeRequestForm");

    /*
     * Footer year
     */

    if (year) {
        year.textContent = String(new Date().getFullYear());
    }


    /*
     * Mobile navigation
     */

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
            var clickedInsideNav;

            clickedInsideNav =
                event.target.closest(".site-nav");

            if (
                !clickedInsideNav &&
                navMenu.classList.contains("is-open")
            ) {
                closeMenu();
            }
        });
    }


    /*
     * Homepage request form
     *
     * The HTML form will contain a normal FormSubmit action.
     * JavaScript changes that endpoint to the AJAX endpoint so
     * the visitor can submit without leaving the website.
     *
     * Selected contracting buttons elsewhere on the site may
     * still use normal mailto links.
     */

    if (requestForm) {

        requestForm.addEventListener("submit", function (event) {
            var submitButton;
            var statusMessage;
            var normalEndpoint;
            var ajaxEndpoint;
            var payload;

            event.preventDefault();

            submitButton =
                document.getElementById("homeSubmitButton");

            statusMessage =
                document.getElementById("homeFormStatus");

            if (!requestForm.checkValidity()) {
                requestForm.reportValidity();
                return;
            }

            normalEndpoint =
                requestForm.getAttribute("action");

            if (!normalEndpoint) {
                if (statusMessage) {
                    statusMessage.textContent =
                        "The request form is temporarily unavailable.";

                    statusMessage.className =
                        "form-status is-error";
                }

                return;
            }

            ajaxEndpoint =
                normalEndpoint.replace(
                    "https://formsubmit.co/",
                    "https://formsubmit.co/ajax/"
                );

            payload = {
                name:
                    requestForm.elements.name.value.trim(),

                email:
                    requestForm.elements.email.value.trim(),

                phone:
                    requestForm.elements.phone.value.trim(),

                service:
                    requestForm.elements.service.value.trim(),

                message:
                    requestForm.elements.message.value.trim(),

                _subject:
                    "New Website Request - " +
                    requestForm.elements.service.value.trim(),

                _template:
                    "table",

                _replyto:
                    requestForm.elements.email.value.trim()
            };

            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = "Sending...";
            }

            if (statusMessage) {
                statusMessage.textContent = "";
                statusMessage.className = "form-status";
            }

            window.fetch(ajaxEndpoint, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },

                body: JSON.stringify(payload)
            })
                .then(function (response) {
                    if (!response.ok) {
                        throw new Error(
                            "Request submission failed."
                        );
                    }

                    return response.json();
                })

                .then(function () {
                    requestForm.reset();

                    if (statusMessage) {
                        statusMessage.textContent =
                            "Thank you. Your request has been submitted successfully.";

                        statusMessage.className =
                            "form-status is-success";
                    }
                })

                .catch(function () {
                    if (statusMessage) {
                        statusMessage.textContent =
                            "Your request could not be submitted. Please try again or contact us directly.";

                        statusMessage.className =
                            "form-status is-error";
                    }
                })

                .then(function () {
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.textContent = "Submit Request";
                    }
                });
        });
    }

}());
