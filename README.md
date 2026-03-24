# EQS Event Scheduling — Next.js

A full-stack rewrite of the EQS Event Scheduling app. Migrated from Python/Streamlit + Excel to **Next.js 14 + SQLite (via Prisma) + NextAuth**.

---

## Tech Stack

| Layer      | Before (Python)       | After (Next.js)              |
|------------|-----------------------|------------------------------|
| Frontend   | Streamlit             | Next.js 14 + Tailwind CSS    |
| Backend    | Streamlit (single process) | Next.js API Routes      |
| Database   | Excel (.xlsx)         | SQLite via Prisma ORM        |
| Auth       | Custom SHA256 + session_state | NextAuth.js (JWT)  |
| Passwords  | Custom SHA256+salt    | bcrypt (auto-upgrades legacy)|
| Deployment | `streamlit run`       | `npm run build && npm start` |

---

## Quick Start (fresh install)

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local — set NEXTAUTH_SECRET (openssl rand -base64 32)

# 3. Create database + schema
npx prisma db push

# 4. Seed with default data
npm run db:seed

# 5. Run dev server
npm run dev
```

Open http://localhost:3000 — login with `sues@eqstrategist.com` / `Welcome123`

> **Change the password immediately** in Settings → Users & Roles → Reset Password.

---

## Migrating from Excel

If you have an existing `scheduling_recent.xlsx` file:

```bash
# 1. Complete Quick Start steps 1-3 above (skip seed)
# 2. Run migration
npm run migrate:excel ./scheduling_recent.xlsx
```

This migrates:
- Users (preserves legacy SHA256 passwords — users will be silently upgraded to bcrypt on first login)
- Trainers & Colors
- List items (Locations, Sources, Statuses, Mediums, Types)
- Rules, Defaults, Notifications
- All Events (including blocked/marked dates)
- Audit Log

The migration is safe to inspect before running — no data is deleted from your Excel file.

---

## Production Deployment

```bash
# Build
npm run build

# Start production server
npm start
```

### Environment Variables (production)

```env
DATABASE_URL="file:/path/to/your/production.db"
NEXTAUTH_SECRET="<strong-random-secret>"
NEXTAUTH_URL="https://yourdomain.com"
NODE_ENV="production"
```

### Database Backups (production)

SQLite is a single file. Set up a cron job to copy it:

```bash
# Example: daily backup to /backups
0 2 * * * cp /app/prisma/dev.db /backups/eqs_$(date +%Y%m%d).db
```

For cloud deployments, consider:
- **Fly.io**: Use persistent volumes + `flyctl volumes create`
- **Railway**: SQLite works fine with Railway's persistent disk
- **Vercel**: SQLite doesn't work on Vercel's serverless. Use **Turso** (SQLite-compatible, edge) or switch `DATABASE_URL` to a PostgreSQL connection string and update `schema.prisma` provider to `postgresql`.

---

## Project Structure

```
src/
├── app/
│   ├── login/              # Login + password reset
│   ├── dashboard/          # Role-based redirect
│   ├── admin/              # Admin-only pages
│   │   ├── new-event/      # Create events
│   │   ├── manage/         # Filter, edit, bulk ops, delete
│   │   ├── calendar/       # Calendar grid view
│   │   ├── mark-dates/     # Block dates
│   │   └── settings/       # Users, trainers, lists, rules, backups
│   ├── trainer/            # Trainer view (own events only)
│   ├── viewer/             # Read-only view
│   └── api/                # All API routes
├── components/
│   ├── layout/AppShell.tsx # Sidebar navigation
│   ├── calendar/           # CalendarGrid, DayDetailsPanel
│   └── ui/                 # Button, Input, Select, Modal, Badge...
├── lib/
│   ├── db.ts               # Prisma singleton
│   ├── auth.ts             # NextAuth config
│   ├── security.ts         # bcrypt + legacy SHA256 compat
│   ├── utils.ts            # Title generation, validation, date utils
│   └── settings.ts         # loadSettings(), isDateBlocked(), audit
└── types/                  # TypeScript types

scripts/
├── seed.ts                 # Initial data seed
└── migrate-from-excel.ts   # One-time Excel → SQLite migration
```

---

## User Roles

| Role        | Can do                                                |
|-------------|-------------------------------------------------------|
| `admin`     | Everything: create/edit/delete events, manage users, settings |
| `trainer`   | View own events only (calendar + list)                |
| `view_only` | View all events (read-only)                           |

---

## Useful Commands

```bash
npm run dev              # Dev server with hot reload
npm run build            # Production build
npm run db:studio        # Open Prisma Studio (DB GUI)
npm run db:push          # Apply schema changes to DB
npm run db:migrate       # Create a named migration file
npm run db:seed          # Seed default data
npm run migrate:excel    # Migrate from Excel
```
# scheduler
# scheduler
