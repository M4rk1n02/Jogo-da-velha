<svelte:head>
	<link rel="stylesheet" href="/styles/tabela.css">
</svelte:head>

<script>
	import Quadrados from './Quadrados.svelte';
</script>

<div>
	<div class="linha-tabela">
		<Quadrados index=0/>
		<Quadrados index=1/>
		<Quadrados index=2/>
		<Quadrados index=3/> 
	</div>
	<div class="linha-tabela">
		<Quadrados index=4/>
		<Quadrados index=5/>
		<Quadrados index=6/>
		<Quadrados index=7/>
	</div>
	<div class="linha-tabela">
		<Quadrados index=8/>
		<Quadrados index=9/>
		<Quadrados index=10/>
		<Quadrados index=11/>
	</div>
	<div class="linha-tabela">
		<Quadrados index=12/>
		<Quadrados index=13/>
		<Quadrados index=14/>
		<Quadrados index=15/>
	</div>
</div>