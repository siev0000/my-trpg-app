<template>
    <div
        class="resource-adjust-modal"
        :class="{ 'is-open': isOpen }"
        :aria-hidden="!isOpen"
        @click.self="ignoreBackdropClick"
    >
        <div
            class="resource-adjust-modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="resource-adjust-modal-title"
            @click.stop
        >
            <div class="resource-adjust-header">
                <h3 id="resource-adjust-modal-title">HP/MP/ST調整</h3>
                <button type="button" class="resource-adjust-close" aria-label="閉じる" @click="cancel">×</button>
            </div>

            <p class="resource-adjust-target">{{ targetName || "未選択" }}</p>

            <div class="resource-adjust-toolbar">
                <button
                    type="button"
                    class="resource-adjust-settings-open-btn"
                    :class="{ 'is-open': settingsOpen }"
                    @click="settingsOpen = !settingsOpen"
                >
                    設定
                </button>
                <button
                    type="button"
                    class="resource-adjust-meter-toggle-btn"
                    :class="{ 'is-on': inputTargetMode === 'meter' }"
                    @click="toggleInputTargetMode()"
                >
                    操作対象 {{ inputTargetMode === "meter" ? "メーター" : "数値入力" }}
                </button>
                <span class="resource-adjust-operation-label">操作</span>
                <button
                    type="button"
                    class="resource-adjust-operation-btn"
                    :class="{ 'is-active': operation === 'decrease' }"
                    @click="operation = 'decrease'"
                >
                    減少
                </button>
                <button
                    type="button"
                    class="resource-adjust-operation-btn"
                    :class="{ 'is-active': operation === 'increase' }"
                    @click="operation = 'increase'"
                >
                    回復
                </button>
            </div>

            <div v-if="settingsOpen" class="resource-adjust-settings">
                <div class="resource-adjust-setting-title">入力単位</div>
                <div
                    v-for="entry in settingsEntries"
                    :key="entry.key"
                    class="resource-adjust-setting-row"
                >
                    <span class="resource-adjust-setting-label">{{ entry.label }}</span>
                    <button
                        type="button"
                        class="resource-adjust-setting-btn"
                        :class="{ 'is-active': unitModes[entry.key] === 'value' }"
                        @click="setUnitMode(entry.key, 'value')"
                    >
                        数値
                    </button>
                    <button
                        type="button"
                        class="resource-adjust-setting-btn"
                        :class="{ 'is-active': unitModes[entry.key] === 'percent' }"
                        @click="setUnitMode(entry.key, 'percent')"
                    >
                        %
                    </button>
                </div>
            </div>

            <div class="resource-adjust-list">
                <div
                    v-for="entry in resourceEntries"
                    :key="entry.key"
                    class="resource-adjust-row"
                >
                    <div class="resource-adjust-line">
                        <span class="resource-adjust-key">{{ entry.label }}</span>
                        <span class="resource-adjust-current">{{ entry.current }} / {{ entry.max }}</span>
                        <div class="resource-adjust-input-wrap">
                            <input
                                :id="`resource-adjust-${entry.key}`"
                                v-model="inputValues[entry.key]"
                                class="resource-adjust-input"
                                :class="{ 'is-disabled': inputTargetMode === 'meter' }"
                                type="number"
                                min="0"
                                :max="entry.inputMax"
                                step="1"
                                :placeholder="entry.placeholder"
                                :disabled="inputTargetMode === 'meter'"
                            >
                            <span class="resource-adjust-unit">{{ entry.unitLabel }}</span>
                        </div>
                        <span class="resource-adjust-next">→ {{ entry.after }}</span>
                    </div>

                    <div class="resource-adjust-meter-wrap">
                        <input
                            :id="`resource-adjust-meter-${entry.key}`"
                            class="resource-adjust-meter"
                            :class="[`is-${entry.key}`, { 'is-readonly': inputTargetMode !== 'meter' }]"
                            type="range"
                            :min="entry.meterMin"
                            :max="entry.meterMax"
                            :value="entry.after"
                            step="1"
                            @input="onMeterInput(entry.key, $event)"
                        >
                        <div class="resource-adjust-preview-bar">
                            <div
                                class="resource-adjust-preview-current"
                                :class="`is-${entry.key}`"
                                :style="{ width: `${entry.currentRatio}%` }"
                            ></div>
                            <div
                                v-if="entry.deltaRatio > 0"
                                class="resource-adjust-preview-delta"
                                :class="`is-${entry.deltaDirection}`"
                                :style="{ left: `${entry.deltaStartRatio}%`, width: `${entry.deltaRatio}%` }"
                            ></div>
                            <div
                                class="resource-adjust-preview-marker"
                                :style="{ left: `${entry.afterRatio}%` }"
                            ></div>
                        </div>
                        <div class="resource-adjust-meter-scale">
                            <span>{{ entry.meterMin }}</span>
                            <span>{{ entry.meterMax }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="resource-adjust-actions">
                <button type="button" class="btn-apply" @click="submit">適用</button>
                <button type="button" class="btn-cancel" @click="cancel">キャンセル</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { triggerPostModalInteractionGuard } from "../utils/modalInteractionGuard.js";

const INPUT_TARGET_MODE_STORAGE_KEY = "resource-adjust-input-target-mode-v1";
const UNIT_MODE_STORAGE_KEY = "resource-adjust-unit-modes-v1";
const DEFAULT_UNIT_MODES = Object.freeze({
    hp: "percent",
    mp: "value",
    st: "value"
});

const isOpen = ref(false);
const targetName = ref("");
const settingsOpen = ref(false);
const inputTargetMode = ref("number");
const operation = ref("decrease");
const resources = ref({
    hp: { current: 0, max: 0 },
    mp: { current: 0, max: 0 },
    st: { current: 0, max: 0 }
});
const targetValues = ref({
    hp: 0,
    mp: 0,
    st: 0
});
const inputValues = ref({
    hp: "",
    mp: "",
    st: ""
});
const unitModes = ref({ ...DEFAULT_UNIT_MODES });

let resolver = null;

function toFiniteNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
}

