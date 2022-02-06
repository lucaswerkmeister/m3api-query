# m3api-query

m3api-query is a helper module for [m3api][],
simplifying some common operations when working with the `query` action.

## Usage

The module exports several functions,
which typically take a `session` parameter that would be constructed separately –
see the m3api README for details on that.
The more important functions are documented below;
some others can be found in the source code.

### queryFullPageByTitle

Get the full data for a single page with the given title,
according to the `prop`s (and possibly other parameters).

```js
const page = await queryFullPageByTitle( session, title, {
	prop: set(
		'categories',
		'contributors',
		'coordinates',
		'description',
		'pageimages',
		'pageprops',
	),
	clprop: set( 'sortkey' ),
	cllimit: 'max',
	colimit: 'max',
	pclimit: 'max',
	pilimit: 'max',
} );
console.log( `${page.title} (${page.description}) ` +
	`is in ${page.categories.length} categories.` );
for ( const contributor of page.contributors ) {
	console.log( `Thank you, ${contributor.name}, ` +
		`for contributing to ${page.title}!` );
}
// ...
```

If the API doesn’t return the full page information in a single response,
the function automatically follows continuation
and merges the responses back into a single object.

## License

Published under the [ISC License][].
By contributing to this software,
you agree to publish your contribution under the same license.

[m3api]: https://www.npmjs.com/package/m3api
[ISC License]: https://spdx.org/licenses/ISC.html
