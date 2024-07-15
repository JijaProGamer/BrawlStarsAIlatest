const MapDiscount = 8
const PixelsPerDiscount = MapDiscount*MapDiscount;

function DownscaleImage(imageData, resolution) {
    if (resolution[0] % MapDiscount !== 0 || resolution[1] % MapDiscount !== 0) {
      throw new Error('Image width and height must be divisible by MapDiscount.');
    }
  
    const newWidth = resolution[0] / MapDiscount;
    const newHeight = resolution[1] / MapDiscount;
    const newImageData = new Array(newWidth * newHeight);
  
    for (let y = 0; y < newHeight; y++) {
      for (let x = 0; x < newWidth; x++) {
        let rSum = 0, gSum = 0, bSum = 0;
  
        for (let by = 0; by < MapDiscount; by++) {
          for (let bx = 0; bx < MapDiscount; bx++) {
            const srcX = x * MapDiscount + bx;
            const srcY = y * MapDiscount + by;
            const srcIndex = (srcY * resolution[0] + srcX) * 3;
            
            rSum += imageData[srcIndex];
            gSum += imageData[srcIndex + 1];
            bSum += imageData[srcIndex + 2];
          }
        }

        const destIndex = y * newWidth + x;
        newImageData[destIndex] = [Math.round(rSum / PixelsPerDiscount), Math.round(gSum / PixelsPerDiscount), Math.round(bSum / PixelsPerDiscount)]
      }
    }
  
    return {
      Resolution: [newWidth, newHeight],
      Image: newImageData
    };
}

function MapImage(Image){
    return Image.map(([r, g, b]) => (r + g + b)/3 > 50 && ((r + g + b)/3) < 150)
}

const imageToPBM = require("../screen/imageToPBM.js")
const fs = require("fs")

function CalculateActions(Environment, Image){
    const DownscaledImage = DownscaleImage(Image, Environment.Resolution);
    const MappedImage = MapImage(DownscaledImage.Image);

    const PBMFull = imageToPBM(DownscaledImage.Image.flat(), DownscaledImage.Resolution);
    fs.writeFileSync(`test_full.pbm`, PBMFull, "utf-8");

    
    const PBMMapped = imageToPBM(MappedImage.map(v => [v*255,v*255,v*255]).flat(), DownscaledImage.Resolution);
    fs.writeFileSync(`test_mapped.pbm`, PBMMapped, "utf-8");
}

module.exports = CalculateActions