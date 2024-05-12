const tf = require("@tensorflow/tfjs-node")

const PARAMETERS_PER_PLAYER = 1 + 2;// + 2;
const PARAMETERS_PER_BALL = 1 + 2;
const PARAMETERS = PARAMETERS_PER_BALL + 6 * PARAMETERS_PER_PLAYER;

/*function environmentVariableLoss(trueData, predictedData){
  console.log(trueData, predictedData)
}

function environmentLoss(yTrue, yPred) {
    const yTrueValues = yTrue.dataSync();
    const yPredValues = yPred.dataSync();

    let totalLoss = 0;
    for (let i = 0; i < yTrueValues.length; i += PARAMETERS) {
      let elements = new Array(PARAMETERS)
      for(let j = i; j < i + PARAMETERS; j++){
        elements.push()
      }
      totalLoss += environmentVariableLoss(yTrueValues[i], yPredValues[i]);
    }

    totalLoss /= yTrueValues.length;

    return totalLoss;
}*/

class EnvironmentModel {
  Resolution

  constructor(Resolution) {
    this.Resolution = Resolution;
  }

  async makeMobilenet(){
    this.mobilenet = await tf.loadGraphModel(`https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v3_small_100_224/feature_vector/5/default/1`, {fromTFHub: true});
  }

