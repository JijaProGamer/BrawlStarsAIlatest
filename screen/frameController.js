function HideImagePart(image, resolution, start, end){
    for(let x = start[0]; x < end[0]; x++){
        for(let y = start[1]; y < end[1]; y++){
            let index = (x + resolution[0] * y) * 2;

            image[index] = 0;
            image[index + 1] = 0;
        }
    }

    return image
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

const fs = require('fs');
function loadImageFromPath(path){
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

function saveImageToPPM(filePath, resolution, pixels) {
    const stream = fs.createWriteStream(filePath);

    stream.write(`P3\n${resolution[0]} ${resolution[1]}\n255\n`);

    for (let i = 0; i < pixels.length; i+=2) {
        const r = pixels[i];
        const b = pixels[i+1];
        stream.write(`${r} 0 ${b} `);
        if ((i + 1) % resolution[0] === 0) {
            stream.write('\n');
        }
    }

    stream.end();
}

let testImage = loadImageFromPath("./exampleFrame.ppm")
/*let sx = 137
let sy = 66

testImage.pixels = HideImagePart(testImage.pixels, testImage.resolution, [sx - 2, sy - 2], [sx + 2, sy + 2])

CalculatePlayerHealth(testImage.pixels, testImage.resolution, [sx, sy])
saveImageToPPM("./testOutput.ppm", testImage.resolution, testImage.pixels)*/ // health

let sx = 279
let sy = 121
let radius = 10

testImage.pixels = HideImagePart(testImage.pixels, testImage.resolution, [sx - radius, sy - radius], [sx + radius, sy + radius])
saveImageToPPM("./testOutput.ppm", testImage.resolution, testImage.pixels)