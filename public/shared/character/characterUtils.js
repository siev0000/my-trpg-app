// src/utils/characterUtils.js

// NPCデータ取得関数（クラス1～クラス20までを動的に処理）
export function npcDataGet(partys) {
  const partyData = []; // パーティデータの格納先

  // partysが配列でない場合、配列に変換
  if (!Array.isArray(partys)) {
    partys = [partys]; // 単一オブジェクトを配列化
  }

  for (const party of partys) {
    const npcData = enemyData.find((d) => d.名前 === party.name);
    console.log("party:", party);

    if (npcData) {
      const Role = [];
      for (let i = 1; i <= 20; i++) {
        const classKey = `クラス${i}`;
        if (npcData[classKey]) {
          Role.push(splitClassName(npcData[classKey]));
        }
      }

     
      const { equipmentSlot, inventory } = setupEquipmentAndInventory(npcData);
      const combinedItems = [...Object.values(equipmentSlot), ...inventory].filter((item) => item !== null);
      const intItem = findByNameInLists(combinedItems, itemList, equipment);
      const equipmentStats = calculateEquipmentStats(equipmentSlot, itemList, equipment);

      // Positionの設定（重複を避ける処理）
      const position = assignPosition(party.position?.type || "前衛", positionSlots);

      const roleStats = roleData.find((r) => r.名前 === Role[0].roleName);

      const stats = calculateStatsAndAbilities2({ Role: Role }, equipmentStats)

      stats.consumptionStats = generateConsumptionStats(party, statKeys, setSumKeys)

      // 経験値の設定
      const totalExp = party.experience 
        ? party.experience // 合計経験値（既存のものを利用）
        : getExperience(roleStats.分類, stats.allLv); // 新規計算

      // パーティーデータに追加
      partyData.push({
        name: npcData.名前,
        Role: Role,
        stats: stats,
        equipmentSlot: equipmentSlot,
        inventory: intItem,
        position: position,
        experience: totalExp
      });
    } else {
      // NPCデータが見つからない場合の処理
      const intItem = findByIdInLists(party.inventory, itemList, equipment);
      const equipmentStats = calculateEquipmentStats(party.equipmentSlot, itemList, equipment);

      // Positionの設定（重複を避ける処理）
      const position = assignPosition(party.position?.type || "前衛", positionSlots);

      const roleStats = roleData.find((r) => r.名前 === party.Role[0].roleName);

      const stats = calculateStatsAndAbilities2({ Role: party.Role }, equipmentStats)

      stats.consumptionStats = generateConsumptionStats(party, statKeys, setSumKeys)
      
      // 経験値の設定
      const totalExp = party.experience 
        ? party.experience // 合計経験値（既存のものを利用）
        : getExperience(roleStats.分類, stats.allLv); // 新規計算

      partyData.push({
        name: party.name,
        Role: party.Role,
        stats: stats,
        equipmentSlot: party.equipmentSlot,
        inventory: intItem,
        position: position,
        experience: totalExp,
      });
    }
  }

  return partyData; // 完成したパーティデータを返す
}

//経験値処理
export function processExperience(partys, expToAdd) {
  console.log("経験値処理開始: processExperience");

  if (!Array.isArray(partys)) {
    console.error("パーティデータが無効です。配列を渡してください。");
    return;
  }
  // 人数ごとの軽減率
  const reductionRates = {
    2: 0.75,
    3: 0.65,
    4: 0.55,
    5: 0.45,
    6: 0.35,
  };
  // パーティ人数
  const partySize = partys.length;

  // 軽減率を取得（該当人数がない場合は1.0をデフォルトに）
  const reductionRate = reductionRates[partySize] || 1.0;
  // 軽減後の総経験値
  const adjustedExp = Math.floor(expToAdd * reductionRate);
  for (const [index, party] of partys.entries()) {
    if (!party || !party.experience) {
      console.error(`パーティメンバー[${index}]の経験値データが無効です。処理をスキップします。`);
      continue; // 次のメンバーに進む
    }

    console.log("処理対象のメンバー:", party);

    // 経験値を追加
    party.experience.total += adjustedExp;

    // 次のレベルまでの経験値を減少
    party.experience.toNextLevel -= adjustedExp;

    // toNextLevelが0以下の場合の処理
    if (party.experience.toNextLevel <= 0) {
      console.warn(`${party.name} はレベルアップ可能です！`);
      party.levelUpReady = true; // レベルアップ可能フラグを設定
      party.experience.toNextLevel = Math.abs(party.experience.toNextLevel); // 負の値を次の処理に引き継ぎ
    }

    console.log(
      `メンバー "${party.name}" に経験値 ${adjustedExp} を追加しました。`,
      `現在の合計経験値: ${party.experience.total}`,
      `次のレベルまでの残り経験値: ${party.experience.toNextLevel}`
    );
  }

  console.log("経験値処理完了: processExperience");
  return partys; // 処理後のパーティデータを返す
}




