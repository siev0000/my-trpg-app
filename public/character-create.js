function normalizeText(value) {
    return String(value ?? "").trim();
}

const defaultBaseScreenWidth = 720;
const defaultBaseScreenHeight = 1280;
const ATTRIBUTE_ICON_DIR_NAME = "攻撃手段";
const ATTRIBUTE_ICON_BASE_URL = `/images/${encodeURIComponent(ATTRIBUTE_ICON_DIR_NAME)}/`;

function updateCreateScreenScale() {
    const rootStyle = getComputedStyle(document.documentElement);
    const cssWidth = Number(String(rootStyle.getPropertyValue("--design-width") || "").trim());
    const cssHeight = Number(String(rootStyle.getPropertyValue("--design-height") || "").trim());
    const designWidth = Number.isFinite(cssWidth) && cssWidth > 0 ? cssWidth : defaultBaseScreenWidth;
    const designHeight = Number.isFinite(cssHeight) && cssHeight > 0 ? cssHeight : defaultBaseScreenHeight;

    const widthScale = window.innerWidth / designWidth;
    const heightScale = window.innerHeight / designHeight;
    const rawScale = Math.min(widthScale, heightScale);
    const normalizedScale = Number.isFinite(rawScale) && rawScale > 0
        ? rawScale
        : 1;
    document.documentElement.style.setProperty("--app-scale", normalizedScale.toFixed(4));
}

function toInteger(value, fallback = 0) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.trunc(parsed);
}

function setErrorMessage(message = "") {
    const target = document.getElementById("create-error");
    if (!target) return;
    target.textContent = normalizeText(message);
}

function getRequiredSessionPlayerId() {
    return normalizeText(
        sessionStorage.getItem("playerId")
        || sessionStorage.getItem("username")
    );
}

function parseSessionJsonArray(key) {
    const raw = sessionStorage.getItem(key);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
}

const pageQuery = new URLSearchParams(window.location.search);
const createPageMode = normalizeText(pageQuery.get("mode")).toLowerCase() === "edit" ? "edit" : "create";
let editTargetCharacterName = normalizeText(pageQuery.get("name"));

let magicRealmOptions = [];
const magicRealmMap = new Map();
let currentAttributePickerIndex = 1;
let pendingAttributeRealmName = "";
let previousAttributeRealmName = "";
const STATUS_SUM_INPUT_MAP = [
    ["field-hp", "sum-hp"],
    ["field-mp", "sum-mp"],
    ["field-st", "sum-st"],
    ["field-attack", "sum-attack"],
    ["field-defense", "sum-defense"],
    ["field-magic", "sum-magic"],
    ["field-magic-defense", "sum-magic-defense"],
    ["field-speed", "sum-speed"],
    ["field-hit", "sum-hit"],
    ["field-siz", "sum-siz"],
    ["field-app", "sum-app"]
];
const DEFAULT_CREATE_HELP_MESSAGE = "項目を選択すると説明が表示されます";
const selectedAttributeMagicKeyMap = new Map();
const ACQUIRED_CLASS_COUNT = 20;
const CREATE_TABLE_COLUMN_COUNT = ACQUIRED_CLASS_COUNT + 2;
const CREATE_TABLE_MAIN_SPAN_COLS = ACQUIRED_CLASS_COUNT + 1;
const ACQUIRED_CLASS_HEAD_FONT_BASE_PX = 20;
const ACQUIRED_CLASS_HEAD_FONT_MIN_PX = 14;
const ACQUIRED_CLASS_HEAD_FONT_SHRINK_FROM = 14;
const CLASS_STATUS_FETCH_DEBOUNCE_MS = 140;
const TECH_LEVEL_MAX = 10;
const STATUS_ROW_DEFINITIONS = [
    { key: "HP", inputId: "field-hp", sumId: "sum-hp" },
    { key: "MP", inputId: "field-mp", sumId: "sum-mp" },
    { key: "ST", inputId: "field-st", sumId: "sum-st" },
    { key: "攻撃", inputId: "field-attack", sumId: "sum-attack" },
    { key: "防御", inputId: "field-defense", sumId: "sum-defense" },
    { key: "魔力", inputId: "field-magic", sumId: "sum-magic" },
    { key: "魔防", inputId: "field-magic-defense", sumId: "sum-magic-defense" },
    { key: "速度", inputId: "field-speed", sumId: "sum-speed" },
    { key: "命中", inputId: "field-hit", sumId: "sum-hit" },
    { key: "SIZ", inputId: "field-siz", sumId: "sum-siz" },
    { key: "APP", inputId: "field-app", sumId: "sum-app" }
];
const statusRowDefinitionByKey = new Map(
    STATUS_ROW_DEFINITIONS.map((row) => [row.key, row])
);
const SKILL_ROW_DEFINITIONS = [
    { key: "威圧", label: "威圧" },
    { key: "透明化", label: "透明化" },
    { key: "隠密", label: "隠密" },
    { key: "消音", label: "消音" },
    { key: "看破", label: "看破" },
    { key: "知覚", label: "知覚" },
    { key: "聴覚", label: "聴覚" },
    { key: "追跡", label: "追跡" },
    { key: "軽業", label: "軽業" },
    { key: "鑑定", label: "鑑定" },
    { key: "騎乗", label: "騎乗" },
    { key: "芸能", label: "芸能" },
    { key: "言語学", label: "言語学" },
    { key: "交渉", label: "交渉" },
    { key: "呪文学", label: "呪文学" },
    { key: "職能", label: "職能" },
    { key: "真意看破", label: "真意看破" },
    { key: "水泳", label: "水泳" },
    { key: "製作", label: "製作" },
    { key: "生存", label: "生存" },
    { key: "装置", label: "装置" },
    { key: "精神接続", label: "精神接続" },
    { key: "知識", label: "知識" },
    { key: "治療", label: "治療" },
    { key: "早業", label: "早業" },
    { key: "登攀", label: "登攀" },
    { key: "指揮", label: "指揮" },
    { key: "騙す", label: "騙す" },
    { key: "変装", label: "変装" },
    { key: "魔道具操作", label: "魔道具操作" },
    { key: "魔力系", label: "魔力系" },
    { key: "信仰系", label: "信仰系" }
];
const CLASS_LV_SCALED_SKILL_KEYS = new Set(["魔力系", "信仰系"]);
let classStatusRecalcTimer = null;
let classStatusFetchSequence = 0;
let classNameOptions = [];
let classOptionEntries = [];
let classTypeOptions = [];
let currentClassPickerType = "";
let currentClassPickerIndex = 1;

function setCreateHelpMessage(message = "") {
    const target = document.getElementById("create-help-box");
    if (!target) return;
    const text = normalizeText(message);
    target.textContent = text || DEFAULT_CREATE_HELP_MESSAGE;
}

function getMagicEntryKey(entry = {}) {
    return `${normalizeText(entry?.name)}::${toInteger(entry?.rank, 0)}`;
}

function showAttributeMagicDetail(index = 1, realm = null, entry = null) {
    if (!entry) {
        setCreateHelpMessage("");
        return;
    }
    const realmTitle = getRealmDisplayMeta(realm).title;
    const rank = Math.max(0, toInteger(entry?.rank, 0));
    const rankText = rank > 0 ? `R${rank}` : "R-";
    const name = normalizeText(entry?.name) || "未設定";
    const detail = normalizeText(entry?.detail) || "詳細はありません。";
    setCreateHelpMessage(`属性${index} / ${realmTitle}\n${name} ${rankText}\n${detail}`);
}

function syncPrimaryAttributeLabel() {
    const labelElement = document.getElementById("selected-primary-attribute");
    const primaryInput = document.getElementById("field-attr-1");
    if (!labelElement || !primaryInput) return;
    const selectedRealm = getRealmOptionByName(primaryInput.value);
    labelElement.textContent = selectedRealm
        ? getRealmDisplayMeta(selectedRealm).title
        : "属性を選択";
}

function syncDisplayLevelValues() {
    const totalLvElement = document.getElementById("display-total-lv");
    const totalEfElement = document.getElementById("display-total-ef");
    const lvInput = document.getElementById("field-lv");
    const efInput = document.getElementById("field-ef");
    if (!lvInput || !efInput) return;
    const lv = Math.max(1, toInteger(lvInput.value, 1));
    const ef = Math.min(lv, Math.max(0, toInteger(efInput.value, 0)));
    lvInput.value = String(lv);
    efInput.value = String(ef);
    const tableTotals = getLvEfTotalsFromTable();
    const displayLv = tableTotals.lv;
    const displayEf = tableTotals.ef;
    if (totalLvElement) {
        totalLvElement.textContent = String(displayLv);
    }
    if (totalEfElement) {
        totalEfElement.textContent = String(displayEf);
    }
}

function syncStatusSummaryValues() {
    STATUS_SUM_INPUT_MAP.forEach(([inputId, outputId]) => {
        const input = document.getElementById(inputId);
        const output = document.getElementById(outputId);
        if (!input || !output) return;
        const value = toInteger(input.value, 0);
        output.textContent = String(value);
    });
}

