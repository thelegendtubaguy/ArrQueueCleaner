import { SonarrClient } from './sonarr';
import { RULE_DEFINITIONS } from './rules';
import { QueueItem, RuleConfig, RuleMatch, RuleType, SonarrInstanceConfig } from './types';

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
            const itemsToProcess: { item: QueueItem; rules: RuleMatch[] }[] = [];

            for (const item of queue) {
                const rules = this.evaluateRules(item);
                if (rules.length > 0) {
                    itemsToProcess.push({ item, rules });
                }
            }

            // Group by downloadId to handle season packs
            const downloadGroups = new Map<string, { item: QueueItem; ruleTypes: Set<RuleType>; shouldRemove: boolean; shouldBlock: boolean }>();
            for (const entry of itemsToProcess) {
                const downloadId = entry.item.downloadId || entry.item.id.toString();
                const existingGroup = downloadGroups.get(downloadId);
                const group = existingGroup ?? {
                    item: entry.item,
                    ruleTypes: new Set<RuleType>(),
                    shouldRemove: false,
                    shouldBlock: false
                };

                for (const rule of entry.rules) {
                    group.ruleTypes.add(rule.type);
                    group.shouldRemove = group.shouldRemove || rule.shouldRemove;
                    group.shouldBlock = group.shouldBlock || rule.shouldBlock;
                }

                if (!existingGroup) {
                    downloadGroups.set(downloadId, group);
                }
            }

            for (const { item, ruleTypes, shouldRemove, shouldBlock } of downloadGroups.values()) {
                await this.processItem(item, {
                    type: Array.from(ruleTypes).join(', '),
                    shouldRemove,
                    shouldBlock
                });
            }

            if (downloadGroups.size > 0) {
                this.log('info', `Processed ${downloadGroups.size} downloads (${itemsToProcess.length} queue items)`);
            }
        } catch (error) {
            this.log('error', 'Error cleaning queue', (error as Error).message);
        }
    }

    private evaluateRules(item: QueueItem): RuleMatch[] {
        if (item.status !== 'completed' ||
            item.trackedDownloadStatus !== 'warning' ||
            (item.trackedDownloadState !== 'importPending' && item.trackedDownloadState !== 'importBlocked') ||
            !item.statusMessages?.length) {
            return [];
        }

        this.log('debug', 'Evaluating rules for item', {
            title: item.title,
            status: item.status,
            trackedDownloadStatus: item.trackedDownloadStatus,
            trackedDownloadState: item.trackedDownloadState,
            statusMessages: item.statusMessages
        });

        const matches = new Map<RuleType, RuleMatch>();

        for (const msg of item.statusMessages) {
            if (!msg.messages?.length) { continue; }

            for (const message of msg.messages) {
                for (const definition of RULE_DEFINITIONS) {
                    const shouldRemove = this.rules[definition.enabledKey];
                    const shouldBlock = definition.forceBlock || (definition.blockKey ? this.rules[definition.blockKey] : false);
                    const ruleEnabled = shouldRemove || (definition.allowBlockOnly && shouldBlock);

                    if (!ruleEnabled || !definition.matches(message)) {
                        continue;
                    }

                    if (!matches.has(definition.type)) {
                        this.log('debug', `Item matched ${definition.type} rule`, item.title);
                    }

                    matches.set(definition.type, {
                        type: definition.type,
                        shouldRemove,
                        shouldBlock
                    });
                }
            }
        }

        return Array.from(matches.values());
    }

    private describeAction(rule: { shouldRemove: boolean; shouldBlock: boolean }): string {
        if (rule.shouldBlock && rule.shouldRemove) {
            return 'block and remove';
        }

        if (rule.shouldBlock) {
            return 'block';
        }

        return 'remove';
    }

    private async processItem(item: QueueItem, rule: { type: string; shouldRemove: boolean; shouldBlock: boolean }): Promise<void> {
        try {
            if (this.dryRun) {
                this.log('info', `[DRY RUN] Would ${this.describeAction(rule)} (${rule.type}): ${item.title}`);
                return;
            }

            if (rule.shouldBlock) {
                if (rule.shouldRemove) {
                    await this.sonarr.blockRelease(item.id);
                    this.log('info', `Blocked and removed (${rule.type}): ${item.title}`);
                } else {
                    await this.sonarr.blockRelease(item.id, false);
                    this.log('info', `Blocked (${rule.type}): ${item.title}`);
                }
            } else {
                await this.sonarr.removeFromQueue(item.id);
                this.log('info', `Removed (${rule.type}): ${item.title}`);
            }
        } catch (error) {
            this.log('error', `Error processing ${item.title}`, (error as Error).message);
        }
    }
}
