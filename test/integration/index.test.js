/* eslint-env mocha */

import Session, { set } from 'm3api/node.js';
import {
	queryFullPageByTitle,
} from '../../index.js';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
chai.use( chaiAsPromised );

const userAgent = 'm3api-query-integration-tests (https://github.com/lucaswerkmeister/m3api-query/)';

describe( 'queryFullPageByTitle', () => {

	it( 'finds page with normalized converted redirected title', async () => {
		const session = new Session( 'sr.wikipedia.org', {
			formatversion: 2,
		}, {
			userAgent,
		} );

		const page = await queryFullPageByTitle( session, 'belgrad', {
			prop: set(),
			converttitles: true,
			redirects: true,
		} );

		expect( page.title ).to.equal( 'Београд' );
	} );

} );
