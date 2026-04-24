const path = require("path");
const XLSX = require("xlsx");
const { withMongoClient, closeMongoClient } = require("../storage/mongo-client");
const { getMongoConfig } = require("../storage/config");

const DEFAULT_SHEET_NAME = "キャラの魔法";
const ATTRIBUTE_KEYS = ["属性1", "属性2", "属性3", "属性4", "属性5", "属性6", "属性7"];

function normalizeText(value) {
    return String(value ?? "").trim();
}

function parseArgs(argv = []) {
    const args = {
        file: "data.xlsx",
        sheet: DEFAULT_SHEET_NAME,
        dryRun: false
    };

    for (let i = 0; i < argv.length; i += 1) {
        const token = normalizeText(argv[i]);
        if (!token) continue;
        if (token === "--dry-run") {
            args.dryRun = true;
            continue;
        }
        if (token === "--file" && argv[i + 1]) {
            args.file = normalizeText(argv[i + 1]);
            i += 1;
            continue;
        }
        if (token === "--sheet" && argv[i + 1]) {
            args.sheet = normalizeText(argv[i + 1]);
            i += 1;
            continue;
        }
    }

    return args;
}

function findHeaderRowIndex(rows = []) {
    const source = Array.isArray(rows) ? rows : [];
    for (let rowIndex = 0; rowIndex < source.length; rowIndex += 1) {
        const row = Array.isArray(source[rowIndex]) ? source[rowIndex] : [];
        const set = new Set(row.map((value) => normalizeText(value)));
        const hasAll = ATTRIBUTE_KEYS.every((key) => set.has(key));
        if (hasAll) return rowIndex;
    }
    return -1;
}

function resolveAttributeColumnIndices(headerRow = []) {
    const row = Array.isArray(headerRow) ? headerRow : [];
    const indexMap = {};
    ATTRIBUTE_KEYS.forEach((key) => {
        const index = row.findIndex((value) => normalizeText(value) === key);
        if (index >= 0) indexMap[key] = index;
    });
    return indexMap;
}

function resolveNameColumnIndex(rows = [], headerRowIndex = -1, attr1ColumnIndex = -1) {
    const source = Array.isArray(rows) ? rows : [];
    if (headerRowIndex < 0 || attr1ColumnIndex <= 0) return 0;
    const headerRow = Array.isArray(source[headerRowIndex]) ? source[headerRowIndex] : [];

    const preferredHeaderNames = ["名前", "キャラ名", "キャラクター名", "名称"];
    for (const headerName of preferredHeaderNames) {
        const index = headerRow.findIndex((value) => normalizeText(value) === headerName);
        if (index >= 0) return index;
    }

    let bestIndex = 0;
    let bestScore = -1;
    for (let columnIndex = 0; columnIndex < attr1ColumnIndex; columnIndex += 1) {
        let score = 0;
        for (let rowIndex = headerRowIndex + 1; rowIndex < source.length; rowIndex += 1) {
            const row = Array.isArray(source[rowIndex]) ? source[rowIndex] : [];
            const value = normalizeText(row[columnIndex]);
            if (!value) continue;
            score += 1;
        }
        if (score > bestScore) {
            bestScore = score;
            bestIndex = columnIndex;
        }
    }

    return bestIndex;
}

function parseMagicAttributeRows(rows = []) {
    const source = Array.isArray(rows) ? rows : [];
    const headerRowIndex = findHeaderRowIndex(source);
    if (headerRowIndex < 0) {
        throw new Error(`header row not found: ${ATTRIBUTE_KEYS.join(", ")}`);
    }

    const headerRow = Array.isArray(source[headerRowIndex]) ? source[headerRowIndex] : [];
    const attrColumnIndexMap = resolveAttributeColumnIndices(headerRow);
    const missingAttrColumns = ATTRIBUTE_KEYS.filter((key) => !Number.isInteger(attrColumnIndexMap[key]));
    if (missingAttrColumns.length > 0) {
        throw new Error(`attribute columns not found: ${missingAttrColumns.join(", ")}`);
    }

    const nameColumnIndex = resolveNameColumnIndex(
        source,
        headerRowIndex,
        attrColumnIndexMap["属性1"]
    );

    const result = [];
    const seen = new Set();
    for (let rowIndex = headerRowIndex + 1; rowIndex < source.length; rowIndex += 1) {
        const row = Array.isArray(source[rowIndex]) ? source[rowIndex] : [];
        const name = normalizeText(row[nameColumnIndex]);
        if (!name) continue;
        if (seen.has(name)) continue;
        seen.add(name);

        const attributes = ATTRIBUTE_KEYS.map((key) => {
            const columnIndex = attrColumnIndexMap[key];
            const value = normalizeText(row[columnIndex]);
            if (!value || value === "0") return "";
            return value;
        });

        result.push({
            name,
            attributes
        });
    }

    return {
        headerRowIndex,
        nameColumnIndex,
        count: result.length,
        rows: result
    };
}

