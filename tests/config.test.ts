import fs from 'fs';
import os from 'os';
import path from 'path';

jest.mock('dotenv', () => ({ config: jest.fn() }));

const loadConfig = async () => (await import('../src/config')).default;

describe('config', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
        delete process.env.SONARR_INSTANCES;
        delete process.env.SONARR_INSTANCES_FILE;
        delete process.env.SONARR_HOST;
        delete process.env.SONARR_API_KEY;
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

    it('exits when an enabled instance is missing an API key', async () => {
        process.env.SONARR_INSTANCES = JSON.stringify([
            { name: 'Broken', host: 'http://broken:8989' }
        ]);

        const exitMock = jest.spyOn(process, 'exit').mockImplementation((() => {
            throw new Error('process.exit called');
        }) as never);

        await expect(loadConfig()).rejects.toThrow('process.exit called');
        expect(console.error).toHaveBeenCalledWith('Sonarr API key is required for enabled instances: Broken');

        exitMock.mockRestore();
    });
});