function clamp(value, min, max) {
    const num = toFiniteNumber(value);
    if (Number.isFinite(min) && num < min) return min;
    if (Number.isFinite(max) && num > max) return max;
    return num;
}

function normalizeUnitMode(value) {
    return String(value || "").trim().toLowerCase() === "percent" ? "percent" : "value";
}

function normalizeUnitModes(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    return {
        hp: normalizeUnitMode(source.hp ?? DEFAULT_UNIT_MODES.hp),
        mp: normalizeUnitMode(source.mp ?? DEFAULT_UNIT_MODES.mp),
        st: normalizeUnitMode(source.st ?? DEFAULT_UNIT_MODES.st)
    };
}

function loadUnitModesFromStorage() {
    try {
        const raw = window.localStorage.getItem(UNIT_MODE_STORAGE_KEY);
        if (!raw) return { ...DEFAULT_UNIT_MODES };
        return normalizeUnitModes(JSON.parse(raw));
    } catch (error) {
        return { ...DEFAULT_UNIT_MODES };
    }
}

function saveUnitModesToStorage(value) {
    try {
        window.localStorage.setItem(UNIT_MODE_STORAGE_KEY, JSON.stringify(normalizeUnitModes(value)));
    } catch (error) {
        // ignore
    }
}

function setUnitMode(key, mode) {
    const targetKey = String(key || "").trim().toLowerCase();
    if (!["hp", "mp", "st"].includes(targetKey)) return;
    unitModes.value = {
        ...unitModes.value,
        [targetKey]: normalizeUnitMode(mode)
    };
    saveUnitModesToStorage(unitModes.value);
}

