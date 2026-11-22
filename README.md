# SmartStudy - PHSS Pandallur 📚

Smart daily study and morning attendance tracker designed for **PHSS Pandallur**.

---

## 🚀 Quick Setup Guide

### 1. Database Setup (Supabase)

1. Go to [Supabase](https://supabase.com) and create a new project (e.g. `smartstudy-phss`).
2. Open the **SQL Editor** from the left sidebar.
3. Open or copy the script from [`smartstudy_database_init.sql`](./smartstudy_database_init.sql).
4. Paste it into the SQL Editor and click **Run**.
5. Go to **Project Settings** -> **API** and copy:
   - **Project URL**
   - **anon / public key**

### 2. Configure Environment Variables

Open [`.env.local`](./.env.local) and add your keys:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key
```

### 3. Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev
```

App will be live at `http://localhost:3000` or `http://localhost:5173`.

---

## 📱 Features

- **Attendance Check-in**: Daily presence logging (active from 3:00 AM onwards).
- **Sleep Schedule Guard**: Friendly reminder between 12:00 AM and 3:00 AM encouraging proper rest.
- **Dynamic Leaderboard**: Live rankings with medals (Champion, Gold, Silver, Bronze).
- **Streak & Points Engine**: Rewards consistency and motivation.
- **SSLC Exam Reminder**: Built-in countdown and motivational quotes.
- **Teacher/Admin Panel**: Export daily/monthly PDF reports, copy WhatsApp summaries, and manage student records (Default passcode: `tracker2026`).
