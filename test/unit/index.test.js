/* eslint-env mocha */

import { Session, set } from 'm3api/core.js';
import {
	getResponsePageByTitle,
	getResponsePageByPageId,
	getResponseRevisionByRevisionId,
	queryPartialPageByTitle,
	queryIncrementalPageByTitle,
	queryFullPageByTitle,
	queryFullPages,
} from '../../index.js';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
chai.use( chaiAsPromised );

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

	it( 'finds page with normalized redirected title', () => {
		const title = 'Target';
		const page = { title };
		const normalizedTitle = 'Redirect';
		const inputTitle = 'redirect';
		const response = { query: {
			normalized: [
				{ from: inputTitle, to: normalizedTitle },
			],
			redirects: [
				{ from: normalizedTitle, to: title },
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
			it( `finds page with ${responseType.name} ID using ${paramType.name} ID`, () => {
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
		expect( getResponseRevisionByRevisionId( response, revid ) ).to.equal( revision );
	} );

	it( 'finds revision with ID, formatversion=2', () => {
		const revid = 123;
		const revision = { revid };
		const unrelatedRevision = { revid: 456 };
		const page = { revisions: [ revision, unrelatedRevision ] };
		const unrelatedPage = { revisions: [ { revid: 789 } ] };
		const response = { query: { pages: [ unrelatedPage, page ] } };
		expect( getResponseRevisionByRevisionId( response, revid ) ).to.equal( revision );
	} );

	it( 'does not find page with different ID', () => {
		const revid = 123;
		const revision = { revid };
		const page = { revisions: [ revision ] };
		const response = { query: { pages: [ page ] } };
		const inputRevisionId = 456;
		expect( getResponseRevisionByRevisionId( response, inputRevisionId ) ).to.be.null;
	} );

	for ( const paramType of [ String, Number ] ) {
		for ( const responseType of [ String, Number ] ) {
			it( `finds revision with ${responseType.name} ID using ${paramType.name} ID`, () => {
				const revid = 123;
				const revision = { revid: responseType( revid ) };
				const page = { revisions: [ revision ] };
				const response = { query: { pages: [ page ] } };
				expect( getResponseRevisionByRevisionId( response, paramType( revid ) ) )
					.to.equal( revision );
			} );
		}
	}

	describe( 'returns missing revision', () => {

		it( 'with "missing" in badrevids', () => {
			const revid = 123;
			const revision = { revid, missing: true };
			const response = { query: { badrevids: { [ revid ]: revision } } };
			expect( getResponseRevisionByRevisionId( response, revid ) ).to.equal( revision );
		} );

		const revid = 123;
		for ( const [ responseDescription, response, expected ] of [
			[ 'formatversion=1 + pages', { query: { pages: {} } }, { revid, missing: '' } ],
			[ 'formatversion=1 + batchcomplete', { batchcomplete: '' }, { revid, missing: '' } ],
			[ 'formatversion=2 + pages', { query: { pages: [] } }, { revid, missing: true } ],
			[ 'formatversion=2 + batchcomplete', { batchcomplete: true }, { revid, missing: true } ],
		] ) {
			it( `adds "missing" to ${responseDescription} response`, () => {
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

} );

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
	expectedParams.format = 'json';
	let called = false;
	class TestSession extends BaseTestSession {
		async internalGet( params ) {
			expect( called, 'internalGet already called' ).to.be.false;
			called = true;
			expect( params ).to.eql( expectedParams );
			return successfulResponse( response );
		}
	}
	return new TestSession();
}

function sequentialGetSession( expectedCalls ) {
	expectedCalls.reverse();
	class TestSession extends BaseTestSession {
		async internalGet( params ) {
			expect( expectedCalls ).to.not.be.empty;
			const [ { expectedParams, response } ] = expectedCalls.splice( -1 );
			expectedParams.format = 'json';
			expect( params ).to.eql( expectedParams );
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

		it( `handles existing same title ${type} in params`, async () => {
			const title = 'Title';
			const page = { title };
			const response = { query: { pages: [ page ] } };
			const expectedParams = { action: 'query', titles: title };
			const session = singleGetSession( expectedParams, response );
			const inputParams = params( title );
			expect( await queryPartialPageByTitle( session, title, inputParams ) ).to.equal( page );
			expect( inputParams, 'params modified' ).to.eql( params( title ) );
		} );

		it( `adds to existing other title ${type} in params`, async () => {
			const title = 'Title';
			const page = { title };
			const otherTitle = 'Other title';
			const otherPage = { title: otherTitle };
			const response = { query: { pages: [ page, otherPage ] } };
			const expectedParams = { action: 'query', titles: `${otherTitle}|${title}` };
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
			async internalPost( urlParams, bodyParams ) {
				expect( called, 'internalPost already called' ).to.be.false;
				called = true;
				expect( urlParams ).to.eql( {} );
				expect( bodyParams ).to.eql( expectedParams );
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
			async internalGet( params ) {
				switch ( ++call ) {
					case 1:
						expect( params ).to.eql( {
							action: 'query',
							titles: `${title1}|${title2}`,
							format: 'json',
						} );
						return successfulResponse( responseA );
					case 2:
						expect( params ).to.eql( {
							action: 'query',
							titles: `${title1}|${title2}`,
							continue: title2,
							format: 'json',
						} );
						return successfulResponse( responseB );
					default:
						throw new Error( `Unexpected call #${call}` );
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
					throw new Error( `Unexpected iteration #${iteration}` );
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
			base[ `-test-${key}` ] = [ baseValue, incrementalValue ];
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
		const page = await queryFullPageByTitle( session, title, {}, {}, mergeValues );
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
					throw new Error( `Unexpected iteration #${iteration}` );
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
					throw new Error( `Unexpected iteration #${iteration}` );
			}
		}

		expect( iteration ).to.equal( 2 );
	} );

} );
