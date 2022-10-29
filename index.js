import {
	DEFAULT_OPTIONS,
	set,
} from 'm3api/core.js';

/**
 * @type {symbol} A symbol that is used to attach the surrounding page to a revision object,
 * as returned by {@link getResponseRevisionByRevisionId},
 * {@link queryPotentialRevisionByRevisionId}, and {@queryFullRevisionByRevisionId}.
 */
const pageOfRevision = Symbol( 'pageOfRevision' );

/**
 * Attach the given page to the given revision.
 *
 * @param {Object} revision Not modified
 * @param {Object} page
 * @return {Object} The revision, with the page attached using {@link pageOfRevision}.
 */
function revisionWithPage( revision, page ) {
	return Object.defineProperty( { ...revision }, pageOfRevision, {
		value: page,
		configurable: true,
		enuberable: false,
		writable: true,
	} );
}

/**
 * Get an object representing a missing revision,
 * ensuring the "missing" key is present
 * even if it’s not in the object as returned by MediaWiki.
 *
 * @param {Object} revision Not modified.
 * @param {Object} response The full response, for formatversion detection.
 * The caller is assumed to have this in a local variable already.
 * @param {Object} query The query part of the response. Likewise.
 * @return {Object} The revision, with "missing" added if needed.
 */
function missingRevision( revision, response, query ) {
	if ( 'missing' in revision ) {
		return revision;
	} else {
		// add "missing" to response from older MediaWiki (pre-T301041)
		const formatversion2 = typeof response.batchcomplete === 'boolean' ||
			Array.isArray( query.pages );
		return {
			...revision,
			missing: formatversion2 ? true : '',
		};
	}
}

/**
 * Get the page with the given title out of an API response.
 *
 * Accounts for normalized titles and redirects in the response,
 * which means that the title of the returned page may not be the same as the given title.
 * Note that the API does not resolve redirects by default,
 * so that part will only apply if the request was made with the redirects parameter,
 * otherwise the returned page will be the information about the redirect instead of its target.
 * (Normalization is always applied, though.)
 *
 * This only looks for pages inside the query.pages of the response.
 * The pages can have been specified using the titles, pageids, revids, or generator parameters,
 * but titles added by a list parameter will not be found (use the list as a generator instead).
 *
 * @param {Object} response A full response, as returned by {@link Session#request}.
 * @param {string} title The title of the page to look for.
 * @return {Object|null} The page with the given title,
 * or null if no such page was found in the response.
 * If the request was made with the redirects parameter,
 * then this means that no such non-redirect page was found,
 * which could be because the title was a redirect to a nonexistent page,
 * or resulted in a redirect loop.
 * If the request was *not* made with the redirects parameter,
 * then a null return is unlikely,
 * but the returned object might just indicate an invalid or missing title.
 * Otherwise, the contents of the page object will depend
 * on the parameters with which the request was made,
 * especially the prop parameter.
 */
function getResponsePageByTitle( response, title ) {
	const query = response.query || {};

	for ( const normalized of query.normalized || [] ) {
		if ( title === normalized.from ) {
			title = normalized.to;
			break;
		}
	}

	const visitedRedirects = new Set();
	redirectLoop: do {
		for ( const redirect of query.redirects || [] ) {
			if ( title === redirect.from ) {
				visitedRedirects.add( redirect.from );
				title = redirect.to;
				continue redirectLoop;
			}
		}
		break;
	} while ( !visitedRedirects.has( title ) );

	let pages = query.pages || [];
	if ( !Array.isArray( pages ) ) {
		pages = Object.values( pages );
	}
	for ( const page of pages ) {
		if ( title === page.title ) {
			return page;
		}
	}
	return null;
}

