const maxValues = {
    HP: 600,
    MP: 600,
    ST: 600,
    攻撃: 600,
    防御: 600,
    魔力: 600,
    魔防: 600,
    速度: 600,
    命中: 600,
    SIZ: 1000,
    APP: 500,
    合計値: 4700,
};

let selectedCharacters = [];
let activeCharacter = null;
let activeCharacterRowElement = null;
let totalCharacterCount = 0;
let activeSidebarTabId = "status";
let activeStatusViewMode = "table";

const loginButton = document.getElementById("login-button");
const startStoryButtonElement = document.getElementById("start-story-button");
const characterSelectCountElement = document.getElementById("character-select-count");
const loginContainerElement = document.getElementById("login-container");
const mainContainerElement = document.getElementById("main-container");
const usernameInputElement = document.getElementById("username");
const passwordInputElement = document.getElementById("password");
const characterSidebarTabElements = Array.from(document.querySelectorAll(".character-sidebar-tab"));
const characterSidebarPanelElements = Array.from(document.querySelectorAll(".character-sidebar-panel"));
const characterStatusViewTabElements = Array.from(document.querySelectorAll(".character-status-view-tab"));
const characterStatusViewPanelElements = Array.from(document.querySelectorAll(".character-stats-view"));
const characterStatsRadarElement = document.getElementById("character-stats-radar");
const characterSidebarTitleElement = document.getElementById("character-sidebar-title");
const defaultLoginButtonText = loginButton?.textContent || "ログイン";
const baseScreenWidth = 720;
const baseScreenHeight = 1280;
const MEMO_PROFILE_TAB_ID = "__profile__";
const MEMO_PROFILE_TAB_TITLE = "プロフィール";
const STATUS_RADAR_KEYS = ["HP", "ST", "攻撃", "防御", "速度", "命中", "魔防", "魔力", "MP"];
const STATUS_RADAR_LEGEND_ROWS = [
    ["HP", "MP", "ST"],
    ["攻撃", "防御"],
    ["魔力", "魔防"],
    ["命中", "速度"]
];

function updateScreenScale() {
    const widthScale = window.innerWidth / baseScreenWidth;
    const heightScale = window.innerHeight / baseScreenHeight;
    const shouldScaleDown = window.innerWidth <= baseScreenWidth || window.innerHeight <= baseScreenHeight;
    const rawScale = shouldScaleDown ? Math.min(widthScale, heightScale) : 1;
    const normalizedScale = Number.isFinite(rawScale) && rawScale > 0 ? Math.min(rawScale, 1) : 1;
    document.documentElement.style.setProperty("--app-scale", normalizedScale.toFixed(4));
}

function setCharacterSidebarTitle(characterName = "") {
    if (!characterSidebarTitleElement) return;
    const name = normalizeNameText(characterName);
    characterSidebarTitleElement.textContent = name || "キャラクター未選択";
}

function showLoginView() {
    document.body.classList.add("login-view");
    document.body.classList.remove("main-view");
    if (mainContainerElement) mainContainerElement.classList.add("is-hidden");
    if (loginContainerElement) loginContainerElement.style.display = "flex";
}

function showMainView() {
    document.body.classList.remove("login-view");
    document.body.classList.add("main-view");
    if (loginContainerElement) loginContainerElement.style.display = "none";
    if (mainContainerElement) mainContainerElement.classList.remove("is-hidden");
}

function setLoginButtonBusy(isBusy) {
    if (!loginButton) return;
    loginButton.disabled = isBusy;
    loginButton.textContent = isBusy ? "ログイン中..." : defaultLoginButtonText;
}

