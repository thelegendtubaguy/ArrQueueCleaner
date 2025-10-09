export interface Config {
    sonarr: {
        host: string;
        apiKey: string;
        enabled: boolean;
    };
    rules: {
        removeQualityBlocked: boolean;
        blockRemovedQualityReleases: boolean;
        removeArchiveBlocked: boolean;
        blockRemovedArchiveReleases: boolean;
        removeNoFilesReleases: boolean;
        blockRemovedNoFilesReleases: boolean;
        removeNotAnUpgrade: boolean;
        removeSeriesIdMismatch: boolean;
        blockRemovedSeriesIdMismatchReleases: boolean;
        removeUndeterminedSample: boolean;
        blockRemovedUndeterminedSampleReleases: boolean;
    };
    dryRun: boolean;
    schedule: string;
    logLevel: string;
}

export interface QueueItem {
    id: number;
    title: string;
    status: string;
    trackedDownloadStatus: string;
    trackedDownloadState: string;
    statusMessages: StatusMessage[];
    downloadId?: string;
}

export interface StatusMessage {
    title?: string;
    messages?: string[];
}

export type RuleType = 'quality' | 'archive' | 'noFiles' | 'notAnUpgrade' | 'seriesIdMismatch' | 'undeterminedSample';

export interface RuleMatch {
    type: RuleType;
    shouldBlock: boolean;
}
