const friendlyAABB = {
    x1: 0.8425,
    x2: 0.8875,
    y1: 0.88,
    y2: 0.96,
}

function isGoodPixel(r, g, b){
    return g > 100 && r < 25 && b < 25;
}
function hasGadget(image, resolution){
    let pixels = 0;
    let goodPixels = 0;
    
    for(let x = Math.round(friendlyAABB.x1 * resolution[0]); x < Math.round(friendlyAABB.x2 * resolution[0]); x++){
        for(let y = Math.round(friendlyAABB.y1 * resolution[1]); y < Math.round(friendlyAABB.y2 * resolution[1]); y++){
            const index = (y * resolution[0] + x) * 3;
            const r = image[index];
            const g = image[index + 1];
            const b = image[index + 2];
            
            if(isGoodPixel(r, g, b)) {
                goodPixels ++;
            }

            pixels += 1;
        }
    }
    
    return goodPixels/pixels >= 0.35;
}

module.exports = hasGadget;