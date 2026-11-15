<script lang="ts">
	import { createEventDispatcher } from "svelte";
	const dispatch = createEventDispatcher();

	function updateCoordinates(event) {
		if (event.key == "Enter") {
			dispatch("coordinates", event.target.value);
		}
	}

	let time = true;

	$: {
		dispatch("time", time);
	}
</script>

<main>
	<input type="text" placeholder="X,Y" on:keydown={updateCoordinates} />
	<input type="checkbox" bind:checked={time} />
</main>
