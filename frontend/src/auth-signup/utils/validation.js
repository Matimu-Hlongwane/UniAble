/* =========================================
   UNIABLE FORM VALIDATION
   ========================================= */

export function isValidEmail(email) {
    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailPattern.test(email);
}


export function validateSignUpForm(formData) {

    const errors = {};


    /* FULL NAME */

    if (!formData.fullName.trim()) {

        errors.fullName =
            "Please enter your full name.";

    }

    else if (formData.fullName.trim().length < 2) {

        errors.fullName =
            "Please enter a valid full name.";

    }


    /* ACCESSIBILITY */

    if (!formData.accessibility) {

        errors.accessibility =
            "Please select an accessibility option.";

    }


    /* EMAIL */

    if (!formData.email.trim()) {

        errors.email =
            "Please enter your email address.";

    }

    else if (!isValidEmail(formData.email)) {

        errors.email =
            "Please enter a valid email address.";

    }


    /* PASSWORD */

    if (!formData.password) {

        errors.password =
            "Please create a password.";

    }

    else if (formData.password.length < 8) {
        errors.password = "Password must contain at least 8 characters.";
    }
    else if (!/[A-Z]/.test(formData.password)) {
        errors.password = "Password must contain at least one uppercase letter.";
    }
    else if (!/[a-z]/.test(formData.password)) {
        errors.password = "Password must contain at least one lowercase letter.";
    }
    else if (!/[0-9]/.test(formData.password)) {
        errors.password = "Password must contain at least one number.";
    }
    else if (!/[^A-Za-z0-9]/.test(formData.password)) {
        errors.password = "Password must contain at least one special character.";
    }


    return errors;
}

