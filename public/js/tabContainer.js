// 基礎値と上昇値のデータ保持
let baseValues = {};
let increaseValues = {};

let baseResistances = {};
let increaseResistances = {};

let baseSkills = {};
let increaseSkills = {};

let baseBodys = {};
let bodyType = {};

let increaseBodys = {};

let isTotalView = true;

let diceLog = []; // ダイス結果のログ
let rollCount = 0; // ダイスを振った回数を記録


// 基本ステータスと耐性、技能の設定
async function displayBasicStatus(selectedCharacter) {
    window.DebaglogSet?.("基本ステータスと耐性、技能の設定 : ", selectedCharacter)
    baseValues = {};
    increaseValues = {};

    baseResistances = {};
    increaseResistances = {};

    baseSkills = {};
    increaseSkills = {};

    baseBodys = {};
    increaseBodys = {};

    bodyType = selectedCharacter.stats.bodyType[0]
    // ステータスの設定
    displaySum.forEach(stat => {
        baseValues[stat] = (stat === "SIZ")
            ? Math.max(parseInt(selectedCharacter.stats.baseStats[stat] || 0), parseInt(selectedCharacter.stats.levelStats[stat] || 0))
            : parseInt(selectedCharacter.stats.baseStats[stat] || 0) + parseInt(selectedCharacter.stats.levelStats[stat] || 0);

        increaseValues[stat] = parseInt(selectedCharacter.itemBonuses.stats[stat + "+"] || 0) + parseInt(selectedCharacter.skillBonuses[stat] || 0);
    });

    window.DebaglogSet?.("ステータスの設定 : ", baseValues, increaseValues, calculateCorrection(parseInt(baseValues.SIZ + increaseValues.SIZ) ))

    // 耐性の設定
    resistances.forEach(resistance => {
        baseResistances[resistance] = parseInt(selectedCharacter.stats.resistances[resistance] || 0);
        increaseResistances[resistance] = parseInt(selectedCharacter.itemBonuses.stats[resistance] || 0) + parseInt(selectedCharacter.skillBonuses[resistance] || 0);
    });

    // 技能の設定
    talents.forEach(skill => {
        baseSkills[skill] = parseInt(selectedCharacter.stats.skillValues[skill] || 0);
        increaseSkills[skill] = parseInt(selectedCharacter.itemBonuses.stats[skill] || 0) + parseInt(selectedCharacter.skillBonuses[skill] || 0);
    });

    // 肉体displayBodyの設定
    displayBody.forEach(skill => {
        baseBodys[skill] = parseInt(selectedCharacter.stats.bodyAttributes[skill] || 0);
        increaseBodys[skill] = parseInt(selectedCharacter.itemBonuses.stats[skill] || 0) + parseInt(selectedCharacter.skillBonuses[skill] || 0);
    });

    // デフォルト値を設定して計算
    const baseSIZ = parseInt(baseBodys['SIZ'] || 170); // baseBodys['SIZ'] が undefined の場合 170
    const increaseSIZ = parseInt(increaseBodys['SIZ'] || 0); // increaseBodys['SIZ'] が undefined の場合 0
    const base足 = parseInt(baseBodys['足'] || 0); // baseBodys['足'] が undefined の場合 0
    const increase足 = parseInt(increaseBodys['足'] || 0); // increaseBodys['足'] が undefined の場合 0

    // デバッグログ: デフォルト値設定後の各値を確認
    window.DebaglogSet?.("DEBUG: baseBodys['SIZ']:", baseBodys['SIZ'], "-> 使用値:", baseSIZ);
    window.DebaglogSet?.("DEBUG: increaseBodys['SIZ']:", increaseBodys['SIZ'], "-> 使用値:", increaseSIZ);
    window.DebaglogSet?.("DEBUG: baseBodys['足']:", baseBodys['足'], "-> 使用値:", base足);
    window.DebaglogSet?.("DEBUG: increaseBodys['足']:", increaseBodys['足'], "-> 使用値:", increase足);

    // 合計値を計算
    const SIZSum = baseSIZ + increaseSIZ;
    const 足Sum = base足 + increase足;

    // デバッグログ: 合計値を確認
    window.DebaglogSet?.("DEBUG: SIZ合計 (baseSIZ + increaseSIZ):", SIZSum);
    window.DebaglogSet?.("DEBUG: 足合計 (base足 + increase足):", 足Sum);

    // 基本移動速度を計算 基礎値にするなら 3.5
    const movementSpeedBase = SIZSum / 30 + 10 + (7.5 + 足Sum) + (baseValues.速度 / 5 * 1) ;

    // デバッグログ: 基本移動速度を確認
    window.DebaglogSet?.("DEBUG: 基本移動速度 (SIZSum / 30 + 10 + (7.5 + 足Sum)):", movementSpeedBase);

    // 増加ボーナスのデフォルト値を設定して計算
    const itemBonus移動 = parseInt(selectedCharacter.itemBonuses.stats['移動'] || 0); // デフォルト 0
    const skillBonus移動 = parseInt(selectedCharacter.skillBonuses['移動'] || 0); // デフォルト 0

    // デバッグログ: 各ボーナスを確認
    window.DebaglogSet?.("DEBUG: itemBonuses['移動']:", selectedCharacter.itemBonuses.stats['移動'], "-> 使用値:", itemBonus移動);
    window.DebaglogSet?.("DEBUG: skillBonuses['移動']:", selectedCharacter.skillBonuses['移動'], "-> 使用値:", skillBonus移動);

    // 増加ボーナス合計を計算
    const movementSpeedIncrease = itemBonus移動 + skillBonus移動;

    // デバッグログ: 増加ボーナスを確認
    window.DebaglogSet?.("DEBUG: 増加ボーナス (itemBonus移動 + skillBonus移動):", movementSpeedIncrease);

    // 最終的な移動速度を設定
    baseBodys['移動'] = parseInt(movementSpeedBase);
    increaseBodys['移動'] = parseInt(movementSpeedIncrease);

    // デバッグログ: 移動速度設定の最終結果
    window.DebaglogSet?.("移動速度の設定完了:");
    window.DebaglogSet?.("  基本移動速度 (baseBodys['移動']):", baseBodys['移動']);
    window.DebaglogSet?.("  増加ボーナス (increaseBodys['移動']):", increaseBodys['移動']);
    // +(速度/5)*3.5)

    window.DebaglogSet?.("基礎値と上昇値設定:", baseValues, increaseValues, baseResistances, increaseResistances, baseSkills, increaseSkills, baseBodys, increaseBodys);

    const sizBonus = calculateCorrection(parseInt(baseValues.SIZ + increaseValues.SIZ))

    if (sizBonus > 0) {
        const attackBonus = parseInt(baseValues.攻撃 * (sizBonus / 100));
        const speedPenalty = parseInt(baseValues.速度 * (sizBonus / 100));
        const intimidationBonus = parseInt((sizBonus * 3.5));
        const stealthPenalty = parseInt((sizBonus * 3.5));
        const armorBonus = parseInt(sizBonus * 3.5);
    
        window.DebaglogSet?.("攻撃ボーナス:", attackBonus);
        window.DebaglogSet?.("速度ペナルティ:", speedPenalty);
        window.DebaglogSet?.("威圧ボーナス:", intimidationBonus);
        window.DebaglogSet?.("隠密ペナルティ:", stealthPenalty);
        window.DebaglogSet?.("外皮ボーナス:", armorBonus);

        // increaseValues.HP += attackBonus;
        increaseValues.攻撃 += attackBonus;
        increaseValues.速度 -= speedPenalty;
        increaseSkills.威圧 += intimidationBonus;
        increaseSkills.隠密 -= stealthPenalty;
        increaseBodys.外皮 += armorBonus;
    
        // 結果をログに出力
        window.DebaglogSet?.("更新後の増加値:");
        window.DebaglogSet?.("HP:", increaseValues.HP);
        window.DebaglogSet?.("攻撃:", increaseValues.攻撃);
        window.DebaglogSet?.("速度:", increaseValues.速度);
        window.DebaglogSet?.("威圧:", increaseSkills.威圧);
        window.DebaglogSet?.("隠密:", increaseSkills.隠密);
        window.DebaglogSet?.("外皮:", increaseBodys.外皮);
    }

    // 外皮、外郭装甲、鋼体の軽減値を計算し、四捨五入する
    increaseBodys.外皮 = Math.round((increaseBodys.外皮 * increaseBodys.外皮 / 2000 * 0.3));
    increaseBodys.外郭装甲 = Math.round((increaseBodys.外郭装甲 * increaseBodys.外郭装甲 / 2000 * 1.1));
    increaseBodys.鋼体 = Math.round((increaseBodys.鋼体 / 25 * 1.1));

    // 肉体部位の威力設定
    const calculatedPowers = calculatePower(displayBody, displaySum);
    window.DebaglogSet?.("肉体部位の威力設定　:", calculatedPowers);
    await updateAllAttackOptions()

    const result = { ...baseValues, ...baseSkills }; // baseValues をコピー
    const increase = { ...increaseValues, ...increaseSkills }
    for (const key in increase) {
      result[key] = (result[key] || 0) + increase[key];
    }
    result['名前'] = selectedCharacter.name
    result['Lv'] = selectedCharacter.stats.allLv
    result['Ef'] = selectedCharacter.stats.allEf

    // 選択キャラのデータを入れる
    window.DebaglogSet?.("合計結果 :",  result);
    statusCharacter = result
    
    // 攻撃手段を変更
    await populateAttackOptions(attackOptions);


}
// 外皮、外郭装甲、鋼体に基づいて軽減データを生成する関数
function generateResistances(type, value) {
    // 各タイプごとのルール設定
    const rules = {
        "外郭装甲": {
            "物理軽減": value / 10,"魔法軽減": value / 10,"遠隔軽減": value / 20,
            "切断軽減": value / 20,"貫通軽減": value / 20,"打撃軽減": value / 20,
            "炎軽減": value / 20,"氷軽減": value / 20,"雷軽減": value / 20,"酸軽減": value / 20,
            "音波軽減": value / 20,"闇軽減": value / 20,"光軽減": value / 20
        },
        "外皮": {
            "物理軽減": value / 10,"魔法軽減": value / 10,"遠隔軽減": value / 20,
            "切断軽減": value / 20,"貫通軽減": value / 20,"打撃軽減": value / 20,
            "炎軽減": value / 20,"氷軽減": value / 20,"雷軽減": value / 20,"酸軽減": value / 20,
            "音波軽減": value / 20,"闇軽減": value / 20,"光軽減": value / 20
        },
        "鋼体": {
            "物理軽減": value / 10,"魔法軽減": value / 10,"遠隔軽減": value / 20,
            "切断軽減": value / 20,"貫通軽減": value / 20,"打撃軽減": value / 20,
            "炎軽減": value / 20,"氷軽減": value / 20,"雷軽減": value / 20,"酸軽減": value / 20,
            "音波軽減": value / 20,"闇軽減": value / 20,"光軽減": value / 20
        }
    };

    // 指定されたタイプが存在する場合、対応する軽減データを返す
    if (rules[type]) {
        return rules[type];
    } else {
        throw new Error(`Unknown type: ${type}`);
    }
}
function calculateCorrection(value) {
    if (value >= 180) {
        return value / 50 + 8;
    } else if (value <= 150) {
        return -(160 - value) / 3;
    } else {
        return 0;
    }
}
// updateAllAttackOptions(calculatedPowers) 
// function updateAllAttackOptions() {
//     const powerData = calculatePower();
//     for (const [key, value] of Object.entries(powerData)) {
//         updateAttackOption(key, { 威力: value });
//     }
// }

