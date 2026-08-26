// ==UserScript==
// @name         Trans Assistant - Intranet Modern UI
// @namespace    trans-assistant
// @version      1.10
// @description  Nowoczesna, odwracalna nakladka interfejsu na intranet CEMET.
// @match        *://intranet/*
// @updateURL    https://raw.githubusercontent.com/Yazuor/intranet-modern-ui/refs/heads/main/Trans%20Assistant%20-%20Intranet%20Modern%20UI.user.js
// @downloadURL  https://raw.githubusercontent.com/Yazuor/intranet-modern-ui/refs/heads/main/Trans%20Assistant%20-%20Intranet%20Modern%20UI.user.js
// @run-at       document-start
// @grant        none
// ==/UserScript==

(() => {
    "use strict";

    const printFallbackParams = new URLSearchParams(window.location.search);
    if (printFallbackParams.get("ta_modern_print") === "1") {
        const requestedTitle = String(printFallbackParams.get("ta_order") || "Zlecenie")
            .replace(/[^A-Za-z0-9_-]+/g, "-")
            .replace(/^-+|-+$/g, "") || "Zlecenie";
        const launchNativePrint = () => {
            document.title = requestedTitle;
            window.setTimeout(() => window.print(), 350);
        };
        window.addEventListener("afterprint", () => {
            window.setTimeout(() => window.close(), 120);
        }, { once: true });
        if (document.readyState === "complete") launchNativePrint();
        else window.addEventListener("load", launchNativePrint, { once: true });
        return;
    }

    // Kontrolowane ramki wykonują wyłącznie natywne formularze pośrednie.
    // Nakładka nie może montować się ponownie wewnątrz tych ramek.
    if (
        window.name === "trans-assistant-intranet-login-flow"
        || /^trans-assistant-(?:correction-lookup|date-correction)-/.test(window.name)
    ) return;

    const runtimeRoot = document.documentElement;
    const runtimeOwner = window.__transAssistantIntranetModernUiRuntimeOwner || "standalone";
    const existingRuntimeOwner = runtimeRoot?.dataset.taModernUiRuntimeOwner || "";
    if (existingRuntimeOwner && existingRuntimeOwner !== runtimeOwner) {
        return;
    }
    if (runtimeRoot) runtimeRoot.dataset.taModernUiRuntimeOwner = runtimeOwner;

    if (window.transAssistantIntranetModernUiRunning) {
        return;
    }
    window.transAssistantIntranetModernUiRunning = true;

    const SCRIPT_VERSION = "1.10";
    const performanceMetrics = {
        scriptStartedAt: performance.now(),
        earlyUiStartedAt: 0,
        earlyUiFinishedAt: 0,
        initializeStartedAt: 0,
        mountStartedAt: 0,
        mountFinishedAt: 0,
        initializeFinishedAt: 0,
        adapterId: "",
        mounted: false,
        beforeMount: null,
        afterMount: null,
        dashboardStartedAt: 0,
        dashboardFinishedAt: 0
    };
    const STYLE_ID = "trans-assistant-intranet-modern-ui-styles";
    const SWITCH_ID = "trans-assistant-intranet-view-switch";
    const DASHBOARD_ID = "trans-assistant-intranet-results-dashboard";
    const ORDER_SAVE_OVERLAY_ID = "trans-assistant-order-save-overlay";
    const READY_CLASS = "ta-intranet-ui-ready";
    const NAVIGATION_SHIELD_ID = "trans-assistant-intranet-navigation-shield";
    const REMOTE_CONFIG_URL = "https://raw.githubusercontent.com/Yazuor/intranet-modern-ui/refs/heads/main/config.json";
    const REMOTE_CONFIG_CACHE_KEY = "transAssistantIntranetModernUiRemoteConfigV1";
    const REMOTE_CONFIG_TIMEOUT_MS = 5000;
    const REMOTE_CONFIG_CHECK_INTERVAL_MS = 60 * 60 * 1000;
    const REMOTE_DISABLED_NOTICE_ID = "trans-assistant-intranet-remote-disabled";
    const STORAGE_KEY = "transAssistantIntranetUiModeV1";
    const DASHBOARD_COLLAPSED_KEY = "transAssistantIntranetDashboardCollapsedV1";
    const APPROVAL_SELECTION_KEY = "transAssistantIntranetApprovalSelectionCountV1";
    const LOGIN_AUTO_FORWARD_KEY = "transAssistantIntranetLoginAutoForwardV1";
    const LOGIN_TRANSITION_KEY = "transAssistantIntranetLoginTransitionV1";
    const LOGIN_TRANSITION_ID = "trans-assistant-login-transition";
    const LOGIN_TRANSITION_DURATION_MS = 4000;
    const LOGIN_FLOW_FRAME_NAME = "trans-assistant-intranet-login-flow";
    const LOGIN_FLOW_TIMEOUT_MS = 20000;
    const CARRIER_DRIVER_DOCUMENT_MAX_DOT_SUFFIX = 8;
    const LOGIN_TARGET_PATH = "/spedycja_uss_2022/zlecenie/przyjete.php";
    const NATIVE_DIALOG_EVENT = "ta-intranet-native-dialog";
    const ORDER_CHANGE_MESSAGE_SOURCE = "trans-assistant-intranet-modern-ui";
    const PDF_REQUEST_EVENT = "ta-intranet-pdf-request";
    const PDF_RESULT_EVENT = "ta-intranet-pdf-result";
    const PENDING_DIALOG_DATASET_KEY = "taPendingNativeDialog";
    const MODE_MODERN = "modern";
    const MODE_CLASSIC = "classic";
    const LOGIN_PATH_PATTERN = /^\/loguj\.php$/i;
    const LOGIN_LANDING_PATH_PATTERN = /^\/spedycja_uss_2022\/(?:index\.php)?$/i;
    const BASE_PATH_PATTERN = /^\/spedycja_uss_2022(?:\/|$)/i;
    const ACCEPTED_ORDERS_PATH_PATTERN = /\/zlecenie\/przyjete\.php$/i;
    const ACCEPTANCE_LIST_PATH_PATTERN = /\/zlecenie\/akceptacja\.php$/i;
    const ORDER_SEARCH_PATH_PATTERN = /\/zlecenie\/wyszukiwanie\.php$/i;
    const ORDER_WORKFLOW_PATH_PATTERN = /\/zlecenie\/(?:zatwierdzanie|dodanie_kierowcy|anulowanie)\.php$/i;
    const DRIVER_ASSIGNMENT_POPUP_PATH_PATTERN = /\/zlecenie\/dodaj_kierowce_do_zlec\.php$/i;
    const ORDER_CANCEL_POPUP_PATH_PATTERN = /\/zlecenie\/anuluj_zlec\.php$/i;
    const ORDER_ATTACHMENT_POPUP_PATH_PATTERN = /\/zlecenie\/dodaj_zalacznik\.php$/i;
    const OFFER_CANCELLATION_PATH = "/spedycja_uss_2022/oferta/anulowanie.php";
    const OFFER_CANCELLATION_PATH_PATTERN = /\/oferta\/anulowanie\.php$/i;
    const ORDER_DETAILS_PATH_PATTERN = /\/zlecenie\/zlec_akcept_zm\.php$/i;
    const OFFER_FORM_PATH_PATTERN = /\/oferta\/dodanie\.php$/i;
    const OFFER_LOADING_PLACE_PATH_PATTERN = /\/oferta\/dod_nowe_miejsce\.php$/i;
    const CARRIER_ORDER_FORM_PATH_PATTERN = /\/zlecenie\/zlec_akcept2a\.php$/i;
    const CARRIER_FREIGHT_REPORT_PATH_PATTERN = /\/raporty\/raport_1\.php$/i;
    const ORDER_REGISTER_REPORT_PATH_PATTERN = /\/raporty\/raport_2\.php$/i;
    const DRIVER_BROWSE_PATH_PATTERN = /\/administracja\/kierowca_przegladaj\.php$/i;
    const ORDER_COLUMNS = [
        "position",
        "order-number",
        "external-number",
        "margin",
        "offerer",
        "carrier",
        "print",
        "destination",
        "loading-date",
        "loading-time",
        "unloading-date",
        "attachment",
        "user"
    ];
    const SEARCH_RESULT_COLUMNS = [
        "position",
        "order-number",
        "external-number",
        "status",
        "offerer",
        "carrier",
        "print",
        "destination",
        "loading-date",
        "unloading-date",
        "invoice-status",
        "attachment",
        "user"
    ];
    const ORDER_REGISTER_REPORT_COLUMNS = [
        "position",
        "order-number",
        "status",
        "customer",
        "route",
        "external-number",
        "invoice-number",
        "loading-day",
        "unloading-day",
        "distance",
        "offer-freight",
        "mass",
        "carrier",
        "type",
        "carrier-freight",
        "freight-sk",
        "margin",
        "transporeon",
        "forwarder",
        "driver",
        "margin-percent"
    ];
    const CARRIER_FREIGHT_REPORT_COLUMNS = [
        "order-number",
        "external-number",
        "route",
        "loading-date",
        "unloading-date",
        "freight",
        "discount-payment",
        "driver"
    ];

    function getLoginTransitionCriticalCss() {
        return `
            html.ta-login-transition-active {
                background: #edf3ee !important;
            }
            html.ta-login-transition-active body {
                visibility: hidden !important;
                opacity: 0 !important;
            }
            #${LOGIN_TRANSITION_ID} {
                position: fixed;
                z-index: 2147483647;
                inset: 0;
                display: flex;
                box-sizing: border-box;
                padding: 28px;
                align-items: center;
                justify-content: center;
                flex-direction: column;
                background:
                    radial-gradient(circle at 50% 42%, rgba(115, 175, 50, .16), transparent 25%),
                    linear-gradient(160deg, #f8faf7 0%, #eaf1ec 100%);
                color: #123f78;
                font-family: Arial, sans-serif;
                text-align: center;
                visibility: visible !important;
                opacity: 1 !important;
                transition: opacity 180ms ease-out;
            }
            #${LOGIN_TRANSITION_ID}.ta-login-transition-leaving {
                pointer-events: none;
                opacity: 0 !important;
            }
            #${LOGIN_TRANSITION_ID} .ta-login-machine {
                position: relative;
                width: 286px;
                height: 286px;
                margin: 0 0 24px;
                filter: drop-shadow(0 20px 24px rgba(17, 57, 95, .14));
                transform: translateZ(0);
            }
            #${LOGIN_TRANSITION_ID} .ta-login-ring {
                position: absolute;
                display: block;
                left: 50%;
                top: 50%;
                box-sizing: border-box;
                border-style: solid;
                border-radius: 50%;
                transform-origin: 50% 50%;
                will-change: transform;
                backface-visibility: hidden;
            }
            #${LOGIN_TRANSITION_ID} .ta-login-ring-outer {
                width: 250px;
                height: 250px;
                margin: -125px 0 0 -125px;
                border-width: 11px;
                border-color: #dce7e1;
                border-top-color: #17477e;
                border-right-color: #73af32;
                box-shadow: 0 0 0 8px rgba(115, 175, 50, .07);
                animation: taLoginRingClockwise 6000ms linear var(--ta-login-animation-delay, 0ms) infinite;
            }
            #${LOGIN_TRANSITION_ID} .ta-login-ring-middle {
                width: 190px;
                height: 190px;
                margin: -95px 0 0 -95px;
                border-width: 10px;
                border-color: #e1e9ee;
                border-top-color: #73af32;
                border-left-color: #285c8c;
                animation: taLoginRingCounterClockwise 7600ms linear var(--ta-login-animation-delay, 0ms) infinite;
            }
            #${LOGIN_TRANSITION_ID} .ta-login-ring-inner {
                width: 130px;
                height: 130px;
                margin: -65px 0 0 -65px;
                border-width: 9px;
                border-color: #dfe9df;
                border-right-color: #17477e;
                border-bottom-color: #73af32;
                animation: taLoginRingClockwise 5000ms linear var(--ta-login-animation-delay, 0ms) infinite;
            }
            #${LOGIN_TRANSITION_ID} .ta-login-ring-core {
                width: 72px;
                height: 72px;
                margin: -36px 0 0 -36px;
                border-width: 8px;
                border-color: #e3ebef;
                border-top-color: #73af32;
                border-left-color: #446a8e;
                animation: taLoginRingCounterClockwise 4000ms linear var(--ta-login-animation-delay, 0ms) infinite;
            }
            #${LOGIN_TRANSITION_ID} strong {
                display: block;
                margin: 0 0 7px;
                font-size: 25px;
                line-height: 1.2;
                font-weight: 800;
            }
            #${LOGIN_TRANSITION_ID} > span {
                color: #5f7487;
                font-size: 13px;
                font-weight: 600;
            }
            #${LOGIN_TRANSITION_ID} .ta-login-transition-progress {
                position: relative;
                display: block;
                width: min(330px, 72vw);
                height: 6px;
                margin-top: 22px;
                overflow: hidden;
                border-radius: 999px;
                background: #dce6df;
            }
            #${LOGIN_TRANSITION_ID} .ta-login-transition-progress::after {
                content: "";
                position: absolute;
                inset: 0;
                border-radius: inherit;
                background: linear-gradient(90deg, #17477e, #73af32);
                transform-origin: left center;
                animation: taLoginTransitionProgress ${LOGIN_TRANSITION_DURATION_MS}ms linear var(--ta-login-animation-delay, 0ms) both;
            }
            @keyframes taLoginRingClockwise {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            @keyframes taLoginRingCounterClockwise {
                from { transform: rotate(0deg); }
                to { transform: rotate(-360deg); }
            }
            @keyframes taLoginTransitionProgress {
                from { transform: scaleX(0); }
                50% { transform: scaleX(.8); }
                to { transform: scaleX(1); }
            }
        `;
    }

    let currentAdapter = null;
    let currentMode = readStoredMode();
    let remoteConfigAllowed = readCachedRemoteConfig()?.enabled !== false;
    let remoteConfigCheckPromise = null;
    let remoteConfigLastCheckedAt = 0;
    let lastRemoteVersionNotice = "";
    let acceptedPageState = null;
    let acceptancePageState = null;
    let orderSearchPageState = null;

    function isModernMode() {
        return currentMode === MODE_MODERN;
    }
    let orderWorkflowPageState = null;
    let driverAssignmentPopupState = null;
    let orderDetailsPageState = null;
    let orderRegisterReportState = null;
    let carrierFreightReportState = null;
    let acceptedSoftRefreshInFlight = null;
    let acceptedSoftRefreshHooksInstalled = false;
    let approvalSubmissionInFlight = false;
    let offerCancellationInFlight = null;

    if (isSupportedBase() && remoteConfigAllowed) {
        // Tryb klasyczny nie uruchamia żadnych przechwyceń ani adapterów.
        // Jedynym dodatkiem pozostaje później mały przełącznik widoku.
        if (currentMode === MODE_MODERN) installNativeDialogBridge();
        const earlyRoot = document.documentElement;
        const earlyLoginTransition = currentMode === MODE_MODERN ? readLoginTransition() : null;
        earlyRoot.classList.toggle("ta-intranet-modern", currentMode === MODE_MODERN);
        earlyRoot.classList.toggle("ta-intranet-classic", currentMode === MODE_CLASSIC);
        earlyRoot.classList.toggle("ta-intranet-login-boot", Boolean(earlyLoginTransition));
        earlyRoot.classList.toggle(
            "ta-intranet-accepted-boot",
            ACCEPTED_ORDERS_PATH_PATTERN.test(normalizePathname()) && !earlyLoginTransition
        );
        if (currentMode === MODE_MODERN) {
            const earlyStyle = document.createElement("style");
            earlyStyle.id = "trans-assistant-intranet-critical-boot";
            earlyStyle.textContent = `
                html.ta-intranet-modern:not(.${READY_CLASS}) { background:#f3f5f1 !important; }
                html.ta-intranet-modern:not(.${READY_CLASS}) body {
                    visibility:hidden !important;
                    opacity:0 !important;
                }
                html.ta-intranet-modern:not(.ta-intranet-accepted-boot):not(.ta-intranet-login-boot):not(.${READY_CLASS})::before {
                    content:"";
                    position:fixed;
                    z-index:2147483644;
                    inset:0;
                    display:block;
                    background:
                        radial-gradient(circle at 50% 38%, rgba(114,179,51,.08), transparent 31%),
                        linear-gradient(160deg, #f8faf7 0%, #edf3ee 100%);
                    visibility:visible !important;
                    opacity:1 !important;
                    pointer-events:none;
                }
                html.ta-intranet-modern.ta-intranet-accepted-boot:not(.${READY_CLASS})::before {
                    content:"Pobieranie zleceń…";
                    position:fixed;
                    z-index:2147483645;
                    left:50%;
                    top:50%;
                    transform:translate(-50%,-50%);
                    box-sizing:border-box;
                    min-width:300px;
                    padding:88px 30px 24px;
                    border:1px solid #d7e2d1;
                    border-top:4px solid #72b333;
                    border-radius:14px;
                    background:#fff;
                    color:#123f78;
                    box-shadow:0 18px 48px rgba(18,55,91,.14);
                    font:700 14px/1.4 Arial,sans-serif;
                    text-align:center;
                }
                html.ta-intranet-modern.ta-intranet-accepted-boot:not(.${READY_CLASS})::after {
                    content:"";
                    position:fixed;
                    z-index:2147483646;
                    left:50%;
                    top:calc(50% - 25px);
                    width:58px;
                    height:58px;
                    margin:-29px 0 0 -29px;
                    box-sizing:border-box;
                    border:5px solid #dce9d2;
                    border-top-color:#72b333;
                    border-right-color:#17477e;
                    border-radius:50%;
                    box-shadow:0 0 0 8px rgba(114,179,51,.08);
                    animation:taAcceptedBootSpin .85s cubic-bezier(.55,.12,.45,.88) infinite;
                }
                #${NAVIGATION_SHIELD_ID} {
                    position:fixed;
                    z-index:2147483647;
                    inset:0;
                    display:grid;
                    place-items:center;
                    box-sizing:border-box;
                    margin:0;
                    padding:24px;
                    background:
                        radial-gradient(circle at 50% 38%, rgba(114,179,51,.08), transparent 31%),
                        linear-gradient(160deg, #f8faf7 0%, #edf3ee 100%);
                    color:#123f78;
                    visibility:visible !important;
                    opacity:1 !important;
                    pointer-events:all;
                }
                #${NAVIGATION_SHIELD_ID} > span {
                    display:block;
                    min-width:300px;
                    box-sizing:border-box;
                    padding:88px 30px 24px;
                    border:1px solid #d7e2d1;
                    border-top:4px solid #72b333;
                    border-radius:14px;
                    background:#fff;
                    box-shadow:0 18px 48px rgba(18,55,91,.14);
                    font:700 14px/1.4 Arial,sans-serif;
                    text-align:center;
                }
                #${NAVIGATION_SHIELD_ID} > span::before {
                    content:"";
                    position:absolute;
                    left:50%;
                    top:calc(50% - 25px);
                    width:58px;
                    height:58px;
                    margin:-29px 0 0 -29px;
                    box-sizing:border-box;
                    border:5px solid #dce9d2;
                    border-top-color:#72b333;
                    border-right-color:#17477e;
                    border-radius:50%;
                    box-shadow:0 0 0 8px rgba(114,179,51,.08);
                    animation:taAcceptedBootSpin .85s cubic-bezier(.55,.12,.45,.88) infinite;
                }
                @keyframes taAcceptedBootSpin { to { transform:rotate(360deg); } }
                @media (prefers-reduced-motion:reduce) {
                    html.ta-intranet-modern.ta-intranet-accepted-boot:not(.${READY_CLASS})::after { animation-duration:1.8s; }
                }
            `;
            earlyRoot.appendChild(earlyStyle);
        }
    }

    function normalizePathname(pathname = location.pathname) {
        return String(pathname || "").replace(/\/+/g, "/");
    }

    function isSupportedBase() {
        const pathname = normalizePathname();
        return LOGIN_PATH_PATTERN.test(pathname) || BASE_PATH_PATTERN.test(pathname);
    }

    function readLoginTransition() {
        try {
            const value = JSON.parse(sessionStorage.getItem(LOGIN_TRANSITION_KEY) || "null");
            const startedAt = Number(value?.startedAt || 0);
            if (!startedAt || Date.now() - startedAt > 15000) return null;
            return { startedAt };
        } catch (_) {
            return null;
        }
    }

    function clearLoginTransition() {
        try { sessionStorage.removeItem(LOGIN_TRANSITION_KEY); } catch (_) {}
        document.getElementById(LOGIN_TRANSITION_ID)?.remove();
        document.documentElement.classList.remove("ta-login-transition-active", "ta-intranet-login-boot");
    }

    function ensureLoginTransitionOverlay() {
        const root = document.documentElement;
        root.classList.add("ta-login-transition-active");
        let overlay = document.getElementById(LOGIN_TRANSITION_ID);
        const transition = readLoginTransition();
        const elapsed = Math.min(LOGIN_TRANSITION_DURATION_MS, Math.max(0, Date.now() - Number(transition?.startedAt || Date.now())));
        if (overlay) {
            if (!overlay.style.getPropertyValue("--ta-login-animation-delay")) {
                overlay.style.setProperty("--ta-login-animation-delay", `${-elapsed}ms`);
            }
            return overlay;
        }
        overlay = document.createElement("div");
        overlay.id = LOGIN_TRANSITION_ID;
        overlay.style.setProperty("--ta-login-animation-delay", `${-elapsed}ms`);
        overlay.setAttribute("role", "status");
        overlay.setAttribute("aria-live", "polite");
        overlay.innerHTML = `
            <div class="ta-login-machine" aria-hidden="true">
                <span class="ta-login-ring ta-login-ring-outer"></span>
                <span class="ta-login-ring ta-login-ring-middle"></span>
                <span class="ta-login-ring ta-login-ring-inner"></span>
                <span class="ta-login-ring ta-login-ring-core"></span>
            </div>
            <strong>Uruchamianie Spedycji USS</strong>
            <span>Przygotowuję ekran przyjętych zleceń…</span>
            <i class="ta-login-transition-progress" aria-hidden="true"></i>
        `;
        root.appendChild(overlay);
        return overlay;
    }

    function beginLoginTransition() {
        let state = readLoginTransition();
        if (!state) {
            state = { startedAt: Date.now() };
            try { sessionStorage.setItem(LOGIN_TRANSITION_KEY, JSON.stringify(state)); } catch (_) {}
        }
        ensureLoginTransitionOverlay();
        return state;
    }

    function continueLoginTransition() {
        const state = readLoginTransition();
        if (!state) return false;
        const pathname = normalizePathname();
        const isAcceptedTarget = ACCEPTED_ORDERS_PATH_PATTERN.test(pathname);
        if (
            !LOGIN_PATH_PATTERN.test(pathname)
            && !LOGIN_LANDING_PATH_PATTERN.test(pathname)
            && !isAcceptedTarget
        ) return false;
        ensureLoginTransitionOverlay();
        if (LOGIN_LANDING_PATH_PATTERN.test(pathname)) {
            window.setTimeout(() => {
                location.replace(LOGIN_TARGET_PATH);
            }, 0);
        }
        return true;
    }

    function finishLoginTransitionOnAcceptedPage() {
        const state = readLoginTransition();
        if (!state || !ACCEPTED_ORDERS_PATH_PATTERN.test(normalizePathname())) return false;
        const remaining = Math.max(0, LOGIN_TRANSITION_DURATION_MS - (Date.now() - state.startedAt));
        window.setTimeout(clearLoginTransition, remaining);
        return true;
    }

    function installNativeDialogBridge() {
        const root = document.documentElement;
        if (!root || root.dataset.taNativeDialogDirectBridge === "true") return;
        root.dataset.taNativeDialogDirectBridge = "true";
        root.dataset.taNativeDialogBridge = "true";
        const nativeAlert = window.alert.bind(window);
        const interceptAlert = message => {
            const text = String(message ?? "").trim();
            const modern = readStoredMode() === MODE_MODERN;
            const pathname = normalizePathname();
            const isApprovalSuccess = modern
                && /\/zlecenie\/zatwierdzanie\.php$/i.test(pathname)
                && /^zatwierdzone[.!]?$/i.test(text);
            const isOrderDetailsSaveSuccess = modern
                && (ORDER_DETAILS_PATH_PATTERN.test(pathname) || ACCEPTED_ORDERS_PATH_PATTERN.test(pathname))
                && /^dane\s+poprawione[.!]?$/i.test(text);
            if (!isApprovalSuccess && !isOrderDetailsSaveSuccess) return nativeAlert(message);
            let selectedCount = 0;
            try { selectedCount = Math.max(0, Number(sessionStorage.getItem(APPROVAL_SELECTION_KEY) || 0)); } catch (_) {}
            const detail = isApprovalSuccess
                ? { kind: "approval-success", message: text, selectedCount }
                : { kind: "order-details-save-success", message: text };
            root.dataset[PENDING_DIALOG_DATASET_KEY] = JSON.stringify(detail);
            document.dispatchEvent(new CustomEvent(NATIVE_DIALOG_EVENT, { detail }));
            return undefined;
        };
        try {
            window.alert = interceptAlert;
        } catch (_) {}

        // Most w kontekście strony instalujemy zawsze. W Firefoxie/Tampermonkey
        // przypisanie powyżej może wyglądać na udane, ale dotyczyć wyłącznie
        // izolowanego świata userscripta. Wtedy natywny alert intranetu nadal
        // omijał nowoczesne okno po zatwierdzeniu zleceń.
        const source = `(() => {
            if (window.__taIntranetNativeDialogBridge) return;
            window.__taIntranetNativeDialogBridge = true;
            const nativeAlert = window.alert.bind(window);
            const storageKey = ${JSON.stringify(STORAGE_KEY)};
            const selectionKey = ${JSON.stringify(APPROVAL_SELECTION_KEY)};
            const eventName = ${JSON.stringify(NATIVE_DIALOG_EVENT)};
            const datasetKey = ${JSON.stringify(PENDING_DIALOG_DATASET_KEY)};
            const normalizePath = value => String(value || "").replace(/\\/+/g, "/");
            window.alert = message => {
                const text = String(message ?? "").trim();
                let modern = true;
                try {
                    modern = localStorage.getItem(storageKey) !== "classic"
                        && new URLSearchParams(location.search).get("taClassic") !== "1";
                } catch (_) {}
                const pathname = normalizePath(location.pathname);
                const isApprovalSuccess = modern
                    && /\\/zlecenie\\/zatwierdzanie\\.php$/i.test(pathname)
                    && /^zatwierdzone[.!]?$/i.test(text);
                const isOrderDetailsSaveSuccess = modern
                    && /\\/zlecenie\\/(?:zlec_akcept_zm|przyjete)\\.php$/i.test(pathname)
                    && /^dane\\s+poprawione[.!]?$/i.test(text);
                if (!isApprovalSuccess && !isOrderDetailsSaveSuccess) return nativeAlert(message);
                let selectedCount = 0;
                try { selectedCount = Math.max(0, Number(sessionStorage.getItem(selectionKey) || 0)); } catch (_) {}
                const detail = isApprovalSuccess
                    ? { kind: "approval-success", message: text, selectedCount }
                    : { kind: "order-details-save-success", message: text };
                document.documentElement.dataset[datasetKey] = JSON.stringify(detail);
                document.dispatchEvent(new CustomEvent(eventName, { detail }));
                return undefined;
            };
        })();`;
        const script = document.createElement("script");
        script.textContent = source;
        root.appendChild(script);
        script.remove();
    }

    function installApprovalInlineDialogInterceptor() {
        const root = document.documentElement;
        if (!root || root.dataset.taApprovalInlineDialogInterceptor === "true") return;
        root.dataset.taApprovalInlineDialogInterceptor = "true";
        document.addEventListener("beforescriptexecute", event => {
            if (readStoredMode() !== MODE_MODERN) return;
            const pathname = normalizePathname();
            const isApprovalPage = /\/zlecenie\/zatwierdzanie\.php$/i.test(pathname);
            const isOrderDetailsPage = ORDER_DETAILS_PATH_PATTERN.test(pathname);
            const isAcceptedOrdersPage = ACCEPTED_ORDERS_PATH_PATTERN.test(pathname);
            if (!isApprovalPage && !isOrderDetailsPage && !isAcceptedOrdersPage) return;
            const script = event.target;
            if (!script || String(script.tagName || "").toUpperCase() !== "SCRIPT" || script.src) return;
            const source = String(script.textContent || "");
            const expectedTextPattern = isApprovalPage ? "zatwierdzone[.!]?" : "dane\\s+poprawione[.!]?";
            const alertPattern = new RegExp(`\\b(?:window\\s*\\.\\s*)?alert\\s*\\(\\s*(["'])${expectedTextPattern}\\1\\s*\\)\\s*;?`, "ig");
            if (!alertPattern.test(source)) return;
            alertPattern.lastIndex = 0;
            const alertOnlyPattern = new RegExp(`^\\s*(?:window\\s*\\.\\s*)?alert\\s*\\(\\s*(["'])${expectedTextPattern}\\1\\s*\\)\\s*;?\\s*$`, "i");
            const detail = isApprovalPage
                ? {
                    kind: "approval-success",
                    message: "Zatwierdzone",
                    selectedCount: Math.max(0, Number(sessionStorage.getItem(APPROVAL_SELECTION_KEY) || 0))
                }
                : { kind: "order-details-save-success", message: "DANE POPRAWIONE" };
            if (!alertOnlyPattern.test(source)) {
                const replacement = `document.documentElement.dataset.${PENDING_DIALOG_DATASET_KEY}=JSON.stringify(${JSON.stringify(detail)});document.dispatchEvent(new CustomEvent(${JSON.stringify(NATIVE_DIALOG_EVENT)},{detail:${JSON.stringify(detail)}}));`;
                script.textContent = source.replace(alertPattern, replacement);
                return;
            }
            event.preventDefault();
            root.dataset[PENDING_DIALOG_DATASET_KEY] = JSON.stringify(detail);
            document.dispatchEvent(new CustomEvent(NATIVE_DIALOG_EVENT, { detail }));
        }, true);
    }

    function isForcedClassicMode() {
        try {
            return new URLSearchParams(location.search).get("taClassic") === "1";
        } catch (_) {
            return false;
        }
    }

    function readStoredMode() {
        if (isForcedClassicMode()) {
            return MODE_CLASSIC;
        }
        try {
            return localStorage.getItem(STORAGE_KEY) === MODE_CLASSIC
                ? MODE_CLASSIC
                : MODE_MODERN;
        } catch (_) {
            return MODE_MODERN;
        }
    }

    function versionParts(version) {
        const parts = String(version || "").match(/\d+/g);
        return parts ? parts.map(Number) : [0];
    }

    function compareVersions(left, right) {
        const leftParts = versionParts(left);
        const rightParts = versionParts(right);
        const length = Math.max(leftParts.length, rightParts.length);
        for (let index = 0; index < length; index += 1) {
            const difference = (leftParts[index] || 0) - (rightParts[index] || 0);
            if (difference !== 0) return difference > 0 ? 1 : -1;
        }
        return 0;
    }

    function normalizeRemoteConfig(value) {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
            throw new Error("config.json musi być obiektem JSON");
        }
        return {
            enabled: value.enabled !== false,
            latestVersion: String(value.latestVersion || "").trim(),
            message: String(value.message || "").trim()
        };
    }

    function readCachedRemoteConfig() {
        try {
            return normalizeRemoteConfig(JSON.parse(localStorage.getItem(REMOTE_CONFIG_CACHE_KEY) || "null"));
        } catch (_) {
            return null;
        }
    }

    function writeCachedRemoteConfig(config) {
        try { localStorage.setItem(REMOTE_CONFIG_CACHE_KEY, JSON.stringify(config)); } catch (_) {}
    }

    async function fetchRemoteConfig() {
        const controller = typeof AbortController === "function" ? new AbortController() : null;
        const timeout = controller
            ? window.setTimeout(() => controller.abort(), REMOTE_CONFIG_TIMEOUT_MS)
            : 0;
        try {
            const separator = REMOTE_CONFIG_URL.includes("?") ? "&" : "?";
            const response = await fetch(`${REMOTE_CONFIG_URL}${separator}t=${Date.now()}`, {
                cache: "no-store",
                headers: { Accept: "application/json" },
                signal: controller?.signal
            });
            if (!response.ok) throw new Error(`GitHub zwrócił HTTP ${response.status}`);
            return normalizeRemoteConfig(JSON.parse(await response.text()));
        } finally {
            if (timeout) window.clearTimeout(timeout);
        }
    }

    function renderRemoteDisabledNotice(config = readCachedRemoteConfig()) {
        if (!document.body || document.getElementById(REMOTE_DISABLED_NOTICE_ID)) return;
        const notice = document.createElement("div");
        notice.id = REMOTE_DISABLED_NOTICE_ID;
        notice.setAttribute("role", "status");
        notice.textContent = config?.message
            ? `Modern UI jest zdalnie wyłączony. ${config.message}`
            : "Modern UI jest zdalnie wyłączony przez administratora.";
        notice.style.cssText = "position:fixed;right:14px;bottom:14px;z-index:2147483647;max-width:360px;padding:10px 14px;border:1px solid #d6c987;border-radius:8px;background:#fff8d8;color:#5f4c00;box-shadow:0 8px 24px rgba(0,0,0,.16);font:600 12px/1.4 Arial,sans-serif";
        document.body.appendChild(notice);
    }

    function applyRemoteConfig(config) {
        if (!config) return remoteConfigAllowed;
        const wasAllowed = remoteConfigAllowed;
        remoteConfigAllowed = config.enabled !== false;
        writeCachedRemoteConfig(config);

        if (config.latestVersion && compareVersions(config.latestVersion, SCRIPT_VERSION) > 0) {
            if (lastRemoteVersionNotice !== config.latestVersion) {
                console.warn(`[Trans Assistant Intranet Modern UI] Dostępna jest wersja ${config.latestVersion}; zainstalowana: ${SCRIPT_VERSION}.`);
                lastRemoteVersionNotice = config.latestVersion;
            }
        } else {
            lastRemoteVersionNotice = "";
        }

        if (remoteConfigAllowed !== wasAllowed) {
            location.reload();
        } else if (!remoteConfigAllowed) {
            renderRemoteDisabledNotice(config);
        }
        return remoteConfigAllowed;
    }

    async function refreshRemoteConfigStatus(force = false) {
        const now = Date.now();
        if (!force && now - remoteConfigLastCheckedAt < REMOTE_CONFIG_CHECK_INTERVAL_MS) return remoteConfigAllowed;
        if (remoteConfigCheckPromise) return remoteConfigCheckPromise;
        remoteConfigLastCheckedAt = now;
        remoteConfigCheckPromise = fetchRemoteConfig()
            .then(applyRemoteConfig)
            .catch(error => {
                const reason = error?.name === "AbortError"
                    ? `timeout po ${REMOTE_CONFIG_TIMEOUT_MS / 1000} s`
                    : error?.message || String(error);
                console.warn(`[Trans Assistant Intranet Modern UI] Nie udało się sprawdzić zdalnej konfiguracji (${reason}) — zachowuję ostatni stan.`);
                return remoteConfigAllowed;
            })
            .finally(() => { remoteConfigCheckPromise = null; });
        return remoteConfigCheckPromise;
    }

    function installRemoteConfigLifecycle() {
        void refreshRemoteConfigStatus(true);
        window.setInterval(() => void refreshRemoteConfigStatus(true), REMOTE_CONFIG_CHECK_INTERVAL_MS);
        if (!remoteConfigAllowed) {
            if (document.readyState === "loading") {
                document.addEventListener("DOMContentLoaded", () => renderRemoteDisabledNotice(), { once: true });
            } else {
                renderRemoteDisabledNotice();
            }
        }
    }

    function saveMode(mode) {
        try {
            localStorage.setItem(STORAGE_KEY, mode);
        } catch (_) {
            // Brak localStorage nie może blokować klasycznego intranetu.
        }
    }

    function cleanText(value) {
        return String(value || "")
            .replace(/\s+/g, " ")
            .trim()
            .toLocaleLowerCase("pl-PL");
    }

    function foldText(value) {
        return cleanText(value)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/ł/g, "l");
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function cellText(row, index) {
        return String(row?.cells?.[index]?.textContent || "")
            .replace(/\s+/g, " ")
            .trim();
    }

    function parsePolishNumber(value) {
        const normalized = String(value || "")
            .replace(/\s|\u00a0/g, "")
            .replace(/%|zł/gi, "")
            .replace(/\./g, "")
            .replace(",", ".")
            .replace(/[^\d.-]/g, "");
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : null;
    }

    function comparisonRatio(currentValue, previousValue) {
        const current = parsePolishNumber(currentValue);
        const previous = parsePolishNumber(previousValue);
        if (current === null || previous === null || previous === 0) return null;
        return current / previous * 100;
    }

    function polishFractionDigits(value, maximum = 2) {
        const match = String(value || "").match(/,(\d+)/);
        return match ? Math.min(maximum, match[1].length) : 0;
    }

    function formatAnimatedNumber(value, fractionDigits = 0, suffix = "") {
        return `${Number(value).toLocaleString("pl-PL", {
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: fractionDigits
        })}${suffix}`;
    }

    function progressWidth(ratio) {
        if (!Number.isFinite(ratio)) return 0;
        return Math.max(0, Math.min(100, ratio / 1.25));
    }

    function ratioLabel(ratio) {
        return Number.isFinite(ratio)
            ? `${ratio.toLocaleString("pl-PL", { maximumFractionDigits: 1 })}%`
            : "brak odniesienia";
    }

    function setRole(element, role) {
        if (element) {
            element.dataset.taIntranetRole = role;
        }
        return element;
    }

    function getDirectBodyTables(doc = document) {
        return Array.from(doc?.body?.children || [])
            .filter(element => element.tagName === "TABLE");
    }

    function collectModernUiDomCounts() {
        return {
            elements: document.getElementsByTagName("*").length,
            forms: document.forms?.length || 0,
            tables: document.getElementsByTagName("table").length,
            inputs: document.getElementsByTagName("input").length,
            scripts: document.getElementsByTagName("script").length
        };
    }

    function findPageShellTable(bodyTables = getDirectBodyTables()) {
        return bodyTables.find(table => {
            const firstRow = table.rows?.[0];
            const sideCell = firstRow?.cells?.[0];
            const mainCell = firstRow?.cells?.[1];
            if (!sideCell || !mainCell) return false;
            return sideCell.querySelectorAll('a[href*="/zlecenie/"], a[href*="/oferta/"], a[href*="/administracja/"]').length >= 2;
        }) || bodyTables[2] || null;
    }

    function findAcceptedOrdersTable(root = document) {
        return Array.from(root?.querySelectorAll?.("table") || []).find(table =>
            Array.from(table.rows || []).some(row => {
                const cells = Array.from(row.cells || []);
                if (cells.length !== ORDER_COLUMNS.length) return false;
                return cleanText(cells[1]?.textContent).includes("nr. zlec")
                    && cleanText(cells[5]?.textContent).includes("przewoźnik")
                    && cleanText(cells[12]?.textContent) === "wpr";
            })
        ) || null;
    }

    function markTopHeader(table) {
        setRole(table, "top-header");
        table?.querySelectorAll("a[href]").forEach(link => {
            const label = cleanText(link.textContent);
            if (label) {
                link.dataset.taIntranetRole = label.includes("wyloguj")
                    ? "top-nav-logout"
                    : "top-nav-link";
            }
        });
    }

    function markSideNavigation(shell) {
        const firstRow = shell?.rows?.[0];
        const sideCell = firstRow?.cells?.[0];
        const mainCell = firstRow?.cells?.[1];
        setRole(sideCell, "side-navigation");
        setRole(mainCell, "main-content");
        sideCell?.querySelectorAll("table").forEach(table => setRole(table, "side-nav-item"));
        sideCell?.querySelectorAll("a[href]").forEach(link => {
            setRole(link, "side-nav-link");
            try {
                const targetPath = normalizePathname(new URL(link.getAttribute("href"), location.href).pathname);
                link.dataset.taIntranetCurrent = String(targetPath === normalizePathname());
                if (targetPath === normalizePathname()) link.setAttribute("aria-current", "page");
            } catch (_) {}
        });
        return mainCell || null;
    }

    function activateFirstSideNavigationItem(sideCell, mainCell) {
        if (currentMode !== MODE_MODERN || !sideCell || !mainCell) return false;
        const pathname = normalizePathname();
        if (!/(?:\/|\/index\.php)$/i.test(pathname)) return false;

        const firstLink = Array.from(sideCell.querySelectorAll('a[href]')).find(link => {
            const href = String(link.getAttribute("href") || "").trim();
            if (!href || href === "#" || /^javascript:\s*(?:void\s*\(\s*0\s*\)|;?)\s*$/i.test(href)) return false;
            if (link.hidden || link.getAttribute("aria-disabled") === "true" || link.hasAttribute("disabled")) return false;
            if (link.closest("[hidden]")) return false;
            if (!/^javascript:/i.test(href)) {
                try {
                    const targetPath = normalizePathname(new URL(href, location.href).pathname);
                    if (targetPath === pathname) return false;
                } catch (_) {
                    return false;
                }
            }
            return link.getClientRects().length > 0;
        }) || null;
        if (!firstLink) return false;

        sideCell.querySelectorAll('[data-ta-intranet-role="side-nav-link"]').forEach(link => {
            link.dataset.taIntranetCurrent = "false";
            link.removeAttribute("aria-current");
        });
        firstLink.dataset.taIntranetCurrent = "true";
        firstLink.setAttribute("aria-current", "page");
        firstLink.click();
        return true;
    }

    function setAttachmentPresentationState(link, hasAttachment, count = null) {
        if (!link) return;
        const normalizedCount = Number.isFinite(Number(count)) ? Math.max(0, Number(count)) : null;
        link.dataset.taAttachmentState = hasAttachment ? "present" : "empty";
        if (normalizedCount !== null) link.dataset.taAttachmentCount = String(normalizedCount);
        else delete link.dataset.taAttachmentCount;
        link.setAttribute("title", hasAttachment ? "Pokaż załącznik" : "Brak załącznika");
        link.setAttribute("aria-label", hasAttachment ? "Pokaż załącznik" : "Brak załącznika — dodaj");
    }

    function markAttachmentPresentation(link) {
        const imageSource = String(link.querySelector("img")?.getAttribute("src") || "").toLowerCase();
        const hasAttachment = /logo_pdf_mini\.gif(?:$|[?#])/.test(imageSource)
            && !/dodajfvat\.gif(?:$|[?#])/.test(imageSource);
        setAttachmentPresentationState(link, hasAttachment, hasAttachment ? 1 : 0);
    }

    function extractLegacyActionParameter(value, pathnamePattern, parameter) {
        const source = String(value || "");
        if (!pathnamePattern.test(source)) return "";
        const match = new RegExp(`[?&]${parameter}=(\\d+)`, "i").exec(source);
        return match?.[1] || "";
    }

    function readAcceptedOrderRowIdentity(row) {
        if (!row) return { orderId: "", attachmentOrderId: "" };
        let orderId = String(row.dataset.taOrderId || "");
        let attachmentOrderId = String(row.dataset.taAttachmentOrderId || "");
        if (!orderId || !attachmentOrderId) {
            Array.from(row.querySelectorAll("a[href]")).forEach(link => {
                const href = link.getAttribute("href") || "";
                orderId ||= extractLegacyActionParameter(href, /zlec_akcept_zm\.php/i, "id_o");
                attachmentOrderId ||= extractLegacyActionParameter(href, /dodaj_zalacznik\.php/i, "id_zlecenia");
            });
        }
        if (orderId) row.dataset.taOrderId = orderId;
        if (attachmentOrderId) row.dataset.taAttachmentOrderId = attachmentOrderId;
        return { orderId, attachmentOrderId };
    }

    function findAcceptedOrderRowByIdentity(root, identity) {
        if (!root || (!identity?.orderId && !identity?.attachmentOrderId)) return null;
        return Array.from(root.querySelectorAll("tr")).find(row => {
            const candidate = readAcceptedOrderRowIdentity(row);
            if (identity.orderId && candidate.orderId === identity.orderId) return true;
            return Boolean(identity.attachmentOrderId && candidate.attachmentOrderId === identity.attachmentOrderId);
        }) || null;
    }

    function markKpiTables(mainCell, ordersTable) {
        const tables = Array.from(mainCell?.querySelectorAll("table") || [])
            .filter(table => table !== ordersTable);
        let primaryTable = null;
        let secondaryTable = null;
        for (const table of tables) {
            const text = cleanText(table.textContent);
            if (text.includes("miesiąc") && text.includes("narastająco")) {
                setRole(table, "kpi-primary");
                primaryTable = table;
                Array.from(table.rows || []).forEach((row, index) => {
                    row.dataset.taIntranetKpiRow = index <= 2 ? "heading" : "value";
                });
                continue;
            }
            if (text.includes("zlecenia zrealizowane") && text.includes("średni fracht")) {
                setRole(table, "kpi-secondary");
                secondaryTable = table;
                Array.from(table.rows || []).forEach((row, index) => {
                    row.dataset.taIntranetKpiRow = index === 0 ? "heading" : "value";
                });
            }
        }

        const periodForm = Array.from(mainCell?.querySelectorAll("form") || [])
            .find(form => form.querySelector('select[name="rok"]') && form.querySelector('select[name="miesiac"]'));
        setRole(periodForm, "period-form");
        periodForm?.querySelectorAll("select").forEach(select => setRole(select, "period-select"));
        return { primaryTable, secondaryTable, periodForm };
    }

    function buildProgressRow(label, currentValue, previousValue, animationIndex = 0) {
        const ratio = comparisonRatio(currentValue, previousValue);
        const width = progressWidth(ratio);
        return `
            <div class="ta-cemet-progress-row">
                <div class="ta-cemet-progress-heading">
                    <span>${escapeHtml(label)}</span>
                    <strong>${escapeHtml(currentValue || "-")}</strong>
                </div>
                <div class="ta-cemet-progress-track" title="Wartość poprzednia: ${escapeHtml(previousValue || "-")}">
                    <span class="ta-cemet-progress-fill"
                        style="--ta-progress-width:${width.toFixed(2)}%;--ta-progress-delay:${animationIndex * 70}ms"></span>
                    <i class="ta-cemet-progress-reference" aria-hidden="true"></i>
                </div>
                <div class="ta-cemet-progress-meta">
                    <span>poprzednio ${escapeHtml(previousValue || "-")}</span>
                    <b>${escapeHtml(ratioLabel(ratio))}</b>
                </div>
            </div>
        `;
    }

    function buildResultsDashboard(kpi, mainCell) {
        const primaryRows = Array.from(kpi.primaryTable?.rows || []);
        const secondaryRows = Array.from(kpi.secondaryTable?.rows || []);
        if (primaryRows.length < 7) return null;

        const periodLabel = cellText(primaryRows[2], 0) || "Bieżący miesiąc";
        const previousPeriodLabel = cellText(primaryRows[2], 3) || "poprzedni rok";
        const yearLabel = cellText(primaryRows[2], 6) || "Wykonanie bieżące";
        const previousYearLabel = cellText(primaryRows[2], 9) || "Wykonanie poprzednie";
        const metricRows = primaryRows.slice(3, 7).map((row, index) => ({
            label: cellText(row, 5) || ["Sprzedaż netto", "Koszty zmienne", "Marża brutto", "Marża netto"][index],
            month: cellText(row, 0),
            previousMonth: cellText(row, 3),
            year: cellText(row, 6),
            previousYear: cellText(row, 9)
        }));
        const operationalRows = secondaryRows.slice(1, 5).map(row => ({
            label: cellText(row, 0),
            current: cellText(row, 1),
            previous: cellText(row, 2)
        })).filter(metric => metric.label);

        const dashboard = document.createElement("section");
        dashboard.id = DASHBOARD_ID;
        dashboard.setAttribute("aria-label", "Panel wyników CEMET SERWIS");
        dashboard.innerHTML = `
            <header class="ta-cemet-dashboard-header">
                <div>
                    <span class="ta-cemet-dashboard-kicker">CEMET SERWIS</span>
                    <h2>Panel wyników</h2>
                    <p>${escapeHtml(periodLabel)} · porównanie z ${escapeHtml(previousPeriodLabel)}</p>
                </div>
                <div class="ta-cemet-dashboard-actions">
                    <div class="ta-cemet-period-slot" data-ta-intranet-role="period-slot"></div>
                    <button type="button" class="ta-cemet-soft-refresh" title="Pobierz świeże dane bez przeładowania całej strony">Odśwież dane</button>
                    <button type="button" class="ta-cemet-dashboard-toggle" aria-expanded="true">Zwiń wyniki</button>
                    <span class="ta-cemet-soft-refresh-status" role="status" aria-live="polite"></span>
                </div>
            </header>
            <div class="ta-cemet-dashboard-content">
              <div class="ta-cemet-dashboard-content-inner">
               <div class="ta-cemet-metric-grid">
                ${metricRows.map((metric, index) => {
                    const ratio = comparisonRatio(metric.month, metric.previousMonth);
                    const displayLabel = index === 3 ? "Marża (%)" : metric.label;
                    const displayMonth = index === 3 && metric.month && !/%/.test(metric.month)
                        ? `${metric.month}%`
                        : metric.month;
                    const ratioText = ratioLabel(ratio);
                    const ratioDigits = polishFractionDigits(ratioText, 1);
                    const animationDelay = index * 80;
                    const ringProgress = Number.isFinite(ratio)
                        ? Math.max(0, Math.min(100, ratio))
                        : 0;
                    const favorable = Number.isFinite(ratio)
                        && (index === 1 ? ratio <= 100 : ratio >= 100);
                    return `
                        <article class="ta-cemet-metric-card" data-metric-index="${index}">
                            <div class="ta-cemet-metric-label"><i></i>${escapeHtml(displayLabel)}</div>
                            <strong>${escapeHtml(displayMonth || "-")}</strong>
                            <div class="ta-cemet-metric-comparison">
                                <span>${escapeHtml(previousPeriodLabel)}: ${escapeHtml(metric.previousMonth || "-")}</span>
                                <b data-ratio-tone="${favorable ? "favorable" : "neutral"}"
                                    title="Realizacja: ${escapeHtml(ratioText)}"
                                    ${Number.isFinite(ratio) ? `data-ta-count-target="${ratio}" data-ta-count-decimals="${ratioDigits}" data-ta-count-suffix="%" data-ta-count-delay="${animationDelay}"` : ""}
                                    style="--ta-ring-progress:${ringProgress.toFixed(1)}%;--ta-ring-delay:${animationDelay}ms">${escapeHtml(Number.isFinite(ratio) ? formatAnimatedNumber(0, ratioDigits, "%") : "—")}</b>
                            </div>
                        </article>
                    `;
                }).join("")}
               </div>
              <div class="ta-cemet-dashboard-charts">
                <article class="ta-cemet-chart-card">
                    <div class="ta-cemet-chart-title">
                        <div><span>NARASTAJĄCO</span><h3>Wynik względem poprzedniego roku</h3></div>
                        <small>${escapeHtml(yearLabel)} / ${escapeHtml(previousYearLabel)}</small>
                    </div>
                    ${metricRows.slice(0, 3).map((metric, index) =>
                        buildProgressRow(metric.label, metric.year, metric.previousYear, index)
                    ).join("")}
                </article>
                <article class="ta-cemet-chart-card">
                    <div class="ta-cemet-chart-title">
                        <div><span>OPERACJE</span><h3>Najważniejsze wskaźniki</h3></div>
                        <small>bieżący rok / poprzedni rok</small>
                    </div>
                    ${operationalRows.map((metric, index) =>
                        buildProgressRow(metric.label, metric.current, metric.previous, index + 3)
                    ).join("")}
                </article>
               </div>
              </div>
            </div>
        `;

        const toggle = dashboard.querySelector(".ta-cemet-dashboard-toggle");
        const softRefresh = dashboard.querySelector(".ta-cemet-soft-refresh");
        const content = dashboard.querySelector(".ta-cemet-dashboard-content");
        let indicatorTimer = 0;
        let counterAnimationFrame = 0;
        let transitionGeneration = 0;
        const counterNodes = Array.from(dashboard.querySelectorAll("[data-ta-count-target]"));
        const setCounterValue = (node, value) => {
            const fractionDigits = Number(node.dataset.taCountDecimals || 0);
            node.textContent = formatAnimatedNumber(value, fractionDigits, node.dataset.taCountSuffix || "");
        };
        const resetCounters = () => {
            window.cancelAnimationFrame(counterAnimationFrame);
            counterAnimationFrame = 0;
            counterNodes.forEach(node => setCounterValue(node, 0));
        };
        const animateCounters = (generation, reducedMotion) => {
            if (reducedMotion) {
                counterNodes.forEach(node => setCounterValue(node, Number(node.dataset.taCountTarget)));
                return;
            }
            const duration = 4000;
            const hermiteProgress = (value, startX, endX, startY, endY, startSpeed, endSpeed) => {
                const span = endX - startX;
                const progress = (value - startX) / span;
                const progress2 = progress * progress;
                const progress3 = progress2 * progress;
                return (2 * progress3 - 3 * progress2 + 1) * startY
                    + (progress3 - 2 * progress2 + progress) * span * startSpeed
                    + (-2 * progress3 + 3 * progress2) * endY
                    + (progress3 - progress2) * span * endSpeed;
            };
            const threeStageProgress = value => {
                const progress = Math.max(0, Math.min(1, value));
                // Trzy fazy: energiczny start, spokojne rozwinięcie i łagodny finisz.
                // Wspólne prędkości na granicach usuwają widoczny skok hamowania.
                if (progress <= 0.42) {
                    return hermiteProgress(progress, 0, 0.42, 0, 0.55, 1.45, 1.05);
                }
                if (progress <= 0.76) {
                    return hermiteProgress(progress, 0.42, 0.76, 0.55, 0.85, 1.05, 0.68);
                }
                return hermiteProgress(progress, 0.76, 1, 0.85, 1, 0.68, 0.35);
            };
            const startedAt = performance.now();
            const tick = now => {
                if (generation !== transitionGeneration) return;
                let pending = false;
                counterNodes.forEach(node => {
                    const delay = Number(node.dataset.taCountDelay || 0);
                    const progress = Math.max(0, Math.min(1, (now - startedAt - delay) / duration));
                    const eased = threeStageProgress(progress);
                    setCounterValue(node, Number(node.dataset.taCountTarget) * eased);
                    if (progress < 1) pending = true;
                });
                if (pending) {
                    counterAnimationFrame = window.requestAnimationFrame(tick);
                } else {
                    counterAnimationFrame = 0;
                }
            };
            counterAnimationFrame = window.requestAnimationFrame(tick);
        };
        const setCollapsed = (collapsed, persist = true) => {
            const generation = ++transitionGeneration;
            window.clearTimeout(indicatorTimer);
            resetCounters();
            dashboard.classList.remove("are-indicators-ready");
            dashboard.classList.toggle("is-collapsed", collapsed);
            toggle?.setAttribute("aria-expanded", String(!collapsed));
            content?.setAttribute("aria-hidden", String(collapsed));
            if (toggle) toggle.textContent = collapsed ? "Rozwiń wyniki" : "Zwiń wyniki";
            if (!collapsed) {
                window.requestAnimationFrame(() => {
                    if (generation !== transitionGeneration) return;
                    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
                    indicatorTimer = window.setTimeout(() => {
                        if (generation === transitionGeneration) {
                            dashboard.classList.add("are-indicators-ready");
                            animateCounters(generation, reducedMotion);
                        }
                    }, reducedMotion ? 0 : 260);
                });
            }
            if (persist) {
                try {
                    localStorage.setItem(DASHBOARD_COLLAPSED_KEY, collapsed ? "1" : "0");
                } catch (_) {}
            }
        };
        let initiallyCollapsed = false;
        try {
            initiallyCollapsed = localStorage.getItem(DASHBOARD_COLLAPSED_KEY) === "1";
        } catch (_) {}
        setCollapsed(initiallyCollapsed, false);
        toggle?.addEventListener("click", () => setCollapsed(!dashboard.classList.contains("is-collapsed")));
        softRefresh?.addEventListener("click", () => {
            void acceptedPageState?.softRefresh?.({ reason: "dashboard-button" });
        });
        const refreshState = document.documentElement.dataset.taAcceptedSoftRefresh || "idle";
        const refreshMessage = document.documentElement.dataset.taAcceptedSoftRefreshMessage || "";
        if (softRefresh) {
            softRefresh.disabled = refreshState === "loading";
            softRefresh.textContent = refreshState === "loading"
                ? "Odświeżam…"
                : refreshState === "error" ? "Spróbuj ponownie" : "Odśwież dane";
        }
        const refreshStatus = dashboard.querySelector(".ta-cemet-soft-refresh-status");
        if (refreshStatus) {
            refreshStatus.textContent = refreshMessage;
            refreshStatus.dataset.state = refreshState;
        }

        const insertionPoint = kpi.primaryTable || mainCell.firstElementChild;
        if (insertionPoint?.parentNode) {
            insertionPoint.parentNode.insertBefore(dashboard, insertionPoint);
        } else {
            mainCell.prepend(dashboard);
        }
        return dashboard;
    }

    function setAcceptedOrdersMode(mode) {
        const pageState = acceptedPageState;
        if (!pageState) return;
        if (mode === MODE_MODERN) {
            pageState.ordersViewport?.activate();
            pageState.ensureDashboard?.();
        }
        else pageState.ordersViewport?.deactivate();
        pageState.filterPresentation?.forEach(item => {
            if (item.kind === "input") {
                if (mode === MODE_MODERN) item.element.setAttribute("placeholder", item.label);
                else if (item.original === null) item.element.removeAttribute("placeholder");
                else item.element.setAttribute("placeholder", item.original);
            } else {
                item.element.textContent = mode === MODE_MODERN ? item.label : item.original;
            }
        });
        if (!pageState.periodForm || !pageState.periodAnchor) return;
        if (mode === MODE_MODERN) {
            pageState.dashboard
                ?.querySelector('[data-ta-intranet-role="period-slot"]')
                ?.appendChild(pageState.periodForm);
            return;
        }
        if (
            pageState.periodAnchor.parentNode
            && pageState.periodAnchor.nextSibling !== pageState.periodForm
        ) {
            pageState.periodAnchor.parentNode.insertBefore(
                pageState.periodForm,
                pageState.periodAnchor.nextSibling
            );
        }
    }

    function classifyOrderAction(link) {
        const href = String(link.getAttribute("href") || "");
        if (/zlec_akcept_zm\.php/i.test(href)) return "edit-order";
        if (/list_\d+\.php/i.test(href)) return "print-list";
        if (/zlecenie_\d+\.php/i.test(href)) return "print-order";
        if (/f_vat_drukowanie_calosc\.php/i.test(href)) return "invoice-print";
        if (/anuluj_zlec\.php/i.test(href)) return "cancel-order";
        if (/dodaj_zalacznik\.php/i.test(href)) return "attachment";
        return "";
    }

    function resolveOrderPdfBridgeSaver() {
        const loaderSave = window.__taIntranetSaveOrderPdf;
        if (typeof loaderSave === "function") {
            return payload => loaderSave(payload);
        }

        try {
            const pageWindow = typeof unsafeWindow === "undefined" ? null : unsafeWindow;
            const pageSave = pageWindow?.TransAssistantIntranetBridge?.saveCompletedOrderPdf;
            if (typeof pageSave === "function") {
                return payload => {
                    const pagePayload = pageWindow.JSON.parse(JSON.stringify(payload));
                    return pageSave(pagePayload);
                };
            }
        } catch (_) {}

        const directSave = window.TransAssistantIntranetBridge?.saveCompletedOrderPdf;
        if (typeof directSave === "function") {
            return payload => directSave(payload);
        }
        return null;
    }

    function isOrderPdfBridgeAvailable() {
        return Boolean(
            resolveOrderPdfBridgeSaver()
            || window.transAssistantIntranetBridgeRunning === true
        );
    }

    function requestOrderPdfFromBridge(payload) {
        const bridgeSaver = resolveOrderPdfBridgeSaver();
        if (bridgeSaver) {
            try {
                return Promise.resolve(bridgeSaver(payload));
            } catch (error) {
                return Promise.reject(error);
            }
        }
        if (window.transAssistantIntranetBridgeRunning !== true) {
            const error = new Error("Intranet Bridge nie jest aktywny.");
            error.code = "BRIDGE_UNAVAILABLE";
            return Promise.reject(error);
        }

        const requestId = `pdf-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        return new Promise((resolve, reject) => {
            const timeout = window.setTimeout(() => {
                document.removeEventListener(PDF_RESULT_EVENT, handleResult);
                reject(new Error("Bridge nie odpowiedział na żądanie zapisu PDF."));
            }, 65000);
            const handleResult = event => {
                if (event.detail?.requestId !== requestId) return;
                window.clearTimeout(timeout);
                document.removeEventListener(PDF_RESULT_EVENT, handleResult);
                if (event.detail?.ok) resolve(event.detail.result || { ok: true });
                else reject(new Error(event.detail?.error || "Bridge nie potwierdził zapisu PDF."));
            };
            document.addEventListener(PDF_RESULT_EVENT, handleResult);
            document.dispatchEvent(new CustomEvent(PDF_REQUEST_EVENT, {
                detail: { requestId, payload }
            }));
        });
    }

    function resolveNativePrintUrl(printHref) {
        const rawHref = String(printHref || "").trim();
        if (!rawHref) return null;

        // Legacy actions are commonly stored as:
        // javascript:displayWindow('zlecenie_2.php?id_z=...',640,600)
        // Extract the URL argument without executing legacy JavaScript.
        const popupMatch = /^javascript\s*:\s*(?:displayWindow|window\.open)\s*\(\s*(['"])(.*?)\1/i.exec(rawHref);
        const targetHref = String(popupMatch?.[2] || rawHref).trim();
        if (!targetHref || /^javascript\s*:/i.test(targetHref)) return null;

        const printUrl = new URL(targetHref, window.location.href);
        if (printUrl.origin !== window.location.origin) return null;
        if (!/\/zlecenie\/zlecenie_\d+\.php$/i.test(printUrl.pathname)) return null;
        return printUrl;
    }

    function openOrderPrintFallback(printHref, orderNumber) {
        if (!printHref) {
            throw new Error("Nie znaleziono natywnego wydruku zlecenia.");
        }
        const printUrl = resolveNativePrintUrl(printHref);
        if (!printUrl) {
            throw new Error("Nie udało się odczytać natywnego wydruku zlecenia.");
        }
        printUrl.searchParams.set("ta_modern_print", "1");
        printUrl.searchParams.set("ta_order", orderNumber);
        const popup = window.open(
            printUrl.href,
            `ta-print-${orderNumber}`,
            "width=980,height=760,resizable=yes,scrollbars=yes"
        );
        if (!popup) {
            throw new Error("Przeglądarka zablokowała okno wydruku. Zezwól intranetowi na wyskakujące okna.");
        }
        try { popup.focus(); } catch (_) {}
        return { ok: true, fallback: true, fileName: `${orderNumber}.pdf` };
    }

    function addOrderPdfAction(row) {
        const cells = Array.from(row?.cells || []);
        if (cells.length !== ORDER_COLUMNS.length) return null;
        const attachmentCell = cells[ORDER_COLUMNS.indexOf("attachment")];
        const attachmentLink = attachmentCell?.querySelector('a[href*="dodaj_zalacznik.php"]');
        const editLink = row.querySelector('a[href*="zlec_akcept_zm.php"]');
        const printLink = Array.from(row.querySelectorAll('a[href]'))
            .find(link => classifyOrderAction(link) === "print-order");
        const orderId = /[?&]id_o=(\d+)/i.exec(String(editLink?.getAttribute("href") || ""))?.[1] || "";
        const orderNumber = /\bCD\d+\b/i.exec(String(cells[1]?.textContent || editLink?.textContent || ""))?.[0]?.toUpperCase() || "";
        if (!attachmentCell || !attachmentLink || !orderId || !orderNumber) return null;
        if (attachmentCell.querySelector(".ta-order-pdf-save")) return null;

        const actions = document.createElement("span");
        actions.className = "ta-order-document-actions";
        const button = document.createElement("button");
        button.type = "button";
        button.className = "ta-order-pdf-save";
        button.textContent = "PDF";
        button.title = `Zapisz ${orderNumber} jako PDF na pulpicie`;
        button.setAttribute("aria-label", button.title);
        attachmentCell.insertBefore(actions, attachmentLink);
        actions.append(attachmentLink, button);

        button.addEventListener("click", async () => {
            if (button.disabled) return;
            button.disabled = true;
            button.dataset.state = "saving";
            button.textContent = "…";
            try {
                const bridgeAvailable = isOrderPdfBridgeAvailable();
                const result = bridgeAvailable
                    ? await requestOrderPdfFromBridge({ orderId, orderNumber })
                    : openOrderPrintFallback(printLink?.getAttribute("href") || "", orderNumber);
                if (!result?.ok) throw new Error(result?.error || "Bridge nie potwierdził zapisu PDF.");
                button.dataset.state = "success";
                if (result.fallback) {
                    button.title = `Otworzono wydruk ${orderNumber}`;
                    showOrderSaveMessage(`Wybierz „Zapisz jako PDF”. Nazwa pliku: ${orderNumber}.pdf`, "success");
                } else {
                    button.title = `Zapisano ${result.fileName || `${orderNumber}.pdf`}`;
                    showOrderSaveMessage(`PDF zapisany: ${result.fileName || `${orderNumber}.pdf`}`, "success");
                }
            } catch (error) {
                button.dataset.state = "error";
                showOrderSaveMessage(error?.message || "Nie udało się zapisać PDF.");
            } finally {
                button.disabled = false;
                button.textContent = "PDF";
            }
        });
        return button;
    }

    function markOrdersTable(table) {
        setRole(table, "orders-table");
        const rows = Array.from(table.rows || []);
        const headerIndex = rows.findIndex(row => {
            const cells = Array.from(row.cells || []);
            return cells.length === ORDER_COLUMNS.length
                && cleanText(cells[1]?.textContent).includes("nr. zlec")
                && cleanText(cells[12]?.textContent) === "wpr";
        });
        if (headerIndex < 0) return;

        const filterRow = rows[headerIndex - 1];
        const filterPresentation = [];
        if (filterRow?.cells?.length === ORDER_COLUMNS.length) {
            filterRow.dataset.taIntranetRow = "filters";
            const filterLabels = {
                "order-number": "Zlecenie",
                "external-number": "Obcy",
                offerer: "Oferent",
                carrier: "Przewoźnik",
                user: "WPR"
            };
            Object.entries(filterLabels).forEach(([column, label]) => {
                const cell = filterRow.cells[ORDER_COLUMNS.indexOf(column)];
                if (!cell) return;
                const input = cell.querySelector('input:not([type="hidden"])');
                if (input) {
                    filterPresentation.push({
                        kind: "input",
                        element: input,
                        label,
                        original: input.getAttribute("placeholder")
                    });
                    input.setAttribute("placeholder", label);
                }
                const select = cell.querySelector("select");
                const firstOption = select?.options?.[0];
                if (firstOption && /^(?:--?|\s*)$/.test(cleanText(firstOption.textContent))) {
                    filterPresentation.push({
                        kind: "option",
                        element: firstOption,
                        label,
                        original: firstOption.textContent
                    });
                    firstOption.textContent = label;
                }
            });
        }
        rows[headerIndex].dataset.taIntranetRow = "headers";

        rows.forEach((row, rowIndex) => {
            const cells = Array.from(row.cells || []);
            if (cells.length === ORDER_COLUMNS.length) {
                cells.forEach((cell, columnIndex) => {
                    cell.dataset.taIntranetColumn = ORDER_COLUMNS[columnIndex];
                });
            }
            if (rowIndex > headerIndex && cells.length === ORDER_COLUMNS.length) {
                row.dataset.taIntranetRow = "order";
                row.dataset.taIntranetStripe = String((rowIndex - headerIndex) % 2);
                const marginCell = cells[3];
                const marginValue = parsePolishNumber(marginCell?.textContent);
                const legacyColor = String(marginCell?.getAttribute("bgcolor") || "").toLowerCase();
                marginCell.dataset.taMarginLevel = /(?:ff0000|red)/i.test(legacyColor)
                    || (marginValue !== null && marginValue < 5)
                    ? "warning"
                    : "positive";
                addOrderPdfAction(row);
            }
            if (rowIndex === rows.length - 1 && cells.length === 1) {
                row.dataset.taIntranetRow = "summary";
            }
        });

        table.querySelectorAll("a[href]").forEach(link => {
            const action = classifyOrderAction(link);
            if (action) {
                link.dataset.taIntranetAction = action;
                if (action === "attachment") markAttachmentPresentation(link);
            }
        });
        table.querySelectorAll('tr[data-ta-intranet-row="order"]').forEach(readAcceptedOrderRowIdentity);
        table.querySelectorAll('input[type="text"]').forEach(input => {
            input.dataset.taIntranetField = input.name === "godzina_zlenia"
                ? "loading-time"
                : input.name === "nr_obcy"
                    ? "external-number"
                    : "text";
        });
        table.querySelectorAll('input[type="submit"]').forEach(input => {
            input.dataset.taIntranetAction = "save-inline";
        });
        const searchForm = table.closest("form");
        setRole(searchForm, "orders-search-form");
        const filterRowSelects = filterRow?.querySelectorAll("select") || [];
        filterRowSelects.forEach(select => setRole(select, "column-filter"));
        return filterPresentation;
    }

    function createOrdersViewport(table) {
        const parent = table?.parentNode;
        if (!table || !parent) return null;
        const anchor = document.createComment("trans-assistant-orders-viewport-anchor");
        const viewport = document.createElement("div");
        viewport.className = "ta-orders-viewport";
        parent.insertBefore(anchor, table);

        const activate = () => {
            if (table.parentNode === viewport) return;
            const anchorParent = anchor.parentNode;
            if (!anchorParent) return;
            anchorParent.insertBefore(viewport, anchor.nextSibling);
            viewport.appendChild(table);
        };
        const deactivate = () => {
            if (table.parentNode !== viewport) return;
            const viewportParent = viewport.parentNode;
            viewportParent?.insertBefore(table, viewport);
            viewport.remove();
        };
        activate();
        return { viewport, anchor, activate, deactivate };
    }

    function getAcceptedOrdersMainCell(doc = document) {
        const shell = findPageShellTable(getDirectBodyTables(doc));
        return shell?.rows?.[0]?.cells?.[1] || null;
    }

    function getAcceptedOrdersColumnCount(table) {
        return Array.from(table?.rows || []).find(row => {
            const cells = Array.from(row.cells || []);
            return cells.length === ORDER_COLUMNS.length
                && cleanText(cells[1]?.textContent).includes("nr. zlec")
                && cleanText(cells[12]?.textContent) === "wpr";
        })?.cells?.length || 0;
    }

    function collectAcceptedOrdersContract(doc = document) {
        const mainCell = getAcceptedOrdersMainCell(doc);
        const table = findAcceptedOrdersTable(doc);
        const forms = Array.from(mainCell?.querySelectorAll("form") || []);
        const namedControls = Array.from(mainCell?.querySelectorAll("input[name], select[name], textarea[name]") || []);
        const formMetadataContracts = forms.map(form => {
            let action = "";
            try { action = new URL(form.getAttribute("action") || location.href, location.href).href; } catch (_) {}
            return JSON.stringify({
                action,
                method: String(form.method || "GET").toUpperCase(),
                target: String(form.target || ""),
                id: String(form.id || ""),
                name: String(form.getAttribute("name") || "")
            });
        }).sort();
        const controlContracts = namedControls.map(control => [
            String(control.tagName || "").toLowerCase(),
            String(control.type || "").toLowerCase(),
            String(control.name || ""),
            String(control.id || ""),
            String(control.getAttribute("form") || "")
        ].join(":")).sort();
        const formContracts = forms.map(form => {
            let action = "";
            try { action = new URL(form.getAttribute("action") || location.href, location.href).href; } catch (_) {}
            const controls = Array.from(form.elements || []).map(control => [
                String(control.tagName || "").toLowerCase(),
                String(control.type || "").toLowerCase(),
                String(control.name || ""),
                String(control.id || "")
            ].join(":"));
            return JSON.stringify({
                action,
                method: String(form.method || "GET").toUpperCase(),
                target: String(form.target || ""),
                controls
            });
        }).sort();
        const unsafeForms = forms.filter(form => {
            try {
                return new URL(form.getAttribute("action") || location.href, location.href).origin !== location.origin;
            } catch (_) {
                return true;
            }
        });
        const orderRows = Array.from(table?.rows || []).filter(row => {
            const cells = Array.from(row.cells || []);
            if (cells.length !== ORDER_COLUMNS.length) return false;
            return Boolean(cells[1]?.querySelector('a[href*="zlec_akcept_zm.php"]'));
        });
        const nativeWindowActions = Array.from(table?.querySelectorAll('a[href^="javascript:displayWindow("]') || []);
        return {
            mainCell,
            table,
            columns: getAcceptedOrdersColumnCount(table),
            orderRows: orderRows.length,
            forms: forms.length,
            namedControls: namedControls.length,
            formMetadataFingerprint: JSON.stringify(formMetadataContracts),
            controlContractFingerprint: JSON.stringify(controlContracts),
            formContractFingerprint: JSON.stringify(formContracts),
            unsafeForms: unsafeForms.length,
            hasPeriodForm: Boolean(mainCell?.querySelector('form select[name="rok"]') && mainCell?.querySelector('form select[name="miesiac"]')),
            nativeWindowActions: nativeWindowActions.length,
            hasNativeWindowActions: nativeWindowActions.length > 0
        };
    }

    function validateAcceptedOrdersContract(contract) {
        if (!contract.mainCell || !contract.table) throw new Error("Odpowiedź nie zawiera tabeli przyjętych zleceń.");
        if (contract.columns !== ORDER_COLUMNS.length) throw new Error("Zmienił się układ kolumn tabeli.");
        if (contract.orderRows < 1) throw new Error("Odpowiedź nie zawiera żadnego rozpoznawalnego wiersza zlecenia.");
        if (contract.forms < 1 || contract.namedControls < 1) throw new Error("Brakuje natywnych formularzy lub kontrolek.");
        if (contract.unsafeForms > 0) throw new Error("Odpowiedź zawiera formularz spoza intranetu.");
        if (!contract.hasPeriodForm) throw new Error("Brakuje formularza wyboru okresu.");
        if (!contract.hasNativeWindowActions) throw new Error("Brakuje natywnych akcji okien zleceń.");
        return true;
    }

    function setAcceptedSoftRefreshState(state, message = "") {
        document.documentElement.dataset.taAcceptedSoftRefresh = state;
        document.documentElement.dataset.taAcceptedSoftRefreshMessage = message;
        const dashboard = acceptedPageState?.dashboard;
        const button = dashboard?.querySelector(".ta-cemet-soft-refresh");
        const status = dashboard?.querySelector(".ta-cemet-soft-refresh-status");
        if (button) {
            button.disabled = state === "loading";
            button.textContent = state === "loading"
                ? "Odświeżam…"
                : state === "error" ? "Spróbuj ponownie" : "Odśwież dane";
        }
        if (status) {
            status.textContent = message;
            status.dataset.state = state;
        }
    }

    async function fetchAcceptedOrdersDocument(url, options = {}) {
        const response = await fetch(url, {
            credentials: "same-origin",
            redirect: "follow",
            headers: { "X-Trans-Assistant-Soft-Refresh": "accepted-orders" },
            ...options
        });
        if (!response.ok) throw new Error(`Serwer zwrócił HTTP ${response.status}.`);
        const responseUrl = new URL(response.url || url, location.href);
        if (responseUrl.origin !== location.origin || !ACCEPTED_ORDERS_PATH_PATTERN.test(normalizePathname(responseUrl.pathname))) {
            throw new Error("Intranet przekierował odpowiedź poza stronę przyjętych zleceń.");
        }
        const bytes = new Uint8Array(await response.arrayBuffer());
        const charset = detectOfferCancellationCharset(response, bytes);
        let html;
        try {
            html = new TextDecoder(charset).decode(bytes);
        } catch (_) {
            html = new TextDecoder("iso-8859-2").decode(bytes);
        }
        return {
            doc: new DOMParser().parseFromString(html, "text/html"),
            responseUrl: responseUrl.href
        };
    }

    function replaceAcceptedOrdersMainContent(fetchedDocument) {
        const fetchedContract = collectAcceptedOrdersContract(fetchedDocument);
        validateAcceptedOrdersContract(fetchedContract);

        const currentMainCell = acceptedPageState?.mainCell || getAcceptedOrdersMainCell(document);
        const currentContract = collectAcceptedOrdersContract(document);
        validateAcceptedOrdersContract(currentContract);
        if (!currentMainCell) throw new Error("Nie znaleziono aktywnego obszaru strony.");

        const scrollPosition = { x: window.scrollX, y: window.scrollY };
        const oldViewportScrollLeft = acceptedPageState?.ordersViewport?.viewport?.scrollLeft || 0;
        const oldState = acceptedPageState;
        const oldContent = document.createDocumentFragment();
        while (currentMainCell.firstChild) oldContent.appendChild(currentMainCell.firstChild);

        try {
            const newContent = document.createDocumentFragment();
            Array.from(fetchedContract.mainCell.childNodes).forEach(node => {
                const imported = document.importNode(node, true);
                if (imported.nodeType === Node.ELEMENT_NODE && imported.matches?.("script")) return;
                imported.querySelectorAll?.("script").forEach(script => script.remove());
                newContent.appendChild(imported);
            });
            currentMainCell.appendChild(newContent);

            acceptedPageState = null;
            const mounted = mountAcceptedOrdersPage();
            const mountedContract = collectAcceptedOrdersContract(document);
            const ownershipIsValid = mounted
                && mountedContract.columns === fetchedContract.columns
                && mountedContract.orderRows === fetchedContract.orderRows
                && mountedContract.forms === fetchedContract.forms
                && mountedContract.namedControls === fetchedContract.namedControls
                && mountedContract.formMetadataFingerprint === fetchedContract.formMetadataFingerprint
                && mountedContract.controlContractFingerprint === fetchedContract.controlContractFingerprint
                && mountedContract.nativeWindowActions === fetchedContract.nativeWindowActions
                && mountedContract.unsafeForms === 0;
            if (!ownershipIsValid) {
                throw new Error("Kontrola formularzy po podmianie nie powiodła się.");
            }
            if (mountedContract.formContractFingerprint !== fetchedContract.formContractFingerprint) {
                console.info(`[Trans Assistant Intranet Modern UI ${SCRIPT_VERSION}] Właściciele części kontrolek legacy zostali znormalizowani przez aktywny DOM; globalny kontrakt formularzy pozostał kompletny.`);
            }

            setAcceptedOrdersMode(currentMode);
            window.requestAnimationFrame(() => {
                if (acceptedPageState?.ordersViewport?.viewport) {
                    acceptedPageState.ordersViewport.viewport.scrollLeft = oldViewportScrollLeft;
                }
                window.scrollTo(scrollPosition.x, scrollPosition.y);
            });
            return mountedContract;
        } catch (error) {
            currentMainCell.replaceChildren(oldContent);
            acceptedPageState = oldState;
            setAcceptedOrdersMode(currentMode);
            throw error;
        }
    }

    async function softRefreshAcceptedOrders({ url = location.href, fetchOptions = {}, reason = "manual" } = {}) {
        if (acceptedSoftRefreshInFlight) return acceptedSoftRefreshInFlight;
        if (currentMode !== MODE_MODERN || !ACCEPTED_ORDERS_PATH_PATTERN.test(normalizePathname())) return false;

        const startedAt = performance.now();
        setAcceptedSoftRefreshState("loading", "Pobieranie świeżych danych…");
        acceptedSoftRefreshInFlight = (async () => {
            try {
                const fetched = await fetchAcceptedOrdersDocument(url, fetchOptions);
                const contract = replaceAcceptedOrdersMainContent(fetched.doc);
                const durationMs = Math.round(performance.now() - startedAt);
                delete document.documentElement.dataset.taAcceptedSoftRefreshError;
                setAcceptedSoftRefreshState("success", `Dane odświeżone · ${(durationMs / 1000).toLocaleString("pl-PL", { maximumFractionDigits: 1 })} s`);
                document.dispatchEvent(new CustomEvent("ta-intranet-accepted-soft-refresh", {
                    detail: { ok: true, reason, durationMs, rows: contract.orderRows }
                }));
                return true;
            } catch (error) {
                console.warn(`[Trans Assistant Intranet Modern UI ${SCRIPT_VERSION}] Soft refresh nieudany:`, error);
                document.documentElement.dataset.taAcceptedSoftRefreshError = error?.message || String(error);
                setAcceptedSoftRefreshState("error", "Nie odświeżono. Poprzednie dane pozostają dostępne — możesz spróbować ponownie.");
                document.dispatchEvent(new CustomEvent("ta-intranet-accepted-soft-refresh", {
                    detail: { ok: false, reason, error: error?.message || String(error) }
                }));
                return false;
            } finally {
                acceptedSoftRefreshInFlight = null;
            }
        })();
        return acceptedSoftRefreshInFlight;
    }

    function buildSoftRefreshRequest(form, submitter) {
        const action = new URL(form.getAttribute("action") || location.href, location.href);
        if (action.origin !== location.origin || !ACCEPTED_ORDERS_PATH_PATTERN.test(normalizePathname(action.pathname))) return null;
        if (form.target && !/^_?self$/i.test(form.target)) return null;
        if (form.querySelector('input[type="file"]')) return null;
        const method = String(form.method || "GET").toUpperCase();
        // Zapisy legacy pozostają natywne: intranet używa ISO-8859-2 i nie wolno
        // zmieniać kodowania ani semantyki POST w warstwie wizualnej.
        if (method !== "GET") return null;
        const data = new FormData(form);
        if (submitter?.name && !data.has(submitter.name)) data.append(submitter.name, submitter.value || "");
        action.search = "";
        data.forEach((value, key) => action.searchParams.append(key, String(value)));
        return { url: action.href, fetchOptions: { method: "GET" } };
    }

    function getSameOriginPostAction(form) {
        if (!form) return null;
        let action = null;
        try { action = new URL(form.getAttribute("action") || location.href, location.href); } catch (_) { return null; }
        if (action.origin !== location.origin || String(form.method || "GET").toUpperCase() !== "POST") return null;
        return action;
    }

    function submitNativeFormInBackground(form, submitter) {
        return new Promise((resolve, reject) => {
            if (!getSameOriginPostAction(form)) {
                reject(new Error("Formularz nie spełnia kontraktu bezpiecznego zapisu w tle."));
                return;
            }
            const frame = document.createElement("iframe");
            const frameName = `ta-native-post-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            frame.name = frameName;
            frame.hidden = true;
            frame.setAttribute("aria-hidden", "true");
            frame.setAttribute("sandbox", "allow-forms allow-same-origin");
            frame.srcdoc = "<!doctype html><title>Trans Assistant</title>";
            let phase = "boot";
            let timeout = 0;
            const hadTarget = form.hasAttribute("target");
            const previousTarget = form.getAttribute("target") || "";
            const restoreForm = () => {
                delete form.dataset.taBackgroundSubmitting;
                if (hadTarget) form.setAttribute("target", previousTarget);
                else form.removeAttribute("target");
            };
            const cleanup = () => {
                window.clearTimeout(timeout);
                restoreForm();
                frame.remove();
            };
            frame.addEventListener("load", () => {
                if (phase === "boot") {
                    phase = "submitted";
                    try {
                        form.target = frameName;
                        form.dataset.taBackgroundSubmitting = "true";
                        if (typeof form.requestSubmit === "function") form.requestSubmit(submitter || undefined);
                        else form.submit();
                        window.setTimeout(restoreForm, 0);
                    } catch (error) {
                        cleanup();
                        reject(error);
                    }
                    return;
                }
                if (phase !== "submitted") return;
                phase = "done";
                try {
                    const responseDocument = frame.contentDocument;
                    if (!responseDocument?.documentElement) throw new Error("Serwer nie zwrócił dokumentu możliwego do zweryfikowania.");
                    resolve(responseDocument);
                } catch (error) {
                    reject(error);
                } finally {
                    cleanup();
                }
            });
            timeout = window.setTimeout(() => {
                if (phase === "done") return;
                phase = "done";
                cleanup();
                reject(new Error("Serwer nie potwierdził zapisu w oczekiwanym czasie."));
            }, 20000);
            document.body.appendChild(frame);
        });
    }

    function getAcceptedInlineMutation(form, submitter) {
        if (!form || !submitter || submitter.dataset.taIntranetAction !== "save-inline") return null;
        if (form.dataset.taBackgroundSubmitting === "true" || form.dataset.taInlineMutationBusy === "true") return null;
        if (!getSameOriginPostAction(form)) return null;
        const row = submitter.closest('tr[data-ta-intranet-row="order"]');
        const cell = submitter.closest("td");
        if (!row || !cell) return null;
        const field = cell.querySelector('input[name="nr_obcy"], input[name="godzina_zlenia"]');
        if (!field || field.form !== form) return null;
        const identity = readAcceptedOrderRowIdentity(row);
        if (!identity.orderId && !identity.attachmentOrderId) return null;
        return {
            row,
            field,
            fieldName: field.name,
            expectedValue: String(field.value || ""),
            identity
        };
    }

    async function saveAcceptedInlineMutation(form, submitter, mutation) {
        form.dataset.taInlineMutationBusy = "true";
        submitter.setAttribute("aria-busy", "true");
        try {
            const responseDocument = await submitNativeFormInBackground(form, submitter);
            const responseRow = findAcceptedOrderRowByIdentity(responseDocument, mutation.identity);
            const responseField = responseRow?.querySelector(`input[name="${mutation.fieldName}"]`) || null;
            if (!responseField || String(responseField.value || "") !== mutation.expectedValue) {
                throw new Error("Serwer nie potwierdził zapisanej wartości. Widok nie został przeładowany.");
            }
            mutation.field.value = String(responseField.value || "");
            mutation.field.defaultValue = mutation.field.value;
            showOrderSaveMessage(
                mutation.fieldName === "nr_obcy" ? "Numer obcy został zapisany." : "Godzina załadunku została zapisana.",
                "success"
            );
        } catch (error) {
            console.warn(`[Trans Assistant Intranet Modern UI ${SCRIPT_VERSION}] Zapis wiersza bez przeładowania nie powiódł się:`, error);
            showOrderSaveMessage(error?.message || "Nie udało się potwierdzić zapisu.", "error");
        } finally {
            delete form.dataset.taInlineMutationBusy;
            submitter.removeAttribute("aria-busy");
        }
    }

    function applyAcceptedOrderChangeMessage(event) {
        if (event.origin !== location.origin || currentMode !== MODE_MODERN || !ACCEPTED_ORDERS_PATH_PATTERN.test(normalizePathname())) return;
        const detail = event.data;
        if (!detail || detail.source !== ORDER_CHANGE_MESSAGE_SOURCE || detail.type !== "ORDER_CHANGED") return;
        if (detail.kind !== "attachment" || !/^\d+$/.test(String(detail.orderId || ""))) return;
        const row = findAcceptedOrderRowByIdentity(document, { attachmentOrderId: String(detail.orderId) });
        const link = row?.querySelector('a[data-ta-intranet-action="attachment"]') || null;
        if (!link) return;
        const count = Math.max(0, Number(detail.attachmentCount) || 0);
        setAttachmentPresentationState(link, count > 0, count);
        if (detail.announce !== false) {
            showOrderSaveMessage(count > 0 ? "Załącznik został zapisany." : "Lista załączników została zaktualizowana.", "success");
        }
    }

    function installAcceptedSoftRefreshHooks() {
        if (acceptedSoftRefreshHooksInstalled) return;
        acceptedSoftRefreshHooksInstalled = true;
        window.addEventListener("message", applyAcceptedOrderChangeMessage);
        document.addEventListener("submit", event => {
            if (event.defaultPrevented || currentMode !== MODE_MODERN || !ACCEPTED_ORDERS_PATH_PATTERN.test(normalizePathname())) return;
            const form = event.target instanceof HTMLFormElement ? event.target : null;
            if (form?.dataset.taBackgroundSubmitting === "true") return;
            const submitter = event.submitter || null;
            const mutation = form ? getAcceptedInlineMutation(form, submitter) : null;
            if (mutation) {
                event.preventDefault();
                void saveAcceptedInlineMutation(form, submitter, mutation);
                return;
            }
            const request = form ? buildSoftRefreshRequest(form, submitter) : null;
            if (!request) return;
            event.preventDefault();
            void softRefreshAcceptedOrders({ ...request, reason: "native-form" });
        }, true);
        document.addEventListener("click", event => {
            if (currentMode !== MODE_MODERN || !ACCEPTED_ORDERS_PATH_PATTERN.test(normalizePathname())) return;
            const link = event.target?.closest?.('a[href]');
            if (!link || link.target || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
            try {
                const target = new URL(link.href, location.href);
                if (target.origin !== location.origin || !ACCEPTED_ORDERS_PATH_PATTERN.test(normalizePathname(target.pathname))) return;
                event.preventDefault();
                void softRefreshAcceptedOrders({ url: target.href, reason: "accepted-link" });
            } catch (_) {}
        }, true);
    }

    function mountAcceptedOrdersPage() {
        const bodyTables = getDirectBodyTables();
        markTopHeader(bodyTables[0]);
        setRole(bodyTables[1], "breadcrumb");
        const shell = setRole(bodyTables[2], "page-shell");
        const mainCell = markSideNavigation(shell);
        const ordersTable = findAcceptedOrdersTable();
        if (!ordersTable || !mainCell) {
            return false;
        }
        const kpi = markKpiTables(mainCell, ordersTable);
        const filterPresentation = markOrdersTable(ordersTable);
        const ordersViewport = createOrdersViewport(ordersTable);
        const periodAnchor = document.createComment("trans-assistant-period-form-anchor");
        if (kpi.periodForm?.parentNode) {
            kpi.periodForm.parentNode.insertBefore(periodAnchor, kpi.periodForm);
        }
        let dashboardScheduled = false;
        const ensureDashboard = () => {
            if (acceptedPageState?.dashboard || dashboardScheduled || currentMode !== MODE_MODERN) return;
            dashboardScheduled = true;
            const scheduleFrame = window.requestAnimationFrame || (callback => window.setTimeout(callback, 16));
            scheduleFrame(() => scheduleFrame(() => {
                dashboardScheduled = false;
                if (!acceptedPageState || acceptedPageState.dashboard || currentMode !== MODE_MODERN) return;
                performanceMetrics.dashboardStartedAt = performance.now();
                const dashboard = buildResultsDashboard(kpi, mainCell);
                acceptedPageState.dashboard = dashboard;
                performanceMetrics.dashboardFinishedAt = performance.now();
                setAcceptedOrdersMode(currentMode);
                publishPerformanceMetrics();
            }));
        };
        acceptedPageState = {
            ...kpi,
            mainCell,
            dashboard: null,
            periodAnchor,
            filterPresentation,
            ordersViewport,
            ensureDashboard,
            softRefresh: softRefreshAcceptedOrders
        };
        installAcceptedSoftRefreshHooks();
        document.documentElement.classList.add("ta-intranet-page-accepted-orders");
        if (currentMode === MODE_MODERN) ensureDashboard();
        return true;
    }

    function findAcceptanceListTable() {
        return Array.from(document.querySelectorAll("table")).find(table => {
            const header = Array.from(table.rows || []).find(row => row.cells?.length === 9);
            if (!header) return false;
            const labels = Array.from(header.cells, cell => foldText(cell.textContent));
            return labels[0] === "lp"
                && labels[1].includes("nr. tury")
                && labels[2].includes("nr. oferty")
                && labels[3].includes("data zaladunku")
                && labels[5].includes("zaladunek")
                && labels[6].includes("dostawa")
                && labels[7].includes("odleglosc")
                && labels[8].includes("spedytor");
        }) || null;
    }

    function findOfferCancellationForm(doc, controlName) {
        return Array.from(doc?.forms || []).find(form =>
            form.elements?.namedItem("id_oferty")
            && form.elements?.namedItem(controlName)
        ) || null;
    }

    function findOfferCancellationResultTable(doc = document) {
        return Array.from(doc?.querySelectorAll?.("table") || []).find(table => {
            const header = Array.from(table.rows || []).find(row => row.cells?.length === 6);
            if (!header) return false;
            const labels = Array.from(header.cells, cell => foldText(cell.textContent));
            return labels[0] === "id oferty"
                && labels[1] === "status oferty"
                && labels[2] === "oferent"
                && labels[3] === "miasto odbiorcy"
                && labels[4] === "wartosc"
                && labels[5] === "czynnosc";
        }) || null;
    }

    function readOfferCancellationResult(doc, offerNumber) {
        const normalizedOfferNumber = String(offerNumber || "").trim();
        const table = findOfferCancellationResultTable(doc);
        if (!table || !/^\d+$/.test(normalizedOfferNumber)) return null;
        const row = Array.from(table.rows || []).find(candidate =>
            String(candidate.querySelector('input[name="id_oferty"]')?.value || "").trim() === normalizedOfferNumber
        ) || null;
        if (!row || row.cells?.length !== 6) return null;
        return {
            row,
            status: foldText(row.cells[1]?.textContent),
            statusText: cleanText(row.cells[1]?.textContent)
        };
    }

    async function verifyOfferCancellation(offerNumber) {
        const verification = await loadOfferCancellationConfirmation(offerNumber);
        const result = readOfferCancellationResult(verification.lookup.doc, offerNumber);
        if (!result) {
            throw new Error("Intranet nie zwrócił wiersza oferty po anulowaniu.");
        }
        if (result.status !== "anulowana") {
            throw new Error(`Intranet nie potwierdził statusu „Anulowana” (aktualny status: ${result.statusText || "brak"}).`);
        }
        return result;
    }

    function addOfferCancellationSubmitProxy(nativeSubmit, label, tone = "primary") {
        if (!nativeSubmit || nativeSubmit.dataset.taOfferCancellationNativeSubmit === "true") return null;
        nativeSubmit.dataset.taOfferCancellationNativeSubmit = "true";
        markNativeSubmitCaption(nativeSubmit);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "ta-offer-cancellation-submit";
        button.dataset.tone = tone;
        button.textContent = label;
        button.addEventListener("click", () => nativeSubmit.click());
        nativeSubmit.insertAdjacentElement("afterend", button);
        return button;
    }

    function mountOfferCancellationPage() {
        if (!mountIntranetShell()) return false;
        const mainCell = document.querySelector('[data-ta-intranet-role="main-content"]');
        if (!mainCell) return false;
        const resultTable = findOfferCancellationResultTable(document);
        const lookupForm = findOfferCancellationForm(document, "co");
        const lookupTable = lookupForm?.querySelector("table") || null;
        const backForm = Array.from(mainCell.querySelectorAll("form")).find(form =>
            form.elements?.namedItem("co")
            && !form.elements?.namedItem("id_oferty")
            && /powrot/.test(foldText(form.querySelector('input[type="image"]')?.title))
        ) || null;
        if (!resultTable && !lookupForm && !backForm) return false;

        const legacyHeading = Array.from(mainCell.querySelectorAll("table")).find(table =>
            table !== resultTable
            && table !== lookupTable
            && foldText(table.textContent).includes("anulowanie ofert")
            && String(table.textContent || "").trim().length < 180
        ) || null;
        setRole(legacyHeading, "offer-cancellation-legacy-heading");

        const header = document.createElement("header");
        header.className = "ta-offer-cancellation-header";
        header.innerHTML = `
            <div class="ta-order-details-mark" aria-hidden="true">C</div>
            <div>
                <span>OFERTA</span>
                <h1>Anulowanie ofert</h1>
                <p>${resultTable ? "Sprawdź ofertę przed wykonaniem anulowania" : "Wyszukaj ofertę po numerze lub kontrahencie"}</p>
            </div>
        `;
        const target = resultTable || lookupForm || backForm;
        mainCell.insertBefore(header, target?.parentNode === mainCell ? target : mainCell.firstChild);

        if (lookupForm) {
            lookupForm.dataset.taOfferCancellationLookup = "true";
            if (lookupTable) lookupTable.dataset.taOfferCancellationCriteria = "true";
            lookupForm.querySelector('select[name="k_id"]')?.setAttribute("data-ta-offer-cancellation-field", "contractor");
            lookupForm.querySelector('input[name="id_oferty"]')?.setAttribute("data-ta-offer-cancellation-field", "offer-number");
            addOfferCancellationSubmitProxy(
                lookupForm.querySelector('input[type="image"]'),
                "Wyszukaj ofertę"
            );
        }

        if (resultTable) {
            resultTable.dataset.taOfferCancellationResults = "true";
            const columns = ["offer-number", "status", "offerer", "destination", "value", "action"];
            Array.from(resultTable.rows || []).forEach((row, rowIndex) => {
                if (row.cells?.length !== columns.length) return;
                row.dataset.taOfferCancellationRow = rowIndex === 0 ? "header" : "offer";
                Array.from(row.cells).forEach((cell, index) => {
                    cell.dataset.taOfferCancellationColumn = columns[index];
                });
                if (rowIndex > 0) {
                    const status = foldText(row.cells[1]?.textContent) || "unknown";
                    row.dataset.taOfferCancellationStatus = status;
                    const cancelButton = addOfferCancellationSubmitProxy(
                        row.querySelector('input[type="image"]'),
                        "Anuluj ofertę",
                        "danger"
                    );
                    if (cancelButton && status === "anulowana") {
                        cancelButton.disabled = true;
                        cancelButton.dataset.tone = "secondary";
                        cancelButton.textContent = "Anulowana";
                    }
                }
            });
        }

        if (backForm) {
            backForm.dataset.taOfferCancellationBack = "true";
            addOfferCancellationSubmitProxy(
                backForm.querySelector('input[type="image"]'),
                "Powrót",
                "secondary"
            );
        }
        document.documentElement.classList.add("ta-intranet-page-offer-cancellation");
        return true;
    }

    function getOfferCancellationControl(form, name) {
        const control = form?.elements?.namedItem(name) || null;
        if (!control || typeof control.value === "undefined") return null;
        return control;
    }

    function resolveOfferCancellationAction(form, responseUrl) {
        return new URL(form.getAttribute("action") || responseUrl, responseUrl).href;
    }

    function detectOfferCancellationCharset(response, bytes) {
        const contentType = response.headers.get("content-type") || "";
        const headerCharset = contentType.match(/charset\s*=\s*["']?([^;\s"']+)/i)?.[1];
        if (headerCharset) return headerCharset;
        const preview = new TextDecoder("windows-1252").decode(bytes.slice(0, 4096));
        return preview.match(/charset\s*=\s*["']?([^\s"'/>;]+)/i)?.[1] || "iso-8859-2";
    }

    function decodeOfferCancellationMessage(responseUrl) {
        const encoded = String(responseUrl || "").match(/[?&]odpowiedz=([^&#]*)/i)?.[1];
        if (!encoded) return "";
        const source = encoded.replace(/\+/g, " ");
        const bytes = [];
        for (let index = 0; index < source.length;) {
            const escaped = source.slice(index).match(/^%([0-9a-f]{2})/i);
            if (escaped) {
                bytes.push(Number.parseInt(escaped[1], 16));
                index += 3;
            } else {
                bytes.push(...new TextEncoder().encode(source[index]));
                index += 1;
            }
        }
        return new TextDecoder("iso-8859-2").decode(new Uint8Array(bytes));
    }

    function showAcceptanceDialog({
        title,
        message,
        tone = "info",
        confirmLabel = "OK",
        cancelLabel = "",
        onConfirm = null
    }) {
        return new Promise(resolve => {
            document.querySelector(".ta-acceptance-dialog-backdrop")?.remove();
            const backdrop = document.createElement("div");
            backdrop.className = "ta-acceptance-dialog-backdrop";
            backdrop.dataset.tone = tone;
            backdrop.innerHTML = `
                <section class="ta-acceptance-dialog" role="dialog" aria-modal="true" aria-labelledby="ta-acceptance-dialog-title">
                    <span class="ta-acceptance-dialog-mark" aria-hidden="true">${tone === "danger" ? "!" : "✓"}</span>
                    <div class="ta-acceptance-dialog-copy">
                        <span class="ta-acceptance-dialog-eyebrow">CEMET SERWIS</span>
                        <h2 id="ta-acceptance-dialog-title"></h2>
                        <p></p>
                    </div>
                    <div class="ta-acceptance-dialog-actions"></div>
                </section>`;
            backdrop.querySelector("h2").textContent = title;
            const initialDescription = backdrop.querySelector("p");
            initialDescription.textContent = message;
            initialDescription.hidden = !String(message || "").trim();
            const actions = backdrop.querySelector(".ta-acceptance-dialog-actions");
            let settled = false;
            const finish = value => {
                if (settled) return;
                settled = true;
                document.removeEventListener("keydown", onKeyDown, true);
                backdrop.remove();
                resolve(value);
            };
            const onKeyDown = event => {
                if (event.key === "Escape" && actions.querySelector(".ta-acceptance-dialog-cancel")) finish(false);
            };
            if (cancelLabel) {
                const cancel = document.createElement("button");
                cancel.type = "button";
                cancel.className = "ta-acceptance-dialog-cancel";
                cancel.textContent = cancelLabel;
                cancel.addEventListener("click", () => finish(false));
                actions.appendChild(cancel);
            }
            const confirm = document.createElement("button");
            confirm.type = "button";
            confirm.className = "ta-acceptance-dialog-confirm";
            confirm.textContent = confirmLabel;
            confirm.addEventListener("click", async () => {
                if (!onConfirm) {
                    finish(true);
                    return;
                }
                const heading = backdrop.querySelector("h2");
                const description = backdrop.querySelector("p");
                const mark = backdrop.querySelector(".ta-acceptance-dialog-mark");
                const cancel = actions.querySelector(".ta-acceptance-dialog-cancel");
                confirm.disabled = true;
                cancel?.remove();
                heading.textContent = "Anulowanie oferty";
                description.textContent = "Trwa anulowanie oferty…";
                confirm.textContent = "Proszę czekać…";
                try {
                    const resultMessage = await onConfirm();
                    backdrop.dataset.tone = "success";
                    mark.textContent = "✓";
                    heading.textContent = "Oferta anulowana";
                    description.textContent = resultMessage;
                    confirm.textContent = "Gotowe";
                    confirm.disabled = false;
                    confirm.onclick = () => finish(true);
                } catch (error) {
                    backdrop.dataset.tone = "danger";
                    mark.textContent = "!";
                    heading.textContent = "Nie udało się anulować oferty";
                    description.textContent = error.message || String(error);
                    confirm.textContent = "Zamknij";
                    confirm.disabled = false;
                    confirm.onclick = () => finish(false);
                }
            }, { once: true });
            actions.appendChild(confirm);
            document.body.appendChild(backdrop);
            document.addEventListener("keydown", onKeyDown, true);
            requestAnimationFrame(() => backdrop.classList.add("is-visible"));
            confirm.focus();
        });
    }

    function formatApprovedOrdersMessage(selectedCount) {
        const count = Math.max(0, Number(selectedCount) || 0);
        if (count === 1) return "Pomyślnie zatwierdzono 1 zlecenie.";
        if (count > 1 && count < 5) return `Pomyślnie zatwierdzono ${count} zlecenia.`;
        if (count >= 5) return `Pomyślnie zatwierdzono ${count} zleceń.`;
        return "Wybrane zlecenia zostały zatwierdzone.";
    }

    function consumePendingNativeDialog() {
        if (currentMode !== MODE_MODERN || !document.body) return false;
        const root = document.documentElement;
        const serialized = root.dataset[PENDING_DIALOG_DATASET_KEY];
        if (!serialized) return false;
        let detail = null;
        try {
            detail = JSON.parse(serialized);
        } catch (_) {
            delete root.dataset[PENDING_DIALOG_DATASET_KEY];
            return false;
        }
        if (detail?.kind === "order-details-save-success") {
            delete root.dataset[PENDING_DIALOG_DATASET_KEY];
            return true;
        }
        if (detail?.kind !== "approval-success") return false;
        delete root.dataset[PENDING_DIALOG_DATASET_KEY];
        try { sessionStorage.removeItem(APPROVAL_SELECTION_KEY); } catch (_) {}
        void showAcceptanceDialog({
            title: "Zlecenia zatwierdzone",
            message: "",
            tone: "success",
            confirmLabel: "Gotowe"
        });
        return true;
    }

    async function fetchOfferCancellationDocument(url, options = {}) {
        const response = await fetch(url, {
            credentials: "same-origin",
            redirect: "follow",
            ...options
        });
        if (!response.ok) {
            throw new Error(`Serwer zwrócił HTTP ${response.status}.`);
        }
        const bytes = new Uint8Array(await response.arrayBuffer());
        const charset = detectOfferCancellationCharset(response, bytes);
        let html;
        try {
            html = new TextDecoder(charset).decode(bytes);
        } catch {
            html = new TextDecoder("iso-8859-2").decode(bytes);
        }
        return {
            doc: new DOMParser().parseFromString(html, "text/html"),
            responseUrl: response.url || url
        };
    }

    async function loadOfferCancellationConfirmation(offerNumber) {
        const cancellationUrl = new URL(OFFER_CANCELLATION_PATH, location.origin).href;
        const initial = await fetchOfferCancellationDocument(cancellationUrl);
        const lookupForm = findOfferCancellationForm(initial.doc, "co");
        if (!lookupForm) throw new Error("Nie znaleziono formularza wyszukiwania oferty.");
        const lookupData = new FormData(lookupForm);
        lookupData.set("id_oferty", offerNumber);
        const lookup = await fetchOfferCancellationDocument(
            resolveOfferCancellationAction(lookupForm, initial.responseUrl),
            { method: "POST", body: lookupData }
        );
        return { lookup, confirmForm: findOfferCancellationForm(lookup.doc, "anuluj") };
    }

    async function cancelOfferThroughNativeFlow(offerNumber, button) {
        const normalizedOfferNumber = String(offerNumber || "").trim();
        if (!/^\d+$/.test(normalizedOfferNumber)) {
            throw new Error("Nie rozpoznano numeru oferty w tym wierszu.");
        }

        button.disabled = true;
        button.dataset.taCancellationState = "busy";
        button.textContent = "Sprawdzam…";
        try {
            const { lookup, confirmForm } = await loadOfferCancellationConfirmation(normalizedOfferNumber);
            if (!confirmForm) {
                throw new Error(`Oferta ${normalizedOfferNumber} nie została odnaleziona w module anulowania.`);
            }
            const nativeOfferNumber = String(
                getOfferCancellationControl(confirmForm, "id_oferty")?.value || ""
            ).trim();
            if (nativeOfferNumber !== normalizedOfferNumber) {
                throw new Error("Numer oferty zwrócony przez intranet nie zgadza się z wybranym wierszem.");
            }

            const completed = await showAcceptanceDialog({
                title: "Anulowanie oferty",
                message: `Czy na pewno anulować ofertę ${normalizedOfferNumber}?`,
                tone: "danger",
                confirmLabel: "Anuluj ofertę",
                cancelLabel: "Wróć",
                onConfirm: async () => {
                    button.textContent = "Anuluję…";
                    const cancellationData = new FormData(confirmForm);
                    const result = await fetchOfferCancellationDocument(
                        resolveOfferCancellationAction(confirmForm, lookup.responseUrl),
                        { method: "POST", body: cancellationData }
                    );
                    button.textContent = "Weryfikuję…";
                    await verifyOfferCancellation(normalizedOfferNumber);
                    return decodeOfferCancellationMessage(result.responseUrl)
                        || `Oferta ${normalizedOfferNumber} została anulowana.`;
                }
            });
            if (completed) location.reload();
        } finally {
            button.disabled = false;
            delete button.dataset.taCancellationState;
            button.textContent = "Anuluj";
        }
    }

    function addAcceptanceCancellationAction(row) {
        const offerCell = row.querySelector('[data-ta-acceptance-column="offer-number"]');
        const forwarderCell = row.querySelector('[data-ta-acceptance-column="forwarder"]');
        const offerLink = offerCell?.querySelector('a[href*="zlec_akcept2a.php"]') || null;
        const offerNumber = String(offerLink?.textContent || "").trim();
        if (!offerCell || !forwarderCell || !offerLink || !/^\d+$/.test(offerNumber) || forwarderCell.querySelector(".ta-acceptance-cancel-offer")) {
            return null;
        }

        const actions = document.createElement("span");
        actions.className = "ta-acceptance-forwarder-actions";
        const forwarderName = document.createElement("span");
        forwarderName.className = "ta-acceptance-forwarder-name";
        while (forwarderCell.firstChild) forwarderName.appendChild(forwarderCell.firstChild);
        actions.appendChild(forwarderName);
        forwarderCell.appendChild(actions);

        const button = document.createElement("button");
        button.type = "button";
        button.className = "ta-acceptance-cancel-offer";
        button.textContent = "Anuluj";
        button.title = `Anuluj ofertę ${offerNumber}`;
        button.addEventListener("click", () => {
            if (offerCancellationInFlight) return;
            const cancellationButtons = Array.from(document.querySelectorAll(".ta-acceptance-cancel-offer"));
            cancellationButtons.forEach(candidate => {
                candidate.disabled = true;
                candidate.dataset.taCancellationLock = "true";
            });
            const operation = cancelOfferThroughNativeFlow(offerNumber, button);
            offerCancellationInFlight = operation;
            operation
                .catch(async error => {
                    console.error(`[Trans Assistant Intranet Modern UI ${SCRIPT_VERSION}] Anulowanie oferty nie powiodło się.`, error);
                    await showAcceptanceDialog({
                        title: "Nie udało się anulować oferty",
                        message: `Oferta ${offerNumber}: ${error.message || error}`,
                        tone: "danger",
                        confirmLabel: "Zamknij"
                    });
                })
                .finally(() => {
                    if (offerCancellationInFlight !== operation) return;
                    offerCancellationInFlight = null;
                    cancellationButtons.forEach(candidate => {
                        candidate.disabled = false;
                        delete candidate.dataset.taCancellationLock;
                    });
                });
        });
        actions.appendChild(button);
        return button;
    }

    function markAcceptanceListTable(table) {
        const columns = [
            "position",
            "round-number",
            "offer-number",
            "loading-date",
            "offerer",
            "loading-place",
            "delivery-place",
            "distance",
            "forwarder"
        ];
        setRole(table, "acceptance-table");
        const rows = Array.from(table.rows || []);
        const headerRow = rows.find(row => row.cells?.length === columns.length) || null;
        headerRow?.setAttribute("data-ta-acceptance-row", "header");
        Array.from(headerRow?.cells || []).forEach((cell, index) => {
            cell.dataset.taAcceptanceColumn = columns[index];
        });
        rows.filter(row => row !== headerRow && row.cells?.length === columns.length).forEach(row => {
            row.dataset.taAcceptanceRow = "offer";
            Array.from(row.cells).forEach((cell, index) => {
                cell.dataset.taAcceptanceColumn = columns[index];
            });
            row.querySelectorAll('a[href*="zlec_akcept2a.php"]').forEach(link => {
                link.dataset.taAcceptanceAction = "create-order";
                link.setAttribute("title", "Otwórz i utwórz zlecenie");
            });
            row.querySelectorAll('a[href*="miejsce_info.php"]').forEach(link => {
                link.dataset.taAcceptanceAction = "place-details";
            });
            addAcceptanceCancellationAction(row);
        });
        return rows.length - (headerRow ? 1 : 0);
    }

    function setAcceptanceListMode(mode) {
        if (!acceptancePageState) return;
        if (mode === MODE_MODERN) acceptancePageState.viewport?.activate();
        else acceptancePageState.viewport?.deactivate();
    }

    function mountAcceptanceListPage() {
        const bodyTables = getDirectBodyTables();
        markTopHeader(bodyTables[0]);
        setRole(bodyTables[1], "breadcrumb");
        const shell = setRole(bodyTables[2], "page-shell");
        const mainCell = markSideNavigation(shell);
        const table = findAcceptanceListTable();
        if (!mainCell || !table) return false;

        const mainTables = Array.from(mainCell.querySelectorAll("table"));
        const heading = mainTables.find(candidate => {
            const text = foldText(candidate.textContent);
            return candidate !== table && text.includes("wybor do akceptacji zlecenia");
        }) || null;
        const toolbar = mainTables.find(candidate =>
            candidate !== table
            && candidate.querySelector("select")
            && foldText(candidate.textContent).includes("spedytor")
        ) || null;
        setRole(heading, "acceptance-heading");
        setRole(toolbar, "acceptance-toolbar");
        toolbar?.querySelectorAll("select").forEach(select => setRole(select, "acceptance-forwarder-filter"));

        markAcceptanceListTable(table);
        const viewport = createOrdersViewport(table);
        acceptancePageState = { table, viewport, heading, toolbar };
        document.documentElement.classList.add("ta-intranet-page-acceptance-list");
        return true;
    }

    function findOrderSearchCriteriaTable() {
        const status = document.querySelector('select[name="status_zlecenia"]');
        const table = status?.closest("table") || null;
        return table?.querySelector('[name="m_zaladunku"], [name="id_zlecenia"], [name="nr_obcy"]')
            ? table
            : null;
    }

    function findOrderSearchResultsTable() {
        const table = document.querySelector("table#tabela_zlecenia");
        const header = Array.from(table?.rows || []).find(row => {
            const cells = Array.from(row.cells || []);
            return cells.length === SEARCH_RESULT_COLUMNS.length
                && cells.every(cell => cell.classList.contains("szukaj"));
        });
        return header ? table : null;
    }

    function markOrderSearchCriteria(table, mainCell) {
        if (!table) return null;
        table.dataset.taOrderSearchCriteria = "true";
        const rows = Array.from(table.rows || []).filter(row => row.closest("table") === table);
        rows.forEach(row => {
            const cells = Array.from(row.cells || []);
            if (cells.length < 2) return;
            row.dataset.taOrderSearchRow = "true";
            cells[0].dataset.taOrderSearchRole = "label";
            cells[1].dataset.taOrderSearchRole = "control";
            const control = row.querySelector("input[name], select[name], textarea[name]");
            const fieldName = String(control?.name || control?.id || "").replace(/\[\]$/, "");
            if (fieldName) row.dataset.taOrderSearchField = fieldName;
            if (["k_id", "przewoznik", "data_od", "id_p"].includes(fieldName)) {
                row.dataset.taOrderSearchWide = "true";
            }
            if (fieldName === "data_od") {
                const dateFrom = row.querySelector('input[name="data_od"]');
                const dateTo = row.querySelector('input[name="data_do"]');
                const enhancedFrom = enhanceReportDateInput(dateFrom, "order-search-from");
                const enhancedTo = enhanceReportDateInput(dateTo, "order-search-to");
                if (enhancedFrom && enhancedTo) {
                    cells[1].dataset.taOrderSearchDateRange = "true";
                    enhancedFrom.control.classList.add("ta-order-search-date-control");
                    enhancedTo.control.classList.add("ta-order-search-date-control");
                    enhancedFrom.picker.setAttribute("aria-label", "Data załadunku od");
                    enhancedTo.picker.setAttribute("aria-label", "Data załadunku do");
                }
            }
            const suggestions = cells[1].querySelector("#results, #results3, [id^='results']");
            if (suggestions && ["k_id", "przewoznik", "id_p"].includes(fieldName)) {
                row.dataset.taOrderSearchLookup = "true";
                suggestions.dataset.taOrderSearchSuggestions = "true";
                const lookupAction = Array.from(cells[1].querySelectorAll('input[type="submit"], button')).find(candidate => (
                    /wybierz/i.test(String(candidate.value || candidate.textContent || "").trim())
                ));
                if (lookupAction) lookupAction.dataset.taOrderSearchLookupAction = "true";
            }
        });

        const nativeSubmit = Array.from(mainCell?.querySelectorAll('input[type="image"]') || []).find(input => {
            const context = foldText(input.parentElement?.textContent);
            return context.includes("dalej") && !/powrot/.test(foldText(input.title));
        }) || null;
        if (!nativeSubmit || mainCell.querySelector(".ta-order-search-submit")) return nativeSubmit;
        nativeSubmit.dataset.taOrderSearchNativeSubmit = "true";
        markNativeSubmitCaption(nativeSubmit);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "ta-order-search-submit";
        button.textContent = "Wyszukaj zlecenia";
        button.addEventListener("click", () => nativeSubmit.click());
        nativeSubmit.insertAdjacentElement("afterend", button);
        return nativeSubmit;
    }

    function markOrderSearchResults(table) {
        if (!table) return 0;
        table.dataset.taOrderSearchResults = "true";
        const rows = Array.from(table.rows || []);
        const headerIndex = rows.findIndex(row => row.cells?.length === SEARCH_RESULT_COLUMNS.length);
        if (headerIndex < 0) return 0;
        rows[headerIndex].dataset.taOrderSearchResultRow = "header";
        rows.forEach((row, rowIndex) => {
            const cells = Array.from(row.cells || []);
            if (cells.length !== SEARCH_RESULT_COLUMNS.length) return;
            cells.forEach((cell, index) => {
                cell.dataset.taOrderSearchColumn = SEARCH_RESULT_COLUMNS[index];
            });
            if (rowIndex <= headerIndex) return;
            row.dataset.taOrderSearchResultRow = "order";
            row.dataset.taOrderSearchStripe = String((rowIndex - headerIndex) % 2);
            addOrderPdfAction(row);
        });
        table.querySelectorAll("a[href]").forEach(link => {
            const action = classifyOrderAction(link);
            if (!action) return;
            link.dataset.taIntranetAction = action;
            if (action === "attachment") markAttachmentPresentation(link);
            if (action === "invoice-print") {
                link.setAttribute("title", "Drukuj fakturę");
                link.setAttribute("aria-label", "Drukuj fakturę");
            }
        });
        table.querySelectorAll('input[type="text"]').forEach(input => {
            input.dataset.taIntranetField = input.name === "nr_obcy" ? "external-number" : "text";
        });
        table.querySelectorAll('input[type="submit"]').forEach(input => {
            input.dataset.taIntranetAction = "save-inline";
        });
        return Math.max(0, rows.length - headerIndex - 1);
    }

    function setOrderSearchMode(mode) {
        if (!orderSearchPageState) return;
        if (mode === MODE_MODERN) orderSearchPageState.viewport?.activate();
        else orderSearchPageState.viewport?.deactivate();
    }

    function mountOrderSearchPage() {
        if (!mountIntranetShell()) return false;
        const mainCell = document.querySelector('[data-ta-intranet-role="main-content"]');
        const criteriaTable = findOrderSearchCriteriaTable();
        const resultsTable = findOrderSearchResultsTable();
        if (!mainCell || (!criteriaTable && !resultsTable)) return false;
        const legacyHeading = Array.from(mainCell.querySelectorAll("table")).find(table =>
            table !== criteriaTable
            && table !== resultsTable
            && foldText(table.textContent).includes("wyszukiwanie zlecenia")
            && String(table.textContent || "").trim().length < 160
        ) || null;
        setRole(legacyHeading, "order-search-legacy-heading");

        const resultCount = markOrderSearchResults(resultsTable);
        markOrderSearchCriteria(criteriaTable, mainCell);
        const exportLink = Array.from(mainCell.querySelectorAll('a[href$=".csv"], a[href*=".csv?"]'))[0] || null;
        setRole(exportLink, "order-search-export");
        exportLink?.setAttribute("title", "Eksportuj wyniki do CSV");
        const header = document.createElement("header");
        header.className = "ta-order-search-header";
        header.innerHTML = `
            <span>CEMET SERWIS</span>
            <h1>${resultsTable ? "Wyniki wyszukiwania" : "Wyszukiwanie zleceń"}</h1>
            <p>${resultsTable ? `Znalezionych pozycji: ${resultCount}` : "Wybierz kryteria, aby zawęzić listę zleceń"}</p>`;
        const target = criteriaTable || resultsTable;
        target.parentNode?.insertBefore(header, target);
        const viewport = resultsTable ? createOrdersViewport(resultsTable) : null;
        orderSearchPageState = { mainCell, criteriaTable, resultsTable, legacyHeading, header, viewport };
        document.documentElement.classList.add("ta-intranet-page-order-search");
        return true;
    }

    function getOrderWorkflowConfig() {
        const pathname = normalizePathname();
        if (/\/zlecenie\/zatwierdzanie\.php$/i.test(pathname)) {
            return {
                id: "approval",
                eyebrow: "REALIZACJA ZLECEŃ",
                title: "Zatwierdzanie zleceń",
                description: "Wybierz kryteria lub zaznacz zlecenia do zatwierdzenia",
                submitLabel: "Pokaż zlecenia"
            };
        }
        if (/\/zlecenie\/dodanie_kierowcy\.php$/i.test(pathname)) {
            return {
                id: "driver-assignment",
                eyebrow: "OBSADA TRANSPORTU",
                title: "Dodanie kierowcy",
                description: "Wybierz zlecenie, do którego chcesz przypisać kierowcę",
                submitLabel: "Wybierz zlecenie"
            };
        }
        return {
            id: "cancellation",
            eyebrow: "OBSŁUGA ZLECEŃ",
            title: "Anulowanie zlecenia",
            description: "Wyszukaj zlecenie i wybierz dostępną czynność",
            submitLabel: "Wyszukaj zlecenia"
        };
    }

    function getDirectTableRows(table) {
        return Array.from(table?.rows || []).filter(row => row.closest("table") === table);
    }

    function markOrderWorkflowFormTable(table) {
        if (!table || table.dataset.taOrderWorkflowForm === "true") return false;
        const rows = getDirectTableRows(table);
        if (!rows.length) return false;
        table.dataset.taOrderWorkflowForm = "true";
        const visibleControls = Array.from(table.querySelectorAll(
            'input:not([type="hidden"]), select, textarea, button'
        ));
        const isActionOnly = rows.length === 1
            && visibleControls.length > 0
            && visibleControls.every(control => /^(?:image|submit|button)$/i.test(control.type || control.tagName));
        table.dataset.taOrderWorkflowFormKind = isActionOnly ? "actions" : "fields";
        setRole(table, "order-workflow-form");
        rows.forEach(row => {
            const cells = Array.from(row.cells || []);
            if (!cells.length) return;
            row.dataset.taOrderWorkflowRow = "true";
            if (cells[0]) cells[0].dataset.taOrderWorkflowRole = "label";
            if (cells[1]) cells[1].dataset.taOrderWorkflowRole = "control";
        });
        return true;
    }

    function markOrderWorkflowResults(table) {
        if (!table) return 0;
        const rows = getDirectTableRows(table);
        const header = rows.reduce((best, row) =>
            (row.cells?.length || 0) > (best?.cells?.length || 0) ? row : best
        , null);
        const columnCount = header?.cells?.length || 0;
        if (rows.length < 2 || columnCount < 6) return 0;
        table.dataset.taOrderWorkflowResults = "true";
        setRole(table, "order-workflow-results");
        rows.forEach((row, rowIndex) => {
            if (row.cells?.length !== columnCount) return;
            row.dataset.taOrderWorkflowResultRow = row === header ? "header" : "item";
            if (row !== header) row.dataset.taOrderWorkflowStripe = String(rowIndex % 2);
            Array.from(row.cells).forEach((cell, columnIndex) => {
                cell.dataset.taOrderWorkflowColumn = String(columnIndex);
            });
        });
        return rows.filter(row => row !== header && row.cells?.length === columnCount).length;
    }

    function markNativeSubmitCaption(nativeSubmit) {
        if (!nativeSubmit) return null;
        const expected = foldText(nativeSubmit.title || nativeSubmit.alt || nativeSubmit.value || "");
        let sibling = nativeSubmit.nextElementSibling;
        while (sibling && /^(?:BR|WBR)$/i.test(sibling.tagName)) sibling = sibling.nextElementSibling;
        if (!sibling || !/^(?:B|STRONG|SPAN)$/i.test(sibling.tagName)) return null;
        const caption = foldText(sibling.textContent);
        if (!caption || (expected && caption !== expected)) return null;
        if (!/^(?:dalej|zapisz|zatwierdz|powrot)$/.test(caption)) return null;
        sibling.dataset.taNativeSubmitCaption = "true";
        return sibling;
    }

    function getOrderWorkflowSubmitPresentation(nativeSubmit, fallbackLabel) {
        const source = foldText([
            nativeSubmit?.alt,
            nativeSubmit?.title,
            nativeSubmit?.value,
            nativeSubmit?.name,
            nativeSubmit?.src,
            nativeSubmit?.parentElement?.textContent
        ].filter(Boolean).join(" "));
        if (source.includes("powrot")) return { label: "Powrót", tone: "secondary" };
        if (source.includes("zatwierdz")) return { label: "Zatwierdź", tone: "primary" };
        if (source.includes("zapis")) return { label: "Zapisz", tone: "primary" };
        if (source.includes("dalej")) return { label: fallbackLabel, tone: "primary" };
        return { label: fallbackLabel, tone: "primary" };
    }

    function submitApprovalWithoutNativeModal(approvalForm, selectedCount, proxyButton) {
        if (approvalSubmissionInFlight) return;
        if (typeof approvalForm.reportValidity === "function" && !approvalForm.reportValidity()) return;
        approvalSubmissionInFlight = true;
        if (proxyButton) {
            proxyButton.disabled = true;
            proxyButton.textContent = "Zatwierdzam…";
        }

        const frame = document.createElement("iframe");
        const frameName = `ta-approval-response-${Date.now()}`;
        frame.name = frameName;
        frame.hidden = true;
        frame.setAttribute("sandbox", "allow-forms allow-scripts allow-same-origin");
        frame.setAttribute("aria-hidden", "true");
        let awaitingResponse = false;
        let timeoutId = 0;

        const cleanup = () => {
            window.clearTimeout(timeoutId);
            frame.remove();
            approvalSubmissionInFlight = false;
            if (proxyButton) {
                proxyButton.disabled = false;
                proxyButton.textContent = "Zatwierdź";
            }
        };

        const showResult = async () => {
            let responseSource = "";
            try {
                responseSource = frame.contentDocument?.documentElement?.innerHTML || "";
            } catch (_) {}
            const confirmed = /\b(?:window\s*\.\s*)?alert\s*\(\s*(["'])zatwierdzone[.!]?\1\s*\)/i.test(responseSource);
            if (!confirmed) {
                await showAcceptanceDialog({
                    title: "Brak potwierdzenia zatwierdzenia",
                    message: "Intranet nie zwrócił komunikatu potwierdzającego. Lista zostanie odświeżona bez ponownego wysyłania formularza.",
                    tone: "danger",
                    confirmLabel: "Odśwież listę"
                });
                cleanup();
                location.reload();
                return;
            }
            await showAcceptanceDialog({
                title: "Zlecenia zatwierdzone",
                message: "",
                tone: "success",
                confirmLabel: "Gotowe"
            });
            cleanup();
            location.reload();
        };

        frame.addEventListener("load", () => {
            if (!awaitingResponse) {
                awaitingResponse = true;
                const hadTarget = approvalForm.hasAttribute("target");
                const originalTarget = approvalForm.getAttribute("target");
                approvalForm.setAttribute("target", frameName);
                try {
                    if (typeof approvalForm.requestSubmit === "function") approvalForm.requestSubmit();
                    else HTMLFormElement.prototype.submit.call(approvalForm);
                } finally {
                    if (hadTarget) approvalForm.setAttribute("target", originalTarget || "");
                    else approvalForm.removeAttribute("target");
                }
                timeoutId = window.setTimeout(async () => {
                    await showAcceptanceDialog({
                        title: "Brak odpowiedzi intranetu",
                        message: "Nie otrzymano odpowiedzi na zatwierdzenie. Lista zostanie odświeżona bez ponownego wysyłania formularza.",
                        tone: "danger",
                        confirmLabel: "Odśwież listę"
                    });
                    cleanup();
                    location.reload();
                }, 20000);
                return;
            }
            window.clearTimeout(timeoutId);
            void showResult();
        });
        frame.src = "about:blank";
        document.body.appendChild(frame);
    }

    function triggerOrderWorkflowNativeAction(nativeSubmit, presentation, proxyButton) {
        const isApprovalSubmit = presentation?.label === "Zatwierdź"
            && /\/zlecenie\/zatwierdzanie\.php$/i.test(normalizePathname(location.pathname));
        if (isApprovalSubmit) {
            const approvalForm = document.forms.namedItem("mojForm")
                || document.querySelector('form:has(input[name="dok_id[]"])');
            if (approvalForm) {
                if (currentMode === MODE_MODERN) {
                    const selectedCount = approvalForm.querySelectorAll('input[name="dok_id[]"]:checked').length;
                    try { sessionStorage.setItem(APPROVAL_SELECTION_KEY, String(selectedCount)); } catch (_) {}
                    submitApprovalWithoutNativeModal(approvalForm, selectedCount, proxyButton);
                    return;
                }
                if (typeof approvalForm.requestSubmit === "function") {
                    approvalForm.requestSubmit();
                } else {
                    HTMLFormElement.prototype.submit.call(approvalForm);
                }
                return;
            }
        }
        nativeSubmit.click();
    }

    function addOrderWorkflowSubmitProxy(nativeSubmit, fallbackLabel) {
        if (!nativeSubmit || nativeSubmit.dataset.taOrderWorkflowNativeSubmit === "true") return null;
        if (nativeSubmit.closest('[data-ta-order-workflow-results="true"]')) return null;
        nativeSubmit.dataset.taOrderWorkflowNativeSubmit = "true";
        markNativeSubmitCaption(nativeSubmit);
        const presentation = getOrderWorkflowSubmitPresentation(nativeSubmit, fallbackLabel);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "ta-order-workflow-submit";
        button.dataset.tone = presentation.tone;
        button.textContent = presentation.label;
        button.addEventListener("click", () => triggerOrderWorkflowNativeAction(nativeSubmit, presentation, button));
        nativeSubmit.insertAdjacentElement("afterend", button);
        return button;
    }

    function mountOrderWorkflowActionToolbar(mainCell, formTables) {
        const actionTables = formTables.filter(table => table.dataset.taOrderWorkflowFormKind === "actions");
        const controls = [];
        actionTables.forEach(table => {
            table.querySelectorAll('[data-ta-order-workflow-action], .ta-order-workflow-submit').forEach(control => {
                if (!controls.includes(control)) controls.push(control);
            });
        });
        if (controls.length < 2) return null;

        const toolbar = document.createElement("div");
        toolbar.className = "ta-order-workflow-action-toolbar";
        controls.forEach(control => {
            let toolbarButton = control;
            if (!control.classList.contains("ta-order-workflow-submit")) {
                toolbarButton = document.createElement("button");
                toolbarButton.type = "button";
                toolbarButton.className = "ta-order-workflow-toolbar-action";
                toolbarButton.dataset.action = control.dataset.taOrderWorkflowAction || "secondary";
                toolbarButton.textContent = String(control.value || control.textContent || "").trim();
                toolbarButton.addEventListener("click", () => control.click());
            }
            toolbar.appendChild(toolbarButton);
        });
        actionTables.forEach(table => {
            table.dataset.taOrderWorkflowActionSource = "true";
        });
        const insertionTarget = actionTables[0];
        insertionTarget?.parentNode?.insertBefore(toolbar, insertionTarget);
        return toolbar;
    }

    function mountOrderWorkflowPage() {
        if (!mountIntranetShell()) return false;
        const mainCell = document.querySelector('[data-ta-intranet-role="main-content"]');
        if (!mainCell) return false;
        const config = getOrderWorkflowConfig();
        document.documentElement.dataset.taOrderWorkflow = config.id;

        const tables = Array.from(mainCell.querySelectorAll("table"));
        const resultTables = tables.filter(table => markOrderWorkflowResults(table) > 0);
        const formTables = tables.filter(table => {
            if (resultTables.includes(table)) return false;
            const rows = getDirectTableRows(table);
            const maxCells = Math.max(0, ...rows.map(row => row.cells?.length || 0));
            return maxCells <= 2
                && Boolean(table.querySelector('input:not([type="hidden"]), select, textarea'))
                && markOrderWorkflowFormTable(table);
        });

        const legacyHeading = tables.find(table =>
            table.classList.contains("szukajwynik")
            || (getDirectTableRows(table).length === 1
                && /(?:wyszukiwanie|zatwierdzanie|dodanie kierowcy|anulowanie)/.test(foldText(table.textContent)))
        ) || null;
        setRole(legacyHeading, "order-workflow-legacy-heading");

        const header = document.createElement("header");
        header.className = "ta-order-workflow-header";
        const resultCount = resultTables.reduce((sum, table) =>
            sum + getDirectTableRows(table).filter(row => row.dataset.taOrderWorkflowResultRow === "item").length
        , 0);
        header.innerHTML = `
            <span>${config.eyebrow}</span>
            <h1>${config.title}</h1>
            <p>${resultCount ? `Widocznych pozycji: ${resultCount}` : config.description}</p>
        `;
        const insertionTarget = legacyHeading || [...formTables, ...resultTables].sort((left, right) => {
            if (left === right) return 0;
            return left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
        })[0];
        insertionTarget?.parentNode?.insertBefore(header, insertionTarget);

        formTables.forEach(table => {
            table.querySelectorAll('input[type="image"]').forEach(input =>
                addOrderWorkflowSubmitProxy(input, config.submitLabel)
            );
        });
        mainCell.querySelectorAll('input[type="button"]').forEach(button => {
            const value = foldText(button.value);
            if (value.includes("zaznacz") || value.includes("odznacz")) {
                button.dataset.taOrderWorkflowAction = value.includes("odznacz") ? "clear-selection" : "select-all";
            }
        });
        const actionToolbar = mountOrderWorkflowActionToolbar(mainCell, formTables);

        const viewports = resultTables.map(createOrdersViewport).filter(Boolean);
        orderWorkflowPageState = { mainCell, config, header, legacyHeading, formTables, resultTables, viewports, actionToolbar };
        document.documentElement.classList.add("ta-intranet-page-order-workflow");
        return true;
    }

    function setOrderWorkflowMode(mode) {
        if (!orderWorkflowPageState) return;
        orderWorkflowPageState.viewports.forEach(viewport => {
            if (mode === MODE_MODERN) viewport.activate();
            else viewport.deactivate();
        });
    }

    function mountDriverAssignmentPopup() {
        if (!document.body) return false;
        const form = Array.from(document.forms || []).find(candidate =>
            candidate.elements?.namedItem("kierowca")
            && candidate.elements?.namedItem("i_sam")
        ) || null;
        const driverSelect = form?.elements?.namedItem("kierowca") || null;
        const vehicleSelect = form?.elements?.namedItem("i_sam") || null;
        const controlsTable = driverSelect?.closest("table") || vehicleSelect?.closest("table") || null;
        if (!form || !controlsTable) return false;

        const rows = getDirectTableRows(controlsTable);
        rows.forEach(row => {
            row.dataset.taDriverAssignmentRow = "true";
            const cells = Array.from(row.cells || []);
            if (cells[0]) cells[0].dataset.taDriverAssignmentRole = "label";
            if (cells[1]) cells[1].dataset.taDriverAssignmentRole = "control";
        });
        controlsTable.dataset.taDriverAssignmentForm = "true";
        setRole(controlsTable, "driver-assignment-form");

        const header = document.createElement("header");
        header.className = "ta-driver-assignment-header";
        header.innerHTML = `
            <span>CEMET SERWIS</span>
            <h1>Przypisanie kierowcy i pojazdu</h1>
            <p>Wybierz obsadę transportu i godzinę załadunku</p>
        `;
        controlsTable.parentNode?.insertBefore(header, controlsTable);

        const searches = [
            enhanceNativeSelectSearch(driverSelect.closest("tr"), "driver"),
            enhanceNativeSelectSearch(vehicleSelect.closest("tr"), "vehicle")
        ].filter(Boolean);

        const nativeSubmit = Array.from(form.querySelectorAll('input[type="image"], input[type="submit"], button[type="submit"]'))[0] || null;
        let submitProxy = null;
        if (nativeSubmit) {
            nativeSubmit.dataset.taDriverAssignmentNativeSubmit = "true";
            markNativeSubmitCaption(nativeSubmit);
            setRole(nativeSubmit.closest("table"), "driver-assignment-actions");
            submitProxy = document.createElement("button");
            submitProxy.type = "button";
            submitProxy.className = "ta-driver-assignment-submit";
            submitProxy.textContent = "Zapisz";
            submitProxy.addEventListener("click", () => nativeSubmit.click());
            nativeSubmit.insertAdjacentElement("afterend", submitProxy);
        }

        Array.from(document.body.children || [])
            .filter(element => element.tagName === "TABLE" && /zamknij/.test(foldText(element.textContent)))
            .forEach(element => setRole(element, "driver-assignment-close"));
        const legacyHeading = Array.from(document.querySelectorAll("table")).find(table =>
            table !== controlsTable && /wybor kierowcy do zlecenia/.test(foldText(table.textContent))
        ) || null;
        setRole(legacyHeading, "driver-assignment-legacy-heading");
        driverAssignmentPopupState = { form, controlsTable, header, searches, nativeSubmit, submitProxy, legacyHeading };
        document.documentElement.classList.add("ta-intranet-page-driver-assignment-popup");
        centerOrderDetailsPopup();
        return true;
    }

    function mountOrderCancelPopup() {
        if (!document.body) return false;
        const form = Array.from(document.forms || []).find(candidate =>
            candidate.elements?.namedItem("id_z")
            && candidate.elements?.namedItem("powod")
        ) || null;
        const reason = form?.elements?.namedItem("powod") || null;
        const table = reason?.closest("table") || null;
        if (!form || !reason || !table) return false;

        setRole(form, "order-cancel-form");
        setRole(table, "order-cancel-table");
        const rows = getDirectTableRows(table);
        rows.forEach((row, index) => {
            row.dataset.taOrderCancelRow = index === 0 ? "order" : index === 1 ? "reason" : "action";
            const cells = Array.from(row.cells || []);
            if (cells[0]) cells[0].dataset.taOrderCancelRole = index === 2 ? "action" : "label";
            if (cells[1]) cells[1].dataset.taOrderCancelRole = "control";
        });

        const orderNumber = String(rows[0]?.cells?.[1]?.textContent || "").trim();
        const header = document.createElement("header");
        header.className = "ta-order-cancel-header";
        header.innerHTML = `
            <div class="ta-order-cancel-mark" aria-hidden="true">!</div>
            <div>
                <span>CEMET SERWIS</span>
                <h1>Anulowanie zlecenia</h1>
                <p>${orderNumber ? `Zlecenie ${escapeHtml(orderNumber)}` : "Podaj powód anulowania"}</p>
            </div>
        `;
        form.parentNode?.insertBefore(header, form);

        const submit = form.querySelector('input[type="submit"], button[type="submit"]');
        if (submit) submit.dataset.taOrderCancelAction = "cancel";
        const closeTable = Array.from(document.body.children || []).find(element =>
            element.tagName === "TABLE" && /zamknij/.test(foldText(element.textContent))
        ) || null;
        if (closeTable) setRole(closeTable, "order-cancel-close");
        document.documentElement.classList.add("ta-intranet-page-order-cancel-popup");
        return true;
    }

    function mountOrderAttachmentPopup() {
        if (!document.body) return false;
        const fileInput = document.querySelector('input[type="file"]');
        if (!fileInput) return false;

        const uploadForm = fileInput.closest("form");
        if (uploadForm) uploadForm.dataset.taOrderAttachmentUpload = "true";
        fileInput.dataset.taOrderAttachmentFile = "true";
        const uploadSubmit = uploadForm
            ? Array.from(uploadForm.querySelectorAll('input[type="submit"], button[type="submit"], input[type="button"], button'))
                .find(control => /wprowadz.*zalacznik/.test(foldText(control.value || control.textContent)))
                || uploadForm.querySelector('input[type="submit"], button[type="submit"]')
            : null;
        if (uploadSubmit) {
            uploadSubmit.dataset.taOrderAttachmentSubmit = "true";
            if (/^(?:button|reset)$/i.test(String(uploadSubmit.type || ""))) {
                uploadSubmit.removeAttribute("onclick");
                uploadSubmit.onclick = null;
                uploadSubmit.type = "submit";
            }
        }

        const deleteControls = Array.from(document.querySelectorAll('input[type="submit"], input[type="button"], button'))
            .filter(control => /usun/.test(foldText(control.value || control.textContent)));
        const attachmentRows = [];
        deleteControls.forEach(control => {
            control.dataset.taOrderAttachmentDelete = "true";
            const row = control.closest("tr");
            if (!row || attachmentRows.includes(row)) return;
            attachmentRows.push(row);
            row.dataset.taOrderAttachmentRow = "true";
            const cells = Array.from(row.cells || []);
            const actionCell = control.closest("td");
            if (actionCell) actionCell.dataset.taOrderAttachmentRole = "actions";
            let previewCell = cells.find(cell => cell !== actionCell && cell.querySelector("a, img, input[type='image']")) || null;
            if (previewCell) {
                const previewLink = previewCell.querySelector("a[href]");
                if (previewLink) {
                    previewLink.dataset.taOrderAttachmentPreview = "true";
                    previewLink.title ||= "Otwórz załącznik";
                }
                const previewNode = previewLink || previewCell.querySelector("img, input[type='image']");
                if (previewNode && String(previewCell.textContent || "").trim()) {
                    const standalonePreviewCell = document.createElement("td");
                    standalonePreviewCell.dataset.taOrderAttachmentRole = "preview";
                    standalonePreviewCell.appendChild(previewNode);
                    row.insertBefore(standalonePreviewCell, actionCell || null);
                    previewCell = standalonePreviewCell;
                } else {
                    previewCell.dataset.taOrderAttachmentRole = "preview";
                }
            }
            const normalizedCells = Array.from(row.cells || []);
            const nameCell = normalizedCells.find(cell =>
                cell !== actionCell
                && cell !== previewCell
                && String(cell.textContent || "").trim()
            ) || normalizedCells.find(cell => cell !== actionCell && cell !== previewCell) || null;
            if (nameCell) nameCell.dataset.taOrderAttachmentRole = "name";
            normalizedCells.forEach(cell => {
                if (!cell.dataset.taOrderAttachmentRole) cell.dataset.taOrderAttachmentRole = "auxiliary";
            });
            const table = row.closest("table");
            if (table) table.dataset.taOrderAttachmentList = "true";
        });

        const attachmentOrderId = String(new URLSearchParams(location.search).get("id_zlecenia") || "").trim();
        const notifyAcceptedPage = (attachmentCount, announce = false) => {
            if (!/^\d+$/.test(attachmentOrderId) || !window.opener || window.opener.closed) return;
            try {
                window.opener.postMessage({
                    source: ORDER_CHANGE_MESSAGE_SOURCE,
                    type: "ORDER_CHANGED",
                    kind: "attachment",
                    orderId: attachmentOrderId,
                    attachmentCount: Math.max(0, Number(attachmentCount) || 0),
                    announce
                }, location.origin);
            } catch (_) {}
        };
        notifyAcceptedPage(attachmentRows.length, false);

        if (document.documentElement.dataset.taAttachmentBackgroundSaves !== "true") {
            document.documentElement.dataset.taAttachmentBackgroundSaves = "true";
            document.addEventListener("submit", event => {
                if (event.defaultPrevented || currentMode !== MODE_MODERN || !ORDER_ATTACHMENT_POPUP_PATH_PATTERN.test(normalizePathname())) return;
                const form = event.target instanceof HTMLFormElement ? event.target : null;
                if (!form || form.dataset.taBackgroundSubmitting === "true" || form.dataset.taAttachmentMutationBusy === "true") return;
                const submitter = event.submitter || null;
                const isUpload = form.dataset.taOrderAttachmentUpload === "true";
                const isDelete = submitter?.dataset.taOrderAttachmentDelete === "true";
                if (!isUpload && !isDelete) return;
                if (!getSameOriginPostAction(form)) return;
                if (isUpload && !form.querySelector('input[type="file"]')?.files?.length) return;
                event.preventDefault();
                const oldCount = document.querySelectorAll('tr[data-ta-order-attachment-row="true"]').length;
                form.dataset.taAttachmentMutationBusy = "true";
                submitter?.setAttribute("aria-busy", "true");
                void submitNativeFormInBackground(form, submitter).then(responseDocument => {
                    const responseDeleteControls = Array.from(responseDocument.querySelectorAll('input[type="submit"], input[type="button"], button'))
                        .filter(control => /usun/.test(foldText(control.value || control.textContent)));
                    const responseRows = new Set(responseDeleteControls.map(control => control.closest("tr")).filter(Boolean));
                    const newCount = responseRows.size;
                    const confirmed = isUpload ? newCount > oldCount : newCount < oldCount;
                    if (!confirmed) throw new Error("Serwer nie potwierdził zmiany listy załączników.");
                    notifyAcceptedPage(newCount, true);
                    window.setTimeout(() => window.close(), 120);
                }).catch(error => {
                    console.warn(`[Trans Assistant Intranet Modern UI ${SCRIPT_VERSION}] Zapis załącznika bez przeładowania strony nadrzędnej nie powiódł się:`, error);
                    showOrderSaveMessage(error?.message || "Nie udało się potwierdzić zapisu załącznika.", "error");
                }).finally(() => {
                    delete form.dataset.taAttachmentMutationBusy;
                    submitter?.removeAttribute("aria-busy");
                });
            }, true);
        }

        const closeLink = Array.from(document.querySelectorAll("a[href]"))
            .find(link => /^zamknij$/i.test(String(link.textContent || "").trim())) || null;
        if (closeLink) closeLink.dataset.taOrderAttachmentClose = "true";

        const header = document.createElement("header");
        header.className = "ta-order-attachment-header";
        header.innerHTML = `
            <div class="ta-order-details-mark" aria-hidden="true">C</div>
            <div>
                <span>CEMET SERWIS</span>
                <h1>Załączniki zlecenia</h1>
                <p>${attachmentRows.length ? `Dodane pliki: ${attachmentRows.length}` : "Brak dodanych plików"}</p>
            </div>
        `;
        const firstContent = uploadForm || fileInput.closest("table") || document.body.firstElementChild;
        if (firstContent?.parentNode) firstContent.parentNode.insertBefore(header, firstContent);
        else document.body.prepend(header);

        document.documentElement.classList.add("ta-intranet-page-order-attachment-popup");
        if (window.opener && window.self === window.top) {
            requestAnimationFrame(() => {
                try {
                    const targetWidth = Math.min(980, Math.max(860, Number(screen.availWidth || 980) - 50));
                    const targetHeight = Math.min(
                        Math.max(620, 330 + attachmentRows.length * 64),
                        Math.max(620, Number(screen.availHeight || 760) - 40)
                    );
                    window.resizeTo(targetWidth, targetHeight);
                    window.moveTo(
                        Math.max(0, Math.round((Number(screen.availWidth || targetWidth) - targetWidth) / 2)),
                        Math.max(0, Math.round((Number(screen.availHeight || targetHeight) - targetHeight) / 2))
                    );
                } catch (_) {}
            });
        }
        return true;
    }

    function findOrderDetailsTable() {
        const candidates = Array.from(document.querySelectorAll("table")).filter(table => {
            const text = foldText(table.textContent);
            return text.includes("aktualny status zlecenia")
                && text.includes("termin platnosci zlecenia");
        });
        return candidates.sort((left, right) => {
            const nestedDifference = left.querySelectorAll("table").length
                - right.querySelectorAll("table").length;
            if (nestedDifference) return nestedDifference;
            return String(left.textContent || "").length - String(right.textContent || "").length;
        })[0] || null;
    }

    function findLabeledRow(table, pattern) {
        return Array.from(table?.rows || []).find(row =>
            pattern.test(foldText(row.cells?.[0]?.textContent))
        ) || null;
    }

    function findLabeledRowInRows(rows, pattern) {
        return Array.from(rows || []).find(row =>
            pattern.test(foldText(row.cells?.[0]?.textContent))
        ) || null;
    }

    function getOrderDetailsRowKey(row) {
        if (!row) return "";
        if (row.querySelector('[name="miejsce_z_zmiana"]')) return "loading-place";
        if (row.querySelector('[name="odleglosc"]')) return "distance";
        if (row.querySelector('[name="termin_platnosci_zlecenia"]')) return "payment-term";
        if (row.querySelector('[name="wartosc"], [name="zlec_waluta"]')) return "carrier-value";
        if (row.querySelector('[name="aaatosc"], [name="oferta_waluta"]')) return "offer-value";
        if (row.querySelector('[name="war_myto"]')) return "toll";
        if (row.querySelector('[name="war_autostrada"]')) return "motorways";
        if (row.querySelector('[name="samochod_up"]')) return "vehicle";
        if (row.querySelector('[name="kierowca_up"]')) return "driver";
        if (row.querySelector('[name="status_zlecenia"]')) return "status-change";

        const label = foldText(row.cells?.[0]?.textContent);
        if (/miejsce zaladunku/.test(label)) return "loading-place";
        if (/data zaladunku/.test(label)) return "loading-date";
        if (/miejsce dostawy|miejsce rozladunku/.test(label)) return "delivery-place";
        if (/data dostawy|data rozladunku/.test(label)) return "delivery-date";
        if (/odleglosc/.test(label)) return "distance";
        if (/termin platnosci/.test(label)) return "payment-term";
        return "";
    }

    function collectOrderDetailsRows() {
        const labelPattern = /(?:numer zlecenia|numer oferty|miejsce zaladunku|data zaladunku|miejsce dostawy|data dostawy|odleglosc|wartosc zlecenia|wartosc z oferty|wartosc myta|wartosc za autostrady|koszt transpor|ciagnik|kierowca|adres e-mail|status zlecenia|numer faktury|przyjmujacy|data i czas przyjecia|termin platnosci|osoba zlecajaca|uwagi)/;
        const allRows = Array.from(document.querySelectorAll("tr"));
        const rows = allRows.filter(row => {
            if (row.closest(".ta-order-quick-correction")) return false;
            const label = foldText(row.cells?.[0]?.textContent);
            if (labelPattern.test(label)) return true;
            const text = foldText(row.textContent);
            return row.cells?.length === 1
                && /zapisz/.test(text)
                && Boolean(row.querySelector('input, button, a[href]'));
        });
        const requiredControlSelectors = [
            '[name="miejsce_z_zmiana"]',
            '[name="odleglosc"]',
            '[name="termin_platnosci_zlecenia"]'
        ];
        requiredControlSelectors.forEach(selector => {
            const row = document.querySelector(selector)?.closest("tr");
            if (row) rows.push(row);
        });

        const loadingRow = rows.find(row => getOrderDetailsRowKey(row) === "loading-place");
        if (loadingRow) {
            const siblingRows = Array.from(loadingRow.parentElement?.children || [])
                .filter(element => element.tagName === "TR");
            const loadingIndex = siblingRows.indexOf(loadingRow);
            const nextRow = loadingIndex >= 0 ? siblingRows[loadingIndex + 1] : null;
            if (nextRow && (
                /data zaladunku/.test(foldText(nextRow.cells?.[0]?.textContent))
                || (!nextRow.querySelector("input, select, textarea") && nextRow.cells?.length === 2)
            )) {
                nextRow.dataset.taOrderDetectedField = "loading-date";
                rows.push(nextRow);
            }
        }
        return rows.filter((row, index) => rows.indexOf(row) === index);
    }

    function rememberFieldState(field) {
        if (!field) return null;
        return {
            field,
            readOnly: field.readOnly,
            disabled: field.disabled,
            inputMode: field.getAttribute("inputmode"),
            min: field.getAttribute("min")
        };
    }

    function restoreFieldState(state) {
        if (!state?.field) return;
        state.field.readOnly = state.readOnly;
        state.field.disabled = state.disabled;
        if (state.inputMode === null) state.field.removeAttribute("inputmode");
        else state.field.setAttribute("inputmode", state.inputMode);
        if (state.min === null) state.field.removeAttribute("min");
        else state.field.setAttribute("min", state.min);
    }

    function centerOrderDetailsPopup(attempt = 0, preferredWidth = 1080) {
        if (!window.opener || window.opener.closed) return false;
        const availableWidth = Number(screen?.availWidth || 760);
        const availableHeight = Number(screen?.availHeight || 720);
        const availableLeft = Number(screen?.availLeft || 0);
        const availableTop = Number(screen?.availTop || 0);
        const targetWidth = Math.min(preferredWidth, Math.max(640, availableWidth - 30));
        const targetHeight = Math.min(920, Math.max(600, availableHeight - 30));
        const targetLeft = Math.round(availableLeft + (availableWidth - targetWidth) / 2);
        const targetTop = Math.round(availableTop + (availableHeight - targetHeight) / 2);
        try {
            window.resizeTo?.(targetWidth, targetHeight);
            window.moveTo?.(targetLeft, targetTop);
        } catch (_) {
            return false;
        }
        if (attempt < 2) {
            window.setTimeout(() => centerOrderDetailsPopup(attempt + 1, preferredWidth), 180);
        }
        return true;
    }

    function getCarrierOrderPopupPreferredWidth() {
        const bridgeActive = Boolean(
            window.transAssistantIntranetBridgeRunning === true
            || window.TransAssistantIntranetBridge
            || document.getElementById("trans-assistant-intranet-bridge")
            || document.body?.classList.contains("tai-order-panel-separated")
        );
        return bridgeActive ? 1280 : 1080;
    }

    function parseHtmlDocument(html) {
        return new DOMParser().parseFromString(String(html || ""), "text/html");
    }

    let legacyEncodingMap = null;

    function getLegacyEncodingMap() {
        if (legacyEncodingMap) return legacyEncodingMap;
        const decoder = new TextDecoder("iso-8859-2");
        const map = new Map();
        for (let byte = 0; byte <= 255; byte += 1) {
            const character = decoder.decode(Uint8Array.of(byte));
            if (character !== "\uFFFD" && !map.has(character)) {
                map.set(character, byte);
            }
        }
        legacyEncodingMap = map;
        return map;
    }

    function encodeLegacyText(value) {
        const map = getLegacyEncodingMap();
        const bytes = [];
        for (const character of String(value ?? "")) {
            const normalizedCharacter = character === "\u00a0" ? " " : character;
            const byte = map.get(normalizedCharacter);
            if (byte === undefined) {
                throw new Error(
                    `Znak „${character}” nie jest obsługiwany przez kodowanie starego intranetu.`
                );
            }
            bytes.push(byte);
        }
        return Uint8Array.from(bytes);
    }

    function buildLegacyMultipart(form, overrides = {}) {
        const boundary = `----TransAssistantLegacy${Date.now().toString(16)}`;
        const parts = [];
        const overriddenNames = new Set(Object.keys(overrides));
        const appendedOverrides = new Set();
        const appendField = (name, value) => {
            if (typeof value !== "string") {
                throw new Error("Formularz korekty zawiera nieobsługiwany załącznik.");
            }
            const safeName = String(name).replace(/["\r\n]/g, "");
            parts.push(encodeLegacyText(
                `--${boundary}\r\nContent-Disposition: form-data; name="${safeName}"\r\n\r\n`
            ));
            parts.push(encodeLegacyText(value));
            parts.push(encodeLegacyText("\r\n"));
        };

        for (const [name, originalValue] of new FormData(form).entries()) {
            if (overriddenNames.has(name)) {
                if (!appendedOverrides.has(name)) {
                    appendField(name, String(overrides[name] ?? ""));
                    appendedOverrides.add(name);
                }
                continue;
            }
            appendField(name, originalValue);
        }
        for (const name of overriddenNames) {
            if (!appendedOverrides.has(name)) {
                appendField(name, String(overrides[name] ?? ""));
            }
        }
        parts.push(encodeLegacyText(`--${boundary}--\r\n`));
        return new Blob(parts, { type: `multipart/form-data; boundary=${boundary}` });
    }

    async function fetchHtmlDocument(url, options = {}) {
        const response = await fetch(url, {
            credentials: "same-origin",
            redirect: "follow",
            ...options
        });
        if (!response.ok) {
            throw new Error(`Intranet zwrócił błąd HTTP ${response.status}.`);
        }
        const bytes = await response.arrayBuffer();
        const contentType = String(response.headers.get("content-type") || "");
        const headerCharset = /charset\s*=\s*["']?([^;"'\s]+)/i.exec(contentType)?.[1] || "";
        const asciiPreview = new TextDecoder("windows-1252").decode(bytes.slice(0, 2048));
        const metaCharset = /charset\s*=\s*["']?([^;"'\s/>]+)/i.exec(asciiPreview)?.[1] || "";
        const declaredCharset = String(headerCharset || metaCharset || "iso-8859-2").toLowerCase();
        const charset = /utf-?8/.test(declaredCharset) ? "utf-8" : "iso-8859-2";
        const html = new TextDecoder(charset).decode(bytes);
        return {
            document: parseHtmlDocument(html),
            url: response.url || String(url)
        };
    }

    function resolvePopupOrderNumber(orderId) {
        const normalizedId = String(orderId || "").trim();
        const localRow = Array.from(document.querySelectorAll("tr")).find(row =>
            /numer zlecenia/.test(foldText(row.cells?.[0]?.textContent))
        );
        const localNumber = /\bCD\d+\b/i.exec(String(localRow?.textContent || ""))?.[0] || "";
        if (localNumber) return localNumber.replace(/\s+/g, "").toUpperCase();
        if (!normalizedId || !window.opener || window.opener.closed) return "";
        try {
            const links = Array.from(window.opener.document.querySelectorAll("a[href]"));
            const link = links.find(candidate => {
                const href = String(candidate.getAttribute("href") || "");
                const match = /zlec_akcept_zm\.php\?id_o=(\d+)/i.exec(href);
                return match?.[1] === normalizedId;
            });
            return String(link?.textContent || "").replace(/\s+/g, "").trim();
        } catch (_) {
            return "";
        }
    }

    function showOrderSaveMessage(message, tone = "error") {
        let notice = document.getElementById("ta-order-save-notice");
        if (!notice) {
            notice = document.createElement("div");
            notice.id = "ta-order-save-notice";
            notice.setAttribute("role", "status");
            document.body?.appendChild(notice);
        }
        notice.dataset.tone = tone;
        notice.textContent = message;
        notice.hidden = false;
        window.clearTimeout(notice._taHideTimer);
        notice._taHideTimer = window.setTimeout(() => { notice.hidden = true; }, 6000);
    }

    function ensureOrderDetailsSaveOverlay() {
        let overlay = document.getElementById(ORDER_SAVE_OVERLAY_ID);
        if (overlay) return overlay;
        overlay = document.createElement("div");
        overlay.id = ORDER_SAVE_OVERLAY_ID;
        overlay.hidden = true;
        overlay.setAttribute("role", "status");
        overlay.setAttribute("aria-live", "polite");
        overlay.innerHTML = `
            <div class="ta-order-save-overlay-card">
                <i class="ta-order-save-spinner" aria-hidden="true"></i>
                <strong>Zapisywanie zlecenia — nie zamykaj okna</strong>
            </div>
        `;
        document.body?.appendChild(overlay);
        return overlay;
    }

    function setOrderDetailsSavePending(pending) {
        const state = orderDetailsPageState;
        if (!state) return;
        state.savePending = Boolean(pending);
        state.closeLinks?.forEach(link => {
            if (pending) {
                if (link.dataset.taOriginalCloseTitle === undefined) {
                    link.dataset.taOriginalCloseTitle = link.getAttribute("title") || "";
                }
                link.setAttribute("aria-disabled", "true");
                link.title = "Zapisywanie zlecenia — nie zamykaj okna";
            } else {
                link.removeAttribute("aria-disabled");
                const originalTitle = link.dataset.taOriginalCloseTitle;
                if (originalTitle) link.title = originalTitle;
                else link.removeAttribute("title");
                delete link.dataset.taOriginalCloseTitle;
            }
        });
    }

    function beginOrderDetailsSave() {
        const state = orderDetailsPageState;
        if (!state) return "";
        const token = `save-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        state.saveOperationTokens.add(token);
        setOrderDetailsSavePending(true);
        ensureOrderDetailsSaveOverlay().hidden = false;
        return token;
    }

    function endOrderDetailsSave(token) {
        const state = orderDetailsPageState;
        if (!state || !token) return;
        state.saveOperationTokens.delete(token);
        if (state.saveOperationTokens.size) return;
        const overlay = document.getElementById(ORDER_SAVE_OVERLAY_ID);
        if (overlay) overlay.hidden = true;
        setOrderDetailsSavePending(false);
    }

    function logOrderSave(kind, form, submitter) {
        console.log("[CEMET SAVE]", {
            kind,
            form: form?.id || form?.name || "(bez id)",
            action: form?.action || "",
            method: String(form?.method || "GET").toUpperCase(),
            submitter: submitter?.name || submitter?.title || submitter?.type || ""
        });
    }

    function isDomElement(value) {
        return Boolean(value && value.nodeType === 1 && typeof value.tagName === "string");
    }

    function getFormControl(form, name) {
        const control = form?.elements?.namedItem?.(name) || null;
        if (!control) return null;
        if (isDomElement(control)) return control;
        const first = control?.[0] || null;
        return isDomElement(first) ? first : null;
    }

    function dispatchControlValueEvents(control) {
        const EventConstructor = control?.ownerDocument?.defaultView?.Event || Event;
        control.dispatchEvent(new EventConstructor("input", { bubbles: true }));
        control.dispatchEvent(new EventConstructor("change", { bubbles: true }));
    }

    function findOwnedSubmitter(form, selector) {
        if (!form) return null;
        const fromElements = Array.from(form.elements || []).find(control =>
            isDomElement(control) && control.matches?.(selector)
        );
        if (fromElements) return fromElements;
        return Array.from(form.ownerDocument?.querySelectorAll?.(selector) || []).find(control =>
            control.form === form
        ) || null;
    }

    function findUniqueCorrectionForm(doc) {
        const forms = Array.from(doc?.forms || []).filter(form =>
            getFormControl(form, "n_miejsce")
            && getFormControl(form, "wartosc_termin_zaplaty")
            && getFormControl(form, "numer_oferty")
        );
        if (forms.length !== 1) {
            throw new Error(
                forms.length
                    ? "Znaleziono kilka rekordów. Zapis został zatrzymany."
                    : "Nie znaleziono danych zlecenia w korekcie."
            );
        }
        return forms[0];
    }

    function loadCorrectionRecordNatively(correctionUrl, orderNumber) {
        return new Promise((resolve, reject) => {
            const token = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
            const frame = document.createElement("iframe");
            frame.name = `trans-assistant-correction-lookup-${token}`;
            frame.src = correctionUrl;
            frame.setAttribute("sandbox", "allow-forms allow-same-origin");
            frame.setAttribute("aria-hidden", "true");
            Object.assign(frame.style, {
                position: "fixed",
                left: "-10000px",
                top: "0",
                width: "320px",
                height: "240px",
                opacity: "0.001",
                pointerEvents: "none"
            });

            let submitted = false;
            const dispose = () => {
                window.clearTimeout(timeoutId);
                frame.remove();
            };
            const timeoutId = window.setTimeout(() => {
                dispose();
                reject(new Error("Przekroczono czas oczekiwania na wyszukanie korekty."));
            }, 20000);
            const onLoad = () => {
                try {
                    if (!submitted) {
                        const frameDocument = frame.contentDocument;
                        const searchForm = Array.from(frameDocument?.forms || []).find(form =>
                            getFormControl(form, "numer_zlecenia")
                            && getFormControl(form, "rok")
                            && getFormControl(form, "miesiac")
                        );
                        if (!searchForm) {
                            throw new Error("Nie znaleziono formularza wyszukiwania korekty.");
                        }
                        const orderField = getFormControl(searchForm, "numer_zlecenia");
                        const nativeSubmit = searchForm.querySelector('input[type="image"]');
                        if (!orderField || !nativeSubmit) {
                            throw new Error("Formularz korekty nie zawiera wymaganych pól.");
                        }
                        orderField.value = orderNumber;
                        dispatchControlValueEvents(orderField);
                        submitted = true;
                        logOrderSave("correction-search-page-native", searchForm, nativeSubmit);
                        nativeSubmit.click();
                        return;
                    }

                    const url = frame.contentWindow?.location?.href || correctionUrl;
                    const responseDocument = frame.contentDocument;
                    const form = findUniqueCorrectionForm(responseDocument);
                    window.clearTimeout(timeoutId);
                    frame.removeEventListener("load", onLoad);
                    resolve({ document: responseDocument, url, form, frame, dispose });
                } catch (error) {
                    dispose();
                    reject(error);
                }
            };
            frame.addEventListener("load", onLoad);
            document.body.appendChild(frame);
        });
    }

    async function loadCorrectionRecord(orderNumber) {
        const correctionUrl = new URL(
            "/spedycja_uss_2022/administracja/korekta_danych.php",
            location.origin
        ).href;
        return loadCorrectionRecordNatively(correctionUrl, orderNumber);
    }

    function submitCorrectionFormNatively(record, overrides) {
        return new Promise((resolve, reject) => {
            const frame = record?.frame;
            const form = record?.form;
            const submitter = findOwnedSubmitter(
                form,
                'input[type="image"], input[type="submit"], button[type="submit"]'
            );
            if (!frame?.isConnected || !form || !submitter) {
                record?.dispose?.();
                reject(new Error("Nie znaleziono aktywnego formularza zapisu korekty."));
                return;
            }
            for (const [name, value] of Object.entries(overrides)) {
                const control = getFormControl(form, name);
                if (!control) {
                    record.dispose?.();
                    reject(new Error(`Formularz korekty nie zawiera pola ${name}.`));
                    return;
                }
                control.value = String(value ?? "");
                dispatchControlValueEvents(control);
            }

            const cleanup = () => {
                window.clearTimeout(timeoutId);
                frame.removeEventListener("load", onLoad);
                record.dispose?.();
            };
            const timeoutId = window.setTimeout(() => {
                cleanup();
                reject(new Error("Przekroczono czas oczekiwania na zapis korekty."));
            }, 20000);
            const onLoad = () => {
                const url = frame.contentWindow?.location?.href || "";
                let responseForm = null;
                try {
                    responseForm = findUniqueCorrectionForm(frame.contentDocument);
                } catch (_) {
                    // Po poprawnym POST intranet może wrócić do pustego widoku wyszukiwania.
                }
                const confirmedValues = {
                    savedDelivery: getFormControl(responseForm, "n_miejsce")?.value?.trim() || "",
                    savedPayment: getFormControl(responseForm, "wartosc_termin_zaplaty")?.value?.trim() || "",
                    savedDistance: getFormControl(responseForm, "n_odleglosc")?.value?.trim() || ""
                };
                cleanup();
                resolve({ url, responseFormFound: Boolean(responseForm), ...confirmedValues });
            };
            frame.addEventListener("load", onLoad, { once: true });
            logOrderSave("correction-page-native", form, submitter);
            submitter.click();
        });
    }

    function readCorrectionValues(record) {
        return {
            savedDelivery: getFormControl(record?.form, "n_miejsce")?.value?.trim() || "",
            savedPayment: getFormControl(record?.form, "wartosc_termin_zaplaty")?.value?.trim() || "",
            savedDistance: getFormControl(record?.form, "n_odleglosc")?.value?.trim() || ""
        };
    }

    async function saveCorrectionFields(orderNumber, values, preparedRecord = null) {
        const record = preparedRecord || await loadCorrectionRecord(orderNumber);
        const overrides = {};
        const expected = [];
        if (values.deliveryPlace !== undefined) {
            overrides.n_miejsce = values.deliveryPlace;
            expected.push(["savedDelivery", values.deliveryPlace]);
        }
        if (values.paymentTerm !== undefined) {
            overrides.wartosc_termin_zaplaty = values.paymentTerm;
            expected.push(["savedPayment", values.paymentTerm]);
        }
        if (values.distance !== undefined) {
            overrides.n_odleglosc = values.distance;
            expected.push(["savedDistance", values.distance]);
        }
        let saved = await submitCorrectionFormNatively(record, overrides);
        if (expected.some(([key, value]) => saved[key] !== value)) {
            const refreshedRecord = await loadCorrectionRecord(orderNumber);
            saved = { ...saved, ...readCorrectionValues(refreshedRecord), verifiedByReload: true };
            refreshedRecord.dispose?.();
        }
        if (expected.some(([key, value]) => saved[key] !== value)) {
            throw new Error("Intranet nie potwierdził zapisania nowych wartości.");
        }
        return saved;
    }

    function findUniqueDateCorrectionForm(doc) {
        const forms = Array.from(doc?.forms || []).filter(form =>
            getFormControl(form, "dod")
            && getFormControl(form, "id_of")
            && getFormControl(form, "data_zaladunku")
            && getFormControl(form, "data_dostawy")
            && form.querySelector('input[type="image"]')
        );
        if (forms.length !== 1) {
            throw new Error(
                forms.length
                    ? "Znaleziono kilka formularzy zmiany dat. Zapis został zatrzymany."
                    : "Nie znaleziono oryginalnego formularza zmiany dat."
            );
        }
        return forms[0];
    }

    function resolvePopupOfferNumber() {
        const values = Array.from(document.querySelectorAll('input[name="oferta"]'))
            .map(control => String(control.value || "").trim())
            .filter(value => /^\d+$/.test(value));
        const uniqueValues = Array.from(new Set(values));
        return uniqueValues.length === 1 ? uniqueValues[0] : "";
    }

    function loadDateCorrectionRecordNatively(offerNumber) {
        return new Promise((resolve, reject) => {
            if (!/^\d+$/.test(String(offerNumber || ""))) {
                reject(new Error("Nie udało się odczytać numeru oferty dla zmiany dat."));
                return;
            }
            const token = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
            const dateUrl = new URL(
                `/spedycja_uss_2022/administracja/zmien_date.php?id_of=${encodeURIComponent(offerNumber)}`,
                location.origin
            ).href;
            const frame = document.createElement("iframe");
            frame.name = `trans-assistant-date-correction-${token}`;
            frame.src = dateUrl;
            frame.setAttribute("sandbox", "allow-forms allow-same-origin");
            frame.setAttribute("aria-hidden", "true");
            Object.assign(frame.style, {
                position: "fixed",
                left: "-10000px",
                top: "0",
                width: "400px",
                height: "240px",
                opacity: "0.001",
                pointerEvents: "none"
            });
            const dispose = () => {
                window.clearTimeout(timeoutId);
                frame.remove();
            };
            const timeoutId = window.setTimeout(() => {
                dispose();
                reject(new Error("Przekroczono czas oczekiwania na formularz zmiany dat."));
            }, 20000);
            const onLoad = () => {
                try {
                    const form = findUniqueDateCorrectionForm(frame.contentDocument);
                    const url = frame.contentWindow?.location?.href || dateUrl;
                    window.clearTimeout(timeoutId);
                    frame.removeEventListener("load", onLoad);
                    resolve({ document: frame.contentDocument, url, form, frame, dispose });
                } catch (error) {
                    dispose();
                    reject(error);
                }
            };
            frame.addEventListener("load", onLoad);
            document.body.appendChild(frame);
        });
    }

    function parseLegacyDateValue(value) {
        const match = /^(\d{4})([-./])(\d{1,2})\2(\d{1,2})$/.exec(String(value || "").trim());
        if (!match) return "";
        const month = Number(match[3]);
        const day = Number(match[4]);
        if (month < 1 || month > 12 || day < 1 || day > 31) return "";
        return `${match[1]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }

    function readNativeOrderDate(value) {
        const match = /(\d{4}[-./]\d{1,2}[-./]\d{1,2})/.exec(String(value || ""));
        return match ? parseLegacyDateValue(match[1]) : "";
    }

    function formatLegacyDateValue(isoValue, sourceTemplate) {
        const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoValue || ""));
        const templateMatch = /^(\d{4})([-./])(\d{1,2})\2(\d{1,2})$/.exec(
            String(sourceTemplate || "").trim()
        );
        if (!isoMatch || !templateMatch) {
            throw new Error("Nie udało się zachować formatu daty używanego przez intranet.");
        }
        const month = templateMatch[3].length === 1 ? String(Number(isoMatch[2])) : isoMatch[2];
        const day = templateMatch[4].length === 1 ? String(Number(isoMatch[3])) : isoMatch[3];
        return `${isoMatch[1]}${templateMatch[2]}${month}${templateMatch[2]}${day}`;
    }

    function submitDateCorrectionFormNatively(record, loadingDate, deliveryDate) {
        return new Promise((resolve, reject) => {
            const frame = record?.frame;
            const form = record?.form;
            const nativeSubmit = form?.querySelector('input[type="image"]');
            if (!frame?.isConnected || !form || !nativeSubmit) {
                record?.dispose?.();
                reject(new Error("Nie znaleziono oryginalnego przycisku zapisu dat."));
                return;
            }
            const loadingControl = getFormControl(form, "data_zaladunku");
            const deliveryControl = getFormControl(form, "data_dostawy");
            if (!loadingControl || !deliveryControl) {
                record.dispose?.();
                reject(new Error("Formularz zmiany dat nie zawiera obu pól daty."));
                return;
            }
            loadingControl.value = loadingDate;
            deliveryControl.value = deliveryDate;
            [loadingControl, deliveryControl].forEach(dispatchControlValueEvents);
            const cleanup = () => {
                window.clearTimeout(timeoutId);
                frame.removeEventListener("load", onLoad);
                record.dispose?.();
            };
            const timeoutId = window.setTimeout(() => {
                cleanup();
                reject(new Error("Przekroczono czas oczekiwania na zapis dat."));
            }, 20000);
            const onLoad = () => {
                try {
                    let responseForm = null;
                    try {
                        responseForm = findUniqueDateCorrectionForm(frame.contentDocument);
                    } catch (_) {
                        // Jak w korekcie danych, odpowiedź może nie zawierać zapisanego rekordu.
                    }
                    const savedLoading = getFormControl(responseForm, "data_zaladunku")?.value?.trim() || "";
                    const savedDelivery = getFormControl(responseForm, "data_dostawy")?.value?.trim() || "";
                    cleanup();
                    resolve({ savedLoading, savedDelivery, responseFormFound: Boolean(responseForm) });
                } catch (error) {
                    cleanup();
                    reject(error);
                }
            };
            frame.addEventListener("load", onLoad, { once: true });
            logOrderSave("date-correction-page-native", form, nativeSubmit);
            nativeSubmit.click();
        });
    }

    function createQuickCorrectionPanel(orderId) {
        const panel = document.createElement("section");
        panel.className = "ta-order-quick-correction";
        panel.dataset.taState = "idle";
        panel.innerHTML = `
            <div class="ta-order-quick-heading">
                <div>
                    <span>SZYBKA KOREKTA</span>
                </div>
                <i class="ta-order-quick-indicator" aria-hidden="true"></i>
            </div>
            <div class="ta-order-quick-grid">
                <label>
                    <span>Termin płatności</span>
                    <div class="ta-order-input-suffix">
                        <input name="ta_payment_term" type="number" min="0" max="999" step="1" inputmode="numeric">
                        <b>dni</b>
                    </div>
                </label>
                <label>
                    <span>Miejsce dostawy</span>
                    <input name="ta_delivery_place" type="text" maxlength="180">
                </label>
            </div>
            <div class="ta-order-quick-actions">
                <p role="status">Dane gotowe do edycji</p>
                <button type="button">ZAPISZ</button>
            </div>
        `;

        const paymentInput = panel.querySelector('[name="ta_payment_term"]');
        const deliveryInput = panel.querySelector('[name="ta_delivery_place"]');
        const button = panel.querySelector("button");
        const status = panel.querySelector('[role="status"]');
        const orderNumber = resolvePopupOrderNumber(orderId);
        const setStatus = (message, state = "idle") => {
            status.textContent = message;
            button.title = message;
            panel.dataset.taState = state;
            if (state === "error") showOrderSaveMessage(message, "error");
        };

        let correctionRecordPromise = null;
        let correctionSavePromise = null;
        panel._taInitialize = async () => {
            panel.dataset.taInitialized = "true";
            if (!orderNumber) {
                setStatus("Nie udało się odczytać numeru CD z tabeli zleceń.", "error");
                return false;
            }
            setStatus(`Zlecenie ${orderNumber} · dane gotowe do edycji`, "ready");
            return true;
        };
        panel._taUseNativeValues = ({ paymentTerm = "", deliveryPlace = "" } = {}) => {
            paymentInput.value = String(paymentTerm || "").trim();
            deliveryInput.value = String(deliveryPlace || "").trim();
            panel._taOriginalPaymentTerm = paymentInput.value;
            panel._taOriginalDeliveryPlace = deliveryInput.value;
            paymentInput.disabled = false;
            deliveryInput.disabled = false;
            button.disabled = false;
            panel._taInitialize();
        };
        panel._taLoadCorrectionRecord = () => {
            if (!correctionRecordPromise) {
                correctionRecordPromise = loadCorrectionRecord(orderNumber)
                    .then(record => {
                        panel._taCorrectionRecord = record;
                        return record;
                    })
                    .catch(error => {
                        correctionRecordPromise = null;
                        throw error;
                    });
            }
            return correctionRecordPromise;
        };

        panel._taSaveFields = async (values, messages = {}) => {
            if (correctionSavePromise) return correctionSavePromise;
            correctionSavePromise = (async () => {
                const initialized = await panel._taInitialize();
                if (!initialized) return false;
                button.disabled = true;
                paymentInput.disabled = true;
                deliveryInput.disabled = true;
                setStatus(messages.saving || "Zapisywanie danych zlecenia…", "saving");
                const saveToken = beginOrderDetailsSave();
                try {
                    const correctionRecord = await panel._taLoadCorrectionRecord();
                    logOrderSave("correction", correctionRecord.form, findOwnedSubmitter(
                        correctionRecord.form,
                        'input[type="image"], input[type="submit"], button[type="submit"]'
                    ));
                    const saved = await saveCorrectionFields(orderNumber, values, correctionRecord);
                    if (values.paymentTerm !== undefined) {
                        panel._taOriginalPaymentTerm = values.paymentTerm;
                    }
                    if (values.deliveryPlace !== undefined) {
                        panel._taOriginalDeliveryPlace = values.deliveryPlace;
                    }
                    orderDetailsPageState?.embeddedCorrection?.updateOriginalValues?.(saved);
                    setStatus(messages.success || "Zapisano dane zlecenia.", "success");
                    return saved;
                } catch (error) {
                    setStatus(error?.message || "Nie udało się zapisać zmian.", "error");
                    return false;
                } finally {
                    endOrderDetailsSave(saveToken);
                    button.disabled = false;
                    paymentInput.disabled = false;
                    deliveryInput.disabled = false;
                    correctionRecordPromise = null;
                    correctionSavePromise = null;
                    panel._taCorrectionRecord = null;
                }
            })();
            return correctionSavePromise;
        };

        panel._taSave = async () => {
            const deliveryPlace = String(deliveryInput.value || "").trim();
            if (!deliveryPlace) {
                setStatus("Miejsce dostawy nie może być puste.", "error");
                deliveryInput.focus();
                return false;
            }
            return panel._taSaveFields(
                { deliveryPlace },
                { saving: "Zapisywanie miejsca dostawy…", success: "Zapisano miejsce dostawy." }
            );
        };
        button.addEventListener("click", () => panel._taSave());
        panel._taControls = { paymentInput, deliveryInput, button, status };
        return panel;
    }

    function embedCorrectionControls(panel, detailsRows) {
        const controls = panel?._taControls;
        if (!controls) return null;
        const deliveryRow = findLabeledRowInRows(detailsRows, /miejsce (dostawy|rozladunku)/);
        const paymentRow = detailsRows.find(row => getOrderDetailsRowKey(row) === "payment-term");
        const distanceRow = detailsRows.find(row => getOrderDetailsRowKey(row) === "distance");
        const deliveryCell = deliveryRow?.querySelector('[data-ta-intranet-role="order-details-value"]');
        const paymentCell = paymentRow?.querySelector('[data-ta-intranet-role="order-details-value"]');
        if (!deliveryCell || !paymentCell) return null;
        panel._taDistanceInput = distanceRow?.querySelector('[name="odleglosc"]') || null;
        const nativeDeliveryControl = deliveryCell.querySelector('input:not([type="hidden"]), select, textarea');
        const nativePaymentControl = paymentCell.querySelector('input:not([type="hidden"]), select, textarea');
        const nativeDeliveryValue = String(
            nativeDeliveryControl?.value || deliveryCell.textContent || ""
        ).trim();
        const nativePaymentText = String(
            nativePaymentControl?.value || ""
        ).trim();
        const nativePaymentValue = /^\d{1,3}$/.test(nativePaymentText) ? nativePaymentText : "";
        panel._taUseNativeValues?.({
            paymentTerm: nativePaymentValue,
            deliveryPlace: nativeDeliveryValue
        });

        const deliveryOriginal = document.createElement("span");
        deliveryOriginal.className = "ta-order-original-value";
        while (deliveryCell.firstChild) deliveryOriginal.appendChild(deliveryCell.firstChild);
        const deliveryEditor = document.createElement("div");
        deliveryEditor.className = "ta-order-embedded-editor ta-order-delivery-editor";
        deliveryEditor.append(controls.deliveryInput, controls.button, controls.status);
        deliveryCell.append(deliveryOriginal, deliveryEditor);

        const paymentOriginal = document.createElement("span");
        paymentOriginal.className = "ta-order-original-value";
        while (paymentCell.firstChild) paymentOriginal.appendChild(paymentCell.firstChild);
        const paymentEditor = document.createElement("div");
        paymentEditor.className = "ta-order-embedded-editor ta-order-payment-editor";
        paymentEditor.append(controls.paymentInput);
        const suffix = document.createElement("b");
        suffix.textContent = "dni";
        paymentEditor.appendChild(suffix);
        const paymentSave = document.createElement("button");
        paymentSave.type = "button";
        paymentSave.className = "ta-order-metric-save";
        paymentSave.textContent = "💾";
        paymentSave.title = "Zapisz termin płatności";
        paymentSave.setAttribute("aria-label", "Zapisz termin płatności");
        paymentSave.addEventListener("click", async () => {
            const paymentTerm = String(controls.paymentInput.value || "").trim();
            if (!/^\d{1,3}$/.test(paymentTerm)) {
                showOrderSaveMessage("Termin płatności musi być liczbą od 0 do 999 dni.", "error");
                controls.paymentInput.focus();
                return;
            }
            const nativePayment = paymentOriginal.querySelector('[name="termin_platnosci_zlecenia"]')
                || orderDetailsPageState?.paymentField;
            if (!nativePayment) {
                showOrderSaveMessage("Nie znaleziono natywnego pola terminu płatności.", "error");
                return;
            }
            paymentSave.disabled = true;
            const saved = await panel._taSaveFields(
                { paymentTerm },
                { saving: "Zapisywanie terminu płatności…", success: "Zapisano termin płatności." }
            );
            paymentSave.disabled = false;
            if (!saved) return;
            nativePayment.value = paymentTerm;
            dispatchControlValueEvents(nativePayment);
        });
        paymentEditor.appendChild(paymentSave);
        paymentCell.append(paymentOriginal, paymentEditor);
        panel._taSavePaymentIfDirty = async () => {
            const paymentTerm = String(controls.paymentInput.value || "").trim();
            if (paymentTerm === panel._taOriginalPaymentTerm) return true;
            if (!/^\d{1,3}$/.test(paymentTerm)) {
                showOrderSaveMessage("Termin płatności musi być liczbą od 0 do 999 dni.", "error");
                controls.paymentInput.focus();
                return false;
            }
            const saved = await panel._taSaveFields(
                { paymentTerm },
                { saving: "Zapisywanie terminu płatności…", success: "Zapisano termin płatności." }
            );
            if (!saved) return false;
            const nativePayment = paymentOriginal.querySelector('[name="termin_platnosci_zlecenia"]')
                || orderDetailsPageState?.paymentField;
            if (nativePayment) {
                nativePayment.value = paymentTerm;
                dispatchControlValueEvents(nativePayment);
            }
            return true;
        };

        return {
            updateOriginalValues(saved) {
                if (saved.savedDelivery) deliveryOriginal.textContent = saved.savedDelivery;
                const nativePayment = paymentOriginal.querySelector('[name="termin_platnosci_zlecenia"]');
                if (saved.savedPayment && nativePayment) nativePayment.value = saved.savedPayment;
            }
        };
    }

    function embedDateCorrectionControls(panel, detailsRows) {
        const findDateRow = field => detailsRows.find(row =>
            row.dataset.taOrderField === field
            || row.dataset.taOrderDetectedField === field
            || getOrderDetailsRowKey(row) === field
        ) || document.querySelector(`[data-ta-order-field="${field}"]`);
        const findValueCell = row => {
            const cell = row?.querySelector('[data-ta-intranet-role="order-details-value"]')
                || row?.cells?.[1]
                || row?.cells?.[row.cells.length - 1]
                || null;
            if (cell) cell.dataset.taIntranetRole = "order-details-value";
            return cell;
        };
        const loadingRow = findDateRow("loading-date");
        const deliveryRow = findDateRow("delivery-date");
        const loadingCell = findValueCell(loadingRow);
        const deliveryCell = findValueCell(deliveryRow);
        if (!loadingCell || !deliveryCell) return null;

        const createEditor = (cell, label) => {
            const original = document.createElement("span");
            original.className = "ta-order-original-value";
            while (cell.firstChild) original.appendChild(cell.firstChild);
            const editor = document.createElement("div");
            editor.className = "ta-order-embedded-editor ta-order-date-editor";
            const input = document.createElement("input");
            input.type = "date";
            input.setAttribute("aria-label", label);
            const save = document.createElement("button");
            save.type = "button";
            save.className = "ta-order-metric-save";
            save.textContent = "💾";
            save.title = `Zapisz ${label.toLocaleLowerCase("pl-PL")}`;
            save.setAttribute("aria-label", save.title);
            editor.append(input, save);
            cell.append(original, editor);
            return { original, editor, input, save };
        };

        const loading = createEditor(loadingCell, "Datę załadunku");
        const delivery = createEditor(deliveryCell, "Datę rozładunku");
        let record = null;
        let loadingTemplate = "";
        let deliveryTemplate = "";
        let savedLoadingIso = "";
        let savedDeliveryIso = "";
        let preparePromise = null;
        let savePromise = null;
        const offerNumber = resolvePopupOfferNumber();

        const setDisabled = disabled => {
            loading.input.disabled = disabled;
            delivery.input.disabled = disabled;
            loading.save.disabled = disabled;
            delivery.save.disabled = disabled;
        };
        const updateOriginalText = (entry, isoValue) => {
            const currentText = String(entry.original.textContent || "").trim();
            const timeSuffix = /\s+(\d{1,2}:\d{2}(?::\d{2})?)\s*$/.exec(currentText)?.[1] || "";
            entry.original.textContent = timeSuffix ? `${isoValue} ${timeSuffix}` : isoValue;
        };
        savedLoadingIso = readNativeOrderDate(loading.original.textContent);
        savedDeliveryIso = readNativeOrderDate(delivery.original.textContent);
        loading.input.value = savedLoadingIso;
        delivery.input.value = savedDeliveryIso;
        setDisabled(!savedLoadingIso || !savedDeliveryIso);

        const prepareRecord = () => {
            if (record) return Promise.resolve(record);
            if (preparePromise) return preparePromise;
            preparePromise = (async () => {
                record = await loadDateCorrectionRecordNatively(offerNumber);
                loadingTemplate = getFormControl(record.form, "data_zaladunku")?.value?.trim() || "";
                deliveryTemplate = getFormControl(record.form, "data_dostawy")?.value?.trim() || "";
                if (!parseLegacyDateValue(loadingTemplate) || !parseLegacyDateValue(deliveryTemplate)) {
                    throw new Error("Intranet zwrócił nierozpoznawalny format daty.");
                }
                return record;
            })().catch(error => {
                    record?.dispose?.();
                    record = null;
                    preparePromise = null;
                    throw error;
                });
            return preparePromise;
        };

        const controller = {
            isDirty() {
                return loading.input.value !== savedLoadingIso
                    || delivery.input.value !== savedDeliveryIso;
            },
            async save() {
                if (savePromise) return savePromise;
                let saveToken = "";
                savePromise = (async () => {
                    const loadingIso = String(loading.input.value || "");
                    const deliveryIso = String(delivery.input.value || "");
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(loadingIso) || !/^\d{4}-\d{2}-\d{2}$/.test(deliveryIso)) {
                        throw new Error("Obie daty muszą być uzupełnione.");
                    }
                    saveToken = beginOrderDetailsSave();
                    await prepareRecord();
                    const loadingValue = formatLegacyDateValue(loadingIso, loadingTemplate);
                    const deliveryValue = formatLegacyDateValue(deliveryIso, deliveryTemplate);
                    setDisabled(true);
                    let saved = await submitDateCorrectionFormNatively(record, loadingValue, deliveryValue);
                    if (
                        parseLegacyDateValue(saved.savedLoading) !== loadingIso
                        || parseLegacyDateValue(saved.savedDelivery) !== deliveryIso
                    ) {
                        const refreshed = await loadDateCorrectionRecordNatively(offerNumber);
                        const refreshedForm = refreshed.form;
                        saved = {
                            ...saved,
                            savedLoading: getFormControl(refreshedForm, "data_zaladunku")?.value?.trim() || "",
                            savedDelivery: getFormControl(refreshedForm, "data_dostawy")?.value?.trim() || "",
                            verifiedByReload: true
                        };
                        refreshed.dispose?.();
                    }
                    if (
                        parseLegacyDateValue(saved.savedLoading) !== loadingIso
                        || parseLegacyDateValue(saved.savedDelivery) !== deliveryIso
                    ) {
                        throw new Error("Intranet nie potwierdził zapisania obu dat.");
                    }
                    loadingTemplate = saved.savedLoading;
                    deliveryTemplate = saved.savedDelivery;
                    record = null;
                    preparePromise = null;
                    savedLoadingIso = loadingIso;
                    savedDeliveryIso = deliveryIso;
                    updateOriginalText(loading, loadingIso);
                    updateOriginalText(delivery, deliveryIso);
                    return true;
                })().catch(error => {
                    record?.dispose?.();
                    record = null;
                    preparePromise = null;
                    showOrderSaveMessage(error?.message || "Nie udało się zapisać dat.", "error");
                    return false;
                }).finally(() => {
                    endOrderDetailsSave(saveToken);
                    setDisabled(false);
                    savePromise = null;
                });
                return savePromise;
            }
        };
        loading.save.addEventListener("click", () => controller.save());
        delivery.save.addEventListener("click", () => controller.save());
        panel._taDateCorrection = controller;
        return controller;
    }

    function wrapLegacyActionCaptions(root) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const textNodes = [];
        while (walker.nextNode()) textNodes.push(walker.currentNode);
        textNodes.forEach(node => {
            if (!/^\s*(?:zmień|zapisz)\s*$/i.test(String(node.nodeValue || ""))) return;
            if (node.parentElement?.closest?.(".ta-order-native-action-proxy")) return;
            const caption = document.createElement("span");
            caption.className = "ta-legacy-action-caption";
            caption.textContent = node.nodeValue;
            node.parentNode?.replaceChild(caption, node);
            if (caption.parentElement && /^\s*(?:zmień|zapisz)\s*$/i.test(caption.parentElement.textContent || "")) {
                caption.parentElement.dataset.taLegacyCaptionWrapper = "true";
            }
        });
    }

    function modernizeLegacyImageActions(table, detailsRows = Array.from(table?.rows || [])) {
        const queryRows = selector => detailsRows.flatMap(row => Array.from(row.querySelectorAll(selector)));
        queryRows("a[href]").forEach(link => {
            if (!link.querySelector("img")) return;
            const imageSources = Array.from(link.querySelectorAll("img"))
                .map(image => String(image.getAttribute("src") || "").toLowerCase())
                .join(" ");
            if (/(?:cal|calendar|kalendar|druk|print|pdf)/i.test(imageSources)) return;
            link.dataset.taIntranetAction = "change-field";
            link.setAttribute("aria-label", "Zapisz zmianę");
        });

        queryRows('input[type="image"]').forEach(nativeSubmit => {
            nativeSubmit.dataset.taIntranetAction = "legacy-image-submit";
            if (nativeSubmit.nextElementSibling?.classList.contains("ta-order-native-action-proxy")) {
                return;
            }
            const proxy = document.createElement("button");
            proxy.type = "button";
            proxy.className = "ta-order-native-action-proxy";
            proxy.textContent = "ZAPISZ";
            const ownerRow = nativeSubmit.closest("tr");
            const ownerLabel = foldText(ownerRow?.cells?.[0]?.textContent);
            const ownerKey = getOrderDetailsRowKey(ownerRow);
            if ((!ownerLabel && !ownerKey) || /uwagi|zapisz/.test(ownerLabel)) {
                proxy.classList.add("ta-order-final-save");
            }
            proxy.addEventListener("click", async () => {
                const kind = proxy.classList.contains("ta-order-final-save")
                    ? "main"
                    : getOrderDetailsRowKey(ownerRow) || "inline";
                if (kind === "distance") {
                    const panel = orderDetailsPageState?.quickCorrectionPanel;
                    const distance = String(panel?._taDistanceInput?.value || "").trim();
                    if (!distance || !panel?._taSaveFields) {
                        showOrderSaveMessage("Nie znaleziono wartości odległości do zapisania.", "error");
                        return;
                    }
                    proxy.disabled = true;
                    await panel._taSaveFields(
                        { distance },
                        { saving: "Zapisywanie odległości…", success: "Zapisano odległość." }
                    );
                    proxy.disabled = false;
                    return;
                }
                const nativeForm = nativeSubmit.form;
                if (!nativeForm) {
                    const message = "Błąd: nie znaleziono formularza zapisu.";
                    console.error("[CEMET SAVE ERROR]", { kind, submitter: nativeSubmit });
                    showOrderSaveMessage(message, "error");
                    return;
                }
                let pageSaveToken = "";
                try {
                    if (kind === "main") {
                        proxy.disabled = true;
                        const paymentSaved = await orderDetailsPageState?.quickCorrectionPanel
                            ?._taSavePaymentIfDirty?.();
                        if (paymentSaved === false) {
                            proxy.disabled = false;
                            return;
                        }
                        pageSaveToken = beginOrderDetailsSave();
                    }
                    logOrderSave(kind, nativeForm, nativeSubmit);
                    nativeSubmit.click();
                } catch (error) {
                    if (kind === "main") {
                        proxy.disabled = false;
                        endOrderDetailsSave(pageSaveToken);
                    }
                    console.error("[CEMET SAVE ERROR]", {
                        kind,
                        form: nativeForm,
                        action: nativeForm.action,
                        method: nativeForm.method,
                        submitter: nativeSubmit,
                        error
                    });
                    showOrderSaveMessage(
                        "Nie udało się zapisać danych. Sprawdź konsolę – szczegóły błędu zostały zapisane.",
                        "error"
                    );
                }
            });
            nativeSubmit.insertAdjacentElement("afterend", proxy);
        });
        queryRows("img").forEach(image => {
            const source = String(image.getAttribute("src") || "").toLowerCase();
            if (/(?:cal|calendar|kalendar|druk|print|pdf)/i.test(source)) return;
            image.dataset.taLegacyActionIcon = "true";
        });
        detailsRows.forEach(row => wrapLegacyActionCaptions(row));
        detailsRows.forEach(row => {
            const label = foldText(row.cells?.[0]?.textContent);
            const key = getOrderDetailsRowKey(row);
            row.querySelectorAll('input[type="submit"], button[type="submit"]').forEach(submit => {
                submit.dataset.taIntranetAction = key === "loading-place" || key === "distance"
                    ? "inline-save"
                    : "final-save";
            });
            if (
                row.querySelector('[data-ta-intranet-action="change-field"]')
                || row.querySelector('[data-ta-intranet-action="inline-save"]')
                || row.querySelector(".ta-order-native-action-proxy")
            ) {
                row.dataset.taInlineAction = "true";
            }
        });
    }

    function enhanceNativeSelectSearch(row, kind) {
        const select = row?.querySelector("select");
        const container = select?.parentElement;
        if (!select || !container) return null;
        if (select.dataset.taNativeSelectSearch === kind) {
            return {
                select,
                search: container.querySelector(`.ta-native-select-search[data-ta-search-kind="${kind}"]`)
            };
        }
        const search = document.createElement("div");
        row.dataset.taSearchRow = kind;
        search.className = "ta-native-select-search";
        search.dataset.taSearchKind = kind;
        const listId = `ta-native-select-results-${kind}-${Math.random().toString(36).slice(2, 8)}`;
        search.innerHTML = `
            <input type="search" autocomplete="off" role="combobox"
                aria-autocomplete="list" aria-expanded="false" aria-controls="${listId}"
                placeholder="${kind === "driver" ? "Szukaj i wybierz kierowcę…" : "Szukaj i wybierz ciągnik lub naczepę…"}">
            <span class="ta-native-select-count"></span>
            <div class="ta-native-select-results" id="${listId}" role="listbox" hidden></div>
        `;
        const input = search.querySelector("input");
        const counter = search.querySelector(".ta-native-select-count");
        const results = search.querySelector(".ta-native-select-results");
        const options = Array.from(select.options || []);
        let visibleOptions = [];
        let activeIndex = -1;
        const selectedLabel = () => String(select.selectedOptions?.[0]?.textContent || "").trim();
        const closeResults = () => {
            results.hidden = true;
            input.setAttribute("aria-expanded", "false");
            activeIndex = -1;
        };
        const markActiveResult = () => {
            const buttons = Array.from(results.querySelectorAll("button[data-option-index]"));
            buttons.forEach((button, index) => {
                button.dataset.active = String(index === activeIndex);
                if (index === activeIndex) button.scrollIntoView({ block: "nearest" });
            });
        };
        const renderResults = queryValue => {
            const query = foldText(queryValue);
            visibleOptions = options.filter(option =>
                !option.disabled && (!query || foldText(option.textContent).includes(query))
            );
            const shownOptions = visibleOptions.slice(0, 12);
            counter.textContent = visibleOptions.length ? String(visibleOptions.length) : "0";
            results.innerHTML = shownOptions.length
                ? shownOptions.map(option => {
                    const optionIndex = options.indexOf(option);
                    return `<button type="button" role="option" data-option-index="${optionIndex}"
                        aria-selected="${String(option.selected)}">${escapeHtml(String(option.textContent || "").trim())}</button>`;
                }).join("")
                : '<div class="ta-native-select-empty">Brak wyników</div>';
            results.hidden = false;
            input.setAttribute("aria-expanded", "true");
            activeIndex = shownOptions.length ? 0 : -1;
            markActiveResult();
        };
        const chooseOption = option => {
            if (!option) return;
            select.value = option.value;
            select.dispatchEvent(new Event("input", { bubbles: true }));
            select.dispatchEvent(new Event("change", { bubbles: true }));
            input.value = String(option.textContent || "").trim();
            closeResults();
        };
        input.value = selectedLabel();
        input.addEventListener("focus", () => {
            input.select();
            renderResults("");
        });
        input.addEventListener("input", () => renderResults(input.value));
        input.addEventListener("keydown", event => {
            const shownCount = Math.min(visibleOptions.length, 12);
            if (event.key === "ArrowDown" && shownCount) {
                event.preventDefault();
                activeIndex = (activeIndex + 1) % shownCount;
                markActiveResult();
            } else if (event.key === "ArrowUp" && shownCount) {
                event.preventDefault();
                activeIndex = (activeIndex - 1 + shownCount) % shownCount;
                markActiveResult();
            } else if (event.key === "Enter" && activeIndex >= 0) {
                event.preventDefault();
                chooseOption(visibleOptions[activeIndex]);
            } else if (event.key === "Escape") {
                closeResults();
                input.value = selectedLabel();
            }
        });
        results.addEventListener("mousedown", event => event.preventDefault());
        results.addEventListener("click", event => {
            const button = event.target.closest("button[data-option-index]");
            if (!button) return;
            chooseOption(options[Number(button.dataset.optionIndex)]);
        });
        select.addEventListener("change", () => {
            input.value = selectedLabel();
            closeResults();
        });
        document.addEventListener("mousedown", event => {
            if (!search.contains(event.target)) closeResults();
        });
        select.classList.add("ta-native-select-source");
        select.dataset.taNativeSelectSearch = kind;
        container.insertBefore(search, select);
        return {
            input,
            reset() {
                input.value = selectedLabel();
                closeResults();
            }
        };
    }

    function classifyCarrierRecordAction(control) {
        if (!control) return "";
        if (control.closest?.('[data-ta-bridge-record-confirmation="true"]')) return "";
        const href = String(control.getAttribute?.("href") || control.href || "");
        const inlineAction = String(control.getAttribute?.("onclick") || "");
        const label = foldText([
            control.textContent,
            control.value,
            control.getAttribute?.("title"),
            control.getAttribute?.("aria-label")
        ].filter(Boolean).join(" "));
        const target = `${href} ${inlineAction}`;
        if (/dod_[^/?#'"\s]*kier[^/?#'"\s]*\.php/i.test(target) || /dodaj kierowce/.test(label)) {
            return "driver";
        }
        if (/dod_[^/?#'"\s]*(?:tabor|samoch)[^/?#'"\s]*\.php/i.test(target) || /dodaj tabor/.test(label)) {
            return "fleet";
        }
        return "";
    }

    function getCarrierNativeOrderLinks() {
        const links = Array.from(document.querySelectorAll("a[href]"));
        return {
            driver: links.find(link => classifyCarrierRecordAction(link) === "driver") || null,
            fleet: links.find(link => classifyCarrierRecordAction(link) === "fleet") || null
        };
    }

    function getCarrierContractorId() {
        const inputValue = String(document.querySelector('[name="k_id"]')?.value || "").trim();
        if (/^\d+$/.test(inputValue)) return inputValue;
        const links = getCarrierNativeOrderLinks();
        for (const link of [links.driver, links.fleet]) {
            try {
                const contractorId = new URL(
                    link?.href || link?.getAttribute?.("href") || "",
                    location.href
                ).searchParams.get("kontrahent");
                if (/^\d+$/.test(String(contractorId || ""))) return contractorId;
            } catch (_) {
                // Kolejne źródło identyfikatora może nadal być poprawne.
            }
        }
        return "";
    }

    function formatCarrierDriverPhone(value) {
        const digits = String(value || "").replace(/\D/g, "");
        if (digits.length !== 9) {
            throw new Error("Wpisz telefon w formacie 123-456-789");
        }
        return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }

    function buildCarrierDriverRecordValues(driver, contractorId) {
        const firstName = String(driver?.firstName || "").replace(/\s+/g, " ").trim();
        const lastName = String(driver?.lastName || "").replace(/\s+/g, " ").trim();
        if (!firstName || !lastName) {
            throw new Error("Podaj osobno imię i nazwisko kierowcy.");
        }
        const phone = formatCarrierDriverPhone(driver?.phone);
        return {
            dod: "1",
            kontrahent: String(contractorId || ""),
            krajk: "ZG",
            imie: firstName,
            nazwisko: lastName,
            numer_gsm: phone,
            numer_dok: String(driver?.documentNumber || "").trim(),
            stan: "A"
        };
    }

    function buildCarrierFleetRecordValues(fleet, contractorId) {
        const tractor = String(fleet?.tractor || "").trim();
        const trailer = String(fleet?.trailer || "").trim();
        if (!tractor || !trailer) {
            throw new Error("Podaj numery rejestracyjne ciągnika i naczepy.");
        }
        return {
            dod: "1",
            kontrahent: String(contractorId || ""),
            numer_rejestracyjny: `${tractor}/${trailer}`,
            rodzaj_nadwozia: "Firanka",
            ladownosc: "24",
            uwagi: ""
        };
    }

    function encodeCarrierLegacyFormComponent(value) {
        const encodingMap = getLegacyEncodingMap();
        return Array.from(String(value ?? "")).map(character => {
            if (/^[A-Za-z0-9_.~-]$/.test(character)) return character;
            if (character === " " || character === "\u00a0") return "+";
            const byte = encodingMap.get(character);
            if (byte === undefined) {
                throw new Error(`Znak „${character}” nie jest obsługiwany przez stary intranet.`);
            }
            return `%${byte.toString(16).toUpperCase().padStart(2, "0")}`;
        }).join("");
    }

    function buildCarrierLegacyFormBody(values) {
        return Object.entries(values || {})
            .map(([name, value]) =>
                `${encodeCarrierLegacyFormComponent(name)}=${encodeCarrierLegacyFormComponent(value)}`
            )
            .join("&");
    }

    async function submitCarrierNativeRecord(url, values) {
        if (!url) throw new Error("Intranet nie udostępnił adresu formularza.");
        const source = await fetchHtmlDocument(url, { method: "GET", cache: "no-store" });
        const sourceForm = Array.from(source.document.forms || []).find(form =>
            form.querySelector('[name="dod"]') && form.querySelector('[name="kontrahent"]')
        );
        if (!sourceForm) throw new Error("Nie znaleziono natywnego formularza zapisu.");
        const action = new URL(
            sourceForm.getAttribute("action") || url,
            source.url || url
        ).href;
        const response = await fetchHtmlDocument(action, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=iso-8859-2"
            },
            body: buildCarrierLegacyFormBody(values),
            cache: "no-store"
        });
        const responseText = foldText(response.document.body?.textContent || "");
        if (
            responseText.includes("wprowadzony numer dowodu osobistego")
            && responseText.includes("wystepuje juz")
        ) {
            const error = new Error("Numer dokumentu jest już przypisany do kierowcy.");
            error.code = "duplicate-driver-document";
            throw error;
        }
        return { ok: true, action, responseUrl: response.url };
    }

    async function submitCarrierDriverRecord(url, values) {
        const originalDocument = String(values?.numer_dok || "").trim();
        let lastDuplicateError = null;
        for (let suffixLength = 0; suffixLength <= CARRIER_DRIVER_DOCUMENT_MAX_DOT_SUFFIX; suffixLength += 1) {
            const adjustedValues = {
                ...values,
                numer_dok: suffixLength > 0
                    ? `${originalDocument}${".".repeat(suffixLength)}`
                    : originalDocument
            };
            try {
                return await submitCarrierNativeRecord(url, adjustedValues);
            } catch (error) {
                if (error?.code !== "duplicate-driver-document" || !originalDocument) throw error;
                lastDuplicateError = error;
            }
        }
        const error = new Error(
            `Numer dokumentu pozostaje zajęty po ${CARRIER_DRIVER_DOCUMENT_MAX_DOT_SUFFIX} próbach zapisu.`
        );
        error.code = lastDuplicateError?.code || "duplicate-driver-document";
        throw error;
    }

    function dispatchCarrierSelectEvents(select) {
        select.dispatchEvent(new Event("input", { bubbles: true }));
        select.dispatchEvent(new Event("change", { bubbles: true }));
    }

    function tokenizeCarrierPersonName(value) {
        return foldText(value)
            .replace(/[^a-z0-9ąćęłńóśźż\s-]/gi, " ")
            .split(/[\s-]+/)
            .map(token => token.trim())
            .filter(Boolean)
            .sort();
    }

    function selectCarrierDriverByName(select, driverName) {
        if (!select || select.tagName !== "SELECT") return { ok: false, reason: "brak-listy-kierowców" };
        const expectedTokens = tokenizeCarrierPersonName(driverName);
        const candidates = Array.from(select.options || [])
            .filter(option => option.value)
            .map(option => ({ option, tokens: tokenizeCarrierPersonName(option.textContent) }))
            .filter(candidate => expectedTokens.every(token => candidate.tokens.includes(token)));
        const exact = candidates.filter(candidate =>
            candidate.tokens.length === expectedTokens.length
            && candidate.tokens.every((token, index) => token === expectedTokens[index])
        );
        const matches = exact.length ? exact : candidates;
        if (matches.length !== 1) {
            return { ok: false, reason: matches.length ? "niejednoznaczny-kierowca" : "nie-znaleziono-kierowcy" };
        }
        select.value = matches[0].option.value;
        dispatchCarrierSelectEvents(select);
        return { ok: true, value: select.value, text: matches[0].option.textContent.trim() };
    }

    function normalizeCarrierPlate(value) {
        return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    }

    function selectCarrierVehicleByPlates(select, tractorPlate, trailerPlate) {
        if (!select || select.tagName !== "SELECT") return { ok: false, reason: "brak-listy-taboru" };
        const tractor = normalizeCarrierPlate(tractorPlate);
        const trailer = normalizeCarrierPlate(trailerPlate);
        const candidates = Array.from(select.options || [])
            .filter(option => option.value)
            .map(option => {
                const normalized = normalizeCarrierPlate(option.textContent);
                return {
                    option,
                    normalized,
                    extraLength: Math.max(0, normalized.length - tractor.length - trailer.length)
                };
            })
            .filter(candidate => candidate.normalized.includes(tractor) && candidate.normalized.includes(trailer))
            .sort((left, right) => left.extraLength - right.extraLength);
        if (!candidates.length) return { ok: false, reason: "nie-znaleziono-zestawu" };
        if (candidates.length > 1 && candidates[0].extraLength === candidates[1].extraLength) {
            return { ok: false, reason: "niejednoznaczny-zestaw" };
        }
        select.value = candidates[0].option.value;
        dispatchCarrierSelectEvents(select);
        return { ok: true, value: select.value, text: candidates[0].option.textContent.trim() };
    }

    function resetEnhancedNativeSelect(select, kind) {
        const container = select?.parentElement;
        container?.querySelector(`.ta-native-select-search[data-ta-search-kind="${kind}"]`)?.remove();
        if (!select) return;
        select.classList.remove("ta-native-select-source");
        delete select.dataset.taNativeSelectSearch;
    }

    async function refreshCarrierRecordSelect(table, kind, record) {
        const selector = kind === "driver" ? '[name="kierowca"]' : '[name="i_sam"]';
        const currentSelect = table?.querySelector(selector);
        if (!currentSelect) throw new Error("Nie znaleziono listy do odświeżenia.");
        const previousCount = currentSelect.options.length;
        for (let attempt = 0; attempt < 4; attempt += 1) {
            if (attempt > 0) {
                await new Promise(resolve => window.setTimeout(resolve, attempt * 300));
            }
            const freshPage = await fetchHtmlDocument(location.href, { cache: "no-store" });
            const freshSelect = freshPage.document.querySelector(selector);
            if (!freshSelect || freshSelect.options.length <= previousCount) continue;

            resetEnhancedNativeSelect(currentSelect, kind === "driver" ? "driver" : "vehicle");
            currentSelect.replaceChildren(...Array.from(freshSelect.options).map(option => option.cloneNode(true)));
            const selection = kind === "driver"
                ? selectCarrierDriverByName(currentSelect, record.driverName)
                : selectCarrierVehicleByPlates(currentSelect, record.tractor, record.trailer);
            enhanceNativeSelectSearch(currentSelect.closest("tr"), kind === "driver" ? "driver" : "vehicle");
            if (selection?.ok) return selection;
        }
        throw new Error(
            kind === "driver"
                ? "Intranet nie potwierdził dodania kierowcy na liście. Sprawdź dane i spróbuj ponownie."
                : "Intranet nie potwierdził dodania taboru na liście. Sprawdź dane i spróbuj ponownie."
        );
    }

    function openCarrierRecordModal(table, kind, nativeLink) {
        document.getElementById("trans-assistant-carrier-record-modal")?.remove();
        const isDriver = kind === "driver";
        const title = isDriver ? "Dodaj kierowcę" : "Dodaj tabor";
        const backdrop = document.createElement("div");
        backdrop.id = "trans-assistant-carrier-record-modal";
        backdrop.className = "ta-carrier-record-modal";
        backdrop.innerHTML = `
            <section class="ta-carrier-record-dialog" role="dialog" aria-modal="true" aria-labelledby="ta-carrier-record-title">
                <header>
                    <div>
                        <span>CEMET SERWIS</span>
                        <h2 id="ta-carrier-record-title">${title}</h2>
                        <p>${isDriver ? "Nowy kierowca przewoźnika" : "Nowy zestaw przewoźnika"}</p>
                    </div>
                    <button type="button" class="ta-carrier-record-close" aria-label="Zamknij">×</button>
                </header>
                <form class="ta-carrier-record-form">
                    ${isDriver ? `
                        <div class="ta-carrier-record-columns">
                            <label><span>Imię</span><input name="record-first-name" autocomplete="given-name" required></label>
                            <label><span>Nazwisko</span><input name="record-last-name" autocomplete="family-name" required></label>
                        </div>
                        <div class="ta-carrier-record-columns">
                            <label><span>Telefon</span><input name="record-phone" inputmode="numeric" autocomplete="tel"
                                placeholder="123-456-789" aria-label="Telefon w formacie 123-456-789"></label>
                            <label><span>Numer dokumentu</span><input name="record-document" autocomplete="off"></label>
                        </div>
                    ` : `
                        <div class="ta-carrier-record-columns">
                            <label><span>Ciągnik</span><input name="record-tractor" autocomplete="off" required placeholder="np. WX1234A"></label>
                            <label><span>Naczepa</span><input name="record-trailer" autocomplete="off" required placeholder="np. WX5678P"></label>
                        </div>
                        <p class="ta-carrier-record-helper">Zestaw zostanie zapisany jako Firanka, 24 t.</p>
                    `}
                    <div class="ta-carrier-record-status" role="status" aria-live="polite"></div>
                    <footer>
                        <a class="ta-carrier-record-classic" href="${escapeHtml(nativeLink?.href || "#")}" target="_blank" rel="noopener">Otwórz klasyczne okno</a>
                        <button type="button" class="ta-carrier-record-cancel">Wróć</button>
                        <button type="submit" class="ta-carrier-record-submit">${title}</button>
                    </footer>
                </form>
            </section>
        `;
        document.body.appendChild(backdrop);
        requestAnimationFrame(() => backdrop.classList.add("is-visible"));

        const form = backdrop.querySelector("form");
        const phoneInput = isDriver ? form.elements["record-phone"] : null;
        const normalizePhoneInput = () => {
            if (!phoneInput) return;
            phoneInput.setCustomValidity("");
            const digits = String(phoneInput.value || "").replace(/\D/g, "");
            if (digits.length === 9) {
                phoneInput.value = `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
            }
        };
        phoneInput?.addEventListener("input", normalizePhoneInput);
        phoneInput?.addEventListener("blur", normalizePhoneInput);
        let escapeHandler = null;
        const close = () => {
            if (escapeHandler) document.removeEventListener("keydown", escapeHandler);
            backdrop.classList.remove("is-visible");
            setTimeout(() => backdrop.remove(), 160);
        };
        backdrop.querySelector(".ta-carrier-record-close")?.addEventListener("click", close);
        backdrop.querySelector(".ta-carrier-record-cancel")?.addEventListener("click", close);
        backdrop.addEventListener("click", event => {
            if (event.target === backdrop) close();
        });
        escapeHandler = event => {
            if (event.key !== "Escape" || !backdrop.isConnected) return;
            close();
        };
        document.addEventListener("keydown", escapeHandler);

        form.addEventListener("submit", async event => {
            event.preventDefault();
            const status = form.querySelector(".ta-carrier-record-status");
            const submit = form.querySelector(".ta-carrier-record-submit");
            if (phoneInput) {
                try {
                    phoneInput.value = formatCarrierDriverPhone(phoneInput.value);
                    phoneInput.setCustomValidity("");
                } catch (error) {
                    phoneInput.setCustomValidity(error.message);
                    phoneInput.reportValidity();
                    return;
                }
            }
            const contractorId = getCarrierContractorId();
            const links = getCarrierNativeOrderLinks();
            if (!contractorId) {
                status.dataset.tone = "error";
                status.textContent = "Najpierw wybierz przewoźnika w formularzu zlecenia.";
                return;
            }
            submit.disabled = true;
            form.setAttribute("aria-busy", "true");
            status.dataset.tone = "progress";
            status.textContent = isDriver ? "Zapisuję kierowcę…" : "Zapisuję tabor…";
            try {
                let record = null;
                if (isDriver) {
                    const firstName = String(form.elements["record-first-name"].value || "").trim();
                    const lastName = String(form.elements["record-last-name"].value || "").trim();
                    const driverName = `${firstName} ${lastName}`.trim();
                    record = { driverName };
                    const values = buildCarrierDriverRecordValues({
                        firstName,
                        lastName,
                        phone: form.elements["record-phone"].value,
                        documentNumber: form.elements["record-document"].value
                    }, contractorId);
                    await submitCarrierDriverRecord(links.driver?.href || nativeLink?.href || "", values);
                } else {
                    const tractor = String(form.elements["record-tractor"].value || "").trim();
                    const trailer = String(form.elements["record-trailer"].value || "").trim();
                    record = { tractor, trailer };
                    const values = buildCarrierFleetRecordValues({ tractor, trailer }, contractorId);
                    await submitCarrierNativeRecord(links.fleet?.href || nativeLink?.href || "", values);
                }

                status.dataset.tone = "progress";
                status.textContent = "Zapisano. Odświeżam listę…";
                const selection = await refreshCarrierRecordSelect(table, kind, record);
                if (!selection?.ok) {
                    throw new Error(selection?.reason || "Nie znaleziono dodanej pozycji na odświeżonej liście.");
                }
                status.dataset.tone = "success";
                status.textContent = isDriver
                    ? "Kierowca został dodany i wybrany."
                    : "Tabor został dodany i wybrany.";
                setTimeout(close, 800);
            } catch (error) {
                console.error(`[Trans Assistant Intranet Modern UI ${SCRIPT_VERSION}] Zapis rekordu przewoźnika nie powiódł się.`, error);
                status.dataset.tone = "error";
                status.textContent = error?.message || "Nie udało się zapisać danych.";
                submit.disabled = false;
                form.removeAttribute("aria-busy");
            }
        });
        form.querySelector("input")?.focus();
        return backdrop;
    }

    function installCarrierRecordModalDelegation() {
        if (document.documentElement.dataset.taCarrierRecordModalDelegated !== "true") {
            document.documentElement.dataset.taCarrierRecordModalDelegated = "true";
            document.addEventListener("click", event => {
                if (!isModernMode() || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
                if (
                    event.target instanceof Element
                    && event.target.closest('[data-ta-bridge-record-confirmation="true"]')
                ) return;
                const path = typeof event.composedPath === "function" ? event.composedPath() : [];
                const pathControl = path.find(node =>
                    node instanceof Element
                    && node.matches?.('a[href], button, input[type="button"], input[type="submit"]')
                    && classifyCarrierRecordAction(node)
                );
                const targetControl = event.target instanceof Element
                    ? event.target.closest('a[href], button, input[type="button"], input[type="submit"]')
                    : null;
                const control = pathControl || targetControl;
                const kind = classifyCarrierRecordAction(control);
                if (!control || !kind || control.closest("#trans-assistant-carrier-record-modal")) return;
                const currentTable = control.closest?.("table") || document.querySelector(
                    '[data-ta-intranet-role="business-form-table"][data-ta-business-form="carrier-order"]'
                ) || document.querySelector(
                    '[data-ta-intranet-role="business-form-table"][data-ta-business-form-primary="true"]'
                ) || document.querySelector('[data-ta-intranet-role="business-form-table"]');
                if (!currentTable) return;
                event.preventDefault();
                event.stopImmediatePropagation();
                openCarrierRecordModal(currentTable, kind, control);
            }, true);
        }
    }

    function installCarrierRecordModalLinks(table) {
        installCarrierRecordModalDelegation();
        const controls = Array.from(table?.querySelectorAll(
            'a[href], button, input[type="button"], input[type="submit"]'
        ) || []).filter(control => classifyCarrierRecordAction(control));
        controls.forEach(control => {
            control.dataset.taCarrierRecordModal = "true";
            if (control.dataset.taCarrierRecordModalBound === "true") return;
            control.dataset.taCarrierRecordModalBound = "true";
            control.addEventListener("click", event => {
                if (!isModernMode() || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
                const kind = classifyCarrierRecordAction(control);
                if (!kind) return;
                event.preventDefault();
                event.stopImmediatePropagation();
                openCarrierRecordModal(control.closest("table") || table, kind, control);
            }, true);
        });
        return controls.length;
    }

    function arrangeOrderDetailsRows(table, detailsRows = Array.from(table?.rows || [])) {
        const rows = Array.from(detailsRows || []);
        const financeRows = [];
        rows.forEach(row => {
            const label = foldText(row.cells?.[0]?.textContent);
            let order = 40;
            if (/numer zlecenia|numer oferty/.test(label)) order = 1;
            if (/miejsce zaladunku|miejsce dostawy/.test(label)) order = 10;
            if (/data zaladunku|data dostawy/.test(label)) order = 11;
            if (
                /odleglosc|wartosc zlecenia|wartosc z oferty|wartosc myta|wartosc za autostrady|koszt transpor/.test(label)
            ) {
                order = 20;
                row.dataset.taOrderGroup = "finance";
                row.dataset.taOrderLayout = "wide";
                financeRows.push(row);
            }
            if (/ciagnik|kierowca/.test(label)) order = 30;
            row.style.order = String(order);
        });
        financeRows.forEach((row, index) => {
            row.dataset.taGroupPosition = index === 0
                ? "first"
                : index === financeRows.length - 1
                    ? "last"
                    : "middle";
        });
    }

    function classifyOrderDetailsPlacement(row) {
        const label = foldText(row.cells?.[0]?.textContent);
        const key = row.dataset.taOrderDetectedField || getOrderDetailsRowKey(row);
        if (key === "loading-place") return { rank: 1, column: 1, span: 6, section: "route", field: "loading-place" };
        if (key === "delivery-place") return { rank: 1, column: 2, span: 6, section: "route", field: "delivery-place" };
        if (key === "loading-date") return { rank: 2, column: 1, span: 6, section: "route", field: "loading-date" };
        if (key === "delivery-date") return { rank: 2, column: 2, span: 6, section: "route", field: "delivery-date" };
        if (/numer zlecenia/.test(label)) return { rank: 3, column: 1, span: 3, section: "identity" };
        if (/numer oferty/.test(label)) return { rank: 3, column: 2, span: 3, section: "identity" };
        if (/przyjmujacy/.test(label)) return { rank: 3, column: 3, span: 3, section: "identity" };
        if (/aktualny status/.test(label)) return { rank: 3, column: 4, span: 3, section: "identity" };

        if (key === "carrier-value") return { rank: 4, column: 1, span: 2, section: "finance" };
        if (key === "offer-value") return { rank: 4, column: 2, span: 2, section: "finance" };
        if (key === "distance") return { rank: 4, column: 3, span: 2, section: "finance", field: "distance" };
        if (key === "toll") return { rank: 4, column: 4, span: 2, section: "finance" };
        if (key === "motorways") return { rank: 4, column: 5, span: 2, section: "finance" };
        if (key === "payment-term") return { rank: 4, column: 6, span: 2, section: "finance", field: "payment-term" };
        if (/koszt transpor/.test(label)) {
            return {
                rank: 5,
                column: 1,
                span: 12,
                section: "finance",
                field: "transporeon-cost"
            };
        }

        if (key === "vehicle" || /ciagnik/.test(label)) return { rank: 6, column: 1, span: 6, section: "assignment" };
        if (key === "driver" || /kierowca/.test(label)) return { rank: 6, column: 2, span: 6, section: "assignment" };
        if (key === "status-change" || /zmien status/.test(label)) return { rank: 7, column: 1, span: 12, section: "status" };

        if (/numer faktury/.test(label)) return { rank: 8, column: 1, span: 3, section: "organization" };
        if (/data i czas przyjecia/.test(label)) return { rank: 8, column: 2, span: 3, section: "organization" };
        if (/adres e-mail/.test(label)) return { rank: 8, column: 3, span: 3, section: "organization" };
        if (/osoba zlecajaca/.test(label)) return { rank: 8, column: 4, span: 3, section: "organization" };
        if (/uwagi/.test(label)) return { rank: 9, column: 1, span: 12, section: "notes" };
        if (row.cells?.length < 2) return { rank: 10, column: 1, span: 12, section: "actions" };
        return { rank: 8, column: 5, span: 3, section: "organization" };
    }

    function consolidateOrderDetailsRows(table, detailsRows = Array.from(table?.rows || [])) {
        if (!table) return null;
        const rows = Array.from(detailsRows || [])
            .filter(row => row.dataset.taIntranetRole === "order-details-row");
        if (!rows.length) return null;
        const records = rows.map((row, sourceIndex) => ({
            row,
            sourceIndex,
            parent: row.parentNode,
            nextSibling: row.nextSibling,
            placement: classifyOrderDetailsPlacement(row)
        }));
        const generatedForms = new Map();
        const bindings = rows.flatMap(row =>
            Array.from(row.querySelectorAll("input, select, textarea, button")).flatMap(control => {
                const owner = control.form;
                if (!owner) return [];
                const originalFormAttribute = control.getAttribute("form");
                const originalFormId = owner.getAttribute("id");
                if (!owner.id) {
                    const assignedId = `ta-order-native-form-${generatedForms.size + 1}`;
                    owner.id = assignedId;
                    generatedForms.set(owner, { assignedId, originalFormId });
                }
                return [{ control, owner, originalFormAttribute }];
            })
        );
        const applyBindings = () => bindings.forEach(binding => {
            const generated = generatedForms.get(binding.owner);
            if (generated && !binding.owner.id) binding.owner.id = generated.assignedId;
            binding.control.setAttribute("form", binding.owner.id);
        });
        const restoreBindings = () => {
            bindings.forEach(binding => {
                if (binding.originalFormAttribute === null) binding.control.removeAttribute("form");
                else binding.control.setAttribute("form", binding.originalFormAttribute);
            });
            generatedForms.forEach((generated, owner) => {
                if (generated.originalFormId === null) owner.removeAttribute("id");
                else owner.setAttribute("id", generated.originalFormId);
            });
        };
        const activate = () => {
            applyBindings();
            let layout = table.querySelector(":scope > tbody.ta-order-details-unified-layout");
            if (!layout) {
                layout = document.createElement("tbody");
                layout.className = "ta-order-details-unified-layout";
                table.insertBefore(layout, table.tBodies?.[0] || table.firstChild);
            }
            records
                .slice()
                .sort((left, right) =>
                    left.placement.rank - right.placement.rank
                    || left.placement.column - right.placement.column
                    || left.sourceIndex - right.sourceIndex
                )
                .forEach(record => {
                    record.row.dataset.taLayoutSpan = String(record.placement.span);
                    record.row.dataset.taOrderSection = record.placement.section;
                    if (record.placement.field) record.row.dataset.taOrderField = record.placement.field;
                    const rowKey = getOrderDetailsRowKey(record.row);
                    if (["distance", "toll", "motorways", "payment-term"].includes(rowKey)) {
                        record.row.classList.add("order-metric-field");
                    }
                    record.row.style.order = String(record.placement.rank);
                    layout.appendChild(record.row);
                });
        };
        const deactivate = () => {
            records.slice().reverse().forEach(record => {
                const reference = record.nextSibling?.parentNode === record.parent
                    ? record.nextSibling
                    : null;
                record.parent?.insertBefore(record.row, reference);
            });
            table.querySelector(":scope > tbody.ta-order-details-unified-layout")?.remove();
            restoreBindings();
        };
        activate();
        return { activate, deactivate };
    }

    function alignInlineRowControls(table, detailsRows = Array.from(table?.rows || [])) {
        Array.from(detailsRows || []).forEach(row => {
            const valueCell = row.querySelector('[data-ta-intranet-role="order-details-value"]');
            if (!valueCell) return;
            Array.from(valueCell.childNodes).forEach(node => {
                if (node.nodeType !== Node.TEXT_NODE || String(node.nodeValue || "").trim()) return;
                const spacer = document.createElement("span");
                spacer.className = "ta-layout-whitespace";
                spacer.textContent = node.nodeValue;
                node.parentNode?.replaceChild(spacer, node);
            });
            const action = row.querySelector(
                '.ta-order-native-action-proxy:not(.ta-order-final-save), [data-ta-intranet-action="change-field"], [data-ta-intranet-action="inline-save"]'
            );
            if (action) {
                valueCell.appendChild(action);
                row.dataset.taInlineAction = "true";
            }
            const currencySelect = Array.from(valueCell.querySelectorAll("select")).find(select =>
                Array.from(select.options || []).some(option => /^(?:PLN|EUR|USD)$/i.test(
                    String(option.textContent || "").trim()
                ))
            );
            if (currencySelect && valueCell.querySelector('input:not([type="hidden"])')) {
                row.dataset.taCurrencyInline = "true";
            }
        });
    }

    function installOrderFormDiagnostics(detailsRows) {
        const forms = new Set();
        detailsRows.forEach(row => {
            row.querySelectorAll("input, select, textarea, button").forEach(control => {
                if (control.form) forms.add(control.form);
            });
        });
        forms.forEach(form => {
            if (form.dataset.taSaveDiagnostics === "true") return;
            form.dataset.taSaveDiagnostics = "true";
            form.addEventListener("submit", event => {
                logOrderSave("native-submit", form, event.submitter);
            });
        });
    }

    function normalizeOrderInvoiceRows(detailsRows) {
        const invoiceRows = Array.from(detailsRows || []).filter(row =>
            /numer faktury/.test(foldText(row.cells?.[0]?.textContent))
        );
        const editableRow = invoiceRows.find(row => row.querySelector('[name="nr_f_zob"]')) || null;
        if (!editableRow) return null;
        editableRow.dataset.taOrderInvoiceRow = "editable";
        invoiceRows.forEach(row => {
            if (row === editableRow) return;
            const meaningfulControl = row.querySelector('input:not([type="hidden"]), select, textarea, button');
            if (!meaningfulControl) row.dataset.taOrderInvoiceRow = "duplicate-presentation";
        });
        return editableRow;
    }

    function mountOrderDetailsPage() {
        if (!document.body) return false;
        const table = findOrderDetailsTable()
            || Array.from(document.querySelectorAll("table"))
                .sort((left, right) => (right.rows?.length || 0) - (left.rows?.length || 0))[0]
            || null;

        setRole(table, "order-details-table");
        const form = table?.closest("form") || table?.querySelector("form") || document.querySelector("form");
        setRole(form, "order-details-form");
        const detailsRows = collectOrderDetailsRows();
        detailsRows.forEach(row => {
            row.dataset.taIntranetRole = "order-details-row";
            const label = foldText(row.cells?.[0]?.textContent);
            row.dataset.taOrderLayout = row.cells?.length < 2
                || /(?:uwagi|adres e-mail|kierowca|ciagnik|osoba zlecajaca)/.test(label)
                ? "wide"
                : "half";
            if (row.cells?.length >= 2) {
                row.cells[0].dataset.taIntranetRole = "order-details-label";
                row.cells[1].dataset.taIntranetRole = "order-details-value";
            }
        });
        normalizeOrderInvoiceRows(detailsRows);

        const paymentRow = findLabeledRowInRows(detailsRows, /termin platnosci/);
        const paymentField = paymentRow?.querySelector('input:not([type="hidden"]), select, textarea') || null;
        const paymentState = rememberFieldState(paymentField);
        if (paymentRow) paymentRow.dataset.taIntranetFieldRow = "payment-term";
        if (paymentField) {
            paymentField.dataset.taIntranetField = "payment-term";
            paymentField.setAttribute("inputmode", "numeric");
            if (paymentField.tagName === "INPUT" && paymentField.type === "number") {
                paymentField.setAttribute("min", "0");
            }
        }

        const deliveryField = form?.querySelector(
            '[name="m_d_p"], [name="n_miejsce"], [name="miejsce_dostawy"], [name="miejsce_rozladunku"]'
        ) || null;
        const deliveryState = rememberFieldState(deliveryField);
        const deliveryRow = deliveryField?.closest("tr")
            || findLabeledRowInRows(detailsRows, /miejsce (dostawy|rozladunku)/);
        if (deliveryRow) deliveryRow.dataset.taIntranetFieldRow = "delivery-place";
        if (deliveryField) deliveryField.dataset.taIntranetField = "delivery-place";

        modernizeLegacyImageActions(table, detailsRows);
        arrangeOrderDetailsRows(table, detailsRows);
        const consolidatedLayout = consolidateOrderDetailsRows(table, detailsRows);
        alignInlineRowControls(table, detailsRows);
        installOrderFormDiagnostics(detailsRows);
        const dynamicSearches = [
            enhanceNativeSelectSearch(findLabeledRowInRows(detailsRows, /ciagnik/), "vehicle"),
            enhanceNativeSelectSearch(findLabeledRowInRows(detailsRows, /kierowca/), "driver")
        ].filter(Boolean);

        table?.querySelectorAll("a[href]").forEach(link => {
            const label = foldText(link.textContent);
            const imageSources = Array.from(link.querySelectorAll("img"))
                .map(image => String(image.getAttribute("src") || "").toLowerCase())
                .join(" ");
            const hasActionImage = Boolean(link.querySelector("img"))
                && !/(?:cal|calendar|kalendar|druk|print|pdf)/i.test(imageSources);
            if (label.includes("zmien") || hasActionImage) {
                link.dataset.taIntranetAction = "change-field";
                link.setAttribute("aria-label", "Zapisz zmianę");
            }
        });

        const orderId = new URLSearchParams(location.search).get("id_o") || "";
        const header = document.createElement("header");
        header.className = "ta-order-details-header";
        header.innerHTML = `
            <div class="ta-order-details-mark" aria-hidden="true">C</div>
            <div>
                <span>CEMET SERWIS</span>
                <h1>Szczegóły zlecenia</h1>
                ${orderId ? `<p>Numer techniczny: ${escapeHtml(orderId)}</p>` : ""}
            </div>
        `;
        const insertionParent = table?.parentNode || document.body;
        const insertionPoint = table || insertionParent.firstChild;
        insertionParent.insertBefore(header, insertionPoint);
        const quickCorrectionPanel = createQuickCorrectionPanel(orderId);
        const embeddedCorrection = embedCorrectionControls(quickCorrectionPanel, detailsRows);
        const dateCorrection = embedDateCorrectionControls(quickCorrectionPanel, detailsRows);
        const closeTables = Array.from(document.querySelectorAll("table")).filter(candidate => {
            if (candidate === table || candidate.contains(table) || table?.contains(candidate)) return false;
            const closeLink = Array.from(candidate.querySelectorAll("a"))
                .find(link => foldText(link.textContent) === "zamknij");
            return Boolean(closeLink) && foldText(candidate.textContent) === "zamknij";
        });
        closeTables.forEach(candidate => setRole(candidate, "order-details-close"));
        const closeLinks = closeTables.flatMap(candidate => Array.from(candidate.querySelectorAll("a")))
            .filter(link => foldText(link.textContent) === "zamknij");
        closeLinks.forEach(link => {
            link.addEventListener("click", event => {
                if (!orderDetailsPageState?.savePending) return;
                event.preventDefault();
                event.stopImmediatePropagation();
            }, true);
        });

        document.addEventListener("submit", event => {
            const submittedForm = event.target;
            if (!(submittedForm instanceof HTMLFormElement)) return;
            const actionPath = normalizePathname(new URL(
                submittedForm.getAttribute("action") || location.href,
                location.href
            ).pathname);
            if (!ORDER_DETAILS_PATH_PATTERN.test(actionPath)) return;
            if (!orderDetailsPageState?.saveOperationTokens?.size) beginOrderDetailsSave();
        }, true);

        orderDetailsPageState = {
            table,
            form,
            header,
            quickCorrectionPanel,
            embeddedCorrection,
            dateCorrection,
            paymentState,
            deliveryState,
            paymentField,
            deliveryField,
            closeLinks,
            savePending: false,
            saveOperationTokens: new Set(),
            dynamicSearches,
            consolidatedLayout
        };
        document.documentElement.classList.add("ta-intranet-page-order-details");
        centerOrderDetailsPopup();
        return true;
    }

    function setOrderDetailsMode(mode) {
        const state = orderDetailsPageState;
        if (!state) return;
        if (mode === MODE_MODERN) {
            state.consolidatedLayout?.activate();
            if (state.paymentField) {
                state.paymentField.readOnly = false;
                state.paymentField.disabled = false;
            }
            if (state.deliveryField) {
                state.deliveryField.readOnly = false;
                state.deliveryField.disabled = false;
            }
            state.quickCorrectionPanel?._taInitialize?.();
            centerOrderDetailsPopup();
            return;
        }
        restoreFieldState(state.paymentState);
        restoreFieldState(state.deliveryState);
        state.dynamicSearches?.forEach(search => search.reset());
        state.consolidatedLayout?.deactivate();
    }

    function getReportRowLabel(row) {
        const cells = Array.from(row?.cells || []);
        return foldText(cells[0]?.textContent || "");
    }

    function findReportCriteriaTable(mainCell, expectedLabels, minimumMatches = 3) {
        return Array.from(mainCell?.querySelectorAll("table") || []).find(table => {
            const rows = getDirectTableRows(table);
            if (!rows.length || !table.querySelector('input:not([type="hidden"]), select, textarea')) return false;
            const labels = rows.map(getReportRowLabel);
            const matches = expectedLabels.filter(pattern => labels.some(label => pattern.test(label))).length;
            return matches >= minimumMatches;
        }) || null;
    }

    function markReportCriteriaTable(table, reportId) {
        if (!table) return false;
        setRole(table, "report-criteria-table");
        table.dataset.taReportCriteria = reportId;
        getDirectTableRows(table).forEach(row => {
            const cells = Array.from(row.cells || []);
            if (!cells.length) return;
            row.dataset.taReportCriteriaRow = "true";
            cells[0].dataset.taReportCriteriaLabel = "true";
            if (cells[1]) cells[1].dataset.taReportCriteriaValue = "true";
        });
        return true;
    }

    function enhanceReportDateInput(source, key) {
        if (!source || source.dataset.taReportDateSource === "true") return null;
        const cell = source.closest("td") || source.parentElement;
        if (!cell) return null;
        const current = String(source.value || "").trim();
        const parseReportDate = value => {
            const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(value || "").trim());
            if (!match) return null;
            const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
            if (Number.isNaN(date.getTime())
                || date.getFullYear() !== Number(match[1])
                || date.getMonth() !== Number(match[2]) - 1
                || date.getDate() !== Number(match[3])) return null;
            return date;
        };
        const originalUsesPaddedDate = /^\d{4}-\d{2}-\d{2}$/.test(current);
        const formatSourceDate = date => originalUsesPaddedDate
            ? formatIsoDate(date)
            : `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        const parsedCurrent = current ? parseReportDate(current) : null;
        if (current && !parsedCurrent) return null;
        source.dataset.taReportDateSource = "true";

        const control = document.createElement("div");
        control.className = "ta-report-date-control";
        control.dataset.taReportDate = key;
        control.innerHTML = `
            <button type="button" data-report-date-shift="-1" aria-label="Poprzedni dzień" title="Poprzedni dzień">‹</button>
            <input type="date" aria-label="Wybierz datę" value="${escapeHtml(parsedCurrent ? formatIsoDate(parsedCurrent) : "")}">
            <button type="button" data-report-date-shift="1" aria-label="Następny dzień" title="Następny dzień">›</button>
        `;
        const picker = control.querySelector('input[type="date"]');
        const commit = value => {
            if (value && !parseIsoDate(value)) return;
            picker.value = value;
            const parsed = value ? parseReportDate(value) : null;
            source.value = parsed ? formatSourceDate(parsed) : "";
            source.dispatchEvent(new Event("input", { bubbles: true }));
            source.dispatchEvent(new Event("change", { bubbles: true }));
        };
        picker.addEventListener("change", () => commit(picker.value));
        source.addEventListener("input", () => {
            const parsed = parseReportDate(source.value);
            if (!source.value || parsed) picker.value = parsed ? formatIsoDate(parsed) : "";
        });
        control.addEventListener("click", event => {
            const shift = Number(event.target.closest("button[data-report-date-shift]")?.dataset.reportDateShift || 0);
            if (!shift) return;
            const date = parseReportDate(picker.value || source.value) || new Date();
            date.setDate(date.getDate() + shift);
            commit(formatIsoDate(date));
        });
        source.classList.add("ta-report-native-date-source");
        Array.from(cell.querySelectorAll("a, img, input[type='image']")).forEach(element => {
            if (element === source) return;
            const link = element.closest("a");
            if (element.tagName === "IMG" || link?.querySelector("img")) {
                (link || element).classList.add("ta-report-legacy-calendar-trigger");
            }
        });
        cell.insertBefore(control, source);
        return { source, picker, control, commit };
    }

    function enhanceReportDateRows(table) {
        if (!table) return [];
        const enhanced = [];
        getDirectTableRows(table).forEach((row, rowIndex) => {
            if (!/\bdata\b|data zaladunku/.test(getReportRowLabel(row))) return;
            const inputs = Array.from(row.querySelectorAll('input[type="text"]'))
                .filter(input => !input.disabled);
            inputs.forEach((input, inputIndex) => {
                const result = enhanceReportDateInput(input, `${rowIndex + 1}-${inputIndex + 1}`);
                if (result) enhanced.push(result);
            });
        });
        return enhanced;
    }

    function enhanceCarrierFreightDateRange(table, enhancedDates) {
        if (!table || !enhancedDates?.length) return null;
        const from = enhancedDates.find(item => /^(?:data_z_od)$/i.test(item.source.name || item.source.id || ""));
        const to = enhancedDates.find(item => /^(?:data_r_do)$/i.test(item.source.name || item.source.id || ""));
        if (!from || !to) return null;
        const row = from.source.closest("tr");
        const valueCell = from.source.closest("td");
        if (!row || !valueCell || !row.contains(to.source)) return null;
        if (valueCell.querySelector(".ta-carrier-freight-date-range")) {
            return valueCell.querySelector(".ta-carrier-freight-date-range");
        }

        const range = document.createElement("div");
        range.className = "ta-carrier-freight-date-range";
        const createField = (label, state) => {
            const field = document.createElement("label");
            field.className = "ta-carrier-freight-date-field";
            const caption = document.createElement("span");
            caption.textContent = label;
            field.append(caption, state.control);
            return field;
        };
        range.append(createField("OD", from), createField("DO", to));
        valueCell.dataset.taCarrierFreightDateRangeCell = "true";
        valueCell.appendChild(range);

        from.picker.addEventListener("change", () => {
            const start = parseIsoDate(from.picker.value);
            if (!start) return;
            start.setDate(start.getDate() + 7);
            to.commit(formatIsoDate(start));
        });
        return range;
    }

    function addReportSubmitProxy(mainCell, label) {
        if (mainCell?.querySelector(".ta-report-submit-proxy")) return null;
        const nativeSubmit = Array.from(mainCell?.querySelectorAll('input[type="image"]') || []).find(input => {
            const text = foldText(`${input.alt || ""} ${input.title || ""} ${input.parentElement?.textContent || ""}`);
            return /dalej|szukaj/.test(text);
        }) || null;
        if (!nativeSubmit) return null;
        nativeSubmit.dataset.taReportNativeSubmit = "true";
        markNativeSubmitCaption(nativeSubmit);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "ta-report-submit-proxy";
        button.textContent = label;
        button.addEventListener("click", () => nativeSubmit.click());
        nativeSubmit.insertAdjacentElement("afterend", button);
        return button;
    }

    function createReportPageHeader(mainCell, target, title, description, eyebrow = "CEMET SERWIS") {
        let header = mainCell?.querySelector(".ta-report-page-header") || null;
        if (header) return header;
        header = document.createElement("header");
        header.className = "ta-report-page-header";
        header.innerHTML = `
            <span>${escapeHtml(eyebrow)}</span>
            <h1>${escapeHtml(title)}</h1>
            <p>${escapeHtml(description)}</p>
        `;
        target?.parentNode?.insertBefore(header, target);
        return header;
    }

    function findCarrierFreightResultTable(mainCell) {
        return Array.from(mainCell?.querySelectorAll("table") || []).find(table =>
            getDirectTableRows(table).some(row => {
                const labels = Array.from(row.cells || []).map(cell => foldText(cell.textContent));
                return row.cells?.length >= CARRIER_FREIGHT_REPORT_COLUMNS.length
                    && labels.some(label => /nr\.? zlecenia/.test(label))
                    && labels.some(label => label === "relacja")
                    && labels.some(label => label === "fracht")
                    && labels.some(label => /kierowca/.test(label));
            })
        ) || null;
    }

    function markCarrierFreightResultTable(table) {
        if (!table) return 0;
        setRole(table, "carrier-freight-results");
        const rows = getDirectTableRows(table);
        const headerIndex = rows.findIndex(row => {
            const labels = Array.from(row.cells || []).map(cell => foldText(cell.textContent));
            return row.cells?.length >= CARRIER_FREIGHT_REPORT_COLUMNS.length
                && labels.some(label => /nr\.? zlecenia/.test(label))
                && labels.some(label => label === "relacja");
        });
        let count = 0;
        rows.forEach((row, index) => {
            const cells = Array.from(row.cells || []);
            const isOrderRow = index > headerIndex
                && cells.length === CARRIER_FREIGHT_REPORT_COLUMNS.length
                && cells.some(cell => /(?:^|\s)raport_n[12](?:\s|$)/.test(cell.className || ""));
            if (index === headerIndex) row.dataset.taCarrierFreightRow = "header";
            else if (isOrderRow) {
                row.dataset.taCarrierFreightRow = "item";
                row.dataset.taCarrierFreightStripe = String(count % 2);
                count += 1;
            } else if (index > headerIndex) row.dataset.taCarrierFreightRow = "summary";
            if (cells.length === CARRIER_FREIGHT_REPORT_COLUMNS.length) {
                cells.forEach((cell, cellIndex) => {
                    cell.dataset.taCarrierFreightColumn = CARRIER_FREIGHT_REPORT_COLUMNS[cellIndex];
                });
            }
        });
        return count;
    }

    function copyComputedStylesForSnapshot(sourceRoot, cloneRoot) {
        const sources = [sourceRoot, ...sourceRoot.querySelectorAll("*")];
        const clones = [cloneRoot, ...cloneRoot.querySelectorAll("*")];
        sources.forEach((source, index) => {
            const target = clones[index];
            if (!target) return;
            const computed = window.getComputedStyle(source);
            for (const property of computed) {
                target.style.setProperty(property, computed.getPropertyValue(property), computed.getPropertyPriority(property));
            }
        });
    }

    function renderReportTableToPng(table) {
        return new Promise((resolve, reject) => {
            const width = Math.ceil(Math.max(table.scrollWidth, table.getBoundingClientRect().width));
            const height = Math.ceil(Math.max(table.scrollHeight, table.getBoundingClientRect().height));
            if (!width || !height) {
                reject(new Error("Tabela raportu nie ma wymiarów do wykonania zrzutu."));
                return;
            }
            const clone = table.cloneNode(true);
            copyComputedStylesForSnapshot(table, clone);
            clone.style.setProperty("width", `${width}px`, "important");
            clone.style.setProperty("min-width", "0", "important");
            clone.style.setProperty("margin", "0", "important");

            const wrapper = document.createElement("div");
            wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
            wrapper.style.cssText = `box-sizing:border-box;width:${width}px;height:${height}px;margin:0;background:#fff;overflow:hidden;`;
            wrapper.appendChild(clone);
            const markup = new XMLSerializer().serializeToString(wrapper);
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><foreignObject width="100%" height="100%">${markup}</foreignObject></svg>`;
            const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
            const image = new Image();
            image.onload = () => {
                URL.revokeObjectURL(svgUrl);
                const maxPixels = 36_000_000;
                const desiredScale = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2);
                const safeScale = Math.min(desiredScale, Math.sqrt(maxPixels / (width * height)));
                const scale = Math.max(.5, safeScale);
                const canvas = document.createElement("canvas");
                canvas.width = Math.max(1, Math.round(width * scale));
                canvas.height = Math.max(1, Math.round(height * scale));
                const context = canvas.getContext("2d");
                if (!context) {
                    reject(new Error("Przeglądarka nie udostępniła płótna do wykonania zrzutu."));
                    return;
                }
                context.setTransform(scale, 0, 0, scale, 0, 0);
                context.fillStyle = "#fff";
                context.fillRect(0, 0, width, height);
                context.drawImage(image, 0, 0, width, height);
                canvas.toBlob(blob => {
                    if (blob) resolve(blob);
                    else reject(new Error("Nie udało się utworzyć obrazu PNG."));
                }, "image/png");
            };
            image.onerror = () => {
                URL.revokeObjectURL(svgUrl);
                reject(new Error("Nie udało się wyrenderować tabeli raportu."));
            };
            image.src = svgUrl;
        });
    }

    async function copyCarrierFreightReportSnapshot(resultTable, button) {
        if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
            throw new Error("Ta przeglądarka nie udostępnia zapisu obrazu do schowka.");
        }
        const blob = await renderReportTableToPng(resultTable);
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        button.dataset.taSnapshotState = "success";
    }

    function enhanceCarrierFreightLookup(mainCell) {
        const carrierRow = Array.from(mainCell?.querySelectorAll("tr") || []).find(row =>
            /^przewoznik\b/.test(getReportRowLabel(row)) && row.querySelector('input[type="text"]')
        ) || null;
        const input = mainCell?.querySelector('input#k_id, input[name="k_id"]')
            || carrierRow?.querySelector('input[type="text"]')
            || null;
        if (!input) return null;
        const results = mainCell.querySelector("#results3, #results, [id*='result' i]");
        const cell = input.closest("td") || input.parentElement;
        input.dataset.taCarrierFreightLookup = "true";
        cell?.setAttribute("data-ta-carrier-freight-lookup-cell", "true");
        results?.setAttribute("data-ta-carrier-freight-suggestions", "true");
        const submitScope = carrierRow || cell;
        const submit = Array.from(submitScope?.querySelectorAll('input[type="submit"], input[type="button"], button') || [])
            .find(control => /wybierz|szukaj/.test(foldText(control.value || control.textContent))) || null;
        if (submit) submit.dataset.taCarrierFreightLookupAction = "true";
        return { input, results, cell, submit };
    }

    function enhanceCarrierFreightExports(mainCell, resultTable) {
        if (!resultTable) return null;
        const nativeControls = Array.from(mainCell?.querySelectorAll('input[type="image"]') || []).filter(control => {
            if (resultTable.contains(control)) return false;
            const source = String(control.getAttribute("src") || "");
            const formAction = String(control.closest("form")?.action || "");
            return /ikona_drukuj|logo_excel/i.test(source) || /drukuj_r1|generuj\.php/i.test(formAction);
        });
        if (!nativeControls.length) return null;

        let toolbar = mainCell.querySelector(".ta-carrier-freight-export-toolbar");
        if (!toolbar) {
            toolbar = document.createElement("div");
            toolbar.className = "ta-carrier-freight-export-toolbar";
            resultTable.parentNode?.insertBefore(toolbar, resultTable);
        }
        nativeControls.forEach(control => {
            if (control.dataset.taCarrierFreightNativeExport === "true") return;
            const source = foldText(control.getAttribute("src") || "");
            const action = foldText(control.closest("form")?.action || "");
            const kind = /logo[_\s-]*excel|generuj\.php/.test(`${source} ${action}`) ? "excel" : "print";
            const label = kind === "excel" ? "Eksport Excel" : "Drukuj raport";
            control.dataset.taCarrierFreightNativeExport = "true";
            const button = document.createElement("button");
            button.type = "button";
            button.dataset.taCarrierFreightExport = kind;
            button.innerHTML = `<span aria-hidden="true">${kind === "excel" ? "XLS" : "↗"}</span>${escapeHtml(label)}`;
            button.addEventListener("click", () => control.click());
            toolbar.appendChild(button);
        });
        if (!toolbar.querySelector('[data-ta-carrier-freight-export="snapshot"]')) {
            const snapshot = document.createElement("button");
            snapshot.type = "button";
            snapshot.dataset.taCarrierFreightExport = "snapshot";
            const defaultMarkup = '<span aria-hidden="true">▣</span><span>Zrzut raportu</span>';
            const restoreSnapshotButton = () => {
                snapshot.innerHTML = defaultMarkup;
                snapshot.title = "Kopiuj widoczną tabelę raportu do schowka jako obraz PNG";
                delete snapshot.dataset.taSnapshotState;
            };
            restoreSnapshotButton();
            snapshot.addEventListener("click", async () => {
                if (snapshot.disabled) return;
                snapshot.disabled = true;
                snapshot.textContent = "Tworzę zrzut…";
                try {
                    await copyCarrierFreightReportSnapshot(resultTable, snapshot);
                    snapshot.textContent = "Skopiowano";
                    window.setTimeout(restoreSnapshotButton, 1800);
                } catch (error) {
                    console.error(`[Trans Assistant Intranet Modern UI ${SCRIPT_VERSION}] Zrzut raportu nie został skopiowany.`, error);
                    snapshot.dataset.taSnapshotState = "error";
                    snapshot.textContent = "Błąd schowka";
                    snapshot.title = error?.message || String(error);
                    window.setTimeout(restoreSnapshotButton, 3500);
                } finally {
                    snapshot.disabled = false;
                }
            });
            toolbar.appendChild(snapshot);
        }
        return toolbar;
    }

    function mountCarrierFreightReportPage() {
        if (!mountIntranetShell()) return false;
        const mainCell = document.querySelector('[data-ta-intranet-role="main-content"]');
        if (!mainCell) return false;
        let criteriaTable = findReportCriteriaTable(mainCell, [
            /^przewoznik\b/, /^wybrany przewoznik\b/, /^nr\.? zlecenia\b/, /^data\b/
        ], 2);
        const resultTable = findCarrierFreightResultTable(mainCell);
        const lookup = enhanceCarrierFreightLookup(mainCell);
        if (!criteriaTable && lookup?.input) criteriaTable = lookup.input.closest("table");
        if (!criteriaTable && !resultTable && !lookup) return false;
        markReportCriteriaTable(criteriaTable, "carrier-freight");
        const enhancedDates = enhanceReportDateRows(criteriaTable);
        const dateRange = enhanceCarrierFreightDateRange(criteriaTable, enhancedDates);
        addReportSubmitProxy(mainCell, "Szukaj");
        const itemCount = markCarrierFreightResultTable(resultTable);
        const exportToolbar = enhanceCarrierFreightExports(mainCell, resultTable);
        const target = criteriaTable || exportToolbar || resultTable || lookup?.cell;
        const legacyTitle = Array.from(mainCell.querySelectorAll("td, b, strong"))
            .find(element => /data od:|fracht\s*-\s*przewoznicy/.test(foldText(element.textContent || ""))) || null;
        if (legacyTitle) legacyTitle.dataset.taCarrierFreightLegacyTitle = "true";
        const description = resultTable
            ? `${itemCount} ${itemCount === 1 ? "zlecenie" : "zleceń"} w wybranym okresie`
            : "Wybierz przewoźnika, numer zlecenia lub zakres dat";
        const header = createReportPageHeader(mainCell, target, "Fracht – Przewoźnicy", description, "RAPORTY");
        const viewport = resultTable ? createOrdersViewport(resultTable) : null;
        document.documentElement.classList.add("ta-intranet-page-carrier-freight-report");
        carrierFreightReportState = { mainCell, criteriaTable, resultTable, lookup, exportToolbar, header, viewport, dateRange };
        return true;
    }

    function setCarrierFreightReportMode(mode) {
        if (!carrierFreightReportState) return;
        if (mode === MODE_MODERN) carrierFreightReportState.viewport?.activate();
        else carrierFreightReportState.viewport?.deactivate();
    }

    function findOrderRegisterReportTable(mainCell = document) {
        return Array.from(mainCell?.querySelectorAll("table") || []).find(table => {
            const rows = Array.from(table.rows || []).filter(row => row.closest("table") === table);
            const header = rows[0];
            if (header?.cells?.length !== ORDER_REGISTER_REPORT_COLUMNS.length) return false;
            return Array.from(header.cells).every(cell => cell.classList.contains("raport_n"));
        }) || null;
    }

    function parseOrderRegisterNumber(value) {
        const normalized = String(value || "")
            .replace(/[\u00a0\u202f\s]/g, "")
            .replace(/\./g, "")
            .replace(",", ".")
            .replace(/[^\d.-]/g, "");
        if (!normalized || normalized === "-" || normalized === ".") return null;
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : null;
    }

    function formatOrderRegisterPercent(value) {
        return `${Number(value).toFixed(2).replace(".", ",")} %`;
    }

    function normalizeOrderRegisterMarginPercentages(table, summaryRow) {
        Array.from(table?.querySelectorAll('[data-ta-order-register-row="order"]') || []).forEach(row => {
            const offer = parseOrderRegisterNumber(row.querySelector('[data-ta-order-register-column="offer-freight"]')?.textContent);
            const margin = parseOrderRegisterNumber(row.querySelector('[data-ta-order-register-column="margin"]')?.textContent);
            const percentCell = row.querySelector('[data-ta-order-register-column="margin-percent"]');
            if (!(offer > 0) || margin === null || !percentCell) return;
            const expected = margin / offer * 100;
            const current = parseOrderRegisterNumber(percentCell.textContent);
            if (current === null || Math.abs(current - expected) > .01) {
                percentCell.textContent = formatOrderRegisterPercent(expected);
                percentCell.dataset.taOrderRegisterMarginCorrected = "true";
            }
            percentCell.title = "Marża / Fracht O × 100";
        });

        const cells = Array.from(summaryRow?.cells || []);
        if (cells.length !== 8) return;
        const offerTotal = parseOrderRegisterNumber(cells[2].textContent);
        const marginTotal = parseOrderRegisterNumber(cells[5].textContent);
        const marginPercentCell = cells[6];
        const trailingBlank = cells[7];
        const freightSkBlank = document.createElement("td");
        freightSkBlank.className = marginTotalCellClass(cells[5]);
        freightSkBlank.align = "center";
        freightSkBlank.innerHTML = "&nbsp;";
        freightSkBlank.dataset.taOrderRegisterSummaryColumn = "freight-sk";
        cells[5].dataset.taOrderRegisterSummaryColumn = "margin";
        marginPercentCell.dataset.taOrderRegisterSummaryColumn = "margin-percent";
        summaryRow.insertBefore(freightSkBlank, cells[5]);
        trailingBlank.colSpan = 3;
        summaryRow.insertBefore(trailingBlank, marginPercentCell);
        if (offerTotal > 0 && marginTotal !== null) {
            marginPercentCell.textContent = formatOrderRegisterPercent(marginTotal / offerTotal * 100);
            marginPercentCell.title = "Suma marży / suma Fracht O × 100";
            marginPercentCell.dataset.taOrderRegisterMarginCorrected = "true";
        }
    }

    function marginTotalCellClass(cell) {
        return cell?.className || "raport_n";
    }

    function markOrderRegisterReportTable(table) {
        if (!table) return { itemCount: 0, headerRow: null, summaryRow: null };
        setRole(table, "order-register-table");
        const rows = Array.from(table.rows || []).filter(row => row.closest("table") === table);
        const headerRow = rows[0]?.cells?.length === ORDER_REGISTER_REPORT_COLUMNS.length ? rows[0] : null;
        if (headerRow) {
            headerRow.dataset.taOrderRegisterRow = "header";
            Array.from(headerRow.cells).forEach((cell, index) => {
                cell.dataset.taOrderRegisterColumn = ORDER_REGISTER_REPORT_COLUMNS[index];
            });
        }

        let itemCount = 0;
        let summaryRow = null;
        rows.slice(headerRow ? 1 : 0).forEach((row, rowIndex) => {
            const cells = Array.from(row.cells || []);
            if (cells.length === ORDER_REGISTER_REPORT_COLUMNS.length) {
                row.dataset.taOrderRegisterRow = "order";
                row.dataset.taOrderRegisterStripe = String(rowIndex % 2);
                cells.forEach((cell, index) => {
                    cell.dataset.taOrderRegisterColumn = ORDER_REGISTER_REPORT_COLUMNS[index];
                });
                itemCount += 1;
                return;
            }
            row.dataset.taOrderRegisterRow = "summary";
            summaryRow = row;
        });
        normalizeOrderRegisterMarginPercentages(table, summaryRow);
        return { itemCount, headerRow, summaryRow };
    }

    function enhanceOrderRegisterExports(mainCell, reportTable) {
        const links = Array.from(mainCell?.querySelectorAll("a[href]") || []).filter(link => {
            try {
                const url = new URL(link.getAttribute("href") || link.href, location.href);
                return url.origin === location.origin
                    && /\/raporty\/plik\/[^/]+\.csv$/i.test(normalizePathname(url.pathname));
            } catch (_) {
                return false;
            }
        });
        if (!links.length) return null;
        const toolbar = links[0].closest("table");
        if (toolbar === reportTable) return null;
        setRole(toolbar, "order-register-exports");
        links.forEach((link, index) => {
            link.dataset.taOrderRegisterExport = String(index + 1);
            link.setAttribute("title", index === 0 ? "Pobierz rejestr zleceń CSV" : "Pobierz drugi wariant rejestru CSV");
            if (!link.querySelector(".ta-order-register-export-label")) {
                const label = document.createElement("span");
                label.className = "ta-order-register-export-label";
                label.textContent = index === 0 ? "Pobierz CSV" : "Pobierz CSV 2";
                link.appendChild(label);
            }
        });
        return toolbar;
    }

    function createOrderRegisterHeader(mainCell, reportTable, itemCount) {
        let header = mainCell?.querySelector(".ta-order-register-header") || null;
        if (header) return header;
        header = document.createElement("section");
        header.className = "ta-order-register-header";
        header.setAttribute("aria-label", "Rejestr zleceń");
        header.innerHTML = `
            <div>
                <span>CEMET SERWIS</span>
                <h1>Rejestr zleceń</h1>
                <p>Widocznych pozycji: ${itemCount}</p>
            </div>
        `;
        const exports = Array.from(mainCell?.querySelectorAll("[data-ta-order-register-export]") || []);
        if (exports.length) {
            const actions = document.createElement("div");
            actions.className = "ta-order-register-header-actions";
            exports.forEach((source, index) => {
                const action = document.createElement("a");
                action.className = "ta-order-register-export-action";
                action.href = source.href;
                action.target = source.target || "_blank";
                action.rel = "noopener";
                action.textContent = `Eksport CSV ${index + 1}`;
                action.title = source.title;
                actions.appendChild(action);
            });
            header.appendChild(actions);
        }
        mainCell?.insertBefore(header, reportTable?.parentNode === mainCell ? reportTable : mainCell.firstChild);
        return header;
    }

    function setOrderRegisterReportMode(mode) {
        if (!orderRegisterReportState) return;
        if (mode === MODE_MODERN) orderRegisterReportState.viewport?.activate();
        else orderRegisterReportState.viewport?.deactivate();
    }

    function mountOrderRegisterReportPage() {
        if (!mountIntranetShell()) return false;
        const shell = document.querySelector('[data-ta-intranet-role="page-shell"]');
        const mainCell = shell?.rows?.[0]?.cells?.[1] || null;
        if (!mainCell) return false;
        const reportTable = findOrderRegisterReportTable(mainCell);
        const criteriaTable = findReportCriteriaTable(mainCell, [
            /^kontrahent\b/, /^przewoznik\b/, /^jaka spedycja\b/,
            /^status zlecenia\b/, /^data zaladunku\b/
        ], 3);
        if (!reportTable && !criteriaTable) return false;

        const marked = reportTable
            ? markOrderRegisterReportTable(reportTable)
            : { itemCount: 0, summaryRow: null };
        const exportToolbar = reportTable ? enhanceOrderRegisterExports(mainCell, reportTable) : null;
        if (criteriaTable) {
            markReportCriteriaTable(criteriaTable, "order-register");
            enhanceReportDateRows(criteriaTable);
            addReportSubmitProxy(mainCell, "Wyszukaj zlecenia");
        }
        const target = criteriaTable || exportToolbar || reportTable;
        const header = reportTable
            ? createOrderRegisterHeader(mainCell, exportToolbar || reportTable, marked.itemCount)
            : createReportPageHeader(mainCell, target, "Rejestr zleceń", "Wybierz kryteria wyszukiwania", "RAPORTY");
        const viewport = reportTable ? createOrdersViewport(reportTable) : null;
        orderRegisterReportState = { mainCell, criteriaTable, reportTable, exportToolbar, header, viewport, ...marked };
        document.documentElement.classList.add("ta-intranet-page-order-register-report");
        return true;
    }

    function mountIntranetShell() {
        if (!document.body) return false;
        const bodyTables = getDirectBodyTables();
        markTopHeader(bodyTables[0]);
        const shell = setRole(findPageShellTable(bodyTables), "page-shell");
        const breadcrumb = bodyTables.find(table => table !== bodyTables[0] && table !== shell) || null;
        setRole(breadcrumb, "breadcrumb");
        if (shell?.rows?.[0]?.cells?.length >= 2) {
            const sideCell = shell.rows[0].cells[0];
            const mainCell = markSideNavigation(shell);
            activateFirstSideNavigationItem(sideCell, mainCell);
        }
        return true;
    }

    function mountGenericIntranetPage() {
        if (!mountIntranetShell()) return false;
        document.documentElement.classList.add("ta-intranet-page-generic");
        return true;
    }

    function sanitizeLegacyDriverSearchWarnings(container) {
        if (!(container instanceof Element)) return false;
        const before = container.innerHTML;
        const after = before.replace(
            /Warning:\s*htmlspecialchars\(\):\s*charset\s*(?:['"]|&(?:apos|quot|#0*39|#0*34);)?ISO-8859-2(?:['"]|&(?:apos|quot|#0*39|#0*34);)?\s*not\s+supported,\s*assuming\s+iso-8859-1\s+in\s+[^<]*?administracja\/lib3\/search\.php\s+on\s+line\s+\d+(?:\s*<br\s*\/?\s*>)?/gi,
            ""
        );
        if (after === before) return false;
        container.innerHTML = after.trim();
        return true;
    }

    function installLegacyDriverSearchWarningFilter() {
        const root = document.documentElement;
        if (!document.body || root.dataset.taDriverSearchWarningFilter === "true") return;
        root.dataset.taDriverSearchWarningFilter = "true";
        const sanitizeAll = scope => {
            if (scope instanceof Element && /^results\d*$/i.test(scope.id || "")) {
                sanitizeLegacyDriverSearchWarnings(scope);
            }
            scope?.querySelectorAll?.('[id^="results"]')
                .forEach(sanitizeLegacyDriverSearchWarnings);
        };
        sanitizeAll(document.body);
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => sanitizeAll(mutation.target));
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function mountDriverBrowsePage() {
        if (!mountGenericIntranetPage()) return false;
        installLegacyDriverSearchWarningFilter();
        document.documentElement.classList.add("ta-intranet-page-driver-browse");
        return true;
    }

    function findOptionByText(select, expectedText) {
        const expected = foldText(expectedText);
        return Array.from(select?.options || []).find(option => foldText(option.textContent) === expected)
            || Array.from(select?.options || []).find(option => foldText(option.textContent).includes(expected))
            || null;
    }

    function showSeamlessLoginFallback(form, message) {
        let status = form.querySelector(".ta-login-seamless-error");
        if (!status) {
            status = document.createElement("div");
            status.className = "ta-login-seamless-error";
            status.setAttribute("role", "alert");
            form.appendChild(status);
        }
        status.textContent = message;
    }

    function installSeamlessLoginFlow(form, root) {
        if (!form || form.dataset.taSeamlessLogin === "true") return false;
        form.dataset.taSeamlessLogin = "true";

        const frame = document.createElement("iframe");
        frame.name = LOGIN_FLOW_FRAME_NAME;
        frame.setAttribute("aria-hidden", "true");
        frame.tabIndex = -1;
        frame.hidden = true;
        frame.style.display = "none";
        document.body.appendChild(frame);

        const originalTarget = form.getAttribute("target");
        let flowStarted = false;
        let completed = false;
        let timeoutId = 0;

        const restoreTarget = () => {
            if (originalTarget === null) form.removeAttribute("target");
            else form.setAttribute("target", originalTarget);
        };

        const stopFlow = () => {
            if (timeoutId) window.clearTimeout(timeoutId);
            timeoutId = 0;
            restoreTarget();
            frame.remove();
        };

        const fallback = reason => {
            if (completed) return;
            completed = true;
            stopFlow();
            clearLoginTransition();
            root.classList.remove("ta-login-auto-forward");
            root.classList.add("ta-login-forward-fallback");
            console.warn(`[Trans Assistant Intranet Modern UI ${SCRIPT_VERSION}] Logowanie płynne przerwane: ${reason}`);
            showSeamlessLoginFallback(
                form,
                "Automatyczne przejście nie powiodło się. Formularz pozostał bezpiecznie otwarty — zaloguj się ponownie klasycznie."
            );
        };

        frame.addEventListener("load", () => {
            if (!flowStarted || completed) return;

            let frameDocument;
            let framePathname;
            try {
                const frameHref = frame.contentWindow?.location?.href || "";
                if (!frameHref || frameHref === "about:blank") return;
                frameDocument = frame.contentDocument;
                framePathname = normalizePathname(new URL(frameHref, location.href).pathname);
            } catch (error) {
                fallback(`brak dostępu do etapu pośredniego (${error?.message || error})`);
                return;
            }

            if (LOGIN_PATH_PATTERN.test(framePathname)) {
                const applicationSelect = frameDocument?.querySelector('select[name="wybor_aplikacji"]');
                const applicationForm = applicationSelect?.form;
                const forwardingService = findOptionByText(applicationSelect, "SPEDYCJA USS");
                if (!applicationSelect || !applicationForm || !forwardingService) {
                    fallback("serwer nie zwrócił wyboru aplikacji SPEDYCJA USS");
                    return;
                }

                applicationSelect.value = forwardingService.value;
                forwardingService.selected = true;
                try {
                    frame.contentWindow.HTMLFormElement.prototype.submit.call(applicationForm);
                } catch (error) {
                    fallback(`nie udało się wysłać wyboru aplikacji (${error?.message || error})`);
                }
                return;
            }

            if (LOGIN_LANDING_PATH_PATTERN.test(framePathname) || ACCEPTED_ORDERS_PATH_PATTERN.test(framePathname)) {
                completed = true;
                if (timeoutId) window.clearTimeout(timeoutId);
                timeoutId = 0;
                location.replace(LOGIN_TARGET_PATH);
                return;
            }

            fallback(`nieoczekiwany adres etapu pośredniego: ${framePathname || "(pusty)"}`);
        });

        form.addEventListener("submit", () => {
            flowStarted = true;
            beginLoginTransition();
            form.target = LOGIN_FLOW_FRAME_NAME;
            timeoutId = window.setTimeout(
                () => fallback("przekroczono limit czasu odpowiedzi intranetu"),
                LOGIN_FLOW_TIMEOUT_MS
            );
        }, { once: true });
        return true;
    }

    function mountLoginPage() {
        if (!document.body) return false;
        const root = document.documentElement;
        const form = document.querySelector('form[action$="/loguj.php"], form[action="loguj.php"]');
        const instanceSelect = form?.querySelector('select[name="pole_baza"]') || null;
        const applicationSelect = form?.querySelector('select[name="wybor_aplikacji"]') || null;
        if (!form || (!instanceSelect && !applicationSelect)) return false;

        root.classList.add("ta-intranet-page-login");
        form.dataset.taLoginForm = applicationSelect ? "application" : "credentials";

        if (instanceSelect) {
            // To jest wyłącznie domyślna instancja. Login, hasło i wysłanie
            // formularza pozostają w całości pod kontrolą użytkownika.
            try { sessionStorage.removeItem(LOGIN_AUTO_FORWARD_KEY); } catch (_) {}
            clearLoginTransition();
            const egeriaService = findOptionByText(instanceSelect, "EGERIA SERWIS");
            if (egeriaService && instanceSelect.value !== egeriaService.value) {
                instanceSelect.value = egeriaService.value;
                egeriaService.selected = true;
            }
            document.querySelectorAll("body img").forEach(image => {
                image.hidden = true;
                image.dataset.taLoginArtwork = "hidden";
            });
            installSeamlessLoginFlow(form, root);
            return true;
        }

        const forwardingService = findOptionByText(applicationSelect, "SPEDYCJA USS");
        if (!forwardingService) return true;

        let lastAttempt = 0;
        try { lastAttempt = Number(sessionStorage.getItem(LOGIN_AUTO_FORWARD_KEY) || 0); } catch (_) {}
        if (Date.now() - lastAttempt < 15000) {
            // Jeżeli natywny mechanizm nie przeszedł dalej, pokazujemy klasyczny
            // wybór aplikacji zamiast tworzyć pętlę przekierowań.
            root.classList.add("ta-login-forward-fallback");
            return true;
        }

        applicationSelect.value = forwardingService.value;
        forwardingService.selected = true;
        beginLoginTransition();
        root.classList.add("ta-login-auto-forward");
        try { sessionStorage.setItem(LOGIN_AUTO_FORWARD_KEY, String(Date.now())); } catch (_) {}
        window.setTimeout(() => {
            applicationSelect.dispatchEvent(new Event("change", { bubbles: true }));
            window.setTimeout(() => {
                if (!LOGIN_PATH_PATTERN.test(normalizePathname()) || !applicationSelect.isConnected) return;
                clearLoginTransition();
                root.classList.remove("ta-login-auto-forward");
                root.classList.add("ta-login-forward-fallback");
            }, 10000);
        }, 0);
        return true;
    }

    function markBusinessFormTable(table, variant, primary = false) {
        if (!table) return false;
        setRole(table, "business-form-table");
        table.dataset.taBusinessForm = variant;
        if (primary) table.dataset.taBusinessFormPrimary = "true";
        Array.from(table.rows || []).forEach(row => {
            if (row.closest("table") !== table) return;
            const cells = Array.from(row.cells || []);
            if (!cells.length) return;
            setRole(row, "business-form-row");
            if (cells[0]) setRole(cells[0], "business-form-label");
            if (cells[1]) setRole(cells[1], "business-form-value");
            if (row.querySelector('input[type="submit"], button[type="submit"]')) {
                row.dataset.taBusinessFormAction = "true";
            }
        });
        return true;
    }

    function enhanceOfferContinueAction(mainCell) {
        const nativeSubmit = Array.from(mainCell?.querySelectorAll('input[type="image"]') || [])
            .find(input => /^dalej$/i.test(String(input.title || input.alt || "").trim()));
        if (!nativeSubmit || nativeSubmit.dataset.taOfferContinueEnhanced === "true") return false;
        nativeSubmit.dataset.taOfferContinueEnhanced = "true";
        nativeSubmit.classList.add("ta-offer-continue-native");
        const cell = nativeSubmit.closest("td") || nativeSubmit.parentElement;
        const row = nativeSubmit.closest("tr");
        if (row) row.dataset.taBusinessFormAction = "true";
        Array.from(cell?.querySelectorAll("b, strong") || []).forEach(label => {
            if (foldText(label.textContent) === "dalej") label.dataset.taOfferContinueDuplicate = "true";
        });
        const button = document.createElement("button");
        button.type = "button";
        button.className = "ta-offer-continue-button";
        button.textContent = "Dalej";
        button.addEventListener("click", () => nativeSubmit.click());
        cell?.appendChild(button);
        return true;
    }

    function findOfferSummaryTable(mainCell) {
        if (!mainCell) return null;
        const expectedLabels = [
            /^kontrahent\b/,
            /^data zaladunku\b/,
            /^data dostawy\b/,
            /^miejsce zaladunku\b/,
            /^miejsce dostawy\b/,
            /^towar\b/,
            /^odleglosc planowana\b/,
            /^kwota ryczaltowa\b/,
            /^planowana wartosc\b/
        ];
        const candidates = Array.from(mainCell.querySelectorAll("table")).map(table => {
            const rows = getDirectTableRows(table);
            const labels = rows.map(row => foldText(row.cells?.[0]?.textContent));
            const score = expectedLabels.reduce(
                (total, pattern) => total + (labels.some(label => pattern.test(label)) ? 1 : 0),
                0
            );
            return { table, score };
        });
        candidates.sort((left, right) => right.score - left.score);
        return candidates[0]?.score >= 4 ? candidates[0].table : null;
    }

    function mountOfferSummaryPage(mainCell) {
        const table = findOfferSummaryTable(mainCell);
        if (!table) return false;
        setRole(table, "offer-summary-table");
        getDirectTableRows(table).forEach(row => {
            const cells = Array.from(row.cells || []);
            if (cells.length < 2) return;
            const label = foldText(cells[0].textContent);
            if (!label) return;
            row.dataset.taOfferSummaryRow = "true";
            setRole(cells[0], "offer-summary-label");
            setRole(cells[1], "offer-summary-value");
            if (/^planowana wartosc\b/.test(label)) {
                row.dataset.taOfferSummaryTotal = "true";
            }
        });

        const titleSource = Array.from(mainCell.querySelectorAll("b, strong, td"))
            .find(element => /^dodanie oferty/.test(foldText(element.textContent)));
        const header = document.createElement("header");
        header.className = "ta-offer-summary-header";
        header.innerHTML = `
            <div class="ta-order-details-mark" aria-hidden="true">C</div>
            <div>
                <span>CEMET SERWIS</span>
                <h1>Podsumowanie oferty</h1>
                <p>Sprawdź dane przed ostatecznym zapisaniem</p>
            </div>
        `;
        table.parentNode?.insertBefore(header, table);
        if (titleSource) titleSource.dataset.taOfferSummaryNativeTitle = "true";

        const actions = Array.from(mainCell.querySelectorAll("a"))
            .filter(link => /^(powrot|zapisz)$/.test(foldText(link.textContent)));
        if (actions.length) {
            const actionBar = document.createElement("div");
            actionBar.className = "ta-offer-summary-actions";
            table.parentNode?.insertBefore(actionBar, table.nextSibling);
            actions.forEach(link => {
                const action = foldText(link.textContent);
                link.dataset.taOfferSummaryAction = action === "zapisz" ? "save" : "back";
                actionBar.appendChild(link);
            });
        }
        return true;
    }

    function parseIsoDate(value) {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || "").trim());
        if (!match) return null;
        const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        return Number.isNaN(date.getTime()) ? null : date;
    }

    function formatIsoDate(date) {
        const pad = value => String(value).padStart(2, "0");
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }

    function enhanceOfferDateRow(row, kind) {
        if (!row || row.querySelector(".ta-offer-date-control")) return null;
        const source = row.querySelector('input:not([type="hidden"]):not([type="submit"]):not([type="image"])');
        const valueCell = source?.closest("td") || row.cells?.[1];
        if (!source || !valueCell || !parseIsoDate(source.value)) return null;

        const control = document.createElement("div");
        control.className = "ta-offer-date-control";
        control.dataset.taOfferDateKind = kind;
        const label = kind === "loading" ? "data załadunku" : "data dostawy";
        control.innerHTML = `
            <button type="button" data-date-shift="-1" title="Poprzedni dzień" aria-label="Ustaw poprzedni dzień dla: ${label}">‹</button>
            <input type="date" aria-label="Wybierz ${label}" value="${escapeHtml(source.value)}">
            <button type="button" data-date-shift="1" title="Następny dzień" aria-label="Ustaw następny dzień dla: ${label}">›</button>
        `;
        const picker = control.querySelector('input[type="date"]');
        const commit = value => {
            if (!parseIsoDate(value)) return;
            picker.value = value;
            source.value = value;
            source.dispatchEvent(new Event("input", { bubbles: true }));
            source.dispatchEvent(new Event("change", { bubbles: true }));
        };
        const syncPickerFromSource = () => {
            const value = String(source.value || "").trim();
            if (parseIsoDate(value) && picker.value !== value) {
                picker.value = value;
            }
        };
        picker.addEventListener("change", () => commit(picker.value));
        source.addEventListener("input", syncPickerFromSource);
        source.addEventListener("change", syncPickerFromSource);
        control.addEventListener("click", event => {
            const shift = Number(event.target.closest("button[data-date-shift]")?.dataset.dateShift || 0);
            if (!shift) return;
            const date = parseIsoDate(picker.value || source.value);
            if (!date) return;
            date.setDate(date.getDate() + shift);
            commit(formatIsoDate(date));
        });

        source.classList.add("ta-offer-native-date-source");
        row.querySelectorAll('a, img, input[type="image"]').forEach(element =>
            element.classList.add("ta-offer-legacy-calendar-trigger")
        );
        valueCell.insertBefore(control, source);
        syncPickerFromSource();
        return { control, source, picker };
    }

    function markOfferRequiredRows(mainCell) {
        const requiredFields = [
            { key: "delivery-place", pattern: /^miejsce dostawy\b/ },
            { key: "cargo", pattern: /^towar\b/ },
            { key: "distance", pattern: /^odleglosc planowana\b/ },
            { key: "freight", pattern: /^kwota ryczalt\s*\/\s*fracht\b/ }
        ];
        const rows = Array.from(mainCell?.querySelectorAll("tr") || []);
        requiredFields.forEach(({ key, pattern }) => {
            const row = rows.find(candidate => pattern.test(foldText(candidate.cells?.[0]?.textContent)));
            if (!row) return;
            row.dataset.taOfferRequired = key;
            row.cells?.[0]?.setAttribute("title", "Pole wymagane");
            const controls = Array.from(row.querySelectorAll(
                'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea'
            ));
            const requiredControl = controls.find(control => control.tagName !== "SELECT") || controls[0] || null;
            const updateState = () => {
                const complete = String(requiredControl?.value || "").trim() !== "";
                row.dataset.taOfferRequiredState = complete ? "complete" : "empty";
            };
            controls.forEach(control => {
                control.addEventListener("input", updateState);
                control.addEventListener("change", updateState);
            });
            updateState();
        });
    }

    function getCarrierOrderRowKey(row) {
        if (row.querySelector("#k_id")) return "carrier-selector";
        if (row.querySelector('[name="kierowca"], [name="i_sam"]')) return "assignment";
        if (row.querySelector('[name="godzina_zal"], [name="minuty_zal"]')) return "loading-time";
        if (row.querySelector('[name="wartosc_zlecenie_przewoznik"]')) return "carrier-value";
        if (row.querySelector('[name="osoba_przyjmujaca_zlecenie"]')) return "receiver";
        if (row.querySelector('[name="trans_id"]')) return "trans-id";
        if (row.querySelector('[name="termin_platnosci_zlecenia"]')) return "payment-term";
        if (row.querySelector('[name="uwagi_nowe"]')) return "notes";
        if (row.querySelector("#war_myto")) return "toll";
        if (row.querySelector("#war_autostrada")) return "motorways";
        if (row.querySelector("#button1")) return "final-action";
        const label = foldText(row.cells?.[0]?.textContent);
        if (/data zaladunku.*data rozladunku/.test(label)) return "route-dates";
        if (/miejsce zaladunku/.test(label)) return "loading-place";
        if (/miejsce dostawy|miejsce rozladunku/.test(label)) return "delivery-place";
        if (/towar/.test(label)) return "cargo";
        if (/masa/.test(label)) return "weight";
        if (/odleglosc/.test(label)) return "distance";
        if (/wartosc oferty/.test(label)) return "offer-value";
        if (/kontrahent/.test(label)) return "carrier-selector";
        if (/wartosc myta/.test(label)) return "toll";
        if (/autostrad/.test(label)) return "motorways";
        if (/osoba zlecajaca/.test(label)) return "other-orderer";
        return "other";
    }

    function refreshCarrierOrderLayout(table) {
        if (!table?.isConnected) return null;
        if (table._taCarrierLayoutRefreshing) return table;
        table._taCarrierLayoutRefreshing = true;
        try {
        markBusinessFormTable(table, "carrier-order", true);
        const tbody = table.tBodies?.[0];
        if (tbody) tbody.classList.add("ta-carrier-order-layout");
        const rowSpans = {
            "route-dates": 12,
            "loading-place": 6,
            "delivery-place": 6,
            cargo: 6,
            weight: 3,
            distance: 6,
            "offer-value": 6,
            "carrier-selector": 12,
            assignment: 12,
            "loading-time": 4,
            "loading-time-placeholder": 4,
            "carrier-value": 4,
            receiver: 6,
            "trans-id": 6,
            "payment-term": 4,
            notes: 12,
            toll: 4,
            motorways: 4,
            "other-orderer": 4,
            "final-action": 12,
            other: 12
        };
        let directRows = Array.from(table.rows || []).filter(row => row.closest("table") === table);
        directRows.forEach(row => {
            if (row.closest("table") !== table) return;
            const key = row.dataset.taCarrierField === "loading-time-placeholder"
                ? "loading-time-placeholder"
                : getCarrierOrderRowKey(row);
            row.dataset.taCarrierField = key;
            row.dataset.taLayoutSpan = String(rowSpans[key] || 12);
            if (key === "carrier-selector") {
                row.dataset.taCarrierSelectorState = row.querySelector("#k_id") ? "search" : "selected";
            }
        });

        const enforceCarrierRow = (pattern, key, span, fallbackIndex) => {
            const row = directRows.find(candidate => pattern.test(foldText(candidate.cells?.[0]?.textContent)))
                || directRows[fallbackIndex]
                || null;
            if (!row) return null;
            row.dataset.taCarrierField = key;
            row.dataset.taLayoutSpan = String(span);
            return row;
        };
        enforceCarrierRow(/data zaladunku.*data rozladunku/, "route-dates", 12, 0);
        enforceCarrierRow(/miejsce zaladunku/, "loading-place", 6, 1);
        enforceCarrierRow(/miejsce (?:dostawy|rozladunku)/, "delivery-place", 6, 2);

        const loadingTimeRow = directRows.find(row => row.dataset.taCarrierField === "loading-time") || null;
        const carrierValueRow = directRows.find(row => row.dataset.taCarrierField === "carrier-value") || null;
        const paymentTermRow = directRows.find(row => row.dataset.taCarrierField === "payment-term") || null;
        const placeholderRows = directRows.filter(row => row.dataset.taCarrierField === "loading-time-placeholder");
        const finalActionRow = directRows.find(row => row.querySelector("#button1")) || null;
        if (finalActionRow) {
            finalActionRow.dataset.taCarrierField = "final-action";
            finalActionRow.dataset.taLayoutSpan = "12";
        }
        if (loadingTimeRow) {
            placeholderRows.forEach(row => row.remove());
        } else if (tbody && carrierValueRow && !placeholderRows.length) {
            const placeholderRow = document.createElement("tr");
            placeholderRow.dataset.taCarrierField = "loading-time-placeholder";
            placeholderRow.dataset.taLayoutSpan = "4";
            placeholderRow.innerHTML = `
                <td data-ta-intranet-role="business-form-label">Godzina załadunku</td>
                <td data-ta-intranet-role="business-form-value"><span class="ta-loading-time-reserved-control" aria-hidden="true"></span></td>
            `;
            tbody.insertBefore(placeholderRow, carrierValueRow);
        }
        if (
            tbody
            && carrierValueRow
            && paymentTermRow
            && carrierValueRow.nextElementSibling !== paymentTermRow
        ) {
            tbody.insertBefore(paymentTermRow, carrierValueRow.nextSibling);
        }

        const carrierSearchRow = directRows.find(row => row.querySelector("#k_id")) || null;
        const carrierSearchInput = carrierSearchRow?.querySelector("#k_id") || null;
        const carrierSearchSubmit = carrierSearchRow?.querySelector('input[type="submit"]') || null;
        const carrierSearchCell = carrierSearchInput?.closest("td") || null;
        if (
            carrierSearchCell
            && carrierSearchInput
            && carrierSearchSubmit
            && !carrierSearchInput.closest(".ta-carrier-selector-line")
        ) {
            const selectorLine = document.createElement("div");
            selectorLine.className = "ta-carrier-selector-line";
            carrierSearchCell.insertBefore(selectorLine, carrierSearchInput);
            selectorLine.append(carrierSearchInput, carrierSearchSubmit);
            Array.from(carrierSearchCell.childNodes).forEach(node => {
                if (
                    node.nodeType === Node.TEXT_NODE
                    && !String(node.textContent || "").replace(/\u00a0/g, " ").trim()
                ) node.remove();
            });
        }

        directRows = Array.from(table.rows || []).filter(row => row.closest("table") === table);
        const datesRow = directRows.find(row => row.dataset.taCarrierField === "route-dates");
        const loadingRow = directRows.find(row => row.dataset.taCarrierField === "loading-place");
        const deliveryRow = directRows.find(row => row.dataset.taCarrierField === "delivery-place");
        const routeDates = String(datesRow?.cells?.[1]?.textContent || "").match(/\d{4}-\d{2}-\d{2}/g) || [];
        [[loadingRow, routeDates[0]], [deliveryRow, routeDates[1]]].forEach(([row, date]) => {
            const valueCell = row?.cells?.[1];
            if (!valueCell || !date) return;
            const dateLine = valueCell.querySelector(".ta-carrier-route-date") || document.createElement("div");
            dateLine.className = "ta-carrier-route-date";
            dateLine.textContent = date;
            if (!dateLine.isConnected) valueCell.appendChild(dateLine);
        });
        if (datesRow && routeDates.length >= 2) datesRow.dataset.taCarrierDatesMerged = "true";

        installCarrierRecordModalLinks(table);
        const vehicleRow = table.querySelector('[name="i_sam"]')?.closest("tr");
        const driverRow = table.querySelector('[name="kierowca"]')?.closest("tr");
        [enhanceNativeSelectSearch(vehicleRow, "vehicle"), enhanceNativeSelectSearch(driverRow, "driver")]
            .filter(Boolean);
        Array.from(document.body?.children || [])
            .filter(element => element.tagName === "TABLE" && /zamknij/.test(foldText(element.textContent)))
            .forEach(element => setRole(element, "carrier-order-close"));
        return table;
        } finally {
            table._taCarrierLayoutRefreshing = false;
        }
    }

    function mountCarrierOrderLayout(table) {
        if (!table) return null;
        // Delegacja musi istnieć od razu. Legacy potrafi dopiero po wyborze
        // przewoźnika podmienić cały fragment z linkami kierowcy i taboru.
        installCarrierRecordModalDelegation();
        if (table.dataset.taCarrierLayout !== "true") {
            table.dataset.taCarrierLayout = "true";
            const offerId = new URLSearchParams(location.search).get("id_o") || "";
            let header = document.querySelector(".ta-carrier-order-header");
            if (!header) {
                header = document.createElement("header");
                header.className = "ta-order-details-header ta-carrier-order-header";
                header.innerHTML = `
                    <div class="ta-order-details-mark" aria-hidden="true">C</div>
                    <div>
                        <span>CEMET SERWIS</span>
                        <h1>Tworzenie zlecenia</h1>
                        ${offerId ? `<p>Numer oferty: ${escapeHtml(offerId)}</p>` : ""}
                    </div>
                `;
                table.parentNode?.insertBefore(header, table);
            }
            // Bez Bridge formularz pozostaje kompaktowy. Aktywny Bridge dostaje
            // dodatkowe miejsce na swój panel, bez wpływu na samodzielny Modern UI.
            centerOrderDetailsPopup(0, getCarrierOrderPopupPreferredWidth());
        }

        refreshCarrierOrderLayout(table);
        if (!table._taCarrierLayoutObserver) {
            let refreshFrame = 0;
            const scheduleRefresh = () => {
                if (refreshFrame) return;
                refreshFrame = requestAnimationFrame(() => {
                    refreshFrame = 0;
                    refreshCarrierOrderLayout(table);
                });
            };
            const observer = new MutationObserver(scheduleRefresh);
            observer.observe(table, { childList: true, subtree: true });
            table._taCarrierLayoutObserver = observer;
            window.addEventListener("resize", scheduleRefresh, { passive: true });
            if (typeof ResizeObserver === "function") {
                const resizeObserver = new ResizeObserver(scheduleRefresh);
                resizeObserver.observe(table);
                table._taCarrierLayoutResizeObserver = resizeObserver;
            }
        }
        return { table, header: document.querySelector(".ta-carrier-order-header") };
    }

    function optionIdentity(option) {
        return `${String(option?.value || "")}\u0000${String(option?.textContent || "").trim()}`;
    }

    function findOfferContractorLookupForm(doc = document) {
        return Array.from(doc?.forms || []).find(form => {
            let action;
            try {
                action = new URL(form.getAttribute("action") || doc.location?.href || location.href, location.href);
            } catch (_) {
                return false;
            }
            return action.origin === location.origin
                && OFFER_FORM_PATH_PATTERN.test(normalizePathname(action.pathname))
                && Boolean(form.elements?.namedItem("co"))
                && Boolean(form.elements?.namedItem("k_id"))
                && !form.elements?.namedItem("m_z");
        }) || null;
    }

    async function fetchOfferLoadingPlaces(sourceForm) {
        const action = new URL(sourceForm.getAttribute("action") || location.href, location.href);
        if (action.origin !== location.origin || !OFFER_FORM_PATH_PATTERN.test(normalizePathname(action.pathname))) {
            throw new Error("Formularz kontrahenta prowadzi poza ekran dodawania oferty.");
        }
        const method = String(sourceForm.getAttribute("method") || "POST").toUpperCase();
        const response = await fetch(action.href, {
            method,
            credentials: "same-origin",
            redirect: "follow",
            body: method === "GET" ? undefined : new FormData(sourceForm)
        });
        if (!response.ok) throw new Error(`Serwer zwrócił HTTP ${response.status}.`);
        const responseUrl = new URL(response.url || action.href, location.href);
        if (responseUrl.origin !== location.origin || !OFFER_FORM_PATH_PATTERN.test(normalizePathname(responseUrl.pathname))) {
            throw new Error("Intranet przekierował odpowiedź poza formularz oferty.");
        }
        const bytes = new Uint8Array(await response.arrayBuffer());
        const charset = detectOfferCancellationCharset(response, bytes);
        let html;
        try {
            html = new TextDecoder(charset).decode(bytes);
        } catch (_) {
            html = new TextDecoder("iso-8859-2").decode(bytes);
        }
        const doc = new DOMParser().parseFromString(html, "text/html");
        const select = doc.querySelector('select[name="m_z"]');
        if (!select || select.options.length < 1) {
            throw new Error("Odpowiedź nie zawiera listy miejsc załadunku.");
        }
        return select;
    }

    function mountOfferLoadingPlacePopup() {
        const form = Array.from(document.forms || []).find(candidate => {
            let action;
            try {
                action = new URL(candidate.getAttribute("action") || location.href, location.href);
            } catch (_) {
                return false;
            }
            return OFFER_LOADING_PLACE_PATH_PATTERN.test(normalizePathname(action.pathname))
                && Boolean(candidate.elements?.namedItem("kontrahent"))
                && Boolean(candidate.elements?.namedItem("rodzaj"))
                && Boolean(candidate.elements?.namedItem("miejscowosc"))
                && Boolean(candidate.elements?.namedItem("uwagi"));
        }) || null;
        if (!form || !document.body) return false;

        document.body.dataset.taOfferLoadingPlacePopup = "true";
        form.dataset.taOfferLoadingPlaceForm = "true";
        const isEmbeddedInModal = window.self !== window.top;
        const nativeHeader = Array.from(document.body.children).find(element => element.tagName === "TABLE" && element.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING) || null;
        if (nativeHeader) nativeHeader.dataset.taOfferLoadingPlaceNativeHeader = "true";
        const fieldsTable = form.querySelector("table");
        if (fieldsTable) fieldsTable.dataset.taOfferLoadingPlaceFields = "true";
        const directionRadios = Array.from(form.querySelectorAll('input[type="radio"][name="rodzaj"]'));
        if (isEmbeddedInModal && directionRadios.length > 0 && !directionRadios.some(radio => radio.checked)) {
            directionRadios[directionRadios.length - 1].checked = true;
            directionRadios[directionRadios.length - 1].dispatchEvent(new Event("change", { bubbles: true }));
        }

        if (!isEmbeddedInModal && !document.querySelector(".ta-offer-loading-place-header")) {
            const header = document.createElement("header");
            header.className = "ta-offer-loading-place-header";
            header.innerHTML = `
                <div class="ta-order-details-mark" aria-hidden="true">C</div>
                <div>
                    <span>CEMET SERWIS</span>
                    <h1>Nowe miejsce załadunku</h1>
                    <p>Uzupełnij dane miejsca dla wybranego kontrahenta</p>
                </div>
            `;
            form.parentNode?.insertBefore(header, form);
        }

        const nativeSubmit = form.querySelector('input[type="image"]');
        if (nativeSubmit) {
            nativeSubmit.dataset.taOfferLoadingPlaceNativeSubmit = "true";
            if (!form.querySelector(".ta-offer-loading-place-submit")) {
                const submit = document.createElement("button");
                submit.type = "button";
                submit.className = "ta-offer-loading-place-submit";
                submit.textContent = "Zapisz miejsce";
                submit.addEventListener("click", () => {
                    const selectedDirection = form.querySelector('input[type="radio"][name="rodzaj"]:checked');
                    const placeInput = form.elements?.namedItem("miejscowosc");
                    if (!selectedDirection) {
                        const firstDirection = directionRadios[0];
                        firstDirection?.setCustomValidity("Wybierz kierunek: Dostawa albo Załadunek.");
                        firstDirection?.reportValidity();
                        return;
                    }
                    directionRadios.forEach(radio => radio.setCustomValidity(""));
                    if (!String(placeInput?.value || "").trim()) {
                        placeInput?.focus();
                        placeInput?.setCustomValidity("Uzupełnij pełny adres miejsca.");
                        placeInput?.reportValidity();
                        return;
                    }
                    placeInput?.setCustomValidity("");
                    nativeSubmit.click();
                });
                nativeSubmit.closest("td")?.appendChild(submit);
            }
        }
        const closeLink = Array.from(form.querySelectorAll("a[href]")).find(link => /window\.close/i.test(link.getAttribute("href") || ""));
        if (closeLink) {
            if (isEmbeddedInModal) {
                const closeRow = closeLink.closest("tr");
                (closeRow || closeLink).hidden = true;
                (closeRow || closeLink).style.setProperty("display", "none", "important");
            } else {
                closeLink.dataset.taOfferLoadingPlaceClose = "true";
                closeLink.textContent = "Zamknij";
            }
        }
        return true;
    }

    function showOfferLoadingPlaceModal(link, loadingPlaceSelect) {
        document.getElementById("trans-assistant-offer-loading-place-modal")?.remove();
        const sourceForm = findOfferContractorLookupForm(document);
        if (!sourceForm) {
            window.open(link.href, link.target || "_blank");
            return;
        }

        const baseline = new Set(Array.from(loadingPlaceSelect.options).map(optionIdentity));
        const previousBodyOverflow = document.body.style.overflow;
        const backdrop = document.createElement("div");
        backdrop.id = "trans-assistant-offer-loading-place-modal";
        backdrop.className = "ta-offer-loading-place-modal";
        backdrop.innerHTML = `
            <section class="ta-offer-loading-place-dialog" role="dialog" aria-modal="true" aria-labelledby="ta-offer-loading-place-title">
                <header>
                    <div>
                        <span>CEMET SERWIS</span>
                        <h2 id="ta-offer-loading-place-title">Dodaj miejsce załadunku</h2>
                    </div>
                    <button type="button" class="ta-offer-loading-place-x" aria-label="Zamknij">×</button>
                </header>
                <div class="ta-offer-loading-place-frame-wrap">
                    <div class="ta-offer-loading-place-loader" aria-live="polite">Ładowanie formularza…</div>
                    <iframe title="Formularz dodawania miejsca załadunku" sandbox="allow-forms allow-scripts allow-same-origin"></iframe>
                </div>
                <div class="ta-offer-loading-place-success" hidden>
                    <span aria-hidden="true">✓</span>
                    <h3>Miejsce zostało dodane</h3>
                    <p>Lista miejsc załadunku została odświeżona, a nowa pozycja jest już wybrana.</p>
                </div>
                <footer>
                    <p class="ta-offer-loading-place-status">Po zapisaniu lista odświeży się automatycznie.</p>
                    <a class="ta-offer-loading-place-classic" href="${escapeHtml(link.href)}" target="_blank" rel="noopener">Otwórz klasyczne okno</a>
                    <button type="button" class="ta-offer-loading-place-close">Zamknij</button>
                </footer>
            </section>
        `;
        document.body.appendChild(backdrop);
        document.body.style.overflow = "hidden";

        const dialog = backdrop.querySelector(".ta-offer-loading-place-dialog");
        const frame = backdrop.querySelector("iframe");
        const frameWrap = backdrop.querySelector(".ta-offer-loading-place-frame-wrap");
        const loader = backdrop.querySelector(".ta-offer-loading-place-loader");
        const success = backdrop.querySelector(".ta-offer-loading-place-success");
        const status = backdrop.querySelector(".ta-offer-loading-place-status");
        const closeButton = backdrop.querySelector(".ta-offer-loading-place-close");
        let submitted = false;
        let refreshInFlight = false;
        let closed = false;
        let refreshAttempt = 0;

        const close = () => {
            if (closed) return;
            closed = true;
            document.body.style.overflow = previousBodyOverflow;
            backdrop.remove();
            document.removeEventListener("keydown", onKeyDown, true);
        };
        const onKeyDown = event => {
            if (event.key === "Escape") close();
        };
        const scheduleRefresh = delay => window.setTimeout(() => void refreshPlaces(), delay);
        const refreshPlaces = async () => {
            if (closed || refreshInFlight || !submitted) return;
            refreshInFlight = true;
            refreshAttempt += 1;
            status.textContent = "Odświeżam listę miejsc załadunku…";
            try {
                const refreshedSelect = await fetchOfferLoadingPlaces(sourceForm);
                const refreshedOptions = Array.from(refreshedSelect.options);
                const newOption = refreshedOptions.find(option => !baseline.has(optionIdentity(option)))
                    || (refreshedOptions.length > baseline.size ? refreshedOptions[refreshedOptions.length - 1] : null);
                if (!newOption) {
                    if (refreshAttempt < 4) {
                        status.textContent = "Czekam na zapis w intranecie…";
                        scheduleRefresh(refreshAttempt * 650);
                    } else {
                        status.textContent = "Zapis nie został jeszcze potwierdzony. Formularz pozostaje otwarty.";
                    }
                    return;
                }
                const newIdentity = optionIdentity(newOption);
                loadingPlaceSelect.replaceChildren(...refreshedOptions.map(option => document.importNode(option, true)));
                const selectedIndex = Array.from(loadingPlaceSelect.options).findIndex(option => optionIdentity(option) === newIdentity);
                loadingPlaceSelect.selectedIndex = Math.max(0, selectedIndex);
                loadingPlaceSelect.dispatchEvent(new Event("input", { bubbles: true }));
                loadingPlaceSelect.dispatchEvent(new Event("change", { bubbles: true }));
                frameWrap.hidden = true;
                success.hidden = false;
                status.textContent = "Nowe miejsce jest gotowe do użycia w ofercie.";
                closeButton.textContent = "Gotowe";
                dialog.classList.add("is-success");
            } catch (error) {
                status.textContent = `Nie udało się odświeżyć listy: ${error.message}`;
                console.error(`[Trans Assistant Intranet Modern UI ${SCRIPT_VERSION}] Odświeżenie miejsc załadunku nie powiodło się.`, error);
            } finally {
                refreshInFlight = false;
            }
        };

        frame.addEventListener("load", () => {
            loader.hidden = true;
            frame.classList.add("is-ready");
            try {
                const frameDoc = frame.contentDocument;
                const popupForm = frameDoc?.querySelector('form[action*="dod_nowe_miejsce.php"]');
                const popupClose = frameDoc?.querySelector('[data-ta-offer-loading-place-close="true"], a[href*="window.close"]');
                popupClose?.addEventListener("click", event => {
                    event.preventDefault();
                    close();
                }, true);
                if (popupForm && popupForm.dataset.taParentModalBound !== "true") {
                    popupForm.dataset.taParentModalBound = "true";
                    popupForm.addEventListener("submit", () => {
                        submitted = true;
                        refreshAttempt = 0;
                        status.textContent = "Zapisuję miejsce…";
                        scheduleRefresh(450);
                    });
                }
            } catch (error) {
                status.textContent = "Formularz działa w trybie zgodności. Lista zostanie sprawdzona po zapisie.";
            }
            if (submitted) scheduleRefresh(150);
        });
        backdrop.addEventListener("click", event => {
            if (event.target === backdrop) close();
        });
        backdrop.querySelector(".ta-offer-loading-place-x")?.addEventListener("click", close);
        closeButton?.addEventListener("click", close);
        document.addEventListener("keydown", onKeyDown, true);
        frame.src = link.href;
        backdrop.querySelector(".ta-offer-loading-place-x")?.focus();
    }

    function installOfferLoadingPlaceModal(mainCell) {
        const loadingPlaceSelect = mainCell.querySelector('select[name="m_z"]');
        if (!loadingPlaceSelect) return false;
        const links = Array.from(mainCell.querySelectorAll("a[href]")).filter(link => {
            try {
                return OFFER_LOADING_PLACE_PATH_PATTERN.test(normalizePathname(new URL(link.href, location.href).pathname));
            } catch (_) {
                return false;
            }
        });
        links.forEach(link => {
            if (link.dataset.taOfferLoadingPlaceModal === "true") return;
            link.dataset.taOfferLoadingPlaceModal = "true";
            link.addEventListener("click", event => {
                if (currentMode !== MODE_MODERN || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                showOfferLoadingPlaceModal(link, loadingPlaceSelect);
            });
        });
        return links.length > 0;
    }

    function mountBusinessFormPage(variant) {
        const standaloneCarrierPopup = variant === "carrier-order";
        const mounted = standaloneCarrierPopup ? Boolean(document.body) : mountIntranetShell();
        if (!mounted) return false;
        const mainCell = standaloneCarrierPopup
            ? document.body
            : document.querySelector('[data-ta-intranet-role="main-content"]');
        if (!mainCell) return true;

        if (variant === "offer") {
            let isConfirmation = false;
            try { isConfirmation = new URLSearchParams(location.search).has("komunikat"); } catch (_) {}
            if (isConfirmation && mountOfferSummaryPage(mainCell)) return true;
        }

        const anchors = variant === "offer"
            ? [mainCell.querySelector("#kwota_ryczalt"), mainCell.querySelector('[name="nr_zlecenia"]'), mainCell.querySelector("#k_id")]
            : [mainCell.querySelector("#button1"), mainCell.querySelector('form[name="zlec"] select[name="kierowca"]'), mainCell.querySelector("#k_id")];
        const tables = anchors
            .map(anchor => anchor?.closest("table"))
            .filter((table, index, collection) => table && collection.indexOf(table) === index);
        const primaryAnchor = variant === "offer"
            ? (mainCell.querySelector("#kwota_ryczalt") || mainCell.querySelector('[name="nr_zlecenia"]'))
            : (mainCell.querySelector("#button1") || mainCell.querySelector('form[name="zlec"] select[name="kierowca"]'));
        const primaryTable = primaryAnchor?.closest("table") || tables[0] || null;
        if (variant === "offer" && !primaryTable && mountOfferSummaryPage(mainCell)) {
            return true;
        }
        const presentationTables = variant === "carrier-order" && primaryTable ? [primaryTable] : tables;
        presentationTables.forEach(table => markBusinessFormTable(table, variant, table === primaryTable));
        if (variant === "offer") {
            enhanceOfferContinueAction(mainCell);
            markOfferRequiredRows(mainCell);
            installOfferLoadingPlaceModal(mainCell);
            const rows = Array.from(mainCell.querySelectorAll("tr"));
            rows.filter(row => /data zaladunku/.test(foldText(row.cells?.[0]?.textContent)))
                .forEach(row => enhanceOfferDateRow(row, "loading"));
            rows.filter(row => /data dostawy/.test(foldText(row.cells?.[0]?.textContent)))
                .forEach(row => enhanceOfferDateRow(row, "delivery"));
        } else if (variant === "carrier-order") {
            mountCarrierOrderLayout(primaryTable);
        }
        return true;
    }

    const PAGE_ADAPTERS = [
        {
            id: "login",
            matches: pathname => LOGIN_PATH_PATTERN.test(pathname),
            mount: mountLoginPage
        },
        {
            id: "accepted-orders",
            matches: pathname => ACCEPTED_ORDERS_PATH_PATTERN.test(pathname),
            mount: mountAcceptedOrdersPage,
            setMode: setAcceptedOrdersMode
        },
        {
            id: "acceptance-list",
            matches: pathname => ACCEPTANCE_LIST_PATH_PATTERN.test(pathname),
            mount: mountAcceptanceListPage,
            setMode: setAcceptanceListMode
        },
        {
            id: "order-search",
            matches: pathname => ORDER_SEARCH_PATH_PATTERN.test(pathname),
            mount: mountOrderSearchPage,
            setMode: setOrderSearchMode
        },
        {
            id: "order-workflow",
            matches: pathname => ORDER_WORKFLOW_PATH_PATTERN.test(pathname),
            mount: mountOrderWorkflowPage,
            setMode: setOrderWorkflowMode
        },
        {
            id: "driver-assignment-popup",
            matches: pathname => DRIVER_ASSIGNMENT_POPUP_PATH_PATTERN.test(pathname),
            mount: mountDriverAssignmentPopup
        },
        {
            id: "order-cancel-popup",
            matches: pathname => ORDER_CANCEL_POPUP_PATH_PATTERN.test(pathname),
            mount: mountOrderCancelPopup
        },
        {
            id: "order-attachment-popup",
            matches: pathname => ORDER_ATTACHMENT_POPUP_PATH_PATTERN.test(pathname),
            mount: mountOrderAttachmentPopup
        },
        {
            id: "order-details",
            matches: pathname => ORDER_DETAILS_PATH_PATTERN.test(pathname),
            mount: mountOrderDetailsPage,
            setMode: setOrderDetailsMode
        },
        {
            id: "offer-loading-place-popup",
            matches: pathname => OFFER_LOADING_PLACE_PATH_PATTERN.test(pathname),
            mount: mountOfferLoadingPlacePopup
        },
        {
            id: "offer-cancellation",
            matches: pathname => OFFER_CANCELLATION_PATH_PATTERN.test(pathname),
            mount: mountOfferCancellationPage
        },
        {
            id: "offer-form",
            matches: pathname => OFFER_FORM_PATH_PATTERN.test(pathname),
            mount: () => mountBusinessFormPage("offer")
        },
        {
            id: "carrier-order-form",
            matches: pathname => CARRIER_ORDER_FORM_PATH_PATTERN.test(pathname),
            mount: () => mountBusinessFormPage("carrier-order")
        },
        {
            id: "carrier-freight-report",
            matches: pathname => CARRIER_FREIGHT_REPORT_PATH_PATTERN.test(pathname),
            mount: mountCarrierFreightReportPage,
            setMode: setCarrierFreightReportMode
        },
        {
            id: "order-register-report",
            matches: pathname => ORDER_REGISTER_REPORT_PATH_PATTERN.test(pathname),
            mount: mountOrderRegisterReportPage,
            setMode: setOrderRegisterReportMode
        },
        {
            id: "driver-browse",
            matches: pathname => DRIVER_BROWSE_PATH_PATTERN.test(pathname),
            mount: mountDriverBrowsePage
        },
        {
            id: "generic",
            matches: () => true,
            mount: mountGenericIntranetPage
        }
    ];

    function resolvePageAdapter() {
        const pathname = normalizePathname();
        return PAGE_ADAPTERS.find(adapter => adapter.matches(pathname)) || null;
    }

    function applyMode(mode, options = {}) {
        currentMode = mode === MODE_CLASSIC ? MODE_CLASSIC : MODE_MODERN;
        const root = document.documentElement;
        root.classList.toggle("ta-intranet-modern", currentMode === MODE_MODERN);
        root.classList.toggle("ta-intranet-classic", currentMode === MODE_CLASSIC);
        currentAdapter?.setMode?.(currentMode);
        if (options.persist !== false && !isForcedClassicMode()) {
            saveMode(currentMode);
        }
        renderViewSwitch();
    }

    function navigationShieldLabel(destinationUrl = location.href) {
        try {
            const destination = new URL(destinationUrl, location.href);
            if (ACCEPTED_ORDERS_PATH_PATTERN.test(normalizePathname(destination.pathname))) {
                return "Pobieranie zleceń…";
            }
        } catch (_) {}
        return "Ładowanie widoku…";
    }

    function showNavigationShield(destinationUrl = location.href) {
        if (currentMode !== MODE_MODERN || !document.body) return;
        const label = navigationShieldLabel(destinationUrl);
        const existingShield = document.getElementById(NAVIGATION_SHIELD_ID);
        if (existingShield) {
            const existingLabel = existingShield.querySelector("span");
            if (existingLabel) existingLabel.textContent = label;
            return;
        }
        const shield = document.createElement("div");
        shield.id = NAVIGATION_SHIELD_ID;
        shield.setAttribute("role", "status");
        shield.setAttribute("aria-live", "polite");
        shield.innerHTML = `<span>${label}</span>`;
        document.body.appendChild(shield);
    }

    function removeNavigationShield() {
        document.getElementById(NAVIGATION_SHIELD_ID)?.remove();
    }

    function isSameWindowNavigationLink(link, event) {
        if (!link || link.hasAttribute("download") || event.button !== 0) return false;
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return false;
        const target = String(link.getAttribute("target") || "").trim().toLowerCase();
        if (target && target !== "_self" && target !== window.name.toLowerCase()) return false;
        try {
            const destination = new URL(link.href, location.href);
            if (!/^https?:$/.test(destination.protocol)) return false;
            return destination.href !== location.href && !(
                destination.origin === location.origin
                && destination.pathname === location.pathname
                && destination.search === location.search
                && destination.hash
            );
        } catch (_) {
            return false;
        }
    }

    function installNavigationShield() {
        if (document.documentElement.dataset.taNavigationShieldInstalled === "true") return;
        document.documentElement.dataset.taNavigationShieldInstalled = "true";
        document.addEventListener("click", event => {
            if (event.defaultPrevented || currentMode !== MODE_MODERN) return;
            const link = event.target?.closest?.("a[href]");
            if (isSameWindowNavigationLink(link, event)) showNavigationShield(link.href);
        });
        document.addEventListener("submit", event => {
            if (event.defaultPrevented || currentMode !== MODE_MODERN) return;
            const form = event.target instanceof HTMLFormElement ? event.target : null;
            const target = String(form?.getAttribute("target") || "").trim().toLowerCase();
            if (!form || form.method.toLowerCase() === "dialog") return;
            if (target && target !== "_self" && target !== window.name.toLowerCase()) return;
            showNavigationShield(form.action || location.href);
        });
        window.addEventListener("beforeunload", showNavigationShield);
        window.addEventListener("pagehide", showNavigationShield);
        window.addEventListener("pageshow", event => {
            if (event.persisted) removeNavigationShield();
        });
    }

    function revealModernUi() {
        const reveal = () => {
            document.documentElement.classList.add(READY_CLASS);
            if (currentMode === MODE_MODERN) finishLoginTransitionOnAcceptedPage();
            publishPerformanceMetrics();
        };
        if (currentMode !== MODE_MODERN || typeof requestAnimationFrame !== "function") {
            reveal();
            return;
        }
        let stabilizationStarted = false;
        const stabilize = () => {
            if (stabilizationStarted) return;
            stabilizationStarted = true;
            requestAnimationFrame(() => requestAnimationFrame(reveal));
        };
        if (document.readyState === "complete") {
            stabilize();
            return;
        }
        window.addEventListener("load", stabilize, { once: true });
        window.setTimeout(stabilize, 1200);
    }

    function requestViewMode(mode) {
        const requestedMode = mode === MODE_CLASSIC ? MODE_CLASSIC : MODE_MODERN;
        if (requestedMode === currentMode && !(isForcedClassicMode() && requestedMode === MODE_MODERN)) return;

        saveMode(requestedMode);
        try {
            const target = new URL(location.href);
            if (requestedMode === MODE_MODERN) target.searchParams.delete("taClassic");
            else if (isForcedClassicMode()) target.searchParams.set("taClassic", "1");
            location.replace(target.href);
        } catch (_) {
            location.reload();
        }
    }

    function installStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = `
            html.ta-intranet-modern .ta-uppercase-action-label {
                text-transform: uppercase !important;
            }
            html.ta-intranet-modern:not(.${READY_CLASS}) body {
                visibility: hidden !important;
            }
            html.ta-intranet-modern.${READY_CLASS} body {
                visibility: visible !important;
            }
            html.ta-intranet-modern {
                --ta-cemet-navy: #194a80;
                --ta-cemet-navy-dark: #0d3768;
                --ta-cemet-green: #73af32;
                --ta-cemet-green-dark: #4f8622;
                --ta-cemet-page: #f3f6f2;
                --ta-cemet-surface: #ffffff;
                --ta-cemet-soft: #f5f8f3;
                --ta-cemet-border: #d7e2e8;
                --ta-cemet-text: #123a6b;
                --ta-cemet-muted: #64798d;
                --ta-cemet-shadow: 0 8px 22px rgba(24, 58, 91, .07);
            }
            ${getLoginTransitionCriticalCss()}
            html.ta-login-auto-forward body {
                visibility: hidden !important;
                opacity: 0 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-login body {
                min-height: 100vh !important;
                box-sizing: border-box !important;
                margin: 0 !important;
                padding: clamp(24px, 5vh, 58px) 18px 34px !important;
                background:
                    radial-gradient(circle at 50% 0, rgba(115, 175, 50, .1), transparent 34%),
                    linear-gradient(180deg, #f7f9f5 0%, #eef3ef 100%) !important;
                color: var(--ta-cemet-text) !important;
                font-family: Arial, sans-serif !important;
            }
            html.ta-intranet-modern.ta-intranet-page-login body > div:has(form[data-ta-login-form]) {
                width: min(100%, 610px) !important;
                box-sizing: border-box !important;
                margin: 0 auto !important;
                padding: 26px 30px 24px !important;
                border: 1px solid var(--ta-cemet-border) !important;
                border-top: 4px solid var(--ta-cemet-green) !important;
                border-radius: 15px !important;
                background: rgba(255, 255, 255, .97) !important;
                box-shadow: 0 18px 48px rgba(18, 55, 91, .12) !important;
            }
            html.ta-intranet-modern.ta-intranet-page-login [data-ta-login-artwork="hidden"],
            html.ta-intranet-modern.ta-intranet-page-login body > div:has(form[data-ta-login-form]) img {
                display: none !important;
            }
            html.ta-intranet-modern.ta-intranet-page-login form[data-ta-login-form="credentials"] {
                width: min(100%, 420px) !important;
                margin: 12px auto 0 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-login form[data-ta-login-form] h1,
            html.ta-intranet-modern.ta-intranet-page-login form[data-ta-login-form] h2,
            html.ta-intranet-modern.ta-intranet-page-login form[data-ta-login-form] h3,
            html.ta-intranet-modern.ta-intranet-page-login form[data-ta-login-form] h4 {
                margin: 10px 0 18px !important;
                color: var(--ta-cemet-navy-dark) !important;
                font-size: 25px !important;
                line-height: 1.2 !important;
                font-weight: 800 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-login form[data-ta-login-form] label {
                display: block !important;
                margin: 0 0 6px !important;
                color: var(--ta-cemet-text) !important;
                font-size: 13px !important;
                font-weight: 700 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-login form[data-ta-login-form] input:not([type="hidden"]):not([type="submit"]),
            html.ta-intranet-modern.ta-intranet-page-login form[data-ta-login-form] select {
                width: 100% !important;
                min-height: 42px !important;
                box-sizing: border-box !important;
                margin: 0 0 14px !important;
                padding: 8px 12px !important;
                border: 1px solid #bfd0df !important;
                border-radius: 7px !important;
                background: #fff !important;
                color: var(--ta-cemet-navy-dark) !important;
                font: 600 14px/1.2 Arial, sans-serif !important;
                box-shadow: inset 0 1px 2px rgba(18, 55, 91, .035) !important;
            }
            html.ta-intranet-modern.ta-intranet-page-login form[data-ta-login-form] input:focus,
            html.ta-intranet-modern.ta-intranet-page-login form[data-ta-login-form] select:focus {
                border-color: var(--ta-cemet-green) !important;
                outline: 3px solid rgba(115, 175, 50, .14) !important;
            }
            html.ta-intranet-modern.ta-intranet-page-login form[data-ta-login-form] input[type="submit"],
            html.ta-intranet-modern.ta-intranet-page-login form[data-ta-login-form] button[type="submit"] {
                width: 100% !important;
                min-height: 42px !important;
                box-sizing: border-box !important;
                border: 1px solid #5e9829 !important;
                border-radius: 7px !important;
                background: linear-gradient(135deg, #82bd3d, #659f2d) !important;
                color: #fff !important;
                font: 800 13px/1 Arial, sans-serif !important;
                box-shadow: 0 7px 16px rgba(94, 152, 41, .2) !important;
                cursor: pointer !important;
            }
            html.ta-intranet-modern.ta-intranet-page-login .ta-login-seamless-error {
                box-sizing: border-box !important;
                margin: 12px 0 0 !important;
                padding: 9px 11px !important;
                border: 1px solid #e9b7aa !important;
                border-radius: 7px !important;
                background: #fff4f0 !important;
                color: #a13b28 !important;
                font: 700 12px/1.4 Arial, sans-serif !important;
            }
            html.ta-intranet-modern.ta-intranet-page-login form[data-ta-login-form="application"] {
                width: min(100%, 430px) !important;
                margin: 18px auto !important;
            }
            html.ta-intranet-modern.ta-intranet-page-login form[data-ta-login-form="application"] select {
                min-height: 138px !important;
                padding: 8px !important;
            }
            html.ta-intranet-modern.ta-intranet-page-login form[data-ta-login-form="application"] option {
                padding: 9px 11px !important;
            }
            html.ta-intranet-modern.ta-intranet-page-login form[data-ta-login-form="application"] option:checked {
                background: linear-gradient(var(--ta-cemet-green), var(--ta-cemet-green)) !important;
                color: #fff !important;
            }
            @media (max-width: 680px) {
                html.ta-intranet-modern.ta-intranet-page-login body {
                    padding: 12px 10px 72px !important;
                }
                html.ta-intranet-modern.ta-intranet-page-login body > div:has(form[data-ta-login-form]) {
                    padding: 20px 16px !important;
                    border-radius: 11px !important;
                }
            }
            #${SWITCH_ID} {
                position: fixed;
                right: 10px;
                bottom: 9px;
                z-index: 2147483000;
                display: inline-flex;
                align-items: center;
                gap: 3px;
                box-sizing: border-box;
                padding: 4px;
                border: 1px solid rgba(139, 164, 190, .62);
                border-radius: 999px;
                background: rgba(255, 255, 255, .9);
                box-shadow: 0 7px 22px rgba(18, 45, 74, .2);
                backdrop-filter: blur(8px);
                color: #47617a;
                font: 600 10px/1 Arial, sans-serif;
                opacity: .78;
                transition: opacity .16s ease, box-shadow .16s ease, transform .16s ease;
            }
            #${SWITCH_ID}:hover,
            #${SWITCH_ID}:focus-within {
                opacity: 1;
                transform: translateY(-1px);
                box-shadow: 0 9px 26px rgba(18, 45, 74, .26);
            }
            #${SWITCH_ID} .ta-view-cloud-label {
                padding: 0 4px 0 5px;
                color: #6f8396;
                letter-spacing: .02em;
            }
            #${SWITCH_ID} button {
                min-width: 42px !important;
                min-height: 23px !important;
                height: 23px !important;
                margin: 0 !important;
                padding: 0 7px !important;
                border: 0 !important;
                border-radius: 999px !important;
                background: transparent !important;
                color: #526a80 !important;
                font: 700 10px/23px Arial, sans-serif !important;
                cursor: pointer !important;
                box-shadow: none !important;
            }
            #${SWITCH_ID} button[aria-pressed="true"] {
                background: #183f75 !important;
                color: #fff !important;
                box-shadow: 0 2px 7px rgba(24, 63, 117, .26) !important;
            }

            #${DASHBOARD_ID} {
                display: none;
            }
            .ta-order-details-header,
            .ta-order-quick-correction {
                display: none;
            }
            .ta-order-embedded-editor {
                display: none;
            }
            .ta-order-native-action-proxy {
                display: none !important;
            }
            .ta-offer-loading-place-header,
            .ta-offer-loading-place-submit {
                display: none;
            }
            .ta-carrier-record-modal {
                position: fixed;
                inset: 0;
                z-index: 2147483636;
                display: grid;
                place-items: center;
                box-sizing: border-box;
                padding: 18px;
                opacity: 0;
                background: rgba(18, 44, 68, .42);
                backdrop-filter: blur(3px);
                transition: opacity 160ms ease;
            }
            .ta-carrier-record-modal.is-visible { opacity: 1; }
            .ta-carrier-record-dialog {
                width: min(620px, calc(100vw - 36px));
                overflow: hidden;
                border: 1px solid #cddbd0;
                border-top: 4px solid var(--ta-cemet-green);
                border-radius: 14px;
                background: #f7faf7;
                box-shadow: 0 22px 55px rgba(17, 49, 76, .24);
                color: var(--ta-cemet-text);
                transform: translateY(8px) scale(.985);
                transition: transform 160ms ease;
            }
            .ta-carrier-record-modal.is-visible .ta-carrier-record-dialog { transform: none; }
            .ta-carrier-record-dialog > header {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 18px;
                padding: 20px 22px 17px;
                border-bottom: 1px solid #d9e3dc;
                background: #fff;
            }
            .ta-carrier-record-dialog > header span {
                display: block;
                margin-bottom: 4px;
                color: #4f941d;
                font-size: 10px;
                font-weight: 800;
                letter-spacing: .12em;
            }
            .ta-carrier-record-dialog > header h2 {
                margin: 0;
                color: var(--ta-cemet-navy-dark);
                font-size: 22px;
                line-height: 1.15;
            }
            .ta-carrier-record-dialog > header p {
                margin: 5px 0 0;
                color: #687e91;
                font-size: 11px;
            }
            .ta-carrier-record-close {
                width: 34px;
                height: 34px;
                padding: 0 !important;
                border: 1px solid #d3e0e7 !important;
                border-radius: 8px !important;
                background: #f4f8fa !important;
                color: #557086 !important;
                font-size: 22px !important;
                line-height: 1 !important;
                cursor: pointer;
            }
            .ta-carrier-record-form {
                display: grid;
                gap: 14px;
                padding: 20px 22px 22px;
            }
            .ta-carrier-record-form label {
                display: grid;
                gap: 6px;
                min-width: 0;
            }
            .ta-carrier-record-form label > span {
                color: var(--ta-cemet-navy-dark);
                font-size: 11px;
                font-weight: 800;
            }
            .ta-carrier-record-form input {
                width: 100% !important;
                min-height: 38px !important;
                box-sizing: border-box !important;
                padding: 8px 11px !important;
                border: 1px solid #b9ccdc !important;
                border-radius: 7px !important;
                background: #fff !important;
                color: var(--ta-cemet-text) !important;
                font: 600 12px Arial, sans-serif !important;
            }
            .ta-carrier-record-form input:focus {
                border-color: #77ac47 !important;
                outline: 3px solid rgba(115, 175, 50, .13) !important;
            }
            .ta-carrier-record-columns {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 12px;
            }
            .ta-carrier-record-helper {
                margin: -3px 0 0;
                color: #65798b;
                font-size: 11px;
            }
            .ta-carrier-record-status {
                min-height: 17px;
                color: #5d7284;
                font-size: 11px;
                font-weight: 700;
            }
            .ta-carrier-record-status[data-tone="error"] { color: #b64235; }
            .ta-carrier-record-status[data-tone="success"] { color: #3f861c; }
            .ta-carrier-record-form footer {
                display: flex;
                align-items: center;
                justify-content: flex-end;
                gap: 9px;
                padding-top: 2px;
            }
            .ta-carrier-record-form footer button,
            .ta-carrier-record-classic {
                min-height: 34px;
                box-sizing: border-box;
                padding: 8px 14px !important;
                border-radius: 7px !important;
                font-size: 11px !important;
                font-weight: 800 !important;
            }
            .ta-carrier-record-classic {
                margin-right: auto;
                color: #3b5d7d !important;
                text-decoration: underline !important;
            }
            .ta-carrier-record-cancel {
                border: 1px solid #bdcddd !important;
                background: #fff !important;
                color: #234f79 !important;
            }
            .ta-carrier-record-submit {
                border: 1px solid #5f9f28 !important;
                background: #72b332 !important;
                color: #fff !important;
                box-shadow: 0 7px 16px rgba(95, 154, 42, .2);
            }
            .ta-carrier-record-submit:disabled { opacity: .62; cursor: wait; }
            @media (max-width: 600px) {
                .ta-carrier-record-columns { grid-template-columns: 1fr; }
                .ta-carrier-record-form footer { flex-wrap: wrap; }
                .ta-carrier-record-classic { width: 100%; }
            }

            .ta-offer-loading-place-modal {
                position: fixed;
                inset: 0;
                z-index: 2147483400;
                display: grid;
                place-items: center;
                box-sizing: border-box;
                padding: 16px;
                background: rgba(14, 36, 60, .48);
                backdrop-filter: blur(3px);
            }
            .ta-offer-loading-place-dialog {
                width: min(720px, calc(100vw - 32px));
                max-height: calc(100vh - 32px);
                overflow: hidden;
                border: 1px solid #cbd9df;
                border-top: 4px solid var(--ta-cemet-green, #73af32);
                border-radius: 14px;
                background: #fff;
                box-shadow: 0 24px 68px rgba(8, 31, 56, .3);
                color: #123a6b;
                font-family: Arial, "Segoe UI", sans-serif;
            }
            .ta-offer-loading-place-dialog > header {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 16px;
                padding: 18px 20px 14px;
                border-bottom: 1px solid #dce5e8;
            }
            .ta-offer-loading-place-dialog > header span {
                display: block;
                margin-bottom: 4px;
                color: #5b9d22;
                font: 800 10px/1 Arial, sans-serif;
                letter-spacing: .12em;
            }
            .ta-offer-loading-place-dialog > header h2 {
                margin: 0;
                color: #0d3768;
                font: 800 22px/1.15 Arial, sans-serif;
            }
            .ta-offer-loading-place-x {
                width: 32px !important;
                min-width: 32px !important;
                height: 32px !important;
                padding: 0 !important;
                border: 1px solid #d8e2e7 !important;
                border-radius: 8px !important;
                background: #f5f8f7 !important;
                color: #446078 !important;
                font: 700 20px/30px Arial, sans-serif !important;
                cursor: pointer;
            }
            .ta-offer-loading-place-frame-wrap {
                position: relative;
                min-height: 390px;
                background: #f3f6f2;
            }
            .ta-offer-loading-place-frame-wrap iframe {
                display: block;
                width: 100%;
                height: min(430px, calc(100vh - 220px));
                min-height: 360px;
                border: 0;
                opacity: 0;
                transition: opacity .16s ease;
            }
            .ta-offer-loading-place-frame-wrap iframe.is-ready {
                opacity: 1;
            }
            .ta-offer-loading-place-loader {
                position: absolute;
                inset: 0;
                z-index: 1;
                display: grid;
                place-items: center;
                color: #5e7387;
                font: 700 13px/1.3 Arial, sans-serif;
            }
            .ta-offer-loading-place-loader[hidden] {
                display: none !important;
                pointer-events: none !important;
            }
            .ta-offer-loading-place-success {
                padding: 38px 26px 32px;
                text-align: center;
            }
            .ta-offer-loading-place-success > span {
                display: grid;
                place-items: center;
                width: 54px;
                height: 54px;
                margin: 0 auto 14px;
                border-radius: 16px;
                background: #edf6e7;
                color: #4d9522;
                font: 800 31px/1 Arial, sans-serif;
            }
            .ta-offer-loading-place-success h3 {
                margin: 0 0 7px;
                color: #0d3768;
                font: 800 21px/1.2 Arial, sans-serif;
            }
            .ta-offer-loading-place-success p {
                margin: 0;
                color: #5f7487;
                font: 500 13px/1.45 Arial, sans-serif;
            }
            .ta-offer-loading-place-dialog > footer {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 16px;
                border-top: 1px solid #dce5e8;
                background: #fbfcfb;
            }
            .ta-offer-loading-place-status {
                flex: 1 1 auto;
                margin: 0;
                color: #657a8d;
                font: 600 11px/1.35 Arial, sans-serif;
            }
            .ta-offer-loading-place-classic {
                color: #58728a;
                font: 700 11px/1 Arial, sans-serif;
                white-space: nowrap;
            }
            .ta-offer-loading-place-close {
                min-width: 92px !important;
                min-height: 34px !important;
                padding: 0 16px !important;
                border: 1px solid #68a42e !important;
                border-radius: 8px !important;
                background: #73af32 !important;
                color: #fff !important;
                font: 800 11px/32px Arial, sans-serif !important;
                cursor: pointer;
                box-shadow: 0 5px 13px rgba(94, 149, 41, .2) !important;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-loading-place-popup,
            html.ta-intranet-modern.ta-intranet-page-offer-loading-place-popup body {
                min-height: 100%;
                background: #f3f6f2 !important;
                color: #123a6b !important;
                font-family: Arial, "Segoe UI", sans-serif !important;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-loading-place-popup body {
                box-sizing: border-box;
                margin: 0 !important;
                padding: 18px !important;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-loading-place-popup #${SWITCH_ID},
            html.ta-intranet-modern.ta-intranet-page-offer-loading-place-popup [data-ta-offer-loading-place-native-header="true"] {
                display: none !important;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-loading-place-popup .ta-offer-loading-place-header {
                display: flex;
                align-items: center;
                gap: 13px;
                box-sizing: border-box;
                max-width: 680px;
                margin: 0 auto 10px;
                padding: 15px 17px;
                border: 1px solid #d4e0e4;
                border-top: 3px solid #73af32;
                border-radius: 11px;
                background: #fff;
                box-shadow: 0 8px 21px rgba(24, 58, 91, .07);
            }
            html.ta-intranet-modern.ta-intranet-page-offer-loading-place-popup .ta-offer-loading-place-header span {
                color: #5b9d22;
                font: 800 9px/1 Arial, sans-serif;
                letter-spacing: .12em;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-loading-place-popup .ta-offer-loading-place-header h1 {
                margin: 3px 0 2px;
                color: #0d3768;
                font: 800 20px/1.15 Arial, sans-serif;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-loading-place-popup .ta-offer-loading-place-header p {
                margin: 0;
                color: #6c8091;
                font: 500 10px/1.3 Arial, sans-serif;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-loading-place-popup form[data-ta-offer-loading-place-form="true"] {
                box-sizing: border-box;
                max-width: 680px;
                margin: 0 auto;
                padding: 12px;
                border: 1px solid #d4e0e4;
                border-radius: 11px;
                background: #fff;
                box-shadow: 0 8px 21px rgba(24, 58, 91, .07);
            }
            html.ta-intranet-modern.ta-intranet-page-offer-loading-place-popup form[data-ta-offer-loading-place-form="true"] > hr {
                display: none !important;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-loading-place-popup [data-ta-offer-loading-place-fields="true"] {
                width: 100% !important;
                border-collapse: separate !important;
                border-spacing: 0 6px !important;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-loading-place-popup [data-ta-offer-loading-place-fields="true"] td {
                box-sizing: border-box;
                padding: 7px 9px !important;
                border-top: 1px solid #dde6e3;
                border-bottom: 1px solid #dde6e3;
                background: #fbfcfb !important;
                color: #173f6d !important;
                font: 700 11px/1.3 Arial, sans-serif !important;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-loading-place-popup [data-ta-offer-loading-place-fields="true"] td:first-child {
                width: 31%;
                border-left: 3px solid #73af32;
                border-radius: 7px 0 0 7px;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-loading-place-popup [data-ta-offer-loading-place-fields="true"] td:last-child {
                border-right: 1px solid #dde6e3;
                border-radius: 0 7px 7px 0;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-loading-place-popup input[type="text"],
            html.ta-intranet-modern.ta-intranet-page-offer-loading-place-popup textarea {
                box-sizing: border-box;
                width: 100% !important;
                padding: 7px 9px !important;
                border: 1px solid #b9cbd8 !important;
                border-radius: 7px !important;
                background: #fff !important;
                color: #123a6b !important;
                font: 600 11px/1.3 Arial, sans-serif !important;
                outline: none;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-loading-place-popup textarea {
                min-height: 96px;
                resize: vertical;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-loading-place-popup input[type="radio"] {
                margin: 0 5px 0 10px;
                accent-color: #73af32;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-loading-place-popup [data-ta-offer-loading-place-native-submit="true"] {
                display: none !important;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-loading-place-popup .ta-offer-loading-place-submit {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 150px;
                min-height: 34px;
                border: 1px solid #68a42e;
                border-radius: 8px;
                background: #73af32;
                color: #fff;
                font: 800 11px/1 Arial, sans-serif;
                cursor: pointer;
                box-shadow: 0 5px 13px rgba(94, 149, 41, .2);
            }
            html.ta-intranet-modern.ta-intranet-page-offer-loading-place-popup [data-ta-offer-loading-place-close="true"] {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                box-sizing: border-box;
                min-width: 150px;
                min-height: 32px;
                padding: 0 14px;
                border: 1px solid #b9cbd8;
                border-radius: 8px;
                background: #fff;
                color: #234d78;
                font: 700 11px/1 Arial, sans-serif;
                text-decoration: none;
            }
            @media (max-width: 620px) {
                .ta-offer-loading-place-modal {
                    padding: 8px;
                }
                .ta-offer-loading-place-dialog {
                    width: calc(100vw - 16px);
                    max-height: calc(100vh - 16px);
                }
                .ta-offer-loading-place-dialog > footer {
                    flex-wrap: wrap;
                }
                .ta-offer-loading-place-status {
                    flex-basis: 100%;
                }
                html.ta-intranet-modern.ta-intranet-page-offer-loading-place-popup body {
                    padding: 8px !important;
                }
            }
            .ta-order-document-actions {
                display: contents;
            }
            .ta-order-pdf-save {
                display: none;
            }
            .ta-offer-date-control {
                display: none;
            }
            .ta-order-search-header {
                display: none;
            }
            .ta-order-search-submit {
                display: none;
            }
            .ta-order-workflow-header,
            .ta-order-workflow-submit {
                display: none;
            }
            html.ta-intranet-modern [data-ta-native-submit-caption="true"] {
                display: none !important;
            }

            html.ta-intranet-modern.ta-intranet-page-generic,
            html.ta-intranet-modern.ta-intranet-page-generic body {
                min-height: 100%;
                background: #f3f5f1 !important;
                color: #1b3558 !important;
                font-family: Arial, "Segoe UI", sans-serif !important;
            }
            html.ta-intranet-modern.ta-intranet-page-generic body {
                margin: 0 !important;
                padding-bottom: 38px !important;
            }
            html.ta-intranet-modern.ta-intranet-page-generic [data-ta-intranet-role="main-content"] input[type="text"],
            html.ta-intranet-modern.ta-intranet-page-generic [data-ta-intranet-role="main-content"] input[type="password"],
            html.ta-intranet-modern.ta-intranet-page-generic [data-ta-intranet-role="main-content"] input[type="number"],
            html.ta-intranet-modern.ta-intranet-page-generic [data-ta-intranet-role="main-content"] input[type="date"],
            html.ta-intranet-modern.ta-intranet-page-generic [data-ta-intranet-role="main-content"] input[type="time"],
            html.ta-intranet-modern.ta-intranet-page-generic [data-ta-intranet-role="main-content"] select,
            html.ta-intranet-modern.ta-intranet-page-generic [data-ta-intranet-role="main-content"] textarea {
                box-sizing: border-box;
                min-height: 31px;
                padding: 5px 8px !important;
                border: 1px solid #bdcbd5 !important;
                border-radius: 7px !important;
                background: #fff !important;
                color: #18395f !important;
                font: 600 11px/1.25 Arial, sans-serif !important;
                outline: none;
            }
            html.ta-intranet-modern.ta-intranet-page-generic [data-ta-intranet-role="main-content"] input[type="text"]:focus,
            html.ta-intranet-modern.ta-intranet-page-generic [data-ta-intranet-role="main-content"] input[type="password"]:focus,
            html.ta-intranet-modern.ta-intranet-page-generic [data-ta-intranet-role="main-content"] input[type="number"]:focus,
            html.ta-intranet-modern.ta-intranet-page-generic [data-ta-intranet-role="main-content"] select:focus,
            html.ta-intranet-modern.ta-intranet-page-generic [data-ta-intranet-role="main-content"] textarea:focus {
                border-color: #6b9f36 !important;
                box-shadow: 0 0 0 3px rgba(125, 178, 63, .14) !important;
            }
            html.ta-intranet-modern.ta-intranet-page-generic [data-ta-intranet-role="main-content"] input[type="submit"]:not([data-ta-intranet-action="save-inline"]),
            html.ta-intranet-modern.ta-intranet-page-generic [data-ta-intranet-role="main-content"] input[type="button"],
            html.ta-intranet-modern.ta-intranet-page-generic [data-ta-intranet-role="main-content"] button:not([data-view-mode]):not(.ta-order-pdf-save):not(.ta-order-native-action-proxy):not(.ta-order-metric-save) {
                min-height: 31px;
                padding: 0 13px !important;
                border: 1px solid #719f40 !important;
                border-radius: 7px !important;
                background: #76ad38 !important;
                color: #fff !important;
                font-weight: 800 !important;
                cursor: pointer;
            }
            html.ta-intranet-modern.ta-intranet-page-generic [data-ta-intranet-role="main-content"] {
                padding: 13px 14px 24px 4px !important;
                background: transparent !important;
                vertical-align: top !important;
            }

            /* Kontrolki stron wyspecjalizowanych nie dziedziczą już zakresu generic. */
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-criteria="true"] input[type="text"],
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-criteria="true"] input[type="number"],
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-criteria="true"] input[type="date"],
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-criteria="true"] select,
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-criteria="true"] textarea,
            html.ta-intranet-modern.ta-intranet-page-offer-form [data-ta-intranet-role="business-form-table"] input[type="text"],
            html.ta-intranet-modern.ta-intranet-page-offer-form [data-ta-intranet-role="business-form-table"] input[type="number"],
            html.ta-intranet-modern.ta-intranet-page-offer-form [data-ta-intranet-role="business-form-table"] input[type="date"],
            html.ta-intranet-modern.ta-intranet-page-offer-form [data-ta-intranet-role="business-form-table"] select,
            html.ta-intranet-modern.ta-intranet-page-offer-form [data-ta-intranet-role="business-form-table"] textarea,
            html.ta-intranet-modern.ta-intranet-page-order-workflow [data-ta-order-workflow-form="true"] input[type="text"],
            html.ta-intranet-modern.ta-intranet-page-order-workflow [data-ta-order-workflow-form="true"] input[type="number"],
            html.ta-intranet-modern.ta-intranet-page-order-workflow [data-ta-order-workflow-form="true"] input[type="date"],
            html.ta-intranet-modern.ta-intranet-page-order-workflow [data-ta-order-workflow-form="true"] select,
            html.ta-intranet-modern.ta-intranet-page-order-workflow [data-ta-order-workflow-form="true"] textarea {
                box-sizing: border-box;
                min-height: 31px;
                padding: 5px 8px !important;
                border: 1px solid #bdcbd5 !important;
                border-radius: 7px !important;
                background: #fff !important;
                color: #18395f !important;
                font: 600 11px/1.25 Arial, sans-serif !important;
                outline: none;
            }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-criteria="true"] input:focus,
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-criteria="true"] select:focus,
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-criteria="true"] textarea:focus,
            html.ta-intranet-modern.ta-intranet-page-offer-form [data-ta-intranet-role="business-form-table"] input:focus,
            html.ta-intranet-modern.ta-intranet-page-offer-form [data-ta-intranet-role="business-form-table"] select:focus,
            html.ta-intranet-modern.ta-intranet-page-offer-form [data-ta-intranet-role="business-form-table"] textarea:focus,
            html.ta-intranet-modern.ta-intranet-page-order-workflow [data-ta-order-workflow-form="true"] input:focus,
            html.ta-intranet-modern.ta-intranet-page-order-workflow [data-ta-order-workflow-form="true"] select:focus,
            html.ta-intranet-modern.ta-intranet-page-order-workflow [data-ta-order-workflow-form="true"] textarea:focus {
                border-color: #6b9f36 !important;
                box-shadow: 0 0 0 3px rgba(125, 178, 63, .14) !important;
            }

            html.ta-intranet-modern.ta-intranet-page-order-attachment-popup,
            html.ta-intranet-modern.ta-intranet-page-order-attachment-popup body {
                min-height: 100%;
                background: #f1f5f2 !important;
                color: #153b66 !important;
                font-family: Arial, "Segoe UI", sans-serif !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-attachment-popup body {
                box-sizing: border-box;
                min-width: 0 !important;
                margin: 0 !important;
                padding: 16px 16px 58px !important;
                overflow-x: hidden !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-attachment-popup .ta-order-attachment-header,
            html.ta-intranet-modern.ta-intranet-page-order-attachment-popup [data-ta-order-attachment-upload="true"],
            html.ta-intranet-modern.ta-intranet-page-order-attachment-popup [data-ta-order-attachment-list="true"] {
                box-sizing: border-box;
                width: min(900px, 100%) !important;
                margin-right: auto !important;
                margin-left: auto !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-attachment-popup .ta-order-attachment-header {
                display: flex;
                align-items: center;
                gap: 13px;
                margin-bottom: 10px !important;
                padding: 15px 17px;
                border: 1px solid #d4e0e4;
                border-top: 3px solid #73af32;
                border-radius: 11px;
                background: #fff;
                box-shadow: 0 8px 21px rgba(24, 58, 91, .07);
            }
            html.ta-intranet-modern.ta-intranet-page-order-attachment-popup .ta-order-attachment-header span {
                color: #5b9d22;
                font: 800 9px/1 Arial, sans-serif;
                letter-spacing: .12em;
            }
            html.ta-intranet-modern.ta-intranet-page-order-attachment-popup .ta-order-attachment-header h1 {
                margin: 3px 0 2px;
                color: #0d3768;
                font: 800 21px/1.15 Arial, sans-serif;
            }
            html.ta-intranet-modern.ta-intranet-page-order-attachment-popup .ta-order-attachment-header p {
                margin: 0;
                color: #6c8091;
                font: 500 10px/1.3 Arial, sans-serif;
            }
            html.ta-intranet-modern.ta-intranet-page-order-attachment-popup [data-ta-order-attachment-upload="true"] {
                display: block;
                margin-bottom: 5px !important;
                padding: 12px 14px !important;
                border: 1px solid #d4e0e4;
                border-radius: 10px;
                background: #fff;
                box-shadow: 0 6px 18px rgba(24, 58, 91, .06);
            }
            html.ta-intranet-modern.ta-intranet-page-order-attachment-popup [data-ta-order-attachment-file="true"] {
                box-sizing: border-box;
                width: 100% !important;
                min-height: 36px;
                color: #586f84 !important;
                font: 600 11px/1.3 Arial, sans-serif !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-attachment-popup [data-ta-order-attachment-file="true"]::file-selector-button {
                min-height: 32px;
                margin-right: 10px;
                padding: 0 14px;
                border: 1px solid #b8cad7;
                border-radius: 7px;
                background: #f5f8fb;
                color: #194a80;
                font: 800 11px/1 Arial, sans-serif;
                cursor: pointer;
            }
            html.ta-intranet-modern.ta-intranet-page-order-attachment-popup [data-ta-order-attachment-submit="true"] {
                min-width: 148px;
                min-height: 34px;
                margin: 7px 0 0 !important;
                padding: 0 16px !important;
                border: 1px solid #629b2c !important;
                border-radius: 7px !important;
                background: #73af32 !important;
                color: #fff !important;
                box-shadow: 0 4px 10px rgba(75, 122, 32, .15);
                font: 800 11px/1 Arial, sans-serif !important;
                cursor: pointer;
                transition: background-color .15s ease, box-shadow .15s ease;
            }
            html.ta-intranet-modern.ta-intranet-page-order-attachment-popup [data-ta-order-attachment-submit="true"]:hover {
                background: #659f2c !important;
                box-shadow: 0 5px 12px rgba(75, 122, 32, .2);
            }
            html.ta-intranet-modern.ta-intranet-page-order-attachment-popup [data-ta-order-attachment-list="true"] {
                display: block !important;
                height: auto !important;
                min-height: 0 !important;
                margin-bottom: 4px !important;
                padding: 0 !important;
                border-collapse: separate !important;
                border-spacing: 0 2px !important;
                background: transparent !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-attachment-popup [data-ta-order-attachment-list="true"] > tbody {
                display: block !important;
                height: auto !important;
                min-height: 0 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-attachment-popup [data-ta-order-attachment-list="true"] tr:not([data-ta-order-attachment-row="true"]) {
                display: none !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-attachment-popup [data-ta-order-attachment-row="true"] {
                display: grid !important;
                grid-template-columns: minmax(0, 1fr) 58px 76px;
                align-items: center;
                width: 100% !important;
                min-height: 48px;
                margin: 0 0 2px !important;
                border: 1px solid #d9e3e7;
                border-radius: 9px;
                background: #fff !important;
                box-shadow: 0 4px 13px rgba(24, 58, 91, .045);
                overflow: hidden;
            }
            html.ta-intranet-modern.ta-intranet-page-order-attachment-popup [data-ta-order-attachment-row="true"] > td {
                display: flex !important;
                align-items: center;
                box-sizing: border-box;
                min-width: 0;
                height: 100%;
                padding: 7px 10px !important;
                border: 0 !important;
                background: transparent !important;
                color: #153b66 !important;
                font: 700 11px/1.35 Arial, sans-serif !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-attachment-popup [data-ta-order-attachment-role="name"] {
                grid-column: 1;
                grid-row: 1;
                overflow-wrap: anywhere;
            }
            html.ta-intranet-modern.ta-intranet-page-order-attachment-popup [data-ta-order-attachment-role="preview"] {
                grid-column: 2;
                grid-row: 1;
            }
            html.ta-intranet-modern.ta-intranet-page-order-attachment-popup [data-ta-order-attachment-role="actions"] {
                grid-column: 3;
                grid-row: 1;
            }
            html.ta-intranet-modern.ta-intranet-page-order-attachment-popup [data-ta-order-attachment-role="auxiliary"] {
                display: none !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-attachment-popup [data-ta-order-attachment-role="preview"],
            html.ta-intranet-modern.ta-intranet-page-order-attachment-popup [data-ta-order-attachment-role="actions"] {
                justify-content: center;
                border-left: 1px solid #e2e9ec !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-attachment-popup [data-ta-order-attachment-preview="true"] {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 38px;
                min-height: 34px;
                border: 1px solid #bed3aa;
                border-radius: 7px;
                background: #f3f8ee;
                text-decoration: none !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-attachment-popup [data-ta-order-attachment-preview="true"] img {
                display: block;
                max-width: 29px !important;
                max-height: 31px !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-attachment-popup [data-ta-order-attachment-delete="true"] {
                min-width: 58px;
                min-height: 30px;
                padding: 0 10px !important;
                border: 1px solid #e7b7ac !important;
                border-radius: 7px !important;
                background: #fff7f4 !important;
                color: #b04431 !important;
                font: 800 10px/1 Arial, sans-serif !important;
                cursor: pointer;
            }
            html.ta-intranet-modern.ta-intranet-page-order-attachment-popup [data-ta-order-attachment-close="true"] {
                display: flex !important;
                align-items: center;
                justify-content: center;
                box-sizing: border-box;
                width: min(230px, 100%) !important;
                min-height: 34px;
                margin: 12px auto 0 !important;
                border: 1px solid #b9cbd8;
                border-radius: 8px;
                background: #fff;
                color: #234d78 !important;
                font: 800 11px/1 Arial, sans-serif !important;
                text-decoration: none !important;
            }
            @media (max-width: 560px) {
                html.ta-intranet-modern.ta-intranet-page-order-attachment-popup body {
                    padding: 8px 8px 54px !important;
                }
                html.ta-intranet-modern.ta-intranet-page-order-attachment-popup [data-ta-order-attachment-row="true"] {
                    grid-template-columns: minmax(0, 1fr) 52px 68px;
                }
            }

            html.ta-intranet-modern.ta-intranet-page-order-cancel-popup body {
                box-sizing: border-box;
                min-width: 0 !important;
                margin: 0 !important;
                padding: 16px 16px 52px !important;
                overflow-x: hidden !important;
                background: #f1f5f2 !important;
                color: #153b66 !important;
                font-family: Arial, sans-serif !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-cancel-popup .ta-order-cancel-header,
            html.ta-intranet-modern.ta-intranet-page-order-cancel-popup [data-ta-intranet-role="order-cancel-form"],
            html.ta-intranet-modern.ta-intranet-page-order-cancel-popup [data-ta-intranet-role="order-cancel-close"] {
                box-sizing: border-box;
                width: min(620px, 100%) !important;
                margin-right: auto !important;
                margin-left: auto !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-cancel-popup .ta-order-cancel-header {
                display: flex;
                align-items: center;
                gap: 13px;
                margin-bottom: 10px !important;
                padding: 14px 16px;
                border: 1px solid #dfd9d4;
                border-top: 3px solid #c85a48;
                border-radius: 11px;
                background: #fff;
                box-shadow: 0 7px 20px rgba(24, 54, 84, .06);
            }
            html.ta-intranet-modern.ta-intranet-page-order-cancel-popup .ta-order-cancel-mark {
                display: inline-flex;
                width: 38px;
                height: 38px;
                flex: 0 0 38px;
                align-items: center;
                justify-content: center;
                border-radius: 10px;
                background: #fff0ed;
                color: #c64f3e;
                font: 900 20px/1 Arial, sans-serif;
            }
            html.ta-intranet-modern.ta-intranet-page-order-cancel-popup .ta-order-cancel-header span {
                display: block;
                margin-bottom: 4px;
                color: #5e982d;
                font-size: 9px;
                font-weight: 900;
                letter-spacing: .1em;
            }
            html.ta-intranet-modern.ta-intranet-page-order-cancel-popup .ta-order-cancel-header h1 {
                margin: 0;
                color: #123f78;
                font-size: 22px;
                line-height: 1.08;
            }
            html.ta-intranet-modern.ta-intranet-page-order-cancel-popup .ta-order-cancel-header p {
                margin: 4px 0 0;
                color: #708095;
                font-size: 9px;
                font-weight: 650;
            }
            html.ta-intranet-modern.ta-intranet-page-order-cancel-popup [data-ta-intranet-role="order-cancel-form"] {
                display: block !important;
                margin-bottom: 8px !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-cancel-popup [data-ta-intranet-role="order-cancel-table"] {
                width: 100% !important;
                padding: 8px !important;
                border: 1px solid #d5ded3 !important;
                border-collapse: separate !important;
                border-spacing: 0 5px !important;
                border-radius: 10px !important;
                background: #fff !important;
                box-shadow: 0 7px 20px rgba(24, 54, 84, .05);
            }
            html.ta-intranet-modern.ta-intranet-page-order-cancel-popup [data-ta-order-cancel-row] > td {
                box-sizing: border-box !important;
                padding: 7px 10px !important;
                border-top: 1px solid #e0e7ea !important;
                border-bottom: 1px solid #e0e7ea !important;
                background: #fff !important;
                color: #18395f !important;
                vertical-align: middle !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-cancel-popup [data-ta-order-cancel-role="label"] {
                width: 34% !important;
                border-radius: 7px 0 0 7px;
                background: #f3f6f8 !important;
                color: #244b73 !important;
                font-size: 10px !important;
                font-weight: 850 !important;
                text-align: left !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-cancel-popup [data-ta-order-cancel-role="control"] {
                border-radius: 0 7px 7px 0;
            }
            html.ta-intranet-modern.ta-intranet-page-order-cancel-popup textarea[name="powod"] {
                display: block;
                box-sizing: border-box;
                width: 100% !important;
                min-height: 112px !important;
                padding: 9px 10px !important;
                border: 1px solid #b9c8d5 !important;
                border-radius: 7px !important;
                background: #fff !important;
                color: #18395f !important;
                font: 650 11px/1.35 Arial, sans-serif !important;
                resize: vertical;
                outline: none;
            }
            html.ta-intranet-modern.ta-intranet-page-order-cancel-popup textarea[name="powod"]:focus {
                border-color: #c87567 !important;
                box-shadow: 0 0 0 3px rgba(200, 90, 72, .12) !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-cancel-popup [data-ta-order-cancel-row="action"] > td {
                padding: 7px !important;
                border: 0 !important;
                background: transparent !important;
                text-align: right !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-cancel-popup [data-ta-order-cancel-action="cancel"] {
                min-width: 140px;
                min-height: 34px;
                padding: 0 17px !important;
                border: 1px solid #b94435 !important;
                border-radius: 7px !important;
                background: #c95645 !important;
                color: #fff !important;
                font: 850 10px/32px Arial, sans-serif !important;
                text-transform: capitalize;
                box-shadow: 0 4px 11px rgba(150, 52, 40, .16);
                cursor: pointer;
            }
            html.ta-intranet-modern.ta-intranet-page-order-cancel-popup [data-ta-intranet-role="order-cancel-close"] {
                margin-top: 2px !important;
                border: 0 !important;
                background: transparent !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-cancel-popup [data-ta-intranet-role="order-cancel-close"] td {
                padding: 4px !important;
                border: 0 !important;
                background: transparent !important;
                text-align: center !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-cancel-popup [data-ta-intranet-role="order-cancel-close"] a {
                display: inline-flex !important;
                min-width: 160px;
                min-height: 32px;
                box-sizing: border-box;
                align-items: center;
                justify-content: center;
                padding: 0 16px !important;
                border: 1px solid #b9c8d5 !important;
                border-radius: 7px !important;
                background: #f4f7f9 !important;
                color: #244b73 !important;
                font: 800 10px/30px Arial, sans-serif !important;
                text-decoration: none !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-cancel-popup [data-ta-intranet-role="order-cancel-close"] a:hover {
                border-color: #8eab75 !important;
                background: #eef6e8 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-cancel-popup hr {
                display: none !important;
            }
            html.ta-intranet-classic .ta-order-cancel-header {
                display: none !important;
            }

            html.ta-intranet-modern.ta-intranet-page-driver-assignment-popup body {
                box-sizing: border-box;
                min-width: 0 !important;
                margin: 0 !important;
                padding: 16px !important;
                overflow-x: hidden !important;
                background: #f1f5f2 !important;
                color: #153b66 !important;
                font-family: Arial, sans-serif !important;
            }
            html.ta-intranet-modern.ta-intranet-page-driver-assignment-popup [data-ta-intranet-role="driver-assignment-legacy-heading"] {
                display: none !important;
            }
            html.ta-intranet-modern.ta-intranet-page-driver-assignment-popup .ta-driver-assignment-header {
                box-sizing: border-box;
                width: min(720px, 100%);
                margin: 0 auto 10px;
                padding: 14px 18px;
                border: 1px solid #d4ddd2;
                border-top: 3px solid #73af32;
                border-radius: 11px;
                background: #fff;
                box-shadow: 0 7px 20px rgba(24, 54, 84, .06);
                text-align: left;
            }
            html.ta-intranet-modern.ta-intranet-page-driver-assignment-popup .ta-driver-assignment-header span {
                display: block;
                margin-bottom: 4px;
                color: #5e982d;
                font-size: 9px;
                font-weight: 900;
                letter-spacing: .1em;
            }
            html.ta-intranet-modern.ta-intranet-page-driver-assignment-popup .ta-driver-assignment-header h1 {
                margin: 0;
                color: #123f78;
                font-size: 21px;
                line-height: 1.08;
            }
            html.ta-intranet-modern.ta-intranet-page-driver-assignment-popup .ta-driver-assignment-header p {
                margin: 5px 0 0;
                color: #708095;
                font-size: 9px;
                font-weight: 650;
            }
            html.ta-intranet-modern.ta-intranet-page-driver-assignment-popup [data-ta-driver-assignment-form="true"] {
                box-sizing: border-box;
                width: min(720px, 100%) !important;
                margin: 0 auto 10px !important;
                padding: 8px !important;
                border: 1px solid #d5ded3 !important;
                border-collapse: separate !important;
                border-spacing: 0 5px !important;
                border-radius: 10px !important;
                background: #fff !important;
                box-shadow: 0 7px 20px rgba(24, 54, 84, .05);
            }
            html.ta-intranet-modern.ta-intranet-page-driver-assignment-popup [data-ta-driver-assignment-row="true"] > td {
                box-sizing: border-box !important;
                min-height: 42px;
                padding: 6px 10px !important;
                border-top: 1px solid #e0e7ea !important;
                border-bottom: 1px solid #e0e7ea !important;
                background: #fff !important;
                vertical-align: middle !important;
            }
            html.ta-intranet-modern.ta-intranet-page-driver-assignment-popup [data-ta-driver-assignment-role="label"] {
                width: 31% !important;
                border-radius: 6px 0 0 6px;
                background: #f3f6f8 !important;
                color: #244b73 !important;
                font-size: 10px !important;
                font-weight: 800 !important;
                text-align: left !important;
            }
            html.ta-intranet-modern.ta-intranet-page-driver-assignment-popup [data-ta-driver-assignment-role="control"] {
                border-radius: 0 6px 6px 0;
                color: #18395f !important;
                text-align: left !important;
            }
            html.ta-intranet-modern.ta-intranet-page-driver-assignment-popup [data-ta-driver-assignment-role="control"] > select:not(.ta-native-select-source) {
                width: 100% !important;
            }
            html.ta-intranet-modern.ta-intranet-page-driver-assignment-popup [data-ta-intranet-role="driver-assignment-actions"] {
                width: min(720px, 100%) !important;
                margin: 0 auto 8px !important;
                border: 0 !important;
                background: transparent !important;
                text-align: center !important;
            }
            html.ta-intranet-modern.ta-intranet-page-driver-assignment-popup [data-ta-driver-assignment-native-submit="true"] {
                display: none !important;
            }
            html.ta-intranet-modern.ta-intranet-page-driver-assignment-popup .ta-driver-assignment-submit {
                display: inline-flex;
                min-width: 160px;
                min-height: 34px;
                padding: 0 18px !important;
                align-items: center;
                justify-content: center;
                border: 1px solid #64982f !important;
                border-radius: 7px !important;
                background: #72ad35 !important;
                color: #fff !important;
                font: 850 10px/32px Arial, sans-serif !important;
                box-shadow: 0 4px 11px rgba(80, 126, 37, .16);
                cursor: pointer;
            }
            html.ta-intranet-modern.ta-intranet-page-driver-assignment-popup [data-ta-intranet-role="driver-assignment-close"] {
                width: min(720px, 100%) !important;
                margin: 8px auto 0 !important;
                border: 0 !important;
                background: transparent !important;
            }
            html.ta-intranet-modern.ta-intranet-page-driver-assignment-popup [data-ta-intranet-role="driver-assignment-close"] td {
                padding: 4px !important;
                border: 0 !important;
                background: transparent !important;
                text-align: center !important;
            }
            html.ta-intranet-modern.ta-intranet-page-driver-assignment-popup [data-ta-intranet-role="driver-assignment-close"] a {
                display: inline-flex !important;
                min-width: 160px;
                min-height: 32px;
                box-sizing: border-box;
                align-items: center;
                justify-content: center;
                padding: 0 16px !important;
                border: 1px solid #b5c5d3 !important;
                border-radius: 7px !important;
                background: #f4f7f9 !important;
                color: #244b73 !important;
                font: 800 10px/30px Arial, sans-serif !important;
                text-align: center;
                text-decoration: none !important;
                box-shadow: 0 2px 6px rgba(26, 56, 88, .06);
                transition: background-color 150ms ease, border-color 150ms ease, box-shadow 150ms ease;
            }
            html.ta-intranet-modern.ta-intranet-page-driver-assignment-popup [data-ta-intranet-role="driver-assignment-close"] a:hover {
                border-color: #8eab75 !important;
                background: #eef6e8 !important;
                box-shadow: 0 3px 8px rgba(73, 111, 42, .1);
            }
            html.ta-intranet-classic .ta-driver-assignment-header,
            html.ta-intranet-classic .ta-driver-assignment-submit,
            html.ta-intranet-classic .ta-native-select-search {
                display: none !important;
            }

            html.ta-intranet-modern.ta-intranet-page-order-workflow [data-ta-intranet-role="main-content"] {
                box-sizing: border-box;
                width: calc(100vw - 178px) !important;
                max-width: calc(100vw - 178px) !important;
                min-width: 0;
                padding: 13px 18px 26px 4px !important;
                background: transparent !important;
                vertical-align: top !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-workflow [data-ta-intranet-role="order-workflow-legacy-heading"] {
                display: none !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-workflow .ta-order-workflow-header {
                display: block;
                box-sizing: border-box;
                width: min(1180px, 100%);
                margin: 0 auto 9px;
                padding: 13px 16px;
                border: 1px solid #d4ddd2;
                border-top: 3px solid #73af32;
                border-radius: 11px;
                background: #fff;
                box-shadow: 0 7px 20px rgba(24, 54, 84, .06);
                text-align: left;
            }
            html.ta-intranet-modern.ta-intranet-page-order-workflow .ta-order-workflow-header span {
                display: block;
                margin-bottom: 4px;
                color: #5e982d;
                font-size: 9px;
                font-weight: 900;
                letter-spacing: .1em;
            }
            html.ta-intranet-modern.ta-intranet-page-order-workflow .ta-order-workflow-header h1 {
                margin: 0;
                color: #123f78;
                font-size: 21px;
                line-height: 1.05;
            }
            html.ta-intranet-modern.ta-intranet-page-order-workflow .ta-order-workflow-header p {
                margin: 5px 0 0;
                color: #708095;
                font-size: 9px;
                font-weight: 650;
            }
            html.ta-intranet-modern.ta-intranet-page-order-workflow [data-ta-order-workflow-form="true"] {
                box-sizing: border-box;
                width: min(980px, 100%) !important;
                margin: 0 auto 9px !important;
                padding: 7px !important;
                border: 1px solid #d5ded3 !important;
                border-collapse: separate !important;
                border-spacing: 0 5px !important;
                border-radius: 10px !important;
                background: #fff !important;
                box-shadow: 0 7px 20px rgba(24, 54, 84, .05);
            }
            html.ta-intranet-modern.ta-intranet-page-order-workflow [data-ta-order-workflow-form-kind="actions"] {
                width: min(980px, 100%) !important;
                margin: 0 auto 9px !important;
                padding: 2px !important;
                border: 0 !important;
                border-spacing: 0 !important;
                background: transparent !important;
                box-shadow: none !important;
                text-align: center !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-workflow [data-ta-order-workflow-form-kind="actions"] td {
                padding: 0 !important;
                border: 0 !important;
                background: transparent !important;
                text-align: center !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-workflow [data-ta-order-workflow-row="true"] > td {
                box-sizing: border-box !important;
                min-height: 38px;
                padding: 5px 9px !important;
                border-top: 1px solid #e0e7dd !important;
                border-bottom: 1px solid #e0e7dd !important;
                background: #fff !important;
                vertical-align: middle !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-workflow [data-ta-order-workflow-role="label"] {
                width: 34% !important;
                border-radius: 6px 0 0 6px;
                background: #f3f6f8 !important;
                color: #244b73 !important;
                font-size: 10px !important;
                font-weight: 800 !important;
                text-align: left !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-workflow [data-ta-order-workflow-role="control"] {
                border-radius: 0 6px 6px 0;
                color: #18395f !important;
                font-size: 10px !important;
                text-align: left !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-workflow [data-ta-order-workflow-role="control"] > input[type="text"],
            html.ta-intranet-modern.ta-intranet-page-order-workflow [data-ta-order-workflow-role="control"] > select,
            html.ta-intranet-modern.ta-intranet-page-order-workflow [data-ta-order-workflow-role="control"] > textarea {
                width: min(620px, 100%) !important;
                max-width: 100% !important;
                margin: 0 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-workflow input[type="checkbox"] {
                width: 15px !important;
                height: 15px !important;
                margin: 2px 4px !important;
                accent-color: #6fae32;
                vertical-align: middle;
            }
            html.ta-intranet-modern.ta-intranet-page-order-workflow [data-ta-order-workflow-native-submit="true"] {
                display: none !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-workflow .ta-order-workflow-submit {
                display: inline-flex;
                min-width: 160px;
                min-height: 32px;
                margin: 3px 0 !important;
                padding: 0 16px !important;
                align-items: center;
                justify-content: center;
                border: 1px solid #64982f !important;
                border-radius: 7px !important;
                background: #72ad35 !important;
                color: #fff !important;
                font: 850 10px/30px Arial, sans-serif !important;
                box-shadow: 0 4px 11px rgba(80, 126, 37, .16);
                cursor: pointer;
            }
            html.ta-intranet-modern.ta-intranet-page-order-workflow .ta-order-workflow-submit[data-tone="secondary"] {
                border-color: #b9c8d5 !important;
                background: #f4f7f9 !important;
                color: #244b73 !important;
                box-shadow: none !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-workflow [data-ta-order-workflow-action] {
                min-height: 28px !important;
                margin: 3px !important;
                padding: 0 10px !important;
                border: 1px solid #b9c8d5 !important;
                border-radius: 6px !important;
                background: #f4f7f9 !important;
                color: #244b73 !important;
                font-size: 9px !important;
                font-weight: 800 !important;
                cursor: pointer;
            }
            html.ta-intranet-modern.ta-intranet-page-order-workflow [data-ta-order-workflow-action-source="true"] {
                display: none !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-workflow .ta-order-workflow-action-toolbar {
                display: flex;
                box-sizing: border-box;
                width: min(980px, 100%);
                margin: 10px auto 14px;
                padding: 10px 12px;
                align-items: center;
                justify-content: center;
                gap: 8px;
                flex-wrap: wrap;
                border: 1px solid #d5ded3;
                border-radius: 10px;
                background: #fff;
                box-shadow: 0 5px 15px rgba(24, 54, 84, .05);
            }
            html.ta-intranet-modern.ta-intranet-page-order-workflow .ta-order-workflow-action-toolbar .ta-order-workflow-submit {
                margin: 0 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-workflow .ta-order-workflow-toolbar-action {
                display: inline-flex;
                min-width: 142px;
                min-height: 32px;
                box-sizing: border-box;
                align-items: center;
                justify-content: center;
                padding: 0 14px !important;
                border: 1px solid #b9c8d5 !important;
                border-radius: 7px !important;
                background: #f4f7f9 !important;
                color: #244b73 !important;
                font: 800 9px/30px Arial, sans-serif !important;
                cursor: pointer;
            }
            html.ta-intranet-modern.ta-intranet-page-order-workflow .ta-order-workflow-toolbar-action:hover,
            html.ta-intranet-modern.ta-intranet-page-order-workflow .ta-order-workflow-submit[data-tone="secondary"]:hover {
                border-color: #8eab75 !important;
                background: #eef6e8 !important;
            }
            html.ta-intranet-classic .ta-order-workflow-action-toolbar {
                display: none !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-workflow .ta-orders-viewport {
                box-sizing: border-box;
                width: 100%;
                max-width: 100%;
                margin: 8px auto 0;
                padding: 0 0 5px;
                overflow-x: auto;
                scrollbar-color: #8aa6bc #eef2f4;
                scrollbar-width: thin;
            }
            html.ta-intranet-modern.ta-intranet-page-order-workflow [data-ta-order-workflow-results="true"] {
                width: 100% !important;
                min-width: 1020px !important;
                margin: 0 !important;
                border: 0 !important;
                border-spacing: 0 3px !important;
                border-collapse: separate !important;
                table-layout: auto !important;
                background: transparent !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-workflow [data-ta-order-workflow-result-row="header"] > td {
                height: 34px !important;
                padding: 5px 7px !important;
                border: 0 !important;
                background: #19477f !important;
                color: #fff !important;
                font-size: 9px !important;
                font-weight: 850 !important;
                text-align: center !important;
                vertical-align: middle !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-workflow [data-ta-order-workflow-result-row="header"] > td:first-child { border-radius: 8px 0 0 8px; }
            html.ta-intranet-modern.ta-intranet-page-order-workflow [data-ta-order-workflow-result-row="header"] > td:last-child { border-radius: 0 8px 8px 0; }
            html.ta-intranet-modern.ta-intranet-page-order-workflow [data-ta-order-workflow-result-row="item"] > td {
                height: 42px !important;
                padding: 4px 7px !important;
                border-top: 1px solid #d9e2e8 !important;
                border-bottom: 1px solid #d9e2e8 !important;
                background: #fff !important;
                color: #18395f !important;
                font-size: 9px !important;
                line-height: 1.2 !important;
                text-align: center !important;
                vertical-align: middle !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-workflow [data-ta-order-workflow-result-row="item"][data-ta-order-workflow-stripe="0"] > td {
                background: #f7fafc !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-workflow [data-ta-order-workflow-result-row="item"]:hover > td {
                background: #eff6e9 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-workflow [data-ta-order-workflow-result-row="item"] a {
                color: #174a7d !important;
                font-weight: 750 !important;
                text-decoration-color: #9bb0c2 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-workflow [data-ta-order-workflow-result-row="item"] input[type="submit"],
            html.ta-intranet-modern.ta-intranet-page-order-workflow [data-ta-order-workflow-result-row="item"] button {
                min-height: 25px !important;
                padding: 0 9px !important;
                border: 1px solid #b8c8d6 !important;
                border-radius: 6px !important;
                background: #f3f7fa !important;
                color: #19477f !important;
                font-size: 8px !important;
                font-weight: 850 !important;
                box-shadow: none !important;
            }

            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-intranet-role="main-content"] {
                min-width: 0;
                padding-right: 18px !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-intranet-role="order-search-legacy-heading"] {
                display: none !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-search .ta-order-search-header {
                display: block;
                box-sizing: border-box;
                width: 100%;
                margin: 0 0 9px;
                padding: 13px 16px;
                border: 1px solid #d4ddd2;
                border-top: 4px solid #79b238;
                border-radius: 11px;
                background: #fff;
                box-shadow: 0 7px 20px rgba(24, 54, 84, .07);
            }
            html.ta-intranet-modern.ta-intranet-page-order-search .ta-order-search-header span {
                color: #659d2c;
                font-size: 9px;
                font-weight: 900;
                letter-spacing: .12em;
            }
            html.ta-intranet-modern.ta-intranet-page-order-search .ta-order-search-header h1 {
                margin: 3px 0 2px;
                color: #173f75;
                font-size: 19px;
                line-height: 1.15;
            }
            html.ta-intranet-modern.ta-intranet-page-order-search .ta-order-search-header p {
                margin: 0;
                color: #708095;
                font-size: 9px;
                font-weight: 650;
            }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-criteria="true"] {
                display: block !important;
                box-sizing: border-box;
                width: min(1040px, 100%) !important;
                margin: 0 auto !important;
                padding: 9px !important;
                border: 1px solid #d5ded3 !important;
                border-radius: 11px !important;
                background: #fff !important;
                box-shadow: 0 7px 20px rgba(24, 54, 84, .06);
            }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-criteria="true"] > tbody {
                display: grid !important;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 6px;
            }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-criteria="true"] > tbody > tr:not([data-ta-order-search-row]) {
                grid-column: 1 / -1;
            }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-row="true"] {
                display: grid !important;
                grid-template-columns: minmax(145px, 37%) minmax(0, 1fr);
                min-width: 0;
                min-height: 43px;
                border: 1px solid #dde5da;
                border-radius: 7px;
                background: #fff;
                overflow: visible;
            }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-wide="true"] {
                grid-column: 1 / -1;
                grid-template-columns: minmax(185px, 24%) minmax(0, 1fr);
            }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-role] {
                box-sizing: border-box;
                width: auto !important;
                min-width: 0;
                padding: 6px 9px !important;
                border: 0 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-role="label"] {
                display: flex;
                align-items: center;
                background: #f3f6f8 !important;
                color: #244b73 !important;
                font-size: 10px !important;
                font-weight: 800 !important;
                text-align: left !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-role="control"] {
                display: flex;
                align-items: center;
                gap: 6px;
                background: #fff !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-lookup="true"] [data-ta-order-search-role="control"] {
                display: grid !important;
                grid-template-columns: minmax(0, 1fr) auto;
                align-items: start;
                gap: 6px;
            }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-lookup-action="true"] {
                grid-column: 2;
                grid-row: 1;
                width: auto !important;
                min-width: 86px !important;
                height: 30px !important;
                margin: 0 !important;
                padding: 0 14px !important;
                white-space: nowrap;
            }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-suggestions="true"] {
                position: static !important;
                display: block;
                grid-column: 1 / -1;
                grid-row: 2;
                box-sizing: border-box !important;
                width: 100% !important;
                min-width: 0 !important;
                max-width: none !important;
                margin: 0 !important;
                padding: 4px !important;
                float: none !important;
                clear: both;
                overflow-x: hidden !important;
                overflow-y: auto !important;
                max-height: 190px !important;
                border: 1px solid #b8c8d5 !important;
                border-radius: 7px !important;
                background: #fff !important;
                box-shadow: 0 8px 20px rgba(24, 63, 112, .12) !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-suggestions="true"]:empty {
                display: none !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-suggestions="true"] ul {
                position: static !important;
                display: flex !important;
                box-sizing: border-box !important;
                width: 100% !important;
                max-height: 190px !important;
                margin: 0 !important;
                padding: 4px !important;
                overflow-x: hidden !important;
                overflow-y: auto !important;
                flex-direction: column !important;
                gap: 2px !important;
                border: 0 !important;
                border-radius: 0 !important;
                background: transparent !important;
                box-shadow: none !important;
                list-style: none !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-suggestions="true"] li {
                position: static !important;
                display: block !important;
                box-sizing: border-box !important;
                width: 100% !important;
                min-width: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                float: none !important;
                border: 0 !important;
                background: transparent !important;
                list-style: none !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-suggestions="true"] li > a,
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-suggestions="true"] > a {
                display: flex !important;
                box-sizing: border-box !important;
                width: 100% !important;
                min-height: 36px !important;
                padding: 6px 10px !important;
                align-items: center;
                border: 0 !important;
                border-radius: 5px !important;
                background: #fff !important;
                color: #173f75 !important;
                font-size: 10px !important;
                font-weight: 800 !important;
                line-height: 1.25 !important;
                text-align: left !important;
                text-decoration: none !important;
                white-space: normal !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-suggestions="true"] li > a:hover,
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-suggestions="true"] li > a:focus-visible,
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-suggestions="true"] > a:hover,
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-suggestions="true"] > a:focus-visible {
                background: #edf5e8 !important;
                color: #2f6526 !important;
                outline: none !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-role="control"] input[type="text"],
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-role="control"] select {
                width: 100% !important;
                max-width: none !important;
                margin: 0 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-field="data_od"] [data-ta-order-search-role="control"] input {
                width: min(180px, 42%) !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-date-range="true"] {
                display: grid !important;
                grid-template-columns: auto minmax(190px, 1fr) auto minmax(190px, 1fr);
                gap: 8px;
                align-items: center;
            }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-date-range="true"] > b {
                color: #173f75 !important;
                font: 800 11px/1 Arial, sans-serif !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-search .ta-order-search-date-control {
                width: 100%;
                grid-template-columns: 32px minmax(130px, 1fr) 32px;
            }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-field="data_od"] [data-ta-order-search-date-range="true"] .ta-order-search-date-control input[type="date"] {
                width: 100% !important;
                max-width: none !important;
                margin: 0 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-native-submit="true"] {
                display: none !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-search .ta-order-search-submit {
                display: block;
                min-width: 180px;
                min-height: 34px;
                margin: 10px auto 0 !important;
                padding: 0 20px !important;
                border: 1px solid #64982f !important;
                border-radius: 8px !important;
                background: #72ad35 !important;
                color: #fff !important;
                font: 850 10px/32px Arial, sans-serif !important;
                box-shadow: 0 4px 11px rgba(80, 126, 37, .18);
            }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-results="true"] {
                width: 100% !important;
                min-width: 1430px !important;
                margin: 0 !important;
                border: 0 !important;
                border-spacing: 0 3px !important;
                border-collapse: separate !important;
                table-layout: fixed !important;
                background: transparent !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-result-row="header"] td {
                position: sticky;
                top: 0;
                z-index: 4;
                height: 36px !important;
                padding: 5px 7px !important;
                border: 0 !important;
                background: #19477f !important;
                color: #fff !important;
                font-size: 10px !important;
                font-weight: 850 !important;
                text-align: center !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-result-row="header"] td:first-child { border-radius: 8px 0 0 8px; }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-result-row="header"] td:last-child { border-radius: 0 8px 8px 0; }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-result-row="order"] td {
                height: 45px !important;
                padding: 4px 7px !important;
                border-top: 1px solid #d9e2e8 !important;
                border-bottom: 1px solid #d9e2e8 !important;
                background: #fff !important;
                color: #18395f !important;
                font-size: 9px !important;
                line-height: 1.2 !important;
                text-align: center !important;
                vertical-align: middle !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-result-row="order"][data-ta-order-search-stripe="0"] td {
                background: #f7fafc !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-result-row="order"]:hover td {
                background: #eff6e9 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-column="position"] { width: 38px; }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-column="order-number"] { width: 92px; }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-column="external-number"] { width: 145px; }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-column="status"] { width: 105px; }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-column="offerer"] { width: 170px; }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-column="carrier"] { width: 220px; }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-column="print"] { width: 70px; }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-column="destination"] { width: 180px; }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-column="loading-date"],
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-column="unloading-date"] { width: 82px; }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-column="invoice-status"] { width: 68px; }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-column="attachment"] { width: 58px; }
            html.ta-intranet-modern.ta-intranet-page-order-search [data-ta-order-search-column="user"] { width: 90px; }

            .ta-offer-cancellation-header,
            .ta-offer-cancellation-submit {
                display: none;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-cancellation [data-ta-intranet-role="main-content"] {
                padding: 16px 18px 34px 8px !important;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-cancellation [data-ta-intranet-role="offer-cancellation-legacy-heading"] {
                display: none !important;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-cancellation .ta-offer-cancellation-header {
                display: flex;
                box-sizing: border-box;
                width: min(1120px, 100%);
                min-height: 80px;
                margin: 0 auto 12px;
                padding: 15px 17px;
                align-items: center;
                gap: 13px;
                border: 1px solid #d6e0d5;
                border-top: 4px solid #72b333;
                border-radius: 13px;
                background: #fff;
                box-shadow: 0 9px 24px rgba(22, 57, 88, .08);
            }
            html.ta-intranet-modern.ta-intranet-page-offer-cancellation .ta-offer-cancellation-header span {
                display: block;
                margin-bottom: 3px;
                color: #5e982d;
                font: 900 9px/1 Arial, sans-serif;
                letter-spacing: .12em;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-cancellation .ta-offer-cancellation-header h1 {
                margin: 0;
                color: #123f78;
                font: 800 22px/1.08 Arial, sans-serif;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-cancellation .ta-offer-cancellation-header p {
                margin: 5px 0 0;
                color: #708095;
                font: 600 10px/1.3 Arial, sans-serif;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-cancellation [data-ta-offer-cancellation-lookup="true"] {
                box-sizing: border-box;
                width: min(900px, 100%);
                margin: 0 auto 12px;
                padding: 13px;
                border: 1px solid #d7e1e4;
                border-radius: 11px;
                background: #fff;
                box-shadow: 0 7px 19px rgba(24, 58, 91, .06);
            }
            html.ta-intranet-modern.ta-intranet-page-offer-cancellation [data-ta-offer-cancellation-criteria="true"] {
                width: 100% !important;
                border-collapse: separate !important;
                border-spacing: 0 7px !important;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-cancellation [data-ta-offer-cancellation-criteria="true"] td {
                box-sizing: border-box;
                padding: 7px 10px !important;
                border-top: 1px solid #e0e7ea;
                border-bottom: 1px solid #e0e7ea;
                background: #f9fbfa !important;
                color: #173f6d !important;
                font: 700 11px/1.3 Arial, sans-serif !important;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-cancellation [data-ta-offer-cancellation-field] {
                box-sizing: border-box !important;
                width: 100% !important;
                min-height: 34px;
                padding: 6px 9px !important;
                border: 1px solid #b9cad5 !important;
                border-radius: 7px !important;
                background: #fff !important;
                color: #173f6d !important;
                font: 650 11px/1.25 Arial, sans-serif !important;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-cancellation [data-ta-offer-cancellation-results="true"] {
                width: min(1120px, 100%) !important;
                margin: 0 auto !important;
                border: 1px solid #d5dfe4 !important;
                border-collapse: separate !important;
                border-spacing: 0 !important;
                border-radius: 11px;
                background: #fff;
                box-shadow: 0 8px 22px rgba(22, 57, 88, .07);
                overflow: hidden;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-cancellation [data-ta-offer-cancellation-row="header"] td {
                padding: 9px 10px !important;
                border: 0 !important;
                border-right: 1px solid rgba(255, 255, 255, .18) !important;
                background: #17477e !important;
                color: #fff !important;
                font: 800 10px/1.25 Arial, sans-serif !important;
                text-align: left !important;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-cancellation [data-ta-offer-cancellation-row="offer"] td {
                padding: 10px !important;
                border: 0 !important;
                border-bottom: 1px solid #e2e8eb !important;
                background: #fff !important;
                color: #173f66 !important;
                font: 650 11px/1.35 Arial, sans-serif !important;
                vertical-align: middle !important;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-cancellation [data-ta-offer-cancellation-row="offer"]:nth-child(odd) td {
                background: #f7fafb !important;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-cancellation [data-ta-offer-cancellation-status="anulowana"] [data-ta-offer-cancellation-column="status"] {
                color: #9b3d30 !important;
                font-weight: 850 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-cancellation [data-ta-offer-cancellation-column="offer-number"] { width: 11%; }
            html.ta-intranet-modern.ta-intranet-page-offer-cancellation [data-ta-offer-cancellation-column="status"] { width: 15%; }
            html.ta-intranet-modern.ta-intranet-page-offer-cancellation [data-ta-offer-cancellation-column="offerer"] { width: 27%; }
            html.ta-intranet-modern.ta-intranet-page-offer-cancellation [data-ta-offer-cancellation-column="destination"] { width: 18%; }
            html.ta-intranet-modern.ta-intranet-page-offer-cancellation [data-ta-offer-cancellation-column="value"] { width: 12%; }
            html.ta-intranet-modern.ta-intranet-page-offer-cancellation [data-ta-offer-cancellation-column="action"] {
                width: 17%;
                text-align: center !important;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-cancellation input[data-ta-offer-cancellation-native-submit="true"],
            html.ta-intranet-modern.ta-intranet-page-offer-cancellation [data-ta-native-submit-caption="true"] {
                display: none !important;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-cancellation .ta-offer-cancellation-submit {
                display: inline-flex;
                min-height: 34px;
                box-sizing: border-box;
                padding: 0 16px;
                align-items: center;
                justify-content: center;
                border: 1px solid #5d9829;
                border-radius: 7px;
                background: linear-gradient(135deg, #82bd3d, #659f2d);
                color: #fff;
                font: 800 11px/1 Arial, sans-serif;
                box-shadow: 0 6px 14px rgba(94, 152, 41, .18);
                cursor: pointer;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-cancellation .ta-offer-cancellation-submit[data-tone="danger"] {
                border-color: #bb5948;
                background: linear-gradient(135deg, #cf6a58, #ad4939);
                box-shadow: 0 6px 14px rgba(173, 73, 57, .17);
            }
            html.ta-intranet-modern.ta-intranet-page-offer-cancellation .ta-offer-cancellation-submit[data-tone="secondary"] {
                border-color: #b7c7d2;
                background: #fff;
                color: #234d78;
                box-shadow: none;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-cancellation .ta-offer-cancellation-submit:disabled {
                border-color: #c7d0d6;
                background: #eef1f3;
                color: #7b8790;
                box-shadow: none;
                cursor: not-allowed;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-cancellation [data-ta-offer-cancellation-back="true"] {
                width: min(1120px, 100%);
                margin: 12px auto 0;
                text-align: center;
            }
            @media (max-width: 760px) {
                html.ta-intranet-modern.ta-intranet-page-offer-cancellation [data-ta-offer-cancellation-results="true"] {
                    display: block;
                    overflow-x: auto;
                }
                html.ta-intranet-modern.ta-intranet-page-offer-cancellation [data-ta-offer-cancellation-results="true"] tbody {
                    min-width: 760px;
                }
            }

            html.ta-intranet-modern.ta-intranet-page-offer-form .ta-offer-summary-header,
            html.ta-intranet-modern.ta-intranet-page-offer-form [data-ta-intranet-role="offer-summary-table"],
            html.ta-intranet-modern.ta-intranet-page-offer-form .ta-offer-summary-actions {
                box-sizing: border-box !important;
                width: min(860px, calc(100% - 24px)) !important;
                max-width: 860px !important;
                margin-right: auto !important;
                margin-left: auto !important;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-form .ta-offer-summary-header {
                display: flex;
                align-items: center;
                gap: 13px;
                margin-top: 12px !important;
                margin-bottom: 8px !important;
                padding: 14px 16px;
                border: 1px solid #d7e0d6;
                border-top: 3px solid #70ad33;
                border-radius: 12px;
                background: #fff;
                box-shadow: 0 8px 22px rgba(28, 55, 83, .07);
            }
            html.ta-intranet-modern.ta-intranet-page-offer-form .ta-offer-summary-header span {
                display: block;
                margin-bottom: 3px;
                color: #4c8c21;
                font: 900 9px/1 Arial, sans-serif;
                letter-spacing: .11em;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-form .ta-offer-summary-header h1 {
                margin: 0;
                color: #073f79;
                font: 900 19px/1.15 Arial, sans-serif;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-form .ta-offer-summary-header p {
                margin: 3px 0 0;
                color: #667d94;
                font: 500 9px/1.2 Arial, sans-serif;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-form [data-ta-offer-summary-native-title="true"] {
                display: none !important;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-form [data-ta-intranet-role="offer-summary-table"] {
                margin-top: 0 !important;
                margin-bottom: 0 !important;
                padding: 8px !important;
                border: 1px solid #d7e0d6 !important;
                border-collapse: separate !important;
                border-spacing: 0 3px !important;
                border-radius: 12px !important;
                background: #fff !important;
                box-shadow: 0 8px 22px rgba(28, 55, 83, .07) !important;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-form [data-ta-offer-summary-row="true"] > td {
                box-sizing: border-box !important;
                min-height: 32px !important;
                padding: 6px 11px !important;
                border-top: 1px solid #e1e7df !important;
                border-bottom: 1px solid #e1e7df !important;
                background: #fff !important;
                color: #173b64 !important;
                font: 700 10px/1.25 Arial, sans-serif !important;
                vertical-align: middle !important;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-form [data-ta-intranet-role="offer-summary-label"] {
                width: 42% !important;
                border-left: 3px solid #91bd61 !important;
                border-radius: 7px 0 0 7px !important;
                background: #f4f7f1 !important;
                color: #183b69 !important;
                font-weight: 850 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-form [data-ta-intranet-role="offer-summary-value"] {
                border-right: 1px solid #e1e7df !important;
                border-radius: 0 7px 7px 0 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-form [data-ta-offer-summary-total="true"] > td {
                border-color: #9ebd82 !important;
                background: #edf5e7 !important;
                color: #174d22 !important;
                font-size: 11px !important;
                font-weight: 900 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-form .ta-offer-summary-actions {
                display: flex;
                align-items: center;
                justify-content: flex-end;
                gap: 8px;
                margin-top: 8px !important;
                margin-bottom: 22px !important;
                padding: 10px 12px;
                border: 1px solid #d7e0d6;
                border-radius: 10px;
                background: #fff;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-form .ta-offer-summary-actions a {
                display: inline-flex !important;
                min-width: 90px;
                min-height: 32px;
                box-sizing: border-box;
                align-items: center;
                justify-content: center;
                padding: 0 14px !important;
                border: 1px solid #b9c8d5 !important;
                border-radius: 7px !important;
                background: #fff !important;
                color: #184477 !important;
                font: 800 10px/30px Arial, sans-serif !important;
                text-decoration: none !important;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-form .ta-offer-summary-actions a[data-ta-offer-summary-action="save"] {
                border-color: #679d31 !important;
                background: linear-gradient(135deg, #82bd3d, #659f2d) !important;
                color: #fff !important;
                box-shadow: 0 4px 10px rgba(83, 133, 38, .18) !important;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-form .ta-offer-summary-actions a:hover {
                border-color: #7ca550 !important;
                background: #eef6e8 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-form .ta-offer-summary-actions a[data-ta-offer-summary-action="save"]:hover {
                border-color: #568c24 !important;
                background: linear-gradient(135deg, #75b234, #588f27) !important;
            }

            html.ta-intranet-modern.ta-intranet-page-offer-form .ta-offer-continue-native,
            html.ta-intranet-modern.ta-intranet-page-offer-form [data-ta-offer-continue-duplicate="true"] {
                display: none !important;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-form .ta-offer-continue-button {
                display: inline-flex !important;
                min-width: 150px !important;
                min-height: 38px !important;
                box-sizing: border-box !important;
                align-items: center !important;
                justify-content: center !important;
                padding: 0 22px !important;
                border: 1px solid #679d31 !important;
                border-radius: 8px !important;
                background: linear-gradient(135deg, #82bd3d, #659f2d) !important;
                color: #fff !important;
                font: 800 11px/36px Arial, sans-serif !important;
                box-shadow: 0 5px 12px rgba(83, 133, 38, .18) !important;
                cursor: pointer !important;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-form .ta-offer-continue-button:hover {
                border-color: #568c24 !important;
                background: linear-gradient(135deg, #75b234, #588f27) !important;
            }

            html.ta-intranet-modern.ta-intranet-page-offer-form [data-ta-intranet-role="business-form-table"],
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form [data-ta-intranet-role="business-form-table"] {
                width: min(980px, calc(100% - 20px)) !important;
                max-width: 980px !important;
                margin: 10px auto 22px !important;
                padding: 8px !important;
                border: 1px solid #d8e1d6 !important;
                border-top: 3px solid #7db43a !important;
                border-collapse: separate !important;
                border-spacing: 0 5px !important;
                border-radius: 12px !important;
                background: #fff !important;
                box-shadow: 0 8px 22px rgba(28, 55, 83, .07) !important;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-form [data-ta-intranet-role="business-form-table"] [data-ta-intranet-role="business-form-row"] > td,
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form [data-ta-intranet-role="business-form-table"] [data-ta-intranet-role="business-form-row"] > td {
                box-sizing: border-box !important;
                min-height: 40px !important;
                padding: 6px 10px !important;
                border-top: 1px solid #e1e7df !important;
                border-bottom: 1px solid #e1e7df !important;
                background: #fff !important;
                vertical-align: middle !important;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-form [data-ta-intranet-role="business-form-label"],
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form [data-ta-intranet-role="business-form-label"] {
                width: 32% !important;
                border-left: 3px solid #8abd4d !important;
                border-radius: 7px 0 0 7px !important;
                background: #f4f7f1 !important;
                color: #183b69 !important;
                font-size: 11px !important;
                font-weight: 800 !important;
                line-height: 1.25 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-form [data-ta-intranet-role="business-form-value"],
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form [data-ta-intranet-role="business-form-value"] {
                border-right: 1px solid #e1e7df !important;
                border-radius: 0 7px 7px 0 !important;
                color: #233f62 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-form [data-ta-offer-required-state="empty"] [data-ta-intranet-role="business-form-label"] {
                border-left-color: #cf5a4d !important;
                background: #fff8f7 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-form [data-ta-offer-required] [data-ta-intranet-role="business-form-label"]::after {
                content: " *";
                color: #c43f32;
                font-weight: 900;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-form [data-ta-offer-required-state="empty"] [data-ta-intranet-role="business-form-value"] input:not([type="hidden"]),
            html.ta-intranet-modern.ta-intranet-page-offer-form [data-ta-offer-required-state="empty"] [data-ta-intranet-role="business-form-value"] select,
            html.ta-intranet-modern.ta-intranet-page-offer-form [data-ta-offer-required-state="empty"] [data-ta-intranet-role="business-form-value"] textarea {
                border-color: #dba39d !important;
                box-shadow: 0 0 0 1px rgba(196, 63, 50, .05) !important;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-form [data-ta-offer-required-state="complete"] [data-ta-intranet-role="business-form-value"] input:not([type="hidden"]),
            html.ta-intranet-modern.ta-intranet-page-offer-form [data-ta-offer-required-state="complete"] [data-ta-intranet-role="business-form-value"] select,
            html.ta-intranet-modern.ta-intranet-page-offer-form [data-ta-offer-required-state="complete"] [data-ta-intranet-role="business-form-value"] textarea {
                border-color: #a9c98b !important;
            }
            html.ta-intranet-modern [data-ta-intranet-role="business-form-value"] > input[type="text"]:only-child,
            html.ta-intranet-modern [data-ta-intranet-role="business-form-value"] > select:only-child,
            html.ta-intranet-modern [data-ta-intranet-role="business-form-value"] > textarea:only-child {
                width: min(100%, 560px) !important;
            }
            html.ta-intranet-modern [data-ta-intranet-role="business-form-table"] textarea {
                min-height: 74px !important;
                resize: vertical;
            }
            html.ta-intranet-modern [data-ta-intranet-role="business-form-table"] #kwota_ryczalt,
            html.ta-intranet-modern [data-ta-intranet-role="business-form-table"] [name="wartosc_zlecenie_przewoznik"] {
                width: 140px !important;
            }
            html.ta-intranet-modern [data-ta-intranet-role="business-form-table"] [name="data_zaladunku"],
            html.ta-intranet-modern [data-ta-intranet-role="business-form-table"] [name="data_dostawy"],
            html.ta-intranet-modern [data-ta-intranet-role="business-form-table"] [name="termin_platnosci_zlecenia"] {
                width: 145px !important;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-form .ta-offer-date-control {
                display: inline-grid;
                grid-template-columns: 32px minmax(138px, 168px) 32px;
                align-items: center;
                gap: 4px;
                vertical-align: middle;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-form .ta-offer-date-control input[type="date"] {
                width: 100% !important;
                height: 32px !important;
                min-height: 32px !important;
                padding: 4px 7px !important;
                border-color: #aebfd0 !important;
                background: #fff !important;
                color: #173f75 !important;
                font-size: 11px !important;
                font-weight: 800 !important;
                cursor: pointer;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-form .ta-offer-date-control button {
                display: inline-flex !important;
                width: 32px !important;
                min-width: 32px !important;
                height: 32px !important;
                min-height: 32px !important;
                margin: 0 !important;
                padding: 0 !important;
                align-items: center;
                justify-content: center;
                border: 1px solid #a8c18f !important;
                border-radius: 7px !important;
                background: #f0f7ea !important;
                color: #39711e !important;
                font: 900 20px/30px Arial, sans-serif !important;
                box-shadow: none !important;
                cursor: pointer;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-form .ta-offer-date-control button:hover {
                border-color: #79aa43 !important;
                background: #e3f1d8 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-offer-form .ta-offer-native-date-source,
            html.ta-intranet-modern.ta-intranet-page-offer-form .ta-offer-legacy-calendar-trigger {
                display: none !important;
            }
            html.ta-intranet-modern [data-ta-business-form-action="true"] > td {
                padding-top: 11px !important;
                padding-bottom: 11px !important;
                text-align: center !important;
            }
            html.ta-intranet-modern [data-ta-intranet-role="business-form-table"] #button1,
            html.ta-intranet-modern [data-ta-business-form-action="true"] input[type="submit"] {
                min-width: 170px !important;
                min-height: 38px !important;
                padding: 0 20px !important;
                border: 1px solid #679d31 !important;
                border-radius: 7px !important;
                background: linear-gradient(135deg, #82bd3d, #659f2d) !important;
                color: #fff !important;
                font: 800 11px/36px Arial, sans-serif !important;
                box-shadow: 0 5px 12px rgba(83, 133, 38, .18) !important;
                cursor: pointer !important;
            }
            html.ta-intranet-modern [data-ta-intranet-role="business-form-table"] #button1:hover,
            html.ta-intranet-modern [data-ta-business-form-action="true"] input[type="submit"]:hover {
                border-color: #568c24 !important;
                background: linear-gradient(135deg, #75b234, #588f27) !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form body {
                box-sizing: border-box;
                margin: 0 !important;
                padding: 14px 14px 44px !important;
                background: #eef2ef !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form body > form {
                display: block !important;
                width: 100% !important;
                margin: 0 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form #trans-assistant-intranet-order-main {
                box-sizing: border-box !important;
                min-width: 0 !important;
                overflow-x: clip !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form #trans-assistant-intranet-order-main > form {
                display: block !important;
                box-sizing: border-box !important;
                width: 100% !important;
                min-width: 0 !important;
                margin: 0 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-header,
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form [data-ta-intranet-role="business-form-table"] {
                width: min(100%, 1020px) !important;
                max-width: 1020px !important;
                margin-right: auto !important;
                margin-left: auto !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form body.tai-order-panel-separated .ta-carrier-order-header,
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form body.tai-order-panel-separated [data-ta-intranet-role="business-form-table"],
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form body.tai-order-panel-separated [data-ta-intranet-role="carrier-order-close"] {
                width: 100% !important;
                max-width: none !important;
                margin-right: 0 !important;
                margin-left: 0 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form [data-ta-intranet-role="business-form-table"] {
                display: block !important;
                box-sizing: border-box;
                padding: 7px !important;
                border-spacing: 0 !important;
                overflow: visible;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form [data-ta-intranet-role="business-form-table"] input[type="text"],
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form [data-ta-intranet-role="business-form-table"] input[type="number"],
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form [data-ta-intranet-role="business-form-table"] select,
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form [data-ta-intranet-role="business-form-table"] textarea {
                box-sizing: border-box !important;
                min-height: 31px !important;
                padding: 5px 8px !important;
                border: 1px solid #b9c8d5 !important;
                border-radius: 7px !important;
                background: #fff !important;
                color: #173b64 !important;
                font: 700 10px/1.25 Arial, sans-serif !important;
                outline: none !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form [data-ta-intranet-role="business-form-table"] input[readonly] {
                background: #f2f5f8 !important;
                color: #546a82 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form [data-ta-intranet-role="business-form-table"] input:focus,
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form [data-ta-intranet-role="business-form-table"] select:focus,
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form [data-ta-intranet-role="business-form-table"] textarea:focus {
                border-color: #6e9f3a !important;
                box-shadow: 0 0 0 3px rgba(121, 170, 66, .14) !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form [data-ta-intranet-role="business-form-table"] input[type="submit"],
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form [data-ta-intranet-role="business-form-table"] input[type="button"],
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form [data-ta-intranet-role="business-form-table"] button:not([data-option-index]) {
                min-height: 31px !important;
                padding: 0 13px !important;
                border: 1px solid #679d31 !important;
                border-radius: 7px !important;
                background: linear-gradient(135deg, #82bd3d, #659f2d) !important;
                color: #fff !important;
                font: 800 10px/29px Arial, sans-serif !important;
                box-shadow: 0 4px 10px rgba(85, 135, 40, .18) !important;
                cursor: pointer;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout {
                display: grid !important;
                grid-template-columns: repeat(12, minmax(0, 1fr));
                gap: 5px;
                width: 100% !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr {
                display: grid !important;
                grid-template-columns: minmax(115px, 34%) minmax(0, 1fr);
                min-width: 0;
                border: 1px solid #dce4da !important;
                border-radius: 8px !important;
                background: #fff !important;
                overflow: visible;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-layout-span="3"] { grid-column: span 3; }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-layout-span="4"] { grid-column: span 4; }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-layout-span="6"] { grid-column: span 6; }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-layout-span="12"] { grid-column: 1 / -1; }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr > td {
                width: auto !important;
                min-width: 0 !important;
                min-height: 36px !important;
                padding: 6px 8px !important;
                border: 0 !important;
                border-radius: 0 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr > [data-ta-intranet-role="business-form-label"] {
                display: flex;
                align-items: center;
                border-left: 3px solid #83b947 !important;
                background: #f3f7ef !important;
                color: #183f70 !important;
                font-size: 9px !important;
                letter-spacing: .02em;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-field="loading-place"],
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-field="delivery-place"] {
                grid-template-columns: 1fr;
                grid-template-rows: 22px minmax(38px, auto);
                min-height: 82px !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-field="loading-place"] > td,
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-field="delivery-place"] > td {
                grid-column: 1 / -1;
                min-height: 0 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-field="loading-place"] > [data-ta-intranet-role="business-form-label"],
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-field="delivery-place"] > [data-ta-intranet-role="business-form-label"] {
                background: #eaf3e4 !important;
                color: #4a752b !important;
                font-size: 0 !important;
                font-weight: 900 !important;
                letter-spacing: .08em;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-field="loading-place"] > [data-ta-intranet-role="business-form-label"]::after {
                content: "ZAŁADUNEK";
                font: 900 9px/1.2 Arial, sans-serif;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-field="delivery-place"] > [data-ta-intranet-role="business-form-label"]::after {
                content: "ROZŁADUNEK";
                font: 900 9px/1.2 Arial, sans-serif;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-field="loading-place"] > [data-ta-intranet-role="business-form-value"],
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-field="delivery-place"] > [data-ta-intranet-role="business-form-value"] {
                display: flex;
                box-sizing: border-box !important;
                min-height: 58px !important;
                padding: 7px 10px !important;
                flex-direction: column;
                justify-content: center;
                gap: 4px;
                color: #173f75 !important;
                font-size: 11px !important;
                font-weight: 800 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-route-date {
                padding-top: 4px;
                border-top: 1px solid #dfe6dc;
                color: #60748b;
                font-size: 9px;
                font-weight: 700;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-dates-merged="true"] {
                display: none !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-field="distance"],
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-field="offer-value"] {
                grid-template-columns: minmax(118px, 34%) minmax(0, 1fr);
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-field="offer-value"] [data-ta-intranet-role="business-form-value"] {
                display: flex !important;
                align-items: center;
                gap: 7px;
                white-space: nowrap;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-field="offer-value"] input[name="w_a1"] {
                width: min(100%, 180px) !important;
                margin: 0 !important;
                flex: 1 1 120px;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-selector-state="search"] [data-ta-intranet-role="business-form-value"] {
                display: block !important;
            }
            .ta-carrier-selector-line {
                display: contents;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-selector-line {
                display: grid !important;
                grid-template-columns: minmax(0, 1fr) 112px !important;
                align-items: center;
                gap: 7px;
                width: 100%;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-selector-state="search"] input#k_id {
                width: 100% !important;
                max-width: none !important;
                margin: 0 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-selector-state="search"] input[type="submit"] {
                width: 112px !important;
                min-width: 105px !important;
                max-width: 112px !important;
                margin: 0 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-selector-state="search"] #results3 {
                position: static !important;
                display: block;
                grid-column: 1 / -1;
                width: 100% !important;
                min-width: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                float: none !important;
                clear: both;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-selector-state="search"] #results3:empty {
                display: none !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-selector-state="search"] #results3 ul {
                position: static !important;
                display: flex !important;
                box-sizing: border-box !important;
                width: 100% !important;
                max-height: 170px !important;
                margin: 0 !important;
                padding: 4px !important;
                overflow-x: hidden !important;
                overflow-y: auto !important;
                flex-direction: column !important;
                gap: 2px !important;
                border: 1px solid #b8c8d5 !important;
                border-radius: 7px !important;
                background: #fff !important;
                box-shadow: 0 8px 20px rgba(24, 63, 112, .12) !important;
                list-style: none !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-selector-state="search"] #results3 li {
                position: static !important;
                display: block !important;
                width: 100% !important;
                min-width: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                float: none !important;
                border: 0 !important;
                background: transparent !important;
                list-style: none !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-selector-state="search"] #results3 li a {
                display: flex !important;
                box-sizing: border-box !important;
                width: 100% !important;
                min-height: 36px !important;
                padding: 6px 10px !important;
                align-items: center;
                border: 0 !important;
                border-radius: 5px !important;
                background: #fff !important;
                color: #173f75 !important;
                font-size: 10px !important;
                font-weight: 800 !important;
                line-height: 1.25 !important;
                text-align: left !important;
                text-decoration: none !important;
                white-space: normal !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-selector-state="search"] #results3 li a:hover {
                background: #edf5e8 !important;
                color: #2f6526 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-selector-state="selected"] {
                border-color: #b8cfaa !important;
                background: #f5f9f1 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-selector-state="selected"] [data-ta-intranet-role="business-form-label"] {
                background: #e9f3e2 !important;
                color: #4b752d !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-selector-state="selected"] [data-ta-intranet-role="business-form-value"] {
                display: flex !important;
                min-height: 36px !important;
                align-items: center;
                color: #173f75 !important;
                font-size: 11px !important;
                font-weight: 800 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-field="carrier-value"] [data-ta-intranet-role="business-form-value"] {
                display: grid !important;
                grid-template-columns: minmax(72px, 1fr) 62px auto !important;
                align-items: center;
                gap: 5px;
                white-space: nowrap;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-field="carrier-value"] input[name="wartosc_zlecenie_przewoznik"] {
                width: 100% !important;
                min-width: 0 !important;
                margin: 0 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-field="carrier-value"] select[name="w_wal"] {
                width: 62px !important;
                min-width: 62px !important;
                margin: 0 !important;
                padding-right: 18px !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-field="assignment"] {
                display: block !important;
                position: relative;
                z-index: 15;
                padding: 0 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-field="assignment"] > td {
                display: block !important;
                padding: 0 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-field="assignment"] table {
                display: table !important;
                box-sizing: border-box !important;
                width: 100% !important;
                min-width: 0 !important;
                table-layout: fixed !important;
                border: 0 !important;
                border-spacing: 4px !important;
                background: transparent !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-field="assignment"] table tr {
                display: table-row !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-field="assignment"] table td {
                box-sizing: border-box !important;
                width: auto !important;
                min-width: 0 !important;
                padding: 5px 7px !important;
                border: 0 !important;
                background: #f8faf7 !important;
                color: #183f70 !important;
                font-size: 9px !important;
                font-weight: 800 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-field="assignment"] table tr > td:first-child {
                width: 44% !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-field="assignment"] table tr > td:last-child {
                width: 56% !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-field="assignment"] table input,
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-field="assignment"] table select {
                box-sizing: border-box !important;
                width: 100% !important;
                max-width: 100% !important;
                min-width: 0 !important;
                margin: 0 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-field="assignment"] table td a {
                display: inline-flex !important;
                min-height: 22px;
                margin-left: 6px;
                padding: 0 8px;
                align-items: center;
                border: 1px solid #bad39f;
                border-radius: 6px;
                background: #eef6e8;
                color: #416f25 !important;
                font-size: 8px !important;
                font-weight: 900 !important;
                line-height: 1 !important;
                text-decoration: none !important;
                transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-field="assignment"] table td a:hover {
                border-color: #82b947;
                background: #e2f0d7;
                color: #2e5e18 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form [data-ta-intranet-role="business-form-value"] input[type="text"],
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form [data-ta-intranet-role="business-form-value"] select,
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form [data-ta-intranet-role="business-form-value"] textarea {
                max-width: 100% !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form [data-ta-carrier-field="notes"] textarea {
                width: 100% !important;
                min-height: 66px !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-field="loading-time-placeholder"] [data-ta-intranet-role="business-form-value"] {
                display: flex !important;
                align-items: center;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-loading-time-reserved-control {
                display: block;
                box-sizing: border-box;
                width: 100%;
                height: 30px;
                border: 1px solid #b8c9dc;
                border-radius: 7px;
                background: #fff;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-field="final-action"] {
                display: flex !important;
                grid-column: 1 / -1 !important;
                width: 100% !important;
                min-height: 58px;
                padding: 8px !important;
                align-items: center;
                justify-content: center;
                border: 0 !important;
                background: transparent !important;
                box-shadow: none !important;
                text-align: center;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-field="final-action"] > [data-ta-intranet-role="business-form-label"],
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-field="final-action"] > td {
                display: flex !important;
                width: 100% !important;
                min-height: 0 !important;
                padding: 0 !important;
                align-items: center;
                justify-content: center;
                border: 0 !important;
                background: transparent !important;
                box-shadow: none !important;
                text-align: center !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form .ta-carrier-order-layout > tr[data-ta-carrier-field="final-action"] #button1 {
                min-width: 190px !important;
                margin: 0 auto !important;
                box-shadow: none !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form [data-ta-intranet-role="carrier-order-close"] {
                width: min(100%, 1020px) !important;
                margin: 8px auto 0 !important;
                border: 0 !important;
                background: transparent !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form [data-ta-intranet-role="carrier-order-close"] td {
                padding: 7px !important;
                border-top: 2px solid #398c2f !important;
                background: transparent !important;
                text-align: center !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form [data-ta-intranet-role="carrier-order-close"] a {
                display: inline-flex;
                min-width: 180px;
                min-height: 30px;
                align-items: center;
                justify-content: center;
                border: 1px solid #9ebd84;
                border-radius: 7px;
                background: #fff;
                color: #315474;
                font-size: 10px;
                font-weight: 800;
            }

            html.ta-intranet-modern.ta-intranet-page-order-details,
            html.ta-intranet-modern.ta-intranet-page-order-details body {
                min-height: 100%;
                background: #eef2ef !important;
                color: #1b3558 !important;
                font-family: Arial, "Segoe UI", sans-serif !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-details body {
                box-sizing: border-box;
                margin: 0 !important;
                padding: 16px 16px 44px !important;
            }
            html.ta-intranet-modern .ta-order-details-header {
                display: flex;
                align-items: center;
                gap: 12px;
                box-sizing: border-box;
                width: 100%;
                margin: 0 0 10px;
                padding: 13px 15px;
                border: 1px solid #d4ddd2;
                border-top: 4px solid #83bd3d;
                border-radius: 12px;
                background: #fff;
                box-shadow: 0 7px 20px rgba(24, 54, 84, .08);
            }
            html.ta-intranet-modern .ta-order-details-mark {
                display: grid;
                flex: 0 0 40px;
                width: 40px;
                height: 40px;
                place-items: center;
                border-radius: 11px;
                background: #173f75;
                color: #fff;
                font-size: 20px;
                font-weight: 900;
                box-shadow: inset 0 -4px 0 #83bd3d;
            }
            html.ta-intranet-modern .ta-order-details-header span,
            html.ta-intranet-modern .ta-order-quick-heading span {
                color: #659d2c;
                font-size: 9px;
                font-weight: 900;
                letter-spacing: .12em;
            }
            html.ta-intranet-modern .ta-order-details-header h1,
            html.ta-intranet-modern .ta-order-quick-heading h2 {
                margin: 2px 0 0;
                color: #173f75;
                font-weight: 850;
            }
            html.ta-intranet-modern .ta-order-details-header h1 {
                font-size: 18px;
            }
            html.ta-intranet-modern .ta-order-details-header p {
                margin: 3px 0 0;
                color: #738194;
                font-size: 9px;
            }
            html.ta-intranet-modern .ta-order-quick-correction {
                position: relative;
                display: grid;
                grid-template-columns: auto minmax(0, 1fr) auto;
                align-items: end;
                gap: 10px;
                box-sizing: border-box;
                width: 100%;
                min-height: 58px;
                margin: 0 0 7px;
                padding: 7px 10px 15px;
                border: 1px solid #cfd9cc;
                border-radius: 8px;
                background: #fbfcfa;
                box-shadow: none;
            }
            html.ta-intranet-modern .ta-order-quick-heading {
                display: flex;
                align-items: center;
                gap: 7px;
                min-height: 32px;
                margin: 0;
            }
            html.ta-intranet-modern .ta-order-quick-heading h2 {
                font-size: 14px;
            }
            html.ta-intranet-modern .ta-order-quick-indicator {
                width: 7px;
                height: 7px;
                border-radius: 50%;
                background: #aeb9c2;
                box-shadow: 0 0 0 4px #edf1f3;
            }
            html.ta-intranet-modern .ta-order-quick-correction[data-ta-state="ready"] .ta-order-quick-indicator,
            html.ta-intranet-modern .ta-order-quick-correction[data-ta-state="success"] .ta-order-quick-indicator {
                background: #75aa38;
                box-shadow: 0 0 0 4px #e9f3df;
            }
            html.ta-intranet-modern .ta-order-quick-correction[data-ta-state="saving"] .ta-order-quick-indicator {
                background: #173f75;
                box-shadow: 0 0 0 4px #e5ebf3;
            }
            html.ta-intranet-modern .ta-order-quick-correction[data-ta-state="error"] .ta-order-quick-indicator {
                background: #b85b4b;
                box-shadow: 0 0 0 4px #f8e9e6;
            }
            html.ta-intranet-modern .ta-order-quick-grid {
                display: grid;
                grid-template-columns: minmax(135px, .55fr) minmax(230px, 1.45fr);
                gap: 8px;
            }
            html.ta-intranet-modern .ta-order-quick-grid label > span {
                display: block;
                margin: 0 0 2px;
                color: #536a7d;
                font-size: 10px;
                font-weight: 800;
            }
            html.ta-intranet-modern .ta-order-quick-grid input,
            html.ta-intranet-modern [data-ta-intranet-role="order-details-table"] input:not([type="image"]):not([type="submit"]),
            html.ta-intranet-modern [data-ta-intranet-role="order-details-table"] select,
            html.ta-intranet-modern [data-ta-intranet-role="order-details-table"] textarea {
                box-sizing: border-box !important;
                width: 100% !important;
                min-height: 32px;
                margin: 0 !important;
                padding: 6px 9px !important;
                border: 1px solid #bfcbd4 !important;
                border-radius: 7px !important;
                background: #fff !important;
                color: #18395f !important;
                font: 600 11px/1.25 Arial, sans-serif !important;
                outline: none;
            }
            html.ta-intranet-modern .ta-order-quick-grid input:focus,
            html.ta-intranet-modern [data-ta-intranet-role="order-details-table"] input:focus,
            html.ta-intranet-modern [data-ta-intranet-role="order-details-table"] select:focus,
            html.ta-intranet-modern [data-ta-intranet-role="order-details-table"] textarea:focus {
                border-color: #6b9f36 !important;
                box-shadow: 0 0 0 3px rgba(125, 178, 63, .14) !important;
            }
            html.ta-intranet-modern .ta-order-input-suffix {
                display: flex;
                align-items: stretch;
            }
            html.ta-intranet-modern .ta-order-input-suffix input {
                border-radius: 7px 0 0 7px !important;
            }
            html.ta-intranet-modern .ta-order-input-suffix b {
                display: flex;
                align-items: center;
                padding: 0 9px;
                border: 1px solid #bfcbd4;
                border-left: 0;
                border-radius: 0 7px 7px 0;
                background: #eef3ea;
                color: #58713c;
                font-size: 10px;
            }
            html.ta-intranet-modern .ta-order-quick-actions {
                display: flex;
                align-items: center;
                margin: 0;
            }
            html.ta-intranet-modern .ta-order-quick-actions p {
                position: absolute;
                right: 10px;
                bottom: 3px;
                max-width: 70%;
                margin: 0;
                color: #66778a;
                font-size: 8px;
                font-weight: 650;
            }
            html.ta-intranet-modern .ta-order-quick-correction[data-ta-state="error"] .ta-order-quick-actions p {
                color: #9c4538;
            }
            html.ta-intranet-modern .ta-order-quick-correction[data-ta-state="success"] .ta-order-quick-actions p {
                color: #4e7a26;
            }
            html.ta-intranet-modern .ta-order-quick-actions button {
                min-height: 30px;
                padding: 0 13px;
                border: 1px solid #679d31;
                border-radius: 8px;
                background: linear-gradient(135deg, #82bd3d, #659f2d);
                color: #fff;
                font: 800 9px/28px Arial, sans-serif;
                cursor: pointer;
                box-shadow: 0 4px 10px rgba(85, 135, 40, .2);
            }
            html.ta-intranet-modern .ta-order-quick-actions button:disabled {
                cursor: wait;
                opacity: .55;
                box-shadow: none;
            }
            html.ta-intranet-modern [data-ta-intranet-role="order-details-table"] {
                display: block !important;
                width: 100% !important;
                border: 1px solid #d1dad0 !important;
                border-spacing: 0 !important;
                border-collapse: separate !important;
                border-radius: 12px !important;
                background: #fff !important;
                box-shadow: 0 7px 20px rgba(24, 54, 84, .07);
                overflow: hidden;
            }
            html.ta-intranet-modern [data-ta-intranet-role="order-details-table"] > tbody.ta-order-details-unified-layout {
                display: grid !important;
                grid-template-columns: repeat(12, minmax(0, 1fr));
                gap: 4px;
                box-sizing: border-box;
                padding: 6px;
            }
            html.ta-intranet-modern .ta-order-details-unified-layout > [data-ta-layout-span="2"] { grid-column: span 2 !important; }
            html.ta-intranet-modern .ta-order-details-unified-layout > [data-ta-layout-span="3"] { grid-column: span 3 !important; }
            html.ta-intranet-modern .ta-order-details-unified-layout > [data-ta-layout-span="4"] { grid-column: span 4 !important; }
            html.ta-intranet-modern .ta-order-details-unified-layout > [data-ta-layout-span="6"] { grid-column: span 6 !important; }
            html.ta-intranet-modern .ta-order-details-unified-layout > [data-ta-layout-span="12"] { grid-column: 1 / -1 !important; }
            html.ta-intranet-modern [data-ta-intranet-role="order-details-row"] {
                display: grid !important;
                grid-template-columns: minmax(105px, 32%) minmax(0, 1fr);
                align-items: stretch;
                min-width: 0;
                border: 1px solid #dce4dc;
                border-radius: 7px;
                background: #fff;
                overflow: hidden;
            }
            html.ta-intranet-modern [data-ta-intranet-role="order-details-row"][data-ta-order-layout="wide"] {
                grid-column: auto;
            }
            html.ta-intranet-modern [data-ta-intranet-role="order-details-row"][data-ta-order-layout="wide"] > td:only-child {
                grid-column: 1 / -1;
            }
            html.ta-intranet-modern [data-ta-order-section="identity"] {
                grid-template-columns: 115px minmax(0, 1fr);
            }
            html.ta-intranet-modern [data-ta-order-section="identity"] [data-ta-intranet-role="order-details-label"] {
                white-space: nowrap;
                font-size: 9px !important;
            }
            html.ta-intranet-modern [data-ta-intranet-role="order-details-row"][data-ta-inline-action="true"] [data-ta-intranet-role="order-details-value"] {
                display: grid !important;
                grid-template-columns: minmax(0, 1fr) auto;
                align-items: center;
                gap: 6px;
            }
            html.ta-intranet-modern [data-ta-intranet-role="order-details-row"][data-ta-currency-inline="true"] [data-ta-intranet-role="order-details-value"] {
                display: grid !important;
                grid-template-columns: minmax(0, 1fr) 86px;
                align-items: center;
                gap: 6px;
            }
            html.ta-intranet-modern [data-ta-order-section="route"],
            html.ta-intranet-modern [data-ta-order-section="finance"],
            html.ta-intranet-modern [data-ta-order-section="assignment"] {
                grid-template-columns: 1fr;
            }
            html.ta-intranet-modern [data-ta-order-section="route"] [data-ta-intranet-role="order-details-label"],
            html.ta-intranet-modern [data-ta-order-section="finance"] [data-ta-intranet-role="order-details-label"],
            html.ta-intranet-modern [data-ta-order-section="assignment"] [data-ta-intranet-role="order-details-label"] {
                padding-bottom: 2px !important;
                background: #f6f8f4 !important;
                color: #5d6f7e !important;
                font-size: 8px !important;
                letter-spacing: .04em;
                text-transform: uppercase;
            }
            html.ta-intranet-modern.ta-intranet-page-order-details [data-ta-order-section="assignment"] {
                min-height: 96px !important;
                overflow: visible !important;
                align-content: start;
            }
            html.ta-intranet-modern.ta-intranet-page-order-details [data-ta-order-section="assignment"] [data-ta-intranet-role="order-details-value"] {
                min-height: 66px !important;
                overflow: visible !important;
                align-content: start;
            }
            html.ta-intranet-modern.ta-intranet-page-order-details [data-ta-order-field="transporeon-cost"] {
                min-height: 50px;
                grid-template-columns: minmax(160px, 235px) minmax(180px, 270px) !important;
                align-items: stretch;
                justify-content: start;
            }
            html.ta-intranet-modern.ta-intranet-page-order-details [data-ta-order-field="transporeon-cost"] [data-ta-intranet-role="order-details-label"] {
                display: flex !important;
                align-items: center;
                padding: 7px 10px !important;
                white-space: nowrap;
            }
            html.ta-intranet-modern.ta-intranet-page-order-details [data-ta-order-field="transporeon-cost"] [data-ta-intranet-role="order-details-value"] {
                display: flex !important;
                min-width: 0;
                align-items: center;
                gap: 7px;
                padding: 6px !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-details [data-ta-order-field="transporeon-cost"] input,
            html.ta-intranet-modern.ta-intranet-page-order-details [data-ta-order-field="transporeon-cost"] select {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 210px;
            }
            html.ta-intranet-modern [data-ta-order-field="loading-place"] [data-ta-intranet-role="order-details-label"],
            html.ta-intranet-modern [data-ta-order-field="delivery-place"] [data-ta-intranet-role="order-details-label"] {
                font-size: 0 !important;
                background: #edf4e8 !important;
                box-shadow: inset 4px 0 0 #82b93e;
            }
            html.ta-intranet-modern [data-ta-order-field="loading-place"],
            html.ta-intranet-modern [data-ta-order-field="delivery-place"] {
                min-height: 96px;
                grid-template-rows: 22px 74px;
            }
            html.ta-intranet-modern [data-ta-order-field="loading-place"] [data-ta-intranet-role="order-details-value"],
            html.ta-intranet-modern [data-ta-order-field="delivery-place"] [data-ta-intranet-role="order-details-value"] {
                min-height: 74px;
                box-sizing: border-box;
            }
            html.ta-intranet-modern [data-ta-order-field="loading-place"] [data-ta-intranet-role="order-details-label"]::after {
                content:"ZAŁADUNEK";
                color:#49752a;
                font: 900 9px/1.2 Arial, sans-serif;
                letter-spacing:.08em;
            }
            html.ta-intranet-modern [data-ta-order-field="delivery-place"] [data-ta-intranet-role="order-details-label"]::after {
                content:"ROZŁADUNEK";
                color:#49752a;
                font: 900 9px/1.2 Arial, sans-serif;
                letter-spacing:.08em;
            }
            html.ta-intranet-modern [data-ta-order-section="finance"] {
                border-top: 2px solid #dbe7d2;
            }
            html.ta-intranet-modern .ta-order-original-value {
                display: none !important;
            }
            html.ta-intranet-modern .ta-layout-whitespace {
                display: none !important;
            }
            html.ta-intranet-modern .ta-order-embedded-editor {
                display: grid;
                min-width: 0;
            }
            html.ta-intranet-modern .ta-order-delivery-editor {
                position: relative;
                grid-template-columns: minmax(0, 1fr) 30px;
                align-items: center;
                gap: 5px;
            }
            html.ta-intranet-modern [data-ta-order-field="loading-place"][data-ta-inline-action="true"] [data-ta-intranet-role="order-details-value"] {
                grid-template-columns: minmax(0, 1fr) 30px !important;
            }
            html.ta-intranet-modern .ta-order-delivery-editor > button,
            html.ta-intranet-modern [data-ta-order-field="loading-place"] .ta-order-native-action-proxy {
                box-sizing: border-box !important;
                width: 30px !important;
                min-width: 30px !important;
                max-width: 30px !important;
                min-height: 30px !important;
                height: 30px !important;
                padding: 0 !important;
                font-size: 0 !important;
                line-height: 28px !important;
            }
            html.ta-intranet-modern .ta-order-delivery-editor > button::after,
            html.ta-intranet-modern [data-ta-order-field="loading-place"] .ta-order-native-action-proxy::after {
                content: "💾";
                font: 14px/28px "Segoe UI Emoji", Arial, sans-serif;
            }
            html.ta-intranet-modern .ta-order-delivery-editor [role="status"] {
                position: absolute;
                width: 1px;
                height: 1px;
                margin: -1px;
                padding: 0;
                border: 0;
                clip: rect(0 0 0 0);
                clip-path: inset(50%);
                overflow: hidden;
            }
            html.ta-intranet-modern .ta-order-payment-editor {
                grid-template-columns: minmax(0, 1fr) auto 30px;
                align-items: center;
                gap: 5px;
            }
            html.ta-intranet-modern .ta-order-payment-editor b {
                color: #607447;
                font-size: 9px;
                font-weight: 800;
            }
            html.ta-intranet-modern [data-ta-order-field="loading-date"],
            html.ta-intranet-modern [data-ta-order-field="delivery-date"] {
                min-height: 62px;
                grid-template-rows: 23px minmax(36px, 1fr);
            }
            html.ta-intranet-modern [data-ta-order-field="loading-date"] [data-ta-intranet-role="order-details-value"],
            html.ta-intranet-modern [data-ta-order-field="delivery-date"] [data-ta-intranet-role="order-details-value"] {
                padding: 4px 6px !important;
            }
            html.ta-intranet-modern .ta-order-date-editor {
                grid-template-columns: minmax(0, 1fr) 30px;
                align-items: center;
                gap: 5px;
            }
            html.ta-intranet-modern .ta-order-date-editor .ta-order-metric-save {
                width: 30px !important;
                min-width: 30px !important;
                height: 30px !important;
                min-height: 30px !important;
                padding: 0 !important;
                border: 1px solid #9fbd83 !important;
                border-radius: 7px !important;
                background: #edf5e7 !important;
                color: #417022 !important;
                font: 400 14px/28px "Segoe UI Emoji", Arial, sans-serif !important;
                box-shadow: none !important;
                cursor: pointer;
            }
            html.ta-intranet-modern .ta-order-date-editor .ta-order-metric-save:disabled {
                cursor: wait;
                opacity: .55;
            }
            html.ta-intranet-modern .order-metric-field {
                min-height: 84px;
                grid-template-rows: 30px minmax(42px, 1fr);
            }
            html.ta-intranet-modern .order-metric-field [data-ta-intranet-role="order-details-label"] {
                display: flex;
                align-items: center;
                min-height: 30px;
                box-sizing: border-box;
                padding: 5px 6px !important;
                background: #f6f8f4 !important;
            }
            html.ta-intranet-modern .order-metric-field [data-ta-intranet-role="order-details-value"] {
                display: grid !important;
                grid-template-columns: minmax(0, 1fr) auto;
                align-items: center;
                min-height: 42px;
                box-sizing: border-box;
                gap: 5px;
                padding: 5px 6px !important;
            }
            html.ta-intranet-modern .order-metric-field:not([data-ta-inline-action="true"]) [data-ta-intranet-role="order-details-value"] {
                grid-template-columns: minmax(0, 1fr);
            }
            html.ta-intranet-modern .order-metric-field .ta-order-payment-editor {
                grid-template-columns: minmax(0, 1fr) auto 30px;
            }
            html.ta-intranet-modern .order-metric-field .ta-order-native-action-proxy,
            html.ta-intranet-modern .order-metric-field .ta-order-metric-save {
                width: 30px !important;
                min-width: 30px !important;
                height: 30px !important;
                min-height: 30px !important;
                padding: 0 !important;
                border: 1px solid #9fbd83 !important;
                border-radius: 7px !important;
                background: #edf5e7 !important;
                color: #417022 !important;
                font: 400 14px/28px "Segoe UI Emoji", Arial, sans-serif !important;
                box-shadow: none !important;
            }
            html.ta-intranet-modern .order-metric-field[data-ta-order-field="distance"] .ta-order-native-action-proxy {
                font-size: 0 !important;
            }
            html.ta-intranet-modern .order-metric-field[data-ta-order-field="distance"] .ta-order-native-action-proxy::before {
                content: "💾";
                font: 400 14px/28px "Segoe UI Emoji", Arial, sans-serif;
            }
            html.ta-intranet-modern [data-ta-order-section="assignment"] [data-ta-intranet-role="order-details-label"] a {
                display: inline !important;
                margin-left: 4px;
                color: #4f7e2c !important;
                font-size: 8px !important;
                font-weight: 900 !important;
                text-decoration: underline !important;
                text-decoration-color: #a8c98a !important;
                text-underline-offset: 2px;
            }
            html.ta-intranet-modern #ta-order-save-notice {
                position: fixed;
                z-index: 2147483647;
                top: 12px;
                left: 50%;
                max-width: min(620px, calc(100vw - 30px));
                transform: translateX(-50%);
                box-sizing: border-box;
                padding: 9px 13px;
                border: 1px solid #d2a49b;
                border-radius: 8px;
                background: #fff2ef;
                color: #8d3f33;
                font: 700 11px/1.35 Arial, sans-serif;
                box-shadow: 0 8px 24px rgba(35, 52, 68, .18);
            }
            html.ta-intranet-modern #ta-order-save-notice[data-tone="success"] {
                border-color: #a8c78b;
                background: #eff7e9;
                color: #3f6f22;
            }
            html.ta-intranet-modern [data-ta-intranet-role="order-details-table"] td {
                box-sizing: border-box;
                padding: 4px 6px !important;
                border: 0 !important;
                border-bottom: 0 !important;
                background: #fff !important;
                color: #263e5b !important;
                font-size: 10px !important;
                vertical-align: middle !important;
            }
            html.ta-intranet-modern [data-ta-intranet-role="order-details-label"] {
                width: auto !important;
                min-width: 0;
                background: #f0f4ed !important;
                color: #244b73 !important;
                font-weight: 800 !important;
                text-align: left !important;
            }
            html.ta-intranet-modern [data-ta-intranet-role="order-details-value"] {
                min-width: 0;
            }
            html.ta-intranet-modern.ta-intranet-page-order-details [data-ta-order-invoice-row="duplicate-presentation"] {
                display: none !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-details [data-ta-order-invoice-row="editable"] [data-ta-intranet-role="order-details-value"] {
                display: grid !important;
                grid-template-columns: minmax(0, 1fr) 62px !important;
                gap: 5px !important;
                align-items: center !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-details [data-ta-order-invoice-row="editable"] input[name="nr_f_zob"] {
                width: 100% !important;
                min-width: 0 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-details [data-ta-order-invoice-row="editable"] input[type="submit"] {
                width: 62px !important;
                min-width: 62px !important;
                max-width: 62px !important;
                min-height: 30px !important;
                height: 30px !important;
                margin: 0 !important;
                padding: 0 8px !important;
                border-radius: 7px !important;
                font-size: 9px !important;
                box-shadow: none !important;
            }
            html.ta-intranet-modern [data-ta-intranet-role="order-details-table"] textarea {
                height: 62px !important;
                max-height: 70px;
                resize: vertical;
            }
            html.ta-intranet-modern [data-ta-intranet-field-row="payment-term"] [data-ta-intranet-role="order-details-label"],
            html.ta-intranet-modern [data-ta-intranet-field-row="delivery-place"] [data-ta-intranet-role="order-details-label"] {
                box-shadow: inset 4px 0 0 #82b93e;
            }
            html.ta-intranet-modern [data-ta-intranet-role="order-details-table"] input[type="submit"],
            html.ta-intranet-modern [data-ta-intranet-role="order-details-table"] input[type="button"],
            html.ta-intranet-modern [data-ta-intranet-role="order-details-table"] button {
                min-height: 32px !important;
                padding: 0 18px !important;
                border: 1px solid #679d31 !important;
                border-radius: 8px !important;
                background: #76ad38 !important;
                color: #fff !important;
                font-weight: 800 !important;
                cursor: pointer;
            }
            html.ta-intranet-modern [data-ta-intranet-action="change-field"] {
                display: inline-flex !important;
                align-items: center;
                justify-content: center;
                min-width: 72px;
                min-height: 27px;
                margin: 5px 0 0 !important;
                padding: 0 11px !important;
                border: 1px solid #679d31 !important;
                border-radius: 7px !important;
                background: linear-gradient(135deg, #82bd3d, #659f2d) !important;
                color: #fff !important;
                font-size: 0 !important;
                font-weight: 800 !important;
                line-height: 25px !important;
                text-decoration: none !important;
                box-shadow: 0 3px 8px rgba(85, 135, 40, .18);
            }
            html.ta-intranet-modern [data-ta-intranet-action="change-field"] img {
                display: none !important;
            }
            html.ta-intranet-modern [data-ta-intranet-action="change-field"]::after {
                content: "ZAPISZ";
                font: 800 9px/25px Arial, sans-serif;
                letter-spacing: .04em;
            }
            html.ta-intranet-modern [data-ta-intranet-action="change-field"]:hover {
                border-color: #568b24 !important;
                background: linear-gradient(135deg, #76ae35, #568d27) !important;
                transform: translateY(-1px);
            }
            html.ta-intranet-modern [data-ta-intranet-action="legacy-image-submit"] {
                position: absolute !important;
                width: 1px !important;
                height: 1px !important;
                margin: -1px !important;
                padding: 0 !important;
                border: 0 !important;
                clip: rect(0 0 0 0) !important;
                clip-path: inset(50%) !important;
                overflow: hidden !important;
            }
            html.ta-intranet-modern [data-ta-legacy-action-icon="true"] {
                display: none !important;
            }
            html.ta-intranet-modern .ta-legacy-action-caption {
                display: none !important;
            }
            html.ta-intranet-modern [data-ta-legacy-caption-wrapper="true"] {
                display: none !important;
            }
            html.ta-intranet-modern .ta-order-native-action-proxy {
                display: inline-flex !important;
                align-items: center;
                justify-content: center;
                min-width: 62px;
                min-height: 29px !important;
                margin: 0 !important;
                padding: 0 9px !important;
                border: 1px solid #a9c68d !important;
                border-radius: 7px !important;
                background: #f1f7eb !important;
                color: #4e7c26 !important;
                font: 800 8px/27px Arial, sans-serif !important;
                letter-spacing: .03em;
                cursor: pointer;
                box-shadow: none;
            }
            html.ta-intranet-modern [data-ta-intranet-action="change-field"] {
                min-width: 62px;
                min-height: 29px;
                margin: 0 !important;
                padding: 0 9px !important;
                border-color: #a9c68d !important;
                background: #f1f7eb !important;
                color: #4e7c26 !important;
                box-shadow: none;
            }
            html.ta-intranet-modern [data-ta-intranet-action="change-field"]::after {
                font-size: 8px;
                line-height: 27px;
            }
            html.ta-intranet-modern [data-ta-intranet-action="change-field"]:hover,
            html.ta-intranet-modern .ta-order-native-action-proxy:hover {
                border-color: #8fb36e !important;
                background: #e8f2df !important;
                color: #3f6c1d !important;
                transform: none;
            }
            html.ta-intranet-modern [data-ta-intranet-action="inline-save"] {
                width: auto !important;
                min-width: 58px !important;
                min-height: 28px !important;
                margin: 0 !important;
                padding: 0 8px !important;
                border: 1px solid #a9c68d !important;
                border-radius: 7px !important;
                background: #f1f7eb !important;
                color: #4e7c26 !important;
                font: 800 8px/26px Arial, sans-serif !important;
                box-shadow: none !important;
            }
            html.ta-intranet-modern [data-ta-intranet-action="final-save"],
            html.ta-intranet-modern .ta-order-final-save {
                display: flex !important;
                width: 168px !important;
                min-height: 39px !important;
                margin: 4px auto !important;
                padding: 0 20px !important;
                align-items: center;
                justify-content: center;
                border: 1px solid #5c9228 !important;
                border-radius: 9px !important;
                background: linear-gradient(135deg, #82bd3d, #619c2a) !important;
                color: #fff !important;
                font: 900 10px/37px Arial, sans-serif !important;
                letter-spacing: .05em;
                box-shadow: 0 5px 13px rgba(80, 128, 37, .22) !important;
            }
            .ta-native-select-search {
                display: none;
            }
            html.ta-intranet-modern .ta-native-select-search {
                position: relative;
                z-index: 20;
                display: block;
                width: 100%;
                margin: 0;
            }
            html.ta-intranet-modern .ta-native-select-search input {
                width: 100% !important;
                min-height: 30px !important;
                padding-right: 42px !important;
                border-color: #a9bdcf !important;
                border-radius: 7px !important;
                background: #fbfcfa !important;
            }
            html.ta-intranet-modern .ta-native-select-count {
                position: absolute;
                top: 50%;
                right: 25px;
                min-width: 16px;
                transform: translateY(-50%);
                color: #718094;
                font-size: 8px;
                font-weight: 700;
                text-align: center;
                white-space: nowrap;
                pointer-events: none;
            }
            html.ta-intranet-modern .ta-native-select-results {
                position: static;
                width: 100%;
                max-height: 126px;
                margin-top: 4px;
                padding: 4px;
                overflow-y: auto;
                border: 1px solid #9fb995;
                border-radius: 8px;
                background: #fff;
                box-shadow: 0 12px 26px rgba(22, 51, 80, .18);
            }
            html.ta-intranet-modern .ta-native-select-results[hidden] {
                display: none !important;
            }
            html.ta-intranet-modern .ta-native-select-results button {
                display: block !important;
                width: 100% !important;
                min-height: 30px !important;
                margin: 0 !important;
                padding: 5px 9px !important;
                border: 0 !important;
                border-radius: 5px !important;
                background: #fff !important;
                color: #183b65 !important;
                font: 700 10px/1.25 Arial, sans-serif !important;
                text-align: left !important;
                box-shadow: none !important;
                cursor: pointer;
            }
            html.ta-intranet-modern .ta-native-select-results button:hover,
            html.ta-intranet-modern .ta-native-select-results button[data-active="true"] {
                background: #edf5e8 !important;
                color: #244f2e !important;
            }
            html.ta-intranet-modern .ta-native-select-results button[aria-selected="true"] {
                box-shadow: inset 3px 0 #78ad3c !important;
            }
            html.ta-intranet-modern .ta-native-select-empty {
                padding: 9px;
                color: #778596;
                font-size: 9px;
                text-align: center;
            }
            html.ta-intranet-modern select.ta-native-select-source {
                display: none !important;
            }
            html.ta-intranet-modern [data-ta-search-row] {
                min-height: 76px !important;
                overflow: visible !important;
                align-content: start;
                vertical-align: top !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-order-form [data-ta-search-row] {
                min-height: 96px !important;
            }

            html.ta-intranet-modern.ta-intranet-page-accepted-orders,
            html.ta-intranet-modern.ta-intranet-page-accepted-orders body {
                min-height: 100%;
                background: #f3f5f1 !important;
                color: #1a3152 !important;
                font-family: Arial, "Segoe UI", sans-serif !important;
            }
            html.ta-intranet-modern.ta-intranet-page-accepted-orders body {
                margin: 0 !important;
                padding: 0 0 38px !important;
            }
            html.ta-intranet-modern [data-ta-intranet-role="top-header"] {
                width: 100% !important;
                min-height: 76px;
                border-spacing: 0 !important;
                border-bottom: 3px solid #89c43f !important;
                background: #fff !important;
                box-shadow: 0 2px 12px rgba(28, 55, 83, .09);
            }
            html.ta-intranet-modern [data-ta-intranet-role="top-header"] td {
                padding: 10px 12px !important;
                background: transparent !important;
                vertical-align: middle !important;
            }
            html.ta-intranet-modern [data-ta-intranet-role="top-nav-link"],
            html.ta-intranet-modern [data-ta-intranet-role="top-nav-logout"] {
                display: inline-flex !important;
                align-items: center;
                min-height: 34px;
                margin: 2px !important;
                padding: 0 13px !important;
                justify-content: center;
                border: 1px solid #cbd5df !important;
                border-radius: 8px !important;
                background: #f7f8f6 !important;
                color: #183f75 !important;
                font-weight: 700 !important;
                text-decoration: none !important;
                transition: background .14s ease, border-color .14s ease, color .14s ease;
            }
            html.ta-intranet-modern [data-ta-intranet-role="top-nav-link"]:hover {
                border-color: #9eb1c6 !important;
                background: #eef1f4 !important;
                color: #102f5d !important;
            }
            html.ta-intranet-modern [data-ta-intranet-role="top-nav-logout"] {
                border-color: #9fca74 !important;
                background: #f1f8e9 !important;
                color: #356f1d !important;
            }
            html.ta-intranet-modern [data-ta-intranet-role="breadcrumb"] {
                width: 100% !important;
                border-spacing: 0 !important;
                background: #fff !important;
                color: #60768b !important;
                box-shadow: 0 1px 0 #dce6ee;
            }
            html.ta-intranet-modern [data-ta-intranet-role="breadcrumb"] td {
                padding: 7px 16px !important;
                background: transparent !important;
                font-size: 11px !important;
                font-weight: 700 !important;
            }
            html.ta-intranet-modern [data-ta-intranet-role="page-shell"] {
                width: 100% !important;
                max-width: 100vw !important;
                border-spacing: 0 !important;
                table-layout: fixed !important;
                background: transparent !important;
            }
            html.ta-intranet-modern [data-ta-intranet-role="side-navigation"] {
                width: 178px !important;
                min-width: 178px !important;
                padding: 10px 7px 0 9px !important;
                border-right: 1px solid #e2e8df !important;
                background: #f8faf7 !important;
                vertical-align: top !important;
            }
            html.ta-intranet-modern [data-ta-intranet-role="side-nav-item"] {
                width: 100% !important;
                margin: 0 0 4px !important;
                border: 0 !important;
                border-spacing: 0 !important;
                border-radius: 6px !important;
                background: transparent !important;
                overflow: hidden;
            }
            html.ta-intranet-modern [data-ta-intranet-role="side-nav-item"] td {
                padding: 0 !important;
                border: 0 !important;
                background: transparent !important;
            }
            html.ta-intranet-modern [data-ta-intranet-role="side-nav-link"] {
                display: flex !important;
                align-items: center !important;
                justify-content: flex-start !important;
                box-sizing: border-box !important;
                min-height: 40px;
                padding: 6px 12px !important;
                border: 0 !important;
                border-radius: 6px !important;
                background: transparent !important;
                color: #233f66 !important;
                font-size: 11px !important;
                font-weight: 600 !important;
                line-height: 1.2 !important;
                text-align: left !important;
                text-decoration: none !important;
                box-shadow: none !important;
                transition: background-color .15s ease, color .15s ease;
            }
            html.ta-intranet-modern [data-ta-intranet-role="side-nav-link"]:hover {
                background: #edf3e9 !important;
                color: #193c68 !important;
            }
            html.ta-intranet-modern [data-ta-intranet-role="side-nav-link"][data-ta-intranet-current="true"] {
                padding-left: 10px !important;
                border-left: 4px solid #76ad38 !important;
                background: #edf6e7 !important;
                color: #234f32 !important;
                font-weight: 700 !important;
            }
            html.ta-intranet-modern [data-ta-intranet-role="main-content"] {
                width: calc(100vw - 178px) !important;
                max-width: calc(100vw - 178px) !important;
                min-width: 0 !important;
                padding: 13px 14px 24px 4px !important;
                background: transparent !important;
                vertical-align: top !important;
                overflow: hidden !important;
            }
            html.ta-intranet-modern.ta-intranet-page-accepted-orders [data-ta-intranet-role="main-content"] {
                box-sizing: border-box !important;
                padding-right: 20px !important;
                overflow-x: hidden !important;
            }
            html.ta-intranet-modern.ta-intranet-page-accepted-orders .ta-orders-viewport {
                width: 100% !important;
                max-width: 100% !important;
                overflow-x: hidden !important;
                scrollbar-gutter: auto !important;
            }
            html.ta-intranet-modern.ta-intranet-page-acceptance-list [data-ta-intranet-role="main-content"] {
                box-sizing: border-box !important;
                padding: 13px 20px 28px 10px !important;
            }
            html.ta-intranet-modern .ta-orders-viewport {
                display: block;
                width: 100%;
                max-width: 100%;
                box-sizing: border-box;
                overflow-x: auto;
                overflow-y: visible;
                scrollbar-gutter: stable;
                overscroll-behavior-inline: contain;
            }
            html.ta-intranet-modern.ta-intranet-page-acceptance-list [data-ta-intranet-role="acceptance-heading"] {
                width: 100% !important;
                margin: 0 0 8px !important;
                border: 0 !important;
                border-top: 3px solid #6fb335 !important;
                border-spacing: 0 !important;
                border-radius: 10px !important;
                background: #fff !important;
                box-shadow: 0 8px 22px rgba(25, 57, 85, .07) !important;
                overflow: hidden;
            }
            html.ta-intranet-modern.ta-intranet-page-acceptance-list [data-ta-intranet-role="acceptance-heading"] td {
                padding: 11px 14px !important;
                border: 0 !important;
                background: transparent !important;
                color: #123f78 !important;
                font-size: 14px !important;
                font-weight: 800 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-acceptance-list [data-ta-intranet-role="acceptance-heading"] img {
                display: none !important;
            }
            html.ta-intranet-modern.ta-intranet-page-acceptance-list [data-ta-intranet-role="acceptance-toolbar"] {
                width: 100% !important;
                margin: 0 0 10px !important;
                border: 1px solid #d9e3d5 !important;
                border-spacing: 0 !important;
                border-radius: 9px !important;
                background: #f8faf7 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-acceptance-list [data-ta-intranet-role="acceptance-toolbar"] td {
                padding: 8px 12px !important;
                border: 0 !important;
                background: transparent !important;
                color: #24466f !important;
                font-size: 10px !important;
                font-weight: 800 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-acceptance-list [data-ta-intranet-role="acceptance-forwarder-filter"] {
                min-width: 150px !important;
                height: 32px !important;
                margin-left: 8px !important;
                padding: 0 30px 0 10px !important;
                border: 1px solid #b7c9d8 !important;
                border-radius: 7px !important;
                background: #fff !important;
                color: #173f75 !important;
                font-size: 10px !important;
                font-weight: 700 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-acceptance-list [data-ta-intranet-role="acceptance-table"] {
                width: 100% !important;
                min-width: 1260px !important;
                margin: 0 !important;
                border: 0 !important;
                border-collapse: separate !important;
                border-spacing: 0 3px !important;
                table-layout: fixed !important;
                background: transparent !important;
                color: #173654 !important;
                font-family: Arial, "Segoe UI", sans-serif !important;
            }
            html.ta-intranet-modern.ta-intranet-page-acceptance-list [data-ta-acceptance-row="header"] td {
                height: 34px !important;
                padding: 0 9px !important;
                border: 0 !important;
                border-right: 1px solid rgba(255,255,255,.13) !important;
                background: #18477e !important;
                color: #fff !important;
                font-size: 10px !important;
                font-weight: 800 !important;
                line-height: 1.15 !important;
                text-align: left !important;
                vertical-align: middle !important;
            }
            html.ta-intranet-modern.ta-intranet-page-acceptance-list [data-ta-acceptance-row="header"] td:first-child {
                border-radius: 8px 0 0 8px !important;
                text-align: center !important;
            }
            html.ta-intranet-modern.ta-intranet-page-acceptance-list [data-ta-acceptance-row="header"] td:last-child {
                border-right: 0 !important;
                border-radius: 0 8px 8px 0 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-acceptance-list [data-ta-acceptance-row="offer"] td {
                box-sizing: border-box !important;
                height: 37px !important;
                padding: 5px 9px !important;
                border-top: 1px solid #dce6ed !important;
                border-bottom: 1px solid #dce6ed !important;
                background: #fff !important;
                color: #183957 !important;
                font-size: 10px !important;
                line-height: 1.25 !important;
                vertical-align: middle !important;
            }
            html.ta-intranet-modern.ta-intranet-page-acceptance-list [data-ta-acceptance-row="offer"]:nth-child(odd) td {
                background: #f8fafb !important;
            }
            html.ta-intranet-modern.ta-intranet-page-acceptance-list [data-ta-acceptance-row="offer"]:hover td {
                border-color: #c8d8be !important;
                background: #f0f6eb !important;
            }
            html.ta-intranet-modern.ta-intranet-page-acceptance-list [data-ta-acceptance-row="offer"] td:first-child {
                border-left: 1px solid #dce6ed !important;
                border-radius: 7px 0 0 7px !important;
                text-align: center !important;
                color: #708198 !important;
                font-weight: 700 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-acceptance-list [data-ta-acceptance-row="offer"] td:last-child {
                border-right: 1px solid #dce6ed !important;
                border-radius: 0 7px 7px 0 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-acceptance-list [data-ta-acceptance-column="position"] { width: 42px; }
            html.ta-intranet-modern.ta-intranet-page-acceptance-list [data-ta-acceptance-column="round-number"] { width: 155px; }
            html.ta-intranet-modern.ta-intranet-page-acceptance-list [data-ta-acceptance-column="offer-number"] { width: 88px; text-align: center !important; }
            html.ta-intranet-modern.ta-intranet-page-acceptance-list [data-ta-acceptance-column="loading-date"] { width: 112px; }
            html.ta-intranet-modern.ta-intranet-page-acceptance-list [data-ta-acceptance-column="offerer"] { width: 205px; }
            html.ta-intranet-modern.ta-intranet-page-acceptance-list [data-ta-acceptance-column="loading-place"] { width: 350px; }
            html.ta-intranet-modern.ta-intranet-page-acceptance-list [data-ta-acceptance-column="delivery-place"] { width: 175px; }
            html.ta-intranet-modern.ta-intranet-page-acceptance-list [data-ta-acceptance-column="distance"] { width: 82px; text-align: center !important; }
            html.ta-intranet-modern.ta-intranet-page-acceptance-list [data-ta-acceptance-column="forwarder"] { width: 180px; text-align: center !important; }
            html.ta-intranet-modern.ta-intranet-page-acceptance-list [data-ta-acceptance-action="create-order"] {
                display: inline-flex !important;
                min-width: 58px;
                min-height: 25px;
                padding: 0 8px !important;
                align-items: center;
                justify-content: center;
                border: 1px solid #aebfd0 !important;
                border-radius: 6px !important;
                background: #f1f5f8 !important;
                color: #123f78 !important;
                font-size: 9px !important;
                font-weight: 800 !important;
                text-decoration: none !important;
                transition: background-color .15s ease, border-color .15s ease, transform .15s ease;
            }
            html.ta-intranet-modern.ta-intranet-page-acceptance-list [data-ta-acceptance-action="create-order"]:hover {
                border-color: #79a64b !important;
                background: #edf6e7 !important;
                color: #285a28 !important;
                transform: translateY(-1px);
            }
            html.ta-intranet-modern.ta-intranet-page-acceptance-list .ta-acceptance-forwarder-actions {
                display: flex;
                width: 100%;
                align-items: center;
                justify-content: space-between;
                gap: 5px;
                white-space: nowrap;
            }
            html.ta-intranet-modern.ta-intranet-page-acceptance-list .ta-acceptance-forwarder-name {
                min-width: 0;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            html.ta-intranet-modern.ta-intranet-page-acceptance-list .ta-acceptance-cancel-offer {
                box-sizing: border-box !important;
                min-width: 53px !important;
                min-height: 25px !important;
                margin: 0 !important;
                padding: 0 7px !important;
                border: 1px solid #ddb5ac !important;
                border-radius: 6px !important;
                background: #fff5f2 !important;
                color: #a33d2e !important;
                font: 800 8px/23px Arial, sans-serif !important;
                text-transform: uppercase;
                box-shadow: none !important;
                cursor: pointer;
                transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease;
            }
            html.ta-intranet-modern.ta-intranet-page-acceptance-list .ta-acceptance-cancel-offer:hover:not(:disabled) {
                border-color: #c96d5b !important;
                background: #fde8e3 !important;
                color: #8d2f22 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-acceptance-list .ta-acceptance-cancel-offer:disabled {
                opacity: .58;
                cursor: wait;
            }
            html.ta-intranet-classic .ta-acceptance-cancel-offer {
                display: none !important;
            }
            .ta-acceptance-dialog-backdrop {
                position: fixed;
                inset: 0;
                z-index: 2147483646;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                background: rgba(10, 29, 52, .48);
                opacity: 0;
                transition: opacity 160ms ease;
            }
            .ta-acceptance-dialog-backdrop.is-visible { opacity: 1; }
            .ta-acceptance-dialog {
                box-sizing: border-box;
                display: grid;
                grid-template-columns: 42px minmax(0, 1fr);
                gap: 0 14px;
                width: min(430px, calc(100vw - 40px));
                padding: 22px;
                border: 1px solid #d9e2d4;
                border-top: 4px solid #75b334;
                border-radius: 12px;
                background: #fff;
                color: #0b376d;
                box-shadow: 0 20px 55px rgba(13, 38, 66, .28);
                transform: translateY(8px) scale(.985);
                transition: transform 160ms ease;
                font-family: Arial, sans-serif;
            }
            .ta-acceptance-dialog-backdrop.is-visible .ta-acceptance-dialog { transform: none; }
            .ta-acceptance-dialog-backdrop[data-tone="danger"] .ta-acceptance-dialog { border-top-color: #c95b48; }
            .ta-acceptance-dialog-mark {
                display: grid;
                place-items: center;
                width: 38px;
                height: 38px;
                border-radius: 10px;
                background: #edf6e6;
                color: #4f8c20;
                font-size: 20px;
                font-weight: 900;
            }
            .ta-acceptance-dialog-backdrop[data-tone="danger"] .ta-acceptance-dialog-mark {
                background: #fff0ec;
                color: #b44736;
            }
            .ta-acceptance-dialog-eyebrow {
                color: #579326;
                font-size: 9px;
                font-weight: 900;
                letter-spacing: .12em;
            }
            .ta-acceptance-dialog h2 {
                margin: 3px 0 8px;
                color: #0a3974;
                font-size: 18px;
                line-height: 1.2;
            }
            .ta-acceptance-dialog p {
                margin: 0;
                color: #354a5f;
                font-size: 13px;
                line-height: 1.45;
                white-space: pre-line;
            }
            .ta-acceptance-dialog-actions {
                grid-column: 1 / -1;
                display: flex;
                justify-content: flex-end;
                gap: 8px;
                margin-top: 20px;
            }
            .ta-acceptance-dialog-actions button {
                min-height: 34px !important;
                margin: 0 !important;
                padding: 0 15px !important;
                border-radius: 7px !important;
                font: 800 11px/32px Arial, sans-serif !important;
                cursor: pointer;
                box-shadow: none !important;
            }
            .ta-acceptance-dialog-cancel {
                border: 1px solid #cbd6df !important;
                background: #fff !important;
                color: #34516e !important;
            }
            .ta-acceptance-dialog-confirm {
                border: 1px solid #639d31 !important;
                background: #72ad38 !important;
                color: #fff !important;
            }
            .ta-acceptance-dialog-backdrop[data-tone="danger"] .ta-acceptance-dialog-confirm {
                border-color: #ad4636 !important;
                background: #c55543 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-acceptance-list [data-ta-acceptance-action="place-details"] {
                color: #284e73 !important;
                font-weight: 700 !important;
                text-decoration-color: #aab9c5 !important;
                text-underline-offset: 2px;
            }
            html.ta-intranet-modern.ta-intranet-page-acceptance-list [data-ta-acceptance-action="place-details"]:hover {
                color: #39731f !important;
                text-decoration-color: #78a943 !important;
            }
            html.ta-intranet-modern [data-ta-intranet-role="kpi-primary"],
            html.ta-intranet-modern [data-ta-intranet-role="kpi-secondary"] {
                display: none !important;
            }
            html.ta-intranet-modern #${DASHBOARD_ID} {
                display: block;
                width: 100%;
                max-width: 100%;
                min-width: 0;
                box-sizing: border-box;
                margin: 0 0 14px;
                padding: 16px;
                border: 1px solid #d7ddd3;
                border-top: 4px solid #86bf3d;
                border-radius: 13px;
                background: #fff;
                box-shadow: 0 8px 24px rgba(27, 52, 84, .08);
            }
            html.ta-intranet-modern .ta-cemet-dashboard-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 18px;
                margin-bottom: 14px;
                transition: margin-bottom .28s ease;
            }
            html.ta-intranet-modern .ta-cemet-dashboard-kicker,
            html.ta-intranet-modern .ta-cemet-chart-title span {
                display: block;
                margin-bottom: 3px;
                color: #6da52f;
                font-size: 10px;
                font-weight: 900;
                letter-spacing: .13em;
            }
            html.ta-intranet-modern .ta-cemet-dashboard-header h2,
            html.ta-intranet-modern .ta-cemet-chart-title h3 {
                margin: 0;
                color: #173f75;
                font-weight: 800;
            }
            html.ta-intranet-modern .ta-cemet-dashboard-header h2 {
                font-size: 22px;
            }
            html.ta-intranet-modern .ta-cemet-dashboard-header p {
                margin: 4px 0 0;
                color: #718094;
                font-size: 11px;
            }
            html.ta-intranet-modern .ta-cemet-period-slot {
                flex: none;
            }
            html.ta-intranet-modern .ta-cemet-dashboard-actions {
                display: flex;
                align-items: center;
                justify-content: flex-end;
                flex-wrap: wrap;
                gap: 7px;
                max-width: 100%;
            }
            html.ta-intranet-modern .ta-cemet-soft-refresh,
            html.ta-intranet-modern .ta-cemet-dashboard-toggle {
                height: 30px;
                padding: 0 10px;
                border: 1px solid #b9c9b2;
                border-radius: 8px;
                background: #fff;
                color: #315474;
                font: 700 10px Arial, sans-serif;
                cursor: pointer;
            }
            html.ta-intranet-modern .ta-cemet-soft-refresh:hover,
            html.ta-intranet-modern .ta-cemet-dashboard-toggle:hover {
                border-color: #83af5d;
                background: #f5faef;
            }
            html.ta-intranet-modern .ta-cemet-soft-refresh:disabled {
                opacity: .62;
                cursor: wait;
            }
            html.ta-intranet-modern .ta-cemet-soft-refresh-status {
                flex: 0 0 100%;
                min-height: 11px;
                color: #758397;
                font: 600 10px/1.2 Arial, sans-serif;
                text-align: right;
            }
            html.ta-intranet-modern .ta-cemet-soft-refresh-status[data-state="success"] { color: #4f7d25; }
            html.ta-intranet-modern .ta-cemet-soft-refresh-status[data-state="error"] { color: #b44837; }
            html.ta-intranet-modern .ta-cemet-dashboard-content {
                display: grid;
                grid-template-rows: 1fr;
                opacity: 1;
                transition: grid-template-rows .32s cubic-bezier(.2,.75,.3,1), opacity .2s ease;
            }
            html.ta-intranet-modern .ta-cemet-dashboard-content-inner {
                min-height: 0;
                overflow: hidden;
            }
            html.ta-intranet-modern #trans-assistant-intranet-results-dashboard.is-collapsed .ta-cemet-dashboard-header {
                margin-bottom: 0;
            }
            html.ta-intranet-modern #trans-assistant-intranet-results-dashboard.is-collapsed .ta-cemet-dashboard-content {
                grid-template-rows: 0fr;
                opacity: 0;
                pointer-events: none;
            }
            html.ta-intranet-modern [data-ta-intranet-role="period-form"] {
                display: inline-flex !important;
                align-items: center;
                gap: 7px;
                margin: 0 !important;
                padding: 6px 7px !important;
                border: 1px solid #d3dcd0;
                border-radius: 10px;
                background: #f4f7f1;
            }
            html.ta-intranet-modern .ta-cemet-metric-grid {
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: 8px;
                margin-bottom: 9px;
            }
            @property --ta-ring-value {
                syntax: "<percentage>";
                inherits: false;
                initial-value: 0%;
            }
            html.ta-intranet-modern .ta-cemet-metric-card {
                position: relative;
                min-width: 0;
                min-height: 76px;
                box-sizing: border-box;
                padding: 9px 84px 9px 10px;
                border: 1px solid #dce2dc;
                border-radius: 10px;
                background: #fafbf9;
            }
            html.ta-intranet-modern .ta-cemet-metric-label {
                display: flex;
                align-items: center;
                gap: 6px;
                min-height: 16px;
                color: #667487;
                font-size: 11px;
                font-weight: 700;
            }
            html.ta-intranet-modern .ta-cemet-metric-label i {
                width: 7px;
                height: 7px;
                border-radius: 50%;
                background: #173f75;
            }
            html.ta-intranet-modern .ta-cemet-metric-card[data-metric-index="2"] .ta-cemet-metric-label i,
            html.ta-intranet-modern .ta-cemet-metric-card[data-metric-index="3"] .ta-cemet-metric-label i {
                background: #80ba39;
            }
            html.ta-intranet-modern .ta-cemet-metric-card > strong {
                display: block;
                margin: 5px 0 4px;
                color: #173f75;
                font-size: 22px;
                line-height: 1;
                white-space: nowrap;
            }
            html.ta-intranet-modern .ta-cemet-metric-comparison {
                color: #778596;
                font-size: 10px;
            }
            html.ta-intranet-modern .ta-cemet-metric-comparison span {
                display: block;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            html.ta-intranet-modern .ta-cemet-metric-comparison b {
                --ta-ring-color: #2b5d92;
                --ta-ring-value: 0%;
                position: absolute;
                top: 50%;
                right: 10px;
                display: grid;
                width: 64px;
                height: 64px;
                box-sizing: border-box;
                padding: 0;
                place-items: center;
                transform: translateY(-50%);
                border: 1px solid #d8e0e5;
                border-radius: 50%;
                background:
                    radial-gradient(circle at center, #fafbf9 0 63%, transparent 65%),
                    conic-gradient(var(--ta-ring-color) var(--ta-ring-value), #e7ecef 0);
                box-shadow: 0 3px 9px rgba(23, 63, 117, .10);
                color: #173f75;
                font-size: 11px;
                font-weight: 900;
                line-height: 1;
                white-space: nowrap;
                transition: --ta-ring-value 4s linear(0, .1438 10%, .2826 20%, .4122 30%, .5286 40%, .6313 50%, .7246 60%, .8068 70%, .8781 80%, .9482 90%, 1) var(--ta-ring-delay, 0ms), transform .15s ease;
            }
            html.ta-intranet-modern .ta-cemet-metric-comparison b[data-ratio-tone="favorable"] {
                --ta-ring-color: #78b438;
                color: #4e7f22;
            }
            html.ta-intranet-modern #trans-assistant-intranet-results-dashboard.are-indicators-ready .ta-cemet-metric-comparison b {
                --ta-ring-value: var(--ta-ring-progress, 0%);
            }
            html.ta-intranet-modern .ta-cemet-metric-card small {
                display: block;
                margin-top: 8px;
                padding-top: 7px;
                border-top: 1px solid #e4e8e2;
                color: #7b8897;
                font-size: 10px;
            }
            html.ta-intranet-modern .ta-cemet-metric-card small b {
                color: #344d6d;
            }
            html.ta-intranet-modern .ta-cemet-dashboard-charts {
                display: grid;
                grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
                gap: 10px;
            }
            html.ta-intranet-modern .ta-cemet-chart-card {
                padding: 13px;
                border: 1px solid #dce2dc;
                border-radius: 10px;
                background: #fff;
            }
            html.ta-intranet-modern .ta-cemet-chart-title {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 10px;
                margin-bottom: 10px;
            }
            html.ta-intranet-modern .ta-cemet-chart-title h3 {
                font-size: 14px;
            }
            html.ta-intranet-modern .ta-cemet-chart-title small {
                color: #8793a0;
                font-size: 9px;
                white-space: nowrap;
            }
            html.ta-intranet-modern .ta-cemet-progress-row + .ta-cemet-progress-row {
                margin-top: 10px;
            }
            html.ta-intranet-modern .ta-cemet-progress-heading,
            html.ta-intranet-modern .ta-cemet-progress-meta {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
            }
            html.ta-intranet-modern .ta-cemet-progress-heading {
                margin-bottom: 4px;
                color: #56677a;
                font-size: 10px;
            }
            html.ta-intranet-modern .ta-cemet-progress-heading strong {
                color: #173f75;
                font-size: 11px;
            }
            html.ta-intranet-modern .ta-cemet-progress-track {
                position: relative;
                height: 11px;
                overflow: hidden;
                border-radius: 999px;
                background: #e7ebed;
            }
            html.ta-intranet-modern .ta-cemet-progress-fill {
                display: block;
                width: 0;
                height: 100%;
                border-radius: inherit;
                background: linear-gradient(90deg, #173f75, #2c5c91);
                transition: width 4s linear(0, .1438 10%, .2826 20%, .4122 30%, .5286 40%, .6313 50%, .7246 60%, .8068 70%, .8781 80%, .9482 90%, 1) var(--ta-progress-delay, 0ms);
            }
            html.ta-intranet-modern #trans-assistant-intranet-results-dashboard.are-indicators-ready .ta-cemet-progress-fill {
                width: var(--ta-progress-width, 0%);
            }
            html.ta-intranet-modern .ta-cemet-progress-reference {
                position: absolute;
                top: -2px;
                bottom: -2px;
                left: 80%;
                z-index: 3;
                width: 3px;
                border-radius: 2px;
                background: #fff;
                box-shadow: 0 0 0 1px #173f75;
                opacity: 1;
            }
            html.ta-intranet-modern .ta-cemet-progress-meta {
                margin-top: 3px;
                color: #8a949f;
                font-size: 9px;
            }
            html.ta-intranet-modern .ta-cemet-progress-meta b {
                color: #53657a;
            }
            @media (prefers-reduced-motion: reduce) {
                html.ta-intranet-modern .ta-cemet-dashboard-header,
                html.ta-intranet-modern .ta-cemet-dashboard-content,
                html.ta-intranet-modern .ta-cemet-metric-comparison b,
                html.ta-intranet-modern .ta-cemet-progress-fill {
                    transition-duration: .01ms !important;
                    transition-delay: 0ms !important;
                }
            }
            html.ta-intranet-modern [data-ta-intranet-role="period-select"],
            html.ta-intranet-modern [data-ta-intranet-role="column-filter"] {
                box-sizing: border-box !important;
                width: 100% !important;
                max-width: 100% !important;
                height: 30px !important;
                padding: 3px 25px 3px 8px !important;
                border: 1px solid #bac7b5 !important;
                border-radius: 7px !important;
                background: #fff !important;
                color: #253f65 !important;
                font-family: Arial, "Segoe UI", sans-serif !important;
                font-size: 11px !important;
                outline: none !important;
            }
            html.ta-intranet-modern [data-ta-intranet-role="period-select"]:focus,
            html.ta-intranet-modern [data-ta-intranet-role="column-filter"]:focus {
                border-color: #79aa42 !important;
                box-shadow: 0 0 0 3px rgba(121, 170, 66, .15) !important;
            }
            html.ta-intranet-modern [data-ta-intranet-role="orders-search-form"] {
                display: block !important;
                width: 100% !important;
                overflow: visible !important;
            }
            html.ta-intranet-modern [data-ta-intranet-role="orders-table"] {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                margin: 3px 0 0 !important;
                border: 0 !important;
                border-spacing: 0 3px !important;
                table-layout: fixed !important;
                background: transparent !important;
                color: #1c3449 !important;
                font-family: Arial, "Segoe UI", sans-serif !important;
            }
            html.ta-intranet-modern [data-ta-intranet-row="filters"] td {
                position: sticky;
                top: 0;
                z-index: 22;
                height: 39px !important;
                padding: 4px 5px !important;
                border: 0 !important;
                border-bottom: 1px solid #d3dbd0 !important;
                background: #edf1ea !important;
            }
            html.ta-intranet-modern [data-ta-intranet-row="headers"] td {
                position: sticky;
                top: 39px;
                z-index: 21;
                height: 39px !important;
                padding: 7px 6px !important;
                border: 0 !important;
                border-right: 1px solid rgba(255, 255, 255, .12) !important;
                background: #173f75 !important;
                color: #fff !important;
                font-size: 11px !important;
                font-weight: 800 !important;
                line-height: 1.15 !important;
                text-align: center !important;
                white-space: nowrap;
            }
            html.ta-intranet-modern [data-ta-intranet-row="headers"] td:first-child {
                border-radius: 8px 0 0 8px;
            }
            html.ta-intranet-modern [data-ta-intranet-row="headers"] td:last-child {
                border-radius: 0 8px 8px 0;
            }
            html.ta-intranet-modern [data-ta-intranet-row="order"] td {
                height: 40px !important;
                padding: 4px 6px !important;
                border: 0 !important;
                border-top: 1px solid #dce6ed !important;
                border-bottom: 1px solid #dce6ed !important;
                color: #1c3449 !important;
                font-size: 10px !important;
                line-height: 1.25 !important;
                vertical-align: middle !important;
                overflow-wrap: anywhere;
            }
            html.ta-intranet-modern [data-ta-intranet-row="order"] td:not([data-ta-intranet-column="margin"]) {
                background: #fff !important;
            }
            html.ta-intranet-modern [data-ta-intranet-row="order"][data-ta-intranet-stripe="0"] td:not([data-ta-intranet-column="margin"]) {
                background: #f8fbfd !important;
            }
            html.ta-intranet-modern [data-ta-intranet-row="order"] td:first-child {
                border-left: 1px solid #dce6ed !important;
                border-radius: 8px 0 0 8px;
            }
            html.ta-intranet-modern [data-ta-intranet-row="order"] td:last-child {
                border-right: 1px solid #dce6ed !important;
                border-radius: 0 8px 8px 0;
            }
            html.ta-intranet-modern [data-ta-intranet-row="order"]:hover td:not([data-ta-intranet-column="margin"]) {
                background: #f0f5eb !important;
                border-color: #cad8bf !important;
            }
            html.ta-intranet-modern [data-ta-intranet-column="position"] { width: 2.5%; min-width: 0; }
            html.ta-intranet-modern [data-ta-intranet-column="order-number"] { width: 6.5%; min-width: 0; }
            html.ta-intranet-modern [data-ta-intranet-column="external-number"] { width: 10%; min-width: 0; }
            html.ta-intranet-modern [data-ta-intranet-column="margin"] {
                width: 5%;
                min-width: 0;
                font-weight: 800 !important;
                background: #f5f8f2 !important;
                color: #3e6423 !important;
            }
            html.ta-intranet-modern [data-ta-intranet-column="margin"][data-ta-margin-level="warning"] {
                background: #fff3ef !important;
                color: #a34937 !important;
            }
            html.ta-intranet-modern [data-ta-intranet-column="offerer"] { width: 11%; min-width: 0; }
            html.ta-intranet-modern [data-ta-intranet-column="carrier"] { width: 16%; min-width: 0; }
            html.ta-intranet-modern [data-ta-intranet-column="print"] { width: 5%; min-width: 0; }
            html.ta-intranet-modern [data-ta-intranet-column="destination"] { width: 14%; min-width: 0; }
            html.ta-intranet-modern [data-ta-intranet-column="loading-date"] { width: 6%; min-width: 0; }
            html.ta-intranet-modern [data-ta-intranet-column="loading-time"] {
                width: 6%;
                min-width: 0;
                white-space: nowrap !important;
            }
            html.ta-intranet-modern [data-ta-intranet-column="unloading-date"] { width: 6%; min-width: 0; }
            html.ta-intranet-modern [data-ta-intranet-column="attachment"] { width: 78px; min-width: 78px; }
            html.ta-intranet-modern [data-ta-intranet-column="user"] { width: 7%; min-width: 0; }
            html.ta-intranet-modern [data-ta-intranet-column="external-number"] {
                white-space: nowrap !important;
            }
            html.ta-intranet-modern [data-ta-intranet-column="external-number"] input[type="text"] {
                box-sizing: border-box !important;
                width: calc(100% - 30px) !important;
                min-width: 0 !important;
                margin-right: 3px !important;
                vertical-align: middle !important;
            }
            html.ta-intranet-modern [data-ta-intranet-column="external-number"] [data-ta-intranet-action="save-inline"] {
                vertical-align: middle !important;
            }
            html.ta-intranet-modern [data-ta-intranet-column="loading-time"] [data-ta-intranet-field="loading-time"] {
                box-sizing: border-box !important;
                width: calc(100% - 32px) !important;
                min-width: 38px !important;
                margin-right: 3px !important;
                vertical-align: middle !important;
            }
            html.ta-intranet-modern [data-ta-intranet-column="loading-time"] [data-ta-intranet-action="save-inline"] {
                vertical-align: middle !important;
            }
            html.ta-intranet-modern [data-ta-intranet-action="edit-order"] {
                display: inline-block !important;
                padding: 4px 7px !important;
                border: 1px solid #aebed0 !important;
                border-radius: 6px !important;
                background: #f1f4f7 !important;
                color: #173f75 !important;
                font-weight: 800 !important;
                text-decoration: none !important;
            }
            html.ta-intranet-modern [data-ta-intranet-action="edit-order"]:hover {
                border-color: #718cab !important;
                background: #e8edf3 !important;
            }
            html.ta-intranet-modern [data-ta-intranet-field] {
                box-sizing: border-box !important;
                height: 27px !important;
                margin: 0 3px 0 0 !important;
                padding: 3px 6px !important;
                border: 1px solid #b7cad7 !important;
                border-radius: 6px !important;
                background: #fff !important;
                color: #203e55 !important;
                font: 11px/1 Arial, sans-serif !important;
                outline: none !important;
            }
            html.ta-intranet-modern [data-ta-intranet-field="external-number"] { width: 108px !important; }
            html.ta-intranet-modern [data-ta-intranet-field="loading-time"] { width: 47px !important; }
            html.ta-intranet-modern [data-ta-intranet-field]:focus {
                border-color: #79aa42 !important;
                box-shadow: 0 0 0 3px rgba(121, 170, 66, .15) !important;
            }
            html.ta-intranet-modern [data-ta-intranet-action="save-inline"] {
                box-sizing: border-box !important;
                min-width: 29px !important;
                height: 27px !important;
                margin: 0 !important;
                padding: 0 6px !important;
                border: 1px solid #7daf5b !important;
                border-radius: 6px !important;
                background: #eff8e9 !important;
                color: #397421 !important;
                font: 800 10px/25px Arial, sans-serif !important;
                cursor: pointer !important;
            }
            html.ta-intranet-modern [data-ta-intranet-action="save-inline"]:hover {
                background: #dff1d4 !important;
            }
            html.ta-intranet-modern [data-ta-intranet-action="print-list"],
            html.ta-intranet-modern [data-ta-intranet-action="print-order"],
            html.ta-intranet-modern [data-ta-intranet-action="cancel-order"],
            html.ta-intranet-modern [data-ta-intranet-action="attachment"] {
                display: inline-flex !important;
                align-items: center;
                justify-content: center;
                box-sizing: border-box;
                min-width: 58px;
                height: 22px;
                margin: 1px !important;
                padding: 0 6px !important;
                border: 1px solid #c0cad5 !important;
                border-radius: 6px !important;
                background: #f7f8f9 !important;
                color: #294a73 !important;
                font: 800 0/20px Arial, sans-serif !important;
                letter-spacing: .02em;
                text-decoration: none !important;
                vertical-align: middle;
                transition: border-color .12s ease, background .12s ease, transform .12s ease;
            }
            html.ta-intranet-modern [data-ta-intranet-action="print-list"] img,
            html.ta-intranet-modern [data-ta-intranet-action="print-order"] img,
            html.ta-intranet-modern [data-ta-intranet-action="cancel-order"] img,
            html.ta-intranet-modern [data-ta-intranet-action="attachment"] img {
                display: none !important;
            }
            html.ta-intranet-modern [data-ta-intranet-action="print-list"]::before { content: "LIST"; }
            html.ta-intranet-modern [data-ta-intranet-action="print-order"]::before { content: "ZLECENIE"; }
            html.ta-intranet-modern [data-ta-intranet-action="cancel-order"]::before { content: "ANULUJ"; }
            html.ta-intranet-modern [data-ta-intranet-action="attachment"]::before {
                content: "";
                display: block;
                width: 18px;
                height: 18px;
                flex: 0 0 18px;
                background: currentColor;
                -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.9' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 7V5.8A1.8 1.8 0 0 1 4.8 4h4.7l2.2 2H19a2 2 0 0 1 2 2v5'/%3E%3Cpath d='M3 7v10.2A1.8 1.8 0 0 0 4.8 19H12'/%3E%3Ccircle cx='18' cy='18' r='4'/%3E%3Cpath d='M18 16v4M16 18h4'/%3E%3C/svg%3E") center / contain no-repeat;
                mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.9' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 7V5.8A1.8 1.8 0 0 1 4.8 4h4.7l2.2 2H19a2 2 0 0 1 2 2v5'/%3E%3Cpath d='M3 7v10.2A1.8 1.8 0 0 0 4.8 19H12'/%3E%3Ccircle cx='18' cy='18' r='4'/%3E%3Cpath d='M18 16v4M16 18h4'/%3E%3C/svg%3E") center / contain no-repeat;
            }
            html.ta-intranet-modern [data-ta-intranet-action="print-list"]::before,
            html.ta-intranet-modern [data-ta-intranet-action="print-order"]::before,
            html.ta-intranet-modern [data-ta-intranet-action="cancel-order"]::before,
            html.ta-intranet-modern [data-ta-intranet-action="attachment"]::before {
                font: 800 8px/20px Arial, sans-serif;
            }
            html.ta-intranet-modern [data-ta-intranet-action="print-list"]:hover,
            html.ta-intranet-modern [data-ta-intranet-action="print-order"]:hover,
            html.ta-intranet-modern [data-ta-intranet-action="attachment"]:hover {
                border-color: #7e94ad !important;
                background: #edf1f5 !important;
                transform: translateY(-1px);
            }
            html.ta-intranet-modern [data-ta-intranet-action="cancel-order"] {
                border-color: #dfb8b0 !important;
                background: #fff6f3 !important;
                color: #a24c3d !important;
            }
            html.ta-intranet-modern [data-ta-intranet-action="cancel-order"]:hover {
                border-color: #cf8374 !important;
                background: #ffebe6 !important;
                transform: translateY(-1px);
            }
            html.ta-intranet-modern [data-ta-intranet-action="attachment"] {
                min-width: 42px;
                width: auto;
                height: 26px;
                padding: 0 8px !important;
                border-color: #d5dce1 !important;
                background: #f5f7f8 !important;
                color: #87939e !important;
            }
            html.ta-intranet-modern [data-ta-intranet-action="attachment"][data-ta-attachment-state="empty"] {
                border-color: #d98d82 !important;
                background: #fff0ed !important;
                color: #a94335 !important;
                box-shadow: inset 0 0 0 1px rgba(169, 67, 53, .08);
            }
            html.ta-intranet-modern [data-ta-intranet-action="attachment"][data-ta-attachment-state="present"] {
                border-color: #adc58f !important;
                background: #eef6e8 !important;
                color: #426f25 !important;
            }
            html.ta-intranet-modern [data-ta-intranet-action="attachment"][data-ta-attachment-state="empty"]:hover {
                border-color: #c65f50 !important;
                background: #ffe2dc !important;
                color: #8f3024 !important;
            }
            html.ta-intranet-modern [data-ta-intranet-action="attachment"][data-ta-attachment-state="present"]:hover {
                border-color: #87aa63 !important;
                background: #e4f1da !important;
                color: #315d18 !important;
            }
            html.ta-intranet-modern [data-ta-intranet-column="attachment"] {
                padding: 2px 4px !important;
            }
            html.ta-intranet-modern .ta-order-document-actions {
                display: inline-flex;
                width: 72px;
                height: 34px;
                align-items: center;
                flex-direction: row;
                justify-content: center;
                gap: 4px;
                vertical-align: middle;
            }
            html.ta-intranet-modern .ta-order-document-actions [data-ta-intranet-action="attachment"] {
                width: 34px !important;
                min-width: 34px !important;
                height: 34px !important;
                min-height: 34px !important;
                margin: 0 !important;
                padding: 0 !important;
                flex: 0 0 34px;
                border-radius: 7px !important;
            }
            html.ta-intranet-modern .ta-order-document-actions [data-ta-intranet-action="attachment"]::before {
                width: 21px;
                height: 21px;
                flex-basis: 21px;
            }
            html.ta-intranet-modern .ta-order-pdf-save {
                display: inline-flex !important;
                width: 34px !important;
                min-width: 34px !important;
                height: 34px !important;
                min-height: 34px !important;
                margin: 0 !important;
                padding: 0 !important;
                align-items: center;
                flex: 0 0 34px;
                justify-content: center;
                border: 1px solid #aebed0 !important;
                border-radius: 7px !important;
                background: #f2f5f8 !important;
                color: #173f75 !important;
                font: 900 9px/32px Arial, sans-serif !important;
                letter-spacing: .03em;
                box-shadow: none !important;
                cursor: pointer;
            }
            html.ta-intranet-modern .ta-order-pdf-save:hover {
                border-color: #718cab !important;
                background: #e7edf4 !important;
            }
            html.ta-intranet-modern .ta-order-pdf-save[data-state="saving"] {
                cursor: wait;
                opacity: .65;
            }
            html.ta-intranet-modern .ta-order-pdf-save[data-state="success"] {
                border-color: #8db66a !important;
                background: #edf6e7 !important;
                color: #3e7021 !important;
            }
            html.ta-intranet-modern .ta-order-pdf-save[data-state="error"] {
                border-color: #d69a8e !important;
                background: #fff3ef !important;
                color: #a24c3d !important;
            }
            /* Wspólna warstwa wizualna dla wszystkich modułów. Nie zmienia siatek ani kolejności pól. */
            html.ta-intranet-modern body {
                background: var(--ta-cemet-page) !important;
                color: var(--ta-cemet-text) !important;
                font-family: "Segoe UI", Arial, sans-serif !important;
            }
            html.ta-intranet-modern [data-ta-intranet-role="main-content"] {
                color: var(--ta-cemet-text) !important;
                font-family: "Segoe UI", Arial, sans-serif !important;
            }
            html.ta-intranet-modern .ta-cemet-dashboard,
            html.ta-intranet-modern .ta-order-search-header,
            html.ta-intranet-modern .ta-order-details-header,
            html.ta-intranet-modern [data-ta-intranet-role="business-form-table"],
            html.ta-intranet-modern [data-ta-order-search-criteria="true"],
            html.ta-intranet-modern [data-ta-intranet-role="acceptance-heading"] {
                border-color: var(--ta-cemet-border) !important;
                border-top-color: var(--ta-cemet-green) !important;
                background: var(--ta-cemet-surface) !important;
                box-shadow: var(--ta-cemet-shadow) !important;
            }
            html.ta-intranet-modern [data-ta-intranet-role="order-search-export"] {
                display: inline-flex !important;
                min-height: 28px !important;
                margin: 0 0 7px 4px !important;
                padding: 0 10px !important;
                align-items: center;
                gap: 6px;
                border: 1px solid #a8bf91 !important;
                border-radius: 7px !important;
                background: #f1f7ec !important;
                color: #416e25 !important;
                font-size: 0 !important;
                font-weight: 800 !important;
                text-decoration: none !important;
            }
            html.ta-intranet-modern [data-ta-intranet-role="order-search-export"] img {
                display: none !important;
            }
            html.ta-intranet-modern [data-ta-intranet-role="order-search-export"]::after {
                content: "Eksport CSV";
                font-size: 10px;
            }
            html.ta-intranet-modern [data-ta-intranet-action="invoice-print"] {
                display: inline-flex !important;
                width: 30px !important;
                min-width: 30px !important;
                height: 26px !important;
                min-height: 26px !important;
                margin: 3px auto 0 !important;
                padding: 0 !important;
                align-items: center;
                justify-content: center;
                border: 1px solid #9db3c7 !important;
                border-radius: 6px !important;
                background: #edf3f8 !important;
                color: var(--ta-cemet-navy) !important;
                font-size: 0 !important;
                text-decoration: none !important;
                box-shadow: none !important;
            }
            html.ta-intranet-modern [data-ta-intranet-action="invoice-print"] img {
                display: none !important;
            }
            html.ta-intranet-modern [data-ta-intranet-action="invoice-print"]::after {
                content: "🖨";
                font: 14px/1 "Segoe UI Emoji", "Segoe UI Symbol", sans-serif;
            }
            html.ta-intranet-modern [data-ta-intranet-action="invoice-print"]:hover {
                border-color: #6686a5 !important;
                background: #e1ebf4 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-details [data-ta-order-field="loading-place"],
            html.ta-intranet-modern.ta-intranet-page-order-details [data-ta-order-field="delivery-place"] {
                min-height: 74px !important;
                grid-template-rows: 22px 52px !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-details [data-ta-order-field="loading-place"] [data-ta-intranet-role="order-details-value"],
            html.ta-intranet-modern.ta-intranet-page-order-details [data-ta-order-field="delivery-place"] [data-ta-intranet-role="order-details-value"] {
                box-sizing: border-box !important;
                min-height: 52px !important;
                height: 52px !important;
                padding: 8px 6px !important;
                align-items: center !important;
                align-content: center !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-details [data-ta-order-field="delivery-place"] .ta-order-delivery-editor {
                width: 100% !important;
                align-self: center !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-details [data-ta-order-field="loading-place"] [data-ta-intranet-role="order-details-label"],
            html.ta-intranet-modern.ta-intranet-page-order-details [data-ta-order-field="delivery-place"] [data-ta-intranet-role="order-details-label"],
            html.ta-intranet-modern.ta-intranet-page-order-details [data-ta-intranet-field-row="delivery-place"] [data-ta-intranet-role="order-details-label"],
            html.ta-intranet-modern.ta-intranet-page-order-details [data-ta-intranet-field-row="payment-term"] [data-ta-intranet-role="order-details-label"] {
                box-shadow: none !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-details [data-ta-intranet-role="order-details-table"] .ta-order-delivery-editor > button,
            html.ta-intranet-modern.ta-intranet-page-order-details [data-ta-order-field="loading-place"] .ta-order-native-action-proxy {
                display: inline-flex !important;
                box-sizing: border-box !important;
                width: 30px !important;
                min-width: 30px !important;
                max-width: 30px !important;
                height: 30px !important;
                min-height: 30px !important;
                max-height: 30px !important;
                margin: 0 !important;
                padding: 0 !important;
                align-items: center !important;
                justify-content: center !important;
                overflow: hidden !important;
                border: 1px solid #a8c98a !important;
                border-radius: 7px !important;
                background: #eef6e8 !important;
                color: #426f25 !important;
                font-size: 0 !important;
                line-height: 1 !important;
                box-shadow: none !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-details [data-ta-intranet-role="order-details-table"] .ta-order-delivery-editor > button::after,
            html.ta-intranet-modern.ta-intranet-page-order-details [data-ta-order-field="loading-place"] .ta-order-native-action-proxy::after {
                content: "💾";
                display: block;
                font: 14px/1 "Segoe UI Emoji", Arial, sans-serif !important;
            }
            html.ta-intranet-modern [data-ta-intranet-row="summary"] td {
                padding: 7px 12px !important;
                border: 0 !important;
                border-radius: 7px !important;
                background: #173f75 !important;
                color: #fff !important;
                font-size: 11px !important;
                font-weight: 800 !important;
            }
            .ta-report-page-header,
            .ta-report-date-control,
            .ta-report-submit-proxy,
            .ta-carrier-freight-export-label,
            .ta-carrier-freight-export-toolbar {
                display: none;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report,
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report body {
                min-height: 100%;
                background: #f3f5f1 !important;
                color: #193653 !important;
                font-family: Arial, "Segoe UI", sans-serif !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report body {
                margin: 0 !important;
                padding: 0 0 38px !important;
                overflow-x: hidden !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report [data-ta-intranet-role="main-content"],
            html.ta-intranet-modern.ta-intranet-page-order-register-report [data-ta-intranet-role="main-content"] {
                box-sizing: border-box !important;
                min-width: 0 !important;
                padding: 13px 20px 28px 10px !important;
                overflow-x: hidden !important;
            }
            html.ta-intranet-modern .ta-report-page-header {
                display: block;
                box-sizing: border-box;
                width: 100%;
                min-height: 82px;
                margin: 0 0 10px;
                padding: 14px 17px;
                border: 1px solid #d8e2d5;
                border-top: 3px solid #70b236;
                border-radius: 11px;
                background: #fff;
                box-shadow: 0 9px 24px rgba(25, 57, 85, .07);
            }
            html.ta-intranet-modern .ta-report-page-header span {
                display: block;
                margin-bottom: 5px;
                color: #57951f;
                font-size: 9px;
                font-weight: 900;
                letter-spacing: .11em;
            }
            html.ta-intranet-modern .ta-report-page-header h1 {
                margin: 0;
                color: #123f78;
                font-size: 22px;
                font-weight: 800;
                line-height: 1.05;
            }
            html.ta-intranet-modern .ta-report-page-header p {
                margin: 5px 0 0;
                color: #6c7f92;
                font-size: 9px;
                font-weight: 600;
            }
            html.ta-intranet-modern [data-ta-intranet-role="report-criteria-table"] {
                box-sizing: border-box !important;
                width: min(1040px, 100%) !important;
                margin: 10px auto 14px !important;
                padding: 8px !important;
                border: 1px solid #d7e1d5 !important;
                border-radius: 11px !important;
                border-collapse: separate !important;
                border-spacing: 0 5px !important;
                background: #fff !important;
                box-shadow: 0 8px 22px rgba(25, 57, 85, .06) !important;
                table-layout: fixed !important;
            }
            html.ta-intranet-modern [data-ta-report-criteria-row="true"] td {
                box-sizing: border-box !important;
                min-height: 40px !important;
                padding: 5px 10px !important;
                border: 0 !important;
                border-top: 1px solid #e2e9df !important;
                border-bottom: 1px solid #e2e9df !important;
                background: #fbfcfa !important;
                color: #123f78 !important;
                vertical-align: middle !important;
            }
            html.ta-intranet-modern [data-ta-report-criteria-row="true"] td:first-child {
                border-left: 1px solid #e2e9df !important;
                border-radius: 7px 0 0 7px !important;
            }
            html.ta-intranet-modern [data-ta-report-criteria-row="true"] td:last-child {
                border-right: 1px solid #e2e9df !important;
                border-radius: 0 7px 7px 0 !important;
            }
            html.ta-intranet-modern [data-ta-report-criteria-label="true"] {
                width: 31% !important;
                background: #f2f6ef !important;
                font-size: 11px !important;
                font-weight: 800 !important;
                text-align: left !important;
            }
            html.ta-intranet-modern [data-ta-report-criteria-value="true"] input:not([type="radio"]):not([type="checkbox"]):not([type="image"]),
            html.ta-intranet-modern [data-ta-report-criteria-value="true"] select {
                box-sizing: border-box !important;
                width: 100% !important;
                min-width: 0 !important;
                height: 32px !important;
                padding: 0 10px !important;
                border: 1px solid #b9ccdc !important;
                border-radius: 7px !important;
                background: #fff !important;
                color: #123f78 !important;
                font: 700 10px/30px Arial, sans-serif !important;
            }
            html.ta-intranet-modern .ta-report-native-date-source,
            html.ta-intranet-modern .ta-report-legacy-calendar-trigger,
            html.ta-intranet-modern [data-ta-report-native-submit="true"],
            html.ta-intranet-modern [data-ta-native-submit-caption="true"] {
                display: none !important;
            }
            html.ta-intranet-modern .ta-report-date-control {
                display: inline-grid;
                width: min(360px, 100%);
                grid-template-columns: 32px minmax(130px, 1fr) 32px;
                gap: 5px;
                align-items: center;
            }
            html.ta-intranet-modern .ta-report-date-control input,
            html.ta-intranet-modern .ta-report-date-control button {
                box-sizing: border-box;
                height: 32px;
                border-radius: 7px;
                font: 800 11px Arial, sans-serif;
            }
            html.ta-intranet-modern .ta-report-date-control input {
                min-width: 0;
                padding: 0 9px;
                border: 1px solid #b9ccdc;
                background: #fff;
                color: #123f78;
            }
            html.ta-intranet-modern .ta-report-date-control button {
                border: 1px solid #a8c68d;
                background: #f1f7ec;
                color: #4c8c20;
                cursor: pointer;
            }
            html.ta-intranet-modern .ta-report-date-control button:hover {
                background: #e4f1db;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report [data-ta-carrier-freight-date-range-cell="true"] {
                font-size: 0 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report .ta-carrier-freight-date-range {
                display: grid !important;
                width: 100%;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 12px;
                align-items: center;
                font: 800 11px/1 Arial, sans-serif !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report .ta-carrier-freight-date-field {
                display: grid;
                min-width: 0;
                grid-template-columns: 24px minmax(0, 1fr);
                gap: 7px;
                align-items: center;
                color: #123f78;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report .ta-carrier-freight-date-field > span {
                text-align: right;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report .ta-carrier-freight-date-field .ta-report-date-control {
                width: 100%;
                grid-template-columns: 32px minmax(110px, 1fr) 32px;
            }
            html.ta-intranet-modern .ta-report-submit-proxy {
                display: flex;
                width: 180px;
                min-height: 34px;
                margin: 10px auto !important;
                padding: 0 16px;
                align-items: center;
                justify-content: center;
                border: 1px solid #65a42d;
                border-radius: 7px;
                background: #70b236;
                color: #fff;
                font: 800 10px Arial, sans-serif;
                box-shadow: 0 5px 13px rgba(79, 132, 34, .18);
                cursor: pointer;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report [data-ta-carrier-freight-lookup-cell="true"] {
                position: relative !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report [data-ta-carrier-freight-lookup="true"] {
                width: calc(100% - 92px) !important;
                margin-right: 7px !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report [data-ta-carrier-freight-lookup-action="true"] {
                width: 84px !important;
                height: 32px !important;
                border: 1px solid #65a42d !important;
                border-radius: 7px !important;
                background: #70b236 !important;
                color: #fff !important;
                font: 800 10px Arial, sans-serif !important;
                cursor: pointer;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report [data-ta-carrier-freight-suggestions="true"],
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report #results3 {
                position: absolute !important;
                z-index: 4000 !important;
                top: calc(100% - 4px) !important;
                right: 92px !important;
                left: 10px !important;
                box-sizing: border-box !important;
                max-height: 260px !important;
                padding: 5px !important;
                overflow-y: auto !important;
                border: 1px solid #b9ccdc !important;
                border-radius: 0 0 8px 8px !important;
                background: #fff !important;
                box-shadow: 0 10px 24px rgba(18, 63, 120, .16) !important;
                color: #123f78 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report [data-ta-carrier-freight-suggestions="true"] ul,
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report #results3 ul {
                margin: 0 !important;
                padding: 0 !important;
                list-style: none !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report [data-ta-carrier-freight-suggestions="true"] li,
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report #results3 li {
                margin: 0 !important;
                padding: 0 !important;
                list-style: none !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report [data-ta-carrier-freight-suggestions="true"] li > a,
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report #results3 li > a {
                display: block !important;
                box-sizing: border-box !important;
                min-height: 38px !important;
                padding: 7px 10px !important;
                border: 0 !important;
                border-bottom: 1px solid #e3e9ee !important;
                background: #fff !important;
                color: #123f78 !important;
                font: 700 11px/1.25 Arial, sans-serif !important;
                text-decoration: none !important;
                cursor: pointer;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report [data-ta-carrier-freight-suggestions="true"] li > a:hover,
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report #results3 li > a:hover {
                background: #eef5e9 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report .ta-carrier-freight-export-toolbar {
                display: flex !important;
                box-sizing: border-box;
                width: 100%;
                margin: 0 0 9px !important;
                padding: 8px 10px;
                align-items: center;
                gap: 7px;
                border: 1px solid #d8e2d5;
                border-radius: 9px;
                background: #fff;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report [data-ta-carrier-freight-native-export="true"] {
                display: none !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report button[data-ta-carrier-freight-export] {
                display: inline-flex !important;
                min-height: 32px;
                margin: 0 !important;
                padding: 0 12px !important;
                align-items: center;
                justify-content: center;
                gap: 6px;
                border: 1px solid #b8cbd9 !important;
                border-radius: 7px !important;
                background: #f8fafb !important;
                color: #17457a !important;
                font: 800 10px Arial, sans-serif !important;
                text-decoration: none !important;
                cursor: pointer;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report button[data-ta-carrier-freight-export] > span:first-child {
                color: #5f982b;
                font-size: 11px;
                font-weight: 900;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report button[data-ta-carrier-freight-export="snapshot"][data-ta-snapshot-state="success"] {
                border-color: #83b75c !important;
                background: #eef7e8 !important;
                color: #4f8125 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report button[data-ta-carrier-freight-export="snapshot"][data-ta-snapshot-state="error"] {
                border-color: #e2a395 !important;
                background: #fff3ef !important;
                color: #b44b37 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report button[data-ta-carrier-freight-export]:disabled {
                opacity: .72;
                cursor: wait;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report [data-ta-carrier-freight-legacy-title="true"] {
                display: none !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report .ta-orders-viewport {
                width: 100% !important;
                max-width: 100% !important;
                padding-bottom: 6px;
                overflow-x: auto !important;
                scrollbar-gutter: stable;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report [data-ta-intranet-role="carrier-freight-results"] {
                width: 100% !important;
                min-width: 1050px !important;
                margin: 0 !important;
                border: 0 !important;
                border-collapse: separate !important;
                border-spacing: 0 3px !important;
                table-layout: fixed !important;
                background: transparent !important;
                color: #173654 !important;
                font-family: Arial, "Segoe UI", sans-serif !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report [data-ta-carrier-freight-row="header"] td {
                height: 36px !important;
                padding: 5px 8px !important;
                border: 0 !important;
                border-right: 1px solid rgba(255,255,255,.14) !important;
                background: #18477e !important;
                color: #fff !important;
                font: 800 10px/1.1 Arial, sans-serif !important;
                text-align: center !important;
                vertical-align: middle !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report [data-ta-carrier-freight-row="item"] td {
                height: 45px !important;
                padding: 6px 8px !important;
                border: 0 !important;
                border-top: 1px solid #dce6ed !important;
                border-bottom: 1px solid #dce6ed !important;
                background: #fff !important;
                color: #173654 !important;
                font: 600 10px/1.2 Arial, sans-serif !important;
                text-align: center !important;
                vertical-align: middle !important;
                overflow-wrap: anywhere;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report [data-ta-carrier-freight-row="item"][data-ta-carrier-freight-stripe="1"] td {
                background: #f7fafc !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report [data-ta-carrier-freight-row="item"]:hover td {
                background: #eef5e9 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report [data-ta-carrier-freight-row="summary"] td {
                padding: 8px 10px !important;
                border: 0 !important;
                background: #173f75 !important;
                color: #fff !important;
                font: 800 10px Arial, sans-serif !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report [data-ta-carrier-freight-column="route"],
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report [data-ta-carrier-freight-column="driver"] {
                text-align: left !important;
            }
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report [data-ta-carrier-freight-column="order-number"] { width: 9%; }
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report [data-ta-carrier-freight-column="external-number"] { width: 10%; }
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report [data-ta-carrier-freight-column="route"] { width: 25%; }
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report [data-ta-carrier-freight-column="loading-date"],
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report [data-ta-carrier-freight-column="unloading-date"] { width: 9%; }
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report [data-ta-carrier-freight-column="freight"],
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report [data-ta-carrier-freight-column="discount-payment"] { width: 10%; }
            html.ta-intranet-modern.ta-intranet-page-carrier-freight-report [data-ta-carrier-freight-column="driver"] { width: 18%; }
            html.ta-intranet-classic .ta-report-page-header,
            html.ta-intranet-classic .ta-report-date-control,
            html.ta-intranet-classic .ta-report-submit-proxy,
            html.ta-intranet-classic .ta-carrier-freight-export-label,
            html.ta-intranet-classic .ta-carrier-freight-export-toolbar {
                display: none !important;
            }
            html.ta-intranet-classic [data-ta-carrier-freight-native-export="true"] {
                display: inline-block !important;
            }
            @media (max-width: 820px) {
                html.ta-intranet-modern.ta-intranet-page-carrier-freight-report .ta-carrier-freight-date-range {
                    grid-template-columns: minmax(0, 1fr);
                    gap: 7px;
                }
            }
            .ta-order-register-export-label,
            html.ta-intranet-classic .ta-order-register-header {
                display: none;
            }
            html.ta-intranet-modern.ta-intranet-page-order-register-report,
            html.ta-intranet-modern.ta-intranet-page-order-register-report body {
                min-height: 100%;
                background: #f3f5f1 !important;
                color: #193653 !important;
                font-family: Arial, "Segoe UI", sans-serif !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-register-report body {
                margin: 0 !important;
                padding: 0 0 38px !important;
                overflow-x: hidden !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-register-report [data-ta-intranet-role="main-content"] {
                box-sizing: border-box !important;
                min-width: 0 !important;
                padding: 13px 20px 28px 10px !important;
                overflow-x: hidden !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-register-report .ta-order-register-header {
                display: flex;
                box-sizing: border-box;
                width: 100%;
                min-height: 88px;
                margin: 0 0 10px;
                padding: 15px 18px;
                align-items: center;
                justify-content: space-between;
                border: 1px solid #d8e2d5;
                border-top: 3px solid #70b236;
                border-radius: 11px;
                background: #fff;
                box-shadow: 0 9px 24px rgba(25, 57, 85, .07);
            }
            html.ta-intranet-modern.ta-intranet-page-order-register-report .ta-order-register-header span {
                display: block;
                margin-bottom: 5px;
                color: #57951f;
                font-size: 9px;
                font-weight: 900;
                letter-spacing: .11em;
            }
            html.ta-intranet-modern.ta-intranet-page-order-register-report .ta-order-register-header h1 {
                margin: 0;
                color: #123f78;
                font-size: 22px;
                font-weight: 800;
                line-height: 1.05;
            }
            html.ta-intranet-modern.ta-intranet-page-order-register-report .ta-order-register-header p {
                margin: 5px 0 0;
                color: #6c7f92;
                font-size: 9px;
                font-weight: 600;
            }
            html.ta-intranet-modern.ta-intranet-page-order-register-report [data-ta-intranet-role="order-register-exports"] {
                display: none !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-register-report .ta-order-register-header-actions {
                display: flex;
                align-items: center;
                justify-content: flex-end;
                gap: 7px;
            }
            html.ta-intranet-modern.ta-intranet-page-order-register-report .ta-order-register-export-action {
                display: inline-flex !important;
                box-sizing: border-box !important;
                min-height: 30px;
                padding: 0 11px !important;
                align-items: center;
                justify-content: center;
                gap: 6px;
                border: 1px solid #b9cbd9 !important;
                border-radius: 7px;
                background: #f8fafb !important;
                color: #17457a !important;
                font-size: 9px !important;
                font-weight: 800 !important;
                text-decoration: none !important;
                box-shadow: none !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-register-report .ta-order-register-export-action::before {
                content: "↓";
                color: #5f982b;
                font-size: 13px;
                font-weight: 900;
                line-height: 1;
            }
            html.ta-intranet-modern.ta-intranet-page-order-register-report .ta-order-register-export-action:hover {
                border-color: #90ae7a !important;
                background: #eef5e9 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-register-report .ta-orders-viewport {
                width: 100% !important;
                max-width: 100% !important;
                padding: 0 0 5px;
                overflow-x: auto !important;
                overflow-y: visible !important;
                scrollbar-gutter: stable;
            }
            html.ta-intranet-modern.ta-intranet-page-order-register-report [data-ta-intranet-role="order-register-table"] {
                width: 100% !important;
                min-width: 0 !important;
                margin: 0 !important;
                border: 0 !important;
                border-collapse: separate !important;
                border-spacing: 0 3px !important;
                table-layout: fixed !important;
                background: transparent !important;
                color: #173654 !important;
                font-family: Arial, "Segoe UI", sans-serif !important;
                font-size: 9px !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-register-report [data-ta-order-register-row="header"] td {
                box-sizing: border-box !important;
                height: 36px !important;
                padding: 5px 7px !important;
                border: 0 !important;
                border-right: 1px solid rgba(255,255,255,.14) !important;
                background: #18477e !important;
                color: #fff !important;
                font-size: 9px !important;
                font-weight: 800 !important;
                line-height: 1.08 !important;
                text-align: center !important;
                vertical-align: middle !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-register-report [data-ta-order-register-row="header"] td:first-child {
                border-radius: 8px 0 0 8px !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-register-report [data-ta-order-register-row="header"] td:last-child {
                border-right: 0 !important;
                border-radius: 0 8px 8px 0 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-register-report [data-ta-order-register-row="order"] td {
                box-sizing: border-box !important;
                height: 45px !important;
                padding: 6px 7px !important;
                overflow-wrap: anywhere;
                border: 0 !important;
                border-top: 1px solid #dce6ed !important;
                border-bottom: 1px solid #dce6ed !important;
                background: #fff !important;
                color: #173654 !important;
                font-size: 9px !important;
                font-weight: 600 !important;
                line-height: 1.2 !important;
                text-align: center !important;
                vertical-align: middle !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-register-report [data-ta-order-register-row="order"][data-ta-order-register-stripe="1"] td {
                background: #f7fafc !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-register-report [data-ta-order-register-row="order"]:hover td {
                background: #eef5e9 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-register-report [data-ta-order-register-column="order-number"],
            html.ta-intranet-modern.ta-intranet-page-order-register-report [data-ta-order-register-column="status"] {
                color: #124679 !important;
                font-weight: 800 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-register-report [data-ta-order-register-column="route"],
            html.ta-intranet-modern.ta-intranet-page-order-register-report [data-ta-order-register-column="carrier"],
            html.ta-intranet-modern.ta-intranet-page-order-register-report [data-ta-order-register-column="driver"] {
                text-align: left !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-register-report [data-ta-order-register-column="margin"],
            html.ta-intranet-modern.ta-intranet-page-order-register-report [data-ta-order-register-column="margin-percent"] {
                background: #f0f5ec !important;
                color: #285b2c !important;
                font-weight: 800 !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-register-report [data-ta-order-register-row="order"]:hover [data-ta-order-register-column="margin"],
            html.ta-intranet-modern.ta-intranet-page-order-register-report [data-ta-order-register-row="order"]:hover [data-ta-order-register-column="margin-percent"] {
                background: #e6f1df !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-register-report [data-ta-order-register-row="summary"] td {
                box-sizing: border-box !important;
                padding: 8px 10px !important;
                border: 0 !important;
                background: #173f75 !important;
                color: #fff !important;
                font-size: 10px !important;
                font-weight: 800 !important;
                text-align: right !important;
                vertical-align: middle !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-register-report [data-ta-order-register-column="position"] { width: 2%; }
            html.ta-intranet-modern.ta-intranet-page-order-register-report [data-ta-order-register-column="order-number"] { width: 4.11%; }
            html.ta-intranet-modern.ta-intranet-page-order-register-report [data-ta-order-register-column="status"] { width: 4.85%; }
            html.ta-intranet-modern.ta-intranet-page-order-register-report [data-ta-order-register-column="customer"] { width: 7.49%; }
            html.ta-intranet-modern.ta-intranet-page-order-register-report [data-ta-order-register-column="route"] { width: 11.6%; }
            html.ta-intranet-modern.ta-intranet-page-order-register-report [data-ta-order-register-column="external-number"] { width: 5.54%; }
            html.ta-intranet-modern.ta-intranet-page-order-register-report [data-ta-order-register-column="invoice-number"] { width: 4.64%; }
            html.ta-intranet-modern.ta-intranet-page-order-register-report [data-ta-order-register-column="loading-day"],
            html.ta-intranet-modern.ta-intranet-page-order-register-report [data-ta-order-register-column="unloading-day"] { width: 2.53%; }
            html.ta-intranet-modern.ta-intranet-page-order-register-report [data-ta-order-register-column="distance"] { width: 3.06%; }
            html.ta-intranet-modern.ta-intranet-page-order-register-report [data-ta-order-register-column="offer-freight"],
            html.ta-intranet-modern.ta-intranet-page-order-register-report [data-ta-order-register-column="carrier-freight"],
            html.ta-intranet-modern.ta-intranet-page-order-register-report [data-ta-order-register-column="freight-sk"] { width: 4.32%; }
            html.ta-intranet-modern.ta-intranet-page-order-register-report [data-ta-order-register-column="mass"] { width: 2.42%; }
            html.ta-intranet-modern.ta-intranet-page-order-register-report [data-ta-order-register-column="carrier"] { width: 9.28%; }
            html.ta-intranet-modern.ta-intranet-page-order-register-report [data-ta-order-register-column="type"] { width: 2.74%; }
            html.ta-intranet-modern.ta-intranet-page-order-register-report [data-ta-order-register-column="margin"] { width: 3.8%; }
            html.ta-intranet-modern.ta-intranet-page-order-register-report [data-ta-order-register-column="transporeon"] { width: 4.64%; }
            html.ta-intranet-modern.ta-intranet-page-order-register-report [data-ta-order-register-column="forwarder"] { width: 4.32%; }
            html.ta-intranet-modern.ta-intranet-page-order-register-report [data-ta-order-register-column="driver"] { width: 7.91%; }
            html.ta-intranet-modern.ta-intranet-page-order-register-report [data-ta-order-register-column="margin-percent"] { width: 3.58%; }
            html.ta-intranet-modern.ta-intranet-page-order-details [data-ta-intranet-role="order-details-close"] {
                width: min(1020px, calc(100% - 24px)) !important;
                margin: 7px auto 0 !important;
                border: 0 !important;
                background: transparent !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-details [data-ta-intranet-role="order-details-close"] td {
                padding: 3px !important;
                border: 0 !important;
                background: transparent !important;
                text-align: center !important;
            }
            html.ta-intranet-modern.ta-intranet-page-order-details [data-ta-intranet-role="order-details-close"] a {
                display: inline-flex !important;
                min-width: 170px;
                min-height: 32px;
                box-sizing: border-box;
                align-items: center;
                justify-content: center;
                padding: 0 18px !important;
                border: 1px solid #b5c5d3 !important;
                border-radius: 7px !important;
                background: #f4f7f9 !important;
                color: #244b73 !important;
                font: 800 10px/30px Arial, sans-serif !important;
                text-decoration: none !important;
                box-shadow: 0 2px 6px rgba(26, 56, 88, .06);
                transition: background-color 150ms ease, border-color 150ms ease, box-shadow 150ms ease;
            }
            html.ta-intranet-modern.ta-intranet-page-order-details [data-ta-intranet-role="order-details-close"] a:hover {
                border-color: #8eab75 !important;
                background: #eef6e8 !important;
                box-shadow: 0 3px 8px rgba(73, 111, 42, .1);
            }
            html.ta-intranet-modern.ta-intranet-page-order-details [data-ta-intranet-role="order-details-close"] a[aria-disabled="true"],
            html.ta-intranet-modern.ta-intranet-page-order-details [data-ta-intranet-role="order-details-close"] a[aria-disabled="true"]:hover {
                border-color: #cbd2d7 !important;
                background: #eceff1 !important;
                color: #8c969e !important;
                box-shadow: none !important;
                cursor: not-allowed !important;
                filter: grayscale(1);
                opacity: .65;
                transform: none !important;
            }
            #${ORDER_SAVE_OVERLAY_ID} {
                position: fixed;
                z-index: 2147483646;
                inset: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 24px;
                background: rgba(238, 243, 239, .68);
                backdrop-filter: blur(3px);
                -webkit-backdrop-filter: blur(3px);
            }
            #${ORDER_SAVE_OVERLAY_ID}[hidden] {
                display: none !important;
            }
            #${ORDER_SAVE_OVERLAY_ID} .ta-order-save-overlay-card {
                display: flex;
                min-width: 230px;
                box-sizing: border-box;
                align-items: center;
                flex-direction: column;
                padding: 25px 32px 23px;
                border: 1px solid #d3dfd0;
                border-top: 4px solid #72b333;
                border-radius: 14px;
                background: rgba(255, 255, 255, .96);
                color: #173f75;
                box-shadow: 0 18px 48px rgba(18, 55, 91, .18);
                text-align: center;
            }
            #${ORDER_SAVE_OVERLAY_ID} .ta-order-save-spinner {
                width: 42px;
                height: 42px;
                box-sizing: border-box;
                margin-bottom: 15px;
                border: 4px solid #dce9d2;
                border-top-color: #72b333;
                border-right-color: #17477e;
                border-radius: 50%;
                animation: taAcceptedBootSpin .8s linear infinite;
            }
            #${ORDER_SAVE_OVERLAY_ID} strong {
                font: 800 15px/1.3 Arial, sans-serif;
            }
            @media (max-width: 1500px) {
                html.ta-intranet-modern .ta-cemet-metric-grid {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
                html.ta-intranet-modern .ta-cemet-dashboard-charts {
                    grid-template-columns: 1fr;
                }
            }
            @media (max-width: 700px) {
                html.ta-intranet-modern.ta-intranet-page-order-details body {
                    padding: 9px 9px 40px !important;
                }
                html.ta-intranet-modern .ta-order-quick-grid {
                    grid-template-columns: 1fr;
                }
                html.ta-intranet-modern [data-ta-intranet-role="order-details-table"] > tbody.ta-order-details-unified-layout {
                    grid-template-columns: 1fr;
                }
                html.ta-intranet-modern .ta-order-details-unified-layout > [data-ta-layout-span] {
                    grid-column: 1 / -1 !important;
                }
                html.ta-intranet-modern.ta-intranet-page-order-details [data-ta-order-field="transporeon-cost"] {
                    grid-template-columns: 1fr !important;
                }
                html.ta-intranet-modern .ta-order-quick-actions {
                    align-items: stretch;
                    flex-direction: column;
                }
            }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    function markUppercaseActionLabels(scope = document) {
        const controls = scope instanceof Element && scope.matches("a, button, input")
            ? [scope]
            : Array.from(scope?.querySelectorAll?.('a, button, input[type="button"], input[type="submit"]') || []);
        controls.forEach(control => {
            const label = control instanceof HTMLInputElement ? control.value : control.textContent;
            if (/^(?:wybierz|zamknij)(?:\s|$)/.test(foldText(label))) {
                control.classList.add("ta-uppercase-action-label");
            }
        });
    }

    function installUppercaseActionObserver() {
        if (!document.body || document.documentElement.dataset.taUppercaseActionObserver === "true") return;
        document.documentElement.dataset.taUppercaseActionObserver = "true";
        markUppercaseActionLabels(document);
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node instanceof Element) markUppercaseActionLabels(node);
                });
                if (mutation.type === "characterData") {
                    const parent = mutation.target.parentElement;
                    if (parent) markUppercaseActionLabels(parent);
                } else if (mutation.type === "attributes" && mutation.target instanceof Element) {
                    markUppercaseActionLabels(mutation.target);
                }
            });
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: ["value"]
        });
    }

    function renderViewSwitch() {
        if (!document.body || !currentAdapter) return;
        let cloud = document.getElementById(SWITCH_ID);
        if (!cloud) {
            cloud = document.createElement("div");
            cloud.id = SWITCH_ID;
            cloud.setAttribute("role", "group");
            cloud.setAttribute("aria-label", "Wersja wyglądu intranetu");
            cloud.innerHTML = `
                <span class="ta-view-cloud-label">Widok</span>
                <button type="button" data-view-mode="modern" title="Włącz nowy wygląd">Nowy</button>
                <button type="button" data-view-mode="classic" title="Przywróć klasyczny wygląd">Klasyczny</button>
            `;
            cloud.addEventListener("click", event => {
                const mode = event.target?.closest?.("button[data-view-mode]")?.dataset.viewMode;
                if (mode === MODE_MODERN || mode === MODE_CLASSIC) {
                    requestViewMode(mode);
                }
            });
            document.body.appendChild(cloud);
        }
        cloud.querySelectorAll("button[data-view-mode]").forEach(button => {
            button.setAttribute("aria-pressed", String(button.dataset.viewMode === currentMode));
        });
    }

    function initializePage() {
        if (!isSupportedBase()) return;
        performanceMetrics.initializeStartedAt = performance.now();
        try {
            currentAdapter = resolvePageAdapter();
            if (!currentAdapter) return;
            performanceMetrics.adapterId = currentAdapter.id || "";
            installStyles();
            if (currentMode === MODE_CLASSIC) {
                // Gwarancja prawdziwego legacy: w trybie klasycznym adapter nie
                // dostaje prawa do oznaczania, przenoszenia ani opakowywania DOM.
                performanceMetrics.mounted = false;
                applyMode(MODE_CLASSIC, { persist: false });
                return;
            }
            performanceMetrics.beforeMount = collectModernUiDomCounts();
            performanceMetrics.mountStartedAt = performance.now();
            const mounted = currentAdapter.mount();
            performanceMetrics.mountFinishedAt = performance.now();
            performanceMetrics.mounted = Boolean(mounted);
            performanceMetrics.afterMount = collectModernUiDomCounts();
            if (!mounted) {
                console.warn(`[Trans Assistant Intranet Modern UI ${SCRIPT_VERSION}] Nie rozpoznano struktury strony.`);
                applyMode(currentMode, { persist: false });
                return;
            }
            document.documentElement.dataset.taIntranetUiPage = currentAdapter.id;
            applyMode(currentMode, { persist: false });
            installUppercaseActionObserver();
            consumePendingNativeDialog();
            installNavigationShield();
        } finally {
            performanceMetrics.initializeFinishedAt = performance.now();
            revealModernUi();
        }
    }

    function prepareEarlyUi() {
        if (!isSupportedBase()) return;
        performanceMetrics.earlyUiStartedAt = performance.now();
        currentAdapter = resolvePageAdapter();
        const root = document.documentElement;
        root.classList.toggle("ta-intranet-modern", currentMode === MODE_MODERN);
        root.classList.toggle("ta-intranet-classic", currentMode === MODE_CLASSIC);
        if (currentMode === MODE_MODERN && currentAdapter?.id) {
            root.classList.add(`ta-intranet-page-${currentAdapter.id}`);
        }
        installStyles();
        if (currentMode === MODE_MODERN) continueLoginTransition();
        performanceMetrics.earlyUiFinishedAt = performance.now();
    }

    function metricDuration(startedAt, finishedAt) {
        return startedAt > 0 && finishedAt >= startedAt ? finishedAt - startedAt : 0;
    }

    function buildPerformanceMetrics() {
        return {
            ...performanceMetrics,
            earlyUiDurationMs: metricDuration(performanceMetrics.earlyUiStartedAt, performanceMetrics.earlyUiFinishedAt),
            mountDurationMs: metricDuration(performanceMetrics.mountStartedAt, performanceMetrics.mountFinishedAt),
            initializeDurationMs: metricDuration(performanceMetrics.initializeStartedAt, performanceMetrics.initializeFinishedAt),
            dashboardDurationMs: metricDuration(performanceMetrics.dashboardStartedAt, performanceMetrics.dashboardFinishedAt),
            totalDurationMs: metricDuration(performanceMetrics.scriptStartedAt, performanceMetrics.initializeFinishedAt)
        };
    }

    function publishPerformanceMetrics() {
        const metrics = buildPerformanceMetrics();
        try { document.documentElement.dataset.taIntranetUiMetrics = JSON.stringify(metrics); } catch (_) {}
        document.dispatchEvent(new CustomEvent("ta-intranet-modern-ui-metrics", { detail: metrics }));
        return metrics;
    }

    document.addEventListener(NATIVE_DIALOG_EVENT, () => {
        if (document.documentElement.classList.contains(READY_CLASS)) consumePendingNativeDialog();
    });

    window.TransAssistantIntranetModernUi = {
        version: SCRIPT_VERSION,
        storageKey: STORAGE_KEY,
        normalizePathname,
        resolvePageAdapter,
        findAcceptedOrdersTable,
        getAcceptedOrdersContract: collectAcceptedOrdersContract,
        softRefreshAcceptedOrders,
        findOrderDetailsTable,
        applyMode,
        requestViewMode,
        getMode: () => currentMode,
        getPageId: () => currentAdapter?.id || "",
        getPerformanceMetrics: buildPerformanceMetrics
    };

    installRemoteConfigLifecycle();
    if (!remoteConfigAllowed) return;

    if (currentMode === MODE_MODERN) {
        installApprovalInlineDialogInterceptor();
        if (CARRIER_ORDER_FORM_PATH_PATTERN.test(normalizePathname())) {
            installCarrierRecordModalDelegation();
        }
    }
    prepareEarlyUi();

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializePage, { once: true });
    } else {
        initializePage();
    }
})();
