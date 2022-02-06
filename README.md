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

### queryFullPages

Get the full data for a collection of pages,
typically produced by a generator.

```js
let n = 0;
for await ( const page of queryFullPages( session, {
	generator: 'allpages',
	gapnamespace: 10, // NS_TEMPLATE
	gaplimit: 100,
	prop: set( 'revisions' ),
	rvprop: set( 'content' ),
	rvslots: set( 'main' ),
	formatversion: 2,
} ) ) {
	const content = page.revisions[ 0 ].slots.main.content;
	if ( content.includes( 'style=' ) ) {
		console.log( `${page.title} seems to contain inline styles` );
		if ( ++n >= 10 ) {
			break;
		}
	}
}
```

In this example, we ask the `allpages` generator for 100 pages at a time,
but the `revisions` prop will actually only return 50 revisions per request,
so we need to follow continuation once for the revisions of the second half of pages,
before continuing with the next batch of 100 pages.
The function handles all of this for you.

It’s worth noting that the function only starts yielding pages at the end of a complete batch,
i.e. in this example only after the first 100 pages all have their revisions.
If we used `gaplimit: 'max'`, the generator would produce 500 pages at once,
and the function would make 10 requests internally before yielding any pages;
since this example quickly breaks from the loop anyways,
a shorter `gaplimit` makes more sense here.

## License

Published under the [ISC License][].
By contributing to this software,
you agree to publish your contribution under the same license.

[m3api]: https://www.npmjs.com/package/m3api
[ISC License]: https://spdx.org/licenses/ISC.html
