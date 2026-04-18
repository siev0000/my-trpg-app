const path = require("path");

function normalizeBool(value, fallback = false) {
    const text = String(value ?? "").trim().toLowerCase();
    if (!text) return fallback;
    if (["1", "true", "yes", "on"].includes(text)) return true;
    if (["0", "false", "no", "off"].includes(text)) return false;
    return fallback;
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
    const uri = String(process.env.MONGODB_URI || process.env.MONGO_URI || "").trim();
    const dbName = String(process.env.MONGODB_DB || "my_trpg_app").trim() || "my_trpg_app";
    const enabled = normalizeBool(process.env.USE_MONGODB, false);
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
    normalizeBool
};

