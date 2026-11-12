/* =========================================
   UNIABLE FORM VALIDATION
   ========================================= */

import { RICHFIELD_QUALIFICATIONS } from "../../data/qualifications.js";

export const STUDENT_EMAIL_DOMAIN = "my.richfield.ac.za";
export const YEARS_OF_STUDY = ["1st", "2nd", "3rd"];

export function getLatestEligibleDateOfBirth(now = new Date()) {
    const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    cutoff.setFullYear(cutoff.getFullYear() - 16);
    cutoff.setDate(cutoff.getDate() - 1);
    const year = cutoff.getFullYear();
    const month = String(cutoff.getMonth() + 1).padStart(2, "0");
    const day = String(cutoff.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function isOlderThan16(dateOfBirth) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateOfBirth || ""))) return false;
    const parsedDate = new Date(`${dateOfBirth}T00:00:00.000Z`);
    if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== dateOfBirth) return false;
    return dateOfBirth <= getLatestEligibleDateOfBirth();
}

export function isValidPersonName(value) {
    const name = String(value || "").trim();
    return /^\p{L}[\p{L}\p{M}]*(?: +\p{L}[\p{L}\p{M}]*)*$/u.test(name);
}

export function capitalizePersonName(value) {
    return String(value || "").replace(/^(\s*)(\p{L})/u, (_, spacing, letter) =>
        `${spacing}${letter.toLocaleUpperCase()}`
    );
}

export function startsWithCapital(value) {
    const firstLetter = Array.from(String(value || "").trim())[0];
    if (!firstLetter) return false;
    return firstLetter.toLocaleLowerCase() === firstLetter.toLocaleUpperCase() ||
        /^\p{Lu}$/u.test(firstLetter);
}

export function isValidEmail(email) {
    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailPattern.test(email);
}

export function isValidStudentNumber(studentNumber) {
    return /^40[1-5]\d{6}$/.test(String(studentNumber || "").trim());
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
        throw new Error("Richfield student email must use a nine-digit student number beginning with 401 through 405.");
    }
    return normalizedEmail;
}


export function validateSignUpForm(formData) {

    const errors = {};


    /* FULL NAME */

    if (!formData.fullName?.trim()) errors.fullName = "Please enter your first name(s).";
    else if (!isValidPersonName(formData.fullName)) errors.fullName = "Use letters and spaces only for your first name(s).";
    else if (!startsWithCapital(formData.fullName)) errors.fullName = "Start your first name(s) with a capital letter.";
    if (!formData.surname?.trim()) errors.surname = "Please enter your surname.";
    else if (!isValidPersonName(formData.surname)) errors.surname = "Use letters and spaces only for your surname.";
    else if (!startsWithCapital(formData.surname)) errors.surname = "Start your surname with a capital letter.";
    if (!isValidStudentNumber(formData.studentNumber)) errors.studentNumber = "Enter a nine-digit student number beginning with 401 through 405.";
    if (!RICHFIELD_QUALIFICATIONS.includes(formData.qualification)) errors.qualification = "Choose BSc IT or BCOM.";
    if (!YEARS_OF_STUDY.includes(formData.yearOfStudy)) errors.yearOfStudy = "Choose 1st, 2nd or 3rd year.";
    if (!isOlderThan16(formData.dateOfBirth)) errors.dateOfBirth = "You must be older than 16 to create an account.";
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
