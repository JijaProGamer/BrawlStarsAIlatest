const imageToText = require("./../general/imageToText.js")
const cutout = require("./../general/cutout.js")

const friendlyAABB = {
    x1: 0.02,
    x2: 0.1,
    y1: 0.02,
    y2: 0.105,
}

const enemyAABB = {
    x1: 0.94,
    x2: 0.99,
    y1: 0.02,
    y2: 0.105,
}
function isWhitePixel(r, g, b){
    return (r > 125 && g > 125 && b > 125 && g*1.25 > b) ? [r, g, b] : [0, 0, 0]
}

async function getGBGems(image, resolution, ocrSheduler){
    const cutoutFriendly = cutout(image, resolution, {
        x1: Math.round(friendlyAABB.x1 * resolution[0]),
        x2: Math.round(friendlyAABB.x2 * resolution[0]),
        y1: Math.round(friendlyAABB.y1 * resolution[1]),
        y2: Math.round(friendlyAABB.y2 * resolution[1]),
    }, 
    isWhitePixel);

    const cutoutEnemy = cutout(image, resolution, {
        x1: Math.round(enemyAABB.x1 * resolution[0]),
        x2: Math.round(enemyAABB.x2 * resolution[0]),
        y1: Math.round(enemyAABB.y1 * resolution[1]),
        y2: Math.round(enemyAABB.y2 * resolution[1]),
    }, isWhitePixel);

    const [textFriendly, textEnemy] = await Promise.all([
        imageToText(cutoutFriendly.image, cutoutFriendly.resolution, ocrSheduler),
        imageToText(cutoutEnemy.image, cutoutEnemy.resolution, ocrSheduler)
    ])

    return {
        friendly: isNaN(parseInt(textFriendly)) ? 0 : parseInt(textFriendly),
        enemy: isNaN(parseInt(textEnemy)) ? 0 : parseInt(textEnemy)
    }
}

module.exports = getGBGems;