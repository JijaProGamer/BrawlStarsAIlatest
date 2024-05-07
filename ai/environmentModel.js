const tf = require("@tensorflow/tfjs-node")

const PARAMETERS_PER_PLAYER = 1 + 2;// + 2;
const PARAMETERS_PER_BALL = 2 + 1;
const PARAMETERS = PARAMETERS_PER_BALL + 6 * PARAMETERS_PER_PLAYER;

class EnvironmentModel {
    Resolution
  
    constructor(Resolution){
      this.Resolution = Resolution;
    }
  
    makeModel() {
      this.model = tf.sequential();
  
      this.model.add(tf.layers.conv2d({ kernelSize: 15, filters: 32, strides: 1, activation: 'LeakyReLU', kernelInitializer: 'varianceScaling', inputShape: [this.Resolution[0], this.Resolution[1], 2] }));
      this.model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }));
      this.model.add(tf.layers.conv2d({ kernelSize: 15, filters: 32, strides: 1, activation: 'LeakyReLU', kernelInitializer: 'varianceScaling'}));
      //this.model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }));
      this.model.add(tf.layers.dense({ units: 128, kernelInitializer: 'varianceScaling', activation: 'LeakyReLU' }))
      this.model.add(tf.layers.dense({ units: 256, kernelInitializer: 'varianceScaling', activation: 'LeakyReLU' }))
      this.model.add(tf.layers.flatten());
      this.model.add(tf.layers.dense({ units: PARAMETERS, kernelInitializer: 'varianceScaling', activation: 'tanh'}));
      //this.model.add(tf.layers.dense({ units: PARAMETERS, kernelInitializer: 'varianceScaling', activation: 'LeakyReLU'}));
  
      const optimizer = tf.train.adam();
      this.model.compile({
        optimizer: optimizer,
        loss: 'meanSquaredError',
        metrics: ['accuracy'],
      });
  
  
      //model.summary()
    }

    async save(path){
      this.model.save(`file://${path}`)
    }

    async load(path){
      this.model = await tf.loadLayersModel(`file://${path}/model.json`);
    }
  
    async train(images, results) {
      const BATCH_SIZE = 128;
  
      function onBatchEnd(batch, logs){
          console.log(`Accuracy: ${logs.acc}`)
      }
  
  
      return this.model.fit(images, results, {
        batchSize: BATCH_SIZE,
        //validationData: [testXs, testYs],
        epochs: 100,
        shuffle: true,
        callbacks: { onBatchEnd }
      });
    }
  
    async predict(imageTensor) {
      const predictions = this.model.predict(imageTensor);
      const predictionsCPU = await predictions.data();
  
      predictions.dispose()
      return predictionsCPU;
    }
}

module.exports = EnvironmentModel