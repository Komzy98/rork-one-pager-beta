# Football API Setup Instructions

## Why No Football Data is Showing

Your app is currently using an **invalid API key** for the football data API. The placeholder key `your-api-key-here` needs to be replaced with a real API key.

## How to Fix This

### Option 1: API-Football (Recommended - Free Tier Available)

1. **Sign up for API-Football**:
   - Go to https://www.api-football.com/
   - Click "Get Started" or "Sign Up"
   - Create a free account

2. **Get your API key**:
   - After signing up, go to your dashboard
   - Copy your API key

3. **Add the API key to your app**:
   - Open `utils/footballApi.ts`
   - Replace line 6:
     ```typescript
     const API_KEY = 'your-api-key-here';
     ```
     With your actual key:
     ```typescript
     const API_KEY = 'YOUR_ACTUAL_API_KEY_HERE';
     ```

4. **Free Tier Limits**:
   - 100 requests per day
   - Access to live scores, fixtures, and standings
   - Covers major leagues worldwide

### Option 2: Use Mock Data (For Testing)

If you don't want to sign up for an API, you can use mock/static data for testing:

1. The app will show "No matches found" but won't crash
2. You can test the UI with empty states
3. When you're ready for real data, follow Option 1

## Current Rate Limiting

The app has built-in rate limiting to prevent overwhelming the API:
- **2 seconds** between automatic API calls
- You can force refresh by:
  - Pulling down to refresh
  - Clicking the refresh button in the header

## Troubleshooting

### Still No Data After Adding API Key?

1. **Check the console logs**:
   - Look for error messages starting with ❌
   - Check for "API error" or "rate limited" messages

2. **Clear rate limit cache**:
   - The app has a refresh button (🔄) in the sports tab header
   - Click it to force a fresh API call

3. **Verify your API key**:
   - Make sure you copied the entire key
   - Check there are no extra spaces
   - Ensure the key is active in your API-Football dashboard

### API Returns 401 Unauthorized

- Your API key is invalid or expired
- Get a new key from the API-Football dashboard

### API Returns 429 Too Many Requests

- You've exceeded your daily limit (100 requests for free tier)
- Wait until tomorrow or upgrade your plan
- The app will automatically handle this and show cached data

## Alternative Free APIs

If API-Football doesn't work for you, here are alternatives:

1. **Football-Data.org** (10 requests/minute free)
2. **TheSportsDB** (Limited free tier)
3. **API-Sports** (Similar to API-Football)

Note: Each API has different endpoints and data structures, so you'd need to modify the code to use them.
