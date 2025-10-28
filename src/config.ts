import fs from 'fs';
import path from 'path';
import { config as dotenvConfig } from 'dotenv';
import { Config, RuleConfig, SonarrInstanceConfig } from './types';

dotenvConfig();

const parseBooleanEnv = (key: string): boolean => process.env[key] === 'true';

const rulesFromEnv: RuleConfig = {
    removeQualityBlocked: parseBooleanEnv('REMOVE_QUALITY_BLOCKED'),
    blockRemovedQualityReleases: parseBooleanEnv('BLOCK_REMOVED_QUALITY_RELEASES'),
    removeArchiveBlocked: parseBooleanEnv('REMOVE_ARCHIVE_BLOCKED'),
    blockRemovedArchiveReleases: parseBooleanEnv('BLOCK_REMOVED_ARCHIVE_RELEASES'),
    removeNoFilesReleases: parseBooleanEnv('REMOVE_NO_FILES_RELEASES'),
    blockRemovedNoFilesReleases: parseBooleanEnv('BLOCK_REMOVED_NO_FILES_RELEASES'),
    removeNotAnUpgrade: parseBooleanEnv('REMOVE_NOT_AN_UPGRADE'),
    removeSeriesIdMismatch: parseBooleanEnv('REMOVE_SERIES_ID_MISMATCH'),
    blockRemovedSeriesIdMismatchReleases: parseBooleanEnv('BLOCK_REMOVED_SERIES_ID_MISMATCH_RELEASES'),
    removeUndeterminedSample: parseBooleanEnv('REMOVE_UNDETERMINED_SAMPLE'),
    blockRemovedUndeterminedSampleReleases: parseBooleanEnv('BLOCK_REMOVED_UNDETERMIND_SAMPLE')
};

const config: Config = {
    sonarrInstances: resolveSonarrInstances(),
    rules: rulesFromEnv,
    dryRun: parseBooleanEnv('DRY_RUN'),
    schedule: process.env.SCHEDULE || '*/5 * * * *',
    logLevel: process.env.LOG_LEVEL || 'info'
};

validateInstances(config.sonarrInstances);

export default config;

function resolveSonarrInstances(): SonarrInstanceConfig[] {
    try {
        const instancesFromEnv = loadInstancesFromEnv();
        if (instancesFromEnv?.length) {
            return instancesFromEnv;
        }

        const instancesFromFile = loadInstancesFromFile();
        if (instancesFromFile?.length) {
            return instancesFromFile;
        }

        return loadLegacyInstance();
    } catch (error) {
        console.error((error as Error).message);
        process.exit(1);
        return [];
    }
}

function loadInstancesFromEnv(): SonarrInstanceConfig[] | undefined {
    const raw = process.env.SONARR_INSTANCES;
    if (!raw || !raw.trim()) {
        return undefined;
    }

    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            throw new Error('SONARR_INSTANCES must be a JSON array');
        }

        return parsed.map((instance, index) => normalizeInstance(instance, index));
    } catch (error) {
        throw new Error(`Failed to parse SONARR_INSTANCES: ${(error as Error).message}`);
    }
}

function loadInstancesFromFile(): SonarrInstanceConfig[] | undefined {
    const filePath = process.env.SONARR_INSTANCES_FILE;
    if (!filePath || !filePath.trim()) {
        return undefined;
    }

    const resolvedPath = path.resolve(filePath);
    if (!fs.existsSync(resolvedPath)) {
        throw new Error(`SONARR_INSTANCES_FILE not found at ${resolvedPath}`);
    }

    const fileContents = fs.readFileSync(resolvedPath, 'utf8');
    const extension = path.extname(resolvedPath).toLowerCase();

    let parsed: unknown;
    try {
        if (extension === '.yaml' || extension === '.yml') {
            parsed = parseYaml(fileContents);
        } else {
            parsed = JSON.parse(fileContents);
        }
    } catch (error) {
        throw new Error(`Failed to parse ${resolvedPath}: ${(error as Error).message}`);
    }

    if (!Array.isArray(parsed)) {
        throw new Error('SONARR_INSTANCES_FILE must define a JSON/YAML array of instances');
    }

    return parsed.map((instance, index) => normalizeInstance(instance, index));
}

function parseYaml(contents: string): unknown {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
        const yaml = require('yaml') as { parse: (input: string) => unknown };
        return yaml.parse(contents);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'MODULE_NOT_FOUND') {
            throw new Error('Parsing YAML requires the optional "yaml" dependency. Install it or provide JSON.');
        }
        throw error;
    }
}

function loadLegacyInstance(): SonarrInstanceConfig[] {
    const host = process.env.SONARR_HOST?.trim() || 'http://localhost:8989';
    const hostProvided = !!(process.env.SONARR_HOST && process.env.SONARR_HOST.trim() !== '');

    return [{
        name: 'Primary Sonarr',
        host,
        apiKey: process.env.SONARR_API_KEY?.trim() || '',
        enabled: hostProvided
    }];
}

function normalizeInstance(instance: unknown, index: number): SonarrInstanceConfig {
    if (!instance || typeof instance !== 'object') {
        throw new Error(`Sonarr instance at index ${index} must be an object`);
    }

    const data = instance as Record<string, unknown>;

    const host = typeof data.host === 'string' && data.host.trim() ? data.host.trim() : '';
    if (!host) {
        throw new Error(`Sonarr instance at index ${index} is missing a host value`);
    }

    const enabledRaw = data.enabled;
    const enabled = enabledRaw === undefined ? true : coerceBoolean(enabledRaw);

    const apiKey = typeof data.apiKey === 'string' ? data.apiKey.trim() : '';
    const name = typeof data.name === 'string' && data.name.trim()
        ? data.name.trim()
        : `Sonarr ${index + 1}`;

    const rules = normalizeRuleOverrides(data.rules);

    return {
        name,
        host,
        apiKey,
        enabled,
        ...(rules ? { rules } : {})
    };
}

function normalizeRuleOverrides(overrides: unknown): Partial<RuleConfig> | undefined {
    if (!overrides || typeof overrides !== 'object') {
        return undefined;
    }

    const result: Partial<RuleConfig> = {};
    const keys = Object.keys(rulesFromEnv) as (keyof RuleConfig)[];

    for (const key of keys) {
        const value = (overrides as Record<string, unknown>)[key];
        if (value !== undefined) {
            result[key] = coerceBoolean(value);
        }
    }

    return Object.keys(result).length > 0 ? result : undefined;
}

function coerceBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
            return true;
        }
        if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
            return false;
        }
    }

    if (typeof value === 'number') {
        return value !== 0;
    }

    return Boolean(value);
}

function validateInstances(instances: SonarrInstanceConfig[]): void {
    const missingApiKey = instances.filter(instance => instance.enabled && !instance.apiKey);

    if (missingApiKey.length > 0) {
        console.error('Sonarr API key is required for one or more enabled instances. Update your configuration to supply keys for all enabled Sonarr instances.');
        process.exit(1);
    }
}
