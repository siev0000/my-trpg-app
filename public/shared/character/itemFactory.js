// src/constants/itemFactory.js
// Excelシートからデータを一度ロードして保持、装備を生成するファクトリー
import { v4 as uuidv4 } from "uuid";
import { toRaw } from 'vue'
let cachedWeapons = null;
let cachedMaterials = null;
let cachedEnhancements = null;
let Skill_List = null;
export let Item_List = null;

// 共通フェッチ関数
async function fetchSheet(endpoint) {
  const res = await fetch(`/api/excel/${endpoint}`);
  if (!res.ok) throw new Error(`Failed to fetch ${endpoint}`);
  return res.json();
}
// 初期ロード関数（ゲーム起動時に1回呼ぶ）
export async function loadItemData() {
  try {
    const [weapons, materials, enhancements, Skills, Items] = await Promise.all([
        fetchSheet("weapons"),                // 武器の基本データ（Excelの「武器」シート）
        fetchSheet("materials"),              // 素材シート
        fetchSheet("equipment-enhancements"), // 装強シート
        fetchSheet("Skills"),  // 装強シート
        fetchSheet("items")  // 装強シート
        
    ]);

    // const res4 = await fetch("/api/excel/Skills");
    // Skill_List.value = await res4.json();      // 技

    cachedWeapons = weapons;
    cachedMaterials = materials;
    cachedEnhancements = enhancements;
    Skill_List = Skills
    Item_List = Items
    // console.log("アイテムデータをロードしました st");
    // console.log(cachedWeapons);
    // console.log(cachedMaterials);
    // console.log(cachedEnhancements);
    // console.log(Item_List);
    // console.log("アイテムデータをロードしました ed");
  } catch (err) {
    console.error("アイテムデータのロードに失敗:", err);
  }
}


const WEAPON_TYPES = ["武器", "弓", "杖", "盾", "銃", "素手"];
const ARMOR_TYPES  = ["頭", "腕", "足", "体", "服"];
const checkItem種別 = ["素材", "道具", "休憩"]

// 装備品種類 判明
function detectItemType(itemName) {
  if (!itemName) return null;

  // 名前から基礎データを探す
  const baseData = cachedWeapons?.find(w => w.名前 === itemName);

  if (!baseData) {
    console.warn(`[detectItemType] ${itemName} の基礎データが見つかりません`);
    return null;
  }

  const kind = baseData.種別; // ← 武器/頭/体など

  if (WEAPON_TYPES.includes(kind)) {
    return "武器";
  }
  if (ARMOR_TYPES.includes(kind)) {
    return "防具";
  }
  return kind; // その他はそのまま返す（例: 装飾）
}


// 武器の基本データ構造
export const equipmentemplate = {
  名前: "",
  ルビ: "",
  分類: "",
  素材: "",
  種別: "",
  装備Lv: "",

  全力: 0,
  切断: 0,
  貫通: 0,
  打撃: 0,

  物理ガード: 0,
  魔法ガード: 0,

  射撃: 0,

  炎: 0,氷: 0,雷: 0,酸: 0,音: 0,光: 0,闇: 0,善: 0,悪: 0,回復: 0,精神攻撃: 0,
  毒: 0,盲目: 0,幻覚: 0,石化: 0,怯み: 0,拘束: 0,呪い: 0,即死: 0,時間: 0,出血: 0,疲労: 0,体幹: 0,

  ダメージ幅: 0,
  
  Cr率: 0,
  Cr威力: 0,
  回避率: 0,
  命中率: 0,

  射程: 0,
  弾倉: 0,
  リロード時間: 0,
  攻撃回数: 0,
  攻撃タイプ: "",

  能力: [],
  装備特性: [],

  物理軽減: 0,
  魔法軽減: 0,

  切断耐性: 0,
  貫通耐性: 0,
  打撃耐性: 0,
  炎耐性: 0,
  氷耐性: 0,
  雷耐性: 0,
  酸耐性: 0,
  音耐性: 0,
  闇耐性: 0,
  光耐性: 0,
  善耐性: 0,
  悪耐性: 0,
  正耐性: 0,
  精神耐性: 0,
  毒耐性: 0,
  盲目耐性: 0,
  幻覚耐性: 0,
  石化耐性: 0,
  怯み耐性: 0,
  拘束耐性: 0,
  呪い耐性: 0,
  即死耐性: 0,
  時間耐性: 0,
  出血耐性: 0,
  疲労耐性: 0,
  体幹耐性: 0,
  物理耐性: 0,
  魔法耐性: 0,
  Cr率耐性: 0,
  Cr威力耐性: 0,

  Lv: 0,

  HP: 0,
  MP: 0,
  ST: 0,
  攻撃: 0,
  防御: 0,
  魔力: 0,
  精神: 0,
  速度: 0,
  命中: 0,
  SIZ: 0,
  APP: 0,

  隠密: 0,
  感知: 0,
  威圧: 0,
  軽業: 0,
  技術: 0,
  早業: 0,
  看破: 0,
  騙す: 0,
  知識: 0,
  鑑定: 0,
  装置: 0,
  変装: 0,
  制作: 0,
  精神接続: 0,
  魔法技術: 0,
  指揮: 0,

  重量: 0,
  付与: "",
  能力: "",
  能力2: "",

  威力: 0,
  画像url: "",
  金額: 0,

  素材の説明: "",
  武器の説明: "",
  説明: "",

  id: ""
};

