const friendlyAABB = {
    x1: 0.0800,
    x2: 0.1300,
    y1: 0.0250,
    y2: 0.0775,
}

const enemyAABB = {
    x1: 0.8650,
    x2: 0.9125,
    y1: 0.0250,
    y2: 0.0775,
}

const whitePixelsValues = [0.135, 0.069, 0.108];

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
            const index = (y * resolution[0] + x) * 3;
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
            const index = (y * resolution[0] + x) * 3;
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

    console.log(percentFriendly, percentEnemy)

    let closestDistanceFriendly = 2;
    let closestIndexFriendly = -1;
    for(let [index, value] of whitePixelsValues.entries()){
        let distance = Math.abs(value - percentFriendly);
        if(distance < closestDistanceFriendly){
            closestDistanceFriendly = distance;
            closestIndexFriendly = index;
        }
    }

    let closestDistanceEnemy = 2;
    let closestIndexEnemy = -1;
    for(let [index, value] of whitePixelsValues.entries()){
        let distance = Math.abs(value - percentEnemy);
        if(distance < closestDistanceEnemy){
            closestDistanceEnemy = distance;
            closestIndexEnemy = index;
        }
    }

    console.log(closestIndexFriendly, closestIndexEnemy)
    
    return {
        friendly: closestIndexFriendly,
        enemy: closestIndexEnemy,
    }
}

module.exports = getBBScores;