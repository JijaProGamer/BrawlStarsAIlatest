const friendlyAABB = {
    x1: 0.0233,
    x2: 0.0345,
    y1: 0.0342,
    y2: 0.0750,
}

const enemyAABB = {
    x1: 0.9583,
    x2: 0.9695,
    y1: 0.0342,
    y2: 0.0750,
}
function isWhitePixel(r, g, b){
    return r > 200 && g > 200 && b > 200
}

async function getBBScores(image, resolution){
    let pixelsFriendly = 0;
    let goodPixelsFriendly = 0;

    let pixelsEnemy = 0;
    let goodPixelsEnemy = 0;
    
    for(let x = Math.round(friendlyAABB.x1 * resolution[0]); x < Math.round(friendlyAABB.x2 * resolution[0]); x++){
        for(let y = Math.round(friendlyAABB.y1 * resolution[1]); y < Math.round(friendlyAABB.y2 * resolution[1]); y++){
            const index = (x * resolution[0] + y) * 3;
            const r = image[index];
            const g = image[index + 1];
            const b = image[index + 2];
            
            if(isWhitePixel(r, g, b)) {
                goodPixelsFriendly ++;
            }

            pixelsFriendly += 1;
        }
    }

    for(let x = Math.round(enemyAABB.x1 * resolution[0]); x < Math.round(enemyAABB.x2 * resolution[0]); x++){
        for(let y = Math.round(enemyAABB.y1 * resolution[1]); y < Math.round(enemyAABB.y2 * resolution[1]); y++){
            const index = (x * resolution[0] + y) * 3;
            const r = image[index];
            const g = image[index + 1];
            const b = image[index + 2];
            
            if(isWhitePixel(r, g, b)) {
                goodPixelsEnemy ++;
            }

            pixelsEnemy += 1;
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

    const closestDistanceEnemy = 2;
    const closestIndexEnemy = -1;
    for(let [index, value] of whitePixelsValues.entries()){
        let distance = Math.abs(value - percentEnemy);
        if(distance < closestDistanceEnemy){
            closestDistanceEnemy = distance;
            closestIndexEnemy = index;
        }
    }
    
    return {
        friendly: whitePixelsKeys[closestIndexFriendly],
        enemy: whitePixelsKeys[closestIndexEnemy],
    }
}

module.exports = getBBScores;