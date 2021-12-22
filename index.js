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
	for ( const normalized of response.query.normalized || [] ) {
		if ( title === normalized.from ) {
			title = normalized.to;
			break;
		}
	}

	const visitedRedirects = new Set();
	redirectLoop: do {
		for ( const redirect of response.query.redirects || [] ) {
			if ( title === redirect.from ) {
				visitedRedirects.add( redirect.from );
				title = redirect.to;
				continue redirectLoop;
			}
		}
		break;
	} while ( !visitedRedirects.has( title ) );

	let pages = response.query.pages || [];
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

export {
	getResponsePageByTitle,
};
