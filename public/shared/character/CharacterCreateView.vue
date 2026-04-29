<template>
    <div class="container">
      <h1>キャラクター作成</h1>

      <form @submit.prevent="openLevelModal">
        <!-- 名前入力と作成完了ボタンを横並び -->
        <div class="name-and-button">
          <label id="name_input" for="name">キャラクター名
          <input
            type="text"
            id="name"
            v-model="characterName"
            placeholder="名前を入力"
          /></label>
          <button
            type="button"
            class="create-btn"
            :disabled="!isCharacterValid"
            @click="confirmCharacter"
          >
            作成完了
          </button>

        </div>


        <!-- タブ切り替え -->
        <div class="tabs">
          <button
            v-for="tab in tabs"
            :key="tab"
            :class="{ active: activeTab === tab }"
            @click="activeTab = tab"
          >
            {{ tab }}
          </button>
        </div>

        <!-- タブ内容 -->
        <div v-if="tabs.includes(activeTab)">
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th
                    @click="openAttributeModal"
                    :class="['clickable_Attribute', { ready: selectedRace && selectedClass }]"
                  >
                    <div class="attr-cell">
                      <img
                        v-if="selectedAttribute"
                        :src="getAttrIcon(selectedAttribute.属性名)"
                        :alt="selectedAttribute.属性名"
                        class="icon-Attribute-img"
                      />
                      <span>
                        {{ selectedAttribute?.属性名 || "属性を選択" }}
                      </span>
                    </div>
                  </th>
                  <th>合計</th>
                  <th @click="showRaceModal = true" class="clickable">
                    <img
                      v-if="selectedRace?.画像url"
                      :src="getRollIcon(selectedRace.名前)"
                      :alt="selectedRace.名前"
                      class="icon-img"
                    />
                    {{ selectedRace?.名前 || "種族を選択" }}
                  </th>
                  <th @click="showClassModal = true" class="clickable">
                    <img
                      v-if="selectedClass?.画像url"
                      :src="getRollIcon(selectedClass.名前)"
                      :alt="selectedClass.名前"
                      class="icon-img"
                    />
                    {{ selectedClass?.名前 || "クラスを選択" }}
                  </th>
                </tr>
                <tr>
                  <td>Lv</td>
                  <td>{{ raceLv + classLv }}</td>
                  <td><input type="number" v-model.number="raceLv" min="0" /></td>
                  <td><input type="number" v-model.number="classLv" min="1" /></td>
                </tr>
              </thead>
              <tbody v-if="activeTab !== '技'">
                <tr v-for="stat in statMap[activeTab]" :key="stat">
                  <td @click="selectKey(stat)">{{ stat }}</td>
                  <td>{{ getDisplayValue(totalStats[stat] || 0, stat) }}</td>
                  <td>{{ raceStats[stat] || 0 }}</td>
                  <td>{{ classStats[stat] || 0 }}</td>
                </tr>
              </tbody>
              <!-- Skill表示 -->
              <tbody v-else>
                <tr v-for="i in 10" :key="'skill-'+i">
                  <td>技</td>
                  <td>{{ i }}</td>

                  <!-- 種族 -->
                  <td>
                    <div v-if="i <= raceLv" class="skill-cell">
                      <div
                        class="skill-inner"
                        :class="typeClass(getSkillType(selectedRace?.[`Skill${i}`]))"
                        @click="onSkillSelect(selectedRace?.[`Skill${i}`])"
                      >
                        <div class="skill-name">{{ selectedRace?.[`Skill${i}`] || '' }}</div>
                      </div>
                    </div>
                  </td>

                  <!-- クラス -->
                  <td>
                    <div v-if="i <= classLv" class="skill-cell">
                      <div
                        class="skill-inner"
                        :class="typeClass(getSkillType(selectedClass?.[`Skill${i}`]))"
                        @click="onSkillSelect(selectedClass?.[`Skill${i}`])"
                      >
                        <div class="skill-name">{{ selectedClass?.[`Skill${i}`] || '' }}</div>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>

            </table>
          </div>
        </div>
      </form>

      <!-- 選択項目の説明 -->
      <div class="skill-detail-box" v-if="selectedSkillDetail">
        <div class="skill-header">
          <span class="skill-keito">
            <img
              v-if="getAttackIcon(selectedSkillDetail?.攻撃手段)"
              :src="getAttackIcon(selectedSkillDetail?.攻撃手段)"
              :alt="selectedSkillDetail?.攻撃手段 || ''"
              class="skill-keito__icon"
            />
            <span class="skill-keito__label">{{ selectedSkillDetail?.攻撃手段 }}</span>
          </span>
          <ruby class="skill-name-detail-box" :class="typeClass(selectedSkillDetail.行動)">
            {{ selectedSkillDetail.名前 }}
            <rt>{{ displayRuby(selectedSkillDetail?.ルビ) }}</rt>
          </ruby>
          
          <span class="skill-keito">
            {{ selectedSkillDetail.系統 === 0 ? '' : selectedSkillDetail.系統 }}
          </span>

          <span class="skill-type"  :class="typeClass(selectedSkillDetail.行動)">{{ selectedSkillDetail.行動 }}</span>
        </div>
        <hr />

        <div class="skill-power">
          <span class="label">使用するステータス:</span>
          <span class="values">
            <template v-if="selectedSkillDetail.判定">
              {{ selectedSkillDetail.判定 }}
              <span class="arrow up2">⬆⬆</span>
            </template>

            <span v-if="selectedSkillDetail.判定 && selectedSkillDetail.追加威力" class="separator"></span>

            <template v-if="selectedSkillDetail.追加威力">
              {{ selectedSkillDetail.追加威力 }}
              <span class="arrow up1">⬆</span>
            </template>

            <template v-if="!selectedSkillDetail.判定 && !selectedSkillDetail.追加威力">
              なし
            </template>
          </span>
        </div>

        <hr />
        <div class="skill-description">{{ selectedSkillDetail.説明 }}</div>
      </div>

      <div v-else class="skill-detail-box">
        {{ selectedKey ? (statDescriptions[selectedKey] || '説明がありません') : '項目を選択すると説明が表示されます' }}
      </div>
      <!-- フッター -->
      <div class="footer">
        <button class="btn cancel" @click="returnDashboard">選択に戻る</button>
      </div>
      

      <!-- モーダル -->
      <RaceModal v-if="showRaceModal" @close="showRaceModal = false" @select="selectRace" />
      <ClassModal v-if="showClassModal" :selectedRace="selectedRace" @close="showClassModal = false" @select="selectClass" />
      <AttributeModal v-if="showAttributeModal" :attributes="availableAttributes" @close="showAttributeModal = false" @select="selectAttribute" />

    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import RaceModal from '@/components/modals/RaceModal.vue'
