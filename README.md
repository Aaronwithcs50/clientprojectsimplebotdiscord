# Discord.js v14 Slash Command Bot

A complete Discord bot using **Discord.js v14** that only uses Slash Commands (`/`) and includes:

- Moderation (`/kick`, `/ban`, `/warn`) with case tracking (`W1`, `W2`, etc.)
- Fully customizable event embed announcements (`/event`) + private event logs
- Staff hierarchy announcements (`/promote`, `/demote`)

## Features

## 1) Moderation Commands

### `/kick`
- Options:
  - `target` (required user)
  - `reason` (optional string)
- Permission lock: `Kick Members`
- Safety checks included:
  - Cannot kick server owner
  - Cannot kick administrators
  - Cannot kick self
  - Handles role hierarchy limits

### `/ban`
- Options:
  - `target` (required user)
  - `reason` (optional string)
- Permission lock: `Ban Members`
- Same safety checks as above + bannable check

### `/warn`
- Options:
  - `target` (required user)
  - `reason` (optional string)
- Permission lock: `Moderate Members`
- Stores warning history and increments case IDs (`W1`, `W2`, ...)

### Persistent moderation tracking
Moderation actions are saved in `data/moderation.json` per guild and user:
- warn count
- kick count
- ban count
- action history (who, when, reason, case id)

---

## 2) Event Announcement Command

### `/event`
Sends a modern, highly customizable embed to the current channel with options:
- `name` (required)
- `summary` (required)
- `details` (required)
- `host` (required)
- `role_ping` (optional)
- `voice_channel` (optional VC selector)
- `game_link` (optional)
- `event_number` (optional)
- `color` (optional hex)
- `thumbnail_url` (optional)
- `image_url` (optional)
- `footer` (optional)

### Event logging behavior
When `/event` is executed successfully:
1. The event embed is posted publicly to the current channel.
2. A private staff log embed is sent to `EVENT_LOG_CHANNEL_ID` containing:
   - staff member
   - timestamp
   - source channel
   - all event fields/details

A private ephemeral confirmation is sent to the command user.

---

## 3) Roster & Hierarchy Commands

### `/promote`
- Options:
  - `target` (user)
  - `old_rank` (string)
  - `new_rank` (string)
  - `reason` (string)
- Permission lock: `Administrator`
- Sends a polished public promotion embed.

### `/demote`
- Options:
  - `target` (user)
  - `new_rank` (string)
  - `reason` (string)
- Permission lock: `Administrator`
- Sends a polished public demotion embed.

---

## Setup

## 1. Requirements
- Node.js **18.17+**
- A Discord application + bot in the [Discord Developer Portal](https://discord.com/developers/applications)

## 2. Install dependencies
```bash
npm install
```

## 3. Configure `.env`
Copy the sample file and fill values:
```bash
cp .env.example .env
```

### `.env` variables
- `DISCORD_TOKEN` = your bot token
- `CLIENT_ID` = your bot application client ID
- `EVENT_LOG_CHANNEL_ID` = channel ID where hidden event logs are sent
- `GUILD_ID` = (optional, recommended for development) target guild for instant slash command registration
- `ACCENT_COLOR` = (optional) fallback `/event` embed color

## 4. Invite bot with proper permissions
At minimum, your bot role should have:
- View channels / Send messages / Embed links
- Kick members / Ban members / Moderate members (for mod commands)
- Manage events (for `/event` if you keep that permission lock)
- Administrator (or equivalent hierarchy) for promo/demotion scenarios

Also ensure bot role is **higher than target members** in role hierarchy.

## 5. Start bot
```bash
npm start
```

On startup, slash commands are auto-registered:
- If `GUILD_ID` is set: guild commands update immediately.
- If not set: global commands are used (can take up to ~1 hour to update).

---

## Project Structure

```text
.
├── .env.example
├── data/
│   └── moderation.json   # auto-generated
├── src/
│   ├── index.js          # bot entry + slash handlers
│   └── store.js          # moderation persistence helper
└── README.md
```

---

## Notes

- This bot is designed to use **only slash commands**.
- Basic error handling is included for permissions/hierarchy edge cases.
- If a warned user has DMs closed, the warning still succeeds.
