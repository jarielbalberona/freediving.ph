import process from "node:process";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("[backfill-audit] DATABASE_URL is required");
  process.exit(1);
}

const sql = postgres(databaseUrl, { prepare: false });

try {
  const [eventsUnmatched, recordsUnmatched] = await Promise.all([
    sql`
      select count(*)::int as count
      from events
      where deleted_at is null
        and status <> 'REMOVED'
        and dive_spot_id is null;
    `,
    sql`
      select count(*)::int as count
      from competitive_records
      where dive_spot_id is null;
    `,
  ]);

  const lowConfidenceEvents = await sql`
    with candidate_matches as (
      select
        e.id as event_id,
        count(ds.id)::int as candidates
      from events e
      join dive_spots ds
        on ds.state = 'PUBLISHED'
       and ds.deleted_at is null
       and (
        e.location ilike '%' || ds.name || '%'
        or (ds.location_name is not null and e.location ilike '%' || ds.location_name || '%')
       )
      where e.deleted_at is null
        and e.status <> 'REMOVED'
        and e.dive_spot_id is null
      group by e.id
    )
    select event_id, candidates
    from candidate_matches
    where candidates > 1
    order by candidates desc, event_id asc
    limit 100;
  `;

  const lowConfidenceRecords = await sql`
    with candidate_matches as (
      select
        cr.id as record_id,
        count(ds.id)::int as candidates
      from competitive_records cr
      join dive_spots ds
        on ds.state = 'PUBLISHED'
       and ds.deleted_at is null
       and (
        cr.event_name ilike '%' || ds.name || '%'
        or (ds.location_name is not null and cr.event_name ilike '%' || ds.location_name || '%')
       )
      where cr.dive_spot_id is null
      group by cr.id
    )
    select record_id, candidates
    from candidate_matches
    where candidates > 1
    order by candidates desc, record_id asc
    limit 100;
  `;

  console.log(`[backfill-audit] events unmatched: ${eventsUnmatched[0]?.count ?? 0}`);
  console.log(`[backfill-audit] records unmatched: ${recordsUnmatched[0]?.count ?? 0}`);
  console.log(`[backfill-audit] low-confidence events (>1 candidate): ${lowConfidenceEvents.length}`);
  console.log(`[backfill-audit] low-confidence records (>1 candidate): ${lowConfidenceRecords.length}`);

  if (lowConfidenceEvents.length > 0) {
    console.log("\n[backfill-audit] sample low-confidence events");
    for (const row of lowConfidenceEvents) {
      console.log(`  - event_id=${row.event_id} candidates=${row.candidates}`);
    }
  }

  if (lowConfidenceRecords.length > 0) {
    console.log("\n[backfill-audit] sample low-confidence records");
    for (const row of lowConfidenceRecords) {
      console.log(`  - record_id=${row.record_id} candidates=${row.candidates}`);
    }
  }
} finally {
  await sql.end({ timeout: 1 });
}
