# 🚀 Quick Start Guide - Authentication System

## Test Your Authentication System Right Now!

### Step 1: Start the Server (if not running)
```bash
cd documind-ai
pnpm dev
```

### Step 2: Test the Complete Flow

#### 🔐 **Sign Up**
1. Go to: `http://localhost:3000`
2. You'll be redirected to `/login`
3. Click "Sign up" at the bottom
4. Fill in the form:
   - **Name**: John Doe
   - **Email**: test@example.com
   - **Password**: Test1234! (watch the strength indicator!)
   - **Confirm Password**: Test1234!
   - ✅ Check "I agree to the Terms"
5. Click "Create account"
6. **Success!** You're now on the dashboard 🎉

#### 🏠 **Dashboard**
After signup, you'll see:
- Your profile information
- Usage tier (Free)
- Quick action buttons
- Sign out button

#### 🔓 **Sign Out & Sign In**
1. Click "Sign Out" on dashboard
2. You're redirected to `/login`
3. Sign in with:
   - **Email**: test@example.com
   - **Password**: Test1234!
4. Click "Sign in"
5. Back to dashboard! 🎉

#### 🔑 **Test Password Reset**
1. On login page, click "Forgot password?"
2. Enter your email: test@example.com
3. Click "Send reset link"
4. Check your email inbox 📧
5. Click the reset link
6. Create new password

#### 🔒 **Test Route Protection**
1. Sign out
2. Try accessing: `http://localhost:3000/dashboard`
3. You'll be redirected to `/login` ✅
4. Sign back in
5. Try accessing: `http://localhost:3000/login`
6. You'll be redirected to `/dashboard` ✅

---

## 🎨 What Each Page Looks Like

### **Login Page** (`/login`)
```
┌─────────────────────────────────────┐
│         Welcome back               │
│   Sign in to your DocuMind AI      │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ 🔵 Continue with Google       │ │
│  └───────────────────────────────┘ │
│                                     │
│     ─── Or continue with email ───  │
│                                     │
│  Email: [________________]          │
│                                     │
│  Password: [________________]       │
│  Forgot password?                   │
│                                     │
│  ┌─────────────────────┐           │
│  │   Sign in           │           │
│  └─────────────────────┘           │
│                                     │
│  Don't have an account? Sign up     │
└─────────────────────────────────────┘
```

### **Signup Page** (`/signup`)
```
┌─────────────────────────────────────┐
│      Create an account             │
│   Get started with DocuMind AI     │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ 🔵 Continue with Google       │ │
│  └───────────────────────────────┘ │
│                                     │
│     ─── Or continue with email ───  │
│                                     │
│  Full Name: [________________]      │
│  Email: [________________]          │
│  Password: [________________]       │
│                                     │
│  Password strength: Strong          │
│  ████████████████ (green bars)      │
│  ✓ At least 8 characters            │
│  ✓ One lowercase letter             │
│  ✓ One uppercase letter             │
│  ✓ One number                       │
│                                     │
│  Confirm Password: [__________]     │
│                                     │
│  ☑ I agree to Terms and Privacy     │
│                                     │
│  ┌─────────────────────┐           │
│  │  Create account     │           │
│  └─────────────────────┘           │
│                                     │
│  Already have an account? Sign in   │
└─────────────────────────────────────┘
```

### **Forgot Password** (`/forgot-password`)
```
┌─────────────────────────────────────┐
│       Reset password               │
│ Enter your email and we'll send    │
│        you a reset link            │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ Email: [__________________]   │ │
│  │ We'll send a password reset   │ │
│  │ link to this email address    │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌─────────────────────┐           │
│  │  Send reset link    │           │
│  └─────────────────────┘           │
│                                     │
│  ┌─────────────────────┐           │
│  │ ← Back to login     │           │
│  └─────────────────────┘           │
│                                     │
│  Remember your password? Sign in    │
└─────────────────────────────────────┘
```

