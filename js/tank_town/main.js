( function( requirejs ) {
	requirejs.config( {
		paths: {
			'quintus': '../quintus-all.min'
		},

		shim: {
			'quintus': {
				exports: 'Quintus'
			}
		},

		urlArgs: [ 'diecache=', ( new Date() ).getTime() ].join( '' ),

		waitSeconds: 20
	} );

	require( [ 'tank_town' ], function( TankTown ) {
		'use strict';

		var game = new TankTown( {
			canvas: 'frame'
		} );
		game.begin();
	} );
} )( window.requirejs );
