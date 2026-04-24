
// statusCharacter

/**
 * 任意のデータオブジェクトに指定された項目を初期化する関数
 * @param {Object} targetObject - 初期化したいデータオブジェクト
 * @param {Array} itemsToInitialize - 初期化したい項目名の配列
 * @param {any} initialValue - 初期化する値（デフォルトは 0）
 */

const characterData = {
    // 習得クラス（1~20）
    name: "",
    acquiredClasses: Array.from({ length: 20 }, () => ({
        className: null, // クラス名またはID
        Lv: null, // レベル
        Ef: null, // エフェクト（特殊効果）
        stats: {} // クラスごとのステータス
    })),

    // ステータス関連
    stats: {
        allLv: 0,
        allEf: 0,
        baseStats: {}, // 基礎ステータス
        levelStats: {}, // レベルステータス
        skillValues: {}, // 技能値
        resistances: {}, // 耐性
        bodyAttributes: {}, // 肉体値
        weaknesses: [], // 弱点
        bodyType: 0, // 肉体種別
        skillNames: [],
        allStats: {}, //全ステータス合計を入れる
    },

    // 追加: ダメージ、MP消費、ST消費
    damage: {       // 受けたダメージ量
        HP_消費: 0,      // MPの消費量
        MP_消費: 0,      // MPの消費量
        ST_消費: 0       // STの消費量
    },

    skillBonuses: {},

    // アイテムによる上昇ステータス
    itemBonuses: {
        stats: {},
        skillValues: {},
        resistances: {},
        bodyAttributes: {}
    },

    initialClasses: "ファーマー", //初期クラス

    // スキルと魔法
    skills: [],
    magics: [],

    // アイテム関連
    equipment: {},

    // 装備中データ
    equipmentSlot: {
        '武器': null,
        '武器2': null,
        '頭': null,
        '顔': null,
        '首': null,
        '体': null,
        '下着': null,
        '背中': null,
        '右腕': null,
        '左腕': null,
        '右手': null,
        '左手': null,
        '腰': null,
        '右足': null,
        '左足': null
    },

    inventory: [],
    maxInventory: null,
    storage: [],
    money: null,

    // その他のデータ
    teleportLocations: [],
    profile: {},
    currentLocation: null,
    notes: null,
    ultimateSkill: null
};

//キャラクターリスト
let characterList = [];

let displaySkillsList = [];
let displayMagicsList = [];
let selectName = "";

// デバッグログ制御
let DEBAG_LOG_ENABLED = true;

function DebaglogSet(...args) {
    if (!DEBAG_LOG_ENABLED) return;
    console.log(...args);
}

function DebaglogGroupStart(...args) {
    if (!DEBAG_LOG_ENABLED) return;
    console.groupCollapsed(...args);
}

function DebaglogGroupEnd() {
    if (!DEBAG_LOG_ENABLED) return;
    console.groupEnd();
}

function DebaglogTable(data) {
    if (!DEBAG_LOG_ENABLED) return;
    console.table(data);
}

function setDebagLogEnabled(enabled) {
    DEBAG_LOG_ENABLED = Boolean(enabled);
}

window.DebaglogSet = DebaglogSet;
window.setDebagLogEnabled = setDebagLogEnabled;

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function triggerPostModalInteractionGuardSafe(durationMs = 1500) {
    if (typeof window?.triggerPostModalInteractionGuard === "function") {
        window.triggerPostModalInteractionGuard(durationMs);
    }
}

async function getTabContainerFunction(functionName, timeoutMs = 5000, intervalMs = 50) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
        const fn = window[functionName];
        if (typeof fn === "function") {
            return fn;
        }
        await wait(intervalMs);
    }

    const available = [
        "displayBasicStatus",
        "displayEquipment",
        "displayItemTable",
        "statsView",
        "showSecondaryTab"
    ].filter((name) => typeof window[name] === "function");

    throw new Error(
        `${functionName} is not available. tabContainer.js may not be loaded. available=[${available.join(", ")}]`
    );
}


// プレイヤー用のデータ
// characterData の内容を深いコピーして、それぞれ独立したオブジェクトに
let playerData = JSON.parse(JSON.stringify(characterData));
let addCharacterData = JSON.parse(JSON.stringify(characterData));

playerData = { ...playerData }; // 深いコピーを作成して playerData の参照を固定
addCharacterData = { ...addCharacterData }; // addCharacterData の参照も固定
// 持ち物にアイテムを追加する関数

const equipmentSlotNow = {
    '武器': null,
    '武器2': null,
    '頭': null,
    '顔': null,
    '首': null,
    '体': null,
    '下着': null,
    '背中': null,
    '右腕': null,
    '左腕': null,
    '右手': null,
    '左手': null,
    '腰': null,
    '右足': null,
    '左足': null
};


function addItemToInventory(item) {
    if (selectedInventory.inventory.length < selectedInventory.手持ち上限) {
        selectedInventory.inventory.push(item);
        DebaglogSet(`${item.name} を持ち物に追加しました。`);
    } else {
        DebaglogSet("持ち物が上限に達しました。ペナルティを適用します。");
        // ペナルティの処理（例: ステータスを減少させる、アイテムを破棄するなど）
    }
}

queueMicrotask(() => {
    startUp().catch((error) => {
        console.error("startUp error:", error);
        const message = (error && error.message) ? error.message : "キャラクターデータの読み込みに失敗しました。";
        alert(message);
    });
});

const addSkill = [
    "切断",
    "貫通",
    "打撃",
    "射撃",
    "防御",
    "組み付き",
    "機動回避",
    "叩きつけ",
    "握りつぶす",
    "跳躍/技",
    "吹き飛ばす",
    "投擲",
    "突撃",
    "飛行突撃",
    "再生・肉体"
];

const magicskill = [
    '魔法抵抗突破',
    '魔法無詠唱化',
    '魔法瞑想',
    '魔法限界突破',
    '魔法順位向上3rd',
    '魔法範囲拡大化',
    '魔法二重化',
    '魔法遅延化',
    '魔法収束化',
    '魔法順位向上6th',
    '魔法時間強化',
    '魔法最強化',
    '魔法射程拡大',
    '魔法自動追尾',
    '魔法順位向上8th',
    '魔法倍速化',
    '魔法集中化',
    '魔法順位向上9th',
    '魔法三重化',
    '魔法順位向上10th'
];

// const magicskill = [
//     '魔法順位向上1ST',
//     '魔法抵抗突破',
//     '魔法無詠唱化',
//     '魔法順位向上2nd',
//     '魔法限界突破',
//     '魔法順位向上3rd',
//     '魔法範囲拡大化',
//     '魔法二重化',
//     '魔法順位向上4th',
//     '魔法遅延化',
//     '魔法順位向上5th',
//     '魔法時間強化',
//     '魔法順位向上6th',
//     '魔法最強化',
//     '魔法射程拡大',
//     '魔法順位向上7th',
//     '魔法倍速化',
//     '魔法順位向上8th',
//     '魔法順位向上9th',
//     '魔法三重化',
//     '魔法順位向上10th',
// ];

const statuSum = ["HP", "MP", "ST", "攻撃", "防御", "魔力", "魔防", "速度", "命中", "SIZ", "APP"];
const displaySum = ["攻撃", "防御", "魔力", "魔防", "速度", "命中", "SIZ", "APP"];

const talents = [
    "威圧", "透明化", "隠密", "消音", "看破", "知覚", "聴覚", "追跡", "軽業", "鑑定", "騎乗",
    "芸能", "言語学", "交渉", "呪文学", "職能", "真意看破", "水泳", "製作", "生存", "装置", 
    "精神接続", "知識", "治療", "早業", "登攀", "指揮", "騙す", "変装", "魔道具操作",
    "魔力系", "信仰系"
];
const CLASS_LV_SCALED_TALENTS = new Set(["魔力系", "信仰系"]);
const resistances = [
    "物理軽減", "魔法軽減", "遠隔軽減", "切断軽減", "貫通軽減", 
    "打撃軽減", "炎軽減", "氷軽減", "雷軽減", "酸軽減", 
    "音波軽減", "闇軽減", "光軽減", "善軽減", "悪軽減", 
    "正軽減", "負軽減", "切断耐性", "貫通耐性", "打撃耐性", 
    "炎耐性", "氷耐性", "雷耐性", "酸耐性", "音波耐性", 
    "闇耐性", "光耐性", "善耐性", "悪耐性", "正耐性", 
    "負耐性", "毒耐性", "麻痺耐性", "混乱耐性", "恐怖耐性", 
    "盲目耐性", "閃光耐性", "暗黒耐性", "幻覚耐性", "睡眠耐性", 
    "石化耐性", "スタン耐性", "拘束耐性", "呪い耐性", "支配耐性", 
    "即死耐性", "時間耐性", "出血耐性", "疲労耐性", "物理無効", 
    "魔法無効", "ノックバック耐性", "Cr率耐性", "Cr威力耐性"
];
const bodyAttributes = [
    "角", "角リーチ", "牙", "爪", "爪リーチ", "羽", "羽リーチ", "尾", "尾リーチ",
    "外皮", "外殻", "再生", "吸血", "ドレイン", "鋼体", "足", "SIZ","肉体","外殻装甲"
];
const displayBody = [
    "角", "角リーチ", "牙", "爪", "爪リーチ", "羽", "羽リーチ", "尾", "尾リーチ",
    "外皮", "外殻", "再生", "吸血", "ドレイン", "鋼体", "足","外殻装甲"
];
const equipmentSlots = ['武器', '武器2', '頭', '顔', '首', '体', '下着', '背中', '右腕', '左腕', '右手', '左手', '腰', '右足', '左足'];

// 武器で合計するやつ
const SC_ITEM_RUNTIME_ID_KEY = "__runtimeItemId";
const SC_ITEM_RUNTIME_LOCATION_KEY = "__runtimeItemLocation";
const SC_ITEM_RUNTIME_SLOT_KEY = "__runtimeItemSlot";
let runtimeItemIdSeq = 1;

function createRuntimeItemId() {
    const seq = runtimeItemIdSeq++;
    return `itm-${Date.now().toString(36)}-${seq.toString(36)}`;
}

function ensureRuntimeItemId(item) {
    if (!item || typeof item !== "object") return "";
    if (!item[SC_ITEM_RUNTIME_ID_KEY]) {
        item[SC_ITEM_RUNTIME_ID_KEY] = createRuntimeItemId();
    }
    return String(item[SC_ITEM_RUNTIME_ID_KEY]);
}

function getRuntimeItemId(item) {
    if (!item || typeof item !== "object") return "";
    return String(item[SC_ITEM_RUNTIME_ID_KEY] || "");
}

function markRuntimeItemLocation(item, location, slotOrIndex = null) {
    if (!item || typeof item !== "object") return;
    item[SC_ITEM_RUNTIME_LOCATION_KEY] = String(location || "");
    if (slotOrIndex === null || slotOrIndex === undefined || slotOrIndex === "") {
        delete item[SC_ITEM_RUNTIME_SLOT_KEY];
    } else {
        item[SC_ITEM_RUNTIME_SLOT_KEY] = String(slotOrIndex);
    }
}

function getItemNameForMatch(item) {
    return String(item?.名前 || item?.name || "").trim();
}

function getItemTypeForMatch(item) {
    return String(item?.種類 || item?.type || "").trim();
}

function getItemEquipPlaceForMatch(item) {
    const directKeys = ["装備部位", "装備箇所", "equipmentSlot", "slot"];
    for (const key of directKeys) {
        if (!(key in (item || {}))) continue;
        const value = String(item[key] ?? "").trim();
        if (value) return value;
    }

    if (!item || typeof item !== "object") return "";
    const fuzzyKey = Object.keys(item).find((key) => (
        key.includes("部位")
        || key.includes("箇所")
        || key.toLowerCase().includes("slot")
    ));
    if (!fuzzyKey) return "";
    return String(item[fuzzyKey] ?? "").trim();
}

function isSameItemFallback(left, right) {
    if (!left || !right) return false;
    if (left === right) return true;

    const leftId = getRuntimeItemId(left);
    const rightId = getRuntimeItemId(right);
    if (leftId && rightId) return leftId === rightId;

    return (
        getItemNameForMatch(left) === getItemNameForMatch(right)
        && getItemTypeForMatch(left) === getItemTypeForMatch(right)
        && getItemEquipPlaceForMatch(left) === getItemEquipPlaceForMatch(right)
    );
}

function normalizeCharacterItemState(character) {
    if (!character || typeof character !== "object") return;

    if (!character.equipmentSlot || typeof character.equipmentSlot !== "object") {
        character.equipmentSlot = {};
    }
    if (!Array.isArray(character.inventory)) character.inventory = [];
    if (!Array.isArray(character.storage)) character.storage = [];

    equipmentSlots.forEach((slot) => {
        if (!(slot in character.equipmentSlot)) {
            character.equipmentSlot[slot] = null;
        }
    });

    const seen = new Set();

    equipmentSlots.forEach((slot) => {
        const item = character.equipmentSlot[slot];
        if (!item || typeof item !== "object") {
            character.equipmentSlot[slot] = null;
            return;
        }
        const id = ensureRuntimeItemId(item);
        if (!id || seen.has(id)) {
            character.equipmentSlot[slot] = null;
            return;
        }
        seen.add(id);
        markRuntimeItemLocation(item, "equipment", slot);
    });

    character.inventory = character.inventory.filter((item, index) => {
        if (!item || typeof item !== "object") return false;
        const id = ensureRuntimeItemId(item);
        if (!id || seen.has(id)) return false;
        seen.add(id);
        markRuntimeItemLocation(item, "inventory", index);
        return true;
    });

    character.storage = character.storage.filter((item, index) => {
        if (!item || typeof item !== "object") return false;
        const id = ensureRuntimeItemId(item);
        if (!id || seen.has(id)) return false;
        seen.add(id);
        markRuntimeItemLocation(item, "storage", index);
        return true;
    });

    character.equipment = equipmentSlots
        .map((slot) => character.equipmentSlot[slot])
        .filter((item) => item && typeof item === "object");
}

function findItemLocation(character, targetItem) {
    if (!character || !targetItem) return null;
    normalizeCharacterItemState(character);

    const targetId = ensureRuntimeItemId(targetItem);

    for (const slot of equipmentSlots) {
        const entry = character.equipmentSlot?.[slot];
        if (!entry) continue;
        const entryId = ensureRuntimeItemId(entry);
        if ((targetId && entryId === targetId) || isSameItemFallback(entry, targetItem)) {
            return { container: "equipment", slot, item: entry };
        }
    }

    const inventoryIndex = character.inventory.findIndex((entry) => {
        if (!entry) return false;
        const entryId = ensureRuntimeItemId(entry);
        return (targetId && entryId === targetId) || isSameItemFallback(entry, targetItem);
    });
    if (inventoryIndex >= 0) {
        return { container: "inventory", index: inventoryIndex, item: character.inventory[inventoryIndex] };
    }

    const storageIndex = character.storage.findIndex((entry) => {
        if (!entry) return false;
        const entryId = ensureRuntimeItemId(entry);
        return (targetId && entryId === targetId) || isSameItemFallback(entry, targetItem);
    });
    if (storageIndex >= 0) {
        return { container: "storage", index: storageIndex, item: character.storage[storageIndex] };
    }

    return null;
}

function getMaxInventory(character) {
    const max = Number(character?.maxInventory);
    return Number.isFinite(max) && max >= 0 ? max : Number.POSITIVE_INFINITY;
}

function hasInventoryCapacity(character) {
    if (!character) return false;
    if (!Array.isArray(character.inventory)) character.inventory = [];
    return character.inventory.length < getMaxInventory(character);
}

function resolveSlotByIndex(character, index) {
    const slots = Object.keys(character?.equipmentSlot || {});
    return slots[index] || equipmentSlots[index] || null;
}

function getAllowedEquipSlots(character, item) {
    const slotWeapon1 = resolveSlotByIndex(character, 0);
    const slotWeapon2 = resolveSlotByIndex(character, 1);
    const slotHead = resolveSlotByIndex(character, 2);
    const slotFace = resolveSlotByIndex(character, 3);
    const slotNeck = resolveSlotByIndex(character, 4);
    const slotBody = resolveSlotByIndex(character, 5);
    const slotUnder = resolveSlotByIndex(character, 6);
    const slotBack = resolveSlotByIndex(character, 7);
    const slotArmR = resolveSlotByIndex(character, 8);
    const slotArmL = resolveSlotByIndex(character, 9);
    const slotHandR = resolveSlotByIndex(character, 10);
    const slotHandL = resolveSlotByIndex(character, 11);
    const slotWaist = resolveSlotByIndex(character, 12);
    const slotFootR = resolveSlotByIndex(character, 13);
    const slotFootL = resolveSlotByIndex(character, 14);

    const place = getItemEquipPlaceForMatch(item);
    if (!place) return [];

    const slotAlias = new Map([
        ["武器", [slotWeapon1, slotWeapon2]],
        ["頭", [slotHead]],
        ["顔", [slotFace]],
        ["首", [slotNeck]],
        ["体", [slotBody]],
        ["下着", [slotUnder]],
        ["背中", [slotBack]],
        ["腕", [slotArmR, slotArmL]],
        ["手", [slotHandR, slotHandL]],
        ["腰", [slotWaist]],
        ["足", [slotFootR, slotFootL]]
    ]);

    if (slotAlias.has(place)) {
        return (slotAlias.get(place) || []).filter(Boolean);
    }

    const direct = Object.keys(character?.equipmentSlot || {}).find((key) => key === place);
    if (direct) return [direct];

    return [];
}

function removeItemByLocation(character, location) {
    if (!character || !location) return null;
    if (location.container === "equipment" && location.slot) {
        const removed = character.equipmentSlot[location.slot] || null;
        character.equipmentSlot[location.slot] = null;
        return removed;
    }
    if (location.container === "inventory" && Number.isInteger(location.index)) {
        return character.inventory.splice(location.index, 1)[0] || null;
    }
    if (location.container === "storage" && Number.isInteger(location.index)) {
        return character.storage.splice(location.index, 1)[0] || null;
    }
    return null;
}

function pushItemToContainer(character, item, container) {
    if (!character || !item) return false;
    if (container === "inventory") {
        if (!hasInventoryCapacity(character)) return false;
        character.inventory.push(item);
        return true;
    }
    if (container === "storage") {
        character.storage.push(item);
        return true;
    }
    return false;
}

function getCurrentCharacterForItemActions() {
    if (playerData && typeof playerData === "object") return playerData;
    if (Array.isArray(characterList) && characterList.length > 0) return characterList[0];
    return null;
}

function getEquipSlotItemName(character, slot) {
    const item = character?.equipmentSlot?.[slot];
    const name = String(item?.名前 || item?.name || "").trim();
    return name || "空き";
}

const EQUIP_COMPARE_BOOST_ORDER = [
    "HP+", "MP+", "ST+", "攻撃+", "防御+", "魔力+", "魔防+", "速度+", "命中+", "SIZ", "APP"
];
const EQUIP_COMPARE_BOOST_SET = new Set(EQUIP_COMPARE_BOOST_ORDER);

function normalizeCompareKey(rawKey) {
    return String(rawKey || "")
        .replace(/\s+/g, "")
        .replace(/＋/g, "+")
        .trim();
}

function normalizeCompareLine(line) {
    if (!line) return null;
    if (typeof line === "string") {
        const text = line.trim();
        if (!text) return null;
        const match = text.match(/^(.+?)\s+(-?\d+(?:\.\d+)?)$/);
        if (match) {
            return { label: match[1], value: match[2], detail: "" };
        }
        return { label: text, value: "", detail: "" };
    }
    const label = String(line.label || "").trim();
    const value = String(line.value ?? "").trim();
    const detail = String(line.detail || "").trim();
    if (!label) return null;
    return { label, value, detail };
}

function collectBoostLinesFromRaw(source) {
    const lines = [];
    Object.entries(source || {}).forEach(([rawKey, rawValue]) => {
        const key = normalizeCompareKey(rawKey);
        const numeric = toFiniteNumber(rawValue);
        const isBoostKey = EQUIP_COMPARE_BOOST_SET.has(key) || key.endsWith("+");
        if (!isBoostKey) return;
        if (numeric === 0) return;
        lines.push({
            label: key,
            value: String(Math.round(numeric)),
            detail: ""
        });
    });

    lines.sort((a, b) => {
        const ai = EQUIP_COMPARE_BOOST_ORDER.indexOf(a.label);
        const bi = EQUIP_COMPARE_BOOST_ORDER.indexOf(b.label);
        const av = ai >= 0 ? ai : Number.MAX_SAFE_INTEGER;
        const bv = bi >= 0 ? bi : Number.MAX_SAFE_INTEGER;
        if (av !== bv) return av - bv;
        return a.label.localeCompare(b.label, "ja");
    });

    return lines.slice(0, 8);
}

function getEquipCompareItemSummary(item) {
    const source = (item && typeof item === "object") ? item : {};
    const isEmptySlotItem = !item || Object.keys(source).length === 0;
    if (isEmptySlotItem) {
        return {
            name: "空き",
            type: "",
            lines: [{ label: "状態", value: "空き", detail: "" }]
        };
    }

    const name = String(source.名前 || source.name || "空き").trim() || "空き";
    const type = String(source.種類 || source.type || "").trim();

    // DetailModal側の解釈結果を優先利用して表記揺れを防ぐ。
    if (typeof window.getItemCompareSummaryForEquip === "function") {
        const detailSummary = window.getItemCompareSummaryForEquip(source);
        if (detailSummary && typeof detailSummary === "object") {
            const detailLines = (Array.isArray(detailSummary.lines) ? detailSummary.lines : [])
                .map(normalizeCompareLine)
                .filter(Boolean)
                .slice(0, 12);
            if (detailLines.length > 0) {
                return {
                    name: String(detailSummary.name || name).trim() || name,
                    type: String(detailSummary.type || type).trim(),
                    lines: detailLines
                };
            }
        }
    }

    const boostLines = collectBoostLinesFromRaw(source);
    return {
        name,
        type,
        lines: boostLines.length > 0
            ? boostLines
            : [{ label: "上昇", value: "なし", detail: "" }]
    };
}

function buildEquipComparePayload(character, movingItem, slots) {
    const incomingSummary = getEquipCompareItemSummary(movingItem);
    const candidates = (Array.isArray(slots) ? slots : [])
        .filter(Boolean)
        .map((slot) => {
            const currentItem = character?.equipmentSlot?.[slot] || null;
            return {
                slot,
                item: getEquipCompareItemSummary(currentItem)
            };
        });

    return {
        title: "装備先を選択",
        incoming: incomingSummary,
        candidates
    };
}

function askConfirmAsync(message) {
    return new Promise((resolve) => {
        if (typeof window.openConfirmModal === "function") {
            window.openConfirmModal(message, (confirmed) => {
                resolve(Boolean(confirmed));
            });
            return;
        }
        resolve(Boolean(window.confirm(message)));
    });
}

async function chooseEquipTargetSlot(character, movingItem, allowedSlots) {
    const slots = (Array.isArray(allowedSlots) ? allowedSlots : []).filter(Boolean);
    if (slots.length === 0) return "";

    if (typeof window.openEquipCompareModalVue === "function") {
        const payload = buildEquipComparePayload(character, movingItem, slots);
        payload.title = slots.length === 1
            ? "装備前に比較"
            : "装備前に比較して装備先を選択";
        const selectedSlot = await window.openEquipCompareModalVue(payload);
        if (slots.includes(selectedSlot)) {
            return selectedSlot;
        }
        return "";
    }

    if (slots.length === 1) return slots[0];

    // 比較モーダルが使えない場合のみ、空き枠を自動で優先。
    const emptySlots = slots.filter((slot) => !character?.equipmentSlot?.[slot]);
    if (emptySlots.length === 1) return emptySlots[0];
    if (emptySlots.length > 1) return emptySlots[0];

    // 入れ替えになる場合のみ、左右などの候補から選択してもらう。
    if (slots.length === 2) {
        const [slotA, slotB] = slots;
        const incomingName = String(movingItem?.名前 || movingItem?.name || "装備").trim() || "装備";
        const itemA = getEquipSlotItemName(character, slotA);
        const itemB = getEquipSlotItemName(character, slotB);
        const useFirst = await askConfirmAsync(
            `「${incomingName}」の装備先を選択してください。\nはい: ${slotA}（現在: ${itemA}）\nいいえ: ${slotB}（現在: ${itemB}）`
        );
        return useFirst ? slotA : slotB;
    }

    // 3枠以上のケースは prompt で選択。
    const choices = slots.map((slot, index) => (
        `${index + 1}: ${slot}（現在: ${getEquipSlotItemName(character, slot)}）`
    )).join("\n");
    const input = window.prompt(`装備先を選択してください。\n${choices}`, "1");
    const selectedIndex = Number.parseInt(String(input || "1"), 10);
    if (Number.isInteger(selectedIndex) && selectedIndex >= 1 && selectedIndex <= slots.length) {
        return slots[selectedIndex - 1];
    }
    return slots[0];
}

const HUMAN_TRANSFORM_SKILL_NAME_SET = new Set(["人間変身"]);
const HUMAN_TRANSFORM_PASSIVE_ONLY_BONUS_KEYS = new Set(["牙", "爪"]);
const HUMAN_TRANSFORM_FIXED_ZERO_BODY_ATTRIBUTE_KEYS = [
    "牙",
    "爪",
    "羽",
    "尾",
    "外郭",
    "外殻",
    "外郭装甲",
    "外殻装甲"
];
const HUMAN_TRANSFORM_FIXED_ZERO_BONUS_KEYS = new Set([
    ...HUMAN_TRANSFORM_FIXED_ZERO_BODY_ATTRIBUTE_KEYS,
    "SIZ",
    "足"
]);

function isHumanTransformSkillData(skillData) {
    if (!skillData || typeof skillData !== "object") return false;
    const candidates = [
        normalizeBattleText(skillData?.和名),
        normalizeBattleText(skillData?.技名),
        normalizeBattleText(skillData?.name)
    ].filter(Boolean);
    return candidates.some((name) => {
        for (const keyword of HUMAN_TRANSFORM_SKILL_NAME_SET) {
            if (name === keyword || name.includes(keyword)) return true;
        }
        return false;
    });
}

function isHumanTransformSkillActive(activeSkills = []) {
    const list = Array.isArray(activeSkills) ? activeSkills : [];
    return list.some((skill) => isHumanTransformSkillData(skill));
}

function applyHumanTransformStatusBaseRules(source = {}, passiveOnlyConditionalBonuses = {}) {
    const sourceObject = (source && typeof source === "object") ? source : {};
    const sourceStats = (sourceObject?.stats && typeof sourceObject.stats === "object")
        ? sourceObject.stats
        : {};
    const sourceItemBonuses = (sourceObject?.itemBonuses && typeof sourceObject.itemBonuses === "object")
        ? sourceObject.itemBonuses
        : {};
    const sourceSkillBonuses = {
        ...(sourceObject?.skillBonuses && typeof sourceObject.skillBonuses === "object"
            ? sourceObject.skillBonuses
            : {})
    };

    const nextBaseStats = {
        ...(sourceStats?.baseStats && typeof sourceStats.baseStats === "object" ? sourceStats.baseStats : {})
    };
    const nextLevelStats = {
        ...(sourceStats?.levelStats && typeof sourceStats.levelStats === "object" ? sourceStats.levelStats : {})
    };
    const nextBodyAttributes = {
        ...(sourceStats?.bodyAttributes && typeof sourceStats.bodyAttributes === "object" ? sourceStats.bodyAttributes : {})
    };
    const nextBodyType = Array.isArray(sourceStats?.bodyType)
        ? sourceStats.bodyType.map((entry, index) => (
            index === 0 && entry && typeof entry === "object" ? { ...entry } : entry
        ))
        : [];
    if (!nextBodyType[0] || typeof nextBodyType[0] !== "object") {
        nextBodyType[0] = {};
    }
    const nextBodyTypePrimary = nextBodyType[0];

    const nextItemBonusStats = {
        ...(sourceItemBonuses?.stats && typeof sourceItemBonuses.stats === "object"
            ? sourceItemBonuses.stats
            : {})
    };
    const nextSkillBonuses = { ...sourceSkillBonuses };

    HUMAN_TRANSFORM_FIXED_ZERO_BODY_ATTRIBUTE_KEYS.forEach((key) => {
        nextBodyAttributes[key] = 0;
        nextItemBonusStats[key] = 0;
        nextSkillBonuses[key] = 0;
        nextBodyTypePrimary[key] = 0;
    });

    nextBaseStats.SIZ = 170;
    nextLevelStats.SIZ = 0;
    nextBodyAttributes.SIZ = 170;
    nextItemBonusStats["SIZ"] = 0;
    nextItemBonusStats["SIZ+"] = 0;
    nextSkillBonuses.SIZ = 0;
    nextBodyTypePrimary.SIZ = 0;

    nextBodyAttributes["足"] = 2;
    nextItemBonusStats["足"] = 0;
    nextSkillBonuses["足"] = 0;
    nextBodyTypePrimary["足"] = 0;

    HUMAN_TRANSFORM_PASSIVE_ONLY_BONUS_KEYS.forEach((key) => {
        nextBodyAttributes[key] = 0;
        nextItemBonusStats[key] = 0;
        nextBodyTypePrimary[key] = 0;
        nextSkillBonuses[key] = (
            toFiniteNumber(sourceSkillBonuses[key])
            + toFiniteNumber(passiveOnlyConditionalBonuses?.[key])
        );
    });

    return {
        ...sourceObject,
        stats: {
            ...sourceStats,
            baseStats: nextBaseStats,
            levelStats: nextLevelStats,
            bodyAttributes: nextBodyAttributes,
            bodyType: nextBodyType
        },
        itemBonuses: {
            ...sourceItemBonuses,
            stats: nextItemBonusStats
        },
        skillBonuses: nextSkillBonuses
    };
}

function buildCharacterDataForStatusDisplay(characterDataSource = playerData) {
    const source = (characterDataSource && typeof characterDataSource === "object")
        ? characterDataSource
        : {};
    const characterName = source?.name || selectName || playerData?.name || "";
    const activeConditionalPassives = getRuntimePassiveLikeSkillsForSelectedSkills(selectedSkills, {
        characterName
    });
    const passiveOnlyConditionalBonuses = buildConditionalPassiveStatusBonuses(
        getActiveConditionalPassivesForSelectedSkills(selectedSkills)
    );
    const humanTransformActive = isHumanTransformSkillActive(activeConditionalPassives);
    const normalizedSource = humanTransformActive
        ? applyHumanTransformStatusBaseRules(source, passiveOnlyConditionalBonuses)
        : source;
    const conditionalBonuses = buildRuntimeStatusBonuses({
        activeConditionalPassives,
        characterName
    });
    const mergedSkillBonuses = {
        ...(normalizedSource.skillBonuses || {})
    };

    Object.entries(conditionalBonuses).forEach(([key, value]) => {
        if (humanTransformActive) {
            const normalizedKey = normalizeConditionalPassiveGlobalBoostKey(key) || String(key || "").trim();
            if (HUMAN_TRANSFORM_PASSIVE_ONLY_BONUS_KEYS.has(normalizedKey)) return;
            if (HUMAN_TRANSFORM_FIXED_ZERO_BONUS_KEYS.has(normalizedKey)) return;
        }
        const bonus = toFiniteNumber(value);
        if (bonus === 0) return;
        mergedSkillBonuses[key] = toFiniteNumber(mergedSkillBonuses[key]) + bonus;
    });

    if (humanTransformActive) {
        HUMAN_TRANSFORM_FIXED_ZERO_BONUS_KEYS.forEach((key) => {
            if (HUMAN_TRANSFORM_PASSIVE_ONLY_BONUS_KEYS.has(key)) return;
            mergedSkillBonuses[key] = 0;
        });
        HUMAN_TRANSFORM_PASSIVE_ONLY_BONUS_KEYS.forEach((key) => {
            mergedSkillBonuses[key] = toFiniteNumber(normalizedSource?.skillBonuses?.[key]);
        });
    }

    return {
        ...normalizedSource,
        skillBonuses: mergedSkillBonuses
    };
}

async function refreshTopRightStatusContainer() {
    if (!playerData || typeof playerData !== "object") return;
    try {
        const displayBasicStatus = await getTabContainerFunction("displayBasicStatus");
        const statsView = await getTabContainerFunction("statsView");
        const displayEquipment = await getTabContainerFunction("displayEquipment");

        const statusDisplayData = buildCharacterDataForStatusDisplay(playerData);
        await displayBasicStatus(statusDisplayData);
        await statsView();

        if (typeof baseValues !== "undefined" && typeof increaseValues !== "undefined") {
            await displayEquipment(playerData.equipmentSlot, baseValues, increaseValues);
        }
    } catch (error) {
        console.warn("stats-container 更新をスキップしました:", error);
    }
}
window.refreshTopRightStatusContainer = refreshTopRightStatusContainer;

async function refreshCharacterViews(character) {
    if (!character) return;
    normalizeCharacterItemState(character);
    if (Array.isArray(characterList) && character.name) {
        const index = characterList.findIndex((entry) => entry?.name === character.name);
        if (index >= 0) {
            characterList[index] = character;
        }
    }
    playerData = character;
    window.playerData = playerData;
    window.characterList = characterList;
    await characterDataDisplay(character);
}

function bindDetailModalItemActions() {
    const canEquip = (item) => {
        const character = getCurrentCharacterForItemActions();
        if (!character || !item) return false;
        const location = findItemLocation(character, item);
        if (!location || location.container === "equipment") return false;
        const allowedSlots = getAllowedEquipSlots(character, location.item || item);
        return allowedSlots.length > 0;
    };

    const canUnequip = (item) => {
        const character = getCurrentCharacterForItemActions();
        if (!character || !item) return false;
        const location = findItemLocation(character, item);
        return Boolean(location && location.container === "equipment");
    };

    const canMoveToInventory = (item) => {
        const character = getCurrentCharacterForItemActions();
        if (!character || !item) return false;
        const location = findItemLocation(character, item);
        if (!location || location.container === "inventory") return false;
        return hasInventoryCapacity(character);
    };

    const canMoveToStorage = (item) => {
        const character = getCurrentCharacterForItemActions();
        if (!character || !item) return false;
        const location = findItemLocation(character, item);
        return Boolean(location && location.container !== "storage");
    };

    const onEquip = async (item) => {
        const character = getCurrentCharacterForItemActions();
        if (!character || !item) return false;
        normalizeCharacterItemState(character);

        const location = findItemLocation(character, item);
        if (!location || location.container === "equipment") return false;

        const movingItem = removeItemByLocation(character, location);
        if (!movingItem) return false;

        const allowedSlots = getAllowedEquipSlots(character, movingItem);
        if (allowedSlots.length === 0) {
            pushItemToContainer(character, movingItem, location.container);
            normalizeCharacterItemState(character);
            return false;
        }

        const targetSlot = await chooseEquipTargetSlot(character, movingItem, allowedSlots);
        if (!targetSlot) {
            pushItemToContainer(character, movingItem, location.container);
            normalizeCharacterItemState(character);
            return false;
        }
        const replaced = character.equipmentSlot[targetSlot] || null;
        character.equipmentSlot[targetSlot] = movingItem;

        if (replaced) {
            const prefer = location.container === "storage" ? "storage" : "inventory";
            if (!pushItemToContainer(character, replaced, prefer)) {
                pushItemToContainer(character, replaced, "storage");
            }
        }

        await refreshCharacterViews(character);
        return true;
    };

    const onUnequip = async (item) => {
        const character = getCurrentCharacterForItemActions();
        if (!character || !item) return false;
        normalizeCharacterItemState(character);

        const location = findItemLocation(character, item);
        if (!location || location.container !== "equipment") return false;

        const movingItem = removeItemByLocation(character, location);
        if (!movingItem) return false;

        if (!pushItemToContainer(character, movingItem, "inventory")) {
            pushItemToContainer(character, movingItem, "storage");
        }

        await refreshCharacterViews(character);
        return true;
    };

    const onMoveToInventory = async (item) => {
        const character = getCurrentCharacterForItemActions();
        if (!character || !item) return false;
        normalizeCharacterItemState(character);

        const location = findItemLocation(character, item);
        if (!location || location.container === "inventory") return false;
        if (!hasInventoryCapacity(character)) return false;

        const movingItem = removeItemByLocation(character, location);
        if (!movingItem) return false;
        if (!pushItemToContainer(character, movingItem, "inventory")) return false;

        await refreshCharacterViews(character);
        return true;
    };

    const onMoveToStorage = async (item) => {
        const character = getCurrentCharacterForItemActions();
        if (!character || !item) return false;
        normalizeCharacterItemState(character);

        const location = findItemLocation(character, item);
        if (!location || location.container === "storage") return false;

        const movingItem = removeItemByLocation(character, location);
        if (!movingItem) return false;
        pushItemToContainer(character, movingItem, "storage");

        await refreshCharacterViews(character);
        return true;
    };

    window.canDetailModalEquip = canEquip;
    window.canDetailModalUnequip = canUnequip;
    window.canDetailModalMoveToInventory = canMoveToInventory;
    window.canDetailModalMoveToStorage = canMoveToStorage;

    window.onDetailModalEquip = onEquip;
    window.onDetailModalUnequip = onUnequip;
    window.onDetailModalMoveToInventory = onMoveToInventory;
    window.onDetailModalMoveToStorage = onMoveToStorage;
}

const statusEffects = [
    "全力", "切断", "貫通", "打撃", "炎", "氷", "雷", "酸", "音波", "闇", "光", "善", "悪", "正", "負",
    "毒", "麻痺", "混乱", "恐怖", "盲目", "閃光", "暗黒", "幻覚", "睡眠", "石化", "スタン", "拘束",
    "呪い", "呪い/HP", "呪い/MP", "呪い/ST", "呪い/筋力", "呪い/防御", "呪い/魔力", "呪い/魔防",
    "呪い/速度", "呪い/命中", "支配", "即死", "時間", "出血", "疲労", "物理ガード", "魔法ガード", "NB", "SIZ",
    "最低威力", "Cr率", "Cr威力", "物理貫通", "魔法貫通", "遠隔"
];
const weponList = [
    "炎", "氷", "雷", "酸", "音波", "闇", "光", "善", "悪", "正", "負", "毒", "麻痺", "混乱", "恐怖", 
    "盲目", "閃光", "暗黒", "幻覚", "睡眠", "石化", "スタン", "拘束", "呪い", "呪い/HP", "呪い/MP", 
    "呪い/ST", "呪い/筋力", "呪い/防御", "呪い/魔力", "呪い/魔防", "呪い/速度", "呪い/命中", 
    "支配", "即死", "時間", "出血", "疲労", "物理ガード", "魔法ガード", "NB"
];
//装備の合計値
const attributes = [
    "HP+", "MP+", "ST+", "攻撃+", "防御+", "魔力+", "魔防+", "速度+", "命中+", "攻撃倍", "防御倍", 
    "魔力倍", "魔防倍", "速度倍", "命中倍", "SIZ", "APP", "物理軽減", "魔法軽減", "遠隔軽減", 
    "切断軽減", "貫通軽減", "打撃軽減", "炎軽減", "氷軽減", "雷軽減", "酸軽減", "音波軽減", 
    "闇軽減", "光軽減", "善軽減", "悪軽減", "正軽減", "負軽減", "切断耐性", "物理無効", "魔法無効", 
    "ノックバック耐性", "Cr率耐性", "Cr威力耐性", "威圧", "透明化", "隠密", "消音", "看破", 
    "知覚", "聴覚", "追跡", "軽業", "鑑定", "騎乗", "芸能", "言語学", "交渉", "呪文学", "職能", 
    "真意看破", "水泳", "製作", "生存", "装置", "精神接続", "知識", "治療", "早業", "登攀", 
    "指揮", "騙す", "変装", "魔道具操作", "角", "角リーチ", "牙", "爪", "爪リーチ", "羽", "羽リーチ", 
    "尾", "尾リーチ", "外皮", "外殻装甲", "再生", "吸血", "ドレイン", "鋼体", "移動", "移動倍率", 
    "飛行", "飛行倍率"
];

//パッシブスキルの合計値
const skillAttributes = [
    "SIZ", "最低威力", "Cr率", "Cr威力", "全力倍率", "切断倍", "貫通倍", "打撃倍", "炎倍", "氷倍", "雷倍", "酸倍", "音波倍",
    "闇倍", "光倍", "善倍", "悪倍", "正倍", "負倍", "毒倍", "麻痺倍", "混乱倍", "恐怖倍", "盲目倍", "閃光倍", "暗黒倍",
    "幻覚倍", "睡眠倍", "石化倍", "スタン倍", "拘束倍", "呪い倍", "呪い/HP倍", "呪い/MP倍", "呪い/ST倍", "呪い/攻撃倍",
    "呪い/防御倍", "呪い/魔力倍", "呪い/魔防倍", "呪い/速度倍", "呪い/命中倍", "支配倍", "即死倍", "時間倍", "出血倍",
    "疲労倍", "物理倍", "魔法倍", "ノックバック倍", "SIZ倍", "最低ダメージ倍", "Cr率倍", "Cr威力倍", "HP", "MP", "ST",
    "攻撃", "防御", "魔力", "魔防", "速度", "命中", "APP", "攻撃倍", "防御倍", "魔力倍", "魔防倍", "速度倍", "命中倍",
    "APP倍", "物理貫通", "魔法貫通", "Lv", "物理軽減", "魔法軽減", "遠隔軽減", "切断軽減", "貫通軽減", "打撃軽減", "炎軽減",
    "氷軽減", "雷軽減", "酸軽減", "音波軽減", "闇軽減", "光軽減", "善軽減", "悪軽減", "正軽減", "負軽減", "切断耐性",
    "貫通耐性", "打撃耐性", "炎耐性", "氷耐性", "雷耐性", "酸耐性", "音波耐性", "闇耐性", "光耐性", "善耐性", "悪耐性",
    "正耐性", "負耐性", "毒耐性", "麻痺耐性", "混乱耐性", "恐怖耐性", "盲目耐性", "閃光耐性", "暗黒耐性", "幻覚耐性",
    "睡眠耐性", "石化耐性", "スタン耐性", "拘束耐性", "呪い耐性", "支配耐性", "即死耐性", "時間耐性", "出血耐性", "疲労耐性",
    "物理無効", "魔法無効", "ノックバック耐性", "Cr率耐性", "Cr威力耐性", "威圧", "透明化", "隠密", "消音", "看破", "知覚",
    "聴覚", "追跡", "軽業", "鑑定", "騎乗", "芸能", "言語学", "交渉", "呪文学", "職能", "真意看破", "水泳", "製作", "生存",
    "装置", "精神接続", "知識", "治療", "早業", "登攀", "指揮", "騙す", "変装", "魔道具操作", "角", "角リーチ", "牙", "爪",
    "爪リーチ", "羽", "羽リーチ", "尾", "尾リーチ", "外皮", "外殻", "再生", "吸血", "ドレイン", "鋼体", "足", "防御性能",
    "防御性能倍率", "移動速度", "移動倍率", "飛行速度", "飛行倍率", "待機時間", "クールタイム"
];

const attackOptions = [
    { "value": "武器", "label": "武器1", "威力": 0 , "属性": 0 , "防御": 0 },
    { "value": "武器2", "label": "武器2", "威力": 0 , "属性": 0 , "防御": 0 },
    { "value": "武器3", "label": "創造", "威力": 0 , "属性": 0 , "防御": 0 },
    { "value": "素手", "label": "素手", "威力": 0 , "属性": 0 , "防御": 0 },
    { "value": "脚", "label": "脚", "威力": 0 , "属性": 0 , "防御": 0 },
    { "value": "角", "label": "角", "威力": 0 , "属性": 0 , "防御": 0 },
    { "value": "牙", "label": "牙", "威力": 0 , "属性": 0 , "防御": 0 },
    { "value": "爪", "label": "爪", "威力": 0 , "属性": 0 , "防御": 0 },
    { "value": "羽", "label": "羽", "威力": 0 , "属性": 0 , "防御": 0 },
    { "value": "尾", "label": "尾", "威力": 0 , "属性": 0 , "防御": 0 },
    { "value": "眼", "label": "眼", "威力": 0 , "属性": 0 , "防御": 0 },
];

const BODY_ATTACK_OPTION_VALUES = ["素手", "爪", "牙", "角", "羽", "尾", "脚", "眼"];

function buildAttackOptionData(option) {
    if (!option || typeof option !== "object") return null;
    const power = toFiniteNumber(option?.威力 ?? option?.power);
    const guard = toFiniteNumber(option?.守り ?? option?.防御 ?? option?.guard);
    const attribute = toFiniteNumber(option?.属性 ?? option?.element);
    const raw = (option?.総合 && typeof option.総合 === "object") ? option.総合 : null;
    return {
        ...option,
        威力: power,
        守り: guard,
        防御: guard,
        属性: attribute,
        総合: raw && typeof raw === "object" ? raw : null
    };
}

function hasAttackOptionData(option) {
    const normalized = buildAttackOptionData(option);
    if (!normalized) return false;
    const hasNumeric = normalized.威力 !== 0 || normalized.防御 !== 0 || normalized.属性 !== 0;
    if (hasNumeric) return true;
    const raw = normalized.総合;
    if (!raw || typeof raw !== "object") return false;
    const hasRawName = Boolean(normalizeBattleText(raw?.名前 || raw?.name));
    const hasRawStats = [
        raw?.切断, raw?.貫通, raw?.打撃, raw?.防御性能, raw?.防御倍率
    ].some((value) => toFiniteNumber(value) !== 0);
    return hasRawName || hasRawStats;
}

function getAttackOptionByValue(value, options = attackOptions) {
    const key = normalizeBattleText(value);
    if (!key) return null;
    const found = options.find((option) => normalizeBattleText(option?.value) === key);
    return buildAttackOptionData(found);
}

function getWeaponAttackOptionData(options = attackOptions) {
    const weaponValues = ["武器", "武器2", "武器3"];
    for (const value of weaponValues) {
        const option = getAttackOptionByValue(value, options);
        if (hasAttackOptionData(option)) return option;
    }
    return getAttackOptionByValue("武器", options)
        || getAttackOptionByValue("武器2", options)
        || getAttackOptionByValue("武器3", options)
        || null;
}

function getEquippedWeaponAttackOptionData(options = attackOptions) {
    const weaponValues = ["武器", "武器2", "武器3"];
    for (const value of weaponValues) {
        const option = getAttackOptionByValue(value, options);
        const raw = option?.総合;
        const rawName = normalizeBattleText(raw?.名前 || raw?.name);
        if (rawName) {
            return option;
        }
    }
    return null;
}

function getBodyAttackOptionData(options = attackOptions) {
    return BODY_ATTACK_OPTION_VALUES
        .map((value) => getAttackOptionByValue(value, options))
        .filter((option) => option !== null);
}

function getCurrentAttackMethodData() {
    return {
        selected: getSelectedAttackOptionData(),
        weapon: getWeaponAttackOptionData(),
        body: getBodyAttackOptionData()
    };
}

function pickBestBodyAttackOption(options = attackOptions) {
    const candidates = getBodyAttackOptionData(options)
        .filter((option) => normalizeBattleText(option?.value) === "素手" || normalizeBattleText(option?.value) === "爪");
    if (!candidates.length) return null;

    const getPriorityPower = (option) => {
        const value = normalizeBattleText(option?.value);
        const power = toFiniteNumber(option?.威力);
        return value === "爪" ? power * 0.9 : power;
    };

    return candidates.reduce((best, current) => {
        if (!best) return current;
        const currentPriorityPower = getPriorityPower(current);
        const bestPriorityPower = getPriorityPower(best);
        if (currentPriorityPower > bestPriorityPower) return current;
        if (currentPriorityPower < bestPriorityPower) return best;
        return toFiniteNumber(current?.防御) > toFiniteNumber(best?.防御) ? current : best;
    }, null);
}

function getDefaultAttackOptionValue(options = attackOptions) {
    const equippedWeapon = getEquippedWeaponAttackOptionData(options);
    if (equippedWeapon) {
        return normalizeBattleText(equippedWeapon?.value);
    }
    const bestBody = pickBestBodyAttackOption(options);
    if (bestBody) {
        return normalizeBattleText(bestBody?.value);
    }
    const fist = getAttackOptionByValue("素手", options);
    if (fist) return normalizeBattleText(fist?.value);
    return "";
}

function isWeaponAttackOptionValue(value) {
    const normalized = normalizeBattleText(value);
    return normalized === "武器" || normalized === "武器2" || normalized === "武器3";
}

window.getWeaponAttackOptionData = getWeaponAttackOptionData;
window.getBodyAttackOptionData = getBodyAttackOptionData;
window.getCurrentAttackMethodData = getCurrentAttackMethodData;


async function startUp(){
    // プレイヤーデータ取得
    DebaglogSet("プレイヤーデータ取得" , selectedCharacter)
    const playerId = getCurrentPlayerIdForBattleState();
    DebaglogSet("[StartUp][LoadBattleState] 開始", { playerId });
    await ensureBattleStateLoadedFromApi();
    
    // API呼び出し直後のメモリ状態を確認
    DebaglogSet("[StartUp][LoadBattleState] 完了", {
        playerId,
        allCharacterKeys: Object.keys(retainedBuffSkillsByCharacter),
        memoryState: Object.fromEntries(
            Object.entries(retainedBuffSkillsByCharacter).map(([key, entries]) => [
                key,
                Array.isArray(entries) ? entries.length : 0
            ])
        )
    });

    playerData = await acquireCharacterData(await fetchCharacterData(selectedCharacter[0].名前));
    DebaglogSet("プレイヤーデータ取得完了" , playerData)
    // スキルデータを取得するために
    await loadSection('top-left', '/sections/character-info.html', '/js/characterInfo.js', async () => {
        DebaglogSet('top-leftセクションの読み込みが完了しました');
        DebaglogSet("characterList 追加 :", characterList )
        await loadSection('top-right', '/sections/tab-container.html', '/js/tabContainer.js', async () => {
            DebaglogSet('top-rightセクションの読み込みが完了しました');

            DebaglogSet(" プレイヤーデータ :",characterList, playerData)
            characterList = await addOrUpdateCharacter(characterList, playerData)
        
            // 同じキャラを二回入れているが一旦このままで
            for (const character of selectedCharacter) {
                DebaglogSet("character.名前 :", character.名前);
                const fetchedData = await fetchCharacterData(character.名前);

                DebaglogSet("fetchedData :", fetchedData);
                const addCharacterData = await acquireCharacterData(fetchedData);
                DebaglogSet(" 同じキャラを二回入れているが一旦このままで ", addCharacterData);
                characterList = await addOrUpdateCharacter(characterList, addCharacterData);
            }
            // キャラ追加テスト
            // addCharacterData = await acquireCharacterData(await fetchCharacterData("リコリス"));
            // DebaglogSet(addCharacterData)
            // characterList = addOrUpdateCharacter(characterList, addCharacterData)

            DebaglogSet(" characterList :", characterList)
            if (Array.isArray(characterList)) {
                characterList.forEach((characterEntry) => {
                    applyStoredDamageStateToCharacter(characterEntry, characterEntry?.name || "");
                });
            }

            // 'top-right'セクションを読み込み
            
            // //スキルを表示
            // await displaySkills(playerData.skills)
            // await displayMagics(playerData.magic)

            // DebaglogSet("playerData :", playerData)

            // await displayBasicStatus(playerData)
            // await toggleTotalView()
            // await displayEquipment(playerData.equipmentSlot, baseValues, increaseValues)
            // await displayItemTable("inventory-tbody", playerData.inventory, baseValues, increaseValues)
            // await displayItemTable("storage-tbody", playerData.storage, baseValues, increaseValues)

            // await updateDisplays(playerData)
            
            // 上記の内容をまとめた関数 キャラクターデータをまとめて表示する
            ensureSkillTablesStructure();
            ensureDiceLogView();
            initializeBattleMemoUI();
            const initialCharacter = characterList[0] || playerData;
            await characterDataDisplay(initialCharacter)
            DebaglogSet(" 上記の内容をまとめた関数 :", playerData)

            //画面にキャラデータを入れる
            await displayCharacters(characterList)
            console.log(" 画面にキャラデータを入れる :", characterList)
            // await toggleTotalView()
            
            // 【重要】JSON 保存データから発動中スキルを復元
            DebaglogSet("[StartUp] 発動中スキル復元開始", { characterCount: characterList.length });
            restoreRetainedBuffSkillsForLoadedCharacters(characterList);
            DebaglogSet("[StartUp] 発動中スキル復元完了", { 
                summary: buildRetainedBuffDebugSummary()
            });
            
            // ロード完了後にiframe（ロード画面）を非表示、メインコンテンツを表示
            document.getElementById('load-screen').style.display = 'none';
            document.getElementById('main-content').style.display = 'grid';
            
            // 初期表示
            openSkillTab('A');
            updateSkillTableLayoutButtons();

            
            // ページロード時に選択肢を設定
            // 【重要】復元した発動中スキルを表示に反映させる
            DebaglogSet("[StartUp] スキルテーブル再描画開始");
            await rerenderSkillTables();
            DebaglogSet("[StartUp] スキルテーブル再描画完了");

            const showSecondaryTab = await getTabContainerFunction("showSecondaryTab");
            await showSecondaryTab('equipment')
            bindDetailModalItemActions();
            updateFullPowerModeUI();
            window.rollDice = handleBattleRollDice;
            window.handleBattleRollDice = handleBattleRollDice;
        })
        
    });

}

async function characterDataDisplay (characterDataPush){
    ensureSkillTablesStructure();
    ensureDiceLogView();
    await displaySkillsReset()

    if( characterDataPush == undefined ){
        return
    }

    DebaglogSet("playerData :", characterDataPush)
    const previousCharacterName = selectName || playerData?.name || "";
    saveCurrentAttackOptionForCharacter(null, previousCharacterName);
    saveCurrentCharacterSelectedSkills(previousCharacterName);
    selectName = characterDataPush.name || "";
    loadSelectedSkillsForCharacter(selectName);
    playerData = characterDataPush;
    applyStoredDamageStateToCharacter(playerData, selectName);
    hydrateRetainedBuffSkillsForCharacter(selectName, playerData);
    normalizeCharacterItemState(playerData);
    updateBattleTurnDisplay(selectName);
    window.playerData = playerData;
    window.characterList = characterList;
    bindDetailModalItemActions();
    loadBattleMemoForCurrentCharacter(selectName);
    // playerData.name = characterDataPush.name
    const displayBasicStatus = await getTabContainerFunction("displayBasicStatus");
    await displayBasicStatus(buildCharacterDataForStatusDisplay(characterDataPush))

    //スキルを表示
    await displaySkills(characterDataPush.skills)
    DebaglogSet("  function characterDataDisplay ", characterDataPush.magic)
    await displayMagics(characterDataPush.magic)

    displaySkillsList = characterDataPush.skills
    displayMagicsList = characterDataPush.magic
    
    const statsView = await getTabContainerFunction("statsView");
    const displayEquipment = await getTabContainerFunction("displayEquipment");
    const displayItemTable = await getTabContainerFunction("displayItemTable");

    await statsView()
    await displayEquipment(characterDataPush.equipmentSlot, baseValues, increaseValues)
    await displayItemTable("inventory-tbody", characterDataPush.inventory, baseValues, increaseValues)
    await displayItemTable("storage-tbody", characterDataPush.storage, baseValues, increaseValues)

    await updateSelectedSkills();
    // 攻撃手段の最終値（displayEquipment -> populateAttackOptions反映後）で
    // A通常攻撃の表示を再計算する。
    await rerenderSkillTables();
}

// キャラクターデータ習得のメイン関数
async function acquireCharacterData(character) {
    const splitCsvList = (value) => String(value ?? "")
        .split(",")
        .map((entry) => String(entry ?? "").trim())
        .filter(Boolean);
    const returnCharacterData = JSON.parse(JSON.stringify(characterData));
    returnCharacterData.name = character.名前
    // equipmentSlots を使って statusCharacter から装備品を取得し、equipmentData に格納
    let equipmentList = [];
    equipmentSlots.forEach((slot, index) => {
        equipmentList[index] = character[slot];
    });
    // 装備欄
    returnCharacterData.equipment = await fetchItem(equipmentList)
    //装備スロットに
    returnCharacterData.equipmentSlot = await assignEquipment(returnCharacterData.equipment)

    DebaglogSet(" returnCharacterData.equipment :", returnCharacterData.equipment, returnCharacterData.equipmentSlot)
    // 素材スキル1 -2 付与スキル1 -3
    const skillsBySlot = getAllUniqueSkills(returnCharacterData.equipmentSlot);
    DebaglogSet(" skillsBySlot :", skillsBySlot);

    //キャラデータ習得
    returnCharacterData.initialClasses = String(character?.[`取得1`] ?? "").slice(4);
    returnCharacterData.acquiredClasses = await addAcquiredClasses(character)

    // DebaglogSet(returnCharacterData.acquiredClasses)
    // return
    DebaglogSet("returnCharacterData :", returnCharacterData)

    returnCharacterData.stats = await statusAll(returnCharacterData.acquiredClasses, returnCharacterData.initialClasses) 

    DebaglogSet("skillNames :", returnCharacterData.stats.skillNames)
    

    const allCollectedSkills = [...skillsBySlot, ...returnCharacterData.stats.skillNames];
    const allUniqueSkills = [...new Set(allCollectedSkills)];
    DebaglogSet(allUniqueSkills);


    returnCharacterData.skills = await fetchSkills(addArrayToArray((allUniqueSkills).filter(name => name !== '魔法強化取得'), addSkill))
    if (!returnCharacterData.skills || typeof returnCharacterData.skills !== "object") {
        returnCharacterData.skills = {};
    }
    if (!Array.isArray(returnCharacterData.skills.P)) {
        returnCharacterData.skills.P = [];
    }
    const magicEnhanceCount = allCollectedSkills.filter((name) => (
        String(name ?? "").trim() === "魔法強化取得"
    )).length;
    returnCharacterData.skills.PA = passiveForEach(returnCharacterData.skills.P)
    
    DebaglogSet("magicEnhanceCount :", magicEnhanceCount)
    // DebaglogSet("statusCharacter.取得魔法 :", character.取得魔法.split(','))

    const magicPowerValue = toFiniteNumber(returnCharacterData?.stats?.skillValues?.["魔力系"]);
    const faithPowerValue = toFiniteNumber(returnCharacterData?.stats?.skillValues?.["信仰系"]);
    const passiveSkillNames = Array.isArray(returnCharacterData?.skills?.P)
        ? returnCharacterData.skills.P
            .map((skill) => String(skill?.和名 || skill?.name || "").trim())
            .filter(Boolean)
        : [];
    const magicAttributes = Array.from(new Set(
        ["属性1", "属性2", "属性3", "属性4", "属性5", "属性6", "属性7"]
            .map((key) => String(character?.[key] ?? "").trim())
            .filter(Boolean)
    ));
    returnCharacterData.magic = await fetchMagics(
        splitCsvList(character?.取得魔法),
        magicEnhanceCount,
        { magicPowerValue, faithPowerValue, magicAttributes, passiveSkillNames, characterName: returnCharacterData.name }
    )
    const characterMagicLog = buildStoryMagicLogSummary(returnCharacterData.magic);
    DebaglogSet("[Story][キャラ魔法設定]", {
        name: returnCharacterData.name,
        M: characterMagicLog.mNames,
        MS: characterMagicLog.msNames
    });





    //  character.持ち物 ? character.持ち物.split(' ') : [];
    returnCharacterData.inventory = await fetchItem(splitCsvList(character?.持ち物))
    returnCharacterData.maxInventory = parseInt(character.手持ち上限)
    returnCharacterData.storage = await fetchItem(splitCsvList(character?.倉庫))
    returnCharacterData.money = parseInt(character.所持金)

    returnCharacterData.teleportLocations = character.転移地点
    returnCharacterData.profile = character.プロフィール
    returnCharacterData.currentLocation = character.転移地点
    returnCharacterData.notes = character.メモ
    returnCharacterData.ultimateSkill = character.必殺技

    DebaglogSet(" HP_消費 :", character)

    returnCharacterData.damage.HP_消費 = parseInt(character.HP_1 || 0)
    returnCharacterData.damage.MP_消費 = parseInt(character.MP_1 || 0)
    returnCharacterData.damage.ST_消費 = parseInt(character.ST_1 || 0)

    // 追加: ダメージ、MP消費、ST消費
    // damage: {       // 受けたダメージ量
    //     HP_消費: 0,      // MPの消費量
    //     MP_消費: 0,      // MPの消費量
    //     ST_消費: 0       // STの消費量
    // },
    
    // 付与スキル1:"爆発撃"
    // 付与スキル2:"強打"
    // 付与スキル3
    // 武器の補正
    // 武器の補正_1
    // 武器の補正_2
    // 素材スキル1
    // 素材スキル2

    returnCharacterData.itemBonuses = await applyItemBonuses(returnCharacterData.equipmentSlot)
    returnCharacterData.skillBonuses = await passiveSkillBonuses(returnCharacterData.skills.PA.passives)
    normalizeCharacterItemState(returnCharacterData);
    DebaglogSet(returnCharacterData.skillBonuses)　　
    return returnCharacterData;
}

function getAllUniqueSkills(equipmentSlot) {
    const allSkills = []; // すべてのスキルを格納する配列

    // 各装備スロットをループ
    for (const slot in equipmentSlot) {
        const equipment = equipmentSlot[slot];

        if (equipment) {
            // 素材スキル1～2を取得
            for (let i = 1; i <= 2; i++) {
                const skillKey = `素材スキル${i}`;
                if (equipment[skillKey]) {
                    allSkills.push(equipment[skillKey]);
                }
            }

            // 付与スキル1～3を取得
            for (let i = 1; i <= 3; i++) {
                const skillKey = `付与スキル${i}`;
                if (equipment[skillKey]) {
                    allSkills.push(equipment[skillKey]);
                }
            }
        }
    }

    // 重複を排除してユニークなスキルのみを返す
    return [...new Set(allSkills)];
}








// キャラクターデータを取得する非同期関数
async function fetchCharacterData(characterName) {
    const encodedName = encodeURIComponent(String(characterName ?? "").trim());
    const response = await fetch(`/api/character?name=${encodedName}`);
    const raw = await response.text();

    let result = null;
    try {
        result = raw ? JSON.parse(raw) : null;
    } catch (error) {
        throw new Error(`キャラクターデータの応答がJSONではありません (HTTP ${response.status})`);
    }

    if (!response.ok) {
        throw new Error(result?.message || `キャラクターデータ取得失敗 (HTTP ${response.status})`);
    }

    if (!result?.success || !result?.data) {
        throw new Error(result?.message || "キャラクターデータが見つかりません");
    }

    return result.data;
}

async function fetchItem(itemList) {
    DebaglogSet(" fetchItem :", itemList)
    try {
        const response = await fetch('/api/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemList: itemList })
        });
        const raw = await response.text();
        let result = null;
        try {
            result = raw ? JSON.parse(raw) : null;
        } catch (parseError) {
            console.error('アイテムデータ取得エラー: JSON解析失敗', parseError);
            return [];
        }

        if (!response.ok) {
            console.error('アイテムデータの取得に失敗しました:', result?.message || `HTTP ${response.status}`);
            return [];
        }

        if (result?.success) {
            DebaglogSet("アイテムデータの取得 :", result.itemData)
            return Array.isArray(result.itemData) ? result.itemData : []
            // statusAll()
        } else {
            console.error('アイテムデータの取得に失敗しました');
            return []
        }
    } catch (error) {
        console.error('アイテムデータ取得エラー:', error);
        return []
    }
}

// 装備スロットに名前を入れる関数
function assignEquipment(equipmentList) {
    // 初期状態の装備スロット
    const equipmentSlot = JSON.parse(JSON.stringify(characterData.equipmentSlot));

    // 装備種別ごとに対応するスロットをマッピング
    const slotMapping = {
        '武器': ['武器', '武器2'],
        '顔': ['顔'],
        '首': ['首'],
        '背中': ['背中'],
        '体': ['体'],
        '下着': ['下着'],
        '腕': ['右腕', '左腕'],
        '手': ['右手', '左手'],
        '腰': ['腰'],
        '足': ['右足', '左足']
    };

    // 各装備アイテムをスロットに割り当てる
    equipmentList.forEach(item => {
        if (!item) return; // item が null の場合はスキップ
        const { 名前, 装備箇所 } = item; // 装備アイテムの名前と種別を取得

        DebaglogSet(" item ", 名前, 装備箇所)

        // 種別に対応するスロットがあれば、スロットに装備を割り当て
        if (slotMapping[装備箇所]) {
            for (let slot of slotMapping[装備箇所]) {
                if (equipmentSlot[slot] === null) { // 空のスロットにのみ割り当て
                    equipmentSlot[slot] = item; //名前
                    break;
                }
            }
        }
    });

    DebaglogSet(" 装備スロットに名前を入れる ", equipmentSlot, equipmentList)

    return equipmentSlot;
}
// もう使えない
// function assignEquipment(equipmentList, equipment) {
//     let index = 0; // equipmentList の現在のインデックス
//     const equipmentSlot = JSON.parse(JSON.stringify(characterData.equipmentSlot));

//     DebaglogSet(" 装備スロットに名前を入れる ", equipmentList, equipment)

//     // equipmentSlot のキーを順番にループして、equipmentList からアイテムを割り当てる
//     Object.keys(equipmentSlot).forEach(slot => {
//         if (index < equipmentList.length) {
//             // DebaglogSet(slot, equipment[index], equipmentSlot)
//             equipmentSlot[slot] = equipment[index];
//             index++;
//         } else {
//             equipmentSlot[slot] = null; // equipmentListが尽きたらnullを割り当て
//         }
//     });

//     DebaglogSet(equipmentSlot)

//     return equipmentSlot
// }

//クラスのLv Ef ステータスを設定 selectedCharacter を入れれば勝手に取得してくれる。
async function addAcquiredClasses(selectedCharacter) {
    DebaglogSet("クラスのLvaddAcquiredClasses ", selectedCharacter)
    let acquiredData = [];

    for (let i = 1; i <= 20; i++) {
        const key = `取得${i}`;
        const value = selectedCharacter[key];
        if (value) {
            // 数字部分とクラス部分を分割
            const lvEf = value.match(/^(\d{2})(\d{2})/); // 最初の4桁を2桁ずつに分ける
            const className = value.slice(4); // 残りの文字列がクラス名
    
            if (lvEf && className) {
                acquiredData.push({
                    Lv: parseInt(lvEf[1], 10),        // 例: "06" → 6
                    Ef: parseInt(lvEf[2], 10),        // 例: "04" → 4
                    職業名: className                  // 例: "ヴォイドヤングドラゴン"
                });
            }
        }
    }

    const classList = await fetchClasses(acquiredData)
    const acquiredClasses= classList.map(cls => {
        // 職業名が一致するオブジェクトを一度だけ取得
        const acquiredClass = getObjectsByConditions(acquiredData, { 職業名: cls.職業名 })[0];
        
        return {
            className: cls.職業名,
            Lv: acquiredClass ? acquiredClass.Lv : null,
            Ef: acquiredClass ? acquiredClass.Ef : null,
            stats: cls
        };
    });

    DebaglogSet("addAcquiredClasses :", acquiredClasses)
    return acquiredClasses
}

// クラスデータを取得する
async function fetchClasses(acquiredData) {
    try {
        const response = await fetch('/api/classes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ classList: acquiredData.map(classData => classData.職業名).filter(Boolean) })
        });
        const result = await response.json();

        if (result.success) {
            DebaglogSet("クラスデータの取得 :", result.classData)
            classData = result.classData
            DebaglogSet("acquiredData :",acquiredData)
            DebaglogSet("classData :",classData)
            return result.classData
            // statusAll()
        } else {
            console.error('クラスデータの取得に失敗しました');
            return []
        }
    } catch (error) {
        console.error('クラスデータ取得エラー:', error);
        return []
    }
}

// 指定した JSON データと条件から一致するオブジェクトを取得する関数
function getObjectsByConditions(data, conditions) {
    return data.filter(item => {
        return Object.entries(conditions).every(([key, value]) => item[key] === value);
    });
}

//データの初期化 初期化したいデータと 初期化したい項目
function initializeProperties(targetObject, itemsToInitialize, initialValue = 0) {
    itemsToInitialize.forEach(item => {
        targetObject[item] = initialValue;
    });
}
// ステータス技能肉体耐性を合計する
async function statusAll(acquiredClasses, initialClasses) {

    const returnStats = JSON.parse(JSON.stringify(characterData.stats)); // JSON.parse(JSON.stringify(characterData));
    initializeProperties(returnStats.levelStats, statuSum);
    initializeProperties(returnStats.skillValues, talents);
    initializeProperties(returnStats.resistances, resistances);
    initializeProperties(returnStats.bodyAttributes, bodyAttributes);
    initializeProperties(returnStats.baseStats, statuSum);
    returnStats.weaknesses = []
    DebaglogSet("returnStats :", returnStats);

    // acquiredData の各要素をループ
    (Array.isArray(acquiredClasses) ? acquiredClasses : []).forEach(acquiredItem => {
        if (!acquiredItem || typeof acquiredItem !== "object") return;
        const classStats = (acquiredItem.stats && typeof acquiredItem.stats === "object")
            ? acquiredItem.stats
            : {};
        // Lv + Ef を計算
        const classLv = parseInt(acquiredItem.Lv, 10) || 0;
        const classEf = parseInt(acquiredItem.Ef, 10) || 0;
        const levelWithEf = classLv + classEf;
        returnStats.allLv += classLv * 10;
        returnStats.allEf += classEf;
        // DebaglogSet("levelWithEf :", levelWithEf);

        // 一致したクラスがある場合のみ合計を計算
        if (acquiredItem.className) {
            // DebaglogSet("Processing class:", acquiredItem.className, acquiredItem.Lv);

            // 各ステータスをレベルに基づいて調整
            statuSum.forEach(stat => {
                const adjustedValue = (parseInt(classStats[stat], 10) / 10) * classLv || 0;
            
                if (stat === "SIZ") {
                    // SIZ の場合は最大値を格納
                    returnStats.levelStats[stat] = Math.max(parseInt(returnStats.levelStats[stat], 10) || 0, parseInt(classStats[stat], 10) || 0);
                } else if (stat === "APP") {
                    // APP の場合はLvをそのまま掛け算
                    returnStats.levelStats[stat] += adjustedValue*10;
                } else {
                    // それ以外のステータスは合計を更新
                    returnStats.levelStats[stat] += adjustedValue;
                }
            
                // DebaglogSet(`Stat [${stat}] adjusted by:`, adjustedValue, "New total:", returnStats.levelStats[stat]);
            });

            // タレントも同様に計算
            talents.forEach(talent => {
                if (classStats[talent] !== undefined) {
                    const talentBaseValue = parseInt(classStats[talent], 10) || 0;
                    const adjustedTalentValue = CLASS_LV_SCALED_TALENTS.has(talent)
                        ? (talentBaseValue * classLv)
                        : ((talentBaseValue / 10) * classLv);
                    returnStats.skillValues[talent] += adjustedTalentValue; // 合計を更新
                    // DebaglogSet(`Talent [${talent}] adjusted by:`, adjustedTalentValue, "New total:", returnStats.skillValues[talent]);
                }
            });

            // 肉体も同様に計算
            bodyAttributes.forEach(attribute => {
                if (classStats[attribute] !== undefined) {
                    const adjustedValue = parseInt(classStats[attribute], 10) || 0;
                    returnStats.bodyAttributes[attribute] = Math.max(returnStats.bodyAttributes[attribute], adjustedValue);
                    // DebaglogSet(`Body attribute [${attribute}] set to:`, adjustedValue ,"  取得データ set to:", returnStats.bodyAttributes[attribute]);
                }
            });

            // 耐性も同様に計算
            resistances.forEach(resistance => {
                if (classStats[resistance] !== undefined) {
                    const adjustedValue = parseInt(classStats[resistance], 10) || 0;
                    returnStats.resistances[resistance] += adjustedValue;
                    // DebaglogSet(`Resistance [${resistance}] adjusted by:`, adjustedValue, "New total:", returnStats.resistances[resistance]);
                }
            });

            // 肉体種別
            if (classStats['肉体'] !== undefined) {
                const adjustedValue = parseInt(classStats['肉体'], 10) || 0;
                returnStats.bodyType = Math.max(returnStats.bodyType, adjustedValue);
                // DebaglogSet(`Body attribute [${attribute}] set to:`, adjustedValue ,"  取得データ set to:", returnStats.bodyAttributes[attribute]);
            }

            // 弱点
            if (classStats['弱点'] !== 0) {
                returnStats.weaknesses.push(classStats['弱点'] ); // 取得したスキルを格納
                // DebaglogSet(`Skill acquired [${skillKey}]:`, acquiredItem.stats[skillKey]);
            }
            if (classStats['弱点2'] !== 0) {
                returnStats.weaknesses.push(classStats['弱点2'] ); // 取得したスキルを格納
                // DebaglogSet(`Skill acquired [${skillKey}]:`, acquiredItem.stats[skillKey]);
            }

            // スキルの取得
            for (let i = 1; i <= levelWithEf; i++) {
                const skillKey = `Lv${i}`;
                if (classStats[skillKey] !== 0) {
                    returnStats.skillNames.push(classStats[skillKey]); // 取得したスキルを格納
                    // DebaglogSet(`Skill acquired [${skillKey}]:`, acquiredItem.stats[skillKey]);
                }
            }
        }
    });
    
    // classData.find(classItem => classItem.職業名 === "ドラゴン")
    DebaglogSet(returnStats.levelStats.HP, parseInt(statusCharacter.Lv), initialClasses, acquiredClasses)
    DebaglogSet(acquiredClasses.find(stats => stats.className === initialClasses))
    DebaglogSet("returnStats.levelStats:", returnStats.levelStats);
    DebaglogSet("returnStats.levelStats.HP:", returnStats.levelStats.HP);
    DebaglogSet("statusCharacter.Lv:", statusCharacter.Lv);
    DebaglogSet("acquiredClasses:", acquiredClasses);
    DebaglogSet("initialClasses:", initialClasses);

    const initialClassEntry = (Array.isArray(acquiredClasses) ? acquiredClasses : []).find(
        (entry) => normalizeBattleText(entry?.className) === normalizeBattleText(initialClasses)
    ) || (Array.isArray(acquiredClasses) ? acquiredClasses : []).find(
        (entry) => entry && typeof entry?.stats === "object"
    ) || null;
    const initialClassStats = (initialClassEntry?.stats && typeof initialClassEntry.stats === "object")
        ? initialClassEntry.stats
        : {};
    DebaglogSet("initialClassStats:", initialClassEntry);

    const safeLevel = Math.max(1, parseInt(statusCharacter?.Lv, 10) || 1);
    const getInitialBase = (key) => parseInt(initialClassStats?.[key], 10) || 0;

    returnStats.baseStats.HP = (parseInt(returnStats.levelStats.HP, 10) / safeLevel) * 2 + getInitialBase("HP") * 0.5
    returnStats.baseStats.MP = (parseInt(returnStats.levelStats.MP, 10) / safeLevel) * 2 + getInitialBase("MP") * 0.5
    returnStats.baseStats.ST = (parseInt(returnStats.levelStats.ST, 10) / safeLevel) * 2 + getInitialBase("ST") * 0.5
    returnStats.baseStats.攻撃 = (parseInt(returnStats.levelStats.攻撃, 10) / safeLevel) * 2 + getInitialBase("攻撃") * 0.5
    returnStats.baseStats.防御 = (parseInt(returnStats.levelStats.防御, 10) / safeLevel) * 2 + getInitialBase("防御") * 0.5
    returnStats.baseStats.魔力 = (parseInt(returnStats.levelStats.魔力, 10) / safeLevel) * 2 + getInitialBase("魔力") * 0.5
    returnStats.baseStats.魔防 = (parseInt(returnStats.levelStats.魔防, 10) / safeLevel) * 2 + getInitialBase("魔防") * 0.5
    returnStats.baseStats.速度 = (parseInt(returnStats.levelStats.速度, 10) / safeLevel) * 2 + getInitialBase("速度") * 0.5
    returnStats.baseStats.命中 = (parseInt(returnStats.levelStats.命中, 10) / safeLevel) * 2 + getInitialBase("命中") * 0.5
    returnStats.baseStats.APP = getInitialBase("APP") * 10
    
    // totalStats.SIZ が 0 の時に 170 にする
    if (returnStats.baseStats.SIZ === 0) {
        returnStats.baseStats.SIZ = 170;
    }
    DebaglogSet("ステータス基盤の設定 :", returnStats)

    return returnStats;
}

// 装備アイテムの上昇値を設定する関数
function applyItemBonuses(equipmentItems) {
    // アイテムボーナスの初期化
    const returnItemBonuses = JSON.parse(JSON.stringify(characterData.itemBonuses));

    DebaglogSet("returnItemBonuses:", returnItemBonuses);
    DebaglogSet("characterData.itemBonuses:", characterData.itemBonuses);
    DebaglogSet(" 装備アイテムの上昇値を設定する関数 :", equipmentItems);
   
    equipmentSlots.forEach(Slots => {
        // 装備スロットが null または undefined でない場合に処理
        if (equipmentItems[Slots] !== null && equipmentItems[Slots] !== undefined) {
            // 基礎ステータス、耐性、肉体値の属性ごとに上昇値を計算
            attributes.forEach(attribute => {
                const adjustedValue = parseInt(equipmentItems[Slots][attribute]) || 0;

                // 初期化していない場合は 0 に設定してから加算
                if (!returnItemBonuses.stats[attribute]) {
                    returnItemBonuses.stats[attribute] = 0;
                }
                returnItemBonuses.stats[attribute] += adjustedValue;
            });
        }
    });
    DebaglogSet("適用されたアイテムボーナス:", returnItemBonuses);
    return returnItemBonuses;
}


//=======================================================
// スキル画面をリセットする
async function displaySkillsReset(){
    ensureSkillTablesStructure();
    skillTableRowGroupSequence = 0;
    // スキルリストの各コンテナをリセット
    const skillTypes = ["A", "S", "Q", "M", "MS", "MQ", "P", "ACTIVE"];
    skillTypes.forEach(type => {
        const container = document.getElementById(`skill-list-${type}`);
        DebaglogSet(" スキル画面をリセットする ", container)
        if (container) {
            // 子要素を削除する方法
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }
        }
    });
}

async function fetchSkills(skillList) {
    DebaglogSet(skillList)
    try {
        const response = await fetch('/api/skills', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ skillNames: skillList })
        });
        const raw = await response.text();
        let result = null;
        try {
            result = raw ? JSON.parse(raw) : null;
        } catch (parseError) {
            console.error('スキルデータ取得エラー: JSON解析失敗', parseError);
            return {};
        }

        if (!response.ok) {
            console.error('スキルデータの取得に失敗しました:', result?.message || `HTTP ${response.status}`);
            return {};
        }

        if (result?.success && result?.skills && typeof result.skills === 'object') {
            return result.skills;
        }
        console.error('スキルデータの取得に失敗しました');
        return {};
    } catch (error) {
        console.error('スキルデータ取得エラー:', error);
        return {};
    }
}

// スキル単体取得
async function fetchSkillsByName(skillList) {
    DebaglogSet('送信するスキル名:', skillList);
    try {
        const response = await fetch('/api/getSkillByName', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ skillNames: skillList }) // 和名リストを送信
        });

        const raw = await response.text();
        let result = null;
        try {
            result = raw ? JSON.parse(raw) : null;
        } catch (parseError) {
            console.error('スキルデータ取得エラー: JSON解析失敗', parseError);
            return [];
        }

        if (response.ok && result.success) {
            // 成功時にスキルデータを返す
            return result.skills;
        } else {
            // 失敗時のエラーメッセージを表示
            console.error('スキルデータの取得に失敗しました:', result.message || '不明なエラー');
        }
    } catch (error) {
        // 通信エラーをキャッチして表示
        console.error('スキルデータ取得エラー:', error);
    }
}

function buildSkillEntryMapByName(skillEntries = []) {
    const map = new Map();
    (Array.isArray(skillEntries) ? skillEntries : []).forEach((entry) => {
        if (!entry || typeof entry !== "object") return;
        const name = normalizeBattleText(entry?.和名 || entry?.技名 || entry?.name);
        if (!name) return;
        if (!map.has(name)) {
            map.set(name, []);
        }
        map.get(name).push(entry);
    });
    return map;
}

async function fetchSkillEntryMapByNames(skillNames = []) {
    const uniqueNames = Array.from(new Set(
        (Array.isArray(skillNames) ? skillNames : [skillNames])
            .map((name) => normalizeBattleText(name))
            .filter(Boolean)
    ));
    if (!uniqueNames.length) {
        return new Map();
    }
    const fetched = await fetchSkillsByName(uniqueNames);
    const fetchedList = Array.isArray(fetched)
        ? fetched.filter((entry) => entry && typeof entry === "object")
        : (fetched && typeof fetched === "object" ? [fetched] : []);
    return buildSkillEntryMapByName(fetchedList);
}

//パッシブ振り分け
function passiveForEach(skillsP){
    // 例: skills.P に格納されたスキルの JSON
    const condPassives = [];  // 条件付きパッシブスキル
    const passives = [];      // 条件なしパッシブスキル
    
    // スキルの振り分け
    skillsP.forEach(skill => {
        // 値のチェックと振り分け

        const hasAttackMethodCondition = isMeaningfulConditionValue(skill?.攻撃手段);
        const hasSkillCondition = isMeaningfulConditionValue(skill?.条件スキル ?? skill?.条件);
        const hasAttributeCondition = isMeaningfulConditionValue(skill?.条件属性);

        if (hasAttackMethodCondition || hasSkillCondition || hasAttributeCondition) {
            // 値がある場合は条件付きパッシブスキルに追加
            condPassives.push(skill);
        } else {
            // それ以外はパッシブスキルに追加
            passives.push(skill);
        }
    });

    // 結果の表示
    DebaglogSet("----- 条件付きパッシブスキル -----");
    DebaglogSet(condPassives);
    DebaglogSet("----- パッシブスキル -----");
    DebaglogSet(passives);

    return {passives: passives, condPassives: condPassives};
}

// パッシブスキルの上昇値を合計する関数（プロパティ指定なし）
function passiveSkillBonuses(passiveSkills) {
    DebaglogSet("パッシブスキルの上昇値を合計する関数（プロパティ指定なし）", passiveSkills);

    // characterData.skillBonuses または stats が存在しない場合、初期化
    // if (!characterData.skillBonuses) {
    //     characterData.skillBonuses = { stats: {} };
    // } else if (!characterData.skillBonuses.stats) {
    //     characterData.skillBonuses.stats = {};
    // }

    // JSON.parse(JSON.stringify(characterData));
    const totalBonuses = JSON.parse(JSON.stringify(characterData.skillBonuses));

    (Array.isArray(passiveSkills) ? passiveSkills : []).forEach(skill => {
        if (!skill || typeof skill !== "object") return;
        skillAttributes.forEach(attr => {
            if (skill.hasOwnProperty(attr)) {
                const currentValue = toFiniteNumber(totalBonuses[attr]);
                const addValue = toFiniteNumber(skill[attr]);
                totalBonuses[attr] = currentValue + addValue;
            }
        });
    });

    return totalBonuses;
}


// 配列に別の配列を追加する関数
function addArrayToArray(targetArray, arrayToAdd) {
    targetArray.push(...arrayToAdd);
    return targetArray;
}

function getSkillNameForStoryMagicLog(skill) {
    if (!skill || typeof skill !== "object") return "";
    return String(skill.和名 || skill.name || "").trim();
}

function normalizeMagicSkillGroupForStory(rawMagics) {
    const source = (rawMagics && typeof rawMagics === "object") ? rawMagics : {};
    const normalizeGroup = (key) => {
        const list = source[key];
        return Array.isArray(list) ? list.filter((entry) => entry && typeof entry === "object") : [];
    };

    return {
        M: normalizeGroup("M"),
        S: normalizeGroup("S"),
        Q: normalizeGroup("Q"),
        A: normalizeGroup("A")
    };
}

function buildStoryMagicLogSummary(magics) {
    const normalized = normalizeMagicSkillGroupForStory(magics);
    const mNames = normalized.M.map(getSkillNameForStoryMagicLog).filter(Boolean);
    // Story 表示では S が MS テーブルに流れる。
    const msNames = normalized.S.map(getSkillNameForStoryMagicLog).filter(Boolean);
    return {
        normalized,
        mNames,
        msNames
    };
}

function normalizeMagicDomainMetaList(rawList = []) {
    return (Array.isArray(rawList) ? rawList : [])
        .map((entry) => {
            const className = String(entry?.className || "").trim();
            const magicList = Array.isArray(entry?.magicList)
                ? entry.magicList.map((name) => String(name || "").trim()).filter(Boolean)
                : [];
            return { className, magicList };
        })
        .filter((entry) => entry.className);
}

function resolveMagicDisplayRank(skillEntry = {}) {
    const magicRank = toFiniteNumber(skillEntry?.魔法Rank);
    if (magicRank > 0) {
        return Math.max(0, Math.floor(magicRank));
    }
    return 0;
}

function extractAcquiredMagicInfoMap(normalizedMagicGroups = {}) {
    const all = [
        ...(Array.isArray(normalizedMagicGroups?.M) ? normalizedMagicGroups.M : []),
        ...(Array.isArray(normalizedMagicGroups?.S) ? normalizedMagicGroups.S : []),
        ...(Array.isArray(normalizedMagicGroups?.Q) ? normalizedMagicGroups.Q : []),
        ...(Array.isArray(normalizedMagicGroups?.A) ? normalizedMagicGroups.A : [])
    ];
    const infoMap = new Map();
    all.forEach((entry) => {
        const name = getSkillNameForStoryMagicLog(entry);
        if (!name) return;
        const rank = resolveMagicDisplayRank(entry);
        const current = infoMap.get(name);
        if (!current || rank > current.rank) {
            infoMap.set(name, { name, rank });
        }
    });
    return infoMap;
}

function buildAcquiredMagicByDomain(domainList = [], acquiredMagicInfoMap = new Map()) {
    return normalizeMagicDomainMetaList(domainList).map((entry) => {
        const className = String(entry?.className || "").trim();
        const attribute = className.endsWith("の領域")
            ? className.slice(0, -("の領域".length))
            : className;
        const magicList = (Array.isArray(entry?.magicList) ? entry.magicList : [])
            .map((name) => {
                const normalizedName = String(name || "").trim();
                const info = acquiredMagicInfoMap.get(normalizedName);
                if (!normalizedName || !info) return null;
                return { name: normalizedName, rank: Math.max(0, toFiniteNumber(info.rank)) };
            })
            .filter(Boolean)
            .sort((a, b) => (b.rank - a.rank) || a.name.localeCompare(b.name, "ja"));
        return { className, attribute, magicList };
    });
}

async function fetchMagics(skillList, magicEnhanceCount, options = {}) {
    function getMagicSkills(skillLevel) {
        // skillLevelが`skills.魔法強化取得の数 として渡されると仮定
        return magicskill.slice(0, skillLevel);
    }

    const selectedSkills = getMagicSkills(magicEnhanceCount);
    const magicSkillslList = addArrayToArray(skillList, selectedSkills);
    const magicPowerValue = toFiniteNumber(options?.magicPowerValue);
    const faithPowerValue = toFiniteNumber(options?.faithPowerValue);
    const maxMagicSystemValue = Math.max(magicPowerValue, faithPowerValue);
    const maxMagicLevel = (maxMagicSystemValue > 0 ? 1 : 0) + (maxMagicSystemValue / 21);
    const magicAttributes = Array.isArray(options?.magicAttributes)
        ? options.magicAttributes
        : [];
    const passiveSkillNames = Array.isArray(options?.passiveSkillNames)
        ? options.passiveSkillNames.map((name) => String(name || "").trim()).filter(Boolean)
        : [];
    const characterName = String(options?.characterName || "").trim();
    try {
        const response = await fetch('/api/magics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                skillNames: magicSkillslList,
                passiveSkillNames,
                magicPowerValue,
                faithPowerValue,
                maxMagicLevel,
                magicAttributes,
                magicSystemValue: maxMagicSystemValue
            })
        });
        const raw = await response.text();
        let result = null;
        try {
            result = raw ? JSON.parse(raw) : null;
        } catch (parseError) {
            console.error('魔法データ取得エラー: JSON解析失敗', parseError);
            return {};
        }

        if (!response.ok) {
            console.error('魔法データの取得に失敗しました:', result?.message || `HTTP ${response.status}`);
            return {};
        }

        if (result?.success) {
            const storyMagicLog = buildStoryMagicLogSummary(result.skills);
            const normalizedDomainList = normalizeMagicDomainMetaList(result?.magicListByDomain);
            const acquiredMagicInfoMap = extractAcquiredMagicInfoMap(storyMagicLog.normalized);
            const acquiredMagicByDomain = buildAcquiredMagicByDomain(normalizedDomainList, acquiredMagicInfoMap);
            DebaglogSet(" 取得魔法 ", storyMagicLog.normalized);
            console.log("[職業領域→魔法リスト]", result?.magicListByDomain || result?.magicList || []);
            console.log("[魔法系統判定]", result?.magicSystemJudge || {});
            console.log("[魔法属性判定]", { attributes: result?.magicAttributes || magicAttributes, realms: result?.realmNames || [] });
            console.log("[魔法取得率補正]", {
                pMagicBoostSkills: Array.isArray(result?.pMagicBoostSkillNames) ? result.pMagicBoostSkillNames : [],
                domainRateBonus: Array.isArray(result?.domainRateBonusSummary) ? result.domainRateBonusSummary : []
            });
            const domainAcquireRateSummary = Array.isArray(result?.domainAcquireRateSummary)
                ? result.domainAcquireRateSummary
                : [];
            const domainAcquireRowsForLog = domainAcquireRateSummary.map((entry) => ({
                characterName,
                domainIndex: Number(entry?.domainIndex ?? -1),
                attribute: String(entry?.attributeName || "").trim(),
                realmName: String(entry?.className || "").trim(),
                effectivePercent: Number(entry?.effectiveRatePercent || 0),
                basePercent: Number(entry?.baseRatePercent || 0),
                progressedBasePercent: Number(entry?.progressedBaseRatePercent || 0),
                bonusPercent: Number(entry?.bonusRatePercent || 0),
                progressPercent: Math.round(Number(entry?.currentRankProgress || 0) * 100)
            }));
            console.log("[魔法取得率詳細]", {
                characterName,
                attributes: result?.magicAttributes || magicAttributes,
                maxRank: result?.magicSystemJudge?.maxMagicLevel ?? null,
                domains: domainAcquireRowsForLog
            });
            console.table(domainAcquireRowsForLog);
            const acquiredMagicRowsForLog = acquiredMagicByDomain.map((entry, index) => {
                const magicNamesWithRank = (Array.isArray(entry?.magicList) ? entry.magicList : [])
                    .map((magic) => `${String(magic?.name || "").trim()}R${Math.max(0, toFiniteNumber(magic?.rank))}`)
                    .filter(Boolean);
                return {
                    characterName,
                    domainIndex: index,
                    attribute: String(entry?.attribute || "").trim(),
                    realmName: String(entry?.className || "").trim(),
                    magicCount: magicNamesWithRank.length,
                    magics: magicNamesWithRank.join(", ")
                };
            });
            console.log("[属性別最終取得魔法]", {
                characterName,
                domains: acquiredMagicRowsForLog
            });
            console.table(acquiredMagicRowsForLog);
            DebaglogSet("[Story][取得魔法一覧][M]", storyMagicLog.mNames);
            DebaglogSet("[Story][取得魔法一覧][MS]", storyMagicLog.msNames);
            console.log("[Story][取得魔法一覧][M]", storyMagicLog.mNames);
            console.log("[Story][取得魔法一覧][MS]", storyMagicLog.msNames);
            magics = {
                ...storyMagicLog.normalized,
                __meta: {
                    magicAttributes: Array.isArray(result?.magicAttributes)
                        ? result.magicAttributes.map((value) => String(value || "").trim()).filter(Boolean)
                        : (Array.isArray(magicAttributes) ? magicAttributes.map((value) => String(value || "").trim()).filter(Boolean) : []),
                    realmNames: Array.isArray(result?.realmNames)
                        ? result.realmNames.map((value) => String(value || "").trim()).filter(Boolean)
                        : [],
                    magicListByDomain: normalizedDomainList,
                    acquiredMagicByDomain
                }
            };

            return magics
        } else {
            console.error('魔法データの取得に失敗しました');
            return {};
        }
    } catch (error) {
        console.error('魔法データ取得エラー:', error);
        return {};
    }
}
// ---------------------
let isFullPower = false;

function updateFullPowerModeUI() {
    const fullPowerBtn = document.getElementById('full-power-btn');
    const skillLeftContainer = document.getElementById('skill-left');
    if (!fullPowerBtn || !skillLeftContainer) return;

    fullPowerBtn.textContent = isFullPower ? "全力モード ON" : "全力モード OFF";
    fullPowerBtn.classList.toggle("full-power", isFullPower);
    fullPowerBtn.setAttribute("aria-pressed", isFullPower ? "true" : "false");
    skillLeftContainer.classList.toggle("full-power", isFullPower);
}

async function setFullPowerMode(nextEnabled, options = {}) {
    const refreshSelected = options?.refreshSelected !== false;
    const refreshStatus = options?.refreshStatus !== false;
    const nextState = Boolean(nextEnabled);
    const changed = isFullPower !== nextState;
    isFullPower = nextState;

    if (changed) {
        updateFullPowerModeUI();
    }
    if (refreshSelected) {
        await updateSelectedSkills();
    }
    if (changed && refreshStatus && typeof refreshTopRightStatusContainer === "function") {
        await refreshTopRightStatusContainer();
    }
}

// 全力モードの切り替え
async function toggleFullPowerMode() {
    await setFullPowerMode(!isFullPower, { refreshSelected: true });
}

function getFullPowerModeState() {
    return Boolean(isFullPower);
}

async function applyFullPowerModeFromSkillSetModal(nextEnabled) {
    await setFullPowerMode(nextEnabled, { refreshSelected: true });
    return buildSkillSetModalPayload();
}
window.getFullPowerModeState = getFullPowerModeState;
window.applyFullPowerModeFromSkillSetModal = applyFullPowerModeFromSkillSetModal;

// 選択されたスキルを格納するオブジェクト
const SELECTED_SKILL_SLOT_ORDER = ["A", "S", "Q1", "Q2", "M"];
function createDefaultSelectedSkills() {
    return {
        A: null,
        S: null,
        Q1: null,
        Q2: null,
        M: null
    };
}

function normalizeSelectedSkillsCharacterName(name) {
    const normalized = String(name ?? "").trim();
    return normalized || "__default__";
}

function sanitizeSelectedSkills(input) {
    const base = createDefaultSelectedSkills();
    if (!input || typeof input !== "object") return base;
    SELECTED_SKILL_SLOT_ORDER.forEach((slot) => {
        base[slot] = input[slot] ?? null;
    });
    return base;
}

const selectedSkillsByCharacter = {};
const SELECTED_SKILLS_STORAGE_KEY = "selected-skills-by-character-v1";
let selectedSkills = createDefaultSelectedSkills();

function loadSelectedSkillsByCharacterFromStorage() {
    try {
        const raw = window.localStorage.getItem(SELECTED_SKILLS_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return;
        Object.entries(parsed).forEach(([key, skills]) => {
            selectedSkillsByCharacter[String(key || "__default__")] = sanitizeSelectedSkills(skills);
        });
    } catch (error) {
        DebaglogSet("selectedSkillsByCharacter の復元に失敗:", error);
    }
}

function persistSelectedSkillsByCharacterToStorage() {
    try {
        const payload = {};
        Object.entries(selectedSkillsByCharacter).forEach(([key, skills]) => {
            payload[key] = sanitizeSelectedSkills(skills);
        });
        window.localStorage.setItem(SELECTED_SKILLS_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
        DebaglogSet("selectedSkillsByCharacter の保存に失敗:", error);
    }
}

loadSelectedSkillsByCharacterFromStorage();

function getSelectedSkillsForCharacter(name) {
    const key = normalizeSelectedSkillsCharacterName(name);
    if (!selectedSkillsByCharacter[key]) {
        selectedSkillsByCharacter[key] = createDefaultSelectedSkills();
    }
    return selectedSkillsByCharacter[key];
}

function saveCurrentCharacterSelectedSkills(name = (selectName || playerData?.name || "")) {
    const key = normalizeSelectedSkillsCharacterName(name);
    selectedSkillsByCharacter[key] = sanitizeSelectedSkills(selectedSkills);
    persistSelectedSkillsByCharacterToStorage();
}

function loadSelectedSkillsForCharacter(name = (selectName || playerData?.name || "")) {
    const skills = getSelectedSkillsForCharacter(name);
    selectedSkills = skills;
    return selectedSkills;
}

function syncSelectedSkillsToCurrentCharacter(name = (selectName || playerData?.name || "")) {
    const key = normalizeSelectedSkillsCharacterName(name);
    selectedSkillsByCharacter[key] = selectedSkills;
    persistSelectedSkillsByCharacterToStorage();
}

function extractSkillNameFromPresetEntry(entry) {
    if (typeof entry === "string") {
        return normalizeBattleText(entry);
    }
    const skillData = getSkillData(entry);
    return normalizeBattleText(skillData?.和名 || skillData?.name || "");
}

function buildSelectedSkillNamesForPreset(source = selectedSkills) {
    const sanitized = sanitizeSelectedSkills(source);
    const names = createDefaultSelectedSkills();
    SELECTED_SKILL_SLOT_ORDER.forEach((slot) => {
        names[slot] = extractSkillNameFromPresetEntry(sanitized?.[slot]) || "";
    });
    return names;
}

function normalizeSelectedSkillsFromPreset(source) {
    const names = createDefaultSelectedSkills();
    const input = source && typeof source === "object" ? source : {};
    SELECTED_SKILL_SLOT_ORDER.forEach((slot) => {
        names[slot] = extractSkillNameFromPresetEntry(input?.[slot]) || "";
    });
    return names;
}

function pickSkillEntryForPresetSlot(slot, skillList = []) {
    if (!Array.isArray(skillList) || skillList.length === 0) return null;
    const normalizedSlot = String(slot || "").trim().toUpperCase();
    const preferredType = normalizedSlot === "M" ? "M" : "";
    if (preferredType) {
        const matched = skillList.find((entry) => (
            String(entry?.種別 || "").trim().toUpperCase() === preferredType
        ));
        if (matched) return matched;
    } else {
        const nonMagic = skillList.find((entry) => (
            String(entry?.種別 || "").trim().toUpperCase() !== "M"
        ));
        if (nonMagic) return nonMagic;
    }
    return skillList[0] || null;
}

function wrapSkillEntryForSelectedSlot(slot, skillEntry) {
    if (!skillEntry || typeof skillEntry !== "object") return null;
    const fallbackType = String(slot || "").trim().toUpperCase() === "M" ? "M" : "A";
    const clickedType = String(skillEntry?.種別 || fallbackType).trim().toUpperCase() || fallbackType;
    return attachDisplaySourceMetaToSkillCollection([{ ...skillEntry }], "skills", clickedType);
}

async function resolvePresetSkillEntryByName(slot, skillName) {
    const normalizedName = normalizeBattleText(skillName);
    if (!normalizedName) return null;
    const fetched = await fetchSkillsByName(normalizedName);
    const skillList = Array.isArray(fetched)
        ? fetched.filter((entry) => entry && typeof entry === "object")
        : (fetched && typeof fetched === "object" ? [fetched] : []);
    if (!skillList.length) return null;
    const selectedEntry = pickSkillEntryForPresetSlot(slot, skillList);
    return wrapSkillEntryForSelectedSlot(slot, selectedEntry);
}

async function buildSelectedSkillsFromPreset(source) {
    const presetSkillNames = normalizeSelectedSkillsFromPreset(source);
    const nextSkills = createDefaultSelectedSkills();
    const presetNames = SELECTED_SKILL_SLOT_ORDER
        .map((slot) => presetSkillNames?.[slot] || "")
        .map((name) => normalizeBattleText(name))
        .filter(Boolean);
    const entryMap = await fetchSkillEntryMapByNames(presetNames);
    const resolvedEntries = SELECTED_SKILL_SLOT_ORDER.map((slot) => {
        const skillName = normalizeBattleText(presetSkillNames?.[slot] || "");
        if (!skillName) return [slot, null];
        const skillList = Array.isArray(entryMap.get(skillName))
            ? entryMap.get(skillName)
            : [];
        if (!skillList.length) return [slot, null];
        const selectedEntry = pickSkillEntryForPresetSlot(slot, skillList);
        return [slot, wrapSkillEntryForSelectedSlot(slot, selectedEntry)];
    });

    resolvedEntries.forEach(([slot, skillEntry]) => {
        nextSkills[slot] = skillEntry;
    });
    return nextSkills;
}

function getSkillSetPresetContext(characterName = (selectName || playerData?.name || "")) {
    return {
        characterName: normalizeBattleText(characterName) || "不明"
    };
}

function buildSkillSetPresetPayload() {
    const selectElement = document.getElementById("attack-method-select");
    const selectedAttackMethod = normalizeBattleText(
        selectElement?.value
        || getSavedAttackOptionForCharacter()
        || ""
    );
    return {
        selectedSkills: buildSelectedSkillNamesForPreset(selectedSkills),
        attackMethod: selectedAttackMethod,
        fullPowerOn: Boolean(isFullPower)
    };
}

async function fetchSkillSetPresetListApi(context = getSkillSetPresetContext()) {
    const response = await fetch('/api/skill-set/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context)
    });
    if (!response.ok) {
        throw new Error(`skill-set list failed: ${response.status}`);
    }
    const result = await response.json();
    if (!result?.success) {
        throw new Error(result?.message || 'skill-set list failed');
    }
    return Array.isArray(result?.presets) ? result.presets : [];
}

async function fetchSkillSetIconListApi() {
    const response = await fetch('/api/skill-set/icons', {
        method: 'GET'
    });
    if (!response.ok) {
        throw new Error(`skill-set icons failed: ${response.status}`);
    }
    const result = await response.json();
    if (!result?.success) {
        throw new Error(result?.message || 'skill-set icons failed');
    }
    return Array.isArray(result?.icons) ? result.icons : [];
}

async function saveSkillSetPresetApi(presetName, payload, context = getSkillSetPresetContext(), presetIcon = null) {
    const hasPresetIcon = typeof presetIcon === "string";
    const response = await fetch('/api/skill-set/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...context,
            presetName: String(presetName || "").trim(),
            ...(hasPresetIcon ? { icon: normalizeBattleText(presetIcon) } : {}),
            payload: payload && typeof payload === "object" ? payload : {}
        })
    });
    if (!response.ok) {
        throw new Error(`skill-set save failed: ${response.status}`);
    }
    const result = await response.json();
    if (!result?.success) {
        throw new Error(result?.message || 'skill-set save failed');
    }
    return result?.preset || null;
}

async function loadSkillSetPresetApi(presetName, context = getSkillSetPresetContext()) {
    const response = await fetch('/api/skill-set/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...context,
            presetName: String(presetName || "").trim()
        })
    });
    if (!response.ok) {
        throw new Error(`skill-set load failed: ${response.status}`);
    }
    const result = await response.json();
    if (!result?.success) {
        throw new Error(result?.message || 'skill-set load failed');
    }
    return result?.preset || null;
}

async function renameSkillSetPresetApi(presetName, newPresetName, presetIcon = null, overwrite = false, context = getSkillSetPresetContext()) {
    const hasPresetIcon = typeof presetIcon === "string";
    const response = await fetch('/api/skill-set/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...context,
            presetName: String(presetName || "").trim(),
            newPresetName: String(newPresetName || "").trim(),
            ...(hasPresetIcon ? { icon: normalizeBattleText(presetIcon) } : {}),
            overwrite: Boolean(overwrite)
        })
    });
    if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        const message = normalizeBattleText(result?.message) || `skill-set rename failed: ${response.status}`;
        const error = new Error(message);
        error.httpStatus = response.status;
        throw error;
    }
    const result = await response.json();
    if (!result?.success) {
        throw new Error(result?.message || 'skill-set rename failed');
    }
    return result?.preset || null;
}

function buildDefaultSkillSetPresetName(presets = []) {
    const list = Array.isArray(presets) ? presets : [];
    const usedNames = new Set(
        list
            .map((entry) => normalizeBattleText(entry?.name))
            .filter(Boolean)
    );
    let index = 1;
    while (usedNames.has(`セット${index}`)) {
        index += 1;
    }
    return `セット${index}`;
}

async function applySkillSetPresetPayload(payload = {}) {
    const nextSkills = await buildSelectedSkillsFromPreset(payload?.selectedSkills);
    selectedSkills = nextSkills;
    syncSelectedSkillsToCurrentCharacter();

    const requestedAttackMethod = normalizeBattleText(payload?.attackMethod || "");
    const selectElement = document.getElementById("attack-method-select");
    if (selectElement) {
        const hasMethodOption = requestedAttackMethod
            && Array.from(selectElement.options || []).some((option) => (
                normalizeBattleText(option?.value) === requestedAttackMethod
            ));
        const nextAttackMethod = hasMethodOption ? requestedAttackMethod : "";
        selectElement.value = nextAttackMethod;
        selectElement.dataset.attackMethodOwner = normalizeBattleText(getCharacterScopedKey());
        selectElement.dataset.attackMethodUserSelected = nextAttackMethod ? "1" : "0";
        saveCurrentAttackOptionForCharacter(nextAttackMethod);
        updateAttackMethodTriggerLabel(nextAttackMethod);
    } else if (requestedAttackMethod) {
        saveCurrentAttackOptionForCharacter(requestedAttackMethod);
    }

    if (typeof payload?.fullPowerOn === "boolean") {
        await setFullPowerMode(Boolean(payload.fullPowerOn), { refreshSelected: false });
    }

    await updateSelectedSkills();
    await rerenderSkillTables();
}

async function openSkillSetPresetSaveDialog() {
    try {
        const result = await saveSkillSetPresetInteractive({ notify: true });
        if (result?.status === "saved") {
            return result;
        }
    } catch (error) {
        console.error("skill-set preset save error:", error);
        window.alert("スキルセット登録に失敗しました");
    }
    return null;
}

async function openSkillSetPresetLoadDialog() {
    try {
        const result = await loadSkillSetPresetInteractive({ notify: true });
        if (result?.status === "loaded") {
            return result;
        }
    } catch (error) {
        console.error("skill-set preset load error:", error);
        window.alert("スキルセット呼出に失敗しました");
    }
    return null;
}

async function saveSkillSetPresetInteractive(options = {}) {
    const notify = options?.notify !== false;
    const hasPresetIcon = typeof options?.presetIcon === "string";
    const presetIcon = hasPresetIcon ? normalizeBattleText(options?.presetIcon) : null;
    const context = getSkillSetPresetContext();
    const presets = await fetchSkillSetPresetListApi(context);
    const defaultName = buildDefaultSkillSetPresetName(presets);
    const inputName = window.prompt("登録するスキルセット名を入力してください", defaultName);
    const presetName = String(inputName || "").trim();
    if (!presetName) {
        return { status: "cancelled", presetName: "" };
    }

    const exists = presets.some((entry) => normalizeBattleText(entry?.name) === normalizeBattleText(presetName));
    if (exists) {
        const overwrite = window.confirm(`「${presetName}」は既にあります。上書きしますか？`);
        if (!overwrite) {
            return { status: "cancelled", presetName };
        }
    }

    await saveSkillSetPresetApi(presetName, buildSkillSetPresetPayload(), context, presetIcon);
    if (notify) {
        window.alert(`スキルセットを登録しました: ${presetName}`);
    }
    return { status: "saved", presetName, icon: presetIcon };
}

async function loadSkillSetPresetInteractive(options = {}) {
    const notify = options?.notify !== false;
    const context = getSkillSetPresetContext();
    const presets = await fetchSkillSetPresetListApi(context);
    if (!presets.length) {
        if (notify) {
            window.alert("登録済みスキルセットがありません");
        }
        return { status: "empty", presetName: "" };
    }

    const lines = presets.map((entry, index) => `${index + 1}. ${entry?.name || ""}`).join("\n");
    const input = window.prompt(`呼び出す番号または名前を入力してください\n${lines}`, "1");
    const raw = String(input || "").trim();
    if (!raw) {
        return { status: "cancelled", presetName: "" };
    }

    const numeric = Number(raw);
    const selectedByIndex = Number.isInteger(numeric) && numeric >= 1 && numeric <= presets.length
        ? presets[numeric - 1]
        : null;
    const selectedByName = selectedByIndex || presets.find((entry) => (
        normalizeBattleText(entry?.name) === normalizeBattleText(raw)
    ));

    const presetName = String(selectedByName?.name || "").trim();
    if (!presetName) {
        if (notify) {
            window.alert("指定されたスキルセットが見つかりません");
        }
        return { status: "not_found", presetName: raw };
    }

    const loaded = await loadSkillSetPresetApi(presetName, context);
    await applySkillSetPresetPayload(loaded?.payload || {});
    if (notify) {
        window.alert(`スキルセットを呼び出しました: ${presetName}`);
    }
    return {
        status: "loaded",
        presetName,
        payload: loaded?.payload || {}
    };
}

function buildSkillSetPresetModalRefreshResult(result = {}) {
    if (!result || typeof result !== "object") {
        return { status: "cancelled", presetName: "" };
    }
    if (result.status !== "saved" && result.status !== "loaded") {
        return result;
    }
    return {
        ...result,
        payload: buildSkillSetModalPayload()
    };
}

async function saveSkillSetPresetFromSkillSetModal(presetName, presetIcon, overwrite = false) {
    const normalizedName = normalizeBattleText(presetName);
    if (!normalizedName) {
        return { status: "cancelled", presetName: "" };
    }
    const normalizedIcon = normalizeBattleText(presetIcon);
    const context = getSkillSetPresetContext();
    const presets = await fetchSkillSetPresetListApi(context);
    const exists = presets.some((entry) => normalizeBattleText(entry?.name) === normalizedName);
    if (exists && !overwrite) {
        return {
            status: "exists",
            presetName: normalizedName,
            icon: normalizedIcon
        };
    }
    await saveSkillSetPresetApi(normalizedName, buildSkillSetPresetPayload(), context, normalizedIcon);
    const result = {
        status: "saved",
        presetName: normalizedName,
        icon: normalizedIcon
    };
    return buildSkillSetPresetModalRefreshResult(result);
}

async function loadSkillSetPresetFromSkillSetModal() {
    const result = await loadSkillSetPresetInteractive({ notify: false });
    return buildSkillSetPresetModalRefreshResult(result);
}

async function listSkillSetPresetsForSkillSetModal() {
    const context = getSkillSetPresetContext();
    const presets = await fetchSkillSetPresetListApi(context);
    return presets.map((entry) => ({
        name: normalizeBattleText(entry?.name),
        icon: normalizeBattleText(entry?.icon),
        iconUrl: normalizeBattleText(entry?.iconUrl),
        updatedAt: normalizeBattleText(entry?.updatedAt)
    })).filter((entry) => entry.name);
}

async function listSkillSetIconsForSkillSetModal() {
    const icons = await fetchSkillSetIconListApi();
    return icons.map((entry) => ({
        name: normalizeBattleText(entry?.name),
        url: normalizeBattleText(entry?.url)
    })).filter((entry) => entry.name && entry.url);
}

async function loadSkillSetPresetByNameFromSkillSetModal(presetName) {
    const normalizedPresetName = normalizeBattleText(presetName);
    if (!normalizedPresetName) {
        return { status: "cancelled", presetName: "" };
    }
    const context = getSkillSetPresetContext();
    const loaded = await loadSkillSetPresetApi(normalizedPresetName, context);
    await applySkillSetPresetPayload(loaded?.payload || {});
    return buildSkillSetPresetModalRefreshResult({
        status: "loaded",
        presetName: normalizedPresetName,
        icon: normalizeBattleText(loaded?.icon),
        iconUrl: normalizeBattleText(loaded?.iconUrl),
        payload: loaded?.payload || {}
    });
}

async function renameSkillSetPresetFromSkillSetModal(presetName, newPresetName, presetIcon = null, overwrite = false) {
    const currentName = normalizeBattleText(presetName);
    if (!currentName) {
        return { status: "cancelled", presetName: "" };
    }
    const nextName = normalizeBattleText(newPresetName);
    if (!nextName) {
        return { status: "cancelled", presetName: currentName };
    }

    const normalizedIcon = typeof presetIcon === "string"
        ? normalizeBattleText(presetIcon)
        : null;
    const context = getSkillSetPresetContext();
    const renamedPreset = await renameSkillSetPresetApi(
        currentName,
        nextName,
        normalizedIcon,
        overwrite,
        context
    );
    return {
        status: "renamed",
        oldPresetName: currentName,
        presetName: normalizeBattleText(renamedPreset?.name) || nextName,
        icon: normalizeBattleText(renamedPreset?.icon),
        iconUrl: normalizeBattleText(renamedPreset?.iconUrl),
        payload: buildSkillSetModalPayload()
    };
}

window.openSkillSetPresetSaveDialog = openSkillSetPresetSaveDialog;
window.openSkillSetPresetLoadDialog = openSkillSetPresetLoadDialog;
window.saveSkillSetPresetFromSkillSetModal = saveSkillSetPresetFromSkillSetModal;
window.loadSkillSetPresetFromSkillSetModal = loadSkillSetPresetFromSkillSetModal;
window.listSkillSetPresetsForSkillSetModal = listSkillSetPresetsForSkillSetModal;
window.listSkillSetIconsForSkillSetModal = listSkillSetIconsForSkillSetModal;
window.loadSkillSetPresetByNameFromSkillSetModal = loadSkillSetPresetByNameFromSkillSetModal;
window.renameSkillSetPresetFromSkillSetModal = renameSkillSetPresetFromSkillSetModal;

const selectedAttackOptionByCharacter = {};
const SELECTED_ATTACK_OPTION_STORAGE_KEY = "selected-attack-option-by-character-v1";
const retainedBuffSkillsByCharacter = {};
const skillCooldownsByCharacter = {};
const battleTurnByCharacter = {};
const damageByCharacter = {};
const RETAINED_BUFF_INFINITE_TURNS = 9999999;
const BATTLE_STATE_SAVE_DEBOUNCE_MS = 300;
let battleStateLoadedPlayerId = "";
let battleStateLoadPromise = null;
const pendingBattleStateSaveCharacterNames = new Set();
let battleStateSaveTimerId = null;
let battleStateSaveInFlight = false;

function loadSelectedAttackOptionByCharacterFromStorage() {
    try {
        const raw = window.localStorage.getItem(SELECTED_ATTACK_OPTION_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return;
        Object.entries(parsed).forEach(([key, value]) => {
            const normalized = normalizeBattleText(value);
            if (!normalized) return;
            selectedAttackOptionByCharacter[String(key || "__default__")] = normalized;
        });
    } catch (error) {
        DebaglogSet("selectedAttackOptionByCharacter の復元に失敗:", error);
    }
}

function persistSelectedAttackOptionByCharacterToStorage() {
    try {
        window.localStorage.setItem(
            SELECTED_ATTACK_OPTION_STORAGE_KEY,
            JSON.stringify(selectedAttackOptionByCharacter)
        );
    } catch (error) {
        DebaglogSet("selectedAttackOptionByCharacter の保存に失敗:", error);
    }
}

loadSelectedAttackOptionByCharacterFromStorage();

function getCharacterScopedKey(name = (selectName || playerData?.name || "")) {
    return normalizeSelectedSkillsCharacterName(name);
}

function normalizeStoredDamageEntry(damage) {
    const source = (damage && typeof damage === "object") ? damage : {};
    return {
        HP_消費: clampNumber(Math.round(toFiniteNumber(source?.HP_消費)), 0, 100),
        MP_消費: Math.max(0, Math.round(toFiniteNumber(source?.MP_消費))),
        ST_消費: Math.max(0, Math.round(toFiniteNumber(source?.ST_消費)))
    };
}

function getCurrentPlayerIdForBattleState() {
    if (typeof getCurrentPlayerIdForMemo === "function") {
        const resolved = normalizeBattleText(getCurrentPlayerIdForMemo());
        if (resolved) return resolved;
    }
    const raw = window.sessionStorage.getItem("playerId")
        || window.sessionStorage.getItem("username")
        || window.localStorage.getItem("playerId")
        || window.localStorage.getItem("username")
        || "";
    return normalizeBattleText(raw) || "guest";
}

function normalizeRetainedBuffSkillsForPersist(skills = []) {
    return (Array.isArray(skills) ? skills : [])
        .map((entry) => normalizeRetainedBuffEntry(entry))
        .filter((entry) => entry && entry.skillData && toFiniteNumber(entry.remainingTurns) > 0);
}

function normalizeSkillCooldownEntry(entry = {}) {
    const source = (entry && typeof entry === "object") ? entry : {};
    const signatureText = normalizeBattleText(source?.signature);
    const signatureParts = signatureText ? signatureText.split("::") : [];
    const skillName = normalizeBattleText(source?.skillName || source?.name || signatureParts[1] || "");
    const skillType = normalizeBattleText(source?.skillType || source?.type || signatureParts[0] || "").toUpperCase();
    const signature = normalizeBattleText(
        signatureText
        || getSkillCooldownSignature({ 和名: skillName, 種別: skillType })
    );
    if (!signature) return null;

    const totalTurnsRaw = toFiniteNumber(source?.totalTurns ?? source?.cooldownTurns);
    const totalTurns = Math.max(0, Math.round(totalTurnsRaw));
    const remainingTurnsRaw = Number.isFinite(Number(source?.remainingTurns))
        ? toFiniteNumber(source?.remainingTurns)
        : (totalTurns - toFiniteNumber(source?.elapsedTurns));
    const remainingTurns = Math.max(0, Math.round(remainingTurnsRaw));
    if (totalTurns <= 0 || remainingTurns <= 0) return null;

    return {
        signature,
        skillName: skillName || normalizeBattleText(source?.skillName),
        skillType,
        totalTurns,
        remainingTurns,
        pendingWhileActive: Boolean(source?.pendingWhileActive)
    };
}

function normalizeSkillCooldownEntriesForPersist(entries = []) {
    return (Array.isArray(entries) ? entries : [])
        .map((entry) => normalizeSkillCooldownEntry(entry))
        .filter((entry) => Boolean(entry));
}

function normalizeBattleStateCharacterEntryFromApi(entry = {}) {
    const source = (entry && typeof entry === "object") ? entry : {};
    return {
        battleTurn: Math.max(1, Math.round(toFiniteNumber(source?.battleTurn) || 1)),
        retainedBuffSkills: normalizeRetainedBuffSkillsForPersist(source?.retainedBuffSkills),
        skillCooldowns: normalizeSkillCooldownEntriesForPersist(source?.skillCooldowns),
        damage: normalizeStoredDamageEntry(source?.damage)
    };
}

function serializeRetainedBuffSkillsForBattleState(skills = []) {
    return (Array.isArray(skills) ? skills : [])
        .map((entry) => normalizeRetainedBuffEntry(entry))
        .filter((entry) => entry && entry.skillData && toFiniteNumber(entry.remainingTurns) > 0)
        .map((entry) => {
            const totalTurns = normalizeRetainedBuffTurns(entry?.totalTurns, 1);
            const remainingTurns = normalizeRetainedBuffTurns(entry?.remainingTurns, totalTurns);
            const elapsedTurns = isInfiniteRetainedBuffTurns(totalTurns)
                ? 0
                : Math.max(0, totalTurns - remainingTurns);
            const skillData = entry?.skillData || {};
            return {
                skillName: normalizeBattleText(skillData?.和名 || skillData?.技名 || skillData?.name),
                skillType: normalizeBattleText(skillData?.種別 || ""),
                totalTurns,
                elapsedTurns
            };
        })
        .filter((entry) => Boolean(entry.skillName));
}

function serializeSkillCooldownEntriesForBattleState(entries = []) {
    return (Array.isArray(entries) ? entries : [])
        .map((entry) => normalizeSkillCooldownEntry(entry))
        .filter((entry) => Boolean(entry))
        .map((entry) => ({
            skillName: normalizeBattleText(entry.skillName),
            skillType: normalizeBattleText(entry.skillType),
            cooldownTurns: Math.max(0, Math.round(toFiniteNumber(entry.totalTurns))),
            elapsedTurns: Math.max(0, Math.round(toFiniteNumber(entry.totalTurns) - toFiniteNumber(entry.remainingTurns))),
            pendingWhileActive: Boolean(entry.pendingWhileActive)
        }))
        .filter((entry) => Boolean(entry.skillName) && entry.cooldownTurns > 0);
}

function clearBattleStateMemoryMaps() {
    Object.keys(retainedBuffSkillsByCharacter).forEach((key) => delete retainedBuffSkillsByCharacter[key]);
    Object.keys(skillCooldownsByCharacter).forEach((key) => delete skillCooldownsByCharacter[key]);
    Object.keys(battleTurnByCharacter).forEach((key) => delete battleTurnByCharacter[key]);
    Object.keys(damageByCharacter).forEach((key) => delete damageByCharacter[key]);
}

function applyBattleStateFromApi(states = {}) {
    DebaglogSet("[ApplyBattleState] 開始", {
        receivedStates: states,
        stateKeys: Object.keys(states),
        stateCount: Object.keys(states).length
    });
    clearBattleStateMemoryMaps();
    if (!states || typeof states !== "object") {
        DebaglogSet("[ApplyBattleState] states is falsy");
        return;
    }
    Object.entries(states).forEach(([characterName, entry]) => {
        const normalizedName = normalizeBattleText(characterName);
        DebaglogSet("[ApplyBattleState] Processing", {
            rawName: characterName,
            normalizedName,
            entryKeys: entry ? Object.keys(entry) : null,
            retainedBuffSkillsCount: Array.isArray(entry?.retainedBuffSkills) ? entry.retainedBuffSkills.length : 0
        });
        if (!normalizedName) return;
        const key = getCharacterScopedKey(normalizedName);
        DebaglogSet("[ApplyBattleState] Storing with key", {
            characterName: normalizedName,
            key,
            retainedBuffSkillsCount: Array.isArray(entry?.retainedBuffSkills) ? entry.retainedBuffSkills.length : 0
        });
        const normalizedEntry = normalizeBattleStateCharacterEntryFromApi(entry);
        retainedBuffSkillsByCharacter[key] = normalizedEntry.retainedBuffSkills;
        skillCooldownsByCharacter[key] = normalizedEntry.skillCooldowns;
        battleTurnByCharacter[key] = normalizedEntry.battleTurn;
        damageByCharacter[key] = normalizedEntry.damage;
    });
    DebaglogSet("[ApplyBattleState] 完了", {
        allKeys: Object.keys(retainedBuffSkillsByCharacter),
        entryCounts: Object.fromEntries(
            Object.entries(retainedBuffSkillsByCharacter).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])
        )
    });
}

async function loadBattleStateFromApi(characterNames = []) {
    const playerId = getCurrentPlayerIdForBattleState();
    const requestBody = {
        playerId,
        characterNames: (Array.isArray(characterNames) ? characterNames : [])
            .map((name) => normalizeBattleText(name))
            .filter(Boolean)
    };
    DebaglogSet("[loadBattleStateFromApi] fetch 開始", requestBody);
    const response = await fetch('/api/battle-state/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    });
    DebaglogSet("[loadBattleStateFromApi] fetch 完了", {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText
    });
    if (!response.ok) {
        throw new Error(`battle-state load failed: ${response.status}`);
    }
    const result = await response.json();
    DebaglogSet("[loadBattleStateFromApi] JSON parse 完了", {
        success: result?.success,
        message: result?.message,
        updatedAt: result?.updatedAt,
        statesType: typeof result?.states,
        statesKeys: result?.states ? Object.keys(result.states) : null,
        statesCount: result?.states ? Object.keys(result.states).length : 0,
        fullResult: result
    });
    if (!result?.success) {
        throw new Error(result?.message || "battle-state load failed");
    }
    return (result?.states && typeof result.states === "object") ? result.states : {};
}

async function ensureBattleStateLoadedFromApi(forceReload = false) {
    const playerId = getCurrentPlayerIdForBattleState();
    if (!forceReload && battleStateLoadedPlayerId === playerId && battleStateLoadPromise) {
        return battleStateLoadPromise;
    }

    battleStateLoadedPlayerId = playerId;
    battleStateLoadPromise = (async () => {
        try {
            DebaglogSet("[ensureBattleStateLoadedFromApi] API 呼び出し開始", { playerId });
            const states = await loadBattleStateFromApi();
            DebaglogSet("[ensureBattleStateLoadedFromApi] API 呼び出し完了", {
                playerId,
                statesType: typeof states,
                statesKeys: states ? Object.keys(states) : null,
                statesCount: states ? Object.keys(states).length : 0,
                fullStates: states
            });
            applyBattleStateFromApi(states);
            return states;
        } catch (error) {
            DebaglogSet("battle state load failed:", error);
            clearBattleStateMemoryMaps();
            return {};
        }
    })();

    return battleStateLoadPromise;
}

function buildBattleStatePayloadForCharacter(characterName = (selectName || playerData?.name || "")) {
    const normalizedName = normalizeBattleText(characterName);
    const key = getCharacterScopedKey(normalizedName);
    return {
        battleTurn: Math.max(1, Math.round(toFiniteNumber(battleTurnByCharacter[key]) || 1)),
        retainedBuffSkills: serializeRetainedBuffSkillsForBattleState(retainedBuffSkillsByCharacter[key]),
        skillCooldowns: serializeSkillCooldownEntriesForBattleState(skillCooldownsByCharacter[key]),
        damage: normalizeStoredDamageEntry(damageByCharacter[key])
    };
}

function trimBattleStatePayloadForApi(state = {}) {
    const source = (state && typeof state === "object") ? state : {};
    const retainedBuffSkills = (Array.isArray(source?.retainedBuffSkills) ? source.retainedBuffSkills : [])
        .map((entry) => {
            const totalTurns = Math.max(0, Math.round(toFiniteNumber(entry?.totalTurns)));
            const remainingTurns = Math.max(0, Math.round(toFiniteNumber(entry?.remainingTurns)));
            const elapsedTurnsRaw = Number.isFinite(Number(entry?.elapsedTurns))
                ? toFiniteNumber(entry?.elapsedTurns)
                : Math.max(0, totalTurns - remainingTurns);
            return {
                skillName: normalizeBattleText(entry?.skillName),
                skillType: normalizeBattleText(entry?.skillType || entry?.type).toUpperCase(),
                totalTurns,
                elapsedTurns: Math.max(0, Math.round(elapsedTurnsRaw))
            };
        })
        .filter((entry) => Boolean(entry.skillName) && entry.totalTurns > 0);
    const skillCooldowns = (Array.isArray(source?.skillCooldowns) ? source.skillCooldowns : [])
        .map((entry) => {
            const cooldownTurns = Math.max(0, Math.round(toFiniteNumber(entry?.cooldownTurns ?? entry?.totalTurns)));
            const remainingTurns = Math.max(0, Math.round(toFiniteNumber(entry?.remainingTurns)));
            const elapsedTurnsRaw = Number.isFinite(Number(entry?.elapsedTurns))
                ? toFiniteNumber(entry?.elapsedTurns)
                : Math.max(0, cooldownTurns - remainingTurns);
            return {
                skillName: normalizeBattleText(entry?.skillName),
                skillType: normalizeBattleText(entry?.skillType || entry?.type).toUpperCase(),
                cooldownTurns,
                elapsedTurns: Math.max(0, Math.round(elapsedTurnsRaw)),
                pendingWhileActive: Boolean(entry?.pendingWhileActive)
            };
        })
        .filter((entry) => Boolean(entry.skillName) && entry.cooldownTurns > 0);

    return {
        battleTurn: Math.max(1, Math.round(toFiniteNumber(source?.battleTurn) || 1)),
        retainedBuffSkills,
        skillCooldowns,
        damage: normalizeStoredDamageEntry(source?.damage)
    };
}

async function saveBattleStateForCharacterToApi(characterName = (selectName || playerData?.name || "")) {
    const normalizedName = normalizeBattleText(characterName);
    if (!normalizedName) return;
    const rawState = buildBattleStatePayloadForCharacter(normalizedName);
    const state = trimBattleStatePayloadForApi(rawState);

    const response = await fetch('/api/battle-state/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            playerId: getCurrentPlayerIdForBattleState(),
            characterName: normalizedName,
            state
        })
    });
    if (!response.ok) {
        throw new Error(`battle-state save failed: ${response.status}`);
    }
    const result = await response.json();
    if (!result?.success) {
        throw new Error(result?.message || "battle-state save failed");
    }
}

async function flushBattleStateSaveQueue() {
    if (battleStateSaveInFlight) return;
    battleStateSaveInFlight = true;
    try {
        while (pendingBattleStateSaveCharacterNames.size > 0) {
            const names = Array.from(pendingBattleStateSaveCharacterNames);
            pendingBattleStateSaveCharacterNames.clear();
            for (const name of names) {
                try {
                    await saveBattleStateForCharacterToApi(name);
                } catch (error) {
                    DebaglogSet("battle state save failed:", name, error);
                }
            }
        }
    } finally {
        battleStateSaveInFlight = false;
    }
}

function queueBattleStateSaveForCharacter(characterName = (selectName || playerData?.name || "")) {
    const normalizedName = normalizeBattleText(characterName);
    if (!normalizedName) return;
    pendingBattleStateSaveCharacterNames.add(normalizedName);
    if (battleStateSaveTimerId) {
        window.clearTimeout(battleStateSaveTimerId);
    }
    battleStateSaveTimerId = window.setTimeout(() => {
        battleStateSaveTimerId = null;
        flushBattleStateSaveQueue().catch((error) => {
            DebaglogSet("battle state flush failed:", error);
        });
    }, BATTLE_STATE_SAVE_DEBOUNCE_MS);
}

async function saveBattleStateForCharacterNow(characterName = (selectName || playerData?.name || "")) {
    const normalizedName = normalizeBattleText(characterName);
    if (!normalizedName) return;
    pendingBattleStateSaveCharacterNames.delete(normalizedName);
    if (battleStateSaveTimerId) {
        window.clearTimeout(battleStateSaveTimerId);
        battleStateSaveTimerId = null;
    }
    try {
        await saveBattleStateForCharacterToApi(normalizedName);
    } catch (error) {
        DebaglogSet("battle state immediate save failed:", normalizedName, error);
    }
}

function setDamageStateForCharacter(characterName = (selectName || playerData?.name || ""), damage = {}) {
    const normalizedName = normalizeBattleText(characterName);
    if (!normalizedName) {
        return normalizeStoredDamageEntry(damage);
    }
    const key = getCharacterScopedKey(normalizedName);
    const normalizedDamage = normalizeStoredDamageEntry(damage);
    damageByCharacter[key] = { ...normalizedDamage };
    return damageByCharacter[key];
}

function applyStoredDamageStateToCharacter(character, name = "") {
    if (!character || typeof character !== "object") return;
    const scopedName = normalizeBattleText(name || character?.name || selectName || playerData?.name || "");
    if (!scopedName) return;
    const key = getCharacterScopedKey(scopedName);
    const runtimeDamage = normalizeStoredDamageEntry(character?.damage || {});
    const storedDamage = normalizeStoredDamageEntry(damageByCharacter[key] || {});
    const mergedDamage = {
        HP_消費: Math.max(runtimeDamage.HP_消費, storedDamage.HP_消費),
        MP_消費: Math.max(runtimeDamage.MP_消費, storedDamage.MP_消費),
        ST_消費: Math.max(runtimeDamage.ST_消費, storedDamage.ST_消費)
    };
    character.damage = { ...mergedDamage };
    setDamageStateForCharacter(scopedName, mergedDamage);
}

function getRetainedBuffSkillsForCharacter(name = (selectName || playerData?.name || "")) {
    const key = getCharacterScopedKey(name);
    if (!Array.isArray(retainedBuffSkillsByCharacter[key])) {
        retainedBuffSkillsByCharacter[key] = [];
    }
    return retainedBuffSkillsByCharacter[key];
}

function getSkillCooldownEntriesForCharacter(name = (selectName || playerData?.name || "")) {
    const key = getCharacterScopedKey(name);
    if (!Array.isArray(skillCooldownsByCharacter[key])) {
        skillCooldownsByCharacter[key] = [];
    }
    return skillCooldownsByCharacter[key];
}

function setSkillCooldownEntriesForCharacter(name = (selectName || playerData?.name || ""), entries = []) {
    const key = getCharacterScopedKey(name);
    skillCooldownsByCharacter[key] = normalizeSkillCooldownEntriesForPersist(entries);
    queueBattleStateSaveForCharacter(name);
    return skillCooldownsByCharacter[key];
}

function getSkillCooldownEntryBySignature(signature = "", name = (selectName || playerData?.name || "")) {
    const normalizedSignature = normalizeBattleText(signature);
    if (!normalizedSignature) return null;
    const entries = getSkillCooldownEntriesForCharacter(name);
    return entries.find((entry) => normalizeBattleText(entry?.signature) === normalizedSignature) || null;
}

function upsertSkillCooldownEntryForCharacter(name = (selectName || playerData?.name || ""), entry = null) {
    const normalizedEntry = normalizeSkillCooldownEntry(entry);
    if (!normalizedEntry) return null;
    const entries = getSkillCooldownEntriesForCharacter(name);
    const index = entries.findIndex((row) => normalizeBattleText(row?.signature) === normalizedEntry.signature);
    if (index >= 0) {
        entries[index] = normalizedEntry;
    } else {
        entries.push(normalizedEntry);
    }
    setSkillCooldownEntriesForCharacter(name, entries);
    return normalizedEntry;
}

function normalizeRetainedBuffTurns(value, fallback = 1) {
    const numericValue = Math.max(0, Math.round(toFiniteNumber(value)));
    const fallbackValue = Math.max(1, Math.round(toFiniteNumber(fallback) || 1));
    const resolved = numericValue > 0 ? numericValue : fallbackValue;
    if (resolved >= RETAINED_BUFF_INFINITE_TURNS) {
        return RETAINED_BUFF_INFINITE_TURNS;
    }
    return resolved;
}

function isInfiniteRetainedBuffTurns(value) {
    return Math.round(toFiniteNumber(value)) >= RETAINED_BUFF_INFINITE_TURNS;
}

function normalizeRetainedBuffEntry(entry) {
    if (!entry || typeof entry !== "object") return null;
    
    // API 形式: { skillName, skillType, totalTurns, elapsedTurns }
    const apiSkillName = normalizeBattleText(entry?.skillName || "");
    const apiSkillType = normalizeBattleText(entry?.skillType || "").toUpperCase();
    
    // JSON 簡略形式: { skillData: { skillName, skillType, ... }, totalTurns, remainingTurns, ... }
    const compactSkillName = normalizeBattleText(entry?.name || apiSkillName || "");
    const compactSkillType = normalizeBattleText(entry?.type || apiSkillType || "").toUpperCase();
    
    // API 形式の場合、API から返ってくるのは elapsedTurns と totalTurns
    if (apiSkillName && (entry?.hasOwnProperty?.("elapsedTurns") || entry?.hasOwnProperty?.("totalTurns"))) {
        const totalTurns = normalizeRetainedBuffTurns(entry?.totalTurns, 1);
        const elapsedTurns = toFiniteNumber(entry?.elapsedTurns);
        const remainingTurns = isInfiniteRetainedBuffTurns(totalTurns)
            ? RETAINED_BUFF_INFINITE_TURNS
            : normalizeRetainedBuffTurns(totalTurns - elapsedTurns, totalTurns);
        
        if (!isInfiniteRetainedBuffTurns(remainingTurns) && remainingTurns <= 0) return null;
        
        const stubSkillData = {
            和名: apiSkillName,
            技名: apiSkillName,
            name: apiSkillName,
            種別: apiSkillType
        };
        DebaglogSet("[NormalizeRetainedBuff][APIFormat]", {
            skillName: apiSkillName,
            skillType: apiSkillType,
            totalTurns,
            remainingTurns
        });
        return {
            skillData: stubSkillData,
            hasEffectDuration: true,
            totalTurns,
            remainingTurns
        };
    }
    
    // JSON 形式（stab）: entry に skillData がない
    if (!entry.skillData && compactSkillName) {
        const totalTurns = normalizeRetainedBuffTurns(entry?.totalTurns, 1);
        const remainingTurnsRaw = Number.isFinite(Number(entry?.remainingTurns))
            ? toFiniteNumber(entry?.remainingTurns)
            : (totalTurns - toFiniteNumber(entry?.elapsedTurns));
        const remainingTurns = isInfiniteRetainedBuffTurns(totalTurns)
            ? RETAINED_BUFF_INFINITE_TURNS
            : normalizeRetainedBuffTurns(remainingTurnsRaw, totalTurns);
        if (!isInfiniteRetainedBuffTurns(remainingTurns) && remainingTurns <= 0) return null;
        const stubSkillData = {
            和名: compactSkillName,
            技名: compactSkillName,
            name: compactSkillName,
            種別: compactSkillType
        };
        return {
            skillData: stubSkillData,
            hasEffectDuration: true,
            totalTurns,
            remainingTurns
        };
    }
    if (entry.skillData && typeof entry.skillData === "object") {
        const skillName = normalizeBattleText(
            entry?.skillData?.和名 || entry?.skillData?.技名 || entry?.skillData?.name
        );
        if (!skillName) return null;
        const humanTransformActive = isHumanTransformSkillData(entry?.skillData);
        const hasEffectDuration = Boolean(entry.hasEffectDuration)
            || isInfiniteRetainedBuffTurns(entry?.totalTurns)
            || isInfiniteRetainedBuffTurns(entry?.remainingTurns)
            || humanTransformActive;
        const totalTurns = humanTransformActive
            ? RETAINED_BUFF_INFINITE_TURNS
            : normalizeRetainedBuffTurns(entry.totalTurns, hasEffectDuration ? 2 : 1);
        const remainingTurns = humanTransformActive
            ? RETAINED_BUFF_INFINITE_TURNS
            : normalizeRetainedBuffTurns(entry.remainingTurns, totalTurns);
        return {
            skillData: { ...entry.skillData },
            hasEffectDuration,
            totalTurns,
            remainingTurns
        };
    }
    // 旧データ互換: スキル本体だけ保存されていた形式
    const legacySkillName = normalizeBattleText(entry?.和名 || entry?.技名 || entry?.name);
    if (!legacySkillName) return null;
    const totalTurns = isHumanTransformSkillData(entry)
        ? RETAINED_BUFF_INFINITE_TURNS
        : 1;
    return {
        skillData: { ...entry },
        hasEffectDuration: isInfiniteRetainedBuffTurns(totalTurns) || isHumanTransformSkillData(entry),
        totalTurns,
        remainingTurns: totalTurns
    };
}

function getAllSkillDataCandidatesForCharacter(characterDataSource = playerData) {
    const source = (characterDataSource && typeof characterDataSource === "object") ? characterDataSource : {};
    const results = [];
    const pushSkill = (skill) => {
        const skillData = getSkillData(skill);
        if (!skillData || typeof skillData !== "object") return;
        results.push(skillData);
    };
    const pushGroup = (group) => {
        if (!group || typeof group !== "object") return;
        Object.values(group).forEach((list) => {
            if (!Array.isArray(list)) return;
            list.forEach((item) => pushSkill(item));
        });
    };

    pushGroup(source?.skills);
    pushGroup(source?.magic);
    return results;
}

function normalizeSkillNameForCompare(value) {
    return String(value ?? "")
        .normalize("NFKC")
        .replace(/\s+/g, "")
        .trim();
}

function findSkillDataByNameAndTypeForCharacter(skillName = "", skillType = "", characterDataSource = playerData) {
    const targetName = normalizeBattleText(skillName);
    const targetNameKey = normalizeSkillNameForCompare(skillName);
    const targetType = normalizeBattleText(skillType).toUpperCase();
    if (!targetName || !targetNameKey) return null;
    const candidates = getAllSkillDataCandidatesForCharacter(characterDataSource);
    const byNameKey = (skill) => normalizeSkillNameForCompare(skill?.和名 || skill?.技名 || skill?.name);
    const matchedByName = candidates.filter((skill) => (
        byNameKey(skill) === targetNameKey
    ));
    const fuzzyMatched = matchedByName.length
        ? matchedByName
        : candidates.filter((skill) => {
            const currentNameKey = byNameKey(skill);
            return currentNameKey && (
                currentNameKey.includes(targetNameKey) || targetNameKey.includes(currentNameKey)
            );
        });
    if (!fuzzyMatched.length) return null;
    if (!targetType) return { ...fuzzyMatched[0] };
    const matchedByType = fuzzyMatched.find((skill) => (
        normalizeBattleText(skill?.種別).toUpperCase() === targetType
    ));
    return { ...(matchedByType || fuzzyMatched[0]) };
}

function hydrateRetainedBuffSkillsForCharacter(characterName = (selectName || playerData?.name || ""), characterDataSource = playerData) {
    const normalizedName = normalizeBattleText(characterName);
    if (!normalizedName) return;
    const sourceCharacterData = (
        characterDataSource
        && typeof characterDataSource === "object"
        && (
            (characterDataSource.skills && typeof characterDataSource.skills === "object")
            || (characterDataSource.magic && typeof characterDataSource.magic === "object")
        )
    )
        ? characterDataSource
        : (
            Array.isArray(characterList)
                ? (characterList.find((entry) => normalizeBattleText(entry?.name) === normalizedName) || playerData)
                : playerData
        );

    const currentEntries = getRetainedBuffSkillsForCharacter(normalizedName)
        .map((entry) => normalizeRetainedBuffEntry(entry))
        .filter((entry) => Boolean(entry) && entry.skillData);
    if (!currentEntries.length) {
        DebaglogSet("[Hydrate][Empty]", { characterName: normalizedName });
        return;
    }
    
    DebaglogSet("[Hydrate][Start]", {
        characterName: normalizedName,
        entryCount: currentEntries.length,
        hasSourceSkills: Boolean(sourceCharacterData?.skills),
        hasSourcMagic: Boolean(sourceCharacterData?.magic),
        entries: currentEntries.map((e) => ({
            name: normalizeBattleText(e?.skillData?.和名 || e?.skillData?.技名 || e?.skillData?.name),
            type: normalizeBattleText(e?.skillData?.種別 || "")
        }))
    });

    let changed = false;
    const hydratedEntries = currentEntries.map((entry) => {
        const skillData = entry?.skillData || {};
        const skillName = normalizeBattleText(skillData?.和名 || skillData?.技名 || skillData?.name);
        const skillType = normalizeBattleText(skillData?.種別 || "");
        if (!skillName) {
            changed = true;
            return null;
        }
        const resolvedSkillData = findSkillDataByNameAndTypeForCharacter(skillName, skillType, sourceCharacterData);
        DebaglogSet("[Hydrate][Resolution]", {
            inputName: skillName,
            inputType: skillType,
            resolved: Boolean(resolvedSkillData),
            resolvedName: resolvedSkillData ? normalizeBattleText(resolvedSkillData?.和名 || resolvedSkillData?.技名 || resolvedSkillData?.name) : null,
            resolvedKeys: resolvedSkillData ? Object.keys(resolvedSkillData).length : 0
        });
        if (!resolvedSkillData) return entry;
        const beforeName = normalizeBattleText(skillData?.和名 || skillData?.技名 || skillData?.name);
        const beforeType = normalizeBattleText(skillData?.種別 || "").toUpperCase();
        const afterName = normalizeBattleText(
            resolvedSkillData?.和名 || resolvedSkillData?.技名 || resolvedSkillData?.name
        );
        const afterType = normalizeBattleText(resolvedSkillData?.種別 || "").toUpperCase();
        if (beforeName !== afterName || beforeType !== afterType || Object.keys(skillData).length < Object.keys(resolvedSkillData).length) {
            changed = true;
        }
        return {
            ...entry,
            skillData: { ...resolvedSkillData }
        };
    }).filter((entry) => Boolean(entry) && entry.skillData);

    if (!changed && hydratedEntries.length === currentEntries.length) {
        DebaglogSet("[Hydrate][NoChange]", { characterName: normalizedName });
        return;
    }
    DebaglogSet("[Hydrate][Saving]", {
        characterName: normalizedName,
        beforeCount: currentEntries.length,
        afterCount: hydratedEntries.length,
        changed
    });
    setRetainedBuffSkillsForCharacter(normalizedName, hydratedEntries);
}

function buildRetainedBuffDebugSummary(name = (selectName || playerData?.name || "")) {
    const normalizedName = normalizeBattleText(name);
    const entries = getRetainedBuffSkillsForCharacter(normalizedName)
        .map((entry) => normalizeRetainedBuffEntry(entry))
        .filter((entry) => Boolean(entry) && entry.skillData);
    return entries.map((entry) => ({
        name: normalizeBattleText(entry?.skillData?.和名 || entry?.skillData?.技名 || entry?.skillData?.name),
        type: normalizeBattleText(entry?.skillData?.種別 || ""),
        remaining: normalizeRetainedBuffTurns(entry?.remainingTurns, 1),
        total: normalizeRetainedBuffTurns(entry?.totalTurns, 1)
    }));
}

function restoreRetainedBuffSkillsForLoadedCharacters(characters = characterList) {
    const list = Array.isArray(characters) ? characters : [];
    if (!list.length) return;

    list.forEach((character) => {
        const characterName = normalizeBattleText(character?.name);
        if (!characterName) return;
        const before = buildRetainedBuffDebugSummary(characterName);
        hydrateRetainedBuffSkillsForCharacter(characterName, character);
        const after = buildRetainedBuffDebugSummary(characterName);
        DebaglogSet("[BattleState][RetainedRestore]", {
            characterName,
            beforeCount: before.length,
            afterCount: after.length,
            before,
            after
        });
    });
}

function setRetainedBuffSkillsForCharacter(name = (selectName || playerData?.name || ""), skills = []) {
    const key = getCharacterScopedKey(name);
    retainedBuffSkillsByCharacter[key] = (Array.isArray(skills) ? skills : [])
        .map((entry) => normalizeRetainedBuffEntry(entry))
        .filter((entry) => {
            if (!entry || !entry.skillData) return false;
            const skillName = normalizeBattleText(
                entry?.skillData?.和名 || entry?.skillData?.技名 || entry?.skillData?.name
            );
            return Boolean(skillName);
        });
    queueBattleStateSaveForCharacter(name);
    return retainedBuffSkillsByCharacter[key];
}

function clearRetainedBuffSkillsForCharacter(name = (selectName || playerData?.name || "")) {
    const key = getCharacterScopedKey(name);
    retainedBuffSkillsByCharacter[key] = [];
    queueBattleStateSaveForCharacter(name);
}

function getBattleTurnForCharacter(name = (selectName || playerData?.name || "")) {
    const key = getCharacterScopedKey(name);
    const current = Math.max(1, Math.round(toFiniteNumber(battleTurnByCharacter[key]) || 1));
    battleTurnByCharacter[key] = current;
    return current;
}

function setBattleTurnForCharacter(name = (selectName || playerData?.name || ""), turn = 1) {
    const key = getCharacterScopedKey(name);
    battleTurnByCharacter[key] = Math.max(1, Math.round(toFiniteNumber(turn) || 1));
    queueBattleStateSaveForCharacter(name);
    return battleTurnByCharacter[key];
}

function updateBattleTurnDisplay(name = (selectName || playerData?.name || "")) {
    const element = document.getElementById("battle-turn-display");
    if (!element) return;
    const turn = getBattleTurnForCharacter(name);
    element.textContent = `ターン: ${turn}`;
}

window.getRetainedBuffSkillsForCharacter = getRetainedBuffSkillsForCharacter;
window.clearRetainedBuffSkillsForCharacter = clearRetainedBuffSkillsForCharacter;

function saveCurrentAttackOptionForCharacter(value = null, name = (selectName || playerData?.name || "")) {
    const key = getCharacterScopedKey(name);
    const selectElement = document.getElementById("attack-method-select");
    const raw = value ?? selectElement?.value ?? "";
    const normalized = normalizeBattleText(raw);
    if (!normalized) {
        delete selectedAttackOptionByCharacter[key];
        persistSelectedAttackOptionByCharacterToStorage();
        return "";
    }
    selectedAttackOptionByCharacter[key] = normalized;
    persistSelectedAttackOptionByCharacterToStorage();
    return normalized;
}

function getSavedAttackOptionForCharacter(name = (selectName || playerData?.name || "")) {
    const key = getCharacterScopedKey(name);
    return normalizeBattleText(selectedAttackOptionByCharacter[key] || "");
}

const CONDITIONAL_PASSIVE_STATUS_PLUS_KEYS = [
    "HP", "MP", "ST", "攻撃", "防御", "魔力", "魔防", "速度", "命中", "SIZ", "APP"
];
const CONDITIONAL_PASSIVE_GLOBAL_BOOST_KEYS = new Set([
    ...statuSum,
    ...talents,
    ...resistances,
    ...bodyAttributes
]);

const A_SLOT_NORMAL_ATTACK_SKILL_NAMES = new Set([
    "切断",
    "貫通",
    "打撃",
    "防御",
    "射撃",
    "狙撃",
    "攻勢盾"
]);
const ATTACK_OPTION_ATTRIBUTE_KEYS = ["炎", "氷", "雷", "酸", "音波", "闇", "光", "善", "悪", "正", "負", "毒"];

function normalizeBattleText(value) {
    return String(value ?? "").trim();
}

function normalizeAttackMethodForCondition(methodValue) {
    const method = normalizeBattleText(methodValue);
    if (!method) return "";
    if (BODY_ATTACK_OPTION_VALUES.includes(method)) {
        return `${method}/肉体`;
    }
    return method;
}

function tokenizeForNormalAttackSkillName(value) {
    const text = normalizeBattleText(value);
    if (!text) return [];
    return text
        .split(/[\s\n\r\t,，、/／|｜:：()（）「」『』\[\]【】]+/g)
        .map((token) => normalizeBattleText(token))
        .filter(Boolean);
}

function resolveASlotNormalAttackActionKey(skillData) {
    const names = [
        skillData?.技名,
        skillData?.和名,
        skillData?.name
    ];
    const tokens = names.flatMap((name) => tokenizeForNormalAttackSkillName(name));
    const wholeText = names
        .map((name) => normalizeBattleText(name))
        .filter(Boolean)
        .join(" ");

    const keyOrder = ["攻勢盾", "狙撃", "射撃", "防御", "打撃", "貫通", "切断"];
    for (const key of keyOrder) {
        if (tokens.includes(key)) return key;
    }
    for (const key of keyOrder) {
        if (wholeText.includes(key)) return key;
    }
    return "";
}

function normalizeStatusPlusKeyToBaseStat(key) {
    const text = String(key ?? "").trim();
    if (!text) return "";
    const matched = text.match(/^(.+?)[+＋]$/);
    if (!matched) return "";
    const baseKey = String(matched[1] || "").trim();
    return CONDITIONAL_PASSIVE_STATUS_PLUS_KEYS.includes(baseKey) ? baseKey : "";
}

function normalizeConditionalPassiveGlobalBoostKey(key) {
    const text = String(key ?? "").trim();
    if (!text) return "";
    const baseKey = text.replace(/[+＋]$/g, "").trim();
    if (!baseKey) return "";
    return CONDITIONAL_PASSIVE_GLOBAL_BOOST_KEYS.has(baseKey) ? baseKey : "";
}

function buildConditionalPassiveStatusBonuses(activeConditionalPassives = []) {
    const bonuses = {};
    [...CONDITIONAL_PASSIVE_GLOBAL_BOOST_KEYS].forEach((key) => {
        bonuses[key] = 0;
    });

    (Array.isArray(activeConditionalPassives) ? activeConditionalPassives : []).forEach((passiveSkill) => {
        if (!passiveSkill || typeof passiveSkill !== "object") return;
        Object.entries(passiveSkill).forEach(([key, value]) => {
            const baseKey = normalizeConditionalPassiveGlobalBoostKey(key);
            if (!baseKey) return;
            bonuses[baseKey] = toFiniteNumber(bonuses[baseKey]) + toFiniteNumber(value);
        });
    });
    return bonuses;
}

function getRetainedBuffSkillDataListForCharacter(characterName = (selectName || playerData?.name || "")) {
    return getRetainedBuffSkillsForCharacter(characterName)
        .map((entry) => normalizeRetainedBuffEntry(entry))
        .filter((entry) => entry && entry.skillData && toFiniteNumber(entry.remainingTurns) > 0)
        .map((entry) => entry.skillData)
        .filter((skillData) => skillData && typeof skillData === "object");
}

function buildRuntimeStatusBonuses({ activeConditionalPassives = [], characterName = (selectName || playerData?.name || "") } = {}) {
    const passiveLikeSkills = (Array.isArray(activeConditionalPassives) && activeConditionalPassives.length > 0)
        ? activeConditionalPassives
        : getRuntimePassiveLikeSkillsForSelectedSkills(selectedSkills, { characterName });
    return buildConditionalPassiveStatusBonuses(passiveLikeSkills);
}

function isRetainableBuffSkill(skillData) {
    if (!skillData || typeof skillData !== "object") return false;
    // 「発動中」扱いはパッシブと同系統の処理に寄せるため、
    // 持続ターンがあるスキルは種別/属性の例外なしで対象に含める。
    if (parseEffectDurationTurns(skillData) > 0) return true;
    const skillType = normalizeBattleText(skillData?.種別).toUpperCase();
    const skillName = normalizeBattleText(skillData?.技名 || skillData?.和名 || skillData?.name);
    const detail = normalizeBattleText(skillData?.詳細 || skillData?.description);
    const hasBuffHint = (
        skillType === "B"
        || skillName.includes("強化")
        || detail.includes("強化")
        || skillName.includes("バフ")
    );

    let hasStatusBonus = false;
    Object.entries(skillData).forEach(([key, value]) => {
        if (hasStatusBonus) return;
        const baseKey = normalizeConditionalPassiveGlobalBoostKey(key);
        if (!baseKey) return;
        if (toFiniteNumber(value) !== 0) {
            hasStatusBonus = true;
        }
    });
    return hasBuffHint || hasStatusBonus;
}

function parseEffectDurationTurns(skillData) {
    if (!skillData || typeof skillData !== "object") return 0;

    const durationKeys = ["効果時間", "持続", "継続", "持続ターン", "効果ターン"];
    for (const key of durationKeys) {
        if (!Object.prototype.hasOwnProperty.call(skillData, key)) continue;
        const raw = skillData[key];
        const text = normalizeBattleText(raw);
        if (!text || text === "0" || text === "0.0" || text === "-") continue;
        const matchedNumber = text.match(/-?\d+(?:\.\d+)?/);
        if (matchedNumber) {
            const turns = Math.max(0, Math.round(toFiniteNumber(matchedNumber[0])));
            if (turns > 0) return turns;
        }
        return 0;
    }

    const detail = normalizeBattleText(skillData?.詳細 || skillData?.description);
    if (!detail) return 0;
    const durationMatch = detail.match(/効果時間\s*[:：]?\s*([^\s,，。]+)/i);
    if (!durationMatch) return 0;
    const valueText = normalizeBattleText(durationMatch[1]);
    if (!valueText || valueText === "0" || valueText === "0.0" || valueText === "-") return 0;
    const matchedNumber = valueText.match(/-?\d+(?:\.\d+)?/);
    if (!matchedNumber) return 0;
    return Math.max(0, Math.round(toFiniteNumber(matchedNumber[0])));
}

function getRetainableBuffSkillsFromSelection(targetSelectedSkills = selectedSkills) {
    const list = [];
    SELECTED_SKILL_SLOT_ORDER.forEach((slot) => {
        const skillData = getSkillData(targetSelectedSkills?.[slot]);
        if (!skillData || typeof skillData !== "object") return;
        if (!isRetainableBuffSkill(skillData)) return;
        const durationTurns = parseEffectDurationTurns(skillData);
        const infiniteByDuration = durationTurns >= RETAINED_BUFF_INFINITE_TURNS;
        const infiniteBySkill = isHumanTransformSkillData(skillData);
        const totalTurns = (infiniteByDuration || infiniteBySkill)
            ? RETAINED_BUFF_INFINITE_TURNS
            : (durationTurns > 0 ? durationTurns : 1);
        list.push({
            skillData: { ...skillData },
            hasEffectDuration: durationTurns > 0 || infiniteBySkill || infiniteByDuration,
            totalTurns,
            remainingTurns: totalTurns
        });
    });
    return list;
}

function buildBuffSkillSignature(skillData) {
    const source = (skillData && typeof skillData === "object") ? skillData : {};
    const type = normalizeBattleText(source?.種別).toUpperCase();
    const name = normalizeBattleText(source?.技名 || source?.和名 || source?.name);
    if (!name) return "";
    return [type, name].join("::");
}

function getSkillCooldownSignature(skillData) {
    const source = (skillData && typeof skillData === "object") ? skillData : {};
    const type = normalizeBattleText(source?.種別).toUpperCase();
    const name = normalizeBattleText(source?.和名 || source?.技名 || source?.name);
    if (!name) return "";
    return [type, name].join("::");
}

function resolveSkillCooldownTurnsForUse(skillData) {
    const resolved = getSkillCooldownFromData(skillData);
    if (!resolved?.hasValue) return 0;
    const baseTurns = normalizeCooldownTurnValue(resolved.value);
    if (baseTurns <= 0) return 0;
    const passiveAdjusted = normalizeCooldownTurnValue(baseTurns + getSkillTableCooldownGlobalBonus());
    return Math.max(0, passiveAdjusted);
}

function retainUsedBuffSkillsFromSelection(targetSelectedSkills = selectedSkills, characterName = (selectName || playerData?.name || "")) {
    const previous = getRetainedBuffSkillsForCharacter(characterName)
        .map((entry) => normalizeRetainedBuffEntry(entry))
        .filter((entry) => entry && entry.skillData);
    const nextCandidates = getRetainableBuffSkillsFromSelection(targetSelectedSkills);
    if (!nextCandidates.length) return { addedCount: 0, totalCount: previous.length };

    const merged = [...previous];
    const seen = new Set(previous.map((entry) => buildBuffSkillSignature(entry.skillData)));
    let addedCount = 0;
    let refreshedCount = 0;

    nextCandidates.forEach((entry) => {
        const skillData = entry?.skillData || null;
        if (!skillData) return;
        const signature = buildBuffSkillSignature(skillData);
        if (!signature) return;
        if (seen.has(signature)) {
            const index = merged.findIndex((item) => (
                buildBuffSkillSignature(item?.skillData || item) === signature
            ));
            if (index >= 0) {
                const normalized = normalizeRetainedBuffEntry(merged[index]);
                const nextTotalTurns = Math.max(
                    normalizeRetainedBuffTurns(normalized?.totalTurns, 1),
                    normalizeRetainedBuffTurns(entry?.totalTurns, 1)
                );
                merged[index] = {
                    skillData: { ...skillData },
                    hasEffectDuration: Boolean(entry?.hasEffectDuration)
                        || isInfiniteRetainedBuffTurns(nextTotalTurns)
                        || isHumanTransformSkillData(skillData),
                    totalTurns: nextTotalTurns,
                    remainingTurns: nextTotalTurns
                };
                refreshedCount += 1;
            }
            return;
        }
        seen.add(signature);
        merged.push({
            skillData: { ...skillData },
            hasEffectDuration: Boolean(entry?.hasEffectDuration)
                || isInfiniteRetainedBuffTurns(entry?.totalTurns)
                || isHumanTransformSkillData(skillData),
            totalTurns: normalizeRetainedBuffTurns(entry?.totalTurns, 1),
            remainingTurns: normalizeRetainedBuffTurns(entry?.remainingTurns || entry?.totalTurns, 1)
        });
        addedCount += 1;
    });

    setRetainedBuffSkillsForCharacter(characterName, merged);
    return { addedCount, refreshedCount, totalCount: merged.length };
}

function retainUsedSkillCooldownsFromSelection(targetSelectedSkills = selectedSkills, characterName = (selectName || playerData?.name || "")) {
    const normalizedCharacterName = normalizeBattleText(characterName);
    if (!normalizedCharacterName) {
        return { startedCount: 0, totalCount: 0 };
    }

    const currentEntries = getSkillCooldownEntriesForCharacter(normalizedCharacterName)
        .map((entry) => normalizeSkillCooldownEntry(entry))
        .filter((entry) => Boolean(entry));
    const cooldownMap = new Map(currentEntries.map((entry) => [entry.signature, entry]));
    const activeBuffSignatureSet = buildActiveBuffSignatureSet(normalizedCharacterName);
    let startedCount = 0;

    SELECTED_SKILL_SLOT_ORDER.forEach((slot) => {
        const skillData = getSkillData(targetSelectedSkills?.[slot]);
        if (!skillData || typeof skillData !== "object") return;
        const totalTurns = resolveSkillCooldownTurnsForUse(skillData);
        if (totalTurns <= 0) return;

        const signature = getSkillCooldownSignature(skillData);
        if (!signature) return;
        const pendingWhileActive = activeBuffSignatureSet.has(signature);
        const nextEntry = normalizeSkillCooldownEntry({
            signature,
            skillName: normalizeBattleText(skillData?.和名 || skillData?.技名 || skillData?.name),
            totalTurns,
            remainingTurns: totalTurns,
            pendingWhileActive
        });
        if (!nextEntry) return;
        cooldownMap.set(signature, nextEntry);
        startedCount += 1;
    });

    const nextEntries = Array.from(cooldownMap.values());
    setSkillCooldownEntriesForCharacter(normalizedCharacterName, nextEntries);
    return { startedCount, totalCount: nextEntries.length };
}

function advanceSkillCooldownsForCharacter(characterName = (selectName || playerData?.name || "")) {
    const normalizedCharacterName = normalizeBattleText(characterName);
    if (!normalizedCharacterName) return;

    const entries = getSkillCooldownEntriesForCharacter(normalizedCharacterName)
        .map((entry) => normalizeSkillCooldownEntry(entry))
        .filter((entry) => Boolean(entry));
    if (!entries.length) return;

    const activeBuffSignatureSet = buildActiveBuffSignatureSet(normalizedCharacterName);
    const nextEntries = entries
        .map((entry) => {
            const current = { ...entry };
            const isActiveNow = activeBuffSignatureSet.has(current.signature);
            if (isActiveNow) {
                current.pendingWhileActive = true;
                return current;
            }
            if (current.pendingWhileActive) {
                current.pendingWhileActive = false;
                return current;
            }
            const nextRemaining = Math.max(0, Math.round(toFiniteNumber(current.remainingTurns)) - 1);
            if (nextRemaining <= 0) return null;
            current.remainingTurns = nextRemaining;
            return current;
        })
        .filter((entry) => Boolean(entry));

    setSkillCooldownEntriesForCharacter(normalizedCharacterName, nextEntries);
}

function removeRetainedBuffSkillByTypeAndName(type = "", name = "", characterName = (selectName || playerData?.name || "")) {
    const normalizedName = normalizeBattleText(name);
    if (!normalizedName) {
        return { removed: false, totalCount: getRetainedBuffSkillsForCharacter(characterName).length };
    }
    const normalizedType = normalizeBattleText(type).toUpperCase();
    const list = getRetainedBuffSkillsForCharacter(characterName)
        .map((entry) => normalizeRetainedBuffEntry(entry))
        .filter((entry) => entry && entry.skillData);
    const nextList = [];
    let removed = false;

    list.forEach((entry) => {
        if (removed) {
            nextList.push(entry);
            return;
        }
        const skillData = entry.skillData || {};
        const entryName = normalizeBattleText(skillData?.和名 || skillData?.技名 || skillData?.name);
        const entryType = normalizeBattleText(skillData?.種別).toUpperCase();
        const typeMatched = !normalizedType || entryType === normalizedType;
        if (typeMatched && entryName === normalizedName) {
            removed = true;
            return;
        }
        nextList.push(entry);
    });

    if (removed) {
        setRetainedBuffSkillsForCharacter(characterName, nextList);
    }
    return { removed, totalCount: nextList.length };
}

function buildStatSourceWithConditionalBonuses(baseSource, conditionalBonuses = {}) {
    const sourceObject = Array.isArray(baseSource) ? (baseSource[0] || null) : baseSource;
    if (!sourceObject || typeof sourceObject !== "object") return baseSource;

    const hasAnyBonus = Object.values(conditionalBonuses || {}).some((value) => toFiniteNumber(value) !== 0);
    if (!hasAnyBonus) return baseSource;

    const merged = { ...sourceObject };
    Object.entries(conditionalBonuses || {}).forEach(([key, value]) => {
        const bonus = toFiniteNumber(value);
        if (bonus === 0) return;
        merged[key] = toFiniteNumber(merged[key]) + bonus;
    });

    if (Array.isArray(baseSource)) {
        return [merged];
    }
    return merged;
}

function inferAttackMethodFromSkill(skillData) {
    if (!skillData || typeof skillData !== "object") return "";
    const methodField = normalizeBattleText(skillData?.攻撃手段);
    if (methodField) return normalizeConditionToken(methodField);

    const name = normalizeBattleText(skillData?.技名 || skillData?.和名 || skillData?.name);
    const detail = normalizeBattleText(skillData?.詳細 || skillData?.description);
    const joined = `${name} ${detail}`;

    if (joined.includes("吐息") || joined.includes("ブレス")) return "吐息";
    if (joined.includes("眼")) return "眼";
    return "";
}

function isNormalAttackSkillForAttackMethodContext(skillData) {
    if (!skillData || typeof skillData !== "object") return false;
    const type = normalizeBattleText(skillData?.種別).toUpperCase();
    if (type !== "A") return false;

    const attribute = normalizeBattleText(skillData?.属性);
    if (attribute === "通常攻撃") return true;

    const actionKey = resolveASlotNormalAttackActionKey(skillData);
    return A_SLOT_NORMAL_ATTACK_SKILL_NAMES.has(actionKey);
}

function resolveAttackMethodForContext(skillData = null) {
    const inferredMethod = normalizeAttackMethodForCondition(inferAttackMethodFromSkill(skillData));
    if (inferredMethod) return inferredMethod;

    // 選択中の攻撃手段は通常攻撃系スキルにのみ適用する。
    if (!isNormalAttackSkillForAttackMethodContext(skillData)) {
        return "";
    }

    const selectedMethod = normalizeBattleText(getSelectedAttackOptionData()?.value);
    if (selectedMethod) return normalizeAttackMethodForCondition(selectedMethod);
    return "";
}

function buildConditionContextForSkill(skillData) {
    return {
        attackMethod: resolveAttackMethodForContext(skillData),
        skillName: normalizeBattleText(skillData?.技名 || skillData?.和名 || skillData?.name),
        attribute: normalizeBattleText(skillData?.属性)
    };
}

function resolveSkillDataWithConditionalPassives(skillData, options = {}) {
    const context = buildConditionContextForSkill(skillData);
    const conditionalOptions = {};
    if (Array.isArray(options?.activeConditionalPassives)) {
        conditionalOptions.activeConditionalPassives = options.activeConditionalPassives;
    }
    const { mergedSkillData, matchedPassives, appliedPassives } = buildSkillDataWithConditionalPassives(
        skillData,
        context,
        conditionalOptions
    );
    return {
        context,
        matchedPassives,
        appliedPassives,
        calcSkillData: mergedSkillData || skillData
    };
}

function toFiniteNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
}

function getSkillValueFormulaApi() {
    const api = window.skillValueFormula;
    return (api && typeof api === "object") ? api : null;
}

function getSkillPowerJudgeApi() {
    const api = window.skillPowerJudge;
    return (api && typeof api === "object") ? api : null;
}

function getFirstFiniteNumberByKeys(source, keys = [], fallback = 0) {
    const target = (source && typeof source === "object") ? source : {};
    for (const key of keys) {
        if (!Object.prototype.hasOwnProperty.call(target, key)) continue;
        const num = Number(target[key]);
        if (Number.isFinite(num)) return num;
    }
    return fallback;
}

function hasAnyOwnKey(source, keys = []) {
    const target = (source && typeof source === "object") ? source : {};
    return keys.some((key) => Object.prototype.hasOwnProperty.call(target, key));
}

function toDisplayText(value) {
    if (value === null || value === undefined) return "";
    const text = String(value).trim();
    if (
        text === ""
        || text === "0"
        || text === "未選択"
        || text === "入力なし"
        || text.toLowerCase() === "nan"
        || text.toLowerCase() === "undefined"
        || text.toLowerCase() === "null"
    ) {
        return "";
    }
    return text;
}

function resolveAllPowerMultiplier(skillData) {
    const judgeApi = getSkillPowerJudgeApi();
    if (judgeApi?.resolveAllPowerMultiplier) {
        return judgeApi.resolveAllPowerMultiplier(skillData, { toFiniteNumber });
    }
    if (!skillData || typeof skillData !== "object") return 1;

    const directMultiplier = toFiniteNumber(
        skillData?.全威力倍率
        ?? skillData?.全威力率
        ?? skillData?.全威力係数
    );
    if (directMultiplier > 0) {
        return directMultiplier;
    }

    const percentValue = toFiniteNumber(
        skillData?.全威力
        ?? skillData?.全威力倍
        ?? skillData?.全威力補正
    );
    if (percentValue === 0) return 1;
    return Math.max(0, 1 + percentValue / 100);
}

function toDisplayNumber(value, multiplier = 1) {
    const judgeApi = getSkillPowerJudgeApi();
    if (judgeApi?.toDisplayNumber) {
        return judgeApi.toDisplayNumber(value, multiplier);
    }
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue) || numberValue === 0) return "";
    const scaledValue = Math.ceil(numberValue * multiplier);
    if (!Number.isFinite(scaledValue) || scaledValue === 0) return "";
    return String(scaledValue);
}

function toScaledNumber(value, multiplier = 1) {
    const judgeApi = getSkillPowerJudgeApi();
    if (judgeApi?.toScaledNumber) {
        return judgeApi.toScaledNumber(value, multiplier);
    }
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue) || numberValue === 0) return 0;
    const scaledValue = Math.ceil(numberValue * multiplier);
    return Number.isFinite(scaledValue) ? scaledValue : 0;
}

function normalizeStatReferenceKey(statRef) {
    const judgeApi = getSkillPowerJudgeApi();
    if (judgeApi?.normalizeStatReferenceKey) {
        return judgeApi.normalizeStatReferenceKey(statRef);
    }
    return String(statRef ?? "")
        .normalize("NFKC")
        .trim()
        .replace(/^(攻撃判定|追加威力|判定|威力)\s*[:：]\s*/, "")
        .replace(/^[^:：]*\s*[:：]\s*/, "")
        .split(/[,\u3001，/／|｜&＆\n\r\t]+/)[0]
        .replace(/[+\uFF0B]+$/g, "")
        .trim();
}

function parseSignedStatReference(statRef) {
    const judgeApi = getSkillPowerJudgeApi();
    if (judgeApi?.parseSignedStatReference) {
        return judgeApi.parseSignedStatReference(statRef);
    }
    const raw = String(statRef ?? "")
        .normalize("NFKC")
        .trim();
    if (!raw) {
        return { sign: 1, core: "" };
    }

    let sign = 1;
    let core = raw;
    if (/^[-−ー－]/.test(core)) {
        sign = -1;
        core = core.replace(/^[-−ー－]+\s*/, "");
    } else if (/^[+\uFF0B]/.test(core)) {
        core = core.replace(/^[+\uFF0B]+\s*/, "");
    }

    if (/[-−ー－]$/.test(core)) {
        sign = -1;
        core = core.replace(/\s*[-−ー－]+$/, "");
    } else if (/[+\uFF0B]$/.test(core)) {
        core = core.replace(/\s*[+\uFF0B]+$/, "");
    }

    return {
        sign,
        core: core.trim()
    };
}

function normalizeFieldKeyForCompare(value) {
    const judgeApi = getSkillPowerJudgeApi();
    if (judgeApi?.normalizeFieldKeyForCompare) {
        return judgeApi.normalizeFieldKeyForCompare(value);
    }
    return String(value ?? "")
        .normalize("NFKC")
        .trim()
        .replace(/[ 　\t\r\n]/g, "")
        .replace(/[＿_]/g, "")
        .replace(/[＋+]/g, "")
        .replace(/[:：]/g, "")
        .toLowerCase();
}

function isLevelReferenceKey(statRef) {
    const judgeApi = getSkillPowerJudgeApi();
    if (judgeApi?.isLevelReferenceKey) {
        return judgeApi.isLevelReferenceKey(statRef);
    }
    const key = normalizeFieldKeyForCompare(statRef);
    return key === "lv" || key === "level" || key === "レベル";
}

function getSkillFieldValueByAliases(skillData, aliases = []) {
    const judgeApi = getSkillPowerJudgeApi();
    if (judgeApi?.getSkillFieldValueByAliases) {
        return judgeApi.getSkillFieldValueByAliases(skillData, aliases);
    }
    if (!skillData || typeof skillData !== "object") return "";
    if (!Array.isArray(aliases) || aliases.length === 0) return "";

    for (const alias of aliases) {
        if (Object.prototype.hasOwnProperty.call(skillData, alias)) {
            const direct = skillData[alias];
            if (direct !== undefined && direct !== null) {
                const text = String(direct).trim();
                if (text !== "") return text;
            }
        }
    }

    const keyList = Object.keys(skillData);
    for (const alias of aliases) {
        const normalizedAlias = normalizeFieldKeyForCompare(alias);
        const fuzzyKey = keyList.find((key) => normalizeFieldKeyForCompare(key) === normalizedAlias);
        if (!fuzzyKey) continue;
        const value = skillData[fuzzyKey];
        if (value === undefined || value === null) continue;
        const text = String(value).trim();
        if (text !== "") return text;
    }

    return "";
}

function getAttackStatReference(skillData) {
    return getSkillFieldValueByAliases(skillData, ["攻撃判定", "判定"]);
}

function getAdditionalPowerReference(skillData) {
    return getSkillFieldValueByAliases(skillData, ["追加威力", "威力判定"]);
}

function getAttackStatValue(statSource, skillData) {
    return getCharacterStatValueForSkillRef(statSource, getAttackStatReference(skillData), skillData);
}

function getAdditionalPowerValue(statSource, skillData) {
    return getCharacterStatValueForSkillRef(statSource, getAdditionalPowerReference(skillData), skillData);
}

function getCharacterStatValueForSkillRef(statSource, statRef, skillData = null) {
    const judgeApi = getSkillPowerJudgeApi();
    if (judgeApi?.getCharacterStatValueForSkillRef) {
        const fallbackSources = [
            window?.statusCharacter,
            Array.isArray(window?.selectedCharacter) ? (window.selectedCharacter[0] || null) : window?.selectedCharacter,
            window?.playerData,
            playerData
        ];
        return judgeApi.getCharacterStatValueForSkillRef(statSource, statRef, skillData, {
            toFiniteNumber,
            fallbackSources
        });
    }

    console.log("getCharacterStatValueForSkillRef called with:", { statSource, statRef, skillData });

    const source = Array.isArray(statSource) ? (statSource[0] || {}) : (statSource || {});
    const parsedRef = parseSignedStatReference(statRef);
    const refSign = parsedRef.sign === -1 ? -1 : 1;
    const rawKey = String(parsedRef.core ?? "").trim();
    if (!rawKey) return 0;

    const normalizedKey = normalizeStatReferenceKey(rawKey);
    const candidateKeys = [rawKey, normalizedKey].filter((key, index, list) => key && list.indexOf(key) === index);
    const collectStatSearchTargets = (targetSource) => {
        const root = (targetSource && typeof targetSource === "object") ? targetSource : {};
        const targets = [];
        const seen = new Set();
        const pushTarget = (candidate) => {
            if (!candidate || typeof candidate !== "object") return;
            if (seen.has(candidate)) return;
            seen.add(candidate);
            targets.push(candidate);
        };

        pushTarget(root);
        pushTarget(root?.bodyAttributes);
        pushTarget(root?.stats);
        pushTarget(root?.stats?.allStats);
        pushTarget(root?.stats?.baseStats);
        pushTarget(root?.stats?.levelStats);
        pushTarget(root?.stats?.bodyAttributes);
        pushTarget(root?.itemBonuses?.stats);
        pushTarget(root?.itemBonuses?.bodyAttributes);
        pushTarget(root?.skillBonuses);
        pushTarget(root?.skillBonuses?.stats);
        pushTarget(root?.status);
        pushTarget(root?.profile);
        pushTarget(root?.character);
        return targets;
    };

    const findValueByCandidateKeys = (targetSource) => {
        const targets = collectStatSearchTargets(targetSource);
        for (const target of targets) {
            for (const key of candidateKeys) {
                const value = toFiniteNumber(target?.[key]);
                if (value !== 0 || Object.prototype.hasOwnProperty.call(target, key)) {
                    return { found: true, value };
                }
            }
        }
        for (const target of targets) {
            const sourceEntries = Object.entries(target || {});
            for (const key of candidateKeys) {
                const normalizedCandidate = normalizeFieldKeyForCompare(key);
                if (!normalizedCandidate) continue;
                const matched = sourceEntries.find(([sourceKey]) => (
                    normalizeFieldKeyForCompare(sourceKey) === normalizedCandidate
                ));
                if (!matched) continue;
                return { found: true, value: toFiniteNumber(matched[1]) };
            }
        }
        return { found: false, value: 0 };
    };

    let { found: foundByDirectKey, value: baseValue } = findValueByCandidateKeys(source);

    if (!foundByDirectKey && typeof window !== "undefined") {
        const fallbackSources = [
            window?.statusCharacter,
            Array.isArray(window?.selectedCharacter) ? (window.selectedCharacter[0] || null) : window?.selectedCharacter
        ];
        for (const fallbackSource of fallbackSources) {
            if (!fallbackSource || fallbackSource === source) continue;
            const resolved = findValueByCandidateKeys(fallbackSource);
            if (!resolved.found) continue;
            foundByDirectKey = true;
            baseValue = resolved.value;
            break;
        }
    }

    if (!skillData || typeof skillData !== "object" || !normalizedKey) {
        return baseValue;
    }

    const bonusKeys = [`${normalizedKey}+`, `${normalizedKey}＋`]
        .filter((key, index, list) => list.indexOf(key) === index);
    let bonusValue = 0;
    for (const key of bonusKeys) {
        const value = toFiniteNumber(skillData[key]);
        if (value !== 0 || Object.prototype.hasOwnProperty.call(skillData, key)) {
            bonusValue = value;
            break;
        }
    }

    const totalValue = (baseValue + bonusValue) * refSign;
    if (isLevelReferenceKey(normalizedKey)) {
        return totalValue * 1;
    }
    return totalValue;
}

const SKILL_POWER_KEY_SCALES = {
    善: 0.5,
    悪: 0.5
};
const DISPLAY_POWER_KEYS_SKILLS = [
    "切断", "貫通", "打撃",
    "炎", "氷", "雷", "酸", "音波", "闇", "光",
    "善", "悪", "正", "負", "毒"
];
const DISPLAY_POWER_KEYS_MAGICS = [
    "切断", "貫通", "打撃", "炎", "氷", "雷", "酸", "音波", "闇", "光",
    "善", "悪", "正", "負", "毒"
];
const DISPLAY_STATE_KEYS_SKILLS = [
    "麻痺", "混乱", "恐怖", "盲目", "閃光", "暗黒", "幻覚", "睡眠", "石化",
    "スタン", "拘束", "呪い", "呪い/HP", "呪い/MP", "呪い/ST", "呪い/攻撃",
    "呪い/防御", "呪い/魔力", "呪い/魔防", "呪い/速度", "呪い/命中", "支配",
    "即死", "時間", "出血", "疲労", "ノックバック"
];
const DISPLAY_STATE_KEYS_MAGICS = [
    "麻痺", "混乱", "恐怖", "盲目", "閃光", "暗黒", "幻覚", "睡眠", "石化",
    "スタン", "拘束", "呪い", "呪い/HP", "呪い/MP", "呪い/ST", "呪い/攻撃",
    "呪い/防御", "呪い/魔力", "呪い/魔防", "呪い/速度", "呪い/命中", "支配",
    "即死", "時間", "出血", "疲労", "ノックバック"
];
const DISPLAY_DEFENSE_SPECIAL_KEYS = ["物理ガード", "魔法ガード"];
// skill-set-modal-content では属性キーを威力に含めない。
const SKILL_SET_MODAL_POWER_BREAKDOWN_KEYS = ["威力", "切断", "貫通", "打撃"];
const SKILL_SET_MODAL_GUARD_BREAKDOWN_KEYS = ["守り", "防御", "防御性能", "防御倍率", ...DISPLAY_DEFENSE_SPECIAL_KEYS];
const SKILL_SET_MODAL_ATTRIBUTE_BREAKDOWN_KEYS = [...ATTACK_OPTION_ATTRIBUTE_KEYS, "属性"];
const SKILL_SET_MODAL_STATE_BREAKDOWN_KEYS = Array.from(new Set([
    ...DISPLAY_STATE_KEYS_SKILLS,
    ...DISPLAY_STATE_KEYS_MAGICS
]));
const PHYSICAL_POWER_KEYS = ["切断", "貫通", "打撃"];
const GLOBAL_FINAL_MULTIPLIER_KEYS = new Set([
    "切断倍", "貫通倍", "打撃倍", "炎倍", "氷倍", "雷倍", "酸倍", "音波倍", "闇倍", "光倍",
    "善倍", "悪倍", "正倍", "負倍", "毒倍",
    "麻痺倍", "混乱倍", "恐怖倍", "盲目倍", "閃光倍", "暗黒倍", "幻覚倍", "睡眠倍", "石化倍",
    "スタン倍", "拘束倍", "呪い倍", "呪い/HP倍", "呪い/MP倍", "呪い/ST倍", "呪い/攻撃倍",
    "呪い/防御倍", "呪い/魔力倍", "呪い/魔防倍", "呪い/速度倍", "呪い/命中倍", "支配倍",
    "即死倍", "時間倍", "出血倍", "疲労倍", "物理ガード倍", "魔法ガード倍", "ノックバック倍"
]);

function pickNonZeroNumeric(primaryValue, fallbackValue = 0) {
    const primary = toFiniteNumber(primaryValue);
    if (primary !== 0) return primary;
    return toFiniteNumber(fallbackValue);
}

function getSkillDisplaySourceTag(skillData) {
    return String(skillData?.__displaySource || "").trim().toLowerCase();
}

function getMultiplierStatSource(skillData, options = {}) {
    const sourceTag = getSkillDisplaySourceTag(skillData);
    const type = String(skillData?.種別 || "").trim().toUpperCase();
    const baseSource = (sourceTag === "magics" || type === "P" || type === "M")
        ? selectedCharacter
        : statusCharacter;
    return buildStatSourceWithConditionalBonuses(baseSource, options?.conditionalPassiveStatusBonuses);
}

function shouldApplyMagicMultiplierToDisplay(skillData) {
    const type = String(skillData?.種別 || "").trim().toUpperCase();
    return type === "M";
}

function shouldUsePhysicalPowerMax(skillData) {
    const formulaApi = getSkillValueFormulaApi();
    if (formulaApi?.shouldUsePhysicalPowerMax) {
        return Boolean(formulaApi.shouldUsePhysicalPowerMax(skillData));
    }
    const detail = normalizeBattleText(skillData?.詳細 || skillData?.description);
    return detail.includes("物理威力");
}

function calculatePowerTotal(keys, dataset, keyScaleMap = null) {
    const formulaApi = getSkillValueFormulaApi();
    if (formulaApi?.calculatePowerTotal) {
        return formulaApi.calculatePowerTotal(keys, dataset, keyScaleMap);
    }
    const safeKeys = Array.isArray(keys) ? keys : [];
    if (!shouldUsePhysicalPowerMax(dataset)) {
        return calculateTotal(safeKeys, dataset, null, keyScaleMap);
    }

    const physicalKeys = PHYSICAL_POWER_KEYS.filter((key) => safeKeys.includes(key));
    if (!physicalKeys.length) {
        return calculateTotal(safeKeys, dataset, null, keyScaleMap);
    }

    const otherKeys = safeKeys.filter((key) => !physicalKeys.includes(key));
    const otherTotal = calculateTotal(otherKeys, dataset, null, keyScaleMap);
    const maxPhysical = physicalKeys.reduce((maxValue, key) => {
        const scale = keyScaleMap && Number.isFinite(Number(keyScaleMap[key]))
            ? Number(keyScaleMap[key])
            : 1;
        const value = toFiniteNumber(dataset?.[key]) * scale;
        return Math.max(maxValue, value);
    }, 0);

    return otherTotal + maxPhysical;
}

function getCalculatedSkillDisplayTotals(skillData) {
    if (!skillData || typeof skillData !== "object") {
        return { power: 0, guard: 0, state: 0 };
    }
    const sourceTag = getSkillDisplaySourceTag(skillData);
    const isMagicSource = sourceTag === "magics";
    const type = String(skillData?.種別 || "").trim().toUpperCase();
    const powerKeys = isMagicSource ? DISPLAY_POWER_KEYS_MAGICS : DISPLAY_POWER_KEYS_SKILLS;
    const stateKeys = isMagicSource ? DISPLAY_STATE_KEYS_MAGICS : DISPLAY_STATE_KEYS_SKILLS;
    const defenseBaseKeys = (!isMagicSource && type === "A") ? [] : ["防御性能"];

    return {
        power: calculatePowerTotal(powerKeys, skillData, SKILL_POWER_KEY_SCALES),
        guard: calculateTotal(defenseBaseKeys, skillData, DISPLAY_DEFENSE_SPECIAL_KEYS),
        state: calculateTotal(stateKeys, skillData)
    };
}

function buildSkillSetMetricBreakdownEntries(source, keys, keyScaleMap = null) {
    if (!source || typeof source !== "object") return [];
    const keyList = Array.isArray(keys) ? keys : [];
    return keyList
        .map((key) => {
            const baseValue = toFiniteNumber(source?.[key]);
            const scale = keyScaleMap && Number.isFinite(Number(keyScaleMap[key]))
                ? Number(keyScaleMap[key])
                : 1;
            const value = baseValue * scale;
            return {
                label: String(key || "").trim(),
                value: Math.round(value)
            };
        })
        .filter((entry) => entry.label && entry.value > 0);
}

function formatSkillSetMetricBreakdownTitle(entries = []) {
    const list = Array.isArray(entries) ? entries : [];
    if (!list.length) return "";
    return list
        .map((entry) => `${entry.label} ${Math.round(toFiniteNumber(entry.value))}`)
        .join("\n");
}

function formatSkillSetMetricBreakdownTitleFromMap(map = {}) {
    const source = map && typeof map === "object" ? map : {};
    const entries = Object.entries(source)
        .map(([label, value]) => ({
            label: String(label || "").trim(),
            value: Math.round(toFiniteNumber(value))
        }))
        .filter((entry) => entry.label && entry.value > 0);
    return formatSkillSetMetricBreakdownTitle(entries);
}

function convertSkillSetMetricBreakdownEntriesToMap(entries = []) {
    const map = {};
    const list = Array.isArray(entries) ? entries : [];
    list.forEach((entry) => {
        const label = String(entry?.label || "").trim();
        const value = Math.round(toFiniteNumber(entry?.value));
        if (!label || value <= 0) return;
        map[label] = (map[label] || 0) + value;
    });
    return map;
}

function getMultiplierKeyByStatKey(statKey) {
    const key = String(statKey || "").trim();
    if (!key) return "";
    if (key === "物理ガード") return "物理倍";
    if (key === "魔法ガード") return "魔法倍";
    if (key === "NB" || key === "ノックバック") return "ノックバック倍";
    return `${key}倍`;
}

function sumMetricBreakdownWithGlobalRates(baseMap = {}, globalFinalRates = null) {
    const source = (baseMap && typeof baseMap === "object") ? baseMap : {};
    let total = 0;
    Object.entries(source).forEach(([statKey, rawValue]) => {
        const key = String(statKey || "").trim();
        if (!key) return;
        const multiplierKey = getMultiplierKeyByStatKey(key);
        const rate = Math.max(0, toFiniteNumber(globalFinalRates?.[multiplierKey]) || 1);
        total += toFiniteNumber(rawValue) * rate;
    });
    return total;
}

function buildSelectedSkillsGlobalFinalRates(options = {}) {
    const sums = {};

    SELECTED_SKILL_SLOT_ORDER.forEach((slot) => {
        const skill = selectedSkills?.[slot];
        const skillData = getSkillData(skill);
        if (!skillData || typeof skillData !== "object") return;
        let targetSkill = skillData;
        if (Array.isArray(options?.activeConditionalPassives)) {
            const { calcSkillData } = resolveSkillDataWithConditionalPassives(skillData, {
                activeConditionalPassives: options.activeConditionalPassives
            });
            targetSkill = calcSkillData || skillData;
        }
        GLOBAL_FINAL_MULTIPLIER_KEYS.forEach((multiplierKey) => {
            sums[multiplierKey] = (sums[multiplierKey] || 0) + toFiniteNumber(targetSkill[multiplierKey]);
        });
    });

    const rates = {};
    GLOBAL_FINAL_MULTIPLIER_KEYS.forEach((multiplierKey) => {
        rates[multiplierKey] = 1 + toFiniteNumber(sums[multiplierKey]) / 100;
    });
    return rates;
}

function buildSelectedSkillsAllPowerMultiplier(options = {}) {
    let multiplier = 1;
    SELECTED_SKILL_SLOT_ORDER.forEach((slot) => {
        const skill = selectedSkills?.[slot];
        const skillData = getSkillData(skill);
        if (!skillData || typeof skillData !== "object") return;
        let targetSkill = skillData;
        if (Array.isArray(options?.activeConditionalPassives)) {
            const { calcSkillData } = resolveSkillDataWithConditionalPassives(skillData, {
                activeConditionalPassives: options.activeConditionalPassives
            });
            targetSkill = calcSkillData || skillData;
        }
        const slotMultiplier = resolveAllPowerMultiplier(targetSkill);
        multiplier *= (slotMultiplier > 0 ? slotMultiplier : 1);
    });
    return Math.max(0, multiplier);
}

function resolveDefensePerformanceMultiplier(skillData) {
    if (!skillData || typeof skillData !== "object") return 1;

    const directMultiplier = toFiniteNumber(
        skillData?.防御性能倍率
        ?? skillData?.防御性能率
        ?? skillData?.防御性能係数
    );
    if (directMultiplier > 0) {
        return directMultiplier;
    }

    const percentValue = toFiniteNumber(
        skillData?.防御性能
        ?? skillData?.防御性能補正
        ?? skillData?.防御性能倍
    );
    if (percentValue === 0) return 1;
    return Math.max(0, 1 + percentValue / 100);
}

function buildSelectedSkillsDefensePerformanceMultiplier(options = {}) {
    const sourceSlots = ["S", "Q1", "Q2", "M"];
    let multiplier = 1;
    sourceSlots.forEach((slot) => {
        const skill = selectedSkills?.[slot];
        const skillData = getSkillData(skill);
        if (!skillData || typeof skillData !== "object") return;

        let targetSkill = skillData;
        if (Array.isArray(options?.activeConditionalPassives)) {
            const { calcSkillData } = resolveSkillDataWithConditionalPassives(skillData, {
                activeConditionalPassives: options.activeConditionalPassives
            });
            targetSkill = calcSkillData || skillData;
        }

        const slotMultiplier = resolveDefensePerformanceMultiplier(targetSkill);
        multiplier *= (slotMultiplier > 0 ? slotMultiplier : 1);
    });
    return Math.max(0, multiplier);
}

function applyGlobalFinalRatesToSkillData(skillData, globalFinalRates) {
    if (!skillData || typeof skillData !== "object") return skillData;
    if (!globalFinalRates || typeof globalFinalRates !== "object") return skillData;

    const adjusted = { ...skillData };
    Object.entries(skillData).forEach(([key, value]) => {
        if (key.endsWith("倍")) return;
        const multiplierKey = getMultiplierKeyByStatKey(key);
        if (!GLOBAL_FINAL_MULTIPLIER_KEYS.has(multiplierKey)) return;
        const rate = toFiniteNumber(globalFinalRates[multiplierKey]) || 1;
        const base = toFiniteNumber(value);
        if (base === 0) return;
        adjusted[key] = base * rate;
    });
    return adjusted;
}

function getSelectedSkillsFullPowerTotal(options = {}) {
    let total = 0;

    SELECTED_SKILL_SLOT_ORDER.forEach((slot) => {
        const skill = selectedSkills?.[slot];
        const skillData = getSkillData(skill);
        if (!skillData || typeof skillData !== "object") return;
        let targetSkill = skillData;
        if (Array.isArray(options?.activeConditionalPassives)) {
            const { calcSkillData } = resolveSkillDataWithConditionalPassives(skillData, {
                activeConditionalPassives: options.activeConditionalPassives
            });
            targetSkill = calcSkillData || skillData;
        }
        total += toFiniteNumber(targetSkill?.全力);
    });

    const aSkillData = getSkillData(selectedSkills?.A);
    if (isASlotNormalAttackBySkill("A", aSkillData)) {
        const attackOptionFullPower = getAttackOptionFullPowerValueWithLog(
            getSelectedAttackOptionData(),
            "totalFullPower"
        );
        total += attackOptionFullPower;
    }

    return total;
}

function updateSelectedSkillsTotalsView({
    power = 0,
    defense = 0,
    state = 0,
    groupA = null,
    groupM = null,
    critRate = 0,
    critPower = 0,
    minDamage = 0,
    hasExtra = false,
    attackCount = 1
} = {}) {
    const totalPowerEl = document.getElementById("total-power");
    const totalDefenseEl = document.getElementById("total-defense");
    const totalStateEl = document.getElementById("total-state");
    const totalPowerAEl = document.getElementById("total-power-a");
    const totalDefenseAEl = document.getElementById("total-defense-a");
    const totalStateAEl = document.getElementById("total-state-a");
    const totalPowerMEl = document.getElementById("total-power-m");
    const totalDefenseMEl = document.getElementById("total-defense-m");
    const totalStateMEl = document.getElementById("total-state-m");
    const totalExtraEl = document.getElementById("total-extra");
    const totalAttackCountEl = document.getElementById("total-attack-count");
    const groupAValues = groupA && typeof groupA === "object"
        ? {
            power: Math.round(toFiniteNumber(groupA.power)),
            defense: Math.round(toFiniteNumber(groupA.defense)),
            state: Math.round(toFiniteNumber(groupA.state))
        }
        : null;
    const groupMValues = groupM && typeof groupM === "object"
        ? {
            power: Math.round(toFiniteNumber(groupM.power)),
            defense: Math.round(toFiniteNumber(groupM.defense)),
            state: Math.round(toFiniteNumber(groupM.state))
        }
        : null;

    if (totalPowerAEl) totalPowerAEl.textContent = String(groupAValues?.power ?? 0);
    if (totalDefenseAEl) totalDefenseAEl.textContent = String(groupAValues?.defense ?? 0);
    if (totalStateAEl) totalStateAEl.textContent = String(groupAValues?.state ?? 0);
    if (totalPowerMEl) totalPowerMEl.textContent = String(groupMValues?.power ?? 0);
    if (totalDefenseMEl) totalDefenseMEl.textContent = String(groupMValues?.defense ?? 0);
    if (totalStateMEl) totalStateMEl.textContent = String(groupMValues?.state ?? 0);

    if (totalPowerEl) totalPowerEl.textContent = String(power || 0);
    if (totalDefenseEl) totalDefenseEl.textContent = String(defense || 0);
    if (totalStateEl) totalStateEl.textContent = String(state || 0);
    if (totalAttackCountEl) {
        const count = Math.max(1, Math.round(toFiniteNumber(attackCount) || 1));
        totalAttackCountEl.textContent = count >= 2 ? ` x${count}` : "";
    }
    if (totalExtraEl) {
        if (!hasExtra) {
            totalExtraEl.textContent = "";
        } else {
            const extraParts = [];
            if (Number.isFinite(critRate) && critRate !== 0) {
                extraParts.push(`Cr率 ${Math.round(critRate)}%`);
            }
            if (Number.isFinite(critPower) && critPower !== 0) {
                extraParts.push(`Cr威力 ${Math.round(critPower)}%`);
            }
            extraParts.push(`ダメージブレ ${Math.round(toFiniteNumber(minDamage)) + 40}~100`);
            totalExtraEl.textContent = extraParts.length ? ` / ${extraParts.join(" / ")}` : "";
        }
    }
}

function calculateBattleSkillDisplayData(slot, skillInput, options = {}) {
    const skillData = Array.isArray(skillInput) ? skillInput[0] : skillInput;
    if (!skillData || typeof skillData !== "object") {
        return {
            skillData: null,
            calcSkillData: null,
            adjustedSkillData: null,
            matchedPassives: [],
            overrideMetricBreakdown: null,
            attackReference: "",
            additionalPowerReference: "",
            attackValue: 0,
            additionalPowerValue: 0,
            attackMultiplier: 1,
            powerMultiplier: 1,
            magicMultiplier: 1,
            allPowerMultiplier: 1,
            fullPowerMultiplier: 1,
            uper: 1,
            effectiveMultiplier: 1,
            powerBeforeMultiplier: 0,
            powerAfterMultiplier: 0,
            displayName: "",
            displayRuby: "",
            displayIcons: "",
            displayPower: "",
            displayGuard: "",
            displayState: "",
            displayAttribute: "",
            powerValue: 0,
            guardValue: 0,
            stateValue: 0
        };
    }

    const { calcSkillData, matchedPassives, appliedPassives } = resolveSkillDataWithConditionalPassives(skillData, {
        activeConditionalPassives: options?.activeConditionalPassives
    });
    const sourceSkill = calcSkillData || skillData;
    const adjustedSkill = applyGlobalFinalRatesToSkillData(sourceSkill, options.globalFinalRates);

    const statSource = getMultiplierStatSource(sourceSkill, {
        conditionalPassiveStatusBonuses: options?.conditionalPassiveStatusBonuses
    });
    const attackReference = getAttackStatReference(sourceSkill);
    const additionalPowerReference = getAdditionalPowerReference(sourceSkill);
    const attackValue = getAttackStatValue(statSource, sourceSkill);
    const additionalPowerValue = getAdditionalPowerValue(statSource, sourceSkill);
    const attackMultiplier =
        1 + attackValue / 100;
    const powerMultiplier =
        1 + additionalPowerValue / 500;
    let magicMultiplier = 1;
    let uper = attackMultiplier * powerMultiplier;

    if (shouldApplyMagicMultiplierToDisplay(sourceSkill)) {
        const magicLevel = getMagicLevelForMultiplier(sourceSkill, sourceSkill?.種別, "M");
        if (magicLevel !== null) {
            magicMultiplier = 0.15 + magicLevel * 0.2;
            if (Number.isFinite(magicMultiplier) && magicMultiplier > 0) {
                uper *= magicMultiplier;
            } else {
                magicMultiplier = 1;
            }
        }
    }

    let fullPowerSkillMultiplier = 1;
    let fullPowerATotalMultiplier = 1;
    if (options.isFullPowerOn) {
        let ownFullPower = toFiniteNumber(sourceSkill?.全力);
        if (ownFullPower !== 0) {
            fullPowerSkillMultiplier = ownFullPower / 100 + 1.15;
        }
        if (String(slot).toUpperCase() === "A") {
            const totalFullPower = toFiniteNumber(options.totalFullPower);
            fullPowerATotalMultiplier = totalFullPower / 100 + 1.25;
        }
    }
    const fullPowerMultiplier = fullPowerSkillMultiplier * fullPowerATotalMultiplier;
    const globalAllPowerMultiplier = toFiniteNumber(options?.globalAllPowerMultiplier);
    const allPowerMultiplier = globalAllPowerMultiplier > 0
        ? globalAllPowerMultiplier
        : resolveAllPowerMultiplier(sourceSkill);
    const globalDefensePerformanceMultiplier = toFiniteNumber(options?.globalDefensePerformanceMultiplier);
    const defensePerformanceMultiplier = globalDefensePerformanceMultiplier > 0
        ? globalDefensePerformanceMultiplier
        : 1;
    const effectiveMultiplier = uper * fullPowerMultiplier * allPowerMultiplier;

    const calculatedTotals = getCalculatedSkillDisplayTotals(adjustedSkill);
    const basePowerValue = pickNonZeroNumeric(adjustedSkill?.威力, calculatedTotals.power);
    const baseGuardValue = pickNonZeroNumeric(adjustedSkill?.守り ?? adjustedSkill?.防御, calculatedTotals.guard);
    const baseStateValue = pickNonZeroNumeric(adjustedSkill?.状態, calculatedTotals.state);

    const displayName = toDisplayText(skillData.和名 || skillData.技名 || skillData.name);
    const displayRuby = toDisplayText(skillData.英名);
    const displayIcons = getSkillIcons(skillData);
    // 一覧表示の威力は戦闘計算に合わせて倍率込みで表示
    let displayPower = toDisplayNumber(basePowerValue, effectiveMultiplier);
    let displayGuard = toDisplayNumber(baseGuardValue, effectiveMultiplier);
    let displayState = toDisplayNumber(baseStateValue, effectiveMultiplier);
    let displayAttribute = toDisplayText(sourceSkill.属性);
    let powerBeforeMultiplier = basePowerValue;
    let powerValue = toScaledNumber(basePowerValue, effectiveMultiplier);
    let guardValue = toScaledNumber(baseGuardValue, effectiveMultiplier);
    let stateValue = toScaledNumber(baseStateValue, effectiveMultiplier);
    let overrideMetricBreakdown = null;

    const aSlotOverride = resolveASlotNormalAttackOverride(slot, skillData, {
        defensePerformanceMultiplier,
        conditionalPassiveStatusBonuses: options?.conditionalPassiveStatusBonuses,
        activeConditionalPassives: options?.activeConditionalPassives
    });
    if (aSlotOverride) {
        overrideMetricBreakdown = (
            aSlotOverride.__metricBreakdown
            && typeof aSlotOverride.__metricBreakdown === "object"
        ) ? aSlotOverride.__metricBreakdown : null;
        const passivePowerDelta = toFiniteNumber(sourceSkill.威力) - toFiniteNumber(skillData?.威力);
        const passiveGuardDelta =
            toFiniteNumber(sourceSkill.守り ?? sourceSkill.防御)
            - toFiniteNumber(skillData?.守り ?? skillData?.防御);
        const passiveStateDelta = toFiniteNumber(sourceSkill.状態) - toFiniteNumber(skillData?.状態);
        const overridePowerBase = toFiniteNumber(aSlotOverride.威力) + passivePowerDelta;
        const overrideGuardBase = toFiniteNumber(aSlotOverride.守り ?? aSlotOverride.防御) + passiveGuardDelta;
        const overrideStateBase = toFiniteNumber(aSlotOverride.状態) + passiveStateDelta;
        const overrideAttributeBase = toFiniteNumber(aSlotOverride.属性);
        powerBeforeMultiplier = overridePowerBase;
        const overrideFinalMultiplier = fullPowerMultiplier * allPowerMultiplier;
        const overridePowerWithRates = Math.max(
            0,
            sumMetricBreakdownWithGlobalRates(overrideMetricBreakdown?.power, options?.globalFinalRates)
        );
        const overrideAttributeWithRates = Math.max(
            0,
            sumMetricBreakdownWithGlobalRates(overrideMetricBreakdown?.attribute, options?.globalFinalRates)
        );
        const resolvedOverridePowerBase = overridePowerWithRates > 0 ? overridePowerWithRates : overridePowerBase;
        const resolvedOverrideAttributeBase = overrideAttributeWithRates > 0 ? overrideAttributeWithRates : overrideAttributeBase;
        displayPower = toDisplayNumber(resolvedOverridePowerBase, overrideFinalMultiplier);
        displayGuard = toDisplayNumber(overrideGuardBase, overrideFinalMultiplier);
        displayState = toDisplayNumber(overrideStateBase, overrideFinalMultiplier);
        displayAttribute = toDisplayNumber(resolvedOverrideAttributeBase, overrideFinalMultiplier);
        if (!displayAttribute) {
            displayAttribute = toDisplayText(aSlotOverride.属性);
        }
        powerValue = toScaledNumber(resolvedOverridePowerBase, overrideFinalMultiplier);
        guardValue = toScaledNumber(overrideGuardBase, overrideFinalMultiplier);
        stateValue = toScaledNumber(overrideStateBase, overrideFinalMultiplier);
    }

    return {
        skillData,
        calcSkillData: sourceSkill,
        adjustedSkillData: adjustedSkill,
        matchedPassives: Array.isArray(matchedPassives) ? matchedPassives : [],
        appliedPassives: Array.isArray(appliedPassives) ? appliedPassives : [],
        overrideMetricBreakdown,
        attackReference,
        additionalPowerReference,
        attackValue,
        additionalPowerValue,
        attackMultiplier,
        powerMultiplier,
        magicMultiplier,
        allPowerMultiplier,
        fullPowerMultiplier,
        sourceTag: getSkillDisplaySourceTag(sourceSkill) || "skills",
        uper,
        effectiveMultiplier,
        powerBeforeMultiplier,
        powerAfterMultiplier: powerValue,
        displayName,
        displayRuby,
        displayIcons,
        displayPower,
        displayGuard,
        displayState,
        displayAttribute,
        powerValue,
        guardValue,
        stateValue
    };
}

function resolveUnifiedGuardValue({
    slot = "",
    preview = null,
    sourceSkill = null,
    fallbackSkillData = null,
    slotDivisor = 1
} = {}) {
    const normalizedSlot = String(slot || "").toUpperCase();
    const divisor = Math.max(1, Math.round(toFiniteNumber(slotDivisor) || 1));
    const rawGuard = toFiniteNumber(preview?.guardValue);
    const displayGuardValue = divisor > 1 ? Math.round(rawGuard / divisor) : rawGuard;
    const hasOverrideBreakdown = Boolean(
        preview?.overrideMetricBreakdown
        && typeof preview.overrideMetricBreakdown === "object"
    );
    const guardSourceSkill = preview?.adjustedSkillData || sourceSkill || fallbackSkillData || {};
    const normalAttackGuardSkill = guardSourceSkill || sourceSkill || fallbackSkillData || {};
    const shouldApplyAttackMethodGuard = isASlotNormalAttackBySkill(normalAttackGuardSkill ? slot : "", normalAttackGuardSkill);
    const physicalGuardBase = toFiniteNumber(guardSourceSkill?.物理ガード);
    const magicGuardRaw = toFiniteNumber(guardSourceSkill?.魔法ガード);
    const hasGuardByType = physicalGuardBase > 0 || magicGuardRaw > 0;
    const isSQSlot = normalizedSlot === "S" || normalizedSlot === "Q1" || normalizedSlot === "Q2";
    const attackMethodGuardValue = shouldApplyAttackMethodGuard
        ? toFiniteNumber(getAttackOptionValueByAliases(
            getSelectedAttackOptionData(),
            ["防御性能", "防御倍率", "防御性能倍率", "守り", "防御", "guard"],
            0
        ))
        : 0;
    const magicGuardApplied = (isSQSlot && magicGuardRaw >= 1) ? magicGuardRaw : 0;

    let rowGuardValue = toFiniteNumber(displayGuardValue);
    if (!hasOverrideBreakdown && hasGuardByType) {
        const physicalGuardWithMethod = physicalGuardBase + attackMethodGuardValue;
        const magicGuardWithMethod = magicGuardApplied + attackMethodGuardValue;
        const guardBaseByRule = Math.max(physicalGuardWithMethod, magicGuardWithMethod);
        const guardMultiplier = Math.max(0, toFiniteNumber(preview?.effectiveMultiplier) || 1);
        const rawGuardByRule = toScaledNumber(guardBaseByRule, guardMultiplier);
        rowGuardValue = divisor > 1 ? Math.round(rawGuardByRule / divisor) : rawGuardByRule;
    }

    return {
        rowGuardValue,
        displayGuardValue,
        hasOverrideBreakdown,
        guardSourceSkill,
        hasGuardByType,
        physicalGuardBase,
        magicGuardRaw,
        magicGuardApplied,
        attackMethodGuardValue
    };
}

function isMeaningfulConditionValue(value) {
    const text = normalizeBattleText(value);
    if (!text) return false;
    const lower = text.toLowerCase();
    return (
        lower !== "0"
        && lower !== "未選択"
        && lower !== "入力なし"
        && lower !== "undefined"
        && lower !== "null"
        && lower !== "nan"
    );
}

function normalizeConditionToken(value) {
    const raw = normalizeBattleText(value);
    if (!raw) return "";
    return raw
        .replace(/^(攻撃手段|条件スキル|条件属性|条件)\s*[:：]\s*/i, "")
        .trim();
}

function splitConditionTokens(value) {
    const text = normalizeBattleText(value);
    if (!isMeaningfulConditionValue(text)) return [];
    return text
        .split(/[,\u3001，/／|｜&＆+\s]+/g)
        .map((token) => normalizeConditionToken(token))
        .filter((token) => token !== "" && isMeaningfulConditionValue(token));
}

function conditionMatches(conditionValue, targetValue) {
    if (!isMeaningfulConditionValue(conditionValue)) return true;
    const condTokens = splitConditionTokens(conditionValue);
    if (!condTokens.length) return true;

    const targetText = normalizeConditionToken(targetValue);
    if (!targetText) return false;
    const targetTokens = new Set([targetText, ...splitConditionTokens(targetText)]);

    // 条件が複数ある場合は AND 条件
    return condTokens.every((token) => (
        targetTokens.has(token) || targetText.includes(token)
    ));
}

function getConditionalPassiveSkills() {
    const condPassives = playerData?.skills?.PA?.condPassives;
    return Array.isArray(condPassives) ? condPassives : [];
}

function isBodyMethodConditionalPassive(passiveSkill) {
    if (!passiveSkill || typeof passiveSkill !== "object") return false;
    const methodTokens = splitConditionTokens(passiveSkill?.攻撃手段);
    return methodTokens.includes("肉体");
}

function getMatchedBodyMethodConditionalPassivesForSkill(skillData) {
    if (!skillData || typeof skillData !== "object") return [];
    const context = buildConditionContextForSkill(skillData);
    return getConditionalPassiveSkills().filter((passiveSkill) => (
        isBodyMethodConditionalPassive(passiveSkill)
        && isConditionalPassiveMatched(passiveSkill, context)
    ));
}

function getSelectedSkillConditionContexts(targetSelectedSkills = selectedSkills) {
    const contexts = [];
    SELECTED_SKILL_SLOT_ORDER.forEach((slot) => {
        const skillData = getSkillData(targetSelectedSkills?.[slot]);
        if (!skillData || typeof skillData !== "object") return;
        const context = buildConditionContextForSkill(skillData);
        if (
            isMeaningfulConditionValue(context.attackMethod)
            || isMeaningfulConditionValue(context.skillName)
            || isMeaningfulConditionValue(context.attribute)
        ) {
            contexts.push(context);
        }
    });
    return contexts;
}

function getActiveConditionalPassivesForSelectedSkills(targetSelectedSkills = selectedSkills) {
    const contexts = getSelectedSkillConditionContexts(targetSelectedSkills);
    if (!contexts.length) return [];
    return getConditionalPassiveSkills().filter((passiveSkill) => (
        !isBodyMethodConditionalPassive(passiveSkill)
        && contexts.some((context) => isConditionalPassiveMatched(passiveSkill, context))
    ));
}

function getRuntimePassiveLikeSkillsForSelectedSkills(
    targetSelectedSkills = selectedSkills,
    options = {}
) {
    const conditionalPassives = getActiveConditionalPassivesForSelectedSkills(targetSelectedSkills);
    const characterName = normalizeBattleText(
        options?.characterName
        || selectName
        || playerData?.name
        || ""
    );
    const retainedBuffSkills = getRetainedBuffSkillDataListForCharacter(characterName);
    return [...conditionalPassives, ...retainedBuffSkills];
}

function hasConditionalPassiveRequirements(skillData) {
    if (!skillData || typeof skillData !== "object") return false;
    return (
        isMeaningfulConditionValue(skillData?.攻撃手段)
        || isMeaningfulConditionValue(skillData?.条件スキル ?? skillData?.条件)
        || isMeaningfulConditionValue(skillData?.条件属性)
    );
}

function isSamePassiveSkill(a, b) {
    if (a === b) return true;
    if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
    const keys = ["和名", "技名", "name", "攻撃手段", "条件スキル", "条件", "条件属性", "詳細", "種別"];
    return keys.every((key) => normalizeBattleText(a?.[key]) === normalizeBattleText(b?.[key]));
}

function isConditionalPassiveOnForSelectedSkills(skillData, targetSelectedSkills = selectedSkills) {
    if (!skillData || typeof skillData !== "object") return false;
    const contexts = getSelectedSkillConditionContexts(targetSelectedSkills);
    if (!contexts.length) return false;
    return contexts.some((context) => isConditionalPassiveMatched(skillData, context));
}

function getConditionalPassiveVisualState(skillData, activeConditionalPassives = [], targetSelectedSkills = selectedSkills) {
    if (!skillData || typeof skillData !== "object") return "";
    if (!hasConditionalPassiveRequirements(skillData)) return "on";
    // 攻撃手段:肉体 の条件PはON表示にしない（A枠通常攻撃計算時のみ適用）。
    if (isBodyMethodConditionalPassive(skillData)) return "off";
    let isOn = isConditionalPassiveOnForSelectedSkills(skillData, targetSelectedSkills);
    if (!isOn && Array.isArray(activeConditionalPassives) && activeConditionalPassives.length > 0) {
        isOn = activeConditionalPassives.some((passive) => isSamePassiveSkill(passive, skillData));
    }
    return isOn ? "on" : "off";
}

function isConditionalPassiveMatched(passiveSkill, context) {
    if (!passiveSkill || typeof passiveSkill !== "object") return false;
    return (
        conditionMatches(passiveSkill.攻撃手段, context.attackMethod)
        && conditionMatches(passiveSkill.条件スキル ?? passiveSkill.条件, context.skillName)
        && conditionMatches(passiveSkill.条件属性, context.attribute)
    );
}

function buildSkillDataWithConditionalPassives(skillData, context, options = {}) {
    if (!skillData || typeof skillData !== "object") {
        return { mergedSkillData: skillData, matchedPassives: [], appliedPassives: [] };
    }

    const matchedPassives = Array.isArray(options?.activeConditionalPassives)
        ? options.activeConditionalPassives
            .filter((passiveSkill) => passiveSkill && typeof passiveSkill === "object")
            .filter((passiveSkill) => isConditionalPassiveMatched(passiveSkill, context))
        : getConditionalPassiveSkills().filter((passiveSkill) =>
            isConditionalPassiveMatched(passiveSkill, context)
        );
    const appliedPassives = matchedPassives.filter((passiveSkill) => (
        !isSamePassiveSkill(passiveSkill, skillData)
    ));

    if (!matchedPassives.length) {
        return { mergedSkillData: skillData, matchedPassives, appliedPassives: [] };
    }

    const mergedSkillData = { ...skillData };
    const skipKeys = new Set([
        "和名", "英名", "技名", "name", "種別", "属性", "詳細",
        "攻撃手段", "条件", "条件スキル", "条件属性"
    ]);

    appliedPassives.forEach((passiveSkill) => {
        Object.entries(passiveSkill).forEach(([key, value]) => {
            if (skipKeys.has(key)) return;
            if (normalizeConditionalPassiveGlobalBoostKey(key)) return;
            const numeric = Number(value);
            if (!Number.isFinite(numeric) || numeric === 0) return;
            const current = Number(mergedSkillData[key]);
            mergedSkillData[key] = (Number.isFinite(current) ? current : 0) + numeric;
        });
    });

    return { mergedSkillData, matchedPassives, appliedPassives };
}

function buildConditionPassiveModalItems(matchedPassives) {
    const normalizeConditionDisplayText = (value) => {
        const text = normalizeBattleText(value);
        return isMeaningfulConditionValue(text) ? text : "";
    };

    return (Array.isArray(matchedPassives) ? matchedPassives : [])
        .map((passive) => ({
            name: String(passive?.和名 || passive?.技名 || passive?.name || "").trim(),
            attackMethod: normalizeConditionDisplayText(passive?.攻撃手段),
            skillCondition: normalizeConditionDisplayText(passive?.条件スキル ?? passive?.条件),
            attributeCondition: normalizeConditionDisplayText(passive?.条件属性),
            description: String(passive?.詳細 || passive?.description || "").trim()
        }))
        .filter((item) => {
            const hasAnyCondition = !!(item.attackMethod || item.skillCondition || item.attributeCondition);
            if (!hasAnyCondition) return false;
            return (item.name || item.description);
        });
}

function openConditionPassiveModalForSkill(skillData, titlePrefix = "") {
    if (!skillData || typeof skillData !== "object") return;
    const context = buildConditionContextForSkill(skillData);
    const { matchedPassives } = buildSkillDataWithConditionalPassives(skillData, context);
    const items = buildConditionPassiveModalItems(matchedPassives);
    if (!items.length) return;
    if (typeof window.openConditionPassiveModalVue !== "function") return;

    const label = normalizeBattleText(titlePrefix || skillData?.和名 || skillData?.技名 || skillData?.name);
    window.openConditionPassiveModalVue({
        title: label ? `${label} 一致Pスキル` : "一致Pスキル",
        items
    });
}

function getMatchedConditionPassiveItemsForSkill(skillData) {
    if (!skillData || typeof skillData !== "object") return [];
    const context = buildConditionContextForSkill(skillData);
    const { matchedPassives } = buildSkillDataWithConditionalPassives(skillData, context);
    return buildConditionPassiveModalItems(matchedPassives);
}

function buildSkillDescriptionContentHtml(skillData, options = {}) {
    const description = String(skillData?.詳細 || skillData?.description || "").trim();
    const cooldownText = normalizeBattleText(options?.cooldownText);
    const hasCooldownOverlay = Boolean(cooldownText);
    const descriptionClass = hasCooldownOverlay
        ? "skill-description-text skill-description-text-cooldown-faded"
        : "skill-description-text";
    const cooldownOverlayHtml = hasCooldownOverlay
        ? `<span class="skill-cooldown-overlay-text" aria-hidden="true">${cooldownText}</span>`
        : "";
    const matchedItems = getMatchedConditionPassiveItemsForSkill(skillData);
    if (!matchedItems.length) {
        return `<span class="${descriptionClass}">${description}</span>${cooldownOverlayHtml}`;
    }
    return `<span class="${descriptionClass}">${description}</span>${cooldownOverlayHtml}
        <button type="button" class="skill-passive-open-btn" data-open-condition-passive="1">P${matchedItems.length}</button>`;
}

function buildSkillDescriptionCellHtml(skillData, options = {}) {
    const cooldownText = normalizeBattleText(options?.cooldownText);
    const classes = cooldownText
        ? "skill-description-cell skill-description-cell-cooldown-overlay skill-cooldown-active"
        : "skill-description-cell";
    return `<td class="${classes}">${buildSkillDescriptionContentHtml(skillData, { cooldownText })}</td>`;
}

function bindSkillDescriptionCellButton(row, skillData) {
    const button = row?.querySelector?.('[data-open-condition-passive="1"]');
    if (!button) return;
    button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openConditionPassiveModalForSkill(skillData);
    });
}

function getSelectedAttackOptionData() {
    const selectElement = document.getElementById("attack-method-select");
    if (!selectElement) return null;

    const selectedValue = normalizeBattleText(selectElement.value);
    if (!selectedValue) return null;

    return getAttackOptionByValue(selectedValue, attackOptions);
}

// 攻撃手段は tabContainer 側で「総合」に生データを保持しているため、
// 計算時は総合データを優先して参照する。
function getAttackOptionRawSource(attackOption) {
    const raw = attackOption?.総合;
    if (raw && typeof raw === "object") return raw;
    return attackOption || {};
}

// 同義キー（例: 防御性能 / 防御倍率）を順に見て、最初の有効値を返す。
function getAttackOptionValueByAliases(attackOption, aliases = [], fallback = 0) {
    const raw = getAttackOptionRawSource(attackOption);
    for (const key of aliases) {
        const value = toFiniteNumber(raw?.[key]);
        if (Number.isFinite(value) && value !== 0) return value;
    }
    for (const key of aliases) {
        const value = toFiniteNumber(attackOption?.[key]);
        if (Number.isFinite(value) && value !== 0) return value;
    }
    return toFiniteNumber(fallback);
}

function parseDamageBreakValue(rawValue) {
    if (rawValue === null || rawValue === undefined) return 0;
    const direct = Number(rawValue);
    if (Number.isFinite(direct)) return direct;

    const text = String(rawValue).normalize("NFKC").trim();
    if (!text) return 0;

    const rangeMatch = text.match(/(-?\d+(?:\.\d+)?)\s*[~〜]\s*(-?\d+(?:\.\d+)?)/);
    if (rangeMatch) {
        const low = Number(rangeMatch[1]);
        const high = Number(rangeMatch[2]);
        if (Number.isFinite(low) && Number.isFinite(high)) {
            // UI表示は (40 + 最低ダメージ) ~ 100 なので、範囲表記は内部値へ戻す。
            if (high >= 90 && low >= 40) {
                return Math.max(0, low - 40);
            }
            return low;
        }
    }

    const singleMatch = text.match(/-?\d+(?:\.\d+)?/);
    if (singleMatch) {
        const parsed = Number(singleMatch[0]);
        if (Number.isFinite(parsed)) return parsed;
    }
    return 0;
}

function getAttackOptionDamageBreakValueByAliases(attackOption, aliases = [], fallback = 0) {
    const raw = getAttackOptionRawSource(attackOption);
    for (const key of aliases) {
        if (raw && Object.prototype.hasOwnProperty.call(raw, key)) {
            return parseDamageBreakValue(raw[key]);
        }
    }
    for (const key of aliases) {
        if (attackOption && Object.prototype.hasOwnProperty.call(attackOption, key)) {
            return parseDamageBreakValue(attackOption[key]);
        }
    }
    return parseDamageBreakValue(fallback);
}

function parseAttackOptionFullPowerBonusPercent(value) {
    if (value === null || value === undefined) return 0;
    const normalized = String(value)
        .normalize("NFKC")
        .replace(/,/g, "")
        .trim();
    if (!normalized) return 0;

    // 明示%はそのまま補正値(%)として扱う
    if (/[％%]\s*$/.test(normalized)) {
        const percentRaw = normalized.replace(/[％%]\s*$/g, "").trim();
        const percentValue = Number(percentRaw);
        return Number.isFinite(percentValue) ? percentValue : 0;
    }

    const num = Number(normalized);
    if (!Number.isFinite(num)) return 0;

    // 攻撃手段側の全力は 1.5 のような倍率表記を許容し、
    // A合計式(1.25 + 補正)へ入れるため補正値(%)へ変換する。
    if (Math.abs(num) <= 5) {
        return (num - 1.25) * 100;
    }
    return num;
}

function getAttackOptionFullPowerBonusPercentByAliases(attackOption, aliases = [], fallback = 0) {
    const raw = getAttackOptionRawSource(attackOption);
    for (const key of aliases) {
        const value = parseAttackOptionFullPowerBonusPercent(raw?.[key]);
        if (Number.isFinite(value) && value !== 0) return value;
    }
    for (const key of aliases) {
        const value = parseAttackOptionFullPowerBonusPercent(attackOption?.[key]);
        if (Number.isFinite(value) && value !== 0) return value;
    }
    return parseAttackOptionFullPowerBonusPercent(fallback);
}

function getAttackOptionFullPowerValueWithLog(attackOption, contextLabel = "") {
    const aliases = ["全力", "全力補正", "全力倍率", "全力倍", "fullPower", "fullPowerRate"];
    const bonusPercent = getAttackOptionFullPowerBonusPercentByAliases(attackOption, aliases, 0);
    const raw = getAttackOptionRawSource(attackOption);
    const rawSnapshot = {};
    aliases.forEach((key) => {
        if (raw && Object.prototype.hasOwnProperty.call(raw, key)) {
            rawSnapshot[key] = raw[key];
            return;
        }
        if (attackOption && Object.prototype.hasOwnProperty.call(attackOption, key)) {
            rawSnapshot[key] = attackOption[key];
        }
    });
    console.log(`[SkillSet][攻撃手段全力] ${String(contextLabel || "").trim()}`.trim(), {
        attackMethod: normalizeBattleText(attackOption?.value || attackOption?.label || raw?.名前 || ""),
        fullPowerBonusPercent: bonusPercent,
        raw: rawSnapshot
    });
    return bonusPercent;
}

// 射撃/狙撃は「銃」または「弓」系の攻撃手段だけ有効にする。
function isGunOrBowAttackOption(attackOption) {
    const raw = getAttackOptionRawSource(attackOption);
    const text = [
        raw?.種類,
        raw?.種別,
        raw?.名前,
        attackOption?.label,
        attackOption?.value
    ]
        .map((v) => String(v ?? "").trim())
        .filter(Boolean)
        .join(" ");
    return /(銃|弓)/.test(text);
}

// ステータス参照元が配列/単体オブジェクトの両方に対応。
function getStatValueFromSource(statSource, key) {
    const judgeApi = getSkillPowerJudgeApi();
    if (judgeApi?.getStatValueFromSource) {
        return judgeApi.getStatValueFromSource(statSource, key, { toFiniteNumber });
    }
    if (Array.isArray(statSource)) {
        return toFiniteNumber(statSource?.[0]?.[key]);
    }
    return toFiniteNumber(statSource?.[key]);
}

// 基本式: 元値 × (1 + 判定ステータス/100)
function applyCharacterStatRate(baseValue, statValue) {
    const judgeApi = getSkillPowerJudgeApi();
    if (judgeApi?.applyCharacterStatRate) {
        return judgeApi.applyCharacterStatRate(baseValue, statValue, { toFiniteNumber });
    }
    return toFiniteNumber(baseValue) * (1 + toFiniteNumber(statValue) / 100);
}

// A枠の通常攻撃系スキルを、攻撃手段データ由来の値で上書きする。
// 対応仕様:
// - 切断/貫通/打撃: 攻撃手段の同名値 × 攻撃判定
// - 射撃/狙撃: 攻撃手段が銃/弓のときのみ「貫通 × 攻撃判定」
// - 防御: 防御性能(防御倍率) × 防御判定
// - 攻勢盾: 防御性能 × 防御判定 + 打撃 × 防御判定
function getBodyAttackOptionPassiveBonus(attackOption, conditionalBonuses = {}) {
    const optionValue = normalizeBattleText(attackOption?.value);
    if (!BODY_ATTACK_OPTION_VALUES.includes(optionValue)) return 0;

    const bodyBonus = toFiniteNumber(conditionalBonuses?.肉体);
    const partBonus = toFiniteNumber(conditionalBonuses?.[optionValue]);
    return bodyBonus + partBonus;
}

function buildBodyAttackOptionPassiveBonusSource(passives = []) {
    const bonuses = { 肉体: 0 };
    const list = Array.isArray(passives) ? passives : [];
    list.forEach((passiveSkill) => {
        if (!passiveSkill || typeof passiveSkill !== "object") return;
        Object.entries(passiveSkill).forEach(([key, value]) => {
            const baseKey = normalizeConditionalPassiveGlobalBoostKey(key);
            if (!baseKey) return;
            bonuses[baseKey] = toFiniteNumber(bonuses[baseKey]) + toFiniteNumber(value);
        });
    });
    return bonuses;
}

function normalizePassiveAttackBonusKey(key) {
    return String(key || "").trim().replace(/[+＋]+$/g, "");
}

function collectBodyAttackOptionPassiveDirectBonuses(attackOption, activeConditionalPassives = []) {
    const optionValue = normalizeBattleText(attackOption?.value);
    if (!BODY_ATTACK_OPTION_VALUES.includes(optionValue)) {
        return { cut: 0, pierce: 0, blunt: 0, guard: 0, attribute: 0 };
    }

    const bonuses = { cut: 0, pierce: 0, blunt: 0, guard: 0, attribute: 0 };
    const passives = Array.isArray(activeConditionalPassives) ? activeConditionalPassives : [];

    passives.forEach((passiveSkill) => {
        if (!passiveSkill || typeof passiveSkill !== "object") return;
        const methodTokens = splitConditionTokens(passiveSkill?.攻撃手段);
        const appliesToBody = methodTokens.includes("肉体") || methodTokens.includes(optionValue);
        if (!appliesToBody) return;

        Object.entries(passiveSkill).forEach(([rawKey, rawValue]) => {
            const value = toFiniteNumber(rawValue);
            if (value === 0) return;
            const key = normalizePassiveAttackBonusKey(rawKey);
            switch (key) {
                case "切断":
                    bonuses.cut += value;
                    break;
                case "貫通":
                    bonuses.pierce += value;
                    break;
                case "打撃":
                    bonuses.blunt += value;
                    break;
                case "防御性能":
                case "防御倍率":
                case "防御":
                    bonuses.guard += value;
                    break;
                case "属性":
                    bonuses.attribute = Math.max(bonuses.attribute, value);
                    break;
                default:
                    if (ATTACK_OPTION_ATTRIBUTE_KEYS.includes(key)) {
                        bonuses.attribute = Math.max(bonuses.attribute, value);
                    }
                    break;
            }
        });
    });

    return bonuses;
}

// 条件Pに「攻撃回数」がある場合の増分を合算する。
function getConditionalPassiveAttackCountBonus(activeConditionalPassives = []) {
    let bonus = 0;
    const passives = Array.isArray(activeConditionalPassives) ? activeConditionalPassives : [];
    passives.forEach((passiveSkill) => {
        if (!passiveSkill || typeof passiveSkill !== "object") return;
        Object.entries(passiveSkill).forEach(([rawKey, rawValue]) => {
            const key = normalizePassiveAttackBonusKey(rawKey);
            if (key !== "攻撃回数") return;
            bonus += toFiniteNumber(rawValue);
        });
    });
    return bonus;
}

function resolveAttackCountMultiplierFromSkill(skillData) {
    const text = [
        skillData?.詳細,
        skillData?.和名,
        skillData?.技名,
        skillData?.name
    ]
        .map((value) => String(value ?? ""))
        .join(" ");

    let multiplier = 1;
    const explicitMatches = text.match(/(\d+)\s*倍(?:化|加)/g) || [];
    explicitMatches.forEach((matched) => {
        const num = Number((matched.match(/(\d+)/) || [])[1]);
        if (Number.isFinite(num) && num >= 2) {
            multiplier = Math.max(multiplier, Math.round(num));
        }
    });
    if (multiplier === 1 && /(倍化|倍加)/.test(text)) {
        multiplier = 2;
    }
    return Math.max(1, multiplier);
}

function resolveGlobalAttackCountMultiplier(targetSelectedSkills = selectedSkills, options = {}) {
    const includeSkill = (typeof options?.includeSkill === "function")
        ? options.includeSkill
        : (() => true);
    let multiplier = 1;
    SELECTED_SKILL_SLOT_ORDER.forEach((slot) => {
        const skillData = getSkillData(targetSelectedSkills?.[slot]);
        if (!skillData || typeof skillData !== "object") return;
        if (!includeSkill(slot, skillData)) return;
        multiplier = Math.max(multiplier, resolveAttackCountMultiplierFromSkill(skillData));
    });
    return Math.max(1, multiplier);
}

function resolveSplitAttackCountMultiplier(targetSelectedSkills = selectedSkills) {
    const aSkill = getSkillData(targetSelectedSkills?.A);
    if (!aSkill || typeof aSkill !== "object") return 1;
    return Math.max(1, resolveAttackCountMultiplierFromSkill(aSkill));
}

function parseAttackCountFieldValue(rawValue, { isAdd = false } = {}) {
    const numeric = Number(rawValue);
    if (Number.isFinite(numeric)) {
        return Math.max(0, Math.round(numeric));
    }

    const text = String(rawValue ?? "").trim();
    if (!text) return 0;
    const normalized = text.replace(/[xX×]/g, "倍");

    const explicitMultiplier = normalized.match(/(-?\d+)\s*倍(?:化|加)?/);
    if (explicitMultiplier) {
        const multiplier = Number(explicitMultiplier[1]);
        if (!Number.isFinite(multiplier)) return 0;
        const rounded = Math.max(0, Math.round(multiplier));
        return isAdd ? Math.max(0, rounded - 1) : rounded;
    }

    if (/(倍化|倍加)/.test(normalized)) {
        return isAdd ? 1 : 2;
    }

    const fallbackNumber = normalized.match(/-?\d+(?:\.\d+)?/);
    if (!fallbackNumber) return 0;
    const parsed = Number(fallbackNumber[0]);
    return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function getSkillAttackCountInfo(skillData) {
    if (!skillData || typeof skillData !== "object") {
        return { hasExplicitBase: false, baseCount: 0, addedCount: 0, totalCount: 0 };
    }
    const normalizeKey = (value) => String(value ?? "")
        .replace(/[\s　:_\-]/g, "")
        .trim();
    const isAddKey = (normalizedKey) => (
        normalizedKey.includes("攻撃追加回数")
        || normalizedKey.includes("追加回数")
    );
    const isBaseKey = (normalizedKey) => (
        !isAddKey(normalizedKey)
        && (normalizedKey.includes("攻撃回数") || normalizedKey === "回数")
    );

    let hasExplicitBase = false;
    let baseRaw = null;
    let addRaw = null;
    Object.entries(skillData).forEach(([rawKey, rawValue]) => {
        const key = normalizeKey(rawKey);
        const addKey = isAddKey(key);
        const baseKey = isBaseKey(key);
        if (!addKey && !baseKey) return;

        const value = parseAttackCountFieldValue(rawValue, { isAdd: addKey });
        if (addKey) {
            addRaw = value;
            return;
        }
        if (baseKey) {
            hasExplicitBase = true;
            baseRaw = value;
        }
    });

    const addedCount = Math.max(0, Math.round(addRaw ?? 0));
    let baseCount = Math.max(0, Math.round(baseRaw ?? 0));
    // 追加回数だけ指定されているケースは、実質「1 + 追加回数」として扱う。
    if (!hasExplicitBase && addedCount > 0) {
        baseCount = 1;
    }
    const totalCount = Math.max(0, baseCount + addedCount);
    return { hasExplicitBase, baseCount, addedCount, totalCount };
}

// 攻撃回数の扱い:
// - A枠が通常攻撃系: 攻撃手段の攻撃回数(+条件P)を分割数として使う。
// - A枠が通常攻撃系でない: 攻撃手段の攻撃回数は適用しない（基礎1）。
function resolveBattleAttackCountContext(options = {}) {
    const aSkill = getSkillData(selectedSkills?.A);
    const actionKey = resolveASlotNormalAttackActionKey(aSkill || {});
    const skillAttribute = normalizeBattleText(aSkill?.属性);
    const isANormalAttack = Boolean(aSkill) && (
        A_SLOT_NORMAL_ATTACK_SKILL_NAMES.has(actionKey)
        || skillAttribute === "通常攻撃"
    );
    const attackOption = isANormalAttack ? getSelectedAttackOptionData() : null;
    const baseRaw = (isANormalAttack && attackOption)
        ? getAttackOptionValueByAliases(attackOption, ["攻撃回数"], 1)
        : 1;
    const baseCount = Math.max(1, Math.round(toFiniteNumber(baseRaw) || 1));
    const globalPassiveBonus = getConditionalPassiveAttackCountBonus(options?.activeConditionalPassives);
    const bodyMatchedPassives = isANormalAttack
        ? getMatchedBodyMethodConditionalPassivesForSkill(aSkill)
        : [];
    const bodyPassiveBonus = getConditionalPassiveAttackCountBonus(bodyMatchedPassives);
    const passiveBonus = globalPassiveBonus + bodyPassiveBonus;
    const displayBaseCount = Math.max(1, Math.round(baseCount + passiveBonus));
    const splitCount = isANormalAttack ? displayBaseCount : 1;
    return {
        isANormalAttack,
        enabledSplit: isANormalAttack && splitCount >= 2,
        baseCount,
        passiveBonus,
        displayBaseCount,
        splitCount
    };
}

function resolveASlotNormalAttackOverride(slot, skillData, options = {}) {
    if (!skillData || typeof skillData !== "object") return null;

    const actionKey = resolveASlotNormalAttackActionKey(skillData);
    const skillAttribute = normalizeBattleText(skillData.属性);
    const shouldUseAttackMethod =
        A_SLOT_NORMAL_ATTACK_SKILL_NAMES.has(actionKey)
        || (slot === "A" && skillAttribute === "通常攻撃");
    if (!shouldUseAttackMethod) return null;

    const attackOption = getSelectedAttackOptionData();
    if (!attackOption) {
        // console.log("[通常攻撃Override] 攻撃手段が未選択");
        return null;
    }
    const attackOptionRaw = getAttackOptionRawSource(attackOption);
    const attackAlreadyScaled = Boolean(
        toFiniteNumber(attackOptionRaw?.攻撃判定適用済み) !== 0
        || attackOptionRaw?.攻撃判定適用済み === true
    );
    const defenseAlreadyScaled = Boolean(
        toFiniteNumber(attackOptionRaw?.防御判定適用済み) !== 0
        || attackOptionRaw?.防御判定適用済み === true
    );

    const statSource = getMultiplierStatSource(skillData);
    const attackStat = getStatValueFromSource(statSource, "攻撃");
    const defenseStat = getStatValueFromSource(statSource, "防御");
    const defensePerformanceMultiplier = Math.max(
        0,
        toFiniteNumber(options?.defensePerformanceMultiplier) || 1
    );

    const bodyMatchedPassives = getMatchedBodyMethodConditionalPassivesForSkill(skillData);
    const bodyPassiveBonusSource = buildBodyAttackOptionPassiveBonusSource(bodyMatchedPassives);
    const bodyPassiveBonus = getBodyAttackOptionPassiveBonus(attackOption, bodyPassiveBonusSource);
    const bodyPassiveDirectBonuses = collectBodyAttackOptionPassiveDirectBonuses(
        attackOption,
        bodyMatchedPassives
    );

    let methodCut = getAttackOptionValueByAliases(attackOption, ["切断", "切断倍率", "切断威力"], 0);
    let methodPierce = getAttackOptionValueByAliases(attackOption, ["貫通", "貫通倍率", "貫通威力"], 0);
    let methodBlunt = getAttackOptionValueByAliases(attackOption, ["打撃", "打撃倍率", "打撃威力"], 0);
    let methodGuardPerf = getAttackOptionValueByAliases(
        attackOption,
        ["防御性能", "防御倍率", "防御性能倍率", "守り", "防御", "guard"],
        0
    );
    const attributeFromRaw = ATTACK_OPTION_ATTRIBUTE_KEYS.reduce((sum, key) => (
        sum + getAttackOptionValueByAliases(attackOption, [key], 0)
    ), 0);
    let methodAttribute = getAttackOptionValueByAliases(
        attackOption,
        ["属性", "element"],
        toFiniteNumber(attackOption?.属性) + attributeFromRaw
    );
    if (bodyPassiveBonus !== 0) {
        methodCut += bodyPassiveBonus;
        methodPierce += bodyPassiveBonus;
        methodBlunt += bodyPassiveBonus;
        methodGuardPerf += bodyPassiveBonus;
    }
    methodCut += bodyPassiveDirectBonuses.cut;
    methodPierce += bodyPassiveDirectBonuses.pierce;
    methodBlunt += bodyPassiveDirectBonuses.blunt;
    methodGuardPerf += bodyPassiveDirectBonuses.guard;
    methodAttribute += bodyPassiveDirectBonuses.attribute;
    const canUseRanged = isGunOrBowAttackOption(attackOption);
    const applyAttackRate = (base) => (
        attackAlreadyScaled ? toFiniteNumber(base) : applyCharacterStatRate(base, attackStat)
    );
    const applyDefenseRate = (base) => (
        defenseAlreadyScaled ? toFiniteNumber(base) : applyCharacterStatRate(base, defenseStat)
    );
    const scaledMethodCut = applyAttackRate(methodCut);
    const scaledMethodPierce = applyAttackRate(methodPierce);
    const scaledMethodBlunt = applyAttackRate(methodBlunt);
    const attributeBreakdown = {};
    ATTACK_OPTION_ATTRIBUTE_KEYS.forEach((key) => {
        const value = getAttackOptionValueByAliases(attackOption, [key], 0);
        if (value !== 0) {
            attributeBreakdown[key] = value;
        }
    });
    const knownAttributeTotal = Object.values(attributeBreakdown).reduce((sum, value) => (
        sum + toFiniteNumber(value)
    ), 0);
    const attributeRemainder = toFiniteNumber(methodAttribute) - toFiniteNumber(knownAttributeTotal);
    if (attributeRemainder !== 0) {
        attributeBreakdown.属性 = toFiniteNumber(attributeBreakdown.属性) + attributeRemainder;
    }

    let overridePower = 0;
    let overrideGuard = 0;
    let powerBreakdown = {};

    switch (actionKey) {
        case "切断":
            overridePower = applyAttackRate(methodCut);
            powerBreakdown = { 切断: overridePower };
            break;
        case "貫通":
            overridePower = applyAttackRate(methodPierce);
            powerBreakdown = { 貫通: overridePower };
            break;
        case "打撃":
            overridePower = applyAttackRate(methodBlunt);
            powerBreakdown = { 打撃: overridePower };
            break;
        case "射撃":
        case "狙撃":
            overridePower = canUseRanged
                ? applyAttackRate(methodPierce)
                : 0;
            powerBreakdown = overridePower > 0 ? { 貫通: overridePower } : {};
            break;
        case "防御":
            overrideGuard = applyDefenseRate(methodGuardPerf) * defensePerformanceMultiplier;
            break;
        case "攻勢盾":
            overrideGuard = applyDefenseRate(methodGuardPerf) * defensePerformanceMultiplier;
            overridePower = applyDefenseRate(methodBlunt);
            powerBreakdown = overridePower > 0 ? { 打撃: overridePower } : {};
            break;
        default:
            // 「通常攻撃」属性のA枠は従来通り攻撃手段の威力/守りを使う。
            overridePower = toFiniteNumber(attackOption?.威力) + bodyPassiveBonus;
            overrideGuard = toFiniteNumber(attackOption?.守り ?? attackOption?.防御) + bodyPassiveBonus;
            powerBreakdown = overridePower > 0 ? { 威力: overridePower } : {};
            break;
    }

    const result = {
        威力: overridePower,
        守り: overrideGuard,
        状態: null,
        // 属性は攻撃手段の値をそのまま使う（判定/追加威力倍率は掛けない）
        属性: methodAttribute,
        __metricBreakdown: {
            power: powerBreakdown,
            guard: {
                防御性能: overrideGuard
            },
            state: {},
            attribute: attributeBreakdown
        }
    };
    // console.log("[通常攻撃Override]", {
    //     slot,
    //     actionKey,
    //     attackOption: normalizeBattleText(attackOption?.value || attackOption?.label),
    //     bodyMatchedPassiveCount: Array.isArray(bodyMatchedPassives) ? bodyMatchedPassives.length : 0,
    //     bodyPassiveBonus,
    //     bodyPassiveDirectBonuses,
    //     result
    // });
    return result;
}

function isASlotNormalAttackBySkill(slot, skillData) {
    if (String(slot || "").toUpperCase() !== "A") return false;
    if (!skillData || typeof skillData !== "object") return false;
    const actionKey = resolveASlotNormalAttackActionKey(skillData);
    const skillAttribute = normalizeBattleText(skillData?.属性);
    return A_SLOT_NORMAL_ATTACK_SKILL_NAMES.has(actionKey) || skillAttribute === "通常攻撃";
}

function getSlotBattleExtraMetrics(slot, skillData) {
    const sourceSkill = (skillData && typeof skillData === "object") ? skillData : {};
    const minDamageAliases = ["最低ダメージ", "最低威力", "最低ダメ", "ダメージブレ", "ダメブレ"];
    const fromSkill = {
        critRate: toFiniteNumber(getFirstFiniteNumberByKeys(sourceSkill, ["Cr率", "CRI率", "クリ率"], 0)),
        critPower: toFiniteNumber(getFirstFiniteNumberByKeys(sourceSkill, ["Cr威力", "CRI威力", "クリ威力"], 0)),
        minDamage: toFiniteNumber(getFirstFiniteNumberByKeys(sourceSkill, minDamageAliases, 0)),
        defensePenetration: toFiniteNumber(getFirstFiniteNumberByKeys(sourceSkill, ["防御貫通", "物理貫通"], 0)),
        magicPenetration: toFiniteNumber(getFirstFiniteNumberByKeys(sourceSkill, ["魔法貫通"], 0))
    };

    if (!isASlotNormalAttackBySkill(slot, sourceSkill)) {
        return fromSkill;
    }

    const attackOption = getSelectedAttackOptionData();
    if (!attackOption) {
        return fromSkill;
    }

    return {
        critRate: fromSkill.critRate + toFiniteNumber(getAttackOptionValueByAliases(attackOption, ["Cr率", "CRI率", "クリ率"], 0)),
        critPower: fromSkill.critPower + toFiniteNumber(getAttackOptionValueByAliases(attackOption, ["Cr威力", "CRI威力", "クリ威力"], 0)),
        minDamage: fromSkill.minDamage + toFiniteNumber(getAttackOptionDamageBreakValueByAliases(attackOption, minDamageAliases, 0)),
        defensePenetration: fromSkill.defensePenetration + toFiniteNumber(getAttackOptionValueByAliases(attackOption, ["防御貫通", "物理貫通"], 0)),
        magicPenetration: fromSkill.magicPenetration + toFiniteNumber(getAttackOptionValueByAliases(attackOption, ["魔法貫通"], 0))
    };
}

function isMagicAttackMethodSkill(skillData) {
    if (!skillData || typeof skillData !== "object") return false;
    const methodField = getSkillFieldValueByAliases(skillData, ["攻撃手段", "attackMethod"]);
    if (!isMeaningfulConditionValue(methodField)) return false;
    const normalizedMethod = normalizeBattleText(methodField);
    if (normalizedMethod.includes("魔法")) return true;
    const tokens = splitConditionTokens(methodField);
    return tokens.includes("魔法");
}

function resolveSkillTotalBucket(slot, skillData, fallbackSkillData = null) {
    const normalizedSlot = String(slot || "").toUpperCase();
    if (normalizedSlot === "M") return "M";
    const isSQSlot = normalizedSlot === "S" || normalizedSlot === "Q1" || normalizedSlot === "Q2";
    const hasMagicMethod = isMagicAttackMethodSkill(skillData) || isMagicAttackMethodSkill(fallbackSkillData);
    if (hasMagicMethod && isSQSlot) return "M";
    return hasMagicMethod ? "M" : "A";
}

const SKILL_TABLE_TYPES = ["A", "S", "Q", "M", "MS", "MQ", "P", "ACTIVE"];
const SKILL_TABLE_HEADERS = ["技名", "威力", "守り", "状態", "属性", "R", "説明"];
const ACTIVE_SKILL_TABLE_HEADERS = ["技名", "威力", "守り", "状態", "属性", "R", "ターン", "説明"];
const SKILL_TABLE_SORT_KEYS = ["name", "power", "guard", "state", "attribute", "rank", "description"];
const ACTIVE_SKILL_TABLE_SORT_KEYS = ["name", "power", "guard", "state", "attribute", "rank", "remaining", "description"];
const SKILL_TABLE_TYPE2_SORT_KEYS = ["power", "guard", "state", "rank", "attribute"];
const ACTIVE_SKILL_TABLE_TYPE2_SORT_KEYS = ["power", "guard", "state", "rank", "attribute", "remaining"];
const SKILL_TABLE_TEXT_SORT_KEYS = new Set(["name", "attribute", "description"]);
const SKILL_TABLE_DEFAULT_SORT_DIRECTION = {
    name: "asc",
    attribute: "asc",
    description: "asc",
    power: "desc",
    guard: "desc",
    state: "desc",
    rank: "desc",
    remaining: "desc"
};
const SKILL_COOLDOWN_FIELD_KEYS = ["クールタイム", "待機時間"];
const skillTableSortStateByType = {};
let skillTableRowGroupSequence = 0;
let skillTableRowLayoutMode = "image2";

function getSkillTableRowLayout() {
    return skillTableRowLayoutMode === "image2" ? "image2" : "current";
}

function getDefaultSkillTableSortDirection(sortKey = "") {
    const key = normalizeBattleText(sortKey);
    return SKILL_TABLE_DEFAULT_SORT_DIRECTION[key] || "asc";
}

function extractFirstNumberFromSortText(value) {
    const text = normalizeBattleText(value);
    if (!text) return 0;
    const matched = text.match(/-?\d+(?:\.\d+)?/);
    if (!matched) return 0;
    return toFiniteNumber(matched[0]);
}

function toSortDatasetSuffix(sortKey = "") {
    const key = normalizeBattleText(sortKey);
    if (!key) return "";
    return `${key.charAt(0).toUpperCase()}${key.slice(1)}`;
}

function getSkillTableSortValueFromRow(row, sortKey = "") {
    const suffix = toSortDatasetSuffix(sortKey);
    if (!suffix) {
        return SKILL_TABLE_TEXT_SORT_KEYS.has(sortKey) ? "" : 0;
    }
    const raw = normalizeBattleText(row?.dataset?.[`sort${suffix}`]);
    if (SKILL_TABLE_TEXT_SORT_KEYS.has(sortKey)) {
        return raw.toLowerCase();
    }
    return toFiniteNumber(raw);
}

function buildSkillRowSortMeta({
    skill = null,
    totalPower = 0,
    totalDefense = 0,
    totalState = 0,
    displayAttribute = "",
    remainingTurnText = ""
} = {}) {
    const sourceSkill = getSkillData(skill) || skill || {};
    const attributeText = normalizeBattleText(displayAttribute ?? sourceSkill?.属性);
    const rankText = normalizeBattleText(getMagicLevelDisplayText(sourceSkill, sourceSkill?.種別));
    const remainingText = normalizeBattleText(remainingTurnText);
    const remainingSortValue = remainingText.includes("∞")
        ? RETAINED_BUFF_INFINITE_TURNS
        : extractFirstNumberFromSortText(remainingText);
    return {
        name: normalizeBattleText(sourceSkill?.和名 || sourceSkill?.技名 || sourceSkill?.name),
        power: toFiniteNumber(totalPower),
        guard: toFiniteNumber(totalDefense),
        state: toFiniteNumber(totalState),
        attribute: attributeText.toLowerCase(),
        rank: extractFirstNumberFromSortText(rankText),
        remaining: remainingSortValue,
        description: normalizeBattleText(sourceSkill?.詳細 || sourceSkill?.description).toLowerCase()
    };
}

function applySkillRowSortMetaToRows(rows = [], sortMeta = {}) {
    const list = Array.isArray(rows) ? rows : [];
    if (!list.length) return;
    const groupId = `skill-row-group-${++skillTableRowGroupSequence}`;
    const originalIndex = skillTableRowGroupSequence;
    list.forEach((row, index) => {
        if (!row || typeof row !== "object") return;
        row.dataset.skillRowGroup = groupId;
        row.dataset.skillRowHead = index === 0 ? "1" : "0";
        row.dataset.sortOriginalIndex = String(originalIndex);
        row.dataset.sortName = normalizeBattleText(sortMeta?.name);
        row.dataset.sortPower = String(toFiniteNumber(sortMeta?.power));
        row.dataset.sortGuard = String(toFiniteNumber(sortMeta?.guard));
        row.dataset.sortState = String(toFiniteNumber(sortMeta?.state));
        row.dataset.sortAttribute = normalizeBattleText(sortMeta?.attribute);
        row.dataset.sortRank = String(toFiniteNumber(sortMeta?.rank));
        row.dataset.sortRemaining = String(toFiniteNumber(sortMeta?.remaining));
        row.dataset.sortDescription = normalizeBattleText(sortMeta?.description);
    });
}

function updateSkillTableSortHeaderState(table, type = "") {
    if (!table) return;
    const state = skillTableSortStateByType[type] || null;
    table.querySelectorAll("thead th[data-sort-key]").forEach((th) => {
        const key = normalizeBattleText(th?.dataset?.sortKey);
        const isActive = Boolean(state && key && state.key === key);
        th.classList.toggle("is-sort-active", isActive);
        th.classList.toggle("is-sort-asc", isActive && state.direction === "asc");
        th.classList.toggle("is-sort-desc", isActive && state.direction === "desc");
    });
}

function sortSkillTableRowsByType(type = "") {
    const tableType = normalizeBattleText(type).toUpperCase();
    if (!tableType) return;
    const table = document.getElementById(`skill-${tableType}`);
    const tbody = document.getElementById(`skill-list-${tableType}`);
    if (!table || !tbody) return;

    const state = skillTableSortStateByType[tableType] || null;
    updateSkillTableSortHeaderState(table, tableType);
    if (!state?.key || !state?.direction) return;

    const allRows = Array.from(tbody.children || []).filter((row) => row?.tagName === "TR");
    if (allRows.length <= 1) return;

    const groupMap = new Map();
    allRows.forEach((row, index) => {
        const groupId = normalizeBattleText(row?.dataset?.skillRowGroup) || `single-${index}`;
        if (!groupMap.has(groupId)) {
            groupMap.set(groupId, {
                rows: [],
                originalIndex: index
            });
        }
        groupMap.get(groupId).rows.push(row);
    });

    const groups = Array.from(groupMap.values()).map((entry) => ({
        rows: entry.rows,
        originalIndex: entry.originalIndex,
        head: entry.rows.find((row) => row?.dataset?.skillRowHead === "1") || entry.rows[0],
        originalOrder: toFiniteNumber(
            (entry.rows.find((row) => row?.dataset?.skillRowHead === "1") || entry.rows[0])?.dataset?.sortOriginalIndex
        )
    }));

    const direction = state.direction === "asc" ? 1 : -1;
    const sortKey = state.key;
    if (!sortKey || !state.direction) {
        groups
            .sort((left, right) => {
                const leftOrder = toFiniteNumber(left.originalOrder);
                const rightOrder = toFiniteNumber(right.originalOrder);
                if (leftOrder !== rightOrder) {
                    return leftOrder - rightOrder;
                }
                return left.originalIndex - right.originalIndex;
            })
            .forEach((group) => {
                group.rows.forEach((row) => tbody.appendChild(row));
            });
        return;
    }

    groups.sort((left, right) => {
        let cmp = 0;
        if (SKILL_TABLE_TEXT_SORT_KEYS.has(sortKey)) {
            const leftValue = String(getSkillTableSortValueFromRow(left.head, sortKey) || "");
            const rightValue = String(getSkillTableSortValueFromRow(right.head, sortKey) || "");
            cmp = leftValue.localeCompare(rightValue, "ja");
        } else {
            const leftValue = toFiniteNumber(getSkillTableSortValueFromRow(left.head, sortKey));
            const rightValue = toFiniteNumber(getSkillTableSortValueFromRow(right.head, sortKey));
            if (leftValue < rightValue) cmp = -1;
            if (leftValue > rightValue) cmp = 1;
        }
        if (cmp === 0) {
            return left.originalIndex - right.originalIndex;
        }
        return cmp * direction;
    });

    groups.forEach((group) => {
        group.rows.forEach((row) => tbody.appendChild(row));
    });
}

function applySkillTableSortToAll() {
    SKILL_TABLE_TYPES.forEach((type) => {
        sortSkillTableRowsByType(type);
    });
}

function bindSkillTableHeaderSort(table, type = "") {
    if (!table) return;
    const tableType = normalizeBattleText(type).toUpperCase();
    table.querySelectorAll("thead th[data-sort-key]").forEach((th) => {
        if (th.dataset.sortBound === "1") return;
        th.dataset.sortBound = "1";
        th.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            const sortKey = normalizeBattleText(th?.dataset?.sortKey);
            if (!sortKey) return;
            const current = skillTableSortStateByType[tableType] || null;
            if (sortKey === "description" && current?.key === "description") {
                skillTableSortStateByType[tableType] = { key: "", direction: "" };
            } else {
                const nextDirection = current?.key === sortKey
                    ? (current.direction === "asc" ? "desc" : "asc")
                    : getDefaultSkillTableSortDirection(sortKey);
                skillTableSortStateByType[tableType] = {
                    key: sortKey,
                    direction: nextDirection
                };
            }
            sortSkillTableRowsByType(tableType);
        });
    });
    updateSkillTableSortHeaderState(table, tableType);
}

function createSkillTableElement(type, isVisible = false) {
    const table = document.createElement("table");
    table.className = "skill-table";
    table.id = `skill-${type}`;
    table.style.display = isVisible ? "table" : "none";
    const isActiveTable = type === "ACTIVE";
    const currentHeaders = isActiveTable ? ACTIVE_SKILL_TABLE_HEADERS : SKILL_TABLE_HEADERS;
    const currentSortKeys = isActiveTable ? ACTIVE_SKILL_TABLE_SORT_KEYS : SKILL_TABLE_SORT_KEYS;
    const type2MetricHeaders = ["威力", "守り", "状態", "R", "属性"];
    const type2MetricSortKeys = SKILL_TABLE_TYPE2_SORT_KEYS;

    const thead = document.createElement("thead");
    const tr = document.createElement("tr");
    tr.className = "skill-header-current";
    currentHeaders.forEach((header, index) => {
        const th = document.createElement("th");
        th.textContent = header;
        const sortKey = normalizeBattleText(currentSortKeys[index]);
        if (sortKey) {
            th.dataset.sortKey = sortKey;
        }
        tr.appendChild(th);
    });
    thead.appendChild(tr);

    const trType2Main = document.createElement("tr");
    trType2Main.className = "skill-header-type2-main";
    const type2MainName = document.createElement("th");
    type2MainName.colSpan = isActiveTable ? 4 : type2MetricHeaders.length;
    type2MainName.textContent = "技名";
    type2MainName.dataset.sortKey = "name";
    trType2Main.appendChild(type2MainName);
    if (isActiveTable) {
        const type2MainTurn = document.createElement("th");
        type2MainTurn.className = "skill-type2-turn-header";
        type2MainTurn.textContent = "ターン";
        type2MainTurn.dataset.sortKey = "remaining";
        trType2Main.appendChild(type2MainTurn);
    }
    const type2MainDescription = document.createElement("th");
    type2MainDescription.colSpan = 3;
    type2MainDescription.rowSpan = 2;
    type2MainDescription.textContent = "説明";
    type2MainDescription.dataset.sortKey = "description";
    trType2Main.appendChild(type2MainDescription);
    thead.appendChild(trType2Main);

    const trType2Sub = document.createElement("tr");
    trType2Sub.className = "skill-header-type2-sub";
    type2MetricHeaders.forEach((header, index) => {
        const th = document.createElement("th");
        th.textContent = header;
        const sortKey = normalizeBattleText(type2MetricSortKeys[index]);
        if (sortKey) {
            th.dataset.sortKey = sortKey;
        }
        trType2Sub.appendChild(th);
    });
    thead.appendChild(trType2Sub);

    const tbody = document.createElement("tbody");
    tbody.id = `skill-list-${type}`;

    table.appendChild(thead);
    table.appendChild(tbody);
    bindSkillTableHeaderSort(table, type);
    return table;
}

function ensureSkillTablesStructure() {
    const tablesHost = document.getElementById("skill-tables");
    if (!tablesHost) return;

    const needsBuild = SKILL_TABLE_TYPES.some((type) => (
        !document.getElementById(`skill-${type}`)
        || !document.getElementById(`skill-list-${type}`)
    ));
    if (!needsBuild) {
        SKILL_TABLE_TYPES.forEach((type) => {
            const table = document.getElementById(`skill-${type}`);
            bindSkillTableHeaderSort(table, type);
        });
        return;
    }

    tablesHost.querySelectorAll(".skill-table").forEach((table) => table.remove());

    const settingsPanel = document.getElementById("skill-SETTINGS");
    const fragment = document.createDocumentFragment();
    SKILL_TABLE_TYPES.forEach((type, index) => {
        fragment.appendChild(createSkillTableElement(type, index === 0));
    });

    if (settingsPanel && settingsPanel.parentElement === tablesHost) {
        tablesHost.insertBefore(fragment, settingsPanel);
        updateSkillTableLayoutButtons();
        return;
    }
    tablesHost.appendChild(fragment);
    updateSkillTableLayoutButtons();
}

async function setSkillTableLayoutMode(mode, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const nextMode = mode === "image2" ? "image2" : "current";
    if (skillTableRowLayoutMode === nextMode) {
        updateSkillTableLayoutButtons();
        return;
    }
    skillTableRowLayoutMode = nextMode;
    updateSkillTableLayoutButtons();
    await rerenderSkillTables();
}
window.setSkillTableLayoutMode = setSkillTableLayoutMode;

function updateSkillTableLayoutButtons() {
    const button = document.getElementById("skill-settings-tab-btn");
    const isImage2 = getSkillTableRowLayout() === "image2";

    if (button) {
        button.classList.toggle("is-image2", isImage2);
        button.title = isImage2 ? "表示設定: タイプ2" : "表示設定: タイプ1";
    }
    SKILL_TABLE_TYPES.forEach((type) => {
        const table = document.getElementById(`skill-${type}`);
        if (!table) return;
        table.classList.toggle("is-type2", isImage2);
    });
    document.querySelectorAll('input[name="skill-layout-mode"]').forEach((input) => {
        input.checked = input.value === skillTableRowLayoutMode;
    });
}

async function rerenderSkillTables() {
    await displaySkillsReset();
    await displaySkills(displaySkillsList || {});
    await displayMagics(displayMagicsList || {});
    await displayActiveBuffSkills();
    applySkillTableSortToAll();
}

async function toggleSkillTableDisplayMode(type, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const nextMode = getSkillTableRowLayout() === "current" ? "image2" : "current";
    await setSkillTableLayoutMode(nextMode);
}
window.toggleSkillTableDisplayMode = toggleSkillTableDisplayMode;

function formatSkillMetricText(value) {
    if (value === null || value === undefined || value === "") return "-";
    const num = Number(value);
    if (Number.isFinite(num)) {
        if (num === 0) return "-";
        return String(Math.ceil(num));
    }
    const text = String(value).trim();
    return text || "-";
}

function parseSkillCooldownFieldValue(source, key) {
    const target = (source && typeof source === "object") ? source : {};
    if (!Object.prototype.hasOwnProperty.call(target, key)) {
        return { hasKey: false, value: 0 };
    }
    const raw = target[key];
    const numeric = Number(raw);
    if (Number.isFinite(numeric)) {
        return { hasKey: true, value: numeric };
    }
    const text = normalizeBattleText(raw);
    if (!text) {
        return { hasKey: true, value: 0 };
    }
    const matched = text.match(/-?\d+(?:\.\d+)?/);
    if (!matched) {
        return { hasKey: true, value: 0 };
    }
    return { hasKey: true, value: Number(matched[0]) };
}

function getSkillCooldownFromData(skillData) {
    const source = (skillData && typeof skillData === "object") ? skillData : {};
    for (const key of SKILL_COOLDOWN_FIELD_KEYS) {
        const parsed = parseSkillCooldownFieldValue(source, key);
        if (parsed.hasKey) {
            return { hasValue: true, value: parsed.value };
        }
    }
    return { hasValue: false, value: 0 };
}

function normalizeCooldownTurnValue(value) {
    return Math.max(0, Math.round(toFiniteNumber(value)));
}

function getSkillTableCooldownGlobalBonus() {
    const currentName = normalizeBattleText(selectName || playerData?.name || "");
    let source = null;
    if (currentName && Array.isArray(characterList)) {
        source = characterList.find((entry) => normalizeBattleText(entry?.name) === currentName) || null;
    }
    if (!source) {
        source = playerData && typeof playerData === "object" ? playerData : null;
    }
    const bonuses = (source && typeof source.skillBonuses === "object") ? source.skillBonuses : {};
    return SKILL_COOLDOWN_FIELD_KEYS.reduce((sum, key) => sum + toFiniteNumber(bonuses?.[key]), 0);
}

function buildSkillCooldownDisplayText({
    skill = null,
    originalSkill = null,
    tableType = "",
    retainedBuffActive = false
} = {}) {
    if (String(tableType || "").toUpperCase() === "ACTIVE") {
        return "";
    }

    const sourceSkill = getSkillData(originalSkill) || getSkillData(skill) || originalSkill || skill;
    if (!sourceSkill || typeof sourceSkill !== "object") {
        return "";
    }

    const signature = getSkillCooldownSignature(sourceSkill);
    if (!signature) return "";
    const entry = getSkillCooldownEntryBySignature(signature, selectName || playerData?.name || "");
    if (!entry) return "";

    // 発動中スキルは表示しない（解除されたら表示する）。
    if (retainedBuffActive) {
        return "";
    }

    const remainingTurns = normalizeCooldownTurnValue(entry?.remainingTurns);
    const totalTurns = normalizeCooldownTurnValue(entry?.totalTurns);
    if (remainingTurns <= 0 || totalTurns <= 0) return "";
    return `${remainingTurns}/${totalTurns}`;
}

function buildSkillTableRowHtml({
    skill,
    originalSkill,
    tableType,
    displaySource,
    totalPower,
    totalDefense,
    totalState,
    displayAttribute,
    remainingTurnText = "",
    retainedBuffActive = false,
    cooldownText = ""
}) {
    const skillName = skill?.和名 || "";
    const skillRuby = skill?.英名 || "";
    const skillIcons = getSkillIcons(skill);
    const skillIconHtml = skillIcons ? `<span class="skill-row-icons">${skillIcons}</span>` : "";
    const attributeWatermarkHtml = buildAttributeWatermarkHtml(skill?.属性);
    const onClick = `handleSkillClick('${skill?.種別 || ""}', '${skillName}', '${displaySource}')`;
    const nameHtml = `<ruby>${skillName}<rt>${skillRuby}</rt></ruby>`;

    const attributeText = String(displayAttribute ?? skill?.属性 ?? "").trim();
    const remainingText = String(remainingTurnText || "").trim() || "-";
    const remainingCellHtml = tableType === "ACTIVE"
        ? `<td class="skill-active-remaining-cell">${remainingText}</td>`
        : "";

    return `
        <td class="skill-name-cell" onclick="${onClick}">
            ${attributeWatermarkHtml}
            ${skillIconHtml}
            <span class="skill-name-inline">${nameHtml}</span>
        </td>
        <td>${formatSkillMetricText(totalPower)}</td>
        <td>${formatSkillMetricText(totalDefense)}</td>
        <td>${formatSkillMetricText(totalState)}</td>
        <td>${attributeText || "-"}</td>
        <td>${getMagicLevelDisplayText(skill, skill?.種別)}</td>
        ${remainingCellHtml}
        ${buildSkillDescriptionCellHtml(skill, { cooldownText })}
    `;
}

function buildSkillTableRows({
    skill,
    originalSkill,
    tableType,
    displaySource,
    totalPower,
    totalDefense,
    totalState,
    displayAttribute,
    remainingTurnText = "",
    retainedBuffActive = false
}) {
    const rowLayout = getSkillTableRowLayout(tableType);
    const skillName = skill?.和名 || "";
    const skillRuby = skill?.英名 || "";
    const skillIcons = getSkillIcons(skill);
    const skillIconHtml = skillIcons ? `<span class="skill-row-icons">${skillIcons}</span>` : "";
    const attributeWatermarkHtml = buildAttributeWatermarkHtml(skill?.属性);
    const onClick = `handleSkillClick('${skill?.種別 || ""}', '${skillName}', '${displaySource}')`;
    const nameHtml = `<ruby>${skillName}<rt>${skillRuby}</rt></ruby>`;
    const rText = getMagicLevelDisplayText(skill, skill?.種別) || "-";
    const cooldownText = buildSkillCooldownDisplayText({
        skill,
        originalSkill,
        tableType,
        retainedBuffActive
    });
    const attributeText = String(displayAttribute ?? skill?.属性 ?? "").trim() || "-";
    const attributeTextLength = [...attributeText].length;
    const remainingText = String(remainingTurnText || "").trim() || "-";

    if (rowLayout !== "image2") {
        const row = document.createElement("tr");
        row.innerHTML = buildSkillTableRowHtml({
            skill,
            originalSkill,
            tableType,
            displaySource,
            totalPower,
            totalDefense,
            totalState,
            displayAttribute,
            remainingTurnText,
            retainedBuffActive,
            cooldownText
        });
        return [row];
    }

    const nameCellColspan = tableType === "ACTIVE" ? 4 : 5;
    const remainingNameHtml = tableType === "ACTIVE"
        ? `<td class="skill-type2-turn-cell skill-active-remaining-cell">${remainingText}</td>`
        : "";
    const descriptionCellClass = cooldownText
        ? "skill-description-cell skill-description-cell-cooldown-overlay skill-cooldown-active"
        : "skill-description-cell";
    const nameRow = document.createElement("tr");
    nameRow.className = "skill-type2-name-row";
    nameRow.innerHTML = `
        <td class="skill-type2-name-cell" colspan="${nameCellColspan}" onclick="${onClick}">
            ${attributeWatermarkHtml}
            ${skillIconHtml}
            <span class="skill-name-inline">${nameHtml}</span>
        </td>
        ${remainingNameHtml}
        <td class="skill-type2-desc-cell" colspan="3" rowspan="2">
            <div class="${descriptionCellClass}">${buildSkillDescriptionContentHtml(skill, { cooldownText })}</div>
        </td>
    `;

    const valueRow = document.createElement("tr");
    valueRow.className = "skill-type2-value-row";
    valueRow.innerHTML = `
        <td class="skill-type2-metric-cell">${formatSkillMetricText(totalPower)}</td>
        <td class="skill-type2-metric-cell">${formatSkillMetricText(totalDefense)}</td>
        <td class="skill-type2-metric-cell">${formatSkillMetricText(totalState)}</td>
        <td class="skill-type2-metric-cell">${formatSkillMetricText(rText)}</td>
        <td class="skill-type2-metric-cell skill-type2-attr-cell" data-attr-len="${attributeTextLength}">${attributeText}</td>
    `;

    return [nameRow, valueRow];
}

function appendSkillRowsToTable({
    targetType,
    skill,
    originalSkill,
    tableType,
    displaySource,
    totalPower,
    totalDefense,
    totalState,
    displayAttribute,
    remainingTurnText = "",
    passiveVisualState = "",
    retainedBuffActive = false
}) {
    const container = document.getElementById(`skill-list-${targetType}`);
    if (!container) return;
    const highlightSourceSkill = getSkillData(originalSkill || skill);
    const rows = buildSkillTableRows({
        skill,
        originalSkill,
        tableType,
        displaySource,
        totalPower,
        totalDefense,
        totalState,
        displayAttribute,
        remainingTurnText,
        retainedBuffActive
    });
    const cooldownTextForRows = buildSkillCooldownDisplayText({
        skill,
        originalSkill,
        tableType,
        retainedBuffActive
    });
    if (cooldownTextForRows) {
        rows.forEach((row) => row.classList.add("skill-cooldown-active"));
    }
    const sortMeta = buildSkillRowSortMeta({
        skill: highlightSourceSkill || skill,
        totalPower,
        totalDefense,
        totalState,
        displayAttribute,
        remainingTurnText
    });
    applySkillRowSortMetaToRows(rows, sortMeta);
    if (isSkillSetInSelectedSlots(highlightSourceSkill, { displaySource })) {
        rows.forEach((row) => row.classList.add("skill-selected-set"));
    }
    if (isCurrentlyFocusedSkill(highlightSourceSkill, { displaySource })) {
        rows.forEach((row) => row.classList.add("skill-selected-focus"));
    }
    if (tableType === "P") {
        rows.forEach((row) => {
            row.classList.add("skill-passive-row");
            if (passiveVisualState === "on") {
                row.classList.add("skill-passive-state-on");
            } else if (passiveVisualState === "off") {
                row.classList.add("skill-passive-state-off");
            }
        });
    }
    if (retainedBuffActive) {
        rows.forEach((row) => row.classList.add("skill-retained-active"));
    }
    rows.forEach((row) => container.appendChild(row));
    bindSkillDescriptionCellButton(rows[0], originalSkill || skill);
}

// タブを開く関数
function openSkillTab(type) {
    ensureSkillTablesStructure();
    document.querySelectorAll('.skill-table, .skill-tab-panel').forEach((panel) => {
        panel.style.display = 'none';
    });
    const selectedPanel = document.getElementById(`skill-${type}`);
    if (selectedPanel) {
        selectedPanel.style.display = selectedPanel.classList.contains('skill-table') ? 'table' : 'block';
    }

    document.querySelectorAll('.tab-button-skill').forEach(button => {
        button.classList.remove('active');
    });
    const activeButton = document.querySelector(`.tab-button-skill[onclick="openSkillTab('${type}')"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
    updateSkillTableLayoutButtons();
}
// 合計を計算する汎用関数（特定キーの高い方を考慮）
// 全力倍率は applyFullPower=true のときのみ適用する
function calculateTotal(keys, dataset, specialKeys = null, keyScaleMap = null, options = {}) {
    const formulaApi = getSkillValueFormulaApi();
    if (formulaApi?.calculateTotal) {
        return formulaApi.calculateTotal(keys, dataset, specialKeys, keyScaleMap, options);
    }
    const source = (dataset && typeof dataset === "object") ? dataset : {};
    let total = 0;
    const applyFullPower = Boolean(options?.applyFullPower);
    const fullPowerMultiplier = applyFullPower
        ? ((toFiniteNumber(source?.["全力"]) + 100) / 100)
        : 1;

    // 特別な処理をするキーセットが指定されている場合
    if (specialKeys) {
        const specialValues = specialKeys.map(key => source[key] || 0);
        total += Math.max(...specialValues); // 特別キーは高い方を採用
    }

    // 通常のキーセットで値を合計
    total += keys
        .map((key) => {
            const value = Number(source[key] || 0);
            const scale = keyScaleMap && Number.isFinite(Number(keyScaleMap[key]))
                ? Number(keyScaleMap[key])
                : 1;
            return value * scale;
        }) // 存在しないキーは0
        .reduce((sum, value) => sum + value, 0);

    return total * fullPowerMultiplier;
}

function getMagicLevelRaw(skill) {
    if (!skill || typeof skill !== "object") return null;
    const value = skill.魔法Lv ?? skill.魔法Rank;
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    return text === "" ? null : text;
}

function getMagicLevelNumber(skill) {
    const raw = getMagicLevelRaw(skill);
    if (raw === null) return null;
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
}

function getMagicLevelText(skill) {
    const raw = getMagicLevelRaw(skill);
    return raw === null ? "" : String(raw);
}

function getMagicLevelDisplayText(skill, typeHint = "") {
    const rawText = getMagicLevelText(skill);
    if (!rawText) return "";
    const type = String(typeHint || skill?.種別 || "").trim().toUpperCase();
    if (type === "MS") {
        return Number(rawText) === 0 ? "" : rawText;
    }
    const rawNumber = Number(rawText);
    if (!Number.isFinite(rawNumber)) {
        return rawText;
    }
    if (rawNumber === 0) return "";
    const divided = rawNumber / 7;
    if (divided === 0) return "";
    if (Number.isInteger(divided)) {
        return String(divided);
    }
    return String(Math.round(divided * 100) / 100);
}

function getMagicLevelForMultiplier(skill, typeHint = "", slotHint = "") {
    const rawLevel = getMagicLevelNumber(skill);
    if (rawLevel === null) return null;

    const type = String(typeHint || skill?.種別 || "").trim().toUpperCase();
    const slot = String(slotHint || "").trim().toUpperCase();

    // M枠はRを /7 した値で倍率計算
    if (slot === "M" || type === "M") {
        return rawLevel / 7;
    }
    return rawLevel;
}

function getRetainedBuffDisplayEntries(name = (selectName || playerData?.name || "")) {
    return getRetainedBuffSkillsForCharacter(name)
        .map((entry) => normalizeRetainedBuffEntry(entry))
        .filter((entry) => {
            if (!entry || !entry.skillData || toFiniteNumber(entry.remainingTurns) <= 0) return false;
            const skillName = normalizeBattleText(
                entry?.skillData?.和名 || entry?.skillData?.技名 || entry?.skillData?.name
            );
            return Boolean(skillName);
        });
}

function getActiveRemainingTurnText(entry) {
    const normalized = normalizeRetainedBuffEntry(entry);
    const remaining = normalizeRetainedBuffTurns(normalized?.remainingTurns, 1);
    const total = normalizeRetainedBuffTurns(normalized?.totalTurns, 1);
    if (isInfiniteRetainedBuffTurns(remaining) || isInfiniteRetainedBuffTurns(total)) {
        return "∞";
    }
    return `${remaining}/${total}`;
}

function buildActiveBuffSignatureSet(characterName = (selectName || playerData?.name || "")) {
    const set = new Set();
    const entries = getRetainedBuffDisplayEntries(characterName);
    entries.forEach((entry) => {
        const signature = buildBuffSkillSignature(entry?.skillData || {});
        if (signature) set.add(signature);
    });
    return set;
}

function isRetainedBuffSkillActive(skillData, activeBuffSignatureSet) {
    const normalizedSkill = getSkillData(skillData);
    if (!normalizedSkill || typeof normalizedSkill !== "object") return false;
    const signature = buildBuffSkillSignature(normalizedSkill);
    if (!signature) return false;
    if (activeBuffSignatureSet instanceof Set) {
        return activeBuffSignatureSet.has(signature);
    }
    const fallbackSet = buildActiveBuffSignatureSet(selectName || playerData?.name || "");
    return fallbackSet.has(signature);
}

function displayActiveBuffSkills() {
    const currentCharacterName = selectName || playerData?.name || "";
    hydrateRetainedBuffSkillsForCharacter(currentCharacterName, playerData);
    const activeEntries = getRetainedBuffDisplayEntries(currentCharacterName);
    DebaglogSet("[BattleState][ActiveDisplay]", {
        characterName: normalizeBattleText(currentCharacterName),
        entryCount: activeEntries.length,
        entries: activeEntries.map((entry) => ({
            name: normalizeBattleText(entry?.skillData?.和名 || entry?.skillData?.技名 || entry?.skillData?.name),
            type: normalizeBattleText(entry?.skillData?.種別 || ""),
            remaining: normalizeRetainedBuffTurns(entry?.remainingTurns, 1),
            total: normalizeRetainedBuffTurns(entry?.totalTurns, 1)
        }))
    });
    if (!activeEntries.length) return;

    const powerKeys = [
        "切断", "貫通", "打撃",
        "炎", "氷", "雷", "酸", "音波", "闇", "光",
        "善", "悪", "正", "負", "毒"
    ];
    const powerKeyScales = { 善: 0.5, 悪: 0.5 };
    const stateKeys = [
        "麻痺", "混乱", "恐怖", "盲目", "閃光", "暗黒", "幻覚", "睡眠", "石化",
        "スタン", "拘束", "呪い", "呪い/HP", "呪い/MP", "呪い/ST", "呪い/攻撃",
        "呪い/防御", "呪い/魔力", "呪い/魔防", "呪い/速度", "呪い/命中", "支配",
        "即死", "時間", "出血", "疲労", "ノックバック"
    ];
    const defenseKeys = ["物理ガード", "魔法ガード"];

    const activeConditionalPassives = getRuntimePassiveLikeSkillsForSelectedSkills(selectedSkills, {
        characterName: selectName || playerData?.name || ""
    });
    const conditionalPassiveStatusBonuses = buildRuntimeStatusBonuses({
        activeConditionalPassives,
        characterName: selectName || playerData?.name || ""
    });
    const statusSourceWithConditionalBonuses = buildStatSourceWithConditionalBonuses(
        statusCharacter,
        conditionalPassiveStatusBonuses
    );
    const selectedSourceWithConditionalBonuses = buildStatSourceWithConditionalBonuses(
        selectedCharacter,
        conditionalPassiveStatusBonuses
    );
    activeEntries.forEach((entry) => {
        const sourceSkill = entry.skillData;
        const type = normalizeBattleText(sourceSkill?.種別).toUpperCase();
        const remainingTurnText = getActiveRemainingTurnText(entry);

        if (type === "A") {
            const preview = calculateBattleSkillDisplayData("A", sourceSkill, {
                isFullPowerOn: false,
                totalFullPower: 0,
                activeConditionalPassives,
                conditionalPassiveStatusBonuses,
                globalFinalRates: null
            });
            appendSkillRowsToTable({
                targetType: "ACTIVE",
                skill: preview.calcSkillData || sourceSkill,
                originalSkill: sourceSkill,
                tableType: "ACTIVE",
                displaySource: "active",
                totalPower: toFiniteNumber(preview.powerValue),
                totalDefense: toFiniteNumber(preview.guardValue),
                totalState: toFiniteNumber(preview.stateValue),
                displayAttribute: preview.displayAttribute,
                remainingTurnText
            });
            return;
        }

        const totalPower = calculatePowerTotal(powerKeys, sourceSkill, powerKeyScales);
        const totalDefense = calculateTotal(["防御性能"], sourceSkill, defenseKeys);
        const totalState = calculateTotal(stateKeys, sourceSkill);
        const statSource = (type === "P")
            ? selectedSourceWithConditionalBonuses
            : statusSourceWithConditionalBonuses;
        const attackValue = getAttackStatValue(statSource, sourceSkill);
        const additionalPowerValue = getAdditionalPowerValue(statSource, sourceSkill);
        let uper = (1 + attackValue / 100) * (1 + additionalPowerValue / 500);

        if (type === "M") {
            const magicLevel = getMagicLevelForMultiplier(sourceSkill, sourceSkill?.種別, "M");
            if (magicLevel !== null) {
                const magicMultiplier = 0.15 + magicLevel * 0.20;
                if (Number.isFinite(magicMultiplier) && magicMultiplier > 0) {
                    uper *= magicMultiplier;
                }
            }
        }

        appendSkillRowsToTable({
            targetType: "ACTIVE",
            skill: sourceSkill,
            originalSkill: sourceSkill,
            tableType: "ACTIVE",
            displaySource: "active",
            totalPower: Math.ceil(parseInt(totalPower) * uper),
            totalDefense: Math.ceil(parseInt(totalDefense) * uper),
            totalState: Math.ceil(parseInt(totalState) * uper),
            remainingTurnText
        });
    });
}

// スキルのテーブルを生成
function displaySkills(setSkill) {
    // 威力のキーセット
    const powerKeys = [
        "切断", "貫通", "打撃",
        "炎", "氷", "雷", "酸", "音波", "闇", "光",
        "善", "悪", "正", "負", "毒"
    ];
    const powerKeyScales = {
        善: 0.5,
        悪: 0.5
    };

    // 状態のキーセット
    const stateKeys = [
        "麻痺", "混乱", "恐怖", "盲目", "閃光", "暗黒", "幻覚", "睡眠", "石化",
        "スタン", "拘束", "呪い", "呪い/HP", "呪い/MP", "呪い/ST", "呪い/攻撃",
        "呪い/防御", "呪い/魔力", "呪い/魔防", "呪い/速度", "呪い/命中", "支配",
        "即死", "時間", "出血", "疲労", "ノックバック"
    ];
    const activeConditionalPassives = getRuntimePassiveLikeSkillsForSelectedSkills(selectedSkills, {
        characterName: selectName || playerData?.name || ""
    });
    const conditionalPassiveStatusBonuses = buildRuntimeStatusBonuses({
        activeConditionalPassives,
        characterName: selectName || playerData?.name || ""
    });
    const statusSourceWithConditionalBonuses = buildStatSourceWithConditionalBonuses(
        statusCharacter,
        conditionalPassiveStatusBonuses
    );
    const selectedSourceWithConditionalBonuses = buildStatSourceWithConditionalBonuses(
        selectedCharacter,
        conditionalPassiveStatusBonuses
    );
    const activeBuffSignatureSet = buildActiveBuffSignatureSet(selectName || playerData?.name || "");

    // 威力と状態の合計を計算
    
    DebaglogSet("スキルのテーブルを生成 :", setSkill[0], statusCharacter, statusCharacter.攻撃)
    // 威力上昇判定
    setSkill?.A?.forEach(skill => {
        const retainedBuffActive = isRetainedBuffSkillActive(skill, activeBuffSignatureSet);
        const preview = calculateBattleSkillDisplayData("A", skill, {
            isFullPowerOn: false,
            totalFullPower: 0,
            activeConditionalPassives,
            conditionalPassiveStatusBonuses,
            globalFinalRates: null
        });
        const sourceSkill = preview.calcSkillData || skill;

        appendSkillRowsToTable({
            targetType: skill.種別,
            skill: sourceSkill,
            originalSkill: skill,
            tableType: "A",
            displaySource: "skills",
            totalPower: toFiniteNumber(preview.powerValue),
            totalDefense: toFiniteNumber(preview.guardValue),
            totalState: toFiniteNumber(preview.stateValue),
            displayAttribute: preview.displayAttribute,
            retainedBuffActive
        });
    });
    setSkill?.S?.forEach(skill => {
        const retainedBuffActive = isRetainedBuffSkillActive(skill, activeBuffSignatureSet);
        const { calcSkillData } = resolveSkillDataWithConditionalPassives(skill, {
            activeConditionalPassives
        });
        const sourceSkill = calcSkillData || skill;
        //  ,${skill.威力}
        
        const attackValue = getAttackStatValue(statusSourceWithConditionalBonuses, sourceSkill);
        const additionalPowerValue = getAdditionalPowerValue(statusSourceWithConditionalBonuses, sourceSkill);
        const uper = (1 + attackValue / 100) * (1 + additionalPowerValue / 500);
        // console.log("allStats:",playerData.stats)
        DebaglogSet(" skill S : ", getAttackStatReference(sourceSkill), getAdditionalPowerReference(sourceSkill), uper)
        const totalPower = calculatePowerTotal(powerKeys, sourceSkill, powerKeyScales);
        const totalDefense = calculateTotal(["防御性能"], sourceSkill, ["物理ガード", "魔法ガード"]);
        const totalState = calculateTotal(stateKeys, sourceSkill);

        appendSkillRowsToTable({
            targetType: skill.種別,
            skill: sourceSkill,
            originalSkill: skill,
            tableType: "S",
            displaySource: "skills",
            totalPower: Math.ceil(parseInt(totalPower) * uper),
            totalDefense: Math.ceil(parseInt(totalDefense) * uper),
            totalState: Math.ceil(parseInt(totalState) * uper),
            retainedBuffActive
        });
    });
    setSkill?.Q?.forEach(skill => {
        const retainedBuffActive = isRetainedBuffSkillActive(skill, activeBuffSignatureSet);
        const { calcSkillData } = resolveSkillDataWithConditionalPassives(skill, {
            activeConditionalPassives
        });
        const sourceSkill = calcSkillData || skill;
        const attackValue = getAttackStatValue(statusSourceWithConditionalBonuses, sourceSkill);
        const additionalPowerValue = getAdditionalPowerValue(statusSourceWithConditionalBonuses, sourceSkill);
        const uper = (1 + attackValue / 100) * (1 + additionalPowerValue / 500);
        // 威力と状態の合計を計算
        const totalPower = calculatePowerTotal(powerKeys, sourceSkill, powerKeyScales);
        const totalDefense = calculateTotal(["防御性能"], sourceSkill, ["物理ガード", "魔法ガード"]);
        const totalState = calculateTotal(stateKeys, sourceSkill);

        appendSkillRowsToTable({
            targetType: skill.種別,
            skill: sourceSkill,
            originalSkill: skill,
            tableType: "Q",
            displaySource: "skills",
            totalPower: Math.ceil(parseInt(totalPower) * uper),
            totalDefense: Math.ceil(parseInt(totalDefense) * uper),
            totalState: Math.ceil(parseInt(totalState) * uper),
            retainedBuffActive
        });
    });
    setSkill?.P?.forEach(skill => {
        const retainedBuffActive = isRetainedBuffSkillActive(skill, activeBuffSignatureSet);
        const { calcSkillData } = resolveSkillDataWithConditionalPassives(skill, {
            activeConditionalPassives
        });
        const sourceSkill = calcSkillData || skill;
        const passiveVisualState = getConditionalPassiveVisualState(skill, activeConditionalPassives);
        const attackValue = getAttackStatValue(selectedSourceWithConditionalBonuses, sourceSkill);
        const additionalPowerValue = getAdditionalPowerValue(selectedSourceWithConditionalBonuses, sourceSkill);
        const uper = (1 + attackValue / 100) * (1 + additionalPowerValue / 500);
        // 威力と状態の合計を計算
        const totalPower = calculatePowerTotal(powerKeys, sourceSkill, powerKeyScales);
        const totalDefense = calculateTotal(["防御性能"], sourceSkill, ["物理ガード", "魔法ガード"]);
        const totalState = calculateTotal(stateKeys, sourceSkill);

        appendSkillRowsToTable({
            targetType: skill.種別,
            skill: sourceSkill,
            originalSkill: skill,
            tableType: "P",
            displaySource: "skills",
            totalPower: Math.ceil(parseInt(totalPower) * uper),
            totalDefense: Math.ceil(parseInt(totalDefense) * uper),
            totalState: Math.ceil(parseInt(totalState) * uper),
            passiveVisualState,
            retainedBuffActive
        });
    });
    setSkill?.M?.forEach(skill => {
        const retainedBuffActive = isRetainedBuffSkillActive(skill, activeBuffSignatureSet);
        const { calcSkillData } = resolveSkillDataWithConditionalPassives(skill, {
            activeConditionalPassives
        });
        const sourceSkill = calcSkillData || skill;
        // 威力と状態の合計を計算
        const totalPower = calculatePowerTotal(powerKeys, sourceSkill, powerKeyScales);
        const totalDefense = calculateTotal(["防御性能"], sourceSkill, ["物理ガード", "魔法ガード"]);
        const totalState = calculateTotal(stateKeys, sourceSkill);

        const attackValue = getAttackStatValue(selectedSourceWithConditionalBonuses, sourceSkill);
        const additionalPowerValue = getAdditionalPowerValue(selectedSourceWithConditionalBonuses, sourceSkill);
        const attackMultiplier = 1 + attackValue / 100;
        const powerMultiplier = 1 + additionalPowerValue / 500;
        let uper = attackMultiplier * powerMultiplier;
        const magicLevel = getMagicLevelForMultiplier(sourceSkill, sourceSkill?.種別, "M");
        if (magicLevel !== null) {
            const magicMultiplier = 0.15 + magicLevel * 0.20;
            if (Number.isFinite(magicMultiplier) && magicMultiplier > 0) {
                uper *= magicMultiplier;
            }
        }
        appendSkillRowsToTable({
            targetType: skill.種別,
            skill: sourceSkill,
            originalSkill: skill,
            tableType: "M",
            displaySource: "skills",
            totalPower: Math.ceil(parseInt(totalPower) * uper),
            totalDefense: Math.ceil(parseInt(totalDefense) * uper),
            totalState: Math.ceil(parseInt(totalState) * uper),
            retainedBuffActive
        });
    });
}

// 魔法のテーブルを生成
function displayMagics(setMagics) {
    // 威力のキーセット
    const powerKeys = [
        "切断", "貫通", "打撃", "炎", "氷", "雷", "酸", "音波", "闇", "光",
        "善", "悪", "正", "負", "毒",
    ];
    const powerKeyScales = {
        善: 0.5,
        悪: 0.5
    };

    const defenseKeys = ["物理ガード", "魔法ガード"];

    // 状態のキーセット
    const stateKeys = [
        "麻痺", "混乱", "恐怖", "盲目", "閃光", "暗黒", "幻覚", "睡眠", "石化",
        "スタン", "拘束", "呪い", "呪い/HP", "呪い/MP", "呪い/ST", "呪い/攻撃",
        "呪い/防御", "呪い/魔力", "呪い/魔防", "呪い/速度", "呪い/命中", "支配",
        "即死", "時間", "出血", "疲労", "ノックバック"
    ];
    const activeConditionalPassives = getRuntimePassiveLikeSkillsForSelectedSkills(selectedSkills, {
        characterName: selectName || playerData?.name || ""
    });
    const conditionalPassiveStatusBonuses = buildRuntimeStatusBonuses({
        activeConditionalPassives,
        characterName: selectName || playerData?.name || ""
    });
    const selectedSourceWithConditionalBonuses = buildStatSourceWithConditionalBonuses(
        selectedCharacter,
        conditionalPassiveStatusBonuses
    );
    const activeBuffSignatureSet = buildActiveBuffSignatureSet(selectName || playerData?.name || "");

    // DebaglogSet("魔法のテーブルを生成 :", setMagics, statusCharacter, statusCharacter.攻撃)
    (setMagics.M || []).forEach(skill => {
        const retainedBuffActive = isRetainedBuffSkillActive(skill, activeBuffSignatureSet);
        const { calcSkillData } = resolveSkillDataWithConditionalPassives(skill, {
            activeConditionalPassives
        });
        const sourceSkill = calcSkillData || skill;
        // 威力と状態の合計を計算
        const totalPower = calculatePowerTotal(powerKeys, sourceSkill, powerKeyScales);
        const totalDefense = calculateTotal(["防御性能"], sourceSkill, defenseKeys);
        const totalState = calculateTotal(stateKeys, sourceSkill);

        // selectedCharacter が配列の場合は最初のオブジェクトを選択
        const selectedCharacterData = Array.isArray(selectedSourceWithConditionalBonuses)
            ? (selectedSourceWithConditionalBonuses[0] || {})
            : (selectedSourceWithConditionalBonuses || {});

        const attackCheck = getAttackStatValue(selectedCharacterData, sourceSkill);
        const additionalPower = getAdditionalPowerValue(selectedCharacterData, sourceSkill);

        // 魔法Lv/魔法Rank を安全に取得（M枠は /7 補正）
        const magicRank = getMagicLevelForMultiplier(sourceSkill, sourceSkill?.種別, "M") ?? 0;


        // magicMultiplier を計算
        const magicMultiplier = 0.15 + magicRank * 0.20;
        // 計算
        const attackMultiplier = 1 + attackCheck / 100;
        const powerMultiplier = 1 + additionalPower / 500;

        const uper = attackMultiplier * powerMultiplier * magicMultiplier;
        DebaglogSet("uper:", attackMultiplier, powerMultiplier, magicMultiplier, uper);

        appendSkillRowsToTable({
            targetType: skill.種別,
            skill: sourceSkill,
            originalSkill: skill,
            tableType: "M",
            displaySource: "magics",
            totalPower: Math.ceil(parseInt(totalPower) * uper),
            totalDefense: Math.ceil(parseInt(totalDefense) * uper),
            totalState: Math.ceil(parseInt(totalState) * uper),
            retainedBuffActive
        });
    });
    (setMagics.S || []).forEach(skill => {
        const retainedBuffActive = isRetainedBuffSkillActive(skill, activeBuffSignatureSet);
        const { calcSkillData } = resolveSkillDataWithConditionalPassives(skill, {
            activeConditionalPassives
        });
        const sourceSkill = calcSkillData || skill;
        // 威力と状態の合計を計算
        const totalPower = calculatePowerTotal(powerKeys, sourceSkill, powerKeyScales);
        const totalDefense = calculateTotal(["防御性能"], sourceSkill, defenseKeys);
        const totalState = calculateTotal(stateKeys, sourceSkill);
        const attackValue = getAttackStatValue(selectedSourceWithConditionalBonuses, sourceSkill);
        const additionalPowerValue = getAdditionalPowerValue(selectedSourceWithConditionalBonuses, sourceSkill);
        const uper = (1 + attackValue / 100) * (1 + additionalPowerValue / 500);
        appendSkillRowsToTable({
            targetType: "MS",
            skill: sourceSkill,
            originalSkill: skill,
            tableType: "MS",
            displaySource: "magics",
            totalPower: Math.ceil(parseInt(totalPower) * uper),
            totalDefense: Math.ceil(parseInt(totalDefense) * uper),
            totalState: Math.ceil(parseInt(totalState) * uper),
            retainedBuffActive
        });
    });
    (setMagics.Q || []).forEach(skill => {
        const retainedBuffActive = isRetainedBuffSkillActive(skill, activeBuffSignatureSet);
        const { calcSkillData } = resolveSkillDataWithConditionalPassives(skill, {
            activeConditionalPassives
        });
        const sourceSkill = calcSkillData || skill;
        // 威力と状態の合計を計算
        const totalPower = calculatePowerTotal(powerKeys, sourceSkill, powerKeyScales);
        const totalDefense = calculateTotal(["防御性能"], sourceSkill, defenseKeys);
        const totalState = calculateTotal(stateKeys, sourceSkill);
        const attackValue = getAttackStatValue(selectedSourceWithConditionalBonuses, sourceSkill);
        const additionalPowerValue = getAdditionalPowerValue(selectedSourceWithConditionalBonuses, sourceSkill);
        const uper = (1 + attackValue / 100) * (1 + additionalPowerValue / 500);
        appendSkillRowsToTable({
            targetType: "MQ",
            skill: sourceSkill,
            originalSkill: skill,
            tableType: "MQ",
            displaySource: "magics",
            totalPower: Math.ceil(parseInt(totalPower) * uper),
            totalDefense: Math.ceil(parseInt(totalDefense) * uper),
            totalState: Math.ceil(parseInt(totalState) * uper),
            retainedBuffActive
        });
    });
    (setMagics.A || []).forEach(skill => {
        const retainedBuffActive = isRetainedBuffSkillActive(skill, activeBuffSignatureSet);
        const preview = calculateBattleSkillDisplayData("A", skill, {
            isFullPowerOn: false,
            totalFullPower: 0,
            activeConditionalPassives,
            conditionalPassiveStatusBonuses,
            globalFinalRates: null
        });
        const sourceSkill = preview.calcSkillData || skill;
        appendSkillRowsToTable({
            targetType: "A",
            skill: sourceSkill,
            originalSkill: skill,
            tableType: "A",
            displaySource: "magics",
            totalPower: toFiniteNumber(preview.powerValue),
            totalDefense: toFiniteNumber(preview.guardValue),
            totalState: toFiniteNumber(preview.stateValue),
            displayAttribute: preview.displayAttribute,
            retainedBuffActive
        });
    });
}
let selectedType = null;
let selectedSkill = null;

function attachDisplaySourceMetaToSkillCollection(skillCollection, displaySource, clickedType) {
    const sourceTag = String(displaySource || "").trim().toLowerCase();
    const clicked = String(clickedType || "").trim();
    const list = Array.isArray(skillCollection) ? skillCollection : [skillCollection];
    list.forEach((entry) => {
        if (!entry || typeof entry !== "object") return;
        entry.__displaySource = sourceTag || "skills";
        entry.__clickedType = clicked;
    });
    return skillCollection;
}

function getSkillData(skill) {
    if (!skill) return null;
    return Array.isArray(skill) ? (skill[0] || null) : skill;
}

function getSkillName(skill) {
    const skillData = getSkillData(skill);
    return String(skillData?.和名 || skillData?.name || "").trim();
}

function getSkillHighlightIdentity(skill, options = {}) {
    const skillData = getSkillData(skill);
    if (!skillData || typeof skillData !== "object") {
        return { name: "", type: "", source: "" };
    }
    const fallbackSource = normalizeBattleText(options?.displaySource || "").toLowerCase();
    const sourceTag = normalizeBattleText(getSkillDisplaySourceTag(skillData)).toLowerCase();
    return {
        name: normalizeBattleText(skillData?.和名 || skillData?.技名 || skillData?.name),
        type: normalizeBattleText(skillData?.種別 || skillData?.__clickedType).toUpperCase(),
        source: fallbackSource || sourceTag || "skills"
    };
}

function isSameSkillHighlightIdentity(left, right) {
    if (!left?.name || !right?.name) return false;
    if (left.name !== right.name) return false;
    if (left.type && right.type && left.type !== right.type) return false;
    if (left.source && right.source && left.source !== right.source) return false;
    return true;
}

function isSkillSetInSelectedSlots(skill, options = {}) {
    const targetIdentity = getSkillHighlightIdentity(skill, options);
    if (!targetIdentity.name) return false;
    return SELECTED_SKILL_SLOT_ORDER.some((slot) => {
        const slotIdentity = getSkillHighlightIdentity(selectedSkills?.[slot]);
        return isSameSkillHighlightIdentity(targetIdentity, slotIdentity);
    });
}

function isCurrentlyFocusedSkill(skill, options = {}) {
    const targetIdentity = getSkillHighlightIdentity(skill, options);
    if (!targetIdentity.name) return false;
    const focusedIdentity = getSkillHighlightIdentity(selectedSkill);
    return isSameSkillHighlightIdentity(targetIdentity, focusedIdentity);
}

function getSlotOptionLabel(slot) {
    const currentSkillName = getSkillName(selectedSkills[slot]);
    return currentSkillName ? `${slot}（現在: ${currentSkillName}）` : `${slot}（空き）`;
}

function getDefaultSlot(allowedSlots, skillType) {
    if (!Array.isArray(allowedSlots) || allowedSlots.length === 0) return "";

    if (skillType === "Q" && allowedSlots.includes("Q1") && allowedSlots.includes("Q2")) {
        const hasQ1 = !!selectedSkills?.Q1;
        const hasQ2 = !!selectedSkills?.Q2;
        if (!hasQ1) return "Q1";
        if (!hasQ2) return "Q2";
        return "Q1";
    }

    // 選択した分類に対応するスロットを初期選択として優先する
    const preferredSlotByType = {
        A: "A",
        S: "S",
        M: "M",
        MS: "S",
        Q: "Q1",
        MQ: "Q1",
        P: "Q1"
    };
    const preferredSlot = preferredSlotByType[skillType];
    if (preferredSlot && allowedSlots.includes(preferredSlot)) {
        return preferredSlot;
    }

    if (skillType === "Q" || skillType === "MQ" || skillType === "P") {
        const firstEmptySlot = allowedSlots.find((slot) => !selectedSkills[slot]);
        if (firstEmptySlot) return firstEmptySlot;
    }

    if (allowedSlots.includes(skillType)) {
        return skillType;
    }

    return allowedSlots.find((slot) => !selectedSkills[slot]) || allowedSlots[0];
}

function buildSkillSetModalRowMetricBreakdown({
    adjustedSkill = null,
    overrideMetricBreakdown = null,
    displayPower = 0,
    displayGuard = 0,
    displayState = 0,
    displayAttribute = 0
} = {}) {
    const powerEntries = buildSkillSetMetricBreakdownEntries(
        overrideMetricBreakdown?.power || adjustedSkill,
        SKILL_SET_MODAL_POWER_BREAKDOWN_KEYS
    );
    const guardEntries = buildSkillSetMetricBreakdownEntries(
        overrideMetricBreakdown?.guard || adjustedSkill,
        SKILL_SET_MODAL_GUARD_BREAKDOWN_KEYS
    );
    const stateEntries = buildSkillSetMetricBreakdownEntries(
        overrideMetricBreakdown?.state || adjustedSkill,
        SKILL_SET_MODAL_STATE_BREAKDOWN_KEYS
    );
    const attributeEntries = buildSkillSetMetricBreakdownEntries(
        overrideMetricBreakdown?.attribute || adjustedSkill,
        SKILL_SET_MODAL_ATTRIBUTE_BREAKDOWN_KEYS,
        SKILL_POWER_KEY_SCALES
    );

    if (!attributeEntries.length) {
        const fallbackAttribute = Math.round(toFiniteNumber(displayAttribute));
        if (fallbackAttribute !== 0) {
            attributeEntries.push({
                label: "属性",
                value: fallbackAttribute
            });
        }
    }

    if (!powerEntries.length && !attributeEntries.length) {
        const fallbackPower = Math.round(toFiniteNumber(displayPower));
        if (fallbackPower !== 0) {
            powerEntries.push({
                label: "威力",
                value: fallbackPower
            });
        }
    }
    if (!guardEntries.length) {
        const fallbackGuard = Math.round(toFiniteNumber(displayGuard));
        if (fallbackGuard !== 0) {
            guardEntries.push({
                label: "守り",
                value: fallbackGuard
            });
        }
    }
    if (!stateEntries.length) {
        const fallbackState = Math.round(toFiniteNumber(displayState));
        if (fallbackState !== 0) {
            stateEntries.push({
                label: "状態",
                value: fallbackState
            });
        }
    }

    return {
        powerMap: convertSkillSetMetricBreakdownEntriesToMap(powerEntries),
        guardMap: convertSkillSetMetricBreakdownEntriesToMap(guardEntries),
        stateMap: convertSkillSetMetricBreakdownEntriesToMap(stateEntries),
        attributeMap: convertSkillSetMetricBreakdownEntriesToMap(attributeEntries),
        powerTitle: formatSkillSetMetricBreakdownTitle(powerEntries),
        guardTitle: formatSkillSetMetricBreakdownTitle(guardEntries),
        stateTitle: formatSkillSetMetricBreakdownTitle(stateEntries),
        attributeTitle: formatSkillSetMetricBreakdownTitle(attributeEntries)
    };
}

function buildSkillSetModalRows() {
    const slotOrder = ["A", "S", "Q1", "Q2", "M"];
    const activeConditionalPassives = getRuntimePassiveLikeSkillsForSelectedSkills(selectedSkills, {
        characterName: selectName || playerData?.name || ""
    });
    const conditionalPassiveStatusBonuses = buildRuntimeStatusBonuses({
        activeConditionalPassives,
        characterName: selectName || playerData?.name || ""
    });
    const totalFullPower = getSelectedSkillsFullPowerTotal({ activeConditionalPassives });
    const globalFinalRates = buildSelectedSkillsGlobalFinalRates({ activeConditionalPassives });
    const globalAllPowerMultiplier = buildSelectedSkillsAllPowerMultiplier({ activeConditionalPassives });
    const globalDefensePerformanceMultiplier = buildSelectedSkillsDefensePerformanceMultiplier({ activeConditionalPassives });
    const attackCountContext = resolveBattleAttackCountContext({ activeConditionalPassives });
    const attackCountDisplayMultiplier = resolveGlobalAttackCountMultiplier(selectedSkills, {
        includeSkill: (slot, skillData) => resolveSkillTotalBucket(slot, skillData) === "A"
    });
    const attackCountSplitMultiplier = resolveSplitAttackCountMultiplier(selectedSkills);
    const splitCount = Math.max(1, Math.round(toFiniteNumber(attackCountContext?.splitCount) || 1))
        * Math.max(1, Math.round(toFiniteNumber(attackCountSplitMultiplier) || 1));
    const shouldSplitByAttackCount = Boolean(attackCountContext?.enabledSplit) && splitCount >= 2;
    let displayedAttackCount = Math.max(1, Math.round(toFiniteNumber(attackCountContext?.displayBaseCount) || 1));
    const hasASlotSkill = Boolean(getSkillData(selectedSkills?.A));
    const mSkillForFallback = getSkillData(selectedSkills?.M);
    const useMagicFallbackTotals = !hasASlotSkill && isMagicAttackMethodSkill(mSkillForFallback);
    let magicAttackCountBase = 1;
    let magicAttackCountAdditional = 0;

    let totalCritRate = 0;
    let totalCritPower = 0;
    let totalMinDamage = 0;
    let totalDefensePenetration = 0;
    let totalMagicPenetration = 0;
    let hasAnyExtra = false;
    const groupedTotals = {
        A: { power: 0, guard: 0, state: 0, attribute: 0 },
        M: { power: 0, guard: 0, state: 0, attribute: 0 }
    };
    DebaglogGroupStart("[SkillSetModal] buildSkillSetModalRows");
    DebaglogSet("globalFinalRates:", globalFinalRates);
    DebaglogSet(
        "totalFullPower:",
        totalFullPower,
        "globalAllPowerMultiplier:",
        globalAllPowerMultiplier,
        "globalDefensePerformanceMultiplier:",
        globalDefensePerformanceMultiplier
    );

    const rows = slotOrder.map((slot) => {
        const skillEntry = selectedSkills[slot];
        const skillData = getSkillData(skillEntry);
        const preview = calculateBattleSkillDisplayData(slot, skillEntry, {
            isFullPowerOn: isFullPower,
            totalFullPower,
            globalFinalRates,
            globalAllPowerMultiplier,
            globalDefensePerformanceMultiplier,
            activeConditionalPassives,
            conditionalPassiveStatusBonuses
        });
        const sourceSkill = preview?.calcSkillData || skillData;
        const isSplitTargetSlot = slot === "S" || slot === "Q1" || slot === "Q2";
        const totalBucket = resolveSkillTotalBucket(slot, sourceSkill, skillData);
        const slotDivisor = (shouldSplitByAttackCount && isSplitTargetSlot) ? splitCount : 1;

        const rawPower = toFiniteNumber(preview?.powerValue);
        const rawState = toFiniteNumber(preview?.stateValue);
        const displayPowerValue = slotDivisor > 1 ? Math.round(rawPower / slotDivisor) : rawPower;
        const displayStateValue = slotDivisor > 1 ? Math.round(rawState / slotDivisor) : rawState;
        const guardResolved = resolveUnifiedGuardValue({
            slot,
            preview,
            sourceSkill,
            fallbackSkillData: skillData,
            slotDivisor
        });
        const hasOverrideBreakdown = guardResolved.hasOverrideBreakdown;
        const guardSourceSkill = guardResolved.guardSourceSkill;
        const physicalGuardBase = guardResolved.physicalGuardBase;
        const magicGuardRaw = guardResolved.magicGuardRaw;
        const hasGuardByType = guardResolved.hasGuardByType;
        const attackMethodGuardValue = guardResolved.attackMethodGuardValue;
        const rowGuardValue = toFiniteNumber(guardResolved.rowGuardValue);
        const displayGuardValue = toFiniteNumber(guardResolved.displayGuardValue);

        const slotAttackCountInfo = getSkillAttackCountInfo(sourceSkill);
        if (totalBucket === "A" && isSplitTargetSlot && slotAttackCountInfo.baseCount <= 1 && slotAttackCountInfo.addedCount > 0) {
            displayedAttackCount += Math.max(0, slotAttackCountInfo.addedCount);
        }
        const slotAttackCount = slot === "A" && Boolean(attackCountContext?.isANormalAttack)
            ? Math.max(1, Math.round(toFiniteNumber(attackCountContext?.displayBaseCount) || 1))
            : Math.max(0, Math.round(toFiniteNumber(slotAttackCountInfo.totalCount) || 0));
        const metricBreakdown = buildSkillSetModalRowMetricBreakdown({
            adjustedSkill: preview?.adjustedSkillData || sourceSkill,
            overrideMetricBreakdown: preview?.overrideMetricBreakdown,
            displayPower: displayPowerValue,
            displayGuard: rowGuardValue,
            displayState: displayStateValue,
            displayAttribute: preview?.displayAttribute
        });
        let rowPowerValue = toFiniteNumber(displayPowerValue);
        const rowAttributeValue = toFiniteNumber(preview?.displayAttribute);
        let groupedPowerValue = rowPowerValue;
        let groupedAttributeValue = rowAttributeValue;
        let rowAttributeText = rowAttributeValue !== 0
            ? String(Math.round(rowAttributeValue))
            : (preview?.displayAttribute || "");
        const buildScaledBreakdownMap = (baseMap = {}, options = {}) => {
            const sourceMap = baseMap && typeof baseMap === "object" ? baseMap : {};
            const multiplier = Math.max(0, toFiniteNumber(options?.multiplier) || 1);
            const divisor = Math.max(1, Math.round(toFiniteNumber(options?.divisor) || 1));
            const resolveRate = typeof options?.resolveRate === "function" ? options.resolveRate : null;
            const scaled = {};
            Object.entries(sourceMap).forEach(([key, rawValue]) => {
                const label = String(key || "").trim();
                if (!label) return;
                let baseValue = toFiniteNumber(rawValue);
                if (baseValue === 0) return;
                if (resolveRate) {
                    baseValue *= Math.max(0, toFiniteNumber(resolveRate(label)) || 1);
                }
                let value = toScaledNumber(baseValue, multiplier);
                if (divisor > 1) {
                    value = Math.round(value / divisor);
                }
                if (value > 0) {
                    scaled[label] = value;
                }
            });
            return scaled;
        };
        const reconcileBreakdownMapToExpected = (map = {}, expectedValue = 0, fallbackLabel = "") => {
            const target = Math.max(0, Math.round(toFiniteNumber(expectedValue)));
            if (target <= 0) return {};
            const normalized = {};
            Object.entries(map && typeof map === "object" ? map : {}).forEach(([key, rawValue]) => {
                const label = String(key || "").trim();
                const value = Math.round(toFiniteNumber(rawValue));
                if (!label || value <= 0) return;
                normalized[label] = (normalized[label] || 0) + value;
            });
            const entries = Object.entries(normalized);
            if (!entries.length) {
                return fallbackLabel ? { [fallbackLabel]: target } : {};
            }
            const sum = entries.reduce((acc, [, value]) => acc + toFiniteNumber(value), 0);
            if (sum === target) return normalized;
            const largestKey = entries
                .sort((a, b) => toFiniteNumber(b[1]) - toFiniteNumber(a[1]))[0]?.[0];
            if (!largestKey) {
                return fallbackLabel ? { [fallbackLabel]: target } : {};
            }
            const adjusted = { ...normalized };
            adjusted[largestKey] = Math.max(1, Math.round(toFiniteNumber(adjusted[largestKey]) + (target - sum)));
            const adjustedSum = Object.values(adjusted).reduce((acc, value) => acc + toFiniteNumber(value), 0);
            if (adjustedSum === target) return adjusted;
            if (fallbackLabel) {
                return { [fallbackLabel]: target };
            }
            return { [largestKey]: target };
        };
        const resolveGlobalRate = (statKey) => {
            const multiplierKey = getMultiplierKeyByStatKey(statKey);
            return Math.max(0, toFiniteNumber(globalFinalRates?.[multiplierKey]) || 1);
        };
        const scaledBreakdownMultiplier = hasOverrideBreakdown
            ? Math.max(
                0,
                toFiniteNumber(preview?.fullPowerMultiplier) * toFiniteNumber(preview?.allPowerMultiplier)
            ) || 1
            : Math.max(0, toFiniteNumber(preview?.effectiveMultiplier) || 1);
        const scaledPowerBreakdownMap = buildScaledBreakdownMap(metricBreakdown.powerMap, {
            multiplier: scaledBreakdownMultiplier,
            divisor: slotDivisor,
            resolveRate: hasOverrideBreakdown ? resolveGlobalRate : null
        });
        const scaledGuardBreakdownMap = buildScaledBreakdownMap(metricBreakdown.guardMap, {
            multiplier: scaledBreakdownMultiplier,
            divisor: slotDivisor
        });
        const scaledStateBreakdownMap = buildScaledBreakdownMap(metricBreakdown.stateMap, {
            multiplier: scaledBreakdownMultiplier,
            divisor: slotDivisor
        });
        const scaledAttributeBreakdownMap = buildScaledBreakdownMap(metricBreakdown.attributeMap, {
            multiplier: scaledBreakdownMultiplier,
            divisor: slotDivisor,
            resolveRate: hasOverrideBreakdown ? resolveGlobalRate : null
        });
        const scaledPowerBreakdownTotal = Object.values(scaledPowerBreakdownMap).reduce(
            (sum, value) => sum + toFiniteNumber(value),
            0
        );
        const expectedPowerValue = Math.max(0, Math.round(scaledPowerBreakdownTotal));
        rowPowerValue = expectedPowerValue;
        groupedPowerValue = rowPowerValue;
        let reconciledPowerBreakdownMap = reconcileBreakdownMapToExpected(
            scaledPowerBreakdownMap,
            expectedPowerValue,
            expectedPowerValue > 0 ? "威力" : ""
        );
        const reconciledGuardBreakdownMap = reconcileBreakdownMapToExpected(
            scaledGuardBreakdownMap,
            rowGuardValue,
            "守り"
        );
        const reconciledStateBreakdownMap = reconcileBreakdownMapToExpected(
            scaledStateBreakdownMap,
            displayStateValue,
            "状態"
        );
        const scaledAttributeBreakdownTotal = Object.values(scaledAttributeBreakdownMap).reduce(
            (sum, value) => sum + toFiniteNumber(value),
            0
        );
        const expectedAttributeValue = rowAttributeValue !== 0
            ? rowAttributeValue
            : scaledAttributeBreakdownTotal;
        const reconciledAttributeBreakdownMap = reconcileBreakdownMapToExpected(
            scaledAttributeBreakdownMap,
            expectedAttributeValue,
            "属性"
        );
        const reconciledAttributeTotal = Object.values(reconciledAttributeBreakdownMap).reduce(
            (sum, value) => sum + toFiniteNumber(value),
            0
        );
        if (reconciledAttributeTotal > 0) {
            groupedAttributeValue = reconciledAttributeTotal;
            rowAttributeText = String(Math.round(reconciledAttributeTotal));
        }
        let scaledPowerBreakdownPhysicalMap = Object.entries(reconciledPowerBreakdownMap).reduce((acc, [key, value]) => {
            if (PHYSICAL_POWER_KEYS.includes(String(key || "").trim())) {
                acc[key] = toFiniteNumber(value);
            }
            return acc;
        }, {});
        if (hasOverrideBreakdown && totalBucket === "A" && Object.keys(scaledPowerBreakdownPhysicalMap).length === 0) {
            const fallbackPower = Math.max(0, Math.round(toFiniteNumber(rowPowerValue)));
            if (fallbackPower > 0) {
                const actionKey = resolveASlotNormalAttackActionKey(sourceSkill || skillData || {});
                const fallbackPhysicalKey = (
                    actionKey === "貫通" || actionKey === "射撃" || actionKey === "狙撃"
                )
                    ? "貫通"
                    : (actionKey === "打撃" || actionKey === "攻勢盾")
                        ? "打撃"
                        : "切断";
                scaledPowerBreakdownPhysicalMap = { [fallbackPhysicalKey]: fallbackPower };
                reconciledPowerBreakdownMap = { ...scaledPowerBreakdownPhysicalMap };
            }
        }
        const isLevelAttackReference = isLevelReferenceKey(preview?.attackReference || "");
        if (
            totalBucket === "A"
            && Object.keys(scaledPowerBreakdownPhysicalMap).length === 0
            && isLevelAttackReference
        ) {
            const fallbackPower = Math.max(0, Math.round(toFiniteNumber(rowPowerValue)));
            if (fallbackPower > 0) {
                scaledPowerBreakdownPhysicalMap = { 威力: fallbackPower };
            }
        }
        if (totalBucket === "A") {
            groupedPowerValue = Object.values(scaledPowerBreakdownPhysicalMap)
                .reduce((sum, value) => sum + toFiniteNumber(value), 0);
        }
        const scaledPowerBreakdownTitle = formatSkillSetMetricBreakdownTitleFromMap(reconciledPowerBreakdownMap);
        const scaledGuardBreakdownTitle = formatSkillSetMetricBreakdownTitleFromMap(reconciledGuardBreakdownMap);
        const scaledStateBreakdownTitle = formatSkillSetMetricBreakdownTitleFromMap(reconciledStateBreakdownMap);
        const scaledAttributeBreakdownTitle = formatSkillSetMetricBreakdownTitleFromMap(reconciledAttributeBreakdownMap);

        const slotExtraMetrics = getSlotBattleExtraMetrics(slot, sourceSkill);
        const slotCrRate = slotExtraMetrics.critRate;
        const slotCrPower = slotExtraMetrics.critPower;
        const slotMinDamage = slotExtraMetrics.minDamage;
        const slotDefensePenetration = slotExtraMetrics.defensePenetration;
        const slotMagicPenetration = slotExtraMetrics.magicPenetration;
        totalCritRate += slotCrRate;
        totalCritPower += slotCrPower;
        totalMinDamage += slotMinDamage;
        totalDefensePenetration += slotDefensePenetration;
        totalMagicPenetration += slotMagicPenetration;
        if (slotCrRate !== 0 || slotCrPower !== 0 || slotMinDamage !== 0) {
            hasAnyExtra = true;
        }
        groupedTotals[totalBucket].power += groupedPowerValue;
        groupedTotals[totalBucket].guard += toFiniteNumber(rowGuardValue);
        groupedTotals[totalBucket].state += toFiniteNumber(displayStateValue);
        groupedTotals[totalBucket].attribute += groupedAttributeValue;
        if (totalBucket === "M") {
            if (slot === "M") {
                // M枠自身の「攻撃回数」を基準にする。
                magicAttackCountBase = Math.max(
                    1,
                    Math.round(toFiniteNumber(slotAttackCountInfo.baseCount || slotAttackCountInfo.totalCount) || 1)
                );
            }
            // 攻撃手段:魔法の追加回数をM攻撃回数へ加算する。
            magicAttackCountAdditional += Math.max(0, Math.round(toFiniteNumber(slotAttackCountInfo.addedCount) || 0));
        }

        const displayName = String(skillData?.和名 || skillData?.技名 || skillData?.name || "").trim();
        const displayRuby = String(skillData?.英名 || "").trim();
        const displayDescription = String(skillData?.詳細 || skillData?.description || "").trim();
        let rowFullPower = toFiniteNumber(getFirstFiniteNumberByKeys(sourceSkill, ["全力"], 0));
        if (isASlotNormalAttackBySkill(slot, sourceSkill)) {
            rowFullPower += getAttackOptionFullPowerValueWithLog(
                getSelectedAttackOptionData(),
                "buildSkillSetModalRows"
            );
        }
        const contextSkillData = skillData && typeof skillData === "object" ? { ...skillData } : {};
        contextSkillData.技名 = contextSkillData.技名 || contextSkillData.和名 || contextSkillData.name || displayName;
        contextSkillData.属性 = contextSkillData.属性 || preview?.displayAttribute || "";
        const conditionContext = buildConditionContextForSkill({
            ...contextSkillData
        });
        const { matchedPassives } = buildSkillDataWithConditionalPassives(skillData, conditionContext);
        const matchedPassiveItems = buildConditionPassiveModalItems(matchedPassives);

        if (totalBucket === "A") {
            DebaglogSet("[SkillSetModal][A集計]", {
                slot,
                skill: displayName || "(未選択)",
                powerDisplay: displayPowerValue,
                powerGrouped: groupedPowerValue,
                attributeDisplay: preview?.displayAttribute,
                attributeGrouped: groupedAttributeValue,
                guardDisplayRaw: displayGuardValue,
                guardDisplayFinal: rowGuardValue,
                guardByType: {
                    physical: physicalGuardBase,
                    magicRaw: magicGuardRaw,
                    magicApplied: guardResolved.magicGuardApplied,
                    attackMethod: attackMethodGuardValue
                },
                powerBeforeMultiplier: preview?.powerBeforeMultiplier,
                effectiveMultiplier: preview?.effectiveMultiplier,
                fullPowerMultiplier: preview?.fullPowerMultiplier,
                allPowerMultiplier: preview?.allPowerMultiplier,
                globalRates: {
                    切断倍: globalFinalRates?.["切断倍"],
                    貫通倍: globalFinalRates?.["貫通倍"],
                    打撃倍: globalFinalRates?.["打撃倍"],
                    炎倍: globalFinalRates?.["炎倍"],
                    氷倍: globalFinalRates?.["氷倍"],
                    雷倍: globalFinalRates?.["雷倍"],
                    酸倍: globalFinalRates?.["酸倍"],
                    音波倍: globalFinalRates?.["音波倍"],
                    闇倍: globalFinalRates?.["闇倍"],
                    光倍: globalFinalRates?.["光倍"]
                },
                breakdownPower: metricBreakdown.powerMap,
                breakdownPowerScaled: reconciledPowerBreakdownMap,
                breakdownAttribute: metricBreakdown.attributeMap,
                breakdownAttributeScaled: reconciledAttributeBreakdownMap
            });
        }

        return {
            slot,
            name: displayName,
            ruby: displayRuby,
            power: formatSkillMetricText(rowPowerValue),
            guard: formatSkillMetricText(rowGuardValue),
            state: formatSkillMetricText(displayStateValue),
            attribute: rowAttributeText,
            powerBreakdown: metricBreakdown.powerMap,
            guardBreakdown: metricBreakdown.guardMap,
            stateBreakdown: metricBreakdown.stateMap,
            attributeBreakdown: metricBreakdown.attributeMap,
            powerBreakdownScaled: reconciledPowerBreakdownMap,
            powerBreakdownScaledPhysical: scaledPowerBreakdownPhysicalMap,
            guardBreakdownScaled: reconciledGuardBreakdownMap,
            stateBreakdownScaled: reconciledStateBreakdownMap,
            attributeBreakdownScaled: reconciledAttributeBreakdownMap,
            powerBreakdownTitle: scaledPowerBreakdownTitle || metricBreakdown.powerTitle,
            guardBreakdownTitle: scaledGuardBreakdownTitle || metricBreakdown.guardTitle,
            stateBreakdownTitle: scaledStateBreakdownTitle || metricBreakdown.stateTitle,
            attributeBreakdownTitle: scaledAttributeBreakdownTitle || metricBreakdown.attributeTitle,
            totalBucket,
            fullPower: rowFullPower,
            critRate: slotCrRate,
            critPower: slotCrPower,
            minDamage: slotMinDamage,
            attackCount: slotAttackCount,
            attackCountBase: Math.max(0, Math.round(toFiniteNumber(slotAttackCountInfo.baseCount) || 0)),
            attackCountAdded: Math.max(0, Math.round(toFiniteNumber(slotAttackCountInfo.addedCount) || 0)),
            defensePenetration: slotDefensePenetration,
            magicPenetration: slotMagicPenetration,
            description: displayDescription,
            matchedPassiveCount: matchedPassiveItems.length,
            matchedPassives: matchedPassiveItems
        };
    });

    const finalAttackCount = Math.max(
        1,
        Math.round(displayedAttackCount * Math.max(1, Math.round(toFiniteNumber(attackCountDisplayMultiplier) || 1)))
    );
    const finalMagicAttackCount = Math.max(
        1,
        Math.round(toFiniteNumber(magicAttackCountBase) + toFiniteNumber(magicAttackCountAdditional))
    );
    if (!hasASlotSkill && !useMagicFallbackTotals) {
        totalCritRate += 10;
        totalCritPower += 130;
        hasAnyExtra = true;
    }
    const fullPowerTotalMultiplier = toFiniteNumber(totalFullPower) / 100 + 1.25;
    DebaglogSet("[SkillSetModal] groupedTotals:", groupedTotals);
    DebaglogGroupEnd();

    return {
        rows,
        summary: {
            critRate: Math.round(totalCritRate),
            critPower: Math.round(totalCritPower),
            minDamage: Math.round(totalMinDamage),
            defensePenetration: Math.round(totalDefensePenetration),
            magicPenetration: Math.round(totalMagicPenetration),
            hasAnyExtra,
            attackCount: finalAttackCount,
            attackCountA: finalAttackCount,
            attackCountM: finalMagicAttackCount,
            fullPowerTotal: Math.round(toFiniteNumber(totalFullPower)),
            fullPowerTotalMultiplier: Number(fullPowerTotalMultiplier.toFixed(4)),
            groupedTotals: {
                A: {
                    power: Math.round(groupedTotals.A.power),
                    guard: Math.round(groupedTotals.A.guard),
                    state: Math.round(groupedTotals.A.state),
                    attribute: Math.round(groupedTotals.A.attribute)
                },
                M: {
                    power: Math.round(groupedTotals.M.power),
                    guard: Math.round(groupedTotals.M.guard),
                    state: Math.round(groupedTotals.M.state),
                    attribute: Math.round(groupedTotals.M.attribute)
                }
            }
        }
    };
}

function buildAttackMethodOptionsForSkillSetModal() {
    const selectElement = document.getElementById("attack-method-select");
    if (selectElement && selectElement.options?.length) {
        const list = [];
        Array.from(selectElement.options).forEach((option) => {
            const value = normalizeBattleText(option?.value);
            if (!value) return;
            const label = normalizeBattleText(option?.textContent) || value;
            list.push({ value, label });
        });
        return list;
    }

    return attackOptions
        .map((option) => ({
            value: normalizeBattleText(option?.value),
            label: normalizeBattleText(option?.label) || normalizeBattleText(option?.value)
        }))
        .filter((option) => option.value);
}

function getCurrentAttackMethodValueForSkillSetModal() {
    const selectElement = document.getElementById("attack-method-select");
    const fromSelect = normalizeBattleText(selectElement?.value);
    if (fromSelect) return fromSelect;
    return getSavedAttackOptionForCharacter();
}

function updateAttackMethodTriggerLabel(value = "") {
    const trigger = document.getElementById("attack-method-open-button");
    if (!trigger) return;

    const normalized = normalizeBattleText(value);
    if (!normalized) {
        trigger.textContent = "--選択してください--";
        return;
    }

    const selectElement = document.getElementById("attack-method-select");
    if (selectElement) {
        const matched = Array.from(selectElement.options || []).find(
            (option) => normalizeBattleText(option?.value) === normalized
        );
        const label = normalizeBattleText(matched?.textContent);
        trigger.textContent = label || normalized;
        return;
    }

    trigger.textContent = normalized;
}

let attackMethodPickerResolver = null;

function ensureAttackMethodPickerModalElement() {
    let modal = document.getElementById("attack-method-picker-modal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "attack-method-picker-modal";
    modal.className = "attack-method-picker-modal";
    modal.innerHTML = `
        <div class="attack-method-picker-content" role="dialog" aria-modal="true" aria-labelledby="attack-method-picker-title">
            <div class="attack-method-picker-header">
                <h3 id="attack-method-picker-title">攻撃手段を選択</h3>
                <button type="button" class="attack-method-picker-close" aria-label="閉じる">×</button>
            </div>
            <div id="attack-method-picker-list" class="attack-method-picker-list"></div>
        </div>
    `;

    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            closeAttackMethodPickerModal("");
        }
    });

    const closeButton = modal.querySelector(".attack-method-picker-close");
    if (closeButton) {
        closeButton.addEventListener("click", () => closeAttackMethodPickerModal(""));
    }

    document.body.appendChild(modal);
    return modal;
}

function closeAttackMethodPickerModal(resultValue = "") {
    const modal = document.getElementById("attack-method-picker-modal");
    const wasOpen = Boolean(modal && modal.classList.contains("is-open"));
    if (modal) {
        modal.classList.remove("is-open");
    }
    const done = attackMethodPickerResolver;
    attackMethodPickerResolver = null;
    if (typeof done === "function") {
        done(normalizeBattleText(resultValue));
    }
    if (wasOpen) {
        triggerPostModalInteractionGuardSafe(1500);
    }
}

function openAttackMethodPickerModal(options = [], currentValue = "") {
    const modal = ensureAttackMethodPickerModalElement();
    const list = modal.querySelector("#attack-method-picker-list");
    if (!list) return Promise.resolve("");

    const normalizedCurrent = normalizeBattleText(currentValue);
    list.innerHTML = "";
    options.forEach((option) => {
        const value = normalizeBattleText(option?.value);
        if (!value) return;
        const label = normalizeBattleText(option?.label) || value;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "attack-method-picker-option";
        if (value === normalizedCurrent) {
            button.classList.add("is-selected");
        }
        button.textContent = label;
        button.addEventListener("click", () => closeAttackMethodPickerModal(value));
        list.appendChild(button);
    });

    modal.classList.add("is-open");
    return new Promise((resolve) => {
        attackMethodPickerResolver = resolve;
    });
}

async function openAttackMethodChangeModal() {
    const options = buildAttackMethodOptionsForSkillSetModal();
    if (!options.length) return;

    const currentValue = getCurrentAttackMethodValueForSkillSetModal();
    const selected = await openAttackMethodPickerModal(options, currentValue);
    if (!selected) return;
    await handleAttackMethodChange(selected);
}
window.openAttackMethodChangeModal = openAttackMethodChangeModal;

function buildSkillSetModalPayload() {
    const modalData = buildSkillSetModalRows();
    return {
        rows: modalData?.rows || [],
        summary: modalData?.summary || null,
        resourcePreview: buildSkillSetResourcePreview(),
        isFullPowerOn: isFullPower,
        currentAttackMethod: getCurrentAttackMethodValueForSkillSetModal(),
        attackMethods: buildAttackMethodOptionsForSkillSetModal()
    };
}

async function applyAttackMethodFromSkillSetModal(value) {
    const selectedMethod = normalizeBattleText(value);
    await handleAttackMethodChange(selectedMethod);
    return buildSkillSetModalPayload();
}
window.applyAttackMethodFromSkillSetModal = applyAttackMethodFromSkillSetModal;

async function clearSkillFromSkillSetModal(slot) {
    const targetSlot = String(slot || "").trim();
    if (!targetSlot || !SELECTED_SKILL_SLOT_ORDER.includes(targetSlot)) {
        return buildSkillSetModalPayload();
    }
    if (selectedSkills?.[targetSlot]) {
        selectedSkills[targetSlot] = null;
        syncSelectedSkillsToCurrentCharacter();
        await updateSelectedSkills();
        rerenderSkillTables();
    }
    return buildSkillSetModalPayload();
}
window.clearSkillFromSkillSetModal = clearSkillFromSkillSetModal;

async function openSkillSetModal(skillType, skillName) {
    const allowedSlots = getAllowedSlots(skillType);
    if (!allowedSlots.length) {
        console.warn(`セット可能なスロットがありません: ${skillType}`);
        return;
    }

    const defaultSlot = getDefaultSlot(allowedSlots, skillType);
    const modalPayload = buildSkillSetModalPayload();

    if (typeof window.openSkillSetModalVue === "function") {
        const result = await window.openSkillSetModalVue({
            skillType,
            skillName,
            allowedSlots,
            defaultSlot,
            rows: modalPayload.rows,
            summary: modalPayload.summary,
            currentAttackMethod: modalPayload.currentAttackMethod,
            attackMethods: modalPayload.attackMethods
        });
        const selectedSlot = typeof result === "string"
            ? result
            : (result && typeof result === "object" ? String(result.slot || "") : "");
        if (selectedSlot) {
            applySelectedSkillToSlot(selectedSlot);
        }
        return;
    }

    // Vueモーダルがまだ使えない場合のフォールバック
    applySelectedSkillToSlot(defaultSlot || allowedSlots[0]);
}

function applySelectedSkillToSlot(slot) {
    if (!selectedSkill || !slot) return;
    selectSkill(slot, selectedSkill);
}

async function openSelectedSkillsDetailModal() {
    const modalPayload = buildSkillSetModalPayload();
    if (typeof window.openSkillSetModalVue !== "function") return;
    const defaultSlot = SELECTED_SKILL_SLOT_ORDER.find((slot) => {
        const slotSkill = selectedSkills?.[slot];
        return Boolean(getSkillName(slotSkill));
    }) || "A";

    const result = await window.openSkillSetModalVue({
        mode: "manage",
        skillType: "A",
        skillName: "選択中スキル",
        managedSlot: "",
        allowedSlots: [...SELECTED_SKILL_SLOT_ORDER],
        defaultSlot,
        rows: modalPayload.rows,
        summary: modalPayload.summary,
        currentAttackMethod: modalPayload.currentAttackMethod,
        attackMethods: modalPayload.attackMethods
    });

    if (
        result
        && typeof result === "object"
        && result.action === "clear"
        && String(result.slot || "").trim()
    ) {
        const clearSlot = String(result.slot).trim();
        selectedSkills[clearSlot] = null;
        syncSelectedSkillsToCurrentCharacter();
        updateSelectedSkills();
        rerenderSkillTables();
    }
}
window.openSelectedSkillsDetailModal = openSelectedSkillsDetailModal;

async function openSkillSetSendModal() {
    if (typeof window.openSkillSetModalVue !== "function") return;
    const modalPayload = buildSkillSetModalPayload();
    const diceCountInput = document.getElementById("dice-count");
    const diceMaxInput = document.getElementById("dice-max");
    const diceCount = Math.max(1, Math.round(toFiniteNumber(diceCountInput?.value) || 1));
    const diceMax = Math.max(2, Math.round(toFiniteNumber(diceMaxInput?.value) || 100));

    const result = await window.openSkillSetModalVue({
        mode: "send",
        skillType: "A",
        skillName: "GM送信",
        managedSlot: "",
        allowedSlots: [...SELECTED_SKILL_SLOT_ORDER],
        defaultSlot: "A",
        rows: modalPayload.rows,
        summary: modalPayload.summary,
        currentAttackMethod: modalPayload.currentAttackMethod,
        attackMethods: modalPayload.attackMethods,
        diceCount,
        diceMax
    });

    if (!result || typeof result !== "object" || result.action !== "send") return;

    const nextDiceCount = Math.max(1, Math.round(toFiniteNumber(result.diceCount) || 1));
    const nextDiceMax = Math.max(2, Math.round(toFiniteNumber(result.diceMax) || 100));

    if (diceCountInput) diceCountInput.value = String(nextDiceCount);
    if (diceMaxInput) diceMaxInput.value = String(nextDiceMax);

    await sendData(nextDiceCount, nextDiceMax);
}
window.openSkillSetSendModal = openSkillSetSendModal;

// 現状 playerData からしか取得していないので技が入力されない。
// スキルをクリックした際の処理
async function handleSkillClick(type, name, displaySource = "skills") {
    const sourceTag = normalizeBattleText(displaySource).toLowerCase();
    if (sourceTag === "active") {
        const characterName = selectName || playerData?.name || "";
        const confirmed = await askConfirmAsync(`発動中スキル「${name}」を解除しますか？`);
        if (!confirmed) return;
        const result = removeRetainedBuffSkillByTypeAndName(type, name, characterName);
        if (!result?.removed) return;
        await refreshTopRightStatusContainer();
        await updateSelectedSkills();
        await rerenderSkillTables();
        return;
    }

    selectedType = type;
    const fetchedSkills = await fetchSkillsByName(name);
    const fetchedSkillList = Array.isArray(fetchedSkills)
        ? fetchedSkills.filter((entry) => entry && typeof entry === "object")
        : (fetchedSkills && typeof fetchedSkills === "object" ? [fetchedSkills] : []);
    const normalizedType = String(type || "").trim().toUpperCase();
    const matchedByType = fetchedSkillList.filter((entry) => (
        String(entry?.種別 || "").trim().toUpperCase() === normalizedType
    ));
    const selectedSkillEntry = matchedByType[0] || fetchedSkillList[0] || null;
    selectedSkill = attachDisplaySourceMetaToSkillCollection(
        selectedSkillEntry ? [selectedSkillEntry] : [],
        displaySource,
        type
    );
    const fetchedSkillData = getSkillData(selectedSkill);
    const selectedAttackMethod = resolveAttackMethodForContext(fetchedSkillData);
    const conditionContext = {
        ...buildConditionContextForSkill(fetchedSkillData),
        attackMethod: selectedAttackMethod
    };
    const { matchedPassives } = buildSkillDataWithConditionalPassives(fetchedSkillData, conditionContext);
    const selectedSkillName = getSkillName(selectedSkill) || name;
    const conditionFields = {
        攻撃手段: fetchedSkillData?.攻撃手段 ?? "",
        条件スキル: fetchedSkillData?.条件スキル ?? "",
        条件属性: fetchedSkillData?.条件属性 ?? "",
        条件: fetchedSkillData?.条件 ?? ""
    };
    const matchedConditionFields = (Array.isArray(matchedPassives) ? matchedPassives : []).map((skill) => ({
        和名: skill?.和名 || skill?.技名 || skill?.name || "",
        攻撃手段: skill?.攻撃手段 ?? "",
        条件スキル: skill?.条件スキル ?? "",
        条件属性: skill?.条件属性 ?? "",
        条件: skill?.条件 ?? ""
    }));

    DebaglogGroupStart(`[SkillSelect] ${selectedSkillName} (${type})`);
    DebaglogSet("clicked:", { type, name });
    DebaglogSet("selectedAttackMethod:", selectedAttackMethod || "(empty)");
    DebaglogSet("fetchedSkillRaw:", selectedSkill);
    DebaglogSet("fetchedSkillData:", fetchedSkillData);
    DebaglogSet("conditionFields:", conditionFields);
    DebaglogSet("conditionContext:", conditionContext);
    DebaglogSet("matchedConditionPassives:", matchedPassives);
    if (matchedConditionFields.length > 0) {
        DebaglogTable(matchedConditionFields);
    } else {
        DebaglogSet("matchedConditionFields: []");
    }
    DebaglogGroupEnd();

    if (!selectedSkillName) {
        console.warn("スキルの取得に失敗しました:", type, name);
        return;
    }

    await openSkillSetModal(type, selectedSkillName);
}


// スキルをセットできるスロットを返す関数
function getAllowedSlots(skillType) {
    const allowedSlots = {
        A: ['A'],
        S: ['A', 'S'],
        Q: ['A', 'S', 'Q1', 'Q2'],
        M: ['M'],
        MS:['A', 'S'],
        MQ:['S', 'Q1', 'Q2'],
        P: ['A', 'S', 'Q1', 'Q2'],
    };
    return allowedSlots[skillType] || [];
}

// スキルごとに同じキーの値を合計する関数
function sumSkills(statusCharacter, selectedSkills) {
    const result = {};

    // 各スキルスロットを確認して値を加算
    SELECTED_SKILL_SLOT_ORDER.forEach(slot => {
        const skill = selectedSkills[slot];
        
        if (skill) {
            for (const key in skill) {
                // statusCharacter の該当キーの値を合算する
                if (statusCharacter[key]) {
                    result[key] = (result[key] || 0) + (parseInt(skill[key]) || 0);
                }
            }
        }
    });

    totalSkillValues = result; // 計算結果をグローバル変数に保存
    return result;
}


// スキルを選択してスロットにセット
function selectSkill(slotKey, setSkill) {
    // selectedSkill
    DebaglogSet("スキルを選択してスロットにセット :", slotKey, setSkill);
    selectedSkills[slotKey] = setSkill;
    syncSelectedSkillsToCurrentCharacter();
    DebaglogSet("スキルを選択してスロットにセット selectedSkills:", selectedSkills);
    const activeConditionalPassives = getRuntimePassiveLikeSkillsForSelectedSkills(selectedSkills, {
        characterName: selectName || playerData?.name || ""
    });
    const conditionalPassiveStatusBonuses = buildRuntimeStatusBonuses({
        activeConditionalPassives,
        characterName: selectName || playerData?.name || ""
    });
    const globalAllPowerMultiplier = buildSelectedSkillsAllPowerMultiplier({ activeConditionalPassives });
    const globalDefensePerformanceMultiplier = buildSelectedSkillsDefensePerformanceMultiplier({ activeConditionalPassives });
    const preview = calculateBattleSkillDisplayData(slotKey, setSkill, {
        isFullPowerOn: isFullPower,
        totalFullPower: getSelectedSkillsFullPowerTotal({ activeConditionalPassives }),
        globalFinalRates: buildSelectedSkillsGlobalFinalRates({ activeConditionalPassives }),
        globalAllPowerMultiplier,
        globalDefensePerformanceMultiplier,
        activeConditionalPassives,
        conditionalPassiveStatusBonuses
    });
    DebaglogGroupStart(`[スキル計算テスト] スロット=${slotKey} 技名=${preview.displayName || "(未設定)"}`);
    DebaglogSet("参照元:", preview.sourceTag || "skills");
    DebaglogSet("条件パッシブON数:", activeConditionalPassives.length);
    DebaglogSet("条件パッシブ一致数:", preview.matchedPassives.length);
    DebaglogSet("基本倍率:", preview.uper);
    if (isFullPower) {
        DebaglogSet("全力倍率:", preview.fullPowerMultiplier);
    }
    DebaglogSet("最終倍率:", preview.effectiveMultiplier);
    DebaglogSet("表示値:", {
        威力: preview.displayPower,
        守り: preview.displayGuard,
        状態: preview.displayState,
        属性: preview.displayAttribute
    });
    DebaglogSet("計算元スキル:", preview.calcSkillData);
    DebaglogGroupEnd();
    updateSelectedSkills();
    rerenderSkillTables();
}

// 選択されたスキルリストをテーブル形式で表示
async function updateSelectedSkills() {
    const selectedSkillsTable = document.getElementById('selected-skills');
    selectedSkillsTable.innerHTML = '';
    let totalPower = 0;
    let totalDefense = 0;
    let totalState = 0;
    const groupedTotals = {
        A: { power: 0, defense: 0, state: 0 },
        M: { power: 0, defense: 0, state: 0 }
    };
    let totalCritRate = 0;
    let totalCritPower = 0;
    let totalMinDamage = 0;
    let hasAnyExtra = false;
    const activeConditionalPassives = getRuntimePassiveLikeSkillsForSelectedSkills(selectedSkills, {
        characterName: selectName || playerData?.name || ""
    });
    const conditionalPassiveStatusBonuses = buildRuntimeStatusBonuses({
        activeConditionalPassives,
        characterName: selectName || playerData?.name || ""
    });
    const totalFullPower = getSelectedSkillsFullPowerTotal({ activeConditionalPassives });
    const globalFinalRates = buildSelectedSkillsGlobalFinalRates({ activeConditionalPassives });
    const globalAllPowerMultiplier = buildSelectedSkillsAllPowerMultiplier({ activeConditionalPassives });
    const globalDefensePerformanceMultiplier = buildSelectedSkillsDefensePerformanceMultiplier({ activeConditionalPassives });
    const attackCountContext = resolveBattleAttackCountContext({ activeConditionalPassives });
    const attackCountDisplayMultiplier = resolveGlobalAttackCountMultiplier(selectedSkills, {
        includeSkill: (slot, skillData) => resolveSkillTotalBucket(slot, skillData) === "A"
    });
    const attackCountSplitMultiplier = resolveSplitAttackCountMultiplier(selectedSkills);
    const splitCount = Math.max(1, Math.round(toFiniteNumber(attackCountContext?.splitCount) || 1))
        * Math.max(1, Math.round(toFiniteNumber(attackCountSplitMultiplier) || 1));
    const shouldSplitByAttackCount = Boolean(attackCountContext?.enabledSplit) && splitCount >= 2;
    let displayedAttackCount = Math.max(1, Math.round(toFiniteNumber(attackCountContext?.displayBaseCount) || 1));
    const hasASlotSkill = Boolean(getSkillData(selectedSkills?.A));
    const mSkillForFallback = getSkillData(selectedSkills?.M);
    const useMagicFallbackTotals = !hasASlotSkill && isMagicAttackMethodSkill(mSkillForFallback);
    const attackCountSlotDetails = [];
    for (const slot of SELECTED_SKILL_SLOT_ORDER) {
        const skill = selectedSkills?.[slot];
        const {
            calcSkillData,
            adjustedSkillData,
            matchedPassives,
            appliedPassives,
            overrideMetricBreakdown,
            attackReference,
            additionalPowerReference,
            attackValue,
            additionalPowerValue,
            attackMultiplier,
            powerMultiplier,
            magicMultiplier,
            allPowerMultiplier,
            fullPowerMultiplier,
            uper,
            effectiveMultiplier,
            powerBeforeMultiplier,
            powerAfterMultiplier,
            displayName,
            displayRuby,
            displayIcons,
            powerValue,
            guardValue,
            stateValue
        } = calculateBattleSkillDisplayData(slot, skill, {
            isFullPowerOn: isFullPower,
            totalFullPower,
            globalFinalRates,
            globalAllPowerMultiplier,
            globalDefensePerformanceMultiplier,
            activeConditionalPassives,
            conditionalPassiveStatusBonuses
        });
        const slotSkillSource = calcSkillData || getSkillData(skill);
        const slotAttackCountInfo = getSkillAttackCountInfo(slotSkillSource);
        const isMagicSlot = slot === "M";
        const isSplitTargetSlot = slot === "S" || slot === "Q1" || slot === "Q2";
        const slotDivisor = (shouldSplitByAttackCount && isSplitTargetSlot) ? splitCount : 1;
        const slotAllPowerRaw = getFirstFiniteNumberByKeys(
            slotSkillSource,
            ["全威力", "全威力倍", "全威力補正"],
            0
        );
        const slotAllPowerMultiplier = resolveAllPowerMultiplier(slotSkillSource);
        attackCountSlotDetails.push({
            slot,
            技名: displayName || "(未選択)",
            攻撃回数: slotAttackCountInfo.baseCount,
            追加回数: slotAttackCountInfo.addedCount,
            合計回数: slotAttackCountInfo.totalCount,
            全威力: slotAllPowerRaw,
            全威力倍率: slotAllPowerMultiplier
        });
        const mainRow = document.createElement('tr');
        mainRow.className = 'skill-row-main';

        if (calcSkillData) {
            const debugStatSource = getMultiplierStatSource(calcSkillData);
            const calcLog = {
                スロット: slot,
                技名: displayName || "(未設定)",
                参照元: getSkillDisplaySourceTag(calcSkillData) || "skills",
                ステータス参照元: debugStatSource,
                条件パッシブON数: activeConditionalPassives.length,
                条件パッシブ数: appliedPassives.length,
                条件パッシブ一致数: matchedPassives.length,
                判定参照: attackReference || "-",
                判定値: attackValue,
                判定倍率: attackMultiplier,
                追加威力参照: additionalPowerReference || "-",
                追加威力値: additionalPowerValue,
                追加威力倍率: powerMultiplier,
                魔法倍率: magicMultiplier,
                全威力倍率: allPowerMultiplier,
                基本倍率: uper,
                合計倍率: effectiveMultiplier,
                威力_上昇前: powerBeforeMultiplier,
                威力_上昇後: powerAfterMultiplier
            };
            if (isFullPower) {
                calcLog.全力倍率 = fullPowerMultiplier;
            }
            const slotPowerValue = toFiniteNumber(powerValue);
            const slotStateValue = toFiniteNumber(stateValue);
            const guardResolved = resolveUnifiedGuardValue({
                slot,
                preview: {
                    guardValue,
                    effectiveMultiplier,
                    adjustedSkillData,
                    overrideMetricBreakdown
                },
                sourceSkill: slotSkillSource,
                fallbackSkillData: getSkillData(skill),
                slotDivisor
            });
            const addedPower = slotDivisor > 1 ? Math.round(slotPowerValue / slotDivisor) : slotPowerValue;
            const addedDefense = toFiniteNumber(guardResolved.rowGuardValue);
            const addedState = slotDivisor > 1 ? Math.round(slotStateValue / slotDivisor) : slotStateValue;
            const totalBucket = resolveSkillTotalBucket(slot, slotSkillSource || calcSkillData, getSkillData(skill));
            if (totalBucket === "A" && isSplitTargetSlot && slotAttackCountInfo.baseCount <= 1 && slotAttackCountInfo.addedCount > 0) {
                displayedAttackCount += Math.max(0, slotAttackCountInfo.addedCount);
            }

            calcLog.通常攻撃分割数 = slotDivisor;
            calcLog.攻撃回数 = {
                ベース: displayedAttackCount,
                表示倍率: attackCountDisplayMultiplier,
                分割倍率: attackCountSplitMultiplier,
                スキル個別: slotAttackCountInfo
            };
            calcLog.合計区分 = totalBucket;
            calcLog.合計加算値 = { 威力: addedPower, 守り: addedDefense, 状態: addedState };
            calcLog.守り計算 = {
                displayGuard: guardResolved.displayGuardValue,
                physicalGuard: guardResolved.physicalGuardBase,
                magicGuardRaw: guardResolved.magicGuardRaw,
                magicGuardApplied: guardResolved.magicGuardApplied,
                attackMethodGuard: guardResolved.attackMethodGuardValue,
                hasGuardByType: guardResolved.hasGuardByType,
                hasOverrideBreakdown: guardResolved.hasOverrideBreakdown
            };
            DebaglogSet("[スキル計算詳細/合計反映]", calcLog);

            totalPower += addedPower;
            totalDefense += addedDefense;
            totalState += addedState;
            groupedTotals[totalBucket].power += addedPower;
            groupedTotals[totalBucket].defense += addedDefense;
            groupedTotals[totalBucket].state += addedState;

            const slotExtraMetrics = getSlotBattleExtraMetrics(slot, slotSkillSource || calcSkillData);
            const slotCrRate = slotExtraMetrics.critRate;
            const slotCrPower = slotExtraMetrics.critPower;
            const slotMinDamage = slotExtraMetrics.minDamage;
            totalCritRate += slotCrRate;
            totalCritPower += slotCrPower;
            totalMinDamage += slotMinDamage;
            if (slotCrRate !== 0 || slotCrPower !== 0 || slotMinDamage !== 0) {
                hasAnyExtra = true;
            }

            const displayNameHtml = displayRuby
                ? `<ruby class="skill-name-ruby">${displayName}<rt>${displayRuby}</rt></ruby>`
                : `<span class="skill-name-plain">${displayName}</span>`;
            mainRow.innerHTML = `<td>${slot}</td><td class="skill-name">
                <span class="skill-name-icons">${displayIcons}</span>
                <span class="skill-name-main">${displayNameHtml}</span>
                </td>`;
            mainRow.value = displayName;
            mainRow.addEventListener('click', () => {
                openConfirmModal(`「${displayName}」を解除しますか？`, (confirmed) => {
                    if (!confirmed) return;
                    removeSkill(slot);
                });
            });
        } else {
            mainRow.innerHTML = `<td>${slot}</td><td class="skill-name">未選択</td>`;
        }

        selectedSkillsTable.appendChild(mainRow);
    }

    const finalAttackCount = Math.max(
        1,
        Math.round(displayedAttackCount * Math.max(1, Math.round(toFiniteNumber(attackCountDisplayMultiplier) || 1)))
    );
    if (!hasASlotSkill && !useMagicFallbackTotals) {
        totalCritRate += 10;
        totalCritPower += 130;
        hasAnyExtra = true;
    }
    const allPowerSummary = attackCountSlotDetails.map((detail) => ({
        slot: detail.slot,
        全威力: detail.全威力,
        全威力倍率: detail.全威力倍率
    }));
    console.log("[攻撃回数計算]", {
        A通常攻撃: Boolean(attackCountContext?.isANormalAttack),
        攻撃回数ベース: Math.max(1, Math.round(toFiniteNumber(attackCountContext?.baseCount) || 1)),
        条件P加算: Math.round(toFiniteNumber(attackCountContext?.passiveBonus) || 0),
        表示用回数_倍率前: displayedAttackCount,
        表示倍率: Math.max(1, Math.round(toFiniteNumber(attackCountDisplayMultiplier) || 1)),
        最終表示回数: finalAttackCount,
        全威力: allPowerSummary,
        スロット内訳: attackCountSlotDetails
    });
    console.table(attackCountSlotDetails);

    updateSelectedSkillsTotalsView({
        power: totalPower,
        defense: totalDefense,
        state: totalState,
        groupA: groupedTotals.A,
        groupM: groupedTotals.M,
        critRate: totalCritRate,
        critPower: totalCritPower,
        minDamage: totalMinDamage,
        hasExtra: hasAnyExtra,
        attackCount: finalAttackCount
    });
    await refreshTopRightStatusContainer();
}

const SKILL_ICON_DIR = `/images/${encodeURIComponent("攻撃手段")}`;
const SKILL_ATTRIBUTE_WATERMARK_ENABLED = false;
const SKILL_ICON_AVAILABLE_NAMES = new Set([
    "信仰", "光", "力場", "吐息", "呪い", "回復", "地", "地2", "天使", "太陽",
    "宇宙", "対魔", "尾", "幻覚", "弓", "強化", "念動力", "悪魔", "投擲", "星",
    "時間", "月", "武器", "死者", "毒", "気功", "水", "氷", "炎", "爪", "牙",
    "物質", "眼", "砂時計", "空間", "空間2", "精神", "素手", "羽", "翼", "肉体",
    "自然", "角", "足", "選択", "酸", "重力2", "銃", "闇", "闇2", "防御", "防御2",
    "雷", "音", "風", "風2", "魔法", "魔法補助", "魔術"
]);

const ATTACK_METHOD_ICON_BY_NAME = {
    素手: "素手",
    肉体: "肉体",
    吐息: "吐息",
    眼: "眼",
    角: "角",
    牙: "牙",
    爪: "爪",
    翼: "翼",
    尾: "尾",
    足: "足",
    武器: "武器",
    投擲: "投擲",
    気功: "気功",
    魔法: "魔法",
    念動力: "念動力",
    射撃: "弓",
    弓: "弓",
    銃: "銃"
};

const SKILL_ICON_RULES = [
    { keywords: ["攻撃手段:吐息"], iconName: "吐息" },
    { keywords: ["攻撃手段:眼"], iconName: "眼" },
    { keywords: ["攻撃手段:素手"], iconName: "素手" },
    { keywords: ["攻撃手段:肉体"], iconName: "肉体" },
    { keywords: ["攻撃手段:角"], iconName: "角" },
    { keywords: ["攻撃手段:牙"], iconName: "牙" },
    { keywords: ["攻撃手段:爪"], iconName: "爪" },
    { keywords: ["攻撃手段:翼"], iconName: "翼" },
    { keywords: ["攻撃手段:尾"], iconName: "尾" },
    { keywords: ["攻撃手段:足"], iconName: "足" },
    { keywords: ["攻撃手段:気功"], iconName: "気功" },
    { keywords: ["攻撃手段:念動力"], iconName: "念動力" },
    { keywords: ["攻撃手段:魔法"], iconName: "魔法" },
    { keywords: ["攻撃手段:武器"], iconName: "武器" },
    { keywords: ["攻撃手段:投擲"], iconName: "投擲" },
    { keywords: ["防御を行う", "耐性+", "防御+", "魔防+", "軽減+", "物理ガード", "魔法ガード"], iconName: "防御" },
    { keywords: ["射撃", "弓"], iconName: "弓" },
    { keywords: ["銃"], iconName: "銃" },
    { keywords: ["投擲"], iconName: "投擲" },
    { keywords: ["正+", "負+", "再生", "全力+", "条件", "速度+", "回避"], iconName: "強化" }
];

const ATTRIBUTE_ICON_BY_NAME = {
    通常攻撃: "武器",
    炎: "炎",
    火: "炎",
    氷: "氷",
    冷気: "氷",
    雷: "雷",
    酸: "酸",
    音波: "音",
    音: "音",
    闇: "闇",
    光: "光",
    善: "天使",
    悪: "悪魔",
    正: "光",
    負: "闇",
    毒: "毒"
};

function extractAttackMethodTokens(detailText) {
    const text = String(detailText || "");
    if (!text) return [];
    const tokens = [];
    const regex = /攻撃手段\s*[:：]\s*([^\s,，/／|｜&＆+]+)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
        const token = String(match[1] || "").trim();
        if (token) tokens.push(token);
    }
    return tokens;
}

function extractAttributeTokens(value) {
    const text = String(value || "").trim();
    if (!text) return [];
    return text
        .split(/[,\u3001，/／|｜&＆+\s]+/g)
        .map((token) => String(token || "").trim())
        .filter(Boolean);
}

function extractAttackMethodTokensFromValue(value) {
    const text = String(value || "").trim();
    if (!text) return [];
    return text
        .replace(/攻撃手段\s*[:：]/g, "")
        .split(/[,\u3001，/／|｜&＆+\s]+/g)
        .map((token) => String(token || "").trim())
        .filter(Boolean);
}

function resolveIconByMethodTokens(tokens = []) {
    let hasWeaponMethod = false;
    for (const token of tokens) {
        const mapped = ATTACK_METHOD_ICON_BY_NAME[token];
        if (!mapped) continue;
        if (mapped === "武器") {
            hasWeaponMethod = true;
            continue;
        }
        return { iconName: mapped, hasWeaponMethod };
    }
    return { iconName: "", hasWeaponMethod };
}

function resolveSkillIconName(skillInput) {
    const skillData = (skillInput && typeof skillInput === "object")
        ? skillInput
        : { 詳細: String(skillInput || "") };
    const detailText = String(skillData?.詳細 || skillData?.description || "");
    const methodFieldText = String(skillData?.攻撃手段 || skillData?.attackMethod || "");
    const attributeText = String(skillData?.属性 || "");
    const skillType = String(skillData?.種別 || skillData?.type || "").trim().toUpperCase();

    // 1) データの「攻撃手段」フィールドを最優先
    const methodTokensFromField = extractAttackMethodTokensFromValue(methodFieldText);
    const methodTokensFromDetail = extractAttackMethodTokens(detailText);
    const hasAttackMethodCondition = methodTokensFromField.length > 0 || methodTokensFromDetail.length > 0;
    const hasMagicAttackMethod = [...methodTokensFromField, ...methodTokensFromDetail]
        .some((token) => ATTACK_METHOD_ICON_BY_NAME[token] === "魔法" || token === "魔法");

    // 攻撃手段条件がない場合は属性アイコンを優先
    if (!hasAttackMethodCondition) {
        const attributeIconName = resolveAttributeIconName(attributeText);
        if (attributeIconName) return attributeIconName;
    }

    // Mは「攻撃手段=魔法」時に属性アイコンを優先
    if (skillType === "M" && hasMagicAttackMethod) {
        const attributeIconName = resolveAttributeIconName(attributeText);
        if (attributeIconName) return attributeIconName;
    }

    const fieldResolved = resolveIconByMethodTokens(methodTokensFromField);
    if (fieldResolved.iconName) return fieldResolved.iconName;

    // 2) 詳細文のキーワード判定（武器下位分類を優先）
    const combinedText = [methodFieldText, detailText].filter(Boolean).join(" ");
    const matchedSpecificRule = SKILL_ICON_RULES.find((rule) =>
        rule.iconName !== "武器"
        && rule.keywords.some((keyword) => combinedText.includes(keyword))
    );
    if (matchedSpecificRule?.iconName) return matchedSpecificRule.iconName;

    // 3) 詳細文の「攻撃手段:xxx」から判定（武器は後回し）
    const detailResolved = resolveIconByMethodTokens(methodTokensFromDetail);
    if (detailResolved.iconName) return detailResolved.iconName;

    // 4) 最後に武器へフォールバック
    if (fieldResolved.hasWeaponMethod || detailResolved.hasWeaponMethod) return "武器";

    // 5) どれにも当たらない場合は属性アイコン
    return resolveAttributeIconName(attributeText);
}

function resolveAttributeIconName(attributeValue) {
    const tokens = extractAttributeTokens(attributeValue);
    for (const token of tokens) {
        const mapped = ATTRIBUTE_ICON_BY_NAME[token];
        if (mapped) return mapped;
        const cleanedToken = String(token)
            .replace(/[0-9０-９.%％+\-－ー()（）\[\]【】]/g, "")
            .trim();
        if (!cleanedToken) continue;
        const cleanedMapped = ATTRIBUTE_ICON_BY_NAME[cleanedToken];
        if (cleanedMapped) return cleanedMapped;
        if (SKILL_ICON_AVAILABLE_NAMES.has(cleanedToken)) {
            return cleanedToken;
        }
    }

    const rawText = String(attributeValue || "").trim();
    if (!rawText) return "";
    const cleanedText = rawText.replace(/[0-9０-９.%％+\-－ー()（）\[\]【】]/g, "");
    for (const [alias, iconName] of Object.entries(ATTRIBUTE_ICON_BY_NAME)) {
        if (cleanedText.includes(alias)) {
            return iconName;
        }
    }
    return "";
}

function buildAttributeWatermarkHtml(attributeValue) {
    if (!SKILL_ATTRIBUTE_WATERMARK_ENABLED) return "";
    const iconName = resolveAttributeIconName(attributeValue);
    if (!iconName) return "";
    const src = `${SKILL_ICON_DIR}/${encodeURIComponent(iconName)}.webp`;
    return `<span class="skill-attribute-watermark" aria-hidden="true"><img src="${src}" alt="" loading="lazy" onerror="this.style.display='none'"></span>`;
}

function getMissingSkillIconAssetNames() {
    const required = new Set([
        ...Object.values(ATTACK_METHOD_ICON_BY_NAME),
        ...SKILL_ICON_RULES.map((rule) => rule.iconName)
    ]);
    return [...required].filter((name) => !SKILL_ICON_AVAILABLE_NAMES.has(name));
}

window.getMissingSkillIconAssetNames = getMissingSkillIconAssetNames;

function getSkillIcons(skillInput) {
    const iconName = resolveSkillIconName(skillInput);
    if (!iconName) return "";
    const src = `${SKILL_ICON_DIR}/${encodeURIComponent(iconName)}.webp`;
    return `<img class="skill-row-icon-image" src="${src}" alt="${iconName}" loading="lazy" onerror="this.style.display='none'">`;
}

// スキルを個別に削除
function removeSkill(slot) {
    selectedSkills[slot] = null;
    syncSelectedSkillsToCurrentCharacter();
    updateSelectedSkills();
    rerenderSkillTables();
}

// すべてのスキルをリセット
function clearAllSkills() {
    DebaglogSet("すべてのスキルをリセット")
    openConfirmModal("全てのスキルをリセットしますか？👀", (result) => {
        if (result) {
            DebaglogSet("すべてのスキルをリセット操作が確認されました。"); // true の場合
            SELECTED_SKILL_SLOT_ORDER.forEach((slot) => {
                selectedSkills[slot] = null;
            });
            syncSelectedSkillsToCurrentCharacter();
            updateSelectedSkills();
            rerenderSkillTables();
        } else {
            DebaglogSet("すべてのスキルをリセット操作がキャンセルされました。"); // false の場合
        }
    });
}
// ダイスロールの処理を関数化
function rollDiceResults(count, max) {
    const results = [];
    for (let i = 0; i < count; i++) {
        results.push(Math.floor(Math.random() * max) + 1);
    }
    return results;
}

const DICE_LOG_MAX_ENTRIES = 30;
const DICE_LOG_SCOPE_CHARACTER = "character";
const DICE_LOG_SCOPE_GLOBAL = "global";
let currentDiceLogScope = DICE_LOG_SCOPE_CHARACTER;
let battleRollCountGlobal = 0;
const battleRollCountByCharacter = {};
const diceLogGlobal = [];
const diceLogByCharacter = {};

async function advanceTurn() {
    const name = normalizeBattleText(selectName || playerData?.name || "");
    if (!name) return;

    if (typeof window.openTurnAdvanceModalVue === "function") {
        const result = await window.openTurnAdvanceModalVue({
            characterName: name,
            currentTurn: getBattleTurnForCharacter(name),
            defaultElapsedTurns: 1
        });
        if (!result || typeof result !== "object") return;
        if (result.action === "reset") {
            await resetBattleTurn(name, result.turn);
            return;
        }
        await advanceBattleTurnByCount(name, result.elapsedTurns);
        return;
    }

    await advanceBattleTurnByCount(name, 1);
}

async function advanceBattleTurnByCount(characterName = (selectName || playerData?.name || ""), elapsedTurns = 1) {
    const name = normalizeBattleText(characterName);
    if (!name) return;
    const steps = Math.max(1, Math.round(toFiniteNumber(elapsedTurns) || 1));

    for (let index = 0; index < steps; index += 1) {
        applySingleBattleTurnAdvance(name);
    }

    updateBattleTurnDisplay(name);
    await refreshTopRightStatusContainer();
    await updateSelectedSkills();
    await rerenderSkillTables();
}

function applySingleBattleTurnAdvance(characterName = (selectName || playerData?.name || "")) {
    const name = normalizeBattleText(characterName);
    if (!name) return;

    const nextTurn = getBattleTurnForCharacter(name) + 1;
    setBattleTurnForCharacter(name, nextTurn);
    const retained = getRetainedBuffSkillsForCharacter(name)
        .map((entry) => normalizeRetainedBuffEntry(entry))
        .filter((entry) => entry && entry.skillData);
    const stillActive = retained
        .map((entry) => {
            const remaining = normalizeRetainedBuffTurns(entry?.remainingTurns, 1);
            const total = normalizeRetainedBuffTurns(entry?.totalTurns, 1);
            if (isInfiniteRetainedBuffTurns(remaining) || isInfiniteRetainedBuffTurns(total)) {
                return {
                    skillData: { ...(entry?.skillData || {}) },
                    hasEffectDuration: true,
                    totalTurns: RETAINED_BUFF_INFINITE_TURNS,
                    remainingTurns: RETAINED_BUFF_INFINITE_TURNS
                };
            }
            const nextRemaining = Math.max(0, remaining - 1);
            if (nextRemaining <= 0) return null;
            return {
                skillData: { ...(entry?.skillData || {}) },
                hasEffectDuration: Boolean(entry?.hasEffectDuration),
                totalTurns: total,
                remainingTurns: nextRemaining
            };
        })
        .filter((entry) => entry && entry.skillData);
    setRetainedBuffSkillsForCharacter(name, stillActive);
    advanceSkillCooldownsForCharacter(name);
}

async function resetBattleTurn(characterName = (selectName || playerData?.name || ""), turn = 1) {
    const name = normalizeBattleText(characterName);
    if (!name) return;
    setBattleTurnForCharacter(name, turn);
    clearRetainedBuffSkillsForCharacter(name);
    setSkillCooldownEntriesForCharacter(name, []);
    updateBattleTurnDisplay(name);
    await refreshTopRightStatusContainer();
    await updateSelectedSkills();
    await rerenderSkillTables();
}
window.advanceTurn = advanceTurn;

function getCurrentDiceLogCharacterName() {
    const fromPlayerData = String(playerData?.name || "").trim();
    if (fromPlayerData) return fromPlayerData;
    const fromSelectName = String(selectName || "").trim();
    if (fromSelectName) return fromSelectName;
    return "不明";
}

function getDiceLogEntriesByScope(scope = DICE_LOG_SCOPE_CHARACTER, characterName = getCurrentDiceLogCharacterName()) {
    if (scope === DICE_LOG_SCOPE_GLOBAL) return diceLogGlobal;
    const key = String(characterName || "").trim() || "不明";
    if (!Array.isArray(diceLogByCharacter[key])) {
        diceLogByCharacter[key] = [];
    }
    return diceLogByCharacter[key];
}

function buildDiceLogEntryElement(entry, scope = DICE_LOG_SCOPE_CHARACTER) {
    const li = document.createElement("li");
    li.className = "dice-log-item";

    const metaRow = document.createElement("div");
    metaRow.className = "dice-log-meta";

    const turnSpan = document.createElement("span");
    turnSpan.className = "dice-log-turn";
    const turnText = scope === DICE_LOG_SCOPE_GLOBAL
        ? `●${entry.globalTurn}回目`
        : `●${entry.characterTurn}回目`;
    turnSpan.textContent = turnText;
    metaRow.appendChild(turnSpan);

    if (scope === DICE_LOG_SCOPE_GLOBAL) {
        const charSpan = document.createElement("span");
        charSpan.className = "dice-log-character";
        charSpan.textContent = entry.characterName || "不明";
        metaRow.appendChild(charSpan);
    }

    const timeSpan = document.createElement("span");
    timeSpan.className = "dice-log-time";
    timeSpan.textContent = `${entry.time || ""}`;
    metaRow.appendChild(timeSpan);

    const setupSpan = document.createElement("span");
    setupSpan.className = "dice-log-setup";
    setupSpan.textContent = `ダイス:${entry.diceCount}/${entry.diceMax}`;
    metaRow.appendChild(setupSpan);

    if (entry.sendState === "sent" || entry.sendState === "failed") {
        const sendSpan = document.createElement("span");
        sendSpan.className = "dice-log-send";
        if (entry.sendState === "sent") {
            sendSpan.classList.add("is-sent");
            sendSpan.textContent = "送信";
            if (entry.sendTooltip) sendSpan.title = entry.sendTooltip;
        } else {
            sendSpan.classList.add("is-failed");
            sendSpan.textContent = "送信失敗";
        }
        metaRow.appendChild(sendSpan);
    }

    const resultRow = document.createElement("div");
    resultRow.className = "dice-log-results";
    resultRow.textContent = Array.isArray(entry.rollResults) ? entry.rollResults.join(", ") : "";

    li.appendChild(metaRow);
    li.appendChild(resultRow);
    return li;
}

function renderDiceLogList(scope = DICE_LOG_SCOPE_CHARACTER, characterName = getCurrentDiceLogCharacterName()) {
    const listEl = scope === DICE_LOG_SCOPE_GLOBAL
        ? document.getElementById("dice-log-global")
        : document.getElementById("dice-log");
    if (!listEl) return;
    const entries = getDiceLogEntriesByScope(scope, characterName);
    listEl.innerHTML = "";
    entries.forEach((entry) => {
        listEl.appendChild(buildDiceLogEntryElement(entry, scope));
    });
}

function switchDiceLogScope(scope = DICE_LOG_SCOPE_CHARACTER) {
    const nextScope = scope === DICE_LOG_SCOPE_GLOBAL ? DICE_LOG_SCOPE_GLOBAL : DICE_LOG_SCOPE_CHARACTER;
    currentDiceLogScope = nextScope;

    const characterList = document.getElementById("dice-log");
    const globalList = document.getElementById("dice-log-global");
    const charBtn = document.getElementById("dice-log-tab-character");
    const globalBtn = document.getElementById("dice-log-tab-global");

    if (characterList) {
        characterList.style.display = nextScope === DICE_LOG_SCOPE_CHARACTER ? "block" : "none";
    }
    if (globalList) {
        globalList.style.display = nextScope === DICE_LOG_SCOPE_GLOBAL ? "block" : "none";
    }
    if (charBtn) charBtn.classList.toggle("active", nextScope === DICE_LOG_SCOPE_CHARACTER);
    if (globalBtn) globalBtn.classList.toggle("active", nextScope === DICE_LOG_SCOPE_GLOBAL);
}

function renderDiceLogsForCurrentCharacter() {
    const characterName = getCurrentDiceLogCharacterName();
    renderDiceLogList(DICE_LOG_SCOPE_CHARACTER, characterName);
    renderDiceLogList(DICE_LOG_SCOPE_GLOBAL, characterName);
}

function ensureDiceLogView() {
    const resultsRoot = document.getElementById("dice-results");
    const characterList = document.getElementById("dice-log");
    if (!resultsRoot || !characterList) return;
    const h3 = resultsRoot.querySelector("h3");

    if (!document.getElementById("dice-log-global")) {
        const globalList = document.createElement("ul");
        globalList.id = "dice-log-global";
        globalList.className = "dice-log-list";
        resultsRoot.appendChild(globalList);
    }

    if (!document.getElementById("dice-log-tabs")) {
        const tabs = document.createElement("div");
        tabs.id = "dice-log-tabs";
        tabs.className = "dice-log-tabs";
        tabs.innerHTML = `
            <button id="dice-log-tab-character" type="button" class="dice-log-tab-btn active">キャラ別</button>
            <button id="dice-log-tab-global" type="button" class="dice-log-tab-btn">全体</button>
        `;
        if (h3 && h3.parentElement === resultsRoot) {
            h3.insertAdjacentElement("afterend", tabs);
        } else {
            resultsRoot.prepend(tabs);
        }

        const charBtn = tabs.querySelector("#dice-log-tab-character");
        const globalBtn = tabs.querySelector("#dice-log-tab-global");
        if (charBtn) {
            charBtn.addEventListener("click", () => switchDiceLogScope(DICE_LOG_SCOPE_CHARACTER));
        }
        if (globalBtn) {
            globalBtn.addEventListener("click", () => switchDiceLogScope(DICE_LOG_SCOPE_GLOBAL));
        }
    }

    const tabs = document.getElementById("dice-log-tabs");
    let headerRow = document.getElementById("dice-log-header-row");
    if (!headerRow) {
        headerRow = document.createElement("div");
        headerRow.id = "dice-log-header-row";
        if (resultsRoot.firstChild) {
            resultsRoot.insertBefore(headerRow, resultsRoot.firstChild);
        } else {
            resultsRoot.appendChild(headerRow);
        }
    }
    if (h3 && h3.parentElement !== headerRow) {
        headerRow.appendChild(h3);
    }
    if (tabs && tabs.parentElement !== headerRow) {
        headerRow.appendChild(tabs);
    }

    characterList.classList.add("dice-log-list");
    renderDiceLogsForCurrentCharacter();
    switchDiceLogScope(currentDiceLogScope);
}

const BATTLE_MEMO_SHARED_TARGET = "__shared__";
const BATTLE_MEMO_DEFAULT_TAB_TITLE = "メモ";
const BATTLE_MEMO_PROFILE_TAB_ID = "__profile__";
const BATTLE_MEMO_PROFILE_TAB_TITLE = "プロフィール";
const BATTLE_MEMO_DRAFT_KEY_PREFIX = "battleMemoDraft:";
const BATTLE_MEMO_LAST_SAVED_KEY_PREFIX = "battleMemoLastSavedAt:";
let battleMemoLoadedPlayerId = "";
let battleMemoData = null;
let battleMemoCurrentTarget = BATTLE_MEMO_SHARED_TARGET;
let battleMemoCurrentTabId = "";
let battleMemoLastSavedAt = "";
let battleMemoLocalDraftUsed = false;
const BATTLE_MEMO_PROFILE_FIELDS = [
    { key: "alias", label: "二つ名", multiline: false },
    { key: "gender", label: "性別", multiline: false },
    { key: "race", label: "種族", multiline: false },
    { key: "job", label: "職業", multiline: false },
    { key: "height", label: "身長", multiline: false },
    { key: "weight", label: "体重", multiline: false },
    { key: "age", label: "年齢", multiline: false },
    { key: "birthday", label: "誕生日", multiline: false, type: "month-day" },
    { key: "origin", label: "生まれ", multiline: true },
    { key: "appearance", label: "外見・服装", multiline: true },
    { key: "personality", label: "性格", multiline: true },
    { key: "speech", label: "一人称・二人称・口調", multiline: true },
    { key: "combat", label: "戦闘方法", multiline: true },
    { key: "life", label: "普段の生活", multiline: true },
    { key: "secret", label: "秘密", multiline: true },
    { key: "hobby", label: "趣味", multiline: true },
    { key: "likes", label: "好きなもの", multiline: true },
    { key: "dislikes", label: "嫌いなもの", multiline: true },
    { key: "goal", label: "目的", multiline: true }
];
const BATTLE_MEMO_PROFILE_LABEL_ALIASES = {
    alias: ["二つ名", "肩書", "通り名"],
    speech: ["一人称", "口調", "一人称二人称口調", "一人称・二人称・口調"],
    appearance: ["外見", "服装", "外見服装"],
    origin: ["生まれ", "来歴", "経歴"]
};
const BATTLE_MEMO_PROFILE_LABEL_KEY_MAP = (() => {
    const map = new Map();
    BATTLE_MEMO_PROFILE_FIELDS.forEach((field) => {
        map.set(normalizeProfileFieldLabel(field.label), field.key);
    });
    Object.entries(BATTLE_MEMO_PROFILE_LABEL_ALIASES).forEach(([key, labels]) => {
        (Array.isArray(labels) ? labels : []).forEach((label) => {
            map.set(normalizeProfileFieldLabel(label), key);
        });
    });
    return map;
})();

function getCurrentPlayerIdForMemo() {
    const raw = window.sessionStorage.getItem("playerId")
        || window.sessionStorage.getItem("username")
        || window.localStorage.getItem("playerId")
        || window.localStorage.getItem("username")
        || "";
    const normalized = normalizeBattleText(raw);
    return normalized || "guest";
}

function normalizeMemoText(value) {
    return String(value ?? "").trim();
}

function normalizeProfileFieldLabel(value) {
    return String(value ?? "")
        .replace(/[：:]/g, "")
        .replace(/[ 　\t]/g, "")
        .trim();
}

function createEmptyProfileFieldValues() {
    return BATTLE_MEMO_PROFILE_FIELDS.reduce((acc, field) => {
        acc[field.key] = "";
        return acc;
    }, {});
}

function parseBattleMemoProfileText(text = "") {
    const values = createEmptyProfileFieldValues();
    const lines = String(text ?? "").replace(/\r/g, "").split("\n");
    let currentFieldKey = "";
    let usedFallbackAlias = false;

    lines.forEach((rawLine) => {
        const line = String(rawLine ?? "");
        const trimmed = line.trim();
        const match = trimmed.match(/^([^:：]+)\s*[：:]\s*(.*)$/);
        if (match) {
            const labelKey = BATTLE_MEMO_PROFILE_LABEL_KEY_MAP.get(normalizeProfileFieldLabel(match[1])) || "";
            if (labelKey) {
                values[labelKey] = String(match[2] || "");
                currentFieldKey = labelKey;
                return;
            }
            currentFieldKey = "";
            return;
        }

        if (!trimmed) {
            if (currentFieldKey && values[currentFieldKey]) {
                values[currentFieldKey] = `${values[currentFieldKey]}\n`;
            }
            return;
        }

        if (!usedFallbackAlias && !values.alias) {
            values.alias = trimmed;
            currentFieldKey = "alias";
            usedFallbackAlias = true;
            return;
        }

        if (currentFieldKey) {
            values[currentFieldKey] = values[currentFieldKey]
                ? `${values[currentFieldKey]}\n${line}`
                : line;
            return;
        }

        values.origin = values.origin ? `${values.origin}\n${line}` : line;
        currentFieldKey = "origin";
    });

    return values;
}

function buildBattleMemoProfileText(values = {}) {
    const lines = [];
    BATTLE_MEMO_PROFILE_FIELDS.forEach((field) => {
        const value = String(values?.[field.key] ?? "").trim();
        if (!value) return;
        lines.push(`${field.label}:${value}`);
    });
    return lines.join("\n");
}

function parseProfileBirthday(value = "") {
    const text = normalizeMemoText(value);
    if (!text) return { month: "", day: "" };

    const jpMatch = text.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
    const slashMatch = text.match(/(\d{1,2})\s*[/\-]\s*(\d{1,2})/);
    const match = jpMatch || slashMatch;
    if (!match) return { month: "", day: "" };

    const month = Number(match[1]);
    const day = Number(match[2]);
    if (!Number.isFinite(month) || !Number.isFinite(day)) {
        return { month: "", day: "" };
    }

    return {
        month: String(Math.min(12, Math.max(1, month))),
        day: String(Math.min(31, Math.max(1, day)))
    };
}

function formatProfileBirthday(month = "", day = "") {
    const monthNumber = Number(month);
    const dayNumber = Number(day);
    if (!Number.isInteger(monthNumber) || !Number.isInteger(dayNumber)) return "";
    if (monthNumber < 1 || monthNumber > 12 || dayNumber < 1 || dayNumber > 31) return "";
    return `${monthNumber}月${dayNumber}日`;
}

function getMaxDayOfMonth(month = 0) {
    const monthNumber = Number(month);
    if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) return 31;
    return new Date(2000, monthNumber, 0).getDate();
}

function autoResizeBattleMemoProfileTextarea(textarea) {
    if (!(textarea instanceof HTMLTextAreaElement)) return;
    const computed = window.getComputedStyle(textarea);
    const lineHeight = Number.parseFloat(computed.lineHeight) || 21;
    const paddingTop = Number.parseFloat(computed.paddingTop) || 0;
    const paddingBottom = Number.parseFloat(computed.paddingBottom) || 0;
    const borderTop = Number.parseFloat(computed.borderTopWidth) || 0;
    const borderBottom = Number.parseFloat(computed.borderBottomWidth) || 0;
    const maxHeight = Math.ceil((lineHeight * 4) + paddingTop + paddingBottom + borderTop + borderBottom);

    textarea.style.height = "auto";
    const requiredHeight = Math.ceil(textarea.scrollHeight);
    if (requiredHeight <= maxHeight) {
        textarea.style.height = `${requiredHeight}px`;
        textarea.style.overflowY = "hidden";
        return;
    }

    textarea.style.height = `${maxHeight}px`;
    textarea.style.overflowY = "auto";
}

function createBattleMemoTabId() {
    return `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function isBattleMemoProfileTab(tab, index = -1) {
    const id = normalizeMemoText(tab?.id);
    if (id === BATTLE_MEMO_PROFILE_TAB_ID) return true;
    if (index === 0 && normalizeMemoText(tab?.title) === BATTLE_MEMO_PROFILE_TAB_TITLE) return true;
    return false;
}

function normalizeBattleMemoTab(tab, index = 0) {
    const id = normalizeMemoText(tab?.id) || createBattleMemoTabId();
    const isProfile = id === BATTLE_MEMO_PROFILE_TAB_ID;
    const title = isProfile
        ? BATTLE_MEMO_PROFILE_TAB_TITLE
        : (normalizeMemoText(tab?.title) || `${BATTLE_MEMO_DEFAULT_TAB_TITLE}${index > 0 ? index + 1 : ""}`);
    const text = String(tab?.text ?? "");
    return {
        id,
        title: title.slice(0, 40),
        text: text.slice(0, 200000)
    };
}

function normalizeBattleMemoEntry(entry, fallbackTitle = BATTLE_MEMO_DEFAULT_TAB_TITLE, options = {}) {
    const includeProfileTab = Boolean(options?.includeProfileTab);
    const tabsRaw = Array.isArray(entry?.tabs) ? entry.tabs : [];
    let tabs = tabsRaw
        .map((tab, index) => normalizeBattleMemoTab(tab, index))
        .filter((tab) => tab && tab.id);

    if (includeProfileTab) {
        let profileText = "";
        const filtered = [];
        tabs.forEach((tab, index) => {
            if (isBattleMemoProfileTab(tab, index)) {
                if (!profileText) {
                    profileText = String(tab?.text ?? "").slice(0, 200000);
                }
                return;
            }
            filtered.push(tab);
        });
        tabs = [
            normalizeBattleMemoTab({
                id: BATTLE_MEMO_PROFILE_TAB_ID,
                title: BATTLE_MEMO_PROFILE_TAB_TITLE,
                text: profileText
            }, 0),
            ...filtered
        ];
    }

    if (!tabs.length) {
        const initialTab = includeProfileTab
            ? {
                id: BATTLE_MEMO_PROFILE_TAB_ID,
                title: BATTLE_MEMO_PROFILE_TAB_TITLE,
                text: ""
            }
            : { title: fallbackTitle, text: "" };
        tabs.push(normalizeBattleMemoTab(initialTab, 0));
    }

    const activeTabIdRaw = normalizeMemoText(entry?.activeTabId);
    const activeTabId = tabs.some((tab) => tab.id === activeTabIdRaw)
        ? activeTabIdRaw
        : (includeProfileTab ? BATTLE_MEMO_PROFILE_TAB_ID : tabs[0].id);

    return {
        tabs,
        activeTabId
    };
}

function normalizeBattleMemoData(raw) {
    const data = raw && typeof raw === "object" ? raw : {};
    const shared = normalizeBattleMemoEntry(data?.shared, "共有メモ");
    const charactersRaw = data?.characters && typeof data.characters === "object" ? data.characters : {};
    const characters = {};
    Object.entries(charactersRaw).forEach(([name, entry]) => {
        const key = normalizeMemoText(name);
        if (!key) return;
        characters[key] = normalizeBattleMemoEntry(
            entry,
            BATTLE_MEMO_DEFAULT_TAB_TITLE,
            { includeProfileTab: true }
        );
    });
    return {
        format: "multi-v1",
        shared,
        characters
    };
}

function getBattleMemoDraftStorageKey() {
    return `${BATTLE_MEMO_DRAFT_KEY_PREFIX}${getCurrentPlayerIdForMemo()}`;
}

function getBattleMemoLastSavedStorageKey() {
    return `${BATTLE_MEMO_LAST_SAVED_KEY_PREFIX}${getCurrentPlayerIdForMemo()}`;
}

function readBattleMemoLocalDraft() {
    try {
        const raw = window.localStorage.getItem(getBattleMemoDraftStorageKey());
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return null;
        const dataSource = parsed?.data && typeof parsed.data === "object" ? parsed.data : parsed;
        return normalizeBattleMemoData(dataSource);
    } catch (error) {
        DebaglogSet("memo local draft load failed:", error);
        return null;
    }
}

function writeBattleMemoLocalDraft() {
    if (!battleMemoData || typeof battleMemoData !== "object") return;
    try {
        const payload = {
            updatedAt: new Date().toISOString(),
            data: normalizeBattleMemoData(battleMemoData)
        };
        window.localStorage.setItem(getBattleMemoDraftStorageKey(), JSON.stringify(payload));
    } catch (error) {
        DebaglogSet("memo local draft save failed:", error);
    }
}

function clearBattleMemoLocalDraft() {
    try {
        window.localStorage.removeItem(getBattleMemoDraftStorageKey());
    } catch (error) {
        DebaglogSet("memo local draft clear failed:", error);
    }
}

function readBattleMemoLastSavedAtLocal() {
    try {
        return normalizeMemoText(window.localStorage.getItem(getBattleMemoLastSavedStorageKey()) || "");
    } catch (error) {
        DebaglogSet("memo saved-at load failed:", error);
        return "";
    }
}

function writeBattleMemoLastSavedAtLocal(value = "") {
    const normalized = normalizeMemoText(value);
    try {
        if (!normalized) {
            window.localStorage.removeItem(getBattleMemoLastSavedStorageKey());
            return;
        }
        window.localStorage.setItem(getBattleMemoLastSavedStorageKey(), normalized);
    } catch (error) {
        DebaglogSet("memo saved-at save failed:", error);
    }
}

function formatBattleMemoSavedAt(value = "") {
    const normalized = normalizeMemoText(value);
    if (!normalized) return "--";
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return normalized;
    return new Intl.DateTimeFormat("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    }).format(date);
}

async function loadBattleMemoAllFromApi() {
    const playerId = getCurrentPlayerIdForMemo();
    const characterNames = getRegisteredCharacterNamesForMemo();
    const currentCharacterName = normalizeMemoText(selectName || playerData?.name || "");
    if (currentCharacterName && !characterNames.includes(currentCharacterName)) {
        characterNames.unshift(currentCharacterName);
    }
    const response = await fetch('/api/memo/all/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, characterNames })
    });
    if (!response.ok) {
        throw new Error(`memo all load failed: ${response.status}`);
    }
    const result = await response.json();
    if (!result?.success) {
        throw new Error(result?.message || "memo all load failed");
    }
    return normalizeBattleMemoData(result?.data || {});
}

async function saveBattleMemoAllToApi() {
    const playerId = getCurrentPlayerIdForMemo();
    const response = await fetch('/api/memo/all/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            playerId,
            data: normalizeBattleMemoData(battleMemoData)
        })
    });
    if (!response.ok) {
        throw new Error(`memo all save failed: ${response.status}`);
    }
    const result = await response.json();
    if (!result?.success) {
        throw new Error(result?.message || "memo all save failed");
    }
    return {
        updatedAt: normalizeMemoText(result?.updatedAt || "") || new Date().toISOString()
    };
}

async function ensureBattleMemoDataLoaded(forceReload = false) {
    const playerId = getCurrentPlayerIdForMemo();
    if (!forceReload && battleMemoData && battleMemoLoadedPlayerId === playerId) {
        return battleMemoData;
    }
    const loadedFromApi = await loadBattleMemoAllFromApi();
    const localDraft = readBattleMemoLocalDraft();
    if (localDraft) {
        battleMemoData = normalizeBattleMemoData(localDraft);
        battleMemoLocalDraftUsed = true;
    } else {
        battleMemoData = normalizeBattleMemoData(loadedFromApi);
        battleMemoLocalDraftUsed = false;
    }
    battleMemoLastSavedAt = readBattleMemoLastSavedAtLocal();
    battleMemoLoadedPlayerId = playerId;
    return battleMemoData;
}

function getBattleMemoTargetLabel(targetKey) {
    if (targetKey === BATTLE_MEMO_SHARED_TARGET) return "共有メモ";
    return String(targetKey || "").trim() || "不明";
}

function getRegisteredCharacterNamesForMemo() {
    const parseList = (raw) => {
        if (!raw) return [];
        try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            return parsed
                .map((entry) => normalizeMemoText(entry))
                .filter((name, index, arr) => name && arr.indexOf(name) === index);
        } catch (error) {
            return [];
        }
    };

    const parseCharacterSelection = (raw) => {
        if (!raw) return [];
        try {
            const parsed = JSON.parse(raw);
            const source = Array.isArray(parsed) ? parsed : [parsed];
            return source
                .map((entry) => {
                    if (!entry) return "";
                    if (typeof entry === "string") return normalizeMemoText(entry);
                    if (typeof entry === "object") {
                        return normalizeMemoText(entry.name || entry.名前 || "");
                    }
                    return "";
                })
                .filter((name, index, arr) => name && arr.indexOf(name) === index);
        } catch (error) {
            return [];
        }
    };

    const merged = [];
    const pushUnique = (items) => {
        items.forEach((name) => {
            const normalized = normalizeMemoText(name);
            if (!normalized) return;
            if (!merged.includes(normalized)) merged.push(normalized);
        });
    };

    pushUnique(parseList(window.sessionStorage.getItem("playerCharacterList")));
    pushUnique(parseList(window.localStorage.getItem("playerCharacterList")));
    pushUnique(parseCharacterSelection(window.sessionStorage.getItem("selectedCharacters")));
    pushUnique(parseCharacterSelection(window.localStorage.getItem("selectedCharacters")));
    pushUnique(parseCharacterSelection(window.sessionStorage.getItem("selectedCharacter")));
    pushUnique(parseCharacterSelection(window.localStorage.getItem("selectedCharacter")));

    return merged;
}

function getBattleMemoCharacterNames() {
    const registeredList = getRegisteredCharacterNamesForMemo();
    const list = [];
    const pushUnique = (name) => {
        const normalized = normalizeMemoText(name);
        if (!normalized) return;
        if (!list.includes(normalized)) list.push(normalized);
    };

    if (Array.isArray(characterList)) {
        characterList.forEach((entry) => {
            pushUnique(entry?.name || entry?.名前 || "");
        });
    }

    registeredList.forEach(pushUnique);

    const memoCharacters = battleMemoData?.characters && typeof battleMemoData.characters === "object"
        ? Object.keys(battleMemoData.characters)
        : [];
    memoCharacters.forEach(pushUnique);

    return list;
}

function ensureBattleMemoTargetEntry(targetKey = battleMemoCurrentTarget) {
    if (!battleMemoData || typeof battleMemoData !== "object") {
        battleMemoData = normalizeBattleMemoData({});
    }
    if (targetKey === BATTLE_MEMO_SHARED_TARGET) {
        battleMemoData.shared = normalizeBattleMemoEntry(battleMemoData.shared, "共有メモ");
        return battleMemoData.shared;
    }
    const key = normalizeMemoText(targetKey);
    if (!key) return battleMemoData.shared;
    if (!battleMemoData.characters || typeof battleMemoData.characters !== "object") {
        battleMemoData.characters = {};
    }
    battleMemoData.characters[key] = normalizeBattleMemoEntry(
        battleMemoData.characters[key],
        BATTLE_MEMO_DEFAULT_TAB_TITLE,
        { includeProfileTab: true }
    );
    return battleMemoData.characters[key];
}

function getBattleMemoActiveTab(entry) {
    const normalized = normalizeBattleMemoEntry(entry, BATTLE_MEMO_DEFAULT_TAB_TITLE);
    entry.tabs = normalized.tabs;
    entry.activeTabId = normalized.activeTabId;
    const found = entry.tabs.find((tab) => tab.id === entry.activeTabId);
    if (found) return found;
    const fallback = entry.tabs[0] || null;
    if (fallback?.id) {
        entry.activeTabId = fallback.id;
    }
    return fallback;
}

function getBattleMemoDomElements() {
    return {
        targetList: document.getElementById("battle-memo-target-list"),
        tabs: document.getElementById("battle-memo-tabs"),
        addTabButton: document.getElementById("battle-memo-add-tab-btn"),
        removeTabButton: document.getElementById("battle-memo-remove-tab-btn"),
        savedAt: document.getElementById("battle-memo-saved-at"),
        profileFields: document.getElementById("battle-memo-profile-fields"),
        titleInput: document.getElementById("battle-memo-title-input"),
        textarea: document.getElementById("battle-memo-text")
    };
}

function renderBattleMemoTargetList() {
    const { targetList } = getBattleMemoDomElements();
    if (!targetList) return;

    const targets = [BATTLE_MEMO_SHARED_TARGET, ...getBattleMemoCharacterNames()];
    targetList.innerHTML = "";
    targets.forEach((targetKey) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "battle-memo-target-btn";
        if (targetKey === battleMemoCurrentTarget) {
            button.classList.add("is-active");
        }
        const label = document.createElement("span");
        label.className = "battle-memo-target-btn-label";
        label.textContent = getBattleMemoTargetLabel(targetKey);
        button.appendChild(label);
        button.addEventListener("click", () => {
            battleMemoCurrentTarget = targetKey;
            const entry = ensureBattleMemoTargetEntry(targetKey);
            battleMemoCurrentTabId = entry.activeTabId;
            renderBattleMemoUI();
        });
        targetList.appendChild(button);
    });
}

function renderBattleMemoTabs() {
    const { tabs, removeTabButton } = getBattleMemoDomElements();
    if (!tabs) return;
    tabs.innerHTML = "";
    const entry = ensureBattleMemoTargetEntry(battleMemoCurrentTarget);
    if (!entry) return;
    const normalized = normalizeBattleMemoEntry(entry, BATTLE_MEMO_DEFAULT_TAB_TITLE);
    entry.tabs = normalized.tabs;
    entry.activeTabId = normalized.activeTabId;

    if (!battleMemoCurrentTabId || !entry.tabs.some((tab) => tab.id === battleMemoCurrentTabId)) {
        battleMemoCurrentTabId = entry.activeTabId;
    }
    entry.activeTabId = battleMemoCurrentTabId;
    if (removeTabButton) {
        const activeTab = entry.tabs.find((tab) => tab.id === entry.activeTabId) || null;
        const canRemove = entry.tabs.length > 1 && !isBattleMemoProfileTab(activeTab);
        removeTabButton.disabled = !canRemove;
        removeTabButton.title = canRemove
            ? "現在のタブを削除"
            : (isBattleMemoProfileTab(activeTab) ? "プロフィールタブは削除できません" : "最後の1タブは削除できません");
    }

    entry.tabs.forEach((tab) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "battle-memo-tab-btn";
        if (tab.id === entry.activeTabId) {
            button.classList.add("is-active");
        }
        button.textContent = tab.title || BATTLE_MEMO_DEFAULT_TAB_TITLE;
        button.addEventListener("click", () => {
            entry.activeTabId = tab.id;
            battleMemoCurrentTabId = tab.id;
            renderBattleMemoTabs();
            renderBattleMemoEditor();
        });
        tabs.appendChild(button);
    });
}

function renderBattleMemoProfileFields(tab) {
    const { profileFields } = getBattleMemoDomElements();
    if (!profileFields) return;

    const fieldValues = parseBattleMemoProfileText(String(tab?.text || ""));
    const multilineTextareas = [];
    profileFields.innerHTML = "";

    const syncProfileText = () => {
        tab.text = buildBattleMemoProfileText(fieldValues);
        writeBattleMemoLocalDraft();
        battleMemoLocalDraftUsed = true;
        setBattleMemoStatus("未保存");
    };

    BATTLE_MEMO_PROFILE_FIELDS.forEach((field) => {
        const row = document.createElement("div");
        row.className = "battle-memo-profile-row";

        const label = document.createElement("label");
        label.className = "battle-memo-profile-label";
        label.textContent = field.label;

        if (field.type === "month-day") {
            const birthdayWrap = document.createElement("div");
            birthdayWrap.className = "battle-memo-profile-birthday";
            const monthSelect = document.createElement("select");
            monthSelect.className = "battle-memo-profile-select";
            const daySelect = document.createElement("select");
            daySelect.className = "battle-memo-profile-select";

            const monthDefault = document.createElement("option");
            monthDefault.value = "";
            monthDefault.textContent = "--月";
            monthSelect.appendChild(monthDefault);
            for (let month = 1; month <= 12; month += 1) {
                const option = document.createElement("option");
                option.value = String(month);
                option.textContent = `${month}月`;
                monthSelect.appendChild(option);
            }

            const setDayOptions = (monthValue, dayValue = "") => {
                daySelect.innerHTML = "";
                const dayDefault = document.createElement("option");
                dayDefault.value = "";
                dayDefault.textContent = "--日";
                daySelect.appendChild(dayDefault);
                const maxDay = getMaxDayOfMonth(monthValue);
                for (let day = 1; day <= maxDay; day += 1) {
                    const option = document.createElement("option");
                    option.value = String(day);
                    option.textContent = `${day}日`;
                    daySelect.appendChild(option);
                }
                if (dayValue && Number(dayValue) <= maxDay) {
                    daySelect.value = String(Number(dayValue));
                }
            };

            const birthday = parseProfileBirthday(fieldValues[field.key] || "");
            monthSelect.value = birthday.month || "";
            setDayOptions(monthSelect.value, birthday.day);

            const onBirthdayChange = () => {
                if (fieldValues[field.key] !== formatProfileBirthday(monthSelect.value, daySelect.value)) {
                    fieldValues[field.key] = formatProfileBirthday(monthSelect.value, daySelect.value);
                    syncProfileText();
                }
            };

            monthSelect.addEventListener("change", () => {
                const beforeDay = daySelect.value;
                setDayOptions(monthSelect.value, beforeDay);
                onBirthdayChange();
            });
            daySelect.addEventListener("change", () => {
                onBirthdayChange();
            });

            birthdayWrap.appendChild(monthSelect);
            birthdayWrap.appendChild(daySelect);
            row.appendChild(label);
            row.appendChild(birthdayWrap);
            profileFields.appendChild(row);
            return;
        }

        const input = field.multiline
            ? document.createElement("textarea")
            : document.createElement("input");
        input.className = field.multiline
            ? "battle-memo-profile-textarea"
            : "battle-memo-profile-input";
        if (!field.multiline) {
            input.type = "text";
        }
        if (field.multiline) {
            input.rows = 1;
        }
        input.value = String(fieldValues[field.key] || "");
        input.addEventListener("input", () => {
            fieldValues[field.key] = String(input.value || "");
            syncProfileText();
            if (field.multiline) {
                autoResizeBattleMemoProfileTextarea(input);
            }
        });

        row.appendChild(label);
        row.appendChild(input);
        profileFields.appendChild(row);
        if (field.multiline) {
            multilineTextareas.push(input);
        }
    });

    if (multilineTextareas.length > 0) {
        requestAnimationFrame(() => {
            multilineTextareas.forEach((textarea) => autoResizeBattleMemoProfileTextarea(textarea));
        });
    }
}

function renderBattleMemoEditor() {
    const { titleInput, textarea, profileFields } = getBattleMemoDomElements();
    if (!titleInput || !textarea) return;
    const titleRow = document.getElementById("battle-memo-title-row");
    const entry = ensureBattleMemoTargetEntry(battleMemoCurrentTarget);
    const tab = getBattleMemoActiveTab(entry);
    const isProfileTab = isBattleMemoProfileTab(tab);
    entry.activeTabId = tab.id;
    battleMemoCurrentTabId = tab.id;

    if (titleRow) {
        titleRow.style.display = isProfileTab ? "none" : "grid";
    }
    if (textarea) {
        textarea.style.display = isProfileTab ? "none" : "block";
    }
    if (profileFields) {
        profileFields.style.display = isProfileTab ? "grid" : "none";
    }

    titleInput.value = String(isProfileTab ? BATTLE_MEMO_PROFILE_TAB_TITLE : (tab.title || BATTLE_MEMO_DEFAULT_TAB_TITLE));
    titleInput.disabled = isProfileTab;
    titleInput.placeholder = isProfileTab ? "プロフィール（固定）" : "メモタイトル";

    if (isProfileTab) {
        renderBattleMemoProfileFields(tab);
        textarea.value = "";
        return;
    }

    textarea.value = String(tab.text || "");
    if (profileFields) {
        profileFields.innerHTML = "";
    }
}

function renderBattleMemoUI() {
    renderBattleMemoTargetList();
    renderBattleMemoTabs();
    renderBattleMemoEditor();
}

async function removeBattleMemoActiveTab() {
    const entry = ensureBattleMemoTargetEntry(battleMemoCurrentTarget);
    if (!entry || !Array.isArray(entry.tabs) || !entry.tabs.length) return false;
    const activeTab = getBattleMemoActiveTab(entry);
    if (isBattleMemoProfileTab(activeTab)) {
        setBattleMemoStatus("プロフィールタブは削除できません", true);
        return false;
    }
    if (entry.tabs.length <= 1) {
        setBattleMemoStatus("最後の1タブは削除できません", true);
        return false;
    }

    const title = normalizeMemoText(activeTab?.title) || BATTLE_MEMO_DEFAULT_TAB_TITLE;
    const confirmed = await askConfirmAsync(`「${title}」を削除しますか？`);
    if (!confirmed) return false;

    const index = entry.tabs.findIndex((tab) => tab.id === activeTab.id);
    if (index < 0) return false;
    entry.tabs.splice(index, 1);

    const nextIndex = Math.max(0, index - 1);
    const nextTab = entry.tabs[nextIndex] || entry.tabs[0];
    entry.activeTabId = nextTab?.id || "";
    battleMemoCurrentTabId = entry.activeTabId;
    writeBattleMemoLocalDraft();
    battleMemoLocalDraftUsed = true;
    renderBattleMemoTabs();
    renderBattleMemoEditor();
    setBattleMemoStatus("未保存");
    return true;
}

function closeBattleMemoModal() {
    const modal = document.getElementById("battle-memo-modal");
    const wasOpen = Boolean(modal && modal.classList.contains("is-open"));
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    if (wasOpen) {
        triggerPostModalInteractionGuardSafe(1500);
    }
}

function ensureBattleMemoModalUI() {
    const modal = document.getElementById("battle-memo-modal");
    if (!modal) return null;

    if (!modal.dataset.boundClose) {
        modal.addEventListener("click", (event) => {
            if (event.target === modal) {
                closeBattleMemoModal();
            }
        });
        modal.dataset.boundClose = "1";
    }

    const closeButton = document.getElementById("battle-memo-close-btn");
    if (closeButton && !closeButton.dataset.boundClose) {
        closeButton.addEventListener("click", () => closeBattleMemoModal());
        closeButton.dataset.boundClose = "1";
    }

    if (!modal.dataset.boundEsc) {
        document.addEventListener("keydown", (event) => {
            if (event.key !== "Escape") return;
            if (!modal.classList.contains("is-open")) return;
            closeBattleMemoModal();
        });
        modal.dataset.boundEsc = "1";
    }

    return modal;
}

async function openBattleMemoModal() {
    const modal = ensureBattleMemoModalUI();
    if (!modal) return;
    await loadBattleMemoForCurrentCharacter(selectName || playerData?.name || "");
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    const { textarea, profileFields } = getBattleMemoDomElements();
    requestAnimationFrame(() => {
        const firstProfileInput = profileFields && profileFields.style.display !== "none"
            ? profileFields.querySelector("input, textarea")
            : null;
        if (firstProfileInput) {
            firstProfileInput.focus();
            return;
        }
        textarea?.focus();
    });
}

window.openBattleMemoModal = openBattleMemoModal;
window.closeBattleMemoModal = closeBattleMemoModal;

function setBattleMemoSavedAt(value = "") {
    const { savedAt } = getBattleMemoDomElements();
    if (!savedAt) return;
    savedAt.textContent = `最終保存: ${formatBattleMemoSavedAt(value)}`;
}

function setBattleMemoStatus(message = "", isError = false) {
    const status = document.getElementById("battle-memo-status");
    if (!status) return;
    status.textContent = message || "";
    status.classList.toggle("is-error", Boolean(isError));
}

async function loadBattleMemoForCurrentCharacter(characterName = (selectName || playerData?.name || "")) {
    try {
        await ensureBattleMemoDataLoaded();
        const nextTarget = normalizeMemoText(characterName) || BATTLE_MEMO_SHARED_TARGET;
        battleMemoCurrentTarget = nextTarget;
        const entry = ensureBattleMemoTargetEntry(nextTarget);
        battleMemoCurrentTabId = entry.activeTabId;
        renderBattleMemoUI();
        setBattleMemoSavedAt(battleMemoLastSavedAt);
        setBattleMemoStatus(battleMemoLocalDraftUsed ? "ローカル下書きを復元しました（未保存）" : "");
        return;
    } catch (apiError) {
        DebaglogSet("memo api load failed:", apiError);
        setBattleMemoStatus("メモ読込に失敗しました", true);
        return;
    }
}

async function saveBattleMemoForCurrentCharacter() {
    if (!battleMemoData) return false;
    try {
        const result = await saveBattleMemoAllToApi();
        battleMemoLastSavedAt = normalizeMemoText(result?.updatedAt || "") || new Date().toISOString();
        writeBattleMemoLastSavedAtLocal(battleMemoLastSavedAt);
        clearBattleMemoLocalDraft();
        battleMemoLocalDraftUsed = false;
        setBattleMemoSavedAt(battleMemoLastSavedAt);
        setBattleMemoStatus("保存しました", false);
        return true;
    } catch (apiError) {
        DebaglogSet("memo api save failed:", apiError);
        setBattleMemoStatus("保存に失敗しました", true);
        return false;
    }
}
window.saveBattleMemoForCurrentCharacter = saveBattleMemoForCurrentCharacter;
window.loadBattleMemoForCurrentCharacter = loadBattleMemoForCurrentCharacter;

function initializeBattleMemoUI() {
    ensureBattleMemoModalUI();
    const saveButton = document.getElementById("battle-memo-save-btn");
    const { textarea, titleInput, addTabButton, removeTabButton } = getBattleMemoDomElements();
    if (!saveButton || !textarea || !titleInput || !addTabButton) return;
    setBattleMemoSavedAt(readBattleMemoLastSavedAtLocal());

    if (!saveButton.dataset.boundMemoSave) {
        saveButton.addEventListener("click", async () => {
            await saveBattleMemoForCurrentCharacter();
        });
        saveButton.dataset.boundMemoSave = "1";
    }
    if (!textarea.dataset.boundMemoInput) {
        textarea.addEventListener("input", () => {
            const entry = ensureBattleMemoTargetEntry(battleMemoCurrentTarget);
            const tab = getBattleMemoActiveTab(entry);
            tab.text = String(textarea.value || "").slice(0, 200000);
            writeBattleMemoLocalDraft();
            battleMemoLocalDraftUsed = true;
            setBattleMemoStatus("未保存");
        });
        textarea.dataset.boundMemoInput = "1";
    }
    if (!titleInput.dataset.boundMemoTitleInput) {
        titleInput.addEventListener("input", () => {
            const entry = ensureBattleMemoTargetEntry(battleMemoCurrentTarget);
            const tab = getBattleMemoActiveTab(entry);
            if (isBattleMemoProfileTab(tab)) {
                tab.title = BATTLE_MEMO_PROFILE_TAB_TITLE;
                titleInput.value = BATTLE_MEMO_PROFILE_TAB_TITLE;
                return;
            }
            const text = String(titleInput.value || "").trim();
            tab.title = (text || BATTLE_MEMO_DEFAULT_TAB_TITLE).slice(0, 40);
            writeBattleMemoLocalDraft();
            battleMemoLocalDraftUsed = true;
            renderBattleMemoTabs();
            setBattleMemoStatus("未保存");
        });
        titleInput.dataset.boundMemoTitleInput = "1";
    }
    if (!addTabButton.dataset.boundMemoAddTab) {
        addTabButton.addEventListener("click", () => {
            const entry = ensureBattleMemoTargetEntry(battleMemoCurrentTarget);
            const currentMemoTabCount = (Array.isArray(entry.tabs) ? entry.tabs : [])
                .filter((tab) => !isBattleMemoProfileTab(tab)).length;
            const nextIndex = currentMemoTabCount + 1;
            const newTab = normalizeBattleMemoTab({
                id: createBattleMemoTabId(),
                title: nextIndex > 1 ? `${BATTLE_MEMO_DEFAULT_TAB_TITLE}${nextIndex}` : BATTLE_MEMO_DEFAULT_TAB_TITLE,
                text: ""
            }, nextIndex - 1);
            entry.tabs.push(newTab);
            entry.activeTabId = newTab.id;
            battleMemoCurrentTabId = newTab.id;
            writeBattleMemoLocalDraft();
            battleMemoLocalDraftUsed = true;
            renderBattleMemoTabs();
            renderBattleMemoEditor();
            setBattleMemoStatus("未保存");
        });
        addTabButton.dataset.boundMemoAddTab = "1";
    }
    if (removeTabButton && !removeTabButton.dataset.boundMemoRemoveTab) {
        removeTabButton.addEventListener("click", async () => {
            await removeBattleMemoActiveTab();
        });
        removeTabButton.dataset.boundMemoRemoveTab = "1";
    }
    void loadBattleMemoForCurrentCharacter(selectName || playerData?.name || "");
}

function buildSendDataTooltip(dataToSend) {
    const skillSummary = (dataToSend.skills || [])
        .map((skill) => `${skill.slot || "-"}:${skill.name || "-"}`)
        .join(", ") || "-";

    return [
        `名前: ${dataToSend.name || "-"}`,
        `攻撃手段: ${dataToSend.attackOption || "-"}`,
        `全力: ${dataToSend.fullPower ? "ON" : "OFF"}`,
        `スキル: ${skillSummary}`
    ].join("\n");
}

function appendDiceLogEntry({
    diceCount,
    diceMax,
    rollResults,
    time,
    sendState = "none",
    sendTooltip = "",
    characterName = getCurrentDiceLogCharacterName()
}) {
    const normalizedCharacterName = String(characterName || "").trim() || "不明";
    const characterEntries = getDiceLogEntriesByScope(DICE_LOG_SCOPE_CHARACTER, normalizedCharacterName);

    battleRollCountGlobal += 1;
    battleRollCountByCharacter[normalizedCharacterName] = (battleRollCountByCharacter[normalizedCharacterName] || 0) + 1;
    const battleTurn = getBattleTurnForCharacter(normalizedCharacterName);

    const entry = {
        characterName: normalizedCharacterName,
        characterTurn: battleTurn,
        characterRollIndex: battleRollCountByCharacter[normalizedCharacterName],
        globalTurn: battleRollCountGlobal,
        diceCount,
        diceMax,
        rollResults: Array.isArray(rollResults) ? [...rollResults] : [],
        time,
        sendState,
        sendTooltip
    };

    characterEntries.unshift(entry);
    diceLogGlobal.unshift(entry);

    if (characterEntries.length > DICE_LOG_MAX_ENTRIES) {
        characterEntries.length = DICE_LOG_MAX_ENTRIES;
    }
    if (diceLogGlobal.length > DICE_LOG_MAX_ENTRIES) {
        diceLogGlobal.length = DICE_LOG_MAX_ENTRIES;
    }

    renderDiceLogsForCurrentCharacter();
    switchDiceLogScope(currentDiceLogScope);
}

function handleBattleRollDice() {
    const diceCount = parseInt(document.getElementById("dice-count").value, 10);
    const diceMax = parseInt(document.getElementById("dice-max").value, 10);
    if (Number.isNaN(diceCount) || Number.isNaN(diceMax) || diceCount <= 0 || diceMax <= 1) {
        alert('ダイス数は1以上、ダイス最大値は2以上の数値を入力してください。');
        return;
    }

    const rollResults = rollDiceResults(diceCount, diceMax);
    const time = new Date().toLocaleTimeString();

    appendDiceLogEntry({
        diceCount,
        diceMax,
        rollResults,
        time,
        sendState: "none"
    });
}
// モーダルを開くときに画面の値をモーダルに設定
function openDiceModal() {
    const diceCount = parseInt(document.getElementById('dice-count').value);
    const diceMax = parseInt(document.getElementById('dice-max').value);

    document.getElementById('dice-modal-count').value = diceCount;
    document.getElementById('dice-modal-value').value = diceMax;

    // モーダルを表示
    const modal = document.getElementById('dice-modal');
    modal.style.display = 'block';
}

// モーダルを閉じる関数
function closeDiceModal() {
    const modal = document.getElementById('dice-modal');
    const wasOpen = Boolean(modal && modal.style.display !== 'none');
    if (modal) {
        modal.style.display = 'none';
    }
    if (wasOpen) {
        triggerPostModalInteractionGuardSafe(1500);
    }
}

// モーダルの「保存」ボタンで値を画面に同期
function syncDiceSettingsFromModal() {
    // モーダルのダイス設定を取得
    const diceModalCount = parseInt(document.getElementById('dice-modal-count').value);
    const diceModalValue = parseInt(document.getElementById('dice-modal-value').value);

    // 入力値をバリデーション
    if (isNaN(diceModalCount) || isNaN(diceModalValue) || diceModalCount <= 0 || diceModalValue <= 1) {
        alert('ダイス数は1以上、ダイス最大値は2以上の数値を入力してください。');
        return;
    }

    // モーダルの値を画面に同期
    document.getElementById('dice-count').value = diceModalCount;
    document.getElementById('dice-max').value = diceModalValue;

    // モーダルを閉じる
    const modal = document.getElementById('dice-modal');
    const wasOpen = Boolean(modal && modal.style.display !== 'none');
    if (modal) {
        modal.style.display = 'none';
    }
    if (wasOpen) {
        triggerPostModalInteractionGuardSafe(1500);
    }

    // 同期完了後、sendData() を呼び出してデータ送信
    sendData(diceModalCount, diceModalValue);
}

const SKILL_RESOURCE_COST_ALIASES = {
    hp: ["HP", "HPコスト", "HP消耗"],
    mp: ["MP", "MPコスト", "MP消耗"],
    st: ["ST", "SP", "STコスト", "SPコスト", "ST消耗", "SP消耗"]
};

const SKILL_RESOURCE_COST_RATE_ALIASES = {
    hp: ["HP消費", "HP消費増加", "HP消費倍率", "HP消費率", "HPコスト増加"],
    mp: ["MP消費", "MP消費増加", "MP消費倍率", "MP消費率", "MPコスト増加"],
    st: ["ST消費", "SP消費", "ST消費増加", "SP消費増加", "ST消費倍率", "SP消費倍率", "ST消費率", "SP消費率", "STコスト増加", "SPコスト増加"]
};

function parseResourceCostFromDescription(description, labels = []) {
    const text = String(description || "");
    if (!text) return 0;
    let sum = 0;
    labels.forEach((label) => {
        if (!label) return;
        const escaped = String(label).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const pattern = new RegExp(`${escaped}\\s*[:：]?\\s*(-\\d+(?:\\.\\d+)?)`, "gi");
        let matched;
        while ((matched = pattern.exec(text)) !== null) {
            const value = Number(matched[1]);
            if (Number.isFinite(value)) {
                sum += Math.abs(value);
            }
        }
    });
    return sum;
}

function pickResourceCostFromSkillData(skillData, aliases = []) {
    if (!skillData || typeof skillData !== "object") return 0;
    for (const key of aliases) {
        if (!Object.prototype.hasOwnProperty.call(skillData, key)) continue;
        const value = toFiniteNumber(skillData[key]);
        if (value !== 0) {
            return Math.abs(value);
        }
    }
    return 0;
}

function pickResourceCostRateFromSkillData(skillData, aliases = []) {
    if (!skillData || typeof skillData !== "object") return 0;
    let rate = 0;
    aliases.forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(skillData, key)) return;
        rate += toFiniteNumber(skillData[key]);
    });
    return rate;
}

function getSkillResourceCosts(skillInput) {
    const skillData = getSkillData(skillInput);
    if (!skillData || typeof skillData !== "object") {
        return { hp: 0, mp: 0, st: 0 };
    }

    const description = String(skillData?.詳細 || skillData?.description || "");
    const hp = pickResourceCostFromSkillData(skillData, SKILL_RESOURCE_COST_ALIASES.hp)
        || parseResourceCostFromDescription(description, ["HP"]);
    const mp = pickResourceCostFromSkillData(skillData, SKILL_RESOURCE_COST_ALIASES.mp)
        || parseResourceCostFromDescription(description, ["MP"]);
    const st = pickResourceCostFromSkillData(skillData, SKILL_RESOURCE_COST_ALIASES.st)
        || parseResourceCostFromDescription(description, ["ST", "SP"]);

    return {
        hp: Math.max(0, Math.round(toFiniteNumber(hp))),
        mp: Math.max(0, Math.round(toFiniteNumber(mp))),
        st: Math.max(0, Math.round(toFiniteNumber(st)))
    };
}

function calculateSelectedSkillsResourceConsumption(targetSelectedSkills = selectedSkills) {
    const totals = { hp: 0, mp: 0, st: 0 };
    const totalRates = { hp: 0, mp: 0, st: 0 };
    SELECTED_SKILL_SLOT_ORDER.forEach((slot) => {
        const skillData = getSkillData(targetSelectedSkills?.[slot]);
        const costs = getSkillResourceCosts(skillData);
        totals.hp += costs.hp;
        totals.mp += costs.mp;
        totals.st += costs.st;

        totalRates.hp += pickResourceCostRateFromSkillData(skillData, SKILL_RESOURCE_COST_RATE_ALIASES.hp);
        totalRates.mp += pickResourceCostRateFromSkillData(skillData, SKILL_RESOURCE_COST_RATE_ALIASES.mp);
        totalRates.st += pickResourceCostRateFromSkillData(skillData, SKILL_RESOURCE_COST_RATE_ALIASES.st);
    });

    const applyRate = (value, rate) => Math.max(0, Math.round(toFiniteNumber(value) * (1 + toFiniteNumber(rate) / 100)));
    return {
        hp: applyRate(totals.hp, totalRates.hp),
        mp: applyRate(totals.mp, totalRates.mp),
        st: applyRate(totals.st, totalRates.st),
        rates: {
            hp: totalRates.hp,
            mp: totalRates.mp,
            st: totalRates.st
        }
    };
}

function buildSkillSetResourcePreview() {
    let character = playerData && typeof playerData === "object" ? playerData : null;
    const characterName = normalizeBattleText(character?.name);
    if (!characterName && Array.isArray(characterList) && characterList.length > 0) {
        character = characterList[0];
        playerData = character;
        window.playerData = playerData;
        if (!normalizeBattleText(selectName)) {
            selectName = normalizeBattleText(character?.name);
        }
    }
    const damage = ensureCharacterDamageObject(character);
    const maxValues = getCharacterResourceMaximums(character);
    const planned = calculateSelectedSkillsResourceConsumption(selectedSkills);

    const hpConsumedPercent = clampNumber(toFiniteNumber(damage.HP_消費), 0, 100);
    const hpPlannedPercent = clampNumber(toFiniteNumber(planned.hp), 0, 100);
    const hpCurrentPercent = clampNumber(100 - hpConsumedPercent, 0, 100);
    const hpAfterPercent = clampNumber(100 - (hpConsumedPercent + hpPlannedPercent), 0, 100);
    const hpCurrent = Math.max(0, Math.round(toFiniteNumber(maxValues.hp) * hpCurrentPercent / 100));
    const hpAfter = Math.max(0, Math.round(toFiniteNumber(maxValues.hp) * hpAfterPercent / 100));
    const hpPlannedValue = Math.max(0, hpCurrent - hpAfter);
    const hpRateCurrent = hpCurrentPercent;
    const hpRateAfter = hpAfterPercent;
    const hpRatePlanned = Math.max(0, hpRateCurrent - hpRateAfter);

    const mpMax = Math.max(0, Math.round(toFiniteNumber(maxValues.mp)));
    const mpCurrent = clampNumber(mpMax - toFiniteNumber(damage.MP_消費), 0, mpMax);
    const mpPlanned = clampNumber(toFiniteNumber(planned.mp), 0, mpCurrent);
    const mpAfter = clampNumber(mpCurrent - mpPlanned, 0, mpMax);
    const mpRateCurrent = mpMax > 0 ? (mpCurrent / mpMax) * 100 : 0;
    const mpRateAfter = mpMax > 0 ? (mpAfter / mpMax) * 100 : 0;
    const mpRatePlanned = Math.max(0, mpRateCurrent - mpRateAfter);

    const stMax = Math.max(0, Math.round(toFiniteNumber(maxValues.st)));
    const stCurrent = clampNumber(stMax - toFiniteNumber(damage.ST_消費), 0, stMax);
    const stPlanned = clampNumber(toFiniteNumber(planned.st), 0, stCurrent);
    const stAfter = clampNumber(stCurrent - stPlanned, 0, stMax);
    const stRateCurrent = stMax > 0 ? (stCurrent / stMax) * 100 : 0;
    const stRateAfter = stMax > 0 ? (stAfter / stMax) * 100 : 0;
    const stRatePlanned = Math.max(0, stRateCurrent - stRateAfter);

    return {
        name: String(character?.name || "").trim(),
        hp: {
            max: Math.max(1, Math.round(toFiniteNumber(maxValues.hp) || 1)),
            current: Math.round(hpCurrent),
            after: Math.round(hpAfter),
            planned: Math.round(hpPlannedValue),
            rateCurrent: hpRateCurrent,
            rateAfter: hpRateAfter,
            ratePlanned: hpRatePlanned
        },
        mp: {
            max: mpMax,
            current: Math.round(mpCurrent),
            after: Math.round(mpAfter),
            planned: Math.round(mpPlanned),
            rateCurrent: mpRateCurrent,
            rateAfter: mpRateAfter,
            ratePlanned: mpRatePlanned
        },
        st: {
            max: stMax,
            current: Math.round(stCurrent),
            after: Math.round(stAfter),
            planned: Math.round(stPlanned),
            rateCurrent: stRateCurrent,
            rateAfter: stRateAfter,
            ratePlanned: stRatePlanned
        }
    };
}

function getSkillSetResourcePreviewForModal() {
    return buildSkillSetResourcePreview();
}
window.getSkillSetResourcePreviewForModal = getSkillSetResourcePreviewForModal;

function findCharacterByNameForResourceAdjust(characterName = "") {
    const targetName = normalizeBattleText(characterName);
    if (!targetName) return null;
    if (Array.isArray(characterList)) {
        const inList = characterList.find((entry) => normalizeBattleText(entry?.name) === targetName);
        if (inList) return inList;
    }
    if (normalizeBattleText(playerData?.name) === targetName) {
        return playerData;
    }
    return null;
}

function buildCurrentResourcesForCharacter(character) {
    const maxValues = getCharacterResourceMaximums(character);
    const damage = ensureCharacterDamageObject(character);

    const hpMax = Math.max(1, Math.round(toFiniteNumber(maxValues.hp) || 1));
    const hpConsumedPercent = clampNumber(toFiniteNumber(damage.HP_消費), 0, 100);
    const hpCurrent = clampNumber(hpMax * (1 - hpConsumedPercent / 100), 0, hpMax);

    const mpMax = Math.max(0, Math.round(toFiniteNumber(maxValues.mp)));
    const mpCurrent = clampNumber(mpMax - toFiniteNumber(damage.MP_消費), 0, mpMax);

    const stMax = Math.max(0, Math.round(toFiniteNumber(maxValues.st)));
    const stCurrent = clampNumber(stMax - toFiniteNumber(damage.ST_消費), 0, stMax);

    return {
        hp: { max: hpMax, current: Math.round(hpCurrent) },
        mp: { max: mpMax, current: Math.round(mpCurrent) },
        st: { max: stMax, current: Math.round(stCurrent) }
    };
}

function applyResourceAdjustResultToCharacter(character, adjustResult = {}) {
    if (!character || typeof character !== "object") return null;
    const damage = ensureCharacterDamageObject(character);
    const current = buildCurrentResourcesForCharacter(character);

    // 新モーダル: 調整後の絶対値(targets)を直接受け取る。
    if (adjustResult && typeof adjustResult === "object" && adjustResult.targets) {
        const nextHpCurrent = clampNumber(toFiniteNumber(adjustResult.targets.hp), 0, current.hp.max);
        const nextMpCurrent = clampNumber(toFiniteNumber(adjustResult.targets.mp), 0, current.mp.max);
        const nextStCurrent = clampNumber(toFiniteNumber(adjustResult.targets.st), 0, current.st.max);

        damage.HP_消費 = current.hp.max > 0
            ? clampNumber(Math.round((1 - nextHpCurrent / current.hp.max) * 10000) / 100, 0, 100)
            : 100;
        damage.MP_消費 = Math.round(clampNumber(current.mp.max - nextMpCurrent, 0, current.mp.max));
        damage.ST_消費 = Math.round(clampNumber(current.st.max - nextStCurrent, 0, current.st.max));
        return { ...damage };
    }

    const operation = String(adjustResult?.operation || "").trim().toLowerCase() === "increase" ? "increase" : "decrease";
    const sign = operation === "increase" ? 1 : -1;
    const normalizeUnitMode = (value) => String(value || "").trim().toLowerCase() === "percent" ? "percent" : "value";
    const unitModes = {
        hp: normalizeUnitMode(adjustResult?.unitModes?.hp || "percent"),
        mp: normalizeUnitMode(adjustResult?.unitModes?.mp || "value"),
        st: normalizeUnitMode(adjustResult?.unitModes?.st || "value")
    };

    const getInput = (key) => Math.max(0, toFiniteNumber(adjustResult?.values?.[key]));
    const resolveDelta = (key, max) => {
        const input = getInput(key);
        if (unitModes[key] === "percent") {
            return max * (input / 100);
        }
        return input;
    };
    const resolveNextCurrent = (key, max, now) => {
        const delta = resolveDelta(key, max);
        return clampNumber(now + sign * delta, 0, max);
    };

    const nextHpCurrent = resolveNextCurrent("hp", current.hp.max, current.hp.current);
    const nextMpCurrent = resolveNextCurrent("mp", current.mp.max, current.mp.current);
    const nextStCurrent = resolveNextCurrent("st", current.st.max, current.st.current);

    damage.HP_消費 = current.hp.max > 0
        ? clampNumber(Math.round((1 - nextHpCurrent / current.hp.max) * 10000) / 100, 0, 100)
        : 100;
    damage.MP_消費 = Math.round(clampNumber(current.mp.max - nextMpCurrent, 0, current.mp.max));
    damage.ST_消費 = Math.round(clampNumber(current.st.max - nextStCurrent, 0, current.st.max));

    return { ...damage };
}

async function openResourceAdjustModalForCharacter(characterName = "", options = {}) {
    if (typeof window.openResourceAdjustModalVue !== "function") {
        return null;
    }

    const fallbackName = normalizeBattleText(playerData?.name || selectName || "");
    const target = findCharacterByNameForResourceAdjust(characterName || fallbackName)
        || (playerData && typeof playerData === "object" ? playerData : null);
    if (!target) return null;

    const currentResources = buildCurrentResourcesForCharacter(target);
    const modalResult = await window.openResourceAdjustModalVue({
        characterName: String(target?.name || "").trim(),
        operation: options?.operation || "decrease",
        unitModes: options?.unitModes,
        resources: currentResources
    });

    if (!modalResult || modalResult.action !== "apply") {
        return buildSkillSetModalPayload();
    }

    const nextDamage = applyResourceAdjustResultToCharacter(target, modalResult);
    if (nextDamage) {
        syncDamageToCharacterListByName(target?.name, nextDamage);
    }

    if (
        window.statusCharacter
        && normalizeBattleText(window.statusCharacter?.name) === normalizeBattleText(target?.name)
    ) {
        window.statusCharacter.damage = {
            ...(window.statusCharacter.damage || {}),
            ...(nextDamage || {})
        };
    }

    if (normalizeBattleText(playerData?.name) === normalizeBattleText(target?.name)) {
        playerData.damage = { ...(playerData.damage || {}), ...(nextDamage || {}) };
    }

    await refreshCharacterCardsAfterConsumption();

    if (normalizeBattleText(playerData?.name) === normalizeBattleText(target?.name)) {
        await characterDataDisplay(target);
    } else if (typeof refreshTopRightStatusContainer === "function") {
        await refreshTopRightStatusContainer();
    }

    return buildSkillSetModalPayload();
}
window.openResourceAdjustModalForCharacter = openResourceAdjustModalForCharacter;

function clampNumber(value, min, max) {
    const n = toFiniteNumber(value);
    if (Number.isFinite(min) && n < min) return min;
    if (Number.isFinite(max) && n > max) return max;
    return n;
}

function getCharacterResourceMaximums(character) {
    if (!character || typeof character !== "object") {
        return { hp: 100, mp: Number.POSITIVE_INFINITY, st: Number.POSITIVE_INFINITY };
    }

    const baseStats = character?.stats?.baseStats || {};
    const levelStats = character?.stats?.levelStats || {};
    const itemStats = character?.itemBonuses?.stats || {};
    const skillBonuses = character?.skillBonuses || {};

    const sizBase = toFiniteNumber(baseStats?.SIZ);
    const sizLevel = toFiniteNumber(levelStats?.SIZ);
    const sizMax = Math.max(sizBase, sizLevel);
    const sizCorrection = typeof window?.calculateCorrection === "function"
        ? toFiniteNumber(window.calculateCorrection(sizMax))
        : 0;

    const maxHpBase = (
        toFiniteNumber(baseStats?.HP)
        + toFiniteNumber(levelStats?.HP)
        + toFiniteNumber(itemStats?.["HP+"])
        + toFiniteNumber(skillBonuses?.HP)
    );
    const maxHp = Math.max(1, Math.round(maxHpBase * (1 + sizCorrection / 100)));

    const maxMp = Math.max(0, Math.round(
        toFiniteNumber(baseStats?.MP)
        + toFiniteNumber(levelStats?.MP)
        + toFiniteNumber(itemStats?.["MP+"])
        + toFiniteNumber(skillBonuses?.MP)
    ));

    const maxSt = Math.max(0, Math.round(
        toFiniteNumber(baseStats?.ST)
        + toFiniteNumber(levelStats?.ST)
        + toFiniteNumber(itemStats?.["ST+"])
        + toFiniteNumber(skillBonuses?.SP || skillBonuses?.ST)
    ));

    return { hp: maxHp, mp: maxMp, st: maxSt };
}

function ensureCharacterDamageObject(character) {
    if (!character || typeof character !== "object") return { HP_消費: 0, MP_消費: 0, ST_消費: 0 };
    if (!character.damage || typeof character.damage !== "object") {
        character.damage = { HP_消費: 0, MP_消費: 0, ST_消費: 0 };
    }
    return character.damage;
}

function applyResourceConsumptionToCharacter(character, consumption) {
    if (!character || typeof character !== "object") return null;
    const costs = consumption || { hp: 0, mp: 0, st: 0 };
    const damage = ensureCharacterDamageObject(character);
    const maxValues = getCharacterResourceMaximums(character);

    const nextHp = clampNumber(toFiniteNumber(damage.HP_消費) + toFiniteNumber(costs.hp), 0, 100);
    const nextMp = clampNumber(toFiniteNumber(damage.MP_消費) + toFiniteNumber(costs.mp), 0, maxValues.mp);
    const nextSt = clampNumber(toFiniteNumber(damage.ST_消費) + toFiniteNumber(costs.st), 0, maxValues.st);

    damage.HP_消費 = Math.round(nextHp);
    damage.MP_消費 = Math.round(nextMp);
    damage.ST_消費 = Math.round(nextSt);
    return { ...damage };
}

function syncDamageToCharacterListByName(characterName, damage) {
    const name = normalizeBattleText(characterName);
    if (!name) return;

    const normalizedDamage = setDamageStateForCharacter(name, damage);
    const applyDamageToCharacter = (character) => {
        if (!character || normalizeBattleText(character?.name) !== name) return;
        const targetDamage = ensureCharacterDamageObject(character);
        targetDamage.HP_消費 = normalizedDamage.HP_消費;
        targetDamage.MP_消費 = normalizedDamage.MP_消費;
        targetDamage.ST_消費 = normalizedDamage.ST_消費;
    };

    if (Array.isArray(characterList)) {
        const target = characterList.find((entry) => normalizeBattleText(entry?.name) === name);
        applyDamageToCharacter(target);
    }
    applyDamageToCharacter(playerData);
    applyDamageToCharacter(window.statusCharacter);

    queueBattleStateSaveForCharacter(name);
}

async function refreshCharacterCardsAfterConsumption() {
    const displayFn = typeof displayCharacters === "function"
        ? displayCharacters
        : (typeof window?.displayCharacters === "function" ? window.displayCharacters : null);
    if (typeof displayFn !== "function") return;

    await displayFn(characterList);
    const currentName = normalizeBattleText(playerData?.name || selectName);
    if (!currentName) return;
    document.querySelectorAll("#character-list .character-container").forEach((container) => {
        const nameElement = container.querySelector(".character-name");
        const isCurrent = normalizeBattleText(nameElement?.textContent) === currentName;
        container.classList.toggle("selected", isCurrent);
    });
}

async function consumeStatusOnSkillSend() {
    const consumption = calculateSelectedSkillsResourceConsumption(selectedSkills);
    const hasConsumption = [consumption.hp, consumption.mp, consumption.st].some((value) => toFiniteNumber(value) > 0);
    if (!hasConsumption) return consumption;

    const nextDamage = applyResourceConsumptionToCharacter(playerData, consumption);
    syncDamageToCharacterListByName(playerData?.name, nextDamage);
    if (window.statusCharacter && normalizeBattleText(window.statusCharacter?.name) === normalizeBattleText(playerData?.name)) {
        applyResourceConsumptionToCharacter(window.statusCharacter, consumption);
    }
    await refreshCharacterCardsAfterConsumption();
    DebaglogSet("[送信時消耗]", {
        name: playerData?.name || "",
        消耗: consumption,
        累積: ensureCharacterDamageObject(playerData)
    });
    return consumption;
}

// データ送信関数
async function sendData(diceCount, diceMax) {
    DebaglogSet("データ送信関数===============");

    // ダイスロール処理
    const rollResults = rollDiceResults(diceCount, diceMax);

    // 現在時刻を取得
    const now = new Date();
    const time = now.toLocaleTimeString();

    // 全力モードの取得
    const fullPowerOnOff = isFullPower ? 1 : 0;

    // 攻撃オプションを取得
    const selectElement = document.getElementById("attack-method-select");

    // 送信するデータの準備
    const dataToSend = {
        name: playerData.name,
        attackOption: selectElement.value || "",
        fullPower: fullPowerOnOff,
        skills: getSkillsFromTable(),
        rollResults: rollResults
    };

    const consumedStatus = await consumeStatusOnSkillSend();
    dataToSend.consumedStatus = {
        HP: Math.round(toFiniteNumber(consumedStatus?.hp)),
        MP: Math.round(toFiniteNumber(consumedStatus?.mp)),
        ST: Math.round(toFiniteNumber(consumedStatus?.st))
    };

    const retainedResult = retainUsedBuffSkillsFromSelection(selectedSkills, playerData?.name || selectName || "");
    const cooldownResult = retainUsedSkillCooldownsFromSelection(selectedSkills, playerData?.name || selectName || "");
    dataToSend.retainedBuff = {
        added: Math.max(0, Math.round(toFiniteNumber(retainedResult?.addedCount))),
        refreshed: Math.max(0, Math.round(toFiniteNumber(retainedResult?.refreshedCount))),
        total: Math.max(0, Math.round(toFiniteNumber(retainedResult?.totalCount)))
    };
    dataToSend.cooldown = {
        started: Math.max(0, Math.round(toFiniteNumber(cooldownResult?.startedCount))),
        total: Math.max(0, Math.round(toFiniteNumber(cooldownResult?.totalCount)))
    };
    if (
        toFiniteNumber(retainedResult?.addedCount) > 0
        || toFiniteNumber(retainedResult?.refreshedCount) > 0
        || toFiniteNumber(cooldownResult?.startedCount) > 0
    ) {
        await saveBattleStateForCharacterNow(playerData?.name || selectName || "");
        await refreshTopRightStatusContainer();
        await updateSelectedSkills();
        await rerenderSkillTables();
    }

    DebaglogSet("dataToSend :", dataToSend);
    let sendState = "none";
    let sendTooltip = "";

    // サーバーにデータを送信
    try {
        const response = await fetch('/api/select_dataLog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ skillNames: dataToSend })
        });
        const result = await response.json();

        if (result.success) {
            console.error('送信完了');
            sendState = "sent";
            sendTooltip = buildSendDataTooltip(dataToSend);
        } else {
            console.error('送信に失敗しました');
            sendState = "failed";
        }
    } catch (error) {
        console.error('送信エラー:', error);
        sendState = "failed";
    }

    appendDiceLogEntry({
        diceCount,
        diceMax,
        rollResults,
        time,
        sendState,
        sendTooltip
    });
}


function getSkillsFromTable() {
    DebaglogSet("  getSkillsFromTable :");
    const skills = SELECTED_SKILL_SLOT_ORDER.map((slot) => {
        const skillData = getSkillData(selectedSkills?.[slot]);
        const skillName = skillData
            ? String(skillData?.和名 || skillData?.技名 || skillData?.name || "").trim()
            : "";
        return {
            slot: String(slot || "").trim(),
            name: skillName
        };
    });

    DebaglogSet(skills);

    return skills;
}



// 攻撃手段にデータを入れる
function populateAttackOptions(options) {
    const selectElement = document.getElementById("attack-method-select");
    if (!selectElement) return;
    const autoDefaultValue = getDefaultAttackOptionValue(options);
    const savedValue = normalizeBattleText(getSavedAttackOptionForCharacter());
    const characterKey = normalizeBattleText(getCharacterScopedKey());
    const previousValue = normalizeBattleText(selectElement.value);
    const previousOwnerKey = normalizeBattleText(selectElement?.dataset?.attackMethodOwner || "");
    const previousWasUserSelected = String(selectElement?.dataset?.attackMethodUserSelected || "") === "1";

    // 初期化して既存のオプションを削除
    selectElement.innerHTML = "";

    // デフォルトの「選択してください」を追加
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "--選択してください--";
    selectElement.appendChild(defaultOption);

    // JSONデータからオプションを生成
    options.forEach(option => {
        const optionElement = document.createElement("option");
        optionElement.value = option.value;
        const optionPower = toFiniteNumber(option?.威力 ?? option?.power ?? option?.["螽∝鴨"]);
        const optionAttribute = toFiniteNumber(option?.属性 ?? option?.element ?? option?.["螻樊ｧ"]);
        const optionGuard = toFiniteNumber(option?.守り ?? option?.防御 ?? option?.guard);

        // それぞれの値を条件付きで追加
        const parts = [option.label];
        if (optionPower) parts.push(`威: ${optionPower}`);
        if (optionAttribute) parts.push(`属: ${optionAttribute}`);
        if (optionGuard) parts.push(`防: ${optionGuard}`);

        // 各値が揃ったテキストを設定
        optionElement.textContent = parts.join(" ");
        selectElement.appendChild(optionElement);
    });

    const hasPreviousOption = previousValue
        && options.some((option) => normalizeBattleText(option?.value) === previousValue);
    const hasSavedOption = savedValue
        && options.some((option) => normalizeBattleText(option?.value) === savedValue);
    const keepPreviousSelection = previousWasUserSelected
        && hasPreviousOption
        && previousOwnerKey === characterKey;
    // 1) キャラ別の保存値が有効なら復元
    // 2) 同一キャラ画面内の手動選択を維持
    // 3) それ以外は装備状態から初期決定
    const nextValue = hasSavedOption
        ? savedValue
        : (keepPreviousSelection ? previousValue : autoDefaultValue);

    const existsInOptions = nextValue
        && options.some((option) => normalizeBattleText(option?.value) === nextValue);
    selectElement.value = existsInOptions ? nextValue : "";
    selectElement.dataset.attackMethodOwner = characterKey;
    const shouldMarkSelected = existsInOptions && (hasSavedOption || keepPreviousSelection);
    selectElement.dataset.attackMethodUserSelected = shouldMarkSelected ? "1" : "0";
    updateAttackMethodTriggerLabel(selectElement.value);
}


async function handleAttackMethodChange(nextValue = null) {
    const selectElement = document.getElementById("attack-method-select");
    if (!selectElement) return;

    const requested = normalizeBattleText(nextValue ?? selectElement.value);
    if (requested) {
        const hasOption = Array.from(selectElement.options || []).some(
            (option) => normalizeBattleText(option?.value) === requested
        );
        if (hasOption) {
            selectElement.value = requested;
        }
    } else {
        selectElement.value = "";
    }

    const selectedMethod = normalizeBattleText(selectElement.value);
    const characterKey = normalizeBattleText(getCharacterScopedKey());
    selectElement.dataset.attackMethodOwner = characterKey;
    selectElement.dataset.attackMethodUserSelected = selectedMethod ? "1" : "0";
    saveCurrentAttackOptionForCharacter(selectedMethod);
    updateAttackMethodTriggerLabel(selectedMethod);
    if (selectedMethod) {
        DebaglogSet(`選択された攻撃手段: ${selectedMethod}`);
        applyAttackMethodEffects(selectedMethod);
    }
    await updateSelectedSkills();
    rerenderSkillTables();
}

// 攻撃手段ごとの効果を適用する関数（仮定）
function applyAttackMethodEffects(method) {
    // ここで選択された攻撃手段に応じてステータスやスキルを変更
    switch(method) {
        case '武器1':
            // 武器1に応じたステータス変更処理
            break;
        case '素手':
            // 素手に応じた処理
            break;
        // 他の攻撃手段も同様に処理を追加
    }

    // 必要なら画面の再描画
    if (typeof updateCharacterStatsDisplay === "function") {
        updateCharacterStatsDisplay();
    }
}









