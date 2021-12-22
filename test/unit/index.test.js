/* eslint-env mocha */

import {
} from '../../index.js';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
chai.use( chaiAsPromised );

describe( 'placeholder', () => {

	it( 'will be removed once real functionality exists', async () => {
		expect( 2 + 2 ).to.equal( 4 );
	} );

} );
