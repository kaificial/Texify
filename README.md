# TeXify (Scribe)

> Hand-drawn math **instantly to LaTeX**.

Convert handwriting and photos into clean, production-ready LaTeX using Local AI. Focus on the math, we'll handle the code.

![TeXify Application](/assets/screenshot.png)

## Features

-   **Hand-to-LaTeX**: Sketch equations directly on the canvas.
-   **Image Upload & Paste**: Upload files or simply paste (`Ctrl+V`) images from your clipboard.
-   **Privacy First**: Powered by `Xenova/texify` + `Transformers.js`. All processing happens **locally in your browser**. No images are sent to any server.
-   **Editor Tools**: 
    -   Brush & Eraser with adjustable size.
    -   Undo/Redo functionality.
-   **History**: Keeps track of your recent transcriptions.
-   **Live Preview**: Renders the generated LaTeX using KaTeX.

## Tech Stack

-   **Frontend**: React, TypeScript, Vite
-   **Styling**: TailwindCSS
-   **AI/ML**: Transformers.js, On-device machine learning
-   **Math Rendering**: KaTeX

## Getting Started

### Prerequisites

-   Node.js (v18+ recommended)
-   npm

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/yourusername/scribe.git
    cd scribe
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

### Development

Start the development server:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

> **Note**: On the first run, the application will download the necessary AI models. This may take a few moments depending on your connection.

### Build

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## License

MIT
