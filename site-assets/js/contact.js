(function () {
    "use strict";

    var contactForm =
        document.getElementById("contactRequestForm");

    if (!contactForm) {
        return;
    }


    contactForm.addEventListener("submit", function (event) {
        var submitButton;
        var statusMessage;
        var normalEndpoint;
        var ajaxEndpoint;
        var payload;

        event.preventDefault();

        submitButton =
            document.getElementById("contactSubmitButton");

        statusMessage =
            document.getElementById("contactFormStatus");


        if (!contactForm.checkValidity()) {
            contactForm.reportValidity();
            return;
        }


        normalEndpoint =
            contactForm.getAttribute("action");


        if (!normalEndpoint) {

            if (statusMessage) {
                statusMessage.textContent =
                    "The contact form is temporarily unavailable.";

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
                contactForm.elements.name.value.trim(),

            company:
                contactForm.elements.company.value.trim(),

            email:
                contactForm.elements.email.value.trim(),

            phone:
                contactForm.elements.phone.value.trim(),

            service:
                contactForm.elements.service.value.trim(),

            message:
                contactForm.elements.message.value.trim(),

            _subject:
                "New Website Inquiry - " +
                contactForm.elements.service.value.trim(),

            _template:
                "table",

            _replyto:
                contactForm.elements.email.value.trim()
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
                        "Contact form submission failed."
                    );
                }

                return response.json();
            })

            .then(function () {

                contactForm.reset();

                if (statusMessage) {
                    statusMessage.textContent =
                        "Thank you. Your inquiry has been submitted successfully.";

                    statusMessage.className =
                        "form-status is-success";
                }
            })

            .catch(function () {

                if (statusMessage) {
                    statusMessage.textContent =
                        "Your inquiry could not be submitted. Please try again or contact us directly.";

                    statusMessage.className =
                        "form-status is-error";
                }
            })

            .then(function () {

                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = "Submit Inquiry";
                }
            });
    });

}());