/**
 * Get the page with the given page ID out of an API response.
 *
 * @param {Object} response A full response, as returned by {@link Session#request}.
 * @param {string|number} pageId The page ID to look for, a positive integer.
 * @return {Object|null} The page with the given page ID,
 * or null if no such page was found.
 * A null return likely means a mismatch between request parameters and page ID;
 * if a request for this page ID was made, but no such page exists,
 * then the response will still contain a page object (and this function will return it),
 * with a key indicating that the page is missing.
 * Otherwise, the contents of the page object will depend
 * on the parameters with which the request was made,
 * especially the prop parameter.
 */
function getResponsePageByPageId( response, pageId ) {
	if ( typeof pageId === 'number' ) {
		pageId = pageId.toString();
	}

	const query = response.query || {};

	const pages = query.pages || {};
	if ( Array.isArray( pages ) ) {
		for ( const page of pages ) {
			if ( pageId === page.pageid.toString() ) {
				return page;
			}
		}
		return null;
	} else {
		return pages[ pageId ] || null;
	}
}

/**
 * Get the revision with the given revision ID out of an API response.
 *
 * @param {Object} response A full response, as returned by {@link Session#request}.
 * @param {string|number} revisionId The revision ID to look for, a positive integer.
 * @return {Object|null} The revision with the given revision ID,
 * or null if no such revision was found.
 * A null return likely means a mismatch between request parameters and revision ID;
 * if a request for this revision ID was made, but no such revision exists,
 * then the response will still contain a “bad” revision object (and this function will return it),
 * with a key indicating that the revision is missing.
 * Otherwise, the contents of the revision object will depend
 * on the parameters with which the request was made,
 * especially the rvprop parameter.
 * The corresponding page object, without its revisions,
 * is attached using {@link pageOfRevision} as the key;
 * its contents will similarly depend on the request parameters, especially prop.
 */
function getResponseRevisionByRevisionId( response, revisionId ) {
	if ( typeof revisionId === 'number' ) {
		revisionId = revisionId.toString();
	}

	const query = response.query || {};

	if ( query.badrevids && query.badrevids[ revisionId ] ) {
		return missingRevision( query.badrevids[ revisionId ], response, query );
	}

	let pages = query.pages || [];
	if ( !Array.isArray( pages ) ) {
		pages = Object.values( pages );
	}
	// this looks O(n²), but is O(n) in practice:
	// prop=revisions refuses to produce more than one revision
	// if there is more than one page in the whole response,
	// so at least one of the loops is iterating over a single element
	for ( const page of pages ) {
		const { revisions, ...remainingPage } = page;
		for ( const revision of revisions || [] ) {
			if ( revisionId === revision.revid.toString() ) {
				return revisionWithPage( revision, remainingPage );
			}
		}
	}
	return null;
}

/**
 * Like Array.from() but for Sets.
 *
 * @private
 * @param {Object} iterable
 * @param {Function} [mapFn]
 * @param {*} [thisArg]
 * @return {Set}
 */
function setFrom( iterable, mapFn, thisArg ) {
	const set = new Set();
	for ( let element of iterable ) {
		if ( mapFn ) {
			element = mapFn.call( thisArg, element );
		}
		set.add( element );
	}
	return set;
}

/**
 * @param {Object} params
 * @param {string} paramName
 */
function disallowGenerator( params, paramName ) {
	if ( params.generator !== undefined ) {
		throw new RangeError(
			`params.${paramName} cannot be used with generator ` +
				`(${paramName} becomes the input for the generator)`,
		);
	}
}

/**
 * @private
 * @param {Object} params Not modified.
 * @return {Object}
 */
function makeParams( params ) {
	if ( params.action === undefined ) {
		return {
			...params,
			action: 'query',
		};
	} else if ( params.action === 'query' ) {
		return params;
	} else {
		throw new RangeError( 'params.action must be "query" or undefined' );
	}
}

/**
 * Make params with an extra string param.
 *
 * @private
 * @param {string} paramName
 * @param {Object} params Not modified.
 * @param {string} paramValue
 * @return {Object}
 */
