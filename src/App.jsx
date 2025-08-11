import { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Sliders, Save, Palette } from 'lucide-react';

// Main App component
const App = () => {
  // State variables
  const [imageSrc, setImageSrc] = useState(null);
  const [padding, setPadding] = useState(10);
  const [backgroundColor, setBackgroundColor] = useState('#2d3748'); // Default dark gray color
  const [isTransparent, setIsTransparent] = useState(false); // New state for transparent background
  const [exportFormat, setExportFormat] = useState('png');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isImageSelected, setIsImageSelected] = useState(false);

  // References to the canvas elements
  const squareCanvasRef = useRef(null);
  const roundCanvasRef = useRef(null);
  const circleCanvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Constants for icon sizes and names
  const ICON_SIZES = {
    'mipmap-xxxhdpi': 192,
    'mipmap-xxhdpi': 144,
    'mipmap-xhdpi': 96,
    'mipmap-hdpi': 72,
    'mipmap-mdpi': 48,
  };

  // Function to draw a rounded rectangle (squircle) on a canvas
  const drawRoundedRect = (ctx, x, y, width, height, radius) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
  };

  // Function to draw the image on a canvas with a specified shape and padding
  const drawIcon = useCallback((canvas, image, shape, size, padding, bgColor, isTransparent) => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, size, size);

    // Only fill the background if the transparent option is NOT selected
    if (!isTransparent) {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, size, size);
    }

    // Explicitly cast padding to a number for calculation
    const numericPadding = Number(padding);
    const paddedSize = size - (numericPadding * 2);
    const startX = numericPadding;
    const startY = numericPadding;

    // Save the context state before clipping
    ctx.save();

    // Create the clipping path based on the shape
    if (shape === 'circle') {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, paddedSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
    } else if (shape === 'round') {
      // For the squircle shape, we use a rounded rectangle
      drawRoundedRect(ctx, startX, startY, paddedSize, paddedSize, paddedSize / 4);
      ctx.closePath();
      ctx.clip();
    }

    // Draw the image to fit the padded area, preserving aspect ratio
    const imgWidth = image.width;
    const imgHeight = image.height;
    const ratio = Math.max(paddedSize / imgWidth, paddedSize / imgHeight);
    const newWidth = imgWidth * ratio;
    const newHeight = imgHeight * ratio;
    const offsetX = startX + (paddedSize - newWidth) / 2;
    const offsetY = startY + (paddedSize - newHeight) / 2;

    ctx.drawImage(image, offsetX, offsetY, newWidth, newHeight);

    // Restore the context state
    ctx.restore();
  }, []);

  // Effect to re-draw the previews whenever the image, padding, or background color changes
  useEffect(() => {
    if (imageSrc) {
      const image = new Image();
      image.src = imageSrc;
      image.onload = () => {
        // Draw previews for the main view (at xxxhdpi size)
        drawIcon(squareCanvasRef.current, image, 'square', ICON_SIZES['mipmap-xxxhdpi'], padding, backgroundColor, isTransparent);
        drawIcon(roundCanvasRef.current, image, 'round', ICON_SIZES['mipmap-xxxhdpi'], padding, backgroundColor, isTransparent);
        drawIcon(circleCanvasRef.current, image, 'circle', ICON_SIZES['mipmap-xxxhdpi'], padding, backgroundColor, isTransparent);
      };
    }
  }, [imageSrc, padding, backgroundColor, isTransparent, drawIcon]);

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsProcessing(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageSrc(event.target.result);
        setIsImageSelected(true);
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    }
  };

  // Trigger file input click
  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  // Handle export/download process
  const handleExport = () => {
    if (!imageSrc) {
      console.error('No image selected to export.');
      return;
    }

    setIsDownloading(true);

    const image = new Image();
    image.src = imageSrc;
    image.onload = () => {
      const format = exportFormat;
      const mimeType = format === 'png' ? 'image/png' : 'image/webp';
      const fileExtension = format === 'png' ? 'png' : 'webp';

      // Loop through each folder size
      Object.entries(ICON_SIZES).forEach(([folderName, size]) => {
        // Create a temporary canvas for this specific icon size
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = size;
        tempCanvas.height = size;

        // Generate and download the three shapes
        const shapes = [
          { name: 'ic_launcher_foreground', shape: 'square' },
          { name: 'ic_launcher_round', shape: 'circle' },
          { name: 'ic_launcher', shape: 'round' },
        ];

        shapes.forEach(({ name, shape }) => {
          drawIcon(tempCanvas, image, shape, size, padding, backgroundColor, isTransparent);

          const dataUrl = tempCanvas.toDataURL(mimeType);
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = `${folderName}/${name}.${fileExtension}`;
          link.click();
        });
      });

      setIsDownloading(false);
    };
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-8 flex flex-col items-center justify-center font-sans">
      <div className="w-full max-w-4xl bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-10 border border-gray-700">
        <h1 className="text-3xl sm:text-4xl font-bold text-center mb-6 text-indigo-400">
          Android Icon Generator
        </h1>
        <p className="text-center text-gray-400 mb-8">
          Upload an image, adjust the padding and background color, and export a complete set of Android app icons.
        </p>
        
        {/* File upload section */}
        <div className="flex flex-col items-center mb-8">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/jpeg, image/png, image/webp, image/ico"
            className="hidden"
          />
          <button
            onClick={handleUploadClick}
            disabled={isProcessing}
            className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-full shadow-lg transition-all duration-200 transform hover:scale-105 disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            <Upload size={20} />
            <span>{isProcessing ? 'Processing...' : 'Upload Image'}</span>
          </button>
          {isImageSelected && (
            <p className="mt-4 text-green-400">Image successfully loaded!</p>
          )}
        </div>

        {/* Previews and controls section */}
        {imageSrc && (
          <>
            {/* Image Previews */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
              <div className="flex flex-col items-center">
                <h3 className="text-xl font-semibold mb-3 text-center text-gray-300">Round Icon (ic_launcher)</h3>
                <div className="relative w-full aspect-square max-w-[192px] rounded-2xl shadow-xl border-4 border-gray-600 bg-gray-700 overflow-hidden">
                  <canvas ref={roundCanvasRef} width="192" height="192" className="w-full h-full"></canvas>
                </div>
              </div>
              <div className="flex flex-col items-center">
                <h3 className="text-xl font-semibold mb-3 text-center text-gray-300">Square Icon (ic_launcher_foreground)</h3>
                <div className="relative w-full aspect-square max-w-[192px] rounded-2xl shadow-xl border-4 border-gray-600 bg-gray-700 overflow-hidden">
                  <canvas ref={squareCanvasRef} width="192" height="192" className="w-full h-full"></canvas>
                </div>
              </div>
              <div className="flex flex-col items-center">
                <h3 className="text-xl font-semibold mb-3 text-center text-gray-300">Circle Icon (ic_launcher_round)</h3>
                <div className="relative w-full aspect-square max-w-[192px] rounded-2xl shadow-xl border-4 border-gray-600 bg-gray-700 overflow-hidden">
                  <canvas ref={circleCanvasRef} width="192" height="192" className="w-full h-full"></canvas>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-6">
              {/* Padding slider */}
              <div>
                <label className="flex items-center text-lg font-semibold text-gray-300 mb-2">
                  <Sliders className="mr-2" />
                  Padding / Zoom: <span className="ml-2 font-bold text-indigo-400">{padding}px</span>
                </label>
                <input
                  type="range"
                  min="-20" // Updated to allow negative values
                  max="40"
                  value={padding}
                  onChange={(e) => setPadding(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer range-thumb-indigo-500"
                />
              </div>
              
              {/* Background Color Picker */}
              <div>
                <label className="flex items-center text-lg font-semibold text-gray-300 mb-2">
                  <Palette className="mr-2" />
                  Background Options
                </label>
                <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0 items-start sm:items-center">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="transparent-bg"
                      checked={isTransparent}
                      onChange={(e) => setIsTransparent(e.target.checked)}
                      className="form-checkbox h-5 w-5 text-indigo-500 rounded border-gray-600"
                    />
                    <label htmlFor="transparent-bg" className="text-gray-300">Transparent</label>
                  </div>
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    disabled={isTransparent}
                    className="w-full sm:w-auto h-10 border-2 border-gray-600 rounded-lg cursor-pointer disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Format selection */}
              <div>
                <label className="flex items-center text-lg font-semibold text-gray-300 mb-2">
                  <Save className="mr-2" />
                  Export Format
                </label>
                <div className="flex space-x-4">
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="format"
                      value="png"
                      checked={exportFormat === 'png'}
                      onChange={() => setExportFormat('png')}
                      className="form-radio text-indigo-500"
                    />
                    <span className="ml-2 text-gray-300">PNG</span>
                  </label>
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="format"
                      value="webp"
                      checked={exportFormat === 'webp'}
                      onChange={() => setExportFormat('webp')}
                      className="form-radio text-indigo-500"
                    />
                    <span className="ml-2 text-gray-300">WebP</span>
                  </label>
                </div>
              </div>

              {/* Export button */}
              <div className="flex justify-center mt-8">
                <button
                  onClick={handleExport}
                  disabled={isDownloading || !imageSrc}
                  className="flex items-center space-x-2 px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-full shadow-lg transition-all duration-200 transform hover:scale-105 disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                  <Save size={20} />
                  <span>{isDownloading ? 'Downloading...' : 'Export All Icons'}</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default App;
