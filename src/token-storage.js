const fs = require('fs');
const path = require('path');

const TOKEN_FILE = path.join(__dirname, '..', 'tokens.json');

/**
 * Load tokens from the JSON file
 * @returns {Object|null} Token data or null if not found
 */
function loadTokens() {
  try {
    if (!fs.existsSync(TOKEN_FILE)) {
      return null;
    }
    const data = fs.readFileSync(TOKEN_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading tokens:', error.message);
    return null;
  }
}

/**
 * Save tokens to the JSON file
 * @param {Object} tokens - Token data to save
 */
function saveTokens(tokens) {
  try {
    const data = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_type: tokens.token_type,
      expires_in: tokens.expires_in,
      scope: tokens.scope,
      user_id: tokens.user_id,
      saved_at: Date.now()
    };
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(data, null, 2));
    console.log('Tokens saved successfully');
  } catch (error) {
    console.error('Error saving tokens:', error.message);
    throw error;
  }
}

/**
 * Check if the current access token is expired
 * @returns {boolean} True if expired or about to expire (within 5 minutes)
 */
function isTokenExpired() {
  const tokens = loadTokens();
  if (!tokens || !tokens.saved_at || !tokens.expires_in) {
    return true;
  }

  const expiresAt = tokens.saved_at + (tokens.expires_in * 1000);
  const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

  return Date.now() >= (expiresAt - bufferTime);
}

/**
 * Delete stored tokens
 */
function clearTokens() {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      fs.unlinkSync(TOKEN_FILE);
      console.log('Tokens cleared');
    }
  } catch (error) {
    console.error('Error clearing tokens:', error.message);
  }
}

module.exports = {
  loadTokens,
  saveTokens,
  isTokenExpired,
  clearTokens
};
