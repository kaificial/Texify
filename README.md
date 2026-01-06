# TeXify

Turn your handwritten math into LaTeX instantly right in your browser.

## What it does

Draw or upload a photo of a math equation, and TeXify converts it to clean LaTeX code you can copy and paste anywhere. It's designed for students, researchers, and anyone who needs to digitize math quickly.

## Key Features

- **Draw or Upload**: Sketch formulas directly on a canvas or upload images/textbook snippets.
- **Instant Preview**: See your rendered math in real-time using KaTeX.
- **Privacy First**: All processing happens locally on your device. Your images and data never leave your browser.
- **Offline Capable**: Once the model is cached, it works without an internet connection.
- **Clean Output**: Automatically sanitizes and cleans up the generated LaTeX for immediate use.

## How it works

TeXify uses **Transformers.js** to run machine learning models directly in your browser.
- **Model**: [Xenova/texify](https://huggingface.co/Xenova/texify) (a quantized version of the original Texify model).
- **Inference**: Runs in a dedicated Web Worker to keep the UI smooth and responsive.
- **Rendering**: Uses [KaTeX](https://katex.org/) for high-quality mathematical typesetting.

## Getting started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run dev server**:
   ```bash
   npm run dev
   ```

3. **Open in browser**:
   Navigate to `http://localhost:5173`.

## Built With

- **React + Vite** - Modern frontend tooling.
- **Transformers.js** - On-device machine learning.
- **Tailwind CSS** - For a clean, minimalist design.
- **KaTeX** - Mathematical rendering.

---

