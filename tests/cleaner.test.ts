import { QueueCleaner } from '../src/cleaner';
import { SonarrClient } from '../src/sonarr';
import { createMockConfig, createMockQueueItem, createQualityBlockedItem, createArchiveBlockedItem } from './test-utils';

jest.mock('../src/sonarr');
const MockedSonarrClient = SonarrClient as jest.MockedClass<typeof SonarrClient>;

describe('QueueCleaner', () => {
  let mockSonarrClient: jest.Mocked<SonarrClient>;

  beforeEach(() => {
    mockSonarrClient = {
      getQueue: jest.fn(),
      removeFromQueue: jest.fn(),
      blockRelease: jest.fn()
    } as any;
    MockedSonarrClient.mockImplementation(() => mockSonarrClient);
    
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('shouldRemoveItem', () => {
    it('should return false for non-completed items', () => {
      const config = createMockConfig({ rules: { removeQualityBlocked: true } });
      const cleaner = new QueueCleaner(config);
      const item = createMockQueueItem({ status: 'downloading' });

      expect(cleaner.shouldRemoveItem(item)).toBe(false);
    });

    it('should return false for items without warning status', () => {
      const config = createMockConfig({ rules: { removeQualityBlocked: true } });
      const cleaner = new QueueCleaner(config);
      const item = createMockQueueItem({ trackedDownloadStatus: 'ok' });

      expect(cleaner.shouldRemoveItem(item)).toBe(false);
    });

    it('should return false for items not in importPending state', () => {
      const config = createMockConfig({ rules: { removeQualityBlocked: true } });
      const cleaner = new QueueCleaner(config);
      const item = createMockQueueItem({ trackedDownloadState: 'downloading' });

      expect(cleaner.shouldRemoveItem(item)).toBe(false);
    });

    it('should return false for items without status messages', () => {
      const config = createMockConfig({ rules: { removeQualityBlocked: true } });
      const cleaner = new QueueCleaner(config);
      const item = createMockQueueItem({ statusMessages: [] });

      expect(cleaner.shouldRemoveItem(item)).toBe(false);
    });

    describe('quality blocked items', () => {
      it('should return true when removeQualityBlocked is enabled and item has quality issue', () => {
        const config = createMockConfig({ rules: { removeQualityBlocked: true } });
        const cleaner = new QueueCleaner(config);
        const item = createQualityBlockedItem();

        expect(cleaner.shouldRemoveItem(item)).toBe(true);
      });

      it('should return false when removeQualityBlocked is disabled', () => {
        const config = createMockConfig({ rules: { removeQualityBlocked: false } });
        const cleaner = new QueueCleaner(config);
        const item = createQualityBlockedItem();

        expect(cleaner.shouldRemoveItem(item)).toBe(false);
      });
    });

    describe('archive blocked items', () => {
      it('should return true when removeArchiveBlocked is enabled and item has archive issue', () => {
        const config = createMockConfig({ rules: { removeArchiveBlocked: true } });
        const cleaner = new QueueCleaner(config);
        const item = createArchiveBlockedItem();

        expect(cleaner.shouldRemoveItem(item)).toBe(true);
      });

      it('should return false when removeArchiveBlocked is disabled', () => {
        const config = createMockConfig({ rules: { removeArchiveBlocked: false } });
        const cleaner = new QueueCleaner(config);
        const item = createArchiveBlockedItem();

        expect(cleaner.shouldRemoveItem(item)).toBe(false);
      });
    });
  });

  describe('processItem', () => {
    describe('quality blocked items', () => {
      it('should remove without blocking when blockRemovedQualityReleases is false', async () => {
        const config = createMockConfig({ 
          rules: { 
            removeQualityBlocked: true,
            blockRemovedQualityReleases: false 
          } 
        });
        const cleaner = new QueueCleaner(config);
        const item = createQualityBlockedItem();

        await cleaner.processItem(item);

        expect(mockSonarrClient.removeFromQueue).toHaveBeenCalledWith(123);
        expect(mockSonarrClient.blockRelease).not.toHaveBeenCalled();
      });

      it('should block when blockRemovedQualityReleases is true', async () => {
        const config = createMockConfig({ 
          rules: { 
            removeQualityBlocked: true,
            blockRemovedQualityReleases: true 
          } 
        });
        const cleaner = new QueueCleaner(config);
        const item = createQualityBlockedItem();

        await cleaner.processItem(item);

        expect(mockSonarrClient.blockRelease).toHaveBeenCalledWith(123);
        expect(mockSonarrClient.removeFromQueue).not.toHaveBeenCalled();
      });
    });

    describe('archive blocked items', () => {
      it('should remove without blocking when blockRemovedArchiveReleases is false', async () => {
        const config = createMockConfig({ 
          rules: { 
            removeArchiveBlocked: true,
            blockRemovedArchiveReleases: false 
          } 
        });
        const cleaner = new QueueCleaner(config);
        const item = createArchiveBlockedItem();

        await cleaner.processItem(item);

        expect(mockSonarrClient.removeFromQueue).toHaveBeenCalledWith(123);
        expect(mockSonarrClient.blockRelease).not.toHaveBeenCalled();
      });

      it('should block when blockRemovedArchiveReleases is true', async () => {
        const config = createMockConfig({ 
          rules: { 
            removeArchiveBlocked: true,
            blockRemovedArchiveReleases: true 
          } 
        });
        const cleaner = new QueueCleaner(config);
        const item = createArchiveBlockedItem();

        await cleaner.processItem(item);

        expect(mockSonarrClient.blockRelease).toHaveBeenCalledWith(123);
        expect(mockSonarrClient.removeFromQueue).not.toHaveBeenCalled();
      });
    });
  });

  describe('cleanQueue', () => {
    it('should not process when sonarr host is empty', async () => {
      const config = createMockConfig({ sonarr: { host: '', enabled: false } });
      const cleaner = new QueueCleaner(config);

      await cleaner.cleanQueue();

      expect(mockSonarrClient.getQueue).not.toHaveBeenCalled();
    });

    it('should process all matching items', async () => {
      const config = createMockConfig({ 
        rules: { 
          removeQualityBlocked: true,
          removeArchiveBlocked: true 
        } 
      });
      const cleaner = new QueueCleaner(config);
      
      const items = [
        createQualityBlockedItem(),
        createArchiveBlockedItem(),
        createMockQueueItem({ status: 'downloading' }) // Should be ignored
      ];
      
      mockSonarrClient.getQueue.mockResolvedValue(items);

      await cleaner.cleanQueue();

      expect(mockSonarrClient.removeFromQueue).toHaveBeenCalledTimes(2);
    });

    it('should handle errors gracefully', async () => {
      const config = createMockConfig({ rules: { removeQualityBlocked: true } });
      const cleaner = new QueueCleaner(config);
      
      mockSonarrClient.getQueue.mockRejectedValue(new Error('API Error'));

      await cleaner.cleanQueue();

      expect(console.error).toHaveBeenCalledWith('Error cleaning queue:', 'API Error');
    });
  });

  describe('configuration combinations', () => {
    const testCases = [
      {
        name: 'all rules disabled',
        config: { removeQualityBlocked: false, removeArchiveBlocked: false },
        expectProcessed: 0
      },
      {
        name: 'only quality removal enabled',
        config: { removeQualityBlocked: true, removeArchiveBlocked: false },
        expectProcessed: 1
      },
      {
        name: 'only archive removal enabled',
        config: { removeQualityBlocked: false, removeArchiveBlocked: true },
        expectProcessed: 1
      },
      {
        name: 'both removals enabled',
        config: { removeQualityBlocked: true, removeArchiveBlocked: true },
        expectProcessed: 2
      }
    ];

    testCases.forEach(({ name, config: rules, expectProcessed }) => {
      it(`should handle ${name}`, async () => {
        const config = createMockConfig({ rules });
        const cleaner = new QueueCleaner(config);
        
        const items = [createQualityBlockedItem(), createArchiveBlockedItem()];
        mockSonarrClient.getQueue.mockResolvedValue(items);

        await cleaner.cleanQueue();

        expect(mockSonarrClient.removeFromQueue).toHaveBeenCalledTimes(expectProcessed);
      });
    });
  });
});
