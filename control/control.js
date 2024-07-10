const { KeyTap, KeyToggle, mouseMove, mouseToggle, mouseDrag } = require("./press.js")

const keyboardPositions = [
    [0, 1], // up
    [0, -1], // down
    [-1, 0], // left
    [1, 0], // right
    [-1, 1], // up left
    [1, 1], // up right
    [-1, -1], // down left
    [1, -1], // down right
]; 

class MouseControlType {
    #point = [0, 0];
    #radius = 10;
    wasMoving = false;

    screenSize;
    screenPosition;

    constructor(radius, point){
        this.#radius = radius;
        this.#point = point;
    }

    begin(){
        mouseMove(
            this.screenPosition[0] + this.#point[0] * this.screenSize[0], 
            this.screenPosition[1] + this.#point[1] * this.screenSize[1]
        )
        mouseToggle("down")
    }

    stop(){
        mouseToggle("up")
    }

    move(position){
        let positionDistance = Math.sqrt(position[0] * position[0] + position[1] * position[1]);

        if(positionDistance < 0.1){
            if(this.wasMoving){
                this.stop()  
            }
            this.wasMoving = false;
            return;
        }

        if(!this.wasMoving){
            this.begin();
            this.wasMoving = true;
        }

        mouseDrag(
            this.screenPosition[0] + (this.#point[0] + position[0] * this.#radius) * this.screenSize[0], 
            this.screenPosition[1] + (this.#point[1] + position[1] * this.#radius) * this.screenSize[1]
        )
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

    begin(keys){ // tommorrow: fix bug with 2 letter movements stopping
        this.#order.forEach((key) => {
            if(this.#active[key] && !keys.includes(key)){
                this.stop(key)
            }
        });

        for(let key of keys){
            if(this.#active[key]) continue;
            
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
        let positionDistance = Math.sqrt(position[0] * position[0] + position[1] * position[1]);

        if(positionDistance < 0.25){
            this.stopAll();
            return;
        }

        let closest = -1
        let closestDistance = 99999

        for(let [index, keyboardPosition] of keyboardPositions.entries()){
            let distance = [keyboardPosition[0] - position[0], keyboardPosition[1] - position[1]]
            let magnitude = distance[0]*distance[0] + distance[1]*distance[1]
            
            if(magnitude < closestDistance){
                closest = index;
                closestDistance = magnitude;
            }
        }

        this.begin(this.#order[closest])
    }
}

class ButtonColtrolType {
    #button;

    constructor(button){
        this.#button = button;
    }

    tap(time=0){
        if(time > 0){
            KeyToggle(this.#button, "down");
            setTimeout(() => {
                KeyToggle(this.#button, "up");
            }, time)
        } else {
            KeyToggle(this.#button, "down");
            KeyToggle(this.#button, "up");
        }
    }
}

module.exports = { MouseControlType, KeyboardControlType, ButtonColtrolType };