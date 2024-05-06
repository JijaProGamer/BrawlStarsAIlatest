const tf = require("@tensorflow/tfjs-node")

const PARAMETERS_PER_PLAYER = 1 + 2 + 2;
const PARAMETERS_PER_BALL = 2 + 1;
const PARAMETERS = PARAMETERS_PER_BALL + 6 * PARAMETERS_PER_PLAYER;

class EnvironmentModel {
  Resolution

  constructor(Resolution){
    this.Resolution = Resolution;
  }

  makeModel() {
    this.model = tf.sequential();

    this.model.add(tf.layers.conv2d({ kernelSize: 15, filters: 32, strides: 1, activation: 'relu', kernelInitializer: 'varianceScaling', inputShape: [this.Resolution[0], this.Resolution[1], 2] }));
    this.model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }));
    this.model.add(tf.layers.conv2d({ kernelSize: 15, filters: 32, strides: 1, activation: 'relu', kernelInitializer: 'varianceScaling'}));
    //this.model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }));
    this.model.add(tf.layers.dense({ units: 128, kernelInitializer: 'varianceScaling', activation: 'LeakyReLU' }))
    this.model.add(tf.layers.dense({ units: 256, kernelInitializer: 'varianceScaling', activation: 'LeakyReLU' }))
    this.model.add(tf.layers.flatten());
    this.model.add(tf.layers.dense({ units: PARAMETERS, kernelInitializer: 'varianceScaling', activation: 'tanh'}));

    const optimizer = tf.train.adam();
    this.model.compile({
      optimizer: optimizer,
      loss: 'meanSquaredError',
      metrics: ['accuracy'],
    });


    //model.summary()
  }

  async train(data) {
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

    return this.model.fit(trainXs, trainYs, {
      batchSize: BATCH_SIZE,
      validationData: [testXs, testYs],
      epochs: 10,
      shuffle: true,
      callbacks: fitCallbacks
    });
  }

  async predict(imageTensor) {
    const predictions = this.model.predict(imageTensor);
    const predictionsCPU = await predictions.dataSync();

    predictions.dispose()
    return predictionsCPU;
  }
}

module.exports = EnvironmentModel