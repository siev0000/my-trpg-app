(function initSkillPowerJudgeModule(globalScope) {
    function toFiniteNumberInternal(value) {
        const num = Number(value);
        return Number.isFinite(num) ? num : 0;
    }

    function normalizeFieldKeyForCompare(value) {
        return String(value ?? "")
            .normalize("NFKC")
            .trim()
            .replace(/[ 　\t\r\n]/g, "")
            .replace(/[＿_]/g, "")
            .replace(/[＋+]/g, "")
            .replace(/[:：]/g, "")
            .toLowerCase();
    }

    function normalizeStatReferenceKey(statRef) {
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

    function isLevelReferenceKey(statRef) {
        const key = normalizeFieldKeyForCompare(statRef);
        return key === "lv" || key === "level" || key === "レベル";
    }

    function getSkillFieldValueByAliases(skillData, aliases = []) {
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

    function resolveAllPowerMultiplier(skillData, options = {}) {
        const toFiniteNumber = (typeof options?.toFiniteNumber === "function")
            ? options.toFiniteNumber
            : toFiniteNumberInternal;

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
        const numberValue = Number(value);
        if (!Number.isFinite(numberValue) || numberValue === 0) return "";
        const scaledValue = Math.ceil(numberValue * multiplier);
        if (!Number.isFinite(scaledValue) || scaledValue === 0) return "";
        return String(scaledValue);
    }

    function toScaledNumber(value, multiplier = 1) {
        const numberValue = Number(value);
        if (!Number.isFinite(numberValue) || numberValue === 0) return 0;
        const scaledValue = Math.ceil(numberValue * multiplier);
        return Number.isFinite(scaledValue) ? scaledValue : 0;
    }

    function getCharacterStatValueForSkillRef(statSource, statRef, skillData = null, options = {}) {
        const toFiniteNumber = (typeof options?.toFiniteNumber === "function")
            ? options.toFiniteNumber
            : toFiniteNumberInternal;
        const source = Array.isArray(statSource) ? (statSource[0] || {}) : (statSource || {});
        const parsedRef = parseSignedStatReference(statRef);
        const refSign = parsedRef.sign === -1 ? -1 : 1;
        const rawKey = String(parsedRef.core ?? "").trim();
        if (!rawKey) return 0;

        const normalizedKey = normalizeStatReferenceKey(rawKey);
        const candidateKeys = [rawKey, normalizedKey].filter((key, index, list) => (
            key && list.indexOf(key) === index
        ));
        const isLevelReference = isLevelReferenceKey(rawKey) || isLevelReferenceKey(normalizedKey);
        const levelAliasKeys = ["Lv", "LV", "レベル", "level", "Level", "allLv", "allLevel"];
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
        const findLevelValue = (targetSource) => {
            const target = (targetSource && typeof targetSource === "object") ? targetSource : {};
            const normalizedAliases = levelAliasKeys.map((key) => normalizeFieldKeyForCompare(key));
            const resolveFromObject = (obj) => {
                if (!obj || typeof obj !== "object") return { found: false, value: 0 };
                for (const key of levelAliasKeys) {
                    const value = toFiniteNumber(obj?.[key]);
                    if (value !== 0 || Object.prototype.hasOwnProperty.call(obj, key)) {
                        return { found: true, value };
                    }
                }
                const entries = Object.entries(obj || {});
                for (const normalizedAlias of normalizedAliases) {
                    const matched = entries.find(([sourceKey]) => (
                        normalizeFieldKeyForCompare(sourceKey) === normalizedAlias
                    ));
                    if (!matched) continue;
                    return { found: true, value: toFiniteNumber(matched[1]) };
                }
                return { found: false, value: 0 };
            };

            const direct = resolveFromObject(target);
            if (direct.found) return direct;
            const nestedCandidates = [
                target?.stats,
                target?.status,
                target?.profile,
                target?.character,
                target?.stats?.baseStats,
                target?.stats?.levelStats
            ];
            for (const candidate of nestedCandidates) {
                const resolved = resolveFromObject(candidate);
                if (resolved.found) return resolved;
            }
            return { found: false, value: 0 };
        };

        let { found: foundByDirectKey, value: baseValue } = findValueByCandidateKeys(source);
        const fallbackSources = Array.isArray(options?.fallbackSources)
            ? options.fallbackSources
            : [];

        if (isLevelReference && (!foundByDirectKey || baseValue === 0)) {
            const directLevel = findLevelValue(source);
            if (directLevel.found) {
                foundByDirectKey = true;
                baseValue = directLevel.value;
            }
        }

        if (!foundByDirectKey) {
            for (const fallbackSource of fallbackSources) {
                if (!fallbackSource || fallbackSource === source) continue;
                const resolved = isLevelReference
                    ? findLevelValue(fallbackSource)
                    : findValueByCandidateKeys(fallbackSource);
                if (!resolved.found) continue;
                foundByDirectKey = true;
                baseValue = resolved.value;
                break;
            }
        }

        if (!skillData || typeof skillData !== "object" || !normalizedKey) {
            return baseValue * refSign;
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

    function getAttackStatReference(skillData) {
        return getSkillFieldValueByAliases(skillData, ["攻撃判定", "判定"]);
    }

    function getAdditionalPowerReference(skillData) {
        return getSkillFieldValueByAliases(skillData, ["追加威力", "威力判定"]);
    }

    function getAttackStatValue(statSource, skillData, options = {}) {
        return getCharacterStatValueForSkillRef(
            statSource,
            getAttackStatReference(skillData),
            skillData,
            options
        );
    }

    function getAdditionalPowerValue(statSource, skillData, options = {}) {
        return getCharacterStatValueForSkillRef(
            statSource,
            getAdditionalPowerReference(skillData),
            skillData,
            options
        );
    }

    function getStatValueFromSource(statSource, key, options = {}) {
        const toFiniteNumber = (typeof options?.toFiniteNumber === "function")
            ? options.toFiniteNumber
            : toFiniteNumberInternal;
        if (Array.isArray(statSource)) {
            return toFiniteNumber(statSource?.[0]?.[key]);
        }
        return toFiniteNumber(statSource?.[key]);
    }

    function applyCharacterStatRate(baseValue, statValue, options = {}) {
        const toFiniteNumber = (typeof options?.toFiniteNumber === "function")
            ? options.toFiniteNumber
            : toFiniteNumberInternal;
        return toFiniteNumber(baseValue) * (1 + toFiniteNumber(statValue) / 100);
    }

    globalScope.skillPowerJudge = {
        resolveAllPowerMultiplier,
        toDisplayNumber,
        toScaledNumber,
        normalizeStatReferenceKey,
        parseSignedStatReference,
        normalizeFieldKeyForCompare,
        isLevelReferenceKey,
        getSkillFieldValueByAliases,
        getAttackStatReference,
        getAdditionalPowerReference,
        getCharacterStatValueForSkillRef,
        getAttackStatValue,
        getAdditionalPowerValue,
        getStatValueFromSource,
        applyCharacterStatRate
    };
})(window);
