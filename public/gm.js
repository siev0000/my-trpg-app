const GM_TOKEN_KEY = "gmToken";
const POLL_INTERVAL_MS = 2000;
const INFINITE_TURNS = 9999999;

const gmLogoutButtonElement = document.getElementById("gm-logout-button");
const gmPresenceMetaElement = document.getElementById("gm-presence-meta");
const gmPresenceListElement = document.getElementById("gm-presence-list");
const gmLogMetaElement = document.getElementById("gm-log-meta");
const gmLogExcelBlockContentElement = document.getElementById("gm-log-excel-block-content");
const gmLogExcelRowContentElement = document.getElementById("gm-log-excel-row-content");
const gmLogFormatButtonElements = Array.from(document.querySelectorAll(".gm-log-format-button"));
const gmLogFormatPanelElements = Array.from(document.querySelectorAll(".gm-log-format-panel"));
const gmCharacterDetailElement = document.getElementById("gm-character-detail");
const gmTabButtonElements = Array.from(document.querySelectorAll(".gm-tab-button"));
const gmTabPanelElements = Array.from(document.querySelectorAll(".gm-tab-content"));

let pollTimer = null;
let activeTabId = "log";
let activeLogFormat = "block";
let selectedCharacterContext = { playerId: "", characterName: "" };
let latestConnectedPlayers = [];
const GM_DEBUG_ENABLED = true;
let lastDashboardLogSignature = "";

function gmLog(label, payload = null) {
    if (!GM_DEBUG_ENABLED) return;
    if (payload === null || payload === undefined) {
        console.log(`[gm] ${label}`);
        return;
    }
    console.log(`[gm] ${label}`, payload);
}

function getTabIdFromPanel(panel) {
    const panelId = normalizeText(panel?.id);
    if (panelId === "gm-tab-character") return "character";
    return "log";
}

function ensureCharacterPanelVisibility() {
    const characterPanel = gmTabPanelElements.find(
        (panel) => getTabIdFromPanel(panel) === "character"
    );
    if (!characterPanel) return;
    characterPanel.hidden = false;
    characterPanel.removeAttribute("hidden");
    characterPanel.style.display = "flex";
    characterPanel.style.visibility = "visible";
    characterPanel.style.opacity = "1";
    characterPanel.style.height = "100%";
    characterPanel.style.minHeight = "260px";

    const scroll = characterPanel.querySelector(".gm-scroll");
    if (scroll) {
        scroll.style.display = "block";
        scroll.style.visibility = "visible";
        scroll.style.opacity = "1";
        scroll.style.minHeight = "240px";
        scroll.style.overflowY = "auto";
    }

    if (gmCharacterDetailElement) {
        gmCharacterDetailElement.style.display = "grid";
        gmCharacterDetailElement.style.visibility = "visible";
        gmCharacterDetailElement.style.opacity = "1";
        gmCharacterDetailElement.style.minHeight = "220px";
    }
}

function normalizeText(value) {
    return String(value ?? "").trim();
}

function toFiniteNumber(value, fallback = 0) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : fallback;
}

function formatDisplayTime(isoText) {
    const date = new Date(isoText);
    if (Number.isNaN(date.getTime())) return "不明";
    return date.toLocaleString("ja-JP", { hour12: false });
}

function formatTurnValue(value) {
    const numeric = Math.max(0, Math.round(toFiniteNumber(value, 0)));
    return numeric >= INFINITE_TURNS ? "∞" : String(numeric);
}

function formatSkillMetric(value) {
    const numeric = Math.round(toFiniteNumber(value, 0));
    if (numeric === 0) return "-";
    return String(numeric);
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function resolveBattleStateView(character = {}) {
    const source = character?.battleState;
    if (!source || typeof source !== "object" || Array.isArray(source)) {
        return {};
    }
    const nestedCandidates = [
        source?.state,
        source?.battleState,
        source?.battle,
        source?.data
    ];
    for (const candidate of nestedCandidates) {
        if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
            return candidate;
        }
    }
    return source;
}

function pickSkillEntriesFromBattleState(battleState = {}, mode = "active") {
    const target = battleState && typeof battleState === "object" && !Array.isArray(battleState)
        ? battleState
        : {};
    const candidateKeys = mode === "cooldown"
        ? ["skillCooldowns", "cooldowns", "cooldownSkills", "クールタイム中スキル"]
        : ["retainedBuffSkills", "activeBuffSkills", "activeSkills", "発動中スキル"];

    for (const key of candidateKeys) {
        const value = target?.[key];
        if (Array.isArray(value)) {
            return value;
        }
        if (value && typeof value === "object" && !Array.isArray(value)) {
            return Object.values(value).filter((entry) => (
                entry && typeof entry === "object" && !Array.isArray(entry)
            ));
        }
    }
    return [];
}

