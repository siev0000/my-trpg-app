// statData.js
import { ref, toRaw } from 'vue';
import { playerGlobalData, characterDataTemplate } from "../scripts/characterData";
import { getEquippedItems } from "./itemFactory"; 

export const allData = ref([]);          // クラス・種族
export const attributeList = ref([]);    // 属性
export const race_attributes = ref([]);  // 種族ごとの初期ステータス補正
export const Skill_List = ref([]);       // 技
export const weaponList = ref([]);       // 武器・攻撃手段
export const itemList = ref([]);         // アイテム（消耗品・素材）
export const equipmentList = ref([]);    // 装備品（武器・防具・アクセ）
export const enemyList = ref([]);        // 敵データ
export const dungeonList = ref([]);      // ダンジョン構造（部屋・遭遇テーブル）
export const questList = ref([]);        // クエスト一覧
export const locationList = ref([]);     // 拠点・街・エリア

// 簡易デフォルトデータ　"剣槍", "黒鉄", ["炎付与Ⅴ", "対魔Ⅱ"]
const dbEquipments = [
  { id: "eq_0001", 名前: "木の剣", ルビ:"ウッドソード", 分類: "剣", 素材: "黒鉄", 付与: ["炎付与Ⅴ"], 装備中: "武器2" },
  { id: "eq_0002", 名前: "虹の短剣", ルビ:"レインボーナイフ", 分類: "短剣", 素材: "虹宝鋼", 付与: ["炎付与Ⅱ","闘気の一撃","氷付与Ⅱ"], 装備中: "武器" },
  { id: "eq_0003", 名前: "鋼の大剣", ルビ:"", 分類: "大剣", 素材: "鋼", 付与: ["炎付与Ⅱ","闘気の一撃","氷付与Ⅱ"], 装備中: "" },
  { id: "eq_0004", 名前: "皮の鎧", ルビ:"レザーアーマー", 分類: "鎧", 素材: "皮", 付与: [], 装備中: "体" },
  { id: "eq_0005", 名前: "鉄の鎧", ルビ:"レザーアーマー", 分類: "鎧", 素材: "鉄", 付与: [], 装備中: "" },
  { id: "eq_0006", 名前: "虹の鎧", ルビ:"レザーアーマー", 分類: "鎧", 素材: "虹宝鋼", 付与: [], 装備中: "" },
  { id: "eq_0007", 名前: "金鉄の鎧", ルビ:"レザーアーマー", 分類: "鎧", 素材: "金鉄", 付与: [], 装備中: "" },
  { id: "eq_0008", 名前: "黒鉄の鎧", ルビ:"レザーアーマー", 分類: "鎧", 素材: "黒鉄", 付与: [], 装備中: "" },
  { id: "eq_0009", 名前: "金鋼の鎧", ルビ:"レザーアーマー", 分類: "鎧", 素材: "金鋼", 付与: [], 装備中: "" },
  { id: "eq_0011", 名前: "黒鋼の鎧", ルビ:"レザーアーマー", 分類: "鎧", 素材: "黒鋼", 付与: [], 装備中: "" },
  { id: "eq_0012", 名前: "虹の兜", ルビ:"レザーアーマー", 分類: "兜", 素材: "虹宝鋼", 付与: ["威圧Ⅲ"], 装備中: "" },
  { id: "eq_0013", 名前: "虹の冠", ルビ:"レザーアーマー", 分類: "冠", 素材: "虹宝鋼", 付与: ["看破Ⅲ"], 装備中: "頭" },
  { id: "eq_0014", 名前: "虹の首飾り", ルビ:"", 分類: "首飾り", 素材: "虹宝鋼", 付与: ["魔法技術Ⅱ", "大精霊"], 装備中: "装飾" },
  { id: "eq_0015", 名前: "虹の指輪", ルビ:"", 分類: "指輪", 素材: "虹宝鋼", 付与: ["大精霊", "毒耐性Ⅲ"], 装備中: "装飾2" },
  { id: "eq_0016", 名前: "骨の靴", ルビ:"", 分類: "靴", 素材: "死霊の骨", 付与: ["大精霊", "毒耐性Ⅲ"], 装備中: "足" },
  { 名前: "下位水薬", 種別: "道具", 数量: 3 },
  { 名前: "鉄", 種別: "素材", 数量: 5 }
];

function normalize(str) {
  if (str == null) return "";
  return String(str)
    .replace(/\r?\n|\r/g, "")      // 改行削除
    .replace(/[\u3000]/g, " ")     // 全角スペース → 半角
    .trim();
}


// 初期全データ取得処理
export async function loadGameData() {
  if (allData.value.length) return;

  // ===== 基本データ =====
  const res1 = await fetch("/api/excel/classes");
  allData.value = await res1.json();          // クラス・種族

  const res2 = await fetch("/api/excel/attributes");
  attributeList.value = await res2.json();   // 属性

  const res3 = await fetch("/api/excel/race_attributes");
  race_attributes.value = await res3.json(); // 種族ステータス補正

  const res4 = await fetch("/api/excel/Skills");
  Skill_List.value = await res4.json();      // 技

  // --- Skill を Map 化（正規化して保存） ---
  const skillMap = new Map();
  Skill_List.value.forEach(skill => {
    const key = normalize(skill["名前"]);
    skillMap.set(key, skill);
  });

  // console.log("attributeList 前:", toRaw(attributeList.value));
  // --- 魔法リストを SkillData に置き換え ---
  attributeList.value = attributeList.value.map(attr => {
    const magicNames = attr["魔法リスト"] || [];

    const magicDetails = magicNames
      .map(name => {
        const key = normalize(name);
        const magic = skillMap.get(key);
        if (!magic) return null;

        return {
          ...magic,
          取得条件_parsed: parseMagicCondition(magic["取得条件"])
        };
      })
      .filter(Boolean);

    return {
      ...attr,
      魔法リスト: magicDetails
    };
  });

  console.log("attributeList 完成:", toRaw(attributeList.value));



  // ===== 戦闘関連 =====
  const res5 = await fetch("/api/excel/weapons");
  weaponList.value = await res5.json();      // 武器・攻撃手段（素手/爪/剣など）

  const res7 = await fetch("/api/excel/equipments");
  equipmentList.value = await res7.json();   // 装備品（武器/防具/アクセ）

  const res8 = await fetch("/api/excel/enemy");
  enemyList.value = await res8.json();       // 敵データ

  // ===== 冒険関連 =====
  const res6 = await fetch("/api/excel/items");
  itemList.value = await res6.json();        // アイテム（消耗品・素材）
  // console.log("")

  const res9 = await fetch("/api/excel/dungeon");
  dungeonList.value = await res9.json();     // ダンジョン（部屋構造・遭遇）

  const res10 = await fetch("/api/excel/quests");
  questList.value = await res10.json();      // クエスト一覧

  const res11 = await fetch("/api/excel/locations");
  locationList.value = await res11.json();   // 拠点・街・エリア
}

/**
 * 行動/分類が X で「〇〇の接続」という名前のスキルから属性名を拾う
 */
