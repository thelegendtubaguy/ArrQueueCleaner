import { QueueCleaner, QueueCleanerOptions } from '../src/cleaner';
import { SonarrClient } from '../src/sonarr';
import { createMockInstance, createRuleConfig, createMockQueueItem, createQualityBlockedItem, createArchiveBlockedItem, createExecutableBlockedItem, createNoFilesBlockedItem, createNotAnUpgradeItem, createSeriesIdMismatchItem, createEpisodeCountMismatchItem, createUndeterminedSampleItem } from './test-utils';

jest.mock('../src/sonarr');
const MockedSonarrClient = SonarrClient as jest.MockedClass<typeof SonarrClient>;

describe('QueueCleaner', () => {
    let mockSonarrClient: jest.Mocked<SonarrClient>;

    const createCleaner = (overrides: Partial<QueueCleanerOptions> = {}): QueueCleaner => new QueueCleaner({
        instance: overrides.instance ?? createMockInstance(),
        rules: overrides.rules ?? createRuleConfig(),
        dryRun: overrides.dryRun ?? false,
        logLevel: overrides.logLevel ?? 'info'
    });

    beforeEach(() => {
        mockSonarrClient = {
            getQueue: jest.fn(),
            removeFromQueue: jest.fn(),
            blockRelease: jest.fn()
        } as any;
        MockedSonarrClient.mockImplementation(() => mockSonarrClient);

        jest.spyOn(console, 'log').mockImplementation();
        jest.spyOn(console, 'warn').mockImplementation();
        jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('cleanQueue', () => {
        it('should not process when sonarr is disabled', async () => {
            const cleaner = createCleaner({
                instance: createMockInstance({ enabled: false })
            });

            await cleaner.cleanQueue();

            expect(mockSonarrClient.getQueue).not.toHaveBeenCalled();
        });

        it('should skip non-completed items', async () => {
            const cleaner = createCleaner({
                rules: createRuleConfig({ removeQualityBlocked: true })
            });
            const items = [createMockQueueItem({ status: 'downloading' })];

            mockSonarrClient.getQueue.mockResolvedValue(items);

            await cleaner.cleanQueue();

            expect(mockSonarrClient.removeFromQueue).not.toHaveBeenCalled();
            expect(mockSonarrClient.blockRelease).not.toHaveBeenCalled();
        });

        it('should skip items without warning status', async () => {
            const cleaner = createCleaner({
                rules: createRuleConfig({ removeQualityBlocked: true })
            });
            const items = [createMockQueueItem({ trackedDownloadStatus: 'ok' })];

            mockSonarrClient.getQueue.mockResolvedValue(items);

            await cleaner.cleanQueue();

            expect(mockSonarrClient.removeFromQueue).not.toHaveBeenCalled();
            expect(mockSonarrClient.blockRelease).not.toHaveBeenCalled();
        });

        it('should skip items not in importPending state', async () => {
            const cleaner = createCleaner({
                rules: createRuleConfig({ removeQualityBlocked: true })
            });
            const items = [createMockQueueItem({ trackedDownloadState: 'downloading' })];

            mockSonarrClient.getQueue.mockResolvedValue(items);

            await cleaner.cleanQueue();

            expect(mockSonarrClient.removeFromQueue).not.toHaveBeenCalled();
            expect(mockSonarrClient.blockRelease).not.toHaveBeenCalled();
        });

        it('should skip items without status messages', async () => {
            const cleaner = createCleaner({
                rules: createRuleConfig({ removeQualityBlocked: true })
            });
            const items = [createMockQueueItem({ statusMessages: [] })];

            mockSonarrClient.getQueue.mockResolvedValue(items);

            await cleaner.cleanQueue();

            expect(mockSonarrClient.removeFromQueue).not.toHaveBeenCalled();
            expect(mockSonarrClient.blockRelease).not.toHaveBeenCalled();
        });

        describe('quality blocked items', () => {
            it('should remove quality blocked items when enabled', async () => {
                const cleaner = createCleaner({
                    rules: createRuleConfig({ removeQualityBlocked: true })
                });
                const items = [createQualityBlockedItem()];

                mockSonarrClient.getQueue.mockResolvedValue(items);

                await cleaner.cleanQueue();

                expect(mockSonarrClient.removeFromQueue).toHaveBeenCalledWith(123);
                expect(mockSonarrClient.blockRelease).not.toHaveBeenCalled();
            });

            it('should block quality blocked items when blocking enabled', async () => {
                const cleaner = createCleaner({
                    rules: createRuleConfig({
                        removeQualityBlocked: true,
                        blockRemovedQualityReleases: true
                    })
                });
                const items = [createQualityBlockedItem()];

                mockSonarrClient.getQueue.mockResolvedValue(items);

                await cleaner.cleanQueue();

                expect(mockSonarrClient.blockRelease).toHaveBeenCalledWith(123);
                expect(mockSonarrClient.removeFromQueue).not.toHaveBeenCalled();
            });

            it('should skip quality blocked items when disabled', async () => {
                const cleaner = createCleaner({
                    rules: createRuleConfig({ removeQualityBlocked: false })
                });
                const items = [createQualityBlockedItem()];

                mockSonarrClient.getQueue.mockResolvedValue(items);

                await cleaner.cleanQueue();

                expect(mockSonarrClient.removeFromQueue).not.toHaveBeenCalled();
                expect(mockSonarrClient.blockRelease).not.toHaveBeenCalled();
            });
        });

        describe('archive blocked items', () => {
            it('should remove archive blocked items when enabled', async () => {
                const cleaner = createCleaner({
                    rules: createRuleConfig({ removeArchiveBlocked: true })
                });
                const items = [createArchiveBlockedItem()];

                mockSonarrClient.getQueue.mockResolvedValue(items);

                await cleaner.cleanQueue();

                expect(mockSonarrClient.removeFromQueue).toHaveBeenCalledWith(123);
                expect(mockSonarrClient.blockRelease).not.toHaveBeenCalled();
            });

            it('should block archive blocked items when blocking enabled', async () => {
                const cleaner = createCleaner({
                    rules: createRuleConfig({
                        removeArchiveBlocked: true,
                        blockRemovedArchiveReleases: true
                    })
                });
                const items = [createArchiveBlockedItem()];

                mockSonarrClient.getQueue.mockResolvedValue(items);

                await cleaner.cleanQueue();

                expect(mockSonarrClient.blockRelease).toHaveBeenCalledWith(123);
                expect(mockSonarrClient.removeFromQueue).not.toHaveBeenCalled();
            });

            it('should skip archive blocked items when disabled', async () => {
                const cleaner = createCleaner({
                    rules: createRuleConfig({ removeArchiveBlocked: false })
                });
                const items = [createArchiveBlockedItem()];

                mockSonarrClient.getQueue.mockResolvedValue(items);

                await cleaner.cleanQueue();

                expect(mockSonarrClient.removeFromQueue).not.toHaveBeenCalled();
                expect(mockSonarrClient.blockRelease).not.toHaveBeenCalled();
            });
        });

        describe('no files blocked items', () => {
            it('should remove no files blocked items when enabled', async () => {
                const cleaner = createCleaner({
                    rules: createRuleConfig({ removeNoFilesReleases: true })
                });
                const items = [createNoFilesBlockedItem()];

                mockSonarrClient.getQueue.mockResolvedValue(items);

                await cleaner.cleanQueue();

                expect(mockSonarrClient.removeFromQueue).toHaveBeenCalledWith(123);
                expect(mockSonarrClient.blockRelease).not.toHaveBeenCalled();
            });

            it('should block no files blocked items when blocking enabled', async () => {
                const cleaner = createCleaner({
                    rules: createRuleConfig({
                        removeNoFilesReleases: true,
                        blockRemovedNoFilesReleases: true
                    })
                });
                const items = [createNoFilesBlockedItem()];

                mockSonarrClient.getQueue.mockResolvedValue(items);

                await cleaner.cleanQueue();

                expect(mockSonarrClient.blockRelease).toHaveBeenCalledWith(123);
                expect(mockSonarrClient.removeFromQueue).not.toHaveBeenCalled();
            });

            it('should skip no files blocked items when disabled', async () => {
                const cleaner = createCleaner({
                    rules: createRuleConfig({ removeNoFilesReleases: false })
                });
                const items = [createNoFilesBlockedItem()];

                mockSonarrClient.getQueue.mockResolvedValue(items);

                await cleaner.cleanQueue();

                expect(mockSonarrClient.removeFromQueue).not.toHaveBeenCalled();
                expect(mockSonarrClient.blockRelease).not.toHaveBeenCalled();
            });
        });

        describe('executable blocked items', () => {
            it('should block executable blocked items when enabled', async () => {
                const cleaner = createCleaner({
                    rules: createRuleConfig({ removeExecutableBlocked: true })
                });
                const items = [createExecutableBlockedItem()];

                mockSonarrClient.getQueue.mockResolvedValue(items);

                await cleaner.cleanQueue();

                expect(mockSonarrClient.blockRelease).toHaveBeenCalledWith(123);
                expect(mockSonarrClient.removeFromQueue).not.toHaveBeenCalled();
            });

            it('should skip executable blocked items when disabled', async () => {
                const cleaner = createCleaner({
                    rules: createRuleConfig({ removeExecutableBlocked: false })
                });
                const items = [createExecutableBlockedItem()];

                mockSonarrClient.getQueue.mockResolvedValue(items);

                await cleaner.cleanQueue();

                expect(mockSonarrClient.blockRelease).not.toHaveBeenCalled();
                expect(mockSonarrClient.removeFromQueue).not.toHaveBeenCalled();
            });
        });

        describe('not an upgrade items', () => {
            it('should remove not an upgrade items when enabled', async () => {
                const cleaner = createCleaner({
                    rules: createRuleConfig({ removeNotAnUpgrade: true })
                });
                const items = [createNotAnUpgradeItem()];

                mockSonarrClient.getQueue.mockResolvedValue(items);

                await cleaner.cleanQueue();

                expect(mockSonarrClient.removeFromQueue).toHaveBeenCalledWith(123);
                expect(mockSonarrClient.blockRelease).not.toHaveBeenCalled();
            });

            it('should skip not an upgrade items when disabled', async () => {
                const cleaner = createCleaner({
                    rules: createRuleConfig({ removeNotAnUpgrade: false })
                });
                const items = [createNotAnUpgradeItem()];

                mockSonarrClient.getQueue.mockResolvedValue(items);

                await cleaner.cleanQueue();

                expect(mockSonarrClient.removeFromQueue).not.toHaveBeenCalled();
                expect(mockSonarrClient.blockRelease).not.toHaveBeenCalled();
            });
        });

        describe('episode count mismatch items', () => {
            it('should remove episode count mismatch items when enabled', async () => {
                const cleaner = createCleaner({
                    rules: createRuleConfig({ removeEpisodeCountMismatch: true })
                });
                const items = [createEpisodeCountMismatchItem()];

                mockSonarrClient.getQueue.mockResolvedValue(items);

                await cleaner.cleanQueue();

                expect(mockSonarrClient.removeFromQueue).toHaveBeenCalledWith(123);
                expect(mockSonarrClient.blockRelease).not.toHaveBeenCalled();
            });

            it('should block episode count mismatch items when blocking enabled', async () => {
                const cleaner = createCleaner({
                    rules: createRuleConfig({
                        removeEpisodeCountMismatch: true,
                        blockRemovedEpisodeCountMismatchReleases: true
                    })
                });
                const items = [createEpisodeCountMismatchItem()];

                mockSonarrClient.getQueue.mockResolvedValue(items);

                await cleaner.cleanQueue();

                expect(mockSonarrClient.blockRelease).toHaveBeenCalledWith(123);
                expect(mockSonarrClient.removeFromQueue).not.toHaveBeenCalled();
            });

            it('should skip episode count mismatch items when disabled', async () => {
                const cleaner = createCleaner({
                    rules: createRuleConfig({ removeEpisodeCountMismatch: false })
                });
                const items = [createEpisodeCountMismatchItem()];

                mockSonarrClient.getQueue.mockResolvedValue(items);

                await cleaner.cleanQueue();

                expect(mockSonarrClient.removeFromQueue).not.toHaveBeenCalled();
                expect(mockSonarrClient.blockRelease).not.toHaveBeenCalled();
            });
        });

        it('should process multiple matching items', async () => {
            const cleaner = createCleaner({
                rules: createRuleConfig({
                    removeQualityBlocked: true,
                    removeArchiveBlocked: true,
                    removeNoFilesReleases: true
                })
            });

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
            const cleaner = createCleaner({
                rules: createRuleConfig({ removeQualityBlocked: true })
            });

            mockSonarrClient.getQueue.mockRejectedValue(new Error('API Error'));

            await cleaner.cleanQueue();

            expect(console.error).toHaveBeenCalledWith('[ERROR] [Test Sonarr] Error cleaning queue: "API Error"');
        });

        it('should group season pack episodes by downloadId and process only once', async () => {
            const cleaner = createCleaner({
                rules: createRuleConfig({ removeSeriesIdMismatch: true })
            });

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

        it('should block a grouped download when any same-downloadId item matches a force-block rule', async () => {
            const cleaner = createCleaner({
                rules: createRuleConfig({
                    removeQualityBlocked: true,
                    removeExecutableBlocked: true
                })
            });

            const sharedDownloadId = 'mixed_rule_download_123';
            const items = [
                createMockQueueItem({
                    id: 1,
                    downloadId: sharedDownloadId,
                    statusMessages: [{ messages: ['upgrade for existing episode'] }]
                }),
                createMockQueueItem({
                    id: 2,
                    downloadId: sharedDownloadId,
                    statusMessages: [{ messages: ['Caution: Found executable file'] }]
                })
            ];

            mockSonarrClient.getQueue.mockResolvedValue(items);

            await cleaner.cleanQueue();

            expect(mockSonarrClient.blockRelease).toHaveBeenCalledTimes(1);
            expect(mockSonarrClient.blockRelease).toHaveBeenCalledWith(1);
            expect(mockSonarrClient.removeFromQueue).not.toHaveBeenCalled();
        });

        it('should block a grouped download when the first same-downloadId item has a later force-block match', async () => {
            const cleaner = createCleaner({
                rules: createRuleConfig({
                    removeQualityBlocked: true,
                    removeExecutableBlocked: true
                })
            });

            const sharedDownloadId = 'mixed_first_item_download_123';
            const items = [
                createMockQueueItem({
                    id: 1,
                    downloadId: sharedDownloadId,
                    statusMessages: [{
                        messages: [
                            'upgrade for existing episode',
                            'Caution: Found executable file'
                        ]
                    }]
                }),
                createMockQueueItem({
                    id: 2,
                    downloadId: sharedDownloadId,
                    statusMessages: [{ messages: ['upgrade for existing episode'] }]
                })
            ];

            mockSonarrClient.getQueue.mockResolvedValue(items);

            await cleaner.cleanQueue();

            expect(mockSonarrClient.blockRelease).toHaveBeenCalledTimes(1);
            expect(mockSonarrClient.blockRelease).toHaveBeenCalledWith(1);
            expect(mockSonarrClient.removeFromQueue).not.toHaveBeenCalled();
        });

        it('should block a grouped download when any same-downloadId item matches a block-enabled rule', async () => {
            const cleaner = createCleaner({
                rules: createRuleConfig({
                    removeNotAnUpgrade: true,
                    removeArchiveBlocked: true,
                    blockRemovedArchiveReleases: true
                })
            });

            const sharedDownloadId = 'mixed_block_enabled_download_123';
            const items = [
                createMockQueueItem({
                    id: 1,
                    downloadId: sharedDownloadId,
                    statusMessages: [{ messages: ['Not an upgrade'] }]
                }),
                createMockQueueItem({
                    id: 2,
                    downloadId: sharedDownloadId,
                    statusMessages: [{ messages: ['Found archive file, might need to be extracted'] }]
                })
            ];

            mockSonarrClient.getQueue.mockResolvedValue(items);

            await cleaner.cleanQueue();

            expect(mockSonarrClient.blockRelease).toHaveBeenCalledTimes(1);
            expect(mockSonarrClient.blockRelease).toHaveBeenCalledWith(1);
            expect(mockSonarrClient.removeFromQueue).not.toHaveBeenCalled();
        });

        it('should remove undetermined sample items when enabled', async () => {
            const cleaner = createCleaner({
                rules: createRuleConfig({ removeUndeterminedSample: true })
            });
            const items = [createUndeterminedSampleItem()];

            mockSonarrClient.getQueue.mockResolvedValue(items);

            await cleaner.cleanQueue();

            expect(mockSonarrClient.removeFromQueue).toHaveBeenCalledWith(123);
        });

        it('should block undetermined sample items when configured', async () => {
            const cleaner = createCleaner({
                rules: createRuleConfig({
                    removeUndeterminedSample: true,
                    blockRemovedUndeterminedSampleReleases: true
                })
            });
            const items = [createUndeterminedSampleItem()];

            mockSonarrClient.getQueue.mockResolvedValue(items);

            await cleaner.cleanQueue();

            expect(mockSonarrClient.blockRelease).toHaveBeenCalledWith(123);
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
                const cleaner = createCleaner({
                    rules: createRuleConfig(rules)
                });

                const items = [createQualityBlockedItem(), createArchiveBlockedItem(), createNoFilesBlockedItem()];
                mockSonarrClient.getQueue.mockResolvedValue(items);

                await cleaner.cleanQueue();

                expect(mockSonarrClient.removeFromQueue).toHaveBeenCalledTimes(expectProcessed);
            });
        });
    });
});
