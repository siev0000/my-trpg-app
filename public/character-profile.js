function normalizeText(value) {
    return String(value ?? "").trim();
}

const defaultBaseScreenWidth = 720;
const defaultBaseScreenHeight = 1280;
const pageQuery = new URLSearchParams(window.location.search);
const targetCharacterName = normalizeText(pageQuery.get("name"));

function updateProfileScreenScale() {
    const rootStyle = getComputedStyle(document.documentElement);
    const cssWidth = Number(String(rootStyle.getPropertyValue("--design-width") || "").trim());
    const cssHeight = Number(String(rootStyle.getPropertyValue("--design-height") || "").trim());
    const designWidth = Number.isFinite(cssWidth) && cssWidth > 0 ? cssWidth : defaultBaseScreenWidth;
    const designHeight = Number.isFinite(cssHeight) && cssHeight > 0 ? cssHeight : defaultBaseScreenHeight;

    const widthScale = window.innerWidth / designWidth;
    const heightScale = window.innerHeight / designHeight;
    const rawScale = Math.min(widthScale, heightScale);
    const normalizedScale = Number.isFinite(rawScale) && rawScale > 0 ? rawScale : 1;
    document.documentElement.style.setProperty("--app-scale", normalizedScale.toFixed(4));
}

function getRequiredSessionPlayerId() {
    return normalizeText(
        sessionStorage.getItem("playerId")
        || sessionStorage.getItem("username")
    );
}

function setProfileErrorMessage(message = "") {
    const target = document.getElementById("profile-error");
    if (!target) return;
    target.textContent = normalizeText(message);
}

async function loadCharacterProfile() {
    if (!targetCharacterName) {
        setProfileErrorMessage("キャラクター名がありません。");
        return false;
    }

    const response = await fetch(`/api/character/profile?name=${encodeURIComponent(targetCharacterName)}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.success) {
        setProfileErrorMessage(data?.message || "プロフィールの取得に失敗しました。");
        return false;
    }

    const profileText = String(data?.data?.プロフィール ?? "");
    const nameLabel = document.getElementById("profile-character-name");
    const textArea = document.getElementById("profile-text");
    if (nameLabel) {
        nameLabel.textContent = normalizeText(data?.data?.名前) || targetCharacterName;
    }
    if (textArea) {
        textArea.value = profileText;
    }
    return true;
}

async function submitCharacterProfile(event) {
    event.preventDefault();
    setProfileErrorMessage("");

    const playerId = getRequiredSessionPlayerId();
    if (!playerId) {
        window.location.href = "index.html";
        return;
    }
    if (!targetCharacterName) {
        setProfileErrorMessage("キャラクター名がありません。");
        return;
    }

    const saveButton = document.getElementById("profile-save-button");
    const textArea = document.getElementById("profile-text");
    const profileText = String(textArea?.value ?? "").trim();

    if (saveButton) saveButton.disabled = true;
    try {
        const response = await fetch("/api/character/profile/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                playerId,
                characterName: targetCharacterName,
                profile: profileText
            })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data?.success) {
            setProfileErrorMessage(data?.message || "プロフィール保存に失敗しました。");
            return;
        }
        window.location.href = "character-list.html";
    } catch (error) {
        console.error("profile save failed:", error);
        setProfileErrorMessage("通信エラーが発生しました。");
    } finally {
        if (saveButton) saveButton.disabled = false;
    }
}

async function initializeCharacterProfilePage() {
    window.addEventListener("resize", updateProfileScreenScale);
    updateProfileScreenScale();

    const playerId = getRequiredSessionPlayerId();
    if (!playerId) {
        window.location.href = "index.html";
        return;
    }

    document.getElementById("profile-form")?.addEventListener("submit", submitCharacterProfile);
    document.getElementById("profile-cancel-button")?.addEventListener("click", () => {
        window.location.href = "character-list.html";
    });
    await loadCharacterProfile();
}

initializeCharacterProfilePage();