function makeParamsWithString( paramName, params, paramValue ) {
	let values = params[ paramName ];
	if ( values instanceof Set ) {
		values = new Set( values );
		values.add( paramValue );
	} else if ( Array.isArray( values ) ) {
		if ( !values.includes( paramValue ) ) {
			values = [ ...values, paramValue ];
		}
	} else if ( typeof values === 'string' ) {
		values = set( values, paramValue );
	} else if ( values === undefined ) {
		values = set( paramValue );
	} else {
		throw new RangeError( `params.${paramName} must be Set, Array, string, or undefined` );
	}

	return makeParams( { ...params, [ paramName ]: values } );
}

/**
 * Make params with an extra param that can be a number or a string.
 *
 * @private
 * @param {string} paramName
 * @param {Object} params Not modified.
 * @param {string|number} paramValue
 * @return {Object}
 */
function makeParamsWithNumeric( paramName, params, paramValue ) {
	paramValue = paramValue.toString();

	let values = params[ paramName ];
	if ( values instanceof Set ) {
		values = setFrom( values, ( element ) => element.toString() );
		values.add( paramValue );
	} else if ( Array.isArray( values ) ) {
		let included = false;
		values = Array.from( values, ( element ) => {
			element = element.toString();
			if ( element === paramValue ) {
				included = true;
			}
			return element;
		} );
		if ( !included ) {
			values.push( paramValue );
		}
	} else if ( typeof values === 'string' ) {
		values = set( values, paramValue );
	} else if ( typeof values === 'number' ) {
		values = set( values.toString(), paramValue );
	} else if ( values === undefined ) {
		values = set( paramValue );
	} else {
		throw new RangeError( `params.${paramName} must be Set, Array, string, number, or undefined` );
	}

	return makeParams( { ...params, [ paramName ]: values } );
}

/**
 * @private
 * @param {Object} params Not modified.
 * @param {string} title
 * @return {Object}
 */
function makeParamsWithTitle( params, title ) {
	disallowGenerator( params, 'titles' );
	return makeParamsWithString( 'titles', params, title );
}

/**
 * @private
 * @param {Object} params Not modified.
 * @param {string|number} pageId
 * @return {Object}
 */
function makeParamsWithPageId( params, pageId ) {
	disallowGenerator( params, 'pageids' );
	return makeParamsWithNumeric( 'pageids', params, pageId );
}

/**
 * @private
 * @param {Object} params Not modified.
 * @param {string|number} revisionId
 * @return {Object}
 */
function makeParamsWithRevisionId( params, revisionId ) {
	disallowGenerator( params, 'revids' );
	params = makeParamsWithNumeric( 'revids', params, revisionId );
	params = makeParamsWithString( 'prop', params, 'revisions' );
	return params;
}

const isArray = Array.isArray;
function isObject( value ) {
	return typeof value === 'object' && value !== null && !isArray( value );
}

/**
 * Merge two values, one from a base object
 * (based on an earlier response, possibly already merged),
 * one from the latest response.
 *
 * This callback is used to merge different values with no obvious merge strategy.
 * The obvious merge strategy is to merge objects recursively, and concatenate arrays.
 * The callback is therefore used when a value is present in both objects,
 * the values are not both objects or both arrays, and they are not the same.
 *
 * @callback mergeValues
 * @param {*} baseValue The value from the base object.
 * @param {*} incrementalValue The value from the incremental (new) object.
 * @param {string} path The path to the value, for error reporting.
 * @param {Object} base The full base object.
 * @param {string} key The key of the values in the object.
 * @return {*} The value to use in the base object.
 */

/**
 * The default mergeValues implementation.
 * If both values are strings or both are numbers,
 * it arbitrarily picks the earlier value,
 * accepting that values of these types may be unstable between responses.
 * In all other cases, an error is thrown,
 * assuming that other values should not vary.
 *
 * @type {mergeValues}
 */
