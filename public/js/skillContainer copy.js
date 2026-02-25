
// statusCharacter

/**
 * 任意のデータオブジェクトに指定された項目を初期化する関数
 * @param {Object} targetObject - 初期化したいデータオブジェクト
 * @param {Array} itemsToInitialize - 初期化したい項目名の配列
 * @param {any} initialValue - 初期化する値（デフォルトは 0）
 */

const characterData = {
    // 習得クラス（1~20）
    name: "",
    acquiredClasses: Array.from({ length: 20 }, () => ({
        className: null, // クラス名またはID
        Lv: null, // レベル
        Ef: null, // エフェクト（特殊効果）
        stats: {} // クラスごとのステータス
    })),

    // ステータス関連
    stats: {
        allLv: 0,
        allEf: 0,
        baseStats: {}, // 基礎ステータス
        levelStats: {}, // レベルステータス
        skillValues: {}, // 技能値
        resistances: {}, // 耐性
        bodyAttributes: {}, // 肉体値
        weaknesses: [], // 弱点
        bodyType: 0, // 肉体種別
        skillNames: [],
        allStats: {}, //全ステータス合計を入れる
    },

    // 追加: ダメージ、MP消費、ST消費
    damage: {       // 受けたダメージ量
        HP_消費: 0,      // MPの消費量
        MP_消費: 0,      // MPの消費量
        ST_消費: 0       // STの消費量
    },

    skillBonuses: {},

    // アイテムによる上昇ステータス
    itemBonuses: {
        stats: {},
        skillValues: {},
        resistances: {},
        bodyAttributes: {}
    },

    initialClasses: "ファーマー",　//初期クラス

    // スキルと魔法
    skills: [],
    magics: [],

    // アイテム関連
    equipment: {},

    // 装備中データ
    equipmentSlot: {
        '武器': null,
        '武器2': null,
        '頭': null,
        '顔': null,
        '首': null,
        '体': null,
        '下着': null,
        '背中': null,
        '右腕': null,
        '左腕': null,
        '右手': null,
        '左手': null,
        '腰': null,
        '右足': null,
        '左足': null
    },

    inventory: [],
    maxInventory: null,
    storage: [],
    money: null,

    // その他のデータ
    teleportLocations: [],
    profile: {},
    currentLocation: null,
    notes: null,
    ultimateSkill: null
};

//キャラクターリスト
let characterList = [];

let displaySkillsList = [];
let displayMagicsList = [];


// プレイヤー用のデータ
// characterData の内容を深いコピーして、それぞれ独立したオブジェクトに
let playerData = JSON.parse(JSON.stringify(characterData));
let addCharacterData = JSON.parse(JSON.stringify(characterData));

playerData = { ...playerData }; // 深いコピーを作成して playerData の参照を固定
addCharacterData = { ...addCharacterData }; // addCharacterData の参照も固定
// 持ち物にアイテムを追加する関数

const equipmentSlotNow = {
    '武器': null,
    '武器2': null,
    '頭': null,
    '顔': null,
    '首': null,
    '体': null,
    '下着': null,
    '背中': null,
    '右腕': null,
    '左腕': null,
    '右手': null,
    '左手': null,
    '腰': null,
    '右足': null,
    '左足': null
};


function addItemToInventory(item) {
    if (selectedInventory.inventory.length < selectedInventory.手持ち上限) {
        selectedInventory.inventory.push(item);
        console.log(`${item.name} を持ち物に追加しました。`);
    } else {
        console.log("持ち物が上限に達しました。ペナルティを適用します。");
        // ペナルティの処理（例: ステータスを減少させる、アイテムを破棄するなど）
    }
}

startUp()

const addSkill = [
    "切断",
    "貫通",
    "打撃",
    "射撃",
    "防御",
    "組み付き",
    "機動回避",
    "叩きつけ",
    "握りつぶす",
    "跳躍/技",
    "吹き飛ばす",
    "投擲",
    "突撃",
    "飛行突撃",
    "再生・肉体"
];

const magicskill = [
    '魔法抵抗突破',
    '魔法無詠唱化',
    '魔法瞑想',
    '魔法限界突破',
    '魔法順位向上3rd',
    '魔法範囲拡大化',
    '魔法二重化',
    '魔法遅延化',
    '魔法収束化',
    '魔法順位向上6th',
    '魔法時間強化',
    '魔法最強化',
    '魔法射程拡大',
    '魔法自動追尾',
    '魔法順位向上8th',
    '魔法倍速化',
    '魔法集中化',
    '魔法順位向上9th',
    '魔法三重化',
    '魔法順位向上10th'
];

// const magicskill = [
//     '魔法順位向上1ST',
//     '魔法抵抗突破',
//     '魔法無詠唱化',
//     '魔法順位向上2nd',
//     '魔法限界突破',
//     '魔法順位向上3rd',
//     '魔法範囲拡大化',
//     '魔法二重化',
//     '魔法順位向上4th',
//     '魔法遅延化',
//     '魔法順位向上5th',
//     '魔法時間強化',
//     '魔法順位向上6th',
//     '魔法最強化',
//     '魔法射程拡大',
//     '魔法順位向上7th',
//     '魔法倍速化',
//     '魔法順位向上8th',
//     '魔法順位向上9th',
//     '魔法三重化',
//     '魔法順位向上10th',
// ];

const statuSum = ["HP", "MP", "ST", "攻撃", "防御", "魔力", "魔防", "速度", "命中", "SIZ", "APP"];
const displaySum = ["攻撃", "防御", "魔力", "魔防", "速度", "命中", "SIZ", "APP"];

const talents = [
    "威圧", "透明化", "隠密", "消音", "看破", "知覚", "聴覚", "追跡", "軽業", "鑑定", "騎乗",
    "芸能", "言語学", "交渉", "呪文学", "職能", "真意看破", "水泳", "製作", "生存", "装置", 
    "精神接続", "知識", "治療", "早業", "登攀", "指揮", "騙す", "変装", "魔道具操作"
];
const resistances = [
    "物理軽減", "魔法軽減", "遠隔軽減", "切断軽減", "貫通軽減", 
    "打撃軽減", "炎軽減", "氷軽減", "雷軽減", "酸軽減", 
    "音波軽減", "闇軽減", "光軽減", "善軽減", "悪軽減", 
    "正軽減", "負軽減", "切断耐性", "貫通耐性", "打撃耐性", 
    "炎耐性", "氷耐性", "雷耐性", "酸耐性", "音波耐性", 
    "闇耐性", "光耐性", "善耐性", "悪耐性", "正耐性", 
    "負耐性", "毒耐性", "麻痺耐性", "混乱耐性", "恐怖耐性", 
    "盲目耐性", "閃光耐性", "暗黒耐性", "幻覚耐性", "睡眠耐性", 
    "石化耐性", "スタン耐性", "拘束耐性", "呪い耐性", "支配耐性", 
    "即死耐性", "時間耐性", "出血耐性", "疲労耐性", "物理無効", 
    "魔法無効", "ノックバック耐性", "Cr率耐性", "Cr威力耐性"
];
const bodyAttributes = [
    "角", "角リーチ", "牙", "爪", "爪リーチ", "羽", "羽リーチ", "尾", "尾リーチ",
    "外皮", "外殻", "再生", "吸血", "ドレイン", "鋼体", "足", "SIZ","肉体","外殻装甲"
];
const displayBody = [
    "角", "角リーチ", "牙", "爪", "爪リーチ", "羽", "羽リーチ", "尾", "尾リーチ",
    "外皮", "外殻", "再生", "吸血", "ドレイン", "鋼体", "足","外殻装甲"
];
const equipmentSlots = ['武器', '武器2', '頭', '顔', '首', '体', '下着', '背中', '右腕', '左腕', '右手', '左手', '腰', '右足', '左足'];

// 武器で合計するやつ
const statusEffects = [
    "全力", "切断", "貫通", "打撃", "炎", "氷", "雷", "酸", "音波", "闇", "光", "善", "悪", "正", "負",
    "毒", "麻痺", "混乱", "恐怖", "盲目", "閃光", "暗黒", "幻覚", "睡眠", "石化", "スタン", "拘束",
    "呪い", "呪い/HP", "呪い/MP", "呪い/ST", "呪い/筋力", "呪い/防御", "呪い/魔力", "呪い/魔防",
    "呪い/速度", "呪い/命中", "支配", "即死", "時間", "出血", "疲労", "物理", "魔法", "NB", "SIZ",
    "最低威力", "Cr率", "Cr威力", "物理貫通", "魔法貫通", "遠隔"
];
const weponList = [
    "炎", "氷", "雷", "酸", "音波", "闇", "光", "善", "悪", "正", "負", "毒", "麻痺", "混乱", "恐怖", 
    "盲目", "閃光", "暗黒", "幻覚", "睡眠", "石化", "スタン", "拘束", "呪い", "呪い/HP", "呪い/MP", 
    "呪い/ST", "呪い/筋力", "呪い/防御", "呪い/魔力", "呪い/魔防", "呪い/速度", "呪い/命中", 
    "支配", "即死", "時間", "出血", "疲労", "物理", "魔法", "NB"
];
//装備の合計値
const attributes = [
    "HP+", "MP+", "ST+", "攻撃+", "防御+", "魔力+", "魔防+", "速度+", "命中+", "攻撃倍", "防御倍", 
    "魔力倍", "魔防倍", "速度倍", "命中倍", "SIZ", "APP", "物理軽減", "魔法軽減", "遠隔軽減", 
    "切断軽減", "貫通軽減", "打撃軽減", "炎軽減", "氷軽減", "雷軽減", "酸軽減", "音波軽減", 
    "闇軽減", "光軽減", "善軽減", "悪軽減", "正軽減", "負軽減", "切断耐性", "物理無効", "魔法無効", 
    "ノックバック耐性", "Cr率耐性", "Cr威力耐性", "威圧", "透明化", "隠密", "消音", "看破", 
    "知覚", "聴覚", "追跡", "軽業", "鑑定", "騎乗", "芸能", "言語学", "交渉", "呪文学", "職能", 
    "真意看破", "水泳", "製作", "生存", "装置", "精神接続", "知識", "治療", "早業", "登攀", 
    "指揮", "騙す", "変装", "魔道具操作", "角", "角リーチ", "牙", "爪", "爪リーチ", "羽", "羽リーチ", 
    "尾", "尾リーチ", "外皮", "外殻装甲", "再生", "吸血", "ドレイン", "鋼体", "移動", "移動倍率", 
    "飛行", "飛行倍率"
];

