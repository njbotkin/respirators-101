## respirators-101

## To build

```sh
npm i
npm run build
```

## To develop

```sh
npm run dev
```

## To test

```sh
npm t
```

## Development stuff to know

- All `.js` files in `routes` must export a state object to be passed to abstract-state-router's `addState`
- Anything in `lib` and `component` can be imported with `import 'lib/[whatever]` or `import component/[whatever]` without having to use relative paths
- Because of this, anything in `routes` shouldn't have to use relative paths to access any files outside of that directory tree
- `.html` files in `client/static-html` will be automatically slurped up during the build
	- it is safe to wipe out that directory and overwrite it with new html files
	- to give the static files friendly names, edit `lib/static-html-page-names.js`