function normalizeInputTargetMode(value) {
    return String(value || "").trim().toLowerCase() === "meter" ? "meter" : "number";
}

function loadInputTargetModeFromStorage() {
    try {
        return normalizeInputTargetMode(window.localStorage.getItem(INPUT_TARGET_MODE_STORAGE_KEY));
    } catch (error) {
        return "number";
    }
}

function saveInputTargetModeToStorage(value) {
    try {
        window.localStorage.setItem(INPUT_TARGET_MODE_STORAGE_KEY, normalizeInputTargetMode(value));
    } catch (error) {
        // ignore
    }
}

function toggleInputTargetMode() {
    const nextMode = inputTargetMode.value === "meter" ? "number" : "meter";
    if (nextMode === "meter") {
        targetValues.value = {
            hp: calcAfterByInput("hp"),
            mp: calcAfterByInput("mp"),
            st: calcAfterByInput("st")
        };
    }
    inputTargetMode.value = nextMode;
    saveInputTargetModeToStorage(nextMode);
}

function normalizeResourceEntry(raw) {
    const max = Math.max(0, Math.round(toFiniteNumber(raw?.max)));
    const current = Math.round(clamp(toFiniteNumber(raw?.current), 0, max));
    return { current, max };
}

function normalizePayload(payload = {}) {
    const source = payload && typeof payload === "object" ? payload : {};
    return {
        name: String(source.characterName || source.name || "").trim(),
        resources: {
            hp: normalizeResourceEntry(source?.resources?.hp),
            mp: normalizeResourceEntry(source?.resources?.mp),
            st: normalizeResourceEntry(source?.resources?.st)
        }
    };
}

function getResourceUnitMode(key) {
    return normalizeUnitMode(unitModes.value?.[key]);
}

function getNumericInputValue(key) {
    const raw = inputValues.value?.[key];
    if (raw === "" || raw === null || raw === undefined) return 0;
    const parsed = Math.max(0, Math.round(toFiniteNumber(raw)));
    if (getResourceUnitMode(key) === "percent") {
        return Math.min(100, parsed);
    }
    return parsed;
}

function calcAfterByInput(key) {
    const current = Math.round(toFiniteNumber(resources.value?.[key]?.current));
    const max = Math.round(toFiniteNumber(resources.value?.[key]?.max));
    const amountRaw = getNumericInputValue(key);
    const amount = getResourceUnitMode(key) === "percent"
        ? Math.round((max * amountRaw) / 100)
        : amountRaw;
    if (operation.value === "increase") {
        return Math.round(clamp(current + amount, 0, max));
    }
    return Math.round(clamp(current - amount, 0, max));
}

function onMeterInput(key, event) {
    const targetKey = String(key || "").trim().toLowerCase();
    if (!["hp", "mp", "st"].includes(targetKey)) return;
    if (inputTargetMode.value !== "meter") return;
    const max = Math.max(0, Math.round(toFiniteNumber(resources.value?.[targetKey]?.max)));
    const next = Math.round(clamp(toFiniteNumber(event?.target?.value), 0, max));
    targetValues.value = {
        ...targetValues.value,
        [targetKey]: next
    };
}

const settingsEntries = computed(() => ([
    { key: "hp", label: "HP" },
    { key: "mp", label: "MP" },
    { key: "st", label: "ST" }
]));

