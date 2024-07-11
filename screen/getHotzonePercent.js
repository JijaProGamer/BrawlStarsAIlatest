const friendlyAABB = {
    x1: 0.0345,
    x2: 0.1266,
    y:  0.0703,
}

const enemyAABB = {
    x1: 0.0345,
    x2: 0.1266,
    y:  0.1250,
}

function isFriendlyPixel(r, g, b){
    return r < 100 && g < 150 && b > 200;
}

function isEnemyPixel(r, g, b){
    return r > 200 && g < 100 && b < 100;
}

function getHotzonePercent(image, resolution){
    let pixelsFriendly = 0;
    let goodPixelsFriendly = 0;

    let pixelsEnemy = 0;
    let goodPixelsEnemy = 0;
    
    let y = Math.round(friendlyAABB.y1 * resolution[1]);

    for(let x = Math.round(friendlyAABB.x1 * resolution[0]); x < Math.round(friendlyAABB.x2 * resolution[0]); x++){
        const index = (y * resolution[0] + x) * 3;
        const r = image[index];
        const g = image[index + 1];
        const b = image[index + 2];
        
        if(isFriendlyPixel(r, g, b)) {
            goodPixelsFriendly ++;
        }

        pixelsFriendly += 1;
    }

    for(let x = Math.round(enemyAABB.x1 * resolution[0]); x < Math.round(enemyAABB.x2 * resolution[0]); x++){
            const index = (y * resolution[0] + x) * 3;
            const r = image[index];
            const g = image[index + 1];
            const b = image[index + 2];
            
            if(isEnemyPixel(r, g, b)) {
                goodPixelsEnemy ++;
            }

            pixelsEnemy += 1;
    }
    
    return {
        friendly: goodPixelsFriendly/pixelsFriendly,
        enemy: goodPixelsEnemy/pixelsEnemy
    }
}

module.exports = getHotzonePercent;