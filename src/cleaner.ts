import { SonarrClient } from './sonarr';
import { Config, QueueItem } from './types';

export class QueueCleaner {
  private config: Config;
  private sonarr: SonarrClient;

  constructor(config: Config) {
    this.config = config;
    this.sonarr = new SonarrClient(config.sonarr.host, config.sonarr.apiKey, config.logLevel);
  }

  private log(level: string, message: string, data?: any): void {
    if (level === 'debug' && this.config.logLevel !== 'debug') return;
    const output = data ? `${message}: ${JSON.stringify(data)}` : message;
    console.log(`[${level.toUpperCase()}] ${output}`);
  }

  async cleanQueue(): Promise<void> {
    if (!this.config.sonarr.enabled) return;

    try {
      const queue = await this.sonarr.getQueue();
      const itemsToProcess = queue.filter(item => this.shouldRemoveItem(item));

      for (const item of itemsToProcess) {
        await this.processItem(item);
      }

      if (itemsToProcess.length > 0) {
        console.log(`Processed ${itemsToProcess.length} queue items`);
      }
    } catch (error) {
      console.error('Error cleaning queue:', (error as Error).message);
    }
  }

  shouldRemoveItem(item: QueueItem): boolean {
    if (item.status !== 'completed') {
      this.log('debug', 'Item not completed yet', item.title);
      return false;
    }
    if (item.trackedDownloadStatus !== 'warning') {
      this.log('debug', 'Item not in download warning status', item.title);
      return false;
    }
    if (item.trackedDownloadState !== 'importPending') {
      this.log('debug', 'Item not stuck in importing', item.title);
      return false;
    }
    if (!item.statusMessages?.length) {
      this.log('info', 'Item has no status messages', item.title);
      return false;
    }

    this.log('debug', 'Got item to check', {
      title: item.title,
      status: item.status,
      trackedDownloadStatus: item.trackedDownloadStatus,
      trackedDownloadState: item.trackedDownloadState,
      statusMessages: item.statusMessages
    });

    return item.statusMessages.some(msg => {
      const hasQualityIssue = this.config.rules.removeQualityBlocked &&
        msg.messages?.some(m => m.includes('upgrade for existing episode'));
      
      const hasArchiveIssue = this.config.rules.removeArchiveBlocked &&
        msg.messages?.some(m => m.includes('archive file'));

      if (hasQualityIssue) this.log('debug', 'Item has quality issue', item.title);
      if (hasArchiveIssue) this.log('debug', 'Item has archive issue', item.title);
      
      return hasQualityIssue || hasArchiveIssue;
    });
  }

  async processItem(item: QueueItem): Promise<void> {
    try {
      const isArchiveIssue = item.statusMessages?.some(msg =>
        msg.messages?.some(m => m.includes('archive file'))
      );

      const shouldBlock = isArchiveIssue ?
        this.config.rules.blockRemovedArchiveReleases :
        this.config.rules.blockRemovedQualityReleases;

      if (shouldBlock) {
        await this.sonarr.blockRelease(item.id);
        console.log(`Blocked and removed: ${item.title}`);
      } else {
        await this.sonarr.removeFromQueue(item.id);
        console.log(`Removed: ${item.title}`);
      }
    } catch (error) {
      console.error(`Error processing ${item.title}:`, (error as Error).message);
    }
  }
}