const BODY_ATTACK_OPTION_PROFILES = {
    素手: { 全力: 95, 切断: 60, 貫通: 70, 打撃: 100, ガード: 90, 最低ダメージ: 10, Cr率: 10, Cr威力: 125, 速度倍: 0, 命中倍: -5, 攻撃回数: 2 },
    角:   { 全力: 105, 切断: 0,  貫通: 110,打撃: 90,   ガード: 60, 最低ダメージ: 7,  Cr率: 10, Cr威力: 125, 速度倍: -3, 命中倍: -3, 攻撃回数: 1 },
    牙:   { 全力: 110, 切断: 95, 貫通: 100,打撃: 60,  ガード: 60, 最低ダメージ: 30, Cr率: 5,  Cr威力: 135, 速度倍: -15,命中倍: -15,攻撃回数: 1 },
    爪:   { 全力: 100, 切断: 100,貫通: 85, 打撃: 20,  ガード: 85, 最低ダメージ: 10, Cr率: 15, Cr威力: 125, 速度倍: 0,  命中倍: -5, 攻撃回数: 2 },
    羽:   { 全力: 85,  切断: 0,  貫通: 0,  打撃: 55,  ガード: 55, 最低ダメージ: 5,  Cr率: 5,  Cr威力: 120, 速度倍: -1, 命中倍: 0,  攻撃回数: 2 },
    尾:   { 全力: 95,  切断: 0,  貫通: 0,  打撃: 90,  ガード: 65, 最低ダメージ: 5,  Cr率: 10, Cr威力: 115, 速度倍: -5, 命中倍: -5, 攻撃回数: 1 }
};

