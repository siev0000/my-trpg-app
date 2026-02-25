<template>
    <div
        class="skill-set-modal"
        :class="{ 'is-open': isOpen }"
        :aria-hidden="!isOpen"
        @click="handleBackdropClick"
    >
        <div
            class="skill-set-modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="skill-set-modal-title"
            @click.stop
        >
            <div class="skill-set-modal-header">
                <!-- <h3 id="skill-set-modal-title">スキルセット</h3> -->
                <p class="skill-set-target">{{ modalTargetText }}</p>
                <div class="skill-set-header-right">
                    <p
                        v-if="presetStatusText"
                        class="skill-set-preset-status"
                        :class="{ 'is-error': presetStatusType === 'error' }"
                    >
                        {{ presetStatusText }}
                    </p>
                    <button type="button" class="skill-set-close" aria-label="閉じる" @click="cancel">×</button>
                </div>
            </div>

            
            <div class="skill-set-top-row">
                <div class="skill-set-resource-card compact">
                    <div class="resource-card-header">
                        <span class="resource-card-title">使用キャラ</span>
                        <span class="resource-card-name">{{ resourcePreview.name || '未選択' }}</span>
                        <button
                            type="button"
                            class="resource-card-adjust-btn"
                            :disabled="isAdjustingResource || !(resourcePreview.name || getResourcePreviewNameFallback())"
                            @click="openResourceAdjustModalFromSkillSet"
                        >
                            調整
                        </button>
                    </div>
                    <div class="resource-card-list">
                        <div
                            v-for="entry in resourceRows"
                            :key="entry.key"
                            class="resource-card-item"
                        >
                            <div class="resource-item-meta">
                                <span class="resource-item-label">{{ entry.label }}</span>
                                <span class="resource-item-value">{{ entry.current }} / {{ entry.max }}</span>
                                <span class="resource-item-next">→ {{ entry.after }}</span>
                                <span v-if="entry.planned > 0" class="resource-item-cost">(-{{ entry.planned }})</span>
                            </div>
                            <div class="resource-item-bar">
                                <div
                                    class="resource-bar-segment resource-bar-safe"
                                    :class="`is-${entry.key}`"
                                    :style="{ width: `${entry.rateAfter}%` }"
                                ></div>
                                <div
                                    class="resource-bar-segment resource-bar-planned"
                                    :style="{ width: `${entry.ratePlanned}%` }"
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="skill-set-control-card">
                    <div class="skill-set-attack-method-row">
                        <span class="skill-set-attack-method-label">攻撃手段</span>
                        <div class="skill-set-attack-method-controls">
                            <button
                                type="button"
                                class="skill-set-attack-method-btn"
                                :disabled="attackMethods.length === 0"
                                @click="openAttackMethodModal"
                            >
                                {{ currentAttackMethodLabel }}
                            </button>
                        </div>
                    </div>
                    <div class="skill-set-full-power-row">
                        <button
                            type="button"
                            class="skill-set-full-power-btn"
                            :class="{ 'is-on': isFullPowerOn }"
                            :aria-pressed="isFullPowerOn ? 'true' : 'false'"
                            :disabled="isApplyingFullPower"
                            @click="toggleFullPowerFromModal"
                        >
                            全力 {{ isFullPowerOn ? 'ON' : 'OFF' }}
                        </button>
                    </div>
                    <div class="skill-set-preset-row">
                        <button
                            type="button"
                            class="skill-set-preset-btn"
                            :disabled="isPresetSaving || isPresetLoading || isPresetSwitching || isPresetRenaming"
                            @click="openSavePresetModal"
                        >
                            セット登録
                        </button>
                        <span class="skill-set-current-preset">
                            <img
                                v-if="activePresetIconUrl"
                                :src="activePresetIconUrl"
                                :alt="activePresetIcon || ''"
                                class="skill-set-current-preset-icon"
                            >
                            <span>使用中: {{ activePresetName || '未選択' }}</span>
                        </span>
                        <button
                            type="button"
                            class="skill-set-preset-rename-btn"
                            :disabled="!activePresetName || isPresetSaving || isPresetLoading || isPresetSwitching || isPresetRenaming"
                            @click="openRenamePresetModal"
                        >
                            名前変更
                        </button>
                    </div>
                    <div v-if="isSendMode" class="skill-set-send-config">
                        <div class="send-config-item">
                            <label for="skill-set-send-dice-count">ダイス数</label>
                            <input id="skill-set-send-dice-count" type="number" min="1" v-model.number="sendDiceCount">
                        </div>
                        <div class="send-config-item">
                            <label for="skill-set-send-dice-max">ダイス最大値</label>
                            <input id="skill-set-send-dice-max" type="number" min="2" v-model.number="sendDiceMax">
                        </div>
                    </div>
                </div>
            </div>

            <div class="skill-set-header-presets">
                <span class="skill-set-header-presets-label">登録セット</span>
                <div class="skill-set-header-presets-list">
                    <button
                        v-for="entry in presetEntries"
                        :key="entry.name"
                        type="button"
                        class="skill-set-header-preset-btn"
                        :class="{ 'is-active': normalizeText(entry.name) === normalizeText(activePresetName) }"
                        :disabled="isPresetSwitching || isPresetListLoading || isPresetRenaming"
                        @click="selectPresetFromHeader(entry.name)"
                    >
                        <img
                            v-if="entry.iconUrl"
                            :src="entry.iconUrl"
                            :alt="entry.icon || ''"
                            class="skill-set-header-preset-icon"
                        >
                        <span>{{ entry.name }}</span>
                    </button>
                    <span v-if="isPresetListLoading" class="skill-set-header-presets-empty">読込中...</span>
                    <span v-else-if="presetEntries.length === 0" class="skill-set-header-presets-empty">登録なし</span>
                </div>
            </div>

            <div class="skill-set-table-wrap">
                <table class="skill-set-table">
                    <thead>
                        <tr>
                            <th>分類</th>
                            <th>技名</th>
                            <th>威力</th>
                            <th>守り</th>
                            <th>状態</th>
                            <th>属性</th>
                            <th>説明</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="row in displayRows"
                            :key="row.slot"
                            :class="{
                                'is-allowed': row.isAllowed,
                                'is-selected': selectedSlot === row.slot,
                                'is-disabled': !row.isAllowed
                            }"
                            @click="selectSlot(row)"
                        >
                            <td>{{ row.slot }}</td>
                            <td>
                                <ruby v-if="row.ruby && row.name">
                                    {{ row.name }}
                                    <rt>{{ row.ruby }}</rt>
                                </ruby>
                                <span v-else>{{ row.name || '未選択' }}</span>
                            </td>
                            <td
                                :title="row.powerBreakdownTitle || ''"
                                :class="{ 'has-breakdown-tooltip': Boolean(row.powerBreakdownTitle) }"
                            >
                                {{ row.power }}
                            </td>
                            <td
                                :title="row.guardBreakdownTitle || ''"
                                :class="{ 'has-breakdown-tooltip': Boolean(row.guardBreakdownTitle) }"
                            >
                                {{ row.guard }}
                            </td>
                            <td
                                :title="row.stateBreakdownTitle || ''"
                                :class="{ 'has-breakdown-tooltip': Boolean(row.stateBreakdownTitle) }"
                            >
                                {{ row.state }}
                            </td>
                            <td
                                :title="row.attributeBreakdownTitle || ''"
                                :class="{ 'has-breakdown-tooltip': Boolean(row.attributeBreakdownTitle) }"
                            >
                                {{ row.attribute }}
                            </td>
                            <td class="description-cell">
                                <div class="description-text">{{ row.description }}</div>
                                <button
                                    v-if="row.matchedPassiveCount > 0"
                                    type="button"
                                    class="condition-passive-mark"
                                    @click.stop="openMatchedPassives(row)"
                                >
                                    P{{ row.matchedPassiveCount }}
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="skill-set-totals-list">
                <div class="skill-set-totals">
                    <div class="total-item total-summary-header">
                        <span class="total-key">A合計値</span>
                        <span class="total-value">{{ formatMetric(basicTotalA) }}</span>
                    </div>

                    <div class="total-col total-col-main">
                        <div class="total-item"><span class="total-key">威力</span><span class="total-value" :title="totalsBreakdownA.power || ''" :class="{ 'has-breakdown-tooltip': Boolean(totalsBreakdownA.power) }">{{ formatMetric(totalsA.power) }}</span></div>
                        <div class="total-item"><span class="total-key">属性</span><span class="total-value" :title="totalsBreakdownA.attribute || ''" :class="{ 'has-breakdown-tooltip': Boolean(totalsBreakdownA.attribute) }">{{ formatMetric(totalsA.attribute) }}</span></div>
                        <div class="total-item"><span class="total-key">守り</span><span class="total-value" :title="totalsBreakdownA.guard || ''" :class="{ 'has-breakdown-tooltip': Boolean(totalsBreakdownA.guard) }">{{ formatMetric(totalsA.guard) }}</span></div>
                        <div class="total-item"><span class="total-key">状態</span><span class="total-value" :title="totalsBreakdownA.state || ''" :class="{ 'has-breakdown-tooltip': Boolean(totalsBreakdownA.state) }">{{ formatMetric(totalsA.state) }}</span></div>
                        <div class="total-item"><span class="total-key">攻撃回数</span><span class="total-value">{{ formatAttackCount(summary.attackCountA) }}</span></div>
                    </div>
                    <div class="total-col total-col-extra">
                        <div class="total-item"><span class="total-key">Cr威力</span><span class="total-value">{{ formatPercent(extraA.critPower) }}</span></div>
                        <div class="total-item"><span class="total-key">Cr率</span><span class="total-value">{{ formatPercent(extraA.critRate) }}</span></div>
                        <div class="total-item"><span class="total-key">ダメージブレ</span><span class="total-value">{{ formatDamageBreak(extraA.minDamage) }}</span></div>
                        <div class="total-item"><span class="total-key">防御貫通</span><span class="total-value">{{ formatBucketPenetration('A', extraA) }}</span></div>
                        <div class="total-item"><span class="total-key">全力合計倍率</span><span class="total-value">x{{ formatMultiplier(fullPowerMultiplierA) }}</span></div>
                    </div>
                </div>

                <div class="skill-set-totals skill-set-totals-m">
                    <div class="total-item total-summary-header">
                        <span class="total-key">M合計値</span>
                        <span class="total-value">{{ formatMetric(basicTotalM) }}</span>
                    </div>

                    <div class="total-col total-col-main">
                        <div class="total-item"><span class="total-key">威力</span><span class="total-value" :title="totalsBreakdownM.power || ''" :class="{ 'has-breakdown-tooltip': Boolean(totalsBreakdownM.power) }">{{ formatMetric(totalsM.power) }}</span></div>
                        <div class="total-item"><span class="total-key">属性</span><span class="total-value" :title="totalsBreakdownM.attribute || ''" :class="{ 'has-breakdown-tooltip': Boolean(totalsBreakdownM.attribute) }">{{ formatMetric(totalsM.attribute) }}</span></div>
                        <div class="total-item"><span class="total-key">守り</span><span class="total-value" :title="totalsBreakdownM.guard || ''" :class="{ 'has-breakdown-tooltip': Boolean(totalsBreakdownM.guard) }">{{ formatMetric(totalsM.guard) }}</span></div>
                        <div class="total-item"><span class="total-key">状態</span><span class="total-value" :title="totalsBreakdownM.state || ''" :class="{ 'has-breakdown-tooltip': Boolean(totalsBreakdownM.state) }">{{ formatMetric(totalsM.state) }}</span></div>
                        <div class="total-item"><span class="total-key">攻撃回数</span><span class="total-value">{{ formatAttackCount(summary.attackCountM) }}</span></div>
                    </div>
                    <div class="total-col total-col-extra">
                        <div class="total-item"><span class="total-key">Cr威力</span><span class="total-value">{{ formatPercent(extraM.critPower) }}</span></div>
                        <div class="total-item"><span class="total-key">Cr率</span><span class="total-value">{{ formatPercent(extraM.critRate) }}</span></div>
                        <div class="total-item"><span class="total-key">ダメージブレ</span><span class="total-value">{{ formatDamageBreak(extraM.minDamage) }}</span></div>
                        <div class="total-item"><span class="total-key">魔法貫通</span><span class="total-value">{{ formatBucketPenetration('M', extraM) }}</span></div>
                        <div class="total-item"><span class="total-key">全力合計倍率</span><span class="total-value">x{{ formatMultiplier(fullPowerMultiplierM) }}</span></div>
                    </div>
                </div>
            </div>

            <div class="skill-set-actions">
                <button
                    v-if="isSendMode"
                    type="button"
                    class="btn-send"
                    @click="submitSend"
                >
                    OK送信
                </button>
                <button
                    v-if="isManageMode"
                    type="button"
                    class="btn-clear"
                    :disabled="!canClearManagedSlot || isClearingSkill"
                    @click="clearManagedSlot"
                >
                    解除
                </button>
                <button type="button" class="btn-cancel" @click="cancel">キャンセル</button>
            </div>

        </div>

        <div
            v-if="isAttackMethodModalOpen"
            class="attack-method-modal"
            @click.self.stop="closeAttackMethodModal"
        >
            <div class="attack-method-modal-content" @click.stop>
                <div class="attack-method-modal-header">
                    <h4>攻撃手段を選択</h4>
                    <button type="button" class="attack-method-close" aria-label="閉じる" @click="closeAttackMethodModal">×</button>
                </div>
                <div class="attack-method-modal-list">
                    <button
                        v-for="option in attackMethods"
                        :key="option.value"
                        type="button"
                        class="attack-method-option"
                        :class="{ 'is-selected': normalizeText(option.value) === normalizeText(currentAttackMethod) }"
                        :disabled="isApplyingAttackMethod"
                        @click="selectAttackMethod(option.value)"
                    >
                        {{ option.label }}
                    </button>
                </div>
            </div>
        </div>

        <div
            v-if="isRenamePresetModalOpen"
            class="preset-rename-modal"
            @click.self.stop="closeRenamePresetModal"
        >
            <div class="preset-rename-modal-content" @click.stop>
                <div class="preset-rename-modal-header">
                    <h4>セット名変更</h4>
                    <button type="button" class="preset-rename-close" aria-label="閉じる" @click="closeRenamePresetModal">×</button>
                </div>
                <div class="preset-rename-modal-body">
                    <p class="preset-rename-current">現在: {{ activePresetName || '未選択' }}</p>
                    <label class="preset-rename-label" for="preset-rename-input">新しい名前</label>
                    <input
                        id="preset-rename-input"
                        class="preset-rename-input"
                        type="text"
                        maxlength="40"
                        v-model.trim="renamePresetInput"
                        :disabled="isPresetRenaming"
                    >
                    <div class="preset-save-icons">
                        <span class="preset-save-icons-label">アイコン</span>
                        <div class="preset-save-icon-grid">
                            <button
                                type="button"
                                class="preset-save-icon-btn"
                                :class="{ 'is-selected': !renamePresetIconName, 'is-none': true }"
                                :disabled="isPresetRenaming"
                                @click="renamePresetIconName = ''"
                            >
                                なし
                            </button>
                            <button
                                v-for="icon in savePresetIconEntries"
                                :key="`rename-${icon.name}`"
                                type="button"
                                class="preset-save-icon-btn"
                                :class="{ 'is-selected': renamePresetIconName === icon.name }"
                                :disabled="isPresetRenaming"
                                @click="renamePresetIconName = icon.name"
                                :title="icon.name"
                            >
                                <img :src="icon.url" :alt="icon.name" class="preset-save-icon-image">
                            </button>
                        </div>
                    </div>
                    <p v-if="renamePresetError" class="preset-rename-error">{{ renamePresetError }}</p>
                </div>
                <div class="preset-rename-modal-actions">
                    <button type="button" class="preset-rename-cancel" :disabled="isPresetRenaming" @click="closeRenamePresetModal">キャンセル</button>
                    <button
                        v-if="renamePresetNeedsOverwrite"
                        type="button"
                        class="preset-rename-overwrite"
                        :disabled="isPresetRenaming"
                        @click="submitRenamePreset(true)"
                    >
                        上書きして変更
                    </button>
                    <button
                        type="button"
                        class="preset-rename-submit"
                        :disabled="isPresetRenaming"
                        @click="submitRenamePreset(false)"
                    >
                        変更
                    </button>
                </div>
            </div>
        </div>

        <div
            v-if="isSavePresetModalOpen"
            class="preset-save-modal"
            @click.self.stop="closeSavePresetModal"
        >
            <div class="preset-save-modal-content" @click.stop>
                <div class="preset-save-modal-header">
                    <h4>セット登録</h4>
                    <button type="button" class="preset-save-close" aria-label="閉じる" @click="closeSavePresetModal">×</button>
                </div>
                <div class="preset-save-modal-body">
                    <label class="preset-save-label" for="preset-save-input">セット名</label>
                    <input
                        id="preset-save-input"
                        class="preset-save-input"
                        type="text"
                        maxlength="40"
                        v-model.trim="savePresetInput"
                        :disabled="isPresetSaving"
                    >
                    <div class="preset-save-icons">
                        <span class="preset-save-icons-label">アイコン</span>
                        <div class="preset-save-icon-grid">
                            <button
                                type="button"
                                class="preset-save-icon-btn"
                                :class="{ 'is-selected': !savePresetIconName, 'is-none': true }"
                                :disabled="isPresetSaving"
                                @click="savePresetIconName = ''"
                            >
                                なし
                            </button>
                            <button
                                v-for="icon in savePresetIconEntries"
                                :key="icon.name"
                                type="button"
                                class="preset-save-icon-btn"
                                :class="{ 'is-selected': savePresetIconName === icon.name }"
                                :disabled="isPresetSaving"
                                @click="savePresetIconName = icon.name"
                                :title="icon.name"
                            >
                                <img :src="icon.url" :alt="icon.name" class="preset-save-icon-image">
                            </button>
                        </div>
                    </div>
                    <p v-if="savePresetError" class="preset-save-error">{{ savePresetError }}</p>
                </div>
                <div class="preset-save-modal-actions">
                    <button type="button" class="preset-save-cancel" :disabled="isPresetSaving" @click="closeSavePresetModal">キャンセル</button>
                    <button
                        v-if="savePresetNeedsOverwrite"
                        type="button"
                        class="preset-save-overwrite"
                        :disabled="isPresetSaving"
                        @click="submitSavePreset(true)"
                    >
                        上書きして登録
                    </button>
                    <button
                        type="button"
                        class="preset-save-submit"
                        :disabled="isPresetSaving"
                        @click="submitSavePreset(false)"
                    >
                        登録
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { triggerPostModalInteractionGuard } from '../utils/modalInteractionGuard.js';

