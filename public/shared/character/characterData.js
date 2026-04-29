// キャラクター1人分のテンプレート
export const characterDataTemplate = {
  id: "",       // キャラ固有ID
  name: "",     // 名前
  race: "",     // 種族

  // --- クラス・成長 ---
  Role: Array.from({ length: 20 }, () => ({
    roleName: null,
    Lv: 0,
    Ef: 0,
  })),

  // --- 基礎ステータス ---
  stats: {
    allLv: 0,
    allEf: 0,
    baseStats: {},        // HP, 攻撃, 防御などの基本値
    temporaryBonuses: {}, // 一時補正
    abilities: {},        // 習得技
    cooldowns: {},        // クールタイム
    statusEffects: [],    // 状態異常
    experience: 0,        // 経験値
    nextLevelExp: 100,    // 次レベル必要経験値
  },

  // --- 装備 ---
  equipmentSlot: {
    武器: null,
    武器2: null,
    頭: null,
    体: null,
    足: null,
    装飾1: null,
    装飾2: null,
  },
  inventory: [],     // 主人公が持っているアイテムリスト
  
  // --- 技・属性 ---
  skills: [],
  magic: [],
  attribute: null,

  // --- 配置 ---
  position: "前衛_1",

  // --- NPCフラグ ---
  isNPC: true,
  aiType: "support",

  // --- 細部追加 ---
  gender: null,     // 性別
  age: null,        // 年齢
  appearance: {     // 外見的特徴
    hairColor: "",
    eyeColor: "",
    skinColor: "",
    extra: "",      // 傷跡や特徴
  },

  // ==== ギルド関連 ====
  guild: {
    name: "",               // 所属ギルド名
    rank: 0,                // ギルドランク
    contributionPoints: 0,  // 貢献ポイント（ギルド内評価）
  },

  achievements: [], // 称号や実績
  relationships: {},// NPCや勢力との関係値
};

// プレイヤーごとのセーブデータ（主人公＋仲間全体をまとめて管理する）
// 主人公自身の基本情報＋進行状況＋仲間パーティの配列を持つ
export const playerGlobalData = {
  id: "",            // 主人公キャラクターの固有ID（セーブスロットやDB識別用）
  name: "",          // 主人公キャラクター名
  race: "",          // 主人公の種族（例: ヒューマン、エルフなど）
  class: "",
  
  // ==== 所持・進行系（プレイヤー全体で共有する資産や進行状況）====
  money: 0,          // 所持金
  maxInventory: 15,  // インベントリの上限
  storage: [],       // 倉庫に預けているアイテム
  location: "",      // 現在地（街やダンジョンなど）
  savePoint: null,   // 最後にセーブした場所
  memoryStreet: [],  // 転移で移動できる街の一覧（解放済みの街）
  questProgress: [], // クエスト進行状況（例: {id: "Q001", state: "進行中"}）
  storyFlags: {},    // ストーリーフラグ（イベント発生条件などの制御用）


  // ==== パーティデータ ====
  // 主人公以外の仲間キャラを配列として管理する
  // 各要素が「キャラクター単位のセーブデータ」と同等の情報を持つ
  party: [ structuredClone(characterDataTemplate) ],  // ← ここに characterDataTemplate を複数格納
};