// Positionの割り当て処理
export function assignPosition(preferredType, positionSlots) {
  // 前衛・後衛スロットのチェック
  const types = ["前衛", "後衛"];
  const typeIndex = types.indexOf(preferredType); // 指定タイプのインデックス

  for (let i = typeIndex; i < types.length; i++) {
    const type = types[i];
    for (let slot = 0; slot < 3; slot++) {
      if (!positionSlots[type][slot]) {
        positionSlots[type][slot] = true; // スロットを使用済みにする
        return { type: type, slot: slot + 1 }; // スロットは1から始まる
      }
    }
  }

  // すべて埋まっている場合（デフォルト）
  console.warn("すべてのスロットが埋まっています。デフォルト位置を割り当てます。");
  return { type: "後衛", slot: 3 }; // 最後のスロットを返す
}


// 装備の数値を合計する
export function calculateEquipmentStats(equipmentSlot, ...lists) {
  // ステータスの初期化
  const equipmentStats = {};

  // equipmentSlot が空か null/undefined でないかをチェック
  if (!equipmentSlot || Object.keys(equipmentSlot).length === 0) {
    console.warn("equipmentSlot is empty or invalid.");
    return equipmentStats; // 空の結果を返す
  }

  console.log(" equipmentSlot : ", equipmentSlot);

  // 装備スロットをループ
  Object.values(equipmentSlot).forEach(itemName => {
    let itemStats = null;

    // 各リストをチェックして名前が一致するデータを探す
    for (const list of lists) {
      itemStats = list.find(item => item.名前 === itemName); // "名前" で検索
      if (itemStats) break; // 見つかったら次の装備スロットへ
    }

    // 見つかったアイテムのステータスを合計
    if (itemStats) {
      Object.entries(itemStats).forEach(([key, value]) => {
        // attributesに含まれるキーのみを合計
        if (attributes.includes(key)) {
          equipmentStats[key] = (equipmentStats[key] || 0) + Number(value);
        }
      });
    }
  });

  // 値が0のステータスを除外
  Object.keys(equipmentStats).forEach(key => {
    if (equipmentStats[key] === 0) {
      delete equipmentStats[key];
    }
  });

  return equipmentStats;
}


// クラス名を分解する関数
export function splitClassName(className) {
  // 正規表現で "Lv" と "Ef" の値を抽出
  const match = className.match(/^(.*?)(Lv(\d+))(Ef(\d+))?$/);

  if (match) {
    return {
      roleName: match[1].trim(), // クラス名のベース部分
      Lv: parseInt(match[3], 10) || 0, // Lv の数値
      Ef: parseInt(match[5], 10) || 0, // Ef の数値（存在しない場合は0）
    };
  }

  // マッチしない場合はデフォルト値を返す
  return {
    roleName: className,
    Lv: 0,
    Ef: 0,
  };
}
// 装備とインベントリを設定する関数
export function setupEquipmentAndInventory(npcData) {
  // 装備スロットを初期化
  const equipmentSlot = {
    武器: npcData["武器"] || null,
    武器2: npcData["武器2"] || null,
    頭: npcData["頭"] || null,
    体: npcData["体"] || null,
    足: npcData["足"] || null,
    装飾1: npcData["装飾1"] || null,
    装飾2: npcData["装飾2"] || null,
  };

  // インベントリを初期化（ドロップアイテムを配列化）
  const inventory = [];
  if (npcData["ドロップ"]) {
    // ドロップデータがカンマ区切りの場合、配列に変換
    inventory.push(...npcData["ドロップ"].split(","));
  }

  return { equipmentSlot, inventory };
}

