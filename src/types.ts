export interface RuleConfig {
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
}

export interface SonarrInstanceConfig {
    name: string;
    host: string;
    apiKey: string;
    enabled: boolean;
    rules?: Partial<RuleConfig>;
}

export interface Config {
    sonarrInstances: SonarrInstanceConfig[];
    rules: RuleConfig;
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
