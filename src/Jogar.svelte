<svelte:head>
	<link rel="stylesheet" href="/styles/jogar.css">
</svelte:head>

<script>
	import Tabela from './Tabela.svelte';
	import { store, calcularVencedor } from './stores.js';
	import VoltarMenu from './VoltarMenu.svelte'
	import { estado } from "./Estado.js"
	import { trocarEstadoDoJogo } from './Estado.js'
	
	
	let status;
	let vencedor;
	store.subscribe(store => {
		vencedor = calcularVencedor(store.history[store.history.length - 1].tabela);
		if (vencedor) {
			status = `O vencedor é: ${vencedor}`;
		} else {
			status = `Proximo jogador: ${store.xIsNext ? 'X' : 'O'}`;
		}
	});

</script>


<div class='jogo'>
	<div class='tabuleiro'>
		<Tabela/>
	</div>
	<div class='info-jogo'>
		<div>{status}</div>
	</div>
		<div on:click="{ () => store.reset() }">
			<button class = "botao" alt = botao>Recomeçar</button>
		</div>	
	
</div>
<VoltarMenu/>