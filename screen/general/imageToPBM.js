function imageToPBM(image, resolution) {
    let ppmData = `P3\n${resolution[0]} ${resolution[1]}\n255\n`;

    for (let i = 0; i < image.length; i += 3) {
        ppmData += `${image[i]} ${image[i + 1]} ${image[i + 2]}\n`;
    }

    return ppmData;
}

module.exports = imageToPBM;