const isOpen = ref(false);
const skillName = ref('');
const allowedSlots = ref([]);
const rows = ref([]);
const selectedSlot = ref('');
const modalMode = ref('select');
const managedSlot = ref('');
const attackMethods = ref([]);
const currentAttackMethod = ref('');
const isAttackMethodModalOpen = ref(false);
const isApplyingAttackMethod = ref(false);
const isApplyingFullPower = ref(false);
const isClearingSkill = ref(false);
const isAdjustingResource = ref(false);
const isPresetSaving = ref(false);
const isPresetLoading = ref(false);
const isPresetListLoading = ref(false);
const isPresetSwitching = ref(false);
const isPresetRenaming = ref(false);
const isSavePresetModalOpen = ref(false);
const isRenamePresetModalOpen = ref(false);
const savePresetInput = ref('');
const savePresetError = ref('');
const savePresetNeedsOverwrite = ref(false);
const savePresetIconName = ref('');
const savePresetIconEntries = ref([]);
const renamePresetInput = ref('');
const renamePresetIconName = ref('');
const renamePresetError = ref('');
const renamePresetNeedsOverwrite = ref(false);
const presetEntries = ref([]);
const activePresetName = ref('');
const activePresetIcon = ref('');
const activePresetIconUrl = ref('');
const presetStatusText = ref('');
const presetStatusType = ref('info');
const sendDiceCount = ref(1);
const sendDiceMax = ref(100);
const isFullPowerOn = ref(false);
const resourcePreview = ref({
    name: '',
    hp: { max: 100, current: 100, after: 100, planned: 0, rateCurrent: 100, rateAfter: 100, ratePlanned: 0 },
    mp: { max: 0, current: 0, after: 0, planned: 0, rateCurrent: 0, rateAfter: 0, ratePlanned: 0 },
    st: { max: 0, current: 0, after: 0, planned: 0, rateCurrent: 0, rateAfter: 0, ratePlanned: 0 }
});
const summary = ref({
    critRate: 0,
    critPower: 0,
    minDamage: 0,
    defensePenetration: 0,
    magicPenetration: 0,
    attackCount: 1,
    attackCountA: 1,
    attackCountM: 1,
    fullPowerTotal: 0,
    fullPowerTotalMultiplier: 1.25,
    groupedTotals: {
        A: { power: 0, guard: 0, state: 0, attribute: 0 },
        M: { power: 0, guard: 0, state: 0, attribute: 0 }
    }
});
let resolver = null;

