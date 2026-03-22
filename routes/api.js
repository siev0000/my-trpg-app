const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const filePath = './data.xlsx';
const excelAbsolutePath = path.resolve(filePath);
const appDataRoot = path.resolve(
    process.env.APP_DATA_DIR
    || process.env.DATA_DIR
    || process.cwd()
);
const logsDirPath = path.join(appDataRoot, 'logs');
const selectDataLogPath = path.join(logsDirPath, 'select_dataLog.txt');
const battleMemoJsonPath = path.join(logsDirPath, 'battle-memo.json');
const characterProfileJsonPath = path.join(logsDirPath, 'character-profiles.json');
const skillSetPresetJsonPath = path.join(logsDirPath, 'skill-set-presets.json');
const skillSetIconDirName = '攻撃手段';
const skillSetIconDirPath = path.join(process.cwd(), 'public', 'images', skillSetIconDirName);
const MEMO_PROFILE_TAB_ID = '__profile__';
const MEMO_PROFILE_TAB_TITLE = 'プロフィール';

fs.mkdirSync(logsDirPath, { recursive: true });
console.log(`[storage] appDataRoot=${appDataRoot}`);
console.log(`[storage] logsDir=${logsDirPath}`);

const SHEET_NAMES = {
    user: ['userID'],
    character: ['キャラクター'],
    classes: ['クラス'],
    skills: ['スキル'],
    items: ['装備'],
    shop: ['ショップ'],
    team: ['パーティ'],
    battle: ['戦闘'],
    body: ['肉体']
};

const FIELD_KEYS = {
    name: ['名前'],
    title: ['二つ名'],
    className: ['職業名'],
    skillName: ['和名'],
    skillType: ['種別'],
    skillDetail: ['詳細'],
    teamName: ['チーム名'],
    bodyNo: ['番号'],
    bodyName: ['肉体'],
    ability: ['能力値'],
    attack: ['攻撃'],
    defense: ['防御'],
    magic: ['魔力'],
    magicDefense: ['魔防'],
    speed: ['速度'],
    hit: ['命中'],
    items: ['持ち物', '所持品'],
    money: ['所持金'],
    memo: ['メモ', '備考']
};

function sanitizeTsvValue(value) {
    return String(value ?? '')
        .replace(/\t/g, ' ')
        .replace(/\r?\n/g, ' ')
        .trim();
}

function normalizeText(value) {
    return String(value ?? '').trim();
}

function normalizePresetIconName(value) {
    const normalized = normalizeText(value);
    if (!normalized) return '';
    return path.basename(normalized);
}

function buildPresetIconUrl(iconName) {
    const normalized = normalizePresetIconName(iconName);
    if (!normalized) return '';
    return `/images/${encodeURIComponent(skillSetIconDirName)}/${encodeURIComponent(normalized)}`;
}

function listSkillSetIcons() {
    if (!fs.existsSync(skillSetIconDirPath)) {
        return [];
    }

    const imageExtSet = new Set(['.webp', '.png', '.jpg', '.jpeg', '.gif', '.svg']);
    const icons = fs.readdirSync(skillSetIconDirPath, { withFileTypes: true })
        .filter((entry) => entry?.isFile?.())
        .map((entry) => normalizePresetIconName(entry.name))
        .filter((name) => {
            const ext = path.extname(name).toLowerCase();
            return name && imageExtSet.has(ext);
        })
        .sort((a, b) => a.localeCompare(b, 'ja'))
        .map((name) => ({
            name,
            url: buildPresetIconUrl(name)
        }));

    return icons;
}

function normalizeMemoTextValue(value) {
    return String(value ?? '').slice(0, 200000);
}

function normalizeCharacterProfileEntry(entry = {}) {
    if (typeof entry === 'string') {
        return {
            text: normalizeMemoTextValue(entry),
            updatedAt: null
        };
    }
    return {
        text: normalizeMemoTextValue(entry?.text),
        updatedAt: normalizeText(entry?.updatedAt) || null
    };
}

function normalizeCharacterProfileMap(data = {}) {
    const source = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    const characterProfiles = {};
    Object.entries(source).forEach(([name, entry]) => {
        const key = normalizeText(name);
        if (!key) return;
        characterProfiles[key] = normalizeCharacterProfileEntry(entry);
    });
    return characterProfiles;
}

function isProfileMemoTab(tab = {}, index = -1) {
    const id = normalizeText(tab?.id);
    if (id === MEMO_PROFILE_TAB_ID) return true;
    if (index === 0 && normalizeText(tab?.title) === MEMO_PROFILE_TAB_TITLE) return true;
    return false;
}

function pickFirstValue(obj, keys, fallback = undefined) {
    if (!obj || typeof obj !== 'object') return fallback;
    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            return obj[key];
        }
    }
    return fallback;
}

function pickFirstText(obj, keys, fallback = '') {
    const value = pickFirstValue(obj, keys, fallback);
    return normalizeText(value);
}

function readBattleMemoStore() {
    if (!fs.existsSync(battleMemoJsonPath)) {
        return { version: 1, updatedAt: null, memos: {}, legacyCharacterProfiles: {} };
    }

    const raw = fs.readFileSync(battleMemoJsonPath, 'utf8');
    if (!String(raw || '').trim()) {
        return { version: 1, updatedAt: null, memos: {}, legacyCharacterProfiles: {} };
    }

    const parsed = JSON.parse(raw);
    const memos = (parsed && typeof parsed === 'object' && parsed.memos && typeof parsed.memos === 'object' && !Array.isArray(parsed.memos))
        ? parsed.memos
        : {};
    const legacyCharacterProfiles = normalizeCharacterProfileMap(parsed?.characterProfiles);

    return {
        version: 1,
        updatedAt: parsed?.updatedAt || null,
        memos,
        legacyCharacterProfiles
    };
}