function syncCharacterSidebarTabUi() {
    characterSidebarTabElements.forEach((button) => {
        const tabId = button.getAttribute("data-sidebar-tab");
        const isActive = tabId === activeSidebarTabId;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    characterSidebarPanelElements.forEach((panel) => {
        const panelId = panel.getAttribute("data-sidebar-panel");
        const isActive = panelId === activeSidebarTabId;
        panel.classList.toggle("is-active", isActive);
        panel.hidden = !isActive;
    });
}

function setCharacterSidebarTab(tabId) {
    if (!tabId) return;
    activeSidebarTabId = tabId;
    syncCharacterSidebarTabUi();
}

function initializeCharacterSidebarTabs() {
    characterSidebarTabElements.forEach((button) => {
        button.addEventListener("click", () => {
            setCharacterSidebarTab(button.getAttribute("data-sidebar-tab") || "status");
        });
    });
    syncCharacterSidebarTabUi();
}

function syncCharacterStatusViewUi() {
    characterStatusViewTabElements.forEach((button) => {
        const viewMode = button.getAttribute("data-status-view");
        const isActive = viewMode === activeStatusViewMode;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    characterStatusViewPanelElements.forEach((panel) => {
        const panelMode = panel.getAttribute("data-status-view-panel");
        const isActive = panelMode === activeStatusViewMode;
        panel.classList.toggle("is-active", isActive);
        panel.hidden = !isActive;
    });
}

function setCharacterStatusViewMode(viewMode) {
    activeStatusViewMode = viewMode === "radar" ? "radar" : "table";
    syncCharacterStatusViewUi();
}

function initializeCharacterStatusViewTabs() {
    characterStatusViewTabElements.forEach((button) => {
        button.addEventListener("click", () => {
            setCharacterStatusViewMode(button.getAttribute("data-status-view") || "table");
        });
    });
    syncCharacterStatusViewUi();
}

function normalizeNameText(value) {
    return String(value ?? "").trim();
}

function isProfileMemoTab(tab = {}, index = -1) {
    const id = normalizeNameText(tab?.id);
    if (id === MEMO_PROFILE_TAB_ID) return true;
    return index === 0 && normalizeNameText(tab?.title) === MEMO_PROFILE_TAB_TITLE;
}

function normalizeMemoTabs(rawTabs = []) {
    const tabs = Array.isArray(rawTabs) ? rawTabs : [];
    return tabs.map((tab, index) => ({
        id: normalizeNameText(tab?.id) || `memo-${index + 1}`,
        title: normalizeNameText(tab?.title) || `メモ${index > 0 ? index + 1 : ""}`,
        text: String(tab?.text ?? "")
    }));
}

async function loadCharacterMemoBundles(playerId, characterNames = []) {
    const normalizedPlayerId = normalizeNameText(playerId) || "guest";
    const normalizedCharacterNames = (Array.isArray(characterNames) ? characterNames : [])
        .map((name) => normalizeNameText(name))
        .filter(Boolean);

    if (!normalizedCharacterNames.length) return {};

    const response = await fetch("/api/memo/all/load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            playerId: normalizedPlayerId,
            characterNames: normalizedCharacterNames
        })
    });
    const result = await response.json();

    if (!response.ok || !result?.success) {
        throw new Error(result?.message || `memo all load failed: ${response.status}`);
    }

    const characters = result?.data?.characters && typeof result.data.characters === "object"
        ? result.data.characters
        : {};
    const bundleMap = {};

    normalizedCharacterNames.forEach((characterName) => {
        const entry = characters[characterName];
        const tabs = normalizeMemoTabs(entry?.tabs);
        const profileTab = tabs.find((tab, index) => isProfileMemoTab(tab, index)) || null;
        const memoTabs = tabs.filter((tab, index) => !isProfileMemoTab(tab, index));
        bundleMap[characterName] = {
            profileText: String(profileTab?.text ?? "").trim(),
            memoTabs
        };
    });

    return bundleMap;
}

function attachMemoBundlesToCharacters(characters = [], memoBundleMap = {}) {
    const list = Array.isArray(characters) ? characters : [];
    return list.map((character) => {
        const characterName = normalizeNameText(character?.名前 || character?.name);
        return {
            ...character,
            __memoBundle: memoBundleMap?.[characterName] || null
        };
    });
}

const submitOnEnter = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    loginButton?.click();
};

usernameInputElement?.addEventListener("keydown", submitOnEnter);
passwordInputElement?.addEventListener("keydown", submitOnEnter);
window.addEventListener("resize", updateScreenScale);
updateScreenScale();
showLoginView();
initializeCharacterSidebarTabs();
initializeCharacterStatusViewTabs();

