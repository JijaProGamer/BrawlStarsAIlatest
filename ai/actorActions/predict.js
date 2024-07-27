const ort = require('onnxruntime-node');
const fs = require("fs");
const path = require("path");

const constants = JSON.parse(fs.readFileSync(path.join(__dirname, "constants.json")))
let model;

async function predict(image) {
    const input = modifyInput(Float32Array.from(image, value => value / 255.0))
    const output = await run_model(input);

    return process_output(output);
}

function modifyInput(image){
    const reshapedArray = new Float32Array(3 * constants.model_size[1] * constants.model_size[0]);
    for (let i = 0; i < constants.model_size[1]; i++) {
      for (let j = 0; j < constants.model_size[0]; j++) {
        reshapedArray[i * constants.model_size[0] + j] = image[(i * constants.model_size[0] + j) * 3];
        reshapedArray[(constants.model_size[1] * constants.model_size[0]) + i * constants.model_size[0] + j] = image[(i * constants.model_size[0] + j) * 3 + 1];
        reshapedArray[(2 * constants.model_size[1] * constants.model_size[0]) + i * constants.model_size[0] + j] = image[(i * constants.model_size[0] + j) * 3 + 2];
      }
    }

    return reshapedArray;
}

async function run_model(input) {
    if(!model){
        model = await ort.InferenceSession.create(path.join(__dirname, "model.onnx"), { executionProviders: ['dml'] });
    }
    
    input = new ort.Tensor(input, [1, 3, constants.model_size[1], constants.model_size[0]]);

    const outputs = await model.run({ images: input });
    return outputs["output0"].data;
}

function process_output(output) {
    let boxes = [];
    for (let index = 0; index < 1800; index += 6) {
        const x1 = output[index]/constants.model_size[0];
        const y1 = output[index + 1]/constants.model_size[1];
        const x2 = output[index + 2]/constants.model_size[0];
        const y2 = output[index + 3]/constants.model_size[1];
        const score = output[index + 4];
        const label = constants.labels[output[index + 5]];

        if (score < constants.probabilities[label]) {
            continue;
        }

        boxes.push({x1, y1, x2, y2, class: label, score});
    }

    return boxes;
}

module.exports = { predict };