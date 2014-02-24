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
			development: true,
			audioSupported: ['mp3']
		} )
		.include( 'Sprites, Scenes, Input, 2D, Anim, Touch, UI, Audio' )
		.setup( this.canvas, setupOptions )
		.controls().touch()
		.enableSound();


		Q.input.keyboardControls();


		var defaultGravity = 0;
		Q.gravityY = 0;
		Q.gravityX = 0;


		var SPRITE_MAP_TILE = 10;
		var SPRITE_PLAYER = 20;
		var SPRITE_ENEMY = 30;
		var SPRITE_BULLET = 40;


		Q.Sprite.extend( 'Bullet', {
			init: function( p ) {
				this._super( p, {
					w: 6,
					h: 6,
					type: SPRITE_BULLET,
					collisionMask: SPRITE_MAP_TILE,
					sensor: true// Disable physical interaction with other sprites
				} );

				this.add( '2d' );
				this.on( 'hit', this, 'hit' );
				this.on( 'sensor', this, 'sensor' );
			},

			hit: function ( collision ) {
				this.destroy();
			},

			sensor: function () {
				// No-op
			},

			draw: function( ctx ) {
				ctx.fillStyle = '#333';
				ctx.fillRect(-this.p.cx,-this.p.cy,this.p.w,this.p.h);
			},

			step: function(dt) {
				if(!Q.overlap(this,this.stage)) {
					this.destroy();
				}
			}
		});


		Q.component( 'canon', {
			options: {
				cooldown: 50
			},

			added: function () {
				this.cooldownRemaining = 0;
				this.entity.on( 'draw', this, 'cool' );
			},

			cool: function () {
				if ( this.cooldownRemaining !== 0 ) {
					this.cooldownRemaining--;
				}
			},

			fire: function () {
				if ( this.cooldownRemaining !== 0 ) {
					return;
				}
				var p = this.entity.p;
				var bulletOptions = false;
				if ( p.direction === 'left' ) {
					bulletOptions = {
						x: p.x - 48,
						y: p.y,
						vx: -1 * 250
					};
				} else if ( p.direction === 'right' ) {
					bulletOptions = {
						x: p.x + 48,
						y: p.y,
						vx: 1 * 250
					};
				} else if ( p.direction === 'up' ) {
					bulletOptions = {
						x: p.x,
						y: p.y - 48,
						vy: -1 * 250
					};
				} else if ( p.direction === 'down' ) {
					bulletOptions = {
						x: p.x,
						y: p.y + 48,
						vy: 1 * 250
					};
				}
				if ( !!bulletOptions ) {
					this.entity.stage.insert( new Q.Bullet( bulletOptions ) );
					this.cooldownRemaining = this.options.cooldown;
				}
			}
		} );


		Q.component( 'playerControls', {
			defaults: {
				direction: 'down',
				speed: 2
			},

			added: function() {
				var p = this.entity.p;

				Q._defaults( p, this.defaults );
				p.previousDirectionBuffer = p.direction;
				p.previousDirection = p.direction;

				this.entity.on( 'step', this, 'step' );
			},

			step: function( dt ) {
				var p = this.entity.p;

				var mod_x = p.x % 32;
				var mod_y = p.y % 32;
				var snap_x = ( mod_x !== 0 );
				var snap_y = ( mod_y !== 0 );

				var is_moving_left = Q.inputs['left'];
				var is_moving_right = Q.inputs['right'];
				var is_moving_up = Q.inputs['up'];
				var is_moving_down = Q.inputs['down'];

				//	Moving horizontally
				if ( is_moving_left || is_moving_right ) {
					if ( is_moving_left ) {
						this.entity.play('walk_left');
						p.direction = 'left';
						p.x -= p.speed;
					} else if ( is_moving_right ) {
						this.entity.play('walk_right');
						p.direction = 'right';
						p.x += p.speed;
					}

					if ( snap_y ) {
						if ( p.previousDirection === 'up' ) {
							p.y -= 2;
						} else if ( p.previousDirection === 'down' ) {
							p.y += 2;
						}
					}
				//	Moving vertically
				} else if ( is_moving_up || is_moving_down ) {
					if ( is_moving_up ) {
						this.entity.play('walk_up');
						p.direction = 'up';
						p.y -= p.speed;
					} else if ( is_moving_down ) {
						this.entity.play('walk_down');
						p.direction = 'down';
						p.y += p.speed;
					}

					if ( snap_x ) {
						if ( p.previousDirection === 'left' ) {
							p.x -= 2;
						} else if ( p.previousDirection === 'right' ) {
							p.x += 2;
						}
					}
				} else {
					if ( snap_x || snap_y ) {
						if ( snap_x ) {
							if ( p.direction === 'right' ) {
								this.entity.play('walk_right');
								p.x += p.speed;
							} else {
								this.entity.play('walk_left');
								p.x -= p.speed;
							}
						}
						if ( snap_y ) {
							if ( p.direction === 'down' ) {
								this.entity.play('walk_down');
								p.y += p.speed;
							} else {
								this.entity.play('walk_up');
								p.y -= p.speed;
							}
						}
					} else {
						this.entity.play('stand_' + p.direction);
					}
				}
				if ( p.previousDirectionBuffer !== p.direction ) {
					p.previousDirection = p.previousDirectionBuffer;
					p.previousDirectionBuffer = p.direction;
				}
			}
		} );


		Q.Sprite.extend( 'Player', {
			init: function( p ) {
				this._super( p, {
					sheet: 'player',
					sprite: 'player',
					type: SPRITE_PLAYER,
					collisionMask: SPRITE_MAP_TILE,
					is_dummy: false
				} );

				if ( !p.is_dummy ) {
					this.add( 'playerControls' );
				}
				this.add( '2d, animation, canon' );
				Q.input.on( 'fire', this.canon, 'fire' );
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
			stage.insert( new Q.Repeater( {
				asset: 'background.png'
			} ) );

			var map = stage.collisionLayer( new Q.TankTownMap() );
			map.setup();

			var player = stage.insert( new Q.Player( tilePos( 1, 1 ) ) );

			stage.add( 'viewport' ).follow( player );
		} );

		Q.scene('start', function (stage) {
			stage.insert( new Q.Repeater( {
				asset: 'background.png'
			} ) );

			var container = stage.insert(new Q.UI.Container({
				y: Q.height/2,
				x: Q.width/2
			}));

			stage.insert(new Q.UI.Text({
				label: 'TankTown Revolution',
				color: '#999',
				x: 0,
				y: 0
			}), container);

			container.fit(20, 100);

			var button = container.insert(new Q.UI.Button({
				label: 'Play',
				fill: '#999',
				y: 50,
				x: 0
			}));

			button.on('click', function () {
				Q.stageScene('level1');
				Q.audio.stop('main_theme.mp3');
			});

			var player = container.insert( new Q.Player( { is_dummy: true, y: -125 } ) );
			player.play( 'walk_right' );

			Q.audio.play('main_theme.mp3', {loop: true});
		});

		Q.load( 'background.png, level.json, blocks.png, hero.png, main_theme.mp3', function() {
			Q.sheet( 'tiles', 'blocks.png', { tileW: 32, tileH: 32 } );
			Q.sheet( 'player', 'hero.png', { tileW: 64, tileH: 64 } );
			Q.animations('player', {
				walk_left: { frames: [0,1], rate: 1/5 },
				walk_right: { frames: [2,3], rate: 1/5 },
				walk_up: { frames: [4,5], rate: 1/5 },
				walk_down: { frames: [6,7], rate: 1/5 },
				stand_left: { frames: [0] },
				stand_right: { frames: [2] },
				stand_up: { frames: [4] },
				stand_down: { frames: [6] }
			});
			Q.stageScene( 'start' );
		} );
	}


	return TankTown;


} );
