const path = require("path");
const { Actor, Player } = require("./actor");
const actorModel = require("./actorModel.js")
const environmentModel = require("./environmentModel.js")

const fs = require("fs")

function lerp(x, y, t){
    return x + t * (y - x);
}

class Environment {
    Resolution;
    screenUsed;

    ActorModel;
    EnvironmentModel;

    Actor = new Actor();
    Friendly = [];
    Enemy = []

    BallPosition = [0, 0, 0];
    Time = 0;

    Started = false;

    constructor({ Resolution, Framerate, DetectionSettings, screenUsed}){
        for(let i = 0; i < 15; i++){
            this.Friendly.push(new Player());
            this.Enemy.push(new Player())
        }

        this.Resolution = Resolution;
        this.screenUsed = screenUsed;

        this.ActorModel = new actorModel(Resolution, Framerate)
        this.EnvironmentModel = new environmentModel(Resolution, DetectionSettings)
    }

    async init(){
        if(!fs.existsSync(path.join(__dirname, "/actor/model/"))){
            await this.ActorModel.saveModelLayout();
        }

        await Promise.all([
            this.ActorModel.launchModel(),
            this.EnvironmentModel.launchModel(),
            this.Actor.init(this.screenUsed)
        ])

        await this.ActorModel.saveModel()

        this.Started = true;
    }

    quit(){
        try { this.EnvironmentModel.quit(); } catch(err){};
        try { this.ActorModel.quit(); } catch(err){};
    }

    async CreateWorld(Image){
        let environmentResult = await this.EnvironmentModel.predict(Image);
        this.SetWorld(environmentResult.predictions)

        return [ environmentResult ]
    }

    /*async SetWorld(prediction){
        if(prediction[0] > 0){
            this.BallPosition = [prediction[1], prediction[2]]
        } else {
            this.BallPosition = [-1, -1]
        }

        let lastIndex = 3;

        function setPlayer(player){
            if(prediction[lastIndex] > 0){
                player.Position = [prediction[lastIndex + 1], prediction[lastIndex + 2]];
                //player.HasUltra = prediction[lastIndex + 3] > 0;
                //player.HasHypercharge = prediction[lastIndex + 4] > 0;
            } else {
                //player.HasUltra = false;
                //player.HasHypercharge = false;
                player.Position = [-1, -1];
                player.Health = 0;
            }

            //lastIndex += 5;
            lastIndex += 3;
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
    }*/

    async SetWorld(prediction){
        let ball = prediction.filter((v) => v.class == "Ball")[0]
        let me = prediction.filter((v) => v.class == "Me")[0]
        let friendly = prediction.filter((v) => v.class == "Friendly")
        let enemy = prediction.filter((v) => v.class == "Enemy")

        if(ball){
            this.BallPosition = [(ball.x1 + ball.x2) / 2, (ball.y1 + ball.y2) / 2]
        } else {
            this.BallPosition = [-1, -1]
        }

        function setPlayer(player, playerData){
            if(playerData){
                //player.Position = [(playerData.x1 + playerData.x2) / 2, (playerData.x1 + playerData.y2) / 2];
                const biggestY = playerData.y1 > playerData.y2 ? playerData.y1 : playerData.y2;
                player.Position = [(playerData.x1 + playerData.x2) / 2, biggestY - 0.07];

                //player.HasUltra = prediction[lastIndex + 3] > 0;
                //player.HasHypercharge = prediction[lastIndex + 4] > 0;
            } else {
                //player.HasUltra = false;
                //player.HasHypercharge = false;
                player.Position = [-1, -1];
                player.Health = 0;
            }
        }

        function setLocalPlayer(){

        }

        setPlayer(this.Actor, me)
        setLocalPlayer()

        for(let i = 0; i < 15; i++){
            setPlayer(this.Friendly[i], friendly[i])
        }

        for(let i = 0; i < 15; i++){
            setPlayer(this.Enemy[i], enemy[i])
        }
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

    async fakeActorActions(Image){
        let moveX = 0;
        let moveY = 0;

        const localPosition = this.Actor.Position;
        const closestEnemy = this.Enemy.filter(v => v.Position[0] >= 0 || v.Position[1] >= 0).sort((a, b) => (a.Position[0]*a.Position[0] + a.Position[1]*a.Position[0]) - (b.Position[0]*b.Position[0] + b.Position[1]*b.Position[0]))[0];
        //const closestEnemy = this.BallPosition;

        if(closestEnemy){
            //if(closestEnemy[0] >=0){
            const direction = [localPosition[0] - closestEnemy.Position[0], localPosition[1] - closestEnemy.Position[1]];
            //const direction = [localPosition[0] - closestEnemy[0], localPosition[1] - closestEnemy[1]];
            const directionMagnitude = Math.sqrt(direction[0]*direction[0] + direction[1]*direction[1]);
            const normalizedDirection = [direction[0] / directionMagnitude, direction[1] / directionMagnitude];
        
            moveX = -normalizedDirection[0];
            moveY = normalizedDirection[1];
        }

        /*return [
            0, 0,
            moveX, -moveY,
            0, 0,

            -1,
            -1,
            -1,
            -1,
        ]*/

        return [
            moveX, moveY,
            0, 0,
            0, 0,

            -1,
            -1,
            -1,
            -1,
        ]
    }

    async ProcessStep(Image){
        const [ environmentResult ] = await this.CreateWorld(Image);
        //let actorActions = await this.ActorModel.act(Image, [...this.PipeEnvironment(), ...this.PipeActor(), ...this.PipeFriendly(), ...this.PipeEnemy()]);
        let actorActions = await this.fakeActorActions(Image);
        this.SetActor(actorActions)
        //console.log(actorActions);

        return [ environmentResult ];
    }
}

module.exports = { Environment }