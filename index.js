const { app, BrowserWindow } = require('electron');

const { Environment } = require("./ai/environment.js")

const StartScreen = require("./screen/screen.js")
const uuid = require("uuid")

const chalk = require('chalk');

process.setMaxListeners(0);

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })

    win.loadFile('index.html')
}

app.whenReady().then(() => {
    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

/*const botTitleString = `
    ░▒▓███████▓▒░ ░▒▓███████▓▒░       ░▒▓██████▓▒░░▒▓█▓▒░ 
    ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░             ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░ 
    ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░             ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░ 
    ░▒▓███████▓▒░ ░▒▓██████▓▒░       ░▒▓████████▓▒░▒▓█▓▒░ 
    ░▒▓█▓▒░░▒▓█▓▒░      ░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░ 
    ░▒▓█▓▒░░▒▓█▓▒░      ░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░ 
    ░▒▓███████▓▒░░▒▓███████▓▒░       ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░ 

`;

let subpanelsTraveled = "/";
const panels = {
    "/": [
        "banana",
        "nothing"
    ],
    "/banana": [
        "idk",
    ],
    "/nothing": [
        "womp",
        "womp"
    ]
}

function drawScreen() {
    process.stdout.write('\x1Bc'); // clear the page
    process.stdout.write(chalk.rgb(0, 255, 0)(botTitleString)); // write the title

    console.log(subpanelsTraveled)
    const panel = panels[subpanelsTraveled];
    if (panel) {
        for (let [index, option] of Object.entries(panel)) {
            process.stdout.write(`${parseInt(index) + 1}) ${option}\n`);
        }
    }
}

drawScreen();

process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.setRawMode(true);

process.stdin.on("data", (stdin) => {
    switch (stdin) {
        case '\u0003':
            process.exit();
        case '\u001b':
            if (subpanelsTraveled !== "/") {
                let pathSegments = subpanelsTraveled.split("/");
                pathSegments.pop();
                subpanelsTraveled = pathSegments.join("/") || "/";
                drawScreen(); // Ensure the screen is redrawn
            }
            break;
        default:
            stdin = stdin.toString().trim().toLowerCase();

            if (/^\d+$/.test(stdin)) {
                let selectedIndex = parseInt(stdin) - 1;
                if (panels[subpanelsTraveled] && panels[subpanelsTraveled][selectedIndex]) {
                    let nextPanel = panels[subpanelsTraveled][selectedIndex];
                    if (subpanelsTraveled === "/") {
                        subpanelsTraveled += nextPanel;
                    } else {
                        subpanelsTraveled += "/" + nextPanel;
                    }
                    drawScreen();
                }
            }
            break;
    }
});*/



/*let windowTitle = `brawlAI-screen-`
let Resolution = [384, 172]
let framerate = 10

let screenProcess
let ffmpegProcess

const LocalEnvironment = new Environment(Resolution)

let lastFrameEnded = true
async function OnFrame(frameData){
    if(!lastFrameEnded) return;

    lastFrameEnded = false;
    await LocalEnvironment.ProcessStep(frameData);
    lastFrameEnded = true;
}

async function Run(){
    await LocalEnvironment.init()
    ;[screenProcess, ffmpegProcess] = await StartScreen(Resolution, framerate, `${windowTitle}-${uuid.v4()}`, OnFrame);

}

Run()*/