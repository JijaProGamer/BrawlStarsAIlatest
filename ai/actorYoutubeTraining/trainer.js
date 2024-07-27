/*const tf = require('@tensorflow/tfjs-node'); // If using Node.js

// Example dataset generator function
async function* myDataGenerator(numEpochs, batchSize) {
  // Assuming you have some way to load your dataset or frames
  const totalFrames = 100000; // Total frames in your dataset
  const numBatchesPerEpoch = Math.ceil(totalFrames / batchSize);

  for (let epoch = 0; epoch < numEpochs; epoch++) {
    console.log(`Epoch ${epoch + 1}/${numEpochs}`);

    // In each epoch, shuffle or determine the order of frames to load
    const frameIndices = tf.util.createShuffledIndices(totalFrames);

    for (let batchIndex = 0; batchIndex < numBatchesPerEpoch; batchIndex++) {
      const batchStart = batchIndex * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, totalFrames);

      // Load and preprocess your batch of frames and corresponding actions here
      const xBatch = []; // Placeholder for features (images)
      const yBatch = []; // Placeholder for labels (actions)

      for (let i = batchStart; i < batchEnd; i++) {
        // Load your frame i and corresponding action
        // Example: Replace with your actual data loading code
        const frame = await loadFrame(frameIndices[i]); // Assume async function to load frame
        const action = await loadAction(frameIndices[i]); // Assume async function to load action

        xBatch.push(frame); // Assuming frame is a tensor or can be converted to one
        yBatch.push(action); // Assuming action is a tensor or can be converted to one
      }

      yield {
        xs: tf.stack(xBatch), // Stack frames into a tensor
        ys: tf.stack(yBatch), // Stack actions into a tensor
      };
    }
  }
}

// Example asynchronous functions to load frame and action
async function loadFrame(index) {
  // Example: Load frame from dataset or file based on index
  // Return TensorFlow.js tensor or numerical data
  return tf.randomNormal([224, 224, 3]); // Example tensor of shape [224, 224, 3]
}

async function loadAction(index) {
  // Example: Load action corresponding to frame index
  // Return TensorFlow.js tensor or numerical data
  return tf.tensor1d([0, 1, 0]); // Example one-hot encoded action vector
}

// Usage example
async function main() {
  const numEpochs = 20;
  const batchSize = 32;

  const dataset = tf.data.generator(() => myDataGenerator(numEpochs, batchSize));

  // Example: Define and compile your model
  const model = tf.sequential();
  model.add(tf.layers.dense({ units: 10, inputShape: [224, 224, 3], activation: 'relu' }));
  model.add(tf.layers.flatten());
  model.add(tf.layers.dense({ units: 3, activation: 'softmax' }));

  model.compile({ optimizer: 'adam', loss: 'categoricalCrossentropy', metrics: ['accuracy'] });

  // Example: Fit model using fitDataset method
  await model.fitDataset(dataset, {
    epochs: numEpochs,
    batchesPerEpoch: Math.ceil(100000 / batchSize),
  });

  console.log('Training completed.');
}

main();*/

const path = require("path");

const playlistID = "PLGtZwVE-T07vYODoUzNweS6upEexk3024";

const epochs = 1;
const batchSize = 32;
const framesTriedPerBatch = batchSize * 5;

const secondsCutBeggining = 120;
const secondsCutEnding = 120;

const framesPerVideo = 1200;

const { GetPlaylistVideos, DownloadVideo, CreateBatchData, LocalEnvironment, ActorTraining } = require("./data_gatherer.js");

let timePerDownload = 0;
let downloadsDone = 0;

let timePerBatch = 0;
let batchesDone = 0;

let timePerTrain = 0;
let trainingsDone = 0;

let timePerVideo = 0;
let videosDone = 0;