import ClassModal from '@/components/modals/ClassModal.vue'
import AttributeModal from '@/components/modals/AttributeModal.vue'
// 必ず使う
import { loadGameData, statMap, statDescriptions, allData, attributeList, 
  race_attributes, Skill_List ,
  getAttrIcon, getAttackIcon, getCharIllust, getRollIcon
} from '@/constants/statData.js';
import { playerGlobalData } from '@/scripts/characterData.js'

const router = useRouter()

const characterName = ref('')
const nameConfirmed = ref(false)
const selectedRace = ref(null)
const selectedClass = ref(null)
const selectedAttribute= ref(null)
const availableAttributes = ref([]);
const lookAttribute= ref(null)
const showRaceModal = ref(false)
const showClassModal = ref(false)
const showAttributeModal = ref(false)

const tabs = ['ステータス', '技能', '耐性', '技']
const activeTab = ref('ステータス')


const raceStats = ref({})
const classStats = ref({})
const totalStats = ref({})

const selectedSkillDetail = ref(null);

const raceLv = ref(1)   // 初期値1
const classLv = ref(9)  // 初期値1

// 行動色判定（A/S/Q 以外は無色）
const getSkillType = (name) => {
  if (!name) return null;
  const hit = Skill_List?.value?.find?.(s => s.名前 === name);
  // 期待値: 'A' | 'S' | 'Q'
  return hit?.行動 ?? null;
};

