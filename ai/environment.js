const path = require("path");
const Tesseract = require("tesseract.js");
const os = require('os');
const { Actor, Player } = require("./actor");
const actorModel = require("./actorModel.js");
const EnvironmentModel = require("./environment/predict.js");
const fs = require("fs");
const Brain = require("./brain.js")

const getBBScores = require("../screen/environmental/getBBScores.js");
const getGBGems = require("../screen/environmental/getGBGems.js");
const getHealth = require("../screen/environmental/getHealth.js");
const getGadget = require("../screen/environmental/getGadget.js");
const getSuperPercent = require("../screen/environmental/getSuperPercent.js");
const getHeistHealth = require("../screen/environmental/getHeistHealth.js");
const getHotzonePercent = require("../screen/environmental/getHotzonePercent.js");

const gamemodesIndices = ["BrawlBall", "GemGrab", "Heist", "Hotzone", "Showdown"];
const maxMatchLength = 210;

class Environment {
    Resolution;
    Framerate;
    screenUsed;

    ActorModel;

    lastActorState;

    ocrSheduler = Tesseract.createScheduler();

    Actor = new Actor();
    Friendly = [];
    Enemy = []

    Started = false;
    CurrentMatchType = "BrawlBall";
    TimeLeft = 0;
    GamemodeEnvironmentData = {
        BrawlBall: {
            ScoresEnemy: 0,
            ScoresFriendly: 0,
            BallPosition: [0, 0, 0]
        },
        GemGrab: {
            GemsEnemy: 0,
            GemsFriendly: 0,
            GemPositions: []
        },
        Heist: {
            HealthEnemy: 0,
            HealthFriendly: 0,
            FriendlyPosition: [],
            EnemyPosition: []
        },
        Hotzone: {
            PercentEnemy: 0,
            PercentFriendly: 0,
            HotzonePositions: [],
        },
        Showdown: {
            PlayersAlive: 0,
            PPs: [],
            PP_Boxes: [],
        }
    }

    constructor({ Resolution, Framerate, screenUsed}){
        for(let i = 0; i < 15; i++){
            this.Friendly.push(new Player());
            this.Enemy.push(new Player());
            this.GamemodeEnvironmentData.GemGrab.GemPositions.push([0, 0, 0]);
        }

        for(let i = 0; i < 3; i++){
            this.GamemodeEnvironmentData.Hotzone.HotzonePositions.push([0, 0, 0]);
        }

        this.Resolution = Resolution;
        this.Framerate = Framerate;
        this.screenUsed = screenUsed;

        this.ActorModel = new actorModel(Resolution, Framerate)
    }

    async init(){
        for(let i = 0; i < os.cpus().length; i++){
            const worker = await Tesseract.createWorker('eng');
            this.ocrSheduler.addWorker(worker);
        }

        await Promise.all([
            this.ActorModel.launchModel(),
            this.Actor.init(this.screenUsed)
        ])

        if(!fs.existsSync(path.join(__dirname, "/actor/model/"))){
            fs.mkdirSync(path.join(__dirname, "/actor/model/"))
            await this.ActorModel.saveModel();
        }

        this.Started = true;
    }

    quit(){
        try { this.ActorModel.quit(); } catch(err){};
    }

    async CreateWorld(Image){
        let environmentStart = Date.now();
        let visualEnvironmentResult = await EnvironmentModel.predict(Image);
        let environmentEnd = Date.now();

        this.SetModelDetections(visualEnvironmentResult)
        await this.SetScreenDetections(Image);

        return { 
            visualEnvironmentResult, 
            visualEnvironmentTime: environmentEnd - environmentStart
        }
    }

