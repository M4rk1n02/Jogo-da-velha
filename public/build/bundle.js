
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.49.0' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    //cria a tabela
    const defaultTabela = {
    	history: [{
    		tabela: Array(16).fill('')
    	}],
    	xIsNext: true,
    	stepNumber: 0
    };


    //------------------------------------------verifica o vencedor tabela 4x4------------------------------------------------//
    function calcularVencedor(quadrados) {
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
    function calcularVencedor9(quadrados) {
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

    const store = createStore();

    /* src\Quadrados.svelte generated by Svelte v3.49.0 */
    const file$6 = "src\\Quadrados.svelte";

    function create_fragment$7(ctx) {
    	let link;
    	let t0;
    	let button;
    	let t1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			link = element("link");
    			t0 = space();
    			button = element("button");
    			t1 = text(/*value*/ ctx[1]);
    			attr_dev(link, "rel", "stylesheet");
    			attr_dev(link, "href", "/styles/quadrados.css");
    			add_location(link, file$6, 1, 1, 16);
    			add_location(button, file$6, 13, 0, 259);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			append_dev(document.head, link);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, button, anchor);
    			append_dev(button, t1);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[4], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*value*/ 2) set_data_dev(t1, /*value*/ ctx[1]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			detach_dev(link);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let current;
    	let value;
    	let $store;
    	validate_store(store, 'store');
    	component_subscribe($$self, store, $$value => $$invalidate(3, $store = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Quadrados', slots, []);
    	let { index } = $$props;
    	const writable_props = ['index'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Quadrados> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => store.move(index);

    	$$self.$$set = $$props => {
    		if ('index' in $$props) $$invalidate(0, index = $$props.index);
    	};

    	$$self.$capture_state = () => ({ store, index, current, value, $store });

    	$$self.$inject_state = $$props => {
    		if ('index' in $$props) $$invalidate(0, index = $$props.index);
    		if ('current' in $$props) $$invalidate(2, current = $$props.current);
    		if ('value' in $$props) $$invalidate(1, value = $$props.value);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$store*/ 8) {
    			$$invalidate(2, current = $store.history[$store.stepNumber]);
    		}

    		if ($$self.$$.dirty & /*current, index*/ 5) {
    			$$invalidate(1, value = current.tabela[index]);
    		}
    	};

    	return [index, value, current, $store, click_handler];
    }

    class Quadrados extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { index: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Quadrados",
    			options,
    			id: create_fragment$7.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*index*/ ctx[0] === undefined && !('index' in props)) {
    			console.warn("<Quadrados> was created without expected prop 'index'");
    		}
    	}

    	get index() {
    		throw new Error("<Quadrados>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set index(value) {
    		throw new Error("<Quadrados>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Tabela.svelte generated by Svelte v3.49.0 */
    const file$5 = "src\\Tabela.svelte";

    function create_fragment$6(ctx) {
    	let link;
    	let t0;
    	let div4;
    	let div0;
    	let quadrados0;
    	let t1;
    	let quadrados1;
    	let t2;
    	let quadrados2;
    	let t3;
    	let quadrados3;
    	let t4;
    	let div1;
    	let quadrados4;
    	let t5;
    	let quadrados5;
    	let t6;
    	let quadrados6;
    	let t7;
    	let quadrados7;
    	let t8;
    	let div2;
    	let quadrados8;
    	let t9;
    	let quadrados9;
    	let t10;
    	let quadrados10;
    	let t11;
    	let quadrados11;
    	let t12;
    	let div3;
    	let quadrados12;
    	let t13;
    	let quadrados13;
    	let t14;
    	let quadrados14;
    	let t15;
    	let quadrados15;
    	let current;
    	quadrados0 = new Quadrados({ props: { index: "0" }, $$inline: true });
    	quadrados1 = new Quadrados({ props: { index: "1" }, $$inline: true });
    	quadrados2 = new Quadrados({ props: { index: "2" }, $$inline: true });
    	quadrados3 = new Quadrados({ props: { index: "3" }, $$inline: true });
    	quadrados4 = new Quadrados({ props: { index: "4" }, $$inline: true });
    	quadrados5 = new Quadrados({ props: { index: "5" }, $$inline: true });
    	quadrados6 = new Quadrados({ props: { index: "6" }, $$inline: true });
    	quadrados7 = new Quadrados({ props: { index: "7" }, $$inline: true });
    	quadrados8 = new Quadrados({ props: { index: "8" }, $$inline: true });
    	quadrados9 = new Quadrados({ props: { index: "9" }, $$inline: true });
    	quadrados10 = new Quadrados({ props: { index: "10" }, $$inline: true });
    	quadrados11 = new Quadrados({ props: { index: "11" }, $$inline: true });
    	quadrados12 = new Quadrados({ props: { index: "12" }, $$inline: true });
    	quadrados13 = new Quadrados({ props: { index: "13" }, $$inline: true });
    	quadrados14 = new Quadrados({ props: { index: "14" }, $$inline: true });
    	quadrados15 = new Quadrados({ props: { index: "15" }, $$inline: true });

    	const block = {
    		c: function create() {
    			link = element("link");
    			t0 = space();
    			div4 = element("div");
    			div0 = element("div");
    			create_component(quadrados0.$$.fragment);
    			t1 = space();
    			create_component(quadrados1.$$.fragment);
    			t2 = space();
    			create_component(quadrados2.$$.fragment);
    			t3 = space();
    			create_component(quadrados3.$$.fragment);
    			t4 = space();
    			div1 = element("div");
    			create_component(quadrados4.$$.fragment);
    			t5 = space();
    			create_component(quadrados5.$$.fragment);
    			t6 = space();
    			create_component(quadrados6.$$.fragment);
    			t7 = space();
    			create_component(quadrados7.$$.fragment);
    			t8 = space();
    			div2 = element("div");
    			create_component(quadrados8.$$.fragment);
    			t9 = space();
    			create_component(quadrados9.$$.fragment);
    			t10 = space();
    			create_component(quadrados10.$$.fragment);
    			t11 = space();
    			create_component(quadrados11.$$.fragment);
    			t12 = space();
    			div3 = element("div");
    			create_component(quadrados12.$$.fragment);
    			t13 = space();
    			create_component(quadrados13.$$.fragment);
    			t14 = space();
    			create_component(quadrados14.$$.fragment);
    			t15 = space();
    			create_component(quadrados15.$$.fragment);
    			attr_dev(link, "rel", "stylesheet");
    			attr_dev(link, "href", "/styles/tabela.css");
    			add_location(link, file$5, 1, 1, 16);
    			attr_dev(div0, "class", "linha-tabela");
    			add_location(div0, file$5, 9, 1, 162);
    			attr_dev(div1, "class", "linha-tabela");
    			add_location(div1, file$5, 15, 1, 297);
    			attr_dev(div2, "class", "linha-tabela");
    			add_location(div2, file$5, 21, 1, 431);
    			attr_dev(div3, "class", "linha-tabela");
    			add_location(div3, file$5, 27, 1, 567);
    			add_location(div4, file$5, 8, 0, 154);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			append_dev(document.head, link);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);
    			mount_component(quadrados0, div0, null);
    			append_dev(div0, t1);
    			mount_component(quadrados1, div0, null);
    			append_dev(div0, t2);
    			mount_component(quadrados2, div0, null);
    			append_dev(div0, t3);
    			mount_component(quadrados3, div0, null);
    			append_dev(div4, t4);
    			append_dev(div4, div1);
    			mount_component(quadrados4, div1, null);
    			append_dev(div1, t5);
    			mount_component(quadrados5, div1, null);
    			append_dev(div1, t6);
    			mount_component(quadrados6, div1, null);
    			append_dev(div1, t7);
    			mount_component(quadrados7, div1, null);
    			append_dev(div4, t8);
    			append_dev(div4, div2);
    			mount_component(quadrados8, div2, null);
    			append_dev(div2, t9);
    			mount_component(quadrados9, div2, null);
    			append_dev(div2, t10);
    			mount_component(quadrados10, div2, null);
    			append_dev(div2, t11);
    			mount_component(quadrados11, div2, null);
    			append_dev(div4, t12);
    			append_dev(div4, div3);
    			mount_component(quadrados12, div3, null);
    			append_dev(div3, t13);
    			mount_component(quadrados13, div3, null);
    			append_dev(div3, t14);
    			mount_component(quadrados14, div3, null);
    			append_dev(div3, t15);
    			mount_component(quadrados15, div3, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(quadrados0.$$.fragment, local);
    			transition_in(quadrados1.$$.fragment, local);
    			transition_in(quadrados2.$$.fragment, local);
    			transition_in(quadrados3.$$.fragment, local);
    			transition_in(quadrados4.$$.fragment, local);
    			transition_in(quadrados5.$$.fragment, local);
    			transition_in(quadrados6.$$.fragment, local);
    			transition_in(quadrados7.$$.fragment, local);
    			transition_in(quadrados8.$$.fragment, local);
    			transition_in(quadrados9.$$.fragment, local);
    			transition_in(quadrados10.$$.fragment, local);
    			transition_in(quadrados11.$$.fragment, local);
    			transition_in(quadrados12.$$.fragment, local);
    			transition_in(quadrados13.$$.fragment, local);
    			transition_in(quadrados14.$$.fragment, local);
    			transition_in(quadrados15.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(quadrados0.$$.fragment, local);
    			transition_out(quadrados1.$$.fragment, local);
    			transition_out(quadrados2.$$.fragment, local);
    			transition_out(quadrados3.$$.fragment, local);
    			transition_out(quadrados4.$$.fragment, local);
    			transition_out(quadrados5.$$.fragment, local);
    			transition_out(quadrados6.$$.fragment, local);
    			transition_out(quadrados7.$$.fragment, local);
    			transition_out(quadrados8.$$.fragment, local);
    			transition_out(quadrados9.$$.fragment, local);
    			transition_out(quadrados10.$$.fragment, local);
    			transition_out(quadrados11.$$.fragment, local);
    			transition_out(quadrados12.$$.fragment, local);
    			transition_out(quadrados13.$$.fragment, local);
    			transition_out(quadrados14.$$.fragment, local);
    			transition_out(quadrados15.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			detach_dev(link);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div4);
    			destroy_component(quadrados0);
    			destroy_component(quadrados1);
    			destroy_component(quadrados2);
    			destroy_component(quadrados3);
    			destroy_component(quadrados4);
    			destroy_component(quadrados5);
    			destroy_component(quadrados6);
    			destroy_component(quadrados7);
    			destroy_component(quadrados8);
    			destroy_component(quadrados9);
    			destroy_component(quadrados10);
    			destroy_component(quadrados11);
    			destroy_component(quadrados12);
    			destroy_component(quadrados13);
    			destroy_component(quadrados14);
    			destroy_component(quadrados15);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Tabela', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Tabela> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Quadrados });
    	return [];
    }

    class Tabela extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tabela",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    // o estado do jogo guarda a informação sobre a tela questamos no momento
    let estado = writable('menu');

    function trocarEstadoDoJogo(novoEstado) {
    	estado.set(novoEstado);
    }

    /* src\VoltarMenu.svelte generated by Svelte v3.49.0 */
    const file$4 = "src\\VoltarMenu.svelte";

    function create_fragment$5(ctx) {
    	let div;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Voltar ao menu";
    			attr_dev(div, "class", "menu");
    			add_location(div, file$4, 4, 0, 74);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (!mounted) {
    				dispose = listen_dev(div, "click", /*click_handler*/ ctx[0], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('VoltarMenu', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<VoltarMenu> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => trocarEstadoDoJogo('menu');
    	$$self.$capture_state = () => ({ trocarEstadoDoJogo });
    	return [click_handler];
    }

    class VoltarMenu extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "VoltarMenu",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src\Jogar.svelte generated by Svelte v3.49.0 */
    const file$3 = "src\\Jogar.svelte";

    function create_fragment$4(ctx) {
    	let link;
    	let t0;
    	let div4;
    	let div0;
    	let tabela;
    	let t1;
    	let div2;
    	let div1;
    	let t2;
    	let t3;
    	let div3;
    	let button;
    	let t5;
    	let voltarmenu;
    	let current;
    	let mounted;
    	let dispose;
    	tabela = new Tabela({ $$inline: true });
    	voltarmenu = new VoltarMenu({ $$inline: true });

    	const block = {
    		c: function create() {
    			link = element("link");
    			t0 = space();
    			div4 = element("div");
    			div0 = element("div");
    			create_component(tabela.$$.fragment);
    			t1 = space();
    			div2 = element("div");
    			div1 = element("div");
    			t2 = text(/*status*/ ctx[0]);
    			t3 = space();
    			div3 = element("div");
    			button = element("button");
    			button.textContent = "Recomeçar";
    			t5 = space();
    			create_component(voltarmenu.$$.fragment);
    			attr_dev(link, "rel", "stylesheet");
    			attr_dev(link, "href", "/styles/jogar.css");
    			add_location(link, file$3, 1, 1, 15);
    			attr_dev(div0, "class", "tabuleiro");
    			add_location(div0, file$3, 27, 1, 630);
    			add_location(div1, file$3, 31, 2, 701);
    			attr_dev(div2, "class", "info-jogo");
    			add_location(div2, file$3, 30, 1, 675);
    			attr_dev(button, "class", "botao");
    			attr_dev(button, "alt", "botao");
    			add_location(button, file$3, 34, 3, 775);
    			add_location(div3, file$3, 33, 2, 731);
    			attr_dev(div4, "class", "jogo");
    			add_location(div4, file$3, 26, 0, 610);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			append_dev(document.head, link);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);
    			mount_component(tabela, div0, null);
    			append_dev(div4, t1);
    			append_dev(div4, div2);
    			append_dev(div2, div1);
    			append_dev(div1, t2);
    			append_dev(div4, t3);
    			append_dev(div4, div3);
    			append_dev(div3, button);
    			insert_dev(target, t5, anchor);
    			mount_component(voltarmenu, target, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(div3, "click", /*click_handler*/ ctx[1], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*status*/ 1) set_data_dev(t2, /*status*/ ctx[0]);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tabela.$$.fragment, local);
    			transition_in(voltarmenu.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tabela.$$.fragment, local);
    			transition_out(voltarmenu.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			detach_dev(link);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div4);
    			destroy_component(tabela);
    			if (detaching) detach_dev(t5);
    			destroy_component(voltarmenu, detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Jogar', slots, []);
    	let status;
    	let vencedor;

    	store.subscribe(store => {
    		vencedor = calcularVencedor(store.history[store.history.length - 1].tabela);

    		if (vencedor) {
    			$$invalidate(0, status = `O vencedor é: ${vencedor}`);
    		} else {
    			$$invalidate(0, status = `Proximo jogador: ${store.xIsNext ? 'X' : 'O'}`);
    		}
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Jogar> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => store.reset();

    	$$self.$capture_state = () => ({
    		Tabela,
    		store,
    		calcularVencedor,
    		VoltarMenu,
    		estado,
    		trocarEstadoDoJogo,
    		status,
    		vencedor
    	});

    	$$self.$inject_state = $$props => {
    		if ('status' in $$props) $$invalidate(0, status = $$props.status);
    		if ('vencedor' in $$props) vencedor = $$props.vencedor;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [status, click_handler];
    }

    class Jogar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Jogar",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src\Sobre.svelte generated by Svelte v3.49.0 */
    const file$2 = "src\\Sobre.svelte";

    function create_fragment$3(ctx) {
    	let link;
    	let t0;
    	let h1;
    	let t1;
    	let p0;
    	let t3;
    	let p1;
    	let t5;
    	let p2;
    	let t7;
    	let p3;
    	let t9;
    	let p4;
    	let t11;
    	let p5;
    	let t13;
    	let p6;
    	let t15;
    	let voltarmenu;
    	let current;
    	voltarmenu = new VoltarMenu({ $$inline: true });

    	const block = {
    		c: function create() {
    			link = element("link");
    			t0 = space();
    			h1 = element("h1");
    			t1 = text("Colaboradores\r\n\r\n\r\n");
    			p0 = element("p");
    			p0.textContent = "Marcos Antônio da Silva";
    			t3 = space();
    			p1 = element("p");
    			p1.textContent = "Kalil Soares Barbosa";
    			t5 = space();
    			p2 = element("p");
    			p2.textContent = "Emerson Eloi da Silva";
    			t7 = space();
    			p3 = element("p");
    			p3.textContent = "Crislyane Gonçalo de Santana Marinho";
    			t9 = space();
    			p4 = element("p");
    			p4.textContent = "Maira Gomes de Alcantara";
    			t11 = space();
    			p5 = element("p");
    			p5.textContent = "Lucas Felipe Oliveira Amaral";
    			t13 = space();
    			p6 = element("p");
    			p6.textContent = "Jhonatan p. Marinho";
    			t15 = space();
    			create_component(voltarmenu.$$.fragment);
    			attr_dev(link, "rel", "stylesheet");
    			attr_dev(link, "href", "/styles/sobre.css");
    			add_location(link, file$2, 1, 1, 16);
    			add_location(p0, file$2, 11, 0, 177);
    			add_location(p1, file$2, 12, 0, 211);
    			add_location(p2, file$2, 13, 0, 242);
    			add_location(p3, file$2, 14, 0, 274);
    			add_location(p4, file$2, 15, 0, 321);
    			add_location(p5, file$2, 16, 0, 356);
    			add_location(p6, file$2, 17, 0, 395);
    			add_location(h1, file$2, 8, 0, 154);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			append_dev(document.head, link);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, h1, anchor);
    			append_dev(h1, t1);
    			append_dev(h1, p0);
    			append_dev(h1, t3);
    			append_dev(h1, p1);
    			append_dev(h1, t5);
    			append_dev(h1, p2);
    			append_dev(h1, t7);
    			append_dev(h1, p3);
    			append_dev(h1, t9);
    			append_dev(h1, p4);
    			append_dev(h1, t11);
    			append_dev(h1, p5);
    			append_dev(h1, t13);
    			append_dev(h1, p6);
    			insert_dev(target, t15, anchor);
    			mount_component(voltarmenu, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(voltarmenu.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(voltarmenu.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			detach_dev(link);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t15);
    			destroy_component(voltarmenu, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Sobre', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Sobre> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ VoltarMenu });
    	return [];
    }

    class Sobre extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Sobre",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\Menu.svelte generated by Svelte v3.49.0 */
    const file$1 = "src\\Menu.svelte";

    function create_fragment$2(ctx) {
    	let link;
    	let t0;
    	let h1;
    	let t2;
    	let div0;
    	let t4;
    	let div1;
    	let t6;
    	let div2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			link = element("link");
    			t0 = space();
    			h1 = element("h1");
    			h1.textContent = "JOGO DA VELHA (4x4)";
    			t2 = space();
    			div0 = element("div");
    			div0.textContent = "Jogo";
    			t4 = space();
    			div1 = element("div");
    			div1.textContent = "Sobre";
    			t6 = space();
    			div2 = element("div");
    			div2.textContent = "Como Jogar";
    			attr_dev(link, "rel", "stylesheet");
    			attr_dev(link, "href", "/styles/menu.css");
    			add_location(link, file$1, 1, 1, 16);
    			add_location(h1, file$1, 9, 0, 196);
    			attr_dev(div0, "class", "menu");
    			add_location(div0, file$1, 13, 0, 233);
    			attr_dev(div1, "class", "menu");
    			add_location(div1, file$1, 16, 0, 314);
    			attr_dev(div2, "class", "menu");
    			add_location(div2, file$1, 19, 0, 395);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			append_dev(document.head, link);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, div1, anchor);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, div2, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(div0, "click", /*click_handler*/ ctx[0], false, false, false),
    					listen_dev(div1, "click", /*click_handler_1*/ ctx[1], false, false, false),
    					listen_dev(div2, "click", /*click_handler_2*/ ctx[2], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			detach_dev(link);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(div2);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Menu', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Menu> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => trocarEstadoDoJogo('jogar');
    	const click_handler_1 = () => trocarEstadoDoJogo('sobre');
    	const click_handler_2 = () => trocarEstadoDoJogo('comojogar');
    	$$self.$capture_state = () => ({ estado, trocarEstadoDoJogo });
    	return [click_handler, click_handler_1, click_handler_2];
    }

    class Menu extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Menu",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\ComoJogar.svelte generated by Svelte v3.49.0 */
    const file = "src\\ComoJogar.svelte";

    function create_fragment$1(ctx) {
    	let link;
    	let t0;
    	let div;
    	let h1;
    	let t2;
    	let p;
    	let t4;
    	let voltarmenu;
    	let current;
    	voltarmenu = new VoltarMenu({ $$inline: true });

    	const block = {
    		c: function create() {
    			link = element("link");
    			t0 = space();
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "Como Jogar";
    			t2 = space();
    			p = element("p");
    			p.textContent = "Duas pessoas participam do jogo, cada jogador fica com um símbolo (X ou O) e alternadamente vão preenchendo os espaços vazios.\r\n      Vence aquele que conseguir formar primeiro uma linha com quatro símbolos, seja na vertical, horizontal ou diagonal.";
    			t4 = space();
    			create_component(voltarmenu.$$.fragment);
    			attr_dev(link, "rel", "stylesheet");
    			attr_dev(link, "href", "/styles/comojoga.css");
    			add_location(link, file, 1, 1, 16);
    			add_location(h1, file, 9, 2, 179);
    			add_location(p, file, 10, 2, 202);
    			attr_dev(div, "class", "text");
    			add_location(div, file, 8, 0, 157);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			append_dev(document.head, link);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(div, t2);
    			append_dev(div, p);
    			insert_dev(target, t4, anchor);
    			mount_component(voltarmenu, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(voltarmenu.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(voltarmenu.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			detach_dev(link);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t4);
    			destroy_component(voltarmenu, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ComoJogar', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ComoJogar> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ VoltarMenu });
    	return [];
    }

    class ComoJogar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ComoJogar",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.49.0 */

    // (23:34) 
    function create_if_block_3(ctx) {
    	let comojogar;
    	let current;
    	comojogar = new ComoJogar({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(comojogar.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(comojogar, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(comojogar.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(comojogar.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(comojogar, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(23:34) ",
    		ctx
    	});

    	return block;
    }

    // (21:30) 
    function create_if_block_2(ctx) {
    	let jogo;
    	let current;
    	jogo = new Jogar({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(jogo.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(jogo, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(jogo.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(jogo.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(jogo, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(21:30) ",
    		ctx
    	});

    	return block;
    }

    // (19:30) 
    function create_if_block_1(ctx) {
    	let sobre;
    	let current;
    	sobre = new Sobre({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(sobre.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(sobre, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(sobre.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(sobre.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(sobre, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(19:30) ",
    		ctx
    	});

    	return block;
    }

    // (16:0) {#if $estado === 'menu'}
    function create_if_block(ctx) {
    	let menu;
    	let current;
    	menu = new Menu({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(menu.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(menu, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(menu.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(menu.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(menu, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(16:0) {#if $estado === 'menu'}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block, create_if_block_1, create_if_block_2, create_if_block_3];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*$estado*/ ctx[0] === 'menu') return 0;
    		if (/*$estado*/ ctx[0] === 'sobre') return 1;
    		if (/*$estado*/ ctx[0] === 'jogar') return 2;
    		if (/*$estado*/ ctx[0] === 'comojogar') return 3;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(target, anchor);
    			}

    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index !== previous_block_index) {
    				if (if_block) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];

    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					}

    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				} else {
    					if_block = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d(detaching);
    			}

    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let $estado;
    	validate_store(estado, 'estado');
    	component_subscribe($$self, estado, $$value => $$invalidate(0, $estado = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Jogo: Jogar,
    		Sobre,
    		Menu,
    		ComoJogar,
    		estado,
    		$estado
    	});

    	return [$estado];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