const displayRows = computed(() =>
    rows.value.map((row) => ({
        ...row,
        isAllowed: allowedSlots.value.includes(row.slot)
    }))
);

const isManageMode = computed(() => modalMode.value === 'manage');
const isSendMode = computed(() => modalMode.value === 'send');

const modalTargetText = computed(() => {
    if (isSendMode.value) {
        return '送信前にダイス設定と内容を確認';
    }
    if (isManageMode.value) {
        const slotText = managedSlot.value ? `（${managedSlot.value}）` : '';
        return `「${skillName.value}」${slotText}の管理`;
    }
    return `「${skillName.value}」のセット先を選択`;
});

const canClearManagedSlot = computed(() => {
    if (!isManageMode.value) return false;
    const slot = managedSlot.value || selectedSlot.value;
    if (!slot) return false;
    const row = displayRows.value.find((entry) => entry.slot === slot);
    return Boolean(String(row?.name || '').trim());
});

const currentAttackMethodLabel = computed(() => {
    const current = normalizeText(currentAttackMethod.value);
    if (!current) return '未選択';
    const matched = attackMethods.value.find((option) => normalizeText(option.value) === current);
    return String(matched?.label || currentAttackMethod.value || '未選択').trim() || '未選択';
});

function normalizeText(value) {
    return String(value || '').trim();
}

function normalizeAttackMethods(input, currentValue = '') {
    const list = Array.isArray(input) ? input : [];
    const map = new Map();
    list.forEach((entry) => {
        const value = normalizeText(entry?.value);
        if (!value) return;
        const label = normalizeText(entry?.label) || value;
        if (!map.has(value)) {
            map.set(value, { value, label });
        }
    });

    const current = normalizeText(currentValue);
    if (current && !map.has(current)) {
        map.set(current, { value: current, label: current });
    }
    return Array.from(map.values());
}

function toMetricNumber(value) {
    const text = String(value ?? '').trim();
    if (!text || text === '-' || text === '未選択' || text === '入力なし') return 0;
    const matched = text.match(/-?\d+(?:\.\d+)?/);
    if (!matched) return 0;
    const num = Number(matched[0]);
    return Number.isFinite(num) ? Math.round(num) : 0;
}

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

function formatPercent(value) {
    const num = Math.round(toFiniteNumber(value));
    return num === 0 ? '-' : `${num}%`;
}

function formatDamageBreak(value) {
    const num = Math.round(toFiniteNumber(value));
    if (num === 0) return '40~100';
    return `${num + 40}~100`;
}

function formatAttackCount(value) {
    const num = Math.max(0, Math.round(toFiniteNumber(value)));
    return num <= 1 ? '-' : `x${num}`;
}

function formatSigned(value) {
    const num = Math.round(toFiniteNumber(value));
    if (num === 0) return '';
    return num > 0 ? `+${num}` : `${num}`;
}

function formatBucketPenetration(bucket, extras) {
    const key = String(bucket || '').toUpperCase() === 'M' ? 'magicPenetration' : 'defensePenetration';
    const value = toFiniteNumber(extras?.[key]);
    if (value !== 0) return formatSigned(value);
    return '-';
}

function formatMultiplier(value) {
    const num = toFiniteNumber(value);
    if (num === 0) return '1.00';
    return (Math.round(num * 100) / 100).toFixed(2);
}

function formatMetric(value) {
    const num = Math.round(toFiniteNumber(value));
    return num === 0 ? '-' : String(num);
}

function normalizeBreakdownMap(input) {
    const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
    const normalized = {};
    Object.entries(source).forEach(([rawLabel, rawValue]) => {
        const label = normalizeText(rawLabel);
        const value = Math.round(toFiniteNumber(rawValue));
        if (!label || value <= 0) return;
        normalized[label] = (normalized[label] || 0) + value;
    });
    return normalized;
}

function mergeBreakdownMaps(base, incoming) {
    const merged = normalizeBreakdownMap(base);
    const source = normalizeBreakdownMap(incoming);
    Object.entries(source).forEach(([label, value]) => {
        merged[label] = (merged[label] || 0) + Math.round(toFiniteNumber(value));
    });
    return merged;
}

function formatBreakdownTitleFromMap(input) {
    const normalized = normalizeBreakdownMap(input);
    const entries = Object.entries(normalized);
    if (!entries.length) return '';
    return entries
        .map(([label, value]) => `${label} ${Math.round(toFiniteNumber(value))}`)
        .join('\n');
}

function setPresetStatus(message = '', type = 'info') {
    presetStatusText.value = String(message || '').trim();
    presetStatusType.value = type === 'error' ? 'error' : 'info';
}

function buildDefaultPresetName(entriesInput = presetEntries.value) {
    const list = Array.isArray(entriesInput) ? entriesInput : [];
    const used = new Set(
        list
            .map((entry) => normalizeText(entry?.name))
            .filter(Boolean)
    );
    let index = 1;
    while (used.has(`セット${index}`)) {
        index += 1;
    }
    return `セット${index}`;
}

function toIconUrlFromName(iconName) {
    const name = normalizeText(iconName);
    if (!name) return '';
    return `/images/%E6%94%BB%E6%92%83%E6%89%8B%E6%AE%B5/${encodeURIComponent(name)}`;
}

function normalizeIconList(input) {
    const list = Array.isArray(input) ? input : [];
    return list
        .map((entry) => {
            const name = normalizeText(entry?.name);
            const url = normalizeText(entry?.url) || toIconUrlFromName(name);
            return { name, url };
        })
        .filter((entry) => entry.name && entry.url);
}

function normalizePresetEntries(input) {
    const list = Array.isArray(input) ? input : [];
    return list
        .map((entry) => ({
            name: normalizeText(entry?.name),
            icon: normalizeText(entry?.icon),
            iconUrl: normalizeText(entry?.iconUrl) || toIconUrlFromName(entry?.icon),
            updatedAt: normalizeText(entry?.updatedAt)
        }))
        .filter((entry) => entry.name)
        .sort((a, b) => String(a.updatedAt || '').localeCompare(String(b.updatedAt || '')));
}

function upsertPresetEntryLocal(entry = {}) {
    const normalizedName = normalizeText(entry?.name);
    if (!normalizedName) return;
    const nextEntry = {
        name: normalizedName,
        icon: normalizeText(entry?.icon),
        iconUrl: normalizeText(entry?.iconUrl) || toIconUrlFromName(entry?.icon),
        updatedAt: normalizeText(entry?.updatedAt) || new Date().toISOString()
    };
    const filtered = presetEntries.value.filter((item) => normalizeText(item?.name) !== normalizedName);
    presetEntries.value = normalizePresetEntries([nextEntry, ...filtered]);
}

function removePresetEntryLocal(name = '') {
    const normalizedName = normalizeText(name);
    if (!normalizedName) return;
    presetEntries.value = presetEntries.value.filter((item) => normalizeText(item?.name) !== normalizedName);
}

async function refreshPresetEntries(options = {}) {
    if (typeof window.listSkillSetPresetsForSkillSetModal !== 'function') {
        presetEntries.value = [];
        activePresetIcon.value = '';
        activePresetIconUrl.value = '';
        return;
    }
    try {
        isPresetListLoading.value = true;
        const loaded = await window.listSkillSetPresetsForSkillSetModal();
        const normalized = normalizePresetEntries(loaded);
        presetEntries.value = normalized;

        const forcedActiveName = normalizeText(options?.activeName);
        if (forcedActiveName) {
            activePresetName.value = forcedActiveName;
            const matched = normalized.find((entry) => normalizeText(entry.name) === forcedActiveName) || null;
            activePresetIcon.value = normalizeText(matched?.icon);
            activePresetIconUrl.value = normalizeText(matched?.iconUrl);
            return;
        }
        const keepActive = options?.keepActive !== false;
        if (keepActive) {
            const matched = normalized.find((entry) => normalizeText(entry.name) === normalizeText(activePresetName.value)) || null;
            if (!matched) {
                activePresetName.value = '';
                activePresetIcon.value = '';
                activePresetIconUrl.value = '';
            } else {
                activePresetIcon.value = normalizeText(matched.icon);
                activePresetIconUrl.value = normalizeText(matched.iconUrl);
            }
            return;
        }
        activePresetName.value = '';
        activePresetIcon.value = '';
        activePresetIconUrl.value = '';
    } catch (error) {
        console.error('skill-set modal preset list error:', error);
        presetEntries.value = [];
        activePresetIcon.value = '';
        activePresetIconUrl.value = '';
    } finally {
        isPresetListLoading.value = false;
    }
}

