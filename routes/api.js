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
const battleStateJsonPath = path.join(logsDirPath, 'battle-state.json');
const RETAINED_BUFF_INFINITE_TURNS = 9999999;
const skillSetIconDirName = '攻撃手段';
const skillSetIconDirPath = path.join(process.cwd(), 'public', 'images', skillSetIconDirName);
const MEMO_PROFILE_TAB_ID = '__profile__';
const MEMO_PROFILE_TAB_TITLE = 'プロフィール';
const GM_LOGIN_ID = 'siev';
const GM_LOGIN_PASSWORD = '11';
const GM_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const PLAYER_ACTIVE_TTL_MS = 3 * 60 * 1000;

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

function normalizeNameList(values) {
    return Array.from(new Set(
        (Array.isArray(values) ? values : [])
            .map((value) => normalizeText(value))
            .filter(Boolean)
    ));
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
        const characterData = findCharacterByName(characterName);
        if (!characterData) continue;
        const summary = buildCharacterSummary(characterData);
        if (!summary) continue;
        characters.push(summary);
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

function readSelectDataLogSnapshot() {
    if (!fs.existsSync(selectDataLogPath)) {
        return {
            exists: false,
            updatedAt: null,
            mtimeMs: 0,
            text: ''
        };
    }
    try {
        const stat = fs.statSync(selectDataLogPath);
        const mtimeMs = Number(stat?.mtimeMs) || 0;
        const updatedAt = mtimeMs > 0 ? new Date(mtimeMs).toISOString() : null;
        const text = fs.readFileSync(selectDataLogPath, 'utf8');
        return {
            exists: true,
            updatedAt,
            mtimeMs,
            text: String(text ?? '')
        };
    } catch (error) {
        console.error('read select_dataLog snapshot error:', error);
        return {
            exists: true,
            updatedAt: null,
            mtimeMs: 0,
            text: ''
        };
    }
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

    const user = cachedUsers.find(
        (u) => normalizeText(u.ID) === normalizedUsername
            && normalizeText(u.password) === normalizedPassword
    );

    if (!user) {
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
        if (characterName !== '不明') {
            upsertConnectedPlayer(playerId, [characterName]);
        } else {
            upsertConnectedPlayer(playerId, []);
        }
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
        upsertConnectedPlayer(playerId, requestedCharacterNames, {
            replaceCharacterNames: requestedCharacterNames.length > 0
        });
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
        const characterNames = Object.keys(
            (data?.characters && typeof data.characters === 'object') ? data.characters : {}
        );
        upsertConnectedPlayer(playerId, characterNames, {
            replaceCharacterNames: characterNames.length > 0
        });
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

router.post('/battle-state/load', (req, res) => {
    try {
        const playerId = normalizeText(req.body?.playerId) || 'guest';
        const requestedCharacterNames = (Array.isArray(req.body?.characterNames) ? req.body.characterNames : [])
            .map((name) => normalizeText(name))
            .filter(Boolean);
        upsertConnectedPlayer(playerId, requestedCharacterNames, {
            replaceCharacterNames: requestedCharacterNames.length > 0
        });
        const requestedSet = new Set(requestedCharacterNames);

        const store = readBattleStateStore();
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

router.post('/battle-state/save', (req, res) => {
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

        const store = readBattleStateStore();
        if (!store.states[playerId] || typeof store.states[playerId] !== 'object') {
            store.states[playerId] = {};
        }

        const normalizedState = normalizeBattleStateCharacterEntry(req.body?.state || {});
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

router.post('/presence/heartbeat', (req, res) => {
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

router.post('/presence/disconnect', (req, res) => {
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

router.get('/gm/dashboard', (req, res) => {
    try {
        const token = normalizeText(req.get('x-gm-token') || req.query?.token);
        if (!hasValidGmSessionToken(token)) {
            return res.status(401).json({
                success: false,
                message: 'invalid gm token'
            });
        }

        const selectDataLog = readSelectDataLogSnapshot();
        const battleStateStore = readBattleStateStore();
        const connectedPlayers = getStoryConnectedPlayerList({
            includeBattleState: true,
            battleStateStore
        });
        return res.status(200).json({
            success: true,
            updatedAt: new Date().toISOString(),
            connectedPlayers,
            selectDataLog
        });
    } catch (error) {
        console.error('gm dashboard error:', error);
        return res.status(500).json({
            success: false,
            message: 'failed to load gm dashboard'
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
