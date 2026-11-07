const dns = require('dns');
const mongoose = require('mongoose');

/**
 * Global cache for Mongoose connection across serverless invocations (Vercel)
 * and long-running local Express instances.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null, memoryServer: null, dnsChecked: false };
}

const FALLBACK_DNS_SERVERS = ['8.8.8.8', '1.1.1.1', '8.8.4.4'];
const DNS_FAILURE_CODES = ['ECONNREFUSED', 'ETIMEOUT', 'ESERVFAIL', 'ECONNRESET', 'EREFUSED', 'ENOTFOUND'];

/**
 * mongodb+srv:// URIs require a DNS SRV lookup before the driver can connect.
 * On some Windows machines (VPNs, DNS filters, stale adapter configs) Node's resolver
 * points at an unreachable server such as 127.0.0.1, which produces
 * "querySrv ECONNREFUSED" even though the OS itself resolves the record fine.
 * This probes the SRV record and, if the system resolver fails, switches Node's
 * resolver to working public DNS servers (override with the DNS_SERVERS env var).
 */
async function ensureSrvResolvable(uri) {
  if (cached.dnsChecked || !uri.startsWith('mongodb+srv://')) return;

  const hostMatch = uri.match(/^mongodb\+srv:\/\/(?:[^@/]*@)?([^/?]+)/);
  if (!hostMatch) return;
  const srvRecord = `_mongodb._tcp.${hostMatch[1]}`;

  try {
    await dns.promises.resolveSrv(srvRecord);
    cached.dnsChecked = true;
    return;
  } catch (err) {
    if (!DNS_FAILURE_CODES.includes(err.code)) throw err;

    const fallback = process.env.DNS_SERVERS
      ? process.env.DNS_SERVERS.split(',').map((s) => s.trim()).filter(Boolean)
      : FALLBACK_DNS_SERVERS;

    console.warn(
      `[Database] System DNS (${dns.getServers().join(', ')}) failed SRV lookup with ${err.code}. ` +
        `Retrying with DNS servers: ${fallback.join(', ')}`
    );
    dns.setServers(fallback);

    await dns.promises.resolveSrv(srvRecord);
    console.log('[Database] SRV record resolved via fallback DNS servers.');
    cached.dnsChecked = true;
  }
}

async function startInMemoryFallback() {
  console.warn('\n================================================================');
  console.warn('  [Database] Local MongoDB is not running on port 27017.');
  console.warn('  [Database] Starting a persistent embedded MongoDB instead...');
  console.warn('================================================================');

  const fs = require('fs');
  const path = require('path');
  // Module name kept in a variable so serverless bundlers do not trace this dev-only dependency.
  const memoryServerModule = 'mongodb-memory-server';
  const { MongoMemoryServer } = require(memoryServerModule);

  const dbPath = path.join(__dirname, '..', '..', '.data', 'mongo');
  fs.mkdirSync(dbPath, { recursive: true });

  cached.memoryServer = await MongoMemoryServer.create({
    instance: { dbPath, storageEngine: 'wiredTiger' },
  });
  const memoryUri = cached.memoryServer.getUri();
  const instance = await mongoose.connect(`${memoryUri}conceptcards`);

  console.log(`  [Database] Embedded MongoDB running at ${memoryUri} (data saved in .data/mongo)`);
  console.log('================================================================\n');
  return instance;
}

async function maybeAutoSeed() {
  const env = process.env.NODE_ENV;
  if (env === 'production' || env === 'test') return;
  const autoSeedIfEmpty = require('./autoSeed');
  await autoSeedIfEmpty();
}

async function connectDB() {
  const uri = (process.env.MONGODB_URI || 'mongodb://localhost:27017/conceptcards').trim();

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const isLocalUri = uri.includes('localhost') || uri.includes('127.0.0.1');

    cached.promise = (async () => {
      try {
        await ensureSrvResolvable(uri);

        // Atlas strings copied from the dashboard often omit the database name
        // (".../?retryWrites=true"), which makes the driver use a database called "test".
        const hasDbName = /^mongodb(?:\+srv)?:\/\/[^/]+\/[^/?]+/.test(uri);
        const mongooseInstance = await mongoose.connect(uri, {
          bufferCommands: false,
          maxPoolSize: 10,
          serverSelectionTimeoutMS: isLocalUri ? 2500 : 10000,
          ...(hasDbName ? {} : { dbName: process.env.MONGODB_DB_NAME || 'conceptcards' }),
        });
        console.log(`[Database] MongoDB connected successfully to: ${mongooseInstance.connection.host}`);
        await maybeAutoSeed();
        return mongooseInstance;
      } catch (err) {
        const canFallBack = isLocalUri && process.env.NODE_ENV !== 'production';

        if (canFallBack) {
          try {
            const instance = await startInMemoryFallback();
            await maybeAutoSeed();
            return instance;
          } catch (memErr) {
            console.error('[Database] Embedded MongoDB fallback failed:', memErr.message);
            throw err;
          }
        }

        if (err.message && err.message.includes('querySrv')) {
          console.error(
            '[Database] SRV DNS lookup failed. Set DNS_SERVERS=8.8.8.8,1.1.1.1 in .env, or use the ' +
              'standard (non-SRV) connection string from Atlas: Connect > Drivers > older driver version.'
          );
        } else if (err.name === 'MongoServerSelectionError') {
          console.error(
            '[Database] Could not reach the cluster. In MongoDB Atlas, open Network Access and add your ' +
              'current IP address (or 0.0.0.0/0 for development).'
          );
        } else if (err.message && /auth/i.test(err.message)) {
          console.error(
            '[Database] Authentication failed. Check the database username/password in MONGODB_URI ' +
              '(URL-encode special characters such as @ : / ? # in the password).'
          );
        }

        console.error('[Database] MongoDB connection error:', err.message);
        throw err;
      }
    })();
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

module.exports = connectDB;
