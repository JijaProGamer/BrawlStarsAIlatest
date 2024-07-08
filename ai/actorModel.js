const tf = require("@tensorflow/tfjs-node")
const puppeteer = require("puppeteer")
const express = require('express');
const path = require("path")
const uuid = require("uuid")
const multer = require("multer")
const { WebSocketServer } = require('ws');
const fs = require("fs")

const port = 7860;

const InputElements = 161;
const OutputElements = 10;

class ActorModel {
  Resolution

  constructor(Resolution, Framerate) {
    let matchLength = Math.ceil(60 * 3.50);

    this.Resolution = Resolution;
    this.learningRate = 0.001; // how much to take into consideration a single memory step
    this.gamma = 0.85; // how much to value longer term benefits (higher number = values more long term benefits)
    this.epsilon = 1; // how much to randomise output, to explore the environment, to learn it
    this.epsilonDecay = 0.995; // how fast to stop learning the environment
    this.minEpsilon = 0.05; // the minimum chance to explore the environment
    this.bufferSize = matchLength * Framerate; // how big should the memory buffer be
    this.batchSize = 256; // how much memory at a time should be trained, bigger values are faset (I heard it converges faster, but I think it's the opposite)

    this.optimizer = tf.train.adam(this.learningRate);

    this.memory = [];
  }

  makeModel() {
    const imageInput = tf.input({ shape: [this.Resolution[1], this.Resolution[0], 3], name: 'image_input' });
    const additionalDataInput = tf.input({ shape: [InputElements], name: 'additional_data_input' });

    // Convolutional layers for image input
    const convLayer = tf.layers.conv2d({ filters: 32, kernelSize: 3, activation: 'LeakyReLU' }).apply(imageInput);
    const maxPoolLayer = tf.layers.maxPooling2d({ poolSize: [2, 2] }).apply(convLayer);
    const convLayer2 = tf.layers.conv2d({ filters: 64, kernelSize: 3, activation: 'LeakyReLU' }).apply(maxPoolLayer);
    const maxPoolLayer2 = tf.layers.maxPooling2d({ poolSize: [2, 2] }).apply(convLayer2);
    const flattenLayer = tf.layers.flatten().apply(maxPoolLayer2);

    // Dense layers for additional data input
    const denseLayer1 = tf.layers.dense({ units: 128, activation: 'LeakyReLU' }).apply(additionalDataInput);
    const denseLayer2 = tf.layers.dense({ units: 64, activation: 'LeakyReLU' }).apply(denseLayer1);

    // Concatenate both branches
    const concatenated = tf.layers.concatenate().apply([flattenLayer, denseLayer2]);

    // Dense layers after concatenation
    const denseLayer3 = tf.layers.dense({ units: 128, activation: 'LeakyReLU' }).apply(concatenated);
    const output = tf.layers.dense({ units: OutputElements, activation: 'linear' }).apply(denseLayer3);

    const model = tf.model({ inputs: [imageInput, additionalDataInput], outputs: output });

    model.compile({
      optimizer: this.optimizer,
      loss: tf.losses.huberLoss,
      metrics: ['mae', 'accuracy'],
    });

    //model.summary()
    return model
  }

  async saveModelLayout() {
    this.model = this.makeModel();
    await this.model.save(`file://${path.join(__dirname, "/actor/model/")}`);
    fs.writeFileSync(path.join(__dirname, "/actor/epsilon"), this.epsilon.toPrecision(2).toString())
  }

  saveModel() {
    return this.sendRequest("save", {}, true);
  }

  remember(state, action, reward, nextState, done) {
    this.sendRequest("remember", { state, action, reward, nextState, done }, false);
  }

  replay() {
    return this.sendRequest("replay", {}, true);
  }

  updateTargetModel(){
    this.sendRequest("updateTargetModel", {}, false);
  }

  async act(image, environment) {
    return (await this.sendRequest("act", { image, environment, resolution: this.Resolution }, true)).predictions;
  }

  quit(){
    this.browser.close()
  }

