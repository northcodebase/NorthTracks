const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const sizes = [16, 32, 48, 64, 128, 256];

app.whenReady().then(() => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  const svgPath = path.join(__dirname, '../favicon.svg');
  const svgContent = fs.readFileSync(svgPath, 'utf8');

  // We load a simple HTML containing the SVG and canvas drawing code
  win.loadURL(`data:text/html;charset=utf-8,
    <html>
      <body>
        <div id="svg-container">${encodeURIComponent(svgContent)}</div>
        <script>
          const { ipcRenderer } = require('electron');
          const svgEl = document.querySelector('svg');
          
          async function renderAll() {
            const pngs = [];
            for (const size of ${JSON.stringify(sizes)}) {
              const canvas = document.createElement('canvas');
              canvas.width = size;
              canvas.height = size;
              const ctx = canvas.getContext('2d');
              
              // Create a blob from the SVG content
              const svgString = new XMLSerializer().serializeToString(svgEl);
              // Set width and height on the cloned string to scale it
              const parser = new DOMParser();
              const doc = parser.parseFromString(svgString, 'image/svg+xml');
              const root = doc.documentElement;
              root.setAttribute('width', size);
              root.setAttribute('height', size);
              
              const scaledSvgString = new XMLSerializer().serializeToString(root);
              const svgBlob = new Blob([scaledSvgString], { type: 'image/svg+xml;charset=utf-8' });
              const url = URL.createObjectURL(svgBlob);
              
              const img = new Image();
              await new Promise((resolve) => {
                img.onload = () => {
                  ctx.drawImage(img, 0, 0, size, size);
                  URL.revokeObjectURL(url);
                  resolve();
                };
                img.src = url;
              });
              
              const dataUrl = canvas.toDataURL('image/png');
              pngs.push({ size, dataUrl });
            }
            ipcRenderer.send('pngs-rendered', pngs);
          }
          renderAll();
        </script>
      </body>
    </html>
  `);
});

ipcMain.on('pngs-rendered', (event, pngs) => {
  try {
    const pngBuffers = pngs.map(item => {
      const base64Data = item.dataUrl.replace(/^data:image\/png;base64,/, "");
      return {
        size: item.size,
        buffer: Buffer.from(base64Data, 'base64')
      };
    });

    // Package PNGs into an ICO file
    // ICO Header: 6 bytes
    // Reserved (2 bytes): 0
    // Type (2 bytes): 1 (icon)
    // Image Count (2 bytes): sizes.length
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(pngBuffers.length, 4);

    const dirEntries = [];
    let currentOffset = 6 + pngBuffers.length * 16;

    for (const item of pngBuffers) {
      const entry = Buffer.alloc(16);
      
      // Width (1 byte): 0 means 256
      entry.writeUInt8(item.size === 256 ? 0 : item.size, 0);
      // Height (1 byte): 0 means 256
      entry.writeUInt8(item.size === 256 ? 0 : item.size, 1);
      // Color count (1 byte): 0 for >8bpp
      entry.writeUInt8(0, 2);
      // Reserved (1 byte): 0
      entry.writeUInt8(0, 3);
      // Color planes (2 bytes): 1
      entry.writeUInt16LE(1, 4);
      // Bits per pixel (2 bytes): 32
      entry.writeUInt16LE(32, 6);
      // Size of image data (4 bytes)
      entry.writeUInt32LE(item.buffer.length, 8);
      // Offset of image data (4 bytes)
      entry.writeUInt32LE(currentOffset, 12);

      dirEntries.push(entry);
      currentOffset += item.buffer.length;
    }

    const outputDir = path.join(__dirname, '../resources');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputFile = path.join(outputDir, 'icon.ico');
    const writeStream = fs.createWriteStream(outputFile);
    
    writeStream.write(header);
    for (const entry of dirEntries) {
      writeStream.write(entry);
    }
    for (const item of pngBuffers) {
      writeStream.write(item.buffer);
    }
    
    writeStream.end(() => {
      console.log('ICO file created successfully at:', outputFile);
      app.quit();
    });
  } catch (err) {
    console.error('Failed to create ICO file:', err);
    app.exit(1);
  }
});