function mergeValues( base, incremental, path ) {
	const baseType = typeof base;

	if ( baseType === typeof incremental && (
		baseType === 'string' || baseType === 'number' ) ) {
		return base;
	}

	function format( value ) {
		if ( value === null ) {
			return 'null';
		}
		if ( isArray( value ) ) {
			return 'array';
		}
		if ( isObject( value ) ) {
			return 'object';
		}
		return `${typeof value} (${value})`;
	}

	throw new Error(
		`Error merging objects from two responses at ${path}: ` +
			`Cannot merge ${format( base )} with ${format( incremental )}`,
	);
}

/**
 * Merge the incremental object into the base one.
 *
 * @private
 * @param {Object} base
 * @param {Object} incremental
 * @param {mergeValues} mergeValues Callback to merge different values
 * with no obvious merge strategy.
 * @param {string} [basePath] Path to the object, for error reporting.
 */
function mergeObjects( base, incremental, mergeValues, basePath = '' ) {
	for ( const [ key, incrementalValue ] of Object.entries( incremental ) ) {
		if ( !Object.prototype.hasOwnProperty.call( base, key ) ) {
			base[ key ] = incrementalValue;
			continue;
		}

		const baseValue = base[ key ];
		const path = basePath ? `${basePath}.${key}` : key;

		if ( isObject( baseValue ) && isObject( incrementalValue ) ) {
			mergeObjects( baseValue, incrementalValue, mergeValues, path );
			continue;
		}

		if ( isArray( baseValue ) && isArray( incrementalValue ) ) {
			base[ key ] = [ ...baseValue, ...incrementalValue ];
			continue;
		}

		if ( baseValue === incrementalValue ) {
			continue;
		}

		base[ key ] = mergeValues( baseValue, incrementalValue, path, base, key );
	}
}

/**
 * Compare two objects for sorting.
 *
 * @callback compareFn
 * @param {Object} a The first object.
 * @param {Object} b The second object.
 * @return {number} A number greater than zero if a is greater than b,
 * a number less than zero if a is less than b,
 * or zero to keep the original order of a and b.
 */

/**
 * Request options understood by this package.
 * All other options will be passed through to m3api.
 *
 * @typedef Options
 * @type {Object}
 * @property {mergeValues} ['m3api-query/mergeValues']
 * Callback to merge conflicting values.
 * Called when merging versions of the page that have conflicting values for a key.
 * Defaults to {@link mergeValues}.
 * @property {compareFn|null} ['m3api-query/comparePages']
 * Callback to compare two pages.
 * If not null, {@link queryFullPages} sorts the pages within each batch
 * according to this comparison function before yielding them.
 * This is especially useful when using a generator,
 * in which case the order of pages in the API result
 * does not preserve the order in which the generator produced them.
 * For example, you may use
 * <code>( { pageid: p1 }, { pageid: p2 } ) => p1 - p2</code>
 * to sort pages according to their page ID (yield lower page IDs first).
 * Defaults to null (no sorting).
 * @property {compareFn|null} ['m3api-query/compareRevisions']
 * Callback to compare two revisions.
 * If not null, {@link queryFullRevisions} sorts the revisions within each batch
 * according to this comparison function before yielding them.
 * For example, you may use
 * <code>( { revid: r1 }, { revid: r2 } ) => r1 - r2</code>
 * to sort revisions according to their revision ID (yield lower revision IDs first).
 * Defaults to null (no sorting).
 */

Object.assign( DEFAULT_OPTIONS, {
	'm3api-query/mergeValues': mergeValues,
	'm3api-query/comparePages': null,
	'm3api-query/compareRevisions': null,
} );

/**
 * Make a single request for the given page and return it.
 *
 * The page might be incomplete due to limitations on the overall response size,
 * and continuation may be required to acquire the complete page.
 * Usually, you want to use {@link queryFullPageByTitle} instead.
 *
 * @param {Session} session An API session.
 * @param {string} title The title of the page to query.
 * @param {Object} [params] Other request parameters.
 * You will usually want to specify at least the prop parameter.
 * This may include the titles parameter,
 * in which case the given title will be added if necessary.
 * @param {Object} [options] Request options.
 * @return {Object} The page with the given title.
 */
