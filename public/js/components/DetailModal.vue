<template>
    <div
        id="item-detail-modal"
        class="item-detail-modal"
        :class="{ 'is-open': isOpen }"
        :aria-hidden="!isOpen"
        @click="handleBackdropClick"
    >
        <div
            class="item-detail-modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="item-detail-modal-title"
            @click.stop
        >
            <div class="item-detail-modal-header">
                <h3 id="item-detail-modal-title" class="item-detail-modal-title">{{ titleText }}</h3>
                <div class="item-detail-header-right">
                    <span class="item-detail-modal-progress" v-if="isItemType && entries.length > 0">
                        {{ currentIndex + 1 }}/{{ entries.length }}
                    </span>
                    <button type="button" class="item-detail-modal-close" aria-label="閉じる" @click="closeModal">×</button>
                </div>
            </div>

            <div class="item-detail-modal-toolbar">
                <div class="item-detail-toolbar-left">
                    <button
                        type="button"
                        class="item-equip-button item-equip-button--toolbar"
                        :disabled="!canEquip"
                        @click="handleEquip"
                    >
                        装備する
                    </button>
                    <button
                        type="button"
                        class="item-transfer-button item-transfer-button--toolbar"
                        v-if="canMoveToInventory"
                        @click="handleMoveToInventory"
                    >
                        手持ちへ
                    </button>
                    <button
                        type="button"
                        class="item-transfer-button item-transfer-button--toolbar"
                        v-else-if="canMoveToStorage"
                        @click="handleMoveToStorage"
                    >
                        倉庫へ
                    </button>
                    <button
                        type="button"
                        class="item-unequip-button item-unequip-button--toolbar"
                        :disabled="!canUnequip"
                        @click="handleUnequip"
                    >
                        装備を外す
                    </button>
                    <!-- <span class="item-detail-modal-type-badge">{{ typeBadge }}</span> -->
                </div>
                <div class="item-detail-nav-buttons">
                    <button type="button" class="item-detail-next-button" :disabled="entries.length <= 1" @click="showPrevItem">
                        前へ
                    </button>
                    <button type="button" class="item-detail-next-button" :disabled="entries.length <= 1" @click="showNextItem">
                        次へ
                    </button>
                </div>
            </div>

            <div class="item-detail-modal-body">
                <template v-if="isItemType && itemView">
                    <div class="item-static-top">
                        <div class="item-hero-subtitle" v-if="itemView.subTitle">{{ itemView.subTitle }}</div>
                        <div class="item-hero-title">{{ itemView.mainTitle }}</div>

                        <div class="item-type-line" v-if="itemView.typeLine">{{ itemView.typeLine }}</div>
                    </div>

                    <div class="item-scroll-area">
                        <section class="item-stat-card" v-if="itemView.isWeapon && (itemView.fullPowerText !== null || itemView.damageBlur)">
                            <div class="item-stat-row">
                                <span class="item-stat-label">全力:</span>
                                <span class="item-stat-value">{{ itemView.fullPowerText ?? '-' }}</span>
                                <span class="item-stat-inline-gap"></span>
                                <span class="item-stat-label" v-if="itemView.damageBlur">ダメージブレ:</span>
                                <span class="item-stat-value" v-if="itemView.damageBlur">{{ itemView.damageBlur }}</span>
                            </div>
                        </section>

                        <div
                            class="item-two-col"
                            v-if="(itemView.isWeapon && (itemView.power !== null || itemView.physicalBreakdown.length > 0)) || (itemView.isWeapon && itemView.guard !== null)"
                        >
                            <section
                                class="item-stat-card"
                                :class="{ 'is-only': !(itemView.isWeapon && itemView.guard !== null) }"
                                v-if="itemView.isWeapon && (itemView.power !== null || itemView.physicalBreakdown.length > 0)"
                            >
                                <div class="item-stat-row" v-if="itemView.power !== null">
                                    <span class="item-stat-label">威力:</span>
                                    <span class="item-stat-value">{{ itemView.power }}</span>
                                    <span class="item-stat-inline-meta" v-if="itemView.weaponPenetrationInline">
                                        {{ itemView.weaponPenetrationInline }}
                                    </span>
                                </div>
                                <div class="item-stat-sub" v-if="itemView.physicalBreakdown.length > 0">
                                    ｜ {{ itemView.physicalBreakdown.join('  ') }}
                                </div>
                            </section>

                            <section
                                class="item-stat-card"
                                :class="{ 'is-only': !(itemView.isWeapon && (itemView.power !== null || itemView.physicalBreakdown.length > 0)) }"
                                v-if="itemView.isWeapon && itemView.guard !== null"
                            >
                                <div class="item-stat-row">
                                    <span class="item-stat-label">ガード:</span>
                                    <span class="item-stat-value">{{ itemView.guard }}</span>
                                </div>
                            </section>
                        </div>

                        <div
                            class="item-two-col"
                            v-if="((itemView.isWeapon || itemView.isArmor) && (itemView.attributeTotal !== null || itemView.attributeBreakdown.length > 0)) || ((itemView.isWeapon || itemView.isArmor) && (itemView.statusTotal !== null || itemView.statusBreakdown.length > 0))"
                        >
                            <section
                                class="item-stat-card"
                                :class="{ 'is-only': !((itemView.isWeapon || itemView.isArmor) && (itemView.statusTotal !== null || itemView.statusBreakdown.length > 0)) }"
                                v-if="(itemView.isWeapon || itemView.isArmor) && (itemView.attributeTotal !== null || itemView.attributeBreakdown.length > 0)"
                            >
                                <div class="item-stat-row" v-if="itemView.attributeTotal !== null">
                                    <span class="item-stat-label">属性:</span>
                                    <span class="item-stat-value">{{ itemView.attributeTotal }}</span>
                                </div>
                                <div class="item-stat-sub" v-if="itemView.attributeBreakdown.length > 0">
                                    ｜ {{ itemView.attributeBreakdown.join('  ') }}
                                </div>
                            </section>

                            <section
                                class="item-stat-card"
                                :class="{ 'is-only': !((itemView.isWeapon || itemView.isArmor) && (itemView.attributeTotal !== null || itemView.attributeBreakdown.length > 0)) }"
                                v-if="(itemView.isWeapon || itemView.isArmor) && (itemView.statusTotal !== null || itemView.statusBreakdown.length > 0)"
                            >
                                <div class="item-stat-row" v-if="itemView.statusTotal !== null">
                                    <span class="item-stat-label">状態:</span>
                                    <span class="item-stat-value">{{ itemView.statusTotal }}</span>
                                </div>
                                <div class="item-stat-sub" v-if="itemView.statusBreakdown.length > 0">
                                    ｜ {{ itemView.statusBreakdown.join('  ') }}
                                </div>
                            </section>
                        </div>

                        <section class="item-stat-card" v-if="itemView.isWeapon && (itemView.crRate !== null || itemView.crPower !== null)">
                            <div class="item-stat-row">
                                <template v-if="itemView.crRate !== null">
                                    <span class="item-stat-label">Cr率:</span>
                                    <span class="item-stat-value">{{ itemView.crRate }}%</span>
                                </template>
                                <span class="item-stat-inline-gap"></span>
                                <template v-if="itemView.crPower !== null">
                                    <span class="item-stat-label">Cr威力:</span>
                                    <span class="item-stat-value">{{ itemView.crPower }}%</span>
                                </template>
                            </div>
                        </section>

                        <section class="item-stat-card" v-if="itemView.isWeapon && itemView.reductions.length > 0">
                            <div class="item-stat-row">
                                <span class="item-stat-label">
                                    軽減<span v-if="itemView.reductionTotal !== null">:{{ itemView.reductionTotal }}</span><span v-else>:</span>
                                </span>
                            </div>
                            <div class="item-stat-sub" v-if="itemView.reductions.length > 0">
                                ｜ {{ itemView.reductions.join('  ') }}
                            </div>
                        </section>

                        <section class="item-stat-card" v-if="itemView.isArmor && itemView.armorPhysicalReduction !== null">
                            <div class="item-stat-row">
                                <span class="item-stat-label">物理軽減:</span>
                                <span class="item-stat-value">{{ itemView.armorPhysicalReduction }}</span>
                            </div>
                        </section>

                        <section class="item-stat-card" v-if="itemView.isArmor && itemView.armorMagicReduction !== null">
                            <div class="item-stat-row">
                                <span class="item-stat-label">魔法軽減:</span>
                                <span class="item-stat-value">{{ itemView.armorMagicReduction }}</span>
                            </div>
                        </section>

                        <section class="item-stat-card" v-if="itemView.isArmor && itemView.armorDamageReductions.length > 0">
                            <div class="item-stat-row">
                                <span class="item-stat-label">
                                    切断/貫通/打撃<span v-if="itemView.armorDamageReductionTotal !== null">:{{ itemView.armorDamageReductionTotal }}</span><span v-else>:</span>
                                </span>
                            </div>
                            <div class="item-stat-sub" v-if="itemView.armorDamageReductions.length > 0">
                                ｜ {{ itemView.armorDamageReductions.join('  ') }}
                            </div>
                        </section>

                        <section class="item-stat-card" v-if="itemView.isArmor && itemView.armorElementReductions.length > 0">
                            <div class="item-stat-row">
                                <span class="item-stat-label">
                                    属性軽減<span v-if="itemView.armorElementReductionTotal !== null">:{{ itemView.armorElementReductionTotal }}</span><span v-else>:</span>
                                </span>
                            </div>
                            <div class="item-stat-sub" v-if="itemView.armorElementReductions.length > 0">
                                ｜ {{ itemView.armorElementReductions.join('  ') }}
                            </div>
                        </section>

                        <section class="item-stat-card" v-if="itemView.isWeapon && itemView.resistances.length > 0">
                            <div class="item-stat-row">
                                <span class="item-stat-label">
                                    耐性<span v-if="itemView.resistanceTotal !== null">:{{ itemView.resistanceTotal }}</span><span v-else>:</span>
                                </span>
                            </div>
                            <div class="item-stat-sub" v-if="itemView.resistances.length > 0">
                                ｜ {{ itemView.resistances.join('  ') }}
                            </div>
                        </section>

                        <section class="item-stat-card" v-if="itemView.isArmor && itemView.armorAttributeResistances.length > 0">
                            <div class="item-stat-row">
                                <span class="item-stat-label">
                                    属性耐性<span v-if="itemView.armorAttributeResistanceTotal !== null">:{{ itemView.armorAttributeResistanceTotal }}</span><span v-else>:</span>
                                </span>
                            </div>
                            <div class="item-stat-sub" v-if="itemView.armorAttributeResistances.length > 0">
                                ｜ {{ itemView.armorAttributeResistances.join('  ') }}
                            </div>
                        </section>

                        <section class="item-stat-card" v-if="itemView.isArmor && itemView.armorStatusResistances.length > 0">
                            <div class="item-stat-row">
                                <span class="item-stat-label">
                                    状態耐性<span v-if="itemView.armorStatusResistanceTotal !== null">:{{ itemView.armorStatusResistanceTotal }}</span><span v-else>:</span>
                                </span>
                            </div>
                            <div class="item-stat-sub" v-if="itemView.armorStatusResistances.length > 0">
                                ｜ {{ itemView.armorStatusResistances.join('  ') }}
                            </div>
                        </section>

                        <section class="item-stat-card" v-if="itemView.isArmor && itemView.armorCriticalResistances.length > 0">
                            <div class="item-stat-row">
                                <span class="item-stat-label">
                                    クリティカル耐性:
                                </span>
                            </div>
                            <div class="item-stat-sub" v-if="itemView.armorCriticalResistances.length > 0">
                                ｜ {{ itemView.armorCriticalResistances.join('  ') }}
                            </div>
                        </section>

                        <section class="item-stat-card" v-if="itemView.isArmor && itemView.skillValues.length > 0">
                            <div class="item-stat-row">
                                <span class="item-stat-label">
                                    技能<span v-if="itemView.skillTotal !== null">:{{ itemView.skillTotal }}</span><span v-else>:</span>
                                </span>
                            </div>
                            <div class="item-stat-sub" v-if="itemView.skillValues.length > 0">
                                ｜ {{ itemView.skillValues.join('  ') }}
                            </div>
                        </section>

                        <section class="item-stat-card" v-if="itemView.isArmor && itemView.bodyValues.length > 0">
                            <div class="item-stat-row">
                                <span class="item-stat-label">
                                    肉体値<span v-if="itemView.bodyTotal !== null">:{{ itemView.bodyTotal }}</span><span v-else>:</span>
                                </span>
                            </div>
                            <div class="item-stat-sub" v-if="itemView.bodyValues.length > 0">
                                ｜ {{ itemView.bodyValues.join('  ') }}
                            </div>
                        </section>

                        <section class="item-stat-card" v-if="itemView.isArmor && itemView.abilityValues.length > 0">
                            <div class="item-stat-row">
                                <span class="item-stat-label">
                                    能力上昇値<span v-if="itemView.abilityTotal !== null">:{{ itemView.abilityTotal }}</span><span v-else>:</span>
                                </span>
                            </div>
                            <div class="item-stat-sub" v-if="itemView.abilityValues.length > 0">
                                ｜ {{ itemView.abilityValues.join('  ') }}
                            </div>
                        </section>

                        <section class="item-stat-card" v-if="itemView.holdingAbilities.length > 0">
                            <div class="item-stat-row">
                                <span class="item-stat-label">保持能力:</span>
                            </div>
                            <div class="item-stat-inline-list item-skill-picks">
                                <button
                                    type="button"
                                    class="item-skill-link"
                                    v-for="(ability, index) in itemView.holdingAbilities"
                                    :key="`holding-${index}`"
                                    @mouseenter="handleLinkedSkillEnter($event, ability)"
                                    @mousemove="handleLinkedSkillMove($event)"
                                    @mouseleave="scheduleHideHoverPreview"
                                    @click.prevent.stop="handleLinkedSkillClick"
                                >
                                    {{ ability }}
                                </button>
                            </div>
                        </section>

                        <section class="item-stat-card" v-if="itemView.weaponTraits.length > 0">
                            <div class="item-stat-row">
                                <span class="item-stat-label">武器特性:</span>
                            </div>
                            <div class="item-stat-inline-list item-skill-picks">
                                <button
                                    type="button"
                                    class="item-skill-link"
                                    v-for="(trait, index) in itemView.weaponTraits"
                                    :key="`weapon-trait-${index}`"
                                    @mouseenter="handleLinkedSkillEnter($event, trait)"
                                    @mousemove="handleLinkedSkillMove($event)"
                                    @mouseleave="scheduleHideHoverPreview"
                                    @click.prevent.stop="handleLinkedSkillClick"
                                >
                                    {{ trait }}
                                </button>
                            </div>
                        </section>

                        <section class="item-stat-card" v-if="itemView.armorTraits.length > 0">
                            <div class="item-stat-row">
                                <span class="item-stat-label">防具特性:</span>
                            </div>
                            <div class="item-stat-inline-list item-skill-picks">
                                <button
                                    type="button"
                                    class="item-skill-link"
                                    v-for="(trait, index) in itemView.armorTraits"
                                    :key="`armor-trait-${index}`"
                                    @mouseenter="handleLinkedSkillEnter($event, trait)"
                                    @mousemove="handleLinkedSkillMove($event)"
                                    @mouseleave="scheduleHideHoverPreview"
                                    @click.prevent.stop="handleLinkedSkillClick"
                                >
                                    {{ trait }}
                                </button>
                            </div>
                        </section>

                        <section class="item-stat-card" v-if="(itemView.isWeapon || itemView.isArmor) && itemView.penalties.length > 0">
                            <div class="item-stat-row penalty-row">
                                <span class="item-stat-label">ペナルティ:</span>
                            </div>
                            <div class="item-stat-inline-list penalty-inline-list">
                                <span class="item-stat-inline-item" v-for="(penalty, index) in itemView.penalties" :key="`penalty-${index}`">
                                    {{ penalty }}
                                </span>
                            </div>
                        </section>

                        <section class="item-stat-card" v-if="itemView.isGun && itemView.gunStats.length > 0">
                            <div class="item-stat-row">
                                <span class="item-stat-label">銃性能:</span>
                            </div>
                            <div class="item-stat-list" v-for="(stat, index) in itemView.gunStats" :key="`gun-stat-${index}`">
                                ｜ {{ stat.label }} {{ stat.value }}
                            </div>
                        </section>

                        <section class="item-stat-card" v-if="itemView.traits.length > 0">
                            <div class="item-stat-row">
                                <span class="item-stat-label">特性:</span>
                            </div>
                            <div class="item-stat-list" v-for="(trait, index) in itemView.traits" :key="`trait-${index}`">
                                ｜ {{ trait }}
                            </div>
                        </section>

                        <section class="item-description-card">
                            {{ itemView.description }}
                        </section>
                    </div>
                </template>

                <template v-else>
                    <div class="fallback-caption">{{ captionText }}</div>
                    <div class="fallback-body">{{ fallbackBodyText }}</div>
                </template>
            </div>
        </div>

        <div
            v-if="hoverSkillPreview.visible"
            class="item-skill-hover-panel"
            :style="hoverPreviewStyle"
            @mouseenter="cancelHideHoverPreview"
            @mouseleave="scheduleHideHoverPreview"
        >
            <div class="item-skill-hover-title">{{ hoverSkillPreview.name }}</div>
            <template v-if="hoverSkillPreview.loading">
                <div class="item-skill-hover-loading">読み込み中...</div>
            </template>
            <template v-else-if="hoverSkillPreview.skill">
                <div class="item-skill-hover-line" v-if="hoverSkillPreview.skill.種別">種別: {{ hoverSkillPreview.skill.種別 }}</div>
                <div class="item-skill-hover-line" v-if="hoverSkillPreview.skill.属性">属性: {{ hoverSkillPreview.skill.属性 }}</div>
                <div class="item-skill-hover-line" v-if="hoverSkillPreview.skill.攻撃手段">攻撃手段: {{ hoverSkillPreview.skill.攻撃手段 }}</div>
                <div class="item-skill-hover-desc">{{ getSkillPreviewDescription(hoverSkillPreview.skill) }}</div>
            </template>
            <template v-else>
                <div class="item-skill-hover-missing">スキルデータが見つかりません</div>
            </template>
        </div>
    </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { triggerPostModalInteractionGuard } from '../utils/modalInteractionGuard.js';

