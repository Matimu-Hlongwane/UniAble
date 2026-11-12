
/* ============================================================
   UNIABLE DISABILITY OFFICE DASHBOARD
   Author: Matimu Hlongwane

   PURPOSE:
   - Load registration records submitted by the sign-up page.
   - Display real saved prototype registrations instead of samples.
   - Calculate statistics and category charts from those records.
   - Support search, status filters, navigation and CSV export.
   - Keep registrations synchronised between open tabs.

   SHARED STORAGE:
   "uniable_registrations_v1"

   SECURITY:
   - Passwords are never read or displayed by this dashboard.
   - Browser storage is only for prototype testing.
   - Real student data requires a secure backend, authentication,
     staff permissions and server-side validation.
   ============================================================ */

"use strict";

/* The exact same key used by Signup_page/signup.js. */
const REGISTRATION_STORAGE_KEY = "uniable_registrations_v1";

/* ---------- 1. LIVE DATA ---------- */

/*
 * These arrays intentionally start empty.
 *
 * Registration data is loaded from browser storage.
 * Accommodations and wellbeing alerts remain empty because the
 * current sign-up form does not create those kinds of records.
 */
let submissions = [];
let accommodations = [];
let wellbeingAlerts = [];
let categoryTotals = [];

/* ---------- 2. ELEMENT REFERENCES ---------- */

const sidebar = document.getElementById("sidebar");
const menuToggle = document.getElementById("menuToggle");
const breadcrumbCurrent = document.getElementById("breadcrumbCurrent");
const currentDate = document.getElementById("currentDate");

const submissionSearch = document.getElementById("submissionSearch");
const statusFilter = document.getElementById("statusFilter");
const submissionsTable = document.getElementById("submissionsTable");
const submissionCount = document.getElementById("submissionCount");

const categoryChart = document.getElementById("categoryChart");
const reportCategoryChart = document.getElementById("reportCategoryChart");

const alertsList = document.getElementById("alertsList");
const alertCount = document.getElementById("alertCount");

const verificationTable = document.getElementById("verificationTable");
const accommodationsTable = document.getElementById("accommodationsTable");

const verificationNavCount = document.getElementById("verificationNavCount");

const pendingDocumentsElement = document.getElementById("pendingDocuments");
const awaitingVerificationElement = document.getElementById("awaitingVerification");

const reportTotal = document.getElementById("reportTotal");
const reportApproved = document.getElementById("reportApproved");
const reportPending = document.getElementById("reportPending");

const exportReportButton = document.getElementById("exportReport");
const helpButton = document.getElementById("helpButton");
const toast = document.getElementById("toast");

/* ---------- 3. SHARED HELPERS ---------- */

/* Safely escape text before inserting dynamic values into HTML. */
function escapeHTML(value) {
    const replacements = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    };

    return String(value ?? "").replace(/[&<>"']/g, (character) => {
        return replacements[character];
    });
}

/* Normalise statuses so that comparisons are consistent. */
function normaliseStatus(status) {
    const value = String(status || "Pending review")
        .trim()
        .toLowerCase();

    if (value === "approved" || value === "active") {
        return "Approved";
    }

    if (
        value === "needs changes" ||
        value === "rejected" ||
        value === "requires changes"
    ) {
        return "Needs changes";
    }

    return "Pending review";
}

/* Assign consistent CSS classes to status badges. */
function getStatusClass(status) {
    const normalisedStatus = normaliseStatus(status);

    if (normalisedStatus === "Approved") {
        return "status-approved";
    }

    if (normalisedStatus === "Needs changes") {
        return "status-rejected";
    }

    return "status-pending";
}

/* Create a reusable status badge. */
function getStatusBadge(status) {
    return `
        <span class="status-badge ${getStatusClass(status)}">
            ${escapeHTML(normaliseStatus(status))}
        </span>
    `;
}

/* Display a short notification using the existing live region. */
let toastTimeout;

function showToast(message) {
    if (!toast) return;

    window.clearTimeout(toastTimeout);

    toast.textContent = message;
    toast.classList.add("visible");

    toastTimeout = window.setTimeout(() => {
        toast.classList.remove("visible");
    }, 3200);
}

