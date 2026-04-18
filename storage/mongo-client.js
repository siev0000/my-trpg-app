const { MongoClient } = require("mongodb");
const { getMongoConfig } = require("./config");

function assertMongoUri(uri) {
    if (!uri) {
        throw new Error("MONGODB_URI is not set.");
    }
}

async function withMongoClient(fn, options = {}) {
    const config = getMongoConfig();
    const uri = String(options?.uri || config.uri || "").trim();
    const dbName = String(options?.dbName || config.dbName || "").trim();
    assertMongoUri(uri);

    const client = new MongoClient(uri, {
        serverSelectionTimeoutMS: Number(options?.serverSelectionTimeoutMS || 5000)
    });

    await client.connect();
    try {
        const db = client.db(dbName);
        return await fn({ client, db, config: { ...config, uri, dbName } });
    } finally {
        await client.close();
    }
}

module.exports = {
    withMongoClient,
    assertMongoUri
};