function writeBattleMemoStore(store) {
    const normalizedStore = {
        version: 1,
        updatedAt: store?.updatedAt || new Date().toISOString(),
        memos: (store && typeof store.memos === 'object' && !Array.isArray(store.memos)) ? store.memos : {}
    };

    fs.mkdirSync(path.dirname(battleMemoJsonPath), { recursive: true });
    const tempPath = `${battleMemoJsonPath}.tmp`;
    fs.writeFileSync(tempPath, `${JSON.stringify(normalizedStore, null, 2)}\n`, 'utf8');
    fs.renameSync(tempPath, battleMemoJsonPath);
}

function readCharacterProfileStore() {
    if (!fs.existsSync(characterProfileJsonPath)) {
        return { version: 1, updatedAt: null, profiles: {} };
    }

    const raw = fs.readFileSync(characterProfileJsonPath, 'utf8');
    if (!String(raw || '').trim()) {
        return { version: 1, updatedAt: null, profiles: {} };
    }

    const parsed = JSON.parse(raw);
    return {
        version: 1,
        updatedAt: parsed?.updatedAt || null,
        profiles: normalizeCharacterProfileMap(parsed?.profiles)
    };
}

function writeCharacterProfileStore(store) {
    const normalizedStore = {
        version: 1,
        updatedAt: store?.updatedAt || new Date().toISOString(),
        profiles: normalizeCharacterProfileMap(store?.profiles)
    };

    fs.mkdirSync(path.dirname(characterProfileJsonPath), { recursive: true });
    const tempPath = `${characterProfileJsonPath}.tmp`;
    fs.writeFileSync(tempPath, `${JSON.stringify(normalizedStore, null, 2)}\n`, 'utf8');
    fs.renameSync(tempPath, characterProfileJsonPath);
}

function createMemoTab(tab = {}, fallbackTitle = 'メモ') {
    const title = normalizeText(tab?.title) || fallbackTitle;
    const text = normalizeMemoTextValue(tab?.text);
    const id = normalizeText(tab?.id) || `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    return {
        id,
        title: title.slice(0, 40),
        text
    };
}

function normalizeMemoEntry(entry = {}, fallbackTitle = 'メモ', options = {}) {
    const allowEmpty = Boolean(options?.allowEmpty);
    const tabsRaw = Array.isArray(entry?.tabs) ? entry.tabs : [];
    const tabs = tabsRaw
        .map((tab, index) => createMemoTab(tab, `${fallbackTitle}${index > 0 ? index + 1 : ''}`))
        .filter((tab) => tab && tab.id);
    if (!tabs.length && !allowEmpty) {
        tabs.push(createMemoTab({ title: fallbackTitle, text: '' }, fallbackTitle));
    }

    const activeTabIdRaw = normalizeText(entry?.activeTabId);
    const activeTabId = tabs.some((tab) => tab.id === activeTabIdRaw)
        ? activeTabIdRaw
        : (tabs[0]?.id || '');

    return { tabs, activeTabId };
}

function normalizeMemoData(data = {}, options = {}) {
    const characterAllowEmptyTabs = Boolean(options?.characterAllowEmptyTabs);
    const source = data && typeof data === 'object' ? data : {};
    const shared = normalizeMemoEntry(source?.shared, '共有メモ');
    const charactersRaw = source?.characters && typeof source.characters === 'object'
        ? source.characters
        : {};
    const characters = {};
    Object.entries(charactersRaw).forEach(([name, entry]) => {
        const key = normalizeText(name);
        if (!key) return;
        characters[key] = normalizeMemoEntry(entry, 'メモ', { allowEmpty: characterAllowEmptyTabs });
    });
    return {
        format: 'multi-v1',
        shared,
        characters
    };
}

function convertLegacyMemoDataForPlayer(playerMemo = {}) {
    const legacy = playerMemo && typeof playerMemo === 'object' ? playerMemo : {};
    if (normalizeText(legacy?.format) === 'multi-v1') {
        return normalizeMemoData(legacy);
    }

    const characters = {};
    Object.entries(legacy).forEach(([name, entry]) => {
        const key = normalizeText(name);
        if (!key) return;
        const text = String(entry?.text ?? '');
        const updatedAt = entry?.updatedAt || null;
        const memoEntry = normalizeMemoEntry({
            tabs: [{ id: `legacy-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, title: 'メモ', text }],
            activeTabId: ''
        }, 'メモ');
        if (updatedAt) {
            memoEntry.updatedAt = updatedAt;
        }
        characters[key] = memoEntry;
    });

    return normalizeMemoData({
        shared: { tabs: [{ title: '共有メモ', text: '' }] },
        characters
    });
}

function splitProfileFromMemoEntry(entry = {}) {
    const normalized = normalizeMemoEntry(entry, 'メモ', { allowEmpty: true });
    const tabs = [];
    let profileText = '';

    normalized.tabs.forEach((tab, index) => {
        if (isProfileMemoTab(tab, index)) {
            if (!profileText) {
                profileText = normalizeMemoTextValue(tab?.text);
            }
            return;
        }
        tabs.push(createMemoTab(tab, `メモ${tabs.length > 0 ? tabs.length + 1 : ''}`));
    });

    const activeTabIdRaw = normalizeText(normalized.activeTabId);
    const activeTabId = tabs.some((tab) => tab.id === activeTabIdRaw)
        ? activeTabIdRaw
        : (tabs[0]?.id || '');

    return {
        profileText: normalizeMemoTextValue(profileText),
        entry: { tabs, activeTabId }
    };
}

