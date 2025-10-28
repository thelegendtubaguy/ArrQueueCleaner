import { CronJob } from 'cron';
import config from './config';
import { QueueCleaner } from './cleaner';
import { RuleConfig } from './types';

const enabledInstances = config.sonarrInstances.filter(instance => instance.enabled);
const cleaners = enabledInstances.map(instance => new QueueCleaner({
    instance,
    rules: mergeRules(config.rules, instance.rules),
    dryRun: config.dryRun,
    logLevel: config.logLevel
}));

console.log('ArrQueueCleaner starting...');
console.log(`Schedule: ${config.schedule}`);

if (config.sonarrInstances.length) {
    const summary = config.sonarrInstances
        .map(instance => `${instance.name} (${instance.host})${instance.enabled ? '' : ' [disabled]'}`)
        .join(', ');
    console.log(`Sonarr instances: ${summary}`);
} else {
    console.log('No Sonarr instances configured.');
}

const runAllCleaners = async (): Promise<void> => {
    for (const cleaner of cleaners) {
        await cleaner.cleanQueue();
    }
};

const job = new CronJob(config.schedule, () => {
    void runAllCleaners();
});
job.start();

void runAllCleaners();

function mergeRules(baseRules: RuleConfig, overrides?: Partial<RuleConfig>): RuleConfig {
    return {
        ...baseRules,
        ...(overrides || {})
    };
}
