module.exports = {
    // キャラが属性未指定のときに使う領域順
    defaultMagicAttributes: ['闇', '魔術', '雷', '重力', '解呪', '強化', '炎'],

    // 職業データの「○○の領域」を判定する接尾辞
    realmNameSuffix: '領域',

    // 職業データで魔法名リストを読み始める基準列
    classRowMagicListStartKey: '物理軽減',

    // 系統値 -> 解放Rank
    rankPointTable: [
        { rank: 1, min: 0, max: 20 },
        { rank: 2, min: 21, max: 41 },
        { rank: 3, min: 42, max: 62 },
        { rank: 4, min: 63, max: 83 },
        { rank: 5, min: 84, max: 104 },
        { rank: 6, min: 105, max: 125 },
        { rank: 7, min: 126, max: 146 },
        { rank: 8, min: 147, max: 167 },
        { rank: 9, min: 168, max: 188 },
        { rank: 10, min: 189, max: Infinity }
    ],

    // 取得率コード表（3=100%, 2=66%, 1=33%, 0=0%）
    baseTableOver: [
        [3, 3, 3, 3, 3, 3, 3], // Rank1
        [3, 3, 3, 3, 3, 3, 3], // Rank2
        [3, 3, 3, 3, 3, 3, 3], // Rank3
        [3, 3, 3, 3, 3, 3, 3], // Rank4
        [3, 3, 3, 3, 3, 3, 3], // Rank5
        [3, 3, 3, 3, 3, 3, 3], // Rank6
        [3, 3, 3, 3, 3, 3, 2], // Rank7
        [3, 3, 3, 3, 3, 2, 2], // Rank8
        [3, 3, 3, 3, 2, 1, 1], // Rank9
        [3, 3, 3, 2, 2, 1, 0]  // Rank10
    ],

    acquisitionRateMap: {
        0: 0,
        1: 0.35,
        2: 0.70,
        3: 1
    },

    // 旧式 fallback: (IF(value>0,1,0) + value/21)
    magicRankFormula: {
        baseWhenPositive: 1,
        divisor: 21,
        treatAsRankMax: 20
    },

    magicSkillRank: {
        // 取得判定は魔法Rank基準
        rankFields: ['魔法Rank'],
        levelFields: [],
        levelFieldRankDirectMax: 12,
        levelDivisor: 7,
        maxUsableRank: 7
    },

    magicSystemFields: {
        magicFields: ['魔力系', '魔術系'],
        faithFields: ['信仰系'],
        circleMarks: ['〇', '○', '◯']
    }
};
