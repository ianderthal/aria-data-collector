require('dotenv').config();
const {
  getProfile,
  getWeightLogs,
  getBodyFatLogs,
  FitbitApiError,
  FitbitAuthError
} = require('./fitbit-client');
const { loadTokens } = require('./token-storage');

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Get date range for the last N days
 */
function getDateRange(days) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate)
  };
}

/**
 * Main function to demonstrate API usage
 */
async function main() {
  console.log('Aria Data Collector\n');

  // Check if tokens exist
  const tokens = loadTokens();
  if (!tokens) {
    console.log('No tokens found.');
    console.log('Please run "npm run auth" to authorize with Fitbit first.\n');
    process.exit(1);
  }

  try {
    // Fetch and display user profile
    console.log('Fetching user profile...');
    const profileData = await getProfile();
    const user = profileData.user;
    console.log(`\nHello, ${user.displayName}!`);
    console.log(`Member since: ${user.memberSince}\n`);

    // Fetch weight logs for the last 30 days
    const { startDate, endDate } = getDateRange(30);
    console.log(`Fetching weight logs (${startDate} to ${endDate})...`);

    const weightData = await getWeightLogs(startDate, endDate);
    const useImperial = user.weightUnit === 'en_US';
    const KG_TO_LBS = 2.20462;

    if (weightData.weight && weightData.weight.length > 0) {
      console.log(`\nWeight Logs (${weightData.weight.length} entries):`);
      weightData.weight.forEach(entry => {
        const weight = useImperial ? (entry.weight * KG_TO_LBS).toFixed(1) : entry.weight;
        const unit = useImperial ? 'lbs' : 'kg';
        console.log(`  ${entry.date}: ${weight} ${unit}`);
      });
    } else {
      console.log('\nNo weight logs found for this period.');
    }

    // Fetch body fat logs
    console.log(`\nFetching body fat logs (${startDate} to ${endDate})...`);
    const fatData = await getBodyFatLogs(startDate, endDate);
    if (fatData.fat && fatData.fat.length > 0) {
      console.log(`\nBody Fat Logs (${fatData.fat.length} entries):`);
      fatData.fat.forEach(entry => {
        console.log(`  ${entry.date}: ${entry.fat}%`);
      });
    } else {
      console.log('\nNo body fat logs found for this period.');
    }

    console.log('\nDone!');
  } catch (error) {
    if (error instanceof FitbitAuthError) {
      console.error('\nAuthentication Error:', error.message);
      console.log('Please run "npm run auth" to re-authorize.\n');
      process.exit(1);
    }

    if (error instanceof FitbitApiError) {
      console.error('\nAPI Error:', error.message);
      console.error('Status Code:', error.statusCode);
      process.exit(1);
    }

    console.error('\nUnexpected error:', error);
    process.exit(1);
  }
}

main();
