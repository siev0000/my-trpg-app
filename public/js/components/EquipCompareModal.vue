<template>
    <div
        class="equip-compare-overlay"
        :class="{ 'is-open': isOpen }"
        :aria-hidden="!isOpen"
        @click="handleBackdropClick"
    >
        <div class="equip-compare-dialog" role="dialog" aria-modal="true" @click.stop>
            <div class="equip-compare-header">
                <h3>{{ modalTitle }}</h3>
                <button type="button" class="equip-compare-close" @click="cancel">×</button>
            </div>

            <section class="equip-compare-incoming">
                <div class="equip-compare-label">装備するアイテム</div>
                <div class="equip-compare-card incoming">
                    <div class="equip-compare-card-head">
                        <div class="equip-compare-name">{{ incoming.name }}</div>
                        <div class="equip-compare-type" v-if="incoming.type">{{ incoming.type }}</div>
                    </div>
                    <div class="equip-compare-lines-scroll incoming-lines-scroll">
                        <div class="equip-compare-lines">
                            <div class="equip-compare-line" v-for="(line, index) in incoming.lines" :key="`incoming-${index}`">
                                <span class="line-label">{{ line.label }}</span>
                                <span class="line-value">{{ line.value }}</span>
                                <span class="line-detail" v-if="line.detail">｜{{ line.detail }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section class="equip-compare-candidates">
                <div class="equip-compare-label">入れ替え先</div>
                <div class="equip-compare-grid">
                    <article
                        v-for="candidate in candidates"
                        :key="candidate.slot"
                        class="equip-compare-card candidate"
                    >
                        <div class="equip-compare-card-head">
                            <div class="equip-compare-slot">{{ candidate.slot }}</div>
                            <div class="equip-compare-name">{{ candidate.item.name }}</div>
                            <div class="equip-compare-type" v-if="candidate.item.type">{{ candidate.item.type }}</div>
                        </div>
                        <div class="equip-compare-lines-scroll">
                            <div class="equip-compare-lines">
                                <div class="equip-compare-line" v-for="(line, index) in candidate.item.lines" :key="`${candidate.slot}-${index}`">
                                    <span class="line-label">{{ line.label }}</span>
                                    <span class="line-value">{{ line.value }}</span>
                                    <span class="line-detail" v-if="line.detail">｜{{ line.detail }}</span>
                                </div>
                            </div>
                        </div>
                        <button
                            type="button"
                            class="equip-compare-select"
                            @click="selectSlot(candidate.slot)"
                        >
                            この枠に装備
                        </button>
                    </article>
                </div>
            </section>

            <!-- <div class="equip-compare-actions">
                <button type="button" class="equip-compare-cancel" @click="cancel">キャンセル</button>
            </div> -->
        </div>
    </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { triggerPostModalInteractionGuard } from '../utils/modalInteractionGuard.js';

const isOpen = ref(false);
const modalTitle = ref('装備先を選択');
const incoming = ref({
    name: '空き',
    type: '',
    lines: []
});
const candidates = ref([]);
let resolver = null;

function normalizeLine(line = {}) {
    const label = String(line?.label || '').trim();
    const value = String(line?.value || '').trim();
    const detail = String(line?.detail || '').trim();
    if (!label || !value) return null;
    return { label, value, detail };
}

function normalizeItem(item = {}) {
    const parsedLines = Array.isArray(item?.lines)
        ? item.lines.map((line) => normalizeLine(line)).filter(Boolean)
        : [];
    const lines = parsedLines.length > 0
        ? parsedLines
        : [{ label: '上昇', value: 'なし', detail: '' }];

    return {
        name: String(item?.name || '空き').trim() || '空き',
        type: String(item?.type || '').trim(),
        lines
    };
}

function normalizeCandidates(list = []) {
    return (Array.isArray(list) ? list : [])
        .map((entry) => ({
            slot: String(entry?.slot || '').trim(),
            item: normalizeItem(entry?.item || {})
        }))
        .filter((entry) => entry.slot);
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

function selectSlot(slot) {
    closeWith(slot);
}

function handleBackdropClick() {
    cancel();
}

function openEquipCompareModalVue(payload = {}) {
    if (resolver) {
        closeWith(null, { withGuard: false });
    }

    modalTitle.value = String(payload?.title || '装備先を選択').trim() || '装備先を選択';
    incoming.value = normalizeItem(payload?.incoming || {});
    candidates.value = normalizeCandidates(payload?.candidates || []);
    isOpen.value = true;

    return new Promise((resolve) => {
        resolver = resolve;
    });
}

onMounted(() => {
    window.openEquipCompareModalVue = openEquipCompareModalVue;
    window.closeEquipCompareModalVue = cancel;
});

onBeforeUnmount(() => {
    if (window.openEquipCompareModalVue === openEquipCompareModalVue) {
        delete window.openEquipCompareModalVue;
    }
    if (window.closeEquipCompareModalVue === cancel) {
        delete window.closeEquipCompareModalVue;
    }
    if (resolver) {
        resolver(null);
        resolver = null;
    }
});
</script>

<style scoped>
.equip-compare-overlay {
    position: fixed;
    inset: 0;
    z-index: 3000;
    display: none;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.58);
}

.equip-compare-overlay.is-open {
    display: flex;
}

.equip-compare-dialog {
    --compare-font-scale: 1.35;
    width: 680px;
    height: 1020px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    border-radius: 12px;
    border: 2px solid #d8b264;
    background: #2f2f2f;
    box-shadow: 0 14px 30px rgba(0, 0, 0, 0.45);
    overflow: hidden;
    padding: 14px;
}

.equip-compare-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 6px;
    border-bottom: 1px solid #4a4a4a;
}

