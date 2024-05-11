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

/*function isTeammate(red, green, blue){
    return blue > 150 && green < 150 && red < 150;
}

function isEnemy(red, green, blue){
    return red > 150 && blue < 150 && green < 150;
}

function FindCharacters(image, resolution){
    for(let x = 0; x < resolution[0]; x++){
        for(let y = 0; y < resolution[1]; y++){
            let index = (x + resolution[0] * y) * 3;
            let red = image[index];
            let green = image[index + 1];
            let blue = image[index + 2];

            if(!isTeammate(red, green, blue) && !isEnemy(red, green, blue)){
                image[index] = 0;
                image[index + 1] = 0;
                image[index + 2] = 0;
            }
        }
    }

    return image
}*/

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
    const data = fs.readFileSync(path, 'utf8');
    const lines = data.split('\n');
    const resolution = lines[1].split(' ').map(Number);

    const pixels = [];
    for (let i = 3; i < lines.length; i++) {
        const row = lines[i].trim().split(' ').map(Number);
        for (let j = 0; j < row.length; j += 3) {
            const r = row[j];
            const g = row[j + 1];
            const b = row[j + 2];
            pixels.push(r, g, b);
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

let testImage = loadImageFromPathRGB("./testImageRGB.ppm")
/*let sx = 137
let sy = 66

testImage.pixels = HideImagePart(testImage.pixels, testImage.resolution, [sx - 2, sy - 2], [sx + 2, sy + 2])

CalculatePlayerHealth(testImage.pixels, testImage.resolution, [sx, sy])
saveImageToPPM("./testOutput.ppm", testImage.resolution, testImage.pixels)*/ // health

/*let sx = 279
let sy = 121
let radius = 10

testImage.pixels = HideImagePart(testImage.pixels, testImage.resolution, [sx - radius, sy - radius], [sx + radius, sy + radius])*/

//testImage.pixels = FindCharacters(testImage.pixels, testImage.resolution)
saveImageToPPM("./testOutput.ppm", testImage.resolution, testImage.pixels)