function initializeDisplayMirrors() {
    STATUS_SUM_INPUT_MAP.forEach(([inputId]) => {
        const input = document.getElementById(inputId);
        if (!input) return;
        input.addEventListener("input", syncStatusSummaryValues);
        input.addEventListener("change", syncStatusSummaryValues);
    });
    const lvInput = document.getElementById("field-lv");
    const efInput = document.getElementById("field-ef");
    lvInput?.addEventListener("input", syncDisplayLevelValues);
    lvInput?.addEventListener("change", syncDisplayLevelValues);
    efInput?.addEventListener("input", syncDisplayLevelValues);
    efInput?.addEventListener("change", syncDisplayLevelValues);
    syncStatusSummaryValues();
    syncDisplayLevelValues();
}

function initializeHeaderTabShortcuts() {
    const shortcutButtons = Array.from(document.querySelectorAll("[data-create-tab-target]"));
    shortcutButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const tabId = normalizeText(button.getAttribute("data-create-tab-target"));
            if (!tabId) return;
            setCreateTab(tabId);
        });
    });
}

function renderAcquiredClassInputs() {
    const container = document.getElementById("acquired-class-list");
    if (!container) return;
    container.innerHTML = "";
    for (let i = 1; i <= ACQUIRED_CLASS_COUNT; i += 1) {
        const row = document.createElement("div");
        row.className = "acquired-class-item";

        const label = document.createElement("label");
        label.className = "acquired-class-item-label";
        label.setAttribute("for", `field-class-${i}`);
        label.textContent = `取得${i}`;

        const input = document.createElement("input");
        input.type = "text";
        input.id = `field-class-${i}`;
        input.name = `class${i}`;
        input.placeholder = i === 1 ? "例: 戦士_Lv1" : "";
        input.addEventListener("input", syncAcquiredClassHeader);
        input.addEventListener("change", syncAcquiredClassHeader);

        row.appendChild(label);
        row.appendChild(input);
        container.appendChild(row);
    }
    syncAcquiredClassHeader();
}

function parseAcquiredClassEntry(rawValue = "") {
    const raw = normalizeText(rawValue);
    if (!raw) {
        return {
            raw: "",
            name: "",
            lv: null,
            ef: null
        };
    }

    let name = raw;
    let lv = null;
    let ef = null;

    const compactMatch = name.match(/^(\d{2})(\d{2})(.+)$/);
    if (compactMatch) {
        lv = Math.max(0, toInteger(compactMatch[1], 0));
        ef = Math.max(0, toInteger(compactMatch[2], 0));
        name = normalizeText(compactMatch[3]);
    }

    if (lv === null) {
        const lvMatch = name.match(/(?:^|[\s_\/\-])Lv[:：]?\s*(\d{1,3})(?=$|[\s_\/\-])/i);
        if (lvMatch) lv = Math.max(0, toInteger(lvMatch[1], 0));
    }
    if (ef === null) {
        const efMatch = name.match(/(?:^|[\s_\/\-])Ef[:：]?\s*(\d{1,3})(?=$|[\s_\/\-])/i);
        if (efMatch) ef = Math.max(0, toInteger(efMatch[1], 0));
    }

    name = normalizeText(
        name
            .replace(/(?:^|[\s_\/\-])Lv[:：]?\s*\d{1,3}(?=$|[\s_\/\-])/gi, " ")
            .replace(/(?:^|[\s_\/\-])Ef[:：]?\s*\d{1,3}(?=$|[\s_\/\-])/gi, " ")
            .replace(/_/g, " ")
            .replace(/\s{2,}/g, " ")
    );

    return {
        raw,
        name,
        lv,
        ef
    };
}

function getTextLength(text = "") {
    return Array.from(normalizeText(text)).length;
}

function getAcquiredClassHeadFontSizePx(labelText = "") {
    const textLength = getTextLength(labelText);
    if (textLength <= ACQUIRED_CLASS_HEAD_FONT_SHRINK_FROM) {
        return ACQUIRED_CLASS_HEAD_FONT_BASE_PX;
    }
    const overCount = textLength - ACQUIRED_CLASS_HEAD_FONT_SHRINK_FROM;
    const shrinkPx = Math.ceil(overCount / 2);
    return Math.max(
        ACQUIRED_CLASS_HEAD_FONT_MIN_PX,
        ACQUIRED_CLASS_HEAD_FONT_BASE_PX - shrinkPx
    );
}

function applyAcquiredClassHeadFontSize(labelElement, labelText = "") {
    if (!labelElement) return;
    const fontSize = getAcquiredClassHeadFontSizePx(labelText);
    labelElement.style.fontSize = `${fontSize}px`;
}

function initializeSkillRowsLayout() {
    const skillBody = document.querySelector('tbody[data-create-panel="skill"]');
    if (!skillBody) return;

    const existingRows = Array.from(skillBody.querySelectorAll("tr[data-skill-row]"));
    if (existingRows.length > 0) return;

    const anchorRow = skillBody.querySelector("tr");
    if (!anchorRow) return;

    SKILL_ROW_DEFINITIONS.forEach((rowDef) => {
        const row = document.createElement("tr");
        row.dataset.skillRow = "1";
        row.dataset.skillKey = rowDef.key;

        const labelCell = document.createElement("td");
        labelCell.textContent = rowDef.label;

        const sumCell = document.createElement("td");
        const sumValue = document.createElement("span");
        sumValue.className = "skill-sum-value";
        sumValue.textContent = "0";
        sumCell.appendChild(sumValue);

        row.appendChild(labelCell);
        row.appendChild(sumCell);
        skillBody.insertBefore(row, anchorRow);
    });
}

function initializeTechRowsLayout() {
    const techBody = document.querySelector('tbody[data-create-panel="tech"]');
    if (!techBody) return;

    const existingRows = Array.from(techBody.querySelectorAll("tr[data-tech-row]"));
    if (existingRows.length > 0) return;

    const anchorRow = techBody.querySelector("tr");
    if (!anchorRow) return;

    for (let level = 1; level <= TECH_LEVEL_MAX; level += 1) {
        const row = document.createElement("tr");
        row.dataset.techRow = "1";
        row.dataset.techLevel = String(level);

        const labelCell = document.createElement("td");
        labelCell.textContent = `Lv${level}`;

        const sumCell = document.createElement("td");
        const sumValue = document.createElement("span");
        sumValue.className = "tech-sum-value";
        sumValue.textContent = "0";
        sumCell.appendChild(sumValue);

        row.appendChild(labelCell);
        row.appendChild(sumCell);
        techBody.insertBefore(row, anchorRow);
    }
}

function initializeAcquiredClassTableLayout() {
    const headRow = document.getElementById("acquired-class-head-row");
    const lvRow = document.getElementById("acquired-class-lv-row");
    const efRow = document.getElementById("acquired-class-ef-row");
    if (!headRow || !lvRow || !efRow) return;

    const trimAfterSecondCell = (row) => {
        while (row.children.length > 2) {
            row.removeChild(row.lastElementChild);
        }
    };
    trimAfterSecondCell(headRow);
    trimAfterSecondCell(lvRow);
    trimAfterSecondCell(efRow);

    for (let i = 1; i <= ACQUIRED_CLASS_COUNT; i += 1) {
        const head = document.createElement("th");
        head.id = `acquired-class-head-${i}`;
        head.className = "acquired-class-head-cell";
        head.dataset.classIndex = String(i);
        const headButton = document.createElement("button");
        headButton.type = "button";
        headButton.className = "acquired-class-head-button";
        headButton.dataset.classIndex = String(i);
        headButton.addEventListener("click", () => {
            openClassPickerModal(i);
        });
        const headLabel = document.createElement("span");
        headLabel.className = "acquired-class-head-label";
        headLabel.textContent = "クラス追加";
        applyAcquiredClassHeadFontSize(headLabel, headLabel.textContent);
        headButton.appendChild(headLabel);
        head.appendChild(headButton);
        headRow.appendChild(head);

        const lvCell = document.createElement("td");
        lvCell.id = `acquired-class-lv-${i}`;
        lvCell.className = "acquired-class-meta-cell";
        lvCell.textContent = "";
        lvRow.appendChild(lvCell);

        const efCell = document.createElement("td");
        efCell.id = `acquired-class-ef-${i}`;
        efCell.className = "acquired-class-meta-cell";
        efCell.textContent = "";
        efRow.appendChild(efCell);
    }

    const statusRows = Array.from(document.querySelectorAll('tbody[data-create-panel="status"] tr[data-status-row]'));
    statusRows.forEach((row) => {
        trimAfterSecondCell(row);
        for (let i = 1; i <= ACQUIRED_CLASS_COUNT; i += 1) {
            const valueCell = document.createElement("td");
            valueCell.className = "acquired-class-status-cell";
            valueCell.textContent = "0";
            row.appendChild(valueCell);
        }
    });

    const skillRows = Array.from(document.querySelectorAll('tbody[data-create-panel="skill"] tr[data-skill-row]'));
    skillRows.forEach((row) => {
        trimAfterSecondCell(row);
        for (let i = 1; i <= ACQUIRED_CLASS_COUNT; i += 1) {
            const valueCell = document.createElement("td");
            valueCell.className = "acquired-class-skill-cell";
            valueCell.textContent = "0";
            row.appendChild(valueCell);
        }
    });

    const techRows = Array.from(document.querySelectorAll('tbody[data-create-panel="tech"] tr[data-tech-row]'));
    techRows.forEach((row) => {
        trimAfterSecondCell(row);
        for (let i = 1; i <= ACQUIRED_CLASS_COUNT; i += 1) {
            const valueCell = document.createElement("td");
            valueCell.className = "acquired-class-tech-cell";
            valueCell.textContent = "0";
            row.appendChild(valueCell);
        }
    });

    document.querySelectorAll(".js-main-span-cell").forEach((cell) => {
        cell.colSpan = CREATE_TABLE_MAIN_SPAN_COLS;
    });
    document.querySelectorAll(".js-full-span-cell").forEach((cell) => {
        cell.colSpan = CREATE_TABLE_COLUMN_COUNT;
    });
}

