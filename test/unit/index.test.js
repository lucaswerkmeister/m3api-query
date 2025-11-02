/* eslint-env mocha */

import { Session, set } from 'm3api/core.js';
import {
	pageOfRevision,
	getResponsePageByTitle,
	getResponsePageByPageId,
	getResponseRevisionByRevisionId,
	TooManyEmptyResponsesError,
	maxEmptyResponses,
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
} from '../../index.js';
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
use( chaiAsPromised );

describe( 'getResponsePageByTitle', () => {

	it( 'finds page with same title, formatversion=1', () => {
		const title = 'A Title';
		const page = { title };
		const unrelatedPage = { title: 'Unrelated' };
		const response = { query: { pages: { 123: unrelatedPage, 456: page } } };
		expect( getResponsePageByTitle( response, title ) ).to.equal( page );
	} );

	it( 'finds page with same title, formatversion=2', () => {
		const title = 'A Title';
		const page = { title };
		const unrelatedPage = { title: 'Unrelated' };
		const response = { query: { pages: [ unrelatedPage, page ] } };
		expect( getResponsePageByTitle( response, title ) ).to.equal( page );
	} );

	it( 'does not find page with different title', () => {
		const title = 'Title';
		const page = { title };
		const response = { query: { pages: [ page ] } };
		const inputTitle = 'TiTlE';
		expect( getResponsePageByTitle( response, inputTitle ) ).to.be.null;
	} );

	it( 'finds page with normalized title', () => {
		const title = 'A Title';
		const page = { title };
		const inputTitle = 'a_Title';
		const response = { query: {
			normalized: [
				{ from: 'unrelated', to: 'Unrelated' },
				{ from: inputTitle, to: title },
			],
			pages: [ page ],
		} };
		expect( getResponsePageByTitle( response, inputTitle ) ).to.equal( page );
	} );

	it( 'finds page with converted title', () => {
		const title = 'Itletay';
		const page = { title };
		const inputTitle = 'Title';
		const response = { query: {
			converted: [
				{ from: 'Unrelated', to: 'Unrelatedway' },
				{ from: inputTitle, to: title },
			],
			pages: [ page ],
		} };
		expect( getResponsePageByTitle( response, inputTitle ) ).to.equal( page );
	} );

	it( 'finds page with redirected title', () => {
		const title = 'Target';
		const page = { title };
		const inputTitle = 'Redirect';
		const response = { query: {
			redirects: [
				{ from: 'Unrelated', to: 'Unrelated 2: The Unrelatening' },
				{ from: inputTitle, to: title, tofragment: 'Ignored' },
			],
			pages: [ page ],
		} };
		expect( getResponsePageByTitle( response, inputTitle ) ).to.equal( page );
	} );

	it( 'finds page with double-redirected title', () => {
		const title = 'Target';
		const page = { title };
		const inputTitle = 'Redirect';
		const intermediateTitle = 'Redirect 2';
		const response = { query: {
			redirects: [
				{ from: inputTitle, to: intermediateTitle },
				{ from: intermediateTitle, to: title },
			],
			pages: [ page ],
		} };
		expect( getResponsePageByTitle( response, inputTitle ) ).to.equal( page );
	} );

	it( 'finds page with double-redirected title in flipped order', () => {
		const title = 'Target';
		const page = { title };
		const inputTitle = 'Redirect';
		const intermediateTitle = 'Redirect 2';
		const response = { query: {
			redirects: [
				// could happen with titles: [ intermediateTitle, inputTitle ]
				{ from: intermediateTitle, to: title },
				{ from: inputTitle, to: intermediateTitle },
			],
			pages: [ page ],
		} };
		expect( getResponsePageByTitle( response, inputTitle ) ).to.equal( page );
	} );

	it( 'detects redirect loop', () => {
		const redirect1 = 'Redirect 1';
		const redirect2 = 'Redirect 2';
		const redirect3 = 'Redirect 3';
		const response = { query: { redirects: [
			{ from: redirect1, to: redirect2 },
			{ from: redirect2, to: redirect3 },
			{ from: redirect3, to: redirect1 },
		] } };
		expect( getResponsePageByTitle( response, redirect1 ) ).to.be.null;
	} );

	it( 'detects redirect loop not involving input title', () => {
		const redirect1 = 'Redirect 1';
		const redirect2 = 'Redirect 2';
		const redirect3 = 'Redirect 3';
		const inputTitle = 'Here we go';
		const response = { query: { redirects: [
			{ from: inputTitle, to: redirect1 },
			{ from: redirect1, to: redirect2 },
			{ from: redirect2, to: redirect3 },
			{ from: redirect3, to: redirect1 },
		] } };
		expect( getResponsePageByTitle( response, inputTitle ) ).to.be.null;
	} );

	it( 'finds page with normalized converted redirected title', () => {
		const title = 'Argettay';
		const page = { title };
		const convertedTitle = 'Edirectray';
		const normalizedTitle = 'Redirect';
		const inputTitle = 'redirect';
		const response = { query: {
			normalized: [
				{ from: inputTitle, to: normalizedTitle },
			],
			converted: [
				{ from: normalizedTitle, to: convertedTitle },
			],
			redirects: [
				{ from: convertedTitle, to: title },
			],
			pages: [ page ],
		} };
		expect( getResponsePageByTitle( response, inputTitle ) ).to.equal( page );
	} );

	it( 'returns missing title', () => {
		const title = 'No such page';
		const page = { title, missing: true };
		const response = { query: { pages: [ page ] } };
		expect( getResponsePageByTitle( response, title ) ).to.equal( page );
	} );

	it( 'returns invalid title', () => {
		const title = '<';
		const page = { title, invalid: true };
		const response = { query: { pages: [ page ] } };
		expect( getResponsePageByTitle( response, title ) ).to.equal( page );
	} );

	it( 'handles empty response', () => {
		const response = { batchcomplete: true /* no query */ };
		expect( getResponsePageByTitle( response, 'Title' ) ).to.be.null;
	} );

} );

describe( 'getResponsePageByPageId', () => {

	it( 'finds page with ID, formatversion=1', () => {
		const pageid = 123;
		const page = { pageid };
		const unrelatedPage = { pageid: 456 };
		const response = { query: { pages: { 456: unrelatedPage, [ pageid ]: page } } };
		expect( getResponsePageByPageId( response, pageid ) ).to.equal( page );
	} );

	it( 'finds page with ID, formatversion=2', () => {
		const pageid = 123;
		const page = { pageid };
		const unrelatedPage = { pageid: 456 };
		const response = { query: { pages: [ unrelatedPage, page ] } };
		expect( getResponsePageByPageId( response, pageid ) ).to.equal( page );
	} );

	it( 'does not find page with different ID, formatversion=1', () => {
		const pageid = 123;
		const page = { pageid };
		const response = { query: { pages: { [ pageid ]: page } } };
		const inputPageId = 456;
		expect( getResponsePageByPageId( response, inputPageId ) ).to.be.null;
	} );

	it( 'does not find page with different ID, formatversion=2', () => {
		const pageid = 123;
		const page = { pageid };
		const response = { query: { pages: [ page ] } };
		const inputPageId = 456;
		expect( getResponsePageByPageId( response, inputPageId ) ).to.be.null;
	} );

	for ( const paramType of [ String, Number ] ) {
		for ( const responseType of [ String, Number ] ) {
			it( `finds page with ${ responseType.name } ID using ${ paramType.name } ID`, () => {
				const pageid = 123;
				const page = { pageid: responseType( pageid ) };
				const response = { query: { pages: [ page ] } };
				expect( getResponsePageByPageId( response, paramType( pageid ) ) ).to.equal( page );
			} );
		}
	}

	it( 'returns missing page', () => {
		const pageid = 123;
		const page = { pageid, missing: true };
		const response = { query: { pages: [ page ] } };
		expect( getResponsePageByPageId( response, pageid ) ).to.equal( page );
	} );

	it( 'handles empty response', () => {
		const response = { batchcomplete: true /* no query */ };
		expect( getResponsePageByPageId( response, 123 ) ).to.be.null;
	} );

} );