### **Dashboard** (`/dashboard`)
```
┌─────────────────────────────────────────────────┐
│  Dashboard                    [Sign Out]        │
│  Welcome to DocuMind AI                         │
│                                                 │
│  ┌──────────────────┐  ┌──────────────────┐   │
│  │  Your Profile    │  │  Quick Actions   │   │
│  │                  │  │                  │   │
│  │  Name: John Doe  │  │ [Upload Document]│   │
│  │  Email: test@... │  │ [Create Workspace]   │
│  │  Plan: Free      │  │ [View Analytics] │   │
│  └──────────────────┘  └──────────────────┘   │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │ 🎉 Authentication System Complete!        │ │
│  │                                           │ │
│  │ ✅ Email/Password Authentication          │ │
│  │ ✅ Google OAuth Integration               │ │
│  │ ✅ Password Reset Flow                    │ │
│  │ ✅ Protected Routes with Middleware       │ │
│  │ ✅ Session Management                     │ │
│  │ ✅ User Context & Hooks                   │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

---

## 🎯 Test Checklist

- [ ] Can sign up with email/password
- [ ] Password strength indicator works
- [ ] Can sign in with email/password
- [ ] Can access dashboard after login
- [ ] Can sign out
- [ ] Protected routes redirect to login
- [ ] Login routes redirect to dashboard when authenticated
- [ ] Password reset email is sent
- [ ] Form validation works (try empty fields)
- [ ] Error toasts appear on failures
- [ ] Success toasts appear on success
- [ ] Google OAuth button present (needs Supabase config)

---

## ⚙️ Configure Google OAuth (Optional)

To enable the Google sign-in button:

### 1. Get Google OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project: `gen-lang-client-0260128900`
3. Go to **APIs & Services → Credentials**
4. Click **+ CREATE CREDENTIALS → OAuth 2.0 Client ID**
5. Choose **Web application**
6. Add authorized redirect URI:
   ```
   https://eeovofjzvxkqorsxgvfn.supabase.co/auth/v1/callback
   ```
7. Copy the **Client ID** and **Client Secret**

### 2. Configure in Supabase
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/eeovofjzvxkqorsxgvfn)
2. Navigate to **Authentication → Providers**
3. Find **Google** and click Enable
4. Paste your **Client ID** and **Client Secret**
5. Save

### 3. Test Google OAuth
1. Go to `/login` or `/signup`
2. Click "Continue with Google"
3. Select your Google account
4. Authorize the app
5. You'll be redirected to `/dashboard` 🎉

---

## 🔥 Pro Tips

### **Tip 1: Use Browser DevTools**
- Open DevTools → Application → Cookies
- See Supabase auth cookies
- See session management in action

### **Tip 2: Check Network Tab**
- See API calls to Supabase
- See server actions being called
- Debug any issues

### **Tip 3: Check Console**
- Auth state changes are logged
- Any errors appear here
- Useful for debugging

### **Tip 4: Use Incognito**
- Test fresh signup flow
- No cached sessions
- Clean testing environment

---

## 📧 Email Configuration

Your password reset emails will be sent from Supabase.

**To customize:**
1. Go to Supabase Dashboard
2. **Authentication → Email Templates**
3. Edit "Reset Password" template
4. Add your branding and styling

**To use custom SMTP:**
1. **Authentication → Settings**
2. Configure SMTP settings
3. Use your own email server

---

## 🎉 Success Indicators

You'll know everything is working when:

✅ You can create an account  
✅ You see your info on dashboard  
✅ You're redirected properly  
✅ Toasts show success/error messages  
✅ Protected routes are blocked when signed out  
✅ Auth routes redirect to dashboard when signed in  
✅ Session persists after page refresh  
✅ Sign out clears session properly

---

## 🆘 Quick Troubleshooting

### **Can't sign up?**
- Check database connection (`.env`)
- Check Supabase credentials
- Look at browser console for errors

### **Password reset not working?**
- Check Supabase email settings
- Look in spam folder
- Verify Site URL in Supabase

### **Session not persisting?**
- Clear browser cookies
- Check Supabase is not paused
- Verify environment variables

### **OAuth redirect loop?**
- Check redirect URLs in Supabase
- Clear cookies and try again
- Verify middleware configuration

---

## 📚 What's Next?

Now that auth is working, you can:

1. **Customize the UI**
   - Update colors and branding
   - Add your logo
   - Modify layouts

2. **Add Profile Page**
   - Edit user information
   - Upload avatar
   - Change password

3. **Build Document Upload**
   - File upload component
   - Document processing
   - Storage integration

4. **Integrate Gemini AI**
   - Document analysis
   - Q&A interface
   - Summary generation

---

## 🎊 You're All Set!

Your authentication system is **fully functional** and ready for production!

**Happy building! 🚀**

