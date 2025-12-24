# Aria Data Collector

A Node.js application for collecting body weight and body fat data from the Fitbit API using OAuth 2.0 authentication.

## Features

- OAuth 2.0 authentication with PKCE
- Automatic token refresh handling
- JSON file-based token storage
- Error handling for authentication failures
- Fetches weight and body fat logs

## Prerequisites

- Node.js 18+ (for native fetch support)
- A Fitbit account
- A registered Fitbit application

## Setup

### 1. Create a Fitbit Application

1. Go to [Fitbit Developer Portal](https://dev.fitbit.com/apps)
2. Click "Register a new app"
3. Fill in the application details:
   - **Application Name**: Choose any name
   - **Description**: Your description
   - **Application Website**: Can be any URL (e.g., `http://localhost:3000`)
   - **Organization**: Your name
   - **Organization Website**: Can be any URL
   - **Terms of Service URL**: Can be any URL
   - **Privacy Policy URL**: Can be any URL
   - **OAuth 2.0 Application Type**: Select **Personal**
   - **Redirect URL**: `http://localhost:3000/callback`
   - **Default Access Type**: Select **Read-Only** or **Read & Write**
4. Click "Register"
5. Note your **OAuth 2.0 Client ID** and **Client Secret**

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.sample .env
```

Edit `.env` with your credentials:

```
FITBIT_CLIENT_ID=your_client_id_here
FITBIT_CLIENT_SECRET=your_client_secret_here
FITBIT_REDIRECT_URI=http://localhost:3000/callback
PORT=3000
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Authorize with Fitbit

Run the OAuth authorization server:

```bash
npm run auth
```

1. Open `http://localhost:3000` in your browser
2. Click "Authorize with Fitbit"
3. Log in to your Fitbit account and grant permissions
4. After successful authorization, tokens will be saved to `tokens.json`
5. Stop the auth server (Ctrl+C)

### 5. Run the Application

```bash
npm start
```

This will fetch and display your recent weight and body fat logs.

## Project Structure

```
aria-data-collector/
├── src/
│   ├── index.js          # Main entry point
│   ├── auth-server.js    # OAuth authorization server
│   ├── fitbit-client.js  # Fitbit API client with auto-refresh
│   └── token-storage.js  # JSON file token storage
├── .env                  # Environment variables (not committed)
├── .env.sample           # Environment template
├── tokens.json           # OAuth tokens (not committed)
└── package.json
```

## API Client Usage

The Fitbit client can be imported and used in your own scripts:

```javascript
const {
  apiRequest,
  getProfile,
  getWeightLogs,
  getBodyFatLogs
} = require('./src/fitbit-client');

// Make a custom API request
const data = await apiRequest('/1/user/-/profile.json');

// Use helper functions
const profile = await getProfile();
const weights = await getWeightLogs('2024-01-01', '2024-01-31');
const bodyFat = await getBodyFatLogs('2024-01-01', '2024-01-31');
```

## Token Management

- Tokens are stored in `tokens.json` (excluded from git)
- Access tokens are automatically refreshed when expired
- Tokens refresh 5 minutes before expiration to prevent failures
- If refresh fails, you'll be prompted to re-authorize

## Error Handling

The client provides two error types:

- `FitbitAuthError`: Authentication issues (expired/invalid tokens)
- `FitbitApiError`: API request failures (rate limits, invalid requests)

```javascript
const { FitbitApiError, FitbitAuthError } = require('./src/fitbit-client');

try {
  const data = await getProfile();
} catch (error) {
  if (error instanceof FitbitAuthError) {
    console.log('Please re-authorize: npm run auth');
  } else if (error instanceof FitbitApiError) {
    console.log('API error:', error.statusCode, error.message);
  }
}
```

## Security Notes

- Never commit `.env` or `tokens.json` files
- Keep your Client Secret secure
- Tokens grant access to your Fitbit data
- Revoke access at [Fitbit Settings](https://www.fitbit.com/settings/applications) if compromised

## License

MIT
