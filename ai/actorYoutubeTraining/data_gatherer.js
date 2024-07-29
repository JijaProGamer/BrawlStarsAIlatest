const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const ytdl = require('@distube/ytdl-core');
const axios = require("axios");
const path = require("path");

const LargeBuffer = require("./largeBuffer.js")

const ActorTraining = require("../actorActions/predict.js");
const { Environment } = require("../environment.js")

let environmentDetectionSettings = {
    iouThreshold: 0.85,
    scoreThreshold: 0.5,
    softNmsSigma: 0.2,
}

let screenUsed = 0;

let Resolution = [448, 224]
let Framerate = 10

const LocalEnvironment = new Environment({
    Resolution, Framerate, screenUsed
})


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

async function GetPlaylistVideos(id) {
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

async function DownloadVideo(id, resolution) {
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

        const output = new LargeBuffer();

        function tryDownload(run, err) {
            if (run == 0) reject(err)

            try {
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
                    .noAudio()
                    //.setStartTime(120) // 2 minutes
                    //.setDuration(parseInt(info.videoDetails.lengthSeconds, 10) - 120) // 2 minutes
                    .outputOptions([`-pix_fmt rgba`, `-vf scale=${resolution[0]}:${resolution[1]}:flags=lanczos+accurate_rnd+full_chroma_int+full_chroma_inp`])
                    .output(output)
                    //.on("stderr", console.log)
                    .on('end', () => resolve(output))
                    .on('error', err => reject(err))
                    .run();
            } catch (err) {
                tryDownload(run - 1, err)
            }
        }

        tryDownload(10)
    })
}

function GetFrame(resolution, index, videoRaw) {
    const frameSize = (resolution[0] * resolution[1]) * 4;
    const indexStart = frameSize * index;
    const indexEnd = frameSize * (index + 1);

    if (indexEnd > videoRaw.length || indexStart < 0) {
        return;
    }

    //const frame = new Uint8Array((frameSize / 4) * 3);
    const frame = new Array((frameSize / 4) * 3);

    let j = 0;
    for (let i = 0; i < frameSize; i += 4) {
        frame[j++] = videoRaw.get(indexStart + i);
        frame[j++] = videoRaw.get(indexStart + i + 1);
        frame[j++] = videoRaw.get(indexStart + i + 2);
    }

    return frame;
}

/*async function CreateBatchData(resolution, video, framesIndices) {
    const images = [];

    for (let i = -2; i < batchSize; i++) {
        const frame = GetFrame(resolution, lastFrame + i, video)
        if (frame) {
            images.push(frame);
        } else if (i < -2) {
            //images.push(new Uint8Array(resolution[0] * resolution[1] * 4));
            images.push(new Array(resolution[0] * resolution[1] * 4));
        }
    }

    fs.writeFileSync("image.pbm", imageToPBM(images[10], resolution))

    const indices = Array.from({ length: images.length - 2 }, (_, i) => 2 + i)
        .map((v) => { return { v, r: Math.random() } })
        .sort((a, b) => a.r - b.r)
        .map(v => v.v);

    let batch = { xs: [], ys: [] }

    for (let i = 0; i < indices.length; i++) {
        const indice = indices[i];

        await LocalEnvironment.CreateWorld(images[indice]);

        const worldPredictions = LocalEnvironment.PipeEnvironment();
        const actionsPredictions = (await ActorTraining.predict(images[indice])).predictions;

        const actionsConverted = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1];//actionsPredictions;

        batch.xs.push([images[indice], worldPredictions]);
        batch.ys.push(actionsConverted);
    }

    return batch;
}*/

function isGoodFrame(prediction){
    let attackButton = prediction.filter((v) => v.class == "Attack")[0];
    let attachSphere = prediction.filter((v) => v.class == "AttackSphere")[0];
    let moveButton = prediction.filter((v) => v.class == "MoveButton")[0];
    let moveSphere = prediction.filter((v) => v.class == "MoveJoystick")[0];

    return attackButton && attachSphere && moveButton && moveSphere;
}

let hadSuper = false;
let hadHypercharge = false;
let hadGadget = false;
let shootsLeft = 3;

