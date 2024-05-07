const mainCanvas = document.querySelector("#image-canvas")
const overlayCanvas = document.querySelector("#image-canvas-overlay")

const photosList = document.querySelector("#photos-list")

const mainCanvasContext = mainCanvas.getContext('2d');
const overlayCanvasContext = overlayCanvas.getContext('2d');

mainCanvas.width = 296;
mainCanvas.height = 136;
overlayCanvas.width = mainCanvas.width;
overlayCanvas.height = mainCanvas.height;

let rawCharacterSelector = {start: [-1, -1], extend: [-1, -1], isVisible: false}
let rawImageSelectors = {
    ball: rawCharacterSelector, 
    me: rawCharacterSelector, 
    friendly: [rawCharacterSelector, rawCharacterSelector], 
    enemy: [rawCharacterSelector, rawCharacterSelector, rawCharacterSelector]
}

let rawActiveEditorType = {type: null, value: 0, index: null}
let activeEditorType = JSON.parse(JSON.stringify(rawActiveEditorType))
let imageSelectors = JSON.parse(JSON.stringify(rawImageSelectors))
let imageSelectorsKeys = Object.keys(imageSelectors)

function workCharacter(character){
    if(character.isVisible){
        if(character.extend[0] > 0 && character.extend[1] > 0){
            overlayCanvasContext.strokeStyle = 'yellow';

            overlayCanvasContext.strokeRect(
                character.start[0] * mainCanvas.width, 
                character.start[1] * mainCanvas.height, 
                character.extend[0] * mainCanvas.width,
                character.extend[1] * mainCanvas.height, 
            );
        }

        overlayCanvasContext.fillStyle = 'dark';

        overlayCanvasContext.fillRect(
            character.start[0] * mainCanvas.width - 2, 
            character.start[1] * mainCanvas.height - 2, 
            4, 4
        );

        overlayCanvasContext.fillRect(
            (character.start[0] + character.extend[0]) * mainCanvas.width - 2,
            (character.start[1] + character.extend[1]) * mainCanvas.height - 2, 
            4, 4
        );
    }
}

async function workOverlay(){
    overlayCanvasContext.clearRect(0, 0, mainCanvas.width, mainCanvas.height);

    for(let characterKey of imageSelectorsKeys){
        let character = imageSelectors[characterKey]

        if(character.start){
            workCharacter(character)
        } else {
            for(let realCharacter of character){
                workCharacter(realCharacter)
            }
        }
    }
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
                activeEditorType.value = 0;
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

        valuesHolder.querySelector('.startX').value = parent.start[0];
        valuesHolder.querySelector('.startY').value = parent.start[1];
        valuesHolder.querySelector('.extendX').value = parent.extend[0];
        valuesHolder.querySelector('.extendY').value = parent.extend[1];    
    }
}

function resetImageValues(){
    for(let valuesHolder of valuesHolders){
        valuesHolder.querySelector(".visibility-container").querySelector("input").checked = false
    }

    imageSelectors = JSON.parse(JSON.stringify(rawImageSelectors))
    JSON.parse(JSON.stringify(rawActiveEditorType))

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

function uploadData(){
    fetch('/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            data: imageSelectors,
            image: currentImage
        })
    })
}

function createImageButton(index, imageName) {
    var div = document.createElement('div');
    div.textContent = `#${index}`;

    div.classList.add('imageButton');

    div.addEventListener('click', function() {
        if(div == photosList.children[0]){
            //if(true){
                uploadData()

                div.remove();
                images.shift();
                loadImage();
    
                resetImageValues()
            //} else {
            //    alert(`You need to finish the current image to continue!`);
            //}
        }
    });

    photosList.appendChild(div);
}

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

        if(activeEditorType.value == 0){
            parent.start[0] = canvasX
            parent.start[1] = canvasY
        }

        if(activeEditorType.value == 1){
            parent.extend[0] = canvasX - parent.start[0]
            parent.extend[1] = canvasY - parent.start[1]
        }

        /*if(parent.extend[0] < 0){
            parent.start[0] -= parent.extend[0];
            parent.extend[0] = -parent.extend[0];
        }

        if(parent.extend[1] < 0){
            parent.start[1] -= parent.extend[1];
            parent.extend[1] = -parent.extend[1];
        }*/

        activeEditorType.value += 1

        if(activeEditorType.value == 2){
            activeEditorType.value = 0
        }
    }

    workOverlay()
});

loadImages()
workOverlay()