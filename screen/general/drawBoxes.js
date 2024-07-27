function pixelIntersectsBBoxes(bboxes, pixel, resolution){
    let intersects = false;

    for(let bbox of bboxes){
        let x1 = Math.round(bbox.x1 * resolution[0]);
        let x2 = Math.round(bbox.x2 * resolution[1]);
        let y1 = Math.round(bbox.y1 * resolution[1]);
        let y2 = Math.round(bbox.y2 * resolution[1]);

        if(pixel[0] >= x1 && pixel[0] <= x2 && pixel[1] >= y1 && pixel[1] <= y2){
            intersects = true;
            break;
        }
    }

    return intersects;
}

function drawBoxes(image, resolution, bboxes) {
    console.log(bboxes)
    for (let y = 0; y < resolution[1]; y++) {
        for (let x = 0; x < resolution[0]; x++) {
            const index = (y * resolution[0] + x) * 3;

            if(pixelIntersectsBBoxes(bboxes, [x, y], resolution)){
                image[index] = image[index + 1] = image[index + 2] = 0;
            }
        }
    }

    return image;
}


module.exports = drawBoxes;