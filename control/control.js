const { KeyTap, KeyToggle, mouseMove, mouseToggle, mouseDrag } = require("./press.js")

const keyboardPositions = [
    [0, 1], // up
    [0, -1], // down
    [-1, 0], // left
    [1, 0], // right
    [0.707, -0.707], // up left
    [0.707, 0.707], // up right
    [-0.707, -0.707], // down left
    [-0.707, 0.707], // down right
]; 

class MouseControlType {
    #point = [0, 0];
    #radius = 10;

    constructor(radius, point){
        this.#radius = radius;
        this.#point = point;
    }

    begin(){
        mouseMove(this.#point[0], this.#point[1])
        mouseToggle("down")
    }

    stop(){
        mouseToggle("up")
    }

    move(position){
        mouseDrag(this.#point[0] + position[0] * this.#radius, this.#point[1] + position[1] * this.#radius)
    }
}

class KeyboardControlType {
    #active = {}
    #order = []

    constructor(order){
        this.#order = order;

        order.forEach((key) => {
            this.#active[key] = false;
        });
    }

    begin(keys){
        this.#order.forEach((key) => {
            if(this.#active[key] && !key.includes(keys)){
                this.stop(key)
            }
        });

        for(let key of keys){
            KeyToggle(key, "down");
            this.#active[key] = true;
        }
    }

    stopAll(){
        this.#order.forEach((key) => {
            if(this.#active[key]){
                this.stop(key)
            }
        });
    }

    stop(keys){
        for(let key of keys){
            KeyToggle(key, "up");
            this.#active[key] = false;
        }
    }

    move(position){
        let positionDistance = position.x * position.x + position.y * position.y;

        if(positionDistance < 0.15){
            this.stopAll();
            return;
        }

        let closest = -1
        let closestDistance = 99999

        for(let [index, keyboardPosition] of keyboardPositions.entries()){
            let distance = Math.pow(keyboardPosition[0] - position[0], 2) + Math.pow(keyboardPosition[1] - position[1], 2)
            
            if(distance < closestDistance){
                closest = index;
                closestDistance = distance;
            }
        }

        this.begin(this.#order[closest])
    }
}

module.exports = { MouseControlType, KeyboardControlType };