function extractAttributeFromSkills(skills = []) {
  if (!Array.isArray(skills)) return null;

  for (const skill of skills) {
    if (!skill) continue;

    const isConnectionSkill =
      skill.分類 === "X" ||
      skill.行動 === "X";

    if (!isConnectionSkill) continue;

    const name = normalize(skill.名前);
    const match = name.match(/^(.+?)の接続$/);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

// ログの出し
export async function logEquipment(equip) {
  if (!equip || typeof equip !== "object") return {};

  const ordered = {};
  const filtered = {};
  let i = 1;

  for (const [key, value] of Object.entries(equip)) {
    // ❌ 出力除外条件
    if (
      value === null ||
      value === undefined ||
      value === "" ||
      (typeof value === "number" && value === 0) ||
      (typeof value === "string" && value.trim() === "0") ||
      (Array.isArray(value) && value.length === 0)
    ) {
      continue;
    }

    // 🔹 表示用の整形処理
    let displayValue = value;
    if (Array.isArray(value)) {
      // 配列の中にオブジェクトがある場合 → 名前だけ抽出
      displayValue = value
        .map(v => {
          if (typeof v === "object" && v !== null) {
            // 名前キーがあるならそれだけ表示
            return v.名前 || v.name || "[無名]";
          }
          return String(v);
        })
        .join("・");
    } else if (typeof value === "object") {
      // オブジェクト単体なら名前を優先
      displayValue = value.名前 || value.name || "[Object]";
    }

    // ✅ 出力対象データのみ保持
    ordered[i.toString().padStart(3, "0")] = { key, value: displayValue };
    filtered[key] = value;
    i++;
  }

  // 🔸 ログ出力
  if (Object.keys(ordered).length > 0) {
    console.groupCollapsed(`装備ログ: ${equip.名前 || "(名称不明)"}`);
    console.table(ordered);
    console.groupEnd();
  } else {
    console.log(`装備ログ: ${equip.名前 || "(名称不明)"} は有効値なし`);
  }

  // 🔹 フィルタ済みデータを返す
  return filtered;
}




export const statMap = {
  ステータス: ['HP', 'MP', 'ST', '攻撃', '防御', '魔力', '精神', '回避', '命中', 'SIZ', 'APP'],
  技能: ['隠密', '感知', '威圧', '軽業', '技術', '早業', '看破', '騙す', '知識', '鑑定', '装置', '変装', '制作', '精神接続', '魔法技術', '指揮'],
  耐性: ['物理軽減', '魔法軽減','切断耐性', '貫通耐性', '打撃耐性', '炎耐性', '氷耐性', '雷耐性', '酸耐性', '音耐性', '光耐性', '闇耐性', '善耐性', '悪耐性', '正耐性', '負耐性',
         '精神耐性', '毒耐性', '盲目耐性', '幻覚耐性', '石化耐性', '怯み耐性', '拘束耐性', '呪い耐性', '即死耐性', '時間耐性', '出血耐性', '疲労耐性', '体幹耐性',
         '物理耐性', '魔法耐性', 'Cr率耐性', 'Cr威力耐性'],
  肉体: ['素手', '角', '牙', '爪', '翼', '尾', '外皮', '装甲', '再生'],
  技: ['Skill1', 'Skill2', 'Skill3', 'Skill4', 'Skill5', 'Skill6', 'Skill7', 'Skill8', 'Skill9', 'Skill10']
};

export const statDescriptions = {
  'HP': '生命力。数値が高いほど攻撃を受けられる',
  'MP': '魔力量。魔法使用時に消費',
  'ST': '持久力。技に使用',
  '攻撃': '攻撃力。物理攻撃の強さ',
  '防御': '物理防御の高さ、防御の上手さ。防御技を使うときに判定する',
  '魔力': '魔法攻撃の威力',
  '精神': '精神的耐久力や魔防に関係',
  '回避': '行動順・回避に影響',
  '命中': '命中率。攻撃の当たりやすさ',
  'SIZ': '体格。影響する技もある',
  'APP': '魅力。交渉や一部行動に影響',
  '切断耐性': '斬撃に対する防御力',
  '貫通耐性': '槍や矢など貫通攻撃の耐性',
  '打撃耐性': '鈍器など打撃への耐性',
  '炎耐性': '炎属性ダメージの軽減',
  '氷耐性': '氷属性ダメージの軽減',
  '雷耐性': '雷属性ダメージの軽減',
  '酸耐性': '腐食・酸に対する耐性',
  '音耐性': '音波・咆哮などへの耐性',
  '光耐性': '聖属性の攻撃への防御',
  '闇耐性': '闇属性攻撃の耐性',
  '善耐性': '善属性の攻撃への耐性',
  '悪耐性': '悪属性の攻撃への耐性',
  '正耐性': '秩序的な力への耐性',
  '負耐性': '混沌・虚無系の耐性',
  '精神耐性': '混乱・呪いなど精神系への耐性',
  '毒耐性': '毒状態に対する耐性',
  '盲目耐性': '視界を奪う状態異常への耐性',
  '幻覚耐性': '幻視や幻聴など精神錯乱への耐性',
  '石化耐性': '石化状態に対する耐性',
  '怯み耐性': '攻撃によるひるみを防ぐ耐性',
  '拘束耐性': '行動不能（縛り・凍結など）への耐性',
  '呪い耐性': '呪詛や封印などに関する耐性',
  '即死耐性': '一撃で倒される攻撃に対する抵抗',
  '時間耐性': '時間停止・遅延などの異常に対する耐性',
  '出血耐性': '持続ダメージ系の出血に対する耐性',
  '疲労耐性': '行動不能や技使用制限への耐性',
  '体幹耐性': '崩れ・転倒・体勢への影響に対する耐性',
  '物理耐性': '数値に応じて弱い物理攻撃を無効化することができる',
  '魔法耐性': '数値に応じて弱い魔法攻撃を無効化することができる',
  'Cr率耐性': 'クリティカルを受ける確率を少なくする',
  'Cr威力耐性': 'クリティカル時のダメージを軽減する',
  '隠密': '物陰に隠れる、気配を消す',
  '感知': '周囲の気配や罠を察知する',
  '威圧': '敵を怯ませる能力',
  '軽業': 'バランス感覚、飛び移りなど',
  '技術': '細かい作業に関係',
  '早業': '素早い手の動き、盗みなど',
  '看破': '相手の嘘や魔法を見破る',
  '騙す': '欺く、なりすます',
  '知識': '学術知識、魔法・歴史など',
  '鑑定': 'アイテムや敵の情報を見抜く',
  '装置': '機械や罠の操作に関係',
  '変装': '別人に見せかける技術、肉体操作の技術も含む',
  '制作': '物品の製作や修理',
  '精神接続': '精神で交信、干渉して遠隔操作するときの上手さ',
  '魔法技術': '魔法の緻密さや制御',
  '指揮': '味方の行動制御や士気操作'
};
/**
 * パーティのみを構築 (キャラクター配列を返す)
 */
export function buildPartyStats(partyRaw, context = {}) {
  return partyRaw.map(async member => {
    const char = structuredClone(characterDataTemplate);

    char.id   = member.id   ?? char.id;
    char.name = member.name ?? char.name;
    char.Role = structuredClone(member.Role ?? char.Role);

    
    // --- 種族分類の取得 ---
    const raceName = member.Role?.[0]?.roleName;  // Role[1] が種族
    const raceData = findRace(raceName);
    // console.log(raceName, raceData)
    char.race = raceData?.分類 ?? ""; 

    // ステータス・技反映
    applyRoleData(member); //ここでbaseStats入ってる
    char.stats.baseStats = member.stats?.baseStats ?? {};
    // char.stats.abilities = collectSkillsFromRoles(char) ?? [];
    // char.stats.activePassives = member.stats?.activePassives ?? [];
    
    char.skills = collectSkillsFromRoles(member) || [];
    // console.log("char.skills", char.skills)
    char.magic  = member.magic  ?? [];
    // const attributeFromSkills = extractAttributeFromSkills(char.skills);
    // // console.log("attributeFromSkills", attributeFromSkills, char.skills);

    // char.equipmentSlot = member.equipmentSlot ?? structuredClone(char.equipmentSlot);

    // // メンバーの属性（string or array or null）
    // let memberAttribute = member.attribute;

    // // 1. 属性が文字列なら配列化する
    // if (typeof memberAttribute === "string") {
    //   memberAttribute = memberAttribute.trim() !== "" ? [memberAttribute] : [];
    // }

    // // 2. null や undefined の場合 → 空配列化
    // if (!Array.isArray(memberAttribute)) {
    //   memberAttribute = [];
    // }

    // // 3. attributeFromSkills がある場合は追加
    // if (attributeFromSkills) {
    //   memberAttribute.push(attributeFromSkills);
    // }

    // // 4. 最終的に反映
    // char.attribute = memberAttribute.length > 0 ? memberAttribute : null;
    
    // スキルから取得した属性（string | string[] | null）
    const attributeFromSkills = extractAttributeFromSkills(char.skills);

    // equipmentSlot は既存のまま
    char.equipmentSlot = member.equipmentSlot ?? structuredClone(char.equipmentSlot);

    // 属性データの構築
    const attr = buildCharacterAttribute(member, char.skills);
    char.attribute = attr;

    // character.attribute = ["地", "炎", "光", "風", "水"];
    //5. 魔法データの取得
    char.magic = await magicGetData(char)

    char.position  = member.position  ?? "前衛_1";
    
    char.inventory =
      Array.isArray(member.inventory) && member.inventory.length > 0
        ? member.inventory
        : dbEquipments;
    // console.log("インベントリ", char.inventory);
    //  props.character?.inventory?.length > 0 ? props.character.inventory : dbEquipments;
    // char.stats.totalStats = 
    // パッシブ適用（calcTotalStats の返却値を使う）
    const { totalStats, activePassives } = calcTotalStats(
      char.stats.baseStats,
      char.skills,
      context
    );

    // 正しくセット
    char.stats.totalStats = totalStats;
    char.stats.activePassives = activePassives;

    char.isNPC = member.isNPC ?? char.isNPC;
    char.aiType = member.aiType ?? char.aiType;
    // ★ 合計Lvの計算を追加
    char.stats.allLv = char.Role.reduce((sum, r) => sum + (r?.Lv || 0), 0);

    // ギルド情報
    char.guild = {
      ...char.guild,
      ...(member.guild || {})
    };
    return char;
  });
}

/**
 * party全員のキャラデータを構築
 * @param {object} rawData - DBやAPIから取得した生データ
 * @param {object} context - 行動情報など
 * @returns {object} playerGlobalData 形式のデータ
 */
export async function buildCharacterStats(rawData, context = {}) {
  // playerGlobalData をベースにコピー
  const built = structuredClone(playerGlobalData);

  // 主人公情報
  // --- トップレベル（渡された値があれば優先） ---
  built.id   = rawData.id   ?? built.id;
  built.name = rawData.name ?? built.name;
  built.race = rawData.race ?? built.race;
  built.class = rawData.class ?? built.class;

  built.money = rawData.money ?? built.money;
  built.storage   = rawData.storage   ?? built.storage;
  built.location  = rawData.location  ?? built.location;
  built.savePoint = rawData.savePoint ?? built.savePoint;
  built.questProgress = rawData.questProgress ?? built.questProgress;
  built.storyFlags    = rawData.storyFlags    ?? built.storyFlags;


  // --- パーティ（各キャラを characterDataTemplate で補完） ---
  built.party = await Promise.all(buildPartyStats(rawData.party || [], context));
  // console.log("built",built)

  return built;
}

// ===== アイコン・イラストの一括読み込み =====


// 共通マッピング関数
function mapIcons(mods) {
  const icons = {};
  for (const [path, url] of Object.entries(mods)) {
    const filename = path.split("/").pop().replace(/\.webp$/i, "");
    icons[filename] = url;
  }
  return icons;
}

// SE用マッピング関数（拡張子を除去）
function mapSE(mods) {
  const sounds = {};
  for (const [path, url] of Object.entries(mods)) {
    const filename = path.split("/").pop().replace(/\.(mp3|wav)$/i, "");
    sounds[filename] = url;
  }
  return sounds;
}

// SE読み込み
const seMods = import.meta.glob(
  "/src/assets/audio/se/*.{mp3,wav,flac}",
  { eager: true, as: "url" }
);
export const SE_SOUNDS = mapSE(seMods);

const sePlayers = new Map();
let seMasterVolume = 1;
const clamp01 = value => Math.max(0, Math.min(1, value));

export function setSEMasterVolume(value) {
  const next = clamp01(Number(value) || 0);
  seMasterVolume = next;
  sePlayers.forEach(audio => {
    if (!audio) return;
    const base = typeof audio.__baseVolume === "number" ? audio.__baseVolume : audio.volume;
    audio.__baseVolume = clamp01(base);
    audio.volume = clamp01(audio.__baseVolume * seMasterVolume);
  });
}

export function getSEMasterVolume() {
  return seMasterVolume;
}

// 値からSEを鳴らす共通処理
export function playSE(value, options = {}) {
  if (typeof Audio === "undefined") return;
  const { volume = 0.8, rate = 1, loop = false, id = null } = options;
  const key = value || "ui_click";
  const url = SE_SOUNDS[key];
  if (!url) return;

  const playerKey = id || key;
  if (loop && sePlayers.has(playerKey)) {
    const current = sePlayers.get(playerKey);
    current.pause();
    sePlayers.delete(playerKey);
  }

  const audio = new Audio(url);
  const baseVolume = clamp01(volume);
  audio.__baseVolume = baseVolume;
  audio.volume = clamp01(baseVolume * seMasterVolume);
  audio.playbackRate = rate;
  audio.loop = loop;
  audio.currentTime = 0;
  audio.play().catch(() => {});

  if (loop) {
    sePlayers.set(playerKey, audio);
  }
}

export function stopSE(id) {
  const key = id || "ui_click";
  const audio = sePlayers.get(key);
  if (!audio) return;
  audio.pause();
  sePlayers.delete(key);
}

/* =====================================
   取得ヘルパー
===================================== */
// 属性アイコン
const attrIconMods = import.meta.glob(
  "/src/assets/images/属性アイコン/100/*.webp",
  { eager: true, as: "url" }
);
export const ATTR_ICONS = mapIcons(attrIconMods);
// 属性
export function getAttrIcon(name) {
  return name && ATTR_ICONS[name] ? ATTR_ICONS[name] : "";
}
// 属性500アイコン
const attrIcon500Mods = import.meta.glob(
  "/src/assets/images/属性アイコン/500/*.webp",
  { eager: true, as: "url" }
);
export const ATTR_ICONS_500 = mapIcons(attrIcon500Mods);
// 属性500 
export function getAttrIcon500(name) {
  return name && ATTR_ICONS_500[name] ? ATTR_ICONS_500[name] : "";
}

// 攻撃手段アイコン
const attackIconMods = import.meta.glob(
  "/src/assets/images/攻撃手段/*.webp",
  { eager: true, as: "url" }
);
export const ATTACK_ICONS = mapIcons(attackIconMods);
// 攻撃手段
export function getAttackIcon(name) {
  return name && ATTACK_ICONS[name] ? ATTACK_ICONS[name] : "";
}

// キャラクターイラスト
const charIllustMods = import.meta.glob(
  "/src/assets/images/illust/*.webp",
  { eager: true, as: "url" }
);
export const CHAR_ILLUSTS = mapIcons(charIllustMods);
// キャラクター
export function getCharIllust(name) {
  return name && CHAR_ILLUSTS[name] ? CHAR_ILLUSTS[name] : "";
}

// ロールアイコン
const roleIconMods = import.meta.glob(
  "/src/assets/images/role/*.webp",
  { eager: true, as: "url" }
);
export const ROLE_ICONS = mapIcons(roleIconMods);

// ロールアイコン
export function getRollIcon(name) {
  const entry = allData.value.find(c => c.名前 === name);
  const result = entry.画像url && ROLE_ICONS[entry.画像url] ? ROLE_ICONS[entry.画像url] : "";
  return result;
}

// 背景イラスト
const backgroundMods = import.meta.glob(
  "/src/assets/images/locations/*.webp",
  { eager: true, as: "url" }
);
export const BACKGROUND_ILLUSTS = mapIcons(backgroundMods);
// 背景
export function getBackgroundIllust(name) {
  return name && BACKGROUND_ILLUSTS[name] ? BACKGROUND_ILLUSTS[name] : "";
}

// UI用イラスト取得
const uiMods = import.meta.glob(
  "/src/assets/images/ui/*.webp",
  { eager: true, as: "url" }
);
export const ui_ILLUSTS = mapIcons(uiMods);
// 背景
export function getUillust(name) {
  return name && ui_ILLUSTS[name] ? ui_ILLUSTS[name] : "";
}

//★=== 戦闘関連ヘルパー ==============================================================================
/**
 * 武器データを名前で取得
 * @param {string} name - 攻撃手段名（例: "素手", "爪", "牙"）
 */
export function findWeapon(name) {
  return weaponList.value.find(w => w.名前 === name) || null;
}

/**
 * 攻撃手段の威力を算出
 * @param {string} name - 攻撃手段名（例: "素手", "爪"）
 * @param {number} charValue - キャラ固有値 (playerGlobalData.stats["爪"] など)
 * @returns {object|null} 威力結果
 */
export function calcWeaponPower(name, charValue = 0) {
  const weapon = findWeapon(name);
  if (!weapon) return null;

  const value = Number(charValue) || 0;

  return {
    名前: weapon.名前,
    種別: weapon.種別,
    全力: weapon.全力,

    // 威力（キャラ値 × 割合）
    切断: value * (parseFloat(weapon.切断 || 0) / 100),
    貫通: value * (parseFloat(weapon.貫通 || 0) / 100),
    打撃: value * (parseFloat(weapon.打撃 || 0) / 100),

    // 追加情報
    ガード: value * (parseFloat(weapon.ガード || 0) / 100),
    射撃: value * (parseFloat(weapon.射撃 || 0) / 100),
    最低ダメージ: weapon.最低ダメージ,

    // クリティカル
    Cr率: weapon.Cr率 || "10%",
    Cr威力: weapon.Cr威力 || "125%",

    // 命中・回避補正
    回避率: weapon.回避率,
    命中率: weapon.命中率
  };
}


/**
 * クラスを検索
 */
export function findClass(name) {
  return allData.value.find(c => c.名前 === name && c.分類 === "クラス") || null;
}

/**
 * 種族名からレコードを検索
 * @param {string} name - 種族名 (例: ヒューマン, エルフ, ドワーフ)
 * @returns {object|null} 種族データ（分類: 人族/亜人/魔族 を含む）
 */
export function findRace(name) {
  return allData.value.find(c => c.名前 === name) || null;
}


/**
 * キャラクターの属性構造を構築する
 * - selected : 選択した属性（順序あり）
 * - skill    : スキル由来属性（属性名 → 個数）
 *
 * @param {object} member - メンバー情報（attribute を含む）
 * @param {any[]} skills - キャラのスキル一覧
 * @returns {{ selected: string[], skill: Record<string, number> }}
 */
export function buildCharacterAttribute(member, skills) {
  // ================================
  // 初期化
  // ================================
  const result = {
    selected: [],
    skill: {},
  };

  // ================================
  // 選択した属性（member.attribute）
  // ================================
  let memberAttribute = member?.attribute;

  if (typeof memberAttribute === "string") {
    memberAttribute = memberAttribute.trim() ? [memberAttribute] : [];
  }

  if (!Array.isArray(memberAttribute)) {
    memberAttribute = [];
  }

  // 順序を保ったまま格納
  result.selected = memberAttribute;

  // ================================
  // スキル由来属性
  // ================================
  const attributeFromSkills = extractAttributeFromSkills(skills);

  if (attributeFromSkills) {
    const skillAttrs = Array.isArray(attributeFromSkills)
      ? attributeFromSkills
      : [attributeFromSkills];

    for (const attr of skillAttrs) {
      if (!attr) continue;
      result.skill[attr] = (result.skill[attr] ?? 0) + 1;
    }
  }

  return result;
}

//★=== キャラクターステータス ==============================================================================
/**
 * characterData にステータスと技を付与する
 * @param {object} characterData - キャラ作成時のデータ
 * @returns {object} 更新済みキャラデータ
 */
export function applyRoleData(mainChar) {
  if (!mainChar) return;

  if (!mainChar.stats) {
    mainChar.stats = { baseStats: {}, abilities: {} };
  }

  const keys = [
    ...statMap["ステータス"],
    ...statMap["技能"],
    ...statMap["耐性"],
    ...statMap["肉体"],
  ];

  keys.forEach(key => {
    if (statMap["肉体"].includes(key)) {
      // ★ 肉体（生存系）は別方式で最大値を算出
      mainChar.stats.baseStats[key] = calcBodyMax(key, mainChar.Role);
      return;
    }

    if (statMap["耐性"].includes(key)) {
      // 耐性
      mainChar.stats.baseStats[key] = sumFlatResistances(key, mainChar.Role);
      return;
    }
    // 通常ステータス
    mainChar.stats.baseStats[key] = baseStatsTotal(key, mainChar.Role);

  });

  // console.log(`[applyRoleData] ${mainChar.name} のステータス計算完了`, mainChar.stats.baseStats);
  return mainChar;
}

// 耐性計算
function sumFlatResistances(key, roles) {
  return roles.reduce((sum, role) => {
    if (!role.roleName) return sum;

    const data = selectStatsData(role.roleName);
    const base = Number(data?.[key] || 0);
    return sum + base;
  }, 0);
}
// 肉体計算
function calcBodyMax(key, roles) {
  let max = 0;

  for (const role of roles) {
    if (!role?.roleName) continue;

    const data = selectStatsData(role.roleName);
    const base = Number(data?.[key] || 0);
    max += base;
  }

  return max;
}

/**
 * 指定ステータスの合計値（Lv比例で全Role合算）
 * ※ SIZのみ例外：Lv関係なく最大値を返す
 * ※ 最終結果は四捨五入
 */
export function baseStatsTotal(statKey, role) {
  if (!role) return 0;

  const roles = role.filter(r => r.roleName);

  // === SIZだけ特殊 ===
  if (statKey === "SIZ") {
    const maxValue = roles.reduce((max, role) => {
      const data = selectStatsData(role.roleName);
      const base = data?.[statKey] || 0;
      return Math.max(max, base);
    }, 0);
    return Math.round(maxValue);
  }

  // === 通常処理 ===
  const total = roles.reduce((sum, role, index) => {
    // Role[0] のみ Lv+5 として扱う
    const extraLv = index === 0 ? 5 : 0;

    return sum + calcRoleStat(role, statKey, extraLv);
  }, 0);

  return Math.round(total);
}

/**
 * 単一Roleの指定ステータス値を取得（Lv比例）
 * ※ SIZ・耐性は例外：Lvによる補正なし
 */
export function calcRoleStat(role, statKey, extraLv = 0) {
  if (!role?.roleName) return 0;

  const data = selectStatsData(role.roleName);
  const base = Number(data?.[statKey] || 0);

  // === SIZ は Lv の影響なし ===
  if (statKey === "SIZ") {
    return base;
  }

  // === 耐性 は Lv の影響なし ===
  if (statMap["耐性"].includes(statKey)) {
    return base;
  }

  // === 通常ステータス・技能のみ Lv 補正 ===
  const lv = (role.Lv || 0) + extraLv;
  return (base / 10) * lv;
}
// データ全体を検索して返す
const selectStatsData = (name) => {
  const statsDataObj = allData.value.find(c => c.名前 === name);
  return statsDataObj
};

/**
 * SIZ補正を適用して最終値を返す
 * @param {number|string} value  元の値
 * @param {string} key           ステータス名
 * @param {number} siz           SIZ値（未指定なら100扱い）
 */
export function applySizeBonus(value, key, siz = 170) {
  // 型チェック
  const keyType = typeof key;

  if (keyType !== "string") {
    // 文字列に変換して処理継続
    key = String(key ?? "");
  }

  const baseValue = typeof value === "number" ? value : parseFloat(value) || 0;
  const bonusPercent = getSizeBonus(siz);

  // トリム
  const trimmedKey = key.trim();

  // デバッグログ
  // console.log("=== SIZ補正デバッグ ===", {
  //   originalKey: key,
  //   trimmedKey,
  //   baseValue,
  //   bonusPercent,
  //   siz
  // });

  const bonusKeysPlus  = ['HP', '攻撃', '威圧'];
  const bonusKeysMinus = ['回避', '隠密', '軽業'];

  let newValue = baseValue;

  // ------ プラス補正 ------
  if (bonusKeysPlus.includes(trimmedKey)) {

    if (trimmedKey === '威圧') {
      newValue = baseValue + Math.round(bonusPercent);
    } else {
      const mult = 1 + bonusPercent / 100;
      newValue = Math.round(baseValue * mult);
    }
    // console.log("[applySizeBonus] ▶ プラス補正", trimmedKey, newValue);
  }

  // ------ マイナス補正 ------
  else if (bonusKeysMinus.includes(trimmedKey)) {

    if (trimmedKey === '隠密' || trimmedKey === '軽業') {
      newValue = baseValue - Math.round(bonusPercent);
    } else {
      const mult = 1 + bonusPercent / 100;
      newValue = Math.round(baseValue * (1 / mult));
    }
    // console.log("[applySizeBonus] ▶ マイナス補正", trimmedKey, newValue);
  }
  return newValue;
}



// サイズボーナスの計算
export function getSizeBonus(siz) {
  if (siz >= 180) {
    return Math.round((siz-180) / 54.6 + 5);;
  } else if (siz <= 150) {
    return -Math.round((160 - siz) / 3);
  } else {
    return 0;
  }
}


/**
 * パッシブ技の条件チェック（AND条件、複数技対応）
 * @param {object} skill - 技データ
 * @param {object|Array} context - 技の使用情報
 *   例: { 技一覧: [ {攻撃手段, 使用技, 使用系統}, ... ] }
 */
export function checkPassiveCondition(skill, context = {}) {
  // context が {技一覧: [...]} ならそれを使う
  const contextList = Array.isArray(context.技一覧)
    ? context.技一覧
    : [context];

  // ★「どれか1つの技でも条件を満たせば true」
  return contextList.some(ctx => {
    // ①攻撃手段の条件
    if (skill.攻撃手段 && skill.攻撃手段 !== ctx.攻撃手段) return false;

    // ②使用技の条件
    if (skill.条件 && skill.条件 !== ctx.使用技) return false;

    // ③系統条件
    if (skill.条件系統 && skill.条件系統 !== ctx.使用系統) return false;

    // 上記すべてを通れば 1技としては一致
    return true;
  });
}


/**
 * パッシブ技を総合ステータスに反映
 * @param {object} baseStats - 素のステータス（Role計算済）
 * @param {Array}  skills - スキル配列（collectSkillsFromRoles から取得）
 * @param {object} context - 発動条件
 * @returns {{ totalStats: object, activePassives: Array }}
 */
export function calcTotalStats(baseStats,skills = [],context = {}) {
  // 基礎
  const total = structuredClone(baseStats);
  const activePassives = [];

  // ============================
  // 1) パッシブの加算
  // ============================
  for (const skill of skills) {
    if (skill.行動 !== "P") continue;

    const isActive = checkPassiveCondition(skill, context);
    if (!isActive) continue;

    activePassives.push(skill);

    for (const key in skill) {
      if (["名前","行動","攻撃手段","条件","条件系統"].includes(key)) continue;

      const val = parseFloat(skill[key]);
      if (!isNaN(val)) {
        total[key] = (total[key] || 0) + val;
      }
    }
  }

  // ============================
  // 3) 結果
  // ============================
  return {
    totalStats: total,
    activePassives
  };
}

/**
 * 装備をパッシブ扱いに変換、一部スキルを出力する。
 * → activePassives に入れるための構造を作る
 */
export async function createEquipTotalSkill(equippedItems) {
  const equippedItem = getEquippedItems(equippedItems);
  // console.log("== createEquipTotalSkill ==",equippedItem)
  const EQUIP_KEYS = [
    ...statMap.ステータス,
    ...statMap.技能,
    ...statMap.耐性,
  ];

  const equipSkill = {
    名前: "装備合計効果", ルビ: "",
    系統: "", 行動: "P", Rank: "",
    装備由来: true,
    効果概要: "", 説明: "",
    ID: "item_all",
    攻撃手段: "", 条件: "", 条件系統: "", 特殊: "",
  };

  // --- 装備名一覧を説明に入れる ---
  const equipNames = equippedItem
    .map(eq => eq?.名前 || "")
    .filter(n => n !== "");

  equipSkill.説明 = equipNames.length > 0
    ? `装備: ${equipNames.join(" / ")}`
    : "装備なし";

  // --- 能力値合計の準備 ---
  const total = {};
  for (const key of EQUIP_KEYS) {
    total[key] = 0;
  }

  // --- 合計を作る ---
  for (const eq of equippedItem) {
    for (const key of EQUIP_KEYS) {
      const val = Number(eq[key]);
      if (!isNaN(val)) {
        total[key] += val;
      }
    }
  }

  // --- skill に合計値をコピー（0 以外のみ） ---
  for (const key of EQUIP_KEYS) {
    if (total[key] !== 0) {
      equipSkill[key] = total[key];
    }
  }

  // --- 効果概要を作成（0 のものは表示しない） ---
  const effects = [];
  for (const key of EQUIP_KEYS) {
    if (total[key] !== 0) {
      effects.push(`${key}+${total[key]}`);
    }
  }

  equipSkill.効果概要 = effects.join(" / ");

  // 装備スキル一覧（能力から抽出）
  const useSkills = await collectEquipSkills(equippedItem);

  // console.log("== createEquipTotalSkill skill==", equipSkill, useSkills)
  return {
      equipStats: equipSkill,   // Pスキル（装備合計効果）
      equipSkills: useSkills    // 装備スキル一覧
  };
}
// equippedItems: 装備中になっているアイテム配列
// 例: const equippedItems = inventory.filter(item => item.装備中);
export function collectEquipSkills(equippedItems = []) {
  const result = [];
  const seen = new Set(); // 重複排除用（IDベース）

  for (const item of equippedItems) {
    if (!item || !Array.isArray(item.能力)) continue;

    for (const skill of item.能力) {
      if (!skill) continue;

      // ID があれば ID 優先で重複排除
      const key = skill.ID || skill.名前;
      if (!key) {
        result.push(skill);
        continue;
      }

      if (seen.has(key)) continue;
      seen.add(key);
      result.push(skill);
    }
  }

  return result;
}



/**
 * ロール行（種族/クラス）から、Lvに応じて Skill1..Skill10 を抽出し、
 * Skill_List で詳細に解決して配列を返す。
 * @param {Object} entry - allData の1行（{ 名前, Skill1..Skill10, ... }）
 * @param {number} uptoLv - 取得上限Lv（例：5なら Skill1..Skill5）
 * @returns {Array<Object>} - Skill_List の行オブジェクト配列
 */
function getSkillsByLevelFromEntry(entry, uptoLv) {
  if (!entry || !Skill_List.value?.length) return [];
  const max = Math.max(0, Math.min(10, Number(uptoLv) || 0));
  const names = [];
  for (let i = 1; i <= max; i++) {
    const cell = entry[`Skill${i}`];
    if (!cell) continue;
    // カンマ区切り複数にも対応
    String(cell)
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)
      .forEach(n => names.push(n));
  }
// Skill_List から詳細解決 & 重複除去（名前キー）
const seen = new Set();
const resolved = [];

for (const n of names) {

  // ▼ 魔法取得◯ は重複可 → seen を無視して全部残す
  const match = n.match(/^魔法取得(\d+)$/);
  if (match) {
    resolved.push({ 名前: n, value: Number(match[1]) });
    continue; // ← seen を使わない！
  }

  // ▼ 通常スキルは重複排除
  if (seen.has(n)) continue;

  const s = Skill_List.value.find(x => x?.名前 === n);
  if (s) {
    resolved.push({ ...s });
  } else {
    resolved.push({ 名前: n });
  }

  seen.add(n);
}
  // console.log(`[getSkillsByLevelFromEntry] ${names}  ${entry.名前} Lv${uptoLv} →`, resolved);
  return resolved;
}

/**
 * Role 配列を走査して、各ロール(Lv>0)の Skill1..Skill10 をLv上限まで取得。
 * allData からロール名（種族/クラス）一致の行を探して集約します。
 * @param {Object} mainChar - characterData.party[0]
 * @returns {Array<Object>} - 取得技配列（重複名は自動排除）
 */
export function collectSkillsFromRoles(mainChar) {
  if (!mainChar?.Role?.length || !allData.value?.length) return [];

  const acquired = [];
  for (const r of mainChar.Role) {
    const name = r?.roleName;
    const lv = Number(r?.Lv) || 0;
    if (!name || lv <= 0) continue;

    // allData は 種族/クラス 混在。名前一致で拾う
    const entry = allData.value.find(row => row?.名前 === name);
    if (!entry) continue;

    acquired.push(...getSkillsByLevelFromEntry(entry, lv));
  }

  // 名前重複を最終的にも除去
  const mapByName = new Map();
  const result = [];

  for (const s of acquired) {

    // 魔法取得◯ は重複OK
    if (/^魔法取得(\d+)$/.test(s.名前)) {
      result.push(s);
      continue;
    }

    // 通常スキルは重複排除
    if (!mapByName.has(s.名前)) {
      mapByName.set(s.名前, s);
      result.push(s);
    }
  }

  return result;
}

// レベルアップ
export async function statusUpdate(character) {
  // ① Roleを適用して baseStats 更新
  character = await applyRoleData(character);

  // ② Role + 装備 のスキルをまとめて取得
  const allSkills = await collectSkillsFromRoles(character);
  character.skills = allSkills;
  // character.skills.push(allSkills);
  // character.stats.activePassives.push(allSkills);

  // ③ パッシブ + 装備効果 を合算した totalStats を作成
  const { totalStats, activePassives } = await calcTotalStats(
    toRaw(character.stats.baseStats),
    toRaw(character.skills),
    {}
  );

  character.stats.activePassives = activePassives;
  character.stats.totalStats = totalStats;
  const { equipStats, equipSkills } = await createEquipTotalSkill(toRaw(character.inventory));

  // character.attribute = ["地", "炎", "光", "風", "水"];
  character.magic = await magicGetData(character)

  // スキル一覧へ追加
  if (Array.isArray(equipSkills)) {
    for (const s of equipSkills) {
      character.skills.push(s);
    }
  }
  // 装備の能力値を追加
  character.stats.activePassives.push(equipStats);

  // console.log('== equipStats ==', equipStats, character.stats.activePassives)
  // console.log('== equipSkill ==', equipSkills, character.skills)

  return character;
}

// 次の経験値
export function getExperience(type, Lv, maxLevel = 60) {
  if (Lv < 1 || Lv > maxLevel) {
    throw new Error(`レベルは1から${maxLevel}の間で指定してください。`);
  }
  const experienceTable = generateExperienceTable(type, Lv, maxLevel);
  return experienceTable[Lv - 1]; // 指定されたレベルの経験値を返す
}
// 経験値テーブル生成
export function generateExperienceTable(type, Lv, maxLevel = 100) {
  const experienceTable = [0]; // レベル1は0経験値
  let growthRate;
  console.log("generateExperienceTable", type, Lv, maxLevel)

  for (let level = 1; level <= maxLevel; level++) {
    switch (type) {
      case "魔族":
        // レベル15までは急速成長、16以降は停滞
        growthRate = level <= 15
          ? 100 + level * 5  // レベル15までは速い
          : 200 + level * 10; // レベル16以降は急増
        break;
      case "亜人":
        // 一貫して安定した成長
        growthRate = level <= 15
          ? 150 + level * 5  // レベル15までは速い
          : 150 + level * 9; // レベル16以降は急増
        break;
      case "人族":
        // レベル15までは遅い、16以降は急成長
        growthRate = level <= 15
          ? 175 + level * 5  // レベル15までは遅い
          : 150 + level * 8; // レベル16以降は速い
        break;
      default:
        growthRate = level <= 15
          ? 150 + level * 5  // レベル15までは速い
          : 150 + level * 9; // レベル16以降は急増
        throw new Error("無効なタイプです");
    }
    experienceTable.push(experienceTable[level - 1] + growthRate); // 累積経験値
  }

  return experienceTable;
}

// 属性条件チェック（OR条件）
export function checkAttributeConditionOR(attr, acquiredSet) {
  // acquiredSet が Set でなければ保険
  if (!(acquiredSet instanceof Set)) return false;

  const conds = [attr.条件1, attr.条件2]
    .filter(c => typeof c === "string" && c.trim() !== "");

  // 条件なし → OK
  if (conds.length === 0) return true;

  const needAttrs = conds
    .flatMap(c => c.split(","))
    .map(s => s.trim())
    .filter(Boolean);

  // OR条件
  return needAttrs.some(a => acquiredSet.has(a));
}



// ==== ギルドランクスタイル ====
export const rankStyles = {
  7: { name: "赤鉄", color: "darkred", symbol: "❖", outline: "white" },
  6: { name: "青鉄", color: "blue", symbol: "❖", outline: "white" },
  5: { name: "銀鉄", color: "#82ffe6", symbol: "★", outline: "white" },
  4: { name: "白金", color: "#c8f7ff", symbol: "✪", outline: "yellow" },
  3: { name: "金", color: "gold", symbol: "✷", outline: "black" },
  2: { name: "銀", color: "#C0C0C0", symbol: "✦", outline: "black" },
  1: { name: "銅", color: "#c87209", symbol: "✧", outline: "black" },
};

// ==== ギルドランク検索 ====
export function getRankStyleByName(name) {
  return Object.values(rankStyles).find(r => r.name === name) || null;
}



/**
 * 指定した要素に文字を収める
 * @param {string} className - 対象要素のclass
 * @param {number} maxWidth - 許容する最大幅(px)
 * @param {string} text - 表示する文字列
 */
export function fitTextToWidth(className, maxWidth, text, fontSize = 30) {
  const els = document.querySelectorAll(`.${className}`);
  if (!els.length) return;

  els.forEach((el) => {
    // 文字数（nullや空白時は1文字として扱う）
    const len = text ? text.length : 1;

    // 1文字あたりの幅(px)
    let charWidth = maxWidth / len;

    // 最大値を30pxに制限
    if (charWidth > fontSize) charWidth = fontSize;

    // フォントサイズを設定
    el.style.fontSize = `${charWidth}px`;

    console.log(
      `fitTextToWidth: '${text}' len=${len}, charWidth=${charWidth}px`
    );
  });
}
/**
 * 1つのDOM要素に対して、横幅に収まるように文字サイズを調整する
 * 
 * @param {HTMLElement} el        - 対象のDOM要素
 * @param {number} maxWidth       - 許容する最大幅(px)
 * @param {string} text           - 表示文字列
 * @param {number} maxFontSize    - 最大フォントサイズ
 * @param {number} minFontSize    - 最小フォントサイズ
 */
export function fitTextForElement(
  {el, maxWidth, text, maxFontSize = 30, minFontSize = 10}) {
  if (!el) return;

  // 表示文字列セット
  el.textContent = text ?? "";

  // 計算用の初期フォントサイズ
  let size = maxFontSize;

  // 一時的に適用して width を計測
  el.style.fontSize = `${size}px`;

  // 実測値が maxWidth を超える間、小さくしていく
  while (el.scrollWidth > maxWidth && size > minFontSize) {
    size -= 1;
    el.style.fontSize = `${size}px`;
  }

  // デバッグ
  console.log(
    `fitTextForElement: text='${text}', width=${el.scrollWidth}, fontSize=${size}px`
  );
}
const displayRuby = (val) => {
  return val === 0 ? '' : val;
};

/**
 * 技詳細をHTMLでレンダリングする
 * @param {object} selectedSkillDetail - 技データオブジェクト
 * @returns {string} HTML文字列
 */
export function renderSkillHtml(selectedSkillDetail) {
  console.log("renderSkillHtml called:", "selectedSkillDetail.value:", selectedSkillDetail);
  const d = selectedSkillDetail;

  // if (!d) {
  //   return selectedKey.value
  //     ? (statDescriptions[selectedKey.value] || "説明がありません")
  //     : "項目を選択すると説明が表示されます";
  // }

  // 攻撃手段アイコン
  const icon = (d.攻撃手段 && getAttackIcon(d.攻撃手段))
    ? `<img 
          src="${getAttackIcon(d.攻撃手段)}" 
          alt="${d.攻撃手段}" 
          style="width:55px; height:55px; object-fit:contain; vertical-align:middle;"
      >`
    : "";

  // 行動タイプに応じたスタイル
  const getActionStyle = (action) => {
    if (action === 'A') return 'background-color: rgba(255, 0, 0, 0.2);';
    if (action === 'S') return 'background-color: rgba(255, 255, 0, 0.2);';
    if (action === 'Q') return 'background-color: rgba(0, 255, 0, 0.2);';
    return '';
  };
  
  const actionStyle = d.行動 ? getActionStyle(d.行動) : '';

  // 判定と追加威力
  const judgeHtml = (() => {
    let html = "";
    if (d.判定) {
      html += `${d.判定}<span style="font-size:25px; font-weight:bold; line-height:0; color:#ff0000;">⬆⬆</span>`;
    }
    if (d.判定 && d.追加威力) {
      html += `<span style="display:inline-block; width:15px;"></span>`;
    }
    if (d.追加威力) {
      html += `${d.追加威力}<span style="font-size:25px; font-weight:bold; line-height:0; color:#ff6600;">⬆</span>`;
    }
    if (!d.判定 && !d.追加威力) {
      html = "なし";
    }
    return html;
  })();

  return `
    <div>
      <div style="height:45px; display:grid; grid-template-columns:2fr 5.5fr 1.5fr 1fr; align-items:center; gap:4px; text-align:center; margin-bottom: 10px;">
        <span style="font-size:30px; text-align:center; display:inline-flex; align-items:center; gap:6px;">
          ${icon}
          <span style="white-space:nowrap;">${d.攻撃手段 || ""}</span>
        </span>

        <ruby style="font-size:30px; height:48px; margin-top:0; padding-bottom: 0px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; font-weight:bold; ${actionStyle}">
          ${d.名前}
          <rt>${displayRuby(d.ルビ)}</rt>
        </ruby>

        <span style="font-size:30px; text-align:center;">
          ${d.系統 === 0 ? "" : d.系統}
        </span>

        <span style="font-size:30px; text-align:center; ${actionStyle}">
          ${d.行動 || ""}
        </span>
      </div>

      <hr style="margin:4px 0;">

      <div style="display:flex; align-items:center; height:20px; gap:0.5em;">
        <span style="min-width:8em; font-weight:bold;">使用するステータス:</span>
        <span style="display:flex; align-items:center; gap:4px;">
          ${judgeHtml}
        </span>
      </div>

      <hr style="margin:4px 0;">

      <div style="font-size:23px; display:flex; height:78px; overflow-y:auto;">
        ${d.説明 || ""}
      </div>
    </div>
  `;
}

/*
  ===== 取得条件パーサ =====
*/
function parseMagicCondition(conditionText) {
  if (!conditionText || typeof conditionText !== "string") {
    return {
      属性: [],
      ロール: [],
      スキル: [],
      能力値: []
    };
  }

  const result = {
    属性: [],
    ロール: [],
    スキル: [],
    能力値: []
  };

  // ,（半角・全角）で分割
  const parts = conditionText.split(/[,\uFF0C]/);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const [rawKey, rawValue] = trimmed.split(":");
    if (!rawKey || !rawValue) continue;

    const key = rawKey.trim();
    const value = rawValue.trim();

    // 能力値（比較式）
    if (key === "能力値") {
      const match = value.match(/^(.+?)(>=|<=|>|<|=)(\d+)$/);
      if (!match) continue;

      const [, stat, op, num] = match;
      result.能力値.push({
        key: stat.trim(),
        op,
        value: Number(num)
      });
      continue;
    }

    // 通常条件（| 区切り対応）
    const values = value.split("|").map(v => v.trim());

    if (key === "属性") result.属性.push(...values);
    else if (key === "ロール") result.ロール.push(...values);
    else if (key === "スキル") result.スキル.push(...values);
  }

  return result;
}





