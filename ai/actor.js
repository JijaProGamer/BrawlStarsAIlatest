class Actor {
    MoveDirection = [0, 0]
    ShootDirection = [0, 0]
    UltraDirection = [0, 0, false]
    UseGadget = false

    HasUltra = false
    HasGadget = false
    HasHypercharge = false

    Health = 0
    Gadgets = 0
    Shoots = 0
}

module.exports = { Actor }