const typeClass = (t) => ({
  'type-a': t === 'A',
  'type-s': t === 'S',
  'type-q': t === 'Q',
});
const displayRuby = (val) => {
  console.log("displayRuby called:", val, typeof val);
  return val === 0 ? '' : val;
};

  console.log("技選択")
onMounted(async () => {
  await loadGameData();
  console.log(allData.value, attributeList.value, Skill_List.value);
})


// Lvや選択が変わるたびに再計算
watch(
  [selectedRace, selectedClass, selectedAttribute, raceLv, classLv],
  (
    [newRace, , , newRaceLv, newClassLv],
    [oldRace, , , oldRaceLv, oldClassLv]
  ) => {
    if (newRace?.分類 === "人族") {
      raceLv.value = 0;
      classLv.value = 10;
    } else {
      if ( raceLv.value == 0){
        raceLv.value = 1;
      }
      raceLv.value = Math.min(10, raceLv.value);
      classLv.value = Math.min(10, classLv.value);

      const total = raceLv.value + classLv.value;

      if (total !== 10) {
        if (newRaceLv !== oldRaceLv) {
          // 種族側を動かした → クラス側を調整
          classLv.value = Math.max(0, 10 - raceLv.value);
        } else if (newClassLv !== oldClassLv) {
          // クラス側を動かした → 種族側を調整
          raceLv.value = Math.max(0, 10 - classLv.value);
        }
      }
    }
    recalcStats();
  }
);


// ★ 新しく追加したい監視
watch(
  () => selectedSkillDetail,
  (val, oldVal) => {
    console.log("selectedSkillDetail が変化しました:", { newVal: val, oldVal });
  },
  { deep: true, immediate: true } // 初期値も出したいなら
);


const recalcStats = () => {
  const raceData = selectedRace.value || {};
  const classData = selectedClass.value || {};
  console.log("raceData:", raceData);
  console.log("classData:", classData);
  const newRaceStats = {};
  const newClassStats = {};
  const newTotalStats = {};

  // ステータスと技能キー
  const keys = [...statMap['ステータス'], ...statMap['技能']];

  keys.forEach(key => {
    if (key === "SIZ") {
      // SIZは割らずそのまま
      newRaceStats[key] = raceData[key] || 0;
      newClassStats[key] = classData[key] || 0;
      // SIZ合計は大きい方を採用
      newTotalStats[key] = Math.max(newRaceStats[key] || 0, newClassStats[key] || 0);
    } else {
      newRaceStats[key] = Math.floor((raceData[key] || 0) / 10 * (raceLv.value + 5)); //種族の0Lvのステータス配分
      newClassStats[key] = Math.floor((classData[key] || 0) / 10 * classLv.value);
      // 合計
      newTotalStats[key] = (newRaceStats[key] || 0 ) + ( newClassStats[key] || 0);
    }
  });

  raceStats.value = newRaceStats;
  classStats.value = newClassStats;
  totalStats.value = newTotalStats;

  // raceSkill.value = newRaceStats;
  // classSkill.value = newClassStats;
  // ▼ 初期系統チェック
  const raceInit = (raceData.初期系統 || "").trim();
  const classInit = (classData.初期系統 || "").trim();

  console.log("raceInit:", raceInit);
  console.log("classInit:", classInit);

  let fixedAttr = null;

  // ---------------------
  // 1. 固定属性モード
  // ---------------------
  if (raceInit && raceInit !== "選択") {
    fixedAttr = attributeList.value.find(attr => attr.属性名 === raceInit);
  } else if (classInit && classInit !== "選択") {
    fixedAttr = attributeList.value.find(attr => attr.属性名 === classInit);
  }

  if (fixedAttr) {
    selectedAttribute.value = fixedAttr;
    lookAttribute.value = true;
    availableAttributes.value = [fixedAttr]; // 選択肢は1つだけ
    console.log("１ 固定属性モード:", availableAttributes.value);
    return;
  }

  // ---------------------
  // 2. 自由選択モード（空の場合）
  // ---------------------
  if (!raceInit && !classInit) {
    // 条件1が空の属性のみ表示（= 条件があるものは非表示）
    availableAttributes.value = attributeList.value.filter(attr => {
      const cond1 = String(attr?.条件1 ?? "").trim();
      return cond1 === "";                 // 必要なら || cond1 === "0" を追加
    });

    lookAttribute.value = false;
    console.log("２ 自由選択モード（空の場合）:", availableAttributes.value);
    return;
  }

  // ---------------------
  // 3. 制限付き選択モード（"選択"の場合）
  // ---------------------
  let searchName = null;
  if (raceInit === "選択" && raceData.名前) {
    searchName = raceData.名前;
  } else if (classInit === "選択" && classData.名前) {
    searchName = classData.名前;
  }

  console.log("[DEBUG] searchName:", searchName);
  console.log("[DEBUG] race_attributes:", race_attributes.value);

  if (searchName) {
    const row = race_attributes.value.find(r => r.種族名 === searchName);
    console.log("[DEBUG] row found:", row);

    if (row) {
      const allowedNames = [];
      for (let i = 1; i <= 13; i++) {
        const v = row[`属性_${i}`];
        console.log(`[DEBUG] 属性_${i}:`, v);
        if (v && String(v).trim() !== "") {
          allowedNames.push(String(v).trim());
        }
      }
      console.log("[DEBUG] allowedNames:", allowedNames);

      availableAttributes.value = attributeList.value.filter(attr =>
        allowedNames.includes(attr.属性名)
      );
      console.log("[DEBUG] filtered availableAttributes:", availableAttributes.value);
    } else {
      console.warn("[WARN] No matching row found for:", searchName);
      availableAttributes.value = [];
    }
  }
  lookAttribute.value = false;
    console.log("３ 制限付き選択モード（選択の場合）:", availableAttributes.value);

};


