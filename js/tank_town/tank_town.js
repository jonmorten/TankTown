define( [ 'quintus' ], function ( Quintus ) {
	'use strict';


	// Return a x and y location from a row and column
	var tilePos = function ( col, row ) {
		return { x: col*32 + 32, y: row*32 + 32 };
	};


	var TankTown = function ( options ) {
		options = options || {};

		this.canvas = options.canvas;
		return this;
	};


	TankTown.prototype.begin = function () {
		var setupOptions = {
			maximize: true
		}
		var Q = Quintus( {
			development: true
		} )
		.include( 'Sprites, Scenes, Input, 2D, Anim' )
		.setup( this.canvas, setupOptions );


		Q.input.keyboardControls();


		var defaultGravity = 0;
		Q.gravityY = 0;
		Q.gravityX = 0;


		var SPRITE_MAP_TILE = 10;
		var SPRITE_PLAYER = 20;
		var SPRITE_ENEMY = 30;
		var SPRITE_FRIENDLY_SHOT = 40;
		var SPRITE_FRIENDLY_SHOT = 50;


		Q.component( 'playerControls', {
			defaults: {
				speed: 128,
				direction: 'down'
			},

			added: function() {
				var p = this.entity.p;

				Q._defaults( p, this.defaults );

				this.entity.on( 'step', this, 'step' );
			},

			step: function( dt ) {
				var p = this.entity.p;

				if ( p.vx > 0 ) {
					p.angle = 180;
				} else if ( p.vx < 0 ) {
					p.angle = 0;
				} else if ( p.vy > 0 ) {
					p.angle = -90;
				} else if ( p.vy < 0 ) {
					p.angle = 90;
				}

				if ( Q.inputs['left'] ) {
					p.vx = -p.speed;
				} else if ( Q.inputs['right'] ) {
					p.vx = p.speed;
				} else if ( Q.inputs['up'] ) {
					p.vy = -p.speed;
				} else if ( Q.inputs['down'] ) {
					p.vy = p.speed;
				} else {
					p.vx = 0;
					p.vy = 0;
				}

			}
		});


		Q.Sprite.extend( 'Player', {
			init: function(p) {
				this._super( p, {
					sheet: 'player',
					type: SPRITE_PLAYER,
					collisionMask: SPRITE_MAP_TILE,
				} );

				this.add( '2d, playerControls' );
			}
		} );


		Q.TileLayer.extend( 'TankTownMap', {
			init: function() {
				this._super({
					type: SPRITE_MAP_TILE,
					dataAsset: 'level.json',
					sheet: 'tiles',
				});
			},

			setup: function() {
			}
		} );
		Q.scene( 'level1', function( stage ) {
			var map = stage.collisionLayer( new Q.TankTownMap() );
			map.setup();

			var player = stage.insert( new Q.Player( tilePos( 1, 1 ) ) );
		} );

		Q.load( 'level.json, blocks.png, hero.png', function() {
			Q.sheet( 'tiles', 'blocks.png', { tileW: 32, tileH: 32 } );
			Q.sheet( 'player', 'hero.png', { tileW: 64, tileH: 64 } );
			Q.stageScene( 'level1' );
		} );
	}


	return TankTown;


} );
