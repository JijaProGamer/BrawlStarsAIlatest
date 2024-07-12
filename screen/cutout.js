function cutout(image, resolution, bbox, convolution) {
    if (bbox.width) { bbox.x2 = bbox.x1 + bbox.width; }
    if (bbox.height) { bbox.y2 = bbox.y1 + bbox.height; }
    if(bbox.x2 < bbox.x1) {let temp = bbox.x1; bbox.x1 = bbox.x2; bbox.x2 = temp};
    if(bbox.y2 < bbox.y1) {let temp = bbox.y1; bbox.y1 = bbox.y2; bbox.y2 = temp};

    const outputResolution = [
        bbox.x2 - bbox.x1,
        bbox.y2 - bbox.y1,
    ];

    const outputImage = new Array(outputResolution[0] * outputResolution[1] * 3);
    let lastIndex = 0;

    for (let y = bbox.y1; y < bbox.y2; y++) {
        for (let x = bbox.x1; x < bbox.x2; x++) {
            const index = (y * resolution[0] + x) * 3;
            const r = image[index];
            const g = image[index + 1];
            const b = image[index + 2];

            if(convolution){
                let color = convolution(r, g, b);
                outputImage[lastIndex++] = color[0];
                outputImage[lastIndex++] = color[1];
                outputImage[lastIndex++] = color[2];
            } else {
                outputImage[lastIndex++] = r;
                outputImage[lastIndex++] = g;
                outputImage[lastIndex++] = b;
            }
        }
    }

    return {
        resolution: outputResolution,
        image: outputImage
    }
}


module.exports = cutout;