const DETAIL_MODAL_TYPES = {
    ITEM: 'item',
    SKILL: 'skill',
};

const PHYSICAL_KEYS = ['切断', '貫通', '打撃'];
const ELEMENT_DISPLAY_CONFIG = [
    { key: '炎', label: '炎' },
    { key: '冷気', label: '冷気' },
    { key: '氷', label: '氷' },
    { key: '雷', label: '雷' },
    { key: '酸', label: '酸' },
    { key: '音波', label: '音波' },
    { key: '闇', label: '闇' },
    { key: '光', label: '光' },
    { key: '善', label: '善' },
    { key: '悪', label: '悪' },
    { key: '正', label: '正' },
    { key: '負', label: '負' },
    { key: '毒', label: '毒' }
];
const STATUS_DISPLAY_CONFIG = [
    { key: '麻痺', label: '麻痺' },
    { key: '混乱', label: '混乱' },
    { key: '恐怖', label: '恐怖' },
    { key: '盲目', label: '盲目' },
    { key: '閃光', label: '閃光' },
    { key: '暗黒', label: '暗黒' },
    { key: '幻覚', label: '幻覚' },
    { key: '睡眠', label: '睡眠' },
    { key: '石化', label: '石化' },
    { key: 'スタン', label: 'スタン' },
    { key: '拘束', label: '拘束' },
    { key: '呪い', label: '呪い' },
    { key: '呪い/HP', label: '呪い/HP' },
    { key: '呪い/MP', label: '呪い/MP' },
    { key: '呪い/ST', label: '呪い/ST' },
    { key: '呪い/筋力', label: '呪い/筋力' },
    { key: '呪い/防御', label: '呪い/防御' },
    { key: '呪い/魔力', label: '呪い/魔力' },
    { key: '呪い/魔防', label: '呪い/魔防' },
    { key: '呪い/速度', label: '呪い/速度' },
    { key: '呪い/命中', label: '呪い/命中' },
    { key: '支配', label: '支配' },
    { key: '即死', label: '即死' },
    { key: '時間', label: '時間' },
    { key: '出血', label: '出血' },
    { key: '疲労', label: '疲労' },
    { key: 'NB', label: 'NB' },
    { key: 'ノックバック', label: 'NB' }
];
const WEAPON_KIND_KEYWORDS = [
    '脇差', '苦無', '忍者刀', '小太刀', '刀', '太刀', '斬馬刀',
    '短剣', '剣', '広剣', '長剣', '大剣', '細剣', '刺剣',
    '山刀', '鉈', '医療刃', '槍', '短槍', '長槍', '騎士槍', '斧槍', '薙刀', '剣槍', '三叉槍',
    '棍棒', '大棍棒', '戦棍', '棘棍', '戦棒', '戦棍棒', '鶴嘴', '刺突戦鎚',
    '鎚', '戦鎚',
    '鎌', '大鎌',
    '斧', '戦斧', '大斧',
    '鞭', '長鞭', '超長鞭', '爪籠手', '破壊籠手', '丸盾', '盾', '丸大盾', '大盾', '棘盾', '塔盾',
    '短弓', '長弓', '弦鳴弓',
    '投矢', '軽射出弓', '射出弓', '重射出弓', '大砲', '投擲石',
    '短杖', '杖', '長杖', '本',
    '回転式拳銃', '拳銃', '長銃', '短機関銃', '突撃銃', '軽機関銃', '狙撃銃', '手散弾銃',
    '散弾銃', '機関銃', '滑腔式銃', '滑腔式長銃', '電動鋸刃', '雷棒',
    '笛剣', '鳴り鉢', '笛', '竪琴','手鎧','脚鎧'
];
const ARMOR_KIND_KEYWORDS = [
    '頭', '頭飾り', '覆面', '眼鏡', '仮面', '首飾り', '外套', '鎧', '胴着', '法衣', '服', '防衣',
    '肌着', '肌防着', '腕鎧', '手鎧', '腕輪', '指輪', '帯', '馬乗袴', '腰鎧', '洋袴', '脚鎧',
    '靴', '脚輪', '核', '腕核', '起動核'
];
const GUN_KIND_KEYWORDS = [
    '回転式拳銃', '拳銃', '長銃', '短機関銃', '突撃銃', '軽機関銃', '狙撃銃',
    '手散弾銃', '散弾銃', '機関銃', '滑腔式銃', '滑腔式長銃', '銃'
];
const ITEM_KIND_KEYWORDS = ['アイテム', '道具', '消耗品', '素材', '薬', '食料', '巻物', 'アクセサリ'];
const HOVER_PANEL_WIDTH = 360;
const HOVER_PANEL_HEIGHT = 260;
const REDUCTION_ORDER = [
    '物理', '魔法', '遠隔', '切断', '貫通', '打撃',
    '炎', '冷気', '氷', '雷', '酸', '音波', '闇', '光', '善', '悪', '正', '負', '毒'
];
const REDUCTION_CORE_KEYS = ['物理', '魔法'];
const REDUCTION_DAMAGE_KEYS = ['切断', '貫通', '打撃'];
const RESISTANCE_ORDER = [
    '物理', '魔法', '遠隔', '切断', '貫通', '打撃',
    '炎', '冷気', '氷', '雷', '酸', '音波', '闇', '光', '善', '悪', '正', '負', '毒',
    '麻痺', '混乱', '恐怖', '盲目', '閃光', '暗黒', '幻覚', '睡眠', '石化',
    'スタン', '拘束', '呪い', '支配', '即死', '時間', '出血', '疲労', 'NB',
    'ノックバック', 'Cr率', 'Cr威力'
];
const RESISTANCE_ATTRIBUTE_KEYS = [
    '物理', '魔法', '遠隔', '切断', '貫通', '打撃',
    '炎', '冷気', '氷', '雷', '酸', '音波', '闇', '光', '善', '悪', '正', '負', '毒'
];
const RESISTANCE_STATUS_KEYS = [
    '麻痺', '混乱', '恐怖', '盲目', '閃光', '暗黒', '幻覚', '睡眠', '石化',
    'スタン', '拘束', '呪い', '支配', '即死', '時間', '出血', '疲労', 'NB',
    'ノックバック'
];
const RESISTANCE_CRITICAL_KEYS = ['Cr率', 'Cr威力'];
const ARMOR_SKILL_KEYS = [
    '威圧', '透明化', '隠密', '消音', '看破', '知覚', '聴覚', '追跡', '軽業', '鑑定',
    '騎乗', '芸能', '言語学', '交渉', '呪文学', '職能', '真意看破', '水泳', '製作',
    '生存', '装置', '精神接続', '知識', '治療', '早業', '登攀', '指揮', '騙す', '変装', '魔道具操作'
];
const ARMOR_BODY_KEYS = [
    '角', '角リーチ', '牙', '爪', '爪リーチ', '羽', '羽リーチ', '尾', '尾リーチ',
    '外皮', '外殻', '再生', '吸血', 'ドレイン', '鋼体'
];
const ABILITY_VALUE_FIELDS = [
    { label: 'HP', key: 'HP+' },
    { label: 'MP', key: 'MP+' },
    { label: 'ST', key: 'ST+' },
    { label: '攻撃', key: '攻撃+' },
    { label: '防御', key: '防御+' },
    { label: '魔力', key: '魔力+' },
    { label: '魔防', key: '魔防+' },
    { label: '速度', key: '速度+' },
    { label: '命中', key: '命中+' },
    { label: 'SIZ', key: 'SIZ+' },
    { label: 'APP', key: 'APP+' }
];

