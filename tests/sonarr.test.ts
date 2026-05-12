import axios from 'axios';
import { SonarrClient } from '../src/sonarr';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SonarrClient', () => {
    let client: SonarrClient;
    let mockAxiosInstance: any;

    beforeEach(() => {
        mockAxiosInstance = {
            get: jest.fn(),
            delete: jest.fn()
        };
        mockedAxios.create.mockReturnValue(mockAxiosInstance);

        // Mock console.log to avoid test output
        jest.spyOn(console, 'log').mockImplementation();

        client = new SonarrClient('http://localhost:8989', 'test-key', 'info');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('getQueue', () => {
        it('should return queue records', async () => {
            const mockData = { records: [{ id: 1, title: 'test' }] };
            mockAxiosInstance.get.mockResolvedValue({ data: mockData });

            const result = await client.getQueue();

            expect(mockAxiosInstance.get).toHaveBeenCalledWith('/queue', { params: { page: 1, pageSize: 100 } });
            expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockData.records);
        });

        it('should collect all queue records across pages', async () => {
            mockAxiosInstance.get
                .mockResolvedValueOnce({ data: { records: [{ id: 1, title: 'page 1' }], totalRecords: 3 } })
                .mockResolvedValueOnce({ data: { records: [{ id: 2, title: 'page 2' }, { id: 3, title: 'page 2' }], totalRecords: 3 } });

            const result = await client.getQueue();

            expect(mockAxiosInstance.get).toHaveBeenNthCalledWith(1, '/queue', { params: { page: 1, pageSize: 100 } });
            expect(mockAxiosInstance.get).toHaveBeenNthCalledWith(2, '/queue', { params: { page: 2, pageSize: 100 } });
            expect(result).toEqual([
                { id: 1, title: 'page 1' },
                { id: 2, title: 'page 2' },
                { id: 3, title: 'page 2' }
            ]);
        });

        it('should return data directly for non-paginated array responses', async () => {
            const mockData = [{ id: 1, title: 'test' }];
            mockAxiosInstance.get.mockResolvedValue({ data: mockData });

            const result = await client.getQueue();

            expect(mockAxiosInstance.get).toHaveBeenCalledWith('/queue', { params: { page: 1, pageSize: 100 } });
            expect(result).toEqual(mockData);
        });

        it('should return an empty array when there are no queue records', async () => {
            const mockData = { records: [], totalRecords: 0 };
            mockAxiosInstance.get.mockResolvedValue({ data: mockData });

            const result = await client.getQueue();

            expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
            expect(result).toEqual([]);
        });

        it('should reject unexpected queue response shapes', async () => {
            mockAxiosInstance.get.mockResolvedValue({ data: { totalRecords: 1 } });

            await expect(client.getQueue()).rejects.toThrow('Unexpected Sonarr queue response: missing records array');
        });
    });

    describe('removeFromQueue', () => {
        it('should call delete with correct parameters', async () => {
            mockAxiosInstance.delete.mockResolvedValue({ data: {} });

            await client.removeFromQueue(123);

            expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/queue/123', {
                params: { removeFromClient: true, blocklist: false }
            });
        });
    });

    describe('blockRelease', () => {
        it('should call delete with blocklist true', async () => {
            mockAxiosInstance.delete.mockResolvedValue({ data: {} });

            await client.blockRelease(123);

            expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/queue/123', {
                params: { removeFromClient: true, blocklist: true }
            });
        });
    });
});
