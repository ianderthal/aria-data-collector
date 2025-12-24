require('dotenv').config();
const { loadTokens, saveTokens, isTokenExpired } = require('./token-storage');

const CLIENT_ID = process.env.FITBIT_CLIENT_ID;
const CLIENT_SECRET = process.env.FITBIT_CLIENT_SECRET;
const API_BASE_URL = 'https://api.fitbit.com';

class FitbitApiError extends Error {
  constructor(message, statusCode, errors) {
    super(message);
    this.name = 'FitbitApiError';
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

class FitbitAuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FitbitAuthError';
  }
}

/**
 * Refresh the access token using the refresh token
 */
async function refreshAccessToken() {
  const tokens = loadTokens();

  if (!tokens || !tokens.refresh_token) {
    throw new FitbitAuthError('No refresh token available. Please re-authorize the application.');
  }

  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

  const response = await fetch(`${API_BASE_URL}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token
    })
  });

  if (!response.ok) {
    const error = await response.json();

    if (response.status === 401 || response.status === 400) {
      throw new FitbitAuthError(`Token refresh failed: ${JSON.stringify(error)}. Please re-authorize.`);
    }

    throw new FitbitApiError(`Token refresh failed: ${JSON.stringify(error)}`, response.status, error);
  }

  const newTokens = await response.json();
  saveTokens(newTokens);
  console.log('Access token refreshed successfully');

  return newTokens;
}

/**
 * Get a valid access token, refreshing if necessary
 */
async function getValidAccessToken() {
  let tokens = loadTokens();

  if (!tokens) {
    throw new FitbitAuthError('No tokens found. Please run "npm run auth" to authorize.');
  }

  if (isTokenExpired()) {
    console.log('Access token expired, refreshing...');
    tokens = await refreshAccessToken();
  }

  return tokens.access_token;
}

/**
 * Make an authenticated request to the Fitbit API
 * @param {string} endpoint - API endpoint (e.g., '/1/user/-/profile.json')
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} API response data
 */
async function apiRequest(endpoint, options = {}) {
  const accessToken = await getValidAccessToken();

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      ...options.headers
    }
  });

  // Handle token expiration during request
  if (response.status === 401) {
    console.log('Received 401, attempting token refresh...');
    try {
      const newTokens = await refreshAccessToken();

      // Retry the request with new token
      const retryResponse = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${newTokens.access_token}`,
          'Accept': 'application/json',
          ...options.headers
        }
      });

      if (!retryResponse.ok) {
        const error = await retryResponse.json();
        throw new FitbitApiError(`API request failed: ${JSON.stringify(error)}`, retryResponse.status, error);
      }

      return retryResponse.json();
    } catch (refreshError) {
      if (refreshError instanceof FitbitAuthError) {
        throw refreshError;
      }
      throw new FitbitAuthError('Authentication failed. Please re-authorize the application.');
    }
  }

  if (!response.ok) {
    const error = await response.json();
    throw new FitbitApiError(`API request failed: ${JSON.stringify(error)}`, response.status, error);
  }

  return response.json();
}

/**
 * Get user profile
 */
async function getProfile() {
  return apiRequest('/1/user/-/profile.json');
}

/**
 * Get body weight logs for a date range
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 */
async function getWeightLogs(startDate, endDate) {
  return apiRequest(`/1/user/-/body/log/weight/date/${startDate}/${endDate}.json`);
}

/**
 * Get body fat logs for a date range
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 */
async function getBodyFatLogs(startDate, endDate) {
  return apiRequest(`/1/user/-/body/log/fat/date/${startDate}/${endDate}.json`);
}

/**
 * Get weight goal
 */
async function getWeightGoal() {
  return apiRequest('/1/user/-/body/log/weight/goal.json');
}

/**
 * Get body fat goal
 */
async function getBodyFatGoal() {
  return apiRequest('/1/user/-/body/log/fat/goal.json');
}

module.exports = {
  apiRequest,
  getProfile,
  getWeightLogs,
  getBodyFatLogs,
  getWeightGoal,
  getBodyFatGoal,
  refreshAccessToken,
  FitbitApiError,
  FitbitAuthError
};
