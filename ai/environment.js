const { Actor } = require("./actor");
const actorModel = require("./actorModel.js")

class Environment {
    Texture;
    Resolution;

    Actor = new Actor();

    constructor(Resolution){
        this.Resolution = Resolution;

        actorModel.makeModel(Resolution);
    }

    async ProcessStep(Image){
        let prediction = await actorModel.predict(Image);
        console.log(prediction)
    }
}

module.exports = { Environment }