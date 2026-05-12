import fs from 'fs';
import os from 'os';
import path from 'path';

jest.mock('dotenv', () => ({ config: jest.fn() }));

const loadConfig = async () => (await import('../src/config')).default;

const CONFIG_ENV_KEYS = [
    'SONARR_INSTANCES',
    'SONARR_INSTANCES_FILE',
    'SONARR_HOST',
    'SONARR_API_KEY',
    'REMOVE_QUALITY_BLOCKED',
    'BLOCK_REMOVED_QUALITY_RELEASES',
    'REMOVE_ARCHIVE_BLOCKED',
    'BLOCK_REMOVED_ARCHIVE_RELEASES',
    'REMOVE_EXECUTABLE_BLOCKED',
    'REMOVE_NO_FILES_RELEASES',
    'BLOCK_REMOVED_NO_FILES_RELEASES',
    'REMOVE_NOT_AN_UPGRADE',
    'REMOVE_SERIES_ID_MISMATCH',
    'BLOCK_REMOVED_SERIES_ID_MISMATCH_RELEASES',
    'REMOVE_EPISODE_COUNT_MISMATCH',
    'BLOCK_REMOVED_EPISODE_COUNT_MISMATCH_RELEASES',
    'REMOVE_UNDETERMINED_SAMPLE',
    'BLOCK_REMOVED_UNDETERMINED_SAMPLE',
    'BLOCK_REMOVED_UNDETERMIND_SAMPLE',
    'REMOVE_POTENTIALLY_DANGEROUS_FILES',
    'BLOCK_POTENTIALLY_DANGEROUS_FILES',
    'DRY_RUN'
] as const;
const CONFIG_ENV_KEY_SET = new Set<string>(CONFIG_ENV_KEYS);

