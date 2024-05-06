const tf = require("@tensorflow/tfjs-node")
const { Actor, Player } = require("./actor");
const actorModel = require("./actorModel.js")
const environmentModel = require("./environmentModel.js")

class Environment {
    Resolution;

    Actor = new Actor();
    Friendly = [new Player(), new Player()];
    Enemy = [new Player(), new Player(), new Player()]

    BallPosition = [0, 0, 0];
    Time = 0;

    constructor(Resolution){
        this.Resolution = Resolution;

        actorModel.makeModel(Resolution);
        environmentModel.makeModel(Resolution);
    }

    async CreateWorld(Image, imageTensor){
        console.time("world prediction")
        let prediction = await environmentModel.predict(imageTensor);
        console.timeEnd("world prediction")

        if(prediction[0] >= 0 && prediction[1] >= 0){
            this.BallPosition = [prediction[0], prediction[1]]
        } else {
            this.BallPosition = [-1, -1]
        }

        let lastIndex = 2;

        function setPlayer(player){
            if(prediction[lastIndex] > -1){
                player.Position = [prediction[lastIndex + 1], prediction[lastIndex + 2]];
                player.HasUltra = prediction[lastIndex + 3] > 0;
                player.HasHypercharge = prediction[lastIndex + 4] > 0;
            } else {
                player.HasUltra = false;
                player.HasHypercharge = false;
                player.Position = [-1, -1];
                player.Health = 0;
            }

            lastIndex += 5;;
        }

        function setLocalPlayer(){

        }

        setPlayer(this.Actor)
        setLocalPlayer()

        for(let i = 0; i < 2; i++){
            setPlayer(this.Friendly[i])
        }

        for(let i = 0; i < 3; i++){
            setPlayer(this.Enemy[i])
        }
    }

    PipeEnvironment(){
        return [
            ...this.BallPosition,
            this.Time
        ]
    }

    PipeActor(){
        return [
            ...this.Actor.Position, 
            this.Actor.Health,
            this.Actor.Gadgets,
            this.Actor.Shoots,

            this.Actor.HasUltra && 1 || 0,
            this.Actor.HasGadget && 1 || 0,
            this.Actor.HasHypercharge && 1 || 0,
        ]
    }

    PipeEnemy(){
        let enemyData = []

        for(let Enemy of this.Enemy){
            enemyData.push(...[
                ...Enemy.Position, 
                Enemy.Health,
    
                Enemy.HasUltra  && 1 || 0,
                Enemy.HasHypercharge  && 1 || 0,
            ])
        }

        return enemyData
    }

    PipeFriendly(){
        let friendlyData = []

        for(let Friendly of this.Friendly){
            friendlyData.push(...[
                ...Friendly.Position, 
                Friendly.Health,
    
                Friendly.HasUltra && 1 || 0,
                Friendly.HasHypercharge && 1 || 0,
            ])
        }

        return friendlyData
    }

    async ProcessStep(Image){
        let imageTensor = tf.tensor(Image, [this.Resolution[0], this.Resolution[1], 2])
        .div(tf.scalar(255))
        .expandDims();

        await this.CreateWorld(Image, imageTensor);
        //console.time("actor actions prediction")
        let prediction = await actorModel.predict(imageTensor, [...this.PipeEnvironment(), ...this.PipeActor(), ...this.PipeFriendly(), ...this.PipeEnemy()]);
        //console.timeEnd("actor actions prediction")

        this.SetActor(prediction)
    }

    SetActor(prediction){
        this.Actor.MoveDirection = [prediction[0], prediction[1]];
        this.Actor.ShootDirection = [prediction[2], prediction[3]];
        this.Actor.UltraDirection = [prediction[4], prediction[5]];

        this.Actor.ReleaseShoot = prediction[6] >= 0;
        this.Actor.ReleaseUltra = prediction[7] >= 0;
        this.Actor.UseHypercharge = prediction[8] >= 0;
        this.Actor.UseGadget = prediction[9] >= 0;

        this.Actor.ApplyInputs()
    }
}

module.exports = { Environment }