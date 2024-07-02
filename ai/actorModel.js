const tf = require("@tensorflow/tfjs")

const InputElements = 36;
const OutputElements = 10;

class ActorModel {
  Resolution

  constructor(Resolution) {
    let brawlballLength = Math.ceil(60 * 3.50);
    let averageFPS = 15;

    this.Resolution = Resolution;
    this.learningRate = 0.001; // how much to take into consideration a single memory step
    this.gamma = 0.99; // how much to value longer term benefits (higher number = values more long term benefits)
    this.epsilon = 0.65; // how much to randomise output, to explore the environment, to learn it
    this.epsilonDecay = 0.995; // how fast to stop learning the environment
    this.minEpsilon = 0.01; // the minimum chance to explore the environment
    this.bufferSize = brawlballLength * averageFPS; // how big should the memory buffer be
    this.batchSize = 64; // how much memory at a time should be trained, bigger values are better but slower (and converge slower)

    this.optimizer = tf.train.adam(this.learningRate);

    this.memory = [];
    this.model = this.makeModel();
    this.targetModel = this.makeModel();
    this.targetModel.setWeights(this.model.getWeights());
  }

  makeModel() {
    const imageInput = tf.input({ shape: [this.Resolution[1], this.Resolution[0], 3], name: 'image_input' });
    const additionalDataInput = tf.input({ shape: [InputElements], name: 'additional_data_input' });

    // Convolutional layers for image input
    const convLayer = tf.layers.conv2d({ filters: 32, kernelSize: 3, activation: 'relu' }).apply(imageInput);
    const maxPoolLayer = tf.layers.maxPooling2d({ poolSize: [2, 2] }).apply(convLayer);
    const convLayer2 = tf.layers.conv2d({ filters: 64, kernelSize: 3, activation: 'relu' }).apply(maxPoolLayer);
    const maxPoolLayer2 = tf.layers.maxPooling2d({ poolSize: [2, 2] }).apply(convLayer2);
    const flattenLayer = tf.layers.flatten().apply(maxPoolLayer2);

    // Dense layers for additional data input
    const denseLayer1 = tf.layers.dense({ units: 128, activation: 'relu' }).apply(additionalDataInput);
    const denseLayer2 = tf.layers.dense({ units: 64, activation: 'relu' }).apply(denseLayer1);

    // Concatenate both branches
    const concatenated = tf.layers.concatenate().apply([flattenLayer, denseLayer2]);

    // Dense layers after concatenation
    const denseLayer3 = tf.layers.dense({ units: 128, activation: 'relu' }).apply(concatenated);
    const output = tf.layers.dense({ units: OutputElements, activation: 'linear' }).apply(denseLayer3);

    const model = tf.model({ inputs: [imageInput, additionalDataInput], outputs: output });

    model.compile({
      optimizer: this.optimizer,
      loss: 'meanSquaredError',
      metrics: ['accuracy'],
    });

    //model.summary()
    return model
  }

  async predict(state) {
    return await this.model.predict(state).data();
  }

  async targetPredict(state) {
    return await this.targetModel.predict(state).data();
  }

  remember(state, action, reward, nextState, done) {
    this.memory.push({ state, action, reward, nextState, done });
    if (this.memory.length > this.bufferSize) {
      this.memory.shift();
    }
  }

  async replay() {
    if (this.memory.length < this.batchSize) {
      return;
    }

    const minibatch = this.memory.sort(() => Math.random() - 0.5).slice(0, this.batchSize);

    const states = [];
    const targets = [];
    for (const { state, action, reward, nextState, done } of minibatch) {
      let target = reward;
      if (!done) {
        const targetQValues = await this.targetPredict(nextState);
        target = reward + this.gamma * targetQValues[action];
      }

      const targetF = this.predict(state).dataSync();
      targetF[action] = target;
      states.push(state);
      targets.push(targetF);
    }

    this.train(states, targets);
  }

  train(states, targets) {
    const tensorStates = tf.tensor(states);
    const tensorTargets = tf.tensor(targets);

    this.model.fit(tensorStates, tensorTargets, { epochs: 1, verbose: 0 });
    this.decayEpsilon()
  }

  updateTargetModel() {
    this.targetModel.setWeights(this.model.getWeights());
  }

  decayEpsilon() {
    if (this.epsilon > this.minEpsilon) {
      this.epsilon *= this.epsilonDecay;
    }
  }

  async act(imageTensor, environment) {
    let dataTensor = tf.tensor2d(environment, [1, environment.length])

    const actionProbabilities = [];
    const qValues = await this.predict([imageTensor, dataTensor])

    for (let i = 0; i < OutputElements; i++) {
      if (Math.random() <= this.epsilon) { // randomize some of the values to explore the environment
        actionProbabilities.push(Math.random() * 2 - 1);
      } else {
        actionProbabilities.push(qValues[i]);
      }
    }

    return actionProbabilities;
  }
}

module.exports = ActorModel