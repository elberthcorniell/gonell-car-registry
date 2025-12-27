const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const dotenv = require('dotenv');
const { Gestiono } = require('@bitnation-dev/management/server');

// Load environment variables
dotenv.config({
    path: path.join(__dirname, `.env.${process.env.NODE_ENV || 'production'}`)
});

async function publish() {
    if (!process.env.GESTIONO_API_KEY) {
        console.error('GESTIONO_API_KEY is not set');
        process.exit(1);
    }
    if (!process.env.GESTIONO_API_SECRET) {
        console.error('GESTIONO_API_SECRET is not set');
        process.exit(1);
    }
    Gestiono.apiKey = process.env.GESTIONO_API_KEY;
    Gestiono.apiSecret = process.env.GESTIONO_API_SECRET;
    try {
        const reachArg = process.argv.find(arg => arg.startsWith('--reach='));
        const releaseReach = reachArg ? reachArg.split('=')[1] : 'organization';

        // Build the app
        console.log('Building app...');
        execSync('cd app && yarn build', { stdio: 'inherit' });

        // Read the built bundle
        const bundlePath = path.join(__dirname, 'dist', 'app-bundle.js');
        const bundle = new File([fs.readFileSync(bundlePath)], 'app-bundle.js', { type: 'application/javascript' });

        Gestiono.errorHandler = e => {
            console.log(e.response.data)
            throw Error(e.response.data.message)
        }
        // Publish the release
        console.log(`Publishing release with reach: ${releaseReach}...`);
        await Gestiono.postAppRelease({
            appId: parseInt(process.env.GESTIONO_APP_ID),
            appJs: bundle,
            releaseReach: releaseReach.toUpperCase()
        });

        console.log('Successfully published new release!');
    } catch (error) {
        console.error('Error publishing release:', error);
        process.exit(1);
    }
}

publish();
