<template>
    <div
        class="turn-advance-modal"
        :class="{ 'is-open': isOpen }"
        :aria-hidden="!isOpen"
        @click="cancel"
    >
        <div
            class="turn-advance-modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="turn-advance-modal-title"
            @click.stop
        >
            <div class="turn-advance-header">
                <h3 id="turn-advance-modal-title">ターン操作</h3>
                <button type="button" class="turn-advance-close" aria-label="閉じる" @click="cancel">×</button>
            </div>

            <p class="turn-advance-target">{{ targetName || "未選択" }}</p>
            <p class="turn-advance-current">現在ターン: {{ currentTurn }}</p>

            <label class="turn-advance-field" for="turn-advance-steps">
                <span class="turn-advance-label">経過ターン数</span>
                <input
                    id="turn-advance-steps"
                    v-model="elapsedTurns"
                    class="turn-advance-input"
                    type="number"
                    min="1"
                    step="1"
                    inputmode="numeric"
                    @keydown.enter.prevent="submitAdvance"
                >
            </label>

            <p class="turn-advance-preview">適用後ターン: {{ previewTurn }}</p>

            <div class="turn-advance-actions">
                <button type="button" class="turn-advance-primary" @click="submitAdvance">進める</button>
                <button type="button" class="turn-advance-warning" @click="submitReset">ターンを1にリセット</button>
                <button type="button" class="turn-advance-secondary" @click="cancel">キャンセル</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { triggerPostModalInteractionGuard } from "../utils/modalInteractionGuard.js";

const isOpen = ref(false);
const targetName = ref("");
const currentTurn = ref(1);
const elapsedTurns = ref("1");

let resolver = null;

function toPositiveInteger(value, fallback = 1) {
    const num = Math.round(Number(value));
    if (!Number.isFinite(num) || num <= 0) return fallback;
    return num;
}

const previewTurn = computed(() => currentTurn.value + toPositiveInteger(elapsedTurns.value, 1));

function closeWith(result = null, withGuard = true) {
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

function submitAdvance() {
    closeWith({
        action: "advance",
        characterName: targetName.value,
        elapsedTurns: toPositiveInteger(elapsedTurns.value, 1)
    }, true);
}

function submitReset() {
    closeWith({
        action: "reset",
        characterName: targetName.value,
        turn: 1
    }, true);
}

function openTurnAdvanceModalVue(payload = {}) {
    if (resolver) {
        closeWith(null, false);
    }

    targetName.value = String(payload?.characterName || payload?.name || "").trim();
    currentTurn.value = toPositiveInteger(payload?.currentTurn, 1);
    elapsedTurns.value = String(toPositiveInteger(payload?.defaultElapsedTurns, 1));
    isOpen.value = true;

    return new Promise((resolve) => {
        resolver = resolve;
    });
}

onMounted(() => {
    window.openTurnAdvanceModalVue = openTurnAdvanceModalVue;
    window.closeTurnAdvanceModalVue = cancel;
});

onBeforeUnmount(() => {
    if (window.openTurnAdvanceModalVue === openTurnAdvanceModalVue) {
        delete window.openTurnAdvanceModalVue;
    }
    if (window.closeTurnAdvanceModalVue === cancel) {
        delete window.closeTurnAdvanceModalVue;
    }
    if (resolver) {
        resolver(null);
        resolver = null;
    }
});
</script>

<style scoped>
.turn-advance-modal {
    position: fixed;
    inset: 0;
    z-index: 2550;
    display: none;
    align-items: center;
    justify-content: center;
    background: rgba(9, 14, 23, 0.58);
}

.turn-advance-modal.is-open {
    display: flex;
}

.turn-advance-modal-content {
    width: 420px;
    max-width: calc(100vw - 24px);
    background: linear-gradient(180deg, #f8fbff 0%, #edf4fb 100%);
    border: 1px solid #bfd0e2;
    border-radius: 14px;
    box-shadow: 0 14px 32px rgba(10, 25, 43, 0.32);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.turn-advance-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.turn-advance-header h3 {
    margin: 0;
    font-size: 23px;
    color: #18314a;
}

.turn-advance-close {
    width: 34px;
    height: 34px;
    border: 1px solid #c3d3e5;
    border-radius: 8px;
    background: #ffffff;
    color: #26445f;
    font-size: 22px;
    line-height: 1;
    cursor: pointer;
}

.turn-advance-target,
.turn-advance-current,
.turn-advance-preview {
    margin: 0;
    color: #23415c;
    font-size: 16px;
}

.turn-advance-target {
    font-weight: 700;
}

.turn-advance-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.turn-advance-label {
    color: #2b4a66;
    font-size: 14px;
    font-weight: 700;
}

.turn-advance-input {
    width: 100%;
    height: 42px;
    border: 1px solid #b6cade;
    border-radius: 10px;
    background: #ffffff;
    color: #173149;
    font-size: 18px;
    padding: 0 12px;
    box-sizing: border-box;
}

.turn-advance-actions {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
}

.turn-advance-primary,
.turn-advance-warning,
.turn-advance-secondary {
    height: 42px;
    border: none;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
}

.turn-advance-primary {
    background: #2a6fb1;
    color: #ffffff;
}

.turn-advance-warning {
    background: #f3c871;
    color: #513609;
}

.turn-advance-secondary {
    background: #d8e3ef;
    color: #27425d;
}
</style>