function normalizeResourceEntry(raw, fallbackMax = 0) {
    const max = Math.max(0, Math.round(toFiniteNumber(raw?.max) || fallbackMax));
    const current = Math.round(clamp(toFiniteNumber(raw?.current), 0, max));
    const after = Math.round(clamp(toFiniteNumber(raw?.after), 0, current));
    const planned = Math.round(clamp(toFiniteNumber(raw?.planned), 0, current));

    const rateCurrent = max > 0
        ? clamp(toFiniteNumber(raw?.rateCurrent), 0, 100)
        : 0;
    const rateAfter = max > 0
        ? clamp(toFiniteNumber(raw?.rateAfter), 0, rateCurrent)
        : 0;
    const ratePlanned = max > 0
        ? clamp(toFiniteNumber(raw?.ratePlanned), 0, Math.max(0, rateCurrent - rateAfter))
        : 0;

    return {
        max,
        current,
        after,
        planned,
        rateCurrent,
        rateAfter,
        ratePlanned
    };
}

function normalizeResourcePreview(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    return {
        name: String(source?.name || '').trim(),
        hp: normalizeResourceEntry(source?.hp, 100),
        mp: normalizeResourceEntry(source?.mp, 0),
        st: normalizeResourceEntry(source?.st, 0)
    };
}

function getResourcePreviewNameFallback() {
    const fromPlayer = String(window?.playerData?.name || '').trim();
    if (fromPlayer) return fromPlayer;
    const fromStatus = String(window?.statusCharacter?.name || '').trim();
    if (fromStatus) return fromStatus;
    const fromList = Array.isArray(window?.characterList)
        ? String(window.characterList[0]?.name || '').trim()
        : '';
    return fromList;
}

const resourceRows = computed(() => ([
    { key: 'hp', label: 'HP', ...resourcePreview.value.hp },
    { key: 'mp', label: 'MP', ...resourcePreview.value.mp },
    { key: 'st', label: 'ST', ...resourcePreview.value.st }
]));

const splitTotals = computed(() => {
    const fromSummary = summary.value?.groupedTotals;
    if (fromSummary && typeof fromSummary === 'object') {
        return {
            A: {
                power: toMetricNumber(fromSummary?.A?.power),
                guard: toMetricNumber(fromSummary?.A?.guard),
                state: toMetricNumber(fromSummary?.A?.state),
                attribute: toMetricNumber(fromSummary?.A?.attribute)
            },
            M: {
                power: toMetricNumber(fromSummary?.M?.power),
                guard: toMetricNumber(fromSummary?.M?.guard),
                state: toMetricNumber(fromSummary?.M?.state),
                attribute: toMetricNumber(fromSummary?.M?.attribute)
            }
        };
    }

    return displayRows.value.reduce((acc, row) => {
        const bucket = String(row?.totalBucket || '').toUpperCase() === 'M' ? 'M' : 'A';
        acc[bucket].power += toMetricNumber(row.power);
        acc[bucket].guard += toMetricNumber(row.guard);
        acc[bucket].state += toMetricNumber(row.state);
        acc[bucket].attribute += toMetricNumber(row.attribute);
        return acc;
    }, {
        A: { power: 0, guard: 0, state: 0, attribute: 0 },
        M: { power: 0, guard: 0, state: 0, attribute: 0 }
    });
});

const totalsA = computed(() => splitTotals.value.A);
const totalsM = computed(() => splitTotals.value.M);

function buildTotalsBreakdownTitlesForBucket(bucket = 'A') {
    const normalizedBucket = String(bucket || '').toUpperCase() === 'M' ? 'M' : 'A';
    const merged = {
        power: {},
        guard: {},
        state: {},
        attribute: {}
    };

    displayRows.value.forEach((row) => {
        const rowBucket = String(row?.totalBucket || '').toUpperCase() === 'M' ? 'M' : 'A';
        if (rowBucket !== normalizedBucket) return;
        const powerSource = normalizedBucket === 'A'
            ? (row?.powerBreakdownScaledPhysical || row?.powerBreakdownScaled || row?.powerBreakdown)
            : (row?.powerBreakdownScaled || row?.powerBreakdown);
        merged.power = mergeBreakdownMaps(merged.power, powerSource);
        merged.guard = mergeBreakdownMaps(merged.guard, row?.guardBreakdownScaled || row?.guardBreakdown);
        merged.state = mergeBreakdownMaps(merged.state, row?.stateBreakdownScaled || row?.stateBreakdown);
        merged.attribute = mergeBreakdownMaps(merged.attribute, row?.attributeBreakdownScaled || row?.attributeBreakdown);
    });

    const bucketTotals = normalizedBucket === 'M' ? splitTotals.value.M : splitTotals.value.A;
    const fallbackByMetric = {
        power: { label: '威力', value: bucketTotals.power },
        guard: { label: '守り', value: bucketTotals.guard },
        state: { label: '状態', value: bucketTotals.state },
        attribute: { label: '属性', value: bucketTotals.attribute }
    };

    Object.entries(fallbackByMetric).forEach(([metric, fallback]) => {
        if (Object.keys(merged[metric] || {}).length > 0) return;
        const fallbackValue = Math.round(toFiniteNumber(fallback?.value));
        if (fallbackValue === 0) return;
        merged[metric] = { [fallback.label]: fallbackValue };
    });

    return {
        power: formatBreakdownTitleFromMap(merged.power),
        guard: formatBreakdownTitleFromMap(merged.guard),
        state: formatBreakdownTitleFromMap(merged.state),
        attribute: formatBreakdownTitleFromMap(merged.attribute)
    };
}

const totalsBreakdownA = computed(() => buildTotalsBreakdownTitlesForBucket('A'));
const totalsBreakdownM = computed(() => buildTotalsBreakdownTitlesForBucket('M'));

const splitExtras = computed(() =>
    displayRows.value.reduce((acc, row) => {
        const bucket = String(row?.totalBucket || '').toUpperCase() === 'M' ? 'M' : 'A';
        acc[bucket].critRate += toFiniteNumber(row?.critRate);
        acc[bucket].critPower += toFiniteNumber(row?.critPower);
        acc[bucket].minDamage += toFiniteNumber(row?.minDamage);
        acc[bucket].defensePenetration += toFiniteNumber(row?.defensePenetration);
        acc[bucket].magicPenetration += toFiniteNumber(row?.magicPenetration);
        acc[bucket].fullPower += toFiniteNumber(row?.fullPower);
        return acc;
    }, {
        A: { critRate: 0, critPower: 0, minDamage: 0, defensePenetration: 0, magicPenetration: 0, fullPower: 0 },
        M: { critRate: 0, critPower: 0, minDamage: 0, defensePenetration: 0, magicPenetration: 0, fullPower: 0 }
    })
);

const extraA = computed(() => splitExtras.value.A);
const extraM = computed(() => splitExtras.value.M);
const fullPowerMultiplierA = computed(() => (toFiniteNumber(extraA.value.fullPower) / 100) + 1.25);
const fullPowerMultiplierM = computed(() => (toFiniteNumber(extraM.value.fullPower) / 100) + 1.00);

const basicTotalA = computed(() => (
    splitTotals.value.A.power
    + splitTotals.value.A.attribute
    + splitTotals.value.A.guard
    + splitTotals.value.A.state
));

const basicTotalM = computed(() => (
    splitTotals.value.M.power
    + splitTotals.value.M.attribute
    + splitTotals.value.M.guard
    + splitTotals.value.M.state
));

function normalizeRows(inputRows) {
    const baseSlots = ['A', 'S', 'Q1', 'Q2', 'M'];
    const map = new Map();
    (Array.isArray(inputRows) ? inputRows : []).forEach((row) => {
        const slot = String(row?.slot || '').trim();
        if (!slot) return;
        map.set(slot, {
            slot,
            name: String(row?.name || '').trim(),
            ruby: String(row?.ruby || '').trim(),
            power: String(row?.power || '').trim(),
            guard: String(row?.guard || '').trim(),
            state: String(row?.state || '').trim(),
            attribute: String(row?.attribute || '').trim(),
            powerBreakdown: normalizeBreakdownMap(row?.powerBreakdown),
            guardBreakdown: normalizeBreakdownMap(row?.guardBreakdown),
            stateBreakdown: normalizeBreakdownMap(row?.stateBreakdown),
            attributeBreakdown: normalizeBreakdownMap(row?.attributeBreakdown),
            powerBreakdownScaled: normalizeBreakdownMap(row?.powerBreakdownScaled),
            powerBreakdownScaledPhysical: normalizeBreakdownMap(row?.powerBreakdownScaledPhysical),
            guardBreakdownScaled: normalizeBreakdownMap(row?.guardBreakdownScaled),
            stateBreakdownScaled: normalizeBreakdownMap(row?.stateBreakdownScaled),
            attributeBreakdownScaled: normalizeBreakdownMap(row?.attributeBreakdownScaled),
            powerBreakdownTitle: String(row?.powerBreakdownTitle || '').trim(),
            guardBreakdownTitle: String(row?.guardBreakdownTitle || '').trim(),
            stateBreakdownTitle: String(row?.stateBreakdownTitle || '').trim(),
            attributeBreakdownTitle: String(row?.attributeBreakdownTitle || '').trim(),
            critRate: toFiniteNumber(row?.critRate),
            critPower: toFiniteNumber(row?.critPower),
            minDamage: toFiniteNumber(row?.minDamage),
            attackCount: toFiniteNumber(row?.attackCount),
            defensePenetration: toFiniteNumber(row?.defensePenetration),
            magicPenetration: toFiniteNumber(row?.magicPenetration),
            fullPower: toFiniteNumber(row?.fullPower),
            description: String(row?.description || '').trim(),
            matchedPassiveCount: Number(row?.matchedPassiveCount) || 0,
            matchedPassives: Array.isArray(row?.matchedPassives) ? row.matchedPassives : [],
            totalBucket: String(row?.totalBucket || '').toUpperCase() === 'M' ? 'M' : 'A'
        });
    });
    baseSlots.forEach((slot) => {
        if (map.has(slot)) return;
        map.set(slot, {
            slot,
            name: '',
            ruby: '',
            power: '',
            guard: '',
            state: '',
            attribute: '',
            powerBreakdown: {},
            guardBreakdown: {},
            stateBreakdown: {},
            attributeBreakdown: {},
            powerBreakdownScaled: {},
            powerBreakdownScaledPhysical: {},
            guardBreakdownScaled: {},
            stateBreakdownScaled: {},
            attributeBreakdownScaled: {},
            powerBreakdownTitle: '',
            guardBreakdownTitle: '',
            stateBreakdownTitle: '',
            attributeBreakdownTitle: '',
            critRate: 0,
            critPower: 0,
            minDamage: 0,
            attackCount: 0,
            defensePenetration: 0,
            magicPenetration: 0,
            fullPower: 0,
            description: '',
            matchedPassiveCount: 0,
            matchedPassives: [],
            totalBucket: slot === 'M' ? 'M' : 'A'
        });
    });
    return baseSlots.map((slot) => map.get(slot));
}