/* Display today's date using the visitor's local date. */
function updateDate() {
    if (!currentDate) return;

    currentDate.textContent = new Intl.DateTimeFormat("en-ZA", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric"
    }).format(new Date());
}

/* ---------- 4. LOAD REGISTRATIONS FROM SIGN-UP ---------- */

/*
 * Convert the sign-up record into the fields expected by the
 * dashboard tables.
 *
 * Sign-up fields:
 *   id, name, email, accessibility, status, createdAt
 *
 * Dashboard display fields:
 *   id, student, category, document, status, email, createdAt
 *
 * Passwords are not read or displayed here.
 */
function normaliseRegistration(record) {
    if (!record || typeof record !== "object") {
        return null;
    }

    const id = String(record.id || "").trim();
    const student = String(record.name || record.student || "").trim();
    const email = String(record.email || "").trim().toLowerCase();
    const category = String(
        record.accessibility || record.category || ""
    ).trim();

    /* Ignore incomplete or malformed records. */
    if (!id || !student || !email) {
        return null;
    }

    /*
     * The current sign-up form does not upload documents.
     * Always show the honest placeholder unless a future approved
     * document-upload workflow supplies a document label.
     */
    const documentLabel = String(record.document || "").trim();

    return {
        id,
        student,
        email,
        category: category || "Not specified",
        document: documentLabel || "Not submitted",
        status: normaliseStatus(record.status),
        createdAt: record.createdAt || ""
    };
}

/*
 * Read the shared registration list from localStorage.
 *
 * If storage is empty, the dashboard correctly starts with zero records.
 * If storage contains invalid JSON, display a clear error rather than
 * silently showing made-up student records.
 */
function loadRegistrations() {
    try {
        const storedData = localStorage.getItem(REGISTRATION_STORAGE_KEY);

        if (!storedData) {
            submissions = [];
            return true;
        }

        const parsedData = JSON.parse(storedData);

        if (!Array.isArray(parsedData)) {
            throw new Error("The saved registration data is not a list.");
        }

        /* Normalise records and discard invalid entries. */
        submissions = parsedData
            .map(normaliseRegistration)
            .filter(Boolean);

        return true;
    } catch (error) {
        console.error("Unable to load UniAble registrations:", error);

        submissions = [];

        showToast(
            "Unable to read saved registrations. Check browser storage and the console."
        );

        return false;
    }
}

/*
 * Save dashboard status changes to the same storage key.
 *
 * This only persists prototype data in the current browser.
 * It does not replace server-side permissions or database security.
 */
function saveRegistrations() {
    try {
        /*
         * Explicitly save only safe fields.
         * Do not add passwords, password confirmations or other secrets.
         */
        const safeRecords = submissions.map((record) => ({
            id: record.id,
            name: record.student,
            email: record.email,
            accessibility: record.category,
            status: normaliseStatus(record.status),
            createdAt: record.createdAt || ""
        }));

        localStorage.setItem(
            REGISTRATION_STORAGE_KEY,
            JSON.stringify(safeRecords)
        );

        return true;
    } catch (error) {
        console.error("Unable to save UniAble registrations:", error);

        showToast(
            "Could not save the change in browser storage."
        );

        return false;
    }
}

/* ---------- 5. DERIVE CATEGORY TOTALS ---------- */

/*
 * Build the chart from actual registration records.
 *
 * No category counts are hardcoded. If there are no registrations,
 * the chart data is empty and the chart displays an empty state.
 */
function calculateCategoryTotals() {
    const totals = new Map();

    submissions.forEach((submission) => {
        const category = submission.category || "Not specified";

        totals.set(
            category,
            (totals.get(category) || 0) + 1
        );
    });

    categoryTotals = Array.from(totals.entries())
        .map(([category, total]) => ({ category, total }))
        .sort((a, b) => b.total - a.total);
}

/* ---------- 6. SUBMISSION TABLE ---------- */