const isOpen = ref(false);
const modalType = ref(DETAIL_MODAL_TYPES.ITEM);
const titleText = ref('詳細');
const entries = ref([]);
const currentIndex = ref(0);
const skillLookupCache = new Map();
const hoverSkillPreview = ref({
    visible: false,
    loading: false,
    name: '',
    skill: null,
    sourceSkills: [],
    left: 0,
    top: 0,
});
const hoverPreviewRequestId = ref(0);
const hoverPreviewStyle = computed(() => ({
    left: `${hoverSkillPreview.value.left}px`,
    top: `${hoverSkillPreview.value.top}px`,
}));
let hoverHideTimer = null;

const currentEntry = computed(() => entries.value[currentIndex.value] || null);
const isItemType = computed(() => modalType.value === DETAIL_MODAL_TYPES.ITEM);
const typeBadge = computed(() => (modalType.value === DETAIL_MODAL_TYPES.SKILL ? 'SKILL' : 'ITEM'));

const captionText = computed(() => {
    if (!currentEntry.value || entries.value.length === 0) return '';
    const label = modalType.value === DETAIL_MODAL_TYPES.SKILL
        ? getSkillName(currentEntry.value)
        : getItemName(currentEntry.value);
    return `${label} (${currentIndex.value + 1}/${entries.value.length})`;
});

const fallbackBodyText = computed(() => {
    if (!currentEntry.value) return '詳細情報なし';
    if (modalType.value === DETAIL_MODAL_TYPES.SKILL) return getSkillDescription(currentEntry.value);
    return getItemDescription(currentEntry.value);
});

const itemView = computed(() => {
    if (!isItemType.value || !currentEntry.value) return null;
    return buildItemView(currentEntry.value);
});

const canEquip = computed(() => {
    if (!isItemType.value || !currentEntry.value) return false;
    if (typeof window.onDetailModalEquip !== 'function') return false;
    if (typeof window.canDetailModalEquip === 'function') {
        return Boolean(window.canDetailModalEquip(currentEntry.value));
    }
    return true;
});

const canUnequip = computed(() => {
    if (!isItemType.value || !currentEntry.value) return false;
    if (typeof window.onDetailModalUnequip !== 'function') return false;
    if (typeof window.canDetailModalUnequip === 'function') {
        return Boolean(window.canDetailModalUnequip(currentEntry.value));
    }
    return true;
});

const canMoveToInventory = computed(() => {
    if (!isItemType.value || !currentEntry.value) return false;
    if (typeof window.onDetailModalMoveToInventory !== 'function') return false;
    if (typeof window.canDetailModalMoveToInventory === 'function') {
        return Boolean(window.canDetailModalMoveToInventory(currentEntry.value));
    }
    return true;
});

const canMoveToStorage = computed(() => {
    if (!isItemType.value || !currentEntry.value) return false;
    if (typeof window.onDetailModalMoveToStorage !== 'function') return false;
    if (typeof window.canDetailModalMoveToStorage === 'function') {
        return Boolean(window.canDetailModalMoveToStorage(currentEntry.value));
    }
    return true;
});

function toRoundedNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.round(numeric) : null;
}

function toNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
}

function getFirstText(entry, keys, fallback = '') {
    for (const key of keys) {
        if (!(key in entry)) continue;
        const text = String(entry[key] ?? '').trim();
        if (text !== '') return text;
    }
    return fallback;
}

function getFirstNumber(entry, keys) {
    for (const key of keys) {
        if (!(key in entry)) continue;
        const parsed = toRoundedNumber(entry[key]);
        if (parsed !== null) return parsed;
    }
    return null;
}

function getFirstFloat(entry, keys) {
    for (const key of keys) {
        if (!(key in entry)) continue;
        const parsed = toNumber(entry[key]);
        if (parsed !== null) return parsed;
    }
    return null;
}

function collectEntries(source) {
    if (!source) return [];

    const values = Array.isArray(source) ? source : Object.values(source);
    return values.filter((entry) => {
        if (!entry || typeof entry !== 'object') return false;
        return Boolean(
            entry.名前 || entry.name || entry.説明 || entry.description || entry.種類 || entry.タイプ || entry.type
        );
    });
}

function getItemName(item) {
    return String(item?.名前 || item?.name || '不明アイテム');
}

function getSkillName(skill) {
    return String(skill?.名前 || skill?.name || '不明スキル');
}

function getItemDescription(item) {
    const text = String(item?.説明 ?? '').trim();
    return text || '詳細情報なし';
}

function getSkillDescription(skill) {
    const text = String(skill?.説明 ?? skill?.description ?? '').trim();
    return text || 'スキル詳細情報なし';
}

function normalizeSkillName(value) {
    return String(value ?? '').trim().replace(/[　\s]+/g, '').toLowerCase();
}

function getSkillEntryName(skill) {
    return String(skill?.和名 || skill?.名前 || skill?.name || '').trim();
}

function collectSkillEntries(source, bucket = [], visited = new Set()) {
    if (!source) return bucket;

    if (Array.isArray(source)) {
        source.forEach((entry) => collectSkillEntries(entry, bucket, visited));
        return bucket;
    }

    if (typeof source !== 'object') return bucket;
    if (visited.has(source)) return bucket;
    visited.add(source);

    const hasSkillIdentity = Boolean(
        source.和名 || source.名前 || source.name || source.詳細 || source.説明 || source.description
    );
    if (hasSkillIdentity) {
        bucket.push(source);
    }

    Object.values(source).forEach((child) => {
        if (!child) return;
        if (Array.isArray(child) || typeof child === 'object') {
            collectSkillEntries(child, bucket, visited);
        }
    });

    return bucket;
}

function uniqueSkillEntries(entries) {
    const result = [];
    const seen = new Set();

    entries.forEach((entry) => {
        const normalized = normalizeSkillName(getSkillEntryName(entry));
        if (!normalized || seen.has(normalized)) return;
        seen.add(normalized);
        result.push(entry);
    });

    return result;
}

function getLocalSkillEntries() {
    const pools = [
        window.playerData?.skills,
        window.playerData?.magic,
        window.playerData?.magics,
        window.statusCharacter?.skills,
        window.statusCharacter?.magic,
        window.statusCharacter?.magics
    ];

    const rows = [];
    pools.forEach((pool) => collectSkillEntries(pool, rows));
    return uniqueSkillEntries(rows);
}

function buildSkillNameCandidates(rawName) {
    const source = String(rawName ?? '').trim();
    if (!source) return [];

    const candidates = [source];
    const noSpace = source.replace(/[　\s]+/g, '');
    if (noSpace && noSpace !== source) candidates.push(noSpace);

    const removedLevelNumber = source.replace(/[　\s]*\d+$/, '').trim();
    if (removedLevelNumber && removedLevelNumber !== source) candidates.push(removedLevelNumber);

    const removedLvSuffix = source.replace(/[　\s]*Lv\.?[　\s]*\d+$/i, '').trim();
    if (removedLvSuffix && removedLvSuffix !== source) candidates.push(removedLvSuffix);

    return uniqueTexts(candidates);
}

