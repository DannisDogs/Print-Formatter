# Image Print Formatter

> A modern, client-side web application for mathematically perfect image print layouts.

![Catppuccin Theme](https://img.shields.io/badge/Theme-Catppuccin_Mocha-cba6f7?style=flat-square)
![Client Side Only](https://img.shields.io/badge/Client_Side-100%25-a6e3a1?style=flat-square)

Image Print Formatter is a specialized tool designed to solve a common problem: effortlessly arranging single or multiple images onto a physical sheet of paper. By handling the layout logic directly in your browser, it ensures perfect alignment, configurable gaps, and high-quality printed output without ever uploading your personal photos to a server.

## Key Features

- **Privacy-First Architecture**: 100% client-side processing using the HTML5 File API. No server uploads means your images remain completely private.
- **Dynamic Multi-Image Layouts**: Upload a single image to duplicate it across a page, or upload a batch of different images. The application mathematically calculates the grid to fit exactly 1, 2, 3, 4, 6, 8, or 9 images per page.
- **Intelligent Multi-Page Generation**: Automatically overflows to generate multiple, perfectly formatted print sheets if you supply more images than a single page can hold.
- **Interactive Panning (Crop Adjust)**: When using the "Cover" fit mode, intuitively click and drag images within their grid cells to pan and re-frame the subject before printing.
- **Precision Print Controls**:
  - **Cut Marks**: Toggle printable dashed guidelines to assist with manual trimming (scissors or paper trimmers).
  - **Custom Margins & Gaps**: Fine-tune the spacing between images and the physical edge of the paper.
  - **Orientation & Fit**: Rapidly switch between Portrait/Landscape and `contain`/`cover` object fitting.
- **Premium User Experience**: Crafted with the beautiful, high-contrast [Catppuccin Mocha](https://github.com/catppuccin/catppuccin) color palette, featuring glassmorphic UI elements and subtle micro-animations.

## Getting Started

Since the application is entirely static, there are no build steps or dependencies required. 

1. Clone or download this repository.
2. Open `index.html` in any modern web browser.
3. Drag and drop your images onto the canvas to begin formatting.

### Hosting via GitHub Pages

You can easily deploy this application to the web for free:

1. Push the code to a GitHub repository.
2. Navigate to your repository's **Settings** > **Pages**.
3. Under **Build and deployment**, set the source to `Deploy from a branch`.
4. Select the `main` branch and the `/ (root)` folder, then save.
5. Your formatter will be live at `https://<your-username>.github.io/<your-repo>/`.

## Technology Stack

- **Structure**: Semantic HTML5
- **Styling**: Vanilla CSS3 (Custom Properties, CSS Grid, `@media print`)
- **Logic**: Vanilla JavaScript (ES6+, DOM Manipulation, HTML5 File API)

## License

This project is open-source and available under the MIT License.