/* Render one row for a registration. */
function renderSubmissionRow(submission) {
    const actionLabel = submission.status === "Pending review"
        ? "Review"
        : "View";

    return `
        <tr>
            <td>
                <div class="student-cell">
                    <strong>${escapeHTML(submission.student)}</strong>
                    <small>${escapeHTML(submission.id)}</small>
                </div>
            </td>

            <td>${escapeHTML(submission.category)}</td>

            <td>
                <div class="document-cell">
                    ${escapeHTML(submission.document)}
                </div>
            </td>

            <td>${getStatusBadge(submission.status)}</td>

            <td>
                <button
                    class="row-action"
                    type="button"
                    data-submission-action="${escapeHTML(submission.id)}"
                    aria-label="${actionLabel} submission ${escapeHTML(submission.id)}"
                >
                    ${actionLabel}
                </button>
            </td>
        </tr>
    `;
}

/* Search and filter the recent-registration table. */
function renderSubmissions() {
    if (!submissionsTable) return;

    const searchTerm = submissionSearch
        ? submissionSearch.value.trim().toLowerCase()
        : "";

    const selectedStatus = statusFilter
        ? statusFilter.value
        : "all";

    const filteredSubmissions = submissions.filter((submission) => {
        const searchableText = [
            submission.id,
            submission.student,
            submission.email,
            submission.category,
            submission.document,
            submission.status
        ].join(" ").toLowerCase();

        const matchesSearch = searchableText.includes(searchTerm);

        let matchesStatus = true;

        if (selectedStatus === "pending") {
            matchesStatus = submission.status === "Pending review";
        } else if (selectedStatus === "approved") {
            matchesStatus = submission.status === "Approved";
        } else if (selectedStatus === "rejected") {
            matchesStatus = submission.status === "Needs changes";
        }

        return matchesSearch && matchesStatus;
    });

    if (filteredSubmissions.length === 0) {
        /*
         * Use a different message when the dashboard has no records
         * versus when the current search/filter found no matches.
         */
        const emptyMessage = submissions.length === 0
            ? "No registrations yet. Completed sign-ups will appear here."
            : "No registrations match your search or selected filter.";

        submissionsTable.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    ${escapeHTML(emptyMessage)}
                </td>
            </tr>
        `;
    } else {
        submissionsTable.innerHTML = filteredSubmissions
            .map(renderSubmissionRow)
            .join("");
    }

    if (submissionCount) {
        if (submissions.length === 0) {
            submissionCount.textContent = "0 registrations";
        } else {
            submissionCount.textContent =
                `Showing ${filteredSubmissions.length} of ${submissions.length} registrations`;
        }
    }
}

/* Render all registrations in the verification queue. */
function renderVerificationTable() {
    if (!verificationTable) return;

    if (submissions.length === 0) {
        verificationTable.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    No registrations awaiting review yet.
                </td>
            </tr>
        `;
        return;
    }

    verificationTable.innerHTML = submissions.map((submission) => {
        const actionLabel = submission.status === "Pending review"
            ? "Review"
            : "View";

        return `
            <tr>
                <td>${escapeHTML(submission.id)}</td>

                <td>
                    <div class="student-cell">
                        <strong>${escapeHTML(submission.student)}</strong>
                    </div>
                </td>

                <td>${escapeHTML(submission.category)}</td>

                <td>${escapeHTML(submission.document)}</td>

                <td>${getStatusBadge(submission.status)}</td>

                <td>
                    <button
                        class="row-action"
                        type="button"
                        data-submission-action="${escapeHTML(submission.id)}"
                        aria-label="${actionLabel} submission ${escapeHTML(submission.id)}"
                    >
                        ${actionLabel}
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

/* ---------- 7. ACCOMMODATIONS ---------- */

/*
 * The registration form does not create accommodation plans.
 * Do not invent records; show an empty state until a real,
 * authorised accommodation workflow is implemented.
 */
function renderAccommodations() {
    if (!accommodationsTable) return;

    if (accommodations.length === 0) {
        accommodationsTable.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    No accommodation records available yet.
                </td>
            </tr>
        `;
        return;
    }

    accommodationsTable.innerHTML = accommodations.map((record) => `
        <tr>
            <td>
                <div class="student-cell">
                    <strong>${escapeHTML(record.student)}</strong>
                </div>
            </td>

            <td>${escapeHTML(record.category)}</td>
            <td>${escapeHTML(record.accommodation)}</td>
            <td>${escapeHTML(record.reviewDate)}</td>
            <td>${getStatusBadge(record.status)}</td>
        </tr>
    `).join("");
}

/* ---------- 8. CATEGORY CHARTS ---------- */

/* Render a category chart using values calculated from registrations. */
function renderCategoryChart(targetElement) {
    if (!targetElement) return;

    if (categoryTotals.length === 0) {
        targetElement.innerHTML = `
            <p class="empty-state">
                No registration categories to display yet.
            </p>
        `;
        return;
    }

    const maximum = Math.max(
        ...categoryTotals.map((item) => item.total),
        1
    );

    targetElement.innerHTML = categoryTotals.map((item) => {
        const percentage = (item.total / maximum) * 100;

        return `
            <div class="chart-row">
                <div class="chart-row-heading">
                    <span>${escapeHTML(item.category)}</span>
                    <strong>${item.total}</strong>
                </div>

                <div class="chart-track">
                    <div
                        class="chart-bar"
                        style="width: ${percentage}%"
                        aria-hidden="true"
                    ></div>
                </div>
            </div>
        `;
    }).join("");
}

/* ---------- 9. WELLBEING ALERTS ---------- */

/*
 * There is no wellbeing-alert submission workflow yet.
 * Keep this section empty rather than showing a fictional student
 * or claiming an alert exists.
 */
function renderAlerts() {
    if (alertCount) {
        alertCount.textContent = wellbeingAlerts.length === 1
            ? "1 active alert"
            : `${wellbeingAlerts.length} active alerts`;
    }

    if (!alertsList) return;

    if (wellbeingAlerts.length === 0) {
        alertsList.innerHTML = `
            <p class="empty-state">
                No wellbeing alerts have been recorded.
            </p>
        `;
        return;
    }

    alertsList.innerHTML = wellbeingAlerts.map((alert) => `
        <article class="alert-card">
            <div class="alert-main">
                <span class="alert-symbol" aria-hidden="true">!</span>

                <div class="alert-details">
                    <strong>${escapeHTML(alert.student)}</strong>
                    <p>${escapeHTML(alert.message)}</p>
                    <small>Location: ${escapeHTML(alert.location)}</small>
                </div>
            </div>

            <div class="alert-assignee">
                Assigned peer: ${escapeHTML(alert.assignedPeer)}
            </div>
        </article>
    `).join("");
}

/* ---------- 10. LIVE STATISTICS ---------- */

/*
 * Calculate all summary values from the loaded registration records.
 *
 * Pending review = registrations waiting for staff review.
 * Approved = registrations marked approved.
 * Needs changes = registrations returned for further information.
 *
 * Documents are not uploaded by the current form, so the pending
 * document count is zero unless an actual document workflow is added.
 */
function updateStatistics() {
    const pendingCount = submissions.filter((submission) => {
        return submission.status === "Pending review";
    }).length;

    const approvedCount = submissions.filter((submission) => {
        return submission.status === "Approved";
    }).length;

    const needsChangesCount = submissions.filter((submission) => {
        return submission.status === "Needs changes";
    }).length;

    const documentsAwaitingReview = submissions.filter((submission) => {
        return submission.document &&
            submission.document !== "Not submitted" &&
            submission.status === "Pending review";
    }).length;

    if (awaitingVerificationElement) {
        awaitingVerificationElement.textContent = pendingCount;
    }

    if (verificationNavCount) {
        verificationNavCount.textContent = pendingCount;
    }

    if (pendingDocumentsElement) {
        pendingDocumentsElement.textContent = documentsAwaitingReview;
    }

    if (reportTotal) {
        reportTotal.textContent = submissions.length;
    }

    if (reportApproved) {
        reportApproved.textContent = approvedCount;
    }

    if (reportPending) {
        reportPending.textContent = pendingCount + needsChangesCount;
    }

    /*
     * Update any KPI cards that have the following optional IDs.
     * If your HTML uses different IDs, we'll align them when you send it.
     */
    const totalRegistrationsElement =
        document.getElementById("totalRegistrations");

    if (totalRegistrationsElement) {
        totalRegistrationsElement.textContent = submissions.length;
    }

    const needsChangesElement =
        document.getElementById("needsChangesCount");

    if (needsChangesElement) {
        needsChangesElement.textContent = needsChangesCount;
    }
}

/* ---------- 11. REFRESH THE DASHBOARD ---------- */

/*
 * Recalculate and render everything from the current saved records.
 * Call after initial load, a storage change, or a status update.
 */
function renderAll() {
    calculateCategoryTotals();

    renderSubmissions();
    renderVerificationTable();
    renderAccommodations();

    renderCategoryChart(categoryChart);
    renderCategoryChart(reportCategoryChart);

    renderAlerts();
    updateStatistics();
}

/* ---------- 12. NAVIGATION ---------- */

function navigateToSection(sectionId) {
    const requestedSection = document.getElementById(sectionId);

    if (
        !requestedSection ||
        !requestedSection.classList.contains("page-section")
    ) {
        return;
    }

    document.querySelectorAll(".page-section").forEach((section) => {
        const isSelected = section.id === sectionId;

        section.classList.toggle("active", isSelected);
        section.hidden = !isSelected;
    });

    document.querySelectorAll(
        ".sidebar-nav .nav-link[data-section]"
    ).forEach((link) => {
        const isSelected = link.dataset.section === sectionId;

        link.classList.toggle("active", isSelected);

        if (isSelected) {
            link.setAttribute("aria-current", "page");
        } else {
            link.removeAttribute("aria-current");
        }
    });

    if (breadcrumbCurrent) {
        const sectionHeading = requestedSection.querySelector("h1");

        breadcrumbCurrent.textContent = sectionHeading
            ? sectionHeading.textContent.trim()
            : "Dashboard";
    }

    closeMobileSidebar();

    const heading = requestedSection.querySelector("h1");

    if (heading) {
        heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: true });
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- 13. MOBILE SIDEBAR ---------- */

function closeMobileSidebar() {
    if (!sidebar || !menuToggle) return;

    sidebar.classList.remove("sidebar-open");

    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation menu");
}

function toggleMobileSidebar() {
    if (!sidebar || !menuToggle) return;

    const isOpening = !sidebar.classList.contains("sidebar-open");

    sidebar.classList.toggle("sidebar-open", isOpening);

    menuToggle.setAttribute("aria-expanded", String(isOpening));
    menuToggle.setAttribute(
        "aria-label",
        isOpening ? "Close navigation menu" : "Open navigation menu"
    );
}

/* ---------- 14. REGISTRATION REVIEW ACTIONS ---------- */

/*
 * The current form has no document-upload or staff-authentication
 * workflow. Therefore, this demo action only changes the status.
 *
 * In a production system, a staff-only backend endpoint must verify
 * the staff member's permissions and persist the review decision.
 */
function handleSubmissionAction(submissionId) {
    const submission = submissions.find((item) => {
        return item.id === submissionId;
    });

    if (!submission) {
        showToast("The selected registration could not be found.");
        return;
    }

    if (submission.status !== "Pending review") {
        showToast(
            `${submission.id} is currently marked "${submission.status}".`
        );
        return;
    }

    const shouldApprove = window.confirm(
        `Demo review for ${submission.id}\n\n` +
        `Student: ${submission.student}\n` +
        `Category: ${submission.category}\n` +
        `Document: ${submission.document}\n\n` +
        "Mark this prototype registration as approved?\n\n" +
        "This does not verify documents or create a real approval."
    );

    if (!shouldApprove) return;

    const originalStatus = submission.status;

    submission.status = "Approved";

    /* Keep the changed status only if the save succeeds. */
    if (!saveRegistrations()) {
        submission.status = originalStatus;
        renderAll();
        return;
    }

    renderAll();

    showToast(
        `${submission.id} marked approved in this prototype.`
    );
}

/* ---------- 15. CSV EXPORT ---------- */

/* Escape a value so it is valid inside a CSV field. */
function escapeCSV(value) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

/*
 * Export the currently saved registrations.
 * Passwords and password confirmations are never included.
 */
function exportReport() {
    if (submissions.length === 0) {
        showToast("There are no registrations to export.");
        return;
    }

    const headers = [
        "Reference",
        "Student",
        "Email",
        "Accessibility category",
        "Document",
        "Status",
        "Registration date"
    ];

    const rows = submissions.map((submission) => [
        submission.id,
        submission.student,
        submission.email,
        submission.category,
        submission.document,
        submission.status,
        submission.createdAt
    ].map(escapeCSV).join(","));

    const csvContent = "\uFEFF" + [
        headers.map(escapeCSV).join(","),
        ...rows
    ].join("\r\n");

    const csvBlob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;"
    });

    const downloadUrl = URL.createObjectURL(csvBlob);
    const downloadLink = document.createElement("a");

    downloadLink.href = downloadUrl;
    downloadLink.download = "uniable-registration-report.csv";
    downloadLink.hidden = true;

    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();

    window.setTimeout(() => {
        URL.revokeObjectURL(downloadUrl);
    }, 1000);

    showToast("Registration report exported.");
}