  makeModel() {
    this.model = tf.sequential();
 
    this.model.add(tf.layers.depthwiseConv2d({ kernelSize: 21, filters: 32, depthMultiplier: 3, strides: 1, activation: 'relu', kernelInitializer: 'varianceScaling', inputShape: [this.Resolution[1], this.Resolution[0], 3] }));
    this.model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }));
    this.model.add(tf.layers.depthwiseConv2d({ kernelSize: 7, filters: 64, depthMultiplier: 3, strides: 1, activation: 'relu', kernelInitializer: 'varianceScaling' }));
    this.model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }));
    this.model.add(tf.layers.depthwiseConv2d({ kernelSize: 3, filters: 64, depthMultiplier: 3, strides: 1, activation: 'relu', kernelInitializer: 'varianceScaling' }));
    //this.model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }));
    this.model.add(tf.layers.flatten());
    this.model.add(tf.layers.dense({ units: 128, kernelInitializer: 'varianceScaling', activation: 'LeakyReLU', kernelRegularizer: tf.regularizers.l2() }))
    this.model.add(tf.layers.dense({ units: PARAMETERS, kernelInitializer: 'varianceScaling', activation: 'LeakyReLU'}));

      /*this.model.add(tf.layers.dense({inputShape: [1024], units: 128, activation: 'LeakyReLU'}));
    this.model.add(tf.layers.dense({ units: 512, kernelInitializer: 'varianceScaling', activation: 'LeakyReLU', kernelRegularizer: tf.regularizers.l2() }))
    this.model.add(tf.layers.dense({ units: PARAMETERS, kernelInitializer: 'varianceScaling', activation: 'LeakyReLU'}));*/

    const optimizer = tf.train.sgd(0.02);
    //const optimizer = tf.train.adam(0.001); // 0.001 default for adam
    //const optimizer = tf.train.momentum(0.01, 0.9, true)
    this.model.compile({
      optimizer: optimizer,
      loss: 'meanSquaredError',
      //loss: environmentLoss,
      metrics: ['accuracy'],
    });
 
 
    //model.summary()
  }

  /*makeModel() {
    this.model = tf.sequential();
 
    this.model.add(tf.layers.conv2d({ kernelSize: 7, filters: 64, strides: 2, activation: 'relu', kernelInitializer: 'varianceScaling', inputShape: [this.Resolution[1], this.Resolution[0], 3] }));
    //this.model.add(tf.layers.depthwiseConv2d({ kernelSize: 3, filters: 32, depthMultiplier: 1, strides: 2, activation: 'LeakyReLU', kernelInitializer: 'varianceScaling', inputShape: [this.Resolution[1], this.Resolution[0], 3] }));
    //this.model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }));
    //this.model.add(tf.layers.dropout({ rate: 0.2 }));
    //this.model.add(tf.layers.depthwiseConv2d({ kernelSize: 5, filters: 64, depthMultiplier: 3, strides: 1, activation: 'relu', kernelInitializer: 'varianceScaling'}));
    //this.model.add(tf.layers.depthwiseConv2d({ kernelSize: 3, filters: 64, depthMultiplier: 3, strides: 1, activation: 'relu', kernelInitializer: 'varianceScaling'}));
    this.model.add(tf.layers.conv2d({ kernelSize: 5, filters: 64, strides: 1, activation: 'relu', kernelInitializer: 'varianceScaling'}));
    this.model.add(tf.layers.conv2d({ kernelSize: 3, filters: 128, strides: 1, activation: 'relu', kernelInitializer: 'varianceScaling'}));
    //this.model.add(tf.layers.depthwiseConv2d({ kernelSize: 5, filters: 64, depthMultiplier: 3, strides: 1, activation: 'relu', kernelInitializer: 'varianceScaling'}));
    //this.model.add(tf.layers.depthwiseConv2d({ kernelSize: 3, filters: 64, depthMultiplier: 3, strides: 1, activation: 'relu', kernelInitializer: 'varianceScaling'}));

    //this.model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }));

    //this.model.add(tf.layers.globalAveragePooling2d({ dataFormat: "channelsLast" }));
    this.model.add(tf.layers.flatten());

    //this.model.add(tf.layers.dropout({ rate: 0.2 }));
    this.model.add(tf.layers.dense({ units: 128, kernelInitializer: 'varianceScaling', activation: 'LeakyReLU', kernelRegularizer: tf.regularizers.l2() }))
    this.model.add(tf.layers.dense({ units: 256, kernelInitializer: 'varianceScaling', activation: 'LeakyReLU', kernelRegularizer: tf.regularizers.l2() }))
    //this.model.add(tf.layers.dense({ units: PARAMETERS, kernelInitializer: 'varianceScaling', activation: 'tanh'}));
    this.model.add(tf.layers.dense({ units: PARAMETERS, kernelInitializer: 'varianceScaling', activation: 'LeakyReLU'}));

    const optimizer = tf.train.sgd(0.02);
    //const optimizer = tf.train.adam(0.001); // 0.001 default for adam
    //const optimizer = tf.train.momentum(0.01, 0.9, true)
    this.model.compile({
      optimizer: optimizer,
      loss: 'meanSquaredError',
      //loss: environmentLoss,
      metrics: ['accuracy'],
    });
 
 
    //model.summary()
  }*/

  /*makeModel() {
    this.model = tf.sequential();
 
    this.model.add(tf.layers.conv2d({ kernelSize: 7, filters: 64, strides: 2, activation: 'relu', kernelInitializer: 'varianceScaling', inputShape: [this.Resolution[1], this.Resolution[0], 3] }));
    //this.model.add(tf.layers.depthwiseConv2d({ kernelSize: 3, filters: 32, depthMultiplier: 1, strides: 2, activation: 'LeakyReLU', kernelInitializer: 'varianceScaling', inputShape: [this.Resolution[1], this.Resolution[0], 3] }));
    //this.model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }));
    //this.model.add(tf.layers.dropout({ rate: 0.2 }));
    //this.model.add(tf.layers.depthwiseConv2d({ kernelSize: 5, filters: 64, depthMultiplier: 3, strides: 1, activation: 'relu', kernelInitializer: 'varianceScaling'}));
    //this.model.add(tf.layers.depthwiseConv2d({ kernelSize: 3, filters: 64, depthMultiplier: 3, strides: 1, activation: 'relu', kernelInitializer: 'varianceScaling'}));
    this.model.add(tf.layers.conv2d({ kernelSize: 5, filters: 64, strides: 1, activation: 'relu', kernelInitializer: 'varianceScaling'}));
    this.model.add(tf.layers.conv2d({ kernelSize: 3, filters: 128, strides: 1, activation: 'relu', kernelInitializer: 'varianceScaling'}));
    //this.model.add(tf.layers.depthwiseConv2d({ kernelSize: 5, filters: 64, depthMultiplier: 3, strides: 1, activation: 'relu', kernelInitializer: 'varianceScaling'}));
    //this.model.add(tf.layers.depthwiseConv2d({ kernelSize: 3, filters: 64, depthMultiplier: 3, strides: 1, activation: 'relu', kernelInitializer: 'varianceScaling'}));

    //this.model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }));

    this.model.add(tf.layers.globalAveragePooling2d({ dataFormat: "channelsLast" }));
    //this.model.add(tf.layers.flatten());

    //this.model.add(tf.layers.dropout({ rate: 0.2 }));
    this.model.add(tf.layers.dense({ units: 128, kernelInitializer: 'varianceScaling', activation: 'LeakyReLU', kernelRegularizer: tf.regularizers.l2() }))
    this.model.add(tf.layers.dense({ units: 256, kernelInitializer: 'varianceScaling', activation: 'LeakyReLU', kernelRegularizer: tf.regularizers.l2() }))
    //this.model.add(tf.layers.dense({ units: PARAMETERS, kernelInitializer: 'varianceScaling', activation: 'tanh'}));
    this.model.add(tf.layers.dense({ units: PARAMETERS, kernelInitializer: 'varianceScaling', activation: 'LeakyReLU'}));

    const optimizer = tf.train.adam(0.001); // 0.001 default for adam
    //const optimizer = tf.train.momentum(0.01, 0.9, true)
    this.model.compile({
      optimizer: optimizer,
      loss: 'meanSquaredError',
      //loss: environmentLoss,
      metrics: ['accuracy'],
    });
 
 
    //model.summary()
  }*/

  /*makeModel() {
    this.model = tf.sequential();

    this.model.add(tf.layers.conv2d({ kernelSize: 3, filters: 32, strides: 2, padding: 'same', activation: 'relu', kernelInitializer: 'varianceScaling', inputShape: [this.Resolution[0], this.Resolution[1], 3] }));
    this.model.add(tf.layers.depthwiseConv2d({ kernelSize: 3, depthMultiplier: 1, padding: 'same', activation: 'relu', kernelInitializer: 'varianceScaling' }));
    this.model.add(tf.layers.conv2d({ filters: 64, kernelSize: 1, activation: 'relu', kernelInitializer: 'varianceScaling' }));
    /*this.model.add(tf.layers.depthwiseConv2d({ kernelSize: 3, depthMultiplier: 1, padding: 'same', activation: 'relu', kernelInitializer: 'varianceScaling' }));
    this.model.add(tf.layers.conv2d({ filters: 128, kernelSize: 1, activation: 'relu', kernelInitializer: 'varianceScaling' }));
    this.model.add(tf.layers.depthwiseConv2d({ kernelSize: 3, depthMultiplier: 1, padding: 'same', activation: 'relu', kernelInitializer: 'varianceScaling' }));
    this.model.add(tf.layers.conv2d({ filters: 128, kernelSize: 1, activation: 'relu', kernelInitializer: 'varianceScaling' }));*/

    /*for (let i = 0; i < 5; i++) {
      this.model.add(tf.layers.depthwiseConv2d({ kernelSize: 3, depthMultiplier: 1, padding: 'same', activation: 'relu', kernelInitializer: 'varianceScaling' }));

      this.model.add(tf.layers.conv2d({ filters: 256, kernelSize: 1, activation: 'relu', kernelInitializer: 'varianceScaling' }));
    }

    this.model.add(tf.layers.depthwiseConv2d({ kernelSize: 3, depthMultiplier: 1, padding: 'same', activation: 'relu', kernelInitializer: 'varianceScaling' }));
    this.model.add(tf.layers.conv2d({ filters: 512, kernelSize: 1, activation: 'relu', kernelInitializer: 'varianceScaling' }));
    this.model.add(tf.layers.depthwiseConv2d({ kernelSize: 3, depthMultiplier: 1, padding: 'same', activation: 'relu', kernelInitializer: 'varianceScaling' }));


    this.model.add(tf.layers.conv2d({ filters: 1024, kernelSize: 1, activation: 'relu', kernelInitializer: 'varianceScaling' }));
    this.model.add(tf.layers.globalAveragePooling2d({ dataFormat: "channelsLast" }));
    this.model.add(tf.layers.dense({ units: PARAMETERS, activation: 'LeakyReLU', kernelInitializer: 'varianceScaling' }));



    const optimizer = tf.train.adam(0.001);
    this.model.compile({
      optimizer: optimizer,
      loss: 'meanSquaredError',
      metrics: ['accuracy'],
    });


    //model.summary()
  }*/

  async save(path) {
    this.model.save(`file://${path}`)
  }

  async load(path) {
    this.model = await tf.loadLayersModel(`file://${path}/model.json`);
  }

  async train(images, results) {
    function onBatchEnd(batch, logs) {
      console.log(`Accuracy: ${logs.acc}`)
    }


    return this.model.fit(images, results, {
      batchSize: 96,
      //validationData: [testXs, testYs],
      validationSplit: 0.15,
      epochs: 10,
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