describe( 'getResponseRevisionByRevisionId', () => {

	it( 'finds revision with ID, formatversion=1', () => {
		const revid = 123;
		const revision = { revid };
		const unrelatedRevision = { revid: 456 };
		const page = { revisions: [ revision, unrelatedRevision ] };
		const unrelatedPage = { revisions: [ { revid: 789 } ] };
		const response = { query: { pages: { 34: unrelatedPage, 12: page } } };
		expect( getResponseRevisionByRevisionId( response, revid ) ).to.eql( revision );
	} );

	it( 'finds revision with ID, formatversion=2', () => {
		const revid = 123;
		const revision = { revid };
		const unrelatedRevision = { revid: 456 };
		const page = { revisions: [ revision, unrelatedRevision ] };
		const unrelatedPage = { revisions: [ { revid: 789 } ] };
		const response = { query: { pages: [ unrelatedPage, page ] } };
		expect( getResponseRevisionByRevisionId( response, revid ) ).to.eql( revision );
	} );

	it( 'does not find revision with different ID', () => {
		const revid = 123;
		const revision = { revid };
		const page = { revisions: [ revision ] };
		const response = { query: { pages: [ page ] } };
		const inputRevisionId = 456;
		expect( getResponseRevisionByRevisionId( response, inputRevisionId ) ).to.be.null;
	} );

	for ( const paramType of [ String, Number ] ) {
		for ( const responseType of [ String, Number ] ) {
			it( `finds revision with ${ responseType.name } ID using ${ paramType.name } ID`, () => {
				const revid = 123;
				const revision = { revid: responseType( revid ) };
				const page = { revisions: [ revision ] };
				const response = { query: { pages: [ page ] } };
				expect( getResponseRevisionByRevisionId( response, paramType( revid ) ) )
					.to.eql( revision );
			} );
		}
	}

	describe( 'returns missing revision', () => {

		it( 'with "missing" in badrevids', () => {
			const revid = 123;
			const revision = { revid, missing: true };
			const response = { query: { badrevids: { [ revid ]: revision } } };
			expect( getResponseRevisionByRevisionId( response, revid ) ).to.eql( revision );
		} );

		const revid = 123;
		for ( const [ responseDescription, response, expected ] of [
			[ 'formatversion=1 + pages', { query: { pages: {} } }, { revid, missing: '' } ],
			[ 'formatversion=1 + batchcomplete', { batchcomplete: '' }, { revid, missing: '' } ],
			[ 'formatversion=2 + pages', { query: { pages: [] } }, { revid, missing: true } ],
			[ 'formatversion=2 + batchcomplete', { batchcomplete: true }, { revid, missing: true } ],
		] ) {
			it( `adds "missing" to ${ responseDescription } response`, () => {
				const revision = { revid };
				response.query = response.query || {};
				response.query.badrevids = { [ revid ]: revision };
				expect( getResponseRevisionByRevisionId( response, revid ) ).to.eql( expected );
			} );
		}

	} );

	it( 'handles empty response', () => {
		const response = { batchcomplete: true /* no query */ };
		expect( getResponseRevisionByRevisionId( response, 123 ) ).to.be.null;
	} );

	describe( 'attaches page using pageOfRevision', () => {

		it( 'page without revisions, using correct property descriptor', () => {
			const revid = 123;
			const revision = { revid };
			const page = { pageid: 456, revisions: [ revision ] };
			const response = { query: { pages: [ page ] } };
			expect( getResponseRevisionByRevisionId( response, revid ) )
				.to.have.ownPropertyDescriptor( pageOfRevision, {
					value: { pageid: 456 /* no revisions */ },
					configurable: true,
					enumerable: false,
					writable: true,
				} );
		} );

		it( 'not on missing revision', () => {
			const revid = 123;
			const revision = { revid, missing: true };
			const response = { query: { badrevids: { [ revid ]: revision } } };
			expect( getResponseRevisionByRevisionId( response, revid ) )
				.not.to.have.property( pageOfRevision );
		} );

	} );

} );

/**
 * Creates an object like a jQuery Deferred:
 * a thenable with externally callable resolve() and reject() methods.
 *
 * @return {Promise}
 */
function deferred() {
	let resolve, reject;
	const promise = new Promise( ( resolve_, reject_ ) => {
		resolve = resolve_;
		reject = reject_;
	} );
	promise.resolve = resolve;
	promise.reject = reject;
	return promise;
}

class BaseTestSession extends Session {

	constructor() {
		super( 'https://en.wikipedia.org', {}, {
			warn() {
				throw new Error( 'warn() should not be called in this test' );
			},
			userAgent: 'm3api-query-unit-test',
		} );
	}

	internalGet() {
		throw new Error( 'internalGet() should not be called in this test' );
	}

	internalPost() {
		throw new Error( 'internalPost() should not be called in this test' );
	}

}

function successfulResponse( body ) {
	return {
		status: 200,
		headers: {},
		body,
	};
}

function singleGetSession( expectedParams, response ) {
	let called = false;
	class TestSession extends BaseTestSession {
		async internalGet( apiUrl, params ) {
			expect( called, 'internalGet already called' ).to.be.false;
			called = true;
			if ( expectedParams ) {
				expectedParams.format = 'json';
				expect( params ).to.eql( expectedParams );
			}
			return successfulResponse( response );
		}
	}
	return new TestSession();
}

function sequentialGetSession( expectedCalls ) {
	expectedCalls.reverse();
	class TestSession extends BaseTestSession {
		async internalGet( apiUrl, params ) {
			expect( expectedCalls, 'remaining expected calls' ).to.not.be.empty;
			const { expectedParams, response } = await expectedCalls.splice( -1 )[ 0 ];
			if ( expectedParams ) {
				expectedParams.format = 'json';
				expect( params ).to.eql( expectedParams );
			}
			return successfulResponse( response );
		}
	}
	return new TestSession();
}

describe( 'queryPartialPageByTitle', () => {

	it( 'adds default params and returns page', async () => {
		const title = 'Title';
		const page = { title };
		const response = { query: { pages: [ page ] } };
		const expectedParams = { action: 'query', titles: title };
		const session = singleGetSession( expectedParams, response );
		expect( await queryPartialPageByTitle( session, title ) ).to.equal( page );
	} );

	it( 'allows action=query in params', async () => {
		const title = 'Title';
		const page = { title };
		const response = { query: { pages: [ page ] } };
		const expectedParams = { action: 'query', titles: title };
		const session = singleGetSession( expectedParams, response );
		expect( await queryPartialPageByTitle( session, title, { action: 'query' } ) ).to.equal( page );
	} );

	it( 'disallows other action in params', async () => {
		const title = 'Title';
		const session = new BaseTestSession();
		await expect( queryPartialPageByTitle( session, title, { action: 'purge' } ) )
			.to.be.rejected;
	} );

	it( 'disallows generator in params', async () => {
		const title = 'Title';
		const session = new BaseTestSession();
		await expect( queryPartialPageByTitle( session, title, { generator: 'links' } ) )
			.to.be.rejected;
	} );

	for ( const [ type, params ] of [
		[ 'set', ( title ) => ( { titles: set( title ) } ) ],
		[ 'array', ( title ) => ( { titles: [ title ] } ) ],
		[ 'string', ( title ) => ( { titles: title } ) ],
	] ) {

		it( `handles existing same title ${ type } in params`, async () => {
			const title = 'Title';
			const page = { title };
			const response = { query: { pages: [ page ] } };
			const expectedParams = { action: 'query', titles: title };
			const session = singleGetSession( expectedParams, response );
			const inputParams = params( title );
			expect( await queryPartialPageByTitle( session, title, inputParams ) ).to.equal( page );
			expect( inputParams, 'params modified' ).to.eql( params( title ) );
		} );

		it( `adds to existing other title ${ type } in params`, async () => {
			const title = 'Title';
			const page = { title };
			const otherTitle = 'Other title';
			const otherPage = { title: otherTitle };
			const response = { query: { pages: [ page, otherPage ] } };
			const expectedParams = { action: 'query', titles: `${ otherTitle }|${ title }` };
			const session = singleGetSession( expectedParams, response );
			const inputParams = params( otherTitle );
			expect( await queryPartialPageByTitle( session, title, inputParams ) ).to.equal( page );
			expect( inputParams, 'params modified' ).to.eql( params( otherTitle ) );
		} );

	}

	it( 'passes through options', async () => {
		const title = 'Title';
		const page = { title };
		const response = { query: { pages: [ page ] } };
		const expectedParams = { action: 'query', titles: title, format: 'json' };
		let called = false;
		class TestSession extends BaseTestSession {
			async internalPost( apiUrl, urlParams, bodyParams ) {
				expect( called, 'internalPost already called' ).to.be.false;
				called = true;
				expect( { ...urlParams, ...bodyParams } ).to.eql( expectedParams );
				return successfulResponse( response );
			}
		}
		const session = new TestSession();
		expect( await queryPartialPageByTitle( session, title, {}, { method: 'POST' } ) ).to.equal( page );
	} );

} );