function scaleByPercent(baseValue, percent) {
    const base = Number(baseValue) || 0;
    const rate = (Number(percent) || 0) / 100;
    return Math.max(0, Math.round(base * rate));
}

function buildBodyAttackSummary(part, basePower) {
    const profile = BODY_ATTACK_OPTION_PROFILES[part];
    if (!profile) return null;

    const summary = {
        名前: part,
        種類: part,
        攻撃手段: part,
        全力: profile.全力,
        切断: scaleByPercent(basePower, profile.切断),
        貫通: scaleByPercent(basePower, profile.貫通),
        打撃: scaleByPercent(basePower, profile.打撃),
        防御性能: scaleByPercent(basePower, profile.ガード),
        防御倍率: scaleByPercent(basePower, profile.ガード),
        射撃: 0,
        最低ダメージ: profile.最低ダメージ,
        Cr率: profile.Cr率,
        Cr威力: profile.Cr威力,
        速度倍: profile.速度倍,
        命中倍: profile.命中倍,
        攻撃回数: profile.攻撃回数,
        // calculatePower 側で攻撃/防御ステータスを織り込んでいるため、
        // skillContainer 側での再乗算を避けるためのフラグ。
        攻撃判定適用済み: 1,
        防御判定適用済み: 1
    };

    return summary;
}

// 肉体部位の威力設定
function calculatePower() {
    const defenseInfluence = ((baseBodys["鋼体"] || 0) / 500) * 0.15; // 鋼体による影響を15%に調整
    const attackInt = (baseValues.攻撃 + increaseValues.攻撃);
    const defenseInt = (baseValues.防御 + increaseValues.防御);

    // 属性の値を取得する関数、存在しない場合は0を返す
    const getBodyValue = (attribute) => (baseBodys[attribute] || 0) + (increaseBodys[attribute] || 0);

    // 一般的な属性の威力・防御を計算
    const calculateAttributes = (baseValue, attribute, attackMultiplier, defenseMultiplier) => {
        const bodyValue = getBodyValue(attribute);
        if (bodyValue === 0) return { 威力: 0, 防御: 0 }; // 値が0の場合は威力・防御を0に設定

        return {
            威力: Math.floor(Math.round((baseValue + (bodyValue / 10) * attackMultiplier) * (1 + attackInt / 100 + defenseInfluence))),
            防御: Math.floor(Math.round((baseValue + (bodyValue / 10) * defenseMultiplier) * (1 + defenseInt / 100 + defenseInfluence)))
        };
    };

    // 特殊な計算が必要な「素手」の威力・防御を計算（初期値10）
    const calculateHandAttributes = () => {
        const bodyValue = Math.max(
            getBodyValue("外皮") * 0.75, 
            getBodyValue("外殻") * 0.9, 
            getBodyValue("鋼体"), 100
        ) || 100; // 数値がない場合の初期値を10に設定

        return {
            威力: Math.floor(Math.round((4 + (bodyValue / 10) * 0.8) * (1 + attackInt / 100 + defenseInfluence))),
            防御: Math.floor(Math.round((4 + (bodyValue / 10) * 0.8) * (1 + defenseInt / 100 + defenseInfluence)))
        };
    };

    return {
        角: calculateAttributes(5, "角", 1.0, 1.1),
        牙: calculateAttributes(5, "牙", 1.0, 1.0),
        爪: calculateAttributes(5, "爪", 0.9, 0.7),
        羽: calculateAttributes(5, "羽", 0.7, 0.9),
        尾: calculateAttributes(5, "尾", 0.85, 0.6),
        素手: calculateHandAttributes() // 特殊な計算を適用
    };
}