function injectProfileIntoMemoEntry(entry = {}, profileText = '') {
    const normalized = normalizeMemoEntry(entry, 'メモ', { allowEmpty: true });
    const profileTab = createMemoTab({
        id: MEMO_PROFILE_TAB_ID,
        title: MEMO_PROFILE_TAB_TITLE,
        text: normalizeMemoTextValue(profileText)
    }, MEMO_PROFILE_TAB_TITLE);
    const tabsWithoutProfile = normalized.tabs.filter((tab, index) => !isProfileMemoTab(tab, index));
    const tabs = [profileTab, ...tabsWithoutProfile];

    const activeTabIdRaw = normalizeText(normalized.activeTabId);
    const activeTabId = tabs.some((tab) => tab.id === activeTabIdRaw)
        ? activeTabIdRaw
        : profileTab.id;

    return { tabs, activeTabId };
}

function mergeCharacterProfilesIntoMemoData(playerMemo = {}, characterProfiles = {}, requestedCharacterNames = []) {
    const normalizedPlayerMemo = normalizeMemoData(playerMemo, { characterAllowEmptyTabs: true });
    const normalizedProfiles = normalizeCharacterProfileMap(characterProfiles);
    const characters = {};
    const characterNames = new Set([
        ...Object.keys(normalizedPlayerMemo.characters || {})
    ]);

    (Array.isArray(requestedCharacterNames) ? requestedCharacterNames : [])
        .map((name) => normalizeText(name))
        .filter(Boolean)
        .forEach((name) => {
            if (normalizedPlayerMemo.characters?.[name] || normalizedProfiles?.[name]) {
                characterNames.add(name);
            }
        });

    characterNames.forEach((name) => {
        const key = normalizeText(name);
        if (!key) return;
        const { profileText: embeddedProfileText } = splitProfileFromMemoEntry(normalizedPlayerMemo.characters?.[key] || {});
        const storedProfileText = normalizeMemoTextValue(normalizedProfiles?.[key]?.text);
        const profileText = storedProfileText || embeddedProfileText || '';
        characters[key] = injectProfileIntoMemoEntry(
            normalizedPlayerMemo.characters?.[key] || {},
            profileText
        );
    });

    return {
        format: 'multi-v1',
        shared: normalizeMemoEntry(normalizedPlayerMemo.shared, '共有メモ'),
        characters
    };
}

function mergeCharacterProfileMaps(base = {}, incoming = {}) {
    const merged = normalizeCharacterProfileMap(base);
    const source = normalizeCharacterProfileMap(incoming);
    Object.entries(source).forEach(([name, entry]) => {
        const key = normalizeText(name);
        if (!key) return;
        const current = normalizeCharacterProfileEntry(merged[key]);
        const next = normalizeCharacterProfileEntry(entry);

        if (!merged[key]) {
            merged[key] = next;
            return;
        }

        const currentText = normalizeMemoTextValue(current.text);
        const nextText = normalizeMemoTextValue(next.text);
        if (!currentText && nextText) {
            current.text = nextText;
        }
        if (!current.updatedAt && next.updatedAt) {
            current.updatedAt = next.updatedAt;
        }
        merged[key] = current;
    });
    return merged;
}

function collectEmbeddedProfilesFromMemoStore(memos = {}) {
    const source = memos && typeof memos === 'object' && !Array.isArray(memos) ? memos : {};
    const profiles = {};
    Object.values(source).forEach((playerMemo) => {
        const normalizedPlayerMemo = convertLegacyMemoDataForPlayer(playerMemo || {});
        Object.entries(normalizedPlayerMemo.characters || {}).forEach(([name, entry]) => {
            const key = normalizeText(name);
            if (!key) return;
            const { profileText } = splitProfileFromMemoEntry(entry);
            const text = normalizeMemoTextValue(profileText);
            if (!text) return;
            if (!profiles[key]) {
                profiles[key] = { text, updatedAt: null };
            }
        });
    });
    return normalizeCharacterProfileMap(profiles);
}

function splitProfilesFromMemoData(memoData = {}, existingProfiles = {}, profileUpdatedAt = null) {
    const normalizedMemo = normalizeMemoData(memoData, { characterAllowEmptyTabs: true });
    const mergedProfiles = normalizeCharacterProfileMap(existingProfiles);
    const characters = {};

    Object.entries(normalizedMemo.characters || {}).forEach(([name, entry]) => {
        const key = normalizeText(name);
        if (!key) return;
        const { profileText, entry: playerEntry } = splitProfileFromMemoEntry(entry);
        const text = normalizeMemoTextValue(profileText);
        if (text) {
            mergedProfiles[key] = {
                text,
                updatedAt: profileUpdatedAt || mergedProfiles?.[key]?.updatedAt || null
            };
        }
        characters[key] = normalizeMemoEntry(playerEntry, 'メモ', { allowEmpty: true });
    });

    return {
        memoData: {
            format: 'multi-v1',
            shared: normalizeMemoEntry(normalizedMemo.shared, '共有メモ'),
            characters
        },
        profiles: mergedProfiles
    };
}

function hasCharacterProfileDifference(a = {}, b = {}) {
    return JSON.stringify(normalizeCharacterProfileMap(a)) !== JSON.stringify(normalizeCharacterProfileMap(b));
}

function resolveCharacterProfilesForMemoStore(battleMemoStore = {}) {
    const profileStore = readCharacterProfileStore();
    let profiles = normalizeCharacterProfileMap(profileStore.profiles);
    profiles = mergeCharacterProfileMaps(profiles, battleMemoStore?.legacyCharacterProfiles);
    profiles = mergeCharacterProfileMaps(profiles, collectEmbeddedProfilesFromMemoStore(battleMemoStore?.memos));

    if (hasCharacterProfileDifference(profileStore.profiles, profiles)) {
        writeCharacterProfileStore({
            version: 1,
            updatedAt: new Date().toISOString(),
            profiles
        });
    }

    return profiles;
}

function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isSkillSetPresetEntry(value) {
    if (!isPlainObject(value)) return false;
    const keys = Object.keys(value);
    if (!keys.length) return true;
    return (
        Object.prototype.hasOwnProperty.call(value, 'payload')
        || Object.prototype.hasOwnProperty.call(value, 'updatedAt')
        || Object.prototype.hasOwnProperty.call(value, 'icon')
    );
}

