const imageToBMP = require("./imageToBMP.js")

async function imageToText(image, resolution, ocrSheduler){
    const bmpImage = imageToBMP(image, resolution);
    const ocrData = await ocrSheduler.addJob('recognize', bmpImage);
    console.log(ocrData.data.text)

    return ocrData.data.text;
}

module.exports = imageToText;