//パッシブスキルの合計値
const skillAttributes = [
    "SIZ", "最低威力", "Cr率", "Cr威力", "全力倍率", "切断倍", "貫通倍", "打撃倍", "炎倍", "氷倍", "雷倍", "酸倍", "音波倍",
    "闇倍", "光倍", "善倍", "悪倍", "正倍", "負倍", "毒倍", "麻痺倍", "混乱倍", "恐怖倍", "盲目倍", "閃光倍", "暗黒倍",
    "幻覚倍", "睡眠倍", "石化倍", "スタン倍", "拘束倍", "呪い倍", "呪い/HP倍", "呪い/MP倍", "呪い/ST倍", "呪い/攻撃倍",
    "呪い/防御倍", "呪い/魔力倍", "呪い/魔防倍", "呪い/速度倍", "呪い/命中倍", "支配倍", "即死倍", "時間倍", "出血倍",
    "疲労倍", "物理倍", "魔法倍", "ノックバック倍", "SIZ倍", "最低ダメージ倍", "Cr率倍", "Cr威力倍", "HP", "MP", "ST",
    "攻撃", "防御", "魔力", "魔防", "速度", "命中", "APP", "攻撃倍", "防御倍", "魔力倍", "魔防倍", "速度倍", "命中倍",
    "APP倍", "物理貫通", "魔法貫通", "Lv", "物理軽減", "魔法軽減", "遠隔軽減", "切断軽減", "貫通軽減", "打撃軽減", "炎軽減",
    "氷軽減", "雷軽減", "酸軽減", "音波軽減", "闇軽減", "光軽減", "善軽減", "悪軽減", "正軽減", "負軽減", "切断耐性",
    "貫通耐性", "打撃耐性", "炎耐性", "氷耐性", "雷耐性", "酸耐性", "音波耐性", "闇耐性", "光耐性", "善耐性", "悪耐性",
    "正耐性", "負耐性", "毒耐性", "麻痺耐性", "混乱耐性", "恐怖耐性", "盲目耐性", "閃光耐性", "暗黒耐性", "幻覚耐性",
    "睡眠耐性", "石化耐性", "スタン耐性", "拘束耐性", "呪い耐性", "支配耐性", "即死耐性", "時間耐性", "出血耐性", "疲労耐性",
    "物理無効", "魔法無効", "ノックバック耐性", "Cr率耐性", "Cr威力耐性", "威圧", "透明化", "隠密", "消音", "看破", "知覚",
    "聴覚", "追跡", "軽業", "鑑定", "騎乗", "芸能", "言語学", "交渉", "呪文学", "職能", "真意看破", "水泳", "製作", "生存",
    "装置", "精神接続", "知識", "治療", "早業", "登攀", "指揮", "騙す", "変装", "魔道具操作", "角", "角リーチ", "牙", "爪",
    "爪リーチ", "羽", "羽リーチ", "尾", "尾リーチ", "外皮", "外殻", "再生", "吸血", "ドレイン", "鋼体", "足", "防御性能",
    "防御性能倍率", "移動速度", "移動倍率", "飛行速度", "飛行倍率"
];

const attackOptions = [
    { "value": "武器", "label": "武器1", "威力": 0 , "属性": 0 , "防御": 0 },
    { "value": "武器2", "label": "武器2", "威力": 0 , "属性": 0 , "防御": 0 },
    { "value": "武器3", "label": "創造", "威力": 0 , "属性": 0 , "防御": 0 },
    { "value": "素手", "label": "素手", "威力": 0 , "属性": 0 , "防御": 0 },
    { "value": "脚", "label": "脚", "威力": 0 , "属性": 0 , "防御": 0 },
    { "value": "角", "label": "角", "威力": 0 , "属性": 0 , "防御": 0 },
    { "value": "牙", "label": "牙", "威力": 0 , "属性": 0 , "防御": 0 },
    { "value": "爪", "label": "爪", "威力": 0 , "属性": 0 , "防御": 0 },
    { "value": "羽", "label": "羽", "威力": 0 , "属性": 0 , "防御": 0 },
    { "value": "尾", "label": "尾", "威力": 0 , "属性": 0 , "防御": 0 },
    { "value": "眼", "label": "眼", "威力": 0 , "属性": 0 , "防御": 0 },
];


async function startUp(){
    // プレイヤーデータ取得
    console.log("プレイヤーデータ取得" , selectedCharacter)

    playerData = await acquireCharacterData(await fetchCharacterData(selectedCharacter[0].名前));
    console.log("プレイヤーデータ取得完了" , playerData)
    // スキルデータを取得するために
    await loadSection('top-left', 'sections/character-info.html', 'js/characterInfo.js', async () => {
        console.log('top-leftセクションの読み込みが完了しました');
        console.log("characterList 追加 :", characterList )
        await loadSection('top-right', 'sections/tab-container.html', 'js/tabContainer.js', async () => {
            console.log('top-rightセクションの読み込みが完了しました');

            console.log(" プレイヤーデータ :",characterList, playerData)
            characterList = await addOrUpdateCharacter(characterList, playerData)
        
            // 同じキャラを二回入れているが一旦このままで
            for (const character of selectedCharacter) {
                console.log("character.名前 :", character.名前);
                const fetchedData = await fetchCharacterData(character.名前);

                console.log("fetchedData :", fetchedData);
                const addCharacterData = await acquireCharacterData(fetchedData);
                console.log(" 同じキャラを二回入れているが一旦このままで ", addCharacterData);
                characterList = await addOrUpdateCharacter(characterList, addCharacterData);
            }
            // キャラ追加テスト
            // addCharacterData = await acquireCharacterData(await fetchCharacterData("リコリス"));
            // console.log(addCharacterData)
            // characterList = addOrUpdateCharacter(characterList, addCharacterData)

            console.log(" characterList :", characterList)

            // 'top-right'セクションを読み込み
            
            // //スキルを表示
            // await displaySkills(playerData.skills)
            // await displayMagics(playerData.magic)

            // console.log("playerData :", playerData)

            // await displayBasicStatus(playerData)
            // await toggleTotalView()
            // await displayEquipment(playerData.equipmentSlot, baseValues, increaseValues)
            // await displayItemTable("inventory-tbody", playerData.inventory, baseValues, increaseValues)
            // await displayItemTable("storage-tbody", playerData.storage, baseValues, increaseValues)

            // await updateDisplays(playerData)
            
            // 上記の内容をまとめた関数 キャラクターデータをまとめて表示する
            await characterDataDisplay (playerData)
            console.log(" 上記の内容をまとめた関数 :", playerData)

            //画面にキャラデータを入れる
            await displayCharacters(characterList)
            console.log(" 画面にキャラデータを入れる :", characterList)
            // await toggleTotalView()
            // ロード完了後にiframe（ロード画面）を非表示、メインコンテンツを表示
            document.getElementById('load-screen').style.display = 'none';
            document.getElementById('main-content').style.display = 'grid';
            
            updateSelectedSkills()
            // 初期表示
            openSkillTab('A');

            
            // ページロード時に選択肢を設定

            showSecondaryTab('equipment')
        })
        
    });

}

async function characterDataDisplay (characterDataPush){
    await displaySkillsReset()

    if( characterDataPush == undefined ){
        return
    }

    console.log("playerData :", characterDataPush)
    // playerData.name = characterDataPush.name
    await displayBasicStatus(characterDataPush)

    //スキルを表示
    await displaySkills(characterDataPush.skills)
    console.log("  function characterDataDisplay ", characterDataPush.magic)
    await displayMagics(characterDataPush.magic)

    displaySkillsList = characterDataPush.skills
    displayMagicsList = characterDataPush.magic
    
    await statsView()
    await displayEquipment(characterDataPush.equipmentSlot, baseValues, increaseValues)
    await displayItemTable("inventory-tbody", characterDataPush.inventory, baseValues, increaseValues)
    await displayItemTable("storage-tbody", characterDataPush.storage, baseValues, increaseValues)

    // await updateDisplays(playerData)
}

