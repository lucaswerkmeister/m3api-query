/* eslint-env mocha */

import {
	getResponsePageByTitle,
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

} );
