<script lang="ts">
	import { getContext } from "svelte";
	import type { Piece } from "../types/Types";

	export let pieces: Piece[];
	export let time: number;

	function generateBoard(size: number): string[][] {
		return [
			["▒", " ", "▒", " ", "▒", " ", "▒", " "],
			[" ", "▒", " ", "▒", " ", "▒", " ", "▒"],
			["▒", " ", "▒", " ", "▒", " ", "▒", " "],
			[" ", "▒", " ", "▒", " ", "▒", " ", "▒"],
			["▒", " ", "▒", " ", "▒", " ", "▒", " "],
			[" ", "▒", " ", "▒", " ", "▒", " ", "▒"],
			["▒", " ", "▒", " ", "▒", " ", "▒", " "],
			[" ", "▒", " ", "▒", " ", "▒", " ", "▒"],
		];
	}

	let rows = [[]];
	$: {
		let newRows = generateBoard();
		pieces.forEach((piece, index) => {
			if (piece[time]) {
				const [x, y] = piece[time];
				newRows[y][x] = `${pieces.length - index}`;
			}
		});
		rows = newRows;
	}
</script>

<main>
	<code>
		<table>
			{#each rows as row}
				<tr>
					{#each row as cell}
						<td>{cell}</td>
					{/each}
				</tr>
			{/each}
		</table>
	</code>
</main>
