<svelte:head>
	<link rel="stylesheet" href="/styles/menu.css">
</svelte:head>

<script>
	import { estado } from './Estado.js'
	import { trocarEstadoDoJogo } from './Estado.js'
</script>

<h1>
	JOGO DA VELHA (4x4)
</h1>

<div class='menu' on:click={() => trocarEstadoDoJogo('jogar')}>
	Jogo 
</div>
<div class='menu' on:click={() => trocarEstadoDoJogo('sobre')}>
	Sobre
</div>
<div class='menu' on:click={() => trocarEstadoDoJogo('comojogar')}>
	Como Jogar
</div>