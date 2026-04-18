const { withMongoClient } = require("../storage/mongo-client");

async function main() {
    const startedAtMs = Date.now();
    const result = await withMongoClient(async ({ db, config }) => {
        await db.command({ ping: 1 });
        return {
            dbName: config.dbName
        };
    });

    const elapsedMs = Date.now() - startedAtMs;
    console.log(`[mongo] ping ok db=${result.dbName} elapsedMs=${elapsedMs}`);
}

main().catch((error) => {
    console.error("[mongo] ping failed:", error?.message || error);
    process.exitCode = 1;
});