.equip-compare-header h3 {
    margin: 0;
    font-size: calc(20px * var(--compare-font-scale));
    color: #f4d48f;
}

.equip-compare-close {
    width: 32px;
    height: 32px;
    border: 1px solid #a08a56;
    border-radius: 8px;
    background: #494949;
    color: #f4d48f;
    font-size: calc(20px * var(--compare-font-scale));
    cursor: pointer;
}

.equip-compare-label {
    font-size: calc(14px * var(--compare-font-scale));
    font-weight: 800;
    color: #e9cf95;
    margin-bottom: 4px;
}

.equip-compare-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
}

.equip-compare-card {
    border: 1px solid #555;
    border-radius: 10px;
    background: #3a3a3a;
    padding: 10px;
    display: flex;
    flex-direction: column;
    min-height: 0;
}

.equip-compare-card.incoming {
    border-color: #9d8650;
    background: #404040;
}

.equip-compare-card.incoming {
    height: 385px;
}

.equip-compare-card.candidate{
    height: 480px;
}

.equip-compare-card-head {
    flex: 0 0 auto;
}

.equip-compare-slot {
    display: inline-block;
    margin-bottom: 4px;
    padding: 2px 8px;
    border-radius: 999px;
    border: 1px solid #8d7a49;
    background: #2f2f2f;
    color: #f0ce87;
    font-size: calc(12px * var(--compare-font-scale));
    font-weight: 800;
}

.equip-compare-name {
    font-size: calc(17px * var(--compare-font-scale));
    font-weight: 800;
    color: #f1c35f;
    line-height: 1.3;
}

.equip-compare-type {
    margin-top: 2px;
    font-size: calc(12px * var(--compare-font-scale));
    color: #d8d8d8;
}

.equip-compare-lines {
    display: grid;
    gap: 4px;
}

.equip-compare-lines-scroll {
    margin-top: 8px;
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
    padding-right: 2px;
    scrollbar-width: thin;
    scrollbar-color: #b99656 #2b2b2b;
}

.equip-compare-line {
    font-size: calc(13px * var(--compare-font-scale));
    color: #e2e2e2;
    line-height: 1.3;
}

.line-label {
    font-weight: 800;
    color: #efd08a;
    margin-right: 6px;
}

.line-value {
    font-weight: 700;
    color: #efb15f;
}

.line-detail {
    margin-left: 6px;
    color: #d6d6d6;
}

.equip-compare-select {
    margin-top: 10px;
    width: 100%;
    height: 34px;
    border: 1px solid #78925a;
    border-radius: 8px;
    background: #6e9360;
    color: #edf7e8;
    font-size: calc(14px * var(--compare-font-scale));
    font-weight: 800;
    cursor: pointer;
    flex: 0 0 auto;
}

.equip-compare-select:hover {
    background: #7fa66f;
}

.equip-compare-actions {
    display: flex;
    justify-content: flex-end;
}

.equip-compare-cancel {
    min-width: 110px;
    height: 36px;
    border: 1px solid #a08a56;
    border-radius: 8px;
    background: #494949;
    color: #f4d48f;
    font-size: calc(14px * var(--compare-font-scale));
    font-weight: 700;
    cursor: pointer;
}

.equip-compare-lines-scroll::-webkit-scrollbar {
    width: 10px;
}

.equip-compare-lines-scroll::-webkit-scrollbar-track {
    background: #2b2b2b;
    border-radius: 999px;
}

.equip-compare-lines-scroll::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #d1b476 0%, #b99656 100%);
    border: 2px solid #2b2b2b;
    border-radius: 999px;
}

.equip-compare-lines-scroll::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, #e4c98e 0%, #c7a765 100%);
}
</style>
