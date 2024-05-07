const tf = require("@tensorflow/tfjs-node")
const fs = require("fs")
const path = require("path")
const child_process = require("child_process")

const EnvironmentModel = require("./ai/environmentModel.js")

function parseRawVideoData(data) {
    const pixels = Array(data.length * 2/4);

    for (let i = 0; i < data.length; i += 4) {
        const red = data.readUInt8(i);
        const green = data.readUInt8(i + 1);
        const blue = data.readUInt8(i + 2);

        let index = i * 2/4;

        pixels[index] = red;// + Math.floor(green / 2);
        //pixels[index + 1] = green;
        //pixels[index + 2] = blue;
        pixels[index + 1] = blue;// + Math.floor(green / 2);
    }


    return pixels;
}

let model = new EnvironmentModel([ 296, 136 ])
model.makeModel()

function trascodeImageFile(file){
    return new Promise((resolve, reject) => {
        let ffmpegProcess = child_process.spawn(`ffmpeg`, [
            `-i`, path.join(__dirname, "human_character_detection/training_data", `${file}.png`),
            `-f`, `rawvideo`,
            `-vcodec`, `rawvideo`,
            `-vf`, `format=rgba,scale=296:136`,
            `-`
        ])
    
        ffmpegProcess.stderr.on("data", (data) => {
            data = data.toString()
        })

        let frameMaxSize = model.Resolution[0] * model.Resolution[1] * 4;
        let frameBuffer = Buffer.allocUnsafe(frameMaxSize);
        let frameSize = 0;
    
        ffmpegProcess.stdout.on("data", (data) => {
            //console.log(data)

            data.copy(frameBuffer, frameSize);
            frameSize += data.length;

            if(frameSize == frameMaxSize){
                resolve(parseRawVideoData(frameBuffer))
            }
        })
    })
}

function transcodeJsonFile(fileName){
    let fileContents = JSON.parse(fs.readFileSync(path.join(__dirname, "human_character_detection/training_data", `${fileName}.json`), "utf-8"));
    
    let ballPosition = [fileContents.ball.start[0] + fileContents.ball.extend[0] / 2, fileContents.ball.start[1] + fileContents.ball.extend[1] / 2]
    
    let result = [
        fileContents.ball.isVisible ? 1 : -1,
        fileContents.ball.isVisible ? ballPosition[0] : -1,
        fileContents.ball.isVisible ? ballPosition[1] : -1,
    ]


    function setPlayer(player){
        if(player.isVisible <= 0){
            result.push(-1);
            result.push(-1);
            result.push(-1);
        } else {
            result.push(1);
            result.push(player.start[0] + player.extend[0] / 2);
            result.push(player.start[1] + player.extend[1] / 2);
        }
    }

    setPlayer(fileContents.me)

    for(let i = 0; i < 2; i++){
        setPlayer(fileContents.friendly[i])
    }

    for(let i = 0; i < 3; i++){
        setPlayer(fileContents.enemy[i])
    }

    return result
}

const PARAMETERS_PER_PLAYER = 1 + 2;// + 2;
const PARAMETERS_PER_BALL = 2 + 1;
const PARAMETERS = PARAMETERS_PER_BALL + 6 * PARAMETERS_PER_PLAYER;

async function prepareTrainingData(files) {
    let images = [];
    let results = [];

    for (let fileName of files) {
        const image = await trascodeImageFile(fileName);

        const preprocessedImage = tf.tensor(image, [model.Resolution[0], model.Resolution[1], 2])
            .div(tf.scalar(255))
            .expandDims();
        
        const result = tf.tensor(transcodeJsonFile(fileName), [1,PARAMETERS]);

        images.push(preprocessedImage);
        results.push(result);
    }


    const xTrain = tf.concat(images);
    const yTrain = tf.concat(results).reshape([results.length, PARAMETERS]);

    return { xTrain, yTrain, images, results };
}

let files = fs.readdirSync(path.join(__dirname, "human_character_detection/training_data"))
    .filter((v) => v.includes(".png"))
    .map((v) => v.split(".png").shift())

prepareTrainingData(files).then((trainingData) => {
    model.train(trainingData.xTrain, trainingData.yTrain).then(() => {
        model.save(path.join(__dirname, "ai/environment"))

        console.log(files[1])

        console.time("start")
        model.predict(trainingData.images[1]).then((predictResult) => {
            console.timeEnd("start")
            console.log(predictResult)
        })
    })
})

/*model.load(path.join(__dirname, "ai/environment")).then(() => {
    prepareTrainingData(files).then((trainingData) => {
        console.log(files[1])

        console.time("start")
        model.predict(trainingData.images[1]).then((predictResult) => {
            console.timeEnd("start")
            console.log(predictResult)
        })
    })
})*/