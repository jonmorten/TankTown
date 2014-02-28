define( [ 'quintus' ], function ( Quintus ) {
	'use strict';


	// Convert between pixel and tile positions
	var tileToPx = function ( col, row ) {
		return {
			x: col * 32 + 32,
			y: row * 32 + 32
		};
	};
	var pxToTile = function ( x, y ) {
		return {
			x: Math.floor( x / 32 ) + 1,
			y: Math.floor( y / 32 ) + 1
		};
	}


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
		var SPRITE_EXPLOSION = 100;


		Q.Sprite.extend( 'Bullet', {
			init: function( p ) {
				this._super( p, {
					w: 6,
					h: 6,
					type: SPRITE_BULLET,
					collisionMask: SPRITE_MAP_TILE | SPRITE_PLAYER | SPRITE_ENEMY,
					sensor: true// Disable physical interaction with other sprites
				} );

				this.add( '2d' );
				this.on( 'hit', this, 'hit' );
				this.on( 'sensor', this, 'sensor' );
			},

			hit: function ( collision ) {
				this.destroy();
				var classHit = collision.obj.className;
				if ( classHit !== 'TankTownMap' ) {
					var firedBy = this.p.firedBy;
					if ( firedBy === 'Player' && classHit === 'Enemy' ) {
						collision.obj.trigger( 'hitByHostileBullet' );
					} else if ( firedBy === 'Enemy' && classHit === 'Player' ) {
						collision.obj.trigger( 'hitByHostileBullet' );
					}
				}
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


		Q.component( 'cannon', {
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
					bulletOptions.firedBy = this.entity.className;
					this.entity.stage.insert( new Q.Bullet( bulletOptions ) );
					this.cooldownRemaining = this.options.cooldown;
				}
			}
		} );



		Q.Explosion = Q.Sprite.extend( {
			init: function( p ) {
				this._super( p, {
					sheet: 'explosion',
					sprite: 'explosion',
					type: SPRITE_EXPLOSION,
					sensor: true// Disable physical interaction with other sprites
				} );

				this.add( 'animation' );
				this.play( 'explode' );
				this.on( 'exploded' );
			},

			exploded: function () {
				this.destroy();
			},

			sensor: function () {
				// No-op
			}
		} );


		Q.component( 'gridMovement', {
			defaults: {
				direction: 'down',
				speed: 2
			},

			added: function () {
				var p = this.entity.p;

				Q._defaults( p, this.defaults );
				p.previousDirectionBuffer = p.direction;
				p.previousDirection = p.direction;
			},

			extend: {
				move: function ( direction ) {
					var is_moving_left = direction === 'left';
					var is_moving_right = direction === 'right';
					var is_moving_up = direction === 'up';
					var is_moving_down = direction === 'down';

					var p = this.p;

					var x = p.x;
					var y = p.y;

					var tilePos = pxToTile( x, y );
					var tileX = tilePos.x;
					var tileY = tilePos.y;
					if ( tileX < 0 || tileY < 0 || tileX > Q.state.get( 'map_x_tile_max' ) || tileY > Q.state.get( 'map_y_tile_max' ) ) {
						this.trigger( 'isOutsideMap' );
						return;
					}

					var mod_x = x % 32;
					var mod_y = y % 32;
					var snap_x = ( mod_x !== 0 );
					var snap_y = ( mod_y !== 0 );

					//	Is moving and must snap to grid
					if ( snap_x || snap_y ) {
						if ( snap_x ) {
							if ( p.direction === 'right' ) {
								this.play('walk_right');
								p.x += p.speed;
							} else {
								this.play('walk_left');
								p.x -= p.speed;
							}
						}
						if ( snap_y ) {
							if ( p.direction === 'down' ) {
								this.play('walk_down');
								p.y += p.speed;
							} else {
								this.play('walk_up');
								p.y -= p.speed;
							}
						}
					//	Move horizontally
					} else if ( is_moving_left || is_moving_right ) {
						if ( is_moving_left ) {
							this.play('walk_left');
							p.direction = 'left';
							p.x -= p.speed;
						} else if ( is_moving_right ) {
							this.play('walk_right');
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
					//	Move vertically
					} else if ( is_moving_up || is_moving_down ) {
						if ( is_moving_up ) {
							this.play('walk_up');
							p.direction = 'up';
							p.y -= p.speed;
						} else if ( is_moving_down ) {
							this.play('walk_down');
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
						this.play('stand_' + p.direction);
					}
					if ( p.previousDirectionBuffer !== p.direction ) {
						p.previousDirection = p.previousDirectionBuffer;
						p.previousDirectionBuffer = p.direction;
					}
				}
			}
		} );


		Q.component( 'playerMovement', {
			added: function () {
				this.entity.on( 'step', this, 'step' );
				this.on( 'move', this.entity, 'move' );
			},

			step: function ( dt ) {
				var direction = null;
				if ( Q.inputs['left'] ) {
					direction = 'left';
				} else if ( Q.inputs['right'] ) {
					direction = 'right';
				} else if ( Q.inputs['up'] ) {
					direction = 'up';
				} else if ( Q.inputs['down'] ) {
					direction = 'down';
				}
				this.trigger( 'move', direction );
			}
		} );


		Q.component( 'enemyMovement', {
			defaults: {
				directionChangeDesire: 0,
				axisCollisionBuffer: false,
				axisCollision: false
			},

			added: function () {
				Q._defaults( this.entity.p, this.defaults );
				this.entity.on( 'step', this, 'step' );
				this.on( 'move', this.entity, 'move' );
				this.entity.on( 'hit', this, 'changeDirection' );
			},

			step: function ( dt ) {
				var p = this.entity.p;

				p.directionChangeDesire += 0.025;

				var direction = p.direction;
				if ( Math.random() < p.directionChangeDesire ) {
					p.directionChangeDesire = 0;
					var new_directions = (
						direction === 'left' || direction === 'right'
						? [ 'up', 'down' ]
						: [ 'left', 'right' ]
					);
					direction = ( Math.random() > 0.5 ? new_directions[0] : new_directions[1] );
				}
				this.trigger( 'move', direction );
			},

			changeDirection: function ( collision ) {
				var p = this.entity.p;

				var x = collision.normalX;
				var y = collision.normalY;

				var axis = ( x !== 0 ? 'x' : 'y' );
				if ( axis === p.axisCollision ) {
					var new_directions = (
						axis === 'x'
						? [ 'up', 'down' ]
						: [ 'left', 'right' ]
					);
					p.direction = ( Math.random() > 0.5 ? new_directions[0] : new_directions[1] );
				} else {
					if ( x === -1 ) {
						p.direction = 'left';
					} else if ( x === 1 ) {
						p.direction = 'right';
					} else if ( y === -1 ) {
						p.direction = 'up';
					} else if ( y === 1 ) {
						p.direction = 'down';
					}
				}
				if ( p.axisCollisionBuffer !== axis ) {
					p.axisCollision = p.axisCollisionBuffer;
					p.axisCollisionBuffer = axis;
				}
			}
		} );


		Q.Sprite.extend( 'Player', {
			init: function( p ) {
				this._super( p, {
					sheet: 'player',
					sprite: 'player',
					type: SPRITE_PLAYER,
					collisionMask: SPRITE_MAP_TILE | SPRITE_ENEMY,
					is_dummy: false
				} );

				if ( !p.is_dummy ) {
					this.add( 'gridMovement, playerMovement' );
				}
				this.add( '2d, animation, cannon' );
				this.on( 'hitByHostileBullet', this, 'explode' );
				this.on( 'isOutsideMap', this, 'explode' );
				Q.input.on( 'fire', this.cannon, 'fire' );
			},

			explode: function () {
				var p = this.p;
				this.stage.insert( new Q.Explosion( { x: p.x, y: p.y } ) );
				this.destroy();
			}
		} );


		Q.Sprite.extend( 'Enemy', {
			init: function( p ) {
				this._super( p, {
					sheet: 'enemy',
					sprite: 'enemy',
					type: SPRITE_ENEMY,
					collisionMask: SPRITE_MAP_TILE | SPRITE_PLAYER,
					fireRate: 0.03
				} );
				this.add( '2d, animation, cannon, gridMovement, enemyMovement' );
				this.on( 'hitByHostileBullet', this, 'explode' );
				this.on( 'isOutsideMap', this, 'explode' );
				this.on( 'fire', this.cannon, 'fire' );
			},

			explode: function () {
				var p = this.p;
				this.stage.insert( new Q.Explosion( { x: p.x, y: p.y } ) );
				this.destroy();
			},

			step: function () {
				if ( Math.random() < this.p.fireRate ) {
					this.trigger( 'fire' );
				}
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
			Q.state.reset( { map_x_tile_max: 19, map_y_tile_max: 19 } );

			stage.insert( new Q.Repeater( {
				asset: 'background.png'
			} ) );

			var map = stage.collisionLayer( new Q.TankTownMap() );
			map.setup();

			var player = stage.insert( new Q.Player( tileToPx( 1, 1 ) ) );
			stage.add( 'viewport' ).follow( player );

			var enemy0 = stage.insert( new Q.Enemy( tileToPx( 5, 16 ) ) );
			var enemy1 = stage.insert( new Q.Enemy( tileToPx( 5, 14 ) ) );
			var enemy2 = stage.insert( new Q.Enemy( tileToPx( 14, 5 ) ) );
			var enemy3 = stage.insert( new Q.Enemy( tileToPx( 16, 5 ) ) );
			var enemy4 = stage.insert( new Q.Enemy( tileToPx( 17, 16 ) ) );
		} );

		Q.scene('start', function (stage) {
			Q.state.reset( { map_x_tile_max: 999, map_y_tile_max: 999 } );

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
			});

			var player = container.insert( new Q.Player( { is_dummy: true, y: -125 } ) );
			player.play( 'walk_right' );
		});

		Q.load( 'background.png, level.json, blocks.png, hero.png, enemy.png, explosion.png, main_theme.mp3', function() {
			Q.sheet( 'tiles', 'blocks.png', { tileW: 32, tileH: 32 } );

			var tank_sheet = {
				animation: {
					walk_left: { frames: [0,1], rate: 1/5 },
					walk_right: { frames: [2,3], rate: 1/5 },
					walk_up: { frames: [4,5], rate: 1/5 },
					walk_down: { frames: [6,7], rate: 1/5 },
					stand_left: { frames: [0] },
					stand_right: { frames: [2] },
					stand_up: { frames: [4] },
					stand_down: { frames: [6] }
				},
				dimensions: {
					tileW: 64,
					tileH: 64
				}
			};
			Q.sheet( 'player', 'hero.png', tank_sheet.dimensions );
			Q.animations( 'player', tank_sheet.animation );
			Q.sheet( 'enemy', 'enemy.png', tank_sheet.dimensions );
			Q.animations( 'enemy', tank_sheet.animation );

			Q.sheet( 'explosion', 'explosion.png', { tileW: 128, tileH: 128 } );
			Q.animations( 'explosion', {
				explode: {
					trigger: 'exploded',
					frames: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],
					rate: 1/5,
					loop: false
				}
			} );

			Q.stageScene( 'start' );
			Q.audio.play( 'main_theme.mp3', { loop: true } );
		} );
	}


	return TankTown;


} );
