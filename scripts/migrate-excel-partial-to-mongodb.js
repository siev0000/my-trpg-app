const path = require("path");
const XLSX = require("xlsx");
const { withMongoClient } = require("../storage/mongo-client");
const { getMongoConfig } = require("../storage/config");

const SHEETS = {
    Character: "キャラクター",
    User: "userID",
    ItemList: "装備",
    Skill: "スキル"
};

const CHARACTER_EXCLUDE_KEYS = new Set([
    "取得魔法",
    "スキル",
    "耐性:技能値",
    "弱点"
]);

const ITEMLIST_INCLUDE_KEYS = [
    "名前",
    "フリガナ",
    "魔法1",
    "魔法2",
    "魔法3",
    "素材1",
    "量1",
    "素材2",
    "量2",
    "素材3",
    "量3",
    "素材4",
    "量4"
];

function parseArgs(argv = []) {
    const args = {
        dryRun: false,
        excelPath: "data.xlsx",
        dbName: "",
        uri: "",
        targets: ""
    };
    for (let i = 0; i < argv.length; i += 1) {
        const token = String(argv[i] || "").trim();
        if (!token) continue;
        if (token === "--dry-run") {
            args.dryRun = true;
            continue;
        }
        if (token === "--excel" && argv[i + 1]) {
            args.excelPath = String(argv[i + 1]);
            i += 1;
            continue;
        }
        if (token === "--db" && argv[i + 1]) {
            args.dbName = String(argv[i + 1]);
            i += 1;
            continue;
        }
        if (token === "--uri" && argv[i + 1]) {
            args.uri = String(argv[i + 1]);
            i += 1;
            continue;
        }
        if (token === "--targets" && argv[i + 1]) {
            args.targets = String(argv[i + 1]);
            i += 1;
            continue;
        }
    }
    return args;
}

function normalizeTargets(rawTargets = "") {
    const list = String(rawTargets || "")
        .split(",")
        .map((entry) => normalizeText(entry).toLowerCase())
        .filter(Boolean);
    if (list.length === 0) {
        return new Set(["character", "user", "itemlist", "skill"]);
    }
    return new Set(list);
}

function normalizeText(value) {
    return String(value ?? "").trim();
}

function normalizeKeyForCompare(key) {
    return normalizeText(key)
        .replace(/：/g, ":")
        .replace(/\s+/g, "");
}

function readSheetRows(workbook, sheetName) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [];

    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    if (!rows.length) return [];
    const range = XLSX.utils.decode_range(sheet["!ref"] || "A1:A1");
    const firstColHeaderCell = sheet[XLSX.utils.encode_cell({ c: range.s.c, r: range.s.r })];
    const aColumnHeader = normalizeText(firstColHeaderCell?.w ?? firstColHeaderCell?.v ?? "");
    if (!aColumnHeader) return rows;

    return rows.filter((row) => Boolean(normalizeText(row?.[aColumnHeader])));
}

function hasSheet(workbook, sheetName) {
    return Boolean(workbook?.Sheets?.[sheetName]);
}

function pickStableId(row = {}, keys = [], fallbackPrefix = "row", index = 0) {
    for (const key of keys) {
        const value = normalizeText(row?.[key]);
        if (value) return value;
    }
    return `${fallbackPrefix}-${index + 1}`;
}

function ensureUniqueIds(docs = []) {
    const counters = new Map();
    return docs.map((doc) => {
        const baseId = normalizeText(doc?._id) || "row";
        const current = (counters.get(baseId) || 0) + 1;
        counters.set(baseId, current);
        if (current === 1) {
            return { ...doc, _id: baseId };
        }
        return { ...doc, _id: `${baseId}#${current}` };
    });
}