loginButton?.addEventListener("click", async () => {
    const username = usernameInputElement?.value?.trim();
    const password = passwordInputElement?.value?.trim();
    const errorMessage = document.getElementById("error-message");

    if (!username || !password) {
        if (errorMessage) {
            errorMessage.textContent = "ユーザー名とパスワードを入力してください。";
            errorMessage.style.display = "block";
        }
        return;
    }

    setLoginButtonBusy(true);
    try {
        const response = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });
        const data = await response.json();

        if (!response.ok) {
            if (errorMessage) {
                errorMessage.textContent = data?.message || "ログインに失敗しました。";
                errorMessage.style.display = "block";
            }
            return;
        }

        sessionStorage.setItem("playerId", username);
        sessionStorage.setItem("username", username);

        const loginCharacters = Array.isArray(data?.characters) ? data.characters : [];
        const playerCharacterList = loginCharacters
            .map((character) => (character?.名前 || character?.name || "").toString().trim())
            .filter((name, index, list) => name && list.indexOf(name) === index);

        sessionStorage.setItem("playerCharacterList", JSON.stringify(playerCharacterList));
        localStorage.setItem("playerCharacterList", JSON.stringify(playerCharacterList));

        let memoBundleMap = {};
        try {
            memoBundleMap = await loadCharacterMemoBundles(username, playerCharacterList);
        } catch (memoLoadError) {
            console.warn("memo bundle load failed:", memoLoadError);
        }

        const mergedCharacters = attachMemoBundlesToCharacters(loginCharacters, memoBundleMap);
        displayCharacterNames(mergedCharacters);
        showMainView();
        if (errorMessage) errorMessage.style.display = "none";
    } catch (error) {
        if (errorMessage) {
            errorMessage.textContent = "通信エラーが発生しました。";
            errorMessage.style.display = "block";
        }
    } finally {
        setLoginButtonBusy(false);
    }
});

function displayCharacterNames(characters) {
    const characterList = document.getElementById("character-list");
    const normalizedCharacters = Array.isArray(characters) ? characters : [];
    if (!characterList) return;

    characterList.innerHTML = "";
    selectedCharacters = [];
    totalCharacterCount = normalizedCharacters.length;
    activeCharacter = null;
    activeCharacterRowElement = null;
    setCharacterSidebarTitle("");
    updateStartButtonState();
    renderCharacterPanelPlaceholders("キャラクターを選択してください。");

    if (normalizedCharacters.length === 0) {
        renderCharacterPanelPlaceholders("表示できるキャラクターがありません。");
        return;
    }

    const setActiveCharacter = (character, rowElement) => {
        activeCharacter = character;
        setCharacterSidebarTitle(character?.名前 || character?.name || "");
        if (activeCharacterRowElement && activeCharacterRowElement !== rowElement) {
            activeCharacterRowElement.classList.remove("active");
        }
        activeCharacterRowElement = rowElement;
        rowElement.classList.add("active");
        renderCharacterSidebar(character);
    };

    normalizedCharacters.forEach((character, index) => {
        const li = document.createElement("li");
        li.className = "character-item";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.setAttribute("aria-label", "ストーリーで使用する");

        const label = document.createElement("span");
        label.className = "character-name";
        label.textContent = character?.名前 || character?.name || "不明";

        const pickLabel = document.createElement("label");
        pickLabel.className = "character-pick";
        pickLabel.appendChild(checkbox);
        pickLabel.appendChild(document.createTextNode("選択"));

        const syncSelectedState = (shouldSetActive = false) => {
            if (checkbox.checked) {
                if (!selectedCharacters.includes(character)) {
                    selectedCharacters.push(character);
                }
                li.classList.add("selected");
            } else {
                selectedCharacters = selectedCharacters.filter((c) => c !== character);
                li.classList.remove("selected");
            }
            if (shouldSetActive) setActiveCharacter(character, li);
            updateStartButtonState();
        };

        checkbox.addEventListener("click", (event) => {
            event.stopPropagation();
        });
        checkbox.addEventListener("change", () => {
            syncSelectedState(true);
        });
        pickLabel.addEventListener("click", (event) => {
            event.stopPropagation();
            if (event.target === checkbox) return;
            event.preventDefault();
            checkbox.checked = !checkbox.checked;
            syncSelectedState(true);
        });
        li.addEventListener("click", () => {
            setActiveCharacter(character, li);
        });

        li.appendChild(label);
        li.appendChild(pickLabel);
        characterList.appendChild(li);

        if (index === 0) {
            setActiveCharacter(character, li);
        }
    });
}

