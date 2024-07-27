process.setMaxListeners(0);

const { app, BrowserWindow, ipcMain } = require('electron');
const { Environment } = require("./ai/environment.js")
const StartScreen = require("./screen/screen.js")
const uuid = require("uuid")
const chalk = require('chalk');
const path = require("path")
const express = require("express")

const server_port = 7830;
const server = express();

server.use(express.urlencoded({ extended: true }));
server.use(express.json());


let window;
let environmentDetectionSettings = {
    scoreThreshold: 0.5,
}

let screenUsed = 0;

let Resolution = [448, 224]
let Framerate = 10

const LocalEnvironment = new Environment({ 
    Resolution, Framerate, screenUsed,
    DetectionSettings: environmentDetectionSettings
})

app.on("before-quit", () => {
    LocalEnvironment.quit()
})

let lastFrameEnded = true
async function OnFrame(frame){
    if(!lastFrameEnded || !LocalEnvironment.Started) return;
    lastFrameEnded = false

    const step = await LocalEnvironment.ProcessStep(frame);
    window.webContents.send("environment-detections", [ step, frame ]);
    
    //window.webContents.send("environment-detections", [ {predictions:[], duration: 0}, frame ]);

    lastFrameEnded = true;
}

async function Run(){
    const [_, recorder] = await Promise.all([
        LocalEnvironment.init(),
        StartScreen(Resolution, Framerate, screenUsed, OnFrame)
    ])
}



function createWindow() {
    window = new BrowserWindow({
        autoHideMenuBar: true,
        icon: path.join(__dirname, '/app/icon.ico'),
        title: "Brawl Stars AI",
        webPreferences: {
            preload: path.join(__dirname, 'app/preload.js'),
            nodeIntegration: true,
            enableRemoteModule: false,
            contextIsolation: true,
        }
    })

    window.maximize();
    window.loadURL(`http://127.0.0.1:${server_port}/`);

    window.webContents.once('did-finish-load', (e) => {
        window.webContents.send("settings", [ Resolution ]);
    })

    Run();
}

app.whenReady().then(() => {
    createWindow()
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

/*ipcMain.on('request-data', (event) => {
    const data = { message: 'Hello from Node.js!' };
    event.sender.send('response-data', data);
});*/



server.use(express.static(path.join(__dirname, '/app/public')));
server.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/app/public/index.html'));
});

server.get('/build/:file', (req, res) => {
    res.sendFile(path.join(__dirname, '/app/public/build', req.params.file));
});

server.listen(server_port)