const friendlyAABB = {
    x1: 0.74,
    x2: 0.7750,
    y1: 0.9050,
    y2: 0.965,
}

let centerAABB = {
    x: (friendlyAABB.x1 + friendlyAABB.x2) / 2,
    y: (friendlyAABB.y1 + friendlyAABB.y2) / 2
}

function isGoodPixel(r, g, b){
    return (r > 100 && g < 100 && b > 100) || (r > 200 && b > 200 && g > 200);
}
function getSuperPercent(image, resolution){
    let pixelsFull = 0;
    let goodPixelsFull = 0;

    let pixels = 0;
    let goodPixels = 0;

    for(let x = Math.round(friendlyAABB.x1 * resolution[0]); x < Math.round(friendlyAABB.x2 * resolution[0]); x++){
        for(let y = Math.round(friendlyAABB.y1 * resolution[1]); y < Math.round(friendlyAABB.y2 * resolution[1]); y++){
            let distanceVector = [x/resolution[0] - centerAABB.x, y/resolution[1] - centerAABB.y];
            distanceVector[1]/=2;

            let distance = Math.sqrt(distanceVector[0]*distanceVector[0] + distanceVector[1]*distanceVector[1]);
            
            const index = (y * resolution[0] + x) * 3;
            const r = image[index];
            const g = image[index + 1];
            const b = image[index + 2];

            if(distance >= 0.012 && distance <= 0.017){
                if(isGoodPixel(r, g, b)) {
                    goodPixels ++;
                }
    
                pixels += 1;
            }
            
            if(isGoodPixel(r, g, b)) {
                goodPixelsFull ++;
            }

            pixelsFull += 1;
        }
    }

    if(goodPixelsFull/pixelsFull > 0.5) return 1;
    return Math.round((goodPixels/pixels * 1.5) * 15) / 15;
}

module.exports = getSuperPercent;