function syncAcquiredClassHeader() {
    for (let i = 1; i <= ACQUIRED_CLASS_COUNT; i += 1) {
        const parsed = parseAcquiredClassEntry(document.getElementById(`field-class-${i}`)?.value);
        const headCell = document.getElementById(`acquired-class-head-${i}`);
        const lvCell = document.getElementById(`acquired-class-lv-${i}`);
        const efCell = document.getElementById(`acquired-class-ef-${i}`);
        if (headCell) {
            const headLabel = headCell.querySelector(".acquired-class-head-label");
            const isEmpty = !parsed.name;
            headCell.classList.toggle("is-empty", isEmpty);
            if (headLabel) {
                const nextLabel = parsed.name || "クラス追加";
                headLabel.textContent = nextLabel;
                applyAcquiredClassHeadFontSize(headLabel, nextLabel);
            } else {
                headCell.textContent = parsed.name || "クラス追加";
            }
            headCell.title = parsed.raw || "クリックでクラスを設定";
        }
        if (lvCell) {
            lvCell.textContent = Number.isFinite(parsed.lv) ? String(parsed.lv) : "";
        }
        if (efCell) {
            efCell.textContent = Number.isFinite(parsed.ef) ? String(parsed.ef) : "";
        }
    }
    scheduleRefreshStatusFromAcquiredClasses();
}

function toTwoDigitNumber(value, fallback = 0) {
    return Math.max(0, Math.min(99, toInteger(value, fallback)));
}

function buildAcquiredClassRawValue(className = "", lv = 0, ef = 0) {
    const normalizedClassName = normalizeText(className);
    if (!normalizedClassName) return "";
    const safeLv = toTwoDigitNumber(lv, 0);
    const safeEf = Math.min(safeLv, toTwoDigitNumber(ef, 0));
    const lvText = String(safeLv).padStart(2, "0");
    const efText = String(safeEf).padStart(2, "0");
    return `${lvText}${efText}${normalizedClassName}`;
}

function setAcquiredClassEntry(index = 1, className = "", lv = 0, ef = 0) {
    const safeIndex = Math.min(ACQUIRED_CLASS_COUNT, Math.max(1, toInteger(index, 1)));
    const input = document.getElementById(`field-class-${safeIndex}`);
    if (!input) return;
    input.value = buildAcquiredClassRawValue(className, lv, ef);
    syncAcquiredClassHeader();
}

function closeClassPickerModal() {
    const modal = document.getElementById("class-picker-modal");
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
}

function openClassPickerModal(index = 1) {
    const safeIndex = Math.min(ACQUIRED_CLASS_COUNT, Math.max(1, toInteger(index, 1)));
    const modal = document.getElementById("class-picker-modal");
    const title = document.getElementById("class-picker-modal-title");
    const nameInput = document.getElementById("class-picker-name-input");
    const lvInput = document.getElementById("class-picker-lv-input");
    const efInput = document.getElementById("class-picker-ef-input");
    if (!modal || !nameInput || !lvInput || !efInput) return;

    const parsed = parseAcquiredClassEntry(document.getElementById(`field-class-${safeIndex}`)?.value);
    currentClassPickerIndex = safeIndex;
    if (title) {
        title.textContent = `取得クラス${safeIndex}を編集`;
    }
    nameInput.value = parsed.name || "";
    lvInput.value = String(toTwoDigitNumber(parsed.lv, 0));
    efInput.value = String(toTwoDigitNumber(parsed.ef, 0));
    currentClassPickerType = "";
    setClassPickerStep("type");
    renderClassTypeListView();

    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
}

function setClassPickerStep(step = "type") {
    const typeStep = document.getElementById("class-picker-type-step");
    const classStep = document.getElementById("class-picker-class-step");
    const backButton = document.getElementById("class-picker-modal-back");
    const saveButton = document.getElementById("class-picker-modal-save");
    const clearButton = document.getElementById("class-picker-modal-clear");
    const title = document.getElementById("class-picker-modal-title");
    const subtitle = document.getElementById("class-picker-modal-subtitle");
    const isTypeStep = normalizeText(step) !== "class";

    if (typeStep) typeStep.hidden = !isTypeStep;
    if (classStep) classStep.hidden = isTypeStep;
    if (backButton) backButton.hidden = isTypeStep;
    if (saveButton) saveButton.hidden = isTypeStep;
    if (clearButton) clearButton.hidden = isTypeStep;
    if (title) {
        title.textContent = isTypeStep
            ? "取得クラス編集（1/2 項目選択）"
            : "取得クラス編集（2/2 クラス選択）";
    }
    if (subtitle) {
        subtitle.textContent = isTypeStep
            ? "項目リストから選択してください"
            : `${currentClassPickerType || "未選択"} のクラスを選択してください`;
    }
}

function getClassTypeByName(className = "") {
    const normalizedClassName = normalizeText(className);
    if (!normalizedClassName) return "";
    const entry = classOptionEntries.find((item) => normalizeText(item?.name) === normalizedClassName);
    return normalizeText(entry?.type);
}

function getClassEntryByName(className = "") {
    const normalizedClassName = normalizeText(className);
    if (!normalizedClassName) return null;
    return classOptionEntries.find((entry) => normalizeText(entry?.name) === normalizedClassName) || null;
}

function renderClassTypeListView() {
    const listView = document.getElementById("class-picker-type-list-view");
    if (!listView) return;
    listView.innerHTML = "";

    if (classTypeOptions.length <= 0) {
        const empty = document.createElement("div");
        empty.className = "class-picker-name-empty";
        empty.textContent = "項目リストがありません。";
        listView.appendChild(empty);
        return;
    }

    classTypeOptions.forEach((typeName) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "class-picker-type-item";
        button.textContent = typeName;
        button.addEventListener("click", () => {
            openClassPickerClassStep(typeName);
        });
        listView.appendChild(button);
    });
}

function getFilteredClassNameOptions(queryText = "", typeName = "") {
    const normalizedQuery = normalizeText(queryText);
    const normalizedType = normalizeText(typeName);
    const source = Array.isArray(classOptionEntries) && classOptionEntries.length > 0
        ? classOptionEntries
        : classNameOptions.map((className) => ({ name: className, type: "未分類" }));

    return source.filter((entry) => {
        const entryName = normalizeText(entry?.name);
        const entryType = normalizeText(entry?.type) || "未分類";
        if (!entryName) return false;
        if (normalizedType && entryType !== normalizedType) return false;
        if (!normalizedQuery) return true;
        return entryName.includes(normalizedQuery);
    });
}

function renderClassNameListView(queryText = "", typeName = "") {
    const listView = document.getElementById("class-picker-name-list-view");
    const nameInput = document.getElementById("class-picker-name-input");
    if (!listView) return;

    const currentName = normalizeText(nameInput?.value);
    const matched = getFilteredClassNameOptions(queryText, typeName);
    listView.innerHTML = "";

    if (matched.length <= 0) {
        const empty = document.createElement("div");
        empty.className = "class-picker-name-empty";
        empty.textContent = "該当するクラスがありません（職業.json の項目のみ）";
        listView.appendChild(empty);
        return;
    }

    matched.forEach((entry) => {
        const className = normalizeText(entry?.name);
        if (!className) return;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "class-picker-name-item";
        if (className === currentName) {
            button.classList.add("is-active");
        }
        button.innerHTML = "";

        const nameLine = document.createElement("div");
        nameLine.className = "class-picker-name-main";
        nameLine.textContent = className;

        const metaLine = document.createElement("div");
        metaLine.className = "class-picker-name-meta";
        const condition = normalizeText(entry?.condition) || "-";
        const conditionLv = normalizeText(entry?.conditionLv) || "-";
        const totalLv = normalizeText(entry?.totalLv) || "-";
        metaLine.textContent = `条件: ${condition} / 条件Lv: ${conditionLv} / 合計Lv: ${totalLv}`;

        const descriptionLine = document.createElement("div");
        descriptionLine.className = "class-picker-name-description";
        descriptionLine.textContent = normalizeText(entry?.description) || "説明なし";

        button.appendChild(nameLine);
        button.appendChild(metaLine);
        button.appendChild(descriptionLine);
        button.addEventListener("click", () => {
            if (nameInput) {
                nameInput.value = className;
            }
            renderClassNameListView(className, currentClassPickerType);
            nameInput?.focus();
        });
        listView.appendChild(button);
    });
}

