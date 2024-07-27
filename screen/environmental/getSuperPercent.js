const friendlyAABB = {
    x1: 0.7675,
    x2: 0.8025,
    y1: 0.7875,
    y2: 0.8525,
}

let centerAABB = {
    x: (friendlyAABB.x1 + friendlyAABB.x2) / 2,
    y: (friendlyAABB.y1 + friendlyAABB.y2) / 2
}

function isGoodPixel(r, g, b){
    return r > 100 && g > 50 && b < 75;
}
function getSuperPercent(image, resolution){
    let pixels = 0;
    let goodPixels = 0;

    for(let x = Math.round(friendlyAABB.x1 * resolution[0]); x < Math.round(friendlyAABB.x2 * resolution[0]); x++){
        for(let y = Math.round(friendlyAABB.y1 * resolution[1]); y < Math.round(friendlyAABB.y2 * resolution[1]); y++){
            let distanceVector = [x/resolution[0] - centerAABB.x, y/resolution[1] - centerAABB.y];
            let distance = Math.sqrt(distanceVector[0]*distanceVector[0] + distanceVector[1]*distanceVector[1]);
            
            //if(distance < 0.0175 || distance > 0.0200){
            if(distance < 0.02 || distance > 0.0225){
                continue;
            }
            
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
    console.log(goodPixels/pixels, 69420)
    
    return Math.round(goodPixels/pixels * 15) / 15;
}

module.exports = getSuperPercent;