const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { getAppDataRoot, getLogsDirPath, getMongoConfig } = require('../storage/config');
const { withMongoClient } = require('../storage/mongo-client');

const gameDataDirPath = path.join(process.cwd(), 'game-data');
const gameDataSkillsJsonPath = path.join(gameDataDirPath, 'スキル.json');
const gameDataClassesJsonPath = path.join(gameDataDirPath, '職業.json');
const gameDataItemsJsonCandidates = [
    path.join(gameDataDirPath, '装備一覧.json'),
    path.join(gameDataDirPath, '装備.json'),
    path.join(gameDataDirPath, 'items.json'),
    path.join(gameDataDirPath, 'ItemList.json')
];
const gameDataBodyJsonCandidates = [
    path.join(gameDataDirPath, '肉体.json'),
    path.join(gameDataDirPath, 'body.json'),
    path.join(gameDataDirPath, 'Body.json')
];
const appDataRoot = getAppDataRoot();
const logsDirPath = getLogsDirPath();
const mongoConfig = getMongoConfig();
const useMongoPrimaryData = Boolean(
    mongoConfig.enabled
    && String(mongoConfig?.uri || '').trim()
);
const selectDataLogPath = path.join(logsDirPath, 'select_dataLog.txt');
const battleMemoJsonPath = path.join(logsDirPath, 'battle-memo.json');
const characterProfileJsonPath = path.join(logsDirPath, 'character-profiles.json');
const skillSetPresetJsonPath = path.join(logsDirPath, 'skill-set-presets.json');
const battleStateJsonPath = path.join(logsDirPath, 'battle-state.json');
const RETAINED_BUFF_INFINITE_TURNS = 9999999;
const skillSetIconDirName = '攻撃手段';
const skillSetIconDirPath = path.join(process.cwd(), 'public', 'images', skillSetIconDirName);
const MEMO_PROFILE_TAB_ID = '__profile__';
const MEMO_PROFILE_TAB_TITLE = 'プロフィール';
const GM_LOGIN_ID = 'GM';
const GM_LOGIN_PASSWORD = '11';
const GM_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const PLAYER_ACTIVE_TTL_MS = 3 * 60 * 1000;
const GM_DASHBOARD_LOG_LIMIT = 500;
const APP_STATE_COLLECTION = 'app_state';
const APP_STATE_KEYS = {
    battleMemo: 'battle-memo',
    battleState: 'battle-state',
    characterProfiles: 'character-profiles',
    skillSetPresets: 'skill-set-presets',
    selectDataLog: 'select-data-log'
};
const MONGO_COLLECTION = {
    presence: 'Presence'
};
const MONGO_ITEM_COLLECTION_CANDIDATES = ['ItemList', 'Items', 'Item'];
const SELECT_LOG_BUFFER_MAX = 50;
const SELECT_LOG_FLUSH_BATCH_SIZE = 25;
const SELECT_LOG_FLUSH_INTERVAL_MS = 5 * 60 * 1000;
const SELECT_LOG_IDLE_FLUSH_MS = 5 * 60 * 1000;
const SELECT_LOG_EXPORT_THRESHOLD_BYTES = 5 * 1024 * 1024;
const GAME_DATA_POLL_MS = 60 * 1000;
const MONGO_STATUS_CACHE_TTL_MS = 10 * 1000;
const LARGE_ITEM_JSON_STREAM_THRESHOLD_BYTES = 15 * 1024 * 1024;
const isRenderRuntime = Boolean(
    normalizeText(process.env.RENDER).toLowerCase() === 'true'
    || normalizeText(process.env.RENDER_SERVICE_ID)
    || normalizeText(process.env.RENDER_EXTERNAL_URL)
);
const useMongoItemsInRender = Boolean(useMongoPrimaryData && isRenderRuntime);

fs.mkdirSync(logsDirPath, { recursive: true });
console.log(`[storage] appDataRoot=${appDataRoot}`);
console.log(`[storage] logsDir=${logsDirPath}`);
console.log(`[storage] useMongoDB=${mongoConfig.enabled ? 'true' : 'false'}`);
console.log(`[storage] mongoPrimaryData=${useMongoPrimaryData ? 'true' : 'false'}`);
console.log(`[storage] mongoDbName=${mongoConfig.dbName}`);
console.log(`[storage] renderRuntime=${isRenderRuntime ? 'true' : 'false'}`);
console.log(`[storage] mongoItemsOnRender=${useMongoItemsInRender ? 'true' : 'false'}`);

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

function deepCloneJsonValue(value) {
    return JSON.parse(JSON.stringify(value));
}

function normalizeNameList(values) {
    return Array.from(new Set(
        (Array.isArray(values) ? values : [])
            .map((value) => normalizeText(value))
            .filter(Boolean)
    ));
}