function openMatchedPassives(row) {
    const items = Array.isArray(row?.matchedPassives) ? row.matchedPassives : [];
    if (!items.length) return;
    if (typeof window.openConditionPassiveModalVue === 'function') {
        window.openConditionPassiveModalVue({
            title: `${row.slot} 一致Pスキル`,
            items
        });
    }
}

function closeWith(result, options = {}) {
    const withGuard = options?.withGuard !== false;
    isOpen.value = false;
    const done = resolver;
    resolver = null;
    if (typeof done === 'function') {
        done(result);
    }
    if (withGuard) {
        triggerPostModalInteractionGuard();
    }
}

function cancel() {
    closeWith(null);
}

function handleBackdropClick() {
    cancel();
}

function selectSlot(row) {
    if (!row?.isAllowed) return;
    if (isManageMode.value || isSendMode.value) {
        selectedSlot.value = row.slot;
        return;
    }
    if (selectedSlot.value === row.slot) {
        closeWith(row.slot);
        return;
    }
    selectedSlot.value = row.slot;
}

async function clearManagedSlot() {
    if (!canClearManagedSlot.value) return;
    const slot = managedSlot.value || selectedSlot.value;
    if (typeof window.clearSkillFromSkillSetModal === 'function') {
        try {
            isClearingSkill.value = true;
            const refreshed = await window.clearSkillFromSkillSetModal(slot);
            if (refreshed && typeof refreshed === 'object') {
                applyPayloadData(refreshed);
            }
            selectedSlot.value = String(slot || '').trim();
            return;
        } finally {
            isClearingSkill.value = false;
        }
    }
    closeWith({
        action: 'clear',
        slot
    });
}

function openAttackMethodModal() {
    if (attackMethods.value.length === 0) return;
    isAttackMethodModalOpen.value = true;
}

function closeAttackMethodModal(options = {}) {
    const withGuard = options?.withGuard !== false;
    const wasOpen = isAttackMethodModalOpen.value;
    isAttackMethodModalOpen.value = false;
    if (wasOpen && withGuard) {
        triggerPostModalInteractionGuard();
    }
}

function applyPayloadData(payload = {}) {
    const incomingSummary = payload?.summary && typeof payload.summary === 'object' ? payload.summary : {};
    summary.value = {
        critRate: toFiniteNumber(incomingSummary.critRate),
        critPower: toFiniteNumber(incomingSummary.critPower),
        minDamage: toFiniteNumber(incomingSummary.minDamage),
        defensePenetration: toFiniteNumber(incomingSummary.defensePenetration),
        magicPenetration: toFiniteNumber(incomingSummary.magicPenetration),
        attackCount: Math.max(1, Math.round(toFiniteNumber(incomingSummary.attackCount) || 1)),
        attackCountA: Math.max(1, Math.round(toFiniteNumber(incomingSummary.attackCountA) || toFiniteNumber(incomingSummary.attackCount) || 1)),
        attackCountM: Math.max(1, Math.round(toFiniteNumber(incomingSummary.attackCountM) || 1)),
        fullPowerTotal: toFiniteNumber(incomingSummary.fullPowerTotal),
        fullPowerTotalMultiplier: toFiniteNumber(incomingSummary.fullPowerTotalMultiplier) || 1.25,
        groupedTotals: incomingSummary.groupedTotals && typeof incomingSummary.groupedTotals === 'object'
            ? incomingSummary.groupedTotals
            : {
                A: { power: 0, guard: 0, state: 0, attribute: 0 },
                M: { power: 0, guard: 0, state: 0, attribute: 0 }
            }
    };

    rows.value = normalizeRows(payload.rows);
    let normalizedPreview = normalizeResourcePreview(payload?.resourcePreview);
    if (!normalizedPreview.name && typeof window?.getSkillSetResourcePreviewForModal === 'function') {
        normalizedPreview = normalizeResourcePreview(window.getSkillSetResourcePreviewForModal());
    }
    if (!normalizedPreview.name) {
        normalizedPreview.name = getResourcePreviewNameFallback();
    }
    resourcePreview.value = normalizedPreview;
    if (typeof window.getFullPowerModeState === 'function') {
        isFullPowerOn.value = Boolean(window.getFullPowerModeState());
    } else {
        isFullPowerOn.value = Boolean(payload?.isFullPowerOn);
    }
    const incomingCurrentAttackMethod = normalizeText(payload.currentAttackMethod);
    currentAttackMethod.value = incomingCurrentAttackMethod;
    attackMethods.value = normalizeAttackMethods(payload.attackMethods, incomingCurrentAttackMethod);
}

async function selectAttackMethod(nextValue) {
    const target = normalizeText(nextValue);
    if (!target || isApplyingAttackMethod.value) return;

    currentAttackMethod.value = target;
    if (typeof window.applyAttackMethodFromSkillSetModal !== 'function') {
        closeAttackMethodModal();
        return;
    }

    try {
        isApplyingAttackMethod.value = true;
        const refreshed = await window.applyAttackMethodFromSkillSetModal(target);
        if (refreshed && typeof refreshed === 'object') {
            applyPayloadData(refreshed);
        }
    } finally {
        isApplyingAttackMethod.value = false;
        closeAttackMethodModal();
    }
}

async function toggleFullPowerFromModal() {
    if (isApplyingFullPower.value) return;
    const nextState = !isFullPowerOn.value;

    if (typeof window.applyFullPowerModeFromSkillSetModal !== 'function') {
        isFullPowerOn.value = nextState;
        return;
    }

    try {
        isApplyingFullPower.value = true;
        const refreshed = await window.applyFullPowerModeFromSkillSetModal(nextState);
        if (refreshed && typeof refreshed === 'object') {
            applyPayloadData(refreshed);
        } else {
            isFullPowerOn.value = nextState;
        }
    } finally {
        isApplyingFullPower.value = false;
    }
}

async function openResourceAdjustModalFromSkillSet() {
    if (isAdjustingResource.value) return;
    if (typeof window.openResourceAdjustModalForCharacter !== "function") return;
    const targetName = normalizeText(resourcePreview.value?.name) || getResourcePreviewNameFallback();
    if (!targetName) return;

    try {
        isAdjustingResource.value = true;
        const refreshed = await window.openResourceAdjustModalForCharacter(targetName, {
            mode: "value",
            operation: "decrease"
        });
        if (refreshed && typeof refreshed === "object") {
            applyPayloadData(refreshed);
            return;
        }
        if (typeof window.getSkillSetResourcePreviewForModal === "function") {
            resourcePreview.value = normalizeResourcePreview(window.getSkillSetResourcePreviewForModal());
        }
    } finally {
        isAdjustingResource.value = false;
    }
}

async function loadSavePresetIconEntries(forceReload = false) {
    if (!forceReload && savePresetIconEntries.value.length > 0) return;
    if (typeof window.listSkillSetIconsForSkillSetModal !== 'function') {
        savePresetIconEntries.value = [];
        return;
    }
    try {
        const loaded = await window.listSkillSetIconsForSkillSetModal();
        savePresetIconEntries.value = normalizeIconList(loaded);
    } catch (error) {
        console.error('skill-set modal icon list error:', error);
        savePresetIconEntries.value = [];
    }
}

async function openSavePresetModal() {
    if (isPresetSaving.value || isPresetLoading.value || isPresetSwitching.value || isPresetRenaming.value) return;
    await loadSavePresetIconEntries(false);
    savePresetInput.value = '';
    savePresetError.value = '';
    savePresetNeedsOverwrite.value = false;
    const hasActiveIcon = savePresetIconEntries.value.some((entry) => entry.name === activePresetIcon.value);
    savePresetIconName.value = hasActiveIcon ? activePresetIcon.value : '';
    isSavePresetModalOpen.value = true;
}

function closeSavePresetModal() {
    if (isPresetSaving.value) return;
    isSavePresetModalOpen.value = false;
    savePresetError.value = '';
    savePresetNeedsOverwrite.value = false;
}

