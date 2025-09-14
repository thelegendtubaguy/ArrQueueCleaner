import { QueueCleaner } from '../src/cleaner';
import { SonarrClient } from '../src/sonarr';
import { createMockConfig, createMockQueueItem, createQualityBlockedItem, createArchiveBlockedItem, createNoFilesBlockedItem, createSeriesIdMismatchItem } from './test-utils';

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

    describe('cleanQueue', () => {
        it('should not process when sonarr is disabled', async () => {
            const config = createMockConfig({ sonarr: { host: '', enabled: false } });
            const cleaner = new QueueCleaner(config);

            await cleaner.cleanQueue();

            expect(mockSonarrClient.getQueue).not.toHaveBeenCalled();
        });

        it('should skip non-completed items', async () => {
            const config = createMockConfig({ rules: { removeQualityBlocked: true } });
            const cleaner = new QueueCleaner(config);
            const items = [createMockQueueItem({ status: 'downloading' })];

            mockSonarrClient.getQueue.mockResolvedValue(items);

            await cleaner.cleanQueue();

            expect(mockSonarrClient.removeFromQueue).not.toHaveBeenCalled();
            expect(mockSonarrClient.blockRelease).not.toHaveBeenCalled();
        });

        it('should skip items without warning status', async () => {
            const config = createMockConfig({ rules: { removeQualityBlocked: true } });
            const cleaner = new QueueCleaner(config);
            const items = [createMockQueueItem({ trackedDownloadStatus: 'ok' })];

            mockSonarrClient.getQueue.mockResolvedValue(items);

            await cleaner.cleanQueue();

            expect(mockSonarrClient.removeFromQueue).not.toHaveBeenCalled();
            expect(mockSonarrClient.blockRelease).not.toHaveBeenCalled();
        });

        it('should skip items not in importPending state', async () => {
            const config = createMockConfig({ rules: { removeQualityBlocked: true } });
            const cleaner = new QueueCleaner(config);
            const items = [createMockQueueItem({ trackedDownloadState: 'downloading' })];

            mockSonarrClient.getQueue.mockResolvedValue(items);

            await cleaner.cleanQueue();

            expect(mockSonarrClient.removeFromQueue).not.toHaveBeenCalled();
            expect(mockSonarrClient.blockRelease).not.toHaveBeenCalled();
        });

        it('should skip items without status messages', async () => {
            const config = createMockConfig({ rules: { removeQualityBlocked: true } });
            const cleaner = new QueueCleaner(config);
            const items = [createMockQueueItem({ statusMessages: [] })];

            mockSonarrClient.getQueue.mockResolvedValue(items);

            await cleaner.cleanQueue();

            expect(mockSonarrClient.removeFromQueue).not.toHaveBeenCalled();
            expect(mockSonarrClient.blockRelease).not.toHaveBeenCalled();
        });

        describe('quality blocked items', () => {
            it('should remove quality blocked items when enabled', async () => {
                const config = createMockConfig({ rules: { removeQualityBlocked: true } });
                const cleaner = new QueueCleaner(config);
                const items = [createQualityBlockedItem()];

                mockSonarrClient.getQueue.mockResolvedValue(items);

                await cleaner.cleanQueue();

                expect(mockSonarrClient.removeFromQueue).toHaveBeenCalledWith(123);
                expect(mockSonarrClient.blockRelease).not.toHaveBeenCalled();
            });

            it('should block quality blocked items when blocking enabled', async () => {
                const config = createMockConfig({
                    rules: {
                        removeQualityBlocked: true,
                        blockRemovedQualityReleases: true
                    }
                });
                const cleaner = new QueueCleaner(config);
                const items = [createQualityBlockedItem()];

                mockSonarrClient.getQueue.mockResolvedValue(items);

                await cleaner.cleanQueue();

                expect(mockSonarrClient.blockRelease).toHaveBeenCalledWith(123);
                expect(mockSonarrClient.removeFromQueue).not.toHaveBeenCalled();
            });

            it('should skip quality blocked items when disabled', async () => {
                const config = createMockConfig({ rules: { removeQualityBlocked: false } });
                const cleaner = new QueueCleaner(config);
                const items = [createQualityBlockedItem()];

                mockSonarrClient.getQueue.mockResolvedValue(items);

                await cleaner.cleanQueue();

                expect(mockSonarrClient.removeFromQueue).not.toHaveBeenCalled();
                expect(mockSonarrClient.blockRelease).not.toHaveBeenCalled();
            });
        });

        describe('archive blocked items', () => {
            it('should remove archive blocked items when enabled', async () => {
                const config = createMockConfig({ rules: { removeArchiveBlocked: true } });
                const cleaner = new QueueCleaner(config);
                const items = [createArchiveBlockedItem()];

                mockSonarrClient.getQueue.mockResolvedValue(items);

                await cleaner.cleanQueue();

                expect(mockSonarrClient.removeFromQueue).toHaveBeenCalledWith(123);
                expect(mockSonarrClient.blockRelease).not.toHaveBeenCalled();
            });

            it('should block archive blocked items when blocking enabled', async () => {
                const config = createMockConfig({
                    rules: {
                        removeArchiveBlocked: true,
                        blockRemovedArchiveReleases: true
                    }
                });
                const cleaner = new QueueCleaner(config);
                const items = [createArchiveBlockedItem()];

                mockSonarrClient.getQueue.mockResolvedValue(items);

                await cleaner.cleanQueue();

                expect(mockSonarrClient.blockRelease).toHaveBeenCalledWith(123);
                expect(mockSonarrClient.removeFromQueue).not.toHaveBeenCalled();
            });

            it('should skip archive blocked items when disabled', async () => {
                const config = createMockConfig({ rules: { removeArchiveBlocked: false } });
                const cleaner = new QueueCleaner(config);
                const items = [createArchiveBlockedItem()];

                mockSonarrClient.getQueue.mockResolvedValue(items);

                await cleaner.cleanQueue();

                expect(mockSonarrClient.removeFromQueue).not.toHaveBeenCalled();
                expect(mockSonarrClient.blockRelease).not.toHaveBeenCalled();
            });
        });

        describe('no files blocked items', () => {
            it('should remove no files blocked items when enabled', async () => {
                const config = createMockConfig({ rules: { removeNoFilesReleases: true } });
                const cleaner = new QueueCleaner(config);
                const items = [createNoFilesBlockedItem()];

                mockSonarrClient.getQueue.mockResolvedValue(items);

                await cleaner.cleanQueue();

                expect(mockSonarrClient.removeFromQueue).toHaveBeenCalledWith(123);
                expect(mockSonarrClient.blockRelease).not.toHaveBeenCalled();
            });

            it('should block no files blocked items when blocking enabled', async () => {
                const config = createMockConfig({
                    rules: {
                        removeNoFilesReleases: true,
                        blockRemovedNoFilesReleases: true
                    }
                });
                const cleaner = new QueueCleaner(config);
                const items = [createNoFilesBlockedItem()];

                mockSonarrClient.getQueue.mockResolvedValue(items);

                await cleaner.cleanQueue();

                expect(mockSonarrClient.blockRelease).toHaveBeenCalledWith(123);
                expect(mockSonarrClient.removeFromQueue).not.toHaveBeenCalled();
            });

            it('should skip no files blocked items when disabled', async () => {
                const config = createMockConfig({ rules: { removeNoFilesReleases: false } });
                const cleaner = new QueueCleaner(config);
                const items = [createNoFilesBlockedItem()];

                mockSonarrClient.getQueue.mockResolvedValue(items);

                await cleaner.cleanQueue();

                expect(mockSonarrClient.removeFromQueue).not.toHaveBeenCalled();
                expect(mockSonarrClient.blockRelease).not.toHaveBeenCalled();
            });
        });

        it('should process multiple matching items', async () => {
            const config = createMockConfig({
                rules: {
                    removeQualityBlocked: true,
                    removeArchiveBlocked: true,
                    removeNoFilesReleases: true
                }
            });
            const cleaner = new QueueCleaner(config);

            const items = [
                createQualityBlockedItem(),
                createArchiveBlockedItem(),
                createNoFilesBlockedItem(),
                createMockQueueItem({ status: 'downloading' }) // Should be ignored
            ];

            mockSonarrClient.getQueue.mockResolvedValue(items);

            await cleaner.cleanQueue();

            expect(mockSonarrClient.removeFromQueue).toHaveBeenCalledTimes(3);
        });

        it('should handle errors gracefully', async () => {
            const config = createMockConfig({ rules: { removeQualityBlocked: true } });
            const cleaner = new QueueCleaner(config);

            mockSonarrClient.getQueue.mockRejectedValue(new Error('API Error'));

            await cleaner.cleanQueue();

            expect(console.error).toHaveBeenCalledWith('Error cleaning queue:', 'API Error');
        });

        it('should group season pack episodes by downloadId and process only once', async () => {
            const config = createMockConfig({
                rules: { removeSeriesIdMismatch: true }
            });
            const cleaner = new QueueCleaner(config);

            const sharedDownloadId = 'season_pack_download_123';
            const items = [
                createSeriesIdMismatchItem({ 
                    id: 1, 
                    downloadId: sharedDownloadId,
                    title: 'The.Prince.S01.2160p.HMAX.WEB-DL.DDP2.0.H.265-BiOMA'
                }),
                createSeriesIdMismatchItem({ 
                    id: 2, 
                    downloadId: sharedDownloadId,
                    title: 'The.Prince.S01.2160p.HMAX.WEB-DL.DDP2.0.H.265-BiOMA'
                }),
                createSeriesIdMismatchItem({ 
                    id: 3, 
                    downloadId: sharedDownloadId,
                    title: 'The.Prince.S01.2160p.HMAX.WEB-DL.DDP2.0.H.265-BiOMA'
                })
            ];

            mockSonarrClient.getQueue.mockResolvedValue(items);

            await cleaner.cleanQueue();

            // Should only process once despite 3 matching items with same downloadId
            expect(mockSonarrClient.removeFromQueue).toHaveBeenCalledTimes(1);
        });
    });

    describe('configuration combinations', () => {
        const testCases = [
            {
                name: 'all rules disabled',
                config: { removeQualityBlocked: false, removeArchiveBlocked: false, removeNoFilesReleases: false },
                expectProcessed: 0
            },
            {
                name: 'only quality removal enabled',
                config: { removeQualityBlocked: true, removeArchiveBlocked: false, removeNoFilesReleases: false },
                expectProcessed: 1
            },
            {
                name: 'only archive removal enabled',
                config: { removeQualityBlocked: false, removeArchiveBlocked: true, removeNoFilesReleases: false },
                expectProcessed: 1
            },
            {
                name: 'only no files removal enabled',
                config: { removeQualityBlocked: false, removeArchiveBlocked: false, removeNoFilesReleases: true },
                expectProcessed: 1
            },
            {
                name: 'all removals enabled',
                config: { removeQualityBlocked: true, removeArchiveBlocked: true, removeNoFilesReleases: true },
                expectProcessed: 3
            }
        ];

        testCases.forEach(({ name, config: rules, expectProcessed }) => {
            it(`should handle ${name}`, async () => {
                const config = createMockConfig({ rules });
                const cleaner = new QueueCleaner(config);

                const items = [createQualityBlockedItem(), createArchiveBlockedItem(), createNoFilesBlockedItem()];
                mockSonarrClient.getQueue.mockResolvedValue(items);

                await cleaner.cleanQueue();

                expect(mockSonarrClient.removeFromQueue).toHaveBeenCalledTimes(expectProcessed);
            });
        });
    });
});