    async SetScreenDetections(Image){
        this.Actor.HasGadget = getGadget(Image, this.Resolution);
        this.Actor.SuperCharge = getSuperPercent(Image, this.Resolution);

        console.log(this.Actor.HasGadget, this.Actor.SuperCharge)

        switch(this.CurrentMatchType){
            case "BrawlBall":
                const bbImageData = getBBScores(Image, this.Resolution);
                this.GamemodeEnvironmentData.BrawlBall.ScoresEnemy = bbImageData.enemy;
                this.GamemodeEnvironmentData.BrawlBall.ScoresFriendly = bbImageData.friendly;
                break;
            case "GemGrab":
                const gbImageData = await getGBGems(Image, this.Resolution, this.ocrSheduler);
                //console.log(gbImageData)
                this.GamemodeEnvironmentData.GemGrab.ScoresEnemy = gbImageData.enemy;
                this.GamemodeEnvironmentData.GemGrab.ScoresFriendly = gbImageData.friendly;
                break;
            case "Heist":
                const heistImageData = getHeistHealth(Image, this.Resolution);
                this.GamemodeEnvironmentData.Heist.HealthEnemy = heistImageData.enemy;
                this.GamemodeEnvironmentData.Heist.HealthFriendly = heistImageData.friendly;
                break;
            case "Hotzone":
                const hotzoneImageData = getHotzonePercent(Image, this.Resolution);
                //console.log(hotzoneImageData);
                this.GamemodeEnvironmentData.Hotzone.PercentEnemy = hotzoneImageData.enemy;
                this.GamemodeEnvironmentData.Hotzone.PercentFriendly = hotzoneImageData.friendly;
                break;
            case "Showdown":
                break;
        }
    }