function readMagicSheet(filePath, sheetName) {
    const workbook = XLSX.readFile(filePath, {
        cellDates: false,
        raw: false
    });
    const resolvedSheetName = normalizeText(sheetName) || DEFAULT_SHEET_NAME;
    const worksheet = workbook.Sheets[resolvedSheetName];
    if (!worksheet) {
        throw new Error(`sheet not found: ${resolvedSheetName}`);
    }

    const rows = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: "",
        raw: false
    });
    return parseMagicAttributeRows(rows);
}

async function syncToMongo(parsedRows, options = {}) {
    const dryRun = Boolean(options?.dryRun);
    const sourceRows = Array.isArray(parsedRows) ? parsedRows : [];
    const summary = {
        sheetRows: sourceRows.length,
        matchedRowCount: 0,
        matchedCharacterCount: 0,
        updateCount: 0,
        skippedCount: 0,
        skippedNames: [],
        matchedNames: []
    };

    await withMongoClient(async ({ db, config }) => {
        const collection = db.collection("Character");
        const existingCharacters = await collection.find(
            {},
            { projection: { _id: 1, 名前: 1 } }
        ).toArray();

        const nameToIdsMap = new Map();
        const pushMapping = (key, id) => {
            const normalizedKey = normalizeText(key);
            const normalizedId = normalizeText(id);
            if (!normalizedKey || !normalizedId) return;
            const current = nameToIdsMap.get(normalizedKey) || new Set();
            current.add(normalizedId);
            nameToIdsMap.set(normalizedKey, current);
        };
        existingCharacters.forEach((row) => {
            const id = normalizeText(row?._id);
            const name = normalizeText(row?.名前);
            pushMapping(id, id);
            pushMapping(name, id || name);
        });

        const operations = [];
        sourceRows.forEach((entry) => {
            const name = normalizeText(entry?.name);
            if (!name) return;
            const targetIdSet = nameToIdsMap.get(name);
            const targetIds = targetIdSet ? Array.from(targetIdSet) : [];
            if (targetIds.length <= 0) {
                summary.skippedCount += 1;
                summary.skippedNames.push(name);
                return;
            }

            const attrs = Array.isArray(entry?.attributes) ? entry.attributes : [];
            const setDoc = {
                属性1: normalizeText(attrs[0]),
                属性2: normalizeText(attrs[1]),
                属性3: normalizeText(attrs[2]),
                属性4: normalizeText(attrs[3]),
                属性5: normalizeText(attrs[4]),
                属性6: normalizeText(attrs[5]),
                属性7: normalizeText(attrs[6])
            };

            summary.matchedRowCount += 1;
            summary.matchedCharacterCount += targetIds.length;
            summary.matchedNames.push(name);
            targetIds.forEach((targetId) => {
                operations.push({
                    updateOne: {
                        filter: { _id: targetId },
                        update: { $set: setDoc }
                    }
                });
            });
        });

        if (!dryRun && operations.length > 0) {
            const result = await collection.bulkWrite(operations, { ordered: false });
            summary.updateCount = Number(result?.modifiedCount || 0);
        } else {
            summary.updateCount = operations.length;
        }

        console.log(`[mongo:sync-magic-attrs] db=${config.dbName} dryRun=${dryRun ? "true" : "false"}`);
    });

    return summary;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const mongoConfig = getMongoConfig();
    const filePath = path.resolve(process.cwd(), args.file);
    const sheetName = normalizeText(args.sheet) || DEFAULT_SHEET_NAME;

    const parsed = readMagicSheet(filePath, sheetName);
    console.log(`[mongo:sync-magic-attrs] file=${filePath}`);
    console.log(`[mongo:sync-magic-attrs] sheet=${sheetName}`);
    console.log(
        `[mongo:sync-magic-attrs] parsedRows=${parsed.count} headerRow=${parsed.headerRowIndex + 1} nameColumn=${parsed.nameColumnIndex + 1}`
    );
    console.log(
        `[mongo:sync-magic-attrs] mongoEnabled=${mongoConfig.enabled ? "true" : "false"} db=${mongoConfig.dbName}`
    );

    const summary = await syncToMongo(parsed.rows, { dryRun: args.dryRun });
    console.log(
        `[mongo:sync-magic-attrs] matched=${summary.matchedCharacterCount} updated=${summary.updateCount} skipped=${summary.skippedCount}`
    );
    if (summary.skippedNames.length > 0) {
        const previewLimit = 20;
        const preview = summary.skippedNames.slice(0, previewLimit);
        const hiddenCount = Math.max(0, summary.skippedNames.length - preview.length);
        const suffix = hiddenCount > 0 ? ` ... (+${hiddenCount})` : "";
        console.log(`[mongo:sync-magic-attrs] skipped names: ${preview.join(", ")}${suffix}`);
    }
}

main()
    .catch((error) => {
        console.error("[mongo:sync-magic-attrs] failed:", error?.message || error);
        process.exitCode = 1;
    })
    .finally(async () => {
        try {
            await closeMongoClient();
        } catch (error) {
            // no-op
        }
    });
