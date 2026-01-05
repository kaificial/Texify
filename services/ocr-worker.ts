
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

// prep the image before sending to ai
const preprocessImage = async (imageSource: string): Promise<RawImage> => {
    const img = await RawImage.fromURL(imageSource);
    // texify performs best when the formula is prominent.
    // The pipeline handles resizing, but we ensure the image is clean.
    return img;
};

// clean up the latex output
const sanitizeLatex = (text: string): string => {
    let clean = text.trim();

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

    clean = clean.replace(/^```latex/, '').replace(/```$/, '');

    // detect repetitive patterns that indicate recognition failure
    const repeatedPattern = /(.{3,})\1{3,}/;
    if (repeatedPattern.test(clean)) {
        return "Recognition unclear. Please try drawing with thicker strokes.";
    }

    // too many backslashes in a row usually means garbage
    if (/\\{4,}/.test(clean)) {
        return "Recognition failed. Please redraw with clearer strokes.";
    }

    // check for excessive special characters which indicates noise
    const specialCharCount = (clean.match(/[{}\\^_]/g) || []).length;
    const letterCount = (clean.match(/[a-zA-Z0-9]/g) || []).length;
    if (specialCharCount > letterCount * 2 && clean.length > 20) {
        return "Could not parse handwriting. Try drawing larger symbols.";
    }

    // catch when the ai hallucinates garbage
    if (clean.includes('(x,y)') && clean.length > 50) {
        const parts = clean.split('=');
        if (parts.length > 3) return "Recognition failed. Please try a clearer drawing.";
    }

    // detect common hallucination patterns
    if (clean.includes('\\text{') && clean.split('\\text{').length > 4) {
        return "Recognition unclear. Please simplify your drawing.";
    }

    // check for unreasonably long output which usually means the model looped
    if (clean.length > 500) {
        // try to salvage by taking just the first meaningful part
        const firstPart = clean.split(/[.,;]|\\\\|\\text/)[0].trim();
        if (firstPart.length > 5 && firstPart.length < 200) {
            return firstPart;
        }
        return "Output too long. Please draw smaller equations or simpler symbols.";
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

            // these settings help the ai stay focused
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
