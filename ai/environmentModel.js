const tf = require("@tensorflow/tfjs-node")

const PARAMETERS_PER_PLAYER = 1 + 2;// + 2;
const PARAMETERS_PER_BALL = 1 + 2;
const PARAMETERS = PARAMETERS_PER_BALL + 6 * PARAMETERS_PER_PLAYER;

const puppeteer = require("puppeteer")
const express = require('express');
const path = require("path")
const uuid = require("uuid")
const { WebSocketServer } = require('ws');


const port = 3000;


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

  launchModel(){
    return new Promise(async (resolve, reject) => {
      this.expressServer = express();

      this.webSocketServer = new WebSocketServer({
        port: port + 1,
        perMessageDeflate: false
      });
  
      this.expressServer.get('/', (req, res) => {
          res.sendFile(path.join(__dirname, '/environment/page.html'));
      });
  
      this.expressServer.listen(port, () => {
          console.log(`Environment GPU ML Model is running at http://localhost:${port}, and WS at ws://localhost:${port + 1}`);
      });
  
      this.webSocketServer.on('connection', (ws) => {
        this.websocket = ws;
  
        this.websocket.on('error', console.error);
        resolve()
      });
  
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--use-angle=default"
        ]
      })
  
      this.page = await this.browser.newPage()
      await this.page.goto(`http://localhost:${port}/`)
  
      //await this.page.screenshot({path: "gputest.png", fullPage: true})
    })
  }

  predict(image) {
    return new Promise((resolve, reject) => {      
      let messageId = uuid.v4()
      let begin = performance.now()
      let websocket = this.websocket

      function onMessage(message){
        message = JSON.parse(message)
        if(message.id == messageId){
          websocket.off("message", onMessage)

          resolve({predictions: message.predictions, duration: performance.now() - begin})
        }
      }


      this.websocket.on("message", onMessage);
      this.websocket.send(JSON.stringify({id: messageId, shape: image.shape, data: Object.values(image.dataSync())}));
    })
  }
}

module.exports = EnvironmentModel