/* 
  ★★★★
  ===== 魔法自動取得ロジック =====
*/
  // デバッグフラグ
  const DEBUG_MAGIC = true;

  // 魔法取得数のテーブル
  const BASE_TABLE = [
    [3,3,3,3,3,3,3], // Rank1
    [3,3,3,3,3,2,2], // Rank2
    [3,3,3,2,2,1,1], // Rank3
    [3,3,2,2,1,1,1], // Rank4
    [3,2,2,1,1,1,1], // Rank5
    [2,2,1,1,0,0,0], // Rank6
    [2,1,1,0,0,0,0], // Rank7
  ];
  const BASE_SKILL_TABLE = [
    [3,3,3], // Rank1
    [3,3,3], // Rank2
    [3,3,3], // Rank3
    [3,3,3], // Rank4
    [3,3,3], // Rank5
    [2,2,3], // Rank6
    [1,2,3], // Rank7
  ];
  const BASE_TABLE_OVER = [
    [3,3,3,3,3,3,3], // Rank1
    [3,3,3,3,3,2,2], // Rank2
    [3,3,3,3,3,3,3], // Rank3
    [3,3,3,3,3,3,3], // Rank4
    [3,3,3,3,3,2,2], // Rank5
    [3,3,3,2,2,1,1], // Rank6
    [3,3,2,2,1,1,0], // Rank7
    [3,2,2,1,1,0,0], // Rank8
    [2,2,1,1,0,0,0], // Rank9
    [2,1,1,0,0,0,0], // Rank10
  ];