/* ---------- 16. EVENT LISTENERS ---------- */

/* Handle sidebar navigation and buttons inside generated table rows. */
function handleDocumentClick(event) {
    const target = event.target;

    if (!(target instanceof Element)) return;

    const sectionButton = target.closest("[data-section]");

    if (sectionButton) {
        navigateToSection(sectionButton.dataset.section);
        return;
    }

    const actionButton = target.closest("[data-submission-action]");

    if (actionButton) {
        handleSubmissionAction(
            actionButton.dataset.submissionAction
        );
    }
}

function initialiseEventListeners() {
    document.addEventListener("click", handleDocumentClick);

    if (submissionSearch) {
        submissionSearch.addEventListener("input", renderSubmissions);
    }

    if (statusFilter) {
        statusFilter.addEventListener("change", renderSubmissions);
    }

    if (menuToggle) {
        menuToggle.addEventListener("click", toggleMobileSidebar);
    }

    /* Close the mobile sidebar when the user clicks outside it. */
    document.addEventListener("click", (event) => {
        if (
            !sidebar ||
            !menuToggle ||
            !sidebar.classList.contains("sidebar-open")
        ) {
            return;
        }

        const target = event.target;

        if (!(target instanceof Node)) return;

        const clickedInsideSidebar = sidebar.contains(target);
        const clickedMenuButton = menuToggle.contains(target);

        if (!clickedInsideSidebar && !clickedMenuButton) {
            closeMobileSidebar();
        }
    });

    /* Escape closes the mobile sidebar. */
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeMobileSidebar();
        }
    });

    if (exportReportButton) {
        exportReportButton.addEventListener("click", exportReport);
    }

    if (helpButton) {
        helpButton.addEventListener("click", () => {
            showToast(
                "Connect this help section to your institution's support contact or guidance page."
            );
        });
    }

    window.addEventListener("resize", () => {
        if (window.innerWidth > 1050) {
            closeMobileSidebar();
        }
    });

    /*
     * The browser fires a storage event in OTHER tabs when the same
     * origin's localStorage changes. This allows a completed sign-up
     * to appear in an already-open dashboard tab.
     *
     * The tab that writes the data does not receive its own storage
     * event, which is why the sign-up page does not depend on this.
     */
    window.addEventListener("storage", (event) => {
        if (
            event.key === REGISTRATION_STORAGE_KEY ||
            event.key === null
        ) {
            loadRegistrations();
            renderAll();
        }
    });

    /*
     * Reload the saved data when the user returns to this tab.
     * This is useful if a registration was completed while the
     * dashboard tab was inactive.
     */
    window.addEventListener("focus", () => {
        loadRegistrations();
        renderAll();
    });
}

/* ---------- 17. APPLICATION STARTUP ---------- */

/*
 * Startup sequence:
 * 1. Display today's date.
 * 2. Load registrations saved by the sign-up page.
 * 3. Register user interactions.
 * 4. Render all tables, charts, empty states and statistics.
 */
function initialiseDashboard() {
    updateDate();
    loadRegistrations();
    initialiseEventListeners();
    renderAll();
}

/* Start only after the HTML has been parsed. */
if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initialiseDashboard,
        { once: true }
    );
} else {
    initialiseDashboard();
}
