# ArrQueueCleaner

Automated queue cleaner for Sonarr that removes stuck downloads based on configurable rules.  Please suggest rules you want to see added by opening an issue!

## Features

- Monitors Sonarr download queue for stuck items
- Removes items blocked due to quality issues
- Optional blocklist functionality
- Docker containerized
- Configurable via environment variables
- Scheduled execution via cron

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SONARR_INSTANCES` | – | JSON array of Sonarr instances (see below) |
| `SONARR_INSTANCES_FILE` | – | Path to JSON/YAML file containing Sonarr instances |
| `SONARR_HOST` | `http://localhost:8989` | Legacy single-instance Sonarr URL (ignored when instances are provided) |
| `SONARR_API_KEY` | *required for legacy mode* | Legacy single-instance Sonarr API key |
| `REMOVE_QUALITY_BLOCKED` | `false` | Remove items blocked by quality rules |
| `BLOCK_REMOVED_QUALITY_RELEASES` | `false` | Add quality-blocked items to blocklist |
| `REMOVE_ARCHIVE_BLOCKED` | `false` | Remove items stuck due to archive files |
| `BLOCK_REMOVED_ARCHIVE_RELEASES` | `false` | Add archive-blocked items to blocklist |
| `REMOVE_NO_FILES_RELEASES` | `false` | Remove items with no eligible files |
| `BLOCK_REMOVED_NO_FILES_RELEASES` | `false` | Add no-files items to blocklist |
| `REMOVE_NOT_AN_UPGRADE` | `false` | Remove items flagged as "Not an upgrade" |
| `REMOVE_SERIES_ID_MISMATCH` | `false` | Remove items with series ID matching conflicts |
| `BLOCK_REMOVED_SERIES_ID_MISMATCH_RELEASES` | `false` | Add series ID mismatch items to blocklist |
| `REMOVE_EPISODE_COUNT_MISMATCH` | `false` | Remove items where the on-disk file spans more episodes than the release |
| `BLOCK_REMOVED_EPISODE_COUNT_MISMATCH_RELEASES` | `false` | Add episode-count mismatch items to blocklist |
| `REMOVE_UNDETERMINED_SAMPLE` | `false` | Remove items unable to determine if file is a sample |
| `BLOCK_REMOVED_UNDETERMINED_SAMPLE` | `false` | Add undetermined sample items to blocklist |
| `DRY_RUN` | `false` | Log actions without actually removing/blocking items |
| `SCHEDULE` | `*/5 * * * *` | Cron schedule (every 5 minutes) |
| `LOG_LEVEL` | `info` | Logging level |

**Note:** No rules are configured by default for safety, you must opt in to using them.

### Multiple Sonarr Instances

ArrQueueCleaner can cycle through multiple Sonarr instances in a single process. Configure instances using either:

1. A structured environment variable:

```bash
export SONARR_INSTANCES='[
  {"name":"HD Shows","host":"http://sonarr-hd:8989","apiKey":"hd-key"},
  {"name":"4K Shows","host":"http://sonarr-4k:8989","apiKey":"4k-key","rules":{"removeNotAnUpgrade":true}}
]'
```

2. A JSON or YAML file referenced by `SONARR_INSTANCES_FILE`:

```bash
export SONARR_INSTANCES_FILE=/config/sonarr-instances.json
```

Each entry requires `host` and `apiKey`, and supports optional fields:

- `name`: Friendly identifier used in logs; defaults to `Sonarr {index}` when omitted.
- `enabled`: Toggle an instance without removing it (defaults to `true`).
- `rules`: Partial rule overrides merged with the global rule settings for just that instance.

If neither `SONARR_INSTANCES` nor `SONARR_INSTANCES_FILE` is supplied, ArrQueueCleaner falls back to the existing `SONARR_HOST` / `SONARR_API_KEY` variables for single-instance deployments.

## Quick Start

1. Copy `.env.example` to `.env` and configure
2. Run with Docker Compose (see example below)

## Manual Installation

```bash
pnpm install
pnpm build
pnpm start
```

## Docker Compose Example

Here we've set some recommended rules to true for those copy/pasting this config.
```yaml
version: '3.8'

services:
  arr-queue-cleaner:
    image: ghcr.io/thelegendtubaguy/arrqueuecleaner:latest
    environment:
      SONARR_INSTANCES: >-
        [
          {"name":"HD Shows","host":"http://sonarr:8989","apiKey":"your_hd_api_key"},
          {"name":"4K Shows","host":"http://sonarr-4k:8989","apiKey":"your_4k_api_key","rules":{"removeNotAnUpgrade":true}}
        ]
      REMOVE_QUALITY_BLOCKED: 'true'
      BLOCK_REMOVED_QUALITY_RELEASES: 'false'
      REMOVE_ARCHIVE_BLOCKED: 'true'
      BLOCK_REMOVED_ARCHIVE_RELEASES: 'false'
      REMOVE_NO_FILES_RELEASES: 'true'
      BLOCK_REMOVED_NO_FILES_RELEASES: 'true'
      REMOVE_NOT_AN_UPGRADE: 'true'
      REMOVE_SERIES_ID_MISMATCH: 'true'
      BLOCK_REMOVED_SERIES_ID_MISMATCH_RELEASES: 'false'
      REMOVE_EPISODE_COUNT_MISMATCH: 'false'
      BLOCK_REMOVED_EPISODE_COUNT_MISMATCH_RELEASES: 'false'
      REMOVE_UNDETERMINED_SAMPLE: 'false'
      BLOCK_REMOVED_UNDETERMINED_SAMPLE: 'false'
      DRY_RUN: 'false'
      SCHEDULE: '*/5 * * * *'
      LOG_LEVEL: 'info'
    restart: unless-stopped
```

## Docker

```bash
docker build -t arr-queue-cleaner .
docker run -d --env-file .env arr-queue-cleaner
```