// ランクごとの必要魔力ポイント表
const RANK_POINT_TABLE = [
  { rank: 1, min: 0,  max: 5  },
  { rank: 2, min: 6,  max: 12 },
  { rank: 3, min: 13, max: 20 },
  { rank: 4, min: 21, max: 29 },
  { rank: 5, min: 30, max: 38 },
  { rank: 6, min: 39, max: 47 },
  { rank: 7, min: 48, max: 56 },
  { rank: 8, min: 57, max: Infinity } // 最終到達
];

  // 魔法ランク解除判定
  function getUnlockedRank(magicPoint) {
    for (const row of RANK_POINT_TABLE) {
      if (magicPoint >= row.min && magicPoint <= row.max) {
        return row.rank;
      }
    }
    return 1;
  }


  // ▼ スキルから魔法ポイントを計算する関数
  export function getMagicPointFromSkills(skills) {
    if (!Array.isArray(skills)) return 0;

    let total = 0;

    for (const skill of skills) {
      if (!skill || !skill.名前) continue;

      // 「魔法取得◯」パターンに完全一致
      const match = skill.名前.match(/^魔法取得(\d+)$/);

      if (match) {
        const value = Number(match[1])+1;
        if (!isNaN(value)) {
          total += value;
        }
      }
    }

    return total;
  }

  // 魔法を取得
  export async function magicGetData(character){
    console.log(" == magicGetData == ",character);
    let magicPoint = getMagicPointFromSkills(character.skills);
    
    const conditionalAcquired = splitAttributeMagicByCondition(
      attributeList.value
    );

    // 条件魔法リストのみ抽出
    const conditionalByAttr = Object.fromEntries(
      Object.entries(conditionalAcquired)
        .map(([attr, v]) => [attr, v.conditional ?? []])
        .filter(([_, list]) => list.length > 0)
    );
    if (DEBUG_MAGIC) {
      console.log("conditionalByAttr", conditionalByAttr);
      console.log("p=1.0", buildProgressedMagicLearnTable(6, 1.0));
      console.log("skillTable", buildSkillLearnTable(6, character.skills));
      // character.attribute.selected = ["地","炎","光","水"];
      // magicPoint = 23; // デバッグ用強制値
    }


    const magicData = autoAcquireMagic(
      character,
      attributeList.value,
      magicPoint, // ← magicPoint
      conditionalByAttr
    )

    if (DEBUG_MAGIC) {
      console.log("-- 取得魔法 --", toRaw(magicData));
    }
    return magicData;
  }




  // 魔法取得の進捗計算
  function calcProgressedDiff(diff, progress) {
    if (diff <= 0) return 0;

    const p = Math.max(0, Math.min(1, Number(progress) || 0));

    // ★ diffが3以上のときだけ、初期値として+1を付ける
    const start = diff >= 3 ? 1 : 0;

    // 70%で最大に到達（それ以上は打ち止め）
    const t = Math.min(p / 0.7, 1);

    // start から diff まで進捗に応じて増やす
    const value = start + (diff - start) * t;

    // 四捨五入して整数化、かつ 0〜diff にクランプ
    return Math.max(0, Math.min(diff, Math.round(value)));
  }

  // maxRankを入れるだけで、せり上げ後の表を返す
  // 例: maxRank=3 なら Rank1〜3 は通常、Rank4〜7 は0
  function buildMagicLearnTable(maxRank) {
    const table = {};
    const start = 7 - maxRank; // 下から切り出す開始位置

    for (let r = 1; r <= 7; r++) {
      if (r <= maxRank) {
        table[`Rank${r}`] = BASE_TABLE[start + (r - 1)].slice();
      } else {
        table[`Rank${r}`] = [0,0,0,0,0,0,0];
      }
    }
    return table;
  }

