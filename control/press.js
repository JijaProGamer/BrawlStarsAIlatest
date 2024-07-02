const robot = require("@hurdlegroup/robotjs");

robot.setKeyboardDelay(0)
robot.setMouseDelay(0)

function KeyToggle(keyCode = "a", type = "down") {
    robot.keyToggle(keyCode, type)
}

function KeyTap(keyCode, opt) {
    KeyToggle(keyCode, "down", opt);
    KeyToggle(keyCode, "up", opt);
}

function mouseMove(x, y){
    robot.moveMouseSmooth(x, y, 1)
}

function mouseToggle(type){
    robot.mouseToggle(type, "left")
}

function mouseDrag(x, y){
    robot.dragMouse(x, y)
}

module.exports = { KeyTap, KeyToggle, mouseMove, mouseToggle, mouseDrag };