// Restore posts + messages from ./backup/*.json into a MongoDB database.
// Safe to re-run: it upserts by `id` so nothing is duplicated.
// Usage:  MONGODB_URI="target-connection-string" node scripts/import-data.js
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('❌ Set MONGODB_URI first.'); process.exit(1); }

  const client = await MongoClient.connect(uri);
  const db = client.db();
  const dir = path.join(__dirname, '..', 'backup');

  for (const name of ['posts', 'messages']) {
    const file = path.join(dir, name + '.json');
    if (!fs.existsSync(file)) { console.log(`- skip ${name} (no backup file)`); continue; }
    const docs = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!docs.length) { console.log(`- ${name}: nothing to import`); continue; }

    const col = db.collection(name);
    let n = 0;
    for (const d of docs) {
      delete d._id; // let MongoDB manage _id; we match on the stable `id` field
      await col.updateOne({ id: d.id }, { $set: d }, { upsert: true });
      n++;
    }
    console.log(`✔ imported ${n} ${name}`);
  }

  await client.close();
  console.log('✅ Done');
})().catch(e => { console.error(e); process.exit(1); });