function updateStartButtonState() {
    if (startStoryButtonElement) {
        startStoryButtonElement.disabled = selectedCharacters.length === 0;
    }
    if (characterSelectCountElement) {
        characterSelectCountElement.textContent = `${selectedCharacters.length}/${totalCharacterCount}`;
    }
}

function renderCharacterSidebar(character) {
    displayCharacterStats(character);
    displayCharacterItems(character);
    displayCharacterMemo(character);
}

function displayCharacterStats(stats) {
    const characterStats = document.getElementById("character-stats");
    if (!characterStats || !stats || typeof stats !== "object") {
        renderCharacterStatsPlaceholder("表示データがありません。");
        renderCharacterStatusRadarPlaceholder("表示データがありません。");
        return;
    }
    characterStats.innerHTML = "";

    const textFields = ["名前", "二つ名", "Lv", "Ef"];
    textFields.forEach((field) => {
        const row = document.createElement("tr");
        const labelCell = document.createElement("td");
        const valueCell = document.createElement("td");
        labelCell.className = "stat-label-cell";
        valueCell.className = "stat-value-cell";
        labelCell.textContent = field;
        valueCell.textContent = stats[field] ?? "";
        row.appendChild(labelCell);
        row.appendChild(valueCell);
        characterStats.appendChild(row);
    });

    const hidden = new Set(["APP", "SIZ", "合計値", ...textFields]);
    const numericStats = Object.keys(stats)
        .filter((key) => !hidden.has(key))
        .map((key) => ({ key, value: Number(stats[key]) }))
        .filter((entry) => Number.isFinite(entry.value));

    if (numericStats.length > 0) {
        const values = numericStats.map((s) => s.value);
        const maxValue = Math.max(...values);
        const minValue = Math.min(...values);
        const secondHighest = values.filter((v) => v < maxValue).sort((a, b) => b - a)[0];

        numericStats.forEach((entry) => {
            const row = document.createElement("tr");
            const labelCell = document.createElement("td");
            const valueCell = document.createElement("td");
            labelCell.className = "stat-label-cell";
            valueCell.className = "stat-value-cell";
            labelCell.textContent = entry.key;
            valueCell.textContent = String(entry.value);

            if (entry.value === maxValue) valueCell.classList.add("stat-highest");
            else if (entry.value === secondHighest) valueCell.classList.add("stat-second-highest");
            else if (entry.value === minValue) valueCell.classList.add("stat-lowest");

            row.appendChild(labelCell);
            row.appendChild(valueCell);
            characterStats.appendChild(row);
        });
    }

    ["APP", "SIZ", "合計値"].forEach((key) => {
        const row = document.createElement("tr");
        const labelCell = document.createElement("td");
        const valueCell = document.createElement("td");
        labelCell.className = "stat-label-cell";
        valueCell.className = "stat-value-cell";
        labelCell.textContent = key;
        valueCell.textContent = String(stats[key] ?? 0);
        row.appendChild(labelCell);
        row.appendChild(valueCell);
        characterStats.appendChild(row);
    });

    renderCharacterStatusRadar(stats);
}

function toFiniteNumber(value, fallback = 0) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : fallback;
}

function calculateSizCorrection(value) {
    const numericValue = toFiniteNumber(value, 0);
    if (numericValue >= 180) {
        return (numericValue / 50) + 8;
    }
    if (numericValue <= 150) {
        return -((160 - numericValue) / 3);
    }
    return 0;
}

function getStatusRadarValueEntries(stats = {}) {
    const level = Math.max(0, toFiniteNumber(stats?.Lv, 0));
    const levelBasedMax = Math.max(1, (level * 10) + 50);
    const sizValue = toFiniteNumber(stats?.SIZ, 0);
    const sizCorrection = calculateSizCorrection(sizValue);
    const adjustedValues = {};

    STATUS_RADAR_KEYS.forEach((key) => {
        adjustedValues[key] = Math.max(0, toFiniteNumber(stats?.[key], 0));
    });

    adjustedValues.HP = Math.max(0, Math.round(adjustedValues.HP * (1 + sizCorrection / 100)));
    if (sizCorrection > 0) {
        const attackBonus = Math.trunc(adjustedValues.攻撃 * (sizCorrection / 100));
        const speedPenalty = Math.trunc(adjustedValues.速度 * (sizCorrection / 100));
        adjustedValues.攻撃 = Math.max(0, adjustedValues.攻撃 + attackBonus);
        adjustedValues.速度 = Math.max(0, adjustedValues.速度 - speedPenalty);
    }

    return STATUS_RADAR_KEYS.map((key) => ({
        key,
        value: Math.max(0, toFiniteNumber(adjustedValues[key], 0)),
        max: levelBasedMax
    }));
}

