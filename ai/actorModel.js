const tf = require("@tensorflow/tfjs-node")

let model
let resolution

const InputElements = 36;
const OutputElements = 10;

function makeModel(_resolution) {
  resolution = _resolution;

  /*model = tf.sequential();

  model.add(tf.layers.conv2d({ kernelSize: 3, filters: 32, strides: 1, activation: 'relu', kernelInitializer: 'varianceScaling', inputShape: [resolution[0], resolution[1], 2] }));
  model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }));
  model.add(tf.layers.conv2d({ kernelSize: 3, filters: 64, strides: 1, activation: 'relu', kernelInitializer: 'varianceScaling'}));
  model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }));
  model.add(tf.layers.flatten());
  model.add(tf.layers.dense({ units: OutputElements, kernelInitializer: 'varianceScaling', activation: 'tanh'}));
  */

  const imageInput = tf.input({ shape: [_resolution[0], _resolution[1], 2] });
  const additionalDataInput = tf.input({ shape: [InputElements] });
  
  const convLayer1 = tf.layers.conv2d({ kernelSize: 5, filters: 64, strides: 1, activation: 'LeakyReLU', kernelInitializer: 'varianceScaling' });
  const maxPoolLayer = tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] });
  const convLayer2 = tf.layers.conv2d({ kernelSize: 3, filters: 32, strides: 1, activation: 'LeakyReLU', kernelInitializer: 'varianceScaling' });
  
  const flattenLayer = tf.layers.flatten();
  const denseLayer1 = tf.layers.dense({ units: 256, kernelInitializer: 'varianceScaling', activation: 'LeakyReLU' });
  const denseLayer2 = tf.layers.dense({ units: 512, kernelInitializer: 'varianceScaling', activation: 'LeakyReLU' });
  const outputLayer = tf.layers.dense({ units: OutputElements, kernelInitializer: 'varianceScaling', activation: 'tanh' });
  
  const convOutput1 = convLayer1.apply(imageInput);
  const maxPoolOutput = maxPoolLayer.apply(convOutput1);
  const convOutput2 = convLayer2.apply(maxPoolOutput);
  //const convOutput2 = convLayer2.apply(convOutput1);
  
  const mergedOutput = tf.layers.concatenate().apply([flattenLayer.apply(convOutput2), additionalDataInput]);
  const denseOutput1 = denseLayer1.apply(mergedOutput);
  const denseOutput2 = denseLayer2.apply(denseOutput1);
  const output = outputLayer.apply(denseOutput2);
  
  model = tf.model({ inputs: [imageInput, additionalDataInput], outputs: output });


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

async function predict(imageTensor, environment) {
  console.log(environment, environment.length)

  let dataTensor = tf.tensor2d(environment, [1, environment.length])
  const predictions = model.predict([imageTensor, dataTensor]);
  const predictionsCPU = await predictions.dataSync();

  predictions.dispose()
  return predictionsCPU;
}

module.exports = { makeModel, train, predict }