// スキル別取得数テーブル作成
function buildSkillLearnTable(baseRank, skill) {
  console.log("buildSkillLearnTable called:", skill, "baseRank:", baseRank);

  const result = {};
  if (!skill || typeof skill !== "object") return result;

  const start = 7 - baseRank; // ★ ここが重要（せり上げ）

  for (const [skillName, rawLevel] of Object.entries(skill)) {
    const level = Number(rawLevel);
    const colIndex = Math.max(0, Math.min(2, level - 1)); // 右にずれる

    result[skillName] = {};

    for (let rank = 1; rank <= 7; rank++) {
      if (rank <= baseRank) {
        const row = BASE_SKILL_TABLE[start + (rank - 1)] || [0,0,0];
        result[skillName][`Rank${rank}`] = row[colIndex] ?? 0;
      } else {
        result[skillName][`Rank${rank}`] = 0;
      }
    }
  }

  return result;
}

  /**
   * from=buildMagicLearnTable(baseRank)
   * to  =buildMagicLearnTable(baseRank+1)
   * diff=(to-from) に progress を掛けて四捨五入し、from に足す
   * @param {number} baseRank   例: 2（Rank3に上がる途中なら、2→3の補間）
   * @param {number} progress   0.0〜1.0
   * @returns {{Rank1:number[],Rank2:number[],...,Rank7:number[]}}
   */