describe( 'queryIncrementalPageByTitle', () => {

	// all the param handling is already covered by the queryPartialPageByTitle tests

	it( 'returns two versions of page', async () => {
		const title1 = 'Title 1';
		const page1A = { title: title1, extra: 'data' };
		const page1B = { title: title1 };
		const title2 = 'Title 2';
		const page2A = { title: title2 };
		const page2B = { title: title2, extra: 'data' };
		const responseA = { query: { pages: [ page1A, page2A ] }, continue: { continue: title2 } };
		const responseB = { query: { pages: [ page1B, page2B ] }, batchcomplete: true };
		let call = 0;
		class TestSession extends BaseTestSession {
			async internalGet( apiUrl, params ) {
				switch ( ++call ) {
					case 1:
						expect( params ).to.eql( {
							action: 'query',
							titles: `${ title1 }|${ title2 }`,
							format: 'json',
						} );
						return successfulResponse( responseA );
					case 2:
						expect( params ).to.eql( {
							action: 'query',
							titles: `${ title1 }|${ title2 }`,
							continue: title2,
							format: 'json',
						} );
						return successfulResponse( responseB );
					default:
						throw new Error( `Unexpected call #${ call }` );
				}
			}
		}

		const session = new TestSession();
		let iteration = 0;
		for await ( const response of queryIncrementalPageByTitle(
			session,
			title2,
			{ titles: title1 },
		) ) {
			switch ( ++iteration ) {
				case 1:
					expect( response ).to.equal( page2A );
					break;
				case 2:
					expect( response ).to.equal( page2B );
					break;
				default:
					throw new Error( `Unexpected iteration #${ iteration }` );
			}
		}

		expect( call ).to.equal( 2 );
		expect( iteration ).to.equal( 2 );
	} );

} );

describe( 'queryFullPageByTitle', () => {

	it( 'returns a single page', async () => {
		const title = 'Title';
		const page = { title };
		const response = { query: { pages: [ page ] }, batchcomplete: true };
		const expectedParams = { action: 'query', titles: title };
		const session = singleGetSession( expectedParams, response );
		expect( await queryFullPageByTitle( session, title ) ).to.eql( page );
	} );

	it( 'merges the same page into itself', async () => {
		const title = 'Title';
		const page = { title, pageid: 123, boolean: true };
		const session = sequentialGetSession( [
			{
				expectedParams: { action: 'query', titles: title },
				response: { query: { pages: [ page ] }, continue: { continue: 'c' } },
			},
			{
				expectedParams: { action: 'query', titles: title, continue: 'c' },
				response: { query: { pages: [ page ] }, batchcomplete: true },
			},
		] );
		expect( await queryFullPageByTitle( session, title ) ).to.eql( page );
	} );

	it( 'combines objects', async () => {
		const title = 'Title';
		const session = sequentialGetSession( [
			{
				expectedParams: { action: 'query', titles: title },
				response: { query: { pages: [ {
					title,
					pageassessments: {
						'Assessment A': {
							class: 'C',
						},
					},
					pageprops: {
						propA: 'A',
						propB: 'B',
					},
				} ] }, continue: { continue: 'c' } },
			},
			{
				expectedParams: { action: 'query', titles: title, continue: 'c' },
				response: { query: { pages: [ {
					title,
					pageassessments: {
						'Assessment A': {
							importance: 'i',
						},
						'Assessment B': {
							class: 'X',
							importance: 'I',
						},
					},
					pageprops: {
						propB: 'B',
						propC: 'C',
					},
				} ] }, batchcomplete: true },
			},
		] );
		expect( await queryFullPageByTitle( session, title ) ).to.eql( {
			title,
			pageassessments: {
				'Assessment A': {
					class: 'C',
					importance: 'i',
				},
				'Assessment B': {
					class: 'X',
					importance: 'I',
				},
			},
			pageprops: {
				propA: 'A',
				propB: 'B',
				propC: 'C',
			},
		} );
	} );

	it( 'concatenates arrays', async () => {
		const title = 'Title';
		const session = sequentialGetSession( [
			{
				expectedParams: { action: 'query', titles: title },
				response: { query: { pages: [ {
					title,
					links: [ { title: 'Link 1' } ],
					extlinks: [ { url: 'https://example.com/1' } ],
				} ] }, continue: { plcontinue: '2', elcontinue: '2' } },
			},
			{
				expectedParams: { action: 'query', titles: title, plcontinue: '2', elcontinue: '2' },
				response: { query: { pages: [ {
					title,
					links: [ { title: 'Link 2' } ],
					extlinks: [ { url: 'https://example.com/2' } ],
				} ] }, continue: { plcontinue: '3', elcontinue: '3' } },
			},
			{
				expectedParams: { action: 'query', titles: title, plcontinue: '3', elcontinue: '3' },
				response: { query: { pages: [ {
					title,
					links: [ { title: 'Link 3' } ],
					extlinks: [ { url: 'https://example.com/3' } ],
				} ] }, continue: { plcontinue: '4' } },
			},
			{
				expectedParams: { action: 'query', titles: title, plcontinue: '4' },
				response: { query: { pages: [ {
					title,
					links: [ { title: 'Link 4' } ],
				} ] }, batchcomplete: true },
			},
		] );
		expect( await queryFullPageByTitle( session, title ) ).to.eql( {
			title,
			links: [
				{ title: 'Link 1' },
				{ title: 'Link 2' },
				{ title: 'Link 3' },
				{ title: 'Link 4' },
			],
			extlinks: [
				{ url: 'https://example.com/1' },
				{ url: 'https://example.com/2' },
				{ url: 'https://example.com/3' },
			],
		} );
	} );

	describe( 'default mergeValues behavior', () => {

		const title = 'Title';
		for ( const { name, pageA, pageB, expected } of [
			{
				name: 'different pageid numbers',
				pageA: { title, pageid: 1 },
				pageB: { title, pageid: 2 },
				expected: { title, pageid: 1 },
			},
			{
				name: 'different contentmodel strings',
				pageA: { title, contentmodel: 'wikitext' },
				pageB: { title, contentmodel: 'json' },
				expected: { title, contentmodel: 'wikitext' },
			},
			{
				name: 'different wikibase-shortdesc pageprops',
				pageA: { title, pageprops: { 'wikibase-shortdesc': 'desc 1' } },
				pageB: { title, pageprops: { 'wikibase-shortdesc': 'desc 2' } },
				expected: { title, pageprops: { 'wikibase-shortdesc': 'desc 1' } },
			},
		] ) {
			it( name, async () => {
				const session = sequentialGetSession( [
					{
						expectedParams: { action: 'query', titles: title },
						response: { query: { pages: [ pageA ] }, continue: { continue: 'c' } },
					},
					{
						expectedParams: { action: 'query', titles: title, continue: 'c' },
						response: { query: { pages: [ pageB ] }, batchcomplete: true },
					},
				] );
				const page = await queryFullPageByTitle( session, title );
				expect( page ).to.eql( expected );
			} );
		}

	} );

	it( 'calls custom mergeValues callback', async () => {
		let called = false;
		function mergeValues( baseValue, incrementalValue, path, base, key ) {
			expect( called, 'mergeValues already called' ).to.be.false;
			called = true;
			expect( baseValue ).to.equal( 1 );
			expect( incrementalValue ).to.equal( 2 );
			expect( path ).to.equal( 'a.b' );
			expect( base ).to.eql( { b: 1 } );
			expect( key ).to.equal( 'b' );
			base[ `-test-${ key }` ] = [ baseValue, incrementalValue ];
			return baseValue + incrementalValue;
		}

		const title = 'Title';
		const session = sequentialGetSession( [
			{
				expectedParams: { action: 'query', titles: title },
				response: { query: { pages: [ { title, a: { b: 1 } } ] }, continue: { c: 'c' } },
			},
			{
				expectedParams: { action: 'query', titles: title, c: 'c' },
				response: { query: { pages: [ { title, a: { b: 2 } } ] }, batchcomplete: true },
			},
		] );
		const page = await queryFullPageByTitle(
			session,
			title,
			{},
			{ 'm3api-query/mergeValues': mergeValues },
		);
		expect( page ).to.eql( { title, a: { b: 3, '-test-b': [ 1, 2 ] } } );
		expect( called ).to.be.true;
	} );

	describe( 'default mergeValues error reporting', () => {

		const title = 'Title';
		for ( const { name, pageA, pageB, path } of [
			{
				name: 'different deeply nested booleans',
				pageA: { title, a: { b: { c: { d: true } } } },
				pageB: { title, a: { b: { c: { d: false } } } },
				path: 'a.b.c.d',
			},
			{
				name: 'array and object',
				pageA: { title, x: [] },
				pageB: { title, x: {} },
				path: 'x',
			},
			{
				name: 'object and array',
				pageA: { title, y: {} },
				pageB: { title, y: [] },
				path: 'y',
			},
			{
				name: 'null and nonnull',
				pageA: { title, n: null },
				pageB: { title, n: '' },
				path: 'n',
			},
			{
				name: 'string and number',
				pageA: { title, piInt: '3' },
				pageB: { title, piInt: 3 },
				path: 'piInt',
			},
		] ) {
			it( name, async () => {
				const session = sequentialGetSession( [
					{
						expectedParams: { action: 'query', titles: title },
						response: { query: { pages: [ pageA ] }, continue: { continue: 'c' } },
					},
					{
						expectedParams: { action: 'query', titles: title, continue: 'c' },
						response: { query: { pages: [ pageB ] }, batchcomplete: true },
					},
				] );
				await expect( queryFullPageByTitle( session, title ) )
					.to.be.rejectedWith( path );
			} );
		}

	} );

} );

