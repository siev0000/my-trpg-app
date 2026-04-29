// testData.js
// テスト用の初期キャラクターデータ

export const testCharacterData = {
  // === インベントリ ===
  inventory: [
    // --- 装備中アイテム ---
    {
      id: "eq_0001",
      名前: "木の剣",
      分類: "剣",
      素材: "木",
      付与: [],
      装備中: "武器"
    },
    {
      id: "eq_0002",
      名前: "皮の胴衣",
      分類: "鎧",
      素材: "皮",
      種別: "体",
      付与: [],
      装備中: "体"
    },
    {
      id: "eq_0003",
      名前: "皮の靴",
      分類: "防具",
      素材: "皮",
      種別: "足",
      能力: [],
      付与: [],
      装備特性: [],
      装備中: "足"
    },

    // --- 装備していないアイテム ---
    {
      id: "eq_0004",
      名前: "木の短刀",
      分類: "短剣",
      素材: "木",
      種別: "武器",
      能力: [],
      付与: [],
      装備特性: ["片手適正"],
      装備中: null
    },
    {
      id: "eq_0005",
      名前: "紫の冠",
      分類: "冠",
      素材: "魔法金属",
      種別: "頭",
      能力: [],
      付与: [],
      装備特性: [],
      装備中: null
    },

    // --- 道具 ---
    {
      itemId: "item_001",
      名前: "下位水薬",
      種別: "道具",
      数量: 3
    }
  ]
};

// src/testData.js
import { loadItemData, createEquipment, equipmentemplate, Item_List , rebuildInventory } from "@/constants/itemFactory.js"; // 装備生成 & データロード
import { logEquipment } from "@/constants/statData.js";                     // ログ出力関数

/**
 * 装備テストを実行
 */
export async function runEquipmentTest() {
  // データロード
  await loadItemData();

  // === 武器系 ===
  // const sword = createEquipment("短剣", "水晶鉄", ["闘気の一撃", "炎付与Ⅳ"]);
  // const spear = createEquipment("剣槍", "黒鉄", ["炎付与Ⅴ", "対魔Ⅱ"]);

  // // === 防具系 ===
  // const armor = createEquipment("鎧", "鋼", ["耐炎Ⅴ", "炎付与Ⅰ"]); // ← 炎付与ⅠはNG
  // const robe = createEquipment("法衣", "魔獣皮", ["精神耐性Ⅲ", "炎付与Ⅰ"]); // ← 炎付与ⅠはNG

  // // === 装飾品系 ===
  // const ring = createEquipment("指輪", "銀", ["毒耐性Ⅱ", "炎付与Ⅰ"]); // ← 炎付与ⅠはNG
  // const crown = createEquipment("冠", "金", ["精神耐性Ⅰ", "闘気の一撃"]); // ← 闘気の一撃はNG

  // // === ログ出力 ===
  // console.log("===== 武器: 短剣(水晶鉄) =====");
  // logEquipment(sword, equipmentemplate);

  // console.log("===== 武器: 剣槍(黒鉄) =====");
  // logEquipment(spear, equipmentemplate);

  // console.log("===== 防具: 鎧(鋼) =====");
  // logEquipment(armor, equipmentemplate);

  // console.log("===== 防具: 法衣(魔獣皮) =====");
  // logEquipment(robe, equipmentemplate);

  // console.log("===== 装飾: 指輪(銀) =====");
  // logEquipment(ring, equipmentemplate);

  // console.log("===== 装飾: 冠(金) =====");
  // logEquipment(crown, equipmentemplate);

  // console.log("Item_Listをロードする");
  // console.log(Item_List);
  const newInventory = rebuildInventory(dbEquipments);
  console.log(newInventory);

}

// DBから取得した簡易装備データ
const dbEquipments = [
  { id: "eq_0001", 名前: "木の剣", 分類: "剣", 素材: "木", 付与: [], 装備中: "武器" },
  { id: "eq_0002", 名前: "皮の胴衣", 分類: "鎧", 素材: "皮", 付与: [], 装備中: "体" },
  { 名前: "下位水薬", 種別: "道具", 数量: 3 },
  { 名前: "鉄", 種別: "素材", 数量: 5 }
];