async function queryPartialPageByTitle( session, title, params = {}, options = {} ) {
	params = makeParamsWithTitle( params, title );
	const response = await session.request( params, options );
	return getResponsePageByTitle( response, title );
}

/**
 * Make continued requests for the given page,
 * and yield the partial pages from the results.
 *
 * The individual pages might be incomplete, but once iteration finishes,
 * all the information should have been returned somewhere.
 * See also {@link queryFullPageByTitle}, which merges the partial pages for you.
 *
 * @param {Session} session An API session.
 * @param {string} title The title of the page to query.
 * @param {Object} [params] Other request parameters.
 * You will usually want to specify at least the prop parameter.
 * This may include the titles parameter,
 * in which case the given title will be added if necessary.
 * @param {Object} [options] Request options.
 * @yield {Object} One or more versions of the page with the given title.
 */
async function * queryIncrementalPageByTitle( session, title, params = {}, options = {} ) {
	params = makeParamsWithTitle( params, title );
	for await ( const response of session.requestAndContinue( params, options ) ) {
		yield getResponsePageByTitle( response, title );
		if ( 'batchcomplete' in response ) {
			// there *should* be no continuation past this anyways,
			// because we’re not using a generator,
			// but let’s explicitly break from the loop just in case
			break;
		}
	}
}

/**
 * Query for the full data of the given page and return it.
 *
 * Since a single API request may return incomplete data,
 * this function will automatically follow continuation as needed
 * and merge the resulting pages into a single object, which it returns.
 *
 * Be careful when using this with prop=revisions:
 * pages can have a large number of revisions,
 * and trying to collect them all may take a long time,
 * or even make the process run out of memory before finishing.
 * The rvlimit parameter does not help with this,
 * as it only limits the number of revisions per request,
 * but does not stop continuation.
 * Use rvstart/rvend/rvstartid/rvendid to limit the range of revisions,
 * or use {@link queryFullRevisions} or {@link queryIncrementalPageByTitle}
 * instead of this function and stop iterating once you’ve received enough revisions.
 *
 * @param {Session} session An API session.
 * @param {string} title The title of the page to query.
 * @param {Object} [params] Other request parameters.
 * You will usually want to specify at least the prop parameter.
 * This may include the titles parameter,
 * in which case the given title will be added if necessary.
 * @param {Options} [options] Request options,
 * including custom options for this package (see the type documentation).
 * @return {Object} The full data of the page with the given title.
 * (The data included will depend on the prop parameter –
 * “full” means that partial responses are merged,
 * not that the object includes all the information about the page
 * that MediaWiki could possibly return.)
 */
async function queryFullPageByTitle(
	session,
	title,
	params = {},
	options = {},
) {
	const {
		'm3api-query/mergeValues': mergeValues,
	} = {
		...DEFAULT_OPTIONS,
		...session.defaultOptions,
		...options,
	};

	params = makeParamsWithTitle( params, title );
	const reducer = ( page, response ) => {
		const incr = getResponsePageByTitle( response, title );
		mergeObjects( page, incr, mergeValues );
		return page;
	};
	const initial = () => ( {} );

	// eslint-disable-next-line no-unreachable-loop
	for await ( const page of session.requestAndContinueReducingBatch(
		params,
		options,
		reducer,
		initial,
	) ) {
		return page;
	}

	throw new Error( 'API finished continuation without completing a batch' );
}