function findSkillByName(skillName, entries) {
    const normalizedTarget = normalizeSkillName(skillName);
    if (!normalizedTarget || !entries.length) return null;

    let partialMatch = null;
    for (const entry of entries) {
        const normalizedName = normalizeSkillName(getSkillEntryName(entry));
        if (!normalizedName) continue;
        if (normalizedName === normalizedTarget) return entry;
        if (!partialMatch && (normalizedName.includes(normalizedTarget) || normalizedTarget.includes(normalizedName))) {
            partialMatch = entry;
        }
    }

    return partialMatch;
}

async function fetchSkillEntriesByName(skillName) {
    const key = String(skillName ?? '').trim();
    if (!key) return [];

    if (skillLookupCache.has(key)) {
        return skillLookupCache.get(key);
    }

    try {
        let fetchedSkills = null;
        if (typeof window.fetchSkills === 'function') {
            fetchedSkills = await window.fetchSkills([key]);
        } else {
            const response = await fetch('/api/skills', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ skillNames: [key] })
            });
            const result = await response.json();
            fetchedSkills = response.ok && result?.success ? result.skills : null;
        }

        const entries = fetchedSkills
            ? uniqueSkillEntries(collectSkillEntries(fetchedSkills))
            : [];

        skillLookupCache.set(key, entries);
        return entries;
    } catch (error) {
        console.error('[DetailModal] skill fetch failed:', error);
        return [];
    }
}

async function resolveSkillByName(skillName) {
    const candidates = buildSkillNameCandidates(skillName);
    if (!candidates.length) return { skill: null, sourceSkills: [] };

    const localEntries = getLocalSkillEntries();
    for (const candidate of candidates) {
        const localMatch = findSkillByName(candidate, localEntries);
        if (localMatch) {
            return { skill: localMatch, sourceSkills: localEntries };
        }
    }

    for (const candidate of candidates) {
        const fetchedEntries = await fetchSkillEntriesByName(candidate);
        if (!fetchedEntries.length) continue;

        const fetchedMatch =
            findSkillByName(skillName, fetchedEntries) ||
            findSkillByName(candidate, fetchedEntries) ||
            fetchedEntries[0];

        if (fetchedMatch) {
            return { skill: fetchedMatch, sourceSkills: fetchedEntries };
        }
    }

    return { skill: null, sourceSkills: [] };
}

function clearHoverHideTimer() {
    if (hoverHideTimer) {
        clearTimeout(hoverHideTimer);
        hoverHideTimer = null;
    }
}

function updateHoverPreviewPosition(event) {
    if (!event) return;
    const panelWidth = HOVER_PANEL_WIDTH;
    const panelHeight = HOVER_PANEL_HEIGHT;
    const edge = 12;
    let left = event.clientX + 16;
    let top = event.clientY - 35;

    if (left + panelWidth > window.innerWidth - edge) {
        left = event.clientX - panelWidth - 16;
    }
    if (top + panelHeight > window.innerHeight - edge) {
        top = window.innerHeight - panelHeight - edge;
    }

    hoverSkillPreview.value.left = Math.max(edge, Math.round(left));
    hoverSkillPreview.value.top = Math.max(edge, Math.round(top));
}

function hideHoverPreview() {
    clearHoverHideTimer();
    hoverSkillPreview.value.visible = false;
    hoverSkillPreview.value.loading = false;
    hoverSkillPreview.value.name = '';
    hoverSkillPreview.value.skill = null;
    hoverSkillPreview.value.sourceSkills = [];
}

function cancelHideHoverPreview() {
    clearHoverHideTimer();
}

function scheduleHideHoverPreview() {
    clearHoverHideTimer();
    hoverHideTimer = setTimeout(() => {
        hideHoverPreview();
    }, 120);
}

function getSkillPreviewDescription(skill) {
    const detail = String(skill?.詳細 ?? '').trim();
    if (detail) return detail;
    const description = String(skill?.説明 ?? skill?.description ?? '').trim();
    return description || '説明なし';
}

async function showHoverSkillPreview(event, skillName) {
    const normalized = String(skillName ?? '').trim();
    if (!normalized) return;

    clearHoverHideTimer();
    updateHoverPreviewPosition(event);
    hoverSkillPreview.value.visible = true;
    hoverSkillPreview.value.loading = true;
    hoverSkillPreview.value.name = normalized;
    hoverSkillPreview.value.skill = null;
    hoverSkillPreview.value.sourceSkills = [];

    const requestId = hoverPreviewRequestId.value + 1;
    hoverPreviewRequestId.value = requestId;

    const { skill, sourceSkills } = await resolveSkillByName(normalized);
    if (requestId !== hoverPreviewRequestId.value) return;

    hoverSkillPreview.value.loading = false;
    hoverSkillPreview.value.skill = skill;
    hoverSkillPreview.value.sourceSkills = sourceSkills;
}

function handleLinkedSkillEnter(event, skillName) {
    showHoverSkillPreview(event, skillName);
}

function handleLinkedSkillMove(event) {
    if (!hoverSkillPreview.value.visible) return;
    updateHoverPreviewPosition(event);
}

function handleLinkedSkillClick() {
    // hover preview only: no navigation to skill modal on click
}

async function openLinkedSkillDetail(skillName) {
    const normalized = String(skillName ?? '').trim();
    if (!normalized) return;

    let skill = null;
    let sourceSkills = [];

    const currentPreviewName = String(hoverSkillPreview.value.name || '').trim();
    if (hoverSkillPreview.value.skill && currentPreviewName === normalized) {
        skill = hoverSkillPreview.value.skill;
        sourceSkills = hoverSkillPreview.value.sourceSkills;
    } else {
        const resolved = await resolveSkillByName(normalized);
        skill = resolved.skill;
        sourceSkills = resolved.sourceSkills;
    }

    if (!skill) return;

    openSkillDetailModal(skill, sourceSkills.length > 0 ? sourceSkills : [skill], 'スキル詳細');
    hideHoverPreview();
}

function resetHoverPreview() {
    hoverPreviewRequestId.value += 1;
    hideHoverPreview();
}

function syncHoverPanelWithViewport() {
    if (!hoverSkillPreview.value.visible) return;
    hoverSkillPreview.value.left = Math.min(hoverSkillPreview.value.left, Math.max(12, window.innerWidth - (HOVER_PANEL_WIDTH + 12)));
    hoverSkillPreview.value.top = Math.min(hoverSkillPreview.value.top, Math.max(12, window.innerHeight - (HOVER_PANEL_HEIGHT + 12)));
}

onMounted(() => {
    window.addEventListener('resize', syncHoverPanelWithViewport, { passive: true });
});

onBeforeUnmount(() => {
    window.removeEventListener('resize', syncHoverPanelWithViewport);
    clearHoverHideTimer();
});

function collectBreakdown(entry, keys) {
    const values = [];
    keys.forEach((key) => {
        const amount = toRoundedNumber(entry[key]);
        if (amount !== null && amount !== 0) {
            values.push(`${key} ${amount}`);
        }
    });
    return values;
}

function collectBreakdownByConfig(entry, configList) {
    const values = [];
    const usedLabels = new Set();

    configList.forEach(({ key, label }) => {
        const amount = toRoundedNumber(entry[key]);
        if (amount === null || amount === 0) return;
        if (usedLabels.has(label)) return;

        usedLabels.add(label);
        values.push(`${label} ${amount}`);
    });

    return values;
}

function sumByConfig(entry, configList) {
    let total = 0;
    const usedLabels = new Set();

    configList.forEach(({ key, label }) => {
        const amount = toRoundedNumber(entry[key]);
        if (amount === null || amount === 0) return;
        if (usedLabels.has(label)) return;

        usedLabels.add(label);
        total += amount;
    });

    return total;
}

function collectIndexedText(entry, baseKey) {
    const regex = new RegExp(`^${baseKey}(\\d+)$`);
    const indexed = [];
    Object.entries(entry).forEach(([key, value]) => {
        const match = key.match(regex);
        if (!match) return;
        const text = String(value ?? '').trim();
        if (!text) return;
        indexed.push({ index: Number(match[1]), text });
    });
    indexed.sort((a, b) => a.index - b.index);
    return indexed.map((item) => item.text);
}

function collectUnindexedText(entry, keyword) {
    const result = [];
    Object.entries(entry).forEach(([key, value]) => {
        if (!key.includes(keyword)) return;
        const text = String(value ?? '').trim();
        if (!text) return;
        if (/^\d+(\.\d+)?$/.test(text)) return;
        result.push(text);
    });
    return result;
}

function uniqueTexts(list) {
    return Array.from(new Set(list.filter(Boolean)));
}

function containsKindKeyword(kindText, keywords) {
    if (!kindText) return false;
    return keywords.some((keyword) => kindText.includes(keyword));
}

function collectNumericRowsBySuffix(entry, suffix, options = {}) {
    const {
        order = [],
        excludeLabels = [],
    } = options;
    const orderIndex = new Map(order.map((label, index) => [label, index]));
    const excludedSet = new Set(excludeLabels.map((label) => String(label).trim()));
    const list = [];
    Object.entries(entry).forEach(([key, rawValue]) => {
        if (!key.includes(suffix)) return;

        const value = toRoundedNumber(rawValue);
        if (value === null || value === 0) return;

        const label = key.replace(suffix, '').trim() || key;
        if (excludedSet.has(label)) return;
        list.push({ key, label, value });
    });

    list.sort((a, b) => {
        const aIndex = orderIndex.has(a.label) ? orderIndex.get(a.label) : Number.MAX_SAFE_INTEGER;
        const bIndex = orderIndex.has(b.label) ? orderIndex.get(b.label) : Number.MAX_SAFE_INTEGER;
        if (aIndex !== bIndex) return aIndex - bIndex;
        return a.key.localeCompare(b.key, 'ja');
    });
    return list;
}

function collectNumericBySuffix(entry, suffix, options = {}) {
    const rows = collectNumericRowsBySuffix(entry, suffix, options);
    return rows.map((row) => `${row.label} ${row.value}`);
}

function formatNumericRows(rows) {
    return rows.map((row) => `${row.label} ${row.value}`);
}

function sumNumericRows(rows) {
    return rows.reduce((total, row) => total + (typeof row?.value === 'number' ? row.value : 0), 0);
}

function toTotalOrNull(total) {
    return Number.isFinite(total) && total !== 0 ? total : null;
}

function collectOrderedValueRows(entry, keys) {
    const rows = [];
    keys.forEach((key) => {
        if (!(key in entry)) return;
        const raw = entry[key];
        const rounded = toRoundedNumber(raw);
        if (rounded !== null) {
            if (rounded === 0) return;
            rows.push({ label: key, value: rounded, text: `${key} ${rounded}` });
            return;
        }

        const text = String(raw ?? '').trim();
        if (!text || text === '0') return;
        rows.push({ label: key, value: null, text: `${key} ${text}` });
    });
    return rows;
}

