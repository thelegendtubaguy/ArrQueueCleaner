import type { RuleConfig } from './types';

type CleanerRun = () => Promise<void>;

export interface GuardedRunOptions {
    logger?: Pick<Console, 'warn'>;
    skipMessage?: string;
}

export function createGuardedRun(runCleaners: CleanerRun, options: GuardedRunOptions = {}): CleanerRun {
    const logger = options.logger ?? console;
    const skipMessage = options.skipMessage ?? 'Skipping cleaner run; previous cleaner run is still in progress.';
    let isRunning = false;

    return async () => {
        if (isRunning) {
            logger.warn(skipMessage);
            return;
        }

        isRunning = true;
        try {
            await runCleaners();
        } finally {
            isRunning = false;
        }
    };
}

async function start(): Promise<void> {
    const [
        { CronJob },
        { default: config },
        { QueueCleaner }
    ] = await Promise.all([
        import('cron'),
        import('./config'),
        import('./cleaner')
    ]);

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
    const runCleanersIfIdle = createGuardedRun(runAllCleaners);

    const job = new CronJob(config.schedule, () => {
        void runCleanersIfIdle();
    });
    job.start();

    void runCleanersIfIdle();
}

if (require.main === module) {
    void start();
}

function mergeRules(baseRules: RuleConfig, overrides?: Partial<RuleConfig>): RuleConfig {
    return {
        ...baseRules,
        ...(overrides || {})
    };
}