function looksLikeSkillSetPresetCollection(value) {
    if (!isPlainObject(value)) return false;
    const entries = Object.values(value);
    if (!entries.length) return true;
    return entries.every((entry) => isSkillSetPresetEntry(entry));
}

function normalizeSkillSetPresetEntry(entry = {}) {
    const source = isPlainObject(entry) ? entry : {};
    return {
        updatedAt: normalizeText(source?.updatedAt) || null,
        icon: normalizePresetIconName(source?.icon),
        payload: isPlainObject(source?.payload) ? source.payload : {}
    };
}

function normalizeSkillSetPresetCollection(collection = {}) {
    const source = isPlainObject(collection) ? collection : {};
    const normalized = {};
    Object.entries(source).forEach(([presetName, entry]) => {
        const key = normalizeText(presetName);
        if (!key || !isPlainObject(entry)) return;
        normalized[key] = normalizeSkillSetPresetEntry(entry);
    });
    return normalized;
}

function getSkillSetPresetEntryTimeMs(entry = {}) {
    const value = Date.parse(normalizeText(entry?.updatedAt));
    return Number.isFinite(value) ? value : -1;
}

function shouldReplaceSkillSetPresetEntry(currentEntry = {}, incomingEntry = {}) {
    const currentTime = getSkillSetPresetEntryTimeMs(currentEntry);
    const incomingTime = getSkillSetPresetEntryTimeMs(incomingEntry);
    if (incomingTime !== currentTime) {
        return incomingTime > currentTime;
    }
    const currentPayloadSize = Object.keys(isPlainObject(currentEntry?.payload) ? currentEntry.payload : {}).length;
    const incomingPayloadSize = Object.keys(isPlainObject(incomingEntry?.payload) ? incomingEntry.payload : {}).length;
    return incomingPayloadSize > currentPayloadSize;
}

function mergeSkillSetPresetCollection(baseCollection = {}, incomingCollection = {}) {
    const merged = normalizeSkillSetPresetCollection(baseCollection);
    const source = normalizeSkillSetPresetCollection(incomingCollection);
    Object.entries(source).forEach(([presetName, entry]) => {
        const key = normalizeText(presetName);
        if (!key) return;
        const current = merged[key];
        if (!current || shouldReplaceSkillSetPresetEntry(current, entry)) {
            merged[key] = entry;
        }
    });
    return merged;
}

function normalizeSkillSetPresetStorePresets(presets = {}) {
    const source = isPlainObject(presets) ? presets : {};
    const normalized = {};

    Object.entries(source).forEach(([topKey, topValue]) => {
        const normalizedTopKey = normalizeText(topKey);
        if (!normalizedTopKey || !isPlainObject(topValue)) return;

        if (looksLikeSkillSetPresetCollection(topValue)) {
            normalized[normalizedTopKey] = mergeSkillSetPresetCollection(
                normalized[normalizedTopKey],
                topValue
            );
            return;
        }

        Object.entries(topValue).forEach(([characterName, maybeCollection]) => {
            const normalizedCharacterName = normalizeText(characterName);
            if (!normalizedCharacterName || !looksLikeSkillSetPresetCollection(maybeCollection)) return;
            normalized[normalizedCharacterName] = mergeSkillSetPresetCollection(
                normalized[normalizedCharacterName],
                maybeCollection
            );
        });
    });

    return normalized;
}

function readSkillSetPresetStore() {
    if (!fs.existsSync(skillSetPresetJsonPath)) {
        return { version: 1, updatedAt: null, presets: {} };
    }

    const raw = fs.readFileSync(skillSetPresetJsonPath, 'utf8');
    if (!String(raw || '').trim()) {
        return { version: 1, updatedAt: null, presets: {} };
    }

    const parsed = JSON.parse(raw);
    const presets = normalizeSkillSetPresetStorePresets(parsed?.presets);

    return {
        version: 1,
        updatedAt: parsed?.updatedAt || null,
        presets
    };
}

function writeSkillSetPresetStore(store) {
    const normalizedStore = {
        version: 1,
        updatedAt: store?.updatedAt || new Date().toISOString(),
        presets: normalizeSkillSetPresetStorePresets(store?.presets)
    };

    fs.mkdirSync(path.dirname(skillSetPresetJsonPath), { recursive: true });
    const tempPath = `${skillSetPresetJsonPath}.tmp`;
    fs.writeFileSync(tempPath, `${JSON.stringify(normalizedStore, null, 2)}\n`, 'utf8');
    fs.renameSync(tempPath, skillSetPresetJsonPath);
}

function dedupeBy(items, selector) {
    const map = new Map();
    (Array.isArray(items) ? items : []).forEach((item) => {
        const key = normalizeText(selector(item));
        if (!key) return;
        if (!map.has(key)) {
            map.set(key, item);
        }
    });
    return Array.from(map.values());
}

function getSheet(workbook, names) {
    if (!workbook || !workbook.Sheets) return null;
    for (const name of names) {
        if (workbook.Sheets[name]) return workbook.Sheets[name];
    }
    return null;
}

function readSheet(workbook, names, defval = 0) {
    const sheet = getSheet(workbook, names);
    if (!sheet) return [];
    return XLSX.utils.sheet_to_json(sheet, { defval });
}

// キャッシュ
let cachedUsers = [];
let cachedCharacters = [];
let cachedClasses = [];
let cachedSkills = [];
let cachedItems = [];
let cachedShop = [];
let cachedTeam = [];
let cachedBattle = [];
let cachedBody = [];

// Excel 再読込制御
let excelLastMtimeMs = 0;
let excelReloadInProgress = false;
let excelReloadTimer = null;
let excelWatcher = null;

function getExcelMtimeMs() {
    try {
        const stat = fs.statSync(excelAbsolutePath);
        return Number(stat?.mtimeMs) || 0;
    } catch (error) {
        return 0;
    }
}

