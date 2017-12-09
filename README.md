# respirators-101

## To build

```sh
npm i
npm run build
```

The contents of `public/` can be deployed to any static file http server.

## To develop

```sh
npm run dev
```

A server will be started automatically, probably at `http://localhost:5000` (`serve` should copy the url to your clipboard)

## To test

```sh
npm t
```

## Development stuff to know

- All `.js` files in `routes` must export a state object to be passed to abstract-state-router's `addState`
- Anything in `lib` can be imported with `import 'lib/[whatever.js]` without having to use relative paths
- Because of this, anything in `routes` shouldn't have to use relative paths to access any files outside of that directory tree
- `.html` files in `client/static-html` will be automatically slurped up during the build
	- it is safe to wipe out that directory and overwrite it with new html files
	- to give the static files friendly names, edit `lib/static-html-page-names.js`
- All `.css` files in `routes` will be automatically slurped up
	- they will be processed with [precss](https://www.npmjs.com/package/precss) and [autoprefixer](https://www.npmjs.com/package/autoprefixer) and any other PostCSS plugins we want
	- these slurped-up files can import any css files in `client/global-css` without having to use relative paths: `@import "filename-without-extension";`
- All <style> blocks in components will be slurped up and processed like the `.css` files.  For now, this is the preferred way to style components.