function normalizeItemLookupName(value) {
    const normalized = normalizeText(value);
    if (!normalized) return '';
    return normalized.replace(/[\[［].*$/, '').trim();
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

function readJsonFileAsIs(filePath, fallbackValue) {
    if (!fs.existsSync(filePath)) {
        return deepCloneJsonValue(fallbackValue);
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!String(raw || '').trim()) {
        return deepCloneJsonValue(fallbackValue);
    }
    try {
        return JSON.parse(raw);
    } catch (error) {
        console.error(`read json parse error: ${filePath}`, error);
        return deepCloneJsonValue(fallbackValue);
    }
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

async function readCharacterProfileMapFromMongo(options = {}) {
    if (!canUseMongoStateStore()) return {};
    void options;
    const store = await readCharacterProfileStoreForRuntime();
    return normalizeCharacterProfileMap(store?.profiles);
}

async function writeCharacterProfileMapToMongo(playerId, profiles = {}, options = {}) {
    void playerId;
    const normalizedProfiles = normalizeCharacterProfileMap(profiles);
    const updatedAt = normalizeText(options?.updatedAt) || new Date().toISOString();
    await writeCharacterProfileStoreForRuntime({
        version: 1,
        updatedAt,
        profiles: normalizedProfiles
    });
    return Object.keys(normalizedProfiles).length;
}

async function resolveCharacterProfilesForMemoStore(battleMemoStore = {}, options = {}) {
    if (canUseMongoStateStore()) {
        const playerId = normalizeText(options?.playerId) || 'guest';
        const requestedCharacterNames = normalizeNameList(options?.characterNames);
        const mongoProfiles = await readCharacterProfileMapFromMongo({
            playerId,
            characterNames: requestedCharacterNames
        });
        const embeddedProfiles = mergeCharacterProfileMaps(
            normalizeCharacterProfileMap(battleMemoStore?.legacyCharacterProfiles),
            collectEmbeddedProfilesFromMemoStore(battleMemoStore?.memos)
        );
        const mergedProfiles = mergeCharacterProfileMaps(mongoProfiles, embeddedProfiles);

        if (hasCharacterProfileDifference(mongoProfiles, mergedProfiles)) {
            await writeCharacterProfileMapToMongo(playerId, mergedProfiles, {
                updatedAt: new Date().toISOString()
            });
        }

        return mergedProfiles;
    }

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

function normalizeBattleStateDamageEntry(entry = {}) {
    const source = entry && typeof entry === 'object' && !Array.isArray(entry) ? entry : {};
    return {
        HP_消費: Math.max(0, Math.min(100, Math.round(Number(source?.HP_消費) || 0))),
        MP_消費: Math.max(0, Math.round(Number(source?.MP_消費) || 0)),
        ST_消費: Math.max(0, Math.round(Number(source?.ST_消費) || 0))
    };
}

function normalizeBattleStateRetainedBuffEntry(entry = {}) {
    const source = entry && typeof entry === 'object' && !Array.isArray(entry) ? entry : null;
    if (!source) return null;

    const rawSkillData = (
        source.skillData
        && typeof source.skillData === 'object'
        && !Array.isArray(source.skillData)
    )
        ? source.skillData
        : source;
    const skillData = rawSkillData && typeof rawSkillData === 'object' && !Array.isArray(rawSkillData)
        ? rawSkillData
        : {};
    const compactSkillName = normalizeText(source?.skillName || source?.name);
    const compactSkillType = normalizeText(source?.skillType || source?.type);
    const skillName = compactSkillName || normalizeText(skillData?.和名 || skillData?.技名 || skillData?.name);
    const skillType = compactSkillType || normalizeText(skillData?.種別);
    if (!skillName) return null;

    const humanTransformName = skillName;
    const isHumanTransform = Boolean(humanTransformName) && (
        humanTransformName === '人間変身' || humanTransformName.includes('人間変身')
    );

    const hasEffectDuration = Boolean(source?.hasEffectDuration);
    const fallbackTurns = hasEffectDuration ? 2 : 1;
    const normalizeTurns = (value, fallback = 1) => {
        const resolved = Math.max(1, Math.round(Number(value) || fallback));
        if (resolved >= RETAINED_BUFF_INFINITE_TURNS) {
            return RETAINED_BUFF_INFINITE_TURNS;
        }
        return resolved;
    };
    const totalTurns = isHumanTransform
        ? RETAINED_BUFF_INFINITE_TURNS
        : normalizeTurns(source?.totalTurns, fallbackTurns);
    const remainingTurnsRaw = Number.isFinite(Number(source?.remainingTurns))
        ? Number(source?.remainingTurns)
        : (totalTurns - Number(source?.elapsedTurns || 0));
    const remainingTurns = isHumanTransform
        ? RETAINED_BUFF_INFINITE_TURNS
        : normalizeTurns(remainingTurnsRaw, totalTurns);
    if (remainingTurns <= 0) return null;
    const elapsedTurns = totalTurns >= RETAINED_BUFF_INFINITE_TURNS
        ? 0
        : Math.max(0, totalTurns - remainingTurns);

    return {
        skillName,
        skillType,
        totalTurns,
        elapsedTurns
    };
}

function normalizeBattleStateCharacterEntry(entry = {}) {
    const source = entry && typeof entry === 'object' && !Array.isArray(entry) ? entry : {};
    const retainedBuffSkills = (Array.isArray(source?.retainedBuffSkills) ? source.retainedBuffSkills : [])
        .map((buff) => normalizeBattleStateRetainedBuffEntry(buff))
        .filter((buff) => Boolean(buff));
    const skillCooldowns = (Array.isArray(source?.skillCooldowns) ? source.skillCooldowns : [])
        .map((row) => {
            const item = row && typeof row === 'object' && !Array.isArray(row) ? row : {};
            const signature = normalizeText(item?.signature);
            const signatureParts = signature ? signature.split('::') : [];
            const skillType = normalizeText(item?.skillType || item?.type || signatureParts[0] || '');
            const skillName = normalizeText(item?.skillName || item?.name || signatureParts[1] || '');
            if (!skillName) return null;
            const totalTurns = Math.max(0, Math.round(Number(item?.cooldownTurns ?? item?.totalTurns) || 0));
            const remainingTurnsRaw = Number.isFinite(Number(item?.remainingTurns))
                ? Number(item?.remainingTurns)
                : (totalTurns - Number(item?.elapsedTurns || 0));
            const remainingTurns = Math.max(0, Math.round(remainingTurnsRaw || 0));
            if (totalTurns <= 0 || remainingTurns <= 0) return null;
            const elapsedTurns = Math.max(0, totalTurns - remainingTurns);
            return {
                skillName,
                skillType,
                cooldownTurns: totalTurns,
                elapsedTurns,
                pendingWhileActive: Boolean(item?.pendingWhileActive)
            };
        })
        .filter((row) => Boolean(row));

    return {
        battleTurn: Math.max(1, Math.round(Number(source?.battleTurn) || 1)),
        retainedBuffSkills,
        skillCooldowns,
        damage: normalizeBattleStateDamageEntry(source?.damage)
    };
}

function normalizeBattleStateCharacterCollection(collection = {}) {
    const source = collection && typeof collection === 'object' && !Array.isArray(collection) ? collection : {};
    const normalized = {};
    Object.entries(source).forEach(([characterName, entry]) => {
        const key = normalizeText(characterName);
        if (!key) return;
        normalized[key] = normalizeBattleStateCharacterEntry(entry);
    });
    return normalized;
}

function normalizeBattleStateStoreStates(states = {}) {
    const source = states && typeof states === 'object' && !Array.isArray(states) ? states : {};
    const normalized = {};
    Object.entries(source).forEach(([playerId, collection]) => {
        const key = normalizeText(playerId);
        if (!key) return;
        normalized[key] = normalizeBattleStateCharacterCollection(collection);
    });
    return normalized;
}

function readBattleStateStore() {
    if (!fs.existsSync(battleStateJsonPath)) {
        return { version: 1, updatedAt: null, states: {} };
    }

    const raw = fs.readFileSync(battleStateJsonPath, 'utf8');
    if (!String(raw || '').trim()) {
        return { version: 1, updatedAt: null, states: {} };
    }

    const parsed = JSON.parse(raw);
    const normalizedStates = normalizeBattleStateStoreStates(parsed?.states);
    const normalizedStore = {
        version: 1,
        updatedAt: parsed?.updatedAt || null,
        states: normalizedStates
    };
    const before = JSON.stringify(parsed?.states || {});
    const after = JSON.stringify(normalizedStates || {});
    if (before !== after) {
        writeBattleStateStore(normalizedStore);
    }
    return normalizedStore;
}

function writeBattleStateStore(store) {
    const normalizedStore = {
        version: 1,
        updatedAt: store?.updatedAt || new Date().toISOString(),
        states: normalizeBattleStateStoreStates(store?.states)
    };

    fs.mkdirSync(path.dirname(battleStateJsonPath), { recursive: true });
    const tempPath = `${battleStateJsonPath}.tmp`;
    fs.writeFileSync(tempPath, `${JSON.stringify(normalizedStore, null, 2)}\n`, 'utf8');
    fs.renameSync(tempPath, battleStateJsonPath);
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

function buildCharacterSummary(characterData) {
    if (!characterData || typeof characterData !== 'object') return null;
    return {
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
    };
}

function findCharacterByName(characterName) {
    const normalizedName = normalizeText(characterName);
    if (!normalizedName || !Array.isArray(cachedCharacters)) return null;
    return cachedCharacters.find(
        (character) => pickFirstText(character, FIELD_KEYS.name) === normalizedName
    ) || null;
}

function buildLoginCharactersForUser(user) {
    const characterSlots = Object.keys(user || {})
        .map((key) => {
            const match = String(key).match(/^(?:character[_-]?|キャラクター)(\d+)$/i);
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
        const characterData = findCharacterByName(characterName);
        if (!characterData) continue;
        const summary = buildCharacterSummary(characterData);
        if (!summary) continue;
        characters.push(summary);
    }

    if (characters.length === 0 && Array.isArray(user?.characters)) {
        user.characters.forEach((characterName) => {
            const characterData = findCharacterByName(characterName);
            if (!characterData) return;
            const summary = buildCharacterSummary(characterData);
            if (!summary) return;
            characters.push(summary);
        });
    }
    return characters;
}

function toFiniteNumber(value, fallback = 0) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : fallback;
}

function buildBattleResourceSummary(summary = {}, state = {}) {
    const hpMax = Math.max(0, Math.round(toFiniteNumber(summary?.HP, 0)));
    const mpMax = Math.max(0, Math.round(toFiniteNumber(summary?.MP, 0)));
    const stMax = Math.max(0, Math.round(toFiniteNumber(summary?.ST, 0)));
    const damage = normalizeBattleStateDamageEntry(state?.damage);
    const hpCurrent = hpMax > 0
        ? Math.max(0, Math.round(hpMax * (1 - (toFiniteNumber(damage?.HP_消費, 0) / 100))))
        : 0;
    const mpCurrent = Math.max(0, Math.round(mpMax - toFiniteNumber(damage?.MP_消費, 0)));
    const stCurrent = Math.max(0, Math.round(stMax - toFiniteNumber(damage?.ST_消費, 0)));

    return {
        hp: {
            current: Math.min(hpMax, hpCurrent),
            max: hpMax,
            consumedPercent: Math.max(0, Math.round(toFiniteNumber(damage?.HP_消費, 0)))
        },
        mp: {
            current: Math.min(mpMax, mpCurrent),
            max: mpMax,
            consumed: Math.max(0, Math.round(toFiniteNumber(damage?.MP_消費, 0)))
        },
        st: {
            current: Math.min(stMax, stCurrent),
            max: stMax,
            consumed: Math.max(0, Math.round(toFiniteNumber(damage?.ST_消費, 0)))
        }
    };
}

function findSkillDataByNameAndType(skillName = '', skillType = '') {
    const normalizedName = normalizeText(skillName);
    if (!normalizedName || !Array.isArray(cachedSkills)) return null;
    const normalizedType = normalizeText(skillType).toUpperCase();
    if (normalizedType) {
        const exact = cachedSkills.find((row) => (
            pickFirstText(row, FIELD_KEYS.skillName) === normalizedName
            && normalizeText(pickFirstValue(row, FIELD_KEYS.skillType)).toUpperCase() === normalizedType
        ));
        if (exact) return exact;
    }
    return cachedSkills.find((row) => pickFirstText(row, FIELD_KEYS.skillName) === normalizedName) || null;
}

function buildBattleStateSkillView(entry = {}) {
    const source = entry && typeof entry === 'object' && !Array.isArray(entry) ? entry : {};
    const skillName = normalizeText(source?.skillName);
    const skillType = normalizeText(source?.skillType);
    const skillData = findSkillDataByNameAndType(skillName, skillType);
    const detail = normalizeText(pickFirstValue(skillData, FIELD_KEYS.skillDetail) || '');
    const attribute = normalizeText(skillData?.属性 || '');
    const ruby = normalizeText(skillData?.英名 || '');
    const magicLevel = normalizeText(skillData?.魔法Lv ?? skillData?.魔法Rank ?? '');
    const power = Math.round(toFiniteNumber(skillData?.威力, 0));
    const guard = Math.round(toFiniteNumber(skillData?.守り ?? skillData?.防御, 0));
    const state = Math.round(toFiniteNumber(skillData?.状態, 0));
    return {
        ...source,
        detail,
        attribute,
        ruby,
        magicLevel,
        power,
        guard,
        state
    };
}

const connectedPlayerMap = new Map();
const storyConnectedPlayerMap = new Map();
const gmSessionMap = new Map();

function pruneGmSessions(nowMs = Date.now()) {
    for (const [token, session] of gmSessionMap.entries()) {
        if (!session || !Number.isFinite(session.expiresAtMs) || session.expiresAtMs <= nowMs) {
            gmSessionMap.delete(token);
        }
    }
}

function createGmSessionToken() {
    const nowMs = Date.now();
    pruneGmSessions(nowMs);
    const token = `gm-${nowMs.toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    gmSessionMap.set(token, {
        issuedAtMs: nowMs,
        expiresAtMs: nowMs + GM_SESSION_TTL_MS
    });
    return token;
}

function hasValidGmSessionToken(token) {
    const normalizedToken = normalizeText(token);
    if (!normalizedToken) return false;
    const nowMs = Date.now();
    pruneGmSessions(nowMs);
    const session = gmSessionMap.get(normalizedToken);
    if (!session) return false;
    if (!Number.isFinite(session.expiresAtMs) || session.expiresAtMs <= nowMs) {
        gmSessionMap.delete(normalizedToken);
        return false;
    }
    return true;
}

function prunePresenceMap(targetMap, nowMs = Date.now()) {
    if (!(targetMap instanceof Map)) return;
    for (const [playerId, entry] of targetMap.entries()) {
        if (!entry || !Number.isFinite(entry.lastSeenAtMs) || (nowMs - entry.lastSeenAtMs) > PLAYER_ACTIVE_TTL_MS) {
            targetMap.delete(playerId);
        }
    }
}

function upsertPresenceEntry(targetMap, playerId, characterNames = [], options = {}) {
    if (!(targetMap instanceof Map)) return null;
    const normalizedPlayerId = normalizeText(playerId);
    if (!normalizedPlayerId || normalizedPlayerId === 'guest' || normalizedPlayerId === GM_LOGIN_ID) return null;

    const nowMs = Date.now();
    prunePresenceMap(targetMap, nowMs);

    const normalizedCharacterNames = normalizeNameList(characterNames);
    const replaceCharacterNames = Boolean(options?.replaceCharacterNames);
    const selectedCharacterName = normalizeText(options?.selectedCharacterName);
    const existing = targetMap.get(normalizedPlayerId);
    const characterSet = new Set(
        replaceCharacterNames
            ? normalizedCharacterNames
            : normalizeNameList(existing?.characterNames)
    );
    normalizedCharacterNames.forEach((name) => characterSet.add(name));

    const nextEntry = {
        playerId: normalizedPlayerId,
        characterNames: Array.from(characterSet),
        selectedCharacterName: selectedCharacterName || normalizeText(existing?.selectedCharacterName),
        firstSeenAtMs: Number(existing?.firstSeenAtMs) || nowMs,
        lastSeenAtMs: nowMs
    };
    targetMap.set(normalizedPlayerId, nextEntry);
    return nextEntry;
}

function removePresenceEntry(targetMap, playerId) {
    if (!(targetMap instanceof Map)) return false;
    const normalizedPlayerId = normalizeText(playerId);
    if (!normalizedPlayerId) return false;
    return targetMap.delete(normalizedPlayerId);
}

function getPresenceList(targetMap, options = {}) {
    if (!(targetMap instanceof Map)) return [];
    prunePresenceMap(targetMap, Date.now());
    const includeBattleState = Boolean(options?.includeBattleState);
    const battleStateStore = (options?.battleStateStore && typeof options.battleStateStore === 'object')
        ? options.battleStateStore
        : null;
    const normalizedAllStates = includeBattleState
        ? normalizeBattleStateStoreStates(battleStateStore?.states || {})
        : {};

    const findCharacterStateByName = (playerStates = {}, characterName = '') => {
        const normalizedName = normalizeText(characterName);
        if (!normalizedName || !playerStates || typeof playerStates !== 'object') {
            return null;
        }
        if (Object.prototype.hasOwnProperty.call(playerStates, normalizedName)) {
            return playerStates[normalizedName];
        }
        const matched = Object.entries(playerStates).find(([name]) => normalizeText(name) === normalizedName);
        return matched ? matched[1] : null;
    };

    const findCharacterStateAcrossPlayers = (characterName = '', preferredPlayerId = '') => {
        const normalizedName = normalizeText(characterName);
        if (!normalizedName) return null;

        const normalizedPreferredPlayerId = normalizeText(preferredPlayerId);
        if (normalizedPreferredPlayerId) {
            const preferredCollection = normalizedAllStates?.[normalizedPreferredPlayerId];
            const preferredState = findCharacterStateByName(preferredCollection || {}, normalizedName);
            if (preferredState) {
                return preferredState;
            }
        }

        const entries = Object.entries(normalizedAllStates || {});
        for (const [, collection] of entries) {
            const found = findCharacterStateByName(collection || {}, normalizedName);
            if (found) {
                return found;
            }
        }
        return null;
    };

    return Array.from(targetMap.values())
        .sort((a, b) => {
            const aFirst = Number(a?.firstSeenAtMs) || Number.MAX_SAFE_INTEGER;
            const bFirst = Number(b?.firstSeenAtMs) || Number.MAX_SAFE_INTEGER;
            if (aFirst !== bFirst) return aFirst - bFirst;
            return normalizeText(a?.playerId).localeCompare(normalizeText(b?.playerId), 'ja');
        })
        .map((entry) => {
            const playerId = normalizeText(entry?.playerId);
            const characterNames = normalizeNameList(entry?.characterNames);
            const playerStates = includeBattleState
                ? normalizeBattleStateCharacterCollection(battleStateStore?.states?.[playerId] || {})
                : {};
            const characters = characterNames
                .map((name) => {
                    const summary = buildCharacterSummary(findCharacterByName(name));
                    if (!summary) return null;
                    if (!includeBattleState) return summary;
                    const ownCharacterState = findCharacterStateByName(playerStates, name);
                    const fallbackCharacterState = ownCharacterState
                        ? null
                        : findCharacterStateAcrossPlayers(name, playerId);
                    const battleStateRaw = normalizeBattleStateCharacterEntry(
                        ownCharacterState
                        || fallbackCharacterState
                        || {}
                    );
                    const battleState = {
                        ...battleStateRaw,
                        retainedBuffSkills: (Array.isArray(battleStateRaw?.retainedBuffSkills)
                            ? battleStateRaw.retainedBuffSkills
                            : []
                        ).map((entry) => buildBattleStateSkillView(entry)),
                        skillCooldowns: (Array.isArray(battleStateRaw?.skillCooldowns)
                            ? battleStateRaw.skillCooldowns
                            : []
                        ).map((entry) => buildBattleStateSkillView(entry))
                    };
                    return {
                        ...summary,
                        battleState,
                        resources: buildBattleResourceSummary(summary, battleState)
                    };
                })
                .filter(Boolean);
            return {
                playerId,
                selectedCharacterName: normalizeText(entry?.selectedCharacterName),
                firstSeenAt: new Date(Number(entry?.firstSeenAtMs) || Date.now()).toISOString(),
                lastSeenAt: new Date(Number(entry?.lastSeenAtMs) || Date.now()).toISOString(),
                characterNames,
                characters
            };
        });
}

function upsertConnectedPlayer(playerId, characterNames = [], options = {}) {
    return upsertPresenceEntry(connectedPlayerMap, playerId, characterNames, options);
}

function upsertStoryConnectedPlayer(playerId, characterNames = [], options = {}) {
    return upsertPresenceEntry(storyConnectedPlayerMap, playerId, characterNames, options);
}

function removeConnectedPlayer(playerId) {
    return removePresenceEntry(connectedPlayerMap, playerId);
}

function removeStoryConnectedPlayer(playerId) {
    return removePresenceEntry(storyConnectedPlayerMap, playerId);
}

function getStoryConnectedPlayerList(options = {}) {
    return getPresenceList(storyConnectedPlayerMap, options);
}

function canUseMongoStateStore() {
    return Boolean(
        useMongoPrimaryData
        && String(mongoConfig?.uri || '').trim()
    );
}

async function getMongoConnectionStatus(options = {}) {
    const hasUri = Boolean(String(mongoConfig?.uri || '').trim());
    const enabledByFlag = Boolean(mongoConfig?.enabled);
    const enabled = canUseMongoStateStore();
    const dbName = normalizeText(mongoConfig?.dbName);
    if (!enabled) {
        let disabledReason = 'mongodb disabled';
        if (!hasUri) {
            disabledReason = 'MONGODB_URI is not set';
        } else if (!enabledByFlag) {
            disabledReason = 'USE_MONGODB is false';
        }
        const status = {
            checkedAtMs: Date.now(),
            enabled: false,
            connected: false,
            dbName,
            message: disabledReason
        };
        mongoStatusCache = status;
        return { ...status };
    }

    const force = Boolean(options?.force);
    const nowMs = Date.now();
    if (!force && (nowMs - Number(mongoStatusCache?.checkedAtMs || 0)) < MONGO_STATUS_CACHE_TTL_MS) {
        return { ...mongoStatusCache };
    }

    try {
        await withMongoClient(async ({ db }) => {
            await db.command({ ping: 1 });
            return true;
        }, {
            uri: mongoConfig.uri,
            dbName: mongoConfig.dbName
        });
        mongoStatusCache = {
            checkedAtMs: nowMs,
            enabled: true,
            connected: true,
            dbName,
            message: 'ok'
        };
        return { ...mongoStatusCache };
    } catch (error) {
        const message = normalizeText(error?.message) || 'connection failed';
        mongoStatusCache = {
            checkedAtMs: nowMs,
            enabled: true,
            connected: false,
            dbName,
            message
        };
        console.warn(`[mongo] status check failed: ${message}`);
        return { ...mongoStatusCache };
    }
}

function createDefaultBattleMemoStore() {
    return { version: 1, updatedAt: null, memos: {}, legacyCharacterProfiles: {} };
}

function createDefaultBattleStateStore() {
    return { version: 1, updatedAt: null, states: {} };
}

function createDefaultCharacterProfileStore() {
    return { version: 1, updatedAt: null, profiles: {} };
}

function createDefaultSkillSetPresetStore() {
    return { version: 1, updatedAt: null, presets: {} };
}

function normalizeBattleMemoStorePayload(payload = {}) {
    const source = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
    const memos = (source.memos && typeof source.memos === 'object' && !Array.isArray(source.memos))
        ? source.memos
        : {};
    const legacyCharacterProfiles = normalizeCharacterProfileMap(source?.characterProfiles);
    return {
        version: 1,
        updatedAt: source?.updatedAt || null,
        memos,
        legacyCharacterProfiles
    };
}

function normalizeCharacterProfileStorePayload(payload = {}) {
    const source = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
    return {
        version: 1,
        updatedAt: source?.updatedAt || null,
        profiles: normalizeCharacterProfileMap(source?.profiles)
    };
}

function normalizeSkillSetPresetStorePayload(payload = {}) {
    const source = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
    return {
        version: 1,
        updatedAt: source?.updatedAt || null,
        presets: normalizeSkillSetPresetStorePresets(source?.presets)
    };
}

function normalizeBattleStateStorePayload(payload = {}) {
    const source = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
    const normalizedStates = normalizeBattleStateStoreStates(source?.states);
    return {
        version: 1,
        updatedAt: source?.updatedAt || null,
        states: normalizedStates
    };
}

async function fetchAppStateDocFromMongo(stateKey) {
    if (!canUseMongoStateStore()) return null;
    const normalizedKey = normalizeText(stateKey);
    if (!normalizedKey) return null;
    return withMongoClient(async ({ db }) => {
        return db.collection(APP_STATE_COLLECTION).findOne({ _id: normalizedKey });
    }, {
        uri: mongoConfig.uri,
        dbName: mongoConfig.dbName
    });
}

async function readAppStatePayloadFromMongo(stateKey, fallbackValue) {
    const doc = await fetchAppStateDocFromMongo(stateKey);
    if (!doc || typeof doc !== 'object') {
        return deepCloneJsonValue(fallbackValue);
    }
    if (!Object.prototype.hasOwnProperty.call(doc, 'payload')) {
        return deepCloneJsonValue(fallbackValue);
    }
    return doc.payload;
}

async function writeAppStatePayloadToMongo(stateKey, payload, options = {}) {
    if (!canUseMongoStateStore()) return null;
    const normalizedKey = normalizeText(stateKey);
    if (!normalizedKey) return null;
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const providedUpdatedAt = normalizeText(options?.updatedAt);
    const payloadUpdatedAt = providedUpdatedAt || normalizeText(payload?.updatedAt) || nowIso;
    await withMongoClient(async ({ db }) => {
        await db.collection(APP_STATE_COLLECTION).updateOne(
            { _id: normalizedKey },
            {
                $set: {
                    payload,
                    payloadUpdatedAt,
                    payloadUpdatedAtMs: Math.floor(Number(Date.parse(payloadUpdatedAt)) || nowMs),
                    updatedAt: nowIso,
                    updatedAtMs: nowMs,
                    sourceType: 'json'
                }
            },
            { upsert: true }
        );
    }, {
        uri: mongoConfig.uri,
        dbName: mongoConfig.dbName
    });
    return {
        updatedAt: nowIso,
        updatedAtMs: nowMs,
        payloadUpdatedAt
    };
}

async function readBattleMemoStoreForRuntime() {
    if (!canUseMongoStateStore()) {
        return readBattleMemoStore();
    }
    const doc = await fetchAppStateDocFromMongo(APP_STATE_KEYS.battleMemo);
    if (doc && Object.prototype.hasOwnProperty.call(doc, 'payload')) {
        return normalizeBattleMemoStorePayload(doc.payload);
    }
    const fallbackRaw = readJsonFileAsIs(
        battleMemoJsonPath,
        { version: 1, updatedAt: null, memos: {}, characterProfiles: {} }
    );
    if (!doc || !Object.prototype.hasOwnProperty.call(doc, 'payload')) {
        await writeAppStatePayloadToMongo(APP_STATE_KEYS.battleMemo, fallbackRaw, {
            updatedAt: normalizeText(fallbackRaw?.updatedAt) || null
        });
        return normalizeBattleMemoStorePayload(fallbackRaw);
    }
    return normalizeBattleMemoStorePayload(fallbackRaw);
}

async function writeBattleMemoStoreForRuntime(store = {}) {
    if (!canUseMongoStateStore()) {
        writeBattleMemoStore(store);
        return;
    }
    const payload = {
        version: 1,
        updatedAt: store?.updatedAt || new Date().toISOString(),
        memos: (store && typeof store.memos === 'object' && !Array.isArray(store.memos)) ? store.memos : {}
    };
    await writeAppStatePayloadToMongo(APP_STATE_KEYS.battleMemo, payload, {
        updatedAt: payload.updatedAt
    });
}

async function readCharacterProfileStoreForRuntime() {
    if (!canUseMongoStateStore()) {
        return readCharacterProfileStore();
    }
    const doc = await fetchAppStateDocFromMongo(APP_STATE_KEYS.characterProfiles);
    if (doc && Object.prototype.hasOwnProperty.call(doc, 'payload')) {
        return normalizeCharacterProfileStorePayload(doc.payload);
    }
    const fallbackRaw = readJsonFileAsIs(
        characterProfileJsonPath,
        { version: 1, updatedAt: null, profiles: {} }
    );
    if (!doc || !Object.prototype.hasOwnProperty.call(doc, 'payload')) {
        await writeAppStatePayloadToMongo(APP_STATE_KEYS.characterProfiles, fallbackRaw, {
            updatedAt: normalizeText(fallbackRaw?.updatedAt) || null
        });
        return normalizeCharacterProfileStorePayload(fallbackRaw);
    }
    return normalizeCharacterProfileStorePayload(fallbackRaw);
}

async function writeCharacterProfileStoreForRuntime(store = {}) {
    if (!canUseMongoStateStore()) {
        writeCharacterProfileStore(store);
        return;
    }
    const payload = {
        version: 1,
        updatedAt: store?.updatedAt || new Date().toISOString(),
        profiles: normalizeCharacterProfileMap(store?.profiles)
    };
    await writeAppStatePayloadToMongo(APP_STATE_KEYS.characterProfiles, payload, {
        updatedAt: payload.updatedAt
    });
}

async function readSkillSetPresetStoreForRuntime() {
    if (!canUseMongoStateStore()) {
        return readSkillSetPresetStore();
    }
    const doc = await fetchAppStateDocFromMongo(APP_STATE_KEYS.skillSetPresets);
    if (doc && Object.prototype.hasOwnProperty.call(doc, 'payload')) {
        return normalizeSkillSetPresetStorePayload(doc.payload);
    }
    const fallbackRaw = readJsonFileAsIs(
        skillSetPresetJsonPath,
        { version: 1, updatedAt: null, presets: {} }
    );
    if (!doc || !Object.prototype.hasOwnProperty.call(doc, 'payload')) {
        await writeAppStatePayloadToMongo(APP_STATE_KEYS.skillSetPresets, fallbackRaw, {
            updatedAt: normalizeText(fallbackRaw?.updatedAt) || null
        });
        return normalizeSkillSetPresetStorePayload(fallbackRaw);
    }
    return normalizeSkillSetPresetStorePayload(fallbackRaw);
}

async function writeSkillSetPresetStoreForRuntime(store = {}) {
    if (!canUseMongoStateStore()) {
        writeSkillSetPresetStore(store);
        return;
    }
    const payload = {
        version: 1,
        updatedAt: store?.updatedAt || new Date().toISOString(),
        presets: normalizeSkillSetPresetStorePresets(store?.presets)
    };
    await writeAppStatePayloadToMongo(APP_STATE_KEYS.skillSetPresets, payload, {
        updatedAt: payload.updatedAt
    });
}

function normalizePresenceDoc(doc = {}) {
    const source = doc && typeof doc === 'object' && !Array.isArray(doc) ? doc : {};
    const playerId = normalizeText(source?.playerId);
    if (!playerId) return null;
    const nowMs = Date.now();
    return {
        playerId,
        characterNames: normalizeNameList(source?.characterNames),
        selectedCharacterName: normalizeText(source?.selectedCharacterName),
        firstSeenAtMs: Number(source?.firstSeenAtMs) || nowMs,
        lastSeenAtMs: Number(source?.lastSeenAtMs) || nowMs
    };
}

async function upsertPresenceMongo(scope = 'default', entry = {}) {
    if (!canUseMongoStateStore()) return;
    const normalizedScope = normalizeText(scope) || 'default';
    const normalizedEntry = normalizePresenceDoc(entry);
    if (!normalizedEntry) return;
    const nowIso = new Date().toISOString();
    await withMongoClient(async ({ db }) => {
        await db.collection(MONGO_COLLECTION.presence).updateOne(
            {
                scope: normalizedScope,
                playerId: normalizedEntry.playerId
            },
            {
                $set: {
                    scope: normalizedScope,
                    playerId: normalizedEntry.playerId,
                    characterNames: normalizedEntry.characterNames,
                    selectedCharacterName: normalizedEntry.selectedCharacterName,
                    firstSeenAtMs: normalizedEntry.firstSeenAtMs,
                    lastSeenAtMs: normalizedEntry.lastSeenAtMs,
                    updatedAt: nowIso,
                    updatedAtMs: Date.now()
                }
            },
            { upsert: true }
        );
    }, {
        uri: mongoConfig.uri,
        dbName: mongoConfig.dbName
    });
}

async function removePresenceMongo(playerId, scope = '') {
    if (!canUseMongoStateStore()) return false;
    const normalizedPlayerId = normalizeText(playerId);
    if (!normalizedPlayerId) return false;
    const normalizedScope = normalizeText(scope).toLowerCase();
    const filter = { playerId: normalizedPlayerId };
    if (normalizedScope) {
        filter.scope = normalizedScope;
    }
    const result = await withMongoClient(async ({ db }) => {
        return db.collection(MONGO_COLLECTION.presence).deleteMany(filter);
    }, {
        uri: mongoConfig.uri,
        dbName: mongoConfig.dbName
    });
    return Number(result?.deletedCount || 0) > 0;
}

async function refreshPresenceMapFromMongo(targetMap, scope = 'default') {
    if (!(targetMap instanceof Map) || !canUseMongoStateStore()) return;
    const nowMs = Date.now();
    const cutoffMs = nowMs - PLAYER_ACTIVE_TTL_MS;
    const normalizedScope = normalizeText(scope) || 'default';
    const docs = await withMongoClient(async ({ db }) => {
        return db.collection(MONGO_COLLECTION.presence)
            .find({
                scope: normalizedScope,
                lastSeenAtMs: { $gte: cutoffMs }
            })
            .toArray();
    }, {
        uri: mongoConfig.uri,
        dbName: mongoConfig.dbName
    });
    targetMap.clear();
    (Array.isArray(docs) ? docs : []).forEach((doc) => {
        const entry = normalizePresenceDoc(doc);
        if (!entry) return;
        targetMap.set(entry.playerId, entry);
    });
}

async function getStoryPresenceUpdatedAtMsFromMongo() {
    if (!canUseMongoStateStore()) return 0;
    const cutoffMs = Date.now() - PLAYER_ACTIVE_TTL_MS;
    const doc = await withMongoClient(async ({ db }) => {
        return db.collection(MONGO_COLLECTION.presence)
            .find({
                scope: 'story',
                lastSeenAtMs: { $gte: cutoffMs }
            }, {
                projection: { updatedAtMs: 1, lastSeenAtMs: 1 }
            })
            .sort({ updatedAtMs: -1, lastSeenAtMs: -1 })
            .limit(1)
            .next();
    }, {
        uri: mongoConfig.uri,
        dbName: mongoConfig.dbName
    });
    return Math.floor(Number(doc?.updatedAtMs || doc?.lastSeenAtMs || 0));
}

async function readBattleStateStoreFromMongo(options = {}) {
    if (!canUseMongoStateStore()) {
        return { version: 1, updatedAt: null, states: {} };
    }
    void options;
    const doc = await fetchAppStateDocFromMongo(APP_STATE_KEYS.battleState);
    if (doc && Object.prototype.hasOwnProperty.call(doc, 'payload')) {
        return normalizeBattleStateStorePayload(doc.payload);
    }
    const fallbackRaw = readJsonFileAsIs(
        battleStateJsonPath,
        { version: 1, updatedAt: null, states: {} }
    );
    if (!doc || !Object.prototype.hasOwnProperty.call(doc, 'payload')) {
        await writeAppStatePayloadToMongo(APP_STATE_KEYS.battleState, fallbackRaw, {
            updatedAt: normalizeText(fallbackRaw?.updatedAt) || null
        });
        return normalizeBattleStateStorePayload(fallbackRaw);
    }
    return normalizeBattleStateStorePayload(fallbackRaw);
}

async function saveBattleStateEntryToMongo(playerId, characterName, state = {}) {
    if (!canUseMongoStateStore()) return null;
    const normalizedPlayerId = normalizeText(playerId);
    const normalizedCharacterName = normalizeText(characterName);
    if (!normalizedPlayerId || !normalizedCharacterName) return null;
    const updatedAtMs = Date.now();
    const updatedAt = new Date(updatedAtMs).toISOString();
    const normalizedState = normalizeBattleStateCharacterEntry(state);
    const store = await readBattleStateStoreFromMongo();
    const normalizedStore = normalizeBattleStateStorePayload(store);
    if (!normalizedStore.states[normalizedPlayerId] || typeof normalizedStore.states[normalizedPlayerId] !== 'object') {
        normalizedStore.states[normalizedPlayerId] = {};
    }
    normalizedStore.states[normalizedPlayerId][normalizedCharacterName] = normalizedState;
    normalizedStore.updatedAt = updatedAt;
    await writeAppStatePayloadToMongo(APP_STATE_KEYS.battleState, {
        version: 1,
        updatedAt,
        states: normalizedStore.states
    }, {
        updatedAt
    });

    return { updatedAt, updatedAtMs, state: normalizedState };
}

async function getBattleStateUpdatedAtMsFromMongo() {
    if (!canUseMongoStateStore()) return 0;
    const doc = await fetchAppStateDocFromMongo(APP_STATE_KEYS.battleState);
    if (!doc || typeof doc !== 'object') return 0;
    const payloadUpdatedAtMs = Math.floor(Number(doc?.payloadUpdatedAtMs || 0));
    if (payloadUpdatedAtMs > 0) return payloadUpdatedAtMs;
    const payloadUpdatedAt = Date.parse(normalizeText(doc?.payload?.updatedAt || ''));
    if (Number.isFinite(payloadUpdatedAt)) return Math.floor(payloadUpdatedAt);
    return Math.floor(Number(doc?.updatedAtMs || 0));
}

function buildSelectDataLogRow(logEntry = {}) {
    const source = logEntry && typeof logEntry === 'object' && !Array.isArray(logEntry) ? logEntry : {};
    const timestamp = normalizeText(source?.timestamp) || new Date().toISOString();
    const parsedTimestampMs = Date.parse(timestamp);
    const timestampMs = Number.isFinite(parsedTimestampMs) ? parsedTimestampMs : Date.now();
    const fullPowerNumeric = Number(source?.fullPower);
    const fullPower = Number.isFinite(fullPowerNumeric)
        ? (fullPowerNumeric !== 0 ? 1 : 0)
        : (normalizeText(source?.fullPower).toLowerCase() === 'true' ? 1 : 0);
    return {
        timestamp,
        timestampMs,
        requestId: normalizeText(source?.requestId),
        name: sanitizeTsvValue(source?.name),
        attackOption: sanitizeTsvValue(source?.attackOption),
        fullPower,
        skills: (Array.isArray(source?.skills) ? source.skills : [])
            .map((name) => normalizeText(name))
            .filter(Boolean),
        rollResults: (Array.isArray(source?.rollResults) ? source.rollResults : [])
            .map((result) => sanitizeTsvValue(result))
            .filter((result) => result !== '')
    };
}

function createDefaultSelectDataLogStore() {
    return {
        version: 1,
        updatedAt: null,
        thresholdBytes: SELECT_LOG_EXPORT_THRESHOLD_BYTES,
        exportPending: false,
        totalCount: 0,
        totalBytes: 0,
        entries: []
    };
}

function normalizeSelectDataLogStorePayload(payload = {}) {
    const source = payload && typeof payload === 'object' && !Array.isArray(payload)
        ? payload
        : {};
    const entries = (Array.isArray(source?.entries) ? source.entries : [])
        .map((entry) => buildSelectDataLogRow(entry))
        .filter((entry) => Boolean(entry?.timestamp));
    const totalCount = Math.max(
        Number(entries.length || 0),
        Math.floor(Number(source?.totalCount || 0))
    );
    const totalBytes = Math.max(
        0,
        Math.floor(Number(source?.totalBytes || 0))
    );
    const thresholdBytes = Math.max(
        1,
        Math.floor(Number(source?.thresholdBytes || SELECT_LOG_EXPORT_THRESHOLD_BYTES))
    );
    return {
        version: 1,
        updatedAt: normalizeText(source?.updatedAt) || null,
        thresholdBytes,
        exportPending: Boolean(source?.exportPending),
        totalCount,
        totalBytes,
        entries
    };
}

function toSelectDataLogSnapshot(payload = {}, options = {}) {
    const normalized = normalizeSelectDataLogStorePayload(payload);
    const limit = Math.max(1, Math.floor(Number(options?.limit || GM_DASHBOARD_LOG_LIMIT)));
    const entries = normalized.entries.slice(-limit);
    const latestMs = entries.length > 0
        ? Math.max(...entries.map((row) => Number(row.timestampMs || 0)))
        : Math.floor(Number(Date.parse(normalizeText(normalized.updatedAt)) || 0));
    const text = entries.map((row) => JSON.stringify({
        timestamp: row.timestamp,
        requestId: row.requestId,
        name: row.name,
        attackOption: row.attackOption,
        fullPower: row.fullPower,
        skills: row.skills,
        rollResults: row.rollResults
    })).join('\n');
    return {
        exists: entries.length > 0,
        updatedAt: latestMs > 0
            ? new Date(latestMs).toISOString()
            : (normalizeText(normalized.updatedAt) || null),
        mtimeMs: latestMs > 0 ? latestMs : 0,
        text
    };
}

function estimateSelectDataLogRowBytes(row = {}) {
    try {
        return Buffer.byteLength(`${JSON.stringify(row)}\n`, 'utf8');
    } catch (error) {
        return 0;
    }
}

function parseSelectDataLogRowsFromText(text = '') {
    const raw = String(text || '');
    if (!raw.trim()) return [];
    return raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            try {
                return buildSelectDataLogRow(JSON.parse(line));
            } catch (error) {
                return null;
            }
        })
        .filter(Boolean);
}

let selectDataLogFlushInProgress = false;
let selectDataLogFlushPromise = null;
let selectDataLogBufferLoaded = false;
let selectDataLogBuffer = [];
let selectDataLogFlushTimer = null;
let selectDataLogHooksRegistered = false;
let selectDataLogLastActivityMs = 0;

async function ensureSelectDataLogBufferLoaded() {
    if (selectDataLogBufferLoaded) return;
    selectDataLogBufferLoaded = true;
    selectDataLogBuffer = [];
}

async function appendSelectDataLogRowsToAppState(rows = []) {
    if (!canUseMongoStateStore()) return null;
    const batch = (Array.isArray(rows) ? rows : [])
        .map((row) => buildSelectDataLogRow(row))
        .filter(Boolean);
    if (!batch.length) return null;
    const batchBytes = batch.reduce(
        (sum, row) => sum + estimateSelectDataLogRowBytes(row),
        0
    );
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    await withMongoClient(async ({ db }) => {
        await db.collection(APP_STATE_COLLECTION).updateOne(
            { _id: APP_STATE_KEYS.selectDataLog },
            {
                $setOnInsert: {
                    payload: createDefaultSelectDataLogStore(),
                    updatedAt: nowIso,
                    updatedAtMs: nowMs,
                    sourceType: 'json',
                    payloadUpdatedAt: nowIso,
                    payloadUpdatedAtMs: nowMs
                }
            },
            { upsert: true }
        );
        await db.collection(APP_STATE_COLLECTION).updateOne(
            { _id: APP_STATE_KEYS.selectDataLog },
            {
                $push: {
                    'payload.entries': { $each: batch }
                },
                $inc: {
                    'payload.totalCount': batch.length,
                    'payload.totalBytes': batchBytes
                },
                $set: {
                    'payload.version': 1,
                    'payload.updatedAt': nowIso,
                    'payload.thresholdBytes': SELECT_LOG_EXPORT_THRESHOLD_BYTES,
                    updatedAt: nowIso,
                    updatedAtMs: nowMs,
                    sourceType: 'json',
                    payloadUpdatedAt: nowIso,
                    payloadUpdatedAtMs: nowMs
                }
            },
            { upsert: true }
        );
        await db.collection(APP_STATE_COLLECTION).updateOne(
            {
                _id: APP_STATE_KEYS.selectDataLog,
                'payload.totalBytes': { $gt: SELECT_LOG_EXPORT_THRESHOLD_BYTES }
            },
            {
                $set: {
                    'payload.exportPending': true
                }
            }
        );
    }, {
        uri: mongoConfig.uri,
        dbName: mongoConfig.dbName
    });
    return {
        count: batch.length,
        bytes: batchBytes
    };
}

async function flushSelectDataLogBuffer(options = {}) {
    if (!canUseMongoStateStore()) return false;
    await ensureSelectDataLogBufferLoaded();

    const flushAll = Boolean(options?.flushAll);
    const allowPartial = Boolean(options?.allowPartial);
    const maxBatchCountRaw = Number(options?.maxBatchCount);
    const maxBatchCount = Number.isFinite(maxBatchCountRaw) && maxBatchCountRaw > 0
        ? Math.floor(maxBatchCountRaw)
        : Number.POSITIVE_INFINITY;
    const reason = normalizeText(options?.reason) || 'manual';

    if (selectDataLogFlushInProgress && selectDataLogFlushPromise) {
        return selectDataLogFlushPromise;
    }

    selectDataLogFlushInProgress = true;
    selectDataLogFlushPromise = (async () => {
        let flushedAny = false;
        let flushedBatchCount = 0;
        while (true) {
            if (flushedBatchCount >= maxBatchCount) break;
            const flushCount = flushAll
                ? Math.min(selectDataLogBuffer.length, SELECT_LOG_FLUSH_BATCH_SIZE)
                : (selectDataLogBuffer.length >= SELECT_LOG_FLUSH_BATCH_SIZE
                    ? SELECT_LOG_FLUSH_BATCH_SIZE
                    : (allowPartial && selectDataLogBuffer.length > 0
                        ? Math.min(selectDataLogBuffer.length, SELECT_LOG_FLUSH_BATCH_SIZE)
                        : 0));
            if (flushCount <= 0) break;
            const batch = selectDataLogBuffer.slice(0, flushCount);
            await appendSelectDataLogRowsToAppState(batch);
            selectDataLogBuffer = selectDataLogBuffer.slice(flushCount);
            flushedAny = true;
            flushedBatchCount += 1;
        }
        if (flushedAny) {
            console.log(`[select-log] flushed reason=${reason} buffer=${selectDataLogBuffer.length}`);
        }
        return flushedAny;
    })()
        .finally(() => {
            selectDataLogFlushInProgress = false;
            selectDataLogFlushPromise = null;
        });

    return selectDataLogFlushPromise;
}

function startSelectDataLogFlushWorker() {
    if (!canUseMongoStateStore()) return;
    if (selectDataLogFlushTimer) return;
    selectDataLogFlushTimer = setInterval(() => {
        const nowMs = Date.now();
        const idleMs = selectDataLogLastActivityMs > 0
            ? nowMs - selectDataLogLastActivityMs
            : Number.POSITIVE_INFINITY;
        const hasPending = Array.isArray(selectDataLogBuffer) && selectDataLogBuffer.length > 0;
        const canBatchFlush = hasPending && selectDataLogBuffer.length >= SELECT_LOG_FLUSH_BATCH_SIZE;
        const shouldIdleFlush = hasPending && idleMs >= SELECT_LOG_IDLE_FLUSH_MS;

        const flushOptions = canBatchFlush
            ? { flushAll: false, allowPartial: false, maxBatchCount: 1, reason: 'interval-batch' }
            : (shouldIdleFlush
                ? { flushAll: false, allowPartial: true, maxBatchCount: 1, reason: 'interval-idle' }
                : null);
        if (!flushOptions) return;

        flushSelectDataLogBuffer(flushOptions).catch((error) => {
            console.error('select-log interval flush error:', error);
        });
    }, SELECT_LOG_FLUSH_INTERVAL_MS);
    if (typeof selectDataLogFlushTimer?.unref === 'function') {
        selectDataLogFlushTimer.unref();
    }
}

function registerSelectDataLogShutdownHooks() {
    if (!canUseMongoStateStore()) return;
    if (selectDataLogHooksRegistered) return;
    selectDataLogHooksRegistered = true;
    const flushOnExit = () => {
        flushSelectDataLogBuffer({ flushAll: true, reason: 'shutdown' }).catch((error) => {
            console.error('select-log shutdown flush error:', error);
        });
    };
    process.on('beforeExit', flushOnExit);
}

startSelectDataLogFlushWorker();
registerSelectDataLogShutdownHooks();

async function enqueueSelectDataLogRow(logEntry = {}) {
    if (!canUseMongoStateStore()) return null;
    await ensureSelectDataLogBufferLoaded();
    const row = buildSelectDataLogRow(logEntry);
    selectDataLogBuffer.push(row);
    selectDataLogLastActivityMs = Date.now();
    if (selectDataLogBuffer.length > SELECT_LOG_BUFFER_MAX) {
        await flushSelectDataLogBuffer({
            flushAll: false,
            allowPartial: false,
            maxBatchCount: 1,
            reason: 'buffer-overflow'
        });
    }
    return row;
}

async function readSelectDataLogSnapshotFromMongo() {
    if (!canUseMongoStateStore()) {
        return readSelectDataLogSnapshot();
    }
    await ensureSelectDataLogBufferLoaded();
    const doc = await fetchAppStateDocFromMongo(APP_STATE_KEYS.selectDataLog);
    if (doc && Object.prototype.hasOwnProperty.call(doc, 'payload')) {
        const payload = normalizeSelectDataLogStorePayload(doc.payload);
        const mergedPayload = {
            ...payload,
            entries: [...(payload.entries || []), ...selectDataLogBuffer]
        };
        return toSelectDataLogSnapshot(mergedPayload);
    }

    const fallbackRows = parseSelectDataLogRowsFromText(readSelectDataLogSnapshot()?.text || '');
    const fallbackPayload = {
        version: 1,
        updatedAt: new Date().toISOString(),
        thresholdBytes: SELECT_LOG_EXPORT_THRESHOLD_BYTES,
        exportPending: false,
        totalCount: fallbackRows.length,
        totalBytes: fallbackRows.reduce((sum, row) => sum + estimateSelectDataLogRowBytes(row), 0),
        entries: fallbackRows
    };
    if (!doc || !Object.prototype.hasOwnProperty.call(doc, 'payload')) {
        await writeAppStatePayloadToMongo(APP_STATE_KEYS.selectDataLog, fallbackPayload, {
            updatedAt: normalizeText(fallbackPayload.updatedAt) || null
        });
        const mergedPayload = {
            ...fallbackPayload,
            entries: [...(fallbackPayload.entries || []), ...selectDataLogBuffer]
        };
        return toSelectDataLogSnapshot(mergedPayload);
    }
    const mergedPayload = {
        ...fallbackPayload,
        entries: [...(fallbackPayload.entries || []), ...selectDataLogBuffer]
    };
    return toSelectDataLogSnapshot(mergedPayload);
}

async function getSelectDataLogUpdatedAtMsFromMongo() {
    if (!canUseMongoStateStore()) return 0;
    await ensureSelectDataLogBufferLoaded();
    const doc = await withMongoClient(async ({ db }) => {
        return db.collection(APP_STATE_COLLECTION).findOne(
            { _id: APP_STATE_KEYS.selectDataLog },
            {
                projection: {
                    payloadUpdatedAtMs: 1,
                    updatedAtMs: 1,
                    payload: { updatedAt: 1 }
                }
            }
        );
    }, {
        uri: mongoConfig.uri,
        dbName: mongoConfig.dbName
    });
    const payloadMs = Math.floor(Number(doc?.payloadUpdatedAtMs || 0));
    const bufferMs = selectDataLogBuffer.length > 0
        ? Math.max(...selectDataLogBuffer.map((row) => Number(row?.timestampMs || 0)))
        : 0;
    if (payloadMs > 0 || bufferMs > 0) {
        return Math.max(payloadMs, bufferMs);
    }
    const payloadUpdatedAt = Date.parse(normalizeText(doc?.payload?.updatedAt || ''));
    if (Number.isFinite(payloadUpdatedAt)) return Math.max(Math.floor(payloadUpdatedAt), bufferMs);
    return Math.floor(Number(doc?.updatedAtMs || 0));
}

async function getGmDashboardUpdatedAtMsAsync() {
    if (!canUseMongoStateStore()) {
        return getGmDashboardUpdatedAtMs();
    }
    const [selectMs, battleMs, presenceMs] = await Promise.all([
        getSelectDataLogUpdatedAtMsFromMongo(),
        getBattleStateUpdatedAtMsFromMongo(),
        getStoryPresenceUpdatedAtMsFromMongo()
    ]);
    return resolveLatestMs([selectMs, battleMs, presenceMs]);
}

function getFileUpdatedMeta(filePath) {
    if (!fs.existsSync(filePath)) {
        return { exists: false, mtimeMs: 0, updatedAt: null };
    }
    try {
        const stat = fs.statSync(filePath);
        const mtimeMs = Math.floor(Number(stat?.mtimeMs) || 0);
        return {
            exists: true,
            mtimeMs,
            updatedAt: mtimeMs > 0 ? new Date(mtimeMs).toISOString() : null
        };
    } catch (error) {
        return { exists: true, mtimeMs: 0, updatedAt: null };
    }
}

function resolveLatestMs(values = []) {
    let latest = 0;
    (Array.isArray(values) ? values : []).forEach((value) => {
        const numeric = Math.floor(Number(value) || 0);
        if (Number.isFinite(numeric) && numeric > latest) {
            latest = numeric;
        }
    });
    return latest;
}

function getStoryPresenceUpdatedAtMs() {
    prunePresenceMap(storyConnectedPlayerMap, Date.now());
    const values = Array.from(storyConnectedPlayerMap.values())
        .map((entry) => Number(entry?.lastSeenAtMs) || 0);
    return resolveLatestMs(values);
}

function getGmDashboardUpdatedAtMs() {
    const selectMeta = getFileUpdatedMeta(selectDataLogPath);
    const battleStateMeta = getFileUpdatedMeta(battleStateJsonPath);
    const memoMeta = getFileUpdatedMeta(battleMemoJsonPath);
    const storyPresenceMs = getStoryPresenceUpdatedAtMs();
    return resolveLatestMs([
        selectMeta.mtimeMs,
        battleStateMeta.mtimeMs,
        memoMeta.mtimeMs,
        storyPresenceMs
    ]);
}

let selectDataLogSnapshotCache = {
    exists: false,
    updatedAt: null,
    mtimeMs: 0,
    text: ''
};

function readSelectDataLogSnapshot() {
    const meta = getFileUpdatedMeta(selectDataLogPath);
    if (!meta.exists) {
        selectDataLogSnapshotCache = {
            exists: false,
            updatedAt: null,
            mtimeMs: 0,
            text: ''
        };
        return {
            exists: false,
            updatedAt: null,
            mtimeMs: 0,
            text: ''
        };
    }
    try {
        if (
            Number(meta.mtimeMs) > 0
            && Number(meta.mtimeMs) === Number(selectDataLogSnapshotCache?.mtimeMs)
        ) {
            return { ...selectDataLogSnapshotCache };
        }
        const text = fs.readFileSync(selectDataLogPath, 'utf8');
        selectDataLogSnapshotCache = {
            exists: true,
            updatedAt: meta.updatedAt,
            mtimeMs: meta.mtimeMs,
            text: String(text ?? '')
        };
        return { ...selectDataLogSnapshotCache };
    } catch (error) {
        console.error('read select_dataLog snapshot error:', error);
        return {
            exists: true,
            updatedAt: meta.updatedAt,
            mtimeMs: meta.mtimeMs,
            text: selectDataLogSnapshotCache?.text || ''
        };
    }
}

// キャッシュ
let cachedUsers = [];
let cachedCharacters = [];
let cachedClasses = [];
let cachedSkills = [];
let cachedItems = [];
let cachedBody = [];
let gameDataItemsLoaded = false;
let gameDataSkillsLoaded = false;
let gameDataClassesLoaded = false;
let gameDataBodyLoaded = false;
let gameDataItemsMtimeMs = 0;
let gameDataSkillsMtimeMs = 0;
let gameDataClassesMtimeMs = 0;
let gameDataBodyMtimeMs = 0;
let itemStreamCacheSourcePath = '';
let itemStreamCacheSourceMtimeMs = 0;
let itemStreamLookupCache = new Map();
let itemStreamMissingCache = new Set();
let mongoItemCollectionNameCache = '';
let mongoItemCollectionCacheAtMs = 0;
let mongoPrimaryReloadInProgress = false;
let mongoPrimaryReloadPromise = null;
let mongoPrimaryLastLoadedAtMs = 0;
let mongoStatusCache = {
    checkedAtMs: 0,
    enabled: false,
    connected: false,
    dbName: normalizeText(mongoConfig?.dbName),
    message: 'not-checked'
};
const MONGO_PRIMARY_POLL_MS = 30 * 1000;

function getFileMtimeMsSafe(targetPath = '') {
    try {
        const stat = fs.statSync(targetPath);
        return Math.floor(Number(stat?.mtimeMs) || 0);
    } catch (error) {
        return 0;
    }
}

function getFileSizeSafe(targetPath = '') {
    try {
        const stat = fs.statSync(targetPath);
        return Math.floor(Number(stat?.size) || 0);
    } catch (error) {
        return 0;
    }
}

function compactRecordObject(source = {}) {
    const record = source && typeof source === 'object' && !Array.isArray(source) ? source : {};
    const compacted = {};
    Object.entries(record).forEach(([key, value]) => {
        const normalizedKey = normalizeText(key);
        if (!normalizedKey) return;
        if (value === undefined || value === null) return;
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed) return;
            compacted[normalizedKey] = trimmed;
            return;
        }
        compacted[normalizedKey] = value;
    });
    return compacted;
}

function readJsonArrayFile(filePath = '') {
    if (!filePath || !fs.existsSync(filePath)) return [];
    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const normalizedRaw = String(raw || '').replace(/^\uFEFF/, '');
        if (!normalizedRaw.trim()) return [];
        const parsed = JSON.parse(normalizedRaw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((row) => row && typeof row === 'object' && !Array.isArray(row));
    } catch (error) {
        console.error(`[game-data] failed to parse ${filePath}:`, error?.message || error);
        return [];
    }
}

function loadGameDataSkills(forceReload = false) {
    if (!fs.existsSync(gameDataSkillsJsonPath)) return false;
    const mtimeMs = getFileMtimeMsSafe(gameDataSkillsJsonPath);
    if (!forceReload && gameDataSkillsLoaded && mtimeMs && mtimeMs === gameDataSkillsMtimeMs) {
        return false;
    }
    const rows = readJsonArrayFile(gameDataSkillsJsonPath);
    cachedSkills = dedupeBy(
        rows,
        (row) => pickFirstText(row, FIELD_KEYS.skillName)
    );
    gameDataSkillsLoaded = true;
    gameDataSkillsMtimeMs = mtimeMs;
    console.log(`[game-data] skills loaded count=${cachedSkills.length}`);
    return true;
}

function loadGameDataClasses(forceReload = false) {
    if (!fs.existsSync(gameDataClassesJsonPath)) return false;
    const mtimeMs = getFileMtimeMsSafe(gameDataClassesJsonPath);
    if (!forceReload && gameDataClassesLoaded && mtimeMs && mtimeMs === gameDataClassesMtimeMs) {
        return false;
    }
    const rows = readJsonArrayFile(gameDataClassesJsonPath);
    cachedClasses = dedupeBy(
        rows,
        (row) => pickFirstText(row, FIELD_KEYS.className)
    );
    gameDataClassesLoaded = true;
    gameDataClassesMtimeMs = mtimeMs;
    console.log(`[game-data] classes loaded count=${cachedClasses.length}`);
    return true;
}

function resolveGameDataItemsJsonPath() {
    for (const candidatePath of gameDataItemsJsonCandidates) {
        if (fs.existsSync(candidatePath)) return candidatePath;
    }
    return '';
}

function resetStreamItemCacheIfStale(sourcePath = '') {
    const normalizedPath = normalizeText(sourcePath);
    const mtimeMs = getFileMtimeMsSafe(normalizedPath);
    if (
        normalizedPath !== itemStreamCacheSourcePath
        || mtimeMs !== itemStreamCacheSourceMtimeMs
    ) {
        itemStreamCacheSourcePath = normalizedPath;
        itemStreamCacheSourceMtimeMs = mtimeMs;
        itemStreamLookupCache = new Map();
        itemStreamMissingCache = new Set();
    }
}

async function findItemsByNameFromLargeJsonFile(sourcePath = '', itemNames = []) {
    const normalizedPath = normalizeText(sourcePath);
    const targetNames = (Array.isArray(itemNames) ? itemNames : [])
        .map((name) => normalizeItemLookupName(name))
        .filter(Boolean);
    if (!normalizedPath || !targetNames.length || !fs.existsSync(normalizedPath)) {
        return [];
    }

    resetStreamItemCacheIfStale(normalizedPath);

    const unresolved = targetNames.filter((name) => (
        !itemStreamLookupCache.has(name)
        && !itemStreamMissingCache.has(name)
    ));

    if (unresolved.length > 0) {
        const pending = new Set(unresolved);
        const stream = fs.createReadStream(normalizedPath, { encoding: 'utf8' });
        const rl = readline.createInterface({
            input: stream,
            crlfDelay: Infinity
        });
        try {
            for await (const rawLine of rl) {
                let line = String(rawLine || '').trim();
                if (!line || line === '[' || line === ']') continue;
                if (line.endsWith(',')) line = line.slice(0, -1).trim();
                if (!line.startsWith('{') || !line.endsWith('}')) continue;
                let row = null;
                try {
                    row = JSON.parse(line);
                } catch (parseError) {
                    continue;
                }
                const itemName = normalizeItemLookupName(pickFirstText(row, FIELD_KEYS.name));
                if (!itemName || !pending.has(itemName)) continue;
                itemStreamLookupCache.set(itemName, compactRecordObject(row));
                pending.delete(itemName);
                if (pending.size === 0) break;
            }
        } finally {
            rl.close();
            if (!stream.destroyed) {
                stream.destroy();
            }
        }
        pending.forEach((name) => itemStreamMissingCache.add(name));
    }

    const matched = [];
    targetNames.forEach((name) => {
        const row = itemStreamLookupCache.get(name);
        if (row && typeof row === 'object') {
            matched.push({ ...row });
        }
    });
    return matched;
}

function loadGameDataItems(forceReload = false) {
    const itemsJsonPath = resolveGameDataItemsJsonPath();
    if (!itemsJsonPath) {
        if (!gameDataItemsLoaded) {
            cachedItems = [];
            gameDataItemsLoaded = true;
            gameDataItemsMtimeMs = 0;
            console.log('[game-data] items data file not found; using empty item cache');
            return true;
        }
        return false;
    }
    const mtimeMs = getFileMtimeMsSafe(itemsJsonPath);
    if (!forceReload && gameDataItemsLoaded && mtimeMs && mtimeMs === gameDataItemsMtimeMs) {
        return false;
    }
    const rows = readJsonArrayFile(itemsJsonPath).map((row) => compactRecordObject(row));
    cachedItems = dedupeBy(
        rows,
        (row) => pickFirstText(row, FIELD_KEYS.name)
    );
    gameDataItemsLoaded = true;
    gameDataItemsMtimeMs = mtimeMs;
    console.log(`[game-data] items loaded count=${cachedItems.length}`);
    return true;
}

function resolveGameDataBodyJsonPath() {
    for (const candidatePath of gameDataBodyJsonCandidates) {
        if (fs.existsSync(candidatePath)) return candidatePath;
    }
    return '';
}

function loadGameDataBody(forceReload = false) {
    const bodyJsonPath = resolveGameDataBodyJsonPath();
    if (!bodyJsonPath) {
        if (!gameDataBodyLoaded) {
            cachedBody = [];
            gameDataBodyLoaded = true;
            gameDataBodyMtimeMs = 0;
            console.log('[game-data] body data file not found; using empty body cache');
            return true;
        }
        return false;
    }
    const mtimeMs = getFileMtimeMsSafe(bodyJsonPath);
    if (!forceReload && gameDataBodyLoaded && mtimeMs && mtimeMs === gameDataBodyMtimeMs) {
        return false;
    }
    const rows = readJsonArrayFile(bodyJsonPath);
    cachedBody = dedupeBy(
        rows,
        (row) => pickFirstText(row, FIELD_KEYS.bodyNo)
    );
    gameDataBodyLoaded = true;
    gameDataBodyMtimeMs = mtimeMs;
    console.log(`[game-data] body loaded count=${cachedBody.length}`);
    return true;
}

function ensureGameDataItemsLoaded() {
    if (!gameDataItemsLoaded) {
        loadGameDataItems(true);
        return;
    }
    loadGameDataItems(false);
}

function ensureGameDataSkillsLoaded() {
    if (!gameDataSkillsLoaded) {
        loadGameDataSkills(true);
        return;
    }
    loadGameDataSkills(false);
}

function ensureGameDataClassesLoaded() {
    if (!gameDataClassesLoaded) {
        loadGameDataClasses(true);
        return;
    }
    loadGameDataClasses(false);
}

function ensureGameDataBodyLoaded() {
    if (!gameDataBodyLoaded) {
        loadGameDataBody(true);
        return;
    }
    loadGameDataBody(false);
}

function normalizeMongoIdValue(value) {
    if (typeof value === 'string') return value;
    if (value === null || value === undefined) return '';
    if (typeof value?.toString === 'function') {
        return String(value.toString());
    }
    return String(value);
}

function normalizeMongoUserRow(row = {}) {
    const source = row && typeof row === 'object' && !Array.isArray(row) ? row : {};
    const normalized = { ...source };
    const normalizedId = normalizeText(
        normalized?.ID
        || normalized?.id
        || normalized?.userID
        || normalized?.username
        || normalized?.userName
        || normalized?.name
    );
    const normalizedPassword = normalizeText(
        normalized?.password
        || normalized?.pw
        || normalized?.pass
        || normalized?.Password
        || normalized?.PW
    );

    normalized.ID = normalizedId || normalizeMongoIdValue(source?._id);
    if (!normalizeText(normalized?.password) && normalizedPassword) {
        normalized.password = normalizedPassword;
    }
    return normalized;
}

function normalizeMongoCharacterRow(row = {}) {
    const source = row && typeof row === 'object' && !Array.isArray(row) ? row : {};
    const normalized = { ...source };
    if (!pickFirstText(normalized, FIELD_KEYS.name)) {
        normalized.名前 = normalizeMongoIdValue(source?._id);
    }
    return normalized;
}

function normalizeMongoItemRow(row = {}) {
    const source = row && typeof row === 'object' && !Array.isArray(row) ? row : {};
    const normalized = compactRecordObject({ ...source });
    if (!pickFirstText(normalized, FIELD_KEYS.name)) {
        normalized.名前 = normalizeMongoIdValue(source?._id);
    }
    return normalized;
}

function getNormalizedItemNameFromRow(row = {}) {
    return normalizeItemLookupName(
        pickFirstText(row, FIELD_KEYS.name)
        || normalizeMongoIdValue(row?._id)
    );
}

async function resolveMongoItemCollectionName(db) {
    const nowMs = Date.now();
    if (
        mongoItemCollectionNameCache
        && (nowMs - mongoItemCollectionCacheAtMs) < MONGO_PRIMARY_POLL_MS
    ) {
        return mongoItemCollectionNameCache;
    }

    const collections = await db.listCollections({}, { nameOnly: true }).toArray();
    const existingNames = new Set(
        (Array.isArray(collections) ? collections : [])
            .map((entry) => normalizeText(entry?.name))
            .filter(Boolean)
    );
    const resolved = MONGO_ITEM_COLLECTION_CANDIDATES.find((name) => existingNames.has(name)) || '';
    mongoItemCollectionNameCache = resolved;
    mongoItemCollectionCacheAtMs = nowMs;
    return resolved;
}

async function findItemsByNameFromMongo(itemNames = []) {
    if (!useMongoItemsInRender || !canUseMongoStateStore()) return [];
    const normalizedNames = (Array.isArray(itemNames) ? itemNames : [])
        .map((name) => normalizeItemLookupName(name))
        .filter(Boolean);
    if (!normalizedNames.length) return [];

    try {
        const rows = await withMongoClient(async ({ db }) => {
            const collectionName = await resolveMongoItemCollectionName(db);
            if (!collectionName) return [];
            const query = {
                $or: [
                    { 名前: { $in: normalizedNames } },
                    { name: { $in: normalizedNames } },
                    { itemName: { $in: normalizedNames } }
                ]
            };
            return db.collection(collectionName).find(query).toArray();
        }, {
            uri: mongoConfig.uri,
            dbName: mongoConfig.dbName
        });

        const map = new Map();
        (Array.isArray(rows) ? rows : []).forEach((row) => {
            const normalized = normalizeMongoItemRow(row);
            const key = getNormalizedItemNameFromRow(normalized);
            if (!key || map.has(key)) return;
            map.set(key, normalized);
        });

        const matchedItems = [];
        normalizedNames.forEach((name) => {
            const matched = map.get(name);
            if (matched) matchedItems.push({ ...matched });
        });
        return matchedItems;
    } catch (error) {
        console.error('[mongo] item query failed:', error?.message || error);
        return [];
    }
}

function getNormalizedUserLoginId(user = {}) {
    return normalizeText(
        user?.ID
        || user?.id
        || user?.userID
        || user?.username
        || user?.userName
        || user?.name
        || user?._id
    );
}

function getNormalizedUserLoginPassword(user = {}) {
    return normalizeText(
        user?.password
        || user?.pw
        || user?.pass
        || user?.Password
        || user?.PW
    );
}

function findCachedUserByCredentials(username = '', password = '') {
    const normalizedUsername = normalizeText(username);
    const normalizedPassword = normalizeText(password);
    if (!normalizedUsername || !normalizedPassword) return null;
    return (Array.isArray(cachedUsers) ? cachedUsers : []).find((user) => (
        getNormalizedUserLoginId(user) === normalizedUsername
        && getNormalizedUserLoginPassword(user) === normalizedPassword
    )) || null;
}

async function findUserByCredentials(username = '', password = '') {
    const normalizedUsername = normalizeText(username);
    const normalizedPassword = normalizeText(password);
    if (!normalizedUsername || !normalizedPassword) return null;

    const cachedUser = findCachedUserByCredentials(normalizedUsername, normalizedPassword);
    if (cachedUser) return cachedUser;
    if (!useMongoPrimaryData) return null;

    try {
        const docs = await withMongoClient(async ({ db }) => {
            return db.collection('User')
                .find({
                    $or: [
                        { ID: normalizedUsername },
                        { id: normalizedUsername },
                        { userID: normalizedUsername },
                        { username: normalizedUsername },
                        { userName: normalizedUsername },
                        { name: normalizedUsername }
                    ]
                })
                .limit(20)
                .toArray();
        }, {
            uri: mongoConfig.uri,
            dbName: mongoConfig.dbName
        });

        const normalizedUsers = (Array.isArray(docs) ? docs : [])
            .map((row) => normalizeMongoUserRow(row));
        if (normalizedUsers.length > 0) {
            const combinedUsers = [
                ...(Array.isArray(cachedUsers) ? cachedUsers : []),
                ...normalizedUsers
            ];
            cachedUsers = dedupeBy(combinedUsers, (row) => getNormalizedUserLoginId(row));
        }

        return normalizedUsers.find((user) => (
            getNormalizedUserLoginId(user) === normalizedUsername
            && getNormalizedUserLoginPassword(user) === normalizedPassword
        )) || null;
    } catch (error) {
        console.error('[mongo] user login query failed:', error?.message || error);
        return null;
    }
}

async function loadMongoPrimaryData(forceReload = false) {
    if (!useMongoPrimaryData) return false;
    if (mongoPrimaryReloadInProgress && mongoPrimaryReloadPromise) {
        return mongoPrimaryReloadPromise;
    }
    if (!forceReload && (Date.now() - mongoPrimaryLastLoadedAtMs) < (MONGO_PRIMARY_POLL_MS / 2)) {
        return false;
    }

    mongoPrimaryReloadInProgress = true;
    mongoPrimaryReloadPromise = (async () => {
        try {
            const loaded = await withMongoClient(async ({ db }) => {
                const [users, characters] = await Promise.all([
                    db.collection('User').find({}).toArray(),
                    db.collection('Character').find({}).toArray()
                ]);

                cachedUsers = (Array.isArray(users) ? users : []).map((row) => normalizeMongoUserRow(row));
                cachedCharacters = (Array.isArray(characters) ? characters : []).map((row) => normalizeMongoCharacterRow(row));
                return {
                    users: cachedUsers.length,
                    characters: cachedCharacters.length,
                    itemCache: cachedItems.length,
                    skillCache: cachedSkills.length
                };
            }, {
                uri: mongoConfig.uri,
                dbName: mongoConfig.dbName
            });

            mongoPrimaryLastLoadedAtMs = Date.now();
            console.log(
                `[mongo] primary loaded users=${loaded.users} characters=${loaded.characters}`
                + ` itemCache=${loaded.itemCache} skillCache=${loaded.skillCache}`
            );
            return true;
        } catch (error) {
            console.error('[mongo] primary load failed:', error?.message || error);
            return false;
        } finally {
            mongoPrimaryReloadInProgress = false;
            mongoPrimaryReloadPromise = null;
        }
    })();

    return mongoPrimaryReloadPromise;
}

async function loadMongoRequestedData(options = {}) {
    if (!useMongoPrimaryData) return false;
    const requestUsers = Boolean(options?.users);
    const requestCharacters = Boolean(options?.characters);
    if (!requestUsers && !requestCharacters) {
        return false;
    }
    if (mongoPrimaryReloadInProgress && mongoPrimaryReloadPromise) {
        const hasUsers = !requestUsers || (Array.isArray(cachedUsers) && cachedUsers.length > 0);
        const hasCharacters = !requestCharacters || (Array.isArray(cachedCharacters) && cachedCharacters.length > 0);
        if (hasUsers && hasCharacters) {
            return true;
        }
        // 初回全件ロード中でも、必要データが無ければ個別ロードを優先して待ち時間を減らす。
    }

    try {
        const loaded = await withMongoClient(async ({ db }) => {
            const jobs = [];
            if (requestUsers) {
                jobs.push(
                    db.collection('User').find({}).toArray().then((users) => {
                        cachedUsers = (Array.isArray(users) ? users : []).map((row) => normalizeMongoUserRow(row));
                    })
                );
            }
            if (requestCharacters) {
                jobs.push(
                    db.collection('Character').find({}).toArray().then((characters) => {
                        cachedCharacters = (Array.isArray(characters) ? characters : []).map((row) => normalizeMongoCharacterRow(row));
                    })
                );
            }
            await Promise.all(jobs);
            return {
                users: requestUsers ? cachedUsers.length : null,
                characters: requestCharacters ? cachedCharacters.length : null
            };
        }, {
            uri: mongoConfig.uri,
            dbName: mongoConfig.dbName
        });

        mongoPrimaryLastLoadedAtMs = Date.now();
        console.log(
            `[mongo] targeted loaded`
            + `${requestUsers ? ` users=${loaded.users}` : ''}`
            + `${requestCharacters ? ` characters=${loaded.characters}` : ''}`
        );
        return true;
    } catch (error) {
        console.error('[mongo] targeted load failed:', error?.message || error);
        return false;
    }
}

async function ensureMongoPrimaryCache(options = {}) {
    if (!useMongoPrimaryData) return;

    const needsUsers = Boolean(options?.users) && (!Array.isArray(cachedUsers) || cachedUsers.length === 0);
    const needsCharacters = Boolean(options?.characters) && (!Array.isArray(cachedCharacters) || cachedCharacters.length === 0);
    const forceReload = needsUsers || needsCharacters;

    if (forceReload) {
        await loadMongoRequestedData(options);
        return;
    }

    // キャッシュが既にある場合、更新はバックグラウンドで行いレスポンス待ちを避ける。
    loadMongoPrimaryData(false).catch((error) => {
        console.error('[mongo] background refresh failed:', error?.message || error);
    });
}

function refreshLoadedGameDataCaches() {
    if (gameDataItemsLoaded) loadGameDataItems(false);
    if (gameDataSkillsLoaded) loadGameDataSkills(false);
    if (gameDataClassesLoaded) loadGameDataClasses(false);
    if (gameDataBodyLoaded) loadGameDataBody(false);
}

setInterval(() => {
    refreshLoadedGameDataCaches();
}, GAME_DATA_POLL_MS);
if (useMongoPrimaryData) {
    setInterval(() => {
        loadMongoPrimaryData(false);
    }, MONGO_PRIMARY_POLL_MS);
}
if (!useMongoPrimaryData) {
    console.warn('[storage] mongoPrimaryData=false and Excel fallback is disabled.');
}

router.get('/character', async (req, res) => {
    try {
        await ensureMongoPrimaryCache({ characters: true });
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

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const normalizedUsername = normalizeText(username);
        const normalizedPassword = normalizeText(password);

        if (normalizedUsername === GM_LOGIN_ID && normalizedPassword === GM_LOGIN_PASSWORD) {
            const gmToken = createGmSessionToken();
            return res.status(200).send({
                message: 'GMログイン成功',
                mode: 'gm',
                gmToken
            });
        }

        await ensureMongoPrimaryCache({ users: true, characters: true });
        const user = await findUserByCredentials(normalizedUsername, normalizedPassword);

        if (!user) {
            if (useMongoPrimaryData) {
                const mongoStatus = await getMongoConnectionStatus({ force: true });
                if (!mongoStatus?.connected) {
                    return res.status(503).send({
                        message: 'mongodb is not connected',
                        mongoStatus
                    });
                }
            }
            console.warn(
                `[login] invalid credentials user=${normalizedUsername} cachedUsers=${Array.isArray(cachedUsers) ? cachedUsers.length : 0} db=${mongoConfig.dbName}`
            );
            return res.status(401).send({ message: 'invalid id or password' });
        }

        const characters = buildLoginCharactersForUser(user);
        upsertConnectedPlayer(
            normalizedUsername,
            characters.map((character) => normalizeText(character?.名前)),
            { replaceCharacterNames: true }
        );

        return res.status(200).send({
            message: 'ログイン成功',
            mode: 'player',
            characters
        });
    } catch (error) {
        console.error('login error:', error);
        return res.status(500).send({ message: 'login failed' });
    }
});

router.post('/skills', async (req, res) => {
    try {
        ensureGameDataSkillsLoaded();
        let { skillNames } = req.body;
        if (!Array.isArray(skillNames)) {
            skillNames = [skillNames];
        }
        const nameSet = new Set(skillNames.map((name) => normalizeText(name)).filter(Boolean));
        const sourceSkills = cachedSkills;

        const matchedSkills = (Array.isArray(sourceSkills) ? sourceSkills : [])
            .filter((skill) => nameSet.has(pickFirstText(skill, FIELD_KEYS.skillName)))
            .reduce((grouped, skill) => {
                const type = pickFirstText(skill, FIELD_KEYS.skillType);
                if (!type) return grouped;
                if (!grouped[type]) grouped[type] = [];
                grouped[type].push(skill);
                return grouped;
            }, {});

        return res.json({ success: true, skills: matchedSkills });
    } catch (error) {
        console.error('skills fetch error:', error);
        return res.status(500).json({ success: false, message: 'failed to fetch skills' });
    }
});

router.post('/getSkillByName', async (req, res) => {
    try {
        ensureGameDataSkillsLoaded();
        let { skillNames } = req.body;
        if (!Array.isArray(skillNames)) {
            skillNames = [skillNames];
        }

        if (!skillNames || skillNames.length === 0) {
            return res.status(400).json({ success: false, message: 'skillNames is required' });
        }

        const nameSet = new Set(skillNames.map((name) => normalizeText(name)).filter(Boolean));
        const sourceSkills = cachedSkills;
        const matchedSkills = (Array.isArray(sourceSkills) ? sourceSkills : [])
            .filter((skill) => nameSet.has(pickFirstText(skill, FIELD_KEYS.skillName)));

        if (matchedSkills.length === 0) {
            return res.status(404).json({ success: false, message: 'skills not found' });
        }

        return res.json({ success: true, skills: matchedSkills });
    } catch (error) {
        console.error('getSkillByName error:', error);
        return res.status(500).json({ success: false, message: 'failed to fetch skills' });
    }
});

router.post('/magics', async (req, res) => {
    try {
        ensureGameDataSkillsLoaded();
        let { skillNames } = req.body;
        if (!Array.isArray(skillNames)) {
            skillNames = [skillNames];
        }
        const nameSet = new Set(skillNames.map((name) => normalizeText(name)).filter(Boolean));
        const sourceSkills = cachedSkills;

        const matchedSkills = (Array.isArray(sourceSkills) ? sourceSkills : [])
            .filter((skill) => nameSet.has(pickFirstText(skill, FIELD_KEYS.skillName)))
            .reduce((grouped, skill) => {
                const type = pickFirstText(skill, FIELD_KEYS.skillType);
                if (!type) return grouped;
                if (!grouped[type]) grouped[type] = [];
                grouped[type].push(skill);
                return grouped;
            }, {});

        return res.json({ success: true, skills: matchedSkills });
    } catch (error) {
        console.error('magics fetch error:', error);
        return res.status(500).json({ success: false, message: 'failed to fetch magics' });
    }
});

router.post('/classes', (req, res) => {
    ensureGameDataClassesLoaded();
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
        ensureGameDataBodyLoaded();
        const { bodyTypeList } = req.body;
        const typesToMatch = Array.isArray(bodyTypeList)
            ? bodyTypeList.map((v) => normalizeText(v)).filter(Boolean)
            : (bodyTypeList ? [normalizeText(bodyTypeList)] : []);

        const typeSet = new Set(typesToMatch);
        const matchedBodyTypes = (Array.isArray(cachedBody) ? cachedBody : []).filter((bodyData) => (
            typeSet.has(pickFirstText(bodyData, FIELD_KEYS.bodyNo))
        ));

        res.json({ success: true, bodyData: matchedBodyTypes });
    } catch (error) {
        console.error('body fetch error:', error);
        res.status(500).json({ success: false, message: 'failed to fetch body data' });
    }
});

router.post('/items', async (req, res) => {
    try {
        const { itemList } = req.body;
        const itemsToMatch = (Array.isArray(itemList) ? itemList : [itemList])
            .map((itemName) => normalizeItemLookupName(itemName))
            .filter(Boolean);

        if (!itemsToMatch.length) {
            return res.json({ success: true, itemData: [] });
        }

        if (useMongoItemsInRender) {
            const mongoStatus = await getMongoConnectionStatus().catch(() => null);
            if (!mongoStatus?.connected) {
                return res.status(503).json({
                    success: false,
                    message: 'mongodb is not connected for item lookup',
                    mongoStatus
                });
            }
            const matchedItems = await findItemsByNameFromMongo(itemsToMatch);
            return res.json({ success: true, itemData: matchedItems });
        }

        const itemsJsonPath = resolveGameDataItemsJsonPath();
        const itemFileSize = getFileSizeSafe(itemsJsonPath);
        if (itemFileSize >= LARGE_ITEM_JSON_STREAM_THRESHOLD_BYTES) {
            const matchedItems = await findItemsByNameFromLargeJsonFile(itemsJsonPath, itemsToMatch);
            return res.json({ success: true, itemData: matchedItems });
        }

        ensureGameDataItemsLoaded();

        if (!cachedItems || !Array.isArray(cachedItems)) {
            console.error('cachedItems is invalid');
            return res.status(500).json({ success: false, message: 'failed to fetch item data' });
        }

        const matchedItems = [];
        itemsToMatch.forEach((itemName) => {
            const foundItems = cachedItems.filter(
                (itemData) => pickFirstText(itemData, FIELD_KEYS.name) === itemName
            );
            matchedItems.push(...foundItems);
        });

        return res.json({ success: true, itemData: matchedItems });
    } catch (error) {
        console.error('items fetch error:', error);
        return res.status(500).json({ success: false, message: 'failed to fetch item data' });
    }
});

router.post('/update-data', (req, res) => {
    // 現在は no-op（将来の永続化用エンドポイント）
    void req.body;
    res.json({ message: 'Data updated successfully' });
});

router.post('/memo/load', async (req, res) => {
    try {
        const playerId = normalizeText(req.body?.playerId) || 'guest';
        const characterName = normalizeText(req.body?.characterName) || '不明';
        if (characterName !== '不明') {
            upsertConnectedPlayer(playerId, [characterName]);
        } else {
            upsertConnectedPlayer(playerId, []);
        }
        const store = await readBattleMemoStoreForRuntime();
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

router.post('/memo/save', async (req, res) => {
    try {
        const playerId = normalizeText(req.body?.playerId) || 'guest';
        const characterName = normalizeText(req.body?.characterName) || '不明';
        if (characterName !== '不明') {
            upsertConnectedPlayer(playerId, [characterName]);
        } else {
            upsertConnectedPlayer(playerId, []);
        }
        const text = String(req.body?.text || '');

        if (text.length > 200000) {
            return res.status(400).json({
                success: false,
                message: 'memo text is too long'
            });
        }

        const nowIso = new Date().toISOString();
        const store = await readBattleMemoStoreForRuntime();
        const playerMemo = convertLegacyMemoDataForPlayer(store?.memos?.[playerId] || {});
        const characterEntry = normalizeMemoEntry(playerMemo?.characters?.[characterName] || {}, 'メモ');
        const activeTab = characterEntry.tabs.find((tab) => tab.id === characterEntry.activeTabId) || characterEntry.tabs[0];
        activeTab.text = text;
        playerMemo.characters[characterName] = characterEntry;
        store.memos[playerId] = normalizeMemoData(playerMemo);
        store.updatedAt = nowIso;
        await writeBattleMemoStoreForRuntime(store);

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

router.post('/memo/all/load', async (req, res) => {
    try {
        const playerId = normalizeText(req.body?.playerId) || 'guest';
        const requestedCharacterNames = Array.isArray(req.body?.characterNames)
            ? req.body.characterNames.map((name) => normalizeText(name)).filter(Boolean)
            : [];
        upsertConnectedPlayer(playerId, requestedCharacterNames, {
            replaceCharacterNames: requestedCharacterNames.length > 0
        });
        const store = await readBattleMemoStoreForRuntime();
        const profiles = await resolveCharacterProfilesForMemoStore(store, {
            playerId,
            characterNames: requestedCharacterNames
        });
        const normalized = convertLegacyMemoDataForPlayer(store?.memos?.[playerId] || {});
        const { memoData: normalizedPlayerMemo } = splitProfilesFromMemoData(normalized, profiles);
        const mergedForClient = mergeCharacterProfilesIntoMemoData(
            normalizedPlayerMemo,
            profiles,
            requestedCharacterNames
        );

        // 旧形式から読み込まれた場合も新形式で保持
        store.memos[playerId] = normalizedPlayerMemo;
        await writeBattleMemoStoreForRuntime(store);

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

router.post('/memo/all/save', async (req, res) => {
    try {
        const playerId = normalizeText(req.body?.playerId) || 'guest';
        const data = normalizeMemoData(req.body?.data || {}, { characterAllowEmptyTabs: true });
        const characterNames = Object.keys(
            (data?.characters && typeof data.characters === 'object') ? data.characters : {}
        );
        upsertConnectedPlayer(playerId, characterNames, {
            replaceCharacterNames: characterNames.length > 0
        });
        const nowIso = new Date().toISOString();
        const store = await readBattleMemoStoreForRuntime();
        const existingProfiles = await resolveCharacterProfilesForMemoStore(store, {
            playerId,
            characterNames
        });
        const { memoData: playerMemo, profiles } = splitProfilesFromMemoData(data, existingProfiles, nowIso);
        await writeCharacterProfileStoreForRuntime({
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
        await writeBattleMemoStoreForRuntime(store);
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

router.post('/skill-set/list', async (req, res) => {
    try {
        const characterName = normalizeText(req.body?.characterName) || '不明';
        const store = await readSkillSetPresetStoreForRuntime();
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

router.post('/skill-set/load', async (req, res) => {
    try {
        const characterName = normalizeText(req.body?.characterName) || '不明';
        const presetName = normalizeText(req.body?.presetName);
        if (!presetName) {
            return res.status(400).json({
                success: false,
                message: 'presetName is required'
            });
        }

        const store = await readSkillSetPresetStoreForRuntime();
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

router.post('/skill-set/save', async (req, res) => {
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
        const store = await readSkillSetPresetStoreForRuntime();
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
        await writeSkillSetPresetStoreForRuntime(store);

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

router.post('/skill-set/delete', async (req, res) => {
    try {
        const characterName = normalizeText(req.body?.characterName) || '不明';
        const presetName = normalizeText(req.body?.presetName);
        if (!presetName) {
            return res.status(400).json({
                success: false,
                message: 'presetName is required'
            });
        }

        const store = await readSkillSetPresetStoreForRuntime();
        if (
            store?.presets?.[characterName]
            && Object.prototype.hasOwnProperty.call(store.presets[characterName], presetName)
        ) {
            delete store.presets[characterName][presetName];
            store.updatedAt = new Date().toISOString();
            await writeSkillSetPresetStoreForRuntime(store);
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

router.post('/skill-set/rename', async (req, res) => {
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

        const store = await readSkillSetPresetStoreForRuntime();
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
        await writeSkillSetPresetStoreForRuntime(store);

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

router.post('/battle-state/load', async (req, res) => {
    try {
        ensureGameDataSkillsLoaded();
        const playerId = normalizeText(req.body?.playerId) || 'guest';
        const requestedCharacterNames = (Array.isArray(req.body?.characterNames) ? req.body.characterNames : [])
            .map((name) => normalizeText(name))
            .filter(Boolean);
        upsertConnectedPlayer(playerId, requestedCharacterNames, {
            replaceCharacterNames: requestedCharacterNames.length > 0
        });
        const requestedSet = new Set(requestedCharacterNames);

        const store = canUseMongoStateStore()
            ? await readBattleStateStoreFromMongo({ playerId })
            : readBattleStateStore();
        const playerStates = normalizeBattleStateCharacterCollection(store?.states?.[playerId] || {});

        const states = requestedSet.size > 0
            ? Object.fromEntries(
                Object.entries(playerStates).filter(([characterName]) => requestedSet.has(characterName))
            )
            : playerStates;

        return res.status(200).json({
            success: true,
            updatedAt: store?.updatedAt || null,
            states
        });
    } catch (error) {
        console.error('battle-state load error:', error);
        return res.status(500).json({
            success: false,
            message: 'failed to load battle state'
        });
    }
});

router.post('/battle-state/save', async (req, res) => {
    try {
        const playerId = normalizeText(req.body?.playerId) || 'guest';
        const characterName = normalizeText(req.body?.characterName);
        if (!characterName) {
            return res.status(400).json({
                success: false,
                message: 'characterName is required'
            });
        }
        upsertConnectedPlayer(playerId, [characterName]);

        const normalizedState = normalizeBattleStateCharacterEntry(req.body?.state || {});
        if (canUseMongoStateStore()) {
            const saved = await saveBattleStateEntryToMongo(playerId, characterName, normalizedState);
            return res.status(200).json({
                success: true,
                updatedAt: saved?.updatedAt || new Date().toISOString(),
                state: normalizedState
            });
        }

        const store = readBattleStateStore();
        if (!store.states[playerId] || typeof store.states[playerId] !== 'object') {
            store.states[playerId] = {};
        }
        store.states[playerId][characterName] = normalizedState;
        store.updatedAt = new Date().toISOString();
        writeBattleStateStore(store);

        return res.status(200).json({
            success: true,
            updatedAt: store.updatedAt,
            state: normalizedState
        });
    } catch (error) {
        console.error('battle-state save error:', error);
        return res.status(500).json({
            success: false,
            message: 'failed to save battle state'
        });
    }
});

router.post('/presence/heartbeat', async (req, res) => {
    try {
        const playerId = normalizeText(req.body?.playerId);
        const scope = normalizeText(req.body?.scope).toLowerCase();
        const useStoryScope = scope === 'story';
        const selectedCharacterName = normalizeText(req.body?.selectedCharacterName);
        const characterNamesRaw = Array.isArray(req.body?.characterNames)
            ? req.body.characterNames
            : [req.body?.characterName];
        const characterNames = normalizeNameList(characterNamesRaw);
        const entry = (useStoryScope ? upsertStoryConnectedPlayer : upsertConnectedPlayer)(playerId, characterNames, {
            replaceCharacterNames: characterNames.length > 0,
            selectedCharacterName
        });
        if (canUseMongoStateStore() && entry) {
            const mongoStatus = await getMongoConnectionStatus().catch(() => null);
            if (mongoStatus?.connected) {
                try {
                    await upsertPresenceMongo(useStoryScope ? 'story' : 'default', entry);
                } catch (mongoError) {
                    console.warn('presence heartbeat mongo upsert failed:', mongoError?.message || mongoError);
                }
            }
        }
        return res.status(200).json({
            success: true,
            scope: useStoryScope ? 'story' : 'default',
            connected: Boolean(entry),
            playerId: normalizeText(entry?.playerId),
            selectedCharacterName: normalizeText(entry?.selectedCharacterName),
            lastSeenAt: entry ? new Date(entry.lastSeenAtMs).toISOString() : null
        });
    } catch (error) {
        console.error('presence heartbeat error:', error);
        return res.status(500).json({
            success: false,
            message: 'failed to update presence heartbeat'
        });
    }
});

router.post('/presence/disconnect', async (req, res) => {
    try {
        const playerId = normalizeText(req.body?.playerId);
        const scope = normalizeText(req.body?.scope).toLowerCase();
        let removed = false;
        if (scope === 'story') {
            removed = removeStoryConnectedPlayer(playerId);
        } else if (scope) {
            removed = removeConnectedPlayer(playerId);
        } else {
            const removedDefault = removeConnectedPlayer(playerId);
            const removedStory = removeStoryConnectedPlayer(playerId);
            removed = removedDefault || removedStory;
        }
        if (canUseMongoStateStore()) {
            const mongoStatus = await getMongoConnectionStatus().catch(() => null);
            if (mongoStatus?.connected) {
                const mongoRemoved = await removePresenceMongo(playerId, scope);
                removed = removed || mongoRemoved;
            }
        }
        return res.status(200).json({
            success: true,
            removed
        });
    } catch (error) {
        console.error('presence disconnect error:', error);
        return res.status(500).json({
            success: false,
            message: 'failed to update disconnect presence'
        });
    }
});

router.get('/gm/dashboard', async (req, res) => {
    try {
        const token = normalizeText(req.get('x-gm-token') || req.query?.token);
        if (!hasValidGmSessionToken(token)) {
            return res.status(401).json({
                success: false,
                message: 'invalid gm token'
            });
        }

        const sinceMs = Date.parse(normalizeText(req.query?.since));
        const mongoStatus = await getMongoConnectionStatus();
        const useMongoForDashboard = Boolean(
            canUseMongoStateStore()
            && mongoStatus?.connected
        );
        const dashboardUpdatedAtMs = useMongoForDashboard
            ? await getGmDashboardUpdatedAtMsAsync().catch((error) => {
                console.warn('gm dashboard: failed to read mongo updatedAt, fallback to file cache', error?.message || error);
                return getGmDashboardUpdatedAtMs();
            })
            : getGmDashboardUpdatedAtMs();
        const dashboardUpdatedAt = dashboardUpdatedAtMs > 0
            ? new Date(dashboardUpdatedAtMs).toISOString()
            : new Date().toISOString();
        if (Number.isFinite(sinceMs) && sinceMs >= dashboardUpdatedAtMs && dashboardUpdatedAtMs > 0) {
            return res.status(200).json({
                success: true,
                notModified: true,
                updatedAt: dashboardUpdatedAt,
                mongoStatus
            });
        }

        if (useMongoForDashboard) {
            await ensureMongoPrimaryCache({ characters: true });
        }
        ensureGameDataSkillsLoaded();
        if (useMongoForDashboard) {
            await refreshPresenceMapFromMongo(storyConnectedPlayerMap, 'story');
        }
        const selectDataLog = useMongoForDashboard
            ? await readSelectDataLogSnapshotFromMongo().catch((error) => {
                console.warn('gm dashboard: select_dataLog mongo read failed, fallback to file cache', error?.message || error);
                return readSelectDataLogSnapshot();
            })
            : readSelectDataLogSnapshot();
        const battleStateStore = useMongoForDashboard
            ? await readBattleStateStoreFromMongo().catch((error) => {
                console.warn('gm dashboard: battleState mongo read failed, fallback to file cache', error?.message || error);
                return readBattleStateStore();
            })
            : readBattleStateStore();
        const connectedPlayers = getStoryConnectedPlayerList({
            includeBattleState: true,
            battleStateStore
        });
        return res.status(200).json({
            success: true,
            notModified: false,
            updatedAt: dashboardUpdatedAt,
            connectedPlayers,
            selectDataLog,
            mongoStatus
        });
    } catch (error) {
        console.error('gm dashboard error:', error);
        const details = normalizeText(error?.message) || 'unknown error';
        return res.status(500).json({
            success: false,
            message: 'failed to load gm dashboard',
            details
        });
    }
});

router.post('/select_dataLog', async (req, res) => {
    try {
        const payload = req.body?.skillNames || {};
        const now = new Date();
        const timestamp = now.toISOString();
        const requestId = `log-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        const skillsRaw = Array.isArray(payload.skills) ? payload.skills : [];
        const skillNames = skillsRaw
            .map((skill) => {
                if (typeof skill === 'string') return normalizeText(skill);
                return normalizeText(skill?.name || skill?.skillName || skill?.skill || '');
            })
            .filter(Boolean);
        const rollResults = (Array.isArray(payload.rollResults) ? payload.rollResults : [])
            .map((result) => sanitizeTsvValue(result))
            .filter((result) => result !== '');
        const logEntry = {
            timestamp,
            requestId,
            name: sanitizeTsvValue(payload.name),
            attackOption: sanitizeTsvValue(payload.attackOption),
            fullPower: payload.fullPower ? 1 : 0,
            skills: skillNames,
            rollResults
        };

        if (canUseMongoStateStore()) {
            await enqueueSelectDataLogRow(logEntry);
        } else {
            fs.mkdirSync(path.dirname(selectDataLogPath), { recursive: true });
            fs.appendFileSync(selectDataLogPath, `${JSON.stringify(logEntry)}\n`, 'utf8');
        }

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