describe( 'queryPartialPageByPageId', () => {

	// subset of the queryPartialPageByTitle tests

	it( 'adds default params and returns page', async () => {
		const pageid = '123';
		const page = { pageid };
		const response = { query: { pages: [ page ] } };
		const expectedParams = { action: 'query', pageids: pageid };
		const session = singleGetSession( expectedParams, response );
		expect( await queryPartialPageByPageId( session, pageid ) ).to.equal( page );
	} );

	it( 'disallows generator in params', async () => {
		const pageid = '123';
		const session = new BaseTestSession();
		await expect( queryPartialPageByPageId( session, pageid, { generator: 'links' } ) )
			.to.be.rejected;
	} );

	for ( const [ container, params ] of [
		[ 'Set', ( pageid ) => ( { pageids: set( pageid ) } ) ],
		[ 'Array', ( pageid ) => ( { pageids: [ pageid ] } ) ],
		[ '(unwrapped)', ( pageid ) => ( { pageids: pageid } ) ],
	] ) {

		for ( const [ existingType, extraType ] of [
			[ Number, Number ],
			[ Number, String ],
			[ String, Number ],
			[ String, String ],
		] ) {

			it( `does not duplicate existing page ID ${ existingType.name } ${ container } given ${ extraType.name }`, async () => {
				const pageid = '123';
				const page = { pageid };
				const response = { query: { pages: [ page ] } };
				const expectedParams = { action: 'query', pageids: pageid };
				const session = singleGetSession( expectedParams, response );
				const inputPageId = extraType( pageid );
				const inputParams = params( existingType( pageid ) );
				expect( await queryPartialPageByPageId( session, inputPageId, inputParams ) )
					.to.equal( page );
				expect( inputParams, 'params modified' )
					.to.eql( params( existingType( pageid ) ) );
			} );

			it( `adds to existing other page ID ${ existingType.name } ${ container } given ${ extraType.name }`, async () => {
				const pageid = '123';
				const page = { pageid };
				const otherPageId = '456';
				const otherPage = { pageid: otherPageId };
				const response = { query: { pages: [ page, otherPage ] } };
				const expectedParams = { action: 'query', pageids: `${ otherPageId }|${ pageid }` };
				const session = singleGetSession( expectedParams, response );
				const inputPageId = extraType( pageid );
				const inputParams = params( existingType( otherPageId ) );
				expect( await queryPartialPageByPageId( session, inputPageId, inputParams ) )
					.to.equal( page );
				expect( inputParams, 'params modified' )
					.to.eql( params( existingType( otherPageId ) ) );
			} );

		}

		// precision tests
		// (as numbers, 123456789123456789 = 123456789123456788 = 123456789123456780)

		for ( const [ existing, extra ] of [
			[ '123456789123456789', '123456789123456789' ],
			[ 123456789123456780, '123456789123456780' ],
		] ) {

			it( `does not duplicate existing page ID ${ existing } ${ typeof existing } ${ container } given ${ extra } ${ typeof extra }`, async () => {
				const page = { pageid: existing };
				const response = { query: { pages: [ page ] } };
				const expectedParams = { action: 'query', pageids: String( existing ) };
				const session = singleGetSession( expectedParams, response );
				const inputParams = params( existing );
				expect( await queryPartialPageByPageId( session, extra, inputParams ) )
					.to.equal( page );
				expect( inputParams, 'params modified' )
					.to.eql( params( existing ) );
			} );

		}

		for ( const [ existing, extra ] of [
			[ '123456789123456789', '123456789123456788' ],
			[ '123456789123456789', 123456789123456780 ],
			[ 123456789123456780, '123456789123456789' ],
		] ) {

			it( `adds to existing other page ID ${ existing } ${ typeof existing } ${ container } given ${ extra } ${ typeof extra }`, async () => {
				const page = { pageid: String( extra ) };
				const otherPage = { pageid: String( existing ) };
				const response = { query: { pages: [ page, otherPage ] } };
				const expectedParams = { action: 'query', pageids: `${ existing }|${ extra }` };
				const session = singleGetSession( expectedParams, response );
				const inputParams = params( existing );
				expect( await queryPartialPageByPageId( session, extra, inputParams ) )
					.to.equal( page );
				expect( inputParams, 'params modified' )
					.to.eql( params( existing ) );
			} );

		}

	}

	it( 'passes through options', async () => {
		const pageid = '123';
		const page = { pageid };
		const response = { query: { pages: [ page ] } };
		const expectedParams = { action: 'query', pageids: pageid, format: 'json' };
		let called = false;
		class TestSession extends BaseTestSession {
			async internalPost( apiUrl, urlParams, bodyParams ) {
				expect( called, 'internalPost already called' ).to.be.false;
				called = true;
				expect( { ...urlParams, ...bodyParams } ).to.eql( expectedParams );
				return successfulResponse( response );
			}
		}
		const session = new TestSession();
		expect( await queryPartialPageByPageId( session, pageid, {}, { method: 'POST' } ) ).to.equal( page );
	} );

} );

describe( 'queryIncrementalPageByPageId', () => {

	it( 'returns two versions of page', async () => {
		const pageId1 = '123';
		const page1A = { pageid: pageId1, extra: 'data' };
		const page1B = { pageid: pageId1 };
		const pageId2 = '456';
		const page2A = { pageid: pageId2 };
		const page2B = { pageid: pageId2, extra: 'data' };
		const responseA = { query: { pages: [ page1A, page2A ] }, continue: { continue: pageId2 } };
		const responseB = { query: { pages: [ page1B, page2B ] }, batchcomplete: true };
		let call = 0;
		class TestSession extends BaseTestSession {
			async internalGet( apiUrl, params ) {
				switch ( ++call ) {
					case 1:
						expect( params ).to.eql( {
							action: 'query',
							pageids: `${ pageId1 }|${ pageId2 }`,
							format: 'json',
						} );
						return successfulResponse( responseA );
					case 2:
						expect( params ).to.eql( {
							action: 'query',
							pageids: `${ pageId1 }|${ pageId2 }`,
							continue: pageId2,
							format: 'json',
						} );
						return successfulResponse( responseB );
					default:
						throw new Error( `Unexpected call #${ call }` );
				}
			}
		}

		const session = new TestSession();
		let iteration = 0;
		for await ( const response of queryIncrementalPageByPageId(
			session,
			pageId2,
			{ pageids: pageId1 },
		) ) {
			switch ( ++iteration ) {
				case 1:
					expect( response ).to.equal( page2A );
					break;
				case 2:
					expect( response ).to.equal( page2B );
					break;
				default:
					throw new Error( `Unexpected iteration #${ iteration }` );
			}
		}

		expect( call ).to.equal( 2 );
		expect( iteration ).to.equal( 2 );
	} );

} );