const resourceEntries = computed(() => ([
    (() => {
        const key = "hp";
        const max = resources.value.hp.max;
        const mode = getResourceUnitMode(key);
        return {
            key,
            label: "HP",
            current: resources.value.hp.current,
            max,
            after: inputTargetMode.value === "meter"
                ? Math.round(clamp(targetValues.value.hp, 0, max))
                : calcAfterByInput(key),
            currentRatio: max > 0 ? clamp((resources.value.hp.current / max) * 100, 0, 100) : 0,
            afterRatio: max > 0 ? clamp((((inputTargetMode.value === "meter"
                ? Math.round(clamp(targetValues.value.hp, 0, max))
                : calcAfterByInput(key)) / max) * 100), 0, 100) : 0,
            unitLabel: mode === "percent" ? "%" : "",
            placeholder: mode === "percent" ? "0-100" : "数値",
            inputMax: mode === "percent" ? 100 : undefined,
            meterMin: 0,
            meterMax: max
        };
    })(),
    (() => {
        const key = "mp";
        const max = resources.value.mp.max;
        const mode = getResourceUnitMode(key);
        return {
            key,
            label: "MP",
            current: resources.value.mp.current,
            max,
            after: inputTargetMode.value === "meter"
                ? Math.round(clamp(targetValues.value.mp, 0, max))
                : calcAfterByInput(key),
            currentRatio: max > 0 ? clamp((resources.value.mp.current / max) * 100, 0, 100) : 0,
            afterRatio: max > 0 ? clamp((((inputTargetMode.value === "meter"
                ? Math.round(clamp(targetValues.value.mp, 0, max))
                : calcAfterByInput(key)) / max) * 100), 0, 100) : 0,
            unitLabel: mode === "percent" ? "%" : "",
            placeholder: mode === "percent" ? "0-100" : "数値",
            inputMax: mode === "percent" ? 100 : undefined,
            meterMin: 0,
            meterMax: max
        };
    })(),
    (() => {
        const key = "st";
        const max = resources.value.st.max;
        const mode = getResourceUnitMode(key);
        return {
            key,
            label: "ST",
            current: resources.value.st.current,
            max,
            after: inputTargetMode.value === "meter"
                ? Math.round(clamp(targetValues.value.st, 0, max))
                : calcAfterByInput(key),
            currentRatio: max > 0 ? clamp((resources.value.st.current / max) * 100, 0, 100) : 0,
            afterRatio: max > 0 ? clamp((((inputTargetMode.value === "meter"
                ? Math.round(clamp(targetValues.value.st, 0, max))
                : calcAfterByInput(key)) / max) * 100), 0, 100) : 0,
            unitLabel: mode === "percent" ? "%" : "",
            placeholder: mode === "percent" ? "0-100" : "数値",
            inputMax: mode === "percent" ? 100 : undefined,
            meterMin: 0,
            meterMax: max
        };
    })()
]).map((entry) => {
    const currentRatio = clamp(entry.currentRatio, 0, 100);
    const afterRatio = clamp(entry.afterRatio, 0, 100);
    const deltaStartRatio = Math.min(currentRatio, afterRatio);
    const deltaRatio = Math.abs(afterRatio - currentRatio);
    return {
        ...entry,
        currentRatio,
        afterRatio,
        deltaStartRatio,
        deltaRatio,
        deltaDirection: afterRatio < currentRatio ? "decrease" : "increase"
    };
}));

function closeWith(result, withGuard = true) {
    isOpen.value = false;
    const done = resolver;
    resolver = null;
    if (typeof done === "function") {
        done(result);
    }
    if (withGuard) {
        triggerPostModalInteractionGuard(1500);
    }
}

function cancel() {
    closeWith(null, true);
}

function ignoreBackdropClick() {
    // 背景クリックでは閉じない（誤タップ防止）。
}

function submit() {
    const nextTargets = {
        hp: inputTargetMode.value === "meter"
            ? Math.round(toFiniteNumber(targetValues.value.hp))
            : calcAfterByInput("hp"),
        mp: inputTargetMode.value === "meter"
            ? Math.round(toFiniteNumber(targetValues.value.mp))
            : calcAfterByInput("mp"),
        st: inputTargetMode.value === "meter"
            ? Math.round(toFiniteNumber(targetValues.value.st))
            : calcAfterByInput("st")
    };

    closeWith({
        action: "apply",
        characterName: targetName.value,
        targets: nextTargets,
        mode: "value",
        operation: operation.value,
        unitModes: normalizeUnitModes(unitModes.value),
        values: {
            hp: getNumericInputValue("hp"),
            mp: getNumericInputValue("mp"),
            st: getNumericInputValue("st")
        }
    }, true);
}

