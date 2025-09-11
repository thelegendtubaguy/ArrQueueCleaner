import { SonarrClient } from './sonarr';
import { Config, QueueItem, RuleMatch } from './types';

export class QueueCleaner {
    private config: Config;
    private sonarr: SonarrClient;

    constructor(config: Config) {
        this.config = config;
        this.sonarr = new SonarrClient(config.sonarr.host, config.sonarr.apiKey, config.logLevel);
    }

    private log(level: string, message: string, data?: any): void {
        if (level === 'debug' && this.config.logLevel !== 'debug') return;
        const output = data ? `${message}: ${JSON.stringify(data)}` : message;
        console.log(`[${level.toUpperCase()}] ${output}`);
    }

    async cleanQueue(): Promise<void> {
        if (!this.config.sonarr.enabled) return;

        try {
            const queue = await this.sonarr.getQueue();
            const itemsToProcess: Array<{ item: QueueItem; rule: RuleMatch }> = [];

            for (const item of queue) {
                const rule = this.evaluateRules(item);
                if (rule) {
                    itemsToProcess.push({ item, rule });
                }
            }

            for (const { item, rule } of itemsToProcess) {
                await this.processItem(item, rule);
            }

            if (itemsToProcess.length > 0) {
                console.log(`Processed ${itemsToProcess.length} queue items`);
            }
        } catch (error) {
            console.error('Error cleaning queue:', (error as Error).message);
        }
    }

    private evaluateRules(item: QueueItem): RuleMatch | null {
        if (item.status !== 'completed' || 
            item.trackedDownloadStatus !== 'warning' || 
            item.trackedDownloadState !== 'importPending' || 
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
            if (!msg.messages?.length) continue;

            for (const message of msg.messages) {
                if (this.config.rules.removeQualityBlocked && message.includes('upgrade for existing episode')) {
                    this.log('debug', 'Item matched quality rule', item.title);
                    return { type: 'quality', shouldBlock: this.config.rules.blockRemovedQualityReleases };
                }

                if (this.config.rules.removeArchiveBlocked && message.includes('archive file')) {
                    this.log('debug', 'Item matched archive rule', item.title);
                    return { type: 'archive', shouldBlock: this.config.rules.blockRemovedArchiveReleases };
                }

                if (this.config.rules.removeNoFilesReleases && message.includes('No files found are eligible')) {
                    this.log('debug', 'Item matched no files rule', item.title);
                    return { type: 'noFiles', shouldBlock: this.config.rules.blockRemovedNoFilesReleases };
                }
            }
        }

        return null;
    }

    private async processItem(item: QueueItem, rule: RuleMatch): Promise<void> {
        try {
            if (rule.shouldBlock) {
                await this.sonarr.blockRelease(item.id);
                console.log(`Blocked and removed (${rule.type}): ${item.title}`);
            } else {
                await this.sonarr.removeFromQueue(item.id);
                console.log(`Removed (${rule.type}): ${item.title}`);
            }
        } catch (error) {
            console.error(`Error processing ${item.title}:`, (error as Error).message);
        }
    }
}