describe( 'queryFullPageByPageId', () => {

	// subset of the queryFullPageByTitle tests

	it( 'combines objects', async () => {
		const pageid = '123';
		const session = sequentialGetSession( [
			{
				expectedParams: { action: 'query', pageids: pageid },
				response: { query: { pages: [ {
					pageid,
					pageassessments: {
						'Assessment A': {
							class: 'C',
						},
					},
					pageprops: {
						propA: 'A',
						propB: 'B',
					},
				} ] }, continue: { continue: 'c' } },
			},
			{
				expectedParams: { action: 'query', pageids: pageid, continue: 'c' },
				response: { query: { pages: [ {
					pageid,
					pageassessments: {
						'Assessment A': {
							importance: 'i',
						},
						'Assessment B': {
							class: 'X',
							importance: 'I',
						},
					},
					pageprops: {
						propB: 'B',
						propC: 'C',
					},
				} ] }, batchcomplete: true },
			},
		] );
		expect( await queryFullPageByPageId( session, pageid ) ).to.eql( {
			pageid,
			pageassessments: {
				'Assessment A': {
					class: 'C',
					importance: 'i',
				},
				'Assessment B': {
					class: 'X',
					importance: 'I',
				},
			},
			pageprops: {
				propA: 'A',
				propB: 'B',
				propC: 'C',
			},
		} );
	} );

} );

describe( 'queryPotentialRevisionByRevisionId', () => {

	it( 'adds default params and returns revision with page attached', async () => {
		const revisionId = '123';
		const revision = { revid: revisionId };
		const page = { pageid: 456, revisions: [ revision ] };
		const response = { query: { pages: [ page ] } };
		const expectedParams = { action: 'query', revids: revisionId, prop: 'revisions' };
		const session = singleGetSession( expectedParams, response );
		let iteration = 0;
		for await ( const response of queryPotentialRevisionByRevisionId( session, revisionId ) ) {
			switch ( ++iteration ) {
				case 1:
					expect( response ).to.eql( revision );
					expect( response[ pageOfRevision ] ).to.eql( { pageid: 456 } );
					break;
				default:
					throw new Error( `Unexpected iteration #${ iteration }` );
			}
		}

		expect( iteration ).to.equal( 1 );
	} );

	it( 'adds to existing params', async () => {
		const revisionId = '123';
		const revision = { revid: revisionId };
		const otherRevisionId = '456';
		const otherRevision = { revid: otherRevisionId };
		const page = { revisions: [ revision, otherRevision ] };
		const response = { query: { pages: [ page ] } };
		const expectedParams = {
			action: 'query',
			revids: `${ otherRevisionId }|${ revisionId }`,
			prop: 'otherprop|revisions',
		};
		const session = singleGetSession( expectedParams, response );
		let iteration = 0;
		for await ( const response of queryPotentialRevisionByRevisionId(
			session,
			revisionId,
			{ revids: set( otherRevisionId ), prop: set( 'otherprop' ) },
		) ) {
			switch ( ++iteration ) {
				case 1:
					expect( response ).to.eql( revision );
					break;
				default:
					throw new Error( `Unexpected iteration #${ iteration }` );
			}
		}

		expect( iteration ).to.equal( 1 );
	} );

	it( 'returns nulls until revision is found', async () => {
		const revisionId = '123';
		const revision = { revid: revisionId };
		const otherRevisionA = { revid: '456' };
		const otherRevisionB = { revid: '789' };
		const response1 = {
			query: { pages: [ { revisions: [ otherRevisionA ] } ] },
			continue: { continue: 'B' },
		};
		const response2 = {
			query: { pages: [ { revisions: [ otherRevisionB ] } ] },
			continue: { continue: 'C' },
		};
		const response3 = {
			query: { pages: [ { revisions: [ revision ] } ] },
			batchcomplete: true,
		};
		let call = 0;
		class TestSession extends BaseTestSession {
			async internalGet( apiUrl, params ) {
				switch ( ++call ) {
					case 1:
						expect( params ).to.eql( {
							action: 'query',
							revids: revisionId,
							prop: 'revisions',
							format: 'json',
						} );
						return successfulResponse( response1 );
					case 2:
						expect( params ).to.eql( {
							action: 'query',
							revids: revisionId,
							prop: 'revisions',
							continue: 'B',
							format: 'json',
						} );
						return successfulResponse( response2 );
					case 3:
						expect( params ).to.eql( {
							action: 'query',
							revids: revisionId,
							prop: 'revisions',
							continue: 'C',
							format: 'json',
						} );
						return successfulResponse( response3 );
					default:
						throw new Error( `Unexpected call #${ call }` );
				}
			}
		}

		const session = new TestSession();
		let iteration = 0;
		for await ( const response of queryPotentialRevisionByRevisionId(
			session,
			revisionId,
		) ) {
			switch ( ++iteration ) {
				case 1:
				case 2:
					expect( response ).to.be.null;
					break;
				case 3:
					expect( response ).to.eql( revision );
					break;
				default:
					throw new Error( `Unexpected iteration #${ iteration }` );
			}
		}

		expect( call ).to.equal( 3 );
		expect( iteration ).to.equal( 3 );
	} );

	it( 'drops truncated result warning', async () => {
		const revisionId = '123';
		const revision = { revid: revisionId };
		const page = { revisions: [ revision ] };
		const response = { query: { pages: [ page ] }, warnings: [ { code: 'truncatedresult' } ] };
		const expectedParams = {
			action: 'query',
			revids: revisionId,
			prop: 'revisions',
		};
		const session = singleGetSession( expectedParams, response );
		let iteration = 0;
		for await ( const response of queryPotentialRevisionByRevisionId(
			session,
			revisionId,
		) ) {
			switch ( ++iteration ) {
				case 1:
					expect( response ).to.eql( revision );
					break;
				default:
					throw new Error( `Unexpected iteration #${ iteration }` );
			}
		}

		expect( iteration ).to.equal( 1 );
	} );

} );

describe( 'queryFullRevisionByRevisionId', () => {

	// param handling already covered by the queryPotentialRevisionByRevisionId tests

	it( 'returns first found revision with page attached', async () => {
		const revisionId = '123';
		const revision = { revid: revisionId };
		const otherRevisionA = { revid: '456' };
		const otherRevisionB = { revid: '789' };
		const response1 = {
			query: { pages: [ { revisions: [ otherRevisionA ] } ] },
			continue: { continue: 'B' },
		};
		const response2 = {
			query: { pages: [ { revisions: [ otherRevisionB ] } ] },
			continue: { continue: 'C' },
		};
		const response3 = {
			query: { pages: [ { revisions: [ revision ], pageid: 12345 } ] },
			continue: { continue: 'D' }, // should not follow this continuation
		};
		let call = 0;
		class TestSession extends BaseTestSession {
			async internalGet( apiUrl, params ) {
				switch ( ++call ) {
					case 1:
						expect( params ).to.eql( {
							action: 'query',
							revids: revisionId,
							prop: 'revisions',
							format: 'json',
						} );
						return successfulResponse( response1 );
					case 2:
						expect( params ).to.eql( {
							action: 'query',
							revids: revisionId,
							prop: 'revisions',
							continue: 'B',
							format: 'json',
						} );
						return successfulResponse( response2 );
					case 3:
						expect( params ).to.eql( {
							action: 'query',
							revids: revisionId,
							prop: 'revisions',
							continue: 'C',
							format: 'json',
						} );
						return successfulResponse( response3 );
					default:
						throw new Error( `Unexpected call #${ call }` );
				}
			}
		}

		const session = new TestSession();
		const returnedRevision = await queryFullRevisionByRevisionId( session, revisionId );
		expect( returnedRevision ).to.eql( revision );
		expect( returnedRevision[ pageOfRevision ] ).to.eql( { pageid: 12345 } );
	} );

	it( 'drops truncated result warning', async () => {
		const revisionId = '123';
		const revision = { revid: revisionId };
		const page = { revisions: [ revision ] };
		const response = {
			query: { pages: [ page ] },
			warnings: [ { code: 'truncatedresult' } ],
			batchcomplete: true,
		};
		const expectedParams = {
			action: 'query',
			revids: revisionId,
			prop: 'revisions',
		};

		const session = singleGetSession( expectedParams, response );
		expect( await queryFullRevisionByRevisionId( session, revisionId ) ).to.eql( revision );
	} );

} );

