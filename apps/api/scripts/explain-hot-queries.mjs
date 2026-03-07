import process from "node:process";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("[explain-hot-queries] DATABASE_URL is required");
  process.exit(1);
}

const strict = process.argv.includes("--strict");
const sql = postgres(databaseUrl, { prepare: false });

const queries = [
  {
    id: "messages.listMessages",
    statement:
      "EXPLAIN (FORMAT TEXT) SELECT * FROM messages WHERE conversation_id = 1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 20 OFFSET 0;",
    disallowSeqScanOn: ["messages"],
  },
  {
    id: "threads.retrieveAll",
    statement:
      "EXPLAIN (FORMAT TEXT) SELECT * FROM threads WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 20 OFFSET 0;",
    disallowSeqScanOn: ["threads"],
  },
  {
    id: "comments.getByThread",
    statement:
      "EXPLAIN (FORMAT TEXT) SELECT * FROM comments WHERE thread_id = 1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 20 OFFSET 0;",
    disallowSeqScanOn: ["comments"],
  },
  {
    id: "reports.list",
    statement:
      "EXPLAIN (FORMAT TEXT) SELECT * FROM reports WHERE status = 'OPEN' ORDER BY created_at DESC LIMIT 20 OFFSET 0;",
    disallowSeqScanOn: ["reports"],
  },
  {
    id: "events.list",
    statement:
      "EXPLAIN (FORMAT TEXT) SELECT * FROM events WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 20 OFFSET 0;",
    disallowSeqScanOn: ["events"],
  },
];

try {
  let violations = 0;
  for (const query of queries) {
    const rows = await sql.unsafe(query.statement);
    const plan = rows.map((row) => row["QUERY PLAN"]).join("\n");
    console.log(`\n[${query.id}]`);
    console.log(plan);

    for (const table of query.disallowSeqScanOn) {
      if (plan.includes(`Seq Scan on ${table}`)) {
        const message = `[explain-hot-queries] Potential missing index: Seq Scan on ${table} (${query.id})`;
        if (strict) {
          console.error(message);
          violations += 1;
        } else {
          console.warn(message);
        }
      }
    }
  }

  if (strict && violations > 0) {
    process.exit(1);
  }
} finally {
  await sql.end({ timeout: 1 });
}