// ステータスの作成関数: クラスデータ (roleName, Lv, Ef) からステータス、耐性、肉体値を計算
export function calculateStatsAndAbilities2(npcData , equipmentStats) {
  let totalStats = {}; // 合計ステータス
  const abilitie = []; // 取得するアビリティ
  let allLv = 0; // 総レベル合計

  // ステータスキーを初期化 (0で埋める)
  statKeys.forEach((key) => (totalStats[key] = 0));
  resistanceKeys.forEach((key) => (totalStats[key] = 0)); // 耐性の初期化
  bodyKeys.forEach((key) => (totalStats[key] = 0)); // 肉体値の初期化

  // クラスデータを処理 (classes配列)
  console.log(" calculateStatsAndAbilities2 : ", npcData)
  npcData.Role.forEach((role, index) => {
    const roleStats = roleData.find((r) => r.名前 === role.roleName);
    if (roleStats) {
      // 最初のクラスのみ Lv+5 を適用 (statKeys計算時)
      const adjustedLv = index === 0 ? role.Lv + 5 : role.Lv;

      // 総レベルに元のLvを加算
      allLv += role.Lv;

      // ステータス合計 (adjustedLv を使用)
      statKeys.forEach((key) => {
        const baseStat = roleStats[key] || 0;
        totalStats[key] += Math.floor((baseStat * adjustedLv) / 10); // 調整済みLvでステータス計算
      });

      // 耐性の合計
      resistanceKeys.forEach((key) => {
        totalStats[key] += roleStats[key] || 0; // 耐性値を加算
      });

      // 肉体値の最大値 bodyKeys
      bodyKeys.forEach((key) => {
        totalStats[key] = Math.max(totalStats[key],parseFloat(roleStats[key]) || 0); // 文字列を数値に変換し、NaNの場合は0を使用
      });

      // アビリティの追加（adjustedLvを使わず、元のLvを使う）
      for (let i = 1; i <= role.Lv + role.Ef; i++) {
        const SkillKey = `Skill${i}`;
        if (roleStats[SkillKey]) {
          abilitie.push(roleStats[SkillKey]);
        }
      }
    } else {
      console.warn(`クラスデータが見つかりません: ${role.roleName}`);
    }
  });
  totalStats["Lv"] = allLv * 10
  // パッシブアビリティを取得
  let baseStats = { ...totalStats }; // 現在の合計ステータスを保存
  let abilities = getAvailableAbilities(abilitie);
  const { passiveStats, excludedAbilities } = calculatePassiveStats(abilities);

  // パッシブアビリティのステータスを totalStats に加算
  Object.entries(passiveStats).forEach(([key, value]) => {
    totalStats[key] = (totalStats[key] || 0) + value;
  });

  console.log(" equipmentStats :", equipmentStats)
  Object.entries(equipmentStats).forEach(([key, value]) => {
    
    totalStats[key] = (totalStats[key] || 0) + value;
    console.log(totalStats[key] , key, value)
  });


  // ログ出力
  console.log("パッシブアビリティによるステータス補正:", passiveStats);
  console.log("条件パッシブ一覧:", excludedAbilities);
  console.log("合計ステータス (パッシブ適用後):", totalStats);
  console.log("取得アビリティ:", abilities);
  console.log("総レベル:", allLv);

  // 結果を返す
  return { baseStats, totalStats, abilities, allLv, passiveStats, equipmentStats, excludedAbilities };
}

