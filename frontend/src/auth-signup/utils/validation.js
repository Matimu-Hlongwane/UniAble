/* =========================================
   UNIABLE FORM VALIDATION
   ========================================= */

export const STUDENT_EMAIL_DOMAIN = "my.richfield.ac.za";

export function isValidEmail(email) {
    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailPattern.test(email);
}

export function isValidStudentNumber(studentNumber) {
    return /^40[123]\d{6}$/.test(String(studentNumber || "").trim());
}

export function isValidStudentEmail(email) {
    const [studentNumber, domain, extra] = String(email || "").trim().toLowerCase().split("@");
    return !extra && domain === STUDENT_EMAIL_DOMAIN && isValidStudentNumber(studentNumber);
}

export function validateInstitutionalStudentEmail(email) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (
        normalizedEmail.endsWith(`@${STUDENT_EMAIL_DOMAIN}`) &&
        !isValidStudentEmail(normalizedEmail)
    ) {
        throw new Error("Richfield student email must use a nine-digit student number beginning with 401, 402 or 403.");
    }
    return normalizedEmail;
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


    if (!formData.surname?.trim()) errors.surname = "Please enter your surname.";
    if (!isValidStudentNumber(formData.studentNumber)) errors.studentNumber = "Enter a nine-digit student number beginning with 401, 402 or 403.";
    if (!formData.qualification) errors.qualification = "Choose your Richfield qualification.";
    if (!formData.yearOfStudy || !/^20\d{2}$/.test(String(formData.yearOfStudy))) errors.yearOfStudy = "Choose a valid year of study.";
    if (!formData.dateOfBirth || Number.isNaN(Date.parse(formData.dateOfBirth)) || new Date(formData.dateOfBirth) >= new Date()) errors.dateOfBirth = "Enter a valid date of birth in the past.";
    if (formData.phoneNumber?.trim() && !/^\+?[1-9]\d{7,14}$/.test(String(formData.phoneNumber).replace(/[\s()-]/g, ""))) errors.phoneNumber = "Enter a valid international cellphone number, e.g. +27821234567 (do not add the leading 0).";
    const expectedStudentEmail = `${String(formData.studentNumber || "").trim()}@${STUDENT_EMAIL_DOMAIN}`;
    if (!formData.email?.trim() || formData.email.trim().toLowerCase() !== expectedStudentEmail.toLowerCase()) errors.email = "Your student email must be generated from your student number.";
    if (!formData.confirmPassword) errors.confirmPassword = "Please confirm your password.";
    else if (formData.confirmPassword !== formData.password) errors.confirmPassword = "Passwords do not match.";

    /* ACCESSIBILITY */

    if (!formData.accessibility) {

        errors.accessibility =
            "Please select an accessibility option.";

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


export function isRichfieldStudentNumber(value) {
    return isValidStudentNumber(value);
}

export function getRichfieldStudentEmail(value) {
    const number = String(value || "").trim();
    return isValidStudentNumber(number)
        ? `${number}@${STUDENT_EMAIL_DOMAIN}`
        : "";
}

export function normalizeSouthAfricanMobile(phoneNumber) {
    const enteredNumber = String(phoneNumber || "").trim();
    const compactNumber = enteredNumber.replace(/[\\s()-]/g, "");
    let nationalNumber;

    if (/^\\+27[0-9]{9}$/.test(compactNumber)) {
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