function calculateActorActions(prediction){
    let attackButton = prediction.filter((v) => v.class == "Attack")[0];
    let attachSphere = prediction.filter((v) => v.class == "AttackSphere")[0];
    let moveButton = prediction.filter((v) => v.class == "MoveButton")[0];
    let moveSphere = prediction.filter((v) => v.class == "MoveJoystick")[0];
    let superButton = prediction.filter((v) => v.class == "Super")[0];
    let superSphere = prediction.filter((v) => v.class == "SuperSphere")[0];
    let gadgetButton = prediction.filter((v) => v.class == "Gadget")[0];
    let hyperchargeButton = prediction.filter((v) => v.class == "Hypercharge")[0];

    let attackButtonCentre = [(attackButton.x1 + attackButton.x2) / 2, (attackButton.x1 + attackButton.y2) / 2];
    let attachSphereCentre = [(attachSphere.x1 + attachSphere.x2) / 2, (attachSphere.x1 + attachSphere.y2) / 2];

    const attackDirection = [attachSphereCentre[0] - attackButtonCentre[0], attachSphereCentre[1] - attackButtonCentre[1]];

    let moveButtonCentre = [(moveButton.x1 + moveButton.x2) / 2, (moveButton.x1 + moveButton.y2) / 2];
    let moveSphereCentre = [(moveSphere.x1 + moveSphere.x2) / 2, (moveSphere.x1 + moveSphere.y2) / 2];

    const moveDirection = [moveSphereCentre[0] - moveButtonCentre[0], moveSphereCentre[1] - moveButtonCentre[1]];
    const moveDirectionMagnitude = Math.sqrt(moveDirection[0]*moveDirection[0] + moveDirection[1]*moveDirection[1]);
    const normalizedmoveDirection = [moveDirection[0] / moveDirectionMagnitude, moveDirection[1] / moveDirectionMagnitude];

    let superX = 0;
    let superY = 0;

    if(superButton && superSphere){
        let superButtonCentre = [(superButton.x1 + superButton.x2) / 2, (superButton.x1 + superButton.y2) / 2];
        let superSphereCentre = [(superSphere.x1 + superSphere.x2) / 2, (superSphere.x1 + superSphere.y2) / 2];

        superX = superSphereCentre[0] - superButtonCentre[0]
        superY = superSphereCentre[1] - superButtonCentre[1]
    }

    let didShoot, didUltra, didHypercharge, didGadget;

    if(LocalEnvironment.Actor.Shoots < shootsLeft){
        didShoot = true
    }

    if(LocalEnvironment.Actor.SuperCharge < 1 && hadSuper){
        didUltra = true
    }

    if(!LocalEnvironment.Actor.HyperCharge < 1 && hadHypercharge){
        didHypercharge = true
    }


    if(!LocalEnvironment.Actor.HasGadget && hadGadget){
        didGadget = true
    }

    let actions = [
        normalizedmoveDirection[0],     -normalizedmoveDirection[1],
        attackDirection[0]        ,     -attackDirection[1]        ,
        superX                    ,     -superY                    ,
        didShoot ? 1 : -1,
        didUltra ? 1 : -1,
        didHypercharge ? 1 : -1,
        didGadget ? 1 : -1
    ]

    for(let [index, action] of actions.entries()){
        if(Math.abs(action) < 0.1){
            actions[index] = 0;
        }
    }

    hadSuper = LocalEnvironment.Actor.SuperCharge == 1;
    hadGadget = LocalEnvironment.Actor.HasGadget;
    hadHypercharge = LocalEnvironment.Actor.HyperCharge == 1;
    shootsLeft = LocalEnvironment.Actor.Shoots;

    return actions;
}

//const drawBoxes = require("../../screen/drawBoxes.js")
//const imageToBMP = require("../../screen/imageToBMP.js")

async function CreateBatchData(resolution, video, framesIndices) {
    let batch = { xs: [], ys: [] }

    for (let indice of framesIndices) {
        const frame = GetFrame(resolution, indice, video)

        const actionsPredictions = await ActorTraining.predict(frame);

        if(!isGoodFrame(actionsPredictions)) continue;

        const actionsConverted = calculateActorActions(actionsPredictions);

        await LocalEnvironment.CreateWorld(frame);

        const worldPredictions = LocalEnvironment.PipeEnvironment();

        /*if(LocalEnvironment.Enemy[0].Position[0] >= 0 && LocalEnvironment.Friendly[0].Position[0] >= 0){
            if(fs.existsSync("image.bmp")) return;
            console.log(actionsConverted)

            fs.writeFileSync("image.bmp", imageToBMP(drawBoxes(frame, resolution, actionsPredictions), resolution));
        }*/

        batch.xs.push([frame, worldPredictions]);
        batch.ys.push(actionsConverted);
    }

    return batch;
}

/*async function CreateBatchData(resolution, video, framesIndices) {
    let batch = { xs: [], ys: [] }

    for (let indice of framesIndices) {
        const frame = GetFrame(resolution, indice, video)

        console.time("actions")
        const [ actionsPredictions ] = await Promise.all([
            ActorTraining.predict(frame),
            LocalEnvironment.CreateWorld(frame)
        ])
        console.timeEnd("actions")

        if(!isGoodFrame(actionsPredictions)) continue;

        const actionsConverted = calculateActorActions(actionsPredictions);

        const worldPredictions = LocalEnvironment.PipeEnvironment();

        batch.xs.push([frame, worldPredictions]);
        batch.ys.push(actionsConverted);
    }

    return batch;
}*/

module.exports = { GetPlaylistVideos, DownloadVideo, CreateBatchData, LocalEnvironment, ActorTraining };