function openResourceAdjustModalVue(payload = {}) {
    if (resolver) {
        closeWith(null, false);
    }

    const normalized = normalizePayload(payload);
    targetName.value = normalized.name;
    resources.value = normalized.resources;
    targetValues.value = {
        hp: normalized.resources.hp.current,
        mp: normalized.resources.mp.current,
        st: normalized.resources.st.current
    };
    inputValues.value = { hp: "", mp: "", st: "" };
    inputTargetMode.value = loadInputTargetModeFromStorage();
    unitModes.value = loadUnitModesFromStorage();
    operation.value = "decrease";
    settingsOpen.value = false;
    isOpen.value = true;

    return new Promise((resolve) => {
        resolver = resolve;
    });
}

onMounted(() => {
    inputTargetMode.value = loadInputTargetModeFromStorage();
    unitModes.value = loadUnitModesFromStorage();
    window.openResourceAdjustModalVue = openResourceAdjustModalVue;
    window.closeResourceAdjustModalVue = cancel;
});

onBeforeUnmount(() => {
    if (window.openResourceAdjustModalVue === openResourceAdjustModalVue) {
        delete window.openResourceAdjustModalVue;
    }
    if (window.closeResourceAdjustModalVue === cancel) {
        delete window.closeResourceAdjustModalVue;
    }
    if (resolver) {
        resolver(null);
        resolver = null;
    }
});
</script>

<style scoped>
.resource-adjust-modal {
    position: fixed;
    inset: 0;
    z-index: 2600;
    display: none;
    align-items: center;
    justify-content: center;
    background: rgba(9, 14, 23, 0.58);
}

.resource-adjust-modal.is-open {
    display: flex;
}

