function HideImagePart(image, resolution, start, end){
    for(let x = start[0]; x < end[0]; x++){
        for(let y = start[1]; y < end[1]; y++){
            let index = (x + resolution[0] * y) * 3;

            image[index] = 0;
            image[index + 1] = 0;
            image[index + 2] = 0;
        }
    }

    return image
}

function CalculateLocalGadget(sx, sy, radius, minGadgetGreeness, image, resolution){
    let pixelsCalculated = 0
    let pixelsGreen = 0

    for(let x = sx - radius; x < sx + radius; x++){
        for(let y = sy - radius; y < sy + radius; y++){
            if(Math.sqrt( (sx - x)*(sx - x) + (sy - y)*(sy - y) ) > radius) continue;

            let index = (x + resolution[0] * y) * 3;
            let [r, g, b] = [image[index], image[index + 1], image[index + 2]]

            if(r < 100 && g > 50 && b < 100){
                pixelsGreen++;
            }

            image[index] = 0;
            image[index + 1] = 0;
            image[index + 2] = 0;            

            pixelsCalculated++;
        }
    }

    return image;
    //return pixelsGreen/pixelsCalculated >= minGadgetGreeness;
}

function CalculatePlayerHealth(image, resolution, playerPosition){
    let health = 0;
    let pixelsCounted = 0;

    let healthbarStart = [playerPosition[0] - 4, playerPosition[1] - 10]
    let healthbarEnd = [playerPosition[0] + 9, playerPosition[1] - 9]

    for(let x = healthbarStart[0]; x < healthbarEnd[0]; x++){
        for(let y = healthbarStart[1]; y < healthbarEnd[1]; y++){
            let index = (x + resolution[0] * y) * 2;

            health += image[index] > 100;
            pixelsCounted += 1;
        }
    }

    return health / pixelsCounted;
}

function isMe(red, green, blue){
    return false;//red < 100 && green > 150 && green < 200 && blue < 150 && blue > 0;
}

function isTeammate(red, green, blue){
    return red < 85 && red > 50 && green > 150 && blue > 165 && green < 180 && blue < 200;
}

function isEnemy(red, green, blue){
    return red > 175 && green < 115 && blue < 125 && green > 100 && blue > 85;
}

function isBall(red, green, blue){
    //return red > 50 && red < 250 && green > 0 && green < 100 && blue < 150 && blue > 0;
    //return red > 150 && blue < 75 && (green < 200 && blue < 50 || green > 200);
    return false;
}

function FindCharacters(image, resolution){
    for(let x = 0; x < resolution[0]; x++){
        for(let y = 0; y < resolution[1]; y++){
            let index = (x + resolution[0] * y) * 3;
            let red = image[index];
            let green = image[index + 1];
            let blue = image[index + 2];

            if(isTeammate(red, green, blue) || isEnemy(red, green, blue) || isMe(red, green, blue) || isBall(red, green, blue)){

            } else {
                image[index] = 0;
                image[index + 1] = 0;
                image[index + 2] = 0;
            }
        }
    }

    return image
}

function propagate(image, resolution){
    let newImage = []

    for(let x = 0; x < resolution[0]; x++){
        for(let y = 0; y < resolution[1]; y++){
            let index = (x + resolution[0] * y) * 3;
            let red = image[index];
            let green = image[index + 1];
            let blue = image[index + 2];

            if(red == 0 && green == 0 && blue == 0){
                let ured = 0;
                let ugreen = 0;
                let ublue = 0;
                let fragments = 0;

                for(let xs = -3; xs <= 3; xs++){
                    for(let ys = -3; ys <= 3; ys++){
                        let xn = x + xs;
                        let yn = y + ys;
                        if(xn < 0 || yn < 0) continue;
    
                        let nindex = (xn + resolution[0] * yn) * 3;
                        let nred = image[nindex];
                        let ngreen = image[nindex + 1];
                        let nblue = image[nindex + 2];
    
                        if(nred > 0 || ngreen > 0 || nblue > 0){
                            ured += nred;
                            ugreen += ngreen;
                            ublue += nblue;
                            fragments += 1;
                        }
                    }
                }

                if(fragments > 0){
                    newImage[index] = Math.round(ured) / (fragments * 2);
                    newImage[index + 1] = Math.round(ugreen) / (fragments * 2);
                    newImage[index + 2] = Math.round(ublue) / (fragments * 2);                
                } else {
                    newImage[index] = 0;
                    newImage[index + 1] = 0;
                    newImage[index + 2] = 0;    
                }
            } else {
                newImage[index] = image[index];
                newImage[index + 1] = image[index + 1];
                newImage[index + 2] = image[index + 2];
            }
        }
    }

    return newImage
}

