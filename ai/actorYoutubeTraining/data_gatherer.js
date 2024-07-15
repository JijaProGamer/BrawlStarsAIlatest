const playlistID = "PLGtZwVE-T07vYODoUzNweS6upEexk3024";

const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const ytdl = require('@distube/ytdl-core');
const axios = require("axios");
const path = require("path");

const apikey = fs.readFileSync(path.join(__dirname, "apikey"))

/*async function getPlaylistVideos(id){
    let allVideos = [];
    let nextPageToken = '';
    
    do {
        const result = await axios.get(`https://www.googleapis.com/youtube/v3/playlistItems`, {
            params: {
                part: 'id,snippet',
                maxResults: 50,
                playlistId: id,
                pageToken: nextPageToken,
                key: apikey
            }
        });

        allVideos = allVideos.concat(result.data.items);
        nextPageToken = result.data.nextPageToken;
    } while (nextPageToken);

    const videoDetails = allVideos.map(item => {
        const videoId = item.snippet.resourceId.videoId;
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        return videoId;
    });

    return videoDetails;
}*/

async function getPlaylistVideos(id) {
    const result = await axios.get(`https://www.googleapis.com/youtube/v3/playlistItems`, {
        params: {
            part: 'id,snippet',
            maxResults: 50,
            playlistId: id,
            key: apikey
        }
    });

    return result.data.items.map((v) => v.snippet.resourceId.videoId);
}

async function downloadVideo(id, resolution) {
    return new Promise(async (resolve, reject) => {
        const info = await ytdl.getInfo(id);

        const filteredFormats = info.formats.filter(format => {
            if (format.hasAudio) return;

            const resolution = parseInt(format.qualityLabel.replace('p', ''), 10);
            return resolution >= 144 && resolution <= 1080;
        });

        filteredFormats.sort((a, b) => {
            return parseInt(b.qualityLabel.replace('p', ''), 10) - parseInt(a.qualityLabel.replace('p', ''), 10);
        });

        const selectedFormat = filteredFormats[0];

        const stream = ytdl(id, { format: selectedFormat })
            .on('error', error => {
                console.error('ytdl error:', error);
                reject(error);
            });

        ffmpeg(stream)
            .outputFormat('rawvideo')
            .videoCodec('rawvideo')
            .outputFPS(10)
            .size(resolution.join('x'))
            .outputOptions([`-pix_fmt rgba`, `-vf scale=${resolution[0]}:${resolution[1]}:flags=lanczos+accurate_rnd+full_chroma_int+full_chroma_inp`])
            .output(fs.createWriteStream(path.join(__dirname, "video.raw")))
            .on('end', () => resolve())
            .on('error', err => reject(err))
            .run();
    })
}

function getFrame(resolution, index, videoRaw){
    const frameSize = (resolution[0] * resolution[1]) * 4;
    const indexStart = frameSize * index;
    const indexEnd = frameSize * (index + 1);

    const rawFrame = videoRaw.slice(indexStart, indexEnd);
    const frame = new Uint8Array((frameSize / 4) * 3);

    let j = 0;
    for(let i = 0; i < frameSize; i += 4){
        frame[j++] = rawFrame[i];
        frame[j++] = rawFrame[i + 1];
        frame[j++] = rawFrame[i + 2];
    }

    return frame;
}

function readFile(filePath){
    return new Promise((resolve, reject) => {
        const readStream = fs.createReadStream(filePath);
        const chunks = [];
    
        readStream.on('data', (chunk) => {
            chunks.push(chunk);
        });
    
        readStream.on('end', () => {
            const buffer = Buffer.concat(chunks);
            resolve(buffer);
        });
    
        readStream.on('error', (err) => {
            reject(err);
        });
    })
}

const imageToPBM = require("../../screen/imageToPBM")

async function dataGenerator(resolution) {
    const playlist = await getPlaylistVideos(playlistID)

    //await downloadVideo(playlist[0], resolution)
    let videoRaw = await readFile(path.join(__dirname, "video.raw"))
    fs.writeFileSync("image.pbm", imageToPBM(getFrame(resolution, 1030, videoRaw), resolution))

    //console.log(playlist)

    const numElements = 10;
    let index = 0;

    return function*(){
        for(let i = 0; i <= numElements; i++){
            const x = index;
            index++;

            if(x == numElements){
                return x;
            } else {
                yield x;
            }
        }
    }
}

; (async () => {
    for (let a of (await dataGenerator([448, 224]))() ) {
        //console.log(a)
    }
})();

module.exports = dataGenerator;