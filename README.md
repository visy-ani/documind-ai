# 🤖 DocuMind AI

> Intelligent Document Analysis and Collaboration Platform powered by Google Gemini 2.5 Pro

[![Next.js](https://img.shields.io/badge/Next.js-16.0-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.18-2D3748)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC)](https://tailwindcss.com/)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-success)](/)

---

## 🎯 Overview

DocuMind AI transforms static documents into living, queryable knowledge assets. Upload PDFs, Word docs, or Excel files and leverage AI to extract insights, answer questions, and collaborate with your team in real-time.

### ✨ Key Features

- **🔐 Secure Authentication** - Email/Password + Google OAuth
- **📄 Document Management** - Upload, organize, and analyze documents
- **🤖 AI-Powered Analysis** - Ask questions, get summaries, extract entities
- **👥 Team Collaboration** - Shared workspaces with role-based access
- **📱 Fully Responsive** - Works perfectly on mobile, tablet, and desktop
- **🎨 Modern UI** - Beautiful, intuitive interface with smooth animations
- **🌗 Dark Mode** - Full theme support
- **⚡ Fast & Scalable** - Built for performance

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- pnpm (or npm/yarn)
- PostgreSQL database (Supabase recommended)
- Google Gemini API key
- Vercel Blob token

### Installation

```bash
# Clone and install
cd documind-ai
pnpm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local with your keys

# Setup database
pnpm db:generate
pnpm db:push

# Run development server
pnpm dev
```

Visit **http://localhost:3000** 🎉

📖 **Full Setup Guide:** See [QUICK-START.md](./QUICK-START.md)

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [QUICK-START.md](./QUICK-START.md) | 5-minute setup guide |
| [APPLICATION-COMPLETE.md](./APPLICATION-COMPLETE.md) | Complete feature documentation |
| [DASHBOARD-UPGRADE-COMPLETE.md](./DASHBOARD-UPGRADE-COMPLETE.md) | Dashboard UI/UX details |
| [IMPLEMENTATION-SUMMARY.md](./IMPLEMENTATION-SUMMARY.md) | Technical implementation details |

---

## 🎨 Screenshots

### Dashboard
Modern, responsive dashboard with real-time stats and activity feed

### Document Analysis
AI-powered document querying with history tracking

### Workspaces
Team collaboration with role-based access control

*(Screenshots can be added here)*

---

## 🏗️ Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **shadcn/ui** - Beautiful UI components

### Backend
- **Next.js API Routes** - Serverless API
- **Prisma ORM** - Type-safe database access
- **Supabase** - Authentication + PostgreSQL
- **Vercel Blob** - File storage

### AI & Processing
- **Google Gemini 2.5 Pro** - AI analysis
- **PDF/DOCX/XLSX parsing** - Text extraction
- **Rate limiting** - Abuse prevention

---

## 📊 Features

### ✅ Authentication & User Management
- Email/Password signup and login
- Google OAuth integration
- Password reset flow
- Session management
- User profiles and settings

### ✅ Document Management
- Upload PDF, DOCX, XLSX files (up to 10MB)
- Automatic text extraction
- Document organization with tags
- Search and filter documents
- Delete and download documents

### ✅ AI-Powered Analysis
- Ask questions about documents
- Generate summaries
- Extract key points and entities
- Query history tracking
- Quick action templates
- Rate limiting (10 queries/minute)

### ✅ Workspace Collaboration
- Create multiple workspaces
- Invite team members
- Role-based access (Admin, Editor, Viewer)
- Shared document access
- Member management

### ✅ Dashboard
- Real-time statistics
- Recent documents overview
- AI activity feed
- Workspace carousel
- Smart onboarding widget
- Empty states

### ✅ Mobile Responsive
- Mobile-first design
- Adaptive sidebar (drawer on mobile)
- Touch-friendly interactions
- Optimized for all screen sizes

---

## 🔧 Configuration

### Environment Variables

```env
# Database (Supabase)
POSTGRES_URL="postgresql://..."

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."

# Google Gemini AI
GOOGLE_GENERATIVE_AI_API_KEY="..."

# Vercel Blob (File Storage)
BLOB_READ_WRITE_TOKEN="..."
```

📖 **Full Configuration:** See [APPLICATION-COMPLETE.md](./APPLICATION-COMPLETE.md#configuration-details)

---

## 📦 Project Structure

```
documind-ai/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages (login, signup)
│   ├── (dashboard)/       # Main app (dashboard, documents, workspaces)
│   └── api/               # API routes
├── components/            # React components
│   ├── auth/             # Auth components
│   ├── dashboard/        # Dashboard components
│   └── ui/               # UI primitives
├── lib/                  # Utilities
│   ├── ai/              # AI utilities
│   ├── prisma/          # Database client
│   └── supabase/        # Auth client
└── prisma/              # Database schema
```

---

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. Push code to GitHub
2. Import project to Vercel
3. Add environment variables
4. Deploy!

📖 **Full Deployment Guide:** See [APPLICATION-COMPLETE.md](./APPLICATION-COMPLETE.md#deployment)

---

## 🧪 Development

### Available Scripts

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm start            # Start production server
pnpm lint             # Run linter

# Database
pnpm db:generate      # Generate Prisma client
pnpm db:push          # Push schema to database
pnpm db:migrate       # Run migrations
pnpm db:studio        # Open Prisma Studio
```

---

## 🔐 Security

- ✅ JWT-based authentication
- ✅ Row-level security ready
- ✅ Rate limiting on AI queries
- ✅ Input validation and sanitization
- ✅ Secure file uploads
- ✅ Environment variable protection
- ✅ SQL injection protection (Prisma)

---

## ♿ Accessibility

- ✅ WCAG AA compliant
- ✅ Keyboard navigation
- ✅ Screen reader support
- ✅ Focus indicators
- ✅ Semantic HTML
- ✅ ARIA labels

---

## 📈 Performance

- ✅ Server-side rendering
- ✅ Automatic code splitting
- ✅ Image optimization
- ✅ Database indexing
- ✅ API response caching
- ✅ Lazy loading

---

## 🤝 Contributing

This is a private project. For questions or support, please contact the development team.

---

## 📄 License

This project is private and proprietary. All rights reserved.

---

## 🎓 Learning Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Google Gemini API](https://ai.google.dev/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

## 📞 Support

For issues or questions:
1. Check the documentation
2. Review troubleshooting section
3. Verify environment variables
4. Check API key validity

---

## 🎉 Status

**Current Version:** 1.0.0  
**Status:** ✅ **Production Ready**  
**Last Updated:** October 25, 2025

All core features are implemented, tested, and documented. Ready for deployment! 🚀

---

**Built with ❤️ using Next.js, TypeScript, Tailwind CSS, Prisma, Supabase, and Google Gemini**