    SetModelDetections(prediction){
        let me = prediction.filter((v) => v.class == "Me")[0];
        let friendly = prediction.filter((v) => v.class == "Friendly");
        let enemy = prediction.filter((v) => v.class == "Enemy");

        let ball = prediction.filter((v) => v.class == "Ball")[0];
        let safe_friendly = prediction.filter((v) => v.class == "Safe_Friendly")[0];
        let safe_enemy = prediction.filter((v) => v.class == "Safe_Enemy")[0];

        let hot_zones = prediction.filter((v) => v.class == "Hot_Zone");
        let pps = prediction.filter((v) => v.class == "PP");
        let pp_boxes = prediction.filter((v) => v.class == "PP_Box");
        let gems = prediction.filter((v) => v.class == "Gem");

        if(ball){
            this.GamemodeEnvironmentData.BrawlBall.BallPosition = [(ball.x1 + ball.x2) / 2, (ball.y1 + ball.y2) / 2]
        } else {
            this.GamemodeEnvironmentData.BrawlBall.BallPosition = [-1, -1]
        }

        if(safe_friendly){
            this.GamemodeEnvironmentData.Heist.FriendlyPosition = [(safe_friendly.x1 + safe_friendly.x2) / 2, (safe_friendly.y1 + safe_friendly.y2) / 2]
        } else {
            this.GamemodeEnvironmentData.Heist.FriendlyPosition = [-1, -1]
        }

        if(safe_enemy){
            this.GamemodeEnvironmentData.Heist.EnemyPosition = [(safe_enemy.x1 + safe_enemy.x2) / 2, (safe_enemy.y1 + safe_enemy.y2) / 2]
        } else {
            this.GamemodeEnvironmentData.Heist.EnemyPosition = [-1, -1]
        }

        for(let i = 0; i < 15; i++){
            let gem = gems[i];
            if(gem){
                this.GamemodeEnvironmentData.GemGrab.GemPositions[i] = [(gem.x1 + gem.x2) / 2, (gem.y1 + gem.y2) / 2]
            } else {
                this.GamemodeEnvironmentData.GemGrab.GemPositions[i] = [-1, -1]
            }
        }

        for(let i = 0; i < 3; i++){
            let hot_zone = hot_zones[i];
            if(hot_zone){
                this.GamemodeEnvironmentData.Hotzone.HotzonePositions[i] = [(hot_zone.x1 + hot_zone.x2) / 2, (hot_zone.y1 + hot_zone.y2) / 2]
            } else {
                this.GamemodeEnvironmentData.Hotzone.HotzonePositions[i] = [-1, -1]
            }
        }

        for(let i = 0; i < 15; i++){
            let pp = pps[i];
            if(pp){
                this.GamemodeEnvironmentData.Showdown.PPs[i] = [(pp.x1 + pp.x2) / 2, (pp.y1 + pp.y2) / 2]
            } else {
                this.GamemodeEnvironmentData.Showdown.PPs[i] = [-1, -1]
            }
        }

        for(let i = 0; i < 15; i++){
            let pp = pps[i];
            if(pp){
                this.GamemodeEnvironmentData.Showdown.PPs[i] = [(pp.x1 + pp.x2) / 2, (pp.y1 + pp.y2) / 2]
            } else {
                this.GamemodeEnvironmentData.Showdown.PPs[i] = [-1, -1]
            }
        }

        for(let i = 0; i < 15; i++){
            let pp_box = pp_boxes[i];
            if(pp_box){
                this.GamemodeEnvironmentData.Showdown.PP_Boxes[i] = [(pp_box.x1 + pp_box.x2) / 2, (pp_box.y1 + pp_box.y2) / 2]
            } else {
                this.GamemodeEnvironmentData.Showdown.PP_Boxes[i] = [-1, -1]
            }
        }

        function setPlayer(player, playerData){
            if(playerData){
                //player.Position = [(playerData.x1 + playerData.x2) / 2, (playerData.x1 + playerData.y2) / 2];
                const biggestY = playerData.y1 > playerData.y2 ? playerData.y1 : playerData.y2;
                player.Position = [(playerData.x1 + playerData.x2) / 2, biggestY - 0.07];
            } else {
                player.Position = [-1, -1];
                player.Health = 0;
            }
        }

        setPlayer(this.Actor, me);

        for(let i = 0; i < 15; i++){
            setPlayer(this.Friendly[i], friendly[i]);
        }

        for(let i = 0; i < 15; i++){
            setPlayer(this.Enemy[i], enemy[i]);
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
        let pipe = [
            gamemodesIndices.indexOf(this.CurrentMatchType),
            this.TimeLeft / maxMatchLength,

            this.GamemodeEnvironmentData.BrawlBall.ScoresEnemy / 2,
            this.GamemodeEnvironmentData.BrawlBall.ScoresFriendly / 2,
            ...this.GamemodeEnvironmentData.BrawlBall.BallPosition,

            this.GamemodeEnvironmentData.GemGrab.GemsEnemy / 29,
            this.GamemodeEnvironmentData.GemGrab.GemsFriendly / 29,
            ...this.GamemodeEnvironmentData.GemGrab.GemPositions.flat(),

            this.GamemodeEnvironmentData.Heist.HealthEnemy / 100,
            this.GamemodeEnvironmentData.Heist.HealthFriendly / 100,
            ...this.GamemodeEnvironmentData.Heist.EnemyPosition.flat(),
            ...this.GamemodeEnvironmentData.Heist.FriendlyPosition.flat(),

            this.GamemodeEnvironmentData.Hotzone.PercentEnemy / 100,
            this.GamemodeEnvironmentData.Hotzone.PercentFriendly / 100,
            ...this.GamemodeEnvironmentData.Hotzone.HotzonePositions.flat(),

            this.GamemodeEnvironmentData.Showdown.PlayersAlive / 10,
            ...this.GamemodeEnvironmentData.Showdown.PPs.flat(),
            ...this.GamemodeEnvironmentData.Showdown.PP_Boxes.flat(),

            ...this.PipeActor(),
            ...this.PipeEnemy(),
            ...this.PipeFriendly(),
        ]


        return pipe
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

    CalculateRewards(LastEnvironmentData){
        let reward = 0;



        return reward;
    }

    async ProcessStep(Image){
        const environment = await this.CreateWorld(Image);

        let actorActionsStart = Date.now()
        let actorActions = await this.ActorModel.act(Image, this.PipeEnvironment());
        let actorActionsEnd = Date.now()
        /*let actorActions = await Brain(this, Image, this);
        actorTime = Date.now() - actorTime;

        const reward = this.CalculateRewards();
        if(this.lastActorState){
            this.ActorModel.remember(this.lastActorState, actorActions, reward, [Image, this.PipeEnvironment()], false);
        }
        
        this.lastActorState = [Image, this.PipeEnvironment()];*/

        //console.log(actorActions)


        //let actorActions = await this.fakeActorActions(Image);
        //this.SetActor(actorActions)
        //console.log(actorActions, actorTime);

        return { 
            environment, 
            //actorActions,
            actorTime: actorActionsEnd - actorActionsStart
        };
    }
}

module.exports = { Environment }