const selectRace = (raceName) => {
  console.log("selectRace raceName:", raceName)
  console.log(allData)
  // 種族データ全体を検索してセット
  const raceObj = allData.value.find(r => r.名前 === raceName);
  if (raceObj) {
    selectedRace.value = raceObj;
    // raceLv.value = raceObj.Lv ?? 1; // 初期Lvをデータから、なければ1
  }
  console.log(selectedRace.value)
  showRaceModal.value = false;
  recalcStats();
};

const selectClass = (className) => {
  console.log("selectClass className:", className)
  console.log(allData)
  // クラスデータ全体を検索してセット
  const classObj = allData.value.find(c => c.名前 === className);
  if (classObj) {
    selectedClass.value = classObj;
    // classLv.value = classObj.Lv ?? 1;
  }
  console.log(selectedClass.value)
  showClassModal.value = false;
  recalcStats();
};

const selectAttribute = (selectAttributes) => {
  // Attribute
  console.log("selectAttribute selectAttributes:", selectAttributes)
  console.log(showAttributeModal.value)
  console.log("selectedAttribute 動作確認:")
  console.log(selectAttributes)
  console.log(selectAttributes.属性名)
  selectedAttribute.value = selectAttributes
  showAttributeModal.value = false;
  // recalcStats();
};

// 数値にSIZボーナスを適用して返す
function getDisplayValue(value, key) {
  if (key === "特徴") {
    return `${value || ""}`;
  }

  const baseValue = typeof value === "number" ? value : parseFloat(value) || 0;

  // SIZはtotalStatsから取得（SIZボーナス計算用）
  const siz = totalStats.value["SIZ"] ?? 100;
  const bonusPercent = getSizeBonus(siz);

  const bonusKeysPlus = ["HP", "攻撃", "威圧"];
  const bonusKeysMinus = ["回避", "隠密", "軽業"];

  if (bonusKeysPlus.includes(key)) {
    if (key === "威圧") {
      const TechniqueBonus = Math.round(bonusPercent);
      return baseValue + TechniqueBonus;
    } else {
      const multiplier = 1 + bonusPercent / 100;
      return Math.round(baseValue * multiplier);
    }
  } else if (bonusKeysMinus.includes(key)) {
    if (key === "隠密" || key === "軽業") {
      const TechniqueBonus = Math.round(bonusPercent);
      return baseValue - TechniqueBonus;
    } else {
      const multiplier = 1 + bonusPercent / 100;
      return Math.round(baseValue * (1 / multiplier));
    }
  } else {
    return baseValue;
  }
}