// 回避率 命中率計算
function applyAccuracyEvasion(equip, baseData, material, isArmor = false) {
  ["回避率", "命中率"].forEach(key => {
    const baseVal = toNumber(baseData[key]);       // 例: -2.5, -5
    const materialFactor = toNumber(material.全力);

    let effective;

    if (materialFactor < 100) {
      // 軽い素材 → ペナルティを割合で軽減
      effective = baseVal * (materialFactor / 100);
    } else {
      if (isArmor) {
        // 防具: ペナルティは素材で加算 (/4)
        const penalty = (materialFactor - 100) / 4;
        effective = baseVal - penalty;
      } else {
        // 武器: ペナルティは素材で加算 (/2)
        const penalty = (materialFactor - 100) / 2;
        effective = baseVal - penalty;
      }
    }

    // プラス補正（正の値）の場合は保証を適用
    if (baseVal > 0) {
      const divisor = isArmor ? 4 : 2;
      const min = materialFactor > 100 ? (materialFactor - 100) / divisor : 0;
      effective = Math.max(effective, min);
    }

    const before = toNumber(equip[key]);
    const result = before + effective;

    equip[key] = result;

    // console.log(
    //   `[${isArmor ? "Armor" : "Weapon"} ${key}] base=${baseVal}, 全力=${materialFactor}, effective=${effective}, result=${result}`
    // );
  });
}

// ===== 装備品シートの計算ロジック =====
function toNumber(val) {
  const num = parseFloat(val);
  return isNaN(num) ? 0 : num;
}
/**
 * エンチャントを適用する
 * @param {Object} equip 装備オブジェクト
 * @param {Array<string>} enchantments エンチャント名配列 ["耐炎Ⅰ", "耐氷Ⅱ", "Cr耐性Lv1"]
 * @param {Number} baseValue 基礎値（倍率計算に使う場合）
 * @param {Boolean} useMultiplier 倍率で計算するか（true=基礎値×倍率, false=固定値加算）
 */
