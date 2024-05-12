const tf = require("@tensorflow/tfjs-node")
const fs = require("fs")
const path = require("path")
const child_process = require("child_process")
const { createCanvas, loadImage } = require('canvas');

const Environment = require("./ai/environment.js").Environment

function combo(arr) {
    /*const result = [];
    
    function permuteHelper(current, remaining) {
        if (remaining.length === 0) {
            result.push(current);
        } else {
            for (let i = 0; i < remaining.length; i++) {
                const nextCurrent = current.concat(remaining[i]);
                const nextRemaining = remaining.slice(0, i).concat(remaining.slice(i + 1));
                permuteHelper(nextCurrent, nextRemaining);
            }
        }
    }
    
    permuteHelper([], arr);
    return result;*/

    const result = [];
    const seen = new Set();
    
    function permuteHelper(current, remaining) {
        if (remaining.length === 0) {
            const key = current.join('-');
            if (!seen.has(key)) {
                result.push(current);
                seen.add(key);
            }
        } else {
            for (let i = 0; i < remaining.length; i++) {
                const nextCurrent = current.concat(remaining[i]);
                const nextRemaining = remaining.slice(0, i).concat(remaining.slice(i + 1));
                permuteHelper(nextCurrent, nextRemaining);
            }
        }
    }
    
    permuteHelper([], arr);
    return result;
};

function parseBMP(bmpBuffer) {
    const header = bmpBuffer.slice(0, 14);
    const dibHeader = bmpBuffer.slice(14, 54);

    const fileSize = header.readUInt32LE(2);
    const width = dibHeader.readUInt32LE(4);
    const height = dibHeader.readUInt32LE(8);
    const pixelDataOffset = header.readUInt32LE(10);

    const pixelData = bmpBuffer.slice(pixelDataOffset);

    return {
        fileSize,
        width,
        height,
        pixelData
    }
}

let environment = new Environment([296, 136])

function trascodeImageFile(file) {
    return new Promise((resolve, reject) => {
        let ffmpegProcess = child_process.spawn(`ffmpeg`, [
            `-i`, path.join(__dirname, "human_character_detection/training_data", `${file}.png`),
            `-f`, `rawvideo`,
            `-c:v`, `bmp`,
            `-vf`, `format=rgba,scale=${environment.Resolution[0]}:${environment.Resolution[1]}`,
            `-`
        ])

        ffmpegProcess.stderr.on("data", (data) => {
            data = data.toString()
        })

        let frameMaxSize = environment.Resolution[0] * environment.Resolution[1] * 4 + 54;
        let frameBuffer = Buffer.allocUnsafe(frameMaxSize);
        let frameSize = 0;

        ffmpegProcess.stdout.on("data", (data) => {
            data.copy(frameBuffer, frameSize);
            frameSize += data.length;

            if (frameSize == frameMaxSize) {
                //resolve(parseBMP(frameBuffer))
                resolve(frameBuffer)
            }
        })
    })
}

function transcodeJsonFile(fileName) {
    let fileContents = JSON.parse(fs.readFileSync(path.join(__dirname, "human_character_detection/training_data", `${fileName}.json`), "utf-8"));

    let availableFriendly = [];
    let availableEnemy = [];

    for (let i = 0; i < 2; i++) {
        if (fileContents.friendly[i].isVisible) {
            availableFriendly.push(fileContents.friendly[i]);
        } else {
            availableFriendly.push(null)
        }
    }

    for (let i = 0; i < 3; i++) {
        if (fileContents.enemy[i].isVisible) {
            availableEnemy.push(fileContents.enemy[i]);
        } else {
            availableEnemy.push(null)
        }
    }

    let results = []

    function makeResult(friendly, enemy) {
        let result = [
            fileContents.ball.isVisible ? 1 : -1,
            fileContents.ball.isVisible ? fileContents.ball.position[0] : -1,
            fileContents.ball.isVisible ? fileContents.ball.position[1] : -1,
        ]

        function setPlayer(player) {
            if (!player || player.isVisible <= 0) {
                result.push(-1);
                result.push(-1);
                result.push(-1);
            } else {
                result.push(1);
                result.push(player.position[0]);
                result.push(player.position[1]);
            }
        }

        setPlayer(fileContents.me)

        for (let i = 0; i < 2; i++) {
            setPlayer(friendly[i])
        }

        for (let i = 0; i < 3; i++) {
            setPlayer(enemy[i])
        }

        results.push(result)
    }

    /*availableFriendly = combo(availableFriendly);
    availableEnemy = combo(availableEnemy);

    for(let friendlyCombo of availableFriendly){
        for(let enemyCombo of availableEnemy){
            makeResult(friendlyCombo, enemyCombo)
        }
    }*/

    makeResult(availableFriendly, availableEnemy);

    //console.log(results.length)

    return results
}