// サイズボーナスの計算
function getSizeBonus(siz) {
  if (siz >= 180) {
    return Math.round(siz / 50 + 8);;
  } else if (siz <= 150) {
    return -Math.round((160 - siz) / 3);
  } else {
    return 0;
  }
}

//Skillを取得
function getSkills(data, level) {
  const skills = [];
  for (let i = 1; i <= level; i++) {
    const key = `Skill${i}`;
    if (data[key]) skills.push(data[key]);
  }
  return skills;
}

// 技選択時処理
const onSkillSelect = (skillName) => {
  if (!skillName) return;

  const skill = Skill_List.value.find(s => s.名前 === skillName);
  if (!skill) {
    selectedSkillDetail.value = null;
    return;
  }

  selectedSkillDetail.value = {
    ルビ: skill.ルビ || '',
    名前: skill.名前 || '',
    系統: skill.系統 || '',
    分類: skill.分類 || '',
    行動: skill.行動 || '',
    攻撃手段: skill.攻撃手段 || '',
    追加威力: skill.追加威力 || '',
    判定: skill.判定 || '',
    説明: skill.説明 || ''
  };
};

function openAttributeModal() {
  console.log("openAttributeModal チェック:", selectedRace, selectedClass)
  // 固定されているか確認
  if(lookAttribute.value == true){
    return;
  }

  // 種族未選択チェック
  if (!selectedRace.value.名前) {
    return;
  }

  // クラス未選択チェック
  if (!selectedClass.value.名前) {
    return;
  }

  // 条件を満たしたらモーダル表示
  showAttributeModal.value = true;
  
}

const isCharacterValid = computed(() => {
  return (
    characterName.value.trim() !== "" &&
    selectedRace.value &&
    selectedClass.value &&
    selectedAttribute.value &&
    raceLv.value + classLv.value === 10
  );
});

// ユニークIDをランダム生成（16桁ランダム英数字）
function generateId(length = 16) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}


const confirmCharacter = async () => {
  if (!isCharacterValid.value) return; // 念のため防御

  // テンプレートをコピー
  const characterData = structuredClone(playerGlobalData);

  console.log("テンプレートをコピー:", characterData);

  // 主人公データを party[0] に格納する想定で処理
  const mainChar = characterData.party[0];

  // 入力内容を反映
  characterData.name = characterName.value; // グローバル側の名前
  mainChar.name = characterName.value;      // 主人公キャラの名前
  mainChar.race = selectedRace.value.名前;

  // クラス情報
    mainChar.Role[0] = {
    roleName: selectedRace.value.名前,
    Lv: raceLv.value,
    Ef: 0,
  };
  mainChar.Role[1] = {
    roleName: selectedClass.value.名前,
    Lv: classLv.value,
    Ef: 0,
  };


  // ステータス
  mainChar.stats.allLv = raceLv.value + classLv.value;
  mainChar.stats.baseStats = totalStats.value;
  mainChar.stats.abilities = {}; // 技は後で処理

  characterData.id = generateId(); // ランダムID
  characterData.name = characterName.value;
  characterData.race = selectedRace.value.名前;
  characterData.class = selectedClass.value.名前;

  characterData.party[0].attribute = [selectedAttribute.value.属性名]


  console.log("作成キャラクター:", characterData);
  alert("キャラクター作成が完了しました！");
  // 🔽 最後にDBへ保存
  await saveCharacterToDB(characterData);
};

// キャラ登録処理
async function saveCharacterToDB(characterData) {
  const token = localStorage.getItem("authToken");
  if (!token) {
    alert("ログインしてください");
    return;
  }
  // console.log(characterData)
  // return
  try {
    const res = await fetch("/api/characters", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(characterData),
    });

    const result = await res.json();
    if (res.ok) {
      console.log("キャラクター登録成功:", result);
      alert("キャラクター登録が完了しました！");
      router.push('/Dashboard')

    } else {
      alert("登録失敗: " + result.error);
    }
  } catch (err) {
    console.error("キャラクター登録エラー:", err);
    alert("通信エラーでキャラクター登録できませんでした。");
  }
};
async function returnDashboard(){
  router.push('/Dashboard')
}


</script>



