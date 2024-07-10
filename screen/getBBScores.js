const friendlyAABB = {
    x1: 0,
    x2: 0,
    y1: 0,
    y2: 0
}

const whitePixelsKeys = [0, 1, 2];
const whitePixelsValues = [0, 0, 0];

function isWhitePixel(r, g, b){
    return r > 200 && g > 200 && b > 200
}

async function getBBScores(image, resolution){
    let pixelsFriendly = 0;
    let goodPixelsFriendly = 0;

    let pixelsEnemy = 0;
    let goodPixelsEnemy = 0;
    
    for(let x = friendlyAABB.x1 * resolution[0]; x < friendlyAABB.x2 * resolution[0]; x++){
        for(let y = friendlyAABB.y1 * resolution[1]; y < friendlyAABB.y2 * resolution[1]; y++){
        
        }
    }

    const percentFriendly = goodPixelsFriendly/pixelsFriendly;
    const percentEnemy = goodPixelsEnemy/pixelsEnemy;

    const closestDistanceFriendly = 2;
    const closestIndexFriendly = -1;
    for(let [index, value] of whitePixelsValues.entries()){
        let distance = Math.abs(value - percentFriendly);
        if(distance < closestDistanceFriendly){
            closestDistanceFriendly = distance;
            closestIndexFriendly = index;
        }
    }
    
    return {
        scoreFriendly: whitePixelsKeys[]
    }
}

module.exports = { getBBScores }