async function prepareTrainingData(files) {
    let images = [];
    let results = [];

    for (let fileName of files) {
        const image = await trascodeImageFile(fileName);

        /*const preprocessedImage = tf.tensor(image, [environment.Resolution[1], environment.Resolution[0], 3])
            .div(tf.scalar(255))*/

        const preprocessedImage = tf.node.decodeBmp(image, 3);

        const resultsLocal = transcodeJsonFile(fileName);

        for (let result of resultsLocal) {
            result = tf.tensor1d(result);

            images.push(preprocessedImage);
            results.push(result);
        }
    }

    const xTrain = tf.stack(images);
    const yTrain = tf.stack(results);

    return { xTrain, yTrain, images, results };
}

const ballRadius = 5
const characterRadius = 7

async function visualizePredictions(predictions, imagePath, outputPath) {
    environment.SetWorld(predictions)

    const canvas = createCanvas(...environment.Resolution);
    const canvasContext = canvas.getContext('2d');
    canvasContext.imageSmoothingEnabled = false;

    let image = await loadImage(path.join(__dirname, "human_character_detection/training_data", `${imagePath}.png`))
    canvasContext.drawImage(image, 0, 0, canvas.width, canvas.height);

    let colors = {
        ball: [255, 255, 0],
        enemy: [255, 0, 0],
        friendly: [0, 255, 0],
        me: [0, 255, 255],
    }

    function workCharacter(character, isBall, isFriendly, isEnemy, isMe) {
        if (character[0] > 0 && character[1] > 0) {
            canvasContext.beginPath();

            canvasContext.arc(
                Math.round(character[0] * canvas.width),
                Math.round(character[1] * canvas.height),
                isBall ? ballRadius : characterRadius,
                0, 2 * Math.PI
            );

            let color;
            if (isBall) color = colors.ball;
            if (isFriendly) color = colors.friendly;
            if (isMe) color = colors.me;
            if (isEnemy) color = colors.enemy;

            canvasContext.fillStyle = `rgba(255, 255, 255, 0.2)`;
            canvasContext.fill();

            canvasContext.lineWidth = 1;
            canvasContext.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 1)`;
            canvasContext.stroke();
        }
    }

    workCharacter(environment.BallPosition, true, false, false, false)
    workCharacter(environment.Actor.Position, false, false, false, true)
    workCharacter(environment.Friendly[0].Position, false, true, false, false)
    workCharacter(environment.Friendly[1].Position, false, true, false, false)
    workCharacter(environment.Enemy[0].Position, false, false, true, false)
    workCharacter(environment.Enemy[1].Position, false, false, true, false)
    workCharacter(environment.Enemy[2].Position, false, false, true, false)


    canvas.createPNGStream().pipe(fs.createWriteStream(outputPath));
}

let files = fs.readdirSync(path.join(__dirname, "human_character_detection/training_data"))
    .filter((v) => v.includes(".png"))
    .map((v) => v.split(".png").shift())

prepareTrainingData(files).then((trainingData) => {
    environment.EnvironmentModel.train(trainingData.xTrain, trainingData.yTrain).then(async () => {
        await environment.EnvironmentModel.save(path.join(__dirname, "ai/environment"))

        let testIndex = 25

        visualizePredictions(transcodeJsonFile(files[testIndex])[0], files[testIndex], path.join(__dirname, "tests", `testExpected.png`))

        console.time("start")
        environment.EnvironmentModel.predict(trainingData.images[testIndex].expandDims()).then((predictResult) => {
            console.timeEnd("start")
            console.log(predictResult)

            visualizePredictions(predictResult, files[testIndex], path.join(__dirname, "tests", `testResult.png`))
        })

        /*for (let testIndex = 0; testIndex < files.length; testIndex++) {
            await visualizePredictions(transcodeJsonFile(files[testIndex])[0], files[testIndex], path.join(__dirname, "tests", `testExpected${testIndex}.png`))

            let predictResult = await environment.EnvironmentModel.predict(trainingData.images[testIndex].expandDims());
            await visualizePredictions(predictResult, files[testIndex], path.join(__dirname, "tests", `testResult${testIndex}.png`));
        }*/
    })
})

/*environment.EnvironmentModel.load(path.join(__dirname, "ai/environment")).then(() => {
    prepareTrainingData(files).then((trainingData) => {
        console.log(files[1])

        console.time("start")
        environment.EnvironmentModel.predict(trainingData.images[1]).then((predictResult) => {
            console.timeEnd("start")
            console.log(predictResult)
        })
    })
})*/