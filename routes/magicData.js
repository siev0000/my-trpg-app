

/* 
  ★★★★
  ===== 魔法自動取得ロジック =====
*/

  // 魔法取得数のテーブル
  const BASE_TABLE = [
    [3,3,3,3,3,3,3], // Rank1
    [3,3,3,3,3,2,2], // Rank2
    [3,3,3,2,2,1,1], // Rank3
    [3,3,2,2,1,1,0], // Rank4
    [3,2,2,1,1,0,0], // Rank5
    [2,2,1,1,0,0,0], // Rank6
    [2,1,1,0,0,0,0], // Rank7
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
    { rank: 1, min: 0,  max: 3 },
    { rank: 2, min: 4,  max: 8 },
    { rank: 3, min: 9,  max: 15 },
    { rank: 4, min: 16, max: 25 },
    { rank: 5, min: 25, max: 35 },
    { rank: 6, min: 36, max: 50 },
    { rank: 7, min: 51, max: Infinity }
  ];

  // デバッグフラグ
  const DEBUG_MAGIC = true;

  // ▼ スキルから魔法ポイントを計算する関数
  export function getMagicPointFromSkills(skills) {
    if (!Array.isArray(skills)) return 0;

    let total = 0;

    for (const skill of skills) {
      if (!skill || !skill.名前) continue;

      // 「魔法取得◯」パターンに完全一致
      const match = skill.名前.match(/^魔法取得(\d+)$/);

      if (match) {
        const value = Number(match[1]);
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
    const magicPoint = getMagicPointFromSkills(character.skills);
    
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



  // maxRankを入れるだけで、せり上げ後の表を返す
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
  /**
   * from=buildMagicLearnTable(baseRank)
   * to  =buildMagicLearnTable(baseRank+1)
   * diff=(to-from) に progress を掛けて四捨五入し、from に足す
   * @param {number} baseRank   例: 2（Rank3に上がる途中なら、2→3の補間）
   * @param {number} progress   0.0〜1.0
   * @returns {{Rank1:number[],Rank2:number[],...,Rank7:number[]}}
   */
  function buildProgressedMagicLearnTable(baseRank, progress) {
    const fromTable = buildMagicLearnTable(baseRank);
    const toTable   = buildMagicLearnTable(baseRank + 1);

    const result = {};

    for (let rank = 1; rank <= 7; rank++) {
      const fromRow = fromTable[`Rank${rank}`] || [0,0,0,0,0,0,0];
      const toRow   = toTable[`Rank${rank}`]   || [0,0,0,0,0,0,0];

      const row = [];

      for (let i = 0; i < 7; i++) {
        const from = fromRow[i] ?? 0;
        const to   = toRow[i] ?? 0;

        const diff = to - from;
        const add  = calcProgressedDiff(diff, progress);

        row.push(from + add);
      }

      result[`Rank${rank}`] = row;
    }

    return result;
  }
  // 魔法ランク解除判定
  function getUnlockedRank(magicPoint) {
    if (magicPoint <= 3)  return 1;
    if (magicPoint <= 8)  return 2;
    if (magicPoint <= 15) return 3;
    if (magicPoint <= 25) return 4;
    if (magicPoint <= 35) return 5;
    if (magicPoint <= 50) return 6;
    return 7;
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
  function acquireMagicByTable(attrProgressMap, attributeList, learnTable) {
    console.log(
      "acquireMagicByTable called:",
      attrProgressMap,
      attributeList,
      learnTable
    );

    const result = {};

  for (const ap of attrProgressMap) {
    const { attr, index, rank: maxRank } = ap;
    const attrData = attributeList.find(a => a.属性名 === attr);
    if (!attrData) continue;

    const magicList = attrData.魔法リスト ?? [];
    result[attr] = [];

    for (let r = 1; r <= maxRank; r++) {
      const limit = learnTable[`Rank${r}`]?.[index] ?? 0;
      if (limit <= 0) continue;

      const candidates = magicList.filter(m => {
        const mr = Number(String(m.Rank).trim());

        const raw = typeof m.取得条件 === "string"
          ? m.取得条件.trim()
          : "";

        const noCondition = (raw === "" || raw === "0");

        return mr === r && noCondition;
      });



      result[attr].push(...candidates.slice(0, limit));
    }
  }
    console.log("acquireMagicByTable result:", result);
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
  function checkMagicConditionParsed(magic, char, attrProgressMap) {
    const parsed = magic?.取得条件_parsed;

    if (!parsed) {
      if (DEBUG_MAGIC) {
        console.log(`[OK] ${magic?.名前} : 条件なし`);
      }
      return true;
    }

    const name = magic?.名前 ?? "(no name)";

    const charAttrs = Array.isArray(char.attribute) ? char.attribute : [];

    const charRoles = (char.Role ?? [])
      .map(r => r?.roleName)
      .filter(Boolean);

    const charMagics = char.magic?.magicListAll ?? [];
    const charStats = char.stats?.baseStats ?? {};

    // ----------------------------
    // Rank 制限
    // ----------------------------
    const magicRank = Number(magic?.Rank ?? 0);

    // ----------------------------
    // 属性条件（Rank 必須）
    // ----------------------------
    if (Array.isArray(parsed.属性) && parsed.属性.length > 0) {
      // console.log("属性条件チェック:", parsed.属性);
      for (const attr of parsed.属性) {
        // console.log("属性条件チェック:", attr);
        // attr が attrProgressMap に存在するか確認
        const ap = attrProgressMap.find(ap => ap.attr === attr);
        if (!ap) {
          if (DEBUG_MAGIC) {
            console.warn(`[NG][属性] ${name} : 属性 ${attr} が attrProgressMap に存在しない`);
          }
          return false;
        }
        // rank が魔法の rank を超えていなければ false
        if (ap.rank <= magicRank) {
          if (DEBUG_MAGIC) {
            console.warn(`[NG][属性] ${name} : 属性 ${attr} の rank ${ap.rank} が魔法 rank ${magicRank} を満たさない`);
          }
          return false;
        }
      }
    }


    // ----------------------------
    // ロール条件
    // ----------------------------
    if (Array.isArray(parsed.ロール) && parsed.ロール.length > 0) {
      const ok = parsed.ロール.every(r => charRoles.includes(r));
      if (!ok) {
        if (DEBUG_MAGIC) {
          console.warn(
            `[NG][ロール] ${name}`,
            { need: parsed.ロール, char: charRoles }
          );
        }
        return false;
      }
    }

    // ----------------------------
    // スキル条件
    // ----------------------------
    if (Array.isArray(parsed.スキル) && parsed.スキル.length > 0) {
      const ok = parsed.スキル.every(s =>
        charMagics.some(m => m.名前 === s)
      );
      if (!ok) {
        if (DEBUG_MAGIC) {
          console.warn(
            `[NG][スキル] ${name}`,
            {
              need: parsed.スキル,
              char: charMagics.map(m => m.名前)
            }
          );
        }
        return false;
      }
    }

    // ----------------------------
    // 能力値条件
    // ----------------------------
    if (Array.isArray(parsed.能力値) && parsed.能力値.length > 0) {
      for (const c of parsed.能力値) {
        const v = charStats?.[c.key] ?? 0;
        const ok = compareValue(v, c.op, c.value);

        if (!ok) {
          if (DEBUG_MAGIC) {
            console.warn(
              `[NG][能力値] ${name}`,
              {
                stat: c.key,
                op: c.op,
                need: c.value,
                char: v
              }
            );
          }
          return false;
        }
      }
    }

    if (DEBUG_MAGIC) {
      console.log(`[OK] ${name} : 条件クリア`);
    }

    return true;
  }

  // 属性ごとの魔法取得進捗を計算（attribute順を保証）
  function buildAttributeProgressMap({
    attribute,
    learnTable,
    baseRank,
    globalProgress
  }) {
    return attribute.map((attr, attrIndex) => {
      const attrRank = getContinuousAttributeRank(learnTable, attrIndex);

      let progress = 0;
      if (attrRank === baseRank) {
        progress = Number(globalProgress.toFixed(3));
      }

      return {
        attr,          // 属性名
        index: attrIndex, // 明示的な順序
        rank: attrRank,
        progress
      };
    });
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
  function acquireConditionalMagicByAttr(
    character,
    acquiredNormalByAttr,
    conditionalMagicList,
    attrProgressMap
  ) {
    console.log("=== acquireConditionalMagicByAttr START ===");
    console.log("character.attribute:", character);
    console.log("attrProgressMap:", attrProgressMap);
    console.log("acquiredNormalByAttr:", acquiredNormalByAttr);
    console.log("conditionalMagicList(raw):", conditionalMagicList);
    const normalAll = Object.values(acquiredNormalByAttr ?? {}).flat();
    const alreadyAll = [
      ...normalAll,
      ...(character.magicListAll ?? [])
    ];

    const result = {};

  for (const ap of attrProgressMap) {
    const attr = ap.attr;
    const unlockedRank = ap.rank;

    if (!character.attribute.includes(attr)) continue;
    if (!unlockedRank) continue;

    const list = conditionalMagicList[attr];
    if (!Array.isArray(list) || list.length === 0) continue;

    const attrMagics = [];

    for (const magic of list) {
      // Rank制御
      if (Number(magic.Rank) > unlockedRank) continue;

      // 条件チェック
      if (magic.取得条件_parsed) {
        if (!checkMagicConditionParsed(magic, character, attrProgressMap)) continue;
      }

      // 既取得チェック
      if (alreadyAll.some(m => m.名前 === magic.名前)) continue;

      attrMagics.push(magic);
    }

    if (attrMagics.length > 0) {
      result[attr] = attrMagics;
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
      魔法を取得
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
      rank === 1
        ? buildMagicLearnTable(1)
        : buildProgressedMagicLearnTable(rank, progress);

    if (DEBUG_MAGIC) {
      console.log("=== Magic Learn Table ===");
      Object.keys(learnTable).forEach(key => {
        console.log(
          key,
          learnTable[key].map(v => String(v).padStart(2, " ")).join(" ")
        );
      });
    }

    const attrProgressMap = buildAttributeProgressMap({
      attribute,
      attributeList,
      baseRank: rank,
      globalProgress: progress,
      learnTable
    });

    if (DEBUG_MAGIC) {
      console.log("=== Attribute Progress ===");
      console.log(attrProgressMap);
    }

    // 4. 通常魔法取得（表ベース）
    const acquired = acquireMagicByTable(
      attrProgressMap,
      attributeList,
      learnTable
    );

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
      attrProgressMap
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

    return (acquired);
  }
