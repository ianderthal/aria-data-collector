require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const { saveTokens } = require('./token-storage');

const app = express();
const PORT = process.env.PORT || 3000;

const CLIENT_ID = process.env.FITBIT_CLIENT_ID;
const CLIENT_SECRET = process.env.FITBIT_CLIENT_SECRET;
const REDIRECT_URI = process.env.FITBIT_REDIRECT_URI || `http://localhost:${PORT}/callback`;

// Validate required environment variables
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: FITBIT_CLIENT_ID and FITBIT_CLIENT_SECRET must be set in environment variables');
  process.exit(1);
}

// PKCE code verifier storage (in production, use session storage)
let codeVerifier = null;

/**
 * Generate PKCE code verifier and challenge
 */
function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');

  return { verifier, challenge };
}

/**
 * Build the Fitbit authorization URL
 */
function buildAuthUrl(codeChallenge) {
  const scopes = [
    'activity',
    'heartrate',
    'location',
    'nutrition',
    'profile',
    'settings',
    'sleep',
    'social',
    'weight'
  ];

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    redirect_uri: REDIRECT_URI,
    scope: scopes.join(' ')
  });

  return `https://www.fitbit.com/oauth2/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
async function exchangeCodeForTokens(code) {
  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

  const response = await fetch('https://api.fitbit.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token exchange failed: ${JSON.stringify(error)}`);
  }

  return response.json();
}

// Home page - start OAuth flow
app.get('/', (req, res) => {
  const pkce = generatePKCE();
  codeVerifier = pkce.verifier;

  const authUrl = buildAuthUrl(pkce.challenge);

  res.send(`
    <html>
      <head>
        <title>Fitbit OAuth Setup</title>
        <style>
          body { font-family: system-ui, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
          a { display: inline-block; padding: 12px 24px; background: #00B0B9; color: white; text-decoration: none; border-radius: 4px; }
          a:hover { background: #008A91; }
        </style>
      </head>
      <body>
        <h1>Fitbit OAuth Setup</h1>
        <p>Click the button below to authorize this application with your Fitbit account.</p>
        <a href="${authUrl}">Authorize with Fitbit</a>
      </body>
    </html>
  `);
});

// OAuth callback
app.get('/callback', async (req, res) => {
  const { code, error, error_description } = req.query;

  if (error) {
    return res.status(400).send(`
      <html>
        <head><title>Authorization Error</title></head>
        <body>
          <h1>Authorization Failed</h1>
          <p>Error: ${error}</p>
          <p>${error_description || ''}</p>
          <a href="/">Try Again</a>
        </body>
      </html>
    `);
  }

  if (!code) {
    return res.status(400).send('Missing authorization code');
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    saveTokens(tokens);

    res.send(`
      <html>
        <head>
          <title>Authorization Successful</title>
          <style>
            body { font-family: system-ui, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .success { color: #22c55e; }
          </style>
        </head>
        <body>
          <h1 class="success">Authorization Successful!</h1>
          <p>Tokens have been saved. You can now close this window and stop the server.</p>
          <p>User ID: ${tokens.user_id}</p>
          <p>Scopes: ${tokens.scope}</p>
        </body>
      </html>
    `);

    console.log('\n✓ Authorization successful!');
    console.log('  Tokens saved to tokens.json');
    console.log('  You can now stop this server (Ctrl+C) and run: npm start\n');
  } catch (err) {
    console.error('Token exchange error:', err);
    res.status(500).send(`
      <html>
        <head><title>Token Exchange Error</title></head>
        <body>
          <h1>Token Exchange Failed</h1>
          <p>${err.message}</p>
          <a href="/">Try Again</a>
        </body>
      </html>
    `);
  }
});

app.listen(PORT, () => {
  console.log(`\nFitbit OAuth Server running on http://localhost:${PORT}`);
  console.log('Open this URL in your browser to start the authorization flow.\n');
});