<style scoped>
.clickable {
  cursor: pointer;
  color: blue;
  text-decoration: underline;
}
.tabs {
  margin-top: 5px;
  margin: 6px 0;
}
.tabs button {
  margin-right: 5px;
}
.tabs .active {
  font-weight: bold;
}

.container {
  width: 720px ;   /* 横幅いっぱいに */
  max-width: none !important;
  min-height: 1200px;
  /* background: rgba(255, 255, 255, 0.9); */
  background-image: url('/src/assets/images/入力ホーム.jpg');
  border: 3px solid #b58b4c;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.3);
  font-size: 20px;
}

#scalable-root {
  display: flex;
  justify-content: center;
  /* background: radial-gradient(circle at center, #fdf6e3 0%, #e4d2a0 100%); */
  font-family: 'Cinzel', serif;
}


#name{
  font-size: 20px;
  font-weight: bold;
  width: 250px;
  height: 40px;
}
h1 {
  text-align: center;
  color: #5a3b12;
  text-shadow: 0 2px 2px rgba(0,0,0,0.3);
  margin-top: 0px;
  margin-bottom: 0px;
}

.name_input {
  font-weight: bold;
  color: #ffe37b;
  margin-top: 8px;
  font-size: 20px;
  background-color: #b58b4c67;
  display: block;
  padding: 10px;
  text-align: center;
  border-radius: 10px;
}

input[type="text"], 
input[type="number"] {
  border: 2px solid #b58b4c;
  border-radius: 8px;
  margin: -4px 0;
  font-size: 20px;
  font-weight: bold;
  width: 150px;
  height: 40px;
  background: #fffdf6;
  text-align: center; /* 数値・テキストを中央寄せ */
}

.tabs {
  display: flex;
  gap: 6px;
  margin: 12px 0;
}

