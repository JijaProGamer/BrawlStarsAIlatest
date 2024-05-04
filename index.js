const { Environment } = require("./ai/environment.js")

const { MouseControlType, KeyboardControlType } = require("./control/control.js")
const StartScreen = require("./screen/screen.js")
const uuid = require("uuid")

/*let moveController = new KeyboardControlType(["w", "s", "a", "d", "wa", "wd", "sa", "sd"])

for(let x = -1; x <= 1; x += 0.1){
    for(let y = -1; y <= 1; y += 0.1){
        console.time("start")
        moveController.move([x, y])
        console.timeEnd("start")
    }
}*/

/*let sleep = (ms) => new Promise(r => setTimeout(r, ms))

;(async () => {
    let aimController = new MouseControlType(50, [500, 500])

    aimController.begin()

    for(let y = -1; y <= 1; y += 0.1){
        aimController.move([Math.sin(y), y])
        await sleep(10)
    }

    aimController.stop()
})()*/

let windowTitle = `brawlAI-screen-`
let Resolution = [296, 136]
let framerate = 15

let screenProcess
let ffmpegProcess

const LocalEnvironment = new Environment(Resolution)

async function OnFrame(frameData){
    LocalEnvironment.ProcessStep(frameData)
}

async function Run(){
    [screenProcess, ffmpegProcess] = await StartScreen(Resolution, framerate, `${windowTitle}-${uuid.v4()}`, OnFrame);


}

Run()