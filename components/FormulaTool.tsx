
import React, { useRef, useState, useEffect } from 'react';
import { convertImageLocally, initLocalAI } from '../services/localAI';
import { AppState, HistoryItem } from '../types';

declare const katex: any;

const FormulaTool: React.FC = () => {
    const [state, setState] = useState<AppState>(AppState.IDLE);
    const [latex, setLatex] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [aiStatus, setAiStatus] = useState<string>('');
    const [downloadProgress, setDownloadProgress] = useState<number>(0);
    const [strokeSize, setStrokeSize] = useState<number>(4);
    const [isEraser, setIsEraser] = useState<boolean>(false);
    const [history, setHistory] = useState<ImageData[]>([]);
    const [historyIndex, setHistoryIndex] = useState<number>(-1);
    const [processedImage, setProcessedImage] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const previewRef = useRef<HTMLDivElement>(null);
    const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
    const isDrawing = useRef(false);

    // load history from local storage
    useEffect(() => {
        const saved = localStorage.getItem('texify_history');
        if (saved) {
            try {
                setHistoryItems(JSON.parse(saved));
            } catch (e) {
                console.error('failed to load history', e);
            }
        }
    }, []);

    // save history whenever it changes
    useEffect(() => {
        localStorage.setItem('texify_history', JSON.stringify(historyItems));
    }, [historyItems]);

    // start up ai when component loads
    useEffect(() => {
        initLocalAI((status) => setAiStatus(status), (progress) => setDownloadProgress(progress));
    }, []);

    // set up drawing canvas
    useEffect(() => {
        if (state === AppState.DRAWING && canvasRef.current) {
            const canvas = canvasRef.current;
            // use willReadFrequently for better performance with getImageData
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (ctx) {
                ctx.strokeStyle = isEraser ? '#FFFFFF' : '#000';
                ctx.lineWidth = strokeSize;
                ctx.lineJoin = 'round';
                ctx.lineCap = 'round';
            }
            // save blank canvas so we can undo back to it
            if (history.length === 0) {
                saveHistory();
            }
        }
    }, [state, strokeSize, isEraser]);

    // show the latex preview whenever it changes
    useEffect(() => {
        if (previewRef.current) {
            const sanitized = latex.replace(/^(\$|\\\[|\\\(|\$\$)/g, '').replace(/(\$|\\\]|\\\)| \$\$)$/g, '').trim();

            try {
                if (sanitized) {
                    katex.render(sanitized, previewRef.current, {
                        throwOnError: false,
                        displayMode: true,
                    });
                } else {
                    previewRef.current.innerHTML = '<span class="text-gray-300">Preview area</span>';
                }
            } catch (e) {
                console.error('KaTeX error', e);
            }
        }
    }, [latex]);

    const saveHistory = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d', { willReadFrequently: true });
        if (canvas && ctx) {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const newHistory = history.slice(0, historyIndex + 1);
            newHistory.push(imageData);
            setHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
        }
    };

    const undo = () => {
        if (historyIndex > 0) {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d', { willReadFrequently: true });
            if (canvas && ctx) {
                const newIndex = historyIndex - 1;
                ctx.putImageData(history[newIndex], 0, 0);
                setHistoryIndex(newIndex);
            }
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d', { willReadFrequently: true });
            if (canvas && ctx) {
                const newIndex = historyIndex + 1;
                ctx.putImageData(history[newIndex], 0, 0);
                setHistoryIndex(newIndex);
            }
        }
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        isDrawing.current = true;
        const pos = getPos(e);
        const ctx = canvasRef.current?.getContext('2d', { willReadFrequently: true });
        if (ctx) {
            ctx.strokeStyle = isEraser ? '#FFFFFF' : '#000';
            ctx.lineWidth = strokeSize;
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing.current) return;
        const pos = getPos(e);
        const ctx = canvasRef.current?.getContext('2d', { willReadFrequently: true });
        ctx?.lineTo(pos.x, pos.y);
        ctx?.stroke();
    };

    const endDrawing = () => {
        if (isDrawing.current) {
            isDrawing.current = false;
            saveHistory();
        }
    };

    const getPos = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        // adjust for canvas scaling
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY,
        };
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d', { willReadFrequently: true });
        if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            saveHistory();
        }
        setLatex('');
    };

    // clean up the image so the ai can read it better
    const preprocessImage = (canvas: HTMLCanvasElement): HTMLCanvasElement => {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return canvas;

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // make everything black or white
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // figure out how bright this pixel is
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

            // map to strict black and white
            const threshold = 180;
            const newValue = luminance < threshold ? 0 : 255;

            data[i] = newValue;
            data[i + 1] = newValue;
            data[i + 2] = newValue;
        }

        ctx.putImageData(imageData, 0, 0);
        return canvas;
    };

    const getCroppedCanvas = (canvas: HTMLCanvasElement) => {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return canvas;

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const { data, width, height } = imageData;
        let minX = width, minY = height, maxX = 0, maxY = 0;
        let found = false;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const alpha = data[(y * width + x) * 4 + 3];
                if (alpha > 0) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                    found = true;
                }
            }
        }

        if (!found) return null;

        // add some padding around the drawing
        const padding = 40;
        minX = Math.max(0, minX - padding);
        minY = Math.max(0, minY - padding);
        maxX = Math.min(width, maxX + padding);
        maxY = Math.min(height, maxY + padding);

        const croppedWidth = maxX - minX;
        const croppedHeight = maxY - minY;

        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = croppedWidth;
        croppedCanvas.height = croppedHeight;
        const croppedCtx = croppedCanvas.getContext('2d', { willReadFrequently: true });

        if (croppedCtx) {
            croppedCtx.fillStyle = '#FFFFFF';
            croppedCtx.fillRect(0, 0, croppedWidth, croppedHeight);
            croppedCtx.drawImage(canvas, minX, minY, croppedWidth, croppedHeight, 0, 0, croppedWidth, croppedHeight);
        }

        // clean it up for the ai
        return preprocessImage(croppedCanvas);
    };

    const handleProcess = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const croppedCanvas = getCroppedCanvas(canvas);
        if (!croppedCanvas) {
            setError('Please draw something first');
            return;
        }

        handleProcessWithImage(croppedCanvas.toDataURL('image/png'));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setState(AppState.PROCESSING);
        setError(null);

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const dataUrl = event.target?.result as string;
                setProcessedImage(dataUrl);
                const result = await convertImageLocally(dataUrl);
                setLatex(result);
                setState(AppState.RESULT);

                // save to history
                if (result && !result.includes('failed') && !result.includes('unclear')) {
                    const newItem: HistoryItem = {
                        id: Math.random().toString(36).substring(2, 9),
                        latex: result,
                        timestamp: Date.now(),
                        image: dataUrl
                    };
                    setHistoryItems(prev => [newItem, ...prev].slice(0, 20));
                }
            } catch (err: any) {
                setError(err.message);
                setState(AppState.IDLE);
            }
        };
        reader.readAsDataURL(file);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(latex);
    };

    const removeFromHistory = (id: string) => {
        setHistoryItems(prev => prev.filter(item => item.id !== id));
    };

    const copyHistoryItem = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const handleProcessWithImage = async (dataUrl: string) => {
        setState(AppState.PROCESSING);
        setError(null);
        setProcessedImage(dataUrl);
        try {
            const result = await convertImageLocally(dataUrl);
            setLatex(result);
            setState(AppState.RESULT);

            // save to history if it's a valid result
            if (result && !result.includes('failed') && !result.includes('unclear')) {
                const newItem: HistoryItem = {
                    id: Math.random().toString(36).substring(2, 9),
                    latex: result,
                    timestamp: Date.now(),
                    image: dataUrl
                };
                setHistoryItems(prev => [newItem, ...prev].slice(0, 20));
            }
        } catch (err: any) {
            setError(err.message);
            setState(AppState.IDLE);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto px-4 py-12 relative z-10">
            <div className="bg-white/70 backdrop-blur-xl border border-black/10 rounded-2xl shadow-2xl overflow-hidden transition-all duration-500">

                {/* home screen */}
                {state === AppState.IDLE && (
                    <div className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* draw option */}
                            <button
                                onClick={() => setState(AppState.DRAWING)}
                                className="group relative p-8 bg-gradient-to-b from-slate-50 to-white border border-slate-100 rounded-2xl hover:border-slate-200 transition-all text-left"
                            >
                                <div className="absolute top-8 right-8 opacity-10">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={0.5} stroke="currentColor" className="w-24 h-24 text-slate-400">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                                    </svg>
                                </div>
                                <div className="w-14 h-14 flex items-center justify-center bg-slate-900 text-white rounded-2xl shadow-sm mb-6">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                                    </svg>
                                </div>
                                <h3 className="text-2xl font-light text-slate-900 mb-2">Draw Formula</h3>
                                <p className="text-slate-400 text-sm leading-relaxed mb-8">
                                    Sketch equations directly on the canvas with your mouse or touchscreen.
                                </p>
                                <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-slate-400 group-hover:text-slate-900 transition-colors">
                                    Open Canvas
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                                    </svg>
                                </div>
                            </button>

                            {/* upload option */}
                            <label className="group relative p-8 bg-gradient-to-b from-slate-50 to-white border border-slate-100 rounded-2xl hover:border-slate-200 transition-all text-left cursor-pointer">
                                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                                <div className="absolute top-8 right-8 opacity-10">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={0.5} stroke="currentColor" className="w-24 h-24 text-slate-400">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                    </svg>
                                </div>
                                <div className="w-14 h-14 flex items-center justify-center bg-slate-900 text-white rounded-2xl shadow-sm mb-6">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                    </svg>
                                </div>
                                <h3 className="text-2xl font-light text-slate-900 mb-2">Upload Image</h3>
                                <p className="text-slate-400 text-sm leading-relaxed mb-8">
                                    Upload textbook, pages, whiteboard photos, or screenshots.
                                </p>
                                <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-slate-400 group-hover:text-slate-900 transition-colors">
                                    Choose File
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                                    </svg>
                                </div>
                            </label>
                        </div>
                    </div>
                )}

                {/* drawing mode */}
                {state === AppState.DRAWING && (
                    <div className="p-8">
                        <div className="flex justify-between items-center mb-4 px-2">
                            <button
                                onClick={() => setState(AppState.IDLE)}
                                className="text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                                </svg>
                                Back to Methods
                            </button>
                            <div className="flex gap-4">
                                <button onClick={clearCanvas} className="text-[10px] uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors">Reset</button>
                                <button onClick={handleProcess} className="px-6 py-2 bg-slate-900 text-white text-[10px] font-medium uppercase tracking-widest rounded-lg hover:bg-slate-800 transition-all shadow-sm">Process Frame</button>
                            </div>
                        </div>

                        {/* tools */}
                        <div className="flex items-center gap-6 mb-4 px-2 py-3 bg-slate-50 rounded-xl border border-slate-100">
                            {/* undo redo */}
                            <div className="flex gap-2">
                                <button
                                    onClick={undo}
                                    disabled={historyIndex <= 0}
                                    className="p-2 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="Undo"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-slate-600">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                                    </svg>
                                </button>
                                <button
                                    onClick={redo}
                                    disabled={historyIndex >= history.length - 1}
                                    className="p-2 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="Redo"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-slate-600">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
                                    </svg>
                                </button>
                            </div>

                            <div className="w-px h-6 bg-slate-200" />

                            {/* pen or eraser */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setIsEraser(false)}
                                    className={`p-2 rounded-lg transition-colors ${!isEraser ? 'bg-slate-900 text-white' : 'hover:bg-slate-200 text-slate-600'}`}
                                    title="Brush"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => setIsEraser(true)}
                                    className={`p-2 rounded-lg transition-colors ${isEraser ? 'bg-slate-900 text-white' : 'hover:bg-slate-200 text-slate-600'}`}
                                    title="Eraser"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12l2.25-2.25M14.25 12L12 14.25m-2.58 4.92l-6.375-6.375a1.125 1.125 0 010-1.59L9.42 4.83a1.125 1.125 0 011.59 0l6.375 6.375a1.125 1.125 0 010 1.59L11.01 19.17a1.125 1.125 0 01-1.59 0z" />
                                    </svg>
                                </button>
                            </div>

                            <div className="w-px h-6 bg-slate-200" />

                            {/* brush size */}
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] uppercase tracking-widest text-slate-400">Size</span>
                                <input
                                    type="range"
                                    min="1"
                                    max="20"
                                    value={strokeSize}
                                    onChange={(e) => setStrokeSize(parseInt(e.target.value))}
                                    className="w-24 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                                />
                                <span className="text-xs text-slate-500 w-6">{strokeSize}</span>
                            </div>
                        </div>

                        <div className="relative">
                            <canvas
                                ref={canvasRef}
                                width={1200}
                                height={500}
                                className="w-full h-[500px] border border-slate-100 bg-white rounded-xl cursor-crosshair touch-none"
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={endDrawing}
                                onMouseLeave={endDrawing}
                                onTouchStart={startDrawing}
                                onTouchMove={draw}
                                onTouchEnd={endDrawing}
                            />
                            <div className="absolute bottom-4 right-4 text-[10px] uppercase tracking-widest text-slate-200 pointer-events-none italic">Canvas Input Buffer [1200x500]</div>
                        </div>
                    </div>
                )}

                {/* loading screen */}
                {state === AppState.PROCESSING && (
                    <div className="p-24 flex flex-col items-center justify-center gap-8">
                        {downloadProgress > 0 && downloadProgress < 100 ? (
                            <div className="w-full max-w-sm space-y-4">
                                <div className="flex justify-between items-end">
                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase tracking-widest text-slate-400">Initializing AI Model</p>
                                        <p className="font-light text-slate-900 tracking-tight lowercase">
                                            {aiStatus || 'fetching-weights...'}
                                        </p>
                                    </div>
                                    <span className="text-2xl font-light tracking-tighter text-slate-900">{Math.round(downloadProgress)}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-slate-900 transition-all duration-300 ease-out"
                                        style={{ width: `${downloadProgress}%` }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="w-12 h-12 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                                <div className="text-center space-y-1">
                                    <p className="font-light text-slate-900 tracking-tight lowercase">
                                        {aiStatus || 'running-inference...'}
                                    </p>
                                    <p className="text-[10px] uppercase tracking-widest text-slate-400">Transformer Layer Processing</p>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* results */}
                {state === AppState.RESULT && (
                    <>
                        <div className="p-8 flex flex-col md:flex-row gap-8">
                            <div className="flex-1 space-y-6">
                                <div className="flex justify-between items-baseline px-1">
                                    <h3 className="text-[10px] uppercase tracking-widest text-slate-400">Generated LaTeX</h3>
                                    <button
                                        onClick={copyToClipboard}
                                        className="px-4 py-1.5 bg-slate-900 text-white text-[10px] uppercase tracking-widest rounded-lg hover:bg-slate-800 transition-all"
                                    >
                                        Copy LaTeX
                                    </button>
                                </div>
                                <textarea
                                    value={latex}
                                    onChange={(e) => setLatex(e.target.value)}
                                    className="w-full h-32 p-4 bg-slate-50 border border-slate-100 rounded-xl font-mono text-xs resize-none focus:outline-none focus:ring-1 focus:ring-slate-200 transition-all text-slate-600"
                                    placeholder="No data available..."
                                />
                                <button
                                    onClick={() => setState(AppState.IDLE)}
                                    className="w-full py-3 text-[10px] uppercase tracking-[0.2em] border border-slate-100 text-slate-400 rounded-xl hover:bg-slate-50 transition-all"
                                >
                                    New Trial
                                </button>
                            </div>

                            <div className="flex-1 flex flex-col">
                                <h3 className="text-[10px] uppercase tracking-widest text-slate-400 mb-6 px-1">Compiled Output</h3>
                                <div className="flex-1 min-h-[220px] border border-slate-100 rounded-xl bg-white shadow-sm flex items-center justify-center p-8 overflow-auto">
                                    <div ref={previewRef} className="text-2xl text-slate-900" />
                                </div>
                            </div>
                        </div>

                        {/* show what the user uploaded */}
                        {processedImage && (
                            <div className="px-8 pb-8">
                                <h3 className="text-[10px] uppercase tracking-widest text-slate-400 mb-4 px-1">Original Input</h3>
                                <div className="border border-slate-100 rounded-xl bg-slate-50 p-4 flex items-center justify-center">
                                    <img src={processedImage} alt="Original input" className="max-h-48 rounded-lg object-contain" />
                                </div>
                            </div>
                        )}
                    </>
                )}

                {error && (
                    <div className="px-6 pb-6">
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100 flex items-center gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 flex-shrink-0">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                            </svg>
                            {error}
                        </div>
                    </div>
                )}
            </div>

            {/* recent formulas gallery */}
            {historyItems.length > 0 && (
                <div className="mt-16 space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Recent Formulas</h3>
                        <button
                            onClick={() => setHistoryItems([])}
                            className="text-[10px] uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors"
                        >
                            Clear All
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {historyItems.map((item) => (
                            <div key={item.id} className="group relative bg-white border border-slate-100 rounded-xl p-5 hover:border-slate-300 hover:shadow-xl transition-all duration-300">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="text-[10px] text-slate-300 font-mono">
                                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => copyHistoryItem(item.latex)}
                                            className="p-1.5 text-slate-400 hover:text-slate-900 transition-colors"
                                            title="Copy LaTeX"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => removeFromHistory(item.id)}
                                            className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                                            title="Remove"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                <div className="bg-slate-50 rounded-lg p-3 flex items-center justify-center min-h-[80px] mb-3 group-hover:bg-white transition-colors duration-300">
                                    <div className="text-slate-600 font-mono text-[10px] truncate max-w-full leading-relaxed px-2">
                                        {item.latex}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div >
    );
};

export default FormulaTool;