function loadExcelData(forceReload = false) {
    if (excelReloadInProgress) return false;

    const currentMtimeMs = getExcelMtimeMs();
    if (!forceReload && currentMtimeMs && currentMtimeMs === excelLastMtimeMs) {
        return false;
    }

    excelReloadInProgress = true;
    try {
        const workbook = XLSX.readFile(filePath);

        cachedUsers = readSheet(workbook, SHEET_NAMES.user, null);
        cachedCharacters = readSheet(workbook, SHEET_NAMES.character, null);
        cachedClasses = dedupeBy(
            readSheet(workbook, SHEET_NAMES.classes, 0),
            (item) => pickFirstText(item, FIELD_KEYS.className)
        );
        cachedSkills = dedupeBy(
            readSheet(workbook, SHEET_NAMES.skills, 0),
            (item) => pickFirstText(item, FIELD_KEYS.skillName)
        );
        cachedItems = dedupeBy(
            readSheet(workbook, SHEET_NAMES.items, 0),
            (item) => pickFirstText(item, FIELD_KEYS.name)
        );
        cachedShop = dedupeBy(
            readSheet(workbook, SHEET_NAMES.shop, 0),
            (item) => pickFirstText(item, FIELD_KEYS.skillName)
        );
        cachedTeam = dedupeBy(
            readSheet(workbook, SHEET_NAMES.team, 0),
            (item) => pickFirstText(item, FIELD_KEYS.teamName)
        );
        cachedBattle = dedupeBy(
            readSheet(workbook, SHEET_NAMES.battle, 0),
            (item) => pickFirstText(item, FIELD_KEYS.name)
        );
        cachedBody = dedupeBy(
            readSheet(workbook, SHEET_NAMES.body, 0),
            (item) => pickFirstText(item, FIELD_KEYS.bodyNo)
        );

        excelLastMtimeMs = currentMtimeMs || getExcelMtimeMs();
        console.log('Excel data loaded successfully');
        return true;
    } catch (error) {
        console.error('Failed to load Excel data:', error);
        return false;
    } finally {
        excelReloadInProgress = false;
    }
}

function scheduleExcelReload(reason = 'watch') {
    if (excelReloadTimer) {
        clearTimeout(excelReloadTimer);
    }
    excelReloadTimer = setTimeout(() => {
        const loaded = loadExcelData(true);
        if (loaded) {
            console.log(`[excel] reloaded (${reason})`);
            return;
        }
        // 保存中に一時ロックされるケースの再試行
        setTimeout(() => {
            loadExcelData(true);
        }, 800);
    }, 300);
}

function watchExcelFile() {
    if (excelWatcher) return;
    const watchDir = path.dirname(excelAbsolutePath);
    const watchFileName = path.basename(excelAbsolutePath);

    try {
        excelWatcher = fs.watch(watchDir, (eventType, filename) => {
            if (!filename) return;
            if (String(filename) !== watchFileName) return;
            scheduleExcelReload(`fs.watch:${eventType}`);
        });
        console.log(`[excel] watching ${excelAbsolutePath}`);
    } catch (error) {
        console.warn('[excel] fs.watch setup failed:', error?.message || error);
    }
}

loadExcelData(true);
setInterval(() => loadExcelData(false), 60 * 60 * 1000);
watchExcelFile();

// 監視取りこぼし時の最終保険
router.use((req, res, next) => {
    const currentMtimeMs = getExcelMtimeMs();
    if (currentMtimeMs && currentMtimeMs !== excelLastMtimeMs) {
        loadExcelData(true);
    }
    next();
});

router.get('/character', (req, res) => {
    try {
        const characterName = normalizeText(req.query.name);
        if (!characterName) {
            return res.status(400).json({ success: false, message: 'name is required' });
        }

        if (!Array.isArray(cachedCharacters)) {
            console.error('character cache is invalid');
            return res.status(500).json({ success: false, message: 'character cache is invalid' });
        }

        const character = cachedCharacters.find((c) => pickFirstText(c, FIELD_KEYS.name) === characterName);
        if (!character || typeof character !== 'object') {
            return res.status(404).json({ success: false, message: 'character not found' });
        }

        const processedCharacter = Object.fromEntries(
            Object.entries(character).map(([key, value]) => [
                key,
                value === undefined || value === '' ? 0 : value
            ])
        );

        return res.status(200).json({ success: true, data: processedCharacter });
    } catch (error) {
        console.error('character fetch error:', error);
        return res.status(500).json({ success: false, message: 'failed to fetch character data' });
    }
});

