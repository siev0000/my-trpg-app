<template>
    <div
        class="passive-list-overlay"
        :class="{ 'is-open': visible }"
        :aria-hidden="!visible"
        @click="closeConditionPassiveModalVue"
    >
        <div class="passive-list-dialog" role="dialog" aria-modal="true" @click.stop>
            <div class="passive-list-header">
                <h4>{{ title }}</h4>
                <button type="button" class="passive-list-close" @click="closeConditionPassiveModalVue">×</button>
            </div>
            <ul class="passive-list-body">
                <li
                    v-for="(item, index) in items"
                    :key="`${item.name}-${index}`"
                    class="passive-list-item"
                >
                    <div class="passive-list-name">{{ item.name || '名称なし' }}</div>
                    <div class="passive-list-meta">
                        <span v-if="item.attackMethod">攻撃手段: {{ item.attackMethod }}</span>
                        <span v-if="item.skillCondition">条件: {{ item.skillCondition }}</span>
                        <span v-if="item.attributeCondition">条件属性: {{ item.attributeCondition }}</span>
                    </div>
                    <div v-if="item.description" class="passive-list-description">{{ item.description }}</div>
                </li>
            </ul>
        </div>
    </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { triggerPostModalInteractionGuard } from '../utils/modalInteractionGuard.js';

const visible = ref(false);
const title = ref('');
const items = ref([]);

function normalizeItems(inputItems) {
    const list = Array.isArray(inputItems) ? inputItems : [];
    return list.map((item) => ({
        name: String(item?.name || '').trim(),
        attackMethod: String(item?.attackMethod || '').trim(),
        skillCondition: String(item?.skillCondition || '').trim(),
        attributeCondition: String(item?.attributeCondition || '').trim(),
        description: String(item?.description || '').trim()
    }));
}

function openConditionPassiveModalVue(payload = {}) {
    title.value = String(payload?.title || '一致Pスキル').trim() || '一致Pスキル';
    items.value = normalizeItems(payload?.items);
    visible.value = true;
}

function closeConditionPassiveModalVue() {
    const wasOpen = visible.value;
    visible.value = false;
    title.value = '';
    items.value = [];
    if (wasOpen) {
        triggerPostModalInteractionGuard(1500);
    }
}

onMounted(() => {
    window.openConditionPassiveModalVue = openConditionPassiveModalVue;
    window.closeConditionPassiveModalVue = closeConditionPassiveModalVue;
});

onBeforeUnmount(() => {
    if (window.openConditionPassiveModalVue === openConditionPassiveModalVue) {
        delete window.openConditionPassiveModalVue;
    }
    if (window.closeConditionPassiveModalVue === closeConditionPassiveModalVue) {
        delete window.closeConditionPassiveModalVue;
    }
});
</script>

<style scoped>
.passive-list-overlay {
    position: fixed;
    inset: 0;
    z-index: 2400;
    display: none;
    align-items: center;
    justify-content: center;
    background: rgba(8, 16, 28, 0.45);
}

.passive-list-overlay.is-open {
    display: flex;
}

.passive-list-dialog {
    width: 660px;
    max-height: 1180px;
    display: flex;
    flex-direction: column;
    border: 1px solid #d1dceb;
    border-radius: 10px;
    background: #fdfefe;
    box-shadow: 0 12px 28px rgba(17, 41, 69, 0.35);
    overflow: hidden;
}

.passive-list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 12px;
    border-bottom: 1px solid #dfebf7;
    background: linear-gradient(180deg, #295f89 0%, #214e71 100%);
}

.passive-list-header h4 {
    margin: 0;
    color: #ffffff;
    font-size: 16px;
}

.passive-list-close {
    width: 28px;
    height: 28px;
    border: 1px solid rgba(255, 255, 255, 0.35);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.15);
    color: #ffffff;
    font-size: 22px;
    cursor: pointer;
}

.passive-list-body {
    margin: 0;
    padding: 10px;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow: auto;
}

.passive-list-item {
    border: 1px solid #d8e4f0;
    border-radius: 8px;
    background: #ffffff;
    padding: 8px 10px;
}

.passive-list-name {
    font-size: 19px;
    font-weight: 800;
    color: #1f3550;
}

.passive-list-meta {
    margin-top: 4px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 17px;
    color: #2d4a66;
}

.passive-list-description {
    margin-top: 6px;
    font-size: 17px;
    color: #334155;
    line-height: 1.45;
}
</style>
