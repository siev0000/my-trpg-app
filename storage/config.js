const fs = require("fs");
const path = require("path");

function normalizeBool(value, fallback = false) {
    const text = String(value ?? "").trim().toLowerCase();
    if (!text) return fallback;
    if (["1", "true", "yes", "on"].includes(text)) return true;
    if (["0", "false", "no", "off"].includes(text)) return false;
    return fallback;
}

let cachedFileEnvMap = null;

function parseEnvFile(filePath) {
    if (!filePath || !fs.existsSync(filePath)) return {};
    const raw = fs.readFileSync(filePath, "utf8");
    const entries = {};
    String(raw || "")
        .split(/\r?\n/g)
        .forEach((line) => {
            const text = String(line || "").trim();
            if (!text || text.startsWith("#")) return;
            const eq = text.indexOf("=");
            if (eq <= 0) return;
            const key = text.slice(0, eq).trim();
            let value = text.slice(eq + 1).trim();
            if (!key) return;
            if (
                (value.startsWith('"') && value.endsWith('"'))
                || (value.startsWith("'") && value.endsWith("'"))
            ) {
                value = value.slice(1, -1);
            }
            entries[key] = value;
        });
    return entries;
}

function getFileEnvMap() {
    if (cachedFileEnvMap) return cachedFileEnvMap;
    const fileNames = [".env", ".env.local", ".env.mongodb.local"];
    const merged = {};
    fileNames.forEach((fileName) => {
        const filePath = path.resolve(process.cwd(), fileName);
        Object.assign(merged, parseEnvFile(filePath));
    });
    cachedFileEnvMap = merged;
    return cachedFileEnvMap;
}

function getConfigValue(key) {
    const processValue = process.env[key];
    if (processValue !== undefined && processValue !== null && String(processValue).trim() !== "") {
        return String(processValue);
    }
    const fileEnv = getFileEnvMap();
    const fileValue = fileEnv?.[key];
    if (fileValue === undefined || fileValue === null) return "";
    return String(fileValue);
}

function inferMongoDbNameFromUri(uri = "") {
    const raw = String(uri || "").trim();
    if (!raw) return "";

    try {
        const parsed = new URL(raw);
        const pathname = String(parsed.pathname || "").replace(/^\/+/, "").trim();
        if (!pathname) return "";
        const firstSegment = pathname.split("/")[0];
        return decodeURIComponent(String(firstSegment || "").trim());
    } catch (error) {
        const match = raw.match(/^[^/]+\/\/[^/]+\/([^?]+)/);
        if (!match || !match[1]) return "";
        const firstSegment = String(match[1]).split("/")[0];
        return decodeURIComponent(String(firstSegment || "").trim());
    }
}

function getAppDataRoot() {
    return path.resolve(
        process.env.APP_DATA_DIR
        || process.env.DATA_DIR
        || process.cwd()
    );
}

function getLogsDirPath() {
    return path.join(getAppDataRoot(), "logs");
}

function getMongoConfig() {
    const uri = String(getConfigValue("MONGODB_URI") || getConfigValue("MONGO_URI") || "").trim();
    const envDbName = String(getConfigValue("MONGODB_DB") || "").trim();
    const inferredDbName = inferMongoDbNameFromUri(uri);
    const dbName = envDbName || inferredDbName || "my_trpg_app";
    const enabled = normalizeBool(getConfigValue("USE_MONGODB"), Boolean(uri));
    return {
        enabled,
        uri,
        dbName
    };
}

module.exports = {
    getAppDataRoot,
    getLogsDirPath,
    getMongoConfig,
    normalizeBool,
    inferMongoDbNameFromUri
};