async function submitSavePreset(overwrite = false) {
    if (isPresetSaving.value || isPresetLoading.value || isPresetSwitching.value || isPresetRenaming.value) return;
    if (typeof window.saveSkillSetPresetFromSkillSetModal !== 'function') {
        savePresetError.value = 'セット登録に失敗しました';
        return;
    }
    let nextName = normalizeText(savePresetInput.value);
    if (!nextName) {
        nextName = buildDefaultPresetName();
        savePresetInput.value = nextName;
    }
    const nextIcon = normalizeText(savePresetIconName.value);

    try {
        isPresetSaving.value = true;
        savePresetError.value = '';
        const result = await window.saveSkillSetPresetFromSkillSetModal(nextName, nextIcon, overwrite);
        if (!result || typeof result !== 'object') return;
        if (result.status === 'saved') {
            if (result.payload && typeof result.payload === 'object') {
                applyPayloadData(result.payload);
            }
            const savedName = normalizeText(result.presetName);
            activePresetName.value = savedName;
            activePresetIcon.value = normalizeText(result.icon) || nextIcon;
            activePresetIconUrl.value = toIconUrlFromName(activePresetIcon.value);
            upsertPresetEntryLocal({
                name: savedName,
                icon: activePresetIcon.value,
                iconUrl: activePresetIconUrl.value
            });
            setPresetStatus(`セット登録: ${savedName || '完了'}`);
            await refreshPresetEntries({
                keepActive: true,
                activeName: savedName || activePresetName.value
            });
            closeSavePresetModal();
            closeWith(null);
            return;
        }
        if (result.status === 'exists') {
            savePresetError.value = `「${nextName}」は既にあります。上書きしますか？`;
            savePresetNeedsOverwrite.value = true;
            return;
        }
        if (result.status === 'cancelled') {
            return;
        }
        savePresetError.value = 'セット登録に失敗しました';
    } catch (error) {
        console.error('skill-set modal preset save error:', error);
        savePresetError.value = 'セット登録に失敗しました';
    } finally {
        isPresetSaving.value = false;
    }
}

async function openRenamePresetModal() {
    if (!activePresetName.value) return;
    if (isPresetSaving.value || isPresetLoading.value || isPresetSwitching.value || isPresetRenaming.value) return;
    await loadSavePresetIconEntries(false);
    renamePresetInput.value = activePresetName.value;
    const hasActiveIcon = savePresetIconEntries.value.some((entry) => entry.name === activePresetIcon.value);
    renamePresetIconName.value = hasActiveIcon ? activePresetIcon.value : '';
    renamePresetError.value = '';
    renamePresetNeedsOverwrite.value = false;
    isRenamePresetModalOpen.value = true;
}

function closeRenamePresetModal() {
    if (isPresetRenaming.value) return;
    isRenamePresetModalOpen.value = false;
    renamePresetIconName.value = '';
    renamePresetError.value = '';
    renamePresetNeedsOverwrite.value = false;
}

async function submitRenamePreset(overwrite = false) {
    if (!activePresetName.value) return;
    if (isPresetSaving.value || isPresetLoading.value || isPresetSwitching.value || isPresetRenaming.value) return;
    if (typeof window.renameSkillSetPresetFromSkillSetModal !== 'function') {
        renamePresetError.value = '名前変更に失敗しました';
        return;
    }

    const nextName = normalizeText(renamePresetInput.value);
    if (!nextName) {
        renamePresetError.value = '新しい名前を入力してください';
        renamePresetNeedsOverwrite.value = false;
        return;
    }
    const nextIcon = normalizeText(renamePresetIconName.value);

    try {
        isPresetRenaming.value = true;
        renamePresetError.value = '';
        const result = await window.renameSkillSetPresetFromSkillSetModal(activePresetName.value, nextName, nextIcon, overwrite);
        if (!result || typeof result !== 'object') return;
        if (result.status === 'renamed') {
            const previousName = normalizeText(activePresetName.value);
            const renamed = normalizeText(result.presetName) || normalizeText(activePresetName.value);
            activePresetName.value = renamed;
            activePresetIcon.value = normalizeText(result.icon) || nextIcon;
            activePresetIconUrl.value = normalizeText(result.iconUrl) || toIconUrlFromName(activePresetIcon.value);
            if (result.payload && typeof result.payload === 'object') {
                applyPayloadData(result.payload);
            }
            if (previousName && previousName !== renamed) {
                removePresetEntryLocal(previousName);
            }
            upsertPresetEntryLocal({
                name: renamed,
                icon: activePresetIcon.value,
                iconUrl: activePresetIconUrl.value
            });
            setPresetStatus(`名前変更: ${renamed || '完了'}`);
            await refreshPresetEntries({
                keepActive: true,
                activeName: renamed
            });
            closeRenamePresetModal();
            return;
        }
        if (result.status === 'cancelled') {
            return;
        }
        renamePresetError.value = '名前変更に失敗しました';
    } catch (error) {
        console.error('skill-set modal preset rename error:', error);
        if (!overwrite && Number(error?.httpStatus) === 409) {
            renamePresetError.value = `「${nextName}」は既にあります。上書きしますか？`;
            renamePresetNeedsOverwrite.value = true;
            return;
        }
        renamePresetError.value = '名前変更に失敗しました';
    } finally {
        isPresetRenaming.value = false;
    }
}

async function selectPresetFromHeader(presetName) {
    const targetPreset = normalizeText(presetName);
    if (!targetPreset || isPresetSwitching.value || isPresetSaving.value || isPresetLoading.value || isPresetRenaming.value) return;
    if (typeof window.loadSkillSetPresetByNameFromSkillSetModal !== 'function') {
        return;
    }

    try {
        isPresetSwitching.value = true;
        const result = await window.loadSkillSetPresetByNameFromSkillSetModal(targetPreset);
        if (!result || typeof result !== 'object') return;
        if (result.status === 'loaded') {
            if (result.payload && typeof result.payload === 'object') {
                applyPayloadData(result.payload);
            }
            activePresetName.value = normalizeText(result.presetName) || targetPreset;
            activePresetIcon.value = normalizeText(result.icon);
            activePresetIconUrl.value = normalizeText(result.iconUrl) || toIconUrlFromName(activePresetIcon.value);
            setPresetStatus(`セット呼出: ${activePresetName.value || '完了'}`);
            await refreshPresetEntries({
                keepActive: true,
                activeName: activePresetName.value
            });
            return;
        }
        setPresetStatus('セット呼出に失敗しました', 'error');
    } catch (error) {
        console.error('skill-set modal preset quick load error:', error);
        setPresetStatus('セット呼出に失敗しました', 'error');
    } finally {
        isPresetSwitching.value = false;
    }
}

function openSkillSetModalVue(payload = {}) {
    if (resolver) {
        closeWith(null, { withGuard: false });
    }

    skillName.value = String(payload.skillName || '').trim();
    const nextMode = String(payload.mode || 'select').trim().toLowerCase();
    modalMode.value = nextMode === 'manage' || nextMode === 'send' ? nextMode : 'select';
    allowedSlots.value = Array.isArray(payload.allowedSlots) ? payload.allowedSlots : [];
    managedSlot.value = String(payload.managedSlot || '').trim();
    sendDiceCount.value = Math.max(1, Math.round(toFiniteNumber(payload?.diceCount) || 1));
    sendDiceMax.value = Math.max(2, Math.round(toFiniteNumber(payload?.diceMax) || 100));
    applyPayloadData(payload);
    if (typeof window.getFullPowerModeState === 'function') {
        isFullPowerOn.value = Boolean(window.getFullPowerModeState());
    }
    setPresetStatus('');
    presetEntries.value = [];
    activePresetName.value = '';
    activePresetIcon.value = '';
    activePresetIconUrl.value = '';
    isSavePresetModalOpen.value = false;
    savePresetInput.value = '';
    savePresetError.value = '';
    savePresetNeedsOverwrite.value = false;
    savePresetIconName.value = '';
    isRenamePresetModalOpen.value = false;
    renamePresetInput.value = '';
    renamePresetIconName.value = '';
    renamePresetError.value = '';
    renamePresetNeedsOverwrite.value = false;
    refreshPresetEntries({ keepActive: false }).catch(() => {});
    closeAttackMethodModal({ withGuard: false });
    const defaultSlot = String(payload.defaultSlot || '').trim();
    const preferredSlot = isManageMode.value
        ? (managedSlot.value || defaultSlot)
        : defaultSlot;
    selectedSlot.value = allowedSlots.value.includes(preferredSlot)
        ? preferredSlot
        : (allowedSlots.value[0] || '');
    isOpen.value = true;

    return new Promise((resolve) => {
        resolver = resolve;
    });
}

function submitSend() {
    const diceCount = Math.max(1, Math.round(toFiniteNumber(sendDiceCount.value) || 1));
    const diceMax = Math.max(2, Math.round(toFiniteNumber(sendDiceMax.value) || 100));
    if (diceCount < 1 || diceMax < 2) {
        window.alert('ダイス数は1以上、ダイス最大値は2以上を指定してください。');
        return;
    }
    closeWith({
        action: 'send',
        diceCount,
        diceMax
    });
}

onMounted(() => {
    window.openSkillSetModalVue = openSkillSetModalVue;
    window.closeSkillSetModalVue = cancel;
});

onBeforeUnmount(() => {
    if (window.openSkillSetModalVue === openSkillSetModalVue) {
        delete window.openSkillSetModalVue;
    }
    if (window.closeSkillSetModalVue === cancel) {
        delete window.closeSkillSetModalVue;
    }
    if (resolver) {
        resolver(null);
        resolver = null;
    }
});
</script>

<style scoped>
.skill-set-modal {
    position: fixed;
    inset: 0;
    z-index: 2300;
    display: none;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.55);
}

.skill-set-modal.is-open {
    display: flex;
}

.skill-set-modal-content {
    width: 720px;
    height: 1100px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: #f9fcff;
    border: 1px solid #c5d5e6;
    border-radius: 12px;
    box-shadow: 0 12px 34px rgba(17, 41, 69, 0.35);
    padding: 14px 14px 12px;
}

.skill-set-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
}

.skill-set-modal-header h3 {
    margin: 0;
    font-size: 22px;
    color: #18354f;
    min-width: 0;
}

