/* eslint-env mocha */

import { Session, set } from 'm3api/core.js';
import {
	getResponsePageByTitle,
	getResponsePageByPageId,
	queryPartialPageByTitle,
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
