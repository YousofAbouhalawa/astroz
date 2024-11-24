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
		hits: number;
		rotateDirection: boolean;
		speed: number;
		hitThrottled: boolean;
		flashing: boolean;
	}[] = $state([]);

	const playerWidth = 35;
	const playerHeight = 15;
	const initialOffset = 40;

	let playerSpeed = $state(200);
	let heartDeducted = $state(false);
	let playerColor = $state('white');
	let playerScore = $state(0);

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

	function drawRocks() {
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		for (const rock of rocks) {
			ctx.save();
			ctx.translate(rock.x + 25, rock.y + 25);
			const rotationAngle = (performance.now() / 1000) % (2 * Math.PI);
			ctx.rotate(rock.rotateDirection ? rotationAngle : -rotationAngle);
			ctx.fillStyle = rock.flashing ? 'red' : 'gray';
			ctx.fillRect(-25, -25, 50, 50);
			ctx.restore();
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
		const remainingRocks = [];
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		for (const rock of rocks) {
			for (const laser of lasers) {
				if (
					isOverlapping(
						{ ...rock, width: 50, height: 50 },
						{ x: laser.x, y: laser.y, width: 3, height: 20 }
					)
				) {
					ctx.clearRect(laser.x, laser.y, 3, 20);
					lasers = lasers.filter((l) => l.x !== laser.x);
					rock.flashing = true;
					if (!rock.hitThrottled) {
						rock.hits += 1;
					}
					rock.hitThrottled = true;
					setTimeout(() => (rock.flashing = false), 100);
					ctx;
					if (rock.hits > 2) {
						playerScore += 50;
					}
					break;
				}
			}
			rock.hitThrottled = false;
			if (rock.hits < 3) remainingRocks.push(rock);
		}
		rocks = remainingRocks;

		for (const rock of rocks) {
			if (
				isOverlapping(
					{ ...rock, width: 50, height: 50 },
					{
						...playerPosition,
						width: playerWidth - 20,
						height: playerHeight - 10
					}
				)
			) {
				playerColor = 'red';
				if (!heartDeducted) playerHearts -= 1;
				heartDeducted = true;
			}
		}

		if (
			!rocks.some((rock) =>
				isOverlapping(
					{ ...rock, width: 50, height: 50 },
					{ ...playerPosition, width: playerWidth - 20, height: playerHeight - 10 }
				)
			)
		) {
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
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		lasers = lasers.filter((laser) => laser.y + distance > 0);
		for (const laser of lasers) {
			laser.y -= distance;
			if (
				!isInView({
					x: laser.x,
					y: laser.y,
					height: 50,
					width: 50
				})
			) {
				ctx.clearRect(laser.x, laser.y, 3, 20);
				lasers.filter((l) => l.x !== laser.x);
			}
		}
	}

	function moveRocks(deltaTime: number) {
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		for (const rock of rocks) {
			const rockSpeed = rock.speed;
			const distance = (rockSpeed * deltaTime) / 1000;
			rock.y += distance;
			if (
				!isInView({
					x: rock.x,
					y: rock.y,
					height: 50,
					width: 50
				})
			) {
				ctx.clearRect(rock.x, rock.y, 50, 50);
				rocks.filter((r) => r.x !== rock.x);
			}
		}
	}

	function generateRocks() {
		rocks = [
			...rocks,
			...Array.from({ length: 1 }, () => {
				const position = Math.floor(Math.random() * canvasDimensions.width);
				return {
					x: position,
					y: -50,
					speed: Math.random() * 100 + 50,
					rotateDirection: Math.random() > 0.5 ? true : false,
					hits: 0,
					hitThrottled: false,
					flashing: false
				};
			})
		];
	}

	function isInView(object: { x: number; y: number; height: number; width: number }) {
		return (
			object.x + object.width > 0 &&
			object.x < canvasDimensions.width &&
			object.y + object.height > 0 &&
			object.y < canvasDimensions.height
		);
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

	function resetGame() {
		playerPosition = {
			x: canvasCenter.x,
			y: canvasDimensions.height - initialOffset
		};

		playerHearts = 4;
		playerColor = 'white';
		heartDeducted = false;

		rocks = [];
		lasers = [];

		generateRocks();

		lastTimestamp = performance.now();
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
		}, 2000);

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
					resetGame();
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

		<div class="mt-4 flex gap-8 font-mono text-4xl text-white">
			<div>Hearts: {playerHearts}</div>
			<div>Score: {playerScore}</div>
		</div>
	{/if}
</div>
