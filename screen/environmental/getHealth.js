const playerWidth = 0.09;
const playerHeight = 0.2;

function isFriendlyPixel(r, g, b) {
    return (r < 50 && g > 200 && b > 200) || (r > 150 && g > 200 && b > 200);
}

function isMePixel(r, g, b) {
    return (r < 100 && g > 150 && b > 50 && r > 60 && b < 100) || (r < 175 && b > 100 && g > 200 && r > 150 && b > 100);
}

function isEnemyPixel(r, g, b) {
    return r > 150 && g < 75 && b < 100;
}

function isEmptyPixel(r, g, b) {
    return r < 60 && g < 60 && b < 105 && r > 25 && g > 25 && b > 70;
}

async function getHealth(image, imageBuffer, resolution, ocrSheduler, player) {
    const currentPixelX = Math.floor(((player.x1 < player.x2 ? player.x1 : player.x2) - 0.02) * resolution[0]);
    const currentPixelY = Math.ceil(((player.y1 > player.y2 ? player.y2 : player.y1) - 0.02) * resolution[1]);

    let bestCorrectPixels = 0;
    let bestFullPixels = 0;
    let bestEmptyPixels = 0;

    for (let y = currentPixelY; y < currentPixelY + playerHeight * resolution[1]; y++) {
        let fullPixels = 0;
        let emptyPixels = 0;

        for (let lx = currentPixelX; lx < currentPixelX + playerWidth * resolution[0]; lx++) {
            const index = (y * resolution[0] + lx) * 3;
            const r = image[index];
            const g = image[index + 1];
            const b = image[index + 2];

            if (isEmptyPixel(r, g, b)) {
                emptyPixels++;
                fullPixels++;
            } else {
                switch (player.class) {
                    case "Me":
                        if (isMePixel(r, g, b)) fullPixels++;
                        break;
                    case "Enemy":
                        if (isEnemyPixel(r, g, b)) fullPixels++;
                        break;
                    case "Friendly":
                        if (isFriendlyPixel(r, g, b)) fullPixels++;
                        break;
                }

                /*if(isMePixel(r, g, b) || isEnemyPixel(r, g, b) || isFriendlyPixel(r, g, b)){
                    goodPixels ++;
                }*/
            }
        }

        if ((fullPixels + emptyPixels) > bestCorrectPixels) {
            bestCorrectPixels = (fullPixels + emptyPixels);

            bestEmptyPixels = emptyPixels;
            bestFullPixels = fullPixels;
        }
    }

    /*const health = parseInt((await ocrSheduler.addJob('recognize', imageBuffer)).data.text);
    const healthPrecent = bestFullPixels / bestCorrectPixels;
    const fullHealth = health * 1/healthPrecent;*/

    return {
        /*health, 
        fullHealth,
        healthPrecent*/
        health: bestFullPixels / bestCorrectPixels,
    }
}

module.exports = getHealth;