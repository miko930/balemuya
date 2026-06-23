# 🔧 FikirFix Bot

> Telegram-based home repair booking for Addis Ababa — fully in Amharic.

---

## Project Structure

```
fikir-fix-bot/
├── src/
│   ├── bot/
│   │   ├── customerBot.js      ← Customer-facing bot (@FikirFixBot)
│   │   └── workerBot.js        ← Worker-facing bot (@FikirFixWorkerBot)
│   ├── handlers/
│   │   ├── booking.js          ← Full booking conversation flow
│   │   ├── customer.js         ← Status, history, cancel, rating
│   │   ├── worker.js           ← Accept/skip/arrive/complete job
│   │   └── workerNotify.js     ← Broadcasts new jobs to workers
│   ├── db/
│   │   ├── client.js           ← Prisma singleton
│   │   └── seed.js             ← Register your 10 trusted workers
│   ├── utils/
│   │   └── amharic.js          ← ALL Amharic UI strings (single source)
│   └── index.js                ← Entry point (starts both bots)
├── prisma/
│   └── schema.prisma           ← Database schema
├── .env.example
└── README.md
```

---

## Setup (ደረጃ በደረጃ)

### 1. ቦቱ ፍጠር (Create Bots)

Open Telegram → message **@BotFather**:

```
/newbot
Name: FikirFix
Username: FikirFixBot    (or any available name)

/newbot
Name: FikirFix Worker
Username: FikirFixWorkerBot
```

Copy both tokens.

---

### 2. .env ፍጠር

```bash
cp .env.example .env
```

Fill in `.env`:

```env
BOT_TOKEN=7xxxxxxxxxx:AAF...        # Customer bot token
WORKER_BOT_TOKEN=7xxxxxxxxxx:AAG... # Worker bot token
DATABASE_URL=postgresql://user:pass@localhost:5432/fikir_fix
ADMIN_TELEGRAM_ID=123456789         # Your personal Telegram ID
```

To find your Telegram ID: message **@userinfobot** on Telegram.

---

### 3. Database ፍጠር

```bash
# Install dependencies
npm install

# Create tables
npm run db:push
```

---

### 4. 10 ሠራተኞችን ምዝገባ (Register 10 workers)

Ask each worker to message **@userinfobot** and send you their numeric ID.

Edit `src/db/seed.js` — replace the fake `telegramId` values with real ones:

```js
{ telegramId: "123456789", firstName: "አበበ", phone: "+251911...", ... },
```

Then run:

```bash
npm run seed
```

---

### 5. ቦቱ አስነሳ (Start the bots)

```bash
npm start
```

Both bots run simultaneously. Test by messaging your customer bot.

---

## Customer Flow (ደንበኛ)

```
/start
  → ምን ዓይነት አገልግሎት ይፈልጋሉ? [6 buttons]
  → ስለ ሥራው ይግለጹ (text / photo / voice)
  → አድራሻ ላኩ (GPS or text)
  → መቼ? [አሁኑኑ / ዛሬ / ቀን ምረጡ]
  → ማረጋገጫ + ዋጋ ግምት
  → ✅ ትዕዛዝ ተቀበልን!
  → ⭐ ሥራ ሲጠናቀቅ — ባለሙያ ይምዘኑ
```

---

## Worker Flow (ሠራተኛ)

```
New job arrives → 🔔 ማንቂያ ይደርሳል
  → [✅ ተቀበለ] or [⏭ ዝለል]
  → ✅ ተቀበለ → ደንበኛ ቁጥር ይታያል
  → [📍 ደረስኩ] → ደንበኛ ይነገራቸዋል
  → [✅ ሥራ ጨረስኩ] → ዋጋ ያስገባሉ
  → ✅ ደንበኛ ይከፍላሉ / ያመሰግናሉ
```

---

## Commands

### Customer Bot
| Command | Description |
|---|---|
| `/start` | Welcome + service menu |
| `/book` | New booking |
| `/status` | Active job status |
| `/history` | Past bookings |
| `/cancel` | Cancel pending job |
| `/help` | Help |

### Worker Bot
| Command | Description |
|---|---|
| `/start` | Worker welcome |
| `/available` | Toggle online/offline |
| `/myjobs` | Job count + rating |
| `/help` | Help |

---

## Amharic Strings

All UI text lives in **one file**: `src/utils/amharic.js`

To change any message, edit only that file. Nothing else.

---

## Deployment (Hahu Cloud / Railway)

```bash
# Railway (recommended for quick deploy)
railway login
railway init
railway up

# Or any VPS:
git clone <your-repo>
npm install
npm run db:push
npm run seed
npm start
```

Use **PM2** to keep it alive:

```bash
npm install -g pm2
pm2 start src/index.js --name fikir-fix
pm2 save
```

---

## Next Steps

- [ ] Chapa payment integration (`/pay` command)
- [ ] Admin dashboard (Next.js) for managing jobs and disputes
- [ ] Telegram Mini App for booking history
- [ ] Auto-matching by worker location (Google Maps Distance API)
- [ ] Worker earnings dashboard