router.post('/login', (req, res) => {
    const { username, password } = req.body;

    const user = cachedUsers.find(
        (u) => normalizeText(u.ID) === normalizeText(username)
            && normalizeText(u.password) === normalizeText(password)
    );

    if (!user) {
        return res.status(401).send({ message: 'invalid id or password' });
    }

    const characterSlots = Object.keys(user)
        .map((key) => {
            const match = String(key).match(/^character(\d+)$/i);
            if (!match) return null;
            return {
                key,
                order: Number(match[1])
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.order - b.order);

    const characters = [];
    for (const slot of characterSlots) {
        const characterName = user[slot.key];
        if (!characterName) continue;

        const characterData = cachedCharacters.find(
            (c) => pickFirstText(c, FIELD_KEYS.name) === normalizeText(characterName)
        );
        if (!characterData) continue;

        characters.push({
            名前: pickFirstValue(characterData, FIELD_KEYS.name),
            二つ名: pickFirstValue(characterData, FIELD_KEYS.title),
            Lv: characterData.Lv,
            Ef: characterData.Ef,
            HP: characterData.HP,
            MP: characterData.MP,
            ST: characterData.ST,
            攻撃: pickFirstValue(characterData, FIELD_KEYS.attack),
            防御: pickFirstValue(characterData, FIELD_KEYS.defense),
            魔力: pickFirstValue(characterData, FIELD_KEYS.magic),
            魔防: pickFirstValue(characterData, FIELD_KEYS.magicDefense),
            速度: pickFirstValue(characterData, FIELD_KEYS.speed),
            命中: pickFirstValue(characterData, FIELD_KEYS.hit),
            SIZ: characterData.SIZ,
            APP: characterData.APP,
            能力値: pickFirstValue(characterData, FIELD_KEYS.ability),
            持ち物: pickFirstValue(characterData, FIELD_KEYS.items),
            所持金: pickFirstValue(characterData, FIELD_KEYS.money),
            メモ: pickFirstValue(characterData, FIELD_KEYS.memo)
        });
    }

    res.status(200).send({ message: 'ログイン成功', characters });
});

router.post('/skills', (req, res) => {
    let { skillNames } = req.body;
    if (!Array.isArray(skillNames)) {
        skillNames = [skillNames];
    }
    const nameSet = new Set(skillNames.map((name) => normalizeText(name)).filter(Boolean));

    const matchedSkills = cachedSkills
        .filter((skill) => nameSet.has(pickFirstText(skill, FIELD_KEYS.skillName)))
        .reduce((grouped, skill) => {
            const type = pickFirstText(skill, FIELD_KEYS.skillType);
            if (!type) return grouped;
            if (!grouped[type]) grouped[type] = [];
            grouped[type].push(skill);
            return grouped;
        }, {});

    res.json({ success: true, skills: matchedSkills });
});

router.post('/getSkillByName', (req, res) => {
    let { skillNames } = req.body;
    if (!Array.isArray(skillNames)) {
        skillNames = [skillNames];
    }

    if (!skillNames || skillNames.length === 0) {
        return res.status(400).json({ success: false, message: 'skillNames is required' });
    }

    const nameSet = new Set(skillNames.map((name) => normalizeText(name)).filter(Boolean));
    const matchedSkills = cachedSkills.filter((skill) => nameSet.has(pickFirstText(skill, FIELD_KEYS.skillName)));

    if (matchedSkills.length === 0) {
        return res.status(404).json({ success: false, message: 'skills not found' });
    }

    res.json({ success: true, skills: matchedSkills });
});

router.post('/magics', (req, res) => {
    let { skillNames } = req.body;
    if (!Array.isArray(skillNames)) {
        skillNames = [skillNames];
    }
    const nameSet = new Set(skillNames.map((name) => normalizeText(name)).filter(Boolean));

    const matchedSkills = cachedSkills
        .filter((skill) => nameSet.has(pickFirstText(skill, FIELD_KEYS.skillName)))
        .reduce((grouped, skill) => {
            const type = pickFirstText(skill, FIELD_KEYS.skillType);
            if (!type) return grouped;
            if (!grouped[type]) grouped[type] = [];
            grouped[type].push(skill);
            return grouped;
        }, {});

    res.json({ success: true, skills: matchedSkills });
});

router.post('/classes', (req, res) => {
    const { classList } = req.body;
    const classesToMatch = Array.isArray(classList) ? classList : [classList];
    const nameSet = new Set(classesToMatch.map((name) => normalizeText(name)).filter(Boolean));

    const matchedClasses = cachedClasses.filter(
        (classData) => nameSet.has(pickFirstText(classData, FIELD_KEYS.className))
    );

    res.json({ success: true, classData: matchedClasses });
});

router.post('/body', (req, res) => {
    try {
        const { bodyTypeList } = req.body;
        const typesToMatch = Array.isArray(bodyTypeList)
            ? bodyTypeList.map((v) => normalizeText(v)).filter(Boolean)
            : (bodyTypeList ? [normalizeText(bodyTypeList)] : []);

        const typeSet = new Set(typesToMatch);
        const matchedBodyTypes = cachedBody.filter((bodyData) => (
            typeSet.has(pickFirstText(bodyData, FIELD_KEYS.bodyNo))
        ));

        res.json({ success: true, bodyData: matchedBodyTypes });
    } catch (error) {
        console.error('body fetch error:', error);
        res.status(500).json({ success: false, message: 'failed to fetch body data' });
    }
});

router.post('/items', (req, res) => {
    const { itemList } = req.body;
    const itemsToMatch = Array.isArray(itemList) ? itemList : [itemList];

    if (!cachedItems || !Array.isArray(cachedItems)) {
        console.error('cachedItems is invalid');
        return res.status(500).json({ success: false, message: 'failed to fetch item data' });
    }

    const matchedItems = [];
    itemsToMatch.forEach((itemName) => {
        if (!itemName) return;
        const cleanedItemName = String(itemName).split('[')[0].trim();
        const foundItems = cachedItems.filter(
            (itemData) => pickFirstText(itemData, FIELD_KEYS.name) === cleanedItemName
        );
        matchedItems.push(...foundItems);
    });

    res.json({ success: true, itemData: matchedItems });
});

router.post('/update-data', (req, res) => {
    // 現在は no-op（将来の永続化用エンドポイント）
    void req.body;
    res.json({ message: 'Data updated successfully' });
});

router.post('/memo/load', (req, res) => {
    try {
        const playerId = normalizeText(req.body?.playerId) || 'guest';
        const characterName = normalizeText(req.body?.characterName) || '不明';
        const store = readBattleMemoStore();
        const playerMemo = convertLegacyMemoDataForPlayer(store?.memos?.[playerId] || {});
        const entry = normalizeMemoEntry(playerMemo?.characters?.[characterName] || {}, 'メモ');
        const activeTab = entry.tabs.find((tab) => tab.id === entry.activeTabId) || entry.tabs[0];

        return res.status(200).json({
            success: true,
            text: String(activeTab?.text || ''),
            updatedAt: null
        });
    } catch (error) {
        console.error('memo load error:', error);
        return res.status(500).json({
            success: false,
            message: 'failed to load memo'
        });
    }
});

router.post('/memo/save', (req, res) => {
    try {
        const playerId = normalizeText(req.body?.playerId) || 'guest';
        const characterName = normalizeText(req.body?.characterName) || '不明';
        const text = String(req.body?.text || '');

        if (text.length > 200000) {
            return res.status(400).json({
                success: false,
                message: 'memo text is too long'
            });
        }

        const nowIso = new Date().toISOString();
        const store = readBattleMemoStore();
        const playerMemo = convertLegacyMemoDataForPlayer(store?.memos?.[playerId] || {});
        const characterEntry = normalizeMemoEntry(playerMemo?.characters?.[characterName] || {}, 'メモ');
        const activeTab = characterEntry.tabs.find((tab) => tab.id === characterEntry.activeTabId) || characterEntry.tabs[0];
        activeTab.text = text;
        playerMemo.characters[characterName] = characterEntry;
        store.memos[playerId] = normalizeMemoData(playerMemo);
        store.updatedAt = nowIso;
        writeBattleMemoStore(store);

        return res.status(200).json({
            success: true,
            updatedAt: nowIso
        });
    } catch (error) {
        console.error('memo save error:', error);
        return res.status(500).json({
            success: false,
            message: 'failed to save memo'
        });
    }
});

router.post('/memo/all/load', (req, res) => {
    try {
        const playerId = normalizeText(req.body?.playerId) || 'guest';
        const requestedCharacterNames = Array.isArray(req.body?.characterNames)
            ? req.body.characterNames.map((name) => normalizeText(name)).filter(Boolean)
            : [];
        const store = readBattleMemoStore();
        const profiles = resolveCharacterProfilesForMemoStore(store);
        const normalized = convertLegacyMemoDataForPlayer(store?.memos?.[playerId] || {});
        const { memoData: normalizedPlayerMemo } = splitProfilesFromMemoData(normalized, profiles);
        const mergedForClient = mergeCharacterProfilesIntoMemoData(
            normalizedPlayerMemo,
            profiles,
            requestedCharacterNames
        );

        // 旧形式から読み込まれた場合も新形式で保持
        store.memos[playerId] = normalizedPlayerMemo;
        writeBattleMemoStore(store);

        return res.status(200).json({
            success: true,
            data: mergedForClient
        });
    } catch (error) {
        console.error('memo all load error:', error);
        return res.status(500).json({
            success: false,
            message: 'failed to load all memos'
        });
    }
});

router.post('/memo/all/save', (req, res) => {
    try {
        const playerId = normalizeText(req.body?.playerId) || 'guest';
        const data = normalizeMemoData(req.body?.data || {}, { characterAllowEmptyTabs: true });
        const nowIso = new Date().toISOString();
        const store = readBattleMemoStore();
        const existingProfiles = resolveCharacterProfilesForMemoStore(store);
        const { memoData: playerMemo, profiles } = splitProfilesFromMemoData(data, existingProfiles, nowIso);
        writeCharacterProfileStore({
            version: 1,
            updatedAt: nowIso,
            profiles
        });

        store.memos[playerId] = {
            format: 'multi-v1',
            shared: normalizeMemoEntry(playerMemo.shared, '共有メモ'),
            characters: playerMemo.characters
        };
        store.updatedAt = nowIso;
        writeBattleMemoStore(store);
        return res.status(200).json({ success: true, updatedAt: store.updatedAt });
    } catch (error) {
        console.error('memo all save error:', error);
        return res.status(500).json({
            success: false,
            message: 'failed to save all memos'
        });
    }
});

router.get('/skill-set/icons', (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            icons: listSkillSetIcons()
        });
    } catch (error) {
        console.error('skill-set icons error:', error);
        return res.status(500).json({
            success: false,
            message: 'failed to list skill-set icons'
        });
    }
});

