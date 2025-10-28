import { SonarrClient } from './sonarr';
import { QueueItem, RuleMatch, RuleConfig, SonarrInstanceConfig } from './types';

export interface QueueCleanerOptions {
    instance: SonarrInstanceConfig;
    rules: RuleConfig;
    dryRun: boolean;
    logLevel: string;
}

export class QueueCleaner {
    private readonly instance: SonarrInstanceConfig;
    private readonly rules: RuleConfig;
    private readonly dryRun: boolean;
    private readonly logLevel: string;
    private readonly sonarr: SonarrClient;

    constructor(options: QueueCleanerOptions) {
        this.instance = options.instance;
        this.rules = options.rules;
        this.dryRun = options.dryRun;
        this.logLevel = options.logLevel;
        this.sonarr = new SonarrClient(this.instance.host, this.instance.apiKey, this.logLevel);
    }

    private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: unknown): void {
        if (level === 'debug' && this.logLevel !== 'debug') { return; }
        const output = data ? `${message}: ${JSON.stringify(data)}` : message;
        const prefix = `[${level.toUpperCase()}] [${this.instance.name}] ${output}`;

        if (level === 'error') {
            console.error(prefix);
        } else if (level === 'warn') {
            console.warn(prefix);
        } else {
            console.log(prefix);
        }
    }

    async cleanQueue(): Promise<void> {
        if (!this.instance.enabled) { return; }

        try {
            const queue = await this.sonarr.getQueue();
            const itemsToProcess: { item: QueueItem; rule: RuleMatch }[] = [];

            for (const item of queue) {
                const rule = this.evaluateRules(item);
                if (rule) {
                    itemsToProcess.push({ item, rule });
                }
            }

            // Group by downloadId to handle season packs
            const downloadGroups = new Map<string, { item: QueueItem; rule: RuleMatch }>();
            for (const entry of itemsToProcess) {
                const downloadId = entry.item.downloadId || entry.item.id.toString();
                if (!downloadGroups.has(downloadId)) {
                    downloadGroups.set(downloadId, entry);
                }
            }

            for (const { item, rule } of downloadGroups.values()) {
                await this.processItem(item, rule);
            }

            if (downloadGroups.size > 0) {
                this.log('info', `Processed ${downloadGroups.size} downloads (${itemsToProcess.length} queue items)`);
            }
        } catch (error) {
            this.log('error', 'Error cleaning queue', (error as Error).message);
        }
    }

    private evaluateRules(item: QueueItem): RuleMatch | null {
        if (item.status !== 'completed' ||
            item.trackedDownloadStatus !== 'warning' ||
            (item.trackedDownloadState !== 'importPending' && item.trackedDownloadState !== 'importBlocked') ||
            !item.statusMessages?.length) {
            return null;
        }

        this.log('debug', 'Evaluating rules for item', {
            title: item.title,
            status: item.status,
            trackedDownloadStatus: item.trackedDownloadStatus,
            trackedDownloadState: item.trackedDownloadState,
            statusMessages: item.statusMessages
        });

        for (const msg of item.statusMessages) {
            if (!msg.messages?.length) { continue; }

            for (const message of msg.messages) {
                if (this.rules.removeQualityBlocked && message.includes('upgrade for existing episode')) {
                    this.log('debug', 'Item matched quality rule', item.title);
                    return { type: 'quality', shouldBlock: this.rules.blockRemovedQualityReleases };
                }

                if (this.rules.removeArchiveBlocked && message.includes('archive file')) {
                    this.log('debug', 'Item matched archive rule', item.title);
                    return { type: 'archive', shouldBlock: this.rules.blockRemovedArchiveReleases };
                }

                if (this.rules.removeNoFilesReleases && message.includes('No files found are eligible')) {
                    this.log('debug', 'Item matched no files rule', item.title);
                    return { type: 'noFiles', shouldBlock: this.rules.blockRemovedNoFilesReleases };
                }

                if (this.rules.removeNotAnUpgrade && message.includes('Not an upgrade')) {
                    this.log('debug', 'Item matched not an upgrade rule', item.title);
                    return { type: 'notAnUpgrade', shouldBlock: false };
                }

                if (this.rules.removeSeriesIdMismatch && message.includes('Found matching series via grab history, but release was matched to series by ID')) {
                    this.log('debug', 'Item matched series ID mismatch rule', item.title);
                    return { type: 'seriesIdMismatch', shouldBlock: this.rules.blockRemovedSeriesIdMismatchReleases };
                }

                if (this.rules.removeUndeterminedSample && message.includes('Unable to determine if file is a sample')) {
                    this.log('debug', 'Item matched undetermined sample rule', item.title);
                    return { type: 'undeterminedSample', shouldBlock: this.rules.blockRemovedUndeterminedSampleReleases };
                }
            }
        }

        return null;
    }

    private async processItem(item: QueueItem, rule: RuleMatch): Promise<void> {
        try {
            if (this.dryRun) {
                if (rule.shouldBlock) {
                    this.log('info', `[DRY RUN] Would block and remove (${rule.type}): ${item.title}`);
                } else {
                    this.log('info', `[DRY RUN] Would remove (${rule.type}): ${item.title}`);
                }
                return;
            }

            if (rule.shouldBlock) {
                await this.sonarr.blockRelease(item.id);
                this.log('info', `Blocked and removed (${rule.type}): ${item.title}`);
            } else {
                await this.sonarr.removeFromQueue(item.id);
                this.log('info', `Removed (${rule.type}): ${item.title}`);
            }
        } catch (error) {
            this.log('error', `Error processing ${item.title}`, (error as Error).message);
        }
    }
}
