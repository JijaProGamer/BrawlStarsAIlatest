const systeminformation = require('systeminformation'); 
const child_process = require("child_process")

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


async function spawnScreenRecorder(Resolution, Framerate, screenUsed, {
    onStart,
    onFrame,
    onError,
    onClose
}) {
    const graphicsInfo = await systeminformation.graphics()
    const screenInfo = graphicsInfo.displays[screenUsed]

    let ffmpegProcess = child_process.spawn(`ffmpeg`, [
        //`-re`, // force input to be framerate consistent
        `-hwaccel`, `d3d11va`,
        `-init_hw_device`, `d3d11va`,

        `-draw_mouse`, `0`,

        `-framerate`, `${Framerate}`, // framerate
        `-offset_x`, `${screenInfo.positionX}`,
        `-offset_y`, `${screenInfo.positionY}`,
        `-video_size`, `${screenInfo.currentResX}x${screenInfo.currentResY}`,

        `-f`, `gdigrab`,
        `-i`, `desktop`,

        `-f`, `rawvideo`, // raw video data
        //'-vf', `format=rgba,scale=${Resolution[0]}:${Resolution[1]}:flags=lanczos+accurate_rnd+full_chroma_int+full_chroma_inp`,
        '-vf', `scale=${Resolution[0]}:${Resolution[1]}:flags=lanczos+accurate_rnd+full_chroma_int+full_chroma_inp`,
        `-pix_fmt`, `rgba`,
        `-an`, // no sound
        `-` // pipe to stdout
    ])

    /*let ffmpegProcess = child_process.spawn(`ffmpeg`, [
        //`-re`, // force input to be framerate consistent
        `-hwaccel`, `d3d11va`,
        `-init_hw_device`, `d3d11va`,
        `-draw_mouse`, `0`,
        `-f`, `gdigrab`, // app record mode
        `-framerate`, `${Framerate}`, // framerate
        `-i`, `title=BlueStacks App Player`, // screen title
        `-f`, `rawvideo`, // raw video data
        '-vf', `format=rgba,scale=${Resolution[0]}:${Resolution[1]}:flags=lanczos+accurate_rnd+full_chroma_int+full_chroma_inp`,
        `-an`, // no sound
        `-` // pipe to stdout
    ])*/

    /*let ffmpegProcess = child_process.spawn(`ffmpeg`, [
        `-re`,
        `-hwaccel`, `d3d11va`,
        `-i`, `C:\\Users\\bloxx\\Downloads\\test_video_bb.mkv`,
        `-f`, `rawvideo`,
        '-vf', `format=rgba,scale=${Resolution[0]}:${Resolution[1]}:flags=lanczos+accurate_rnd+full_chroma_int+full_chroma_inp,fps=${Framerate}`,
        `-an`,
        `-`
    ])*/

    let started = false;

    ffmpegProcess.stderr.on("data", (data) => {
        data = data.toString()

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
    const pixels = Array(data.length * 3/4);

    let k = 0;
    for (let i = 0; i < data.length; i += 4) {
        const red = data.readUInt8(i);
        const green = data.readUInt8(i + 1);
        const blue = data.readUInt8(i + 2);

        //pixels[k] = red;//Math.floor(red / 1.15);
        //pixels[k + 1] = green;//Math.floor(green / 1.15);
        //pixels[k + 2] = blue;//Math.floor(blue / 1.15);

        pixels[k] = red;
        pixels[k + 1] = green
        pixels[k + 2] = blue;

        k += 3;
    }


    return pixels;
}

module.exports = function StartScreen(Resolution, Framerate, screenUsed, onFrame) {
    return new Promise((resolve, reject) => {
        let recorder

        function onStart() {
            resolve(recorder);
        }

        function onError(err) {
            reject(new Error(`recorder failed to start: ${err}`))
        }

        function onClose(reason) {
            console.log(`recorder stopped with reason ${reason}`)
        }

        recorder = spawnScreenRecorder(
            Resolution, Framerate, screenUsed, 
            { 
                onStart, onError, onClose, 
                onFrame: (pixels) => onFrame(parseRawVideoDataRGB(pixels))
            }
        )
    })
}