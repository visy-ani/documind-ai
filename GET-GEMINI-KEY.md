# How to Get Your Gemini API Key

You provided your Google Cloud project information, but you need the actual API key.

## Steps:

### Option 1: Google AI Studio (Easiest)
1. Go to **https://aistudio.google.com/apikey**
2. Click "Create API Key"
3. Select your existing project: **gen-lang-client-0260128900**
4. Copy the API key that starts with something like `AIza...`

### Option 2: Google Cloud Console
1. Go to **https://console.cloud.google.com/**
2. Select your project: **gen-lang-client-0260128900**
3. Go to **APIs & Services → Credentials**
4. Click **+ CREATE CREDENTIALS → API key**
5. Copy the generated API key

---

## After Getting the API Key:

1. Open `.env.local` file
2. Replace `YOUR_GEMINI_API_KEY_HERE` with your actual API key
3. Save the file

Example:
```env
GEMINI_API_KEY="AIzaSyC-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

The API key should start with `AIza` followed by more characters.

