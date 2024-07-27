function createBmpBuffer(image, resolution) {
    const bmpHeader = Buffer.alloc(14);
    bmpHeader.write('BM');
    bmpHeader.writeUInt32LE(54 + image.length, 2);
    bmpHeader.writeUInt32LE(0, 6);
    bmpHeader.writeUInt32LE(54, 10);
  
    const dibHeader = Buffer.alloc(40);
    dibHeader.writeUInt32LE(40, 0);
    dibHeader.writeInt32LE(resolution[0], 4);
    dibHeader.writeInt32LE(resolution[1], 8);
    dibHeader.writeUInt16LE(1, 12);
    dibHeader.writeUInt16LE(24, 14);
    dibHeader.writeUInt32LE(0, 16);
    dibHeader.writeUInt32LE(image.length, 20);
    dibHeader.writeInt32LE(0, 24);
    dibHeader.writeInt32LE(0, 28)
    dibHeader.writeUInt32LE(0, 32);
    dibHeader.writeUInt32LE(0, 36);
  
    const rowSize = Math.ceil((resolution[0] * 3) / 4) * 4;
    const pixelData = Buffer.alloc(rowSize * resolution[1]);
  
    for (let y = 0; y < resolution[1]; y++) {
      for (let x = 0; x < resolution[0]; x++) {
        const pixelIndex = (y * resolution[0] + x) * 3;
        const bmpIndex = ((resolution[1] - y - 1) * rowSize) + (x * 3);
  
        pixelData[bmpIndex] = image[pixelIndex + 2];
        pixelData[bmpIndex + 1] = image[pixelIndex + 1];
        pixelData[bmpIndex + 2] = image[pixelIndex];
      }
    }
  
    return Buffer.concat([bmpHeader, dibHeader, pixelData]);
}

module.exports = createBmpBuffer