LeetCode AI Helper - Gemini Integration Setup
Quick Setup Guide
1. Get your Gemini API Key
Go to Google AI Studio
Sign in with your Google account
Click "Create API Key"
Copy the generated API key
2. Configure Environment Variables
Open .env.local file
Replace your_gemini_api_key_here with your actual API key:
GEMINI_API_KEY=AIzaSyDdI0hCZtE6vySjMlADuCegtp0cWcl23lo
3. Start the Development Server
npm run dev
4. Load the Extension
Open Chrome
Go to chrome://extensions/
Enable "Developer mode"
Click "Load unpacked"
Select this project folder
5. Test the Integration
Go to any LeetCode problem page
The AI widget should appear with Gemini-powered responses
Try asking for hints, approaches, or step-by-step guidance
Features
Real AI responses using Google's Gemini 1.5 Flash model
Context-aware hints based on the current LeetCode problem
Progressive learning with adaptive difficulty
Fallback responses if the API is unavailable
Cost-effective using Gemini's free tier
API Usage
The app uses Gemini 1.5 Flash model (free tier)
Requests are optimized for coding assistance
Context includes problem title, difficulty, and user query
Responses are cached to minimize API calls
Troubleshooting
If responses seem hardcoded, check your API key configuration
Ensure the Next.js server is running on localhost:3000
Check browser console for any API errors
Verify the extension has necessary permissions
