<script lang="ts">
	import { onMount } from 'svelte';

	let canvas: HTMLCanvasElement;

	let canvasDimensions = $state({
		width: 1200,
		height: 600
	});

	let frameRate = $state(144);
	let rocks: {
		x: number;
		y: number;
	}[] = $state([]);
	const playerWidth = 35;
	const playerHeight = 15;
	const initialOffset = 40;

	let playerSpeed = $state(200);
	let heartDeducted = $state(false);
	let playerColor = $state('white');
	let keyMap: {
		[key: string]: boolean;
	} = $state({
		ArrowRight: false,
		ArrowUp: false,
		ArrowDown: false,
		ArrowLeft: false,
		' ': false
	});
	let playerHearts = $state(4);
	let canvasCenter = $derived.by(() => {
		return {
			x: canvasDimensions.width / 2,
			y: canvasDimensions.height / 2
		};
	});

	let playerPosition = $state({
		x: canvasCenter.x,
		y: canvasDimensions.height - initialOffset
	});

	let lasers: {
		x: number;
		y: number;
	}[] = $state([]);

	function drawPlayer() {
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		ctx.clearRect(0, 0, canvasDimensions.width, canvasDimensions.height);

		// Draw player

		ctx.fillStyle = playerColor;
		ctx.save();
		ctx.beginPath();
		ctx.moveTo(playerPosition.x - playerWidth / 2, playerPosition.y);
		ctx.lineTo(playerPosition.x, playerPosition.y - playerHeight);
		ctx.lineTo(playerPosition.x + playerWidth / 2, playerPosition.y);
		ctx.fill();
		ctx.closePath();
		drawRocks();
		drawLasers();
	}

	function drawLasers() {
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		ctx.fillStyle = 'white';

		for (const laser of lasers) {
			ctx.fillRect(laser.x - 1.5, laser.y, 3, 20);
		}
	}
	function isOverlapping(
		p1: { x: number; y: number; width: number; height: number },
		p2: { x: number; y: number; width: number; height: number }
	): boolean {
		const isOverlappingX = p1.x < p2.x + p2.width && p1.x + p1.width > p2.x;

		const isOverlappingY = p1.y < p2.y + p2.height && p1.y + p1.height > p2.y;

		return isOverlappingX && isOverlappingY;
	}

	function checkCollisions() {
		const overlappingRocks = [];
		for (const rock of rocks) {
			if (
				isOverlapping(
					{
						...rock,
						width: 50,
						height: 50
					},
					{ ...playerPosition, width: playerWidth - 20, height: playerHeight - 10 }
				)
			) {
				overlappingRocks.push(rock);
			}
		}
		if (overlappingRocks.length) {
			playerColor = 'red';
			if (!heartDeducted) playerHearts -= 1;
			heartDeducted = true;
		} else {
			playerColor = 'white';
			heartDeducted = false;
		}
	}

	function movePlayer(deltaTime: number) {
		const distance = (playerSpeed * deltaTime) / 1000;
		if (keyMap.ArrowLeft) {
			playerPosition.x -= distance;
		}
		if (keyMap.ArrowRight) {
			playerPosition.x += distance;
		}
		if (keyMap.ArrowUp) {
			playerPosition.y -= distance;
		}
		if (keyMap.ArrowDown) {
			playerPosition.y += distance;
		}
	}

	function moveLasers(deltaTime: number) {
		const laserSpeed = 300;
		const distance = (laserSpeed * deltaTime) / 1000;

		lasers = lasers.filter((laser) => laser.y + distance > 0);
		for (const laser of lasers) {
			laser.y -= distance;
		}
	}

	function moveRocks(deltaTime: number) {
		const rockSpeed = 50;
		const distance = (rockSpeed * deltaTime) / 1000;
		for (const rock of rocks) {
			rock.y += distance;
		}
	}

	function generateRocks() {
		const length = Math.floor(Math.random() * (10 - 5 + 1)) + 5;
		rocks = [
			...rocks,
			...Array.from({ length }, () => ({
				x: Math.floor(Math.random() * canvasDimensions.width),
				y: -50
			}))
		];
	}

	function resetGame() {
    // Reset player position
    playerPosition = {
        x: canvasCenter.x,
        y: canvasDimensions.height - initialOffset
    };

    // Reset player properties
    playerHearts = 4;
    playerColor = 'white';
    heartDeducted = false;

    // Clear rocks and lasers
    rocks = [];
    lasers = [];

    // Generate new rocks
    generateRocks();

    // Restart the game loop
    lastTimestamp = performance.now();
    requestAnimationFrame(gameLoop);
}


	function drawRocks() {
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		ctx.fillStyle = 'gray';

		for (const rock of rocks) {
			ctx.fillRect(rock.x, rock.y, 50, 50);
		}
	}

	function shootLaser() {
		lasers.push({
			x: playerPosition.x,
			y: playerPosition.y - playerHeight - 20
		});
	}

	let lastTimestamp = 0;
	let accumulator = 0;

	function gameLoop(timestamp: number) {
		const deltaTime = timestamp - lastTimestamp;
		lastTimestamp = timestamp;

		accumulator += deltaTime;

		const frameInterval = 1000 / frameRate;

		while (accumulator >= frameInterval) {
			movePlayer(frameInterval);
			moveLasers(frameInterval);
			moveRocks(frameInterval);
			accumulator -= frameInterval;
		}

		drawPlayer();
		checkCollisions();
		requestAnimationFrame(gameLoop);
	}

	function handleKeyDown(e: KeyboardEvent) {
		keyMap[e.key] = true;

		if (e.key === ' ') {
			shootLaser();
		}
	}

	function handleKeyUp(e: KeyboardEvent) {
		keyMap[e.key] = false;
	}

	onMount(() => {
		generateRocks();
		setInterval(() => {
			generateRocks();
		}, 6000);

		lastTimestamp = performance.now();
		requestAnimationFrame(gameLoop);
	});
</script>

<svelte:window on:keydown={handleKeyDown} on:keyup={handleKeyUp} />

<div class="flex h-screen w-screen flex-col items-center justify-center bg-black">
	{#if playerHearts === 0}
		<div class="flex flex-col items-center justify-center gap-2">
			<div class="font-mono text-[5rem] text-white">Game Over!</div>
			<button
				onclick={() => {
					resetGame()
				}}
				class="border-2 border-transparent px-10 py-4 text-3xl text-white hover:border-white"
			>
				Play Again
			</button>
		</div>
	{:else}
		<canvas
			bind:this={canvas}
			width={canvasDimensions.width}
			height={canvasDimensions.height}
			class="border-[5px] border-accent bg-black"
		></canvas>
		<div class="mt-4 font-mono text-4xl text-white">
			Hearts: {playerHearts}
		</div>
	{/if}
</div>
