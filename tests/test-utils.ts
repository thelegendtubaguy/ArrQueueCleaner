import { Config, QueueItem } from '../src/types';

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export const createMockConfig = (overrides: DeepPartial<Config> = {}): Config => ({
  sonarr: {
    host: 'http://localhost:8989',
    apiKey: 'test-api-key',
    enabled: true,
    ...overrides.sonarr
  },
  rules: {
    removeQualityBlocked: false,
    blockRemovedQualityReleases: false,
    removeArchiveBlocked: false,
    blockRemovedArchiveReleases: false,
    ...overrides.rules
  },
  schedule: overrides.schedule || '*/5 * * * *',
  logLevel: overrides.logLevel || 'info'
});

export const createMockQueueItem = (overrides: Partial<QueueItem> = {}): QueueItem => ({
  id: 123,
  title: 'Test.Show.S01E01',
  status: 'completed',
  trackedDownloadStatus: 'warning',
  trackedDownloadState: 'importPending',
  statusMessages: [],
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
