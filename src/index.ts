import { CronJob } from 'cron';
import config from './config';
import { QueueCleaner } from './cleaner';

const cleaner = new QueueCleaner(config);

console.log('ArrQueueCleaner starting...');
console.log(`Schedule: ${config.schedule}`);
console.log(`Sonarr: ${config.sonarr.host}`);

const job = new CronJob(config.schedule, () => cleaner.cleanQueue());
job.start();

// Run once on startup
cleaner.cleanQueue();