// 敵データの作成
export function generateEnemyData(enemyName) {
  const enemies = []; // 全ての敵データを格納する配列

  // 配列内の各敵を処理
  let currentBaseName = ""; // 現在の名前（ベース名）を記録する変数
  let frontSlotCount = 0;   // 現在の前衛スロット数を記録

  // 配列内の各敵を処理
  for (const enemy of enemyName) {
    const { name, count } = enemy; // 名前と出現数を取得
    const npcData = enemyData.find((d) => d.名前 === name); // `enemyData` から該当するデータを検索

    if (!npcData) {
      console.error(`敵データが見つかりません: ${name}`);
      continue; // 見つからない場合はスキップ
    }

    // 指定された数だけ敵を生成
    for (let i = 0; i < count; i++) {
      const Role = []; // クラス情報を初期化

      // クラス情報の取得
      for (let j = 1; j <= 20; j++) {
        const classKey = `クラス${j}`;
        if (npcData[classKey]) {
          Role.push(splitClassName(npcData[classKey]));
        }
      }

      // 装備とインベントリの設定
      const { equipmentSlot, inventory } = setupEquipmentAndInventory(npcData);
      const combinedItems = [...Object.values(equipmentSlot), ...inventory].filter((item) => item !== null);
      const intItem = findByNameInLists(combinedItems, itemList, equipment);
      const equipmentStats = calculateEquipmentStats(equipmentSlot, itemList, equipment);

      // ステータス計算
      const stats = calculateStatsAndAbilities2({ Role: Role }, equipmentStats);
      stats.consumptionStats = generateConsumptionEnemyStats(stats, statKeys, setSumKeys)

      // 経験値の設定
      const totalExp = npcData.experience || getExperience("亜人", stats.allLv); // 経験値が設定されていればそのまま使用

      // 名前の共通部分を抽出（" -数値" を削除）
      const baseName = npcData.名前;

      // 前衛・後衛の割り振りロジック
      let positionType;
      if (currentBaseName === "" || (baseName === currentBaseName && frontSlotCount < 3)) {
        // 初回、または同じ名前が続き、前衛スロットが3未満の場合は前衛
        positionType = "前衛";
        frontSlotCount++;

        currentBaseName = baseName
      } else {
        // 名前が変わる、または前衛スロットが3以上の場合は後衛
        positionType = "後衛";
        currentBaseName = baseName; // 現在の名前を更新
        frontSlotCount = 0;         // 前衛スロットをリセット
      }

      // 敵データを追加
      enemies.push({
        name: `${npcData.名前} -${i + 1}`, // 一意の名前
        Role: Role,
        stats: stats,
        equipmentSlot: equipmentSlot,
        inventory: intItem,
        experience: totalExp,
        position: {
          slot: i + 1,   // スロット番号
          type: positionType, // 前衛・後衛の種類
        },
      });
    }
  }


  console.log("生成された敵データ:", enemies);
  return enemies;
}


//パッシブアビリティの合計値を取得
export function calculatePassiveStats(abilities) {
  // ステータスの初期化
  const passiveStats = {};
  const excludedAbilities = []; // 合計から除外されたアビリティ

  // passive_Skill_value に含まれるステータスを初期化
  passive_Skill_value.forEach(attr => (passiveStats[attr] = 0));

  // アビリティをループして処理
  abilities.forEach(Skill => {
    // 分類が "P" でない場合は無視
    if (Skill.分類 !== "P") return;

    // "系統", "攻撃手段", "条件" に何かが含まれている場合は除外
    if (Skill.系統 || Skill.攻撃手段 || Skill.条件) {
      excludedAbilities.push(Skill); // 除外対象として保存
      return; // 合計に含めない
    }

    // passive_Skill_value に含まれるキーのみ合計
    Object.entries(Skill).forEach(([key, value]) => {
      if (passive_Skill_value.includes(key)) {
        passiveStats[key] = (passiveStats[key] || 0) + Number(value);
      }
    });
  });

  // 値が0のステータスを削除
  Object.keys(passiveStats).forEach(key => {
    if (passiveStats[key] === 0) {
      delete passiveStats[key];
    }
  });

  // 合計値と除外されたアビリティを返す
  return { passiveStats, excludedAbilities };
}

// 消費値を作成する
export function generateConsumptionStats(party, statKeys, setSumKeys) {
  // statKeys と setSumKeys を統合し、重複しないキーのセットを作成
  const allKeys = Array.from(new Set([...statKeys, ...setSumKeys]));

  // party.stats が存在しない場合は初期化
  if (!party.stats) {
    party.stats = {
      consumptionStats: {}
    };
  }

  // consumptionStats が存在しない場合は初期化
  if (!party.stats.consumptionStats) {
    party.stats.consumptionStats = {};
  }

  // consumptionStats を生成
  const consumptionStats = allKeys.reduce((acc, key) => {
    // デフォルト値を設定する
    acc[`${key}消費`] = party.stats.consumptionStats[`${key}消費`] || 0;
    return acc;
  }, {});

  return consumptionStats;
}

