# LeetCode AI Helper - Gemini Integration Setup

## Quick Setup Guide

### 1. Get your Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

### 2. Configure Environment Variables
1. Open `.env.local` file
2. Replace `your_gemini_api_key_here` with your actual API key:
   ```
   GEMINI_API_KEY=AIzaSyDdI0hCZtE6vySjMlADuCegtp0cWcl23lo
   ```

### 3. Start the Development Server
```bash
npm run dev
```

### 4. Load the Extension
1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select this project folder

### 5. Test the Integration
1. Go to any LeetCode problem page
2. The AI widget should appear with Gemini-powered responses
3. Try asking for hints, approaches, or step-by-step guidance

## Features
- **Real AI responses** using Google's Gemini 1.5 Flash model
- **Context-aware** hints based on the current LeetCode problem
- **Progressive learning** with adaptive difficulty
- **Fallback responses** if the API is unavailable
- **Cost-effective** using Gemini's free tier

## API Usage
- The app uses Gemini 1.5 Flash model (free tier)
- Requests are optimized for coding assistance
- Context includes problem title, difficulty, and user query
- Responses are cached to minimize API calls

## Troubleshooting
- If responses seem hardcoded, check your API key configuration
- Ensure the Next.js server is running on localhost:3000
- Check browser console for any API errors
- Verify the extension has necessary permissions
