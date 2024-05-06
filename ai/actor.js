const { MouseControlType, KeyboardControlType, ButtonColtrolType } = require("../control/control.js")

class Player {
    Position = [0, 0]

    HasUltra = false
    HasHypercharge = false

    Health = 0
}

let MoveController = new KeyboardControlType(["w", "s", "a", "d", "wa", "wd", "sa", "sd"])
let ShootController = new MouseControlType(15, [253, 90]);
let UltraController = new MouseControlType(10, [218, 102]);
let GadgetController = new ButtonColtrolType("z");
let HyperchargeController = new ButtonColtrolType("x");

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