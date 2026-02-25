const DEFAULT_GUARD_MS = 10;
const BLOCKER_ID = "post-modal-interaction-guard";

let guardTimerId = null;
let guardReleaseAt = 0;

function stopPointerEvent(event) {
    event.preventDefault();
    event.stopPropagation();
}

function ensureGuardElement() {
    if (typeof document === "undefined") return null;

    let blocker = document.getElementById(BLOCKER_ID);
    if (blocker) return blocker;

    blocker = document.createElement("div");
    blocker.id = BLOCKER_ID;
    blocker.setAttribute("aria-hidden", "true");
    blocker.style.position = "fixed";
    blocker.style.inset = "0";
    blocker.style.zIndex = "99999";
    blocker.style.background = "transparent";
    blocker.style.display = "none";
    blocker.style.pointerEvents = "auto";
    blocker.style.touchAction = "none";

    blocker.addEventListener("pointerdown", stopPointerEvent, true);
    blocker.addEventListener("pointerup", stopPointerEvent, true);
    blocker.addEventListener("click", stopPointerEvent, true);
    blocker.addEventListener("touchstart", stopPointerEvent, true);
    blocker.addEventListener("touchend", stopPointerEvent, true);
    blocker.addEventListener("mousedown", stopPointerEvent, true);
    blocker.addEventListener("mouseup", stopPointerEvent, true);

    document.body.appendChild(blocker);
    return blocker;
}

function scheduleGuardRelease() {
    if (guardTimerId) {
        window.clearTimeout(guardTimerId);
        guardTimerId = null;
    }

    const delay = Math.max(0, guardReleaseAt - Date.now());
    guardTimerId = window.setTimeout(() => {
        if (Date.now() < guardReleaseAt) {
            scheduleGuardRelease();
            return;
        }
        const blocker = ensureGuardElement();
        if (blocker) {
            blocker.style.display = "none";
        }
        guardTimerId = null;
        guardReleaseAt = 0;
    }, delay);
}

export function triggerPostModalInteractionGuard(durationMs = DEFAULT_GUARD_MS) {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const duration = Number(durationMs);
    const safeDuration = Number.isFinite(duration) && duration > 0
        ? Math.round(duration)
        : DEFAULT_GUARD_MS;

    const blocker = ensureGuardElement();
    if (!blocker) return;

    blocker.style.display = "block";
    guardReleaseAt = Math.max(guardReleaseAt, Date.now() + safeDuration);
    scheduleGuardRelease();
}

export function releasePostModalInteractionGuard() {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    if (guardTimerId) {
        window.clearTimeout(guardTimerId);
        guardTimerId = null;
    }
    guardReleaseAt = 0;
    const blocker = ensureGuardElement();
    if (blocker) {
        blocker.style.display = "none";
    }
}

export function installGlobalModalInteractionGuard() {
    if (typeof window === "undefined") return;
    window.triggerPostModalInteractionGuard = triggerPostModalInteractionGuard;
    window.releasePostModalInteractionGuard = releasePostModalInteractionGuard;
}

