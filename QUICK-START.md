# 🚀 Quick Start Guide

Get DocuMind AI running in 5 minutes!

---

## ⚡ Fast Setup

### 1. Install Dependencies

```bash
cd documind-ai
pnpm install
```

### 2. Create `.env.local`

```env
# Supabase Database
POSTGRES_URL="postgresql://user:password@host:5432/database"

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

# Google Gemini AI
GOOGLE_GENERATIVE_AI_API_KEY="your-api-key"

# Vercel Blob (File Storage)
BLOB_READ_WRITE_TOKEN="your-token"
```

### 3. Setup Database

```bash
pnpm db:generate
pnpm db:push
```

### 4. Run Development Server

```bash
pnpm dev
```

Visit **http://localhost:3000** 🎉

---

## 📋 Getting API Keys

### Supabase (Free)
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Copy database URL and API keys from Settings → API

### Google Gemini (Free tier available)
1. Go to [ai.google.dev](https://ai.google.dev)
2. Get API key from Google AI Studio
3. Copy to `.env.local`

### Vercel Blob (Free tier)
1. Install Vercel CLI: `pnpm i -g vercel`
2. Run: `vercel link`
3. Run: `vercel env pull`
4. Or manually add from Vercel dashboard → Storage

---

## ✅ Verification

After setup, test these features:

1. **Sign Up** - Create account at `/signup`
2. **Upload** - Upload a PDF at `/dashboard/upload`
3. **Analyze** - Ask questions about your document
4. **Workspace** - Create a workspace at `/workspaces`

---

## 🆘 Problems?

- **Database error?** Check POSTGRES_URL format
- **Auth fails?** Verify Supabase keys
- **Upload fails?** Check BLOB_TOKEN
- **AI fails?** Verify Gemini API key

See `APPLICATION-COMPLETE.md` for detailed troubleshooting.

---

## 📚 Next Steps

- Read `APPLICATION-COMPLETE.md` for full documentation
- Check `DASHBOARD-UPGRADE-COMPLETE.md` for UI details
- Deploy to Vercel for production use

---

**Happy Analyzing! 🎯**