function collectAbilityBonusRows(entry, fields) {
    const rows = [];
    fields.forEach(({ label, key }) => {
        if (!(key in entry)) return;
        const raw = entry[key];
        const rounded = toRoundedNumber(raw);
        if (rounded !== null) {
            if (rounded === 0) return;
            rows.push({ label, value: rounded, text: `${label} ${rounded}` });
            return;
        }

        const text = String(raw ?? '').trim();
        if (!text || text === '0') return;
        rows.push({ label, value: null, text: `${label} ${text}` });
    });
    return rows;
}

function collectHoldingAbilities(entry) {
    const materialSkills = [];
    for (let i = 1; i <= 2; i += 1) {
        const text = String(entry[`素材スキル${i}`] ?? '').trim();
        const numeric = toNumber(text);
        if (!text) continue;
        if (numeric !== null && numeric === 0) continue;
        materialSkills.push(text);
    }

    const grantSkills = [];
    for (let i = 1; i <= 3; i += 1) {
        const text = String(entry[`付与スキル${i}`] ?? '').trim();
        const numeric = toNumber(text);
        if (!text) continue;
        if (numeric !== null && numeric === 0) continue;
        grantSkills.push(text);
    }

    return uniqueTexts([...materialSkills, ...grantSkills]);
}

function collectGrantAbilities(entry) {
    const values = [];

    const pushText = (raw) => {
        const text = String(raw ?? '').trim();
        if (!text) return;
        const numeric = toNumber(text);
        if (numeric !== null && numeric === 0) return;
        values.push(text);
    };

    for (let i = 1; i <= 3; i += 1) {
        pushText(entry[`付与スキル${i}`]);
        pushText(entry[`付与能力${i}`]);
        pushText(entry[`付与${i}`]);
    }

    pushText(entry['付与スキル']);
    pushText(entry['付与能力']);
    pushText(entry['付与']);

    return uniqueTexts(values);
}

function collectPenaltyValues(entry) {
    const penalties = [];
    const speedPenalty = toRoundedNumber(entry['速度倍']);
    const hitPenalty = toRoundedNumber(entry['命中倍']);

    if (speedPenalty !== null && speedPenalty !== 0) {
        penalties.push(`速度倍 ${speedPenalty}`);
    }
    if (hitPenalty !== null && hitPenalty !== 0) {
        penalties.push(`命中倍 ${hitPenalty}`);
    }

    return penalties;
}

function collectWeaponTraits(entry) {
    const rows = [];

    Object.entries(entry).forEach(([rawKey, rawValue]) => {
        const normalizedKey = String(rawKey ?? '')
            .replace(/[　\s]+/g, '')
            .replace(/＿/g, '_');
        const match = normalizedKey.match(/^武器(?:の)?補正(?:_(\d+)|(\d+))?$/);
        if (!match) return;

        const text = String(rawValue ?? '').trim();
        if (!text) return;

        const numeric = toNumber(text);
        if (numeric !== null && numeric === 0) return;

        const index = Number(match[1] ?? match[2] ?? 0);
        rows.push({ key: rawKey, index, text });
    });

    rows.sort((a, b) => {
        if (a.index !== b.index) return a.index - b.index;
        return a.key.localeCompare(b.key, 'ja');
    });

    return uniqueTexts(rows.map((row) => row.text));
}

function collectArmorTraits(entry) {
    const rows = [];

    Object.entries(entry).forEach(([rawKey, rawValue]) => {
        const normalizedKey = String(rawKey ?? '')
            .replace(/[　\s]+/g, '')
            .replace(/＿/g, '_');
        const match = normalizedKey.match(/^防具(?:の)?補正(?:_(\d+)|(\d+))?$/);
        if (!match) return;

        const text = String(rawValue ?? '').trim();
        if (!text) return;

        const numeric = toNumber(text);
        if (numeric !== null && numeric === 0) return;

        const index = Number(match[1] ?? match[2] ?? 0);
        rows.push({ key: rawKey, index, text });
    });

    rows.sort((a, b) => {
        if (a.index !== b.index) return a.index - b.index;
        return a.key.localeCompare(b.key, 'ja');
    });

    return uniqueTexts(rows.map((row) => row.text));
}

function normalizeDisplayValue(rawValue) {
    if (rawValue === null || rawValue === undefined) return null;
    const text = String(rawValue).trim();
    if (!text) return null;

    const numeric = toNumber(rawValue);
    if (numeric !== null) {
        return String(Math.round(numeric));
    }
    return text;
}

function buildGunStats(entry) {
    const result = [];

    const countRaw = normalizeDisplayValue(entry['回数']);
    const countNum = toNumber(entry['回数']);
    if (countRaw !== null) {
        const shouldShowCount = countNum !== null
            ? (countNum !== 0 && countNum !== 1)
            : (countRaw !== '0' && countRaw !== '1');
        if (shouldShowCount) {
            result.push({ label: '回数', value: countRaw });
        }
    }

    ['弾倉', 'リロード', '射出距離'].forEach((key) => {
        const raw = normalizeDisplayValue(entry[key]);
        if (raw === null) return;

        const numeric = toNumber(entry[key]);
        const shouldShow = numeric !== null ? numeric !== 0 : raw !== '0';
        if (!shouldShow) return;

        result.push({ label: key, value: raw });
    });

    return result;
}

function getCharacterDefenseValue() {
    const status = window.statusCharacter || {};
    return toNumber(status.防御) || 0;
}

function getCharacterAttackValue() {
    const status = window.statusCharacter || {};
    return toNumber(status.攻撃) || 0;
}

function formatFullPowerValue(fullPowerValue) {
    if (fullPowerValue === null) return null;
    if (Math.abs(fullPowerValue - 1) < 1e-9) return '100%';
    return String(Number(fullPowerValue.toFixed(4)));
}

function classifyItemCategory(typeLabel, item, reductions, resistances) {
    const normalizedType = String(typeLabel || '').trim();

    if (containsKindKeyword(normalizedType, WEAPON_KIND_KEYWORDS)) return 'weapon';
    if (containsKindKeyword(normalizedType, ARMOR_KIND_KEYWORDS)) return 'armor';
    if (containsKindKeyword(normalizedType, ITEM_KIND_KEYWORDS)) return 'item';

    const hasPhysicalPower = PHYSICAL_KEYS.some((key) => (toRoundedNumber(item[key]) || 0) > 0);
    if (hasPhysicalPower) return 'weapon';

    const hasArmorTrait = Object.keys(item || {}).some((rawKey) => {
        const normalizedKey = String(rawKey ?? '')
            .replace(/[　\s]+/g, '')
            .replace(/＿/g, '_');
        return /^防具(?:の)?補正(?:_(\d+)|(\d+))?$/.test(normalizedKey);
    });
    if (hasArmorTrait) return 'armor';

    const hasDefenseLike = toNumber(item.防御倍率) !== null || reductions.length > 0 || resistances.length > 0;
    if (hasDefenseLike) return 'armor';

    return 'item';
}

