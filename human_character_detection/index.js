const mainCanvas = document.querySelector("#image-canvas")
const overlayCanvas = document.querySelector("#image-canvas-overlay")

const photosList = document.querySelector("#photos-list")

const mainCanvasContext = mainCanvas.getContext('2d');
const overlayCanvasContext = overlayCanvas.getContext('2d');

mainCanvas.width = 296;
mainCanvas.height = 136;
overlayCanvas.width = mainCanvas.width;
overlayCanvas.height = mainCanvas.height;

let rawCharacterSelector = {position: [-1, -1], isVisible: false}
let rawImageSelectors = {
    ball: rawCharacterSelector, 
    me: rawCharacterSelector, 
    friendly: [rawCharacterSelector, rawCharacterSelector], 
    enemy: [rawCharacterSelector, rawCharacterSelector, rawCharacterSelector]
}

let rawActiveEditorType = {type: null, index: null}
let activeEditorType = JSON.parse(JSON.stringify(rawActiveEditorType))
let imageSelectors = JSON.parse(JSON.stringify(rawImageSelectors))
let imageSelectorsKeys = Object.keys(imageSelectors)

function workCharacter(editingType, character){
    if(character.isVisible){
        if(character.position[0] > 0 && character.position[1] > 0){
            overlayCanvasContext.beginPath();

            overlayCanvasContext.arc(
                Math.round(character.position[0] * overlayCanvas.width), 
                Math.round(character.position[1] * overlayCanvas.height), 
                editingType == "ball" ? ballRadius : characterRadius, 
                0, 2 * Math.PI
            );
        
            let color = colors[editingType];
            
            overlayCanvasContext.fillStyle = "rgba(255, 255, 255, 0.2)";
            overlayCanvasContext.fill();
        
            overlayCanvasContext.lineWidth = 1;
            overlayCanvasContext.strokeStyle = "blue";
            overlayCanvasContext.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 1)`;
            overlayCanvasContext.stroke();           overlayCanvasContext.stroke();
        }
    }
}

async function workOverlay(){
    for(let characterKey of imageSelectorsKeys){
        let character = imageSelectors[characterKey]

        if(character.position){
            workCharacter(characterKey, character)
        } else {
            for(let realCharacter of character){
                workCharacter(characterKey, realCharacter)
            }
        }
    }
}

const ballRadius = 5
const characterRadius = 7

let colors = {
    ball: [255, 255, 0],
    enemy: [255, 0, 0],
    friendly: [0, 255, 0],
    me: [0, 255, 255],
}


function drawMouseOverlay(editingType, x, y){
    overlayCanvasContext.clearRect(0, 0, mainCanvas.width, mainCanvas.height);

    overlayCanvasContext.beginPath();

    overlayCanvasContext.arc(
        Math.round(x * overlayCanvas.width), 
        Math.round(y * overlayCanvas.height), 
        editingType == "ball" ? ballRadius : characterRadius, 
        0, 2 * Math.PI
    );

    let color = colors[editingType];
    
    overlayCanvasContext.fillStyle = "rgba(255, 255, 255, 0.2)";
    overlayCanvasContext.fill();

    overlayCanvasContext.lineWidth = 1;
    overlayCanvasContext.strokeStyle = "blue";
    overlayCanvasContext.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 1)`;
    overlayCanvasContext.stroke();
}

let images;
let currentImage;
async function loadImages(){
    images = await (await fetch("/images")).json();

    for(let [index, imageName] of images.entries()){
        createImageButton(index, imageName)
    }

    loadImage()
}

let valuesHolders = document.querySelectorAll(`.environment-variable-data`);
function listenImageVisibilityChange(){
    for(let valuesHolder of valuesHolders){
        let className = valuesHolder.classList[1].split("-");
        className.pop()

        valuesHolder.querySelector(".visibility-container").querySelector("input").addEventListener('change', (event) => {
            let type = className[0]
            let index = className[1];
            
            let parent = imageSelectors[type]
            if(index){
                parent = parent[parseInt(index) - 1]
            }
            
            if (event.currentTarget.checked) {
                parent.isVisible = true;
                activeEditorType.type = type;
                activeEditorType.index = index ? parseInt(index) - 1 : null;
            }
        })
    }
}

listenImageVisibilityChange()

function setImageValues(){
    for(let valuesHolder of valuesHolders){
        let className = valuesHolder.classList[1].split("-");
        className.pop()

        let type = className[0]
        let index = className[1];
        
        let parent = imageSelectors[type]
        if(index){
            parent = parent[parseInt(index) - 1]
        }

        valuesHolder.querySelector('.positionX').value = parent.position[0];
        valuesHolder.querySelector('.positionY').value = parent.position[1];
    }
}

function resetImageValues(){
    for(let valuesHolder of valuesHolders){
        valuesHolder.querySelector(".visibility-container").querySelector("input").checked = false
    }

    imageSelectors = JSON.parse(JSON.stringify(rawImageSelectors))
    JSON.parse(JSON.stringify(rawActiveEditorType))

    drawMouseOverlay()
    workOverlay()
}

setInterval(() => {
    setImageValues()
}, 100)

function loadImage(){
    currentImage = images[0]
    loadURL(`/images/${images[0]}.png`)
}

const urlImage = new Image();
function loadURL(url) {
    urlImage.onload = function () {
        mainCanvasContext.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
        mainCanvasContext.drawImage(urlImage, 0, 0, mainCanvas.width, mainCanvas.height);
    };

    urlImage.src = url;
}

async function uploadData(){
    return (await fetch('/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            data: imageSelectors,
            image: currentImage
        })
    })).json
}

function createImageButton(index, imageName) {
    var div = document.createElement('div');
    div.textContent = `#${index}`;

    div.classList.add('imageButton');

    div.addEventListener('click', function() {
        if(div == photosList.children[0]){
            //if(true){
                uploadData().then(() => {
                    //div.remove();
                    //images.shift();
                    //loadImage();
        
                    //resetImageValues()

                    location.reload();
                })
            //} else {
            //    alert(`You need to finish the current image to continue!`);
            //}
        }
    });

    photosList.appendChild(div);
}

overlayCanvas.addEventListener('mousemove', function(event) {
    var rect = overlayCanvas.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;

    var canvasX = x / rect.width;
    var canvasY = y / rect.height;

    drawMouseOverlay(activeEditorType.type || "ball",canvasX, canvasY)
    workOverlay()
});

overlayCanvas.addEventListener('click', function(event) {
    var rect = overlayCanvas.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;

    var canvasX = x / rect.width;
    var canvasY = y / rect.height;

    if(activeEditorType.type){
        let parent = imageSelectors[activeEditorType.type];
        if(typeof(activeEditorType.index) == "number"){
            parent = parent[activeEditorType.index]
        }

        parent.position[0] = canvasX
        parent.position[1] = canvasY
    }

    drawMouseOverlay(activeEditorType.type || "ball", canvasX, canvasY)
    workOverlay()
});

loadImages()
workOverlay()