// キャラクターデータ習得のメイン関数
async function acquireCharacterData(character) {
    const returnCharacterData = JSON.parse(JSON.stringify(characterData));
    returnCharacterData.name = character.名前
    // equipmentSlots を使って statusCharacter から装備品を取得し、equipmentData に格納
    let equipmentList = [];
    equipmentSlots.forEach((slot, index) => {
        equipmentList[index] = character[slot];
    });
    // 装備欄
    returnCharacterData.equipment = await fetchItem(equipmentList)
    //装備スロットに
    returnCharacterData.equipmentSlot = await assignEquipment(returnCharacterData.equipment)

    console.log(" returnCharacterData.equipment :", returnCharacterData.equipment, returnCharacterData.equipmentSlot)
    // 素材スキル1 -2 付与スキル1 -3
    const skillsBySlot = getAllUniqueSkills(returnCharacterData.equipmentSlot);
    console.log(" skillsBySlot :", skillsBySlot);

    //キャラデータ習得
    returnCharacterData.initialClasses = character[`取得1`].slice(4);
    returnCharacterData.acquiredClasses = await addAcquiredClasses(character)

    // console.log(returnCharacterData.acquiredClasses)
    // return
    console.log("returnCharacterData :", returnCharacterData)

    returnCharacterData.stats = await statusAll(returnCharacterData.acquiredClasses, returnCharacterData.initialClasses) 

    console.log("skillNames :", returnCharacterData.stats.skillNames)
    

    const allUniqueSkills = [...new Set([...skillsBySlot, ...returnCharacterData.stats.skillNames])];
    console.log(allUniqueSkills);


    returnCharacterData.skills = await fetchSkills(addArrayToArray((allUniqueSkills).filter(name => name !== '魔法強化取得'), addSkill))
    const magicEnhanceCount = allUniqueSkills.filter(name => name === '魔法強化取得').length;
    returnCharacterData.skills.PA = passiveForEach(returnCharacterData.skills.P)
    
    console.log("magicEnhanceCount :", magicEnhanceCount)
    // console.log("statusCharacter.取得魔法 :", character.取得魔法.split(','))

    returnCharacterData.magic = await fetchMagics(character.取得魔法.split(',') ,magicEnhanceCount)





    //  character.持ち物 ? character.持ち物.split(' ') : [];
    returnCharacterData.inventory = await fetchItem(character.持ち物 ? character.持ち物.split(',') : [])
    returnCharacterData.maxInventory = parseInt(character.手持ち上限)
    returnCharacterData.storage = await fetchItem(character.倉庫 ? character.倉庫.split(',') : [])
    returnCharacterData.money = parseInt(character.所持金)

    returnCharacterData.teleportLocations = character.転移地点
    returnCharacterData.profile = character.プロフィール
    returnCharacterData.currentLocation = character.転移地点
    returnCharacterData.notes = character.メモ
    returnCharacterData.ultimateSkill = character.必殺技

    console.log(" HP_消費 :", character)

    returnCharacterData.damage.HP_消費 = parseInt(character.HP_1 || 0)
    returnCharacterData.damage.MP_消費 = parseInt(character.MP_1 || 0)
    returnCharacterData.damage.ST_消費 = parseInt(character.ST_1 || 0)

    // 追加: ダメージ、MP消費、ST消費
    // damage: {       // 受けたダメージ量
    //     HP_消費: 0,      // MPの消費量
    //     MP_消費: 0,      // MPの消費量
    //     ST_消費: 0       // STの消費量
    // },
    
    // 付与スキル1:"爆発撃"
    // 付与スキル2:"強打"
    // 付与スキル3
    // 武器の補正
    // 武器の補正_1
    // 武器の補正_2
    // 素材スキル1
    // 素材スキル2

    returnCharacterData.itemBonuses = await applyItemBonuses(returnCharacterData.equipmentSlot)
    returnCharacterData.skillBonuses = await passiveSkillBonuses(returnCharacterData.skills.PA.passives)
    console.log(returnCharacterData.skillBonuses)　　
    return returnCharacterData;
}

function getAllUniqueSkills(equipmentSlot) {
    const allSkills = []; // すべてのスキルを格納する配列

    // 各装備スロットをループ
    for (const slot in equipmentSlot) {
        const equipment = equipmentSlot[slot];

        if (equipment) {
            // 素材スキル1～2を取得
            for (let i = 1; i <= 2; i++) {
                const skillKey = `素材スキル${i}`;
                if (equipment[skillKey]) {
                    allSkills.push(equipment[skillKey]);
                }
            }

            // 付与スキル1～3を取得
            for (let i = 1; i <= 3; i++) {
                const skillKey = `付与スキル${i}`;
                if (equipment[skillKey]) {
                    allSkills.push(equipment[skillKey]);
                }
            }
        }
    }

    // 重複を排除してユニークなスキルのみを返す
    return [...new Set(allSkills)];
}








// キャラクターデータを取得する非同期関数
async function fetchCharacterData(characterName) {
    const response = await fetch(`/api/character?name=${characterName}`);
    const result = await response.json();
    return result.data; // データを返す
}

async function fetchItem(itemList) {
    console.log(" fetchItem :", itemList)
    try {
        const response = await fetch('/api/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemList: itemList })
        });
        const result = await response.json();

        if (result.success) {
            console.log("アイテムデータの取得 :", result.itemData)
            return result.itemData
            // statusAll()
        } else {
            console.error('アイテムデータの取得に失敗しました');
            return []
        }
    } catch (error) {
        console.error('アイテムデータ取得エラー:', error);
        return []
    }
}

// 装備スロットに名前を入れる関数
function assignEquipment(equipmentList) {
    // 初期状態の装備スロット
    const equipmentSlot = JSON.parse(JSON.stringify(characterData.equipmentSlot));

    // 装備種別ごとに対応するスロットをマッピング
    const slotMapping = {
        '武器': ['武器', '武器2'],
        '顔': ['顔'],
        '首': ['首'],
        '背中': ['背中'],
        '体': ['体'],
        '下着': ['下着'],
        '腕': ['右腕', '左腕'],
        '手': ['右手', '左手'],
        '腰': ['腰'],
        '足': ['右足', '左足']
    };

    // 各装備アイテムをスロットに割り当てる
    equipmentList.forEach(item => {
        if (!item) return; // item が null の場合はスキップ
        const { 名前, 装備箇所 } = item; // 装備アイテムの名前と種別を取得

        console.log(" item ", 名前, 装備箇所)

        // 種別に対応するスロットがあれば、スロットに装備を割り当て
        if (slotMapping[装備箇所]) {
            for (let slot of slotMapping[装備箇所]) {
                if (equipmentSlot[slot] === null) { // 空のスロットにのみ割り当て
                    equipmentSlot[slot] = item; //名前
                    break;
                }
            }
        }
    });

    console.log(" 装備スロットに名前を入れる ", equipmentSlot, equipmentList)

    return equipmentSlot;
}
// もう使えない
// function assignEquipment(equipmentList, equipment) {
//     let index = 0; // equipmentList の現在のインデックス
//     const equipmentSlot = JSON.parse(JSON.stringify(characterData.equipmentSlot));

//     console.log(" 装備スロットに名前を入れる ", equipmentList, equipment)

//     // equipmentSlot のキーを順番にループして、equipmentList からアイテムを割り当てる
//     Object.keys(equipmentSlot).forEach(slot => {
//         if (index < equipmentList.length) {
//             // console.log(slot, equipment[index], equipmentSlot)
//             equipmentSlot[slot] = equipment[index];
//             index++;
//         } else {
//             equipmentSlot[slot] = null; // equipmentListが尽きたらnullを割り当て
//         }
//     });

//     console.log(equipmentSlot)

//     return equipmentSlot
// }

//クラスのLv Ef ステータスを設定 selectedCharacter を入れれば勝手に取得してくれる。
async function addAcquiredClasses(selectedCharacter) {
    console.log("クラスのLvaddAcquiredClasses ", selectedCharacter)
    let acquiredData = [];

    for (let i = 1; i <= 20; i++) {
        const key = `取得${i}`;
        const value = selectedCharacter[key];
        if (value) {
            // 数字部分とクラス部分を分割
            const lvEf = value.match(/^(\d{2})(\d{2})/); // 最初の4桁を2桁ずつに分ける
            const className = value.slice(4); // 残りの文字列がクラス名
    
            if (lvEf && className) {
                acquiredData.push({
                    Lv: parseInt(lvEf[1], 10),        // 例: "06" → 6
                    Ef: parseInt(lvEf[2], 10),        // 例: "04" → 4
                    職業名: className                  // 例: "ヴォイドヤングドラゴン"
                });
            }
        }
    }

    const classList = await fetchClasses(acquiredData)
    const acquiredClasses= classList.map(cls => {
        // 職業名が一致するオブジェクトを一度だけ取得
        const acquiredClass = getObjectsByConditions(acquiredData, { 職業名: cls.職業名 })[0];
        
        return {
            className: cls.職業名,
            Lv: acquiredClass ? acquiredClass.Lv : null,
            Ef: acquiredClass ? acquiredClass.Ef : null,
            stats: cls
        };
    });

    console.log("addAcquiredClasses :", acquiredClasses)
    return acquiredClasses
}

// クラスデータを取得する
async function fetchClasses(acquiredData) {
    try {
        const response = await fetch('/api/classes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ classList: acquiredData.map(classData => classData.職業名).filter(Boolean) })
        });
        const result = await response.json();

        if (result.success) {
            console.log("クラスデータの取得 :", result.classData)
            classData = result.classData
            console.log("acquiredData :",acquiredData)
            console.log("classData :",classData)
            return result.classData
            // statusAll()
        } else {
            console.error('クラスデータの取得に失敗しました');
            return []
        }
    } catch (error) {
        console.error('クラスデータ取得エラー:', error);
        return []
    }
}