async function DoEpoch(epoch, playlists) {
  let videosDoneEpoch = 0;

  for (let videoId of playlists) {
    const batchValues = { xs: [], ys: [] }

    let downloadStart = Date.now();

    let videoRaw = await DownloadVideo(videoId, LocalEnvironment.Resolution)

    timePerDownload += Date.now() - downloadStart;
    downloadsDone += 1;


    let videoFrames = videoRaw.length / ((LocalEnvironment.Resolution[0] * LocalEnvironment.Resolution[1]) * 4)
      - secondsCutBeggining * LocalEnvironment.Framerate
      - secondsCutEnding * LocalEnvironment.Framerate;

    let framesUsed = Array.from({ length: videoFrames }, (_, i) => i + (secondsCutBeggining * LocalEnvironment.Framerate))
      .map((v) => { return { v, r: Math.random() } })
      .sort((a, b) => a.r - b.r)
      .map(v => v.v)
      .slice(0, framesPerVideo);

    let batches = Math.max(framesUsed.length / framesTriedPerBatch);

    for (let batchNum = 0; batchNum < batches; batchNum++) {
      let batchStart = Date.now();

      const batch = await CreateBatchData(LocalEnvironment.Resolution, videoRaw, framesUsed.slice(batchNum * framesTriedPerBatch, (batchNum + 1) * framesTriedPerBatch))
      batchValues.xs.push(...batch.xs);
      batchValues.ys.push(...batch.ys);

      timePerBatch += Date.now() - batchStart;
      batchesDone += 1;

      if (batchValues.xs.length >= batchSize) {
        const trainStart = Date.now();

        const trainResult = await LocalEnvironment.ActorModel.trainBatch({ xs: batchValues.xs.slice(0, batchSize), ys: batchValues.ys.slice(0, batchSize) });
        batchValues.xs.splice(0, batchSize);
        batchValues.ys.splice(0, batchSize);

        await LocalEnvironment.ActorModel.saveModel()

        timePerTrain += Date.now() - trainStart;
        trainingsDone += 1;

        /////////////    L O G S          //////////////////

        if (batchNum > 1) {
          let timeForCurrentVideo = (timePerBatch / batchesDone + timePerTrain / trainingsDone) * (batches - batchNum);
          console.log(`Remaining time for this video: ${(timeForCurrentVideo / 1000 / 60).toFixed(1)}m`);

          let timeForRemainingEpoch = 0;
          if (videosDoneEpoch == 0) {
            timeForRemainingEpoch = ((timePerBatch / batchesDone + timePerTrain / trainingsDone) * batches) * playlists.length - timeForCurrentVideo;
          } else {
            timeForRemainingEpoch = (timePerVideo / videosDone) * (playlists.length - videosDoneEpoch) - timeForCurrentVideo;
          }

          console.log(`Remaining time for this epoch: ${(timeForRemainingEpoch / 1000 / 60).toFixed(1)}m`);

          let timeforTraining = 0
          if (videosDoneEpoch == 0) {
            timeforTraining = ((timePerBatch / batchesDone + timePerTrain / trainingsDone) * batches) * playlists.length * epochs - timeForCurrentVideo;
          } else {
            timeforTraining = (timePerVideo / videosDone) * (playlists.length - videosDoneEpoch) * epochs - timeForCurrentVideo;
          }

          console.log(`Remaining time for training: ${(timeforTraining / 1000 / 60).toFixed(1)}m`);
        }

        console.log(`Videos done: ${videosDoneEpoch}/${playlists.length}`);
        console.log(`Epochs done: ${epoch}/${epochs}`);

        console.log(`(MSE) loss: ${trainResult}`)

        console.log("----------------------------------------------")


        /////////////    L O G S          //////////////////
      }
    }

    timePerVideo += Date.now() - downloadStart;
    videosDone += 1;
    videosDoneEpoch += 1;
  }

  //await LocalEnvironment.ActorModel.saveModel()
}

async function main() {
  let [playlist] = await Promise.all([
    GetPlaylistVideos(playlistID),
    LocalEnvironment.init(),
  ])

  for (let epoch = 0; epoch < epochs; epoch++) {
    await DoEpoch(epoch, playlist);
  }

  console.log("DONE TRAINING")

  //await DownloadVideo(playlist[0], LocalEnvironment.Resolution)
  //let videoRaw = await ReadFile(path.join(__dirname, "video.raw"))
  //const batch = await CreateBatchData(30, LocalEnvironment.Resolution, videoRaw, 0)

  //console.log(batch)
}

main()