function buildItemView(item) {
    const itemName = getItemName(item);
    const itemLevel = getFirstNumber(item, ['Lv', 'レベル', '強化Lv', 'アイテムLv']);
    const mainTitle = itemLevel !== null && !/Lv\s*\d+/i.test(itemName)
        ? `${itemName} Lv${itemLevel}`
        : itemName;

    const subTitle = getFirstText(item, ['和名', 'フリガナ', '読み', 'nameSub']);
    const typeLabel = getFirstText(item, ['種類', 'タイプ', 'type']);
    const materialLabel = getFirstText(item, ['材質', '素材', '素材名', '材質名']);
    const typeLine = [typeLabel, materialLabel].filter(Boolean).join(' / ');

    const fullPower = getFirstFloat(item, ['全力', '全力倍率']);
    const fullPowerText = formatFullPowerValue(fullPower);
    const rawPower = getFirstNumber(item, ['威力', '攻撃力']);
    const physicalAmounts = PHYSICAL_KEYS.map((key) => toRoundedNumber(item[key]) || 0);
    const basePower = rawPower !== null ? rawPower : (Math.max(...physicalAmounts, 0) || null);
    const characterAttack = getCharacterAttackValue();
    const power = basePower !== null ? Math.round(basePower * (1 + characterAttack / 100)) : null;
    const physicalBreakdown = collectBreakdown(item, PHYSICAL_KEYS);
    const weaponPenetrationTexts = getWeaponPenetrationTexts(item);
    const weaponPenetrationInline = weaponPenetrationTexts.join(' ');
    const minimumDamage = getFirstNumber(item, ['最低ダメージ', '最低威力', '最低ダメ']);
    const damageBlur = minimumDamage !== null ? `100~${minimumDamage + 40}` : null;

    const explicitAttribute = getFirstNumber(item, ['属性']);
    const summedAttribute = sumByConfig(item, ELEMENT_DISPLAY_CONFIG);
    const attributeTotal = explicitAttribute !== null ? explicitAttribute : (summedAttribute > 0 ? summedAttribute : null);
    const attributeBreakdown = collectBreakdownByConfig(item, ELEMENT_DISPLAY_CONFIG);
    const statusTotalRaw = sumByConfig(item, STATUS_DISPLAY_CONFIG);
    const statusTotal = statusTotalRaw > 0 ? statusTotalRaw : null;
    const statusBreakdown = collectBreakdownByConfig(item, STATUS_DISPLAY_CONFIG);

    const defenseMultiplier = getFirstFloat(item, ['防御倍率']);
    const characterDefense = getCharacterDefenseValue();
    const guard = defenseMultiplier !== null
        ? Math.round(defenseMultiplier * (1 + characterDefense / 100))
        : getFirstNumber(item, ['ガード', '防御', '防御力']);
    const crRate = getFirstNumber(item, ['Cr率', 'CRI率', 'クリ率']);
    const crPower = getFirstNumber(item, ['Cr威力', 'CRI威力', 'クリ威力']);

    const reductionRows = collectNumericRowsBySuffix(item, '軽減', {
        order: REDUCTION_ORDER,
        excludeLabels: ['総合'],
    });
    const resistanceRows = collectNumericRowsBySuffix(item, '耐性', {
        order: RESISTANCE_ORDER,
        excludeLabels: ['総合'],
    });
    const reductions = formatNumericRows(reductionRows);
    const resistances = formatNumericRows(resistanceRows);
    const category = classifyItemCategory(typeLabel, item, reductions, resistances);
    const isWeapon = category === 'weapon';
    const isArmor = category === 'armor';
    const isItem = category === 'item';
    const isGun = containsKindKeyword(typeLabel, GUN_KIND_KEYWORDS);
    const gunStats = isGun ? buildGunStats(item) : [];
    const holdingAbilities = collectHoldingAbilities(item).slice(0, 8);
    const grantAbilities = collectGrantAbilities(item).slice(0, 6);
    const weaponTraits = collectWeaponTraits(item).slice(0, 3);
    const armorTraits = collectArmorTraits(item).slice(0, 3);
    const abilityValueRows = collectAbilityBonusRows(item, ABILITY_VALUE_FIELDS);
    const abilityValues = abilityValueRows.map((row) => row.text);
    const skillValueRows = collectOrderedValueRows(item, ARMOR_SKILL_KEYS);
    const bodyValueRows = collectOrderedValueRows(item, ARMOR_BODY_KEYS);
    const skillValues = skillValueRows.map((row) => row.text);
    const bodyValues = bodyValueRows.map((row) => row.text);
    const reductionCoreSet = new Set(REDUCTION_CORE_KEYS);
    const reductionDamageSet = new Set(REDUCTION_DAMAGE_KEYS);
    const resistanceAttributeSet = new Set(RESISTANCE_ATTRIBUTE_KEYS);
    const resistanceStatusSet = new Set(RESISTANCE_STATUS_KEYS);
    const resistanceCriticalSet = new Set(RESISTANCE_CRITICAL_KEYS);

    const armorPhysicalReduction = reductionRows.find((row) => row.label === '物理')?.value ?? null;
    const armorMagicReduction = reductionRows.find((row) => row.label === '魔法')?.value ?? null;

    const armorDamageReductionRows = reductionRows.filter((row) => reductionDamageSet.has(row.label));
    const armorElementReductionRows = reductionRows.filter(
        (row) => !reductionCoreSet.has(row.label) && !reductionDamageSet.has(row.label)
    );
    const armorDamageReductions = formatNumericRows(armorDamageReductionRows);
    const armorElementReductions = formatNumericRows(armorElementReductionRows);

    const armorAttributeResistanceRows = resistanceRows.filter((row) => resistanceAttributeSet.has(row.label));
    const armorStatusResistanceRows = resistanceRows.filter((row) => resistanceStatusSet.has(row.label));
    const armorCriticalResistanceRows = resistanceRows.filter((row) => resistanceCriticalSet.has(row.label));
    const armorOtherResistanceRows = resistanceRows.filter(
        (row) => !resistanceAttributeSet.has(row.label) && !resistanceStatusSet.has(row.label) && !resistanceCriticalSet.has(row.label)
    );

    // 未分類の耐性は表示漏れ防止のため属性耐性側へ寄せる
    const armorAttributeResistances = formatNumericRows([...armorAttributeResistanceRows, ...armorOtherResistanceRows]);
    const armorStatusResistances = formatNumericRows(armorStatusResistanceRows);
    const armorCriticalResistances = formatNumericRows(armorCriticalResistanceRows);

    const reductionTotal = toTotalOrNull(sumNumericRows(reductionRows));
    const resistanceTotal = toTotalOrNull(sumNumericRows(resistanceRows));
    const armorDamageReductionTotal = toTotalOrNull(sumNumericRows(armorDamageReductionRows));
    const armorElementReductionTotal = toTotalOrNull(sumNumericRows(armorElementReductionRows));
    const armorAttributeResistanceTotal = toTotalOrNull(sumNumericRows([...armorAttributeResistanceRows, ...armorOtherResistanceRows]));
    const armorStatusResistanceTotal = toTotalOrNull(sumNumericRows(armorStatusResistanceRows));
    const abilityTotal = toTotalOrNull(sumNumericRows(abilityValueRows));
    const skillTotal = toTotalOrNull(sumNumericRows(skillValueRows));
    const bodyTotal = toTotalOrNull(sumNumericRows(bodyValueRows));
    const penalties = collectPenaltyValues(item).slice(0, 4);

    const indexedTraits = collectIndexedText(item, '特性');
    const fallbackTraits = collectUnindexedText(item, '特性');
    const traits = uniqueTexts([...indexedTraits, ...fallbackTraits]).slice(0, 8);

    return {
        category,
        isWeapon,
        isArmor,
        isItem,
        isGun,
        subTitle,
        mainTitle,
        typeLine,
        fullPower,
        fullPowerText,
        power,
        physicalBreakdown,
        weaponPenetrationTexts,
        weaponPenetrationInline,
        damageBlur,
        attributeTotal,
        attributeBreakdown,
        statusTotal,
        statusBreakdown,
        guard,
        crRate,
        crPower,
        reductions,
        resistances,
        reductionTotal,
        resistanceTotal,
        armorPhysicalReduction,
        armorMagicReduction,
        armorDamageReductions,
        armorDamageReductionTotal,
        armorElementReductions,
        armorElementReductionTotal,
        armorAttributeResistances,
        armorAttributeResistanceTotal,
        armorStatusResistances,
        armorStatusResistanceTotal,
        armorCriticalResistances,
        gunStats,
        holdingAbilities,
        grantAbilities,
        weaponTraits,
        armorTraits,
        abilityValues,
        abilityTotal,
        skillValues,
        skillTotal,
        bodyValues,
        bodyTotal,
        penalties,
        traits,
        description: getItemDescription(item),
    };
}

function normalizeType(type) {
    return type === DETAIL_MODAL_TYPES.SKILL ? DETAIL_MODAL_TYPES.SKILL : DETAIL_MODAL_TYPES.ITEM;
}

function parseCompareLineFromText(text) {
    const raw = String(text ?? '').trim();
    if (!raw) return null;
    const match = raw.match(/^(.+?)\s+(-?\d+(?:\.\d+)?)$/);
    if (!match) return null;
    const label = String(match[1] || '').trim();
    const value = String(match[2] || '').trim();
    if (!label || !value) return null;
    return { label, value, detail: '' };
}

function isBoostLabel(label) {
    const normalized = String(label || '').replace(/[+\uFF0B]/g, '+').trim();
    return normalized.endsWith('+') || normalized === 'SIZ' || normalized === 'APP';
}

function getWeaponPenetrationTexts(entry) {
    const source = (entry && typeof entry === 'object') ? entry : {};
    const findNumberByAliases = (aliases = []) => {
        const direct = getFirstNumber(source, aliases);
        if (direct !== null) return direct;
        const normalizeKey = (key) => String(key ?? '')
            .replace(/[　\s]/g, '')
            .replace(/[＋+]/g, '+')
            .trim();
        const normalizedAliases = aliases.map(normalizeKey);
        for (const [rawKey, rawValue] of Object.entries(source)) {
            const normalizedRawKey = normalizeKey(rawKey);
            if (!normalizedAliases.includes(normalizedRawKey)) continue;
            const numeric = toRoundedNumber(rawValue);
            if (numeric !== null) return numeric;
        }
        return null;
    };

    const physicalPenetration = findNumberByAliases(['物理貫通', '物理貫通+']);
    const defensePenetration = findNumberByAliases(['防御貫通', '防御貫通+']);
    const parts = [];
    if (physicalPenetration !== null && physicalPenetration !== 0) {
        parts.push(`物理貫通${physicalPenetration > 0 ? '+' : ''}${physicalPenetration}`);
    }
    if (defensePenetration !== null && defensePenetration !== 0) {
        parts.push(`防御貫通${defensePenetration > 0 ? '+' : ''}${defensePenetration}`);
    }
    return parts;
}

