const fs = require('fs');
const path = require('path');

function normalizeText(value) {
    return String(value ?? '').trim();
}

function toFiniteNumber(value, fallback = 0) {
    const normalized = normalizeText(value);
    if (normalized === '') return fallback;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function deepCloneJsonValue(value) {
    return JSON.parse(JSON.stringify(value));
}

function pickFirstValue(obj, keys, fallback = undefined) {
    if (!obj || typeof obj !== 'object') return fallback;
    const sourceKeys = Array.isArray(keys) ? keys : [];
    for (const key of sourceKeys) {
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

function normalizeTextList(value, splitPattern = /[,\s、]+/) {
    if (Array.isArray(value)) {
        return Array.from(new Set(
            value
                .map((entry) => normalizeText(entry))
                .filter(Boolean)
        ));
    }
    if (typeof value === 'string') {
        return Array.from(new Set(
            value
                .split(splitPattern)
                .map((entry) => normalizeText(entry))
                .filter(Boolean)
        ));
    }
    return [];
}

function normalizeMagicAttributeName(rawValue, realmNameSuffix = '領域') {
    const suffix = normalizeText(realmNameSuffix) || '領域';
    let value = normalizeText(rawValue);
    if (!value) return '';

    if (value.endsWith(`の${suffix}`)) {
        value = normalizeText(value.slice(0, -(`の${suffix}`).length));
    } else if (value.endsWith(suffix)) {
        value = normalizeText(value.slice(0, -suffix.length));
    }

    if (value.endsWith('の')) {
        value = normalizeText(value.slice(0, -1));
    }
    return value;
}

function readMagicAcquireConfigFileAsIs(filePath, fallbackValue) {
    if (!filePath || !fs.existsSync(filePath)) {
        return deepCloneJsonValue(fallbackValue);
    }

    const ext = path.extname(filePath).toLowerCase();
    try {
        if (ext === '.js' || ext === '.cjs') {
            const resolvedPath = require.resolve(filePath);
            delete require.cache[resolvedPath];
            const loaded = require(resolvedPath);
            const loadedConfig = (
                loaded
                && typeof loaded === 'object'
                && Object.prototype.hasOwnProperty.call(loaded, 'default')
            )
                ? loaded.default
                : loaded;
            if (!loadedConfig || typeof loadedConfig !== 'object' || Array.isArray(loadedConfig)) {
                return deepCloneJsonValue(fallbackValue);
            }
            return deepCloneJsonValue(loadedConfig);
        }

        const raw = fs.readFileSync(filePath, 'utf8');
        if (!String(raw || '').trim()) {
            return deepCloneJsonValue(fallbackValue);
        }
        return JSON.parse(raw);
    } catch (error) {
        console.error(`read magic acquire config load error: ${filePath}`, error);
        return deepCloneJsonValue(fallbackValue);
    }
}

function createEmptyMagicAcquireConfig() {
    return {
        defaultMagicAttributes: [],
        realmNameSuffix: '領域',
        classRowMagicListStartKey: '物理軽減',
        rankPointTable: [],
        baseTableOver: [],
        acquisitionRateMap: {},
        magicRankFormula: {},
        magicSkillRank: {},
        magicSystemFields: {}
    };
}

function normalizeMagicAcquireConfig(input = {}) {
    const fallback = createEmptyMagicAcquireConfig();
    const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
    const formulaSource = source?.magicRankFormula && typeof source.magicRankFormula === 'object'
        ? source.magicRankFormula
        : {};
    const skillRankSource = source?.magicSkillRank && typeof source.magicSkillRank === 'object'
        ? source.magicSkillRank
        : {};
    const systemFieldSource = source?.magicSystemFields && typeof source.magicSystemFields === 'object'
        ? source.magicSystemFields
        : {};

    const defaultMagicAttributes = normalizeTextList(source.defaultMagicAttributes);
    const rankFields = normalizeTextList(skillRankSource.rankFields);
    const levelFields = normalizeTextList(skillRankSource.levelFields);
    const magicFields = normalizeTextList(systemFieldSource.magicFields);
    const faithFields = normalizeTextList(systemFieldSource.faithFields);
    const circleMarks = normalizeTextList(systemFieldSource.circleMarks, /[,\s]+/);

    const normalizedDivisor = Math.max(0.0000001, toFiniteNumber(formulaSource.divisor, 1));
    const normalizedLevelDivisor = Math.max(0.0000001, toFiniteNumber(skillRankSource.levelDivisor, 1));
    const sourceRankPointTable = Array.isArray(source.rankPointTable)
        ? source.rankPointTable
        : [];
    const rankPointTable = sourceRankPointTable
        .map((entry) => {
            const row = entry && typeof entry === 'object' ? entry : {};
            const rank = Math.max(1, Math.floor(toFiniteNumber(row.rank, 0)));
            const min = Math.max(0, toFiniteNumber(row.min, 0));
            const maxRaw = normalizeText(row.max);
            const max = (
                !maxRaw
                || maxRaw.toLowerCase() === 'infinity'
                || maxRaw === '∞'
            )
                ? Number.POSITIVE_INFINITY
                : toFiniteNumber(row.max, Number.POSITIVE_INFINITY);
            return { rank, min, max };
        })
        .filter((entry) => Number.isFinite(entry.rank))
        .sort((a, b) => (a.rank - b.rank));

    const sourceBaseTableOver = Array.isArray(source.baseTableOver)
        ? source.baseTableOver
        : [];
    const baseTableOver = sourceBaseTableOver
        .map((row) => (
            Array.isArray(row)
                ? row.map((value) => Math.max(0, Math.floor(toFiniteNumber(value, 0))))
                : []
        ))
        .filter((row) => row.length > 0);

    const sourceRateMap = (source.acquisitionRateMap && typeof source.acquisitionRateMap === 'object')
        ? source.acquisitionRateMap
        : {};
    const acquisitionRateMap = {};
    Object.entries(sourceRateMap).forEach(([key, value]) => {
        const normalizedKey = normalizeText(key);
        if (!normalizedKey) return;
        acquisitionRateMap[normalizedKey] = Math.max(0, Math.min(1, toFiniteNumber(value, 0)));
    });
    return {
        defaultMagicAttributes: defaultMagicAttributes.length > 0
            ? defaultMagicAttributes
            : [...fallback.defaultMagicAttributes],
        realmNameSuffix: normalizeText(source.realmNameSuffix) || fallback.realmNameSuffix,
        classRowMagicListStartKey: normalizeText(source.classRowMagicListStartKey) || fallback.classRowMagicListStartKey,
        rankPointTable: rankPointTable.length > 0
            ? rankPointTable
            : deepCloneJsonValue(fallback.rankPointTable),
        baseTableOver: baseTableOver.length > 0
            ? baseTableOver
            : deepCloneJsonValue(fallback.baseTableOver),
        acquisitionRateMap,
        magicRankFormula: {
            baseWhenPositive: toFiniteNumber(formulaSource.baseWhenPositive, 0),
            divisor: normalizedDivisor,
            treatAsRankMax: Math.max(0, toFiniteNumber(formulaSource.treatAsRankMax, 0))
        },
        magicSkillRank: {
            rankFields: rankFields.length > 0
                ? rankFields
                : [],
            levelFields: levelFields.length > 0
                ? levelFields
                : [],
            levelFieldRankDirectMax: Math.max(
                0,
                toFiniteNumber(skillRankSource.levelFieldRankDirectMax, 0)
            ),
            levelDivisor: normalizedLevelDivisor,
            maxUsableRank: Math.max(
                1,
                Math.floor(toFiniteNumber(skillRankSource.maxUsableRank, Number.MAX_SAFE_INTEGER))
            )
        },
        magicSystemFields: {
            magicFields: magicFields.length > 0
                ? magicFields
                : [],
            faithFields: faithFields.length > 0
                ? faithFields
                : [],
            circleMarks: circleMarks.length > 0
                ? circleMarks
                : []
        }
    };
}

function createMagicAcquireSupport(options = {}) {
    const configPath = normalizeText(options?.configPath);
    const classNameFields = Array.isArray(options?.classNameFields) && options.classNameFields.length > 0
        ? options.classNameFields
        : ['職業名'];
    const skillNameFields = Array.isArray(options?.skillNameFields) && options.skillNameFields.length > 0
        ? options.skillNameFields
        : ['和名'];
    const minDivisor = 0.0000001;
    const fallbackConfig = createEmptyMagicAcquireConfig();

    let cachedMagicAcquireConfig = normalizeMagicAcquireConfig(fallbackConfig);
    let configLoaded = false;
    let configMtimeMs = 0;

    const getFileMtimeMsSafe = (targetPath = '') => {
        try {
            const stat = fs.statSync(targetPath);
            return Math.floor(Number(stat?.mtimeMs) || 0);
        } catch (error) {
            return 0;
        }
    };

    const loadConfig = (forceReload = false) => {
        const exists = Boolean(configPath && fs.existsSync(configPath));
        if (!exists) {
            if (!configLoaded) {
                cachedMagicAcquireConfig = normalizeMagicAcquireConfig(fallbackConfig);
                configLoaded = true;
                configMtimeMs = 0;
                console.log('[game-data] magic acquire config not found; using defaults');
                return true;
            }
            return false;
        }

        const mtimeMs = getFileMtimeMsSafe(configPath);
        if (!forceReload && configLoaded && mtimeMs && mtimeMs === configMtimeMs) {
            return false;
        }

        const loadedConfig = readMagicAcquireConfigFileAsIs(
            configPath,
            deepCloneJsonValue(fallbackConfig)
        );
        cachedMagicAcquireConfig = normalizeMagicAcquireConfig(loadedConfig);
        configLoaded = true;
        configMtimeMs = mtimeMs;
        console.log('[game-data] magic acquire config loaded');
        return true;
    };

    const ensureConfigLoaded = () => {
        if (!configLoaded) {
            loadConfig(true);
            return;
        }
        loadConfig(false);
    };

    const getConfig = () => {
        ensureConfigLoaded();
        return cachedMagicAcquireConfig;
    };

    const normalizeMagicAttributeList = (value) => normalizeTextList(value);

    const resolveMagicAttributes = (payload = {}) => {
        const config = getConfig();
        const realmNameSuffix = normalizeText(config?.realmNameSuffix) || fallbackConfig.realmNameSuffix;
        const fromPayload = normalizeMagicAttributeList(payload?.magicAttributes)
            .map((value) => normalizeMagicAttributeName(value, realmNameSuffix))
            .filter(Boolean);
        if (fromPayload.length > 0) return fromPayload;
        return (Array.isArray(config?.defaultMagicAttributes) ? config.defaultMagicAttributes : [])
            .map((value) => normalizeMagicAttributeName(value, realmNameSuffix))
            .filter(Boolean);
    };

    const buildRealmMagicListFromClasses = (classRows = []) => {
        const config = getConfig();
        const realmNameSuffix = normalizeText(config?.realmNameSuffix) || fallbackConfig.realmNameSuffix;
        const classRowMagicListStartKey = normalizeText(config?.classRowMagicListStartKey) || fallbackConfig.classRowMagicListStartKey;
        const sourceRows = Array.isArray(classRows) ? classRows : [];
        const magicListByDomain = sourceRows
            .filter((row) => {
                const className = pickFirstText(row, classNameFields);
                return Boolean(className) && className.endsWith(realmNameSuffix);
            })
            .map((row) => {
                const className = pickFirstText(row, classNameFields);
                const keys = Object.keys(row || {});
                const startIndex = keys.indexOf(classRowMagicListStartKey);
                if (startIndex < 0) {
                    return {
                        className,
                        magicList: []
                    };
                }

                const magicList = keys
                    .slice(startIndex)
                    .map((key) => normalizeText(row[key]))
                    .filter((value) => value && value !== '0');

                return {
                    className,
                    magicList
                };
            });

        const magicList = magicListByDomain.flatMap((entry) => (
            Array.isArray(entry?.magicList) ? entry.magicList : []
        ));

        return {
            magicListByDomain,
            magicList
        };
    };

    const buildRealmMagicListByAttributes = (classRows = [], attributes = []) => {
        const config = getConfig();
        const realmNameSuffix = normalizeText(config?.realmNameSuffix) || fallbackConfig.realmNameSuffix;
        const normalizedAttributes = normalizeMagicAttributeList(attributes)
            .map((value) => normalizeMagicAttributeName(value, realmNameSuffix))
            .filter(Boolean);
        const realmNames = normalizedAttributes.map((attribute) => (
            `${attribute}の${realmNameSuffix}`
        ));

        const { magicListByDomain } = buildRealmMagicListFromClasses(classRows);
        const domainByName = new Map(
            magicListByDomain.map((entry) => [normalizeText(entry?.className), entry])
        );
        const filteredDomains = realmNames
            .map((realmName) => domainByName.get(realmName))
            .filter((entry) => Boolean(entry));
        const filteredMagicList = filteredDomains.flatMap((entry) => (
            Array.isArray(entry?.magicList) ? entry.magicList : []
        ));

        return {
            realmNames,
            magicListByDomain: filteredDomains,
            magicList: filteredMagicList
        };
    };

    const getMagicSystemJudge = (payload = {}) => {
        const config = getConfig();
        const rankPointTable = Array.isArray(config?.rankPointTable) && config.rankPointTable.length > 0
            ? config.rankPointTable
            : [];
        const rankFormulaConfig = config?.magicRankFormula || {};
        const formulaBaseWhenPositive = toFiniteNumber(rankFormulaConfig?.baseWhenPositive, 0);
        const formulaDivisor = Math.max(minDivisor, toFiniteNumber(rankFormulaConfig?.divisor, 1));
        const formulaTreatAsRankMax = Math.max(0, toFiniteNumber(rankFormulaConfig?.treatAsRankMax, 0));
        const toMagicRankByFormula = (value) => {
            const safeValue = Math.max(0, toFiniteNumber(value, 0));
            return (safeValue > 0 ? formulaBaseWhenPositive : 0) + (safeValue / formulaDivisor);
        };
        const normalizeMagicRankInput = (value) => {
            const safeValue = Math.max(0, toFiniteNumber(value, 0));
            if (safeValue <= 0) return 0;
            if (safeValue <= formulaTreatAsRankMax) return safeValue;
            return toMagicRankByFormula(safeValue);
        };
        const magicPowerValue = Math.max(0, toFiniteNumber(payload?.magicPowerValue, 0));
        const faithPowerValue = Math.max(0, toFiniteNumber(payload?.faithPowerValue, 0));
        const fallbackPointValue = Math.max(0, toFiniteNumber(payload?.magicSystemValue, 0));
        const magicPointValue = Math.max(magicPowerValue, faithPowerValue, fallbackPointValue);
        const getUnlockedRankFromPoint = (pointValue) => {
            const safePoint = Math.max(0, toFiniteNumber(pointValue, 0));
            for (const row of rankPointTable) {
                const min = Math.max(0, toFiniteNumber(row?.min, 0));
                const maxRaw = row?.max;
                const maxNormalizedText = normalizeText(maxRaw).toLowerCase();
                const max = (
                    maxNormalizedText === ''
                    || maxNormalizedText === 'infinity'
                    || maxNormalizedText === '∞'
                )
                    ? Number.POSITIVE_INFINITY
                    : Math.max(min, toFiniteNumber(maxRaw, Number.POSITIVE_INFINITY));
                if (safePoint >= min && safePoint <= max) {
                    return Math.max(0, Math.floor(toFiniteNumber(row?.rank, 0)));
                }
            }
            if (rankPointTable.length <= 0) return 0;
            const fallbackRank = Math.max(...rankPointTable.map((row) => Math.max(0, Math.floor(toFiniteNumber(row?.rank, 0)))));
            return fallbackRank;
        };
        const getRankProgressFromPoint = (pointValue, rankValue) => {
            const safePoint = Math.max(0, toFiniteNumber(pointValue, 0));
            const targetRank = Math.max(0, Math.floor(toFiniteNumber(rankValue, 0)));
            if (targetRank <= 0) return 0;
            const row = rankPointTable.find((entry) => (
                Math.max(0, Math.floor(toFiniteNumber(entry?.rank, 0))) === targetRank
            ));
            if (!row) return 0;

            const min = Math.max(0, toFiniteNumber(row?.min, 0));
            const maxRaw = row?.max;
            const maxNormalizedText = normalizeText(maxRaw).toLowerCase();
            const max = (
                maxNormalizedText === ''
                || maxNormalizedText === 'infinity'
                || maxNormalizedText === '∞'
            )
                ? Number.POSITIVE_INFINITY
                : Math.max(min, toFiniteNumber(maxRaw, Number.POSITIVE_INFINITY));
            if (!Number.isFinite(max) || max <= min) return 1;
            const progress = (safePoint - min) / (max - min);
            return Math.max(0, Math.min(1, progress));
        };

        const magicPowerRankByPoint = getUnlockedRankFromPoint(magicPowerValue);
        const faithPowerRankByPoint = getUnlockedRankFromPoint(faithPowerValue);
        const maxMagicLevelByPoint = getUnlockedRankFromPoint(magicPointValue);
        const maxMagicLevelProgressByPoint = getRankProgressFromPoint(magicPointValue, maxMagicLevelByPoint);

        const magicPowerRank = normalizeMagicRankInput(magicPowerValue);
        const faithPowerRank = normalizeMagicRankInput(faithPowerValue);
        const fallbackMaxMagicLevel = normalizeMagicRankInput(payload?.maxMagicLevel);
        const fallbackMagicValueRank = normalizeMagicRankInput(payload?.magicSystemValue);
        const hasRankPointTable = Array.isArray(rankPointTable) && rankPointTable.length > 0;
        const fallbackMaxLevelByFormula = Math.max(
            magicPowerRank,
            faithPowerRank,
            fallbackMaxMagicLevel,
            fallbackMagicValueRank
        );
        const fallbackMaxLevelProgress = Math.max(
            0,
            Math.min(1, fallbackMaxLevelByFormula - Math.floor(fallbackMaxLevelByFormula))
        );
        const maxMagicLevel = hasRankPointTable
            ? maxMagicLevelByPoint
            : fallbackMaxLevelByFormula;
        const maxMagicLevelProgress = hasRankPointTable
            ? maxMagicLevelProgressByPoint
            : fallbackMaxLevelProgress;
        const dominantSystem = magicPowerValue > faithPowerValue
            ? '魔力系'
            : (faithPowerValue > magicPowerValue ? '信仰系' : '');

        return {
            magicPowerValue,
            faithPowerValue,
            magicPointValue,
            magicPowerRankByPoint,
            faithPowerRankByPoint,
            maxMagicLevelByPoint,
            maxMagicLevelProgressByPoint,
            fallbackMaxLevelByFormula,
            fallbackMaxLevelProgress,
            magicPowerRank,
            faithPowerRank,
            dominantSystem,
            maxMagicLevel,
            maxMagicLevelProgress
        };
    };

    const getSkillRequiredMagicRank = (skill = {}) => {
        const config = getConfig();
        const skillRankConfig = config?.magicSkillRank || {};
        const rankFields = Array.isArray(skillRankConfig?.rankFields) && skillRankConfig.rankFields.length > 0
            ? skillRankConfig.rankFields
            : [];
        const levelFields = Array.isArray(skillRankConfig?.levelFields) && skillRankConfig.levelFields.length > 0
            ? skillRankConfig.levelFields
            : [];
        const levelFieldRankDirectMax = Math.max(
            0,
            toFiniteNumber(skillRankConfig?.levelFieldRankDirectMax, 0)
        );
        const levelDivisor = Math.max(
            minDivisor,
            toFiniteNumber(skillRankConfig?.levelDivisor, 1)
        );

        const rankByField = toFiniteNumber(pickFirstValue(skill, rankFields, 0), 0);
        if (rankByField > 0) return rankByField;

        const levelByField = toFiniteNumber(pickFirstValue(skill, levelFields, 0), 0);
        if (levelByField > 0) {
            if (levelByField <= levelFieldRankDirectMax) return levelByField;
            return levelByField / levelDivisor;
        }

        return 0;
    };

    const canUseMagicByLevel = (skill = {}, judge = {}) => {
        const requiredRank = getSkillRequiredMagicRank(skill);
        if (requiredRank <= 0) return false;
        const config = getConfig();
        const maxUsableRank = Math.max(
            1,
            Math.floor(
                toFiniteNumber(
                    config?.magicSkillRank?.maxUsableRank,
                    Number.MAX_SAFE_INTEGER
                )
            )
        );
        const maxMagicLevelRaw = Math.max(
            0,
            toFiniteNumber(judge?.maxMagicLevelByPoint, judge?.maxMagicLevel)
        );
        const maxMagicLevel = Math.min(maxUsableRank, maxMagicLevelRaw);
        return requiredRank <= maxMagicLevel;
    };

    const isCircleMark = (value) => {
        const normalized = normalizeText(value);
        if (!normalized) return false;
        const config = getConfig();
        const marks = Array.isArray(config?.magicSystemFields?.circleMarks)
            && config.magicSystemFields.circleMarks.length > 0
            ? config.magicSystemFields.circleMarks
            : [];
        return marks.includes(normalized);
    };

    const hasCircleMarkInFields = (source = {}, fieldNames = []) => {
        const names = Array.isArray(fieldNames) ? fieldNames : [];
        return names.some((fieldName) => isCircleMark(source?.[fieldName]));
    };

    const canUseMagicBySystem = (skill = {}, judge = {}) => {
        const config = getConfig();
        const fieldConfig = config?.magicSystemFields || {};
        const magicFields = Array.isArray(fieldConfig?.magicFields) && fieldConfig.magicFields.length > 0
            ? fieldConfig.magicFields
            : [];
        const faithFields = Array.isArray(fieldConfig?.faithFields) && fieldConfig.faithFields.length > 0
            ? fieldConfig.faithFields
            : [];

        const magicSystemEnabled = hasCircleMarkInFields(skill, magicFields);
        const faithSystemEnabled = hasCircleMarkInFields(skill, faithFields);
        const dominantSystem = normalizeText(judge?.dominantSystem);

        if (dominantSystem === '魔力系') return magicSystemEnabled;
        if (dominantSystem === '信仰系') return faithSystemEnabled;
        return magicSystemEnabled || faithSystemEnabled;
    };

    const canUseRealmMagicSkill = (skill = {}, judge = {}, realmMagicNameSet = new Set(), explicitSkillName = '') => {
        const skillName = normalizeText(explicitSkillName) || pickFirstText(skill, skillNameFields);
        if (!skillName) return false;
        if (realmMagicNameSet.size > 0 && !realmMagicNameSet.has(skillName)) return false;
        if (!canUseMagicBySystem(skill, judge)) return false;
        return canUseMagicByLevel(skill, judge);
    };

    const resolveAcquireRateFromCode = (rateCodeValue = 0, rateMap = {}) => {
        const normalizedCodeValue = Math.max(0, Math.floor(toFiniteNumber(rateCodeValue, 0)));
        const rateCode = String(normalizedCodeValue);
        if (Object.prototype.hasOwnProperty.call(rateMap, rateCode)) {
            const resolvedRate = toFiniteNumber(rateMap[rateCode], 0);
            return Math.max(0, Math.min(1, resolvedRate));
        }
        const fallbackRate = normalizedCodeValue / 3;
        return Math.max(0, Math.min(1, fallbackRate));
    };

    // 現在ランクの進捗率適用ルール:
    // - 取得コード3は35%開始で進捗に応じて100%へ
    // - 取得コード2/1は0%開始で進捗に応じて基礎率へ
    const resolveCurrentRankBaseRateByProgress = (
        rateCodeValue = 0,
        baseRate = 0,
        progress = 0
    ) => {
        const normalizedRateCode = Math.max(0, Math.floor(toFiniteNumber(rateCodeValue, 0)));
        const safeBaseRate = Math.max(0, Math.min(1, toFiniteNumber(baseRate, 0)));
        const safeProgress = Math.max(0, Math.min(1, toFiniteNumber(progress, 0)));

        if (normalizedRateCode >= 3) {
            const startRate = Math.min(safeBaseRate, 0.35);
            return startRate + ((safeBaseRate - startRate) * safeProgress);
        }

        return safeBaseRate * safeProgress;
    };

    const buildAcquireCodeTableByUnlockedRank = (judge = {}) => {
        const config = getConfig();
        const sourceTable = Array.isArray(config?.baseTableOver) && config.baseTableOver.length > 0
            ? config.baseTableOver
            : [];
        const tableRows = sourceTable.length;
        if (tableRows <= 0) return [];

        const maxUsableRank = Math.max(
            1,
            Math.floor(
                toFiniteNumber(
                    config?.magicSkillRank?.maxUsableRank,
                    Number.MAX_SAFE_INTEGER
                )
            )
        );
        const rankSlotCount = Math.min(maxUsableRank, tableRows);
        const unlockedRankRaw = Math.max(1, Math.floor(toFiniteNumber(judge?.maxMagicLevelByPoint, judge?.maxMagicLevel)));
        const unlockedRank = Math.min(tableRows, unlockedRankRaw);
        const start = Math.max(0, tableRows - unlockedRank);
        const result = [];

        for (let requiredRank = 1; requiredRank <= rankSlotCount; requiredRank += 1) {
            const rowIndex = start + (requiredRank - 1);
            const row = Array.isArray(sourceTable[rowIndex]) ? sourceTable[rowIndex] : [];
            result.push(row);
        }

        return result;
    };

    const getAcquireCountByRate = (totalCount = 0, rate = 0, options = {}) => {
        const total = Math.max(0, Math.floor(toFiniteNumber(totalCount, 0)));
        if (total <= 0) return 0;
        const safeRate = Math.max(0, Math.min(1, toFiniteNumber(rate, 0)));
        if (safeRate <= 0) return 0;
        if (safeRate >= 1) return total;
        const minWhenPositive = Math.max(
            0,
            Math.floor(toFiniteNumber(options?.minWhenPositive, 1))
        );
        return Math.max(minWhenPositive, Math.min(total, Math.round(total * safeRate)));
    };

    const buildRealmSkillDomainIndexMap = (magicListByDomain = []) => {
        const map = new Map();
        const source = Array.isArray(magicListByDomain) ? magicListByDomain : [];
        source.forEach((entry, domainIndex) => {
            const names = Array.isArray(entry?.magicList) ? entry.magicList : [];
            names.forEach((name) => {
                const normalizedName = normalizeText(name);
                if (!normalizedName) return;
                if (!map.has(normalizedName)) {
                    map.set(normalizedName, domainIndex);
                }
            });
        });
        return map;
    };

    const buildRealmSkillAcquireOrderMap = (magicListByDomain = []) => {
        const map = new Map();
        const source = Array.isArray(magicListByDomain) ? magicListByDomain : [];
        source.forEach((entry) => {
            const names = Array.isArray(entry?.magicList) ? entry.magicList : [];
            names.forEach((name, localIndex) => {
                const normalizedName = normalizeText(name);
                if (!normalizedName) return;
                if (!map.has(normalizedName)) {
                    map.set(normalizedName, Math.max(0, Math.floor(toFiniteNumber(localIndex, 0))));
                }
            });
        });
        return map;
    };

    const extractAttributeNameFromRealmClassName = (className = '', realmNameSuffix = '') => {
        const normalizedClassName = normalizeText(className);
        const normalizedSuffix = normalizeText(realmNameSuffix);
        if (!normalizedClassName) return '';
        if (normalizedSuffix && normalizedClassName.endsWith(`の${normalizedSuffix}`)) {
            return normalizeText(normalizedClassName.slice(0, -(`の${normalizedSuffix}`).length));
        }
        if (normalizedSuffix && normalizedClassName.endsWith(normalizedSuffix)) {
            return normalizeText(normalizedClassName.slice(0, -normalizedSuffix.length).replace(/の$/, ''));
        }
        return normalizeText(normalizedClassName.replace(/の領域$/, '').replace(/領域$/, '').replace(/の$/, ''));
    };

    const buildDomainAcquireRateBonusByPSkills = (
        allSkills = [],
        requestedSkillNames = [],
        magicListByDomain = []
    ) => {
        const sourceSkills = Array.isArray(allSkills) ? allSkills : [];
        const requestedNameSet = new Set(
            (Array.isArray(requestedSkillNames) ? requestedSkillNames : [requestedSkillNames])
                .map((name) => normalizeText(name))
                .filter(Boolean)
        );
        if (requestedNameSet.size <= 0) return new Map();

        const pSkillNames = sourceSkills
            .filter((skill) => {
                const skillName = pickFirstText(skill, skillNameFields);
                if (!skillName || !requestedNameSet.has(skillName)) return false;
                const skillType = pickFirstText(skill, ['種別']);
                return skillType === 'P';
            })
            .map((skill) => pickFirstText(skill, skillNameFields))
            .filter(Boolean);
        if (pSkillNames.length <= 0) return new Map();

        const config = getConfig();
        const realmNameSuffix = normalizeText(config?.realmNameSuffix) || fallbackConfig.realmNameSuffix;
        const bonusByDomainIndex = new Map();
        (Array.isArray(magicListByDomain) ? magicListByDomain : []).forEach((entry, domainIndex) => {
            const className = normalizeText(entry?.className) || pickFirstText(entry, classNameFields);
            const attributeName = extractAttributeNameFromRealmClassName(className, realmNameSuffix);
            if (!attributeName) return;

            const hasDomainMagicBoost = pSkillNames.some((skillName) => {
                const normalizedSkillName = normalizeText(skillName);
                if (!normalizedSkillName) return false;
                if (!normalizedSkillName.includes('魔法強化')) return false;
                return normalizedSkillName.startsWith(`${attributeName}魔法強化`);
            });
            if (!hasDomainMagicBoost) return;
            bonusByDomainIndex.set(domainIndex, 0.35);
        });

        return bonusByDomainIndex;
    };

    const buildDomainAcquireRateSummary = (
        judge = {},
        magicListByDomain = [],
        domainRateBonusByIndex = new Map()
    ) => {
        const config = getConfig();
        const rateMap = (config?.acquisitionRateMap && typeof config.acquisitionRateMap === 'object')
            ? config.acquisitionRateMap
            : {};
        const acquireCodeTable = buildAcquireCodeTableByUnlockedRank(judge);
        if (acquireCodeTable.length <= 0) return [];

        const currentUnlockedRank = Math.max(
            0,
            Math.floor(toFiniteNumber(judge?.maxMagicLevelByPoint, judge?.maxMagicLevel))
        );
        const currentRankProgress = Math.max(
            0,
            Math.min(1, toFiniteNumber(judge?.maxMagicLevelProgress, 1))
        );
        const configRealmNameSuffix = normalizeText(config?.realmNameSuffix) || fallbackConfig.realmNameSuffix;
        const safeDomainBonusMap = domainRateBonusByIndex instanceof Map
            ? domainRateBonusByIndex
            : new Map();

        return (Array.isArray(magicListByDomain) ? magicListByDomain : [])
            .map((entry, domainIndex) => {
                const className = normalizeText(entry?.className);
                const attributeName = extractAttributeNameFromRealmClassName(className, configRealmNameSuffix);
                const currentRow = acquireCodeTable[currentUnlockedRank - 1] || [];
                const currentRateCode = Math.max(
                    0,
                    Math.floor(toFiniteNumber(currentRow?.[domainIndex], 0))
                );
                const baseRate = resolveAcquireRateFromCode(currentRateCode, rateMap);
                const progressedBaseRate = (
                    currentUnlockedRank > 0
                        ? resolveCurrentRankBaseRateByProgress(
                            currentRateCode,
                            baseRate,
                            currentRankProgress
                        )
                        : baseRate
                );
                const bonusRate = Math.max(0, toFiniteNumber(safeDomainBonusMap.get(domainIndex), 0));
                const effectiveRate = progressedBaseRate + bonusRate;

                return {
                    domainIndex,
                    className,
                    attributeName,
                    currentRank: currentUnlockedRank,
                    currentRankProgress,
                    currentRateCode,
                    baseRate,
                    progressedBaseRate,
                    bonusRate,
                    effectiveRate,
                    baseRatePercent: Math.round(baseRate * 100),
                    progressedBaseRatePercent: Math.round(progressedBaseRate * 100),
                    bonusRatePercent: Math.round(bonusRate * 100),
                    effectiveRatePercent: Math.round(effectiveRate * 100)
                };
            });
    };

    const applyAcquireRateToSkills = (
        skills = [],
        judge = {},
        skillDomainIndexMap = new Map(),
        options = {}
    ) => {
        const source = Array.isArray(skills) ? skills : [];
        if (source.length <= 0) return [];
        if (!(skillDomainIndexMap instanceof Map) || skillDomainIndexMap.size <= 0) {
            return source;
        }
        const config = getConfig();
        const rateMap = (config?.acquisitionRateMap && typeof config.acquisitionRateMap === 'object')
            ? config.acquisitionRateMap
            : {};
        const acquireCodeTable = buildAcquireCodeTableByUnlockedRank(judge);
        if (acquireCodeTable.length <= 0) {
            return source;
        }
        const domainRateBonusByIndex = options?.domainRateBonusByIndex instanceof Map
            ? options.domainRateBonusByIndex
            : new Map();
        const skillAcquireOrderMap = options?.skillAcquireOrderMap instanceof Map
            ? options.skillAcquireOrderMap
            : new Map();
        const rankSlotCount = acquireCodeTable.length;

        const groupedByDomainAndRank = new Map();
        const fallbackSkills = [];
        const currentUnlockedRank = Math.max(
            0,
            Math.floor(toFiniteNumber(judge?.maxMagicLevelByPoint, judge?.maxMagicLevel))
        );
        const currentRankProgress = Math.max(
            0,
            Math.min(1, toFiniteNumber(judge?.maxMagicLevelProgress, 1))
        );
        const currentRankCandidatePool = [];
        const currentRankAcquireRates = [];
        source.forEach((skill, order) => {
            const skillName = pickFirstText(skill, skillNameFields);
            const acquireOrderByRealmList = toFiniteNumber(skillAcquireOrderMap.get(skillName), Number.NaN);
            const resolvedOrder = Number.isFinite(acquireOrderByRealmList)
                ? Math.max(0, Math.floor(acquireOrderByRealmList))
                : order;
            const domainIndex = skillDomainIndexMap.get(skillName);
            if (!Number.isFinite(domainIndex) || domainIndex < 0) {
                fallbackSkills.push({ skill, order: resolvedOrder });
                return;
            }
            const requiredRank = Math.max(0, Math.floor(toFiniteNumber(getSkillRequiredMagicRank(skill), 0)));
            if (requiredRank <= 0 || requiredRank > rankSlotCount) return;
            const key = `${domainIndex}:${requiredRank}`;
            const current = groupedByDomainAndRank.get(key) || [];
            current.push({ skill, order: resolvedOrder, requiredRank, domainIndex });
            groupedByDomainAndRank.set(key, current);
            if (requiredRank === currentUnlockedRank) {
                currentRankCandidatePool.push({ skill, order: resolvedOrder, domainIndex });
            }
        });

        const accepted = [];
        const sortedGroupKeys = Array.from(groupedByDomainAndRank.keys())
            .map((key) => {
                const [domainIndexText, requiredRankText] = String(key).split(':');
                return {
                    key,
                    domainIndex: Math.max(0, Math.floor(toFiniteNumber(domainIndexText, 0))),
                    requiredRank: Math.max(0, Math.floor(toFiniteNumber(requiredRankText, 0)))
                };
            })
            .sort((a, b) => (
                (a.domainIndex - b.domainIndex) || (a.requiredRank - b.requiredRank)
            ));

        sortedGroupKeys.forEach((entry) => {
            const { key, domainIndex, requiredRank } = entry;
            const groupedSkills = groupedByDomainAndRank.get(key) || [];
            if (groupedSkills.length <= 0) return;
            const orderedSkills = [...groupedSkills].sort((a, b) => (a.order - b.order));
            const row = acquireCodeTable[requiredRank - 1] || [];
            const rateCodeValue = Math.max(0, Math.floor(toFiniteNumber(row?.[domainIndex], 0)));
            const baseAcquireRate = resolveAcquireRateFromCode(rateCodeValue, rateMap);
            const domainRateBonus = toFiniteNumber(domainRateBonusByIndex.get(domainIndex), 0);
            let acquireRate = baseAcquireRate + domainRateBonus;
            // 現在ランクだけは進捗で段階解放する（例: 7.14ならRank7は部分取得）
            if (requiredRank === currentUnlockedRank) {
                // 取得コード3は35%開始、2/1は0%開始。領域補正は進捗後に加算。
                const progressedBaseAcquireRate = resolveCurrentRankBaseRateByProgress(
                    rateCodeValue,
                    baseAcquireRate,
                    currentRankProgress
                );
                acquireRate = progressedBaseAcquireRate + domainRateBonus;
                currentRankAcquireRates.push(acquireRate);
            }
            const currentRankMinimumCount = (
                requiredRank === currentUnlockedRank
                    ? (acquireRate >= 0.66 ? 2 : (acquireRate >= 0.33 ? 1 : 0))
                    : 1
            );
            const acquireCount = getAcquireCountByRate(
                orderedSkills.length,
                acquireRate,
                {
                    // 現在ランクは領域ごとに33/66%しきい値で最低保証を行う
                    minWhenPositive: currentRankMinimumCount
                }
            );
            if (acquireCount <= 0) return;
            accepted.push(...orderedSkills.slice(0, acquireCount).map((item) => item.skill));
        });

        // 現在ランクの補正:
        // - 33%以上で最低1件、66%以上で最低2件
        // - それ未満は最低保証なし
        if (currentUnlockedRank > 0) {
            const maxCurrentRankAcquireRate = currentRankAcquireRates.length > 0
                ? Math.max(...currentRankAcquireRates)
                : 0;
            const baselineMinimumCount = maxCurrentRankAcquireRate >= 0.66
                ? 2
                : (maxCurrentRankAcquireRate >= 0.33 ? 1 : 0);
            const orderedCurrentRankPool = [...currentRankCandidatePool]
                .sort((a, b) => ((a.domainIndex - b.domainIndex) || (a.order - b.order)));
            const totalCurrentRankCandidates = orderedCurrentRankPool.length;
            const minimumCurrentRankCount = Math.min(
                totalCurrentRankCandidates,
                baselineMinimumCount
            );
            const currentRankAcceptedCount = accepted.reduce((count, skill) => (
                Math.floor(toFiniteNumber(getSkillRequiredMagicRank(skill), 0)) === currentUnlockedRank
                    ? count + 1
                    : count
            ), 0);

            if (currentRankAcceptedCount < minimumCurrentRankCount) {
                const acceptedNameSet = new Set(
                    accepted
                        .map((skill) => pickFirstText(skill, skillNameFields))
                        .filter(Boolean)
                );
                let nextCount = currentRankAcceptedCount;
                for (const entry of orderedCurrentRankPool) {
                    const skillName = pickFirstText(entry.skill, skillNameFields);
                    if (!skillName || acceptedNameSet.has(skillName)) continue;
                    accepted.push(entry.skill);
                    acceptedNameSet.add(skillName);
                    nextCount += 1;
                    if (nextCount >= minimumCurrentRankCount) break;
                }
            }
        }

        fallbackSkills
            .sort((a, b) => (a.order - b.order))
            .forEach((entry) => accepted.push(entry.skill));

        return accepted;
    };

    const pickLimitBreakBonusSkill = (
        skills = [],
        judge = {},
        firstDomainMagicList = [],
        acquiredSkillNameSet = new Set()
    ) => {
        const sourceSkills = Array.isArray(skills) ? skills : [];
        if (sourceSkills.length <= 0) return null;

        const orderedMagicNames = (Array.isArray(firstDomainMagicList) ? firstDomainMagicList : [])
            .map((name) => normalizeText(name))
            .filter(Boolean);
        if (orderedMagicNames.length <= 0) return null;

        const currentMaxRank = Math.max(
            0,
            Math.floor(toFiniteNumber(judge?.maxMagicLevelByPoint, judge?.maxMagicLevel))
        );
        const targetRank = currentMaxRank + 1;
        if (targetRank <= 0) return null;

        const acquiredNames = acquiredSkillNameSet instanceof Set
            ? acquiredSkillNameSet
            : new Set();

        const candidatesByName = new Map();
        sourceSkills.forEach((skill) => {
            const skillName = pickFirstText(skill, skillNameFields);
            if (!skillName) return;
            if (acquiredNames.has(skillName)) return;
            if (!canUseMagicBySystem(skill, judge)) return;

            const requiredRank = Math.floor(toFiniteNumber(getSkillRequiredMagicRank(skill), 0));
            if (requiredRank !== targetRank) return;

            if (!candidatesByName.has(skillName)) {
                candidatesByName.set(skillName, []);
            }
            candidatesByName.get(skillName).push(skill);
        });

        for (const magicName of orderedMagicNames) {
            const candidates = candidatesByName.get(magicName) || [];
            if (candidates.length <= 0) continue;
            return candidates[0];
        }

        return null;
    };

    return {
        ensureConfigLoaded,
        refreshConfig: loadConfig,
        getConfig,
        resolveMagicAttributes,
        buildRealmMagicListByAttributes,
        buildRealmSkillDomainIndexMap,
        buildRealmSkillAcquireOrderMap,
        buildDomainAcquireRateBonusByPSkills,
        buildDomainAcquireRateSummary,
        getMagicSystemJudge,
        getSkillRequiredMagicRank,
        canUseRealmMagicSkill,
        applyAcquireRateToSkills,
        pickLimitBreakBonusSkill
    };
}

module.exports = {
    normalizeMagicAcquireConfig,
    createMagicAcquireSupport
};