/**
 * Make a single request for the given page and return it.
 *
 * The page might be incomplete due to limitations on the overall response size,
 * and continuation may be required to acquire the complete page.
 * Usually, you want to use {@link queryFullPageByPageId} instead.
 *
 * @param {Session} session An API session.
 * @param {string|number} pageId The page ID of the page to query.
 * @param {Object} [params] Other request parameters.
 * You will usually want to specify at least the prop parameter.
 * This may include the pageids parameter,
 * in which case the given page ID will be added if necessary.
 * @param {Object} [options] Request options.
 * @return {Object} The page with the given page ID.
 */
async function queryPartialPageByPageId( session, pageId, params = {}, options = {} ) {
	params = makeParamsWithPageId( params, pageId );
	const response = await session.request( params, options );
	return getResponsePageByPageId( response, pageId );
}

/**
 * Make continued requests for the given page,
 * and yield the partial pages from the results.
 *
 * The individual pages might be incomplete, but once iteration finishes,
 * all the information should have been returned somewhere.
 * See also {@link queryFullPageByPageId}, which merges the partial pages for you.
 *
 * @param {Session} session An API session.
 * @param {string|number} pageId The page ID of the page to query.
 * @param {Object} [params] Other request parameters.
 * You will usually want to specify at least the prop parameter.
 * This may include the pageids parameter,
 * in which case the given page ID will be added if necessary.
 * @param {Object} [options] Request options.
 * @yield {Object} One or more versions of the page with the given page ID.
 */
async function * queryIncrementalPageByPageId( session, pageId, params = {}, options = {} ) {
	params = makeParamsWithPageId( params, pageId );
	for await ( const response of session.requestAndContinue( params, options ) ) {
		yield getResponsePageByPageId( response, pageId );
		if ( 'batchcomplete' in response ) {
			// there *should* be no continuation past this anyways,
			// because we’re not using a generator,
			// but let’s explicitly break from the loop just in case
			break;
		}
	}
}

/**
 * Query for the full data of the given page and return it.
 *
 * Since a single API request may return incomplete data,
 * this function will automatically follow continuation as needed
 * and merge the resulting pages into a single object, which it returns.
 *
 * Be careful when using this with prop=revisions:
 * pages can have a large number of revisions,
 * and trying to collect them all may take a long time,
 * or even make the process run out of memory before finishing.
 * The rvlimit parameter does not help with this,
 * as it only limits the number of revisions per request,
 * but does not stop continuation.
 * Use rvstart/rvend/rvstartid/rvendid to limit the range of revisions,
 * or use {@link queryIncrementalPageByPageId} instead of this function
 * and stop iterating once you’ve received enough revisions.
 *
 * @param {Session} session An API session.
 * @param {string|number} pageId The page ID of the page to query.
 * @param {Object} [params] Other request parameters.
 * You will usually want to specify at least the prop parameter.
 * This may include the pageids parameter,
 * in which case the given page ID will be added if necessary.
 * @param {Options} [options] Request options,
 * including custom options for this package (see the type documentation).
 * @return {Object} The full data of the page with the given page ID.
 * (The data included will depend on the prop parameter –
 * “full” means that partial responses are merged,
 * not that the object includes all the information about the page
 * that MediaWiki could possibly return.)
 */
async function queryFullPageByPageId(
	session,
	pageId,
	params = {},
	options = {},
) {
	const {
		'm3api-query/mergeValues': mergeValues,
	} = {
		...DEFAULT_OPTIONS,
		...session.defaultOptions,
		...options,
	};

	params = makeParamsWithPageId( params, pageId );
	const reducer = ( page, response ) => {
		const incr = getResponsePageByPageId( response, pageId );
		mergeObjects( page, incr, mergeValues );
		return page;
	};
	const initial = () => ( {} );

	// eslint-disable-next-line no-unreachable-loop
	for await ( const page of session.requestAndContinueReducingBatch(
		params,
		options,
		reducer,
		initial,
	) ) {
		return page;
	}

	throw new Error( 'API finished continuation without completing a batch' );
}

