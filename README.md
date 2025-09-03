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
| `SONARR_HOST` | `http://localhost:8989` | Sonarr instance URL |
| `SONARR_API_KEY` | *required* | Sonarr API key |
| `REMOVE_QUALITY_BLOCKED` | `false` | Remove items blocked by quality rules |
| `BLOCK_REMOVED_QUALITY_RELEASES` | `false` | Add quality-blocked items to blocklist |
| `REMOVE_ARCHIVE_BLOCKED` | `false` | Remove items stuck due to archive files |
| `BLOCK_REMOVED_ARCHIVE_RELEASES` | `false` | Add archive-blocked items to blocklist |
| `SCHEDULE` | `*/5 * * * *` | Cron schedule (every 5 minutes) |
| `LOG_LEVEL` | `info` | Logging level |

**Note:** No rules are configured by default for safety, you must opt in to using them.

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

```yaml
version: '3.8'

services:
  arr-queue-cleaner:
    image: ghcr.io/thelegendtubaguy/arrqueuecleaner:latest
    environment:
      - SONARR_HOST=http://sonarr:8989
      - SONARR_API_KEY=your_api_key_here
      - REMOVE_QUALITY_BLOCKED=false
      - BLOCK_REMOVED_QUALITY_RELEASES=false
      - REMOVE_ARCHIVE_BLOCKED=false
      - BLOCK_REMOVED_ARCHIVE_RELEASES=false
      - SCHEDULE=*/5 * * * *
      - LOG_LEVEL=info
    restart: unless-stopped
```

## Docker

```bash
docker build -t arr-queue-cleaner .
docker run -d --env-file .env arr-queue-cleaner
```