describe('config', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        jest.resetModules();
        process.env = Object.fromEntries(
            Object.entries(originalEnv).filter(([key]) => !CONFIG_ENV_KEY_SET.has(key))
        );
        jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        process.env = { ...originalEnv };
        jest.restoreAllMocks();
    });

    it('loads multiple Sonarr instances from SONARR_INSTANCES env', async () => {
        process.env.SONARR_INSTANCES = JSON.stringify([
            { name: 'HD Shows', host: 'http://hd-sonarr:8989', apiKey: 'hd-key' },
            { name: 'Anime', host: 'http://anime-sonarr:8989', apiKey: 'anime-key', enabled: false }
        ]);

        const config = await loadConfig();

        expect(config.sonarrInstances).toHaveLength(2);
        expect(config.sonarrInstances[0]).toMatchObject({
            name: 'HD Shows',
            host: 'http://hd-sonarr:8989',
            apiKey: 'hd-key',
            enabled: true
        });
        expect(config.sonarrInstances[1]).toMatchObject({
            name: 'Anime',
            host: 'http://anime-sonarr:8989',
            enabled: false
        });
    });

    it('loads Sonarr instances from SONARR_INSTANCES_FILE', async () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arrqueuecleaner-'));
        const filePath = path.join(tmpDir, 'instances.json');
        fs.writeFileSync(filePath, JSON.stringify([
            { name: '4K Shows', host: 'http://4k-sonarr:8989', apiKey: '4k-key' }
        ]));

        process.env.SONARR_INSTANCES_FILE = filePath;

        try {
            const config = await loadConfig();

            expect(config.sonarrInstances).toHaveLength(1);
            expect(config.sonarrInstances[0]).toMatchObject({
                name: '4K Shows',
                host: 'http://4k-sonarr:8989',
                apiKey: '4k-key',
                enabled: true
            });
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    it('uses an empty SONARR_INSTANCES array instead of legacy environment variables', async () => {
        process.env.SONARR_INSTANCES = '[]';
        process.env.SONARR_HOST = 'http://legacy-sonarr:8989';
        process.env.SONARR_API_KEY = 'legacy-key';

        const config = await loadConfig();

        expect(config.sonarrInstances).toEqual([]);
    });

    it('uses an empty SONARR_INSTANCES_FILE array instead of legacy environment variables', async () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arrqueuecleaner-'));
        const filePath = path.join(tmpDir, 'instances.json');
        fs.writeFileSync(filePath, '[]');

        process.env.SONARR_INSTANCES_FILE = filePath;
        process.env.SONARR_HOST = 'http://legacy-sonarr:8989';
        process.env.SONARR_API_KEY = 'legacy-key';

        try {
            const config = await loadConfig();

            expect(config.sonarrInstances).toEqual([]);
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    it('loads Sonarr instances from YAML file when dependency is available', async () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arrqueuecleaner-'));
        const filePath = path.join(tmpDir, 'instances.yaml');
        const yamlContent = [
            '- name: Anime',
            '  host: http://anime-sonarr:8989',
            '  apiKey: anime-key',
            '  enabled: true'
        ].join('\n');
        fs.writeFileSync(filePath, yamlContent);

        process.env.SONARR_INSTANCES_FILE = filePath;

        try {
            const config = await loadConfig();

            expect(config.sonarrInstances).toHaveLength(1);
            expect(config.sonarrInstances[0]).toMatchObject({
                name: 'Anime',
                host: 'http://anime-sonarr:8989',
                apiKey: 'anime-key',
                enabled: true
            });
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    it('falls back to legacy environment variables when no structured config provided', async () => {
        process.env.SONARR_HOST = 'http://legacy-sonarr:8989';
        process.env.SONARR_API_KEY = 'legacy-key';

        const config = await loadConfig();

        expect(config.sonarrInstances).toHaveLength(1);
        expect(config.sonarrInstances[0]).toMatchObject({
            name: 'Primary Sonarr',
            host: 'http://legacy-sonarr:8989',
            apiKey: 'legacy-key'
        });
    });

    it('loads rule flags from the existing environment variables', async () => {
        process.env.REMOVE_EXECUTABLE_BLOCKED = 'true';
        process.env.REMOVE_QUALITY_BLOCKED = 'true';
        process.env.BLOCK_REMOVED_QUALITY_RELEASES = 'true';

        const config = await loadConfig();

        expect(config.rules).toMatchObject({
            removeExecutableBlocked: true,
            removeQualityBlocked: true,
            blockRemovedQualityReleases: true
        });
    });

    it('loads uppercase and numeric boolean environment values', async () => {
        process.env.REMOVE_EXECUTABLE_BLOCKED = 'TRUE';
        process.env.REMOVE_QUALITY_BLOCKED = '1';
        process.env.BLOCK_REMOVED_QUALITY_RELEASES = 'yes';
        process.env.DRY_RUN = 'on';

        const config = await loadConfig();

        expect(config.rules).toMatchObject({
            removeExecutableBlocked: true,
            removeQualityBlocked: true,
            blockRemovedQualityReleases: true
        });
        expect(config.dryRun).toBe(true);
    });

    it('keeps false-like boolean environment values disabled', async () => {
        process.env.REMOVE_EXECUTABLE_BLOCKED = 'FALSE';
        process.env.REMOVE_QUALITY_BLOCKED = '0';
        process.env.BLOCK_REMOVED_QUALITY_RELEASES = 'no';
        process.env.DRY_RUN = 'off';

        const config = await loadConfig();

        expect(config.rules).toMatchObject({
            removeExecutableBlocked: false,
            removeQualityBlocked: false,
            blockRemovedQualityReleases: false
        });
        expect(config.dryRun).toBe(false);
    });

    it('does not enable top-level booleans for unrecognized non-empty strings', async () => {
        process.env.REMOVE_EXECUTABLE_BLOCKED = 'enabled';
        process.env.REMOVE_QUALITY_BLOCKED = '2';
        process.env.BLOCK_REMOVED_QUALITY_RELEASES = 'block';
        process.env.DRY_RUN = 'sure';

        const config = await loadConfig();

        expect(config.rules).toMatchObject({
            removeExecutableBlocked: false,
            removeQualityBlocked: false,
            blockRemovedQualityReleases: false
        });
        expect(config.dryRun).toBe(false);
    });

    it('coerces structured rule override strings like environment booleans', async () => {
        process.env.SONARR_INSTANCES = JSON.stringify([
            {
                name: 'HD Shows',
                host: 'http://hd-sonarr:8989',
                apiKey: 'hd-key',
                rules: {
                    removeQualityBlocked: 'YES',
                    blockRemovedQualityReleases: '0',
                    removeArchiveBlocked: 'on',
                    blockRemovedArchiveReleases: 'OFF',
                    removeNoFilesReleases: 1,
                    blockRemovedNoFilesReleases: 0,
                    removeExecutableBlocked: 'enabled'
                }
            }
        ]);

        const config = await loadConfig();

        expect(config.sonarrInstances[0].rules).toEqual({
            removeQualityBlocked: true,
            blockRemovedQualityReleases: false,
            removeArchiveBlocked: true,
            blockRemovedArchiveReleases: false,
            removeExecutableBlocked: false,
            removeNoFilesReleases: true,
            blockRemovedNoFilesReleases: false
        });
    });

    it('keeps supporting the legacy misspelled undetermined sample env var', async () => {
        process.env.REMOVE_UNDETERMINED_SAMPLE = 'true';
        process.env.BLOCK_REMOVED_UNDETERMIND_SAMPLE = 'true';

        const config = await loadConfig();

        expect(config.rules).toMatchObject({
            removeUndeterminedSample: true,
            blockRemovedUndeterminedSampleReleases: true
        });
    });

    it('enables potentially dangerous file cleanup and blocklisting by default', async () => {
        const config = await loadConfig();

        expect(config.rules).toMatchObject({
            removePotentiallyDangerousFiles: true,
            blockPotentiallyDangerousFiles: true
        });
    });

    it('allows potentially dangerous file defaults to be disabled by env vars', async () => {
        process.env.REMOVE_POTENTIALLY_DANGEROUS_FILES = 'false';
        process.env.BLOCK_POTENTIALLY_DANGEROUS_FILES = 'false';

        const config = await loadConfig();

        expect(config.rules).toMatchObject({
            removePotentiallyDangerousFiles: false,
            blockPotentiallyDangerousFiles: false
        });
    });

    it('exits when an enabled instance is missing an API key', async () => {
        process.env.SONARR_INSTANCES = JSON.stringify([
            { name: 'Broken', host: 'http://broken:8989' }
        ]);

        const exitMock = jest.spyOn(process, 'exit').mockImplementation((() => {
            throw new Error('process.exit called');
        }) as never);

        await expect(loadConfig()).rejects.toThrow('process.exit called');
        expect(console.error).toHaveBeenCalledWith('Sonarr API key is required for one or more enabled instances. Update your configuration to supply keys for all enabled Sonarr instances.');

        exitMock.mockRestore();
    });
});
