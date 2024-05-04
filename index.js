const { MouseControlType, KeyboardControlType } = require("./control/control.js")
const { makeModel, train, predict } = require("./ai/test.js")

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

const child_process = require("child_process")

let windowTitle = `brawlAI-screen`
let recordingResolution = [296, 136]
let framerate = 15

let screenProcess
let ffmpegProcess

makeModel(recordingResolution)

function spawnScreen(){
    return new Promise((resolve, reject) => {
        screenProcess = child_process.spawn(`scrcpy`, [
            `--no-audio`, // disable audio
            `--max-size=${recordingResolution[0]}`, // set resolution
            `--video-bit-rate=2000K`, // max 2 megabits per second
            `--max-fps=${framerate * 2}`, // set fps
            `--video-codec=h264`, // set codec (h264/h265)
            //`--display-buffer=${Math.ceil(1000/framerate)}` // set display buffer to remove tearing
            `--keyboard=uhid`, // hardware keyboard simulation
            `--mouse=uhid`, // hardware mouse simulation
            //`--mouse=disabled`,
            `--stay-awake`, // stops screen from going to sleep
            '--disable-screensaver', // stops screen from going to sleep
            `--window-title=${windowTitle}`, // set screen title
            `--window-borderless`, // remove borders
            `--render-driver=software`, // render using CPU instead of GPU (for recording)
        ])

        screenProcess.stderr.on("data", (data) => {
            if(data.toString().includes("ERROR: ")){
                reject(data.toString())
            }
        })

        screenProcess.stdout.on("data", (data) => {
            if(data.toString().includes("INFO: Texture: ")){
                resolve()
            }
        })
    })
}


function spawnScreenRecorder({
    onStart,
    onFrame,
    onError,
    onClose
}){
    ffmpegProcess = child_process.spawn(`ffmpeg`, [
        //`-re`, // force input to be framerate consistent
        `-draw_mouse`, `0`,
        `-f`, `gdigrab`, // app record mode
        `-framerate`, `${framerate}`, // framerate
        `-i`, `title=${windowTitle}`, // screen title
        `-f`, `rawvideo`, // raw video data
        `-vcodec`, `rawvideo`, // raw video data
        '-vf', 'format=rgba', // rgba pixel format (8 bis per channel, 32 bits (1 int) per pixel)
        `-an`, // no sound
        `-draw_mouse`, `0`,
        `-` // pipe to stdout
    ])

    let started = false;

    ffmpegProcess.stderr.on("data", (data) => {
        data = data.toString()
        //console.log(data)

        if(!started && data.includes("frame=")){
            started = true;
            onStart();
        }

        if(data.includes("Error")){
            onError(data)
            onClose("error")
        }
    })

    let bytesWritten = 0;
    const imageBuffer = Buffer.allocUnsafe(recordingResolution[0] * recordingResolution[1] * 4);

    ffmpegProcess.stdout.on('data', (data) => {
        const remainingBytes = imageBuffer.length - bytesWritten;
    
        if (remainingBytes >= data.length) {
            data.copy(imageBuffer, bytesWritten);
            bytesWritten += data.length;
        } else {
            data.copy(imageBuffer, bytesWritten, 0, remainingBytes);
            onFrame(imageBuffer);

            const remainingDataLength = data.length - remainingBytes;
            data.copy(imageBuffer, 0, remainingBytes, remainingDataLength);
    
            bytesWritten = remainingDataLength;
        }
    });
}

function parseRawVideoData(data) {
    const pixels = Array(data.length / 2);

    for (let i = 0; i < data.length; i += 4) {
        const red = data.readUInt8(i);
        //const green = data.readUInt8(i + 1);
        const blue = data.readUInt8(i + 2);

        let index = i / 2;

        pixels[index] = red;
        pixels[index + 1] = blue;
    }


    return pixels;
}

spawnScreen().then(() => {
    function onStart(){
        console.log("recorder started")
    }

    function onError(err){
        throw new Error(`recorder failed to start: ${err}`)
    }

    function onClose(reason){
        console.log(`recorder stopped with reason ${reason}`)
    }

    let frameIndex = 0
    function onFrame(pixels){
        frameIndex += 1;
        /*let ppm = `P3\n${recordingResolution[0]} ${recordingResolution[1]}\n255\n`;

        for(let i = 0; i < pixels.length; i += 4){
            ppm += `${pixels.readUInt8(i)} 0 ${pixels.readUInt8(i + 2)} `;
        }
    
        require("fs").writeFile(`./tmp/frame${frameIndex}.ppm`, ppm, "utf-8", () => {})*/

        /*pixels = parseRawVideoData(pixels)

        let ppm = `P3\n${recordingResolution[0]} ${recordingResolution[1]}\n255\n`;

        for(let i = 0; i < pixels.length; i += 2){
            ppm += `${pixels[i]} 0 ${pixels[i + 1]} `;
        }
    
        require("fs").writeFile(`./tmp/frame${frameIndex}.ppm`, ppm, "utf-8", () => {})*/

        pixels = parseRawVideoData(pixels)
        console.time("start")
        let prediction = predict(recordingResolution, pixels)
        console.timeEnd("start")
        //console.log(prediction)
    }

    setTimeout(() => {
        spawnScreenRecorder({ onStart, onError, onClose, onFrame })
    }, 1000)
})