
import { pipeline, env, RawImage } from '@huggingface/transformers';

// holds the ai model once it's loaded
let ocrPipeline: any = null;

env.allowLocalModels = false;

const init = async () => {
    if (ocrPipeline) return;

    self.postMessage({ status: 'loading', message: 'initializing texify model...' });

    try {
        // texify works better for math formulas
        ocrPipeline = await pipeline('image-to-text', 'Xenova/texify');
        self.postMessage({ status: 'ready', message: 'ai ready' });
    } catch (error: any) {
        self.postMessage({ status: 'error', message: error.message });
    }
};

const preprocessImage = async (imageSource: string): Promise<RawImage> => {
    const img = await RawImage.fromURL(imageSource);
    // texify performs best when the formula is prominent.
    // The pipeline handles resizing, but we ensure the image is clean.
    return img;
};

// clean up the latex output
const sanitizeLatex = (text: string): string => {
    let clean = text.trim();

    // remove markdown code blocks
    clean = clean.replace(/^```latex\n?/, '').replace(/```$/, '');
    clean = clean.replace(/^```\n?/, '').replace(/```$/, '');

    // strip dollar signs and other wrappers
    if (clean.startsWith('$$') && clean.endsWith('$$')) {
        clean = clean.substring(2, clean.length - 2);
    } else if (clean.startsWith('$') && clean.endsWith('$')) {
        clean = clean.substring(1, clean.length - 1);
    } else if (clean.startsWith('\\(') && clean.endsWith('\\)')) {
        clean = clean.substring(2, clean.length - 2);
    } else if (clean.startsWith('\\[') && clean.endsWith('\\]')) {
        clean = clean.substring(2, clean.length - 2);
    }

    const repeatedPattern = /(.{3,})\1{3,}/;
    if (repeatedPattern.test(clean) && clean.length > 50) {
        return "Recognition unclear. Please try drawing with thinner strokes.";
    }

    if (/\\{4,}/.test(clean)) {
        return "Recognition failed. Please redraw.";
    }

    // remove common trailing artifacts
    clean = clean.replace(/\s*\\?$/g, '').trim();

    return clean.trim();
};

self.onmessage = async (event) => {
    const { type, image } = event.data;

    if (type === 'init') {
        await init();
        return;
    }

    if (type === 'process') {
        if (!ocrPipeline) {
            await init();
        }

        try {
            self.postMessage({ status: 'processing', message: 'analyzing formula...' });

            const processedImage = await preprocessImage(image);

            // optimized parameters for texify
            const result = await ocrPipeline(processedImage, {
                num_beams: 5,
                max_new_tokens: 384,
                repetition_penalty: 1.3,
                temperature: 0.1,
            });

            let output = result[0].generated_text;
            output = sanitizeLatex(output);

            self.postMessage({ status: 'success', result: output });
        } catch (error: any) {
            self.postMessage({ status: 'error', message: error.message });
        }
    }
};