function getItemCompareSummaryForEquip(item) {
    const source = (item && typeof item === 'object') ? item : {};
    const itemView = buildItemView(source);

    const holding = Array.isArray(itemView?.holdingAbilities) ? itemView.holdingAbilities.filter(Boolean) : [];
    // const grants = Array.isArray(itemView?.grantAbilities) ? itemView.grantAbilities.filter(Boolean) : [];
    const weaponTraits = Array.isArray(itemView?.weaponTraits) ? itemView.weaponTraits.filter(Boolean) : [];
    const armorTraits = Array.isArray(itemView?.armorTraits) ? itemView.armorTraits.filter(Boolean) : [];

    if (itemView?.isWeapon) {
        const findNumberByAliases = (entry, aliases = []) => {
            const direct = getFirstNumber(entry, aliases);
            if (direct !== null) return direct;
            const normalizeKey = (key) => String(key ?? '')
                .replace(/[　\s]/g, '')
                .replace(/[＋+]/g, '+')
                .trim();
            const normalizedAliases = aliases.map(normalizeKey);
            for (const [rawKey, rawValue] of Object.entries(entry || {})) {
                const normalizedRawKey = normalizeKey(rawKey);
                if (!normalizedAliases.includes(normalizedRawKey)) continue;
                const numeric = toRoundedNumber(rawValue);
                if (numeric !== null) return numeric;
            }
            return null;
        };
        const physicalPenetration = findNumberByAliases(source, ['物理貫通', '物理貫通+']);
        const defensePenetration = findNumberByAliases(source, ['防御貫通', '防御貫通+']);
        const penetrationParts = [];
        if (physicalPenetration !== null && physicalPenetration !== 0) {
            penetrationParts.push(`物理貫通${physicalPenetration > 0 ? '+' : ''}${physicalPenetration}`);
        }
        if (defensePenetration !== null && defensePenetration !== 0) {
            penetrationParts.push(`防御貫通${defensePenetration > 0 ? '+' : ''}${defensePenetration}`);
        }
        const penetrationText = penetrationParts.join(' ');
        const basePowerText = itemView.power !== null && itemView.power !== undefined
            ? String(itemView.power)
            : '-';
        const powerValueWithPenetration = (basePowerText !== '-' && penetrationText)
            ? `${basePowerText} ${penetrationText}`
            : basePowerText;

        const lines = [
            { label: '\u5168\u529B', value: itemView.fullPowerText || '-', detail: '' },
            {
                label: '\u5A01\u529B',
                value: powerValueWithPenetration,
                detail: Array.isArray(itemView.physicalBreakdown) && itemView.physicalBreakdown.length > 0
                    ? itemView.physicalBreakdown.join('  ')
                    : ''
            },
            {
                label: '\u5C5E\u6027',
                value: itemView.attributeTotal !== null && itemView.attributeTotal !== undefined ? String(itemView.attributeTotal) : '-',
                detail: Array.isArray(itemView.attributeBreakdown) && itemView.attributeBreakdown.length > 0
                    ? itemView.attributeBreakdown.join('  ')
                    : ''
            },
            {
                label: '\u72B6\u614B',
                value: itemView.statusTotal !== null && itemView.statusTotal !== undefined ? String(itemView.statusTotal) : '-',
                detail: Array.isArray(itemView.statusBreakdown) && itemView.statusBreakdown.length > 0
                    ? itemView.statusBreakdown.join('  ')
                    : ''
            },
            { label: '\u30AC\u30FC\u30C9', value: itemView.guard !== null && itemView.guard !== undefined ? String(itemView.guard) : '-', detail: '' },
            { label: 'Cr\u7387', value: itemView.crRate !== null && itemView.crRate !== undefined ? `${itemView.crRate}%` : '-', detail: '' },
            { label: 'Cr\u5A01\u529B', value: itemView.crPower !== null && itemView.crPower !== undefined ? `${itemView.crPower}%` : '-', detail: '' },
            { label: '\u4FDD\u6301\u80FD\u529B', value: holding.length > 0 ? holding.slice(0, 2).join(' / ') : '-', detail: '' },
            // { label: '\u4ED8\u4E0E\u80FD\u529B', value: grants.length > 0 ? grants.slice(0, 2).join(' / ') : '-', detail: '' },
            { label: '\u6B66\u5668\u7279\u6027', value: weaponTraits.length > 0 ? weaponTraits.slice(0, 2).join(' / ') : '-', detail: '' }
        ];

        return {
            name: getItemName(source),
            type: getFirstText(source, ['\u7A2E\u985E', '\u30BF\u30A4\u30D7', 'type']),
            lines
        };
    }

    if (itemView?.isArmor) {
        const parseAmountFromText = (text) => {
            const match = String(text || "").match(/(-?\d+(?:\.\d+)?)/);
            return match ? Number(match[1]) : 0;
        };
        const joinWithLimit = (items, limit = 3) => {
            const list = (Array.isArray(items) ? items : []).filter(Boolean);
            if (list.length === 0) return "";
            return list.slice(0, limit).join(" / ");
        };
        const joinAllWithSpaces = (items) => {
            const list = (Array.isArray(items) ? items : []).filter(Boolean);
            return list.length > 0 ? list.join("  ") : "";
        };

        const reductionMain =
            (itemView.armorPhysicalReduction ?? 0)
            + (itemView.armorMagicReduction ?? 0)
            + (itemView.armorDamageReductionTotal ?? 0)
            + (itemView.armorElementReductionTotal ?? 0);
        const reductionDetailList = [
            itemView.armorPhysicalReduction != null ? `物理 ${itemView.armorPhysicalReduction}` : "",
            itemView.armorMagicReduction != null ? `魔法 ${itemView.armorMagicReduction}` : "",
            ...((itemView.armorDamageReductions || [])),
            ...((itemView.armorElementReductions || []))
        ].filter(Boolean);
        const reductionDetailText = joinAllWithSpaces(reductionDetailList);

        const criticalResTotal = (itemView.armorCriticalResistances || []).reduce((sum, row) => (
            sum + parseAmountFromText(row)
        ), 0);
        const resistanceMain =
            (itemView.armorAttributeResistanceTotal ?? 0)
            + (itemView.armorStatusResistanceTotal ?? 0)
            + criticalResTotal;
        const resistanceDetailList = [
            ...((itemView.armorAttributeResistances || [])),
            ...((itemView.armorStatusResistances || [])),
            ...((itemView.armorCriticalResistances || []))
        ].filter(Boolean);
        const resistanceDetailText = joinAllWithSpaces(resistanceDetailList);

        const abilityRows = Array.isArray(itemView?.abilityValues) ? itemView.abilityValues : [];
        const boostLines = abilityRows
            .map(parseCompareLineFromText)
            .filter((line) => line && isBoostLabel(line.label));
        const boostMainText = boostLines.length > 0
            ? boostLines.slice(0, 2).map((line) => `${line.label} ${line.value}`).join(" / ")
            : "-";
        const boostDetailText = boostLines.length > 0
            ? boostLines.map((line) => `${line.label} ${line.value}`).join("  ")
            : "";
        const bodyRows = Array.isArray(itemView?.bodyValues) ? itemView.bodyValues : [];
        const bodyLines = bodyRows
            .map(parseCompareLineFromText)
            .filter((line) => line && line.label);
        const bodyMainText = bodyLines.length > 0
            ? bodyLines.slice(0, 2).map((line) => `${line.label} ${line.value}`).join(" / ")
            : "-";
        const bodyDetailText = bodyLines.length > 0
            ? bodyLines.map((line) => `${line.label} ${line.value}`).join("  ")
            : "";

        const penalties = Array.isArray(itemView?.penalties) ? itemView.penalties.filter(Boolean) : [];
        const penaltySummary = joinWithLimit(penalties, 2);
        const penaltyDetailText = joinAllWithSpaces(penalties);

        return {
            name: getItemName(source),
            type: getFirstText(source, ['\u7A2E\u985E', '\u30BF\u30A4\u30D7', 'type']),
            lines: [
                {
                    label: '\u8EFD\u6E1B',
                    value: reductionMain !== 0 ? String(reductionMain) : "-",
                    detail: reductionDetailText
                },
                {
                    label: '\u8010\u6027',
                    value: resistanceMain !== 0 ? String(resistanceMain) : "-",
                    detail: resistanceDetailText
                },
                {
                    label: '\u80FD\u529B\u4E0A\u6607',
                    value: boostMainText,
                    detail: boostDetailText
                },
                {
                    label: '\u8089\u4F53\u5024',
                    value: bodyMainText,
                    detail: bodyDetailText
                },
                {
                    label: '\u30DA\u30CA\u30EB\u30C6\u30A3',
                    value: penaltySummary || "-",
                    detail: penaltyDetailText
                }
            ]
        };
    }

    const abilityRows = Array.isArray(itemView?.abilityValues) ? itemView.abilityValues : [];
    const boostLines = abilityRows
        .map(parseCompareLineFromText)
        .filter((line) => line && isBoostLabel(line.label))
        .slice(0, 6);

    const extraLines = [];
    if (holding.length > 0) {
        extraLines.push({ label: '\u4FDD\u6301\u80FD\u529B', value: holding.slice(0, 2).join(' / '), detail: '' });
    }
    // if (grants.length > 0) {
    //     extraLines.push({ label: '\u4ED8\u4E0E\u80FD\u529B', value: grants.slice(0, 2).join(' / '), detail: '' });
    // }
    if (weaponTraits.length > 0) {
        extraLines.push({ label: '\u6B66\u5668\u7279\u6027', value: weaponTraits.slice(0, 2).join(' / '), detail: '' });
    }
    if (armorTraits.length > 0) {
        extraLines.push({ label: '\u9632\u5177\u7279\u6027', value: armorTraits.slice(0, 2).join(' / '), detail: '' });
    }

    const lines = [...boostLines, ...extraLines].slice(0, 8);

    return {
        name: getItemName(source),
        type: getFirstText(source, ['\u7A2E\u985E', '\u30BF\u30A4\u30D7', 'type']),
        lines: lines.length > 0 ? lines : [{ label: '\u4E0A\u6607', value: '\u306A\u3057', detail: '' }]
    };
}

function openDetailModal(payload = {}) {
    const {
        entry = null,
        sourceItems = null,
        title = '詳細',
        titleText: payloadTitleText = title,
        modalType: requestedType = DETAIL_MODAL_TYPES.ITEM,
    } = payload;

    const sourceList = collectEntries(sourceItems);
    const normalizedEntries = sourceList.length > 0 ? sourceList : collectEntries([entry]);

    entries.value = normalizedEntries;
    currentIndex.value = Math.max(0, normalizedEntries.indexOf(entry));
    modalType.value = normalizeType(requestedType);
    titleText.value = String(payloadTitleText || '詳細');
    resetHoverPreview();
    isOpen.value = true;
    document.body.classList.add('item-detail-modal-open');
}

function openItemDetailModal(item, sourceItems = null, title = '\u8A73\u7D30') {
    window.DebaglogSet?.('[DetailModal] open ITEM', {
        name: getItemName(item),
        type: getFirstText(item || {}, ['\u7A2E\u985E', '\u30BF\u30A4\u30D7', 'type']),
        title
    });

    openDetailModal({
        entry: item,
        sourceItems,
        titleText: title,
        modalType: DETAIL_MODAL_TYPES.ITEM,
    });
}

function openSkillDetailModal(skill, sourceSkills = null, title = '詳細') {
    openDetailModal({
        entry: skill,
        sourceItems: sourceSkills,
        titleText: title,
        modalType: DETAIL_MODAL_TYPES.SKILL,
    });
}

function closeModal() {
    const wasOpen = isOpen.value;
    resetHoverPreview();
    isOpen.value = false;
    document.body.classList.remove('item-detail-modal-open');
    if (wasOpen) {
        triggerPostModalInteractionGuard();
    }
}

function showNextItem() {
    if (entries.value.length <= 1) return;
    resetHoverPreview();
    currentIndex.value = (currentIndex.value + 1) % entries.value.length;
}

function showPrevItem() {
    if (entries.value.length <= 1) return;
    resetHoverPreview();
    const total = entries.value.length;
    currentIndex.value = (currentIndex.value - 1 + total) % total;
}

function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
        closeModal();
    }
}

function handleKeydown(event) {
    if (event.key === 'Escape') {
        closeModal();
    }
}

async function handleUnequip() {
    if (!canUnequip.value || !currentEntry.value) return;
    await window.onDetailModalUnequip(currentEntry.value);
    closeModal();
}

async function handleEquip() {
    if (!canEquip.value || !currentEntry.value) return;
    const equipped = await window.onDetailModalEquip(currentEntry.value);
    if (equipped === false) return;
    closeModal();
}

async function handleMoveToInventory() {
    if (!canMoveToInventory.value || !currentEntry.value) return;
    await window.onDetailModalMoveToInventory(currentEntry.value);
    closeModal();
}

async function handleMoveToStorage() {
    if (!canMoveToStorage.value || !currentEntry.value) return;
    await window.onDetailModalMoveToStorage(currentEntry.value);
    closeModal();
}

onMounted(() => {
    window.openDetailModal = openDetailModal;
    window.openItemDetailModal = openItemDetailModal;
    window.openSkillDetailModal = openSkillDetailModal;
    window.closeItemDetailModal = closeModal;
    window.getItemCompareSummaryForEquip = getItemCompareSummaryForEquip;
    document.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
    if (window.openDetailModal === openDetailModal) delete window.openDetailModal;
    if (window.openItemDetailModal === openItemDetailModal) delete window.openItemDetailModal;
    if (window.openSkillDetailModal === openSkillDetailModal) delete window.openSkillDetailModal;
    if (window.closeItemDetailModal === closeModal) delete window.closeItemDetailModal;
    if (window.getItemCompareSummaryForEquip === getItemCompareSummaryForEquip) delete window.getItemCompareSummaryForEquip;
    document.removeEventListener('keydown', handleKeydown);
    document.body.classList.remove('item-detail-modal-open');
});
</script>

<style scoped>
.item-detail-modal {
    --modal-font-scale: 1.3;
    position: fixed;
    inset: 0;
    z-index: 2600;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 8px;
    background-color: rgba(0, 0, 0, 0.58);
}

.item-detail-modal.is-open {
    display: flex;
}

.item-detail-modal-content {
    width: 720px;
    height: 1150px;
    max-width: 720px;
    max-height: 1150px;
    --penalty-font-size: calc(18px * var(--modal-font-scale));
    font-size: calc(16px * var(--modal-font-scale));
    display: flex;
    flex-direction: column;
    border-radius: 10px;
    overflow: hidden;
    border: 2px solid #d8b264;
    background: #2f2f2f;
    box-shadow: 0 14px 30px rgba(0, 0, 0, 0.45);
}

.item-detail-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    background: #3b3b3b;
    border-bottom: 1px solid #555;
}

.item-detail-modal-title {
    margin: 0;
    color: #f4d48f;
    font-size: calc(18px * var(--modal-font-scale));
    font-weight: 700;
}

