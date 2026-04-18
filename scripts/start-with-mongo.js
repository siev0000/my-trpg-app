const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { withMongoClient } = require("../storage/mongo-client");

function parseArgs(argv = []) {
    const args = {
        mode: "start",
        skipPing: false,
        port: ""
    };
    for (let i = 0; i < argv.length; i += 1) {
        const token = String(argv[i] || "").trim();
        if (!token) continue;
        if (token === "--mode" && argv[i + 1]) {
            args.mode = String(argv[i + 1] || "").trim() || "start";
            i += 1;
            continue;
        }
        if (token === "--skip-ping") {
            args.skipPing = true;
            continue;
        }
        if (token === "--port" && argv[i + 1]) {
            args.port = String(argv[i + 1] || "").trim();
            i += 1;
            continue;
        }
    }
    return args;
}

function parseEnvFile(filePath) {
    if (!fs.existsSync(filePath)) return {};
    const raw = fs.readFileSync(filePath, "utf8");
    const entries = {};
    String(raw || "")
        .split(/\r?\n/g)
        .forEach((line) => {
            const text = String(line || "").trim();
            if (!text || text.startsWith("#")) return;
            const index = text.indexOf("=");
            if (index <= 0) return;
            const key = text.slice(0, index).trim();
            const value = text.slice(index + 1).trim();
            if (!key) return;
            entries[key] = value;
        });
    return entries;
}

function buildMongoEnv() {
    const localEnvPath = path.resolve(".env.mongodb.local");
    const localEnv = parseEnvFile(localEnvPath);
    const merged = {
        ...process.env,
        ...localEnv
    };
    merged.USE_MONGODB = "true";
    return merged;
}

function ensureMongoConfig(env) {
    const uri = String(env.MONGODB_URI || env.MONGO_URI || "").trim();
    const db = String(env.MONGODB_DB || "").trim();
    if (!uri) {
        throw new Error("MONGODB_URI is not set. Set env var or create .env.mongodb.local.");
    }
    if (!db) {
        env.MONGODB_DB = "my_trpg_app";
    }
}

function resolveServerPort(args = {}, mode = "start") {
    if (args?.port) return String(args.port);
    if (mode === "dev-api") return "3001";
    return String(process.env.PORT || "3000");
}

async function verifyMongo(env) {
    await withMongoClient(async ({ db }) => {
        await db.command({ ping: 1 });
    }, {
        uri: String(env.MONGODB_URI || env.MONGO_URI || "").trim(),
        dbName: String(env.MONGODB_DB || "").trim() || "my_trpg_app"
    });
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const env = buildMongoEnv();
    ensureMongoConfig(env);
    env.PORT = resolveServerPort(args, args.mode);

    console.log(`[start:mongo] mode=${args.mode} db=${env.MONGODB_DB} port=${env.PORT}`);

    if (!args.skipPing) {
        await verifyMongo(env);
        console.log("[start:mongo] mongo ping ok");
    }

    const child = spawn(process.execPath, ["server.js"], {
        stdio: "inherit",
        env
    });
    child.on("exit", (code) => {
        process.exit(typeof code === "number" ? code : 0);
    });
}

main().catch((error) => {
    console.error("[start:mongo] failed:", error?.message || error);
    process.exit(1);
});