function getRadarPoint(cx, cy, radius, angleRad) {
    return {
        x: cx + Math.cos(angleRad) * radius,
        y: cy + Math.sin(angleRad) * radius
    };
}

function renderCharacterStatusRadar(stats = {}) {
    if (!characterStatsRadarElement) return;
    characterStatsRadarElement.innerHTML = "";

    const entries = getStatusRadarValueEntries(stats);
    if (!entries.length) {
        renderCharacterStatusRadarPlaceholder("表示データがありません。");
        return;
    }

    const svgSize = 360;
    const center = svgSize / 2;
    const radarRadius = 116;
    const ringCount = 5;
    const startAngle = -Math.PI / 2;
    const angleStep = (Math.PI * 2) / entries.length;
    const overflowRateCap = 1.9;

    const svgNs = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNs, "svg");
    svg.setAttribute("viewBox", `0 0 ${svgSize} ${svgSize}`);
    svg.setAttribute("class", "character-status-radar-svg");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "キャラクターステータス円グラフ");

    for (let ringIndex = 1; ringIndex <= ringCount; ringIndex += 1) {
        const ring = document.createElementNS(svgNs, "circle");
        ring.setAttribute("cx", String(center));
        ring.setAttribute("cy", String(center));
        ring.setAttribute("r", String((radarRadius / ringCount) * ringIndex));
        ring.setAttribute("class", "character-status-radar-ring");
        svg.appendChild(ring);
    }

    const polygonPoints = [];
    const overflowPolygonPoints = [];
    const outerPoints = [];
    const overflowPoints = [];
    const overflowFlags = [];
    const labelPoints = [];

    entries.forEach((entry, index) => {
        const angle = startAngle + (index * angleStep);
        const outerPoint = getRadarPoint(center, center, radarRadius, angle);
        outerPoints.push(outerPoint);

        const axis = document.createElementNS(svgNs, "line");
        axis.setAttribute("x1", String(center));
        axis.setAttribute("y1", String(center));
        axis.setAttribute("x2", String(outerPoint.x));
        axis.setAttribute("y2", String(outerPoint.y));
        axis.setAttribute("class", "character-status-radar-axis");
        svg.appendChild(axis);

        const rawRate = Math.max(0, entry.value / entry.max);
        const baseRate = Math.min(rawRate, 1);
        const overflowRate = Math.min(rawRate, overflowRateCap);
        const baseVertex = getRadarPoint(center, center, radarRadius * baseRate, angle);
        const overflowVertex = getRadarPoint(center, center, radarRadius * overflowRate, angle);
        polygonPoints.push(baseVertex);
        overflowPolygonPoints.push(overflowVertex);
        overflowPoints.push(overflowVertex);
        overflowFlags.push(rawRate > 1);

        const labelPoint = getRadarPoint(center, center, radarRadius + 22, angle);
        labelPoints.push({
            key: entry.key,
            x: labelPoint.x,
            y: labelPoint.y,
            angle
        });
    });

    const hasOverflow = overflowFlags.some(Boolean);
    if (hasOverflow) {
        const overflowPolygon = document.createElementNS(svgNs, "polygon");
        overflowPolygon.setAttribute(
            "points",
            overflowPolygonPoints.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ")
        );
        overflowPolygon.setAttribute("class", "character-status-radar-overflow-shape");
        svg.appendChild(overflowPolygon);

        overflowFlags.forEach((isOverflow, index) => {
            if (!isOverflow) return;
            const overflowLine = document.createElementNS(svgNs, "line");
            overflowLine.setAttribute("x1", String(outerPoints[index].x));
            overflowLine.setAttribute("y1", String(outerPoints[index].y));
            overflowLine.setAttribute("x2", String(overflowPoints[index].x));
            overflowLine.setAttribute("y2", String(overflowPoints[index].y));
            overflowLine.setAttribute("class", "character-status-radar-overflow-line");
            svg.appendChild(overflowLine);

            const overflowDot = document.createElementNS(svgNs, "circle");
            overflowDot.setAttribute("cx", String(overflowPoints[index].x));
            overflowDot.setAttribute("cy", String(overflowPoints[index].y));
            overflowDot.setAttribute("r", "3.4");
            overflowDot.setAttribute("class", "character-status-radar-overflow-dot");
            svg.appendChild(overflowDot);
        });
    }

    const polygon = document.createElementNS(svgNs, "polygon");
    polygon.setAttribute(
        "points",
        polygonPoints.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ")
    );
    polygon.setAttribute("class", "character-status-radar-shape");
    svg.appendChild(polygon);

    polygonPoints.forEach((point) => {
        const dot = document.createElementNS(svgNs, "circle");
        dot.setAttribute("cx", String(point.x));
        dot.setAttribute("cy", String(point.y));
        dot.setAttribute("r", "2.8");
        dot.setAttribute("class", "character-status-radar-dot");
        svg.appendChild(dot);
    });

    labelPoints.forEach((entry) => {
        const label = document.createElementNS(svgNs, "text");
        label.setAttribute("x", String(entry.x));
        label.setAttribute("y", String(entry.y));
        label.setAttribute("class", "character-status-radar-label");
        if (Math.cos(entry.angle) > 0.35) label.setAttribute("text-anchor", "start");
        else if (Math.cos(entry.angle) < -0.35) label.setAttribute("text-anchor", "end");
        else label.setAttribute("text-anchor", "middle");
        label.textContent = entry.key;
        svg.appendChild(label);
    });

    characterStatsRadarElement.appendChild(svg);

    const legendEntryMap = new Map(entries.map((entry) => [entry.key, entry]));
    const legend = document.createElement("div");
    legend.className = "character-status-radar-legend";

    STATUS_RADAR_LEGEND_ROWS.forEach((rowKeys) => {
        const row = document.createElement("ul");
        row.className = "character-status-radar-legend-row";
        rowKeys.forEach((key) => {
            const entry = legendEntryMap.get(key);
            if (!entry) return;
            const item = document.createElement("li");
            const label = document.createElement("span");
            label.textContent = entry.key;
            const value = document.createElement("strong");
            value.textContent = String(entry.value);
            item.appendChild(label);
            item.appendChild(value);
            row.appendChild(item);
        });
        legend.appendChild(row);
    });
    characterStatsRadarElement.appendChild(legend);
}