function applyEnchantments(equip, enchantments = [], baseValue = 1, useMultiplier = false) {
  enchantments = toRaw(enchantments)
  // console.log(`[enchantments] 能力：`, enchantments);
  
  if (!equip.能力) equip.能力 = []; 
  let totalCost = 0; // 累計コスト
  const materialLv = toNumber(equip.装備Lv || 0); // 素材のLvを取得
  // console.log(`[equip] materialLv`, materialLv);
  enchantments.forEach(name => {
    // 名前一致で検索
    const enchData = cachedEnhancements.find(e => e.名前 === name);
    if (!enchData) {
      // console.warn(`[Enchant] 未登録: ${name}`);
      return;
    }

    // ====== 付与対象チェック ======
    const matchCategory = enchData.付与対象?.includes(equip.分類);
    const matchType = enchData.付与対象?.includes(equip.種別);

    let canApply = false;
    let reason = ""; // ログ用の理由

    if (enchData.素材) {
      if (equip.素材 === enchData.素材 && (matchCategory || matchType)) {
        canApply = true;
      } else {
        reason = `素材一致=${equip.素材 === enchData.素材}, 分類一致=${!!matchCategory}, 種別一致=${!!matchType}`;
      }
    } else {
      if (matchCategory || matchType) {
        canApply = true;
      } else {
        reason = `分類一致=${!!matchCategory}, 種別一致=${!!matchType}`;
      }
    }
    // ====== コスト制限チェック ======
    const cost = toNumber(enchData.コスト);
    if (canApply && cost > 0) {
      if (totalCost + cost > materialLv) {
        canApply = false;
        reason += ` | コスト超過: 現在=${totalCost}, 追加=${cost}, 素材Lv=${materialLv}`;
      }
    }

    // ====== 判定ログ ======
    // console.log(
    //   `[Enchant] 判定: ${enchData.名前} → ${canApply ? "付与可能 ✅" : "付与不可 ❌"}`
    //   + ` (累計コスト=${totalCost}, 追加コスト=${cost}, 素材Lv=${materialLv})`
    //   + (!canApply ? ` | 理由: ${reason}` : "")
    // );


    // ====== 判定ログ ======
    if (!canApply) {
      return;
    }

    // ====== 付与可能ならコストを加算 ======
    totalCost += cost;

    // ====== 付与リストに追加 ======
    if (!Array.isArray(equip.付与)) equip.付与 = [];
    if (!equip.付与.some(e => e.名前 === enchData.名前)) {
      equip.付与.push(enchData);
    }
    
    // ====== 能力リストに追加 ======
    if (enchData.能力) {
      // console.log(`[Enchant] 能力判定: ${enchData.名前} → 能力キー=${enchData.能力}`);
      if (!equip.能力.includes(enchData.能力)) {
        equip.能力.push(enchData.能力);  // 名前だけ追加
        // console.log(`[Enchant] 能力追加(名前): ${enchData.能力}`);
      } else {
      // console.log(`[Enchant] 能力 ${enchData.能力} は既に追加済み`);
      }
    } else {
      // console.log(`[Enchant] 能力なし: ${enchData.名前}`);
    }



    // ====== 効果を適用 ======
    Object.keys(enchData).forEach(key => {
      if (["名前", "ルビ", "金額", "付与対象", "素材", "能力", "装備特性"].includes(key)) return;

      const before = toNumber(equip[key]);
      const value = toNumber(enchData[key]);

      const addVal = useMultiplier ? baseValue * value : value;
      const after = before + addVal;

      equip[key] = after;

      // console.log(
      //   `[Enchant] ${enchData.名前}: key=${key}, value=${value}, base=${baseValue}, add=${addVal}, before=${before}, after=${after}`
      // );
    });
  });
  // ====== 能力リストを Skill_List データに変換 ======
  if (equip.能力 && Array.isArray(equip.能力)) {
    equip.能力 = equip.能力
      .map(name => Skill_List.find(s => s.名前 === name || s.ID === name))
      .filter(Boolean); // 見つからなかったものは除外
  }
  // console.log("[createEquipment] 最終能力リスト:", equip.能力);
}