function buildProgressedMagicLearnTable(
  baseRank,
  progress,
  attribute,
) {
  const skillObj = attribute?.skill || [];
  const attributeSelected = attribute?.selected || [];
  // ① まずは今まで通り「生テーブル」を作る
  const fromTable = buildMagicLearnTable(baseRank - 1);
  const toTable   = buildMagicLearnTable(baseRank);

  const rawTable = {};

  for (let rank = 1; rank <= 7; rank++) {
    const fromRow = [...(fromTable[`Rank${rank}`] || [0,0,0,0,0,0,0])];
    const toRow   = toTable[`Rank${rank}`] || [0,0,0,0,0,0,0];

    // 進行中ランクの開始保証（元ロジック維持）
    if (rank === baseRank && fromRow[0] === 0) {
      fromRow[0] = 1;
    }

    rawTable[`Rank${rank}`] = fromRow.map((from, i) => {
      const to = toRow[i] ?? 0;
      return from + calcProgressedDiff(to - from, progress);
    });
  }

  // ② ここからが変更点：属性 selected のみ展開
  const result = {};

  attributeSelected.forEach((attr, index) => {
    result[attr] = {};
    for (let rank = 1; rank <= 7; rank++) {
      result[attr][`Rank${rank}`] =
        rawTable[`Rank${rank}`]?.[index] ?? 0;
    }
  });

  // skill（同じレベルで混ぜる）
  if (skillObj && typeof skillObj === "object") {
    const skillTable = buildSkillLearnTable(baseRank, skillObj);
    for (const [name, ranks] of Object.entries(skillTable)) {
      result[name] = ranks;
    }
  }

  if (DEBUG_MAGIC) {
    console.log("buildProgressedMagicLearnTable result:", result);
  }

  return result;
}


  // ランク進捗取得
  function getRankProgress(magicPoint, rank) {
    const row = RANK_POINT_TABLE.find(r => r.rank === rank);
    if (!row) return 0;

    const span = row.max - row.min;
    if (span <= 0) return 1;

    return Math.max(
      0,
      Math.min(1, (magicPoint - row.min) / span)
    );
  }
  