  launchModel() {
    return new Promise(async (resolve, reject) => {
      this.expressServer = express();

      this.webSocketServer = new WebSocketServer({
        port: port + 1,
        perMessageDeflate: false
      });

      this.expressServer.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, '/actor/page.html'));
      });

      this.expressServer.get('/model.json', (req, res) => {
        res.sendFile(path.join(__dirname, '/actor/model/model.json'));
      });

      this.expressServer.get('/constants.json', (req, res) => {
        res.sendFile(path.join(__dirname, '/actor/constants.json'));
      });

      this.expressServer.get('/epsilon', (req, res) => {
        if(!fs.existsSync(path.join(__dirname, "/actor/epsilon"))){
          fs.writeFileSync(path.join(__dirname, "/actor/epsilon"), this.epsilon.toPrecision(8).toString())
          return res.send(this.epsilon.toPrecision(8).toString());
        }
        
        res.send(fs.readFileSync(path.join(__dirname, "/actor/epsilon")));
      });

      this.expressServer.post('/epsilon', (req, res) => {
        fs.writeFileSync(path.join(__dirname, "/actor/epsilon"), parseInt(req.query.epsilon).toPrecision(8).toString())
        res.sendStatus(200)
      });

      this.expressServer.get('/hyperparameters.json', (req, res) => {
        res.json({
          gamma: this.gamma,
          epsilon: this.epsilon,
          epsilonDecay: this.epsilonDecay,
          minEpsilon: this.minEpsilon,
          bufferSize: this.bufferSize,
          batchSize: this.batchSize,
        })
      });

      this.expressServer.get('/:name.bin', (req, res) => {
        const name = req.params.name;
        res.sendFile(path.join(__dirname, `/actor/model/${name}.bin`));
      });

      const storage = multer.diskStorage({
        destination: (req, file, cb) => {
          cb(null, path.join(__dirname, "/actor/model/"));
        },
        filename: (req, file, cb) => {
          //if(file.originalname.includes(".bin")){
          //  file.originalname = file.split("model.").pop();
          //}

          cb(null, file.originalname);
        }
      });

      const upload = multer({ storage: storage });
      this.expressServer.post('/model', upload.any(), (req, res) => {
        if (!req.files) {
          return res.status(400).send('No files uploaded.');
        }

        res.send('Files uploaded successfully.');
      });

      this.expressServer.listen(port, () => {
        //console.log(`Environment GPU ML Model is running at http://localhost:${port}, and WS at ws://localhost:${port + 1}`);
      });

      this.webSocketServer.on('connection', (ws) => {
        this.websocket = ws;

        this.websocket.on('error', console.error);
        //this.warmup().then(resolve)
        resolve()
      });

      this.browser = await puppeteer.launch({
        headless: false,
        args: [
          "--no-sandbox",
          "--use-angle=default",
          //'--use-gl=egl'
        ]
      })

      this.page = await this.browser.newPage()
      await this.page.goto(`http://localhost:${port}/`)

      //await this.page.screenshot({path: "gputest.png", fullPage: true})
    })
  }

  sendRequest(type, data, awaitResponse) {
    return new Promise((resolve, reject) => {
      let messageId = uuid.v4();
      let begin = performance.now();
      const websocket = this.websocket;

      if (awaitResponse) {
        function onMessage(message) {
          message = JSON.parse(message)
          if (message.id == messageId) {
            websocket.off("message", onMessage)

            resolve({ ...message, duration: performance.now() - begin })
          }
        }

        websocket.on("message", onMessage);
      } else {
        resolve();
      }

      websocket.send(JSON.stringify({ type, id: messageId, ...data }));
    })
  }
}

module.exports = ActorModel

/*class ActorModel {
  Resolution

  constructor(Resolution, Framerate) {
    let matchLength = Math.ceil(60 * 3.50);

    this.Resolution = Resolution;
    this.learningRate = 0.001; // how much to take into consideration a single memory step
    this.gamma = 0.85; // how much to value longer term benefits (higher number = values more long term benefits)
    this.epsilon = 0.75; // how much to randomise output, to explore the environment, to learn it
    this.epsilonDecay = 0.995; // how fast to stop learning the environment
    this.minEpsilon = 0.01; // the minimum chance to explore the environment
    this.bufferSize = matchLength * Framerate; // how big should the memory buffer be
    this.batchSize = 256; // how much memory at a time should be trained, bigger values are faset (I heard it converges faster, but I think it's the opposite)

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

module.exports = ActorModel*/