function transformCharacterRows(rows = []) {
    const excluded = new Set(Array.from(CHARACTER_EXCLUDE_KEYS).map((key) => normalizeKeyForCompare(key)));
    const docs = rows
        .map((row, index) => {
            const source = row && typeof row === "object" ? row : {};
            const next = {};
            Object.entries(source).forEach(([key, value]) => {
                const normalizedKey = normalizeKeyForCompare(key);
                if (!normalizedKey) return;
                if (normalizedKey.startsWith("__EMPTY")) return;
                if (excluded.has(normalizedKey)) return;
                next[key] = value;
            });
            const _id = pickStableId(source, ["名前"], "character", index);
            return { _id, ...next };
        })
        .filter((row) => normalizeText(row?._id));
    return ensureUniqueIds(docs);
}

function transformUserRows(rows = []) {
    const docs = rows
        .map((row, index) => {
            const source = row && typeof row === "object" ? row : {};
            const _id = pickStableId(source, ["ID"], "user", index);
            return { _id, ...source };
        })
        .filter((row) => normalizeText(row?._id));
    return ensureUniqueIds(docs);
}

function transformItemRows(rows = []) {
    const docs = rows
        .map((row, index) => {
            const source = row && typeof row === "object" ? row : {};
            const picked = {};
            ITEMLIST_INCLUDE_KEYS.forEach((key) => {
                picked[key] = source?.[key] ?? "";
            });
            const _id = pickStableId(source, ["名前", "フリガナ"], "item", index);
            return { _id, ...picked };
        })
        .filter((row) => normalizeText(row?._id));
    return ensureUniqueIds(docs);
}

function transformSkillRows(rows = []) {
    const docs = rows
        .map((row, index) => {
            const source = row && typeof row === "object" ? row : {};
            const next = {};
            Object.entries(source).forEach(([key, value]) => {
                const normalizedKey = normalizeKeyForCompare(key);
                if (!normalizedKey) return;
                if (normalizedKey.startsWith("__EMPTY")) return;
                next[key] = value;
            });
            const _id = pickStableId(source, ["和名", "名前", "ID"], "skill", index);
            return { _id, ...next };
        })
        .filter((row) => normalizeText(row?._id));
    return ensureUniqueIds(docs);
}

