import { createGuardedRun } from '../src/index';

describe('createGuardedRun', () => {
    const createDeferred = (): {
        promise: Promise<void>;
        resolve: () => void;
        reject: (error: Error) => void;
    } => {
        let resolve!: () => void;
        let reject!: (error: Error) => void;
        const promise = new Promise<void>((promiseResolve, promiseReject) => {
            resolve = promiseResolve;
            reject = promiseReject;
        });

        return { promise, resolve, reject };
    };

    it('is importable without loading runtime configuration', async () => {
        const originalSonarrInstances = process.env.SONARR_INSTANCES;
        process.env.SONARR_INSTANCES = 'not-json';
        jest.resetModules();

        const exitMock = jest.spyOn(process, 'exit').mockImplementation((() => {
            throw new Error('process.exit called');
        }) as never);
        const errorMock = jest.spyOn(console, 'error').mockImplementation();

        try {
            await expect(import('../src/index')).resolves.toMatchObject({
                createGuardedRun: expect.any(Function)
            });
            expect(exitMock).not.toHaveBeenCalled();
        } finally {
            if (originalSonarrInstances === undefined) {
                delete process.env.SONARR_INSTANCES;
            } else {
                process.env.SONARR_INSTANCES = originalSonarrInstances;
            }
            exitMock.mockRestore();
            errorMock.mockRestore();
            jest.resetModules();
        }
    });

    it('skips and logs when a cleaner run is already in progress', async () => {
        const deferred = createDeferred();
        const runCleaners = jest.fn(() => deferred.promise);
        const logger = { warn: jest.fn() };
        const guardedRun = createGuardedRun(runCleaners, { logger });

        const firstRun = guardedRun();
        await guardedRun();

        expect(runCleaners).toHaveBeenCalledTimes(1);
        expect(logger.warn).toHaveBeenCalledWith('Skipping cleaner run; previous cleaner run is still in progress.');

        deferred.resolve();
        await firstRun;
    });

    it('runs again after the in-progress cleaner run completes', async () => {
        const runCleaners = jest.fn().mockResolvedValue(undefined);
        const guardedRun = createGuardedRun(runCleaners, { logger: { warn: jest.fn() } });

        await guardedRun();
        await guardedRun();

        expect(runCleaners).toHaveBeenCalledTimes(2);
    });

    it('rethrows cleaner errors and clears the in-progress state', async () => {
        const cleanerError = new Error('cleaner failed');
        const runCleaners = jest.fn()
            .mockRejectedValueOnce(cleanerError)
            .mockResolvedValueOnce(undefined);
        const logger = { warn: jest.fn() };
        const guardedRun = createGuardedRun(runCleaners, { logger });

        await expect(guardedRun()).rejects.toThrow(cleanerError);
        await guardedRun();

        expect(runCleaners).toHaveBeenCalledTimes(2);
        expect(logger.warn).not.toHaveBeenCalled();
    });
});