// 条件がない魔法のみを取得
function acquireMagicByTable(attributeList, learnTable) {
  if (DEBUG_MAGIC) {
    console.log(
      "acquireMagicByTable called:",
      attributeList,
      learnTable
    );
  }

  const result = {};

  for (const [name, rankTable] of Object.entries(learnTable)) {
    const attrData = attributeList.find(a => a.属性名 === name);
    if (!attrData) continue;

    const magicList = attrData.魔法リスト ?? [];
    result[name] = [];

    for (let r = 1; r <= 7; r++) {
      const limit = rankTable[`Rank${r}`] ?? 0;
      if (limit <= 0) continue;

      const candidates = magicList.filter(m => {
        const mr = Number(String(m.Rank).trim());
        const raw = typeof m.取得条件 === "string"
          ? m.取得条件.trim()
          : "";
        return mr === r && (raw === "" || raw === "0");
      });

      result[name].push(...candidates.slice(0, limit));
    }
  }

  if (DEBUG_MAGIC) {
    console.log("acquireMagicByTable result:", result);
  }
  return result;
}



  // 属性ごとに通常魔法と条件魔法を分離する
  function splitAttributeMagicByCondition(attributeList) {
    const byAttr = {}; // { 属性名: { normal: [], conditional: [] } }

    for (const attr of attributeList) {
      const attrName = attr?.属性名;
      if (!attrName) continue;

      const list = Array.isArray(attr.魔法リスト) ? attr.魔法リスト : [];

      const normal = [];
      const conditional = [];

      for (const magic of list) {
        const cond = magic?.取得条件;

        // 条件なし（0）
        if (cond === 0) {
          normal.push(magic);
          continue;
        }

        // 条件あり（文字列）
        if (typeof cond === "string" && cond.trim() !== "" && cond !== "0") {
          conditional.push(magic);
          continue;
        }

        // 例外は「なし扱い」
        normal.push(magic);
      }

      byAttr[attrName] = { normal, conditional };
    }

    return byAttr;
  }

  // 取得条件をチェック（parsed 前提・全条件AND + 属性別Rank上限）
  function checkMagicConditionParsed(magic, char, learnTable) {
  const parsed = magic?.取得条件_parsed;
  if (!parsed) return true;

  const name = magic?.名前 ?? "(no name)";
  const magicRank = Number(magic?.Rank ?? 0);

  const charRoles = (char.Role ?? [])
    .map(r => r?.roleName)
    .filter(Boolean);

  const charMagics = char.magic?.magicListAll ?? [];
  const charStats  = char.stats?.baseStats ?? {};

  // ----------------------------
  // 属性条件（Rank）
  // ----------------------------
// ----------------------------
// 属性条件（Rank）
// ----------------------------
if (Array.isArray(parsed.属性) && parsed.属性.length > 0) {
  for (const attr of parsed.属性) {
    const rankTable = learnTable?.[attr];
    if (!rankTable) {
      if (DEBUG_MAGIC) {
        console.warn(
          `[NG][属性] ${magic?.名前} : ${attr} の learnTable が存在しない`
        );
      }
      return false;
    }

    let unlockedRank = 0;
    for (let r = 1; r <= 7; r++) {
      if ((rankTable[`Rank${r}`] ?? 0) > 0) unlockedRank = r;
    }

    if (DEBUG_MAGIC) {
      console.log(
        `[CHK][属性] ${magic?.名前}`,
        {
          attr,
          magicRank,
          unlockedRank,
          rankTable
        }
      );
    }

    if (unlockedRank < magicRank) {
      if (DEBUG_MAGIC) {
        console.warn(
          `[NG][属性] ${magic?.名前} : ${attr} unlockedRank=${unlockedRank} < magicRank=${magicRank}`
        );
      }
      return false;
    }
  }
}

  // ----------------------------
  // ロール条件
  // ----------------------------
  if (Array.isArray(parsed.ロール) && parsed.ロール.length > 0) {
    if (!parsed.ロール.every(r => charRoles.includes(r))) return false;
  }

  // ----------------------------
  // スキル条件（取得済み魔法）
  // ----------------------------
  if (Array.isArray(parsed.スキル) && parsed.スキル.length > 0) {
    if (!parsed.スキル.every(s =>
      charMagics.some(m => m.名前 === s)
    )) return false;
  }

  // ----------------------------
  // 能力値条件
  // ----------------------------
  if (Array.isArray(parsed.能力値) && parsed.能力値.length > 0) {
    for (const c of parsed.能力値) {
      const v = charStats?.[c.key] ?? 0;
      if (!compareValue(v, c.op, c.value)) return false;
    }
  }

  return true;
}



  // 属性ごとの連続ランクを取得
  function getContinuousAttributeRank(learnTable, attrIndex) {
    let rank = 0;

    for (let r = 1; r <= 7; r++) {
      const v = learnTable[`Rank${r}`]?.[attrIndex] ?? 0;
      if (v > 0) {
        rank = r;
      } else {
        break; // ここが重要：途切れたら終了
      }
    }

    return rank;
  }


  /**
   * 条件魔法を acquired と同じ形式（属性別）で取得
   *   character : キャラクター情報
   *   acquiredNormalByAttr : 取得魔法 { 属性名: [魔法オブジェクト, ...], ... }
   *   conditionalMagicList : 条件魔法リスト（配列 or 属性別オブジェクト）
   *   attrProgressMap : 属性ごとの進捗情報 { 属性名: { rank: n, progress: x.xx }, ... }
   */
  // function acquireConditionalMagicByAttr(
  //   character,
  //   acquiredNormalByAttr,
  //   conditionalMagicList,
  //   attrProgressMap
  // ) {
  //   if (DEBUG_MAGIC) {
  //     console.log("=== acquireConditionalMagicByAttr START ===");
  //     console.log("character.attribute:", character);
  //     console.log("attrProgressMap:", attrProgressMap);
  //     console.log("acquiredNormalByAttr:", acquiredNormalByAttr);
  //     console.log("conditionalMagicList(raw):", conditionalMagicList);
  //   }
  //   const normalAll = Object.values(acquiredNormalByAttr ?? {}).flat();
  //   const alreadyAll = [
  //     ...normalAll,
  //     ...(character.magicListAll ?? [])
  //   ];

  //   const result = {};

  // for (const ap of attrProgressMap) {
  //   const attr = ap.attr;
  //   const unlockedRank = ap.rank;

  //   if (!character.attribute.selected.includes(attr)) continue;
  //   if (!unlockedRank) continue;

  //   const list = conditionalMagicList[attr];
  //   if (!Array.isArray(list) || list.length === 0) continue;

  //   const attrMagics = [];

  //   for (const magic of list) {
  //     // Rank制御
  //     if (Number(magic.Rank) > unlockedRank) continue;

  //     // 条件チェック
  //     if (magic.取得条件_parsed) {
  //       if (!checkMagicConditionParsed(magic, character, attrProgressMap)) continue;
  //     }

  //     // 既取得チェック
  //     if (alreadyAll.some(m => m.名前 === magic.名前)) continue;

  //     attrMagics.push(magic);
  //   }

  //   if (attrMagics.length > 0) {
  //     result[attr] = attrMagics;
  //   }
  // }


  //   return result;
  // }
  function acquireConditionalMagicByAttr(
  character,
  acquiredNormalByAttr,
  conditionalMagicList,
  learnTable
) {
  if (DEBUG_MAGIC) {
    console.log("=== acquireConditionalMagicByAttr START ===");
    console.log("character:", character);
    console.log("learnTable:", learnTable);
    console.log("acquiredNormalByAttr:", acquiredNormalByAttr);
    console.log("conditionalMagicList:", conditionalMagicList);
  }

  const normalAll = Object.values(acquiredNormalByAttr ?? {}).flat();
  const alreadyAll = [
    ...normalAll,
    ...(character.magicListAll ?? [])
  ];

  const result = {};

  for (const [name, rankTable] of Object.entries(learnTable)) {
    const list = conditionalMagicList?.[name];
    if (!Array.isArray(list) || list.length === 0) continue;

    // 解放済み最大Rank
    let unlockedRank = 0;
    for (let r = 1; r <= 7; r++) {
      if ((rankTable[`Rank${r}`] ?? 0) > 0) unlockedRank = r;
    }
    if (unlockedRank === 0) continue;

    const picked = [];

    for (const magic of list) {
      if (Number(magic.Rank) > unlockedRank) continue;

      if (magic.取得条件_parsed) {
        if (!checkMagicConditionParsed(magic, character, learnTable)) continue;
      }

      if (alreadyAll.some(m => m.名前 === magic.名前)) continue;

      picked.push(magic);
    }

    if (picked.length > 0) {
      result[name] = picked;
    }
  }

  return result;
}

  // 属性別取得魔法マージ（名前で重複排除）
  function mergeAcquiredByAttr(base, added) {
    const result = {};

    const allAttrs = new Set([
      ...Object.keys(base ?? {}),
      ...Object.keys(added ?? {})
    ]);

    for (const attr of allAttrs) {
      const baseList = base?.[attr] ?? [];
      const addedList = added?.[attr] ?? [];

      // 名前で重複排除
      const merged = [...baseList];
      for (const m of addedList) {
        if (!merged.some(x => x.名前 === m.名前)) {
          merged.push(m);
        }
      }

      if (merged.length > 0) {
        result[attr] = merged;
      }
    }

    return result;
  }

  /*
      魔法を作成するメイン関数
  */
  function autoAcquireMagic(character, attributeList, magicPoint, conditionalMagicList = []) {
    if (DEBUG_MAGIC) {
      console.log("#############################");
      console.log("### autoAcquireMagic START ###");
      console.log("magicPoint:", magicPoint);
      console.log("attributes:", character.attribute);
      console.log("character:", character);
    }
    const attribute = character.attribute || [];
    const magic = []

    // 1. ランク決定
    const rank = getUnlockedRank(magicPoint);
    // 2. ランク進捗
    const progress = getRankProgress(magicPoint, rank);
    if (DEBUG_MAGIC) {
      console.log("currentRank:", rank);
      console.log(
        "rankProgress:",
        progress.toFixed(3),
        `(${Math.round(progress * 100)}%)`
      );
    }

    // 3. 習得表作成
    const learnTable =
        buildProgressedMagicLearnTable(rank, progress, attribute);

    if (DEBUG_MAGIC) {
      console.log("=== Magic Learn Table ===");
      console.log(learnTable);
    }

    // 4. 通常魔法取得（表ベース）
    const acquired = 
    acquireMagicByTable(attributeList, learnTable);

    if (DEBUG_MAGIC) {
      console.log("=== Acquired Normal Magic ===");
      Object.entries(acquired).forEach(([attr, magics]) => {
        console.log(
          `[${attr}]`,
          magics.map(m => `R${m.Rank}:${m.名前}`).join(", ")
        );
      });
    }


    // 4.4 キャラクターにセット
    magic.magicRank = rank;
    magic.magicLearnTable = learnTable;
    magic.magicRankProgress = progress;

    // 4.5 条件魔法も「属性別 acquired 形式」で取得→マージ
    const newlyAcquiredConditional = acquireConditionalMagicByAttr(
      character,
      acquired,
      conditionalMagicList,
      learnTable,
    );

    if (DEBUG_MAGIC) {
      console.log("=== Acquired Conditional Magic ===", newlyAcquiredConditional);
    }

    // ★ 通常魔法 + 条件魔法 を結合
    const acquiredAll = mergeAcquiredByAttr(acquired, newlyAcquiredConditional);

    if (DEBUG_MAGIC) {
      console.log("=== Acquired Magic (Merged) ===", acquiredAll);
    }

    // 5. 最終セット
    magic.magicListByAttr = acquiredAll;

    if (DEBUG_MAGIC) {
      console.log(toRaw(character));
      console.log(toRaw(acquired));
      console.log(toRaw(conditionalMagicList));
      console.log("### autoAcquireMagic END ###");
      console.log("#############################");
    }

    return (magic);
  }