// 指定した JSON データと条件から一致するオブジェクトを取得する関数
function getObjectsByConditions(data, conditions) {
    return data.filter(item => {
        return Object.entries(conditions).every(([key, value]) => item[key] === value);
    });
}

//データの初期化 初期化したいデータと 初期化したい項目
function initializeProperties(targetObject, itemsToInitialize, initialValue = 0) {
    itemsToInitialize.forEach(item => {
        targetObject[item] = initialValue;
    });
}
// ステータス技能肉体耐性を合計する
async function statusAll(acquiredClasses, initialClasses) {

    const returnStats = JSON.parse(JSON.stringify(characterData.stats)); // JSON.parse(JSON.stringify(characterData));
    initializeProperties(returnStats.levelStats, statuSum);
    initializeProperties(returnStats.skillValues, talents);
    initializeProperties(returnStats.resistances, resistances);
    initializeProperties(returnStats.bodyAttributes, bodyAttributes);
    initializeProperties(returnStats.baseStats, statuSum);
    returnStats.weaknesses = []
    console.log("returnStats :", returnStats);

    // acquiredData の各要素をループ
    acquiredClasses.forEach(acquiredItem => {
        // Lv + Ef を計算
        const levelWithEf = parseInt(acquiredItem.Lv) + parseInt(acquiredItem.Ef);
        returnStats.allLv += parseInt(acquiredItem.Lv)*10
        returnStats.allEf += parseInt(acquiredItem.Ef)
        // console.log("levelWithEf :", levelWithEf);

        // 一致したクラスがある場合のみ合計を計算
        if (acquiredItem.className) {
            // console.log("Processing class:", acquiredItem.className, acquiredItem.Lv);

            // 各ステータスをレベルに基づいて調整
            statuSum.forEach(stat => {
                const adjustedValue = (parseInt(acquiredItem.stats[stat], 10) / 10) * acquiredItem.Lv || 0;
            
                if (stat === "SIZ") {
                    // SIZ の場合は最大値を格納
                    returnStats.levelStats[stat] = Math.max(parseInt(returnStats.levelStats[stat]) || 0, acquiredItem.stats[stat]);
                } else if (stat === "APP") {
                    // APP の場合はLvをそのまま掛け算
                    returnStats.levelStats[stat] += adjustedValue*10;
                } else {
                    // それ以外のステータスは合計を更新
                    returnStats.levelStats[stat] += adjustedValue;
                }
            
                // console.log(`Stat [${stat}] adjusted by:`, adjustedValue, "New total:", returnStats.levelStats[stat]);
            });

            // タレントも同様に計算
            talents.forEach(talent => {
                if (acquiredItem.stats[talent] !== undefined) {
                    const adjustedTalentValue = (parseInt(acquiredItem.stats[talent]) / 10) * acquiredItem.Lv || 0;
                    returnStats.skillValues[talent] += adjustedTalentValue; // 合計を更新
                    // console.log(`Talent [${talent}] adjusted by:`, adjustedTalentValue, "New total:", returnStats.skillValues[talent]);
                }
            });

            // 肉体も同様に計算
            bodyAttributes.forEach(attribute => {
                if (acquiredItem.stats[attribute] !== undefined) {
                    const adjustedValue = parseInt(acquiredItem.stats[attribute]) || 0;
                    returnStats.bodyAttributes[attribute] = Math.max(returnStats.bodyAttributes[attribute], adjustedValue);
                    // console.log(`Body attribute [${attribute}] set to:`, adjustedValue ,"  取得データ set to:", returnStats.bodyAttributes[attribute]);
                }
            });

            // 耐性も同様に計算
            resistances.forEach(resistance => {
                if (acquiredItem.stats[resistance] !== undefined) {
                    const adjustedValue = parseInt(acquiredItem.stats[resistance]) || 0;
                    returnStats.resistances[resistance] += adjustedValue;
                    // console.log(`Resistance [${resistance}] adjusted by:`, adjustedValue, "New total:", returnStats.resistances[resistance]);
                }
            });

            // 肉体種別
            if (acquiredItem.stats['肉体'] !== undefined) {
                const adjustedValue = parseInt(acquiredItem.stats['肉体']) || 0;
                returnStats.bodyType = Math.max(returnStats.bodyType, adjustedValue);
                // console.log(`Body attribute [${attribute}] set to:`, adjustedValue ,"  取得データ set to:", returnStats.bodyAttributes[attribute]);
            }

            // 弱点
            if (acquiredItem.stats['弱点'] !== 0) {
                returnStats.weaknesses.push(acquiredItem.stats['弱点'] ); // 取得したスキルを格納
                // console.log(`Skill acquired [${skillKey}]:`, acquiredItem.stats[skillKey]);
            }
            if (acquiredItem.stats['弱点2'] !== 0) {
                returnStats.weaknesses.push(acquiredItem.stats['弱点2'] ); // 取得したスキルを格納
                // console.log(`Skill acquired [${skillKey}]:`, acquiredItem.stats[skillKey]);
            }

            // スキルの取得
            for (let i = 1; i <= levelWithEf; i++) {
                const skillKey = `Lv${i}`;
                if (acquiredItem.stats[skillKey] !== 0) {
                    returnStats.skillNames.push(acquiredItem.stats[skillKey]); // 取得したスキルを格納
                    // console.log(`Skill acquired [${skillKey}]:`, acquiredItem.stats[skillKey]);
                }
            }
        }
    });
    
    // classData.find(classItem => classItem.職業名 === "ドラゴン")
    console.log(returnStats.levelStats.HP, parseInt(statusCharacter.Lv), initialClasses, acquiredClasses)
    console.log(acquiredClasses.find(stats => stats.className === initialClasses))
    console.log("returnStats.levelStats:", returnStats.levelStats);
    console.log("returnStats.levelStats.HP:", returnStats.levelStats.HP);
    console.log("statusCharacter.Lv:", statusCharacter.Lv);
    console.log("acquiredClasses:", acquiredClasses);
    console.log("initialClasses:", initialClasses);

    const initialClassStats = acquiredClasses.find(stats => stats.className === initialClasses);
    console.log("initialClassStats:", initialClassStats);


    returnStats.baseStats.HP = (parseInt(returnStats.levelStats.HP) / statusCharacter.Lv) * 2 + parseInt(acquiredClasses.find(stats => stats.className === initialClasses).stats.HP) * 0.5
    returnStats.baseStats.MP = (returnStats.levelStats.MP / statusCharacter.Lv) * 2 + parseInt(acquiredClasses.find(stats => stats.className === initialClasses).stats.MP) * 0.5
    returnStats.baseStats.ST = (returnStats.levelStats.ST / statusCharacter.Lv) * 2 + parseInt(acquiredClasses.find(stats => stats.className === initialClasses).stats.ST) * 0.5
    returnStats.baseStats.攻撃 = (returnStats.levelStats.攻撃 / statusCharacter.Lv) * 2 + parseInt(acquiredClasses.find(stats => stats.className === initialClasses).stats.攻撃) * 0.5
    returnStats.baseStats.防御 = (returnStats.levelStats.防御 / statusCharacter.Lv) * 2 + parseInt(acquiredClasses.find(stats => stats.className === initialClasses).stats.防御) * 0.5
    returnStats.baseStats.魔力 = (returnStats.levelStats.魔力 / statusCharacter.Lv) * 2 + parseInt(acquiredClasses.find(stats => stats.className === initialClasses).stats.魔力) * 0.5
    returnStats.baseStats.魔防 = (returnStats.levelStats.魔防 / statusCharacter.Lv) * 2 + parseInt(acquiredClasses.find(stats => stats.className === initialClasses).stats.魔防) * 0.5
    returnStats.baseStats.速度 = (returnStats.levelStats.速度 / statusCharacter.Lv) * 2 + parseInt(acquiredClasses.find(stats => stats.className === initialClasses).stats.速度) * 0.5
    returnStats.baseStats.命中 = (returnStats.levelStats.命中 / statusCharacter.Lv) * 2 + parseInt(acquiredClasses.find(stats => stats.className === initialClasses).stats.命中) * 0.5
    returnStats.baseStats.APP = parseInt(acquiredClasses.find(stats => stats.className === initialClasses).stats.APP) * 10
    
    // totalStats.SIZ が 0 の時に 170 にする
    if (returnStats.baseStats.SIZ === 0) {
        returnStats.baseStats.SIZ = 170;
    }
    console.log("ステータス基盤の設定 :", returnStats)

    return returnStats;
}

// 装備アイテムの上昇値を設定する関数
function applyItemBonuses(equipmentItems) {
    // アイテムボーナスの初期化
    const returnItemBonuses = JSON.parse(JSON.stringify(characterData.itemBonuses));

    console.log("returnItemBonuses:", returnItemBonuses);
    console.log("characterData.itemBonuses:", characterData.itemBonuses);
    console.log(" 装備アイテムの上昇値を設定する関数 :", equipmentItems);
   
    equipmentSlots.forEach(Slots => {
        // 装備スロットが null または undefined でない場合に処理
        if (equipmentItems[Slots] !== null && equipmentItems[Slots] !== undefined) {
            // 基礎ステータス、耐性、肉体値の属性ごとに上昇値を計算
            attributes.forEach(attribute => {
                const adjustedValue = parseInt(equipmentItems[Slots][attribute]) || 0;

                // 初期化していない場合は 0 に設定してから加算
                if (!returnItemBonuses.stats[attribute]) {
                    returnItemBonuses.stats[attribute] = 0;
                }
                returnItemBonuses.stats[attribute] += adjustedValue;
            });
        }
    });
    console.log("適用されたアイテムボーナス:", returnItemBonuses);
    return returnItemBonuses;
}