/**
 * Make continued requests for the given revision until it is returned.
 *
 * The revisions prop of the query API never returns incomplete revisions,
 * so unlike {@link queryIncrementalPageByTitle} and {@link queryIncrementalPageByPageId},
 * this function never yields partial objects that would need to be merged:
 * it yields zero or more nulls, one per response that is missing the given revision,
 * then the requested revision once it is found in a response.
 * (Afterwards, iteration finishes, even if API continuation isn’t done.)
 * The function is mainly useful if you might want to stop iterating early
 * (i.e. stop making more requests even if the revision wasn’t returned yet);
 * most users will want to use {@link queryFullRevisionByRevisionId} instead.
 *
 * @param {Session} session An API session.
 * @param {string|number} revisionId The revision ID of the revision to query.
 * @param {Object} [params] Other request parameters.
 * You will usually want to specify at least the rvprop parameter.
 * This may include the revids parameter,
 * in which case the given revision ID will be added if necessary.
 * Likewise, this may include the prop parameter,
 * in which case prop=revisions will be added if necessary.
 * @param {Object} [options] Request options.
 * The dropTruncatedResultWarning option defaults to true here.
 * @yield {Object|null} Zero or more nulls, then the revision with the given revision ID.
 * The non-null revision will have the corresponding page object, without its revisions,
 * attached using {@link pageOfRevision} as the key.
 */
async function * queryPotentialRevisionByRevisionId(
	session,
	revisionId,
	params = {},
	options = {},
) {
	params = makeParamsWithRevisionId( params, revisionId );
	options = {
		dropTruncatedResultWarning: true,
		...options,
	};
	for await ( const response of session.requestAndContinue( params, options ) ) {
		const revision = getResponseRevisionByRevisionId( response, revisionId );
		yield revision;
		if ( revision !== null ) {
			break;
		}
	}
}

/**
 * Query for the full data of the given revision and return it.
 *
 * If necessary, this function will automatically follow continuation
 * until the API returns the requested revision.
 *
 * @param {Session} session An API session.
 * @param {string|number} revisionId The revision ID of the revision to query.
 * @param {Object} [params] Other request parameters.
 * You will usually want to specify at least the rvprop parameter.
 * This may include the revids parameter,
 * in which case the given revision ID will be added if necessary.
 * Likewise, this may include the prop parameter,
 * in which case prop=revisions will be added if necessary.
 * @param {Object} [options] Request options.
 * The dropTruncatedResultWarning option defaults to true here.
 * @return {Object} The data of the revision with the given revision ID.
 * (The data included will depend on the rvprop parameter – the “full” name
 * is by analogy with {@link queryFullPageByTitle} and {@link queryFullPageByPageId},
 * the object does not necessarily include all the information about the revision
 * that MediaWiki could possibly return.)
 * The revision will have the corresponding page object, without its revisions,
 * attached using {@link pageOfRevision} as the key;
 * its contents will similarly depend on the request parameter, especially prop.
 */
async function queryFullRevisionByRevisionId(
	session,
	revisionId,
	params = {},
	options = {},
) {
	params = makeParamsWithRevisionId( params, revisionId );
	options = {
		dropTruncatedResultWarning: true,
		...options,
	};
	for await ( const response of session.requestAndContinue( params, options ) ) {
		const revision = getResponseRevisionByRevisionId( response, revisionId );
		if ( revision !== null ) {
			return revision;
		}
	}

	throw new Error( 'API finished continuation without returning the revision' );
}

/**
 * Query for the full data of a collection of pages,
 * yielding one full page at a time.
 *
 * Particularly useful with generators,
 * which may produce more pages than a given prop may handle,
 * so a single request may contain pages with incomplete data.
 *
 * @param {Session} session An API session.
 * @param {Object} params Request parameters.
 * Most useful with a generator, its parameters (all prefixed with g),
 * and then a prop parameter to determine the properties of each returned page.
 * Can also be used with titles/pageids/revids, though.
 * @param {Options} [options] Request options,
 * including custom options for this package (see the type documentation).
 * @yield {Object} The full data of each returned page.
 * (The data included will depend on the prop parameter –
 * “full” means that partial responses are merged,
 * not that the object includes all the information about the page
 * that MediaWiki could possibly return.)
 */
