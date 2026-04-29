// db/mongo.cjs
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is not set");

const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
});

let db; // シングルトン

async function initMongo() {
  if (db) return db;
  await client.connect();

  // URIが ...mongodb.net/<DB名>?... の形ならそこからDB名を取得
  // 付いていなければ MONGODB_DB or "game" を使う
  let dbName = "game";
  try {
    const u = new URL(uri);
    dbName = u.pathname.replace("/", "") || process.env.MONGODB_DB || "game";
  } catch (_) {
    dbName = process.env.MONGODB_DB || "game";
  }

  db = client.db(dbName);
  await db.command({ ping: 1 });
  console.log("[mongo] connected:", db.databaseName);
  return db;
}

function getDb() {
  if (!db) throw new Error("Mongo has not been initialized. Call initMongo() first.");
  return db;
}

module.exports = { initMongo, getDb, client, ObjectId };