function renderCharacterStatusRadarPlaceholder(message) {
    if (!characterStatsRadarElement) return;
    characterStatsRadarElement.innerHTML = "";
    renderCharacterPanelPlaceholder(characterStatsRadarElement, message);
}

function pickCharacterValueByKeys(character = {}, keys = []) {
    if (!character || typeof character !== "object") return undefined;
    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(character, key)) {
            return character[key];
        }
    }
    return undefined;
}

function parseCharacterItemList(character = {}) {
    const source = pickCharacterValueByKeys(character, ["持ち物", "所持品", "inventory", "items"]);
    if (Array.isArray(source)) {
        return source.map((item) => String(item ?? "").trim()).filter(Boolean);
    }
    if (typeof source === "string") {
        return source
            .split(/[\r\n,、]/)
            .map((item) => item.trim())
            .filter(Boolean);
    }
    if (source && typeof source === "object") {
        return Object.values(source).map((item) => String(item ?? "").trim()).filter(Boolean);
    }
    return [];
}

function displayCharacterItems(character) {
    const panel = document.getElementById("character-items-panel");
    if (!panel) return;
    panel.innerHTML = "";

    const items = parseCharacterItemList(character);
    const moneyRaw = pickCharacterValueByKeys(character, ["所持金", "money"]);
    const moneyText = String(moneyRaw ?? "").trim();

    if (!items.length && !moneyText) {
        renderCharacterPanelPlaceholder(panel, "持ち物データがありません。");
        return;
    }

    if (moneyText) {
        const moneyElement = document.createElement("p");
        moneyElement.className = "character-panel-placeholder";
        moneyElement.textContent = `所持金: ${moneyText}`;
        panel.appendChild(moneyElement);
    }

    if (items.length) {
        const list = document.createElement("ul");
        list.className = "character-items-list";
        items.forEach((item) => {
            const li = document.createElement("li");
            li.textContent = item;
            list.appendChild(li);
        });
        panel.appendChild(list);
    }
}

