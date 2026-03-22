// 基礎値と上�E値のチE�Eタ保持
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


// 基本スチE�Eタスと耐性、技能の設宁E
async function displayBasicStatus(selectedCharacter) {
    window.DebaglogSet?.("基本スチE�Eタスと耐性、技能の設宁E: ", selectedCharacter)
    baseValues = {};
    increaseValues = {};

    baseResistances = {};
    increaseResistances = {};

    baseSkills = {};
    increaseSkills = {};

    baseBodys = {};
    increaseBodys = {};

    bodyType = selectedCharacter.stats.bodyType[0]
    // スチE�Eタスの設宁E
    displaySum.forEach(stat => {
        baseValues[stat] = (stat === "SIZ")
            ? Math.max(parseInt(selectedCharacter.stats.baseStats[stat] || 0), parseInt(selectedCharacter.stats.levelStats[stat] || 0))
            : parseInt(selectedCharacter.stats.baseStats[stat] || 0) + parseInt(selectedCharacter.stats.levelStats[stat] || 0);

        increaseValues[stat] = parseInt(selectedCharacter.itemBonuses.stats[stat + "+"] || 0) + parseInt(selectedCharacter.skillBonuses[stat] || 0);
    });

    window.DebaglogSet?.("スチE�Eタスの設宁E: ", baseValues, increaseValues, calculateCorrection(parseInt(baseValues.SIZ + increaseValues.SIZ) ))

    // 耐性の設宁E
    resistances.forEach(resistance => {
        baseResistances[resistance] = parseInt(selectedCharacter.stats.resistances[resistance] || 0);
        increaseResistances[resistance] = parseInt(selectedCharacter.itemBonuses.stats[resistance] || 0) + parseInt(selectedCharacter.skillBonuses[resistance] || 0);
    });

    // 技能の設宁E
    talents.forEach(skill => {
        baseSkills[skill] = parseInt(selectedCharacter.stats.skillValues[skill] || 0);
        increaseSkills[skill] = parseInt(selectedCharacter.itemBonuses.stats[skill] || 0) + parseInt(selectedCharacter.skillBonuses[skill] || 0);
    });

    // 肉体displayBodyの設宁E
    displayBody.forEach(skill => {
        baseBodys[skill] = parseInt(selectedCharacter.stats.bodyAttributes[skill] || 0);
        increaseBodys[skill] = parseInt(selectedCharacter.itemBonuses.stats[skill] || 0) + parseInt(selectedCharacter.skillBonuses[skill] || 0);
    });

    // チE��ォルト値を設定して計箁E
    const baseSIZ = parseInt(baseBodys['SIZ'] || 170); // baseBodys['SIZ'] ぁEundefined の場吁E170
    const increaseSIZ = parseInt(increaseBodys['SIZ'] || 0); // increaseBodys['SIZ'] ぁEundefined の場吁E0
    const base足 = parseInt(baseBodys['足'] || 0); // baseBodys['足'] ぁEundefined の場吁E0
    const increase足 = parseInt(increaseBodys['足'] || 0); // increaseBodys['足'] ぁEundefined の場吁E0

    // チE��チE��ログ: チE��ォルト値設定後�E吁E��を確誁E
    window.DebaglogSet?.("DEBUG: baseBodys['SIZ']:", baseBodys['SIZ'], "-> 使用値:", baseSIZ);
    window.DebaglogSet?.("DEBUG: increaseBodys['SIZ']:", increaseBodys['SIZ'], "-> 使用値:", increaseSIZ);
    window.DebaglogSet?.("DEBUG: baseBodys['足']:", baseBodys['足'], "-> 使用値:", base足);
    window.DebaglogSet?.("DEBUG: increaseBodys['足']:", increaseBodys['足'], "-> 使用値:", increase足);

    // 合計値を計箁E
    const SIZSum = baseSIZ + increaseSIZ;
    const 足Sum = base足 + increase足;

    // チE��チE��ログ: 合計値を確誁E
    window.DebaglogSet?.("DEBUG: SIZ合訁E(baseSIZ + increaseSIZ):", SIZSum);
    window.DebaglogSet?.("DEBUG: 足合訁E(base足 + increase足):", 足Sum);

    // 基本移動速度を計箁E基礎値にするなめE3.5
    const movementSpeedBase = SIZSum / 30 + 10 + (7.5 + 足Sum) + (baseValues.速度 / 5 * 1) ;

    // チE��チE��ログ: 基本移動速度を確誁E
    window.DebaglogSet?.("DEBUG: 基本移動速度 (SIZSum / 30 + 10 + (7.5 + 足Sum)):", movementSpeedBase);

    // 増加ボ�EナスのチE��ォルト値を設定して計箁E
    const itemBonus移勁E= parseInt(selectedCharacter.itemBonuses.stats['移勁E] || 0); // チE��ォルチE0
    const skillBonus移勁E= parseInt(selectedCharacter.skillBonuses['移勁E] || 0); // チE��ォルチE0

    // チE��チE��ログ: 吁E�Eーナスを確誁E
    window.DebaglogSet?.("DEBUG: itemBonuses['移勁E]:", selectedCharacter.itemBonuses.stats['移勁E], "-> 使用値:", itemBonus移勁E;
    window.DebaglogSet?.("DEBUG: skillBonuses['移勁E]:", selectedCharacter.skillBonuses['移勁E], "-> 使用値:", skillBonus移勁E;

    // 増加ボ�Eナス合計を計箁E
    const movementSpeedIncrease = itemBonus移勁E+ skillBonus移勁E

    // チE��チE��ログ: 増加ボ�Eナスを確誁E
    window.DebaglogSet?.("DEBUG: 増加ボ�Eナス (itemBonus移勁E+ skillBonus移勁E:", movementSpeedIncrease);

    // 最終的な移動速度を設宁E
    baseBodys['移勁E] = parseInt(movementSpeedBase);
    increaseBodys['移勁E] = parseInt(movementSpeedIncrease);

    // チE��チE��ログ: 移動速度設定�E最終結果
    window.DebaglogSet?.("移動速度の設定完亁E");
    window.DebaglogSet?.("  基本移動速度 (baseBodys['移勁E]):", baseBodys['移勁E]);
    window.DebaglogSet?.("  増加ボ�Eナス (increaseBodys['移勁E]):", increaseBodys['移勁E]);
    // +(速度/5)*3.5)

    window.DebaglogSet?.("基礎値と上�E値設宁E", baseValues, increaseValues, baseResistances, increaseResistances, baseSkills, increaseSkills, baseBodys, increaseBodys);

    const sizBonus = calculateCorrection(parseInt(baseValues.SIZ + increaseValues.SIZ))

    if (sizBonus > 0) {
        const attackBonus = parseInt(baseValues.攻撁E* (sizBonus / 100));
        const speedPenalty = parseInt(baseValues.速度 * (sizBonus / 100));
        const intimidationBonus = parseInt((sizBonus * 3.5));
        const stealthPenalty = parseInt((sizBonus * 3.5));
        const armorBonus = parseInt(sizBonus * 3.5);
    
        window.DebaglogSet?.("攻撁E�Eーナス:", attackBonus);
        window.DebaglogSet?.("速度ペナルチE��:", speedPenalty);
        window.DebaglogSet?.("威圧ボ�Eナス:", intimidationBonus);
        window.DebaglogSet?.("隠寁E�EナルチE��:", stealthPenalty);
        window.DebaglogSet?.("外皮ボ�Eナス:", armorBonus);

        // increaseValues.HP += attackBonus;
        increaseValues.攻撁E+= attackBonus;
        increaseValues.速度 -= speedPenalty;
        increaseSkills.威圧 += intimidationBonus;
        increaseSkills.隠寁E-= stealthPenalty;
        increaseBodys.外皮 += armorBonus;
    
        // 結果をログに出劁E
        window.DebaglogSet?.("更新後�E増加値:");
        window.DebaglogSet?.("HP:", increaseValues.HP);
        window.DebaglogSet?.("攻撁E", increaseValues.攻撁E;
        window.DebaglogSet?.("速度:", increaseValues.速度);
        window.DebaglogSet?.("威圧:", increaseSkills.威圧);
        window.DebaglogSet?.("隠寁E", increaseSkills.隠寁E;
        window.DebaglogSet?.("外皮:", increaseBodys.外皮);
    }

    // 外皮、外郭裁E��、E��体�E軽減値を計算し、四捨五�Eする
    increaseBodys.外皮 = Math.round((increaseBodys.外皮 * increaseBodys.外皮 / 2000 * 0.3));
    increaseBodys.外郭裁E�� = Math.round((increaseBodys.外郭裁E�� * increaseBodys.外郭裁E�� / 2000 * 1.1));
    increaseBodys.鋼佁E= Math.round((increaseBodys.鋼佁E/ 25 * 1.1));

    // 肉体部位�E威力設宁E
    const calculatedPowers = calculatePower(displayBody, displaySum);
    window.DebaglogSet?.("肉体部位�E威力設定　:", calculatedPowers);
    await updateAllAttackOptions()

    const result = { ...baseValues, ...baseSkills }; // baseValues をコピ�E
    const increase = { ...increaseValues, ...increaseSkills }
    for (const key in increase) {
      result[key] = (result[key] || 0) + increase[key];
    }
    result['名前'] = selectedCharacter.name
    result['Lv'] = selectedCharacter.stats.allLv
    result['Ef'] = selectedCharacter.stats.allEf

    // 選択キャラのチE�Eタを�Eれる
    window.DebaglogSet?.("合計結果 :",  result);
    statusCharacter = result
    
    // 攻撁E��段を変更
    await populateAttackOptions(attackOptions);


}
// 外皮、外郭裁E��、E��体に基づぁE��軽減データを生成する関数
function generateResistances(type, value) {
    // 吁E��イプごとのルール設宁E
    const rules = {
        "外郭裁E��": {
            "物琁E��渁E: value / 10,"魔法軽渁E: value / 10,"遠隔軽渁E: value / 20,
            "刁E��軽渁E: value / 20,"貫通軽渁E: value / 20,"打撃軽渁E: value / 20,
            "炎軽渁E: value / 20,"氷軽渁E: value / 20,"雷軽渁E: value / 20,"酸軽渁E: value / 20,
            "音波軽渁E: value / 20,"闁E��渁E: value / 20,"光軽渁E: value / 20
        },
        "外皮": {
            "物琁E��渁E: value / 10,"魔法軽渁E: value / 10,"遠隔軽渁E: value / 20,
            "刁E��軽渁E: value / 20,"貫通軽渁E: value / 20,"打撃軽渁E: value / 20,
            "炎軽渁E: value / 20,"氷軽渁E: value / 20,"雷軽渁E: value / 20,"酸軽渁E: value / 20,
            "音波軽渁E: value / 20,"闁E��渁E: value / 20,"光軽渁E: value / 20
        },
        "鋼佁E: {
            "物琁E��渁E: value / 10,"魔法軽渁E: value / 10,"遠隔軽渁E: value / 20,
            "刁E��軽渁E: value / 20,"貫通軽渁E: value / 20,"打撃軽渁E: value / 20,
            "炎軽渁E: value / 20,"氷軽渁E: value / 20,"雷軽渁E: value / 20,"酸軽渁E: value / 20,
            "音波軽渁E: value / 20,"闁E��渁E: value / 20,"光軽渁E: value / 20
        }
    };

    // 持E��されたタイプが存在する場合、対応する軽減データを返す
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

// 肉体部位�E威力設宁E
function calculatePower() {
    const defenseInfluence = ((baseBodys["鋼佁E] || 0) / 500) * 0.15; // 鋼体による影響めE5%に調整
    const attackInt = (baseValues.攻撁E+ increaseValues.攻撁E;
    const defenseInt = (baseValues.防御 + increaseValues.防御);

    // 属性の値を取得する関数、存在しなぁE��合�E0を返す
    const getBodyValue = (attribute) => (baseBodys[attribute] || 0) + (increaseBodys[attribute] || 0);

    // 一般皁E��属性の威力・防御を計箁E
    const calculateAttributes = (baseValue, attribute, attackMultiplier, defenseMultiplier) => {
        const bodyValue = getBodyValue(attribute);
        if (bodyValue === 0) return { 威力: 0, 防御: 0 }; // 値ぁEの場合�E威力・防御めEに設宁E

        return {
            威力: Math.floor(Math.round((baseValue + (bodyValue / 10) * attackMultiplier) * (1 + attackInt / 100 + defenseInfluence))),
            防御: Math.floor(Math.round((baseValue + (bodyValue / 10) * defenseMultiplier) * (1 + defenseInt / 100 + defenseInfluence)))
        };
    };

    // 特殊な計算が忁E��な「素手」�E威力・防御を計算（�E期値10�E�E
    const calculateHandAttributes = () => {
        const bodyValue = Math.max(
            getBodyValue("外皮") * 0.75, 
            getBodyValue("外殻") * 0.9, 
            getBodyValue("鋼佁E), 100
        ) || 100; // 数値がなぁE��合�E初期値めE0に設宁E

        return {
            威力: Math.floor(Math.round((4 + (bodyValue / 10) * 0.8) * (1 + attackInt / 100 + defenseInfluence))),
            防御: Math.floor(Math.round((4 + (bodyValue / 10) * 0.8) * (1 + defenseInt / 100 + defenseInfluence)))
        };
    };

    return {
        见E calculateAttributes(5, "见E, 1.0, 1.1),
        牁E calculateAttributes(5, "牁E, 1.0, 1.0),
        爪: calculateAttributes(5, "爪", 0.9, 0.7),
        羽: calculateAttributes(5, "羽", 0.7, 0.9),
        尾: calculateAttributes(5, "尾", 0.85, 0.6),
        素扁E calculateHandAttributes() // 特殊な計算を適用
    };
}




// 吁E��位�EチE�Eタを攻撁E��段に更新
async function updateAllAttackOptions() {
    const powerData = calculatePower();

    Object.keys(powerData).forEach((part) => {
        const data = powerData[part];
        updateAttackOption(part, { 威力: data.威力, 防御: data.防御 });
    });

    console.log
}


// 攻撁E��段を更新する
// updateAttackOption("武器1", { "label": "新しい武器1", "威力": 100, "属性": 60, "防御": 70 });
// updateAttackOption("爪", { "威力": 50 }); // 部刁E��な更新も可能
function updateAttackOption(value, newData) {
    // valueプロパティが一致するオブジェクトを検索

    window.DebaglogSet?.("updateAttackOption 攻撁E��段を更新する :", value, newData )

    const option = attackOptions.find(option => option.value === value);

    window.DebaglogSet?.("updateAttackOption option :", option )

    // 該当オブジェクトがあれば、�Eロパティを更新
    if (option) {
        option.label = newData.label || option.label;
        option.威力 = newData.威力 !== undefined ? newData.威力 : option.威力;
        option.属性 = newData.属性 !== undefined ? newData.属性 : option.属性;
        option.防御 = newData.防御 !== undefined ? newData.防御 : option.防御;
    } else {
        window.DebaglogSet?.(`Error: ${value} のチE�Eタが見つかりません`);
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

// スチE�Eタス、耐性、技能をカチE��リごとに表示する関数
function displayStats(containerId, baseData, increaseData, bodyType) {
    const container = document.getElementById(containerId);

    if (!container) {
        console.error(`Error: コンチE�� '${containerId}' が見つかりません`);
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
            displayLabel = stat.replace("リーチE, "R");
        }

        if (containerId === "resistance-section") {
            if (stat.endsWith("軽渁E)) {
                displayLabel = stat.replace(/軽渁E/, "");
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
            reduceHeadCell.textContent = "軽渁E;
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


// 合計値表示の刁E��替え関数
function updateToggleButtonUI() {
    const toggleButton = document.getElementById("toggle-button");
    if (!toggleButton) return;

    toggleButton.classList.toggle("is-total", isTotalView);
    toggleButton.setAttribute("aria-pressed", isTotalView ? "true" : "false");
    toggleButton.textContent = isTotalView
        ? "合計値表示中�E�基礎値へ�E�E
        : "基礎値表示中�E�合計値へ�E�E;
}

function toggleTotalView() {
    isTotalView = !isTotalView;
    window.DebaglogSet?.("合計値表示の刁E��替え関数 : ", bodyType)
    displayStats("stats-section", baseValues, increaseValues, bodyType); // 身体�E劁E
    displayStats("body-section",  baseBodys, increaseBodys, bodyType); // 肉体値
    displayStats("resistance-section", baseResistances, increaseResistances, bodyType); // 耐性
    displayStats("talents-section", baseSkills, increaseSkills, bodyType); // 技能値
    updateToggleButtonUI();
    ensureStatusCategoryIcons();
}

// 合計値表示の刁E��替え関数
function statsView() {
    displayStats("stats-section", baseValues, increaseValues, bodyType); // 身体�E劁E
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
    rollCount++; // 回数をインクリメンチE
    
    const rollResults = [];
    for (let i = 0; i < diceCount; i++) {
        rollResults.push(Math.floor(Math.random() * diceMax) + 1);
    }
    
    // 現在時刻を取征E
    const now = new Date();
    const time = now.toLocaleTimeString();
    
    // ダイス結果ログの更新
    const logEntry = document.createElement("li");
    logEntry.innerHTML = `<strong>${rollCount}回目 (${time}):</strong> ${rollResults.join(", ")}`;
    document.getElementById("dice-log").prepend(logEntry); // 新しい結果を上に追加

    // 最大30件の結果のみ表示するように制陁E
    const logItems = document.getElementById("dice-log").getElementsByTagName("li");
    if (logItems.length > 30) {
        logItems[logItems.length - 1].remove();
    }
}


// function updateDisplays(setData) {
//     // 持ち物、裁E��、倉庫それぞれの描画
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
        return Boolean(item.名前 || item.name || item.説昁E|| item.種顁E|| item.タイチE|| item.type);
    });
}

function openItemDetailModalBridge(item, sourceItems = null, titleText = "詳細") {
    if (typeof window.openItemDetailModal === "function") {
        window.openItemDetailModal(item, sourceItems, titleText);
        return;
    }

    const fallbackText = String(item?.説昁E?? "").trim() || "詳細惁E��なぁE;
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
    const itemName = String(item?.名前 || item?.name || "アイチE��");
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
// updateAttackOption("爪", { "威力": 50 }); // 部刁E��な更新も可能

// 手鎧があるなら素手を更新
// 裁E��チE�Eタをテーブルに挿入する関数
async function displayEquipment(equipment, base, increase) {

    window.DebaglogSet?.(" 裁E��チE�Eタをテーブルに挿入する関数: ", equipment, base, increase)
    // 裁E��チE�Eタを表示するチE�Eブルのtbodyをクリア
    tbody.innerHTML = "";
    const detailItems = collectDetailItems(equipment);

    // 吁E��E��チE�Eタを行として追加
    for (const slot in equipment) {
        window.DebaglogSet?.(" 裁E��チE�Eタをテーブルに挿入する関数 slot : ", slot)
        const item = equipment[slot];
        if (item && typeof item === "object") {
            item[ITEM_RUNTIME_LOCATION_KEY] = "裁E��中";
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

        // 属性の合計を計箁E
        let attributeTotal = 0;
        weponList.forEach(attr => {
            attributeTotal += parseInt(item[attr]) || 0; // undefined の場合�E 0 として計箁E
        });
        attributeTotal = Math.round(attributeTotal);

        // 攻撁E��、E��御力�E計箁E
        const attackPower = Math.round((Math.max(item.刁E�� || 0, item.貫送E|| 0, item.打撃 || 0) * (100 + base.攻撁E+ increase.攻撁E / 100));
        const defensePower = Math.round(item.防御倍率 * (base.防御 + increase.防御 + 100) / 100) || 0;

        // 種顁E
        // 更新チE�Eタとして準備
        const newData = {
            label: item.名前,
            威力: attackPower,
            属性: attributeTotal,
            防御: defensePower,
            総合: item
        };

        // 武器スロチE��に応じて updateAttackOption を使用して更新
        if (slot === "武器" || slot === "武器2") {
            updateAttackOption(slot, newData);
        }

        // 吁E�EにチE�Eタを挿入
        const rowData = [
            slot, // 部位（侁E 武器�E�E
            { 名前: item.名前 || "不�E", フリガチE item.フリガチE|| "" }, // 名前とフリガナをオブジェクトで管琁E
            attackPower, // 威力
            attributeTotal, // 属性
            defensePower, // 防御
            item.総合軽渁E|| 0 // 軽渁E
        ];

        rowData.forEach((data, index) => {
            const td = document.createElement("td");

            // 名前の列（フリガナ付き�E�E
            if (index === 1 && typeof data === "object") {
                td.innerHTML = `<ruby>${data.名前}<rt>${data.フリガナ}</rt></ruby>`;
                td.classList.add("item-name-cell");
                td.title = "クリチE��で詳細を表示";
                attachDetailOpenBehavior(td, item, detailItems, "詳細");
            }
            // 数値チE�Eタは四捨五�E
            else if (typeof data === "number") {
                td.textContent = Math.round(data);
            }
            // そ�E他�E刁E
            else {
                td.textContent = data || "不�E";
            }

            // 行に列を追加
            row.appendChild(td);
        });

        tbody.appendChild(row);
    }
    await populateAttackOptions(attackOptions);
}


// アイチE��チE�Eタをテーブルに挿入する関数
function displayItemTable(bodyId, equipment, base, increase){
    // 既存�E行をクリア
    const setBody = document.getElementById(bodyId);
    setBody.innerHTML = "";
    const detailItems = collectDetailItems(equipment);
    const runtimeLocationLabel = bodyId === "inventory-tbody"
        ? "持ち物"
        : bodyId === "storage-tbody"
            ? "倉庫"
            : "";

    // 吁E��E��チE�Eタを行として追加
    for (const slot in equipment) {
        const item = equipment[slot];
        if (!item || !item.名前) continue; // チE�Eタが欠けてぁE��場合�EスキチE�E
        if (runtimeLocationLabel && typeof item === "object") {
            item[ITEM_RUNTIME_LOCATION_KEY] = runtimeLocationLabel;
        }

        const row = document.createElement("tr");
        // 属性の合計を計箁E
        let attributeTotal = 0;
        weponList.forEach(attr => {
            attributeTotal += parseInt(item[attr]) || 0; // 吁E��性ぁEundefined の場合�E 0 として計箁E
        });
        attributeTotal = Math.round(attributeTotal)
        // 吁E�EにチE�Eタを挿入
        const rowData = [
            item.種顁E // 部位（侁E 剣、E��具など�E�E
            { 名前: item.名前 || "不�E", フリガチE item.フリガチE|| "" }, // 名前とフリガナをオブジェクトで管琁E
            Math.round((Math.max(item.刁E�� || 0, item.貫送E|| 0, item.打撃 || 0) * (100 + base.攻撁E+ increase.攻撁E / 100)), // 威力
            attributeTotal, // 属性合訁E
            Math.round(item.防御倍率 * (base.防御 + increase.防御 + 100) / 100) || 0, // 防御
            item.総合軽渁E|| 0 // 軽渁E
        ];

        // チE�Eブルの行データを�E琁E
        rowData.forEach((data, index) => {
            const td = document.createElement("td");

            // 名前の列（ルビ付き�E�E
            if (index === 1 && typeof data === "object") {
                td.innerHTML = `<ruby>${data.名前}<rt>${data.フリガナ}</rt></ruby>`;
                td.classList.add("item-name-cell");
                td.title = "クリチE��で詳細を表示";
                attachDetailOpenBehavior(td, item, detailItems, "詳細");
            }
            // 数値チE�Eタは四捨五�E
            else if (typeof data === "number") {
                td.textContent = Math.round(data);
            }
            // そ�E他�E刁E
            else {
                td.textContent = data || "不�E";
            }

            // チE�Eブルの行に列を追加
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

// タブ操佁E=============
function openTab(tabId, element) {
    // メインタブメニュー冁E�Eみを対象とする
    const mainTabContainer = document.querySelector('#tab-container'); // メインタブメニュー全体を囲む要素

    // メインタブメニュー冁E�EコンチE��チE��示を�Eり替ぁE
    mainTabContainer.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');

    // メインタブメニュー冁E�EボタンのアクチE��ブ状態を刁E��替ぁE
    mainTabContainer.querySelectorAll('.main-tabs .tab-button').forEach(button => button.classList.remove('active'));
    element.classList.add('active');

    // アイチE��タブを開いたときに副タブ�E表示を保証
    if (tabId === 'items') {
        const hasActiveSecondaryContent = Boolean(mainTabContainer.querySelector('.secondary-tab-content.active'));
        if (!hasActiveSecondaryContent) {
            showSecondaryTab('equipment');
        }
    }
}


function showSecondaryTab(tabId, element) {
    // すべてのセカンダリタブコンチE��チE��非表示に
    const secondaryTabs = document.querySelectorAll(".secondary-tab-content");
    secondaryTabs.forEach(tab => tab.classList.remove("active"));

    // 持E��されたタブ�Eみを表示
    const activeTab = document.getElementById(tabId);
    if (activeTab) activeTab.classList.add("active");

    // セカンダリタブ�EタンのアクチE��ブ状態を刁E��替ぁE
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

// アイチE��を選択して移動�Eを表示する
function selectItem(item) {
    selectedInventoryItem = item;
    document.getElementById("move-buttons").style.display = "flex";
}

// アイチE��を各タブ間で移動すめE
function moveItem(destination) {
    if (!selectedInventoryItem) return;

    switch (destination) {
        case '裁E��':
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

// 裁E��スロチE��を選抁E
function selectEquipmentSlot(item) {
    const slotOptions = ['頭', '佁E, '腁E, '足']; // 部位を設宁E
    const slotSelect = document.createElement('select');
    slotOptions.forEach(slot => {
        const option = document.createElement('option');
        option.value = slot;
        option.textContent = slot;
        slotSelect.appendChild(option);
    });

    const confirmButton = document.createElement('button');
    confirmButton.textContent = '裁E��する';
    confirmButton.onclick = () => {
        const selectedSlot = slotSelect.value;
        if (equipment[selectedSlot]) {
            if (!confirm("既に裁E��されてぁE��す。交換しますか�E�E)) return;
            inventory.push(equipment[selectedSlot]); // 古ぁE��E��を持ち物に移勁E
        }
        equipment[selectedSlot] = item; // 新しい裁E��を設宁E
        updateDisplays();
    };

    document.body.appendChild(slotSelect);
    document.body.appendChild(confirmButton);
}

const displayKeys = [
    { label: "HP", accessor: "HP" },
    { label: "MP", accessor: "MP" },
    { label: "ST", accessor: "ST" },
    { label: "攻撁E, accessor: "攻撁E },
    { label: "防御", accessor: "防御" },
    { label: "魔力", accessor: "魔力" },
    { label: "速度", accessor: "速度" },
    { label: "命中", accessor: "命中" },
    { label: "APP", accessor: "APP" },
    { label: "SIZ", accessor: "SIZ" },
    { label: "合計値", accessor: "合計値" }
];

// チE�Eブルを�E期化し、データを埋める関数
async function populateLevelsTable(data, keys = displayKeys) {
    const table = document.querySelector("#levels-table");
    const tableBody = table.querySelector("tbody");
    const tableHead = table.querySelector("thead");

    // チE�Eブルの初期匁E
    tableBody.innerHTML = "";
    tableHead.innerHTML = "";

    // 固定�EチE��ー�E�Ev, Ef, 職業名！E
    const fixedHeaders = [
        { label: "職業吁E, className: "profession-column profession-column-sticky" },
        { label: "Lv", className: "small-column lv-column" },
        { label: "Ef", className: "small-column ef-column" }
    ];

    // ヘッダー行を作�E
    const headerRow = document.createElement("tr");

    // 固定�EチE��ーの列を追加
    fixedHeaders.forEach((header) => {
        const th = document.createElement("th");
        th.textContent = header.label;
        header.className.split(" ").forEach(className => th.classList.add(className));

        headerRow.appendChild(th);
    });

    // そ�E他�E可変�EチE��ーを追加
    keys.forEach(key => {
        const th = document.createElement("th");
        th.textContent = key.label; // 表示ラベルを設宁E
        th.classList.add("small-column"); // 数値列�E5%幁E
        headerRow.appendChild(th);
    });

    tableHead.appendChild(headerRow);

    // Lv降頁E��Lvが同じ場合�EEf降頁E��ソーチE
    const sortedData = data.sort((a, b) => {
        if (b.Lv === a.Lv) {
            return b.Ef - a.Ef; // Ef降頁E
        }
        return b.Lv - a.Lv; // Lv降頁E
    });

    // チE�Eタ行を作�E
    sortedData.forEach(character => {
        const stats = character.stats;
        const row = document.createElement("tr");

        // 職業名（ルビ付き�E�を先頭に追加
        const professionTd = document.createElement("td");
        professionTd.classList.add("profession-column", "profession-column-sticky");
        professionTd.textContent = stats["職業吁E] || "";
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

        // そ�E他�EチE�Eタを追加
        keys.forEach(key => {
            const td = document.createElement("td");
            td.textContent = stats[key.accessor] || ""; // stats から取征E
            td.classList.add("small-column"); // 5%幁E
            row.appendChild(td);
        });

        tableBody.appendChild(row);
    });
}

// スクロールバ�E幁E��計算してCSS変数に適用する関数
function setScrollbarWidth() {
    // スクロールバ�E幁E��測宁E
    const scrollDiv = document.createElement("div");
    scrollDiv.style.visibility = "hidden";
    scrollDiv.style.overflow = "scroll";
    scrollDiv.style.position = "absolute";
    scrollDiv.style.width = "100px";
    document.body.appendChild(scrollDiv);

    const scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
    document.body.removeChild(scrollDiv);

    // CSS変数にスクロールバ�E幁E��適用
    document.documentElement.style.setProperty("--scrollbar-width", `${scrollbarWidth}px`);
}

window.displayBasicStatus = displayBasicStatus;
window.displayEquipment = displayEquipment;
window.displayItemTable = displayItemTable;
window.statsView = statsView;
window.openTab = openTab;
window.showSecondaryTab = showSecondaryTab;




