import { DEFAULT_RULE_CONFIG } from '../src/rules';
import { QueueItem, RuleConfig, SonarrInstanceConfig } from '../src/types';

type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export const createRuleConfig = (overrides: Partial<RuleConfig> = {}): RuleConfig => ({
    ...DEFAULT_RULE_CONFIG,
    ...overrides
});

export const createMockInstance = (overrides: DeepPartial<SonarrInstanceConfig> = {}): SonarrInstanceConfig => ({
    name: overrides.name ?? 'Test Sonarr',
    host: overrides.host ?? 'http://localhost:8989',
    apiKey: overrides.apiKey ?? 'test-api-key',
    enabled: overrides.enabled ?? true,
    rules: overrides.rules
});

export const createMockQueueItem = (overrides: Partial<QueueItem> = {}): QueueItem => ({
    id: 123,
    title: 'Test.Show.S01E01',
    status: 'completed',
    trackedDownloadStatus: 'warning',
    trackedDownloadState: 'importPending',
    statusMessages: [],
    downloadId: `download_${Math.random().toString(36).substr(2, 9)}`,
    ...overrides
});

export const createQualityBlockedItem = (): QueueItem =>
    createMockQueueItem({
        statusMessages: [{
            messages: ['upgrade for existing episode']
        }]
    });

export const createArchiveBlockedItem = (): QueueItem =>
    createMockQueueItem({
        statusMessages: [{
            messages: ['Found archive file, might need to be extracted']
        }]
    });

export const createNoFilesBlockedItem = (): QueueItem =>
    createMockQueueItem({
        statusMessages: [{
            messages: ['No files found are eligible for import']
        }]
    });

export const createExecutableBlockedItem = (): QueueItem =>
    createMockQueueItem({
        statusMessages: [{
            messages: ['Caution: Found executable file']
        }]
    });

export const createNotAnUpgradeItem = (): QueueItem =>
    createMockQueueItem({
        statusMessages: [{
            messages: ['Not an upgrade']
        }]
    });

export const createSeriesIdMismatchItem = (overrides: Partial<QueueItem> = {}): QueueItem =>
    createMockQueueItem({
        trackedDownloadState: 'importBlocked',
        statusMessages: [{
            messages: ['Found matching series via grab history, but release was matched to series by ID. Automatic import is not possible. See the FAQ for details.']
        }],
        ...overrides
    });

export const createEpisodeCountMismatchItem = (overrides: Partial<QueueItem> = {}): QueueItem =>
    createMockQueueItem({
        statusMessages: [{
            messages: ['Episode file on disk contains more episodes than this file contains']
        }],
        ...overrides
    });

export const createUndeterminedSampleItem = (overrides: Partial<QueueItem> = {}): QueueItem =>
    createMockQueueItem({
        statusMessages: [{
            messages: ['Unable to determine if file is a sample']
        }],
        ...overrides
    });

export const createPotentiallyDangerousFileItem = (overrides: Partial<QueueItem> = {}): QueueItem =>
    createMockQueueItem({
        statusMessages: [{
            messages: ['Caution: Found potentially dangerous file']
        }],
        ...overrides
    });
