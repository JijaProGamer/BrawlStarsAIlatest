const express = require('express');

const fs = require('fs');
const path = require('path');

const app = express();
const port = 3030;

app.use(express.json());

app.use(express.static(__dirname));

app.get('/images', (req, res) => {
    let imagesRaw = fs.readdirSync(path.join(__dirname, "images"))
        .map(v => v.split(".png").shift());

    /*let imagesDone = fs.readdirSync(path.join(__dirname, "training_data"))
        .map(v => v.split(".json").shift());

    res.json(imagesRaw.filter((v) => !imagesDone.includes(v)))*/
    res.json(imagesRaw);
})

app.post('/image', (req, res) => {
    let image = req.body.image;
    let data = req.body.data;

    try {
        fs.copyFileSync(path.join(__dirname, "images", `${image}.png`), path.join(__dirname, "training_data", `${image}.png`));
        fs.rmSync(path.join(__dirname, "images", `${image}.png`));
        fs.writeFileSync(path.join(__dirname, "training_data", `${image}.json`), JSON.stringify(data), "utf-8");
    } catch (err){

    }

    res.sendStatus(201)
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
