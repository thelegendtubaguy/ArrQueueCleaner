import axios, { AxiosInstance } from 'axios';
import { QueueItem } from './types';

const QUEUE_PAGE_SIZE = 100;

interface QueueResponse {
    records?: QueueItem[];
    totalRecords?: number;
}

export class SonarrClient {
    private client: AxiosInstance;
    private host: string;
    private logLevel: string;

    constructor(host: string, apiKey: string, logLevel = 'info') {
        this.logLevel = logLevel;
        
        const normalizedHost = host.trim().replace(/\/+$/, '');

        // Validate host URL to prevent data: URI attacks
        const url = new URL(normalizedHost);
        if (!['http:', 'https:'].includes(url.protocol)) {
            throw new Error(`Invalid protocol: ${url.protocol}. Only HTTP and HTTPS are allowed.`);
        }

        this.host = normalizedHost;
        
        this.client = axios.create({
            baseURL: `${this.host}/api/v3`,
            headers: { 'X-Api-Key': apiKey },
            maxContentLength: 50 * 1024 * 1024, // 50MB limit
            maxBodyLength: 50 * 1024 * 1024,    // 50MB limit
            timeout: 30000 // 30 second timeout
        });
    }

    private log(level: string, message: string): void {
        if (level === 'debug' && this.logLevel !== 'debug') { return; }
        console.log(`[${level.toUpperCase()}] ${message}`);
    }

    async getQueue(): Promise<QueueItem[]> {
        const records: QueueItem[] = [];
        let page = 1;

        while (true) {
            const { data } = await this.client.get<QueueItem[] | QueueResponse>('/queue', { params: { page, pageSize: QUEUE_PAGE_SIZE } });
            this.log('debug', `Successfully contacted Sonarr API at ${this.host}/api/v3/queue`);
            this.log('debug', `Queue response: ${JSON.stringify(data, null, 2)}`);

            if (Array.isArray(data)) {
                return data;
            }

            if (!Array.isArray(data.records)) {
                throw new Error('Unexpected Sonarr queue response: missing records array');
            }

            records.push(...data.records);

            if (data.records.length === 0 || data.totalRecords === undefined || records.length >= data.totalRecords) {
                return records;
            }

            page++;
        }
    }

    async removeFromQueue(id: number): Promise<void> {
        const response = await this.client.delete(`/queue/${id}`, {
            params: { removeFromClient: true, blocklist: false }
        });
        this.log('debug', `Successfully removed queue item ${id} from Sonarr`);
        this.log('debug', `Remove response: ${JSON.stringify(response.data, null, 2)}`);
    }

    async blockRelease(id: number, removeFromClient = true): Promise<void> {
        const response = await this.client.delete(`/queue/${id}`, {
            params: { removeFromClient, blocklist: true }
        });
        this.log('debug', `Successfully blocked queue item ${id} in Sonarr`);
        this.log('debug', `Block response: ${JSON.stringify(response.data, null, 2)}`);
    }
}
