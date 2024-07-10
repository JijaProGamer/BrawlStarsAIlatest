const playerWidth = 0.05;
const playerHeight = 0.175;

function isFriendlyPixel(r, g, b){
    return r < 75 && g > 200 && b < 100
}

function isMePixel(r, g, b){
    return r < 75 && g < 150 && b > 200
}

function isEnemyPixel(r, g, b){
    return r > 200 && g < 150 && b < 200
}

function isEmptyPixel(r, g, b){
    return r < 100 && g < 100 && b < 100
}

async function getHealth(image, imageBuffer, resolution, ocrSheduler, player){
    const currentPixelX = Math.floor((player.x1 < player.x2 ? player.x1 : player.x2) * resolution[0]);
    const currentPixelY = Math.ceil((player.y1 > player.y2 ? player.y2 : player.y1) * resolution[1]);

    let bestHealthlineX = -1;
    let bestHealthlineY = -1;
    let bestCorrectPixels = 0;
    let bestEmptyPixels = 0;

    for(let x = currentPixelX; x < currentPixelX + playerWidth * resolution[0]; x++){
        for(let y = currentPixelY; x < currentPixelY + playerHeight * resolution[0]; y++){

            let goodPixels = 0;
            let emptyPixels = 0;

            for(let lx = x; lx < x + playerWidth * resolution[0]; lx++){
                const index = (lx * resolution[0] + y) * 3;
                const r = image[index];
                const g = image[index + 1];
                const b = image[index + 2];
                
                if(isEmptyPixel(r, g, b)) {
                    bestCorrectPixels ++;
                    emptyPixels ++;
                }

                switch(player.class){
                    case "Me":
                        if(isMePixel(r, g, b)) bestCorrectPixels ++;
                        break;
                    case "Enemy":
                        if(isEnemyPixel(r, g, b)) bestCorrectPixels ++;
                        break;
                    case "Friendly":
                        if(isFriendlyPixel(r, g, b)) bestCorrectPixels ++;
                        break;
                }
            }

            if(goodPixels > bestCorrectPixels){
                bestCorrectPixels = goodPixels;
                bestEmptyPixels = emptyPixels;
                bestHealthlineX = lx;
                bestHealthlineY = y;
            }
        }
    }

    const health = parseInt((await ocrSheduler.addJob('detect', imageBuffer)).data.text);
    const healthPrecent = 1 - bestEmptyPixels/bestCorrectPixels;
    const fullHealth = health * 1/healthPrecent;
    
    return {
        health, 
        fullHealth,
        healthPrecent
    }
}

module.exports = { getHealth }