describe( 'queryFullPages', () => {

	it( 'follows continuation and returns full pages', async () => {
		const session = sequentialGetSession( [
			{
				expectedParams: { action: 'query', generator: 'ap', prop: 'i|d' },
				response: { query: { pages: [
					{ pageid: 1, contentmodel: 'wikitext', description: 'Page 1' },
					{ pageid: 2, contentmodel: 'wikitext' },
				] }, continue: { ic: '-', dc: '2' } },
			},
			{
				expectedParams: { action: 'query', generator: 'ap', prop: 'i|d', ic: '-', dc: '2' },
				response: { query: { pages: [
					{ pageid: 1 },
					{ pageid: 2, description: 'Page 2' },
				] }, continue: { gapc: '3' }, batchcomplete: true },
			},
			{
				expectedParams: { action: 'query', generator: 'ap', prop: 'i|d', gapc: '3' },
				response: { query: { pages: [
					{ pageid: 3, contentmodel: 'wikitext', description: 'Page 3' },
					{ pageid: 4 },
				] }, continue: { gapc: '3', ic: '4', dc: '4' } },
			},
			{
				expectedParams: { action: 'query', generator: 'ap', prop: 'i|d', gapc: '3', ic: '4', dc: '4' },
				response: { query: { pages: [
					{ pageid: 3 },
					{ pageid: 4, contentmodel: 'wikitext', description: 'Page 4' },
				] }, batchcomplete: true },
			},
		] );

		let iteration = 0;
		for await ( const page of queryFullPages( session, {
			generator: 'ap', // “allpages”, abbreviated for shorter (one-line) expectedParams above
			prop: [ 'i', 'd' ], // “info” and “description”, likewise abbreviated
		} ) ) {
			switch ( ++iteration ) {
				case 1:
					expect( page ).to.eql( {
						pageid: 1,
						contentmodel: 'wikitext',
						description: 'Page 1',
					} );
					break;
				case 2:
					expect( page ).to.eql( {
						pageid: 2,
						contentmodel: 'wikitext',
						description: 'Page 2',
					} );
					break;
				case 3:
					expect( page ).to.eql( {
						pageid: 3,
						contentmodel: 'wikitext',
						description: 'Page 3',
					} );
					break;
				case 4:
					expect( page ).to.eql( {
						pageid: 4,
						contentmodel: 'wikitext',
						description: 'Page 4',
					} );
					break;
				default:
					throw new Error( `Unexpected iteration #${ iteration }` );
			}
		}

		expect( iteration ).to.equal( 4 );
	} );

	it( 'distinguishes missing pages by title', async () => {
		const session = sequentialGetSession( [
			{
				expectedParams: { action: 'query', generator: 's', s: '?' },
				response: { query: { pages: [
					{ pageid: 0, missing: true, title: 'A', extra: 'a' },
					{ pageid: 0, missing: true, title: 'B' },
				] }, continue: { so: '1' } },
			},
			{
				expectedParams: { action: 'query', generator: 's', s: '?', so: '1' },
				response: { query: { pages: [
					{ pageid: 0, missing: true, title: 'A' },
					{ pageid: 0, missing: true, title: 'B', extra: 'b' },
				] }, batchcomplete: true },
			},
		] );

		let iteration = 0;
		for await ( const page of queryFullPages( session, { generator: 's', s: '?' } ) ) {
			switch ( ++iteration ) {
				case 1:
					expect( page ).to.eql( {
						pageid: 0,
						missing: true,
						title: 'A',
						extra: 'a',
					} );
					break;
				case 2:
					expect( page ).to.eql( {
						pageid: 0,
						missing: true,
						title: 'B',
						extra: 'b',
					} );
					break;
				default:
					throw new Error( `Unexpected iteration #${ iteration }` );
			}
		}

		expect( iteration ).to.equal( 2 );
	} );

	it( 'sorts pages per batch according to option', async () => {
		const session = sequentialGetSession( [
			{
				expectedParams: { action: 'query', generator: 'ap', prop: 'i' },
				response: { query: { pages: [
					{ pageid: 30 },
					{ pageid: 10 },
					{ pageid: 20 },
				] }, continue: { gapc: '3' }, batchcomplete: true },
			},
			{
				expectedParams: { action: 'query', generator: 'ap', prop: 'i', gapc: '3' },
				response: { query: { pages: [
					{ pageid: 5 },
					// no pageid: 4 in this response
				] }, continue: { gapc: '3', ic: '2' } },
			},
			{
				expectedParams: { action: 'query', generator: 'ap', prop: 'i', gapc: '3', ic: '2' },
				response: { query: { pages: [
					{ pageid: 4 },
					// no pageid: 5 in this response (but we pretend it’s the same batch as before)
				] }, batchcomplete: true },
			},
		] );

		let iteration = 0;
		for await ( const page of queryFullPages( session, {
			generator: 'ap', // “allpages”, abbreviated for shorter (one-line) expectedParams above
			prop: [ 'i' ], // “info”, likewise abbreviated
		}, {
			'm3api-query/comparePages': ( { pageid: p1 }, { pageid: p2 } ) => p1 - p2,
		} ) ) {
			switch ( ++iteration ) {
				case 1:
					expect( page ).to.eql( { pageid: 10 } );
					break;
				case 2:
					expect( page ).to.eql( { pageid: 20 } );
					break;
				case 3:
					expect( page ).to.eql( { pageid: 30 } );
					break;
				case 4:
					expect( page ).to.eql( { pageid: 4 } );
					break;
				case 5:
					expect( page ).to.eql( { pageid: 5 } );
					break;
				default:
					throw new Error( `Unexpected iteration #${ iteration }` );
			}
		}

		expect( iteration ).to.equal( 5 );
	} );

	describe( 'checks if parameters can produce pages', () => {

		it( 'titles is valid', async () => {
			const title = 'Title';
			const response = { query: { pages: [ { title } ] }, batchcomplete: true };
			const session = singleGetSession( null, response );
			await queryFullPages( session, { titles: title } ).next();
		} );

		it( 'pageids is valid', async () => {
			const pageid = 123;
			const response = { query: { pages: [ { pageid } ] }, batchcomplete: true };
			const session = singleGetSession( null, response );
			await queryFullPages( session, { pageids: pageid } ).next();
		} );

		it( 'revids is valid', async () => {
			const revid = 123;
			const response = { query: { pages: [ { pageid: 12 } ] }, batchcomplete: true };
			const session = singleGetSession( null, response );
			await queryFullPages( session, { revids: revid } ).next();
		} );

		it( 'generator is valid', async () => {
			const response = { batchcomplete: true };
			const session = singleGetSession( null, response );
			await queryFullPages( session, { generator: 'generator' } ).next();
		} );

		it( 'empty params are invalid', async () => {
			const session = new BaseTestSession();
			await expect( queryFullPages( session, {} ).next() )
				.to.be.rejectedWith( new RegExp(
					'^' +
					'Request params for queryFullPages\\(\\) must include titles, pageids, revids, and/or generator!' +
					'$',
				) );
		} );

		for ( const { listParam, testName } of [
			{ listParam: 'allpages', testName: 'string param' },
			{ listParam: [ 'allpages' ], testName: 'single-element array' },
			{ listParam: set( 'allpages' ), testName: 'single-element set' },
		] ) {
			it( `list= params are invalid (custom message for ${ testName })`, async () => {
				const session = new BaseTestSession();
				await expect( queryFullPages( session, { list: listParam } ).next() )
					.to.be.rejectedWith( new RegExp(
						'^' +
						'Request params for queryFullPages\\(\\) must include titles, pageids, revids, and/or generator! ' +
						'You probably want to change list=allpages to generator=allpages, and prefix its parameters with "g".' +
						'$',
					) );
			} );
		}

	} );

	describe( 'maxEmptyResponses( limit: 3 )', () => {

		it( 'stops at limit + 1 consecutive empty responses', async () => {
			const session = sequentialGetSession( [
				{
					expectedParams: { action: 'query', generator: 'ap' },
					response: { continue: { gapc: '3' }, batchcomplete: true },
				},
				{
					expectedParams: { action: 'query', generator: 'ap', gapc: '3' },
					response: { continue: { gapc: '6' }, batchcomplete: true },
				},
				{
					expectedParams: { action: 'query', generator: 'ap', gapc: '6' },
					response: { continue: { gapc: '9' }, batchcomplete: true },
				},
				{
					expectedParams: { action: 'query', generator: 'ap', gapc: '9' },
					response: { continue: { gapc: '12' }, batchcomplete: true },
				},
			] );

			await expect( queryFullPages( session, {
				action: 'query',
				generator: 'ap', // “allpages”, see above
			}, {
				...maxEmptyResponses( 3 ),
			} ).next() )
				.to.be.rejectedWith( TooManyEmptyResponsesError );
		} );

		it( 'allows limit consecutive empty responses', async () => {
			const session = sequentialGetSession( [
				{
					expectedParams: { action: 'query', generator: 'ap' },
					response: { continue: { gapc: '3' }, batchcomplete: true },
				},
				{
					expectedParams: { action: 'query', generator: 'ap', gapc: '3' },
					response: { continue: { gapc: '6' }, batchcomplete: true },
				},
				{
					expectedParams: { action: 'query', generator: 'ap', gapc: '6' },
					response: { continue: { gapc: '9' }, batchcomplete: true },
				},
				{
					expectedParams: { action: 'query', generator: 'ap', gapc: '9' },
					response: { query: { pages: [
						{ pageid: 9 },
					] }, continue: { gapc: '12' }, batchcomplete: true },
				},
			] );

			const { value: page } = await queryFullPages( session, {
				action: 'query',
				generator: 'ap', // “allpages”, see above
			}, {
				...maxEmptyResponses( 3 ),
			} ).next();
			expect( page ).to.eql( { pageid: 9 } );
		} );

		it( 'allows limit+1 non-consecutive empty responses', async () => {
			const session = sequentialGetSession( [
				{
					expectedParams: { action: 'query', generator: 'ap' },
					response: { continue: { gapc: '3' }, batchcomplete: true },
				},
				{
					expectedParams: { action: 'query', generator: 'ap', gapc: '3' },
					response: { query: { pages: [
						{ pageid: 3 },
					] }, continue: { gapc: '6' }, batchcomplete: true },
				},
				{
					expectedParams: { action: 'query', generator: 'ap', gapc: '6' },
					response: { continue: { gapc: '9' }, batchcomplete: true },
				},
				{
					expectedParams: { action: 'query', generator: 'ap', gapc: '9' },
					response: { query: { pages: [
						{ pageid: 9 },
					] }, continue: { gapc: '12' }, batchcomplete: true },
				},
				{
					expectedParams: { action: 'query', generator: 'ap', gapc: '12' },
					response: { continue: { gapc: '15' }, batchcomplete: true },
				},
				{
					expectedParams: { action: 'query', generator: 'ap', gapc: '15' },
					response: { query: { pages: [
						{ pageid: 15 },
					] }, continue: { gapc: '18' }, batchcomplete: true },
				},
				{
					expectedParams: { action: 'query', generator: 'ap', gapc: '18' },
					response: { continue: { gapc: '21' }, batchcomplete: true },
				},
				{
					expectedParams: { action: 'query', generator: 'ap', gapc: '21' },
					response: { query: { pages: [
						{ pageid: 21 },
					] }, continue: { gapc: '24' }, batchcomplete: true },
				},
				{
					expectedParams: { action: 'query', generator: 'ap', gapc: '24' },
					response: { batchcomplete: true },
				},
			] );

			let iteration = 0;
			for await ( const page of queryFullPages( session, {
				action: 'query',
				generator: 'ap', // “allpages”, see above
			}, {
				...maxEmptyResponses( 3 ),
			} ) ) {
				switch ( ++iteration ) {
					case 1:
						expect( page ).to.eql( { pageid: 3 } );
						break;
					case 2:
						expect( page ).to.eql( { pageid: 9 } );
						break;
					case 3:
						expect( page ).to.eql( { pageid: 15 } );
						break;
					case 4:
						expect( page ).to.eql( { pageid: 21 } );
						break;
				}
			}

			expect( iteration ).to.equal( 4 );
		} );

		it( 'keeps track of different requests separately', async () => {
			const request1Call1Deferred = deferred(), request1Call1 = {
				expectedParams: { action: 'query', generator: 'ap', gapn: '1' },
				response: { continue: { gapc: '3' }, batchcomplete: true },
			};
			const request2Call1Deferred = deferred(), request2Call1 = {
				expectedParams: { action: 'query', generator: 'ap', gapn: '2' },
				response: { continue: { gapc: '3' }, batchcomplete: true },
			};
			const request1Call2Deferred = deferred(), request1Call2 = {
				expectedParams: { action: 'query', generator: 'ap', gapn: '1', gapc: '3' },
				response: { continue: { gapc: '6' }, batchcomplete: true },
			};
			const request2Call2Deferred = deferred(), request2Call2 = {
				expectedParams: { action: 'query', generator: 'ap', gapn: '2', gapc: '3' },
				response: { continue: { gapc: '6' }, batchcomplete: true },
			};
			const request1Call3Deferred = deferred(), request1Call3 = {
				expectedParams: { action: 'query', generator: 'ap', gapn: '1', gapc: '6' },
				response: { query: { pages: [
					{ pageid: 6 },
				] }, continue: { gapc: '9' }, batchcomplete: true },
			};
			const request2Call3Deferred = deferred(), request2Call3 = {
				expectedParams: { action: 'query', generator: 'ap', gapn: '2', gapc: '6' },
				response: { continue: { gapc: '9' }, batchcomplete: true },
			};
			const request1Call4Deferred = deferred(), request1Call4 = {
				expectedParams: { action: 'query', generator: 'ap', gapn: '1', gapc: '9' },
				response: { continue: { gapc: '12' }, batchcomplete: true },
			};
			const request2Call4Deferred = deferred(), request2Call4 = {
				expectedParams: { action: 'query', generator: 'ap', gapn: '2', gapc: '9' },
				response: { continue: { gapc: '12' }, batchcomplete: true },
			};
			const request1Call5Deferred = deferred(), request1Call5 = {
				expectedParams: { action: 'query', generator: 'ap', gapn: '1', gapc: '12' },
				response: { query: { pages: [
					{ pageid: 12 },
				] }, continue: { gapc: '15' }, batchcomplete: true },
			};
			const session = sequentialGetSession( [
				request1Call1Deferred,
				request2Call1Deferred,
				request1Call2Deferred,
				request2Call2Deferred,
				request1Call3Deferred,
				request2Call3Deferred,
				request1Call4Deferred,
				request2Call4Deferred,
				request1Call5Deferred,
			] );
			const options = {
				...maxEmptyResponses( 3 ),
			};
			const request1AsyncGenerator = queryFullPages( session, {
				generator: 'ap', // “allpages”, see above
				gapn: '1', // “gapnamespace”, likewise
			}, options );
			let request1Promise = request1AsyncGenerator.next();
			const request2AsyncGenerator = queryFullPages( session, {
				generator: 'ap', // “allpages”, see above
				gapn: '2', // “gapnamespace”, likewise
			}, options );
			const request2Promise = request2AsyncGenerator.next();

			request1Call1Deferred.resolve( request1Call1 );
			request2Call1Deferred.resolve( request2Call1 );
			request1Call2Deferred.resolve( request1Call2 );
			request2Call2Deferred.resolve( request2Call2 );
			request1Call3Deferred.resolve( request1Call3 );
			let { done, value: page } = await request1Promise;
			expect( done ).to.be.false;
			expect( page ).to.eql( { pageid: 6 } );
			request1Promise = request1AsyncGenerator.next();

			request2Call3Deferred.resolve( request2Call3 );
			request1Call4Deferred.resolve( request1Call4 );
			request2Call4Deferred.resolve( request2Call4 );
			await expect( request2Promise )
				.to.be.rejectedWith( TooManyEmptyResponsesError );

			request1Call5Deferred.resolve( request1Call5 );
			( { done, value: page } = await request1Promise );
			expect( done ).to.be.false;
			expect( page ).to.eql( { pageid: 12 } );
		} );

	} );

} );