// 各部位のデータを攻撃手段に更新
async function updateAllAttackOptions() {
    const powerData = calculatePower();

    Object.keys(powerData).forEach((part) => {
        const data = powerData[part];
        const basePower = Number(data?.威力) || 0;
        const summary = buildBodyAttackSummary(part, basePower);
        const guard = summary ? Number(summary.防御性能) || 0 : (Number(data?.防御) || 0);
        updateAttackOption(part, {
            威力: basePower,
            防御: guard,
            総合: summary
        });
    });

    console.log
}


// 攻撃手段を更新する
// updateAttackOption("武器1", { "label": "新しい武器1", "威力": 100, "属性": 60, "防御": 70 });
// updateAttackOption("爪", { "威力": 50 }); // 部分的な更新も可能
function updateAttackOption(value, newData) {
    // valueプロパティが一致するオブジェクトを検索

    window.DebaglogSet?.("updateAttackOption 攻撃手段を更新する :", value, newData )

    const option = attackOptions.find(option => option.value === value);

    window.DebaglogSet?.("updateAttackOption option :", option )

    // 該当オブジェクトがあれば、プロパティを更新
    if (option) {
        option.label = newData.label || option.label;
        option.威力 = newData.威力 !== undefined ? newData.威力 : option.威力;
        option.属性 = newData.属性 !== undefined ? newData.属性 : option.属性;
        option.防御 = newData.防御 !== undefined ? newData.防御 : option.防御;
        if (newData.総合 !== undefined) {
            option.総合 = newData.総合;
        }
    } else {
        window.DebaglogSet?.(`Error: ${value} のデータが見つかりません`);
    }
}

function applyAdaptiveLabelFontSize(labelElement, text) {
    if (!labelElement) return;

    const textLength = Array.from(String(text || "")).length;
    let fontSize = 18;

    if (textLength >= 11) {
        fontSize = 12;
    } else if (textLength >= 9) {
        fontSize = 13;
    } else if (textLength >= 7) {
        fontSize = 15;
    } else if (textLength >= 5) {
        fontSize = 16;
    }

    labelElement.style.fontSize = `${fontSize}px`;
}

// ステータス、耐性、技能をカテゴリごとに表示する関数
function displayStats(containerId, baseData, increaseData, bodyType) {
    const container = document.getElementById(containerId);

    if (!container) {
        console.error(`Error: コンテナ '${containerId}' が見つかりません`);
        return;
    }

    container.innerHTML = "";

    const table = document.createElement("table");
    table.className = "stats-table";
    const tableBody = document.createElement("tbody");

    let allStatsBase = 0;
    const statRows = [];

    Object.keys(baseData).forEach(stat => {
        const bodyValue = (bodyType && stat in bodyType) ? Number(bodyType[stat]) || 0 : 0;
        const baseValue = Number(baseData[stat] || 0) + bodyValue;
        const increaseValue = Number(increaseData[stat] || 0);
        const totalValue = baseValue + increaseValue;
        allStatsBase += baseValue;

        if (totalValue === 0) return;

        let displayLabel = stat;
        let groupType = "";

        if (containerId === "body-section") {
            displayLabel = stat.replace("リーチ", "R");
        }

        if (containerId === "resistance-section") {
            if (stat.endsWith("軽減")) {
                displayLabel = stat.replace(/軽減$/, "");
                groupType = "reduce";
            } else if (stat.endsWith("耐性")) {
                displayLabel = stat.replace(/耐性$/, "");
                groupType = "resist";
            } else if (stat.endsWith("無効")) {
                displayLabel = stat.replace(/無効$/, "");
                groupType = "resist";
            } else {
                groupType = "resist";
            }
        }

        statRows.push({
            stat,
            displayLabel,
            groupType,
            baseValue,
            increaseValue,
            totalValue
        });
    });

    const renderStatRow = (row) => {
        const statRow = document.createElement("tr");
        if (containerId === "resistance-section") {
            statRow.classList.add(row.groupType === "reduce" ? "row-reduce" : "row-resist");
        }

        const label = document.createElement("th");
        label.className = "label";
        if (containerId === "resistance-section") {
            label.classList.add(row.groupType === "reduce" ? "label-reduce" : "label-resist");
        }
        label.scope = "row";
        label.textContent = row.displayLabel;
        applyAdaptiveLabelFontSize(label, row.displayLabel);

        const value = document.createElement("td");
        value.className = "value";

        const valueWrap = document.createElement("div");
        valueWrap.className = "value-wrap";

        const valueMain = document.createElement("span");
        valueMain.className = "value-main";
        valueMain.textContent = isTotalView ? row.totalValue : row.baseValue;
        valueMain.id = `${containerId}-${row.stat}-value`;
        valueWrap.appendChild(valueMain);

        const showInlineIncrease = !isTotalView && row.increaseValue !== 0;
        if (showInlineIncrease) {
            const increase = document.createElement("span");
            increase.className = "increase-inline";
            const sign = row.increaseValue > 0 ? "+" : "";
            increase.textContent = `(${sign}${row.increaseValue})`;
            increase.id = `${containerId}-${row.stat}-increase`;
            valueWrap.appendChild(increase);
        }

        value.appendChild(valueWrap);
        statRow.appendChild(label);
        statRow.appendChild(value);
        tableBody.appendChild(statRow);
    };

    if (containerId === "resistance-section") {
        const reduceRows = statRows.filter(row => row.groupType === "reduce");
        const resistRows = statRows.filter(row => row.groupType !== "reduce");

        if (reduceRows.length > 0) {
            const reduceHead = document.createElement("tr");
            const reduceHeadCell = document.createElement("th");
            reduceHeadCell.className = "stats-group-title reduce";
            reduceHeadCell.colSpan = 2;
            reduceHeadCell.textContent = "軽減";
            reduceHead.appendChild(reduceHeadCell);
            tableBody.appendChild(reduceHead);
            reduceRows.forEach(renderStatRow);
        }

        if (resistRows.length > 0) {
            const resistHead = document.createElement("tr");
            const resistHeadCell = document.createElement("th");
            resistHeadCell.className = "stats-group-title resist";
            resistHeadCell.colSpan = 2;
            resistHeadCell.textContent = "耐性";
            resistHead.appendChild(resistHeadCell);
            tableBody.appendChild(resistHead);
            resistRows.forEach(renderStatRow);
        }
    } else {
        statRows.forEach(renderStatRow);
    }

    if (containerId === "stats-section") {
        const totalRow = document.createElement("tr");
        totalRow.className = "total-row";

        const totalLabel = document.createElement("th");
        totalLabel.className = "label";
        totalLabel.scope = "row";
        totalLabel.textContent = "合計値";

        const totalValue = document.createElement("td");
        totalValue.className = "value";

        const totalWrap = document.createElement("div");
        totalWrap.className = "value-wrap";
        const totalMain = document.createElement("span");
        totalMain.className = "value-main";
        totalMain.textContent = allStatsBase;
        totalWrap.appendChild(totalMain);
        totalValue.appendChild(totalWrap);

        totalRow.appendChild(totalLabel);
        totalRow.appendChild(totalValue);
        tableBody.appendChild(totalRow);
    }

    table.appendChild(tableBody);
    container.appendChild(table);
}

