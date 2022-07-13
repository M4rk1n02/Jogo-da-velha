import { writable } from 'svelte/store';


//cria a tabela
const defaultTabela = {
	history: [{
		tabela: Array(16).fill('')
	}],
	xIsNext: true,
	stepNumber: 0
}


//------------------------------------------verifica o vencedor tabela 4x4------------------------------------------------//
export function calcularVencedor(quadrados) {
	const lines = [
//horizontal
		[0, 1, 2, 3],
		[4, 5, 6, 7],
		[8, 9, 10, 11],
		[12, 13, 14, 15],
//vertical
		[0, 4, 8, 12],
		[1, 5, 9, 13],
		[2, 6, 10, 14],
		[3, 7, 11, 15],
//diagonal
		[0, 5, 10, 15],
		[3, 6, 9, 12]
	];
	
	for (let i = 0; i < lines.length; i++) {
		const [a, b, c, d] = lines[i];
		if (quadrados[a] && quadrados[a] === quadrados[b] && quadrados[a] === quadrados[c] &&
			 quadrados[a] === quadrados[d]) {
			return quadrados[a];
		}
	}
	return null;
}

//-----------------------------------------------------------------------------------------------------------//

//-------------------------------------------verifica o vencedor tabela(3x3)----------------------------------------------//
export function calcularVencedor9(quadrados) {
	const lines = [
//horizontal
		[0, 1, 2],
		[3, 4, 5],
		[6, 7, 8],
//vertical
		[0, 3, 6],
		[1, 4, 7],
		[2, 5, 8],
//diagonal
		[0, 4, 8],
		[2, 4, 6],
	];
	for (let i = 0; i < lines.length; i++) {
		const [a, b, c] = lines[i];
		if (quadrados[a] && quadrados[a] === quadrados[b] && quadrados[a] === quadrados[c]) {
			return quadrados[a];
		}
	}
	return null;
}
//-----------------------------------------------------------------------------------------------------------//

function createStore() {
	const { subscribe, set, update } = writable(defaultTabela);

	return {
		subscribe,

		//codico da movimentação tabela 4x4//
		move: index => update(store => {
			const history = store.history.slice(0, store.stepNumber + 1);
			const current = history[store.stepNumber];

			if (calcularVencedor(current.tabela) || current.tabela[index]) {
				return store;
			}

			let newTabela = current.tabela.slice();
			newTabela[index] = store.xIsNext ? 'X' : 'O';

			return Object.assign({}, store, {
				history: history.concat([{
					tabela: newTabela
				}]),
				xIsNext: !store.xIsNext,
				stepNumber: history.length
			})
		}),
		//codico da movimentação tabela 3x3//
		move9: index => update(store => {
			const history = store.history.slice(0, store.stepNumber + 1);
			const current = history[store.stepNumber];

			if (calcularVencedor9(current.tabela) || current.tabela[index]) {
				return store;
			}

			let newTabela = current.tabela.slice();
			newTabela[index] = store.xIsNext ? 'X' : 'O';

			return Object.assign({}, store, {
				history: history.concat([{
					tabela: newTabela
				}]),
				xIsNext: !store.xIsNext,
				stepNumber: history.length
			})
		}),

		//recomeça o jogo//
		reset: () => set(defaultTabela)
	};
}

export const store = createStore();