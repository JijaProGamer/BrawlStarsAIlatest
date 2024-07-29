process.setMaxListeners(0);

const { Environment } = require("./ai/environment.js")
const StartScreen = require("./screen/screen.js")

let screenUsed = 0;

let Resolution = [448, 224]
let Framerate = 10

const LocalEnvironment = new Environment({ 
    Resolution, Framerate, screenUsed
})

/*let lastFrameEnded = true
async function OnFrame(frame){
    if(!lastFrameEnded || !LocalEnvironment.Started) return;
    lastFrameEnded = false

    const [ environmentResult ] = await LocalEnvironment.ProcessStep(frame);
    
    lastFrameEnded = true;
}

LocalEnvironment.CurrentMatchType = "GemGrab";*/

function isWhitePixel(r, g, b, x, y, aabb){
    let distanceVector = [
        x/Resolution[0] - (aabb.x1 + aabb.x2) / 2 / Resolution[0], 
        y/Resolution[1] - (aabb.y1 + aabb.y2) / 2 / Resolution[1]
    ];

    distanceVector[1]/=2;

    let distance = Math.sqrt(distanceVector[0]*distanceVector[0] + distanceVector[1]*distanceVector[1]);

    //if((distanceX < 0.013 && distanceY < 0.014) || (distanceX > 0.014 && distanceY > 0.015)) return [255, 255, 255];
    if(distance < 0.012 || distance > 0.017) return [255,255,255];

    return (r > 100 && g < 100 && b > 100) ? [r, g, b] : [0, 0, 0];
}
const imageToPBM = require("./screen/general/imageToPBM.js")
const cutout = require("./screen/general/cutout.js")
const fs = require("fs")

let frameIndex = 0
async function OnFrame(frame){
    const cropped = cutout(frame, Resolution, {
        /*x1: Math.round(0.41 * Resolution[0]), 
        x2: Math.round(0.47 * Resolution[0]), 
        y1: Math.round(0.73 * Resolution[1]), 
        y2: Math.round(0.89 * Resolution[1])*/

        x1: 131,
        y1: 24,
        x2: 131 + Math.round(0.09 * Resolution[0]),
        y2: 24 + Math.round(0.2 * Resolution[1]),
    })//, isWhitePixel)

    const PBM = imageToPBM(cropped.image, cropped.resolution);
    //fs.writeFileSync(`tmp/test_${frameIndex}.pbm`, PBM, "utf-8")
    fs.writeFileSync(`test.pbm`, PBM, "utf-8")

    const PBMFull = imageToPBM(frame, Resolution);
    fs.writeFileSync(`test_full.pbm`, PBMFull, "utf-8")
    frameIndex++
}

async function Run(){
    const [_, recorder] = await Promise.all([
        LocalEnvironment.init(),
        StartScreen(Resolution, Framerate, screenUsed, OnFrame)
    ])
}

Run()