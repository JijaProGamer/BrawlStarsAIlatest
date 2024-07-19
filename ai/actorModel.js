const playwright = require("playwright")
const express = require('express');
const path = require("path")
const uuid = require("uuid")
const multer = require("multer")
const { WebSocketServer } = require('ws');
const fs = require("fs")

const port = 7860;

const InputElements = 271;
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
    this.batchSize = 256; // how much memory at a time should be trained, bigger values are faster, but might not get accuracy as good as small values (16-32-64)


    this.memory = [];
  }

  saveModel() {
    fs.writeFileSync(path.join(__dirname, "/actor/epsilon"), this.epsilon.toPrecision(2).toString())
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

  async trainBatch(batch) {
    return (await this.sendRequest("trainBatch", { batch }, true)).trainingResults;
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

      this.browser = await playwright.chromium.launch({
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