router.post('/skill-set/list', (req, res) => {
    try {
        const characterName = normalizeText(req.body?.characterName) || '不明';
        const store = readSkillSetPresetStore();
        const characterPresets = store?.presets?.[characterName] || {};
        const list = Object.entries(characterPresets)
            .map(([name, entry]) => ({
                name: String(name || ''),
                updatedAt: entry?.updatedAt || null,
                icon: normalizePresetIconName(entry?.icon),
                iconUrl: buildPresetIconUrl(entry?.icon)
            }))
            .filter((entry) => entry.name)
            .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));

        return res.status(200).json({
            success: true,
            presets: list
        });
    } catch (error) {
        console.error('skill-set list error:', error);
        return res.status(500).json({
            success: false,
            message: 'failed to list skill-set presets'
        });
    }
});

router.post('/skill-set/load', (req, res) => {
    try {
        const characterName = normalizeText(req.body?.characterName) || '不明';
        const presetName = normalizeText(req.body?.presetName);
        if (!presetName) {
            return res.status(400).json({
                success: false,
                message: 'presetName is required'
            });
        }

        const store = readSkillSetPresetStore();
        const entry = store?.presets?.[characterName]?.[presetName];
        if (!entry || typeof entry !== 'object') {
            return res.status(404).json({
                success: false,
                message: 'skill-set preset not found'
            });
        }

        return res.status(200).json({
            success: true,
            preset: {
                name: presetName,
                updatedAt: entry?.updatedAt || null,
                icon: normalizePresetIconName(entry?.icon),
                iconUrl: buildPresetIconUrl(entry?.icon),
                payload: entry?.payload || {}
            }
        });
    } catch (error) {
        console.error('skill-set load error:', error);
        return res.status(500).json({
            success: false,
            message: 'failed to load skill-set preset'
        });
    }
});