.item-detail-header-right {
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.item-detail-modal-progress {
    color: #e9cf95;
    font-size: calc(13px * var(--modal-font-scale));
    font-weight: 700;
    letter-spacing: 0.02em;
}

.item-detail-modal-close {
    width: 32px;
    height: 32px;
    border: 1px solid #a08a56;
    border-radius: 7px;
    background: #494949;
    color: #f4d48f;
    font-size: calc(18px * var(--modal-font-scale));
    cursor: pointer;
}

.item-detail-modal-close:hover {
    background: #585858;
}

.item-detail-modal-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 14px;
    background: #353535;
    border-bottom: 1px solid #4a4a4a;
}

.item-detail-toolbar-left {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-right: auto;
}

.item-detail-modal-type-badge {
    border: 1px solid #8d7a49;
    border-radius: 999px;
    padding: 3px 10px;
    font-size: calc(12px * var(--modal-font-scale));
    font-weight: 700;
    color: #f0ce87;
    background: #2f2f2f;
}

.item-detail-nav-buttons {
    display: inline-flex;
    gap: 8px;
}

.item-detail-next-button {
    border: 1px solid #9d8650;
    border-radius: 8px;
    padding: 5px 14px;
    background: #4e4e4e;
    color: #f4d48f;
    font-size: calc(14px * var(--modal-font-scale));
    font-weight: 700;
    cursor: pointer;
}

.item-detail-next-button:disabled {
    opacity: 0.45;
    cursor: default;
}

.item-detail-modal-body {
    flex: 1;
    overflow: hidden;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: #2f2f2f;
    color: #f2d48f;
}

.item-static-top {
    flex: 0 0 auto;
}

.item-scroll-area {
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
    padding-right: 2px;
    scrollbar-width: thin;
    scrollbar-color: var(--app-scrollbar-thumb, #90aace) var(--app-scrollbar-track, #eaf1fa);
}

.item-hero-subtitle {
    text-align: center;
    font-size: calc(15px * var(--modal-font-scale));
    font-weight: 600;
    color: #c7c7c7;
    margin-top: 2px;
}

.item-hero-title {
    text-align: center;
    font-size: calc(38px * var(--modal-font-scale));
    font-weight: 800;
    line-height: 1.15;
    color: #f1c35f;
    text-shadow: 0 1px 0 #00000066;
}

.item-unequip-button {
    display: block;
    width: 100%;
    margin: 10px 0 8px;
    padding: 8px 12px;
    border: 1px solid #b68e5f;
    border-radius: 7px;
    background: #c17272;
    color: #fff0e2;
    font-size: calc(16px * var(--modal-font-scale));
    font-weight: 700;
    cursor: pointer;
}

.item-equip-button {
    display: block;
    width: 100%;
    margin: 10px 0 8px;
    padding: 8px 12px;
    border: 1px solid #78925a;
    border-radius: 7px;
    background: #6e9360;
    color: #edf7e8;
    font-size: calc(16px * var(--modal-font-scale));
    font-weight: 700;
    cursor: pointer;
}

.item-equip-button--toolbar {
    width: auto;
    margin: 0;
    padding: 5px 10px;
    font-size: calc(13px * var(--modal-font-scale));
    border-radius: 8px;
    line-height: 1.2;
}

.item-equip-button:disabled {
    opacity: 0.55;
    cursor: default;
}

.item-transfer-button {
    display: block;
    width: 100%;
    margin: 10px 0 8px;
    padding: 8px 12px;
    border: 1px solid #5f8297;
    border-radius: 7px;
    background: #5f8398;
    color: #ebf4fb;
    font-size: calc(16px * var(--modal-font-scale));
    font-weight: 700;
    cursor: pointer;
}

.item-transfer-button--toolbar {
    width: auto;
    margin: 0;
    padding: 5px 10px;
    font-size: calc(13px * var(--modal-font-scale));
    border-radius: 8px;
    line-height: 1.2;
}

.item-transfer-button:disabled {
    opacity: 0.55;
    cursor: default;
}

.item-unequip-button--toolbar {
    width: auto;
    margin: 0;
    padding: 5px 10px;
    font-size: calc(13px * var(--modal-font-scale));
    border-radius: 8px;
    line-height: 1.2;
}

.item-unequip-button:disabled {
    opacity: 0.55;
    cursor: default;
}

.item-type-line {
    text-align: center;
    font-size: calc(16px * var(--modal-font-scale));
    font-weight: 700;
    color: #d8d8d8;
    margin-bottom: 8px;
}

.item-stat-card,
.item-description-card {
    border: 1px solid #555;
    border-radius: 8px;
    background: #3a3a3a;
    margin-bottom: 6px;
    padding: 8px 10px;
}

.item-two-col {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 6px;
    margin-bottom: 6px;
}

.item-two-col > .item-stat-card {
    margin-bottom: 0;
}

.item-two-col > .item-stat-card.is-only {
    grid-column: 1 / -1;
}

.item-stat-row {
    display: flex;
    align-items: baseline;
    gap: 4px;
    font-size: calc(21px * var(--modal-font-scale));
    line-height: 1.2;
}

.item-stat-label {
    color: #efd08a;
    font-weight: 700;
}

.item-stat-value {
    color: #efb15f;
    font-weight: 800;
}

.item-stat-inline-meta {
    margin-left: 8px;
    color: #e9cf95;
    font-size: calc(15px * var(--modal-font-scale));
    font-weight: 700;
    line-height: 1.2;
}

.item-stat-inline-gap {
    width: 10px;
    flex: 0 0 10px;
}

.item-stat-sub {
    margin-top: 4px;
    color: #d6d6d6;
    font-size: calc(18px * var(--modal-font-scale));
    line-height: 1.35;
    white-space: pre-wrap;
    word-break: break-word;
}

.item-stat-list {
    display: inline-block;
    margin-top: 4px;
    margin-left: 0.8em;
    margin-right: 10px;
    color: #e2e2e2;
    font-size: calc(18px * var(--modal-font-scale));
    line-height: 1.3;
    white-space: nowrap;
}

.holding-stat-list {
    font-size: calc(18px * var(--modal-font-scale));
}

.item-stat-inline-list {
    margin-top: 4px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px 10px;
}

.item-stat-inline-item {
    color: #e2e2e2;
    line-height: 1.3;
}

.penalty-inline-list .item-stat-inline-item {
    font-size: var(--penalty-font-size);
    font-weight: 700;
}

.penalty-row {
    font-size: var(--penalty-font-size);
}

.penalty-row .item-stat-label {
    font-size: var(--penalty-font-size);
}

.penalty-inline-list {
    flex-wrap: nowrap;
    overflow-x: auto;
    white-space: nowrap;
    gap: 8px 12px;
    padding-bottom: 2px;
    scrollbar-width: thin;
    scrollbar-color: var(--app-scrollbar-thumb, #90aace) var(--app-scrollbar-track, #eaf1fa);
}

.penalty-inline-list .item-stat-inline-item {
    flex: 0 0 auto;
}

.item-skill-picks {
    gap: 8px;
}

.item-skill-link {
    border: 1px solid #6d6d6d;
    border-radius: 6px;
    padding: 2px 8px;
    background: #4a4a4a;
    color: #f1deb4;
    font-size: calc(18px * var(--modal-font-scale));
    font-weight: 700;
    line-height: 1.25;
    cursor: pointer;
}

.item-skill-link:hover {
    border-color: #c6a568;
    background: #565656;
}

.item-skill-hover-panel {
    position: fixed;
    z-index: 2800;
    width: 480px;
    max-height: 360px;
    overflow: auto;
    border: 1px solid #8f7442;
    border-radius: 10px;
    padding: 10px 12px;
    background: rgba(34, 34, 34, 0.96);
    box-shadow: 0 8px 22px rgba(0, 0, 0, 0.45);
    color: #f0dbab;
    pointer-events: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--app-scrollbar-thumb, #90aace) var(--app-scrollbar-track, #eaf1fa);
}

.item-scroll-area::-webkit-scrollbar,
.item-skill-hover-panel::-webkit-scrollbar {
    width: var(--app-scrollbar-size, 10px);
}

.item-scroll-area::-webkit-scrollbar-track,
.item-skill-hover-panel::-webkit-scrollbar-track {
    background: var(--app-scrollbar-track, #eaf1fa);
    border-radius: 999px;
}

.item-scroll-area::-webkit-scrollbar-thumb,
.item-skill-hover-panel::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, var(--app-scrollbar-thumb-start, #b3c8e2) 0%, var(--app-scrollbar-thumb, #90aace) 100%);
    border: 2px solid var(--app-scrollbar-thumb-border, #eaf1fa);
    border-radius: 999px;
}

.item-scroll-area::-webkit-scrollbar-thumb:hover,
.item-skill-hover-panel::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, var(--app-scrollbar-thumb-hover-start, #9fb9d8) 0%, var(--app-scrollbar-thumb-hover, #7e99bf) 100%);
}

.penalty-inline-list::-webkit-scrollbar {
    height: var(--app-scrollbar-size, 10px);
}

.penalty-inline-list::-webkit-scrollbar-track {
    background: var(--app-scrollbar-track, #eaf1fa);
    border-radius: 999px;
}

.penalty-inline-list::-webkit-scrollbar-thumb {
    background: linear-gradient(90deg, var(--app-scrollbar-thumb-start, #b3c8e2) 0%, var(--app-scrollbar-thumb, #90aace) 100%);
    border: 1px solid var(--app-scrollbar-thumb-border, #eaf1fa);
    border-radius: 999px;
}

.penalty-inline-list::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(90deg, var(--app-scrollbar-thumb-hover-start, #9fb9d8) 0%, var(--app-scrollbar-thumb-hover, #7e99bf) 100%);
}

.item-skill-hover-title {
    font-size: calc(27px * var(--modal-font-scale));
    font-weight: 800;
    color: #ffd58b;
    margin-bottom: 8px;
    line-height: 1.25;
    word-break: break-word;
}

.item-skill-hover-loading,
.item-skill-hover-missing {
    font-size: calc(22px * var(--modal-font-scale));
    color: #d9d9d9;
}

.item-skill-hover-line {
    font-size: calc(22px * var(--modal-font-scale));
    line-height: 1.4;
    color: #f2f2f2;
    margin-bottom: 5px;
}

.item-skill-hover-desc {
    margin-top: 6px;
    border-top: 1px solid #575757;
    padding-top: 8px;
    font-size: calc(22px * var(--modal-font-scale));
    line-height: 1.45;
    color: #dddddd;
    white-space: pre-wrap;
    word-break: break-word;
}

.item-description-card {
    color: #e8e8e8;
    font-size: calc(15px * var(--modal-font-scale));
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
}

.fallback-caption {
    color: #d6d6d6;
    font-size: calc(15px * var(--modal-font-scale));
    margin-bottom: 8px;
}

.fallback-body {
    color: #f1e4c1;
    font-size: calc(16px * var(--modal-font-scale));
    line-height: 1.55;
    white-space: pre-wrap;
    word-break: break-word;
}

:global(body.item-detail-modal-open) {
    overflow: hidden;
}
</style>