// 消費値を作成する
export function generateConsumptionEnemyStats(stats, statKeys, setSumKeys) {
  // statKeys と setSumKeys を統合し、重複しないキーのセットを作成
  const allKeys = Array.from(new Set([...statKeys, ...setSumKeys]));

  // consumptionStats が存在しない場合は初期化
  if (!stats.consumptionStats) {
    stats.consumptionStats = {};
  }

  // consumptionStats を生成
  const consumptionStats = allKeys.reduce((acc, key) => {
    // デフォルト値を設定する
    acc[`${key}消費`] = stats.consumptionStats[`${key}消費`] || 0;
    return acc;
  }, {});

  return consumptionStats;
}

// 次の経験値
export function getExperience(type, Lv, maxLevel = 60) {
  if (Lv < 1 || Lv > maxLevel) {
    throw new Error(`レベルは1から${maxLevel}の間で指定してください。`);
  }
  const experienceTable = generateExperienceTable(type, maxLevel);
  return experienceTable[Lv - 1]; // 指定されたレベルの経験値を返す
}
export function generateExperienceTable(type, Lv ,maxLevel=40) {
  const experienceTable = [0]; // レベル1は0経験値
  let growthRate;

  for (let level = 1; level <= maxLevel; level++) {
    switch (type) {
      case "魔族":
        // レベル15までは急速成長、16以降は停滞
        growthRate = level <= 15
          ? 100 + level * 3  // レベル15までは速い
          : 300 + level * 10; // レベル16以降は急増
        break;
      case "亜人":
        // 一貫して安定した成長
        growthRate = 150 + level * 5; // 一定の増加
        break;
      case "人族":
        // レベル15までは遅い、16以降は急成長
        growthRate = level <= 15
          ? 200 + level * 8  // レベル15までは遅い
          : 50 + level * 3; // レベル16以降は速い
        break;
      default:
        growthRate = 150 + level * 5; // 一定の増加
        throw new Error("無効なタイプです");
    }
    experienceTable.push(experienceTable[level - 1] + growthRate); // 累積経験値
  }

  return experienceTable;
}


// ===================================================================================
export function displayStatsAndAbilities(playerData) {
  const { totalStats, abilities } = calculateStatsAndAbilities(playerData);
  console.log("totalStats , abilities", totalStats, abilities);

  let abilitie = getAvailableAbilities(abilities);
  console.log("abilitie : ", abilitie);
  return { totalStats, abilitie };
}

// ロールデータ作成し直す
export function rollDataSet(rollList) {
  // returnData を配列として初期化
  let returnData = [];

  // 非同期処理を考慮して for...of に変更
  for (const roll of rollList) {
    const rollData = roleData.find((cls) => cls["名前"] === roll.roleName);

    // rollNameが null または該当データがない場合スキップ
    if (!roll.roleName || !rollData) {
      continue;
    }

    const stats = {};
    let abilities = [];

    // ステータス計算
    statKeys.forEach((key) => {
      stats[key] = Math.floor(((rollData[key] || 0) * roll.Lv) / 10); // ボーナス付きのステータス計算
    });

    setSumKeys.forEach((key) => {
      stats[key] = Math.floor(rollData[key] || 0); // 固定値計算
    });

    // レベルと努力値に基づいてアビリティを取得
    for (let i = 1; i <= roll.Lv + roll.Ef; i++) {
      const SkillKey = `Skill${i}`; // テンプレートリテラルの正しい使用
      if (rollData[SkillKey]) {
        abilities.push(rollData[SkillKey]);
      }
    }

    // データを returnData に追加
    returnData.push({
      roleName: roll.roleName, // クラス名または種族
      Lv: roll.Lv, // レベル（そのクラスでの習熟度）
      Ef: roll.Ef, // 努力値（追加でアビリティを取得）
      stats: stats, // クラスごとのステータス（例: HP, MP, 攻撃力など）
      abilities: abilities, // 取得アビリティ
    });
  }

  // 結果を確認
  console.log(" returnData : ", returnData);

  return returnData;
}

