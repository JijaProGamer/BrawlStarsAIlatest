process.setMaxListeners(0);

const { Environment } = require("./ai/environment.js")
const StartScreen = require("./screen/screen.js")

let environmentDetectionSettings = {
    iouThreshold: 0.85,
    scoreThreshold: 0.5,
    softNmsSigma: 0.2,
}

let screenUsed = 0;

let Resolution = [448, 224]
let Framerate = 10

const LocalEnvironment = new Environment({ 
    Resolution, Framerate, screenUsed,
    DetectionSettings: environmentDetectionSettings
})

let lastFrameEnded = true
async function OnFrame(frame){
    if(!lastFrameEnded || !LocalEnvironment.Started) return;
    lastFrameEnded = false

    const [ environmentResult ] = await LocalEnvironment.ProcessStep(frame);
    
    lastFrameEnded = true;
}

/*const imageToPBM = require("./screen/imageToPBM.js")
const cutout = require("./screen/cutout.js")
const fs = require("fs")
async function OnFrame(frame){
    const cropped = cutout(frame, Resolution, {
        x1: Math.round(0.8650 * Resolution[0]), 
        x2: Math.round(0.9125 * Resolution[0]), 
        y1: Math.round(0.0250 * Resolution[1]), 
        y2: Math.round(0.0775 * Resolution[1])
    })

    const PBM = imageToPBM(cropped.image, cropped.resolution);
    fs.writeFileSync("test.pbm", PBM, "utf-8")

    const PBMFull = imageToPBM(frame, Resolution);
    fs.writeFileSync("test_full.pbm", PBMFull, "utf-8")
}*/

async function Run(){
    const [_, recorder] = await Promise.all([
        LocalEnvironment.init(),
        StartScreen(Resolution, Framerate, screenUsed, OnFrame)
    ])
}

Run()