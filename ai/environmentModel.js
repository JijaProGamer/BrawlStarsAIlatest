const puppeteer = require("puppeteer")
const express = require('express');
const path = require("path")
const uuid = require("uuid")
const { WebSocketServer } = require('ws');


const port = 7850;


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

  async warmup(){
    for (let i = 0; i < 3; i++){
      await this.predict(new Array(this.Resolution[0]*this.Resolution[1]*3));
    }
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

      this.expressServer.get('/model.json', (req, res) => {
          res.sendFile(path.join(__dirname, '/environment/model/model.json'));
      });

      this.expressServer.get('/:name.bin', (req, res) => {
        const name = req.params.name;
        res.sendFile(path.join(__dirname, `/environment/model/${name}.bin`));
      });
  
      this.expressServer.listen(port, () => {
          //console.log(`Environment GPU ML Model is running at http://localhost:${port}, and WS at ws://localhost:${port + 1}`);
      });
  
      this.webSocketServer.on('connection', (ws) => {
        this.websocket = ws;
  
        this.websocket.on('error', console.error);
        this.warmup().then(resolve)
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
      let messageId = uuid.v4();
      let begin = performance.now();
      const websocket = this.websocket;

      function onMessage(message){
        message = JSON.parse(message)
        if(message.id == messageId){
          websocket.off("message", onMessage)

          resolve({predictions: message.predictions, duration: performance.now() - begin})
        }
      }


      websocket.on("message", onMessage);
      websocket.send(JSON.stringify({id: messageId, resolution: this.Resolution, image}));
    })
  }
}

module.exports = EnvironmentModel