<script>
	import { onMount } from "svelte";

	export let lastInferencetime = 0;
	export let lastFrametime = 0;

	onMount(() => {
		const canvas = document.querySelector("canvas.fake");
		const canvasMain = document.querySelector("canvas.main");
		const context = canvas.getContext("2d");
		const contextMain = canvasMain.getContext("2d");

		let options = { resolution: [448, 320] };

		const labelColors = {
			"Ball": "#e39309",
            "Enemy": "#ed310c",
            "Friendly": "#0cb5ed",
            "Gem": "#d606c8",
            "Hot_Zone": "#fce300",
            "Me": "#59ed09",
            "PP": "#155419",
            "PP_Box": "#5c3d1a",
            "Safe_Enemy": "#0004ff",
            "Safe_Friendly": "#0fa6d4",
		}

		window.electron.on_settings(
			([ Resolution ]) => {
				options.resolution = Resolution;

				canvas.width = options.resolution[0];
				canvas.height = options.resolution[1];
				canvasMain.width = options.resolution[0] * 5;
				canvasMain.height = options.resolution[1] * 5;
			}
		)

		window.electron.on_environment_detections(
			([ step, Image ]) => {
				lastInferencetime = step.environment.visualEnvironmentTime;
				lastFrametime = lastInferencetime + step.actorTime;

				const imageData = createImageDataFromRGBArray(Image, options.resolution);

				context.putImageData(imageData, 0, 0, 0, 0, canvas.width, canvas.height);
				contextMain.drawImage(canvas, 0, 0, options.resolution[0], options.resolution[1], 0, 0, canvasMain.width, canvasMain.height);

				const currentPlayer = step.environment.visualEnvironmentResult.find((prediction) => prediction.class = "Me");

				for(let environmentData of step.environment.visualEnvironmentResult){
					renderEnvironmentData(environmentData, currentPlayer)
				}
			},
		);

		function renderEnvironmentData(data, currentPlayer){
			const x1 = data.x1 * canvasMain.width;
			const x2 = data.x2 * canvasMain.width;
			const y1 = data.y1 * canvasMain.height;
			const y2 = data.y2 * canvasMain.height;

			// draw bounding box
			contextMain.lineWidth = 4
			contextMain.strokeStyle = labelColors[data.class];
			contextMain.strokeRect(x1, y1, x2 - x1, y2 - y1);

			// draw class
			contextMain.font = `32px bold Arial`
			contextMain.fillStyle = labelColors[data.class];
			contextMain.fillText(`${data.class} - ${data.score}`, x2 + 10, y1 - 20);

			// make line to current player
			//if(!(data.class == "Friendly" || data.class == "Enemy") || !currentPlayer) return;
			if(!currentPlayer) return;
			contextMain.beginPath();
			contextMain.moveTo((currentPlayer.x1 + currentPlayer.x2) / 2 * canvasMain.width, (currentPlayer.y1 + currentPlayer.y2) / 2 * canvasMain.height);
			contextMain.lineTo((x1 + x2) / 2, (y1 + y2) / 2);
			contextMain.stroke();
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
	<!--<canvas width="384px" height="172px"
		>Your OS doesn't support canvases, how do you even run this app?</canvas
	>-->

	<canvas class="fake">Your OS doesn't support canvases, how do you even run this app?</canvas>
	<canvas class="main">Your OS doesn't support canvases, how do you even run this app?</canvas>

	<p class="frameTime">Last inference time: {lastInferencetime}ms</p>
	<p class="frameTime">Last frame time: {lastFrametime}ms</p>
</main>

<style>
	:global(body) {
		background-color: #121212;
	}

	canvas {
		width: 80%;
		aspect-ratio: 16/7.75;
	}

	.fake {
		display: none;
	}

	.frameTime {
		color: white;
		text-size-adjust:  1.5rem;
	}
</style>
