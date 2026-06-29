#!/usr/bin/env node
/**
 * Connect Railway enochlegal service to MongoDB Atlas and recover old posts.
 *
 * Usage:
 *   ATLAS_DB_PASSWORD='your-db-user-password' node scripts/link-atlas-railway.js
 *
 * Or:
 *   node scripts/link-atlas-railway.js 'your-db-user-password'
 */
const { MongoClient } = require('mongodb');
const { execSync } = require('child_process');

const ATLAS_USER = process.env.ATLAS_DB_USER || 'tayo112113';
const ATLAS_HOST = process.env.ATLAS_DB_HOST || 'cluster0.pakyqci.mongodb.net';
const ATLAS_OPTS = process.env.ATLAS_DB_OPTS || '?retryWrites=true&w=majority&appName=Cluster0';
const DB_CANDIDATES = ['enochlegal', 'test', 'sample_mflix'];

function encodePassword(pw) {
  return encodeURIComponent(pw);
}

function buildUri(password) {
  return `mongodb+srv://${ATLAS_USER}:${encodePassword(password)}@${ATLAS_HOST}/${ATLAS_OPTS.replace(/^\?/, '?')}`;
}

async function findPostsDatabase(client) {
  const admin = client.db().admin();
  const { databases } = await admin.listDatabases();
  const names = databases.map((d) => d.name).filter((n) => !['admin', 'local'].includes(n));

  for (const name of DB_CANDIDATES.concat(names.filter((n) => !DB_CANDIDATES.includes(n)))) {
    try {
      const count = await client.db(name).collection('posts').countDocuments();
      if (count > 0) {
        return { dbName: name, postCount: count };
      }
    } catch (e) { /* skip */ }
  }

  for (const name of DB_CANDIDATES) {
    try {
      const count = await client.db(name).collection('posts').countDocuments();
      return { dbName: name, postCount: count };
    } catch (e) { /* skip */ }
  }

  return { dbName: 'enochlegal', postCount: 0 };
}

async function main() {
  const password = process.env.ATLAS_DB_PASSWORD || process.argv[2];
  if (!password) {
    console.error('❌ Set ATLAS_DB_PASSWORD or pass the Atlas database user password as an argument.');
    process.exit(1);
  }

  const uri = buildUri(password);
  console.log('🔄 Testing Atlas connection…');

  const client = await MongoClient.connect(uri, { serverSelectionTimeoutMS: 15000 });
  try {
    const { dbName, postCount } = await findPostsDatabase(client);
    console.log(`✅ Connected. Database "${dbName}" has ${postCount} post(s).`);

    console.log('🔄 Updating Railway variables…');
    execSync(`railway variable set MONGODB_URI='${uri.replace(/'/g, "'\\''")}' MONGODB_DB_NAME='${dbName}' -s enochlegal`, {
      stdio: 'inherit',
      cwd: require('path').join(__dirname, '..')
    });

    console.log('🔄 Redeploying…');
    execSync('railway redeploy --yes -s enochlegal', {
      stdio: 'inherit',
      cwd: require('path').join(__dirname, '..')
    });

    console.log(`\n✅ Done. Railway now uses Atlas database "${dbName}" (${postCount} posts).`);
    console.log('   Check: https://enochlegal-production-64d2.up.railway.app/api/posts');
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('❌ Failed:', err.message);
  if (/bad auth|Authentication failed/i.test(err.message)) {
    console.error('   Wrong password. Atlas → Database Access → oyeleretayo070_db_user → Edit Password.');
  }
  if (/timed out|ENOTFOUND/i.test(err.message)) {
    console.error('   Atlas → Network Access → allow 0.0.0.0/0');
  }
  process.exit(1);
});
