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
 * @private
 * @param {Object} params Not modified.
 * @param {string} title
 * @return {Object}
 */
function makeParamsWithTitle( params, title ) {
	if ( params.generator !== undefined ) {
		throw new RangeError(
			'params.titles cannot be used with generator ' +
				'(titles becomes the input for the generator)',
		);
	}

	let titles = params.titles;
	if ( titles instanceof Set ) {
		titles = new Set( titles );
		titles.add( title );
	} else if ( Array.isArray( titles ) ) {
		if ( !titles.includes( title ) ) {
			titles = [ ...titles, title ];
		}
	} else if ( typeof titles === 'string' ) {
		titles = new Set( [ titles, title ] );
	} else if ( titles === undefined ) {
		titles = new Set( [ title ] );
	} else {
		throw new RangeError( 'params.titles must be Set, Array, string, or undefined' );
	}

	return makeParams( { ...params, titles } );
}

/**
 * Merge the incremental object into the base one.
 *
 * @private
 * @param {Object} base
 * @param {Object} incremental
 * @param {string} [basePath] Path to the object, for error reporting.
 */
function mergeObjects( base, incremental, basePath = '' ) {
	function error( path, message ) {
		return new Error(
			`Error merging objects from two responses at ${path}: ${message}\n\n` +
				'This is probably a bug, please report it at ' +
				'<https://github.com/lucaswerkmeister/m3api-query/issues/>.',
		);
	}

	for ( const [ key, incrementalValue ] of Object.entries( incremental ) ) {
		if ( !Object.prototype.hasOwnProperty.call( base, key ) ) {
			base[ key ] = incrementalValue;
			continue;
		}

		const baseValue = base[ key ];
		const baseType = typeof baseValue;
		const incrementalType = typeof incrementalValue;
		const path = basePath ? `${basePath}.${key}` : key;

		if ( baseValue === null ) {
			if ( incrementalValue !== null ) {
				throw error( path, `Cannot merge null with non-null (${incrementalType})` );
			}

			continue;
		}

		if ( Array.isArray( baseValue ) ) {
			if ( !Array.isArray( incrementalValue ) ) {
				throw error( path, `Cannot merge array with non-array (${incrementalType})` );
			}

			base[ key ] = [ ...baseValue, ...incrementalValue ];
			continue;
		}

		if ( baseType === 'object' ) {
			if ( Array.isArray( incrementalValue ) ) {
				throw error( path, 'Cannot merge object with array' );
			}

			if ( incrementalType === 'object' ) {
				mergeObjects( baseValue, incrementalValue, path );
				continue;
			}

			throw error( path, `Cannot merge object with non-object (${incrementalType})` );
		}

		if ( baseType === 'string' || baseType === 'number' || baseType === 'boolean' ) {
			if ( incrementalType !== baseType ) {
				throw error( path, `Cannot merge ${baseType} (${baseValue}) with non-${baseType} (${incrementalType})` );
			}

			if ( baseValue !== incrementalValue ) {
				throw error( path, `Cannot merge different ${baseType}s (${baseValue} != ${incrementalValue})` );
			}

			continue;
		}

		throw error( path, `Unexpected type ${baseType}` );
	}
}

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
 * @return {Object} One or more versions of the page with the given title.
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
 * or use {@link queryIncrementalPageByTitle} instead of this function
 * and stop iterating once you’ve received enough revisions.
 *
 * @param {Session} session An API session.
 * @param {string} title The title of the page to query.
 * @param {Object} [params] Other request parameters.
 * You will usually want to specify at least the prop parameter.
 * This may include the titles parameter,
 * in which case the given title will be added if necessary.
 * @param {Object} [options] Request options.
 * @return {Object} The full data of the page with the given title.
 * (The data included will depend on the prop paramater –
 * “full” means that partial responses are merged,
 * not that the object includes all the information about the page
 * that MediaWiki could possibly return.)
 */
async function queryFullPageByTitle( session, title, params = {}, options = {} ) {
	const page = {};
	for await ( const incr of queryIncrementalPageByTitle( session, title, params, options ) ) {
		mergeObjects( page, incr );
	}
	return page;
}

export {
	getResponsePageByTitle,
	getResponsePageByPageId,
	queryPartialPageByTitle,
	queryIncrementalPageByTitle,
	queryFullPageByTitle,
};