async function * queryFullPages(
	session,
	params,
	options = {},
) {
	const {
		'm3api-query/mergeValues': mergeValues,
		'm3api-query/comparePages': comparePages,
	} = {
		...DEFAULT_OPTIONS,
		...session.defaultOptions,
		...options,
	};

	params = makeParams( params );
	const reducer = ( batch, response ) => {
		let pages = ( response.query || {} ).pages || [];
		if ( !Array.isArray( pages ) ) {
			pages = Object.values( pages );
		}

		for ( const page of pages ) {
			const key = page.pageid || page.title; // fall back to title for missing pages
			if ( batch.has( key ) ) {
				mergeObjects( batch.get( key ), page, mergeValues );
			} else {
				batch.set( key, page );
			}
		}

		return batch;
	};
	const initial = () => new Map();

	for await ( const batch of session.requestAndContinueReducingBatch(
		params,
		options,
		reducer,
		initial,
	) ) {
		if ( comparePages !== null ) {
			const pages = [ ...batch.values() ];
			yield * pages.sort( comparePages );
		} else {
			yield * batch.values();
		}
	}
}

/**
 * Query for the full data of a collection of revisions,
 * yielding one full revision at a time.
 *
 * Useful with generators, but also with prop=revisions for a single page.
 * Stop iterating over the returned iterator to stop making further API requests.
 *
 * @param {Session} session An API session.
 * @param {Object} params Request parameters.
 * You will usually want to specify rvprop,
 * to determine the properties of each returned revision.
 * @param {Object} [options] Request options.
 * The dropTruncatedResultWarning option defaults to true here.
 * @yield {Object} The full data of each returned revision.
 * (The data included will depend on the rvprop parameter –
 * the “full” name is by analogy with {@link queryFullPages},
 * the object does not necessarily include all the information about the revisions
 * that MediaWiki could possibly return.)
 * Each revision will have the corresponding page object, without its revisions,
 * attached using {@link pageOfRevision} as the key;
 * its contents will similarly depend on the request parameter, especially prop.
 */
async function * queryFullRevisions(
	session,
	params,
	options = {},
) {
	const {
		'm3api-query/compareRevisions': compareRevisions,
	} = {
		...DEFAULT_OPTIONS,
		...session.defaultOptions,
		...options,
	};

	params = makeParamsWithString( 'prop', params, 'revisions' );
	options = {
		dropTruncatedResultWarning: true,
		...options,
	};

	for await ( const response of session.requestAndContinue( params, options ) ) {
		const query = response.query || {};
		const batch = [];

		for ( const revision of Object.values( query.badrevids || {} ) ) {
			batch.push( missingRevision( revision, response, query ) );
		}

		let pages = query.pages || [];
		if ( !Array.isArray( pages ) ) {
			pages = Object.values( pages );
		}
		for ( const page of pages ) {
			const { revisions, ...remainingPage } = page;
			for ( const revision of revisions || [] ) {
				batch.push( revisionWithPage( revision, remainingPage ) );
			}
		}

		if ( compareRevisions !== null ) {
			yield * batch.sort( compareRevisions );
		} else {
			yield * batch;
		}
	}
}

export {
	pageOfRevision,
	getResponsePageByTitle,
	getResponsePageByPageId,
	getResponseRevisionByRevisionId,
	mergeValues,
	queryPartialPageByTitle,
	queryIncrementalPageByTitle,
	queryFullPageByTitle,
	queryPartialPageByPageId,
	queryIncrementalPageByPageId,
	queryFullPageByPageId,
	queryPotentialRevisionByRevisionId,
	queryFullRevisionByRevisionId,
	queryFullPages,
	queryFullRevisions,
};