// ===== 武器生成 =====
function generateWeapon(baseData, material, enchantments = [], subMaterial=[]) {
  const equip = JSON.parse(JSON.stringify(equipmentemplate));
  // --- 基本情報 ---
  equip.分類 = baseData.名前; // 固定
  equip.素材 = material?.名前 || "";      // Excelや定義から取得した素材名
  equip.サブ素材 = subMaterial || "";     // 無ければ空白
  equip.種別 = baseData.種別 || "武器";  // 剣/槍/弓などのカテゴリ
  

  // 基本値の計算（素材×基礎値）
  ["全力", "切断", "貫通", "打撃", "射撃", "ガード"].forEach(key => {
    const baseVal = toNumber(baseData[key]);
    const materialVal = toNumber(material.物理);
    const result = baseVal * materialVal;

    //   console.log(`[generateWeapon] ${key}: base=${baseVal}, material.物理=${materialVal}, result=${result}`);

    equip[key] = result;
  });
    // console.log("=== 属性処理 ===")
    // console.log(material.属性)
  // 属性処理
  if (material.属性) {
    const attrs = material.属性.split("・");
    // console.log("=== attrs ===")
    // console.log(attrs)
    const value = toNumber(material.属性値) * toNumber(baseData.基礎値);
    const perAttr = attrs.length > 0 ? value / attrs.length : 0;
    attrs.forEach(attr => {


      equip[attr] = toNumber(equip[attr]) + perAttr;
    });
    equip.属性 = baseData.属性;
  }

  // 回避率・命中率（武器用）
  applyAccuracyEvasion(equip, baseData, material, false);

  // --- Cr率 / Cr威力 (武器限定) ---
  equip["Cr率"]   = (toNumber(baseData["Cr率"])  + toNumber(material["Cr率"]))*100 ;
  equip["Cr威力"] = (toNumber(baseData["Cr威力"]) + toNumber(material["Cr威力"]))*100 ;

  // --- 射程・弾倉・リロード時間・攻撃回数・攻撃タイプ・効果 ---
  equip["射程"]       = toNumber(baseData["射程"]);
  equip["弾倉"]       = toNumber(baseData["弾倉"]);
  equip["リロード時間"] = toNumber(baseData["リロード時間"]);
  equip["攻撃回数"]   = toNumber(baseData["攻撃回数"]);
  equip["攻撃タイプ"] = baseData["攻撃タイプ"] || "";

  equip["装備Lv"] = material.素材Lv;

  // console.log(`[createEquipment] 装備Lv設定: 素材=${material.名前 || "不明"} → 装備Lv=${equip["装備Lv"]}`);


  //   能力	装備特性
// --- 効果（カンマ区切りを配列化） ---
equip["装備特性"] = baseData["装備特性"]
  ? baseData["装備特性"].split(",").map(s => s.trim())
  : [];

// console.log("[createEquipment] 装備特性追加:", baseData["装備特性"], "→", equip["装備特性"]);


  // --- 素材の武器能力（カンマ区切りを配列化） ---
  equip["能力"] = material["武器能力"]
    ? material["武器能力"].split(",").map(s => s.trim())
    : [];

  // エンチャント適用（基礎値 × 倍率で加算）
  applyEnchantments(equip, enchantments, toNumber(baseData.基礎値), true);

  return equip;
}


// ===== 防具生成 =====
function generateArmor(baseData, material, enchantments = [], subMaterial=[]) {
  const equip = JSON.parse(JSON.stringify(equipmentemplate));
  
  // --- 基本情報 ---
  equip.分類 = baseData.名前; // 固定
  equip.素材 = material?.名前 || "";      // Excelや定義から取得した素材名
  equip.サブ素材 = subMaterial || "";     // 無ければ空白
  equip.種別 = baseData.種別 || "防具";  // 剣/槍/弓などのカテゴリ

  // 基本値の計算
  ["全力", "切断", "貫通", "打撃"].forEach(key => {
    equip[key] = (baseData[key] || 0) * (material.物理 || 1);
  });

  // 属性 → 耐性化
  if (material.属性) {
    const attrs = material.属性.split("・");
    const perAttr = (material.属性値 || 0) / attrs.length;
    // console.table("属性配列:", attrs);
    // console.log("物理軽減:", baseData.物理軽減);
    // console.log("属性ごとの加算値:", perAttr);
    attrs.forEach(attr => {
        if (attr === "物理") {
        equip["物理軽減"] += perAttr * baseData.物理軽減;
        } else if (attr === "魔法") {
        equip["魔法軽減"] += perAttr * baseData.物理軽減;
        }
        //  else if (attr === "精神攻撃") {
        // equip["精神耐性"] = (equip["精神耐性"] || 0) + perAttr;
        // } else {
        // equip[`${attr}耐性`] = (equip[`${attr}耐性`] || 0) + perAttr;
        // }
    });
  }

  // 素材に耐性データが含まれる場合を反映
  Object.keys(material).forEach(key => {
    if (key.endsWith("耐性")) {
      const val = Number(material[key]) || 0;
      if (val !== 0) {
        equip[key] = (equip[key] || 0) + val*baseData.物理軽減;
      }
    }
  });

  // 回避率・命中率（防具用）
  applyAccuracyEvasion(equip, baseData, material, true);

  // 物理軽減
  equip.物理軽減 = equip.物理軽減 + (baseData.物理軽減 || 0) * (material.物理 || 1);

  //   能力	装備特性
  // --- 装備特性（カンマ区切りを配列化） ---
  equip["装備特性"] = baseData["装備特性"]
    ? baseData["装備特性"].split(",").map(s => s.trim())
    : [];

  // --- 素材の防具能力（体防具のみ適用） ---
  if (baseData.種別 === "体") {
    equip["防具能力"] = material["防具能力"]
      ? material["防具能力"].split(",").map(s => s.trim())
      : [];
  } else {
    equip["防具能力"] = [];
  }
  equip["装備Lv"] = material.素材Lv;
  // エンチャント適用（基礎値 × 倍率で加算）
  applyEnchantments(equip, enchantments, toNumber(baseData.基礎値), true);

  return equip;
}

