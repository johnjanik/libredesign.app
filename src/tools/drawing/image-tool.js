/**
 * Image Tool
 *
 * Places image/video elements by clicking on the canvas.
 * Opens a file picker to select an image or video file.
 */
import { BaseTool } from '../base/tool';
const DEFAULT_OPTIONS = {
    defaultWidth: 200,
    defaultHeight: 200,
    acceptedTypes: 'image/*,video/*',
};
/**
 * Image tool for placing images/videos
 */
export class ImageTool extends BaseTool {
    name = 'image';
    cursor = 'crosshair';
    options;
    pendingPosition = null;
    createdNodeId = null;
    fileInput = null;
    // Callbacks
    onImagePlace;
    constructor(options = {}) {
        super();
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }
    /**
     * Set callback for when image is placed.
     */
    setOnImagePlace(callback) {
        this.onImagePlace = callback;
    }
    activate(context) {
        super.activate(context);
        this.pendingPosition = null;
    }
    deactivate() {
        this.pendingPosition = null;
        this.cleanupFileInput();
        super.deactivate();
    }
    onPointerDown(event, _context) {
        // Store the click position
        this.pendingPosition = { x: event.worldX, y: event.worldY };
        // Open file picker
        this.openFilePicker();
        return true;
    }
    /**
     * Create and open file picker.
     */
    openFilePicker() {
        this.cleanupFileInput();
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.accept = this.options.acceptedTypes;
        this.fileInput.style.display = 'none';
        document.body.appendChild(this.fileInput);
        this.fileInput.addEventListener('change', this.handleFileSelect);
        this.fileInput.click();
    }
    /**
     * Handle file selection.
     */
    handleFileSelect = async (event) => {
        const input = event.target;
        const file = input.files?.[0];
        if (!file || !this.pendingPosition) {
            this.cleanupFileInput();
            return;
        }
        try {
            // Read file as data URL
            const dataUrl = await this.readFileAsDataUrl(file);
            // Get image dimensions
            let naturalWidth = this.options.defaultWidth;
            let naturalHeight = this.options.defaultHeight;
            if (file.type.startsWith('image/')) {
                const dimensions = await this.getImageDimensions(dataUrl);
                naturalWidth = dimensions.width;
                naturalHeight = dimensions.height;
            }
            // Call the callback
            if (this.onImagePlace) {
                this.createdNodeId = this.onImagePlace({
                    position: this.pendingPosition,
                    file,
                    naturalWidth,
                    naturalHeight,
                    dataUrl,
                });
            }
        }
        catch (err) {
            console.error('Failed to load image:', err);
        }
        finally {
            this.pendingPosition = null;
            this.cleanupFileInput();
        }
    };
    /**
     * Read file as data URL.
     */
    readFileAsDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    /**
     * Get image dimensions from data URL.
     */
    getImageDimensions(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
            img.onerror = reject;
            img.src = dataUrl;
        });
    }
    /**
     * Cleanup file input element.
     */
    cleanupFileInput() {
        if (this.fileInput) {
            this.fileInput.removeEventListener('change', this.handleFileSelect);
            this.fileInput.remove();
            this.fileInput = null;
        }
    }
    /**
     * Get the ID of the last created node.
     */
    getCreatedNodeId() {
        return this.createdNodeId;
    }
}
/**
 * Create an image tool.
 */
export function createImageTool(options) {
    return new ImageTool(options);
}
//# sourceMappingURL=image-tool.js.map