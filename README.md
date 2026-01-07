# TeXify

Turn your handwritten math into LaTeX instantly right in your browser.

## What it does

Draw or upload a photo of a math equation, and TeXify converts it to clean LaTeX code you can copy and paste anywhere. It's designed for students, researchers, and anyone who needs to digitize math quickly.

## Key Features

- **Draw or Upload**: Sketch formulas directly on a drawing board or upload images of your hand-drawn notes/textbook snippets.
- **Instant Preview**: See your rendered math formulas in real-time using KaTeX.
- **Privacy First**: All processing happens locally on your device so your images and data never leave your browser.
- **Offline Capable**: Once the model is cached, it works without an internet connection.
- **Clean Output**: Automatically sanitizes and cleans up the generated LaTeX for immediate use.

## How it works

TeXify uses **Transformers.js** 
- **Model**: [Xenova/texify](https://huggingface.co/Xenova/texify) 
- **Inference**: Runs in a dedicated Web Worker
- **Rendering**: Uses [KaTeX](https://katex.org/) 

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
   `http://localhost:5173`.

## Built With

- **React + Vite** 
- **Transformers.js** 
- **Tailwind CSS** 
- **KaTeX** 