.skill-set-header-right {
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
}

.skill-set-close {
    width: 34px;
    height: 34px;
    border: 1px solid #b8c9db;
    border-radius: 8px;
    background: #ffffff;
    color: #1f3550;
    font-size: 22px;
    cursor: pointer;
}

.skill-set-header-presets {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 36px;
}

.skill-set-header-presets-label {
    flex: 0 0 auto;
    font-size: 12px;
    font-weight: 800;
    color: #36536e;
}

.skill-set-header-presets-list {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    overflow-x: auto;
    overflow-y: hidden;
    padding-bottom: 2px;
}

.skill-set-header-preset-btn {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 28px;
    border: 1px solid #b9c9dc;
    border-radius: 999px;
    background: #ffffff;
    color: #2c4863;
    font-size: 12px;
    font-weight: 700;
    padding: 0 10px;
    cursor: pointer;
    white-space: nowrap;
}

.skill-set-header-preset-icon {
    width: 35px;
    height: 30px;
    object-fit: contain;
    flex: 0 0 auto;
}

.skill-set-header-preset-btn:hover {
    background: #edf5ff;
    border-color: #91aed0;
}

.skill-set-header-preset-btn.is-active {
    background: #2a6fa8;
    border-color: #1f5988;
    color: #ffffff;
}

.skill-set-header-preset-btn:disabled {
    opacity: 0.6;
    cursor: default;
}

.skill-set-header-presets-empty {
    flex: 0 0 auto;
    font-size: 12px;
    font-weight: 700;
    color: #6a8096;
}

.skill-set-target {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #274766;
}

.skill-set-top-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 8px;
    align-items: stretch;
}

.skill-set-resource-card {
    border: 1px solid #d5e0ec;
    border-radius: 9px;
    background: #ffffff;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.skill-set-resource-card.compact {
    padding: 6px 8px;
    gap: 5px;
}

.skill-set-control-card {
    border: 1px solid #d5e0ec;
    border-radius: 9px;
    background: #ffffff;
    padding: 6px 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.resource-card-header {
    display: flex;
    align-items: baseline;
    gap: 8px;
}

.resource-card-title {
    font-size: 12px;
    font-weight: 800;
    color: #36536e;
}

.resource-card-name {
    font-size: 15px;
    font-weight: 800;
    color: #18354f;
    flex: 1 1 auto;
    min-width: 0;
}

.resource-card-adjust-btn {
    flex: 0 0 auto;
    min-width: 48px;
    height: 24px;
    border: 1px solid #8fa8c0;
    border-radius: 6px;
    background: #ffffff;
    color: #21405d;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
}

.resource-card-adjust-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
}

.resource-card-adjust-btn:not(:disabled):hover {
    background: #e8f2fc;
}

.resource-card-list {
    display: grid;
    gap: 4px;
}

.resource-card-item {
    display: grid;
    gap: 4px;
}

.resource-item-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #1f3550;
    font-weight: 700;
}

.resource-item-label {
    width: 24px;
    font-weight: 800;
}

.resource-item-next {
    color: #3c546c;
    font-weight: 800;
}

.resource-item-cost {
    color: #b92020;
    font-weight: 800;
}

.resource-item-bar {
    display: flex;
    width: 100%;
    height: 9px;
    border-radius: 999px;
    overflow: hidden;
    background: #7a8089;
}

.resource-bar-segment {
    height: 100%;
    flex: 0 0 auto;
}