// ===== その他（装飾など） =====
function generateOther(baseData, material, enchantments = [], subMaterial=[]) {
  const equip = JSON.parse(JSON.stringify(equipmentemplate));
  // equip.種別 = baseData.種別 || "装飾品";
  // --- 基本情報 ---
  equip.分類 = baseData.名前; // 固定
  equip.素材 = material?.名前 || "";      // Excelや定義から取得した素材名
  equip.サブ素材 = subMaterial || "";     // 無ければ空白
  equip.種別 = baseData.種別 || "装飾品";  // 剣/槍/弓などのカテゴリ

  // 基本値の計算
  ["全力", "切断", "貫通", "打撃"].forEach(key => {
    equip[key] = (baseData[key] || 0) * (material.物理 || 1);
  });

  // 属性 → 耐性化
  if (baseData.属性) {
    const attrs = baseData.属性.split("・");
    const perAttr = (material.属性値 || 0) / attrs.length;
    attrs.forEach(attr => {
        if (attr === "物理") {
        equipment["物理軽減"] += perAttr;
        } else if (attr === "魔法") {
        equipment["魔法軽減"] += perAttr;
        } else if (attr === "精神攻撃") {
        equipment["精神耐性"] = (equipment["精神耐性"] || 0) + perAttr;
        } else {
        equipment[`${attr}耐性`] = (equipment[`${attr}耐性`] || 0) + perAttr;
        }
    });
  }


  // 回避率・命中率（防具用）
  ["回避率", "命中率"].forEach(key => {
    const baseVal = toNumber(baseData[key]);       // 例: -2.5, -5
    const materialFactor = toNumber(material.全力) / 100; 

    // 基礎値 × 補正率
    let calc = baseVal * materialFactor;

    // 最低保証値
    const min = toNumber(material.全力) > 100 ? (toNumber(material.全力) - 100) / 4 : 0;

    // 既存値（もし equip に何か入っていれば加算）
    const before = toNumber(equip[key]);
    const result = before + Math.max(calc, min);

    equip[key] = result;

    // デバッグログ（必要なら）
    // console.log(`[Armor ${key}] base=${baseVal}, factor=${materialFactor}, calc=${calc}, min=${min}, before=${before}, result=${result}`);
  });

  // 物理軽減
  equip.物理軽減 = (baseData.物理軽減 || 0) * (material.物理 || 1);

  //   能力	装備特性
  // --- 装備特性（カンマ区切りを配列化） ---
  equip["装備特性"] = baseData["装備特性"]
    ? baseData["装備特性"].split(",").map(s => s.trim())
    : [];

  equip["装備Lv"] = material.素材Lv;
  console.log("装飾品 :",enchantments)
  // エンチャント適用
  applyEnchantments(equip, enchantments, toNumber(baseData.基礎値), true);

  return equip;
}