.resource-adjust-modal-content {
    width: 620px;
    max-width: calc(100vw - 24px);
    background: #f6fbff;
    border: 1px solid #c2d2e4;
    border-radius: 12px;
    box-shadow: 0 14px 32px rgba(10, 25, 43, 0.32);
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.resource-adjust-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.resource-adjust-header h3 {
    margin: 0;
    font-size: 23px;
    color: #18314a;
}

.resource-adjust-close {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    border: 1px solid #b0c5d9;
    background: #ffffff;
    font-size: 24px;
    line-height: 1;
    cursor: pointer;
}

.resource-adjust-target {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #1f3f5f;
}

.resource-adjust-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.resource-adjust-settings-open-btn,
.resource-adjust-meter-toggle-btn,
.resource-adjust-operation-btn,
.resource-adjust-setting-btn {
    border: 1px solid #9eb5cb;
    border-radius: 8px;
    background: #ffffff;
    color: #1f3e5c;
    font-size: 15px;
    font-weight: 700;
    padding: 6px 10px;
    cursor: pointer;
}

.resource-adjust-settings-open-btn.is-open,
.resource-adjust-meter-toggle-btn.is-on,
.resource-adjust-operation-btn.is-active,
.resource-adjust-setting-btn.is-active {
    background: #1f6db0;
    border-color: #1f6db0;
    color: #ffffff;
}

.resource-adjust-operation-label {
    font-size: 15px;
    font-weight: 700;
    color: #2a4a6b;
}

.resource-adjust-settings {
    align-self: flex-end;
    min-width: 280px;
    border: 1px solid #cedceb;
    border-radius: 8px;
    background: #ffffff;
    padding: 8px 10px;
    font-size: 13px;
    color: #325272;
    font-weight: 600;
    display: grid;
    gap: 6px;
}

.resource-adjust-setting-title {
    font-size: 13px;
    font-weight: 700;
    color: #2c4a68;
}

.resource-adjust-setting-row {
    display: flex;
    align-items: center;
    gap: 8px;
}

.resource-adjust-setting-label {
    width: 58px;
    font-size: 14px;
    font-weight: 700;
    color: #2d4e6f;
}

.resource-adjust-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.resource-adjust-row {
    height: 110px;
    border: 1px solid #d2deea;
    border-radius: 8px;
    background: #ffffff;
    padding: 8px 10px;
    display: grid;
    gap: 8px;
}

.resource-adjust-line {
    display: flex;
    align-items: center;
    gap: 10px;
}

.resource-adjust-key {
    font-size: 18px;
    font-weight: 800;
    color: #17344f;
}

.resource-adjust-current {
    min-width: 96px;
    font-size: 20px;
    font-weight: 700;
    color: #335777;
}

.resource-adjust-input-wrap {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-left: 2px;
}

.resource-adjust-input {
    width: 88px;
    height: 34px;
    border: 1px solid #9eb2c7;
    border-radius: 8px;
    font-size: 18px;
    font-weight: 700;
    text-align: right;
    padding: 0 8px;
    color: #1d3954;
    background: #ffffff;
}

.resource-adjust-input.is-disabled {
    opacity: 0.56;
    cursor: not-allowed;
}

.resource-adjust-unit {
    width: 14px;
    text-align: center;
    font-size: 15px;
    font-weight: 700;
    color: #3b5d7d;
}

.resource-adjust-next {
    margin-left: auto;
    min-width: 64px;
    text-align: right;
    font-size: 23px;
    font-weight: 800;
    color: #1e4a73;
}

.resource-adjust-meter-wrap {
    display: grid;
    gap: 4px;
}

.resource-adjust-meter {
    width: 100%;
    accent-color: #1f6db0;
}

.resource-adjust-meter.is-readonly {
    opacity: 0.72;
    pointer-events: none;
}

.resource-adjust-meter.is-hp {
    accent-color: #5cbe57;
}

.resource-adjust-meter.is-mp {
    accent-color: #3f8de2;
}

.resource-adjust-meter.is-st {
    accent-color: #c9ab2a;
}

.resource-adjust-meter-scale {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: #637f99;
    font-weight: 700;
}

.resource-adjust-preview-bar {
    position: relative;
    height: 8px;
    border-radius: 999px;
    background: #d7e0ea;
    overflow: hidden;
}

.resource-adjust-preview-current {
    position: absolute;
    inset: 0 auto 0 0;
    width: 0;
    border-radius: 999px;
    background: #1f6db0;
}

.resource-adjust-preview-current.is-hp {
    background: #5cbe57;
}

.resource-adjust-preview-current.is-mp {
    background: #3f8de2;
}

.resource-adjust-preview-current.is-st {
    background: #c9ab2a;
}

.resource-adjust-preview-delta {
    position: absolute;
    top: 0;
    bottom: 0;
    border-radius: 999px;
}

.resource-adjust-preview-delta.is-decrease {
    background: rgba(224, 52, 56, 0.86);
}

.resource-adjust-preview-delta.is-increase {
    background: rgba(66, 148, 230, 0.82);
}

.resource-adjust-preview-marker {
    position: absolute;
    top: -2px;
    width: 2px;
    height: 12px;
    background: #0f2d47;
    transform: translateX(-1px);
}

.resource-adjust-actions {
    margin-top: 2px;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
}

.resource-adjust-actions button {
    min-width: 92px;
    height: 36px;
    border-radius: 8px;
    border: 1px solid #93a9bf;
    font-size: 16px;
    font-weight: 800;
    cursor: pointer;
}

.resource-adjust-actions .btn-apply {
    background: #1f6db0;
    color: #ffffff;
    border-color: #1f6db0;
}

.resource-adjust-actions .btn-cancel {
    background: #ffffff;
    color: #2c4e70;
}
</style>
