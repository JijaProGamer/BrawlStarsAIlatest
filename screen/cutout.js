function cutout(image, resolution, bbox) {
    // Ensure bbox has x2 and y2 values
    if (bbox.width) { bbox.x2 = bbox.x1 + bbox.width; }
    if (bbox.height) { bbox.y2 = bbox.y1 + bbox.height; }

    // Calculate the resolution of the output image
    const outputResolution = [
        bbox.x2 - bbox.x1,
        bbox.y2 - bbox.y1,
    ];

    const outputImage = new Array(outputResolution[0] * outputResolution[1] * 3);
    let lastIndex = 0;

    // Iterate over the bounding box area and copy the pixel data
    for (let y = bbox.y1; y < bbox.y2; y++) {
        for (let x = bbox.x1; x < bbox.x2; x++) {
            const index = (y * resolution[0] + x) * 3;
            const r = image[index];
            const g = image[index + 1];
            const b = image[index + 2];

            outputImage[lastIndex++] = r;
            outputImage[lastIndex++] = g;
            outputImage[lastIndex++] = b;
        }
    }

    return {
        resolution: outputResolution,
        image: outputImage
    }
}


module.exports = cutout;