async function replaceCollectionWithDocs(db, collectionName, docs = [], options = {}) {
    const collection = db.collection(collectionName);
    if (options?.dryRun) {
        return {
            deletedCount: 0,
            insertedCount: docs.length,
            dryRun: true
        };
    }
    const deleteResult = await collection.deleteMany({});
    let insertedCount = 0;
    if (docs.length > 0) {
        const insertResult = await collection.insertMany(docs, { ordered: false });
        insertedCount = Object.keys(insertResult.insertedIds || {}).length;
    }
    return {
        deletedCount: deleteResult.deletedCount || 0,
        insertedCount,
        dryRun: false
    };
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const mongoConfig = getMongoConfig();
    const excelPath = path.resolve(args.excelPath || "data.xlsx");
    const dbName = normalizeText(args.dbName) || normalizeText(mongoConfig.dbName) || "my_trpg_app";
    const uri = normalizeText(args.uri) || normalizeText(mongoConfig.uri) || "mongodb://127.0.0.1:27017";
    const targets = normalizeTargets(args.targets);

    const workbook = XLSX.readFile(excelPath);
    const hasCharacterSheet = hasSheet(workbook, SHEETS.Character);
    const hasUserSheet = hasSheet(workbook, SHEETS.User);
    const hasItemSheet = hasSheet(workbook, SHEETS.ItemList);
    const hasSkillSheet = hasSheet(workbook, SHEETS.Skill);
    const characterRows = readSheetRows(workbook, SHEETS.Character);
    const userRows = readSheetRows(workbook, SHEETS.User);
    const itemRows = readSheetRows(workbook, SHEETS.ItemList);
    const skillRows = readSheetRows(workbook, SHEETS.Skill);

    const characterDocs = transformCharacterRows(characterRows);
    const userDocs = transformUserRows(userRows);
    const itemDocs = transformItemRows(itemRows);
    const skillDocs = transformSkillRows(skillRows);

    console.log(`[mongo:excel] excel=${excelPath}`);
    console.log(`[mongo:excel] db=${dbName}`);
    console.log(`[mongo:excel] dryRun=${args.dryRun ? "true" : "false"}`);
    console.log(`[mongo:excel] targets=${Array.from(targets).join(",")}`);
    console.log(`[mongo:excel] sheets Character=${hasCharacterSheet ? "found" : "missing"} User=${hasUserSheet ? "found" : "missing"} ItemList=${hasItemSheet ? "found" : "missing"} Skill=${hasSkillSheet ? "found" : "missing"}`);
    console.log(`[mongo:excel] sourceRows Character=${characterRows.length} User=${userRows.length} ItemList=${itemRows.length} Skill=${skillRows.length}`);
    console.log(`[mongo:excel] docs Character=${characterDocs.length} User=${userDocs.length} ItemList=${itemDocs.length} Skill=${skillDocs.length}`);

    const sampleCharacter = characterDocs[0] || {};
    const hasExcluded =
        Object.prototype.hasOwnProperty.call(sampleCharacter, "取得魔法")
        || Object.prototype.hasOwnProperty.call(sampleCharacter, "スキル")
        || Object.prototype.hasOwnProperty.call(sampleCharacter, "耐性:技能値")
        || Object.prototype.hasOwnProperty.call(sampleCharacter, "弱点");
    console.log(`[mongo:excel] character-excluded-fields-present=${hasExcluded ? "true" : "false"}`);

    if (args.dryRun) {
        console.log("[mongo:excel] dry-run mode: skip mongodb write.");
        return;
    }

    await withMongoClient(async ({ db }) => {
        const characterResult = (targets.has("character") && hasCharacterSheet)
            ? await replaceCollectionWithDocs(db, "Character", characterDocs, { dryRun: args.dryRun })
            : null;
        const userResult = (targets.has("user") && hasUserSheet)
            ? await replaceCollectionWithDocs(db, "User", userDocs, { dryRun: args.dryRun })
            : null;
        const itemResult = (targets.has("itemlist") && hasItemSheet)
            ? await replaceCollectionWithDocs(db, "ItemList", itemDocs, { dryRun: args.dryRun })
            : null;
        const skillResult = (targets.has("skill") && hasSkillSheet)
            ? await replaceCollectionWithDocs(db, "Skill", skillDocs, { dryRun: args.dryRun })
            : null;

        console.log("[mongo:excel] summary:");
        if (characterResult) {
            console.log(`- Character deleted=${characterResult.deletedCount} inserted=${characterResult.insertedCount} dryRun=${characterResult.dryRun ? "true" : "false"}`);
        } else if (targets.has("character") && !hasCharacterSheet) {
            console.log("- Character skipped (sheet missing)");
        }
        if (userResult) {
            console.log(`- User deleted=${userResult.deletedCount} inserted=${userResult.insertedCount} dryRun=${userResult.dryRun ? "true" : "false"}`);
        } else if (targets.has("user") && !hasUserSheet) {
            console.log("- User skipped (sheet missing)");
        }
        if (itemResult) {
            console.log(`- ItemList deleted=${itemResult.deletedCount} inserted=${itemResult.insertedCount} dryRun=${itemResult.dryRun ? "true" : "false"}`);
        } else if (targets.has("itemlist") && !hasItemSheet) {
            console.log("- ItemList skipped (sheet missing)");
        }
        if (skillResult) {
            console.log(`- Skill deleted=${skillResult.deletedCount} inserted=${skillResult.insertedCount} dryRun=${skillResult.dryRun ? "true" : "false"}`);
        } else if (targets.has("skill") && !hasSkillSheet) {
            console.log("- Skill skipped (sheet missing)");
        }
    }, {
        dbName,
        uri
    });
}

main().catch((error) => {
    console.error("[mongo:excel] failed:", error?.message || error);
    process.exitCode = 1;
});
