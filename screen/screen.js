
const child_process = require("child_process")

function spawnScreen(Resolution, Framerate, WindowTitle) {
    return new Promise((resolve, reject) => {
        let screenProcess = child_process.spawn(`scrcpy`, [
            `--no-audio`, // disable audio
            `--max-size=${Resolution[0]}`, // set resolution
            `--video-bit-rate=2000K`, // max 2 megabits per second
            `--max-fps=${Framerate * 2}`, // set fps
            `--video-codec=h264`, // set codec (h264/h265)
            //`--display-buffer=${Math.ceil(1000/framerate)}` // set display buffer to remove tearing
            `--keyboard=uhid`, // hardware keyboard simulation
            `--mouse=uhid`, // hardware mouse simulation
            //`--mouse=disabled`,
            `--stay-awake`, // stops screen from going to sleep
            '--disable-screensaver', // stops screen from going to sleep
            `--window-title=${WindowTitle}`, // set screen title
            `--window-borderless`, // remove borders
            `--window-x=0`, `--window-y=0`, // set position to 0
            `--render-driver=software`, // render using CPU instead of GPU (for recording)
        ])

        screenProcess.stderr.on("data", (data) => {
            if (data.toString().includes("ERROR: ")) {
                screenProcess.kill()
                reject(data.toString())
            }
        })

        screenProcess.stdout.on("data", (data) => {
            if (data.toString().includes("INFO: Texture: ")) {
                resolve(screenProcess)
            }
        })
    })
}


function spawnScreenRecorder(Resolution, Framerate, WindowTitle, {
    onStart,
    onFrame,
    onError,
    onClose
}) {
    let ffmpegProcess = child_process.spawn(`ffmpeg`, [
        //`-re`, // force input to be framerate consistent
        `-draw_mouse`, `0`,
        `-f`, `gdigrab`, // app record mode
        `-framerate`, `${Framerate}`, // framerate
        `-i`, `title=${WindowTitle}`, // screen title
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

        if (!started && data.includes("frame=")) {
            started = true;
            onStart();
        }

        if (data.includes("Error")) {
            ffmpegProcess.kill()
            onError(data)
            onClose("error")
        }
    })

    let bytesWritten = 0;
    const imageBuffer = Buffer.allocUnsafe(Resolution[0] * Resolution[1] * 4);

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

module.exports = function StartScreen(Resolution, Framerate, WindowTitle, onFrame) {
    return new Promise(async (resolve, reject) => {
        let screen = await spawnScreen(Resolution, Framerate, WindowTitle)
        let recorder;

        function onStart() {
            resolve([screen, recorder]);
        }

        function onError(err) {
            reject(new Error(`recorder failed to start: ${err}`))
        }

        function onClose(reason) {
            console.log(`recorder stopped with reason ${reason}`)
        }

        /*let frameIndex = 0
        function onFrame(pixels) {
            frameIndex += 1;

            pixels = parseRawVideoData(pixels)

            let ppm = `P3\n${recordingResolution[0]} ${recordingResolution[1]}\n255\n`;

            for (let i = 0; i < pixels.length; i += 2) {
                ppm += `${pixels[i]} 0 ${pixels[i + 1]} `;
            }

            require("fs").writeFile(`./tmp/frame${frameIndex}.ppm`, ppm, "utf-8", () => { })

            /*pixels = parseRawVideoData(pixels)
            console.time("start")
            let prediction = predict(recordingResolution, pixels)
            console.timeEnd("start")
            //console.log(prediction)
        }*/

        setTimeout(() => {
            recorder = spawnScreenRecorder(
                Resolution, Framerate, WindowTitle, 
                { onStart, onError, onClose, onFrame: (pixels) => onFrame(parseRawVideoData(pixels)) }
            )
        }, 1000)
    })
}