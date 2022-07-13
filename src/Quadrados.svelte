<svelte:head>
	<link rel="stylesheet" href="/styles/quadrados.css">
</svelte:head>

<script>
	import { store } from './stores.js';

	export let index;

	$: current = $store.history[$store.stepNumber]
	$: value = current.tabela[index];
</script>

<button on:click={ () => store.move(index) }>{ value }</button> 