const statusCategoryIconMap = {
    "basic-stats": "/images/%E6%94%BB%E6%92%83%E6%89%8B%E6%AE%B5/%E8%82%89%E4%BD%93.webp",
    "body-stats": "/images/%E6%94%BB%E6%92%83%E6%89%8B%E6%AE%B5/%E7%89%99.webp",
    "resistance-stats": "/images/%E6%94%BB%E6%92%83%E6%89%8B%E6%AE%B5/%E9%98%B2%E5%BE%A1.webp",
    "talents-stats": "/images/%E6%94%BB%E6%92%83%E6%89%8B%E6%AE%B5/%E6%B0%97%E5%8A%9F.webp"
};

function ensureStatusCategoryIcons() {
    Object.entries(statusCategoryIconMap).forEach(([categoryId, iconPath]) => {
        const category = document.getElementById(categoryId);
        if (!category) return;

        const heading = category.querySelector("h3");
        if (!heading) return;

        if (heading.querySelector(".status-category-icon")) return;

        const icon = document.createElement("img");
        icon.className = "status-category-icon";
        icon.src = iconPath;
        icon.alt = "";
        icon.loading = "lazy";

        heading.prepend(icon);
    });
}


// 合計値表示の切り替え関数
function updateToggleButtonUI() {
    const toggleButton = document.getElementById("toggle-button");
    if (!toggleButton) return;

    toggleButton.classList.toggle("is-total", isTotalView);
    toggleButton.setAttribute("aria-pressed", isTotalView ? "true" : "false");
    toggleButton.textContent = isTotalView
        ? "合計値表示中（基礎値へ）"
        : "基礎値表示中（合計値へ）";
}

function toggleTotalView() {
    isTotalView = !isTotalView;
    window.DebaglogSet?.("合計値表示の切り替え関数 : ", bodyType)
    displayStats("stats-section", baseValues, increaseValues, bodyType); // 身体能力
    displayStats("body-section",  baseBodys, increaseBodys, bodyType); // 肉体値
    displayStats("resistance-section", baseResistances, increaseResistances, bodyType); // 耐性
    displayStats("talents-section", baseSkills, increaseSkills, bodyType); // 技能値
    updateToggleButtonUI();
    ensureStatusCategoryIcons();
}

// 合計値表示の切り替え関数
function statsView() {
    displayStats("stats-section", baseValues, increaseValues, bodyType); // 身体能力
    displayStats("body-section",  baseBodys, increaseBodys, bodyType); // 肉体値
    displayStats("resistance-section", baseResistances, increaseResistances, bodyType); // 耐性
    displayStats("talents-section", baseSkills, increaseSkills, bodyType); // 技能値
    updateToggleButtonUI();
    ensureStatusCategoryIcons();
}

// ダイスロール
function rollDice() {
    const diceCount = parseInt(document.getElementById("dice-count").value);
    const diceMax = parseInt(document.getElementById("dice-max").value);
    rollCount++; // 回数をインクリメント
    
    const rollResults = [];
    for (let i = 0; i < diceCount; i++) {
        rollResults.push(Math.floor(Math.random() * diceMax) + 1);
    }
    
    // 現在時刻を取得
    const now = new Date();
    const time = now.toLocaleTimeString();
    
    // ダイス結果ログの更新
    const logEntry = document.createElement("li");
    logEntry.innerHTML = `<strong>${rollCount}回目 (${time}):</strong> ${rollResults.join(", ")}`;
    document.getElementById("dice-log").prepend(logEntry); // 新しい結果を上に追加

    // 最大30件の結果のみ表示するように制限
    const logItems = document.getElementById("dice-log").getElementsByTagName("li");
    if (logItems.length > 30) {
        logItems[logItems.length - 1].remove();
    }
}


