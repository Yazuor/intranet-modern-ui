(() => {
    "use strict";

    const root = document.documentElement;
    if (!root || window.name === "trans-assistant-intranet-login-flow") return;

    const pathname = String(location.pathname || "").replace(/\/+/g, "/");
    if (!/^\/spedycja_uss_2022(?:\/|$)/i.test(pathname)) return;

    try {
        if (new URLSearchParams(location.search).get("taClassic") === "1") return;
        if (localStorage.getItem("transAssistantIntranetUiModeV1") === "classic") return;
        const cachedConfig = JSON.parse(localStorage.getItem("transAssistantIntranetModernUiRemoteConfigV1") || "null");
        if (cachedConfig?.enabled === false) return;
    } catch (_) {}

    const STYLE_ID = "trans-assistant-intranet-boot-shield";
    const BOOT_CLASS = "ta-intranet-boot-shield";
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        html.${BOOT_CLASS} { background:#f3f5f1 !important; }
        html.${BOOT_CLASS} body {
            visibility:hidden !important;
            opacity:0 !important;
        }
        html.${BOOT_CLASS}::before {
            content:"";
            position:fixed;
            z-index:2147483647;
            inset:0;
            display:block;
            background:
                radial-gradient(circle at 50% 38%, rgba(114,179,51,.08), transparent 31%),
                linear-gradient(160deg, #f8faf7 0%, #edf3ee 100%);
            visibility:visible !important;
            opacity:1 !important;
            pointer-events:none;
        }
    `;
    root.classList.add(BOOT_CLASS);
    root.appendChild(style);

    let released = false;
    const release = () => {
        if (released) return;
        released = true;
        root.classList.remove(BOOT_CLASS);
        document.getElementById(STYLE_ID)?.remove();
    };
    window.__transAssistantReleaseIntranetBootShield = release;
    window.setTimeout(release, 8000);
})();
