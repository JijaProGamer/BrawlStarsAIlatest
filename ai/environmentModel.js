const tf = require("@tensorflow/tfjs-node")

let model
let resolution

const PARAMETERS_PER_PLAYER = 1 + 2 + 2;
const PARAMETERS_PER_BALL = 2 + 1;
const PARAMETERS = PARAMETERS_PER_BALL + 6 * PARAMETERS_PER_PLAYER;

function makeModel(_resolution) {
  resolution = _resolution;

  model = tf.sequential();

  model.add(tf.layers.conv2d({ kernelSize: 15, filters: 32, strides: 1, activation: 'relu', kernelInitializer: 'varianceScaling', inputShape: [resolution[0], resolution[1], 2] }));
  model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }));
  model.add(tf.layers.conv2d({ kernelSize: 15, filters: 32, strides: 1, activation: 'relu', kernelInitializer: 'varianceScaling'}));
  //model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }));
  model.add(tf.layers.dense({ units: 128, kernelInitializer: 'varianceScaling', activation: 'LeakyReLU' }))
  model.add(tf.layers.dense({ units: 256, kernelInitializer: 'varianceScaling', activation: 'LeakyReLU' }))
  model.add(tf.layers.flatten());
  model.add(tf.layers.dense({ units: PARAMETERS, kernelInitializer: 'varianceScaling', activation: 'tanh'}));

  const optimizer = tf.train.adam();
  model.compile({
    optimizer: optimizer,
    loss: 'meanSquaredError',
    metrics: ['accuracy'],
  });


  //model.summary()
}

async function train(data) {
  const metrics = ['loss', 'val_loss', 'acc', 'val_acc'];
  const container = {
    name: 'Model Training', tab: 'Model', styles: { height: '1000px' }
  };

  const fitCallbacks = tfvis.show.fitCallbacks(container, metrics);

  const BATCH_SIZE = 512;
  const TRAIN_DATA_SIZE = 5500;
  const TEST_DATA_SIZE = 1000;

  const [trainXs, trainYs] = tf.tidy(() => {
    const d = data.nextTrainBatch(TRAIN_DATA_SIZE);
    return [
      d.xs.reshape([TRAIN_DATA_SIZE, 28, 28, 1]),
      d.labels
    ];
  });

  const [testXs, testYs] = tf.tidy(() => {
    const d = data.nextTestBatch(TEST_DATA_SIZE);
    return [
      d.xs.reshape([TEST_DATA_SIZE, 28, 28, 1]),
      d.labels
    ];
  });

  return model.fit(trainXs, trainYs, {
    batchSize: BATCH_SIZE,
    validationData: [testXs, testYs],
    epochs: 10,
    shuffle: true,
    callbacks: fitCallbacks
  });
}

async function predict(imageTensor) {
  const predictions = model.predict(imageTensor);
  const predictionsCPU = await predictions.dataSync();

  predictions.dispose()
  return predictionsCPU;
}

module.exports = { makeModel, train, predict }