//ステータスの作成　Rollに入ったデータから能力値を作る
export function calculateStatsAndAbilities(playerData) {
  const totalStats = {};
  const abilities = [];
  let allLv = 0;

  // 初期化: ステータス、耐性、肉体値を初期化
  statKeys.forEach((key) => {
    totalStats[key] = 0; // 初期値は合計用に0
  });

  resistanceKeys.forEach((key) => {
    totalStats[key] = 0; // 耐性の合計用
  });

  bodyKeys.forEach((key) => {
    totalStats[key] = 0; // 肉体値の最大値用
  });

  // Role の stats を合計し、abilities を収集
  playerData.Role.forEach((role) => {
    if (role.stats) {
      allLv += parseInt(role.Lv);
      // ステータスの合計
      statKeys.forEach((key) => {
        totalStats[key] += role.stats[key] || 0;
      });

      // 耐性の合計
      resistanceKeys.forEach((key) => {
        totalStats[key] += role.stats[key] || 0;
      });

      // 肉体値の最大値
      bodyKeys.forEach((key) => {
        totalStats[key] = Math.max(totalStats[key], role.stats[key] || 0);
      });
    }

    // abilities が {} や [] の場合を除外
    if (
      role.abilities && // 存在するか確認
      !(Array.isArray(role.abilities) && role.abilities.length === 0) && // 空配列を除外
      !(
        typeof role.abilities === "object" &&
        !Array.isArray(role.abilities) &&
        Object.keys(role.abilities).length === 0
      ) // 空オブジェクトを除外
    ) {
      if (Array.isArray(role.abilities)) {
        abilities.push(...role.abilities);
      } else {
        abilities.push(role.abilities);
      }
    }
  });

  // totalStats.push(allLv)

  // stats.baseStats に totalStats を加算
  const fasutStat = roleData.find((cls) => cls["名前"] === playerData.race);

  playerData.stats.baseStats = {};
  statKeys.forEach((key) => {
    playerData.stats.baseStats[key] = Math.floor(
      (fasutStat[key] || 0) * 0.5 + totalStats[key]
    );
  });
  setSumKeys.forEach((key) => {
    playerData.stats.baseStats[key] = Math.floor(
      (fasutStat[key] || 0) * 0.5 + totalStats[key]
    );
  });
  statKeys.forEach((key) => {
    totalStats[key] += (fasutStat[key] || 0) * 0.5;
  });
  playerData.stats.allLv = allLv;

  console.log("ステータスの作成 :", allLv, totalStats);
  // return
  return { totalStats, abilities };
}

// アビリティデータを取得
export function getAvailableAbilities(SkillNames) {
  const availableAbilities = [];

  console.log(" getAvailableAbilities :", SkillNames, SkillData);
  // SkillData を走査してアビリティを取得
  SkillNames.forEach((name) => {
    const matchingSkill = Object.values(SkillData).find(
      (Skill) => Skill["名前"] === name
    );
    // console.log(" matchingSkill :",name , matchingSkill)

    if (matchingSkill) {
      availableAbilities.push({
        name: name,
        ...matchingSkill,
      });
    } else {
      console.warn(`アビリティデータが見つかりません: ${name}`);
    }
  });

  return availableAbilities;
}

// === 隊列 =======================================

// 初期表示
// export function displayCharacterCards() {
//   // 全スロットを初期化
//   document.querySelectorAll(".slot").forEach((slot) => {
//     slot.innerHTML = "";
//     slot.classList.remove("drop-target");
//   });

//   // 各キャラクターを適切なスロットに配置
//   playerData.party.forEach((character) => {
//     const { type, slot } = character.position;
//     const targetSlot = document.querySelector(`.slot[data-type="${type}"][data-slot="${slot}"]`);

//     if (targetSlot) {
//       const card = createCharacterCard(character);
//       targetSlot.appendChild(card);
//     }
//   });
// }

// アイコン画像URLの取得関数
const getImageURL = (imagePath) => `/images/${imagePath || "default.png"}`;

