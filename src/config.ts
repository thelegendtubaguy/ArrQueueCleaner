import { config as dotenvConfig } from 'dotenv';
import { Config } from './types';

dotenvConfig();

const config: Config = {
    sonarr: {
        host: process.env.SONARR_HOST || 'http://localhost:8989',
        apiKey: process.env.SONARR_API_KEY || '',
        enabled: !!(process.env.SONARR_HOST && process.env.SONARR_HOST.trim() !== '')
    },
    rules: {
        removeQualityBlocked: process.env.REMOVE_QUALITY_BLOCKED === 'true',
        blockRemovedQualityReleases: process.env.BLOCK_REMOVED_QUALITY_RELEASES === 'true',
        removeArchiveBlocked: process.env.REMOVE_ARCHIVE_BLOCKED === 'true',
        blockRemovedArchiveReleases: process.env.BLOCK_REMOVED_ARCHIVE_RELEASES === 'true',
        removeNoFilesReleases: process.env.REMOVE_NO_FILES_RELEASES === 'true',
        blockRemovedNoFilesReleases: process.env.BLOCK_REMOVED_NO_FILES_RELEASES === 'true',
    },
    schedule: process.env.SCHEDULE || '*/5 * * * *',
    logLevel: process.env.LOG_LEVEL || 'info'
};

if (!config.sonarr.apiKey) {
    console.error('SONARR_API_KEY is required');
    process.exit(1);
}

export default config;
