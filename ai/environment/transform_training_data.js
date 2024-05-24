const fs = require('fs');
const path = require('path');
const { create } = require('xmlbuilder2');

const data = [
    {
        imagePath: 'path/to/image1.jpg',
        boundingBoxes: [
            { xmin: 50, ymin: 50, xmax: 200, ymax: 200, label: 'cat', truncated: 0, difficult: 0, pose: 'Unspecified' },
            { xmin: 30, ymin: 30, xmax: 100, ymax: 100, label: 'dog', truncated: 1, difficult: 0, pose: 'Left' }
        ],
        width: 800,
        height: 600
    },
    {
        imagePath: 'path/to/image2.jpg',
        boundingBoxes: [
            { xmin: 100, ymin: 100, xmax: 300, ymax: 300, label: 'bird', truncated: 0, difficult: 1, pose: 'Right' }
        ],
        width: 1024,
        height: 768
    }
];

//let fileContents = JSON.parse(fs.readFileSync(path.join(__dirname, "human_character_detection/training_data", `${fileName}.json`), "utf-8"));

const ballRadius = 5
const characterRadius = 7

let imageResolution = [296, 136]

function createPascalVOC(imagePath, obj) {
    const doc = create({ version: '1.0' })
        .ele('annotation')
        .ele('folder').txt(path.dirname(imagePath)).up()
        .ele('filename').txt(path.basename(imagePath)).up()
        .ele('path').txt(imagePath).up()
        .ele('source')
            .ele('database').txt(`Bloxxy (bloxxy213 discord / JijaProGamer github)'s brawl stars object database`).up().up()
        .ele('size')
            .ele('width').txt(imageResolution[0]).up()
            .ele('height').txt(imageResolution[1]).up()
            .ele('depth').txt(3).up().up()
        .ele('segmented').txt(0).up();

    let objects = [];

    function addObject(objectName, objectData){
        if(objectData.isVisible){
            objects.push({
                name: objectName,

                xmin: objectName = "ball" ? Math.round(objectData.position[0] * imageResolution[0]) - ballRadius : Math.round(objectData.position[0] * imageResolution[0]) - characterRadius,
                ymin: objectName = "ball" ? Math.round(objectData.position[1] * imageResolution[1]) - ballRadius : Math.round(objectData.position[1] * imageResolution[1]) - characterRadius,

                xmax: objectName = "ball" ? Math.round(objectData.position[0] * imageResolution[0]) + ballRadius : Math.round(objectData.position[0] * imageResolution[0]) + characterRadius,
                ymax: objectName = "ball" ? Math.round(objectData.position[1] * imageResolution[1]) + ballRadius : Math.round(objectData.position[1] * imageResolution[1]) + characterRadius,
            });
        }
    }

    addObject("ball", obj.ball);
    addObject("me", obj.me);
    addObject("friendly", obj.friendly[0]);
    addObject("friendly", obj.friendly[1]);
    addObject("enemy", obj.enemy[0]);
    addObject("enemy", obj.enemy[1]);
    addObject("enemy", obj.enemy[2]);

    objects.forEach(box => {
        doc.ele('object')
            .ele('name').txt(box.name).up()
            .ele('pose').txt('Unspecified').up()
            .ele('truncated').txt(0).up()
            .ele('difficult').txt(0).up()
            .ele('bndbox')
                .ele('xmin').txt(box.xmin).up()
                .ele('ymin').txt(box.ymin).up()
                .ele('xmax').txt(box.xmax).up()
                .ele('ymax').txt(box.ymax).up().up().up();
    });

    const xml = doc.end({ prettyPrint: true });
    return xml;
}

function load_training_data(){
    let files = fs.readdirSync(path.join(__dirname, "../../human_character_detection/training_data/")).filter(v => v.includes(".json")).map((v) => v.split(".json").shift())
    for(let file of files){
        let obj = JSON.parse(fs.readFileSync(path.join(__dirname, "../../human_character_detection/training_data/", `${file}.json`), "utf-8"))
        let VOC = createPascalVOC(path.join(__dirname, "../../human_character_detection/training_data/", `${file}.png`), obj)

        fs.writeFileSync(path.join(__dirname, "/dataset/", `${file}.xml`), VOC, 'utf8');
    }
}

load_training_data()

/*data.forEach(item => {
    const xml = createPascalVOC(item);
    const xmlFilePath = path.join(path.dirname(item.imagePath), path.basename(item.imagePath, path.extname(item.imagePath)) + '.xml');
    fs.writeFileSync(xmlFilePath, xml, 'utf8');
    console.log(`Saved: ${xmlFilePath}`);
});*/