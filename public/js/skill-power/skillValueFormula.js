(function initSkillValueFormulaModule(globalScope) {
    const PHYSICAL_POWER_KEYS = ["切断", "貫通", "打撃"];

    function toFiniteNumber(value) {
        const num = Number(value);
        return Number.isFinite(num) ? num : 0;
    }

    function normalizeText(value) {
        return String(value ?? "").trim();
    }

    function calculateTotal(keys, dataset, specialKeys = null, keyScaleMap = null, options = {}) {
        const source = (dataset && typeof dataset === "object") ? dataset : {};
        let total = 0;
        const applyFullPower = Boolean(options?.applyFullPower);
        const fullPowerMultiplier = applyFullPower
            ? ((toFiniteNumber(source?.全力) + 100) / 100)
            : 1;

        if (Array.isArray(specialKeys) && specialKeys.length > 0) {
            const specialValues = specialKeys.map((key) => toFiniteNumber(source[key]));
            total += Math.max(...specialValues, 0);
        }

        const normalKeys = Array.isArray(keys) ? keys : [];
        total += normalKeys
            .map((key) => {
                const value = toFiniteNumber(source[key]);
                const scale = keyScaleMap && Number.isFinite(Number(keyScaleMap[key]))
                    ? Number(keyScaleMap[key])
                    : 1;
                return value * scale;
            })
            .reduce((sum, value) => sum + value, 0);

        return total * fullPowerMultiplier;
    }

    function shouldUsePhysicalPowerMax(skillData) {
        const detail = normalizeText(skillData?.詳細 || skillData?.description);
        return detail.includes("物理威力");
    }

    function calculatePowerTotal(keys, dataset, keyScaleMap = null) {
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

    globalScope.skillValueFormula = {
        toFiniteNumber,
        calculateTotal,
        shouldUsePhysicalPowerMax,
        calculatePowerTotal
    };
})(window);