.resource-bar-safe.is-hp {
    background: linear-gradient(180deg, #7ad66f 0%, #56b84a 100%);
}

.resource-bar-safe.is-mp {
    background: linear-gradient(180deg, #58a8f6 0%, #2e83db 100%);
}

.resource-bar-safe.is-st {
    background: linear-gradient(180deg, #e7d35a 0%, #c9ae20 100%);
}

.resource-bar-planned {
    background: linear-gradient(180deg, #ff7a7a 0%, #d53838 100%);
}

.skill-set-send-config {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 6px;
    border: 1px solid #d5e0ec;
    border-radius: 8px;
    background: #f8fbff;
    padding: 6px 8px;
}

.send-config-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.send-config-item label {
    font-size: 12px;
    font-weight: 700;
    color: #36536e;
}

.send-config-item input {
    width: 100%;
    height: 30px;
    border: 1px solid #b9c9dc;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 700;
    text-align: center;
    color: #1f2a37;
    background: #ffffff;
}

.skill-set-attack-method-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    border: 1px solid #d5e0ec;
    border-radius: 8px;
    background: #f8fbff;
    padding: 6px 8px;
}

.skill-set-attack-method-controls {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0;
    min-width: 0;
    flex: 1;
}

.skill-set-attack-method-label {
    font-size: 13px;
    font-weight: 800;
    color: #1f4464;
}

.skill-set-attack-method-btn {
    min-width: 0;
    max-width: 100%;
    flex: 1;
    height: 32px;
    border: 1px solid #7da1c4;
    border-radius: 8px;
    background: linear-gradient(180deg, #eef5fc 0%, #dce9f6 100%);
    color: #163b5a;
    font-size: 14px;
    font-weight: 700;
    text-align: left;
    padding: 0 10px;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.skill-set-attack-method-btn:disabled {
    opacity: 0.6;
    cursor: default;
}

.skill-set-full-power-btn {
    min-width: 104px;
    height: 32px;
    border: 1px solid #49657f;
    border-radius: 9px;
    background: linear-gradient(180deg, #3c556d 0%, #2d4358 100%);
    color: #f3f7fb;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.02em;
    padding: 0 10px;
    cursor: pointer;
    white-space: nowrap;
    transition: transform 0.12s ease, filter 0.18s ease, box-shadow 0.18s ease;
}

.skill-set-full-power-row {
    display: flex;
}

.skill-set-full-power-row .skill-set-full-power-btn {
    width: 100%;
}

.skill-set-preset-row {
    display: grid;
    grid-template-columns: 110px minmax(0, 1fr) 90px;
    align-items: center;
    gap: 6px;
}

.skill-set-preset-btn {
    width: 100%;
    height: 32px;
    border: 1px solid #7da1c4;
    border-radius: 8px;
    background: linear-gradient(180deg, #eef5fc 0%, #dce9f6 100%);
    color: #163b5a;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
}

.skill-set-preset-rename-btn {
    width: 100%;
    height: 32px;
    border: 1px solid #7da1c4;
    border-radius: 8px;
    background: linear-gradient(180deg, #eef5fc 0%, #dce9f6 100%);
    color: #163b5a;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
}

.skill-set-current-preset {
    min-width: 0;
    height: 32px;
    display: flex;
    align-items: center;
    border: 1px solid #d5e0ec;
    border-radius: 8px;
    background: #f8fbff;
    color: #274766;
    font-size: 12px;
    font-weight: 700;
    padding: 0 8px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    gap: 6px;
}

.skill-set-current-preset-icon {
    width: 18px;
    height: 18px;
    object-fit: contain;
    flex: 0 0 auto;
}

.skill-set-preset-btn:disabled,
.skill-set-preset-rename-btn:disabled {
    opacity: 0.6;
    cursor: default;
}

.skill-set-preset-status {
    margin: 0;
    font-size: 12px;
    font-weight: 700;
    color: #2f5f89;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 320px;
}

.skill-set-preset-status.is-error {
    color: #9a1f1f;
}

.skill-set-full-power-btn.is-on {
    border-color: #8d5f20;
    background: linear-gradient(180deg, #f1aa3e 0%, #d98021 100%);
    color: #2f1400;
    box-shadow: 0 4px 14px rgba(210, 128, 32, 0.38);
}

.skill-set-full-power-btn:disabled {
    opacity: 0.6;
    cursor: default;
}

.skill-set-full-power-btn:hover {
    filter: brightness(1.06);
    box-shadow: 0 4px 10px rgba(34, 61, 84, 0.3);
}

.skill-set-full-power-btn:active {
    transform: translateY(1px);
}

.skill-set-table-wrap {
    min-height: 0;
    height: 550px;
    overflow: auto;
    border: 1px solid #d5e0ec;
    border-radius: 10px;
    background: #ffffff;
}

.skill-set-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 16px;
}

.skill-set-table thead th {
    position: sticky;
    top: 0;
    z-index: 1;
    background: linear-gradient(180deg, #295f89 0%, #214e71 100%);
    color: #ffffff;
    font-weight: 800;
    padding: 8px 6px;
    border-right: 1px solid rgba(255, 255, 255, 0.2);
}

.skill-set-table th:last-child {
    border-right: none;
}

.skill-set-table td {
    height: 34px;
    padding: 8px 6px;
    border-bottom: 1px solid #e5ecf5;
    border-right: 1px solid #edf2f7;
    text-align: center;
    color: #1f2937;
}
.skill-set-table td.has-breakdown-tooltip {
    cursor: help;
}

.has-breakdown-tooltip {
    cursor: help;
}

.skill-set-table td:last-child {
    border-right: none;
}



.skill-set-table td:nth-child(1),
.skill-set-table th:nth-child(1),
.skill-set-table td:nth-child(3),
.skill-set-table th:nth-child(3),
.skill-set-table td:nth-child(4),
.skill-set-table th:nth-child(4),
.skill-set-table td:nth-child(5),
.skill-set-table th:nth-child(5),
.skill-set-table td:nth-child(6),
.skill-set-table th:nth-child(6) {
    /* 5個150px */
    width: 30px;
}
.skill-set-table td:nth-child(2),
.skill-set-table th:nth-child(2) {
    text-align: left;
    width: 150px;
}
.skill-set-table td:nth-child(7),
.skill-set-table th:nth-child(7) {
    width: 200px;
    text-align: left;
}

.skill-set-table .description-cell {
    position: relative;
    white-space: normal;
    word-break: break-word;
    line-height: 1.35;
}

.description-text {
    display: block;
    margin-top: 5px;
    margin-left: 10px;
}

.condition-passive-mark {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1;
    min-width: 34px;
    height: 18px;
    border: 1px solid #a17624;
    border-radius: 999px;
    background: #fff6df;
    color: #8a5a0a;
    font-size: 12px;
    font-weight: 700;
    line-height: 1;
    padding: 0;
    cursor: pointer;
}

.condition-passive-mark:hover {
    background: #ffefc4;
}

.skill-set-table ruby {
    ruby-position: over;
}

.skill-set-table rt {
    font-size: 12px;
    color: #5b7085;
}

.skill-set-table tbody tr.is-allowed {
    cursor: pointer;
}

.skill-set-table tbody tr.is-disabled {
    opacity: 0.56;
    background: #f3f6fa;
}

.skill-set-table tbody tr.is-allowed:hover td {
    background: #eaf4ff;
}

.skill-set-table tbody tr.is-selected td {
    background: #d9ecff;
    box-shadow: inset 0 0 0 1px #6ea7d8;
    font-weight: 700;
}

.skill-set-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}

.skill-set-totals-list {
    display: grid;
    gap: 10px;
}

.skill-set-totals {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    padding: 8px 10px;
    border: 1px solid #d5e0ec;
    border-radius: 8px;
    background: #ffffff;
    color: #21364e;
    font-weight: 700;
    font-size: 18px;
}

.skill-set-totals.skill-set-totals-m {
    background-image:
        linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.9)),
        url('/images/攻撃手段魔法.webp');
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
}

.skill-set-totals .total-col {
    min-width: 0;
}

.skill-set-totals .total-summary-header {
    grid-column: 1 / -1;
    padding-bottom: 6px;
    margin-bottom: 2px;
    border-bottom: 1px solid #dbe6f2;
}

.skill-set-totals .total-label {
    color: #0f4a79;
    font-weight: 800;
    margin-bottom: 2px;
    font-size: 20px;
}

.skill-set-totals .total-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    white-space: nowrap;
    line-height: 1.25;
}

.skill-set-totals .total-key {
    color: #20466c;
    font-size: 17px;
}

.skill-set-totals .total-value {
    color: #0c2f51;
    font-weight: 800;
    font-size: 20px;
}

.btn-cancel {
    min-width: 110px;
    height: 36px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 800;
    cursor: pointer;
    border: 1px solid transparent;
}

.btn-send {
    min-width: 120px;
    height: 36px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 800;
    cursor: pointer;
    border: 1px solid #1e5f95;
    color: #ffffff;
    background: linear-gradient(180deg, #2a8ad8 0%, #1f6dad 100%);
}

.btn-clear {
    min-width: 110px;
    height: 36px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 800;
    cursor: pointer;
    border: 1px solid #cc7a6d;
    background: #fff3f1;
    color: #9f3c2e;
}

.btn-clear:disabled {
    opacity: 0.55;
    cursor: default;
}

.btn-cancel {
    background: #ffffff;
    color: #2f4358;
    border-color: #b8c7da;
}

.attack-method-modal {
    position: absolute;
    inset: 0;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.38);
}

.attack-method-modal-content {
    width: min(92%, 520px);
    max-height: 70%;
    display: flex;
    flex-direction: column;
    border: 1px solid #bfcfe0;
    border-radius: 10px;
    background: #f9fcff;
    box-shadow: 0 12px 30px rgba(10, 33, 56, 0.35);
}

.attack-method-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    border-bottom: 1px solid #d7e2ef;
    padding: 10px 12px;
}

.attack-method-modal-header h4 {
    margin: 0;
    font-size: 18px;
    color: #1f3e5b;
}

.attack-method-close {
    width: 30px;
    height: 30px;
    border: 1px solid #c3d0df;
    border-radius: 7px;
    background: #ffffff;
    color: #23445f;
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
}

.attack-method-modal-list {
    overflow: auto;
    padding: 8px;
    display: grid;
    grid-template-columns: 1fr;
    gap: 6px;
}

.attack-method-option {
    width: 100%;
    min-height: 36px;
    border: 1px solid #c1d0e1;
    border-radius: 8px;
    background: #ffffff;
    color: #173955;
    font-size: 15px;
    font-weight: 700;
    text-align: left;
    padding: 8px 10px;
    cursor: pointer;
}

.attack-method-option.is-selected {
    border-color: #5f8eb8;
    background: #e9f3fd;
    box-shadow: inset 0 0 0 1px #8cb4d6;
}

.preset-save-modal {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.42);
}

.preset-save-modal-content {
    width: min(94%, 620px);
    display: flex;
    flex-direction: column;
    border: 1px solid #bfcfe0;
    border-radius: 10px;
    background: #f9fcff;
    box-shadow: 0 12px 30px rgba(10, 33, 56, 0.35);
}

.preset-save-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    border-bottom: 1px solid #d7e2ef;
    padding: 10px 12px;
}

.preset-save-modal-header h4 {
    margin: 0;
    font-size: 18px;
    color: #1f3e5b;
}

.preset-save-close {
    width: 30px;
    height: 30px;
    border: 1px solid #c3d0df;
    border-radius: 7px;
    background: #ffffff;
    color: #23445f;
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
}

.preset-save-modal-body {
    display: grid;
    gap: 8px;
    padding: 12px;
}

.preset-save-label,
.preset-save-icons-label {
    font-size: 13px;
    font-weight: 700;
    color: #1f4464;
}

.preset-save-input {
    width: 100%;
    height: 34px;
    border: 1px solid #b9c9dc;
    border-radius: 8px;
    background: #ffffff;
    color: #20384d;
    font-size: 14px;
    padding: 0 10px;
}

.preset-save-icons {
    display: grid;
    gap: 6px;
}

.preset-save-icon-grid {
    max-height: 230px;
    overflow: auto;
    border: 1px solid #d7e2ef;
    border-radius: 8px;
    background: #ffffff;
    padding: 8px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(52px, 1fr));
    gap: 6px;
}

.preset-save-icon-btn {
    width: 100%;
    min-height: 44px;
    border: 1px solid #c1d0e1;
    border-radius: 8px;
    background: #ffffff;
    color: #173955;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px;
    cursor: pointer;
}

.preset-save-icon-btn.is-none {
    font-size: 11px;
    font-weight: 700;
    padding: 0 4px;
}

.preset-save-icon-btn.is-selected {
    border-color: #5f8eb8;
    background: #e9f3fd;
    box-shadow: inset 0 0 0 1px #8cb4d6;
}

.preset-save-icon-image {
    width: 26px;
    height: 26px;
    object-fit: contain;
}

.preset-save-error {
    margin: 0;
    min-height: 16px;
    font-size: 12px;
    font-weight: 700;
    color: #9a1f1f;
}

.preset-save-modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 0 12px 12px;
}

.preset-save-cancel,
.preset-save-submit,
.preset-save-overwrite {
    min-width: 100px;
    height: 32px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
}

.preset-save-cancel {
    border: 1px solid #b8c7da;
    background: #ffffff;
    color: #2f4358;
}

.preset-save-submit {
    border: 1px solid #7da1c4;
    background: linear-gradient(180deg, #eef5fc 0%, #dce9f6 100%);
    color: #163b5a;
}

.preset-save-overwrite {
    border: 1px solid #c27a28;
    background: linear-gradient(180deg, #fff3de 0%, #f9dfb2 100%);
    color: #7c4e0c;
}

.preset-save-cancel:disabled,
.preset-save-submit:disabled,
.preset-save-overwrite:disabled,
.preset-save-close:disabled {
    opacity: 0.6;
    cursor: default;
}

.preset-rename-modal {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.42);
}

.preset-rename-modal-content {
    width: min(92%, 460px);
    display: flex;
    flex-direction: column;
    border: 1px solid #bfcfe0;
    border-radius: 10px;
    background: #f9fcff;
    box-shadow: 0 12px 30px rgba(10, 33, 56, 0.35);
}

.preset-rename-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    border-bottom: 1px solid #d7e2ef;
    padding: 10px 12px;
}

.preset-rename-modal-header h4 {
    margin: 0;
    font-size: 18px;
    color: #1f3e5b;
}

.preset-rename-close {
    width: 30px;
    height: 30px;
    border: 1px solid #c3d0df;
    border-radius: 7px;
    background: #ffffff;
    color: #23445f;
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
}

.preset-rename-modal-body {
    display: grid;
    gap: 8px;
    padding: 12px;
}

.preset-rename-current {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    color: #36536e;
}

.preset-rename-label {
    font-size: 13px;
    font-weight: 700;
    color: #1f4464;
}

.preset-rename-input {
    width: 100%;
    height: 34px;
    border: 1px solid #b9c9dc;
    border-radius: 8px;
    background: #ffffff;
    color: #20384d;
    font-size: 14px;
    padding: 0 10px;
}

.preset-rename-error {
    margin: 0;
    min-height: 16px;
    font-size: 12px;
    font-weight: 700;
    color: #9a1f1f;
}

.preset-rename-modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 0 12px 12px;
}

.preset-rename-cancel,
.preset-rename-submit,
.preset-rename-overwrite {
    min-width: 100px;
    height: 32px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
}

.preset-rename-cancel {
    border: 1px solid #b8c7da;
    background: #ffffff;
    color: #2f4358;
}

.preset-rename-submit {
    border: 1px solid #7da1c4;
    background: linear-gradient(180deg, #eef5fc 0%, #dce9f6 100%);
    color: #163b5a;
}

.preset-rename-overwrite {
    border: 1px solid #c27a28;
    background: linear-gradient(180deg, #fff3de 0%, #f9dfb2 100%);
    color: #7c4e0c;
}

.preset-rename-cancel:disabled,
.preset-rename-submit:disabled,
.preset-rename-overwrite:disabled,
.preset-rename-close:disabled {
    opacity: 0.6;
    cursor: default;
}

</style>
