# ArrQueueCleaner

Automated queue cleaner for Sonarr that removes stuck downloads based on configurable rules.

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

## Quick Start

1. Copy `.env.example` to `.env` and configure
2. Run with Docker Compose:
   ```bash
   docker-compose up -d
   ```

## Manual Installation

```bash
npm install
npm start
```

## Docker

```bash
docker build -t arr-queue-cleaner .
docker run -d --env-file .env arr-queue-cleaner
```
