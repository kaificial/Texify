
import { AppState } from '../types';

let worker: Worker | null = null;
let statusCallback: (status: string) => void = () => { };
let progressCallback: (progress: number) => void = () => { };

export const initLocalAI = (onStatusChange?: (status: string) => void, onProgress?: (progress: number) => void) => {
    if (onStatusChange) statusCallback = onStatusChange;
    if (onProgress) progressCallback = onProgress;

    if (worker) return;

    worker = new Worker(new URL('./ocr-worker.ts', import.meta.url), {
        type: 'module'
    });

    worker.onmessage = (event) => {
        const { status, message, result, progress } = event.data;

        if (status === 'download_progress') {
            if (progressCallback) progressCallback(progress);
        }

        if (statusCallback) statusCallback(message || status);

        if (status === 'success' && globalResolve) {
            globalResolve(result);
        } else if (status === 'error' && globalReject) {
            globalReject(new Error(message));
        }
    };

    worker.postMessage({ type: 'init' });
};

let globalResolve: ((value: string) => void) | null = null;
let globalReject: ((reason?: any) => void) | null = null;

export const convertImageLocally = (imageDataUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!worker) {
            initLocalAI();
        }

        globalResolve = resolve;
        globalReject = reject;

        worker?.postMessage({ type: 'process', image: imageDataUrl });
    });
};