//=======================================================
// スキル画面をリセットする
async function displaySkillsReset(){
    // スキルリストの各コンテナをリセット
    const skillTypes = ["A", "S", "Q", "M", "MS", "MQ", "P"]; // 種別ごとのIDリスト（例としてA, B, Cを使用）
    skillTypes.forEach(type => {
        const container = document.getElementById(`skill-list-${type}`);
        console.log(" スキル画面をリセットする ", container)
        if (container) {
            // 子要素を削除する方法
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }
        }
    });
}

async function fetchSkills(skillList) {
    console.log(skillList)
    try {
        const response = await fetch('/api/skills', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ skillNames: skillList })
        });
        const result = await response.json();

        if (result.success) {
            return result.skills
        } else {
            console.error('スキルデータの取得に失敗しました');
        }
    } catch (error) {
        console.error('スキルデータ取得エラー:', error);
    }
}

// スキル単体取得
async function fetchSkillsByName(skillList) {
    console.log('送信するスキル名:', skillList);
    try {
        const response = await fetch('/api/getSkillByName', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ skillNames: skillList }) // 和名リストを送信
        });

        // レスポンスをJSON形式に変換
        const result = await response.json();

        if (response.ok && result.success) {
            // 成功時にスキルデータを返す
            return result.skills;
        } else {
            // 失敗時のエラーメッセージを表示
            console.error('スキルデータの取得に失敗しました:', result.message || '不明なエラー');
        }
    } catch (error) {
        // 通信エラーをキャッチして表示
        console.error('スキルデータ取得エラー:', error);
    }
}

//パッシブ振り分け
function passiveForEach(skillsP){
    // 例: skills.P に格納されたスキルの JSON
    const condPassives = [];  // 条件付きパッシブスキル
    const passives = [];      // 条件なしパッシブスキル
    
    // スキルの振り分け
    skillsP.forEach(skill => {
        // 値のチェックと振り分け

        if ((skill.攻撃手段 && skill.攻撃手段 !== "" && skill.攻撃手段 !== "0") || 
            (skill.条件スキル && skill.条件スキル !== "" && skill.条件スキル !== "0") || 
            (skill.条件属性 && skill.条件属性 !== "" && skill.条件属性 !== "0")) {
            // 値がある場合は条件付きパッシブスキルに追加
            condPassives.push(skill);
        } else {
            // それ以外はパッシブスキルに追加
            passives.push(skill);
        }
    });

    // 結果の表示
    console.log("----- 条件付きパッシブスキル -----");
    console.log(condPassives);
    console.log("----- パッシブスキル -----");
    console.log(passives);

    return {passives: passives, condPassives: condPassives};
}

// パッシブスキルの上昇値を合計する関数（プロパティ指定なし）
function passiveSkillBonuses(passiveSkills) {
    console.log("パッシブスキルの上昇値を合計する関数（プロパティ指定なし）", passiveSkills);

    // characterData.skillBonuses または stats が存在しない場合、初期化
    // if (!characterData.skillBonuses) {
    //     characterData.skillBonuses = { stats: {} };
    // } else if (!characterData.skillBonuses.stats) {
    //     characterData.skillBonuses.stats = {};
    // }

    // JSON.parse(JSON.stringify(characterData));
    const totalBonuses = JSON.parse(JSON.stringify(characterData.skillBonuses));

    passiveSkills.forEach(skill => {
        skillAttributes.forEach(attr => {
            if (skill.hasOwnProperty(attr)) {
                // totalBonuses の該当する属性がない場合、0に初期化
                totalBonuses[attr] = (totalBonuses[attr] || 0) + skill[attr];
            }
        });
    });

    return totalBonuses;
}


// 配列に別の配列を追加する関数
function addArrayToArray(targetArray, arrayToAdd) {
    targetArray.push(...arrayToAdd);
    return targetArray;
}

async function fetchMagics(skillList, magicEnhanceCount) {
    function getMagicSkills(skillLevel) {
        // skillLevelが`skills.魔法強化取得の数 として渡されると仮定
        return magicskill.slice(0, skillLevel);
    }

    const selectedSkills = getMagicSkills(magicEnhanceCount);
    const magicSkillslList = addArrayToArray(skillList, selectedSkills);
    try {
        const response = await fetch('/api/magics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ skillNames: magicSkillslList })
        });
        const result = await response.json();

        if (result.success) {
            console.log(" 取得魔法 ", result.skills)
            magics = result.skills

            return result.skills
        } else {
            console.error('魔法データの取得に失敗しました');
        }
    } catch (error) {
        console.error('魔法データ取得エラー:', error);
    }
}
// ---------------------
let isFullPower = false;

// 全力モードの切り替え
function toggleFullPowerMode() {
    isFullPower = !isFullPower;
    const fullPowerBtn = document.getElementById('full-power-btn');
    const skillLeftContainer = document.getElementById('skill-left');

    // 全力モードのエフェクトを適用
    if (isFullPower) {
        fullPowerBtn.textContent = "全力モード◎";
        fullPowerBtn.classList.add("full-power");
        skillLeftContainer.classList.add("full-power");
    } else {
        fullPowerBtn.textContent = "全力モード";
        fullPowerBtn.classList.remove("full-power");
        skillLeftContainer.classList.remove("full-power");
    }
}

// 選択されたスキルを格納するオブジェクト
let selectedSkills = {
    A: null,
    S: null,
    Q1: null,
    Q2: null,
    M: null
};