export function createCharacterCard(character) {
  const card = document.createElement("div");
  card.className = "character-card";

  // 種族とクラスデータを取得
  const raceClass = roleData.find(cls => cls["名前"] === character.Role?.[0]?.roleName);
  const jobClass = roleData.find(cls => cls["名前"] === character.Role?.[1]?.roleName);

  // アイコン画像URLの取得関数
  const getImageURL = (imagePath) => `/images/${imagePath || "default.png"}`;
  const raceImage = getImageURL(raceClass?.画像url);
  const classImage = getImageURL(jobClass?.画像url);

  // アイコンと名前をコンテナに追加
  card.innerHTML = `
    <div class="icon-name-container">
      <div class="icon-container">
        <img src="${raceImage}" alt="${character.name}の種族" class="race-icon">
        <img src="${classImage}" alt="${character.name}のクラス" class="class-icon">
      </div>
      <p class="character-name">${character.name}</p>
    </div>
    `;


  // 汎用変数
  let isDragging = false; // ドラッグ状態
  let offsetX = 0;
  let offsetY = 0;

  // 共通処理（ドラッグ開始）
  const startDrag = (e) => {
    isDragging = true;
    const clientX = e.touches?.[0]?.clientX || e.clientX;
    const clientY = e.touches?.[0]?.clientY || e.clientY;

    offsetX = clientX - card.offsetLeft;
    offsetY = clientY - card.offsetTop;

    card.style.position = "absolute";
    card.style.zIndex = "1000";
    card.classList.add("dragging");
  };

  // 共通処理（ドラッグ中）
  const drag = (e) => {
    if (!isDragging) return;

    const clientX = e.touches?.[0]?.clientX || e.clientX;
    const clientY = e.touches?.[0]?.clientY || e.clientY;

    card.style.left = `${clientX - offsetX}px`;
    card.style.top = `${clientY - offsetY}px`;
  };

  // 共通処理（ドラッグ終了）
  const endDrag = (e) => {
    if (!isDragging) return;
    isDragging = false;

    card.classList.remove("dragging");
    card.style.position = "";
    card.style.zIndex = "";
    card.style.left = "";
    card.style.top = "";

    const clientX = e.changedTouches?.[0]?.clientX || e.clientX;
    const clientY = e.changedTouches?.[0]?.clientY || e.clientY;

    const targetSlot = document.elementFromPoint(clientX, clientY);

    if (targetSlot && targetSlot.classList.contains("slot")) {
      const targetType = targetSlot.getAttribute("data-type");
      const targetSlotNumber = parseInt(targetSlot.getAttribute("data-slot"), 10);

      // キャラクターの位置を更新
      const oldType = character.position.type;
      const oldSlot = character.position.slot;

      freeSlot(oldType, oldSlot); // 古いスロットを解放
      occupySlot(targetType, targetSlotNumber); // 新しいスロットを占有
      character.position = { type: targetType, slot: targetSlotNumber };
      console.log(`${character.name} が ${targetType}${targetSlotNumber} に移動しました`);

      displayCharacterCards(); // 再描画
    }
  };

  // マウスイベント設定
  card.addEventListener("mousedown", startDrag);
  document.addEventListener("mousemove", drag);
  document.addEventListener("mouseup", endDrag);

  // タッチイベント設定
  card.addEventListener("touchstart", startDrag);
  document.addEventListener("touchmove", drag);
  document.addEventListener("touchend", endDrag);

  return card;
}

// スロット占有処理
export function occupySlot(type, slot) {
  positionSlots[type][slot - 1] = true;
}

// スロット解放処理
export function freeSlot(type, slot) {
  positionSlots[type][slot - 1] = false;
}

// 再描画関数
export function displayCharacterCards() {
  const slots = document.querySelectorAll(".slot");
  slots.forEach((slot) => (slot.innerHTML = ""));

  playerData.party.forEach((character) => {
    const { type, slot } = character.position;
    const targetSlot = document.querySelector(`.slot[data-type="${type}"][data-slot="${slot}"]`);
    if (targetSlot) {
      const card = createCharacterCard(character);
      targetSlot.appendChild(card);
    }
  });
}


