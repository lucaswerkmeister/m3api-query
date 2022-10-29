# m3api-query

m3api-query is an extension package for [m3api][],
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

There is also a `queryFullPageByPageId` function that does what you’d expect,
and a similar `queryFullRevisionByRevisionId` function as well.

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

Also, when you use a generator,
the order of pages in the actual API result will usually be unrelated
to the order in which the generator produced them.
You can restore the meaningful order using the `m3api-query/comparePages` option;
for example, the `search` generator adds an `index` property to each page,
so by comparing by this property we can get the pages in the search order again:

```js
let n = 0;
for await ( const page of queryFullPages( session, {
	generator: 'search',
	gsrsearch: 'example',
	gsrlimit: 'max',
}, {
	'm3api-query/comparePages': ( { index: i1 }, { index: i2 } ) => i1 - i2,
} ) ) {
	console.log( page.title );
	if ( ++n >= 1000 ) {
		break;
	}
}
```

### queryFullRevisions

Similar to `queryFullPages`, this provides a stream of revision objects.
It can be used to get all the revisions of a page, following continuation as needed:

```js
for await ( const revision of queryFullRevisions( session, {
	titles: 'MediaWiki',
	rvprop: set( 'timestamp', 'user', 'comment' ),
	rvlimit: 'max',
} ) ) {
	const { timestamp, user, comment } = revision;
	console.log( `${timestamp} ([[User:${user}]]): ${comment}` );
}
```

Or to get the current revision of a set of pages produced by a generator:

```js
for await ( const revision of queryFullRevisions( session, {
	generator: 'categorymembers',
	gcmtitle: 'Category:Member states of the United Nations',
	gcmtype: [ 'page' ],
	gcmlimit: 'max',
	rvprop: set( 'size' ),
} ) ) {
	const page = revision[ pageOfRevision ];
	console.log( `${page.title}: ${revision.size} bytes` );
}
```

The above example also demonstrates how to get the page that a revision belongs to –
the `pageOfRevision` key can be imported from this module just like the other functions.
(This also applies to other functions returning revisions, such as `queryFullRevisionByRevisionId`.)

You can sort the revisions within each batch using the `m3api-query/compareRevisions` option;
the comparison may also involve the page the revision belongs to,
e.g. for the `search` generator as seen before (under `queryFullPages`):

```js
for await ( const revision of queryFullRevisions( session, {
	generator: 'search',
	gsrsearch: 'example',
	gsrlimit: 'max',
	rvprop: set( 'timestamp' ),
}, {
	'm3api-query/compareRevisions': ( revision1, revision2 ) => {
		const { index: i1 } = revision1[ pageOfRevision ],
			{ index: i2 } = revision2[ pageOfRevision ];
		return i1 - i2;
	},
} ) ) {
	const { timestamp } = revision,
		{ title } = revision[ pageOfRevision ];
	console.log( `${title} (last edited ${timestamp})` );
}
```

## License

Published under the [ISC License][].
By contributing to this software,
you agree to publish your contribution under the same license.

[m3api]: https://www.npmjs.com/package/m3api
[ISC License]: https://spdx.org/licenses/ISC.html
