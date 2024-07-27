const friendlyAABB = {
    x1: 0.0400,
    x2: 0.1600,
    y:  0.0700,
}

const enemyAABB = {
    x1: 0.0400,
    x2: 0.1600,
    y:  0.1250,
}

function isFriendlyPixel(r, g, b){
    return b > 80 && r < 100;
}

function isEnemyPixel(r, g, b){
    return r > 150 && r > g && g > b;
}

function getHotzonePercent(image, resolution){
    let pixelsFriendly = 0;
    let goodPixelsFriendly = 0;

    let pixelsEnemy = 0;
    let goodPixelsEnemy = 0;
    
    let y1 = Math.round(friendlyAABB.y * resolution[1]);

    for(let x = Math.round(friendlyAABB.x1 * resolution[0]); x < Math.round(friendlyAABB.x2 * resolution[0]); x++){
        const index = (y1 * resolution[0] + x) * 3;
        const r = image[index];
        const g = image[index + 1];
        const b = image[index + 2];
        
        if(isFriendlyPixel(r, g, b)) {
            goodPixelsFriendly ++;
        }

        pixelsFriendly += 1;
    }

    let y2 = Math.round(enemyAABB.y * resolution[1]);

    for(let x = Math.round(enemyAABB.x1 * resolution[0]); x < Math.round(enemyAABB.x2 * resolution[0]); x++){
            const index = (y2 * resolution[0] + x) * 3;
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