const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_PATH = path.join(DATA_DIR, 'moderation.json');

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, JSON.stringify({ guilds: {} }, null, 2), 'utf8');
  }
}

function readStore() {
  ensureStore();
  const raw = fs.readFileSync(DATA_PATH, 'utf8');
  return JSON.parse(raw);
}

function writeStore(data) {
  ensureStore();
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function bumpCase(guildId, userId, type, metadata = {}) {
  const data = readStore();
  if (!data.guilds[guildId]) data.guilds[guildId] = { users: {} };
  if (!data.guilds[guildId].users[userId]) {
    data.guilds[guildId].users[userId] = {
      warnCount: 0,
      kickCount: 0,
      banCount: 0,
      history: []
    };
  }

  const userData = data.guilds[guildId].users[userId];
  const key = `${type}Count`;
  userData[key] += 1;

  const caseId = `${type[0]}${userData[key]}`; // w2 / k3 / b1 style IDs
  userData.history.push({
    ...metadata,
    type,
    caseId,
    at: new Date().toISOString()
  });

  writeStore(data);

  return {
    caseId,
    counts: {
      warns: userData.warnCount,
      kicks: userData.kickCount,
      bans: userData.banCount
    }
  };
}

module.exports = { bumpCase };