function hasVisibleSkillEntries(character = {}) {
    const battleState = resolveBattleStateView(character);
    const active = pickSkillEntriesFromBattleState(battleState, "active");
    const cooldown = pickSkillEntriesFromBattleState(battleState, "cooldown");
    return active.length > 0 || cooldown.length > 0;
}

function redirectToLogin() {
    window.location.href = "index.html";
}

function logoutGm() {
    sessionStorage.removeItem(GM_TOKEN_KEY);
    redirectToLogin();
}

function getGmToken() {
    return normalizeText(sessionStorage.getItem(GM_TOKEN_KEY));
}

function setActiveTab(tabId) {
    activeTabId = tabId === "character" ? "character" : "log";
    gmLog("setActiveTab", { tab: activeTabId });
    const panelsContainer = document.querySelector(".gm-tab-panels");
    if (panelsContainer) {
        panelsContainer.style.display = "block";
        panelsContainer.style.minHeight = "420px";
        panelsContainer.style.position = "relative";
    }
    gmTabButtonElements.forEach((button) => {
        const tabIdAttr = normalizeText(button.getAttribute("data-gm-tab"));
        const isActive = tabIdAttr === activeTabId;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    gmTabPanelElements.forEach((panel) => {
        const panelId = getTabIdFromPanel(panel);
        const isActive = panelId === activeTabId;
        if (isActive) {
            panel.hidden = false;
            panel.removeAttribute("hidden");
            panel.classList.add("is-active");
            panel.style.display = "block";
            panel.style.visibility = "visible";
            panel.style.opacity = "1";
            panel.style.position = "relative";
            panel.style.zIndex = "1";
            panel.style.pointerEvents = "auto";
            panel.style.minHeight = "360px";
            panel.style.height = "100%";
            const scroll = panel.querySelector(".gm-scroll");
            if (scroll) {
                scroll.style.display = "block";
                scroll.style.visibility = "visible";
                scroll.style.opacity = "1";
                scroll.style.overflowY = "auto";
                scroll.style.minHeight = panelId === "character" ? "300px" : "220px";
            }
        } else {
            panel.hidden = true;
            panel.setAttribute("hidden", "");
            panel.classList.remove("is-active");
            panel.style.display = "none";
            panel.style.visibility = "hidden";
            panel.style.opacity = "0";
            panel.style.pointerEvents = "none";
        }
    });
    if (activeTabId === "character" && gmCharacterDetailElement) {
        gmCharacterDetailElement.style.display = "grid";
        gmCharacterDetailElement.style.visibility = "visible";
        gmCharacterDetailElement.style.opacity = "1";
        gmCharacterDetailElement.style.minHeight = "260px";
    }
}

function initializeTabs() {
    gmTabButtonElements.forEach((button) => {
        button.addEventListener("click", () => {
            const tabId = normalizeText(button.getAttribute("data-gm-tab"));
            setActiveTab(tabId);
        });
    });
    document.addEventListener("click", (event) => {
        const target = event.target?.closest?.("[data-gm-tab]");
        if (!target) return;
        const tabId = normalizeText(target.getAttribute("data-gm-tab"));
        if (!tabId) return;
        setActiveTab(tabId);
    });
    setActiveTab("log");
}

function setActiveLogFormat(formatId) {
    activeLogFormat = formatId === "row" ? "row" : "block";
    gmLogFormatButtonElements.forEach((button) => {
        const buttonFormat = normalizeText(button.getAttribute("data-gm-log-format"));
        const isActive = buttonFormat === activeLogFormat;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    gmLogFormatPanelElements.forEach((panel) => {
        const panelFormat = normalizeText(panel.getAttribute("data-gm-log-format-panel"));
        const isActive = panelFormat === activeLogFormat;
        panel.classList.toggle("is-active", isActive);
        panel.hidden = !isActive;
    });
}

function initializeLogFormatTabs() {
    gmLogFormatButtonElements.forEach((button) => {
        button.addEventListener("click", () => {
            const formatId = normalizeText(button.getAttribute("data-gm-log-format"));
            setActiveLogFormat(formatId);
        });
    });
    document.addEventListener("click", (event) => {
        const target = event.target?.closest?.("[data-gm-log-format]");
        if (!target) return;
        const formatId = normalizeText(target.getAttribute("data-gm-log-format"));
        if (!formatId) return;
        setActiveLogFormat(formatId);
    });
    setActiveLogFormat("block");
}

function createStatusBar(label, currentValue, maxValue) {
    const statusBar = document.createElement("div");
    statusBar.className = "status-bar";

    const labelElement = document.createElement("label");
    labelElement.textContent = label;

    const progressContainer = document.createElement("div");
    progressContainer.className = "progress-container";

    const progress = document.createElement("progress");
    progress.className = `${String(label).toLowerCase()}-bar`;
    progress.max = Math.max(1, Math.round(toFiniteNumber(maxValue, 0)));
    progress.value = Math.max(0, Math.min(progress.max, Math.round(toFiniteNumber(currentValue, 0))));

    const valueText = document.createElement("span");
    valueText.className = "progress-value";
    valueText.textContent = `${progress.value} / ${progress.max}`;

    progressContainer.appendChild(progress);
    progressContainer.appendChild(valueText);
    statusBar.appendChild(labelElement);
    statusBar.appendChild(progressContainer);
    return statusBar;
}

function getCharacterName(character = {}) {
    return normalizeText(character?.名前 || character?.name);
}

function getCharacterResource(character = {}) {
    const resources = character?.resources || {};
    const hpMax = Math.max(0, Math.round(toFiniteNumber(resources?.hp?.max, character?.HP)));
    const mpMax = Math.max(0, Math.round(toFiniteNumber(resources?.mp?.max, character?.MP)));
    const stMax = Math.max(0, Math.round(toFiniteNumber(resources?.st?.max, character?.ST)));
    const hpCurrent = Math.max(0, Math.min(hpMax, Math.round(toFiniteNumber(resources?.hp?.current, hpMax))));
    const mpCurrent = Math.max(0, Math.min(mpMax, Math.round(toFiniteNumber(resources?.mp?.current, mpMax))));
    const stCurrent = Math.max(0, Math.min(stMax, Math.round(toFiniteNumber(resources?.st?.current, stMax))));
    const hpConsumedPercent = Math.max(0, Math.round(toFiniteNumber(resources?.hp?.consumedPercent, 0)));
    const mpConsumed = Math.max(0, Math.round(toFiniteNumber(resources?.mp?.consumed, 0)));
    const stConsumed = Math.max(0, Math.round(toFiniteNumber(resources?.st?.consumed, 0)));

    return {
        hp: { current: hpCurrent, max: hpMax, consumedPercent: hpConsumedPercent },
        mp: { current: mpCurrent, max: mpMax, consumed: mpConsumed },
        st: { current: stCurrent, max: stMax, consumed: stConsumed }
    };
}

function createCharacterCard(character = {}, options = {}) {
    const card = document.createElement("article");
    card.className = "character-container gm-character-card";
    if (options?.isSelected) {
        card.classList.add("selected");
    }

    const name = getCharacterName(character) || "不明";
    const level = toFiniteNumber(character?.Lv, 0);
    const ef = toFiniteNumber(character?.Ef, 0);
    const resources = getCharacterResource(character);

    const nameElement = document.createElement("p");
    nameElement.className = "character-name";
    nameElement.textContent = name;
    card.appendChild(nameElement);

    const metaElement = document.createElement("p");
    metaElement.className = "character-meta";
    metaElement.textContent = `Lv: ${level} Ef: ${ef}`;
    card.appendChild(metaElement);

    card.appendChild(createStatusBar("HP", resources.hp.current, resources.hp.max));
    card.appendChild(createStatusBar("MP", resources.mp.current, resources.mp.max));
    card.appendChild(createStatusBar("ST", resources.st.current, resources.st.max));

    return card;
}

function resolveSelectedCharacterContext(players = []) {
    const targetPlayerId = normalizeText(selectedCharacterContext?.playerId);
    const targetCharacterName = normalizeText(selectedCharacterContext?.characterName);
    if (targetPlayerId && targetCharacterName) {
        const matchedPlayer = (Array.isArray(players) ? players : []).find(
            (player) => normalizeText(player?.playerId) === targetPlayerId
        );
        const matchedCharacter = Array.isArray(matchedPlayer?.characters)
            ? matchedPlayer.characters.find((character) => getCharacterName(character) === targetCharacterName)
            : null;
        if (matchedPlayer && matchedCharacter) {
            return {
                playerId: targetPlayerId,
                characterName: targetCharacterName
            };
        }
    }

    for (const player of (Array.isArray(players) ? players : [])) {
        const characters = Array.isArray(player?.characters) ? player.characters : [];
        const preferredCharacter = characters.find((character) => hasVisibleSkillEntries(character));
        if (!preferredCharacter) continue;
        return {
            playerId: normalizeText(player?.playerId),
            characterName: getCharacterName(preferredCharacter)
        };
    }

    for (const player of (Array.isArray(players) ? players : [])) {
        const selectedName = normalizeText(player?.selectedCharacterName);
        if (!selectedName) continue;
        const matchedCharacter = Array.isArray(player?.characters)
            ? player.characters.find((character) => getCharacterName(character) === selectedName)
            : null;
        if (!matchedCharacter) continue;
        return {
            playerId: normalizeText(player?.playerId),
            characterName: selectedName
        };
    }

    for (const player of (Array.isArray(players) ? players : [])) {
        const firstCharacter = Array.isArray(player?.characters) ? player.characters[0] : null;
        if (!firstCharacter) continue;
        return {
            playerId: normalizeText(player?.playerId),
            characterName: getCharacterName(firstCharacter)
        };
    }

    return { playerId: "", characterName: "" };
}

function renderCharacterDetail(players = []) {
    if (!gmCharacterDetailElement) return;
    gmCharacterDetailElement.innerHTML = "";

    const resolved = resolveSelectedCharacterContext(players);
    selectedCharacterContext = { ...resolved };
    gmLog("renderCharacterDetail:start", {
        selected: selectedCharacterContext,
        players: Array.isArray(players) ? players.length : 0
    });

    if (!resolved.playerId || !resolved.characterName) {
        const empty = document.createElement("p");
        empty.className = "gm-empty";
        empty.textContent = "表示できるキャラクターがありません。";
        gmCharacterDetailElement.appendChild(empty);
        gmLog("renderCharacterDetail:empty-selected");
        return;
    }

    const matchedPlayer = players.find((row) => normalizeText(row?.playerId) === resolved.playerId) || null;
    const fallbackPlayer = players.find((row) => Array.isArray(row?.characters) && row.characters.length > 0) || null;
    const player = matchedPlayer || fallbackPlayer;
    const characters = Array.isArray(player?.characters) ? player.characters : [];
    let character = characters.find((row) => getCharacterName(row) === resolved.characterName) || null;
    if (!character && characters.length > 0) {
        character = characters[0];
    }
    if (!player || !character) {
        const empty = document.createElement("p");
        empty.className = "gm-empty";
        empty.textContent = "キャラクター詳細を表示できません。";
        gmCharacterDetailElement.appendChild(empty);
        gmLog("renderCharacterDetail:empty-character", {
            selected: selectedCharacterContext
        });
        return;
    }

    selectedCharacterContext = {
        playerId: normalizeText(player?.playerId),
        characterName: getCharacterName(character)
    };

    const characterNameHeading = document.createElement("h3");
    characterNameHeading.className = "gm-detail-character-name";
    characterNameHeading.textContent = getCharacterName(character) || "不明";
    gmCharacterDetailElement.appendChild(characterNameHeading);

    const battleState = resolveBattleStateView(character);

    const createSkillSection = (titleText, entries = [], mode = "active") => {
        const section = document.createElement("section");
        section.className = "gm-skill-section";
        section.style.display = "block";
        section.style.visibility = "visible";
        section.style.opacity = "1";

        const title = document.createElement("h3");
        title.className = "gm-sub-title";
        title.textContent = titleText;
        section.appendChild(title);

        if (!Array.isArray(entries) || entries.length === 0) {
            const empty = document.createElement("p");
            empty.className = "gm-empty";
            empty.textContent = "なし";
            section.appendChild(empty);
            return section;
        }

        const table = document.createElement("table");
        table.className = "gm-story-skill-table";
        table.style.display = "table";
        table.style.visibility = "visible";
        table.style.opacity = "1";
        table.style.width = "100%";
        const thead = document.createElement("thead");
        thead.style.display = "table-header-group";
        thead.innerHTML = `
            <tr class="gm-story-skill-header-main">
                <th colspan="6">技名</th>
                <th colspan="3" rowspan="2">説明</th>
            </tr>
            <tr class="gm-story-skill-header-sub">
                <th>威力</th>
                <th>守り</th>
                <th>状態</th>
                <th>R</th>
                <th>属性</th>
                <th>${mode === "active" ? "ターン" : "CT"}</th>
            </tr>
        `;
        table.appendChild(thead);
        const tbody = document.createElement("tbody");
        tbody.style.display = "table-row-group";
        entries.forEach((entry, index) => {
            const skillName = normalizeText(entry?.skillName) || "名称不明";
            const ruby = normalizeText(entry?.ruby);
            const skillNameHtml = ruby
                ? `<ruby>${escapeHtml(skillName)}<rt>${escapeHtml(ruby)}</rt></ruby>`
                : escapeHtml(skillName);
            const totalTurns = mode === "active"
                ? Math.max(0, Math.round(toFiniteNumber(entry?.totalTurns, 0)))
                : Math.max(0, Math.round(toFiniteNumber(entry?.cooldownTurns, 0)));
            const elapsedTurns = Math.max(0, Math.round(toFiniteNumber(entry?.elapsedTurns, 0)));
            const remainTurns = totalTurns >= INFINITE_TURNS
                ? INFINITE_TURNS
                : Math.max(0, totalTurns - elapsedTurns);
            const turnText = totalTurns >= INFINITE_TURNS
                ? "∞"
                : `${formatTurnValue(remainTurns)}/${formatTurnValue(totalTurns)}`;
            const detail = normalizeText(entry?.detail) || "-";
            const attribute = normalizeText(entry?.attribute) || "-";
            const magicLevel = normalizeText(entry?.magicLevel) || "-";
            const pending = (mode === "cooldown" && entry?.pendingWhileActive) ? " ※発動中停止" : "";
            const cooldownOverlayText = mode === "cooldown" ? `${turnText}${pending}` : "";
            const metricTurnText = mode === "active" ? turnText : cooldownOverlayText;
            const pairClass = index % 2 === 0 ? "gm-story-skill-pair-a" : "gm-story-skill-pair-b";

            const nameRow = document.createElement("tr");
            nameRow.className = `gm-story-skill-name-row ${pairClass}`;
            nameRow.style.display = "table-row";
            nameRow.innerHTML = `
                <td class="gm-story-skill-name-cell" colspan="6">
                    <span class="gm-story-skill-name-inline">${skillNameHtml}</span>
                </td>
                <td class="gm-story-skill-desc-cell" colspan="3" rowspan="2">
                    <div class="gm-story-skill-description${mode === "cooldown" ? " is-cooldown" : ""}">
                        <span class="gm-story-skill-description-text">${escapeHtml(detail)}</span>
                        ${mode === "cooldown"
                            ? `<span class="gm-story-skill-cooldown-overlay" aria-hidden="true">${escapeHtml(cooldownOverlayText)}</span>`
                            : ""}
                    </div>
                </td>
            `;
            nameRow.querySelectorAll("td").forEach((cell) => {
                cell.style.display = "table-cell";
                cell.style.color = "#1f2f45";
                cell.style.background = pairClass.includes("pair-b") ? "#f4f8fb" : "#ffffff";
                cell.style.border = "1px solid #d4e1f2";
                cell.style.padding = "6px";
            });
            tbody.appendChild(nameRow);

            const valueRow = document.createElement("tr");
            valueRow.className = `gm-story-skill-value-row ${pairClass}`;
            valueRow.style.display = "table-row";
            valueRow.innerHTML = `
                <td class="gm-story-skill-metric-cell">${escapeHtml(formatSkillMetric(entry?.power))}</td>
                <td class="gm-story-skill-metric-cell">${escapeHtml(formatSkillMetric(entry?.guard))}</td>
                <td class="gm-story-skill-metric-cell">${escapeHtml(formatSkillMetric(entry?.state))}</td>
                <td class="gm-story-skill-metric-cell">${escapeHtml(magicLevel || "-")}</td>
                <td class="gm-story-skill-metric-cell">${escapeHtml(attribute)}</td>
                <td class="gm-story-skill-metric-cell gm-story-skill-turn-cell">${escapeHtml(metricTurnText)}</td>
            `;
            valueRow.querySelectorAll("td").forEach((cell) => {
                cell.style.display = "table-cell";
                cell.style.color = "#1f2f45";
                cell.style.background = pairClass.includes("pair-b") ? "#f4f8fb" : "#ffffff";
                cell.style.border = "1px solid #d4e1f2";
                cell.style.padding = "6px";
            });
            tbody.appendChild(valueRow);
        });
        thead.querySelectorAll("th").forEach((th) => {
            th.style.display = "table-cell";
            th.style.color = "#1d2f1d";
            th.style.background = "#4caf50";
            th.style.border = "1px solid #d4e1f2";
            th.style.padding = "6px";
            th.style.textAlign = "center";
            th.style.fontWeight = "700";
        });
        table.appendChild(tbody);
        section.appendChild(table);
        return section;
    };

    const activeBuffs = pickSkillEntriesFromBattleState(battleState, "active");
    gmCharacterDetailElement.appendChild(createSkillSection("発動中スキル", activeBuffs, "active"));

    const cooldowns = pickSkillEntriesFromBattleState(battleState, "cooldown");
    gmCharacterDetailElement.appendChild(createSkillSection("クールタイム中スキル", cooldowns, "cooldown"));

    if (activeBuffs.length === 0 && cooldowns.length === 0) {
        gmLog("skill detail empty", {
            playerId: selectedCharacterContext?.playerId || "",
            characterName: selectedCharacterContext?.characterName || "",
            battleStateKeys: Object.keys(battleState || {})
        });
    } else {
        gmLog("skill detail rendered", {
            playerId: selectedCharacterContext?.playerId || "",
            characterName: selectedCharacterContext?.characterName || "",
            active: activeBuffs.length,
            cooldown: cooldowns.length
        });
    }

    const characterPanel = gmTabPanelElements.find(
        (panel) => getTabIdFromPanel(panel) === "character"
    );
    gmLog("character detail dom", {
        activeTabId,
        detailChildren: gmCharacterDetailElement?.children?.length || 0,
        panelHidden: Boolean(characterPanel?.hidden),
        panelClass: normalizeText(characterPanel?.className || "")
    });
}

function renderPresence(players = []) {
    if (!gmPresenceListElement) return;
    gmPresenceListElement.innerHTML = "";

    if (!Array.isArray(players) || players.length === 0) {
        const empty = document.createElement("p");
        empty.className = "gm-empty";
        empty.textContent = "接続中プレイヤーはありません。";
        gmPresenceListElement.appendChild(empty);
        return;
    }

    const resolved = resolveSelectedCharacterContext(players);
    selectedCharacterContext = { ...resolved };

    players.forEach((player) => {
        const playerId = normalizeText(player?.playerId);
        const playerGroup = document.createElement("section");
        playerGroup.className = "gm-player-group";

        const heading = document.createElement("div");
        heading.className = "gm-player-heading";

        const title = document.createElement("h3");
        title.textContent = `Player: ${playerId || "unknown"}`;
        heading.appendChild(title);

        const seenAt = document.createElement("p");
        seenAt.className = "gm-player-seen-at";
        seenAt.textContent = `最終更新: ${formatDisplayTime(player?.lastSeenAt)}`;
        heading.appendChild(seenAt);

        playerGroup.appendChild(heading);

        const cardGrid = document.createElement("div");
        cardGrid.className = "gm-character-card-grid";

        const characters = Array.isArray(player?.characters) ? player.characters : [];
        if (characters.length === 0) {
            const empty = document.createElement("p");
            empty.className = "gm-empty";
            empty.textContent = "story.html で選択して開いたキャラクターはありません。";
            cardGrid.appendChild(empty);
        } else {
            characters.forEach((character) => {
                const characterName = getCharacterName(character);
                const isSelected = (
                    playerId === selectedCharacterContext.playerId
                    && characterName === selectedCharacterContext.characterName
                );
                const card = createCharacterCard(character, { isSelected });
                card.dataset.playerId = playerId;
                card.dataset.characterName = characterName;
                card.addEventListener("click", () => {
                    selectedCharacterContext = { playerId, characterName };
                    gmLog("card click", { playerId, characterName });
                    renderPresence(latestConnectedPlayers);
                    renderCharacterDetail(latestConnectedPlayers);
                    setActiveTab("character");
                });
                cardGrid.appendChild(card);
            });
        }

        playerGroup.appendChild(cardGrid);
        gmPresenceListElement.appendChild(playerGroup);
    });
}

function renderLog(selectDataLog = {}) {
    if (gmLogMetaElement) {
        const updatedAt = selectDataLog?.updatedAt
            ? formatDisplayTime(selectDataLog.updatedAt)
            : "未作成";
        gmLogMetaElement.textContent = `最終更新: ${updatedAt}`;
    }
    const rawText = String(selectDataLog?.text ?? "");
    const parsedRows = parseSelectDataLogRows(rawText);
    const blockTsv = buildSelectDataLogBlockTsv(parsedRows);
    const excelTsv = buildSelectDataLogExcelTsv(parsedRows);
    updateLogTextarea(gmLogExcelBlockContentElement, blockTsv);
    updateLogTextarea(gmLogExcelRowContentElement, excelTsv);
}

function updateLogTextarea(element, nextValue = "") {
    if (!element) return;
    const nextText = String(nextValue ?? "");
    if (element.value === nextText) return;
    element.value = nextText;
    element.scrollTop = element.scrollHeight;
}

function parseSelectDataLogRows(rawText = "") {
    const normalized = String(rawText || "").replace(/\r\n/g, "\n");
    if (!normalized.trim()) return [];

    const parseJsonLines = () => {
        const rows = [];
        normalized.split("\n").forEach((line) => {
            const text = normalizeText(line);
            if (!text || !text.startsWith("{")) return;
            try {
                const parsed = JSON.parse(text);
                if (!parsed || typeof parsed !== "object") return;
                const skillsRaw = Array.isArray(parsed?.skills) ? parsed.skills : [];
                const skills = skillsRaw
                    .map((skill) => {
                        if (typeof skill === "string") return normalizeText(skill);
                        return normalizeText(skill?.name || skill?.skillName || skill?.skill || "");
                    })
                    .filter(Boolean);
                const diceResults = (Array.isArray(parsed?.rollResults) ? parsed.rollResults : [])
                    .map((entry) => normalizeText(entry))
                    .filter(Boolean);
                rows.push({
                    timestamp: normalizeText(parsed?.timestamp),
                    requestId: normalizeText(parsed?.requestId),
                    name: normalizeText(parsed?.name),
                    attackOption: normalizeText(parsed?.attackOption),
                    fullPower: normalizeText(parsed?.fullPower),
                    skills,
                    diceResults
                });
            } catch (error) {
                // ignore malformed line
            }
        });
        return rows;
    };

    const jsonRows = parseJsonLines();

    const blocks = normalized
        .split(/\n(?=timestamp\t)/g)
        .map((block) => block.trim())
        .filter(Boolean);

    const rows = [];
    blocks.forEach((block) => {
        const lines = block.split("\n");
        if (!lines.length) return;

        const timestampLine = lines.find((line) => line.startsWith("timestamp\t")) || "";
        const requestIdLine = lines.find((line) => line.startsWith("requestId\t")) || "";
        const timestamp = timestampLine ? timestampLine.slice("timestamp\t".length).trim() : "";
        const requestId = requestIdLine ? requestIdLine.slice("requestId\t".length).trim() : "";

        const startIndex = lines.findIndex((line) => !line.startsWith("timestamp\t") && !line.startsWith("requestId\t"));
        if (startIndex < 0) return;

        const payloadLines = lines.slice(startIndex);
        const name = normalizeText(payloadLines[0]);
        const attackOption = normalizeText(payloadLines[1]);
        const fullPower = normalizeText(payloadLines[2]);

        const skills = [];
        let cursor = 3;
        for (; cursor < payloadLines.length; cursor += 1) {
            const value = payloadLines[cursor];
            if (!value) break;
            const normalizedSkill = normalizeText(value);
            if (normalizedSkill) skills.push(normalizedSkill);
        }

        let diceLine = "";
        for (let i = cursor + 1; i < payloadLines.length; i += 1) {
            const value = normalizeText(payloadLines[i]);
            if (value) {
                diceLine = value;
                break;
            }
        }
        const diceResults = diceLine ? diceLine.split("\t").map((entry) => normalizeText(entry)) : [];

        rows.push({
            timestamp,
            requestId,
            name,
            attackOption,
            fullPower,
            skills,
            diceResults
        });
    });
    if (rows.length > 0 && jsonRows.length > 0) {
        return [...rows, ...jsonRows];
    }
    if (rows.length > 0) return rows;
    return jsonRows;
}

function sanitizeTsvField(value) {
    return String(value ?? "")
        .replace(/\t/g, " ")
        .replace(/\r?\n/g, " ")
        .trim();
}

function buildSelectDataLogExcelTsv(rows = []) {
    const safeRows = Array.isArray(rows) ? rows : [];
    const maxDiceCount = safeRows.reduce((maxCount, row) => {
        const count = Array.isArray(row?.diceResults) ? row.diceResults.length : 0;
        return Math.max(maxCount, count);
    }, 0);
    const header = [
        "timestamp",
        "requestId",
        "name",
        "attackOption",
        "fullPower",
        "skills",
        ...Array.from({ length: maxDiceCount }, (_, index) => `dice${index + 1}`)
    ];
    const lines = [header.join("\t")];

    safeRows.forEach((row) => {
        const base = [
            sanitizeTsvField(row?.timestamp),
            sanitizeTsvField(row?.requestId),
            sanitizeTsvField(row?.name),
            sanitizeTsvField(row?.attackOption),
            sanitizeTsvField(row?.fullPower),
            sanitizeTsvField((Array.isArray(row?.skills) ? row.skills : []).join(" | "))
        ];
        const diceColumns = Array.from({ length: maxDiceCount }, (_, index) => (
            sanitizeTsvField((Array.isArray(row?.diceResults) ? row.diceResults : [])[index] || "")
        ));
        lines.push([...base, ...diceColumns].join("\t"));
    });

    return lines.join("\n");
}

function buildSelectDataLogBlockTsv(rows = []) {
    const safeRows = Array.isArray(rows) ? rows : [];
    if (safeRows.length === 0) return "";
    const blocks = safeRows.map((row) => {
        const skillLines = Array.isArray(row?.skills)
            ? row.skills.map((name) => sanitizeTsvField(name)).filter(Boolean)
            : [];
        const diceLine = Array.isArray(row?.diceResults)
            ? row.diceResults.map((entry) => sanitizeTsvField(entry)).join("\t")
            : "";
        const lines = [
            `timestamp\t${sanitizeTsvField(row?.timestamp)}`,
            `requestId\t${sanitizeTsvField(row?.requestId)}`,
            sanitizeTsvField(row?.name),
            sanitizeTsvField(row?.attackOption),
            sanitizeTsvField(row?.fullPower),
            ...skillLines,
            "",
            diceLine,
            ""
        ];
        return lines.join("\n");
    });
    return blocks.join("\n");
}

async function fetchDashboard() {
    const token = getGmToken();
    if (!token) {
        logoutGm();
        return;
    }

    try {
        const response = await fetch("/api/gm/dashboard", {
            method: "GET",
            headers: { "x-gm-token": token }
        });
        const data = await response.json();
        if (!response.ok || !data?.success) {
            if (response.status === 401) {
                logoutGm();
                return;
            }
            throw new Error(data?.message || `gm dashboard error: ${response.status}`);
        }

        latestConnectedPlayers = Array.isArray(data?.connectedPlayers) ? data.connectedPlayers : [];
        const dashboardSummary = latestConnectedPlayers.map((player) => ({
            playerId: normalizeText(player?.playerId),
            selectedCharacterName: normalizeText(player?.selectedCharacterName),
            characterCount: Array.isArray(player?.characters) ? player.characters.length : 0
        }));
        const signature = JSON.stringify(dashboardSummary);
        if (signature !== lastDashboardLogSignature) {
            lastDashboardLogSignature = signature;
            gmLog("dashboard updated", dashboardSummary);
        }
        renderPresence(latestConnectedPlayers);
        renderCharacterDetail(latestConnectedPlayers);
        renderLog(data?.selectDataLog || {});

        if (gmPresenceMetaElement) {
            const players = latestConnectedPlayers.length;
            gmPresenceMetaElement.textContent = `更新: ${formatDisplayTime(data?.updatedAt)} / 接続 ${players} 人`;
        }
    } catch (error) {
        console.warn("[gm] dashboard fetch failed:", error);
        if (gmPresenceMetaElement) {
            gmPresenceMetaElement.textContent = "更新失敗。再試行します。";
        }
    }
}

function startPolling() {
    fetchDashboard();
    pollTimer = window.setInterval(fetchDashboard, POLL_INTERVAL_MS);
}

function stopPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
}

gmLogoutButtonElement?.addEventListener("click", () => {
    stopPolling();
    logoutGm();
});

window.addEventListener("beforeunload", stopPolling);

initializeTabs();
initializeLogFormatTabs();

if (!getGmToken()) {
    redirectToLogin();
} else {
    startPolling();
}