// function updateDisplays(setData) {
//     // 持ち物、装備、倉庫それぞれの描画
// //     displayInventory(setData.inventory);
// //     displayEquipment(setData.equipment);
//     // displayStorage(setData.storage);
// }

function displayInventory(inventory) {
    const inventoryList = document.getElementById("inventory-list");
    inventoryList.innerHTML = '';
    inventory.forEach(item => {
        const itemDiv = document.createElement("div");
        itemDiv.className = "item";
        itemDiv.textContent = item.name;
        itemDiv.onclick = () => selectItem(item);
        inventoryList.appendChild(itemDiv);
    });
}

const tbody = document.getElementById("equipment-tbody");
const ITEM_RUNTIME_LOCATION_KEY = "__runtimeItemLocation";

function collectDetailItems(source) {
    if (!source) return [];

    const values = Array.isArray(source) ? source : Object.values(source);
    return values.filter((item) => {
        if (!item || typeof item !== "object") return false;
        return Boolean(item.名前 || item.name || item.説明 || item.種類 || item.タイプ || item.type);
    });
}

function openItemDetailModalBridge(item, sourceItems = null, titleText = "詳細") {
    if (typeof window.openItemDetailModal === "function") {
        window.openItemDetailModal(item, sourceItems, titleText);
        return;
    }

    const fallbackText = String(item?.説明 ?? "").trim() || "詳細情報なし";
    if (typeof window.openConfirmModal === "function") {
        window.openConfirmModal(fallbackText);
    } else {
        alert(fallbackText);
    }
}

function attachDetailOpenBehavior(targetElement, item, detailItems, titleText = "詳細") {
    if (!targetElement) return;

    targetElement.classList.add("item-clickable-cell");
    targetElement.tabIndex = 0;
    targetElement.setAttribute("role", "button");
    const itemName = String(item?.名前 || item?.name || "アイテム");
    targetElement.setAttribute("aria-label", `${itemName}の詳細を表示`);

    const openDetail = () => openItemDetailModalBridge(item, detailItems, titleText);

    targetElement.addEventListener("click", (event) => {
        const target = event.target;
        if (target instanceof Element && target.closest("button, a, input, select, textarea, label")) {
            return;
        }
        openDetail();
    });

    targetElement.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openDetail();
        }
    });
}

// updateAttackOption("武器1", { "label": "新しい武器1", "威力": 100, "属性": 60, "防御": 70 });
// updateAttackOption("爪", { "威力": 50 }); // 部分的な更新も可能

// 手鎧があるなら素手を更新
// 装備データをテーブルに挿入する関数
async function displayEquipment(equipment, base, increase) {

    window.DebaglogSet?.(" 装備データをテーブルに挿入する関数: ", equipment, base, increase)
    // 装備データを表示するテーブルのtbodyをクリア
    tbody.innerHTML = "";
    const detailItems = collectDetailItems(equipment);

    // 各装備データを行として追加
    for (const slot in equipment) {
        window.DebaglogSet?.(" 装備データをテーブルに挿入する関数 slot : ", slot)
        const item = equipment[slot];
        if (item && typeof item === "object") {
            item[ITEM_RUNTIME_LOCATION_KEY] = "装備中";
        }
        const hasItem = Boolean(item && item.名前);

        if (!hasItem) {
            const emptyRow = document.createElement("tr");
            const emptyRowData = [slot, "", "", "", "", ""];

            emptyRowData.forEach((data, index) => {
                const td = document.createElement("td");
                if (index === 1) {
                    td.classList.add("item-name-cell");
                }
                td.textContent = data;
                emptyRow.appendChild(td);
            });

            if (slot === "武器" || slot === "武器2") {
                updateAttackOption(slot, {
                    label: slot === "武器" ? "武器1" : "武器2",
                    威力: 0,
                    属性: 0,
                    防御: 0,
                    総合: null
                });
            }

            tbody.appendChild(emptyRow);
            continue;
        }

        const row = document.createElement("tr");

        // 属性の合計を計算
        let attributeTotal = 0;
        weponList.forEach(attr => {
            attributeTotal += parseInt(item[attr]) || 0; // undefined の場合は 0 として計算
        });
        attributeTotal = Math.round(attributeTotal);

        // 攻撃力、防御力の計算
        const attackPower = Math.round((Math.max(item.切断 || 0, item.貫通 || 0, item.打撃 || 0) * (100 + base.攻撃 + increase.攻撃) / 100));
        const defensePower = Math.round(item.防御倍率 * (base.防御 + increase.防御 + 100) / 100) || 0;

        // 種類
        // 更新データとして準備
        const newData = {
            label: item.名前,
            威力: attackPower,
            属性: attributeTotal,
            防御: defensePower,
            総合: item
        };

        // 武器スロットに応じて updateAttackOption を使用して更新
        if (slot === "武器" || slot === "武器2") {
            updateAttackOption(slot, newData);
        }

        // 各列にデータを挿入
        const rowData = [
            slot, // 部位（例: 武器）
            { 名前: item.名前 || "不明", フリガナ: item.フリガナ || "" }, // 名前とフリガナをオブジェクトで管理
            attackPower, // 威力
            attributeTotal, // 属性
            defensePower, // 防御
            item.総合軽減 || 0 // 軽減
        ];

        rowData.forEach((data, index) => {
            const td = document.createElement("td");

            // 名前の列（フリガナ付き）
            if (index === 1 && typeof data === "object") {
                td.innerHTML = `<ruby>${data.名前}<rt>${data.フリガナ}</rt></ruby>`;
                td.classList.add("item-name-cell");
                td.title = "クリックで詳細を表示";
                attachDetailOpenBehavior(td, item, detailItems, "詳細");
            }
            // 数値データは四捨五入
            else if (typeof data === "number") {
                td.textContent = Math.round(data);
            }
            // その他の列
            else {
                td.textContent = data || "不明";
            }

            // 行に列を追加
            row.appendChild(td);
        });

        tbody.appendChild(row);
    }
    await populateAttackOptions(attackOptions);
}