describe( 'queryFullRevisions', () => {

	it( 'follows continuation and returns revisions with page attached', async () => {
		const session = sequentialGetSession( [
			{
				expectedParams: { action: 'query', generator: 'ar', prop: 'revisions', rvprop: 'i' },
				response: { query: { pages: [
					{ pageid: 1, revisions: [ { revid: 11 } ] },
					{ pageid: 2, revisions: [ { revid: 21 } ] },
				] }, continue: { rc: '21' } },
			},
			{
				expectedParams: { action: 'query', generator: 'ar', prop: 'revisions', rvprop: 'i', rc: '21' },
				response: { query: { pages: [
					{ pageid: 2, revisions: [ { revid: 22 } ] },
				] }, continue: { rc: '22' }, batchcomplete: true },
			},
			{
				expectedParams: { action: 'query', generator: 'ar', prop: 'revisions', rvprop: 'i', rc: '22' },
				response: { query: { pages: [
					{ pageid: 3, revisions: [ { revid: 31 }, { revid: 32 } ] },
				] }, batchcomplete: true },
			},
		] );

		let iteration = 0;
		for await ( const revision of queryFullRevisions( session, {
			generator: 'ar', // “allrevisions”, abbreviated for shorter (one-line) expectedParams above
			rvprop: [ 'i' ], // “ids”, likewise abbreviated
		} ) ) {
			switch ( ++iteration ) {
				case 1:
					expect( revision ).to.eql( { revid: 11 } );
					expect( revision[ pageOfRevision ] ).to.eql( { pageid: 1 } );
					break;
				case 2:
					expect( revision ).to.eql( { revid: 21 } );
					expect( revision[ pageOfRevision ] ).to.eql( { pageid: 2 } );
					break;
				case 3:
					expect( revision ).to.eql( { revid: 22 } );
					expect( revision[ pageOfRevision ] ).to.eql( { pageid: 2 } );
					break;
				case 4:
					expect( revision ).to.eql( { revid: 31 } );
					expect( revision[ pageOfRevision ] ).to.eql( { pageid: 3 } );
					break;
				case 5:
					expect( revision ).to.eql( { revid: 32 } );
					expect( revision[ pageOfRevision ] ).to.eql( { pageid: 3 } );
					break;
				default:
					throw new Error( `Unexpected iteration #${ iteration }` );
			}
		}

		expect( iteration ).to.equal( 5 );
	} );

	it( 'returns missing revisions', async () => {
		const expectedParams = { action: 'query', prop: 'revisions', revids: '123|789' };
		const response = { query: {
			badrevids: { 123: { revid: 123 } },
			pages: [ { pageid: 456, revisions: [ { revid: 789 } ] } ],
			batchcomplete: true,
		} };
		const session = singleGetSession( expectedParams, response );

		let iteration = 0;
		for await ( const revision of queryFullRevisions( session, { revids: [ 123, 789 ] } ) ) {
			switch ( ++iteration ) {
				case 1:
					expect( revision ).to.eql( { revid: 123, missing: true } );
					expect( revision ).not.to.have.property( pageOfRevision );
					break;
				case 2:
					expect( revision ).to.eql( { revid: 789 } );
					expect( revision[ pageOfRevision ] ).to.eql( { pageid: 456 } );
					break;
			}
		}

		expect( iteration ).to.equal( 2 );
	} );

	it( 'sorts pages per batch according to option', async () => {
		const session = sequentialGetSession( [
			{
				expectedParams: { action: 'query', generator: 'ar', prop: 'revisions' },
				response: { query: { pages: [
					{ pageid: 2, revisions: [ { revid: 210 } ] },
					{ pageid: 1, revisions: [ { revid: 120 }, { revid: 110 } ] },
				] }, continue: { garc: '3' }, batchcomplete: true },
			},
			{
				expectedParams: { action: 'query', generator: 'ar', prop: 'revisions', garc: '3' },
				response: { query: { pages: [
					{ pageid: 4, revisions: [ { revid: 41 } ] },
					{ pageid: 3, revisions: [ { revid: 31 } ] },
				] }, batchcomplete: true },
			},
		] );

		let iteration = 0;
		for await ( const revision of queryFullRevisions( session, {
			generator: 'ar', // “allrevisions”, abbreviated for shorter (one-line) expectedParams above
		}, {
			'm3api-query/compareRevisions': ( { revid: r1 }, { revid: r2 } ) => r1 - r2,
		} ) ) {
			switch ( ++iteration ) {
				case 1:
					expect( revision ).to.eql( { revid: 110 } );
					break;
				case 2:
					expect( revision ).to.eql( { revid: 120 } );
					break;
				case 3:
					expect( revision ).to.eql( { revid: 210 } );
					break;
				case 4:
					expect( revision ).to.eql( { revid: 31 } );
					break;
				case 5:
					expect( revision ).to.eql( { revid: 41 } );
					break;
				default:
					throw new Error( `Unexpected iteration #${ iteration }` );
			}
		}

		expect( iteration ).to.equal( 5 );
	} );

	describe( 'checks if parameters can produce pages', () => {

		// subset of the queryFullPages tests

		it( 'titles is valid', async () => {
			const title = 'Title';
			const response = { query: { pages: [ {
				title,
				revisions: [ { revid: 123 } ],
			} ] }, batchcomplete: true };
			const session = singleGetSession( null, response );
			await queryFullRevisions( session, { titles: title } ).next();
		} );

		it( 'empty params are invalid', async () => {
			const session = new BaseTestSession();
			await expect( queryFullRevisions( session, {} ).next() )
				.to.be.rejectedWith( new RegExp(
					'^' +
					'Request params for queryFullRevisions\\(\\) must include titles, pageids, revids, and/or generator!' +
					'$',
				) );
		} );

	} );

	describe( 'maxEmptyResponses( limit: 3 )', () => {

		// amalgam of the queryFullPages tests

		it( 'allows limit empty + 1 nonempty + 1 empty + 1 nonempty responses, then stops at limit + 1 consecutive empty responses', async () => {
			const session = sequentialGetSession( [
				{
					expectedParams: { action: 'query', generator: 'ar', prop: 'revisions' },
					response: { continue: { garc: '3' }, batchcomplete: true },
				},
				{
					expectedParams: { action: 'query', generator: 'ar', prop: 'revisions', garc: '3' },
					response: { continue: { garc: '6' }, batchcomplete: true },
				},
				{
					expectedParams: { action: 'query', generator: 'ar', prop: 'revisions', garc: '6' },
					response: { continue: { garc: '9' }, batchcomplete: true },
				},
				{
					expectedParams: { action: 'query', generator: 'ar', prop: 'revisions', garc: '9' },
					response: { query: { pages: [
						{ revisions: [ { revid: 9 } ] },
					] }, continue: { garc: '12' }, batchcomplete: true },
				},
				{
					expectedParams: { action: 'query', generator: 'ar', prop: 'revisions', garc: '12' },
					response: { continue: { garc: '15' }, batchcomplete: true },
				},
				{
					expectedParams: { action: 'query', generator: 'ar', prop: 'revisions', garc: '15' },
					response: { query: { pages: [
						{ revisions: [ { revid: 15 } ] },
					] }, continue: { garc: '18' }, batchcomplete: true },
				},
				{
					expectedParams: { action: 'query', generator: 'ar', prop: 'revisions', garc: '18' },
					response: { continue: { garc: '21' }, batchcomplete: true },
				},
				{
					expectedParams: { action: 'query', generator: 'ar', prop: 'revisions', garc: '21' },
					response: { continue: { garc: '24' }, batchcomplete: true },
				},
				{
					expectedParams: { action: 'query', generator: 'ar', prop: 'revisions', garc: '24' },
					response: { continue: { garc: '27' }, batchcomplete: true },
				},
				{
					expectedParams: { action: 'query', generator: 'ar', prop: 'revisions', garc: '27' },
					response: { continue: { garc: '30' }, batchcomplete: true },
				},
			] );

			const asyncGenerator = queryFullRevisions( session, {
				action: 'query',
				generator: 'ar', // “allrevisions”, see above
			}, {
				...maxEmptyResponses( 3 ),
			} );

			let { done, value: revision } = await asyncGenerator.next();
			expect( done ).to.be.false;
			expect( revision ).to.eql( { revid: 9 } );

			( { done, value: revision } = await asyncGenerator.next() );
			expect( done ).to.be.false;
			expect( revision ).to.eql( { revid: 15 } );

			await expect( asyncGenerator.next() )
				.to.be.rejectedWith( TooManyEmptyResponsesError );
		} );

	} );

} );
