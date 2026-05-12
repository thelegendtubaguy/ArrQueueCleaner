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

    describe('constructor', () => {
        it.each([
            ['without trailing slashes', 'http://localhost:8989', 'http://localhost:8989/api/v3'],
            ['with a trailing slash', 'http://localhost:8989/', 'http://localhost:8989/api/v3'],
            ['with multiple trailing slashes', 'http://localhost:8989///', 'http://localhost:8989/api/v3'],
            ['with a path and trailing slashes', 'https://localhost:8989/sonarr///', 'https://localhost:8989/sonarr/api/v3']
        ])('sets axios baseURL %s', (_caseName, host, baseURL) => {
            mockedAxios.create.mockClear();

            new SonarrClient(host, 'test-key', 'info');

            expect(mockedAxios.create).toHaveBeenCalledWith(expect.objectContaining({
                baseURL
            }));
        });

        it('rejects non-http protocols before creating an axios client', () => {
            mockedAxios.create.mockClear();

            expect(() => new SonarrClient('data:text/plain,hello', 'test-key', 'info'))
                .toThrow('Invalid protocol: data:. Only HTTP and HTTPS are allowed.');
            expect(mockedAxios.create).not.toHaveBeenCalled();
        });
    });

    describe('getQueue', () => {
        it('should return queue records', async () => {
            const mockData = { records: [{ id: 1, title: 'test' }] };
            mockAxiosInstance.get.mockResolvedValue({ data: mockData });

            const result = await client.getQueue();

            expect(mockAxiosInstance.get).toHaveBeenCalledWith('/queue');
            expect(result).toEqual(mockData.records);
        });

        it('should return data directly if no records property', async () => {
            const mockData = [{ id: 1, title: 'test' }];
            mockAxiosInstance.get.mockResolvedValue({ data: mockData });

            const result = await client.getQueue();

            expect(result).toEqual(mockData);
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