// 装備品生成のエントリーポイント
export function createEquipment(type, materialName, enhancementNames = []) {
  if (!cachedWeapons || !cachedMaterials) {
    throw new Error("アイテムデータがロードされていません。先に loadItemData() を呼んでください。");
  }

  // データ取得
  const baseData = cachedWeapons.find(w => w.名前 === type);
  const material = cachedMaterials.find(m => m.名前 === materialName);

  if (!baseData) throw new Error(`基礎データが見つかりません: ${type}`);
  if (!material) throw new Error(`素材が見つかりません: ${materialName}`);


  // 判定
  const category = detectItemType(type);
  // console.log("[createEquipment] 引数1:", { type, materialName, enhancementNames, category , baseData});

  let equipment;
  switch (category) {
    case "武器":
      equipment = generateWeapon(baseData, material, enhancementNames);
      break;
    case "防具":
      equipment = generateArmor(baseData, material, enhancementNames);
      break;
    default: // 装飾など
      equipment = generateOther(baseData, material, enhancementNames);
      break;
  }

  // 素材の説明: "",
  // 武器の説明: "",
  // 説明: "",

  // // 名前と説明を整備
  // // 先頭のエンチャント名を冠する（複数ある場合は1つだけ）
  // const prefix = Array.isArray(enhancementNames) && enhancementNames.length > 0
  //   ? enhancementNames[0] + "・"
  //   : "";

  // equipment.名前 = `${prefix}${material.名前}の${baseData.名前}`;
  // equipment.素材 = material.名前;
  // equipment.説明 = [material.説明, baseData.説明].filter(Boolean).join(" ");
  // equipment.付与 = enhancementNames;
  equipment.素材の説明 = material.説明
  equipment.武器の説明 = baseData.説明
  // equipment.説明

  // ====== 能力リストを Skill_List データに変換 ======
  if (equipment.装備特性 && Array.isArray(equipment.装備特性)) {
    equipment.装備特性 = equipment.装備特性
      .map(name => Skill_List.find(s => s.名前 === name || s.ID === name))
      .filter(Boolean); // 見つからなかったものは除外
  }

  // ====== 金額を計算 ======
  const materialPrice = toNumber(material.金額); // 素材の金額
  const weaponPrice   = toNumber(baseData.金額); // 武器の基礎金額
  const materialLv    = toNumber(material.素材Lv);   // 素材のLv

  // 付与から魔法金額を集計
  let enchantPrice = 0;
  if (Array.isArray(equipment.付与)) {
    enchantPrice = equipment.付与.reduce((sum, ench) => {
      return sum + (toNumber(ench.金額) || 0);
    }, 0);
  }

  // 計算
  const part1 = materialPrice * weaponPrice;
  const part2 = materialLv * enchantPrice;
  equipment.金額 = part1 + part2;

  // 詳細ログ
  // console.log(
  //   `[Price] 金額計算: (${materialPrice} × ${weaponPrice} = ${part1}) + (${materialLv} × ${enchantPrice} = ${part2}) = ${equipment.金額}`
  // );


  equipment.id =  uuidv4()
  // === 生成結果ログ出力 ===
  // console.log(`[createEquipment] 生成完了: ${equipment.名前}`);
  // console.log(equipment);
  return equipment;
}

/**
 * DB保存データからゲーム用インベントリを再構築する
 * @param {Array} dbInventory - DBからロードしたインベントリ
 * @returns {Array} rebuiltInventory - 再構築済みインベントリ
 */
export function rebuildInventory(dbInventory) {
  const rebuiltInventory = [];

  for (const item of dbInventory) {
    try {
      // ===============================
      // 付与の normalize（最重要）
      // オブジェクト配列 → 名前の配列に戻す
      // ===============================
      let normalizedFuyu = [];

      if (Array.isArray(item.付与)) {
        if (typeof item.付与[0] === "object") {
          // ★ ビルド済み → 名前の配列へ変換
          normalizedFuyu = item.付与.map(f => f.名前);
        } else {
          // ★ 初期データ （["炎付与Ⅴ"]）
          normalizedFuyu = [...item.付与];
        }
      }

      // ===============================
      // 素材・道具・休憩系の処理
      // ===============================
      const type = item.種別;
      if (checkItem種別.includes(type)) {
        const base = Item_List.find(x => x.名前 === item.名前);
        if (!base) {
          console.warn(`Item_Listに存在しないアイテム: ${item.名前}`);
          continue;
        }

        rebuiltInventory.push({
          ...base,
          数量: item.数量 ?? 1
        });
        continue;
      }

      // ===============================
      // 装備品の再ビルド
      // normalizedFuyu を渡す！
      // ===============================
      const eq = createEquipment(item.分類, item.素材, normalizedFuyu);

      eq.id = item.id || eq.id;
      eq.装備中 = item.装備中 || null;
      eq.名前 = item.名前 || eq.名前;
      eq.ルビ = item.ルビ || eq.ルビ;

      rebuiltInventory.push(eq);

    } catch (err) {
      console.error(`インベントリ再構築中にエラー: ${item.名前}`, err);
    }
  }

  return rebuiltInventory;
}


/**
 * 装備中アイテム一覧だけ返す
 * @param {Array} inventory - 全所持品
 */
export function getEquippedItems(inventory = []) {
  return inventory.filter(item => item.装備中 && item.装備中 !== "");
}