const fs = require('fs');
function loadImageFromPathRG(path){
    const data = fs.readFileSync(path, 'utf8');
    const lines = data.split('\n');
    const resolution = lines[1].split(' ').map(Number);

    const pixels = [];
    for (let i = 3; i < lines.length; i++) {
        const row = lines[i].trim().split(' ').map(Number);
        for (let j = 0; j < row.length; j += 3) {
            const r = row[j];
            const b = row[j + 2];
            pixels.push(r, b);
        }
    }

    return { resolution, pixels };
}

function loadImageFromPathRGB(path){
    const buffer = fs.readFileSync(path);
    const pixelOffset = buffer.readUInt32LE(10);
    const width = buffer.readUInt32LE(18);
    const height = buffer.readUInt32LE(22);
    const bpp = buffer.readUInt16LE(28);

    if (bpp !== 24) {
        throw new Error('Unsupported bits per pixel (BPP). Only 24 BPP is supported.');
    }

    const resolution = [ width, height ];

    const pixels = [];
    const rowSize = Math.floor((bpp * width + 31) / 32) * 4;
    for (let y = 0; y < height; y++) {
        const rowOffset = pixelOffset + rowSize * (height - y - 1);
        for (let x = 0; x < width; x++) {
            const offset = rowOffset + 3 * x;
            const b = buffer.readUInt8(offset);
            const g = buffer.readUInt8(offset + 1);
            const r = buffer.readUInt8(offset + 2);
            pixels.push( r, g, b );
        }
    }

    return { resolution, pixels };
}

function saveImageToPPM(filePath, resolution, pixels) {
    const stream = fs.createWriteStream(filePath);

    stream.write(`P3\n${resolution[0]} ${resolution[1]}\n255\n`);

    for (let i = 0; i < pixels.length; i+=3) {
        const r = pixels[i];
        const g = pixels[i+1];
        const b = pixels[i+2];
        stream.write(`${r} ${g} ${b} `);
        if ((i + 1) % resolution[0] === 0) {
            stream.write('\n');
        }
    }

    stream.end();
}

let testImage = loadImageFromPathRGB("./testImageRGB.bmp")
/*let sx = 137
let sy = 66

testImage.pixels = HideImagePart(testImage.pixels, testImage.resolution, [sx - 2, sy - 2], [sx + 2, sy + 2])

CalculatePlayerHealth(testImage.pixels, testImage.resolution, [sx, sy])
saveImageToPPM("./testOutput.ppm", testImage.resolution, testImage.pixels)*/ // health*/

let sx = 240
let sy = 121
let radius = 5

//testImage.pixels = HideImagePart(testImage.pixels, testImage.resolution, [sx - radius, sy - radius], [sx + radius, sy + radius])

//console.log(CalculateLocalGadget(240, 121, 5, 0.85, testImage.pixels, testImage.resolution))
//testImage.pixels = CalculateLocalGadget(240, 121, 8, 0.5, testImage.pixels, testImage.resolution);

//testImage.pixels = FindCharacters(testImage.pixels, testImage.resolution)

testImage.pixels = FindCharacters(testImage.pixels, testImage.resolution)
testImage.pixels = propagate(testImage.pixels, testImage.resolution)

saveImageToPPM("./testOutput.ppm", testImage.resolution, testImage.pixels)