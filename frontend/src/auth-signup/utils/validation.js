/* =========================================
   UNIABLE FORM VALIDATION
   ========================================= */

export function isValidEmail(email) {
    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailPattern.test(email);
}

export function normalizeSouthAfricanMobile(phoneNumber) {
    const enteredNumber = String(phoneNumber || "").trim();
    const compactNumber = enteredNumber.replace(/[\s()-]/g, "");
    let nationalNumber;

    if (/^\+27[0-9]{9}$/.test(compactNumber)) {
        nationalNumber = compactNumber.slice(3);
    } else if (/^27[0-9]{9}$/.test(compactNumber)) {
        nationalNumber = compactNumber.slice(2);
    } else if (/^0[0-9]{9}$/.test(compactNumber)) {
        nationalNumber = compactNumber.slice(1);
    } else if (/^[0-9]{9}$/.test(compactNumber)) {
        nationalNumber = compactNumber;
    } else {
        return null;
    }

    return /^[6-8][0-9]{8}$/.test(nationalNumber)
        ? `+27${nationalNumber}`
        : null;
}


export function validateSignUpForm(formData) {

    const errors = {};


    /* FULL NAME */

    if (!formData.fullName.trim()) {

        errors.fullName =
            "Please enter your first and middle names.";

    }

    else if (formData.fullName.trim().length < 2) {

        errors.fullName =
            "Please enter a valid first name.";

    }

    if (!String(formData.surname || "").trim()) {
        errors.surname = "Please enter your surname.";
    }

    if (!String(formData.studentNumber || "").trim()) {
        errors.studentNumber = "Please enter your student number.";
    }

    if (!String(formData.qualification || "").trim()) {
        errors.qualification = "Please select your qualification.";
    } else if (
        formData.qualification === "Other IT qualification" &&
        !String(formData.otherQualification || "").trim()
    ) {
        errors.otherQualification = "Please enter your IT qualification.";
    }

    if (!String(formData.yearOfStudy || "").trim()) {
        errors.yearOfStudy = "Please select your year of study.";
    }

    if (
        !Array.isArray(formData.modules) ||
        (!formData.modules.length && !String(formData.otherModules || "").trim())
    ) {
        errors.modules = "Select or enter at least one IT module.";
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

    if (!formData.confirmPassword) {
        errors.confirmPassword = "Please confirm your password.";
    } else if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = "Passwords do not match.";
    }


    return errors;
}
