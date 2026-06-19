document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-upload');
    const clearBtn = document.getElementById('clear-btn');
    const controls = document.getElementById('controls');
    const previewContainer = document.getElementById('preview-container');
    const printContainer = document.getElementById('print-container');
    const printBtn = document.getElementById('print-btn');
    const initialPreview = document.getElementById('initial-preview');
    const placeholderUI = document.getElementById('placeholder-ui');
    const zoomControls = document.getElementById('zoom-controls');
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const zoomLevelText = document.getElementById('zoom-level');
    
    // Inputs
    const imagesPerPageSelect = document.getElementById('images-per-page');
    const paperSizeSelect = document.getElementById('paper-size');
    const orientationInputs = document.getElementsByName('orientation');
    const fitModeInputs = document.getElementsByName('fit-mode');
    const gapInput = document.getElementById('gap');
    const marginInput = document.getElementById('margin');
    const cutMarksToggle = document.getElementById('cut-marks');

    // State
    let uploadedImages = []; // Array of { src: string, name: string }
    let currentLayoutTransforms = []; // Preserved pan state across re-renders
    let config = {
        imagesPerPage: 2,
        paperSize: 'letter', 
        orientation: 'portrait', 
        fitMode: 'contain', 
        gap: 10,
        margin: 20,
        cutMarks: true
    };

    // Paper dimensions (roughly 96 DPI)
    const PAPER_DIMENSIONS = {
        letter: { width: 8.5 * 96, height: 11 * 96 },
        a4: { width: 8.27 * 96, height: 11.69 * 96 }
    };

    function calculateFitScale() {
        const area = document.querySelector('.preview-area');
        // Subtract 80px to leave breathing room around the edges
        const availableWidth = area.clientWidth - 80; 
        const availableHeight = area.clientHeight - 80;

        let paperW = PAPER_DIMENSIONS[config.paperSize].width;
        let paperH = PAPER_DIMENSIONS[config.paperSize].height;

        if (config.orientation === 'landscape') {
            [paperW, paperH] = [paperH, paperW];
        }

        const scaleX = availableWidth / paperW;
        const scaleY = availableHeight / paperH;
        
        let scale = Math.min(scaleX, scaleY);
        if (scale > 2) scale = 2;
        if (scale < 0.2) scale = 0.2;
        return scale;
    }

    let PREVIEW_SCALE = calculateFitScale();
    let hasManuallyZoomed = false;

    window.addEventListener('resize', () => {
        if (!hasManuallyZoomed && uploadedImages.length > 0) {
            PREVIEW_SCALE = calculateFitScale();
            updateZoomDisplay();
            updatePreview();
        }
    });

    // --- Drag & Drop Handlers ---
    
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-active');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('drag-active');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-active');
        
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    });

    clearBtn.addEventListener('click', () => {
        uploadedImages = [];
        currentLayoutTransforms = [];
        fileInput.value = '';
        controls.classList.remove('active');
        printBtn.disabled = true;
        zoomControls.style.display = 'none';
        
        // Reset preview area
        previewContainer.innerHTML = '';
        previewContainer.appendChild(initialPreview);
        initialPreview.innerHTML = '';
        initialPreview.appendChild(placeholderUI);
        
        // Size the empty state to match the auto-calculated scale
        let paperW = PAPER_DIMENSIONS[config.paperSize].width;
        let paperH = PAPER_DIMENSIONS[config.paperSize].height;
        if (config.orientation === 'landscape') {
            [paperW, paperH] = [paperH, paperW];
        }
        
        initialPreview.style.width = (paperW * PREVIEW_SCALE) + 'px';
        initialPreview.style.height = (paperH * PREVIEW_SCALE) + 'px';
        initialPreview.style.gridTemplateColumns = '';
        initialPreview.style.gridTemplateRows = '';
        initialPreview.style.gap = '';
        initialPreview.style.padding = '';
        initialPreview.className = 'page-preview empty-state';
    });

    function handleFiles(files) {
        let filesProcessed = 0;
        const validFiles = Array.from(files).filter(file => file.type.startsWith('image/'));

        if (validFiles.length === 0) {
            alert('Please select valid image files.');
            return;
        }

        controls.classList.add('active');
        printBtn.disabled = false;
        zoomControls.style.display = 'flex';

        validFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                uploadedImages.push({
                    src: e.target.result,
                    name: file.name
                });
                filesProcessed++;
                
                if (filesProcessed === validFiles.length) {
                    updatePreview();
                }
            };
            reader.readAsDataURL(file);
        });
    }

    // --- Configuration Handlers ---

    function getSelectedValue(radioNodeList) {
        for (const radio of radioNodeList) {
            if (radio.checked) return radio.value;
        }
        return null;
    }

    function updateConfig() {
        const oldImagesPerPage = config.imagesPerPage;
        
        config.imagesPerPage = parseInt(imagesPerPageSelect.value);
        config.paperSize = paperSizeSelect.value;
        config.orientation = getSelectedValue(orientationInputs);
        config.fitMode = getSelectedValue(fitModeInputs);
        config.gap = parseInt(gapInput.value);
        config.margin = parseInt(marginInput.value);
        config.cutMarks = cutMarksToggle.checked;
        
        // Reset transforms when fit mode or counts change
        if (config.fitMode === 'contain' || config.imagesPerPage !== oldImagesPerPage) {
            currentLayoutTransforms = [];
        }
        
        if (!hasManuallyZoomed) {
            PREVIEW_SCALE = calculateFitScale();
            updateZoomDisplay();
        }
        
        updatePreview();
    }

    imagesPerPageSelect.addEventListener('change', updateConfig);
    paperSizeSelect.addEventListener('change', updateConfig);
    gapInput.addEventListener('input', updateConfig);
    marginInput.addEventListener('input', updateConfig);
    cutMarksToggle.addEventListener('change', updateConfig);
    
    orientationInputs.forEach(input => { input.addEventListener('change', updateConfig); });
    fitModeInputs.forEach(input => { input.addEventListener('change', updateConfig); });

    // --- Layout Calculation ---

    function getGridTemplate(count, orientation) {
        const templates = {
            1: { rows: 1, cols: 1 },
            2: orientation === 'portrait' ? { rows: 2, cols: 1 } : { rows: 1, cols: 2 },
            3: orientation === 'portrait' ? { rows: 3, cols: 1 } : { rows: 1, cols: 3 },
            4: { rows: 2, cols: 2 },
            6: orientation === 'portrait' ? { rows: 3, cols: 2 } : { rows: 2, cols: 3 },
            8: orientation === 'portrait' ? { rows: 4, cols: 2 } : { rows: 2, cols: 4 },
            9: { rows: 3, cols: 3 }
        };
        return templates[count] || { rows: 1, cols: 1 };
    }

    function getImagesForLayout() {
        if (uploadedImages.length === 0) return [];
        
        // Special case: 1 image uploaded -> fill exactly 1 page (duplicate it)
        if (uploadedImages.length === 1) {
            const arr = [];
            for (let i = 0; i < config.imagesPerPage; i++) {
                // Return references to the same object so panning syncs, or clones?
                // Clones might be better so they can pan them independently.
                arr.push(JSON.parse(JSON.stringify(uploadedImages[0])));
            }
            return arr;
        }

        // Multiple images: Return a deep copy so we don't accidentally mutate originals across re-renders
        return JSON.parse(JSON.stringify(uploadedImages));
    }

    // --- Panning Logic ---
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let currentImageIndex = null;
    let draggedImgElement = null;

    function setupPanning(imgElement, imgDataObj, isPrint = false) {
        if (config.fitMode !== 'cover' || isPrint) return;

        // Using data attributes or closures to update the shared imgDataObj transform
        imgElement.style.transform = `translate(${imgDataObj.transform.x}px, ${imgDataObj.transform.y}px) scale(1.1)`; // slightly scale up to avoid edges showing immediately when panning
        
        imgElement.addEventListener('mousedown', (e) => {
            isDragging = true;
            dragStart = { x: e.clientX, y: e.clientY };
            draggedImgElement = imgElement;
            imgElement.style.transition = 'none'; // disable transition while dragging
        });

        // The move and up listeners need to be on window to prevent glitches
        // but we'll manage it simply here
    }

    window.addEventListener('mousemove', (e) => {
        if (!isDragging || !draggedImgElement) return;
        
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        
        // Find the data object tied to this image
        const imgIndex = parseInt(draggedImgElement.dataset.index);
        // Note: For panning, since we generate multiple pages and recreate DOM, 
        // we'll update the inline style directly during drag, and save state on mouseup.
        
        const currentTx = parseFloat(draggedImgElement.dataset.tx) || 0;
        const currentTy = parseFloat(draggedImgElement.dataset.ty) || 0;
        
        const newTx = currentTx + dx;
        const newTy = currentTy + dy;
        
        draggedImgElement.style.transform = `translate(${newTx}px, ${newTy}px) scale(1.1)`;
    });

    window.addEventListener('mouseup', (e) => {
        if (isDragging && draggedImgElement) {
            isDragging = false;
            
            const dx = e.clientX - dragStart.x;
            const dy = e.clientY - dragStart.y;
            
            const currentTx = parseFloat(draggedImgElement.dataset.tx) || 0;
            const currentTy = parseFloat(draggedImgElement.dataset.ty) || 0;
            
            const finalTx = currentTx + dx;
            const finalTy = currentTy + dy;
            
            draggedImgElement.dataset.tx = finalTx;
            draggedImgElement.dataset.ty = finalTy;
            
            // Save to global state so it survives layout regenerations
            const imgIndex = parseInt(draggedImgElement.dataset.index);
            if (currentLayoutTransforms[imgIndex]) {
                currentLayoutTransforms[imgIndex].x = finalTx;
                currentLayoutTransforms[imgIndex].y = finalTy;
            }
            
            draggedImgElement.style.transition = 'transform 0.3s ease, width 0.3s, height 0.3s';
            
            // Sync to the print layout (re-generate)
            generatePrintLayout();
        }
        draggedImgElement = null;
    });

    // --- Zoom Logic ---

    function updateZoomDisplay() {
        zoomLevelText.textContent = Math.round(PREVIEW_SCALE * 100) + '%'; 
    }

    function changeZoom(delta) {
        if (uploadedImages.length === 0) return;
        hasManuallyZoomed = true;
        
        const oldScale = PREVIEW_SCALE;
        let newScale = PREVIEW_SCALE + delta;
        
        // Clamp scale between roughly 10% and 300%
        if (newScale < 0.1) newScale = 0.1;
        if (newScale > 3.0) newScale = 3.0;
        
        const ratio = newScale / oldScale;
        
        // Scale existing transforms to visually stay in the same crop spot
        currentLayoutTransforms.forEach(t => {
            t.x *= ratio;
            t.y *= ratio;
        });

        PREVIEW_SCALE = newScale;
        updateZoomDisplay();
        updatePreview();
    }

    zoomInBtn.addEventListener('click', () => changeZoom(0.1));
    zoomOutBtn.addEventListener('click', () => changeZoom(-0.1));

    // --- Preview Generation ---

    function createPageElement() {
        let baseWidth = PAPER_DIMENSIONS[config.paperSize].width;
        let baseHeight = PAPER_DIMENSIONS[config.paperSize].height;

        if (config.orientation === 'landscape') {
            [baseWidth, baseHeight] = [baseHeight, baseWidth];
        }

        const page = document.createElement('div');
        page.className = `page-preview ${config.cutMarks ? 'cut-marks' : ''}`;
        page.style.width = `${baseWidth * PREVIEW_SCALE}px`;
        page.style.height = `${baseHeight * PREVIEW_SCALE}px`;

        const grid = getGridTemplate(config.imagesPerPage, config.orientation);
        page.style.gridTemplateColumns = `repeat(${grid.cols}, 1fr)`;
        page.style.gridTemplateRows = `repeat(${grid.rows}, 1fr)`;
        page.style.gap = `${config.gap * PREVIEW_SCALE}px`;
        
        // Scale margin appropriately
        // User slider 0-50 translates to 0-50px scaled margin
        const marginPx = config.margin * 2 * PREVIEW_SCALE; 
        page.style.padding = `${marginPx}px`;

        return page;
    }

    function updatePreview() {
        if (uploadedImages.length === 0) return;

        previewContainer.innerHTML = '';
        
        const layoutImages = getImagesForLayout();
        const pagesNeeded = Math.ceil(layoutImages.length / config.imagesPerPage);
        
        // Sync transforms array size
        if (currentLayoutTransforms.length !== layoutImages.length) {
            currentLayoutTransforms = layoutImages.map(() => ({ x: 0, y: 0 }));
        }
        
        let imgIndex = 0;

        for (let p = 0; p < pagesNeeded; p++) {
            const page = createPageElement();

            for (let i = 0; i < config.imagesPerPage; i++) {
                const container = document.createElement('div');
                container.className = 'preview-image-container';
                container.style.animationDelay = `${i * 0.05}s`;
                
                if (imgIndex < layoutImages.length) {
                    const imgData = layoutImages[imgIndex];
                    const img = document.createElement('img');
                    img.src = imgData.src;
                    img.className = config.fitMode === 'cover' ? 'img-cover' : 'img-contain';
                    
                    // Setup panning attributes
                    img.dataset.index = imgIndex;
                    img.dataset.tx = currentLayoutTransforms[imgIndex].x || 0;
                    img.dataset.ty = currentLayoutTransforms[imgIndex].y || 0;
                    
                    if (config.fitMode === 'cover') {
                        img.style.transform = `translate(${img.dataset.tx}px, ${img.dataset.ty}px) scale(1.1)`;
                        
                        img.addEventListener('mousedown', (e) => {
                            isDragging = true;
                            dragStart = { x: e.clientX, y: e.clientY };
                            draggedImgElement = img;
                            img.style.transition = 'none';
                            e.preventDefault(); // prevent default image drag behavior
                        });
                    }

                    container.appendChild(img);
                }
                
                page.appendChild(container);
                imgIndex++;
            }
            previewContainer.appendChild(page);
        }

        generatePrintLayout();
    }

    // --- Print Generation ---
    
    function generatePrintLayout() {
        if (uploadedImages.length === 0) return;
        printContainer.innerHTML = '';

        const layoutImages = getImagesForLayout();
        const pagesNeeded = Math.ceil(layoutImages.length / config.imagesPerPage);
        
        let imgIndex = 0;

        // Get the real panning data from the DOM preview images
        const domImages = document.querySelectorAll('.preview-area img');
        const domTransforms = Array.from(domImages).map(img => ({
            tx: img.dataset.tx || 0,
            ty: img.dataset.ty || 0
        }));

        for (let p = 0; p < pagesNeeded; p++) {
            const page = document.createElement('div');
            page.className = `print-page ${config.cutMarks ? 'cut-marks' : ''}`;

            const grid = getGridTemplate(config.imagesPerPage, config.orientation);
            page.style.gridTemplateColumns = `repeat(${grid.cols}, 1fr)`;
            page.style.gridTemplateRows = `repeat(${grid.rows}, 1fr)`;
            
            // Print gap and padding. Converting roughly to mm for print consistency.
            const gapMm = config.gap / 2; 
            const marginMm = config.margin / 2; 
            
            page.style.gap = `${gapMm}mm`;
            page.style.padding = `${marginMm}mm`;

            for (let i = 0; i < config.imagesPerPage; i++) {
                const container = document.createElement('div');
                container.className = 'print-image-container';
                
                if (imgIndex < layoutImages.length) {
                    const imgData = layoutImages[imgIndex];
                    const img = document.createElement('img');
                    img.src = imgData.src;
                    img.className = config.fitMode === 'cover' ? 'img-cover' : 'img-contain';
                    
                    if (config.fitMode === 'cover' && domTransforms[imgIndex]) {
                        // Apply the exact same translate, but scaled up for print? 
                        // Actually, if we translate in px in the browser, the print layout might scale it.
                        // Using percentages would be perfectly scalable, but px works decently.
                        // For a robust print, we scale the px translation by the print ratio (1 / PREVIEW_SCALE)
                        const printScale = 1 / PREVIEW_SCALE;
                        img.style.transform = `translate(${domTransforms[imgIndex].tx * printScale}px, ${domTransforms[imgIndex].ty * printScale}px) scale(1.1)`;
                    }

                    container.appendChild(img);
                }
                
                page.appendChild(container);
                imgIndex++;
            }

            printContainer.appendChild(page);
        }
        
        updatePrintCss();
    }

    function updatePrintCss() {
        let styleTag = document.getElementById('dynamic-print-style');
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = 'dynamic-print-style';
            document.head.appendChild(styleTag);
        }

        const sizeString = config.paperSize === 'letter' ? 'letter' : 'A4';
        styleTag.innerHTML = `
            @media print {
                @page {
                    size: ${sizeString} ${config.orientation};
                    margin: 0;
                }
            }
        `;
    }

    // --- Print Action ---
    printBtn.addEventListener('click', () => {
        // Sync transforms right before print just to be perfectly sure
        generatePrintLayout();
        window.print();
    });
});