function renderClassNameDatalist(typeName = "") {
    const datalist = document.getElementById("class-picker-name-list");
    if (!datalist) return;
    datalist.innerHTML = "";
    getFilteredClassNameOptions("", typeName).forEach((entry) => {
        const className = normalizeText(entry?.name);
        if (!className) return;
        const option = document.createElement("option");
        option.value = className;
        datalist.appendChild(option);
    });
}

function openClassPickerClassStep(typeName = "") {
    const normalizedType = normalizeText(typeName);
    const selectedTypeLabel = document.getElementById("class-picker-selected-type");
    const nameInput = document.getElementById("class-picker-name-input");
    currentClassPickerType = normalizedType;
    if (selectedTypeLabel) {
        selectedTypeLabel.textContent = normalizedType || "未選択";
    }
    if (nameInput && getClassTypeByName(nameInput.value) !== normalizedType) {
        nameInput.value = "";
    }
    renderClassNameDatalist(normalizedType);
    renderClassNameListView(nameInput?.value || "", normalizedType);
    setClassPickerStep("class");
    nameInput?.focus();
}

async function loadClassNameOptions() {
    try {
        const response = await fetch("/api/classes/names");
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data?.success) {
            return;
        }
        const classNames = Array.isArray(data?.classNames) ? data.classNames : [];
        classNameOptions = Array.from(new Set(
            classNames
                .map((name) => normalizeText(name))
                .filter(Boolean)
        ));
        classOptionEntries = Array.isArray(data?.classItems)
            ? data.classItems
                .map((entry) => ({
                    name: normalizeText(entry?.name),
                    type: normalizeText(entry?.type) || "未分類",
                    condition: normalizeText(entry?.condition),
                    conditionLv: normalizeText(entry?.conditionLv),
                    totalLv: normalizeText(entry?.totalLv),
                    description: normalizeText(entry?.description)
                }))
                .filter((entry) => Boolean(entry.name))
            : classNameOptions.map((name) => ({
                name,
                type: "未分類",
                condition: "",
                conditionLv: "",
                totalLv: "",
                description: ""
            }));
        if (classOptionEntries.length <= 0) {
            classOptionEntries = classNameOptions.map((name) => ({
                name,
                type: "未分類",
                condition: "",
                conditionLv: "",
                totalLv: "",
                description: ""
            }));
        }
        classTypeOptions = Array.from(new Set(
            classOptionEntries
                .map((entry) => normalizeText(entry?.type) || "未分類")
                .filter(Boolean)
        ));
        renderClassTypeListView();
        renderClassNameDatalist();
        renderClassNameListView("");
    } catch (error) {
        console.warn("class names fetch failed:", error);
    }
}

function initializeClassPickerModal() {
    const modal = document.getElementById("class-picker-modal");
    const backdrop = document.getElementById("class-picker-modal-backdrop");
    const backButton = document.getElementById("class-picker-modal-back");
    const saveButton = document.getElementById("class-picker-modal-save");
    const clearButton = document.getElementById("class-picker-modal-clear");
    const closeButton = document.getElementById("class-picker-modal-close");
    const nameInput = document.getElementById("class-picker-name-input");
    const lvInput = document.getElementById("class-picker-lv-input");
    const efInput = document.getElementById("class-picker-ef-input");
    if (!modal || !nameInput || !lvInput || !efInput) return;

    closeClassPickerModal();
    setClassPickerStep("type");
    renderClassTypeListView();

    const applyCurrentSelection = () => {
        const className = normalizeText(nameInput.value);
        if (!className) {
            setAcquiredClassEntry(currentClassPickerIndex, "", 0, 0);
            closeClassPickerModal();
            return;
        }
        if (classNameOptions.length > 0 && !classNameOptions.includes(className)) {
            setErrorMessage("クラスは職業.json の一覧から選択してください。");
            nameInput.focus();
            return;
        }
        if (currentClassPickerType) {
            const classType = getClassTypeByName(className);
            if (classType !== currentClassPickerType) {
                setErrorMessage("選択した項目のクラスを選んでください。");
                nameInput.focus();
                return;
            }
        }
        const safeLv = toTwoDigitNumber(lvInput.value, 0);
        const safeEf = Math.min(safeLv, toTwoDigitNumber(efInput.value, 0));
        setAcquiredClassEntry(currentClassPickerIndex, className, safeLv, safeEf);
        setErrorMessage("");
        closeClassPickerModal();
    };

    backButton?.addEventListener("click", () => {
        setClassPickerStep("type");
    });
    saveButton?.addEventListener("click", applyCurrentSelection);
    clearButton?.addEventListener("click", () => {
        setAcquiredClassEntry(currentClassPickerIndex, "", 0, 0);
        setErrorMessage("");
        closeClassPickerModal();
    });
    closeButton?.addEventListener("click", closeClassPickerModal);
    backdrop?.addEventListener("click", closeClassPickerModal);

    lvInput.addEventListener("input", () => {
        const safeLv = toTwoDigitNumber(lvInput.value, 0);
        lvInput.value = String(safeLv);
        efInput.value = String(Math.min(safeLv, toTwoDigitNumber(efInput.value, 0)));
    });
    efInput.addEventListener("input", () => {
        const safeLv = toTwoDigitNumber(lvInput.value, 0);
        const safeEf = Math.min(safeLv, toTwoDigitNumber(efInput.value, 0));
        efInput.value = String(safeEf);
    });
    nameInput.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        applyCurrentSelection();
    });
    nameInput.addEventListener("input", () => {
        renderClassNameListView(nameInput.value, currentClassPickerType);
    });

    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        if (!modal.hidden) {
            closeClassPickerModal();
        }
    });
}

function toFiniteNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function getLvEfTotalsFromTable() {
    let totalLv = 0;
    let totalEf = 0;
    for (let i = 1; i <= ACQUIRED_CLASS_COUNT; i += 1) {
        totalLv += Math.max(0, toFiniteNumber(document.getElementById(`acquired-class-lv-${i}`)?.textContent, 0));
        totalEf += Math.max(0, toFiniteNumber(document.getElementById(`acquired-class-ef-${i}`)?.textContent, 0));
    }
    return {
        lv: totalLv,
        ef: totalEf
    };
}

function normalizeNumericDisplay(value, digits = 2) {
    const numericValue = toFiniteNumber(value, 0);
    if (!Number.isFinite(numericValue) || Math.abs(numericValue) < 1e-9) return "0";
    const rounded = Number(numericValue.toFixed(digits));
    if (Math.abs(rounded - Math.round(rounded)) < 1e-9) {
        return String(Math.round(rounded));
    }
    return String(rounded).replace(/\.?0+$/, "");
}

function collectAcquiredClassEntries() {
    const entries = [];
    for (let i = 1; i <= ACQUIRED_CLASS_COUNT; i += 1) {
        const parsed = parseAcquiredClassEntry(document.getElementById(`field-class-${i}`)?.value);
        entries.push({
            index: i,
            raw: parsed.raw,
            className: parsed.name,
            lv: Math.max(0, toFiniteNumber(parsed.lv, 0)),
            ef: Math.max(0, toFiniteNumber(parsed.ef, 0))
        });
    }
    return entries;
}

async function fetchClassRowsByNames(classNames = []) {
    const uniqueNames = Array.from(new Set(
        (Array.isArray(classNames) ? classNames : [])
            .map((name) => normalizeText(name))
            .filter(Boolean)
    ));
    if (uniqueNames.length <= 0) return new Map();

    const response = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classList: uniqueNames })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.success) {
        throw new Error(data?.message || "class fetch failed");
    }
    const rows = Array.isArray(data?.classData) ? data.classData : [];
    return new Map(
        rows
            .map((row) => [normalizeText(row?.職業名), row])
            .filter(([name]) => Boolean(name))
    );
}

function computeClassStatusValue(statKey = "", classRow = null, classLevel = 0) {
    const lv = Math.max(0, toFiniteNumber(classLevel, 0));
    if (!classRow || !statKey || lv <= 0) return 0;
    const base = toFiniteNumber(classRow?.[statKey], 0);
    if (!Number.isFinite(base) || Math.abs(base) < 1e-9) return 0;
    if (statKey === "SIZ") {
        return base;
    }
    if (statKey === "APP") {
        return base * lv;
    }
    return (base / 10) * lv;
}

