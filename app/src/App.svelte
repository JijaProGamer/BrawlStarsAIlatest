<script>
	import { onMount } from "svelte";

	onMount(() => {
		const canvas = document.querySelector("canvas");
		const context = canvas.getContext("2d");

		const options = { resolution: [384, 172] };

		window.electron.on_environment_detections(
			([environmentResult, Image]) => {
				const imageData = createImageDataFromRGBArray(Image, options.resolution);

				canvas.width = options.resolution[0];
				canvas.height = options.resolution[1];
				context.putImageData(imageData, 0, 0);

				for(let environmentData of environmentResult.predictions){
					renderEnvironmentData(environmentData)
				}
			},
		);

		function renderEnvironmentData(data){
			const x1 = data.x1 * options.resolution[0];
			const x2 = data.x2 * options.resolution[0];
			const y1 = data.y1 * options.resolution[1];
			const y2 = data.y2 * options.resolution[1];

			context.strokeStyle = "green";
			context.strokeRect(x1, x2 - x1, y1, y2 - y1);
		}

		function createImageDataFromRGBArray(rgbArray, resolution) {
			const [width, height] = resolution;
			const rgbaArray = new Uint8ClampedArray(width * height * 4);

			for (let i = 0, j = 0; i < rgbArray.length; i += 3, j += 4) {
				rgbaArray[j] = rgbArray[i];
				rgbaArray[j + 1] = rgbArray[i + 1];
				rgbaArray[j + 2] = rgbArray[i + 2];
				rgbaArray[j + 3] = 255;
			}

			return new ImageData(rgbaArray, width, height);
		}

		//window.electron.send("request-data", "banana")
	});
</script>

<main>
	<canvas width="384px" height="172px"
		>Your OS doesn't support canvases, how do you even run this app?</canvas
	>
</main>

<style>
	:global(body) {
		background-color: #121212;
	}

	canvas {
		width: 80%;
		aspect-ratio: 16/7.75;
	}
</style>
