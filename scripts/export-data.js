// Back up posts + messages (+ visits) from MongoDB into ./backup/*.json
// Usage:  MONGODB_URI="your-connection-string" node scripts/export-data.js
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('❌ Set MONGODB_URI first.'); process.exit(1); }

  const client = await MongoClient.connect(uri);
  const db = client.db();
  const out = path.join(__dirname, '..', 'backup');
  fs.mkdirSync(out, { recursive: true });

  for (const name of ['posts', 'messages', 'visits']) {
    const docs = await db.collection(name).find().toArray();
    fs.writeFileSync(path.join(out, name + '.json'), JSON.stringify(docs, null, 2));
    console.log(`✔ exported ${docs.length} ${name}`);
  }

  await client.close();
  console.log('✅ Done → ./backup');
})().catch(e => { console.error(e); process.exit(1); });