function computeClassSkillValue(skillKey = "", classRow = null, classLevel = 0) {
    const lv = Math.max(0, toFiniteNumber(classLevel, 0));
    if (!classRow || !skillKey || lv <= 0) return 0;
    const base = toFiniteNumber(classRow?.[skillKey], 0);
    if (!Number.isFinite(base) || Math.abs(base) < 1e-9) return 0;
    if (CLASS_LV_SCALED_SKILL_KEYS.has(skillKey)) {
        return base * lv;
    }
    return (base / 10) * lv;
}

function updateLevelEfTotalsFromEntries(entries = []) {
    const lvTotal = (Array.isArray(entries) ? entries : [])
        .reduce((sum, entry) => sum + Math.max(0, toFiniteNumber(entry?.lv, 0)), 0);
    const efTotal = (Array.isArray(entries) ? entries : [])
        .reduce((sum, entry) => sum + Math.max(0, toFiniteNumber(entry?.ef, 0)), 0);

    const totalLvElement = document.getElementById("display-total-lv");
    const totalEfElement = document.getElementById("display-total-ef");
    if (totalLvElement) totalLvElement.textContent = normalizeNumericDisplay(lvTotal, 0);
    if (totalEfElement) totalEfElement.textContent = normalizeNumericDisplay(efTotal, 0);

    const lvInput = document.getElementById("field-lv");
    const efInput = document.getElementById("field-ef");
    if (lvInput) {
        lvInput.value = String(Math.max(1, Math.round(lvTotal)));
    }
    if (efInput) {
        const safeLv = Math.max(1, Math.round(lvTotal));
        efInput.max = String(safeLv);
        efInput.value = String(Math.min(safeLv, Math.max(0, Math.round(efTotal))));
    }
}

function renderStatusRowsFromClassEntries(entries = [], classRowMap = new Map()) {
    const statusRows = Array.from(document.querySelectorAll('tbody[data-create-panel="status"] tr[data-status-row]'));
    statusRows.forEach((row) => {
        const statKey = normalizeText(row?.dataset?.statusKey);
        if (!statKey) return;
        const rowDefinition = statusRowDefinitionByKey.get(statKey);
        if (!rowDefinition) return;

        const useMaxAggregate = statKey === "SIZ";
        let rowTotal = useMaxAggregate ? 0 : 0;
        for (let i = 1; i <= ACQUIRED_CLASS_COUNT; i += 1) {
            const entry = entries[i - 1] || {};
            const cell = row.children[i + 1];
            if (!cell) continue;
            const className = normalizeText(entry?.className);
            const classRow = classRowMap.get(className) || null;
            const rawValue = computeClassStatusValue(statKey, classRow, entry?.lv);
            const value = useMaxAggregate ? rawValue : Math.round(rawValue);
            if (useMaxAggregate) {
                rowTotal = Math.max(rowTotal, value);
            } else {
                rowTotal += value;
            }
            cell.textContent = normalizeNumericDisplay(value, 0);
        }

        const sumElement = document.getElementById(rowDefinition.sumId);
        if (sumElement) {
            sumElement.textContent = normalizeNumericDisplay(rowTotal, 0);
        }
        const hiddenInput = document.getElementById(rowDefinition.inputId);
        if (hiddenInput) {
            hiddenInput.value = String(Math.round(rowTotal));
        }
    });
}

function renderSkillRowsFromClassEntries(entries = [], classRowMap = new Map()) {
    const skillRows = Array.from(document.querySelectorAll('tbody[data-create-panel="skill"] tr[data-skill-row]'));
    skillRows.forEach((row) => {
        const skillKey = normalizeText(row?.dataset?.skillKey);
        if (!skillKey) return;

        let rowTotal = 0;
        for (let i = 1; i <= ACQUIRED_CLASS_COUNT; i += 1) {
            const entry = entries[i - 1] || {};
            const cell = row.children[i + 1];
            if (!cell) continue;
            const className = normalizeText(entry?.className);
            const classRow = classRowMap.get(className) || null;
            const value = Math.round(computeClassSkillValue(skillKey, classRow, entry?.lv));
            rowTotal += value;
            cell.textContent = normalizeNumericDisplay(value, 0);
        }

        const sumValue = row.querySelector(".skill-sum-value");
        if (sumValue) {
            sumValue.textContent = normalizeNumericDisplay(rowTotal, 0);
        } else if (row.children[1]) {
            row.children[1].textContent = normalizeNumericDisplay(rowTotal, 0);
        }
    });
}

function renderTechRowsFromClassEntries(entries = [], classRowMap = new Map()) {
    const techRows = Array.from(document.querySelectorAll('tbody[data-create-panel="tech"] tr[data-tech-row]'));
    techRows.forEach((row) => {
        const techLevel = Math.max(1, toInteger(row?.dataset?.techLevel, 1));
        let acquiredCount = 0;
        for (let i = 1; i <= ACQUIRED_CLASS_COUNT; i += 1) {
            const entry = entries[i - 1] || {};
            const cell = row.children[i + 1];
            if (!cell) continue;
            const className = normalizeText(entry?.className);
            const classRow = classRowMap.get(className) || null;
            const levelWithEf = Math.max(0, toInteger(entry?.lv, 0) + toInteger(entry?.ef, 0));
            const skillName = normalizeText(classRow?.[`Lv${techLevel}`]);
            const canAcquire = levelWithEf >= techLevel;
            const hasSkillName = Boolean(skillName) && skillName !== "0";
            const displaySkill = canAcquire && hasSkillName ? skillName : "0";
            if (displaySkill !== "0") acquiredCount += 1;
            cell.textContent = displaySkill;
        }

        const sumValue = row.querySelector(".tech-sum-value");
        if (sumValue) {
            sumValue.textContent = String(acquiredCount);
        } else if (row.children[1]) {
            row.children[1].textContent = String(acquiredCount);
        }
    });
}

async function refreshStatusFromAcquiredClasses() {
    const entries = collectAcquiredClassEntries();
    updateLevelEfTotalsFromEntries(entries);

    const classNames = entries
        .map((entry) => normalizeText(entry?.className))
        .filter(Boolean);
    const seq = ++classStatusFetchSequence;
    let classRowMap = new Map();
    try {
        classRowMap = await fetchClassRowsByNames(classNames);
    } catch (error) {
        console.warn("class status fetch failed:", error);
    }
    if (seq !== classStatusFetchSequence) return;

    renderStatusRowsFromClassEntries(entries, classRowMap);
    renderSkillRowsFromClassEntries(entries, classRowMap);
    renderTechRowsFromClassEntries(entries, classRowMap);
}

function scheduleRefreshStatusFromAcquiredClasses() {
    if (classStatusRecalcTimer) {
        clearTimeout(classStatusRecalcTimer);
    }
    classStatusRecalcTimer = setTimeout(() => {
        classStatusRecalcTimer = null;
        refreshStatusFromAcquiredClasses().catch((error) => {
            console.warn("refresh status from classes failed:", error);
        });
    }, CLASS_STATUS_FETCH_DEBOUNCE_MS);
}

function clampEfByLv() {
    const lvInput = document.getElementById("field-lv");
    const efInput = document.getElementById("field-ef");
    if (!lvInput || !efInput) return;
    const lv = Math.max(1, toInteger(lvInput.value, 1));
    const ef = Math.max(0, toInteger(efInput.value, 0));
    lvInput.value = String(lv);
    efInput.max = String(lv);
    efInput.value = String(Math.min(lv, ef));
    syncDisplayLevelValues();
}

function initializeLvEfConstraint() {
    const lvInput = document.getElementById("field-lv");
    const efInput = document.getElementById("field-ef");
    if (!lvInput || !efInput) return;
    lvInput.addEventListener("input", clampEfByLv);
    lvInput.addEventListener("change", clampEfByLv);
    efInput.addEventListener("input", clampEfByLv);
    efInput.addEventListener("change", clampEfByLv);
    clampEfByLv();
}

function getRealmOptionByName(realmName = "") {
    const normalized = normalizeText(realmName);
    if (!normalized) return null;

    const direct = magicRealmMap.get(normalized);
    if (direct) return direct;

    const normalizedNoSuffix = normalized.replace(/の領域$/, "");
    return magicRealmOptions.find((realm) => {
        const realmNameText = normalizeText(realm?.realmName);
        const realmNameNoSuffix = realmNameText.replace(/の領域$/, "");
        const attribute = normalizeText(realm?.attribute);
        const iconName = normalizeText(realm?.iconName);
        return (
            attribute === normalized
            || iconName === normalized
            || realmNameNoSuffix === normalizedNoSuffix
        );
    }) || null;
}

function resolveRealmName(value = "") {
    const realm = getRealmOptionByName(value);
    return normalizeText(realm?.realmName) || normalizeText(value);
}

function getRealmIconText(realm = null) {
    const iconName = normalizeText(realm?.iconName);
    if (iconName) return iconName.slice(0, 2);
    const attribute = normalizeText(realm?.attribute);
    if (attribute) return attribute.slice(0, 1);
    return "?";
}

function getRealmDisplayMeta(realm = null) {
    const attribute = normalizeText(realm?.attribute);
    const realmName = normalizeText(realm?.realmName);
    const title = attribute || realmName || "未選択";
    const subtitle = "";
    return { title, subtitle };
}

