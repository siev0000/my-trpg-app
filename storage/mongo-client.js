const { MongoClient } = require("mongodb");
const { getMongoConfig } = require("./config");

let sharedClient = null;
let sharedClientUri = "";
let sharedConnectPromise = null;

function assertMongoUri(uri) {
    if (!uri) {
        throw new Error("MONGODB_URI is not set.");
    }
}

async function getMongoClient(uri, options = {}) {
    assertMongoUri(uri);
    const normalizedUri = String(uri || "").trim();
    if (sharedClient && sharedClientUri === normalizedUri) {
        return sharedClient;
    }
    if (sharedConnectPromise && sharedClientUri === normalizedUri) {
        return sharedConnectPromise;
    }

    if (sharedClient && sharedClientUri && sharedClientUri !== normalizedUri) {
        try {
            await sharedClient.close();
        } catch (error) {
            // no-op
        }
        sharedClient = null;
    }

    const client = new MongoClient(normalizedUri, {
        serverSelectionTimeoutMS: Number(options?.serverSelectionTimeoutMS || 5000)
    });
    sharedClientUri = normalizedUri;
    sharedConnectPromise = client.connect()
        .then(() => {
            sharedClient = client;
            return client;
        })
        .catch((error) => {
            sharedClientUri = "";
            throw error;
        })
        .finally(() => {
            sharedConnectPromise = null;
        });
    return sharedConnectPromise;
}

async function withMongoClient(fn, options = {}) {
    const config = getMongoConfig();
    const uri = String(options?.uri || config.uri || "").trim();
    const dbName = String(options?.dbName || config.dbName || "").trim();
    const client = await getMongoClient(uri, options);
    const db = client.db(dbName);
    return await fn({ client, db, config: { ...config, uri, dbName } });
}

async function closeMongoClient() {
    if (!sharedClient) return;
    const client = sharedClient;
    sharedClient = null;
    sharedClientUri = "";
    sharedConnectPromise = null;
    await client.close();
}

module.exports = {
    withMongoClient,
    assertMongoUri,
    closeMongoClient
};
