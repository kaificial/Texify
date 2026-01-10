# TeXify

Turn your handwritten math into LaTeX instantly right in your browser

## What it does

Draw or upload a picture of a math formula, and TeXify converts it to clean LaTeX code you can copy and paste anywhere. It's made  for students, researchers, and anyone who needs to digitize omath quickly.

## Main Features

- **Draw or Upload**: Sketch formulas directly on the canvas or upload images/textbook snippets
- **Instant Preview**: See your rendered math in real-time using KaTeX
- **Privacy First**: All processing happens locally on your device. Your drawings, images and data never leave your browser
- **Offline Capable**: When the model is cached it works without internet 

## How it works

TeXify uses **Transformers.js** to run machine learning models directly in your browser.
- **Model**: [Xenova/texify](https://huggingface.co/Xenova/texify) (a quantized version of the original Texify model).
- **Inference**: Runs in a dedicated Web Worker to keep the UI smooth and responsive.
- **Rendering**: Uses [KaTeX](https://katex.org/) for high-quality mathematical typesetting.

## How to use it 

1. **Installing dependencies**:
   ```bash
   npm install
   ```

2. **Run dev server**:
   ```bash
   npm run dev
   ```

3. **Open in browser**:
   Go to `http://localhost:5173`(ctrl + click)

## Built with

- React + Vite
- [Transformers.js](https://huggingface.co/docs/transformers.js) with the Xenova/texify model
- Runs entirely in a Web Worker for a better performance

---