function buildRealmIconNameCandidates(realm = null) {
    const candidates = [];
    const pushCandidate = (value) => {
        const normalized = normalizeText(value);
        if (!normalized || candidates.includes(normalized)) return;
        candidates.push(normalized);
    };

    const iconName = normalizeText(realm?.iconName);
    pushCandidate(iconName);

    return candidates;
}

function buildRealmIconUrlCandidates(realm = null) {
    const candidates = buildRealmIconNameCandidates(realm);
    const urls = [];
    candidates.forEach((name) => {
        const encoded = encodeURIComponent(name);
        const pushUrl = (value) => {
            if (!value || urls.includes(value)) return;
            urls.push(value);
        };
        pushUrl(`${ATTRIBUTE_ICON_BASE_URL}${encoded}.webp`);
        pushUrl(`${ATTRIBUTE_ICON_BASE_URL}${encoded}.png`);
        pushUrl(`${ATTRIBUTE_ICON_BASE_URL}${encoded}.jpg`);
        pushUrl(`${ATTRIBUTE_ICON_BASE_URL}${encoded}.jpeg`);
    });
    return urls;
}

function renderRealmIconElement(target, realm = null, fallbackText = "?") {
    if (!target) return;
    target.innerHTML = "";

    const fallback = document.createElement("span");
    fallback.className = "attribute-icon-fallback";
    fallback.textContent = fallbackText;
    target.appendChild(fallback);

    const urlCandidates = buildRealmIconUrlCandidates(realm);
    if (urlCandidates.length <= 0) return;

    const image = document.createElement("img");
    image.className = "attribute-icon-image";
    image.alt = normalizeText(realm?.attribute) || normalizeText(realm?.realmName) || "属性";
    image.loading = "lazy";
    target.appendChild(image);

    let index = 0;
    const tryNext = () => {
        if (index >= urlCandidates.length) {
            image.remove();
            fallback.style.display = "grid";
            return;
        }
        image.src = urlCandidates[index];
        index += 1;
    };
    image.addEventListener("load", () => {
        fallback.style.display = "none";
    });
    image.addEventListener("error", () => {
        tryNext();
    });
    tryNext();
}

function setAttributePickerLabel(index = 1) {
    const hiddenInput = document.getElementById(`field-attr-${index}`);
    const button = document.getElementById(`attr-picker-${index}`);
    if (!hiddenInput || !button) return;

    const selectedRealmName = normalizeText(hiddenInput.value);
    const selectedRealm = getRealmOptionByName(selectedRealmName);
    const labelText = selectedRealm ? getRealmDisplayMeta(selectedRealm).title : `属性${index}`;

    button.classList.toggle("is-selected", Boolean(selectedRealm));
    button.innerHTML = "";

    const content = document.createElement("span");
    content.className = "attribute-picker-content";

    const icon = document.createElement("span");
    icon.className = "attribute-picker-icon";
    if (selectedRealm) {
        renderRealmIconElement(icon, selectedRealm, getRealmIconText(selectedRealm));
    } else {
        icon.classList.add("is-empty");
        icon.textContent = "?";
    }

    const label = document.createElement("span");
    label.className = "attribute-picker-label";
    label.textContent = labelText;

    content.appendChild(icon);
    content.appendChild(label);
    button.appendChild(content);
}

function closeAttributeListModal() {
    const modal = document.getElementById("attribute-list-modal");
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    pendingAttributeRealmName = "";
}

function setSelectedAttribute(index = 1, realmName = "") {
    const hiddenInput = document.getElementById(`field-attr-${index}`);
    if (!hiddenInput) return;
    hiddenInput.value = resolveRealmName(realmName);
    selectedAttributeMagicKeyMap.delete(index);
    setCreateHelpMessage("");
    setAttributePickerLabel(index);
    renderAttributeMagicList(index);
    if (index === 1) syncPrimaryAttributeLabel();
}

function renderAttributeListModalPreview() {
    const selectedTitle = document.getElementById("attribute-list-selected-title");
    const selectedSubTitle = document.getElementById("attribute-list-selected-subtitle");
    const selectedIcon = document.getElementById("attribute-list-selected-icon");
    const selectedDescription = document.getElementById("attribute-list-selected-description");
    const magicTableBody = document.getElementById("attribute-list-selected-magic-table-body");
    if (!selectedTitle || !selectedSubTitle || !selectedIcon || !selectedDescription || !magicTableBody) return;

    const selectedRealm = getRealmOptionByName(pendingAttributeRealmName);
    const { title, subtitle } = getRealmDisplayMeta(selectedRealm);
    const selectedRealmName = normalizeText(selectedRealm?.realmName);
    const selectedDescriptionText = normalizeText(selectedRealm?.description);
    selectedTitle.textContent = title;
    selectedSubTitle.textContent = subtitle;
    selectedSubTitle.classList.toggle("is-empty", !subtitle);
    renderRealmIconElement(selectedIcon, selectedRealm, getRealmIconText(selectedRealm));
    selectedDescription.textContent = selectedDescriptionText || "説明はありません。";

    magicTableBody.innerHTML = "";
    const magicEntries = Array.isArray(selectedRealm?.magicEntries) ? selectedRealm.magicEntries : [];
    if (magicEntries.length <= 0) {
        const tr = document.createElement("tr");
        const tdRank = document.createElement("td");
        const tdName = document.createElement("td");
        const tdDetail = document.createElement("td");
        tdRank.textContent = "-";
        tdName.textContent = selectedRealmName ? "取得魔法はありません" : "属性を選択してください";
        tdDetail.textContent = "";
        tr.appendChild(tdRank);
        tr.appendChild(tdName);
        tr.appendChild(tdDetail);
        magicTableBody.appendChild(tr);
        return;
    }

    magicEntries.forEach((entry) => {
        const tr = document.createElement("tr");
        const tdRank = document.createElement("td");
        const tdName = document.createElement("td");
        const tdDetail = document.createElement("td");
        const rank = Number.isFinite(Number(entry?.rank)) ? Math.max(0, Math.trunc(Number(entry.rank))) : 0;
        tdRank.textContent = rank > 0 ? String(rank) : "-";
        tdName.textContent = normalizeText(entry?.name);
        tdDetail.textContent = normalizeText(entry?.detail) || "詳細なし";
        tr.appendChild(tdRank);
        tr.appendChild(tdName);
        tr.appendChild(tdDetail);
        magicTableBody.appendChild(tr);
    });
}

function renderAttributeListModalGrid() {
    const grid = document.getElementById("attribute-list-modal-grid");
    if (!grid) return;
    grid.innerHTML = "";

    magicRealmOptions.forEach((realm) => {
        const realmName = normalizeText(realm?.realmName);
        if (!realmName) return;
        const card = document.createElement("button");
        card.type = "button";
        card.className = "attribute-list-modal-realm-card";
        if (realmName === pendingAttributeRealmName) {
            card.classList.add("is-active");
        }

        const icon = document.createElement("span");
        icon.className = "attribute-list-modal-realm-icon";
        renderRealmIconElement(icon, realm, getRealmIconText(realm));

        const meta = document.createElement("div");
        meta.className = "attribute-list-modal-realm-meta";
        const displayMeta = getRealmDisplayMeta(realm);
        const name = document.createElement("p");
        name.className = "attribute-list-modal-realm-name";
        name.textContent = displayMeta.title;
        meta.appendChild(name);

        card.appendChild(icon);
        card.appendChild(meta);
        card.addEventListener("click", () => {
            pendingAttributeRealmName = realmName;
            renderAttributeListModalGrid();
            renderAttributeListModalPreview();
        });
        grid.appendChild(card);
    });
}

function openAttributeListModal(index = 1) {
    currentAttributePickerIndex = Math.min(7, Math.max(1, toInteger(index, 1)));
    const modal = document.getElementById("attribute-list-modal");
    const title = document.getElementById("attribute-list-modal-title");
    const beforeLabel = document.getElementById("attribute-list-modal-before");
    if (!modal) return;
    if (title) {
        title.textContent = `属性一覧（属性${currentAttributePickerIndex}）`;
    }
    const currentValue = resolveRealmName(document.getElementById(`field-attr-${currentAttributePickerIndex}`)?.value);
    previousAttributeRealmName = currentValue;
    const previousRealm = getRealmOptionByName(previousAttributeRealmName);
    const previousTitle = previousRealm ? getRealmDisplayMeta(previousRealm).title : "未選択";
    if (beforeLabel) {
        beforeLabel.textContent = `変更前: ${previousTitle}`;
    }
    const fallbackRealmName = normalizeText(magicRealmOptions[0]?.realmName);
    pendingAttributeRealmName = currentValue || fallbackRealmName;
    renderAttributeListModalGrid();
    renderAttributeListModalPreview();
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
}