.tabs button {
  background: linear-gradient(#fceabb, #f8b500);
  border: 2px solid #b58b4c;
  border-radius: 10px;
  padding: 6px 12px;
  cursor: pointer;
  font-weight: bold;
  color: #5a3b12;
  box-shadow: 0 2px 0 #a0722a;
}

.tabs button.active {
  background: linear-gradient(#fff6d6, #f0c04f);
  border-color: #a0722a;
}

.clickable {
  cursor: pointer;
  color: #004f7a;
  text-decoration: underline;
}

button {
  background: linear-gradient(#fceabb, #f8b500);
  border: 2px solid #b58b4c;
  border-radius: 999px;
  padding: 6px 12px;
  font-weight: bold;
  color: #5a3b12;
  cursor: pointer;
  margin-top: 4px;
  box-shadow: 0 2px 0 #a0722a;
}

button:hover {
  filter: brightness(1.05);
}

:root {
  --header-height: 54px; /* ヘッダーの実際の高さ */
}

table {
  width: 100%;
  border-collapse: collapse;
}

/* ヘッダー行の高さと装飾 */
table thead tr:first-child {
  height: var(--header-height);
  background: linear-gradient(#f8e0a0, #f5deb3);
}

table thead th {
  font-weight: bold;
  font-size: 1.1em;
}

/* 1列目の幅固定 */
table th:first-child,
table td:first-child {
  width: 120px;
  height: 33px;
}

/* セル共通 */
th, td {
  border: 1px solid #b58b4c;
  padding: 6px;
  text-align: center;
  height: 33px;
}

th {
  background: #f5deb3;
}

/* スクロール用ラッパー */
.table-wrapper {
  height: 651px; /* 表全体の高さ */
  background: radial-gradient(circle at center, #5e5b54 0%, #423d2f 100%);
  border: 5px solid #b58b4c;
  overflow-y: auto;
  font-size: 21.6px;
}

.table-wrapper table {
  border-collapse: separate; /* collapse をやめる */
  border-spacing: 0; /* セル間の隙間を消す */
  width: 100%;
}

/* thead を固定 */
.table-wrapper thead th,
.table-wrapper thead td {
  border: 2px solid #b58b4c;
  background: #f5deb3; /* 背景透け防止 */
  position: sticky;
  z-index: 5; /* 高めに設定 */
  color: #3b2f1e;
}

/* 1行目の見出し固定 */
.table-wrapper thead tr:first-child th {
  height: 50px;
  top: 0;
  border-top: 2px solid #b58b4c;
  z-index: 3;
}

/* 2行目（Lv）を固定 */
.table-wrapper thead tr:nth-child(2) td {
  top: 66px; /* 1行目の高さに合わせる */
  border: 2px solid #b58b4c;
  z-index: 5;
}

.icon-img{
  width: 50px;
  height: 50px;
  position: absolute;
  left: 4px;
  object-fit: contain;
  border-radius: 50%;
  top: 50%;
  transform: translateY(-50%);
}
.icon-Attribute-img{
  width: 50px;
  height: 50px;
  border-radius: 50%;
}

.clickable {
  position: relative;
  text-align: center;
}
.clickable_Attribute{
  position: relative;
  text-align: center;
}
.attr-cell {
  display: flex;
  align-items: center; /* 縦中央揃え */
  flex-direction: row;   /* 横並び */
  gap: 6px; /* 画像と文字の間隔 */
}
.clickable_Attribute.ready {
  background-color: #f5deb3; /* 薄い緑 */
  cursor: pointer;
}
.clickable_Attribute:not(.ready) {
  background-color: #d3bf9b; /* 薄いグレー */
  cursor: pointer;
}

.skill-cell { padding: 0; }
.skill-inner {
  display: grid;
  grid-template-columns: 1fr; /* 名前のみ */
  align-items: center;
  border-left: 6px solid transparent; /* 色バー */
  border-radius: 6px;
}

/* 行動ごとの色 */
.type-a { background-color: rgba(255, 0, 0, 0.2); }   /* 赤系 */
.type-s { background-color: rgba(255, 255, 0, 0.2); } /* 黄系 */
.type-q { background-color: rgba(0, 255, 0, 0.2); }   /* 緑系 */

.skill-name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-weight: bold;
}

.skill-clickable {
  cursor: pointer;
  text-decoration: underline;
}
.skill-clickable:hover {
  color: #ffcc00;
}

.skill-detail-box {
  height: 250px;
  margin-top: 4px;
  font-size: 20px;
  color: #ffeecc;
  background-color: rgba(0, 0, 0, 0.6);
  padding: 10px;
  border-radius: 6px;
}
.skill-name-detail-box {
  font-size: 30px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-weight: bold;
}
.skill-header {
  height: 45px;
  display: grid;
  grid-template-columns: 2fr 5.5fr 1.5fr 1fr; /* ルビ:名前:系統:行動 */
  align-items: center;
  gap: 4px;
  text-align: center;
}

.skill-ruby {
  text-align: center;
  font-size: 0.85em;
}


.skill-keito {
  font-size: 30px;
  text-align: center;
}

.skill-type {
  font-size: 30px;
  text-align: center;
}
.skill-power {
  display: flex;
  align-items: center;
  gap: 0.5em;
}

.skill-power .label {
  min-width: 8em; /* 左のラベル部分を固定幅にする */
  font-weight: bold;
}

.arrow {
  font-size: 25px;
  font-weight: bold;
  line-height: 0;
}
.arrow.up1 {
  color: #ff6600; /* 追加威力用の色 */
}
.arrow.up2 {
  color: #ff0000; /* 判定用の色 */
}

.skill-description{
  font-size: 23px;
  display: flex;
  align-items: center;
}
.skill-power {
  display: flex;
  align-items: center;
  gap: 0.5em;
}


.separator {
  display: inline-block;
  width: 15px; /* 判定と追加威力の間隔 */
}
.name-and-button {
  width: 520px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.name-and-button button {
  margin-top: 15px;
  margin-left: 20px;
  margin-bottom: 0px;
}

.name-and-button input {
  flex: 1;
}

.name-and-button button {
  padding: 6px 12px;
  font-size: 1rem;
  white-space: nowrap;
}
button:disabled {
  background-color: #888; /* 暗いグレー */
  cursor: not-allowed;
  opacity: 0.6;
}
.skill-keito {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.skill-keito__icon {
  width: 55x;
  height: 55px;
  object-fit: contain;
  vertical-align: middle;
}

</style>