function displayCharacterMemo(character) {
    const panel = document.getElementById("character-memo-panel");
    if (!panel) return;
    panel.innerHTML = "";

    const memoBundle = character && typeof character === "object" ? character.__memoBundle : null;
    if (memoBundle && typeof memoBundle === "object") {
        const profileText = String(memoBundle.profileText ?? "").trim();
        const memoTabs = Array.isArray(memoBundle.memoTabs) ? memoBundle.memoTabs : [];

        appendCharacterMemoSection(panel, MEMO_PROFILE_TAB_TITLE, profileText, "プロフィールはありません。");

        if (memoTabs.length > 0) {
            memoTabs.forEach((tab, index) => {
                const title = normalizeNameText(tab?.title) || `メモ${index > 0 ? index + 1 : ""}`;
                const text = String(tab?.text ?? "").trim();
                appendCharacterMemoSection(panel, title, text, "内容はありません。");
            });
        } else {
            renderCharacterPanelPlaceholder(panel, "メモはありません。");
        }
        return;
    }

    const memoRaw = pickCharacterValueByKeys(character, ["メモ", "memo", "notes", "note"]);
    const memoText = typeof memoRaw === "string"
        ? memoRaw.trim()
        : (memoRaw == null ? "" : JSON.stringify(memoRaw, null, 2));

    if (!memoText) {
        renderCharacterPanelPlaceholder(panel, "メモはありません。");
        return;
    }

    const pre = document.createElement("pre");
    pre.className = "character-memo-text";
    pre.textContent = memoText;
    panel.appendChild(pre);
}

function appendCharacterMemoSection(panel, title, text, emptyMessage) {
    if (!panel) return;
    const section = document.createElement("section");
    section.className = "character-memo-section";

    const heading = document.createElement("h3");
    heading.className = "character-memo-section-title";
    heading.textContent = title;
    section.appendChild(heading);

    const bodyText = String(text ?? "").trim();
    if (!bodyText) {
        const placeholder = document.createElement("p");
        placeholder.className = "character-panel-placeholder character-memo-empty";
        placeholder.textContent = emptyMessage || "内容はありません。";
        section.appendChild(placeholder);
    } else {
        const pre = document.createElement("pre");
        pre.className = "character-memo-text";
        pre.textContent = bodyText;
        section.appendChild(pre);
    }

    panel.appendChild(section);
}

function renderCharacterPanelPlaceholder(panelElement, message) {
    if (!panelElement) return;
    const placeholder = document.createElement("p");
    placeholder.className = "character-panel-placeholder";
    placeholder.textContent = message;
    panelElement.appendChild(placeholder);
}

function renderCharacterStatsPlaceholder(message) {
    const characterStats = document.getElementById("character-stats");
    if (!characterStats) return;
    characterStats.innerHTML = "";
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 2;
    cell.className = "stat-placeholder";
    cell.textContent = message;
    row.appendChild(cell);
    characterStats.appendChild(row);
}

function renderCharacterPanelPlaceholders(message) {
    renderCharacterStatsPlaceholder(message);
    renderCharacterStatusRadarPlaceholder(message);
    const itemPanel = document.getElementById("character-items-panel");
    const memoPanel = document.getElementById("character-memo-panel");
    if (itemPanel) {
        itemPanel.innerHTML = "";
        renderCharacterPanelPlaceholder(itemPanel, message);
    }
    if (memoPanel) {
        memoPanel.innerHTML = "";
        renderCharacterPanelPlaceholder(memoPanel, message);
    }
}

async function startStoryButton() {
    sessionStorage.setItem("selectedCharacters", JSON.stringify(selectedCharacters));
    sessionStorage.setItem("selectedCharacter", JSON.stringify(selectedCharacters));
    window.location.href = "story.html";
}

startStoryButtonElement?.addEventListener("click", () => {
    if (selectedCharacters.length > 0) {
        startStoryButton();
    }
});
