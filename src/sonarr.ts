import axios, { AxiosInstance } from 'axios';
import { QueueItem } from './types';

export class SonarrClient {
    private client: AxiosInstance;
    private host: string;
    private logLevel: string;

    constructor(host: string, apiKey: string, logLevel = 'info') {
        this.host = host;
        this.logLevel = logLevel;
        this.client = axios.create({
            baseURL: `${host}/api/v3`,
            headers: { 'X-Api-Key': apiKey }
        });
    }

    private log(level: string, message: string): void {
        if (level === 'debug' && this.logLevel !== 'debug') {return;}
        console.log(`[${level.toUpperCase()}] ${message}`);
    }

    async getQueue(): Promise<QueueItem[]> {
        const { data } = await this.client.get('/queue');
        this.log('debug', `Successfully contacted Sonarr API at ${this.host}/api/v3/queue`);
        this.log('debug', `Queue response: ${JSON.stringify(data, null, 2)}`);
        return data.records || data;
    }

    async removeFromQueue(id: number): Promise<void> {
        const response = await this.client.delete(`/queue/${id}`, {
            params: { removeFromClient: true, blocklist: false }
        });
        this.log('debug', `Successfully removed queue item ${id} from Sonarr`);
        this.log('debug', `Remove response: ${JSON.stringify(response.data, null, 2)}`);
    }

    async blockRelease(id: number): Promise<void> {
        const response = await this.client.delete(`/queue/${id}`, {
            params: { removeFromClient: true, blocklist: true }
        });
        this.log('debug', `Successfully blocked and removed queue item ${id} from Sonarr`);
        this.log('debug', `Block response: ${JSON.stringify(response.data, null, 2)}`);
    }
}
