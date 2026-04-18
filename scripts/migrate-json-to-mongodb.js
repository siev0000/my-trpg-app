const fs = require("fs");
const path = require("path");
const { withMongoClient } = require("../storage/mongo-client");
const { getLogsDirPath, getMongoConfig } = require("../storage/config");

const APP_STATE_COLLECTION = "app_state";
const APP_LOG_COLLECTION = "app_logs";

function parseArgs(argv = []) {
    const args = {
        dryRun: false,
        logsDir: "",
        dbName: ""
    };

    for (let i = 0; i < argv.length; i += 1) {
        const token = String(argv[i] || "").trim();
        if (!token) continue;
        if (token === "--dry-run") {
            args.dryRun = true;
            continue;
        }
        if (token === "--logs-dir" && argv[i + 1]) {
            args.logsDir = String(argv[i + 1]);
            i += 1;
            continue;
        }
        if (token === "--db" && argv[i + 1]) {
            args.dbName = String(argv[i + 1]);
            i += 1;
            continue;
        }
    }

    return args;
}

function safeReadJson(filePath, fallbackValue) {
    if (!fs.existsSync(filePath)) return fallbackValue;
    const raw = fs.readFileSync(filePath, "utf8");
    if (!String(raw || "").trim()) return fallbackValue;
    return JSON.parse(raw);
}

function safeReadText(filePath, fallbackValue = "") {
    if (!fs.existsSync(filePath)) return fallbackValue;
    return fs.readFileSync(filePath, "utf8");
}

function getMtimeMs(filePath) {
    if (!fs.existsSync(filePath)) return null;
    try {
        return Number(fs.statSync(filePath).mtimeMs) || null;
    } catch (error) {
        return null;
    }
}

async function upsertAppState(db, key, payload, options = {}) {
    if (options?.dryRun) {
        return { matchedCount: 0, modifiedCount: 0, upsertedCount: 0, dryRun: true };
    }
    const now = new Date().toISOString();
    const result = await db.collection(APP_STATE_COLLECTION).updateOne(
        { _id: key },
        {
            $set: {
                payload,
                updatedAt: now,
                sourceType: "json"
            }
        },
        { upsert: true }
    );
    return {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        upsertedCount: result.upsertedCount || 0,
        dryRun: false
    };
}

async function upsertAppLog(db, key, text, metadata = {}, options = {}) {
    if (options?.dryRun) {
        return { matchedCount: 0, modifiedCount: 0, upsertedCount: 0, dryRun: true };
    }
    const now = new Date().toISOString();
    const result = await db.collection(APP_LOG_COLLECTION).updateOne(
        { _id: key },
        {
            $set: {
                text,
                metadata,
                updatedAt: now,
                sourceType: "text"
            }
        },
        { upsert: true }
    );
    return {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        upsertedCount: result.upsertedCount || 0,
        dryRun: false
    };
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const mongoConfig = getMongoConfig();
    const logsDir = path.resolve(args.logsDir || getLogsDirPath());
    const dbName = String(args.dbName || mongoConfig.dbName || "").trim() || "my_trpg_app";

    const battleMemoPath = path.join(logsDir, "battle-memo.json");
    const battleStatePath = path.join(logsDir, "battle-state.json");
    const characterProfilesPath = path.join(logsDir, "character-profiles.json");
    const skillSetPresetPath = path.join(logsDir, "skill-set-presets.json");
    const selectDataLogPath = path.join(logsDir, "select_dataLog.txt");

    const payloads = [
        {
            key: "battle-memo",
            value: safeReadJson(battleMemoPath, { version: 1, updatedAt: null, memos: {} }),
            sourcePath: battleMemoPath
        },
        {
            key: "battle-state",
            value: safeReadJson(battleStatePath, { version: 1, updatedAt: null, states: {} }),
            sourcePath: battleStatePath
        },
        {
            key: "character-profiles",
            value: safeReadJson(characterProfilesPath, { version: 1, updatedAt: null, profiles: {} }),
            sourcePath: characterProfilesPath
        },
        {
            key: "skill-set-presets",
            value: safeReadJson(skillSetPresetPath, { version: 1, updatedAt: null, presets: {} }),
            sourcePath: skillSetPresetPath
        }
    ];

    const selectDataLogText = safeReadText(selectDataLogPath, "");
    const selectDataLogMeta = {
        sourcePath: selectDataLogPath,
        mtimeMs: getMtimeMs(selectDataLogPath),
        length: selectDataLogText.length
    };

    console.log(`[mongo:migrate] logsDir=${logsDir}`);
    console.log(`[mongo:migrate] db=${dbName}`);
    console.log(`[mongo:migrate] dryRun=${args.dryRun ? "true" : "false"}`);

    const hasMongoUri = Boolean(String(process.env.MONGODB_URI || process.env.MONGO_URI || "").trim());
    if (args.dryRun && !hasMongoUri) {
        console.log("[mongo:migrate] dry-run only (no MONGODB_URI set).");
        payloads.forEach((item) => {
            const keys = Object.keys(item.value || {});
            console.log(`- ${item.key} source=${item.sourcePath} keys=${keys.length}`);
        });
        console.log(`- select_data_log source=${selectDataLogPath} length=${selectDataLogText.length}`);
        return;
    }

    await withMongoClient(async ({ db }) => {
        const summary = [];

        for (const item of payloads) {
            const result = await upsertAppState(db, item.key, item.value, { dryRun: args.dryRun });
            summary.push({
                key: item.key,
                sourcePath: item.sourcePath,
                ...result
            });
        }

        const logResult = await upsertAppLog(
            db,
            "select_data_log",
            selectDataLogText,
            selectDataLogMeta,
            { dryRun: args.dryRun }
        );
        summary.push({
            key: "select_data_log",
            sourcePath: selectDataLogPath,
            ...logResult
        });

        if (!args.dryRun) {
            await db.collection("storage_meta").updateOne(
                { _id: "json_migration" },
                {
                    $set: {
                        migratedAt: new Date().toISOString(),
                        logsDir,
                        files: summary.map((entry) => ({
                            key: entry.key,
                            sourcePath: entry.sourcePath
                        }))
                    }
                },
                { upsert: true }
            );
        }

        console.log("[mongo:migrate] summary:");
        summary.forEach((entry) => {
            console.log(
                `- ${entry.key} matched=${entry.matchedCount} modified=${entry.modifiedCount} upserted=${entry.upsertedCount} dryRun=${entry.dryRun ? "true" : "false"}`
            );
        });
    }, {
        dbName
    });
}

main().catch((error) => {
    console.error("[mongo:migrate] failed:", error?.message || error);
    process.exitCode = 1;
});