// アイテムデータをテーブルに挿入する関数
function displayItemTable(bodyId, equipment, base, increase){
    // 既存の行をクリア
    const setBody = document.getElementById(bodyId);
    setBody.innerHTML = "";
    const detailItems = collectDetailItems(equipment);
    const runtimeLocationLabel = bodyId === "inventory-tbody"
        ? "持ち物"
        : bodyId === "storage-tbody"
            ? "倉庫"
            : "";

    // 各装備データを行として追加
    for (const slot in equipment) {
        const item = equipment[slot];
        if (!item || !item.名前) continue; // データが欠けている場合はスキップ
        if (runtimeLocationLabel && typeof item === "object") {
            item[ITEM_RUNTIME_LOCATION_KEY] = runtimeLocationLabel;
        }

        const row = document.createElement("tr");
        // 属性の合計を計算
        let attributeTotal = 0;
        weponList.forEach(attr => {
            attributeTotal += parseInt(item[attr]) || 0; // 各属性が undefined の場合は 0 として計算
        });
        attributeTotal = Math.round(attributeTotal)
        // 各列にデータを挿入
        const rowData = [
            item.種類, // 部位（例: 剣、防具など）
            { 名前: item.名前 || "不明", フリガナ: item.フリガナ || "" }, // 名前とフリガナをオブジェクトで管理
            Math.round((Math.max(item.切断 || 0, item.貫通 || 0, item.打撃 || 0) * (100 + base.攻撃 + increase.攻撃) / 100)), // 威力
            attributeTotal, // 属性合計
            Math.round(item.防御倍率 * (base.防御 + increase.防御 + 100) / 100) || 0, // 防御
            item.総合軽減 || 0 // 軽減
        ];

        // テーブルの行データを処理
        rowData.forEach((data, index) => {
            const td = document.createElement("td");

            // 名前の列（ルビ付き）
            if (index === 1 && typeof data === "object") {
                td.innerHTML = `<ruby>${data.名前}<rt>${data.フリガナ}</rt></ruby>`;
                td.classList.add("item-name-cell");
                td.title = "クリックで詳細を表示";
                attachDetailOpenBehavior(td, item, detailItems, "詳細");
            }
            // 数値データは四捨五入
            else if (typeof data === "number") {
                td.textContent = Math.round(data);
            }
            // その他の列
            else {
                td.textContent = data || "不明";
            }

            // テーブルの行に列を追加
            row.appendChild(td);
        });

       setBody.appendChild(row);
    }
}


function displayStorage(storage) {
    const storageList = document.getElementById("storage-list");
    storageList.innerHTML = '';
    storage.forEach(item => {
        const itemDiv = document.createElement("div");
        itemDiv.className = "item";
        itemDiv.textContent = item.name;
        itemDiv.onclick = () => selectItem(item);
        storageList.appendChild(itemDiv);
    });
}

// タブ操作 =============
function openTab(tabId, element) {
    // メインタブメニュー内のみを対象とする
    const mainTabContainer = document.querySelector('#tab-container'); // メインタブメニュー全体を囲む要素

    // メインタブメニュー内のコンテンツ表示を切り替え
    mainTabContainer.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');

    // メインタブメニュー内のボタンのアクティブ状態を切り替え
    mainTabContainer.querySelectorAll('.main-tabs .tab-button').forEach(button => button.classList.remove('active'));
    element.classList.add('active');

    // アイテムタブを開いたときに副タブの表示を保証
    if (tabId === 'items') {
        const hasActiveSecondaryContent = Boolean(mainTabContainer.querySelector('.secondary-tab-content.active'));
        if (!hasActiveSecondaryContent) {
            showSecondaryTab('equipment');
        }
    }
}


function showSecondaryTab(tabId, element) {
    // すべてのセカンダリタブコンテンツを非表示に
    const secondaryTabs = document.querySelectorAll(".secondary-tab-content");
    secondaryTabs.forEach(tab => tab.classList.remove("active"));

    // 指定されたタブのみを表示
    const activeTab = document.getElementById(tabId);
    if (activeTab) activeTab.classList.add("active");

    // セカンダリタブボタンのアクティブ状態を切り替え
    const secondaryButtons = document.querySelectorAll(".secondary-tabs .tab-button");
    secondaryButtons.forEach(button => button.classList.remove("active"));

    if (element) {
        element.classList.add("active");
    } else {
        const matchedButton = document.querySelector(`.secondary-tabs .tab-button[data-secondary-tab="${tabId}"]`);
        if (matchedButton) matchedButton.classList.add("active");
    }

}

//====================

let selectedInventoryItem = null;

