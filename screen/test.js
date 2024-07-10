const { createWorker } = require('tesseract.js');
const fs = require("fs/promises")

async function e() {
  const img = await fs.readFile("image.bmp")
  const worker = await createWorker('eng', 4);

  console.time("start")
  const prediction = await worker.recognize(img, {
    rectangle: { top: 0, left: 0, width: 50, height: 100 },
  })
  const text = prediction.data.text
  console.timeEnd("start")

  console.log("Result:", text)
}

e();