router.post('/skill-set/save', (req, res) => {
    try {
        const characterName = normalizeText(req.body?.characterName) || '不明';
        const presetName = normalizeText(req.body?.presetName);
        const hasIconField = Object.prototype.hasOwnProperty.call((req.body || {}), 'icon');
        const presetIcon = hasIconField ? normalizePresetIconName(req.body?.icon) : null;
        const payload = (req.body?.payload && typeof req.body.payload === 'object')
            ? req.body.payload
            : {};

        if (!presetName) {
            return res.status(400).json({
                success: false,
                message: 'presetName is required'
            });
        }

        const nowIso = new Date().toISOString();
        const store = readSkillSetPresetStore();
        if (!store.presets[characterName] || typeof store.presets[characterName] !== 'object') {
            store.presets[characterName] = {};
        }
        const existingEntry = store.presets[characterName][presetName];
        const nextIcon = hasIconField
            ? presetIcon
            : normalizePresetIconName(existingEntry?.icon);

        store.presets[characterName][presetName] = {
            updatedAt: nowIso,
            icon: nextIcon,
            payload
        };
        store.updatedAt = nowIso;
        writeSkillSetPresetStore(store);

        return res.status(200).json({
            success: true,
            preset: {
                name: presetName,
                updatedAt: nowIso,
                icon: nextIcon,
                iconUrl: buildPresetIconUrl(nextIcon)
            }
        });
    } catch (error) {
        console.error('skill-set save error:', error);
        return res.status(500).json({
            success: false,
            message: 'failed to save skill-set preset'
        });
    }
});

router.post('/skill-set/delete', (req, res) => {
    try {
        const characterName = normalizeText(req.body?.characterName) || '不明';
        const presetName = normalizeText(req.body?.presetName);
        if (!presetName) {
            return res.status(400).json({
                success: false,
                message: 'presetName is required'
            });
        }

        const store = readSkillSetPresetStore();
        if (
            store?.presets?.[characterName]
            && Object.prototype.hasOwnProperty.call(store.presets[characterName], presetName)
        ) {
            delete store.presets[characterName][presetName];
            store.updatedAt = new Date().toISOString();
            writeSkillSetPresetStore(store);
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('skill-set delete error:', error);
        return res.status(500).json({
            success: false,
            message: 'failed to delete skill-set preset'
        });
    }
});

router.post('/skill-set/rename', (req, res) => {
    try {
        const characterName = normalizeText(req.body?.characterName) || '不明';
        const presetName = normalizeText(req.body?.presetName);
        const newPresetName = normalizeText(req.body?.newPresetName);
        const overwrite = Boolean(req.body?.overwrite);
        const hasIconField = Object.prototype.hasOwnProperty.call((req.body || {}), 'icon');
        const presetIcon = hasIconField ? normalizePresetIconName(req.body?.icon) : null;

        if (!presetName) {
            return res.status(400).json({
                success: false,
                message: 'presetName is required'
            });
        }
        if (!newPresetName) {
            return res.status(400).json({
                success: false,
                message: 'newPresetName is required'
            });
        }

        const store = readSkillSetPresetStore();
        if (!store.presets[characterName] || typeof store.presets[characterName] !== 'object') {
            store.presets[characterName] = {};
        }
        const characterStore = store.presets[characterName];
        const currentEntry = characterStore[presetName];

        if (!currentEntry || typeof currentEntry !== 'object') {
            return res.status(404).json({
                success: false,
                message: 'skill-set preset not found'
            });
        }

        const isSameName = presetName === newPresetName;
        if (!isSameName && Object.prototype.hasOwnProperty.call(characterStore, newPresetName) && !overwrite) {
            return res.status(409).json({
                success: false,
                message: 'skill-set preset already exists'
            });
        }

        const nowIso = new Date().toISOString();
        const nextEntry = {
            updatedAt: nowIso,
            icon: hasIconField
                ? presetIcon
                : normalizePresetIconName(currentEntry?.icon),
            payload: currentEntry?.payload && typeof currentEntry.payload === 'object'
                ? currentEntry.payload
                : {}
        };
        characterStore[newPresetName] = nextEntry;
        if (!isSameName) {
            delete characterStore[presetName];
        }
        store.updatedAt = nowIso;
        writeSkillSetPresetStore(store);

        return res.status(200).json({
            success: true,
            preset: {
                name: newPresetName,
                updatedAt: nowIso,
                icon: normalizePresetIconName(nextEntry?.icon),
                iconUrl: buildPresetIconUrl(nextEntry?.icon)
            }
        });
    } catch (error) {
        console.error('skill-set rename error:', error);
        return res.status(500).json({
            success: false,
            message: 'failed to rename skill-set preset'
        });
    }
});

router.post('/select_dataLog', (req, res) => {
    try {
        const payload = req.body?.skillNames || {};
        const now = new Date();
        const timestamp = now.toISOString();
        const requestId = `log-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        const skills = Array.isArray(payload.skills) ? payload.skills : [];
        const rollResults = Array.isArray(payload.rollResults) ? payload.rollResults : [];
        const skillLines = skills
            .map((skill) => sanitizeTsvValue(skill?.name))
            .filter((name) => name !== '');
        const diceLine = rollResults.map((result) => sanitizeTsvValue(result)).join('\t');
        const block = [
            `timestamp\t${sanitizeTsvValue(timestamp)}`,
            `requestId\t${sanitizeTsvValue(requestId)}`,
            sanitizeTsvValue(payload.name),
            sanitizeTsvValue(payload.attackOption),
            sanitizeTsvValue(payload.fullPower ? 1 : 0),
            ...skillLines,
            '',
            diceLine,
            ''
        ].join('\n');

        fs.mkdirSync(path.dirname(selectDataLogPath), { recursive: true });
        fs.appendFileSync(selectDataLogPath, `${block}\n`, 'utf8');

        res.status(200).json({
            success: true,
            message: 'Data logged successfully',
            requestId
        });
    } catch (error) {
        console.error('select_dataLog write error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to write select_dataLog'
        });
    }
});

module.exports = router;