// アイテムを選択して移動先を表示する
function selectItem(item) {
    selectedInventoryItem = item;
    document.getElementById("move-buttons").style.display = "flex";
}

// アイテムを各タブ間で移動する
function moveItem(destination) {
    if (!selectedInventoryItem) return;

    switch (destination) {
        case '装備':
            selectEquipmentSlot(selectedInventoryItem);
            break;
        case '持ち物':
            inventory.push(selectedInventoryItem);
            break;
        case '倉庫':
            storage.push(selectedInventoryItem);
            break;
    }

    selectedInventoryItem = null;
    document.getElementById("move-buttons").style.display = "none";
    updateDisplays();
}

// 装備スロットを選択
function selectEquipmentSlot(item) {
    const slotOptions = ['頭', '体', '腕', '足']; // 部位を設定
    const slotSelect = document.createElement('select');
    slotOptions.forEach(slot => {
        const option = document.createElement('option');
        option.value = slot;
        option.textContent = slot;
        slotSelect.appendChild(option);
    });

    const confirmButton = document.createElement('button');
    confirmButton.textContent = '装備する';
    confirmButton.onclick = () => {
        const selectedSlot = slotSelect.value;
        if (equipment[selectedSlot]) {
            if (!confirm("既に装備されています。交換しますか？")) return;
            inventory.push(equipment[selectedSlot]); // 古い装備を持ち物に移動
        }
        equipment[selectedSlot] = item; // 新しい装備を設定
        updateDisplays();
    };

    document.body.appendChild(slotSelect);
    document.body.appendChild(confirmButton);
}

const displayKeys = [
    { label: "HP", accessor: "HP" },
    { label: "MP", accessor: "MP" },
    { label: "ST", accessor: "ST" },
    { label: "攻撃", accessor: "攻撃" },
    { label: "防御", accessor: "防御" },
    { label: "魔力", accessor: "魔力" },
    { label: "速度", accessor: "速度" },
    { label: "命中", accessor: "命中" },
    { label: "APP", accessor: "APP" },
    { label: "SIZ", accessor: "SIZ" },
    { label: "合計値", accessor: "合計値" }
];

// テーブルを初期化し、データを埋める関数
async function populateLevelsTable(data, keys = displayKeys) {
    const table = document.querySelector("#levels-table");
    const tableBody = table.querySelector("tbody");
    const tableHead = table.querySelector("thead");

    // テーブルの初期化
    tableBody.innerHTML = "";
    tableHead.innerHTML = "";

    // 固定ヘッダー（Lv, Ef, 職業名）
    const fixedHeaders = [
        { label: "職業名", className: "profession-column profession-column-sticky" },
        { label: "Lv", className: "small-column lv-column" },
        { label: "Ef", className: "small-column ef-column" }
    ];

    // ヘッダー行を作成
    const headerRow = document.createElement("tr");

    // 固定ヘッダーの列を追加
    fixedHeaders.forEach((header) => {
        const th = document.createElement("th");
        th.textContent = header.label;
        header.className.split(" ").forEach(className => th.classList.add(className));

        headerRow.appendChild(th);
    });

    // その他の可変ヘッダーを追加
    keys.forEach(key => {
        const th = document.createElement("th");
        th.textContent = key.label; // 表示ラベルを設定
        th.classList.add("small-column"); // 数値列は5%幅
        headerRow.appendChild(th);
    });

    tableHead.appendChild(headerRow);

    // Lv降順、Lvが同じ場合はEf降順でソート
    const sortedData = data.sort((a, b) => {
        if (b.Lv === a.Lv) {
            return b.Ef - a.Ef; // Ef降順
        }
        return b.Lv - a.Lv; // Lv降順
    });

    // データ行を作成
    sortedData.forEach(character => {
        const stats = character.stats;
        const row = document.createElement("tr");

        // 職業名（ルビ付き）を先頭に追加
        const professionTd = document.createElement("td");
        professionTd.classList.add("profession-column", "profession-column-sticky");
        professionTd.textContent = stats["職業名"] || "";
        row.appendChild(professionTd);

        // 固定データ (Lv, Ef) を追加
        const fixedValues = [
            { value: character.Lv, className: "small-column lv-column" },
            { value: character.Ef, className: "small-column ef-column" }
        ];

        fixedValues.forEach(({ value, className }) => {
            const td = document.createElement("td");
            td.textContent = value;
            className.split(" ").forEach(item => td.classList.add(item));
            row.appendChild(td);
        });

        // その他のデータを追加
        keys.forEach(key => {
            const td = document.createElement("td");
            td.textContent = stats[key.accessor] || ""; // stats から取得
            td.classList.add("small-column"); // 5%幅
            row.appendChild(td);
        });

        tableBody.appendChild(row);
    });
}

// スクロールバー幅を計算してCSS変数に適用する関数
function setScrollbarWidth() {
    // スクロールバー幅を測定
    const scrollDiv = document.createElement("div");
    scrollDiv.style.visibility = "hidden";
    scrollDiv.style.overflow = "scroll";
    scrollDiv.style.position = "absolute";
    scrollDiv.style.width = "100px";
    document.body.appendChild(scrollDiv);

    const scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
    document.body.removeChild(scrollDiv);

    // CSS変数にスクロールバー幅を適用
    document.documentElement.style.setProperty("--scrollbar-width", `${scrollbarWidth}px`);
}

window.displayBasicStatus = displayBasicStatus;
window.displayEquipment = displayEquipment;
window.displayItemTable = displayItemTable;
window.statsView = statsView;
window.openTab = openTab;
window.showSecondaryTab = showSecondaryTab;