// タブを開く関数
function openSkillTab(type) {
    document.querySelectorAll('.skill-table').forEach(table => {
        table.style.display = 'none';
    });
    const selectedTable = document.getElementById(`skill-${type}`);
    if (selectedTable) {
        selectedTable.style.display = 'table';
    }

    document.querySelectorAll('.tab-button-skill').forEach(button => {
        button.classList.remove('active');
    });
    const activeButton = document.querySelector(`.tab-button-skill[onclick="openSkillTab('${type}')"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
}
// 合計を計算する汎用関数（特定キーの高い方を考慮）
function calculateTotal(keys, dataset, specialKeys = null) {
    // 全力の倍率を計算する関数
    function calculateMultiplier(allPower) {
        return (allPower + 100) / 100; // 全力倍率の計算式
    }
    let total = 0;
    // 全力の値を取得し倍率を計算
    const multiplier = calculateMultiplier(dataset["全力"] || 0);

    // 特別な処理をするキーセットが指定されている場合
    if (specialKeys) {
        const specialValues = specialKeys.map(key => dataset[key] || 0);
        total += Math.max(...specialValues); // 特別キーは高い方を採用
    }

    // 通常のキーセットで値を合計
    total += keys
        .map(key => dataset[key] || 0) // 存在しないキーは0
        .reduce((sum, value) => sum + value, 0);

    return total * multiplier;
}

// スキルのテーブルを生成
function displaySkills(setSkill) {
    // 威力のキーセット
    const powerKeys = [
        "炎", "氷", "雷", "酸", "音波", "闇", "光",
        "善", "悪", "正", "負", "毒"
    ];

    // 状態のキーセット
    const stateKeys = [
        "麻痺", "混乱", "恐怖", "盲目", "閃光", "暗黒", "幻覚", "睡眠", "石化",
        "スタン", "拘束", "呪い", "呪い/HP", "呪い/MP", "呪い/ST", "呪い/攻撃",
        "呪い/防御", "呪い/魔力", "呪い/魔防", "呪い/速度", "呪い/命中", "支配",
        "即死", "時間", "出血", "疲労", "ノックバック"
    ];

    // 威力と状態の合計を計算
    
    console.log("スキルのテーブルを生成 :", setSkill[0], statusCharacter, statusCharacter.攻撃)
    // 威力上昇判定
    setSkill?.A?.forEach(skill => {

        const row = document.createElement('tr');
        const uper = ( 1 + (parseInt(statusCharacter[String(skill.攻撃判定)]) || 0)/100) * (1 + (parseInt(statusCharacter[String(skill.追加威力)]) || 0)/500)
        const totalPower = calculateTotal(powerKeys, skill);
        const totalDefense = calculateTotal([], skill, ["物理ガード", "魔法ガード"]);
        const totalState = calculateTotal(stateKeys, skill);
        row.innerHTML = `
             <td onclick="handleSkillClick('${skill.種別}', '${skill.和名}')">
                <ruby>
                    ${skill.和名 }
                    <rt>${skill.英名}</rt>
                </ruby>
                <nobr>${getSkillIcons(skill.詳細)}</nobr>
            </td>
            <td>${Math.ceil(parseInt(totalPower)*uper)}</td>
            <td>${Math.ceil(parseInt(totalDefense)*uper)}</td>
            <td>${Math.ceil(parseInt(totalState)*uper)}</td>
            <td>${skill.属性}</td>
            <td>${skill.魔法Rank}</td>
            <td>${skill.詳細}</td>
        `;
        document.getElementById(`skill-list-${skill.種別}`).appendChild(row);
    });
    setSkill?.S?.forEach(skill => {
        //  ,${skill.威力}
        
        const row = document.createElement('tr');
        const uper = ( 1 + (parseInt(statusCharacter[String(skill.攻撃判定)]) || 0)/100) * (1 + (parseInt(statusCharacter[String(skill.追加威力)]) || 0)/500)    
        console.log(" skill S : ",skill.攻撃判定, skill.追加威力 , uper)
        const totalPower = calculateTotal(powerKeys, skill);
        const totalDefense = calculateTotal(["防御性能"], skill, ["物理", "魔法"]);
        const totalState = calculateTotal(stateKeys, skill);

        row.innerHTML = `
             <td onclick="handleSkillClick('${skill.種別}', '${skill.和名}')">
                <ruby>
                    ${skill.和名 }
                    <rt>${skill.英名}</rt>
                </ruby>
                <nobr>${getSkillIcons(skill.詳細)}</nobr>
            </td>
            <td>${Math.ceil(parseInt(totalPower)*uper)}</td>
            <td>${Math.ceil(parseInt(totalDefense)*uper)}</td>
            <td>${Math.ceil(parseInt(totalState)*uper)}</td>
            <td>${skill.属性}</td>
            <td>${skill.魔法Rank}</td>
            <td>${skill.詳細}</td>
        `;
        document.getElementById(`skill-list-${skill.種別}`).appendChild(row);
    });
    setSkill?.Q?.forEach(skill => {
        const row = document.createElement('tr');
        const uper = ( 1 + (parseInt(statusCharacter[String(skill.攻撃判定)]) || 0)/100) * (1 + (parseInt(statusCharacter[String(skill.追加威力)]) || 0)/500)    
        // 威力と状態の合計を計算
        const totalPower = calculateTotal(powerKeys, skill);
        const totalDefense = calculateTotal(["防御性能"], skill, ["物理", "魔法"]);
        const totalState = calculateTotal(stateKeys, skill);

        row.innerHTML = `
             <td onclick="handleSkillClick('${skill.種別}', '${skill.和名}')">
                <ruby>
                    ${skill.和名 }
                    <rt>${skill.英名}</rt>
                </ruby>
                <nobr>${getSkillIcons(skill.詳細)}</nobr>
            </td>
            <td>${Math.ceil(parseInt(totalPower)*uper)}</td>
            <td>${Math.ceil(parseInt(totalDefense)*uper)}</td>
            <td>${Math.ceil(parseInt(totalState)*uper)}</td>
            <td>${skill.属性}</td>
            <td>${skill.魔法Rank}</td>
            <td>${skill.詳細}</td>
        `;
        document.getElementById(`skill-list-${skill.種別}`).appendChild(row);
    });
    setSkill?.P?.forEach(skill => {
        const row = document.createElement('tr');
        const uper = ( 1 + (parseInt(selectedCharacter[String(skill.攻撃判定)]) || 0)/100) * (1 + (parseInt(selectedCharacter[String(skill.追加威力)]) || 0)/500)    
        // 威力と状態の合計を計算
        const totalPower = calculateTotal(powerKeys, skill);
        const totalDefense = calculateTotal(["防御性能"], skill, ["物理", "魔法"]);
        const totalState = calculateTotal(stateKeys, skill);

        row.innerHTML = `
             <td onclick="handleSkillClick('${skill.種別}', '${skill.和名}')">
                <ruby>
                    ${skill.和名 }
                    <rt>${skill.英名}</rt>
                </ruby>
                <nobr>${getSkillIcons(skill.詳細)}</nobr>
            </td>
            <td>${Math.ceil(parseInt(totalPower)*uper)}</td>
            <td>${Math.ceil(parseInt(totalDefense)*uper)}</td>
            <td>${Math.ceil(parseInt(totalState)*uper)}</td>
            <td>${skill.属性}</td>
            <td>${skill.魔法Rank}</td>
            <td>${skill.詳細}</td>
        `;
        document.getElementById(`skill-list-${skill.種別}`).appendChild(row);
    });
    setSkill?.M?.forEach(skill => {
        // 威力と状態の合計を計算
        const totalPower = calculateTotal(powerKeys, skill);
        const totalDefense = calculateTotal(["防御性能"], skill, ["物理", "魔法"]);
        const totalState = calculateTotal(stateKeys, skill);

        const row = document.createElement('tr');
        const uper = ( 1 + (parseInt(selectedCharacter[String(skill.攻撃判定)]) || 0)/100) * (1 + (parseInt(selectedCharacter[String(skill.追加威力)]) || 0)/500)    
        row.innerHTML = `
             <td onclick="handleSkillClick('${skill.種別}', '${skill.和名}')">
                <ruby>
                    ${skill.和名 }
                    <rt>${skill.英名}</rt>
                </ruby>
                <nobr>${getSkillIcons(skill.詳細)}</nobr>
            </td>
            <td>${Math.ceil(parseInt(totalPower)*uper)}</td>
            <td>${Math.ceil(parseInt(totalDefense)*uper)}</td>
            <td>${Math.ceil(parseInt(totalState)*uper)}</td>
            <td>${skill.属性}</td>
            <td>${skill.魔法Rank}</td>
            <td>${skill.詳細}</td>
        `;
        document.getElementById(`skill-list-${skill.種別}`).appendChild(row);
    });
}

// 魔法のテーブルを生成
function displayMagics(setMagics) {
    // 威力のキーセット
    const powerKeys = [
        "切断", "貫通", "打撃", "炎", "氷", "雷", "酸", "音波", "闇", "光",
        "善", "悪", "正", "負", "毒",
    ];

    const defenseKeys = ["物理", "魔法"];

    // 状態のキーセット
    const stateKeys = [
        "麻痺", "混乱", "恐怖", "盲目", "閃光", "暗黒", "幻覚", "睡眠", "石化",
        "スタン", "拘束", "呪い", "呪い/HP", "呪い/MP", "呪い/ST", "呪い/攻撃",
        "呪い/防御", "呪い/魔力", "呪い/魔防", "呪い/速度", "呪い/命中", "支配",
        "即死", "時間", "出血", "疲労", "物理", "魔法", "ノックバック"
    ];
    // 安全にキーの値を取得する関数を作成
    function getSafeValue(obj, key, defaultValue = 0) {
        // オブジェクトにキーが存在し、値が数値に変換可能か確認
        const value = obj && obj.hasOwnProperty(key) ? parseInt(obj[key], 10) : NaN;
        return isNaN(value) ? defaultValue : value; // NaN の場合はデフォルト値を返す
    }
    // console.log("魔法のテーブルを生成 :", setMagics, statusCharacter, statusCharacter.攻撃)
    (setMagics.M || []).forEach(skill => {
        // 威力と状態の合計を計算
        const totalPower = calculateTotal(powerKeys, skill);
        const totalDefense = calculateTotal(["防御性能"], skill, defenseKeys);
        const totalState = calculateTotal(stateKeys, skill);
        const row = document.createElement('tr');

        // selectedCharacter が配列の場合は最初のオブジェクトを選択
        const selectedCharacterData = Array.isArray(selectedCharacter) ? selectedCharacter[0] : selectedCharacter;

        // attackKey の確認
        const attackKey = String(skill.攻撃判定).trim();
        console.log("DEBUG: attackKey:", attackKey);
        console.log("DEBUG: selectedCharacterData:", selectedCharacterData);

        // 各値を安全に取得
        const attackCheck = getSafeValue(selectedCharacterData, attackKey, 0); // 攻撃判定
        console.log("DEBUG: attackCheck:", attackCheck);

        const additionalPower = getSafeValue(selectedCharacterData, String(skill.追加威力).trim(), 0); // 追加威力
        console.log("DEBUG: additionalPower:", additionalPower);

        // skill.魔法Rank を安全に取得
        const magicRank = !isNaN(Number(skill.魔法Rank)) ? Number(skill.魔法Rank) : 0;


        // magicMultiplier を計算
        const magicMultiplier = 0.15 + magicRank * 0.20;
        // 計算
        const attackMultiplier = 1 + attackCheck / 100;
        const powerMultiplier = 1 + additionalPower / 500;

        const uper = attackMultiplier * powerMultiplier * magicMultiplier;
        console.log("uper:", attackMultiplier, powerMultiplier, magicMultiplier, uper);

                row.innerHTML = `
            <td onclick="handleSkillClick('${skill.種別}', '${skill.和名}')">
                <ruby>
                    ${skill.和名 }
                    <rt>${skill.英名}</rt>
                </ruby>
                <nobr>${getSkillIcons(skill.詳細)}</nobr>
            </td>
            <td>${Math.ceil(parseInt(totalPower) * uper)}</td>
            <td>${Math.ceil(parseInt(totalDefense)*uper)}</td>
            <td>${Math.ceil(parseInt(totalState) * uper)}</td>
            <td>${skill.属性}</td>
            <td>${skill.魔法Rank}</td>
            <td>${skill.詳細}</td>
        `;
        document.getElementById(`skill-list-${skill.種別}`).appendChild(row);
    });
    (setMagics.S || []).forEach(skill => {
        // 威力と状態の合計を計算
        const totalPower = calculateTotal(powerKeys, skill);
        const totalDefense = calculateTotal(["防御性能"], skill, defenseKeys);
        const totalState = calculateTotal(stateKeys, skill);
        const row = document.createElement('tr');
        const uper = ( 1 + (parseInt(selectedCharacter[String(skill.攻撃判定)]) || 0)/100) * (1 + (parseInt(selectedCharacter[String(skill.追加威力)]) || 0)/500)    
        row.innerHTML = `
             <td onclick="handleSkillClick('${skill.種別}', '${skill.和名}')">
                <ruby>
                    ${skill.和名 }
                    <rt>${skill.英名}</rt>
                </ruby>
                <nobr>${getSkillIcons(skill.詳細)}</nobr>
            </td>
            <td>${Math.ceil(parseInt(totalPower)*uper)}</td>
            <td>${Math.ceil(parseInt(totalDefense)*uper)}</td>
            <td>${Math.ceil(parseInt(totalState)*uper)}</td>
            <td>${skill.属性}</td>
            <td>${skill.魔法Rank}</td>
            <td>${skill.詳細}</td>
        `;
        document.getElementById(`skill-list-MS`).appendChild(row);
    });
    (setMagics.Q || []).forEach(skill => {
        // 威力と状態の合計を計算
        const totalPower = calculateTotal(powerKeys, skill);
        const totalDefense = calculateTotal(["防御性能"], skill, defenseKeys);
        const totalState = calculateTotal(stateKeys, skill);
        const row = document.createElement('tr');
        const uper = ( 1 + (parseInt(selectedCharacter[String(skill.攻撃判定)]) || 0)/100) * (1 + (parseInt(selectedCharacter[String(skill.追加威力)]) || 0)/500)    
        row.innerHTML = `
             <td onclick="handleSkillClick('${skill.種別}', '${skill.和名}')">
                <ruby>
                    ${skill.和名 }
                    <rt>${skill.英名}</rt>
                </ruby>
                <nobr>${getSkillIcons(skill.詳細)}</nobr>
            </td>
            <td>${Math.ceil(parseInt(totalPower)*uper)}</td>
            <td>${Math.ceil(parseInt(totalDefense)*uper)}</td>
            <td>${Math.ceil(parseInt(totalState)*uper)}</td>
            <td>${skill.属性}</td>
            <td>${skill.魔法Rank}</td>
            <td>${skill.詳細}</td>
        `;
        document.getElementById(`skill-list-MQ`).appendChild(row);
    });
    (setMagics.A || []).forEach(skill => {
        // 威力と状態の合計を計算
        const totalPower = calculateTotal(powerKeys, skill);
        const totalDefense = calculateTotal(["防御性能"], skill, defenseKeys);
        const totalState = calculateTotal(stateKeys, skill);
        const row = document.createElement('tr');
        const uper = ( 1 + (parseInt(selectedCharacter[String(skill.攻撃判定)]) || 0)/100) * (1 + (parseInt(selectedCharacter[String(skill.追加威力)]) || 0)/500)    
        row.innerHTML = `
             <td onclick="handleSkillClick('${skill.種別}', '${skill.和名}')">
                <ruby>
                    ${skill.和名 }
                    <rt>${skill.英名}</rt>
                </ruby>
                <nobr>${getSkillIcons(skill.詳細)}</nobr>
            </td>
            <td>${Math.ceil(parseInt(totalPower)*uper)}</td>
            <td>${Math.ceil(parseInt(totalDefense)*uper)}</td>
            <td>${Math.ceil(parseInt(totalState)*uper)}</td>
            <td>${skill.属性}</td>
            <td>${skill.魔法Rank}</td>
            <td>${skill.詳細}</td>
        `;
        document.getElementById(`skill-list-A`).appendChild(row);
    });
}
let selectedType = null;
let selectedSkill = null;

// 現状 playerData からしか取得していないので技が入力されない。
// スキルをクリックした際の処理
async function handleSkillClick(type, name) {
    console.log("スキルをクリックした際の処理:",type, name)
    console.log(playerData.skills)
    console.log(playerData.magics)
    console.log(playerData.magic)
    // await displaySkills(characterDataPush.skills)
    // await displayMagics(characterDataPush.magic)
    // displaySkillsList = characterDataPush.skills
    // displayMagicsList = characterDataPush.magic

    // playerData.skills と playerData.magics が存在するかを確認しながら selectedSkill を設定
    selectedSkill = await fetchSkillsByName(name);

    console.log("selectedSkill: ", selectedSkill)
    // 許可されたスロットをドロップダウンに追加
    const slotSelect = document.getElementById('slot-select');
    slotSelect.innerHTML = ''; // 既存のオプションをクリア

    console.log(" Listsss ", selectedSkills)
    const allowedSlots = getAllowedSlots(type);
    allowedSlots.forEach(slot => {
        const option = document.createElement('option');
        option.value = slot;
        option.textContent = slot;

        // スキルの分類に基づいて初期選択を設定
        if (type === 'Q') {
            // Qの場合はQ1が埋まっているかを確認して初期選択を設定
            if (slot === 'Q1' && !selectedSkills.Q1) {
                option.selected = true; // Q1が空いている場合はQ1を選択
            } else if (slot === 'Q2' && selectedSkills.Q1) {
                option.selected = true; // Q1が埋まっている場合はQ2を選択
            }
        } else if (slot === type) {
            // Q以外のスキルは同じスキルタイプに設定
            option.selected = true;
        }

        slotSelect.appendChild(option);
    });

    // モーダルメッセージを設定
    document.getElementById('modal-message').textContent = `「${name}」をセットするスロットを選択してください。`;
    openModal();
}


// スキルをセットできるスロットを返す関数
function getAllowedSlots(skillType) {
    const allowedSlots = {
        A: ['A'],
        S: ['A', 'S'],
        Q: ['A', 'S', 'Q1', 'Q2'],
        M: ['M'],
        MS:['A', 'S'],
        MQ:['S', 'Q1', 'Q2'],
        P: ['A', 'S', 'Q1', 'Q2'],
    };
    return allowedSlots[skillType] || [];
}

// モーダルウィンドウを開く関数
function openModal() {
    document.getElementById('modal').style.display = 'block';
}

// モーダルを閉じる関数
function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

// モーダル外をクリックしたときに閉じる処理
function closeModalOnOutsideClick(event) {
    const modalContent = document.querySelector('.modal-content');
    if (!modalContent.contains(event.target)) {
        closeModal();
    }
}

// 「セット」ボタンをクリックして選択スキルをセット
document.getElementById('modal-set-btn').addEventListener('click', () => {
    const slot = document.getElementById('slot-select').value;
    console.log("「セット」ボタンをクリックして選択スキルをセット:",slot, selectedSkill)
    // statusCharacter と selectedSkills.A 
    
    if (selectedSkill && slot) {
        selectedSkills[slot] = selectedSkill;
        selectSkill(slot, selectedSkill)
        console.log(`スキル「${selectedSkill.name}」をスロット「${slot}」にセットしました。`);
        closeModal();
    }
});

// エンターキーで「セット」ボタンを押せるようにする
document.addEventListener('keydown', function(event) {
    const modal = document.getElementById('modal');
    if (event.key === 'Enter' && modal.style.display === 'block') {
        document.getElementById('modal-set-btn').click();
    }
});

// 「キャンセル」ボタンが押されたとき
document.getElementById('modal-cancel-btn').addEventListener('click', () => {
    closeModal();
});

// スキルごとに同じキーの値を合計する関数
function sumSkills(statusCharacter, selectedSkills) {
    const result = {};

    // 各スキルスロットを確認して値を加算
    ['A', 'S', 'Q1', 'Q2', 'M'].forEach(slot => {
        const skill = selectedSkills[slot];
        
        if (skill) {
            for (const key in skill) {
                // statusCharacter の該当キーの値を合算する
                if (statusCharacter[key]) {
                    result[key] = (result[key] || 0) + (parseInt(skill[key]) || 0);
                }
            }
        }
    });

    totalSkillValues = result; // 計算結果をグローバル変数に保存
    return result;
}


// スキルを選択してスロットにセット
function selectSkill(slotKey, setSkill) {
    // selectedSkill
    console.log("スキルを選択してスロットにセット :", slotKey, setSkill)
    selectedSkills[slotKey] = setSkill;
    console.log("スキルを選択してスロットにセット selectedSkills:", selectedSkills)
    updateSelectedSkills();
}

// 選択されたスキルリストをテーブル形式で表示
async function updateSelectedSkills() {
    const selectedSkillsTable = document.getElementById('selected-skills');
    selectedSkillsTable.innerHTML = '';

    for (const [slot, skill] of Object.entries(selectedSkills)) {
        // selectedSkills
        // const skill = skillData[0]
        // console.log(" 選択されたスキルリストをテーブル形式で表示 skill:", skill, skill[0].攻撃判定)
        // console.log(" 合計ステータス :",sumSkills(statusCharacter, selectedSkills))
        let uper = 1; // デフォルト値として 1 を設定

        // skill に値があるときのみ計算
        if (skill) {
            uper = (1 + (parseInt(statusCharacter[String(skill[0].攻撃判定)]) || 0) / 100) * 
                   (1 + (parseInt(statusCharacter[String(skill[0].追加威力)]) || 0) / 500) || 1;

                   console.log(" 威力 : ", statusCharacter, (parseInt(statusCharacter[String(skill[0].攻撃判定)]) || 0), (parseInt(statusCharacter[String(skill[0].追加威力)]) || 0))
        }
        const row = document.createElement('tr');
        if (skill) {
            row.innerHTML = `<td>${slot}</td><td class="skill-name clickable">
                <ruby>
                    ${skill[0].和名 }
                    <rt>${skill[0].英名}</rt>
                </ruby>
                <nobr>${getSkillIcons(skill[0].詳細)}</nobr>
                <td>${Math.ceil(parseInt(skill[0].威力)*uper)}</td>
                <td>${Math.ceil(parseInt(skill[0].状態)*uper)}</td>
                <td>${skill[0].属性}</td>`;

            // 技名をクリックしたら削除確認ダイアログを表示
            row.value = skill[0].和名
            const skillNameCell = row.querySelector('.skill-name');
            // skillNameCell.addEventListener('click', () => {
            //     if (confirm(`「${skill.和名}」を削除しますか？`)) {
            //         removeSkill(slot);
            //     }
            // });
            skillNameCell.addEventListener('click', () => {
                openConfirmModal(`「${skill[0].和名}」を削除しますか？`, (confirmed) => {
                    if (confirmed) {
                        removeSkill(slot);
                    }
                });
            });
        } else {
            row.innerHTML = `<td>${slot}</td><td colspan="2">未選択</td>`;
        }
        selectedSkillsTable.appendChild(row);
    }
    
}

const iconConditions = [
    { keywords: ["軽減+", "物理+", "魔法+", "防御を行う", "耐性+", "防御+", "魔防+", "軽減+"], icon: "🛡️" },
    { keywords: ["射撃"], icon: "🏹" },
    { keywords: ["突撃"], icon: "💥" },
    { keywords: ["投擲"], icon: "🎯" },
    { keywords: ["正+", "負+", "再生"], icon: "✨" },
    { keywords: ["攻撃手段:素手", "攻撃手段:肉体"], icon: "🤜" },
    { keywords: ["攻撃手段:吐息"], icon: "🌊" },
    { keywords: ["攻撃手段:眼"], icon: "👁️" },
    { keywords: ["全力+", "攻撃手段:武器", "条件"], icon: "⚔️" },
    { keywords: ["速度+", "回避"], icon: "⏩" },
];

function getSkillIcons(skill) {
    let icons = "";

    // 最初に一致した条件のアイコンを返す
    const matchedCondition = iconConditions.find(condition =>
        condition.keywords.some(keyword => String(skill).includes(keyword))
    );

    if (matchedCondition) {
        icons = matchedCondition.icon;
    }

    return icons;
}

// スキルを個別に削除
function removeSkill(slot) {
    selectedSkills[slot] = null;
    updateSelectedSkills();
}

// すべてのスキルをリセット
function clearAllSkills() {
    console.log("すべてのスキルをリセット")
    openConfirmModal("全てのスキルをリセットしますか？👀", (result) => {
        if (result) {
            console.log("すべてのスキルをリセット操作が確認されました。"); // true の場合
            selectedSkills = { A: null, S: null, Q1: null, Q2: null, M: null };
        updateSelectedSkills();
        } else {
            console.log("すべてのスキルをリセット操作がキャンセルされました。"); // false の場合
        }
    });
}
// ダイスロールの処理を関数化
function rollDiceResults(count, max) {
    const results = [];
    for (let i = 0; i < count; i++) {
        results.push(Math.floor(Math.random() * max) + 1);
    }
    return results;
}
// モーダルを開くときに画面の値をモーダルに設定
function openDiceModal() {
    const diceCount = parseInt(document.getElementById('dice-count').value);
    const diceMax = parseInt(document.getElementById('dice-max').value);

    document.getElementById('dice-modal-count').value = diceCount;
    document.getElementById('dice-modal-value').value = diceMax;

    // モーダルを表示
    const modal = document.getElementById('dice-modal');
    modal.style.display = 'block';
}

// モーダルを閉じる関数
function closeDiceModal() {
    document.getElementById('dice-modal').style.display = 'none';
}

// モーダルの「保存」ボタンで値を画面に同期
function syncDiceSettingsFromModal() {
    // モーダルのダイス設定を取得
    const diceModalCount = parseInt(document.getElementById('dice-modal-count').value);
    const diceModalValue = parseInt(document.getElementById('dice-modal-value').value);

    // 入力値をバリデーション
    if (isNaN(diceModalCount) || isNaN(diceModalValue) || diceModalCount <= 0 || diceModalValue <= 1) {
        alert('ダイス数は1以上、ダイス最大値は2以上の数値を入力してください。');
        return;
    }

    // モーダルの値を画面に同期
    document.getElementById('dice-count').value = diceModalCount;
    document.getElementById('dice-max').value = diceModalValue;

    // モーダルを閉じる
    const modal = document.getElementById('dice-modal');
    modal.style.display = 'none';

    rollCount++
    // 同期完了後、sendData() を呼び出してデータ送信
    sendData(diceModalCount, diceModalValue);
}


// データ送信関数
async function sendData(diceCount, diceMax) {
    console.log("データ送信関数===============");

    // ダイスロール処理
    const rollResults = rollDiceResults(diceCount, diceMax);

    // 現在時刻を取得
    const now = new Date();
    const time = now.toLocaleTimeString();

    // 全力モードの取得
    const fullPowerBtn = document.getElementById('full-power-btn');
    const fullPowerOnOff = fullPowerBtn.textContent === "全力モード◎" ? 1 : 0;

    // 攻撃オプションを取得
    const selectElement = document.getElementById("attack-method-select");

    // 送信するデータの準備
    const dataToSend = {
        name: playerData.name,
        attackOption: selectElement.value || "",
        fullPower: fullPowerOnOff,
        skills: getSkillsFromTable(),
        rollResults: rollResults
    };

    console.log("dataToSend :", dataToSend);
    const skillsList = dataToSend.skills
    .map(skill => {
        if (skill.slot === "A") {
            return `✨${skill.slot}:${skill.name || "-"}`;
        }
        return `${skill.slot}:${skill.name || "-"}`;
    })
    .join(", ");

    // ログに追加
    const logEntry = document.createElement("li");
    logEntry.innerHTML = `
        <strong>${rollCount}回目 (${time}):</strong>
        <br>${playerData.name}<br>
        ${rollResults.join(", ")}
        <details>
            <summary>詳細を表示/非表示</summary>
            ${dataToSend.attackOption}<br>
            ${skillsList}
        </details>
    `;
    document.getElementById("dice-log").prepend(logEntry);

    // 最大30件の結果のみ表示するように制限
    if (document.getElementById("dice-log").children.length > 30) {
        document.getElementById("dice-log").lastChild.remove();
    }

    // サーバーにデータを送信
    try {
        const response = await fetch('/api/select_dataLog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ skillNames: dataToSend })
        });
        const result = await response.json();

        if (result.success) {
            console.error('送信完了');
        } else {
            console.error('送信に失敗しました');
        }
    } catch (error) {
        console.error('送信エラー:', error);
    }
}


function getSkillsFromTable() {
    console.log("  getSkillsFromTable :")
    const selectedSkillsTable = document.getElementById('selected-skills');
    const skills = [];
    const rows = selectedSkillsTable.getElementsByTagName('tr');

    for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].getElementsByTagName('td');

        // ruby 要素を取得
        const rubyElement = cells[1].querySelector('ruby');
        console.log(rubyElement)

        let mainText = '';
        if (rubyElement) {
            mainText = rubyElement.childNodes[0].textContent.trim();
        }
        
        const skillName = mainText === "未選択" ? "" : mainText;
        
        console.log(cells)
        // テーブル内にスキルの各属性（例：名前、威力、属性）が順番に並んでいる場合
        const skill = {
            slot: cells[0]?.textContent.trim(),          // スキルスロット
            name: skillName,          // スキル名
        };

        skills.push(skill); // 取得したスキルを配列に追加
    }

    console.log(skills)

    return skills;
}



// 攻撃手段にデータを入れる
function populateAttackOptions(options) {
    const selectElement = document.getElementById("attack-method-select");

    // 初期化して既存のオプションを削除
    selectElement.innerHTML = "";

    // デフォルトの「選択してください」を追加
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "--選択してください--";
    selectElement.appendChild(defaultOption);

    // JSONデータからオプションを生成
    options.forEach(option => {
        const optionElement = document.createElement("option");
        optionElement.value = option.value;

        // それぞれの値を条件付きで追加
        const parts = [option.label];
        if (option.威力) parts.push(`威: ${option.威力}`);
        if (option.属性) parts.push(`属: ${option.属性}`);
        if (option.防御) parts.push(`防: ${option.防御}`);

        // 各値が揃ったテキストを設定
        optionElement.textContent = parts.join(" ");
        selectElement.appendChild(optionElement);
    });
}


function handleAttackMethodChange() {
    const selectedMethod = document.getElementById("attack-method-select").value;
    if (selectedMethod) {
        console.log(`選択された攻撃手段: ${selectedMethod}`);
        applyAttackMethodEffects(selectedMethod);
    }
}

// 攻撃手段ごとの効果を適用する関数（仮定）
function applyAttackMethodEffects(method) {
    // ここで選択された攻撃手段に応じてステータスやスキルを変更
    switch(method) {
        case '武器1':
            // 武器1に応じたステータス変更処理
            break;
        case '素手':
            // 素手に応じた処理
            break;
        // 他の攻撃手段も同様に処理を追加
    }

    // 必要なら画面の再描画
    updateCharacterStatsDisplay();
}