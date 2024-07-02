
const child_process = require("child_process")

function spawnScreen(Resolution, Framerate, WindowTitle) {
    return new Promise((resolve, reject) => {
        let screenProcess = child_process.spawn(`scrcpy`, [
            `--no-audio`, // disable audio
            `--max-size=${Resolution[0]}`, // set resolution
            `--video-bit-rate=2000K`, // max 2 megabits per second
            `--max-fps=${Framerate * 2}`, // set fps
            `--video-codec=h264`, // set codec (h264/h265)
            //`--display-buffer=${Math.ceil(1000/Framerate)}`, // set display buffer to remove tearing
            `--keyboard=uhid`, // hardware keyboard simulation
            `--mouse=sdk`,
            //`--mouse=uhid`, // hardware mouse simulation
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

class CircularBuffer {
    constructor(maxSize) {
        this.buffer = Buffer.allocUnsafe(maxSize);
        this.maxSize = maxSize;
        this.start = 0;
        this.end = 0;
        this.length = 0;
    }

    write(data) {
        const dataLength = data.length;
        if (dataLength > this.maxSize) {
            throw new Error('Data exceeds buffer size');
        }

        if (this.length + dataLength <= this.maxSize) {
            data.copy(this.buffer, this.end);
            this.end = (this.end + dataLength) % this.maxSize;
            this.length += dataLength;
        } else {
            const remainingSpace = this.maxSize - this.length;
            data.copy(this.buffer, this.end, 0, remainingSpace);
            data.copy(this.buffer, 0, remainingSpace);
            this.end = dataLength - remainingSpace;
            this.length = this.maxSize;
        }
    }

    read(chunkSize) {
        if (chunkSize > this.length) {
            chunkSize = this.length;
        }

        const output = Buffer.allocUnsafe(chunkSize);
        if (this.start + chunkSize <= this.maxSize) {
            this.buffer.copy(output, 0, this.start, this.start + chunkSize);
        } else {
            const endPartLength = this.maxSize - this.start;
            this.buffer.copy(output, 0, this.start, this.maxSize);
            this.buffer.copy(output, endPartLength, 0, chunkSize - endPartLength);
        }

        this.start = (this.start + chunkSize) % this.maxSize;
        this.length -= chunkSize;
        
        return output;
    }
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
        '-vf', `format=rgba,scale=${Resolution[0]}:${Resolution[1]}`, // rgba pixel format (8 bis per channel, 32 bits (1 int) per pixel)
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

    const bufferCapacity = Resolution[0] * Resolution[1] * 4 * Framerate;
    const buffer = new CircularBuffer(bufferCapacity);

    ffmpegProcess.stdout.on('data', (data) => {
        buffer.write(data);

        const chunkSize = Resolution[0] * Resolution[1] * 4;
        while (buffer.length >= chunkSize) {
            const frameData = buffer.read(chunkSize);
            onFrame(frameData);
        }
    });
}
function parseRawVideoDataRGB(data) {
    const pixels = Array(data.length * 3/4);//Array(data.length * 3/4);

    let k = 0;
    for (let i = 0; i < data.length; i += 4) {
        const red = data.readUInt8(i);
        const green = data.readUInt8(i + 1);
        const blue = data.readUInt8(i + 2);

        pixels[k] = red;
        pixels[k + 1] = green;
        pixels[k + 2] = blue;

        k += 3;
    }


    return pixels;
}

const fs = require("fs");

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
            let pixelsRGB = parseRawVideoDataRGB(pixels)


            let ppmRGB = `P3\n${Resolution[0]} ${Resolution[1]}\n255\n`;

            for (let i = 0; i < pixelsRGB.length; i += 3) {
                ppmRGB += `${pixelsRGB[i]} ${pixelsRGB[i + 1]} ${pixelsRGB[i + 2]} `;
            }

            fs.writeFile(`./tmp/frame${frameIndex}RGB.ppm`, ppmRGB, "utf-8", () => { })
        }*/

        setTimeout(() => {
            recorder = spawnScreenRecorder(
                Resolution, Framerate, WindowTitle, 
                { onStart, onError, onClose, onFrame: (pixels) => onFrame(parseRawVideoDataRGB(pixels)) }
            )
        }, 1000)
    })
}