function renderAttributeMagicList(index = 1) {
    const hiddenInput = document.getElementById(`field-attr-${index}`);
    const listBody = document.getElementById(`attr-${index}-magic-list`);
    if (!hiddenInput || !listBody) return;

    const selectedRealmName = normalizeText(hiddenInput.value);
    const selectedRealm = getRealmOptionByName(selectedRealmName);
    const magicEntries = (Array.isArray(selectedRealm?.magicEntries) ? selectedRealm.magicEntries : [])
        .map((entry) => ({
            name: normalizeText(entry?.name),
            rank: Math.max(0, toInteger(entry?.rank, 0)),
            detail: normalizeText(entry?.detail)
        }))
        .filter((entry) => Boolean(entry.name));
    const normalizedMagicEntries = magicEntries.length > 0
        ? magicEntries
        : (Array.isArray(selectedRealm?.magicList) ? selectedRealm.magicList : [])
            .map((name) => ({
                name: normalizeText(name),
                rank: 0,
                detail: ""
            }))
            .filter((entry) => Boolean(entry.name));
    listBody.innerHTML = "";
    if (index === 1) {
        syncPrimaryAttributeLabel();
    }

    if (!selectedRealmName) {
        const row = document.createElement("div");
        row.className = "attribute-magic-list-row is-placeholder";
        const text = document.createElement("span");
        text.textContent = "領域を選択してください";
        row.appendChild(text);
        listBody.appendChild(row);
        if (selectedAttributeMagicKeyMap.has(index)) {
            selectedAttributeMagicKeyMap.delete(index);
            setCreateHelpMessage("");
        }
        return;
    }
    if (normalizedMagicEntries.length <= 0) {
        const row = document.createElement("div");
        row.className = "attribute-magic-list-row is-placeholder";
        const text = document.createElement("span");
        text.textContent = "取得魔法はありません";
        row.appendChild(text);
        listBody.appendChild(row);
        if (selectedAttributeMagicKeyMap.has(index)) {
            selectedAttributeMagicKeyMap.delete(index);
            setCreateHelpMessage("");
        }
        return;
    }

    const activeKey = normalizeText(selectedAttributeMagicKeyMap.get(index));
    let activeEntryFound = false;

    normalizedMagicEntries.forEach((entry) => {
        const row = document.createElement("div");
        row.className = "attribute-magic-list-row";
        const key = getMagicEntryKey(entry);
        if (key === activeKey) {
            row.classList.add("is-active");
            activeEntryFound = true;
        }

        const rankSpan = document.createElement("span");
        const nameSpan = document.createElement("span");
        rankSpan.textContent = entry.rank > 0 ? String(entry.rank) : "-";
        nameSpan.textContent = entry.name;
        row.appendChild(rankSpan);
        row.appendChild(nameSpan);
        row.addEventListener("click", () => {
            selectedAttributeMagicKeyMap.set(index, key);
            renderAttributeMagicList(index);
            showAttributeMagicDetail(index, selectedRealm, entry);
        });
        listBody.appendChild(row);
    });

    if (activeKey && !activeEntryFound) {
        selectedAttributeMagicKeyMap.delete(index);
        setCreateHelpMessage("");
        return;
    }
    if (activeKey && activeEntryFound) {
        const currentEntry = normalizedMagicEntries.find((entry) => getMagicEntryKey(entry) === activeKey);
        if (currentEntry) {
            showAttributeMagicDetail(index, selectedRealm, currentEntry);
        }
    }
}

function populateAttributeRealmPickers() {
    for (let index = 1; index <= 7; index += 1) {
        setAttributePickerLabel(index);
        renderAttributeMagicList(index);
    }
    syncPrimaryAttributeLabel();
}

function initializeAttributePickerEvents() {
    for (let index = 1; index <= 7; index += 1) {
        const button = document.getElementById(`attr-picker-${index}`);
        if (!button) continue;
        button.addEventListener("click", () => {
            openAttributeListModal(index);
        });
    }
}

function initializeAttributeListModal() {
    const confirmButton = document.getElementById("attribute-list-modal-confirm");
    const closeButton = document.getElementById("attribute-list-modal-close");
    const backdrop = document.getElementById("attribute-list-modal-backdrop");
    closeAttributeListModal();
    confirmButton?.addEventListener("click", () => {
        setSelectedAttribute(currentAttributePickerIndex, pendingAttributeRealmName);
        closeAttributeListModal();
    });
    closeButton?.addEventListener("click", closeAttributeListModal);
    backdrop?.addEventListener("click", closeAttributeListModal);
    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        const modal = document.getElementById("attribute-list-modal");
        if (!modal || modal.hidden) return;
        closeAttributeListModal();
    });
}

async function loadMagicRealmOptions() {
    try {
        const response = await fetch("/api/magic/realms", {
            method: "GET"
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data?.success) {
            return;
        }

        const realms = Array.isArray(data?.realms) ? data.realms : [];
        magicRealmOptions = realms
            .map((realm) => ({
                attribute: normalizeText(realm?.attribute),
                realmName: normalizeText(realm?.realmName),
                description: normalizeText(realm?.description),
                iconName: normalizeText(realm?.iconName),
                count: toInteger(realm?.count, 0),
                magicEntries: Array.isArray(realm?.magicEntries)
                    ? realm.magicEntries
                        .map((entry) => ({
                            name: normalizeText(entry?.name),
                            rank: toInteger(entry?.rank, 0),
                            detail: normalizeText(entry?.detail)
                        }))
                        .filter((entry) => Boolean(entry.name))
                    : [],
                magicList: Array.isArray(realm?.magicList)
                    ? realm.magicList.map((name) => normalizeText(name)).filter(Boolean)
                    : []
            }))
            .filter((realm) => Boolean(realm.realmName))
            .map((realm) => ({
                ...realm,
                magicEntries: realm.magicEntries.length > 0
                    ? realm.magicEntries
                    : realm.magicList.map((name) => ({ name, rank: 0, detail: "" }))
            }));

        magicRealmMap.clear();
        magicRealmOptions.forEach((realm) => {
            magicRealmMap.set(realm.realmName, realm);
        });

        populateAttributeRealmPickers();
    } catch (error) {
        console.warn("load magic realms failed:", error);
    }
}

function setCreateTab(tabId = "status") {
    const nextTab = normalizeText(tabId) || "status";
    const tabButtons = Array.from(document.querySelectorAll(".tab-btn[data-create-tab]"));
    const tabPanels = Array.from(document.querySelectorAll("tbody[data-create-panel]"));
    const createTable = document.querySelector(".create-table");
    const isAttributeTab = nextTab === "attribute";

    tabButtons.forEach((button) => {
        const isActive = normalizeText(button.getAttribute("data-create-tab")) === nextTab;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    tabPanels.forEach((panel) => {
        const isActive = normalizeText(panel.getAttribute("data-create-panel")) === nextTab;
        panel.hidden = !isActive;
    });
    createTable?.classList.toggle("is-attribute-mode", isAttributeTab);
}

function initializeCreateTabs() {
    const tabButtons = Array.from(document.querySelectorAll(".tab-btn[data-create-tab]"));
    if (tabButtons.length === 0) return;
    tabButtons.forEach((button) => {
        button.addEventListener("click", () => {
            setCreateTab(button.getAttribute("data-create-tab") || "status");
        });
    });
    setCreateTab(tabButtons[0].getAttribute("data-create-tab") || "status");
}

function setInputValue(id, value) {
    const input = document.getElementById(id);
    if (!input) return;
    input.value = String(value ?? "");
}

function setCreatePageModeUi() {
    const titleLabel = document.getElementById("name_input");
    const submitButton = document.getElementById("create-submit");
    const profileButton = document.getElementById("open-profile-editor-button");
    const nameInput = document.getElementById("field-name");
    if (createPageMode === "edit") {
        if (titleLabel) titleLabel.textContent = "キャラクター編集";
        if (submitButton) submitButton.textContent = "編集完了";
        if (profileButton) profileButton.hidden = false;
        if (nameInput) {
            nameInput.readOnly = true;
            nameInput.setAttribute("aria-readonly", "true");
        }
        return;
    }
    if (titleLabel) titleLabel.textContent = "キャラクター名";
    if (submitButton) submitButton.textContent = "作成完了";
    if (profileButton) profileButton.hidden = true;
    if (nameInput) {
        nameInput.readOnly = false;
        nameInput.removeAttribute("aria-readonly");
    }
}

function initializeProfileEditShortcut() {
    const button = document.getElementById("open-profile-editor-button");
    if (!button) return;
    button.addEventListener("click", () => {
        const candidateName = normalizeText(editTargetCharacterName)
            || normalizeText(document.getElementById("field-name")?.value);
        if (!candidateName) {
            setErrorMessage("プロフィール編集対象のキャラクター名がありません。");
            return;
        }
        window.location.href = `character-profile.html?name=${encodeURIComponent(candidateName)}`;
    });
}

function applyCharacterToForm(character = {}) {
    setInputValue("field-name", character?.名前 || character?.name || "");
    setInputValue("field-title", character?.二つ名 || "");
    setInputValue("field-lv", character?.Lv ?? 1);
    setInputValue("field-ef", character?.Ef ?? 0);
    setInputValue("field-hp", character?.HP ?? 10);
    setInputValue("field-mp", character?.MP ?? 10);
    setInputValue("field-st", character?.ST ?? 10);
    setInputValue("field-attack", character?.攻撃 ?? 0);
    setInputValue("field-defense", character?.防御 ?? 0);
    setInputValue("field-magic", character?.魔力 ?? 0);
    setInputValue("field-magic-defense", character?.魔防 ?? 0);
    setInputValue("field-speed", character?.速度 ?? 0);
    setInputValue("field-hit", character?.命中 ?? 0);
    setInputValue("field-siz", character?.SIZ ?? 160);
    setInputValue("field-app", character?.APP ?? 100);
    setInputValue("field-money", character?.所持金 ?? 0);
    for (let i = 1; i <= ACQUIRED_CLASS_COUNT; i += 1) {
        setInputValue(`field-class-${i}`, character?.[`取得${i}`] || "");
    }
    syncAcquiredClassHeader();
    setInputValue("field-inventory-limit", character?.手持ち上限 ?? 15);
    setInputValue("field-profile", character?.プロフィール || "");
    setInputValue("field-memo", character?.メモ || "");

    for (let i = 1; i <= 7; i += 1) {
        const attributeValue = normalizeText(character?.[`属性${i}`]);
        setSelectedAttribute(i, attributeValue);
    }

    syncDisplayLevelValues();
    syncStatusSummaryValues();
    clampEfByLv();
}

async function loadEditCharacterIfNeeded() {
    if (createPageMode !== "edit") return true;

    const characterName = normalizeText(editTargetCharacterName);
    if (!characterName) {
        setErrorMessage("編集対象のキャラクター名がありません。");
        return false;
    }

    try {
        const response = await fetch(`/api/character?name=${encodeURIComponent(characterName)}`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data?.success || !data?.data) {
            setErrorMessage(data?.message || "キャラクターデータの読み込みに失敗しました。");
            return false;
        }
        applyCharacterToForm(data.data);
        editTargetCharacterName = normalizeText(data?.data?.名前 || characterName) || characterName;
        return true;
    } catch (error) {
        console.error("character edit load failed:", error);
        setErrorMessage("キャラクターデータの読み込みに失敗しました。");
        return false;
    }
}

function mergeCharacterSummaryToSessionCache(summary = null) {
    if (!summary || typeof summary !== "object") return;
    const summaryName = normalizeText(summary?.名前 || summary?.name);
    if (!summaryName) return;
    const previousCache = parseSessionJsonArray("loginCharactersCache")
        .filter((row) => normalizeText(row?.名前 || row?.name));
    const mergedCache = [...previousCache];
    const existingIndex = mergedCache.findIndex((row) => normalizeText(row?.名前 || row?.name) === summaryName);
    if (existingIndex >= 0) {
        mergedCache[existingIndex] = summary;
    } else {
        mergedCache.push(summary);
    }
    sessionStorage.setItem("loginCharactersCache", JSON.stringify(mergedCache));
}

function buildCharacterPayload() {
    const name = normalizeText(document.getElementById("field-name")?.value);
    const title = normalizeText(document.getElementById("field-title")?.value);
    const lv = Math.max(1, toInteger(document.getElementById("field-lv")?.value, 1));
    const ef = Math.min(lv, Math.max(0, toInteger(document.getElementById("field-ef")?.value, 0)));
    const hp = Math.max(0, toInteger(document.getElementById("field-hp")?.value, 0));
    const mp = Math.max(0, toInteger(document.getElementById("field-mp")?.value, 0));
    const st = Math.max(0, toInteger(document.getElementById("field-st")?.value, 0));
    const attack = Math.max(0, toInteger(document.getElementById("field-attack")?.value, 0));
    const defense = Math.max(0, toInteger(document.getElementById("field-defense")?.value, 0));
    const magic = Math.max(0, toInteger(document.getElementById("field-magic")?.value, 0));
    const magicDefense = Math.max(0, toInteger(document.getElementById("field-magic-defense")?.value, 0));
    const speed = Math.max(0, toInteger(document.getElementById("field-speed")?.value, 0));
    const hit = Math.max(0, toInteger(document.getElementById("field-hit")?.value, 0));
    const siz = Math.max(1, toInteger(document.getElementById("field-siz")?.value, 1));
    const app = Math.max(1, toInteger(document.getElementById("field-app")?.value, 1));
    const money = Math.max(0, toInteger(document.getElementById("field-money")?.value, 0));
    const inventoryLimit = Math.max(1, toInteger(document.getElementById("field-inventory-limit")?.value, 15));
    const profile = normalizeText(document.getElementById("field-profile")?.value);
    const memo = normalizeText(document.getElementById("field-memo")?.value);
    const attrs = [];
    for (let i = 1; i <= 7; i += 1) {
        attrs.push(normalizeText(document.getElementById(`field-attr-${i}`)?.value));
    }

    const abilitySum = attack + defense + magic + magicDefense + speed + hit;

    const payload = {
        名前: name,
        二つ名: title,
        Lv: lv,
        Ef: ef,
        HP: hp,
        MP: mp,
        ST: st,
        攻撃: attack,
        防御: defense,
        魔力: magic,
        魔防: magicDefense,
        速度: speed,
        命中: hit,
        SIZ: siz,
        APP: app,
        合計値: abilitySum,
        所持金: money,
        持ち物: "",
        倉庫: "",
        転移地点: "",
        プロフィール: profile,
        現在地: "",
        手持ち上限: inventoryLimit,
        順番: 0,
        メモ: memo,
        属性1: attrs[0] || "",
        属性2: attrs[1] || "",
        属性3: attrs[2] || "",
        属性4: attrs[3] || "",
        属性5: attrs[4] || "",
        属性6: attrs[5] || "",
        属性7: attrs[6] || ""
    };

    for (let i = 1; i <= ACQUIRED_CLASS_COUNT; i += 1) {
        payload[`取得${i}`] = normalizeText(document.getElementById(`field-class-${i}`)?.value);
    }
    return payload;
}

async function submitCreateCharacter(event) {
    event.preventDefault();
    setErrorMessage("");

    const playerId = getRequiredSessionPlayerId();
    if (!playerId) {
        window.location.href = "index.html";
        return;
    }

    const payloadCharacter = buildCharacterPayload();
    const isEditMode = createPageMode === "edit";
    const characterName = normalizeText(payloadCharacter?.名前);
    if (!characterName) {
        setErrorMessage("名前を入力してください。");
        return;
    }
    if (isEditMode) {
        const fixedName = normalizeText(editTargetCharacterName) || characterName;
        payloadCharacter.名前 = fixedName;
        editTargetCharacterName = fixedName;
    }

    const submitButton = document.getElementById("create-submit");
    if (submitButton) submitButton.disabled = true;
    try {
        const endpoint = isEditMode ? "/api/character/update" : "/api/character/create";
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                playerId,
                characterName: normalizeText(editTargetCharacterName) || characterName,
                character: payloadCharacter
            })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data?.success) {
            setErrorMessage(data?.message || (isEditMode ? "キャラクター編集に失敗しました。" : "キャラクター作成に失敗しました。"));
            return;
        }

        const updatedCharacterNames = Array.isArray(data?.characterNames)
            ? data.characterNames.map((name) => normalizeText(name)).filter(Boolean)
            : [];
        if (updatedCharacterNames.length > 0) {
            sessionStorage.setItem("playerCharacterList", JSON.stringify(updatedCharacterNames));
            localStorage.setItem("playerCharacterList", JSON.stringify(updatedCharacterNames));
        }

        const updatedSummary = data?.character && typeof data.character === "object"
            ? data.character
            : null;
        mergeCharacterSummaryToSessionCache(updatedSummary);

        window.location.href = "character-list.html";
    } catch (error) {
        console.error("character save failed:", error);
        setErrorMessage("通信エラーが発生しました。");
    } finally {
        if (submitButton) submitButton.disabled = false;
    }
}

async function initializeCreatePage() {
    window.addEventListener("resize", updateCreateScreenScale);
    updateCreateScreenScale();
    setCreatePageModeUi();

    const playerId = getRequiredSessionPlayerId();
    if (!playerId) {
        window.location.href = "index.html";
        return;
    }
    const form = document.getElementById("character-create-form");
    form?.addEventListener("submit", submitCreateCharacter);
    initializeSkillRowsLayout();
    initializeTechRowsLayout();
    initializeAcquiredClassTableLayout();
    renderAcquiredClassInputs();
    initializeLvEfConstraint();
    initializeCreateTabs();
    initializeHeaderTabShortcuts();
    initializeProfileEditShortcut();
    initializeClassPickerModal();
    initializeDisplayMirrors();
    setCreateHelpMessage("");
    initializeAttributePickerEvents();
    initializeAttributeListModal();
    await loadClassNameOptions();
    await loadMagicRealmOptions();
    await loadEditCharacterIfNeeded();
    syncPrimaryAttributeLabel();
    document.getElementById("create-cancel")?.addEventListener("click", () => {
        window.location.href = "character-list.html";
    });
}

initializeCreatePage();
