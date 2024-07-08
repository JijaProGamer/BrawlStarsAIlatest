const systeminformation = require('systeminformation'); 

const { MouseControlType, KeyboardControlType, ButtonColtrolType } = require("../control/control.js")

class Player {
    Position = [0, 0]

    HasUltra = false
    HasHypercharge = false

    Health = 0
}

let MoveController = new KeyboardControlType(["w", "s", "a", "d", "wa", "wd", "sa", "sd"])
let ShootController = new MouseControlType(0.039, [0.898, 0.736]);
let UltraController = new MouseControlType(0.0375, [0.785, 0.819]);
let GadgetController = new ButtonColtrolType("f");
let HyperchargeController = new ButtonColtrolType("q");

class Actor extends Player {
    MoveDirection = [0, 0]
    ShootDirection = [0, 0]
    UltraDirection = [0, 0]

    ReleaseShoot = false
    ReleaseUltra = false
    UseGadget = false
    UseHypercharge = false

    HasGadget = false
    Gadgets = 0
    Shoots = 0

    async init(screenUsed){
        const graphicsInfo = await systeminformation.graphics();
        const screenInfo = graphicsInfo.displays[screenUsed];

        ShootController.screenSize = UltraController.screenSize = [screenInfo.currentResX, screenInfo.currentResY];
        ShootController.screenPosition = UltraController.screenPosition  = [screenInfo.positionX, screenInfo.positionY];
    }

    ApplyInputs(){
        MoveController.move(this.MoveDirection);

        ShootController.move(this.ShootDirection);
        if(this.ReleaseShoot){
            ShootController.stop();
        }

        UltraController.move(this.UltraDirection);
        if(this.ReleaseUltra){
            UltraController.stop();
        }

        if(this.UseGadget){
            GadgetController.tap();
        }

        if(this.UseHypercharge){
            HyperchargeController.tap();
        }
    }
}

module.exports = { Player, Actor }