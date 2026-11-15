<script lang="ts">
	import type { Piece } from "./types/Types";
	import Board from "./components/Board.svelte";
	import Move from "./components/Move.svelte";

	let direction = true;
	let flipped = false;
	let time = 0;
	let pieces: Piece[];
	pieces = [{ [time]: [3, 7] }];

	function updateCoordinates({ detail }) {
		if (direction) {
			++time;
		} else {
			--time;
		}

		if (flipped) {
			pieces.unshift({ ...pieces[0] });
			flipped = false;
		}

		const piece = pieces[0];
		piece[time] = detail.split(",").map(coordinate => parseInt(coordinate) - 1) as [number, number];
		console.log(pieces);
	}

	function reverseTime({ detail }) {
		flipped = direction != detail;
		direction = detail;
	}
</script>

<main>
	<Board {pieces} {time} />
	<Move on:coordinates={updateCoordinates} on:time={reverseTime} />
</main>
