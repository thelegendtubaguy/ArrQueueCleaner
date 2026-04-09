import { RuleConfig, RuleType } from './types';

export interface RuleDefinition {
    type: RuleType;
    enabledKey: keyof RuleConfig;
    enabledEnv: string;
    blockKey?: keyof RuleConfig;
    blockEnv?: string | readonly string[];
    forceBlock?: boolean;
    matches: (message: string) => boolean;
}

const includesMessage = (fragment: string) => (message: string): boolean => message.includes(fragment);

export const DEFAULT_RULE_CONFIG: RuleConfig = {
    removeQualityBlocked: false,
    blockRemovedQualityReleases: false,
    removeArchiveBlocked: false,
    blockRemovedArchiveReleases: false,
    removeExecutableBlocked: false,
    removeNoFilesReleases: false,
    blockRemovedNoFilesReleases: false,
    removeNotAnUpgrade: false,
    removeSeriesIdMismatch: false,
    blockRemovedSeriesIdMismatchReleases: false,
    removeEpisodeCountMismatch: false,
    blockRemovedEpisodeCountMismatchReleases: false,
    removeUndeterminedSample: false,
    blockRemovedUndeterminedSampleReleases: false
};

export const RULE_DEFINITIONS: readonly RuleDefinition[] = [
    {
        type: 'quality',
        enabledKey: 'removeQualityBlocked',
        enabledEnv: 'REMOVE_QUALITY_BLOCKED',
        blockKey: 'blockRemovedQualityReleases',
        blockEnv: 'BLOCK_REMOVED_QUALITY_RELEASES',
        matches: includesMessage('upgrade for existing episode')
    },
    {
        type: 'archive',
        enabledKey: 'removeArchiveBlocked',
        enabledEnv: 'REMOVE_ARCHIVE_BLOCKED',
        blockKey: 'blockRemovedArchiveReleases',
        blockEnv: 'BLOCK_REMOVED_ARCHIVE_RELEASES',
        matches: includesMessage('archive file')
    },
    {
        type: 'executable',
        enabledKey: 'removeExecutableBlocked',
        enabledEnv: 'REMOVE_EXECUTABLE_BLOCKED',
        forceBlock: true,
        matches: includesMessage('executable file')
    },
    {
        type: 'noFiles',
        enabledKey: 'removeNoFilesReleases',
        enabledEnv: 'REMOVE_NO_FILES_RELEASES',
        blockKey: 'blockRemovedNoFilesReleases',
        blockEnv: 'BLOCK_REMOVED_NO_FILES_RELEASES',
        matches: includesMessage('No files found are eligible')
    },
    {
        type: 'notAnUpgrade',
        enabledKey: 'removeNotAnUpgrade',
        enabledEnv: 'REMOVE_NOT_AN_UPGRADE',
        matches: includesMessage('Not an upgrade')
    },
    {
        type: 'seriesIdMismatch',
        enabledKey: 'removeSeriesIdMismatch',
        enabledEnv: 'REMOVE_SERIES_ID_MISMATCH',
        blockKey: 'blockRemovedSeriesIdMismatchReleases',
        blockEnv: 'BLOCK_REMOVED_SERIES_ID_MISMATCH_RELEASES',
        matches: includesMessage('Found matching series via grab history, but release was matched to series by ID')
    },
    {
        type: 'episodeCountMismatch',
        enabledKey: 'removeEpisodeCountMismatch',
        enabledEnv: 'REMOVE_EPISODE_COUNT_MISMATCH',
        blockKey: 'blockRemovedEpisodeCountMismatchReleases',
        blockEnv: 'BLOCK_REMOVED_EPISODE_COUNT_MISMATCH_RELEASES',
        matches: includesMessage('Episode file on disk contains more episodes than this file contains')
    },
    {
        type: 'undeterminedSample',
        enabledKey: 'removeUndeterminedSample',
        enabledEnv: 'REMOVE_UNDETERMINED_SAMPLE',
        blockKey: 'blockRemovedUndeterminedSampleReleases',
        blockEnv: [
            'BLOCK_REMOVED_UNDETERMINED_SAMPLE',
            'BLOCK_REMOVED_UNDETERMIND_SAMPLE'
        ],
        matches: includesMessage('Unable to determine if file is a sample')
    }
];

export function buildRulesFromEnv(
    parseBooleanEnv: (key: string) => boolean,
    getNormalizedEnvBoolean: (keys: readonly string[]) => boolean
): RuleConfig {
    const rules = { ...DEFAULT_RULE_CONFIG };

    for (const definition of RULE_DEFINITIONS) {
        rules[definition.enabledKey] = parseBooleanEnv(definition.enabledEnv);

        if (definition.blockKey && definition.blockEnv) {
            const blockEnvKeys = Array.isArray(definition.blockEnv)
                ? definition.blockEnv
                : [definition.blockEnv];
            rules[definition.blockKey] = getNormalizedEnvBoolean(blockEnvKeys);
        }
    }

    return rules;
}
