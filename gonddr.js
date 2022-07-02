class Boot extends Phaser.Scene {

	constructor () {
		super('boot');
	}


	init () {
		let element = document.createElement('style');
		document.head.appendChild(element);
	}

	// Preload assets from disk
	preload () {
		this.load.spritesheet('arrows', 'assets/arrows.png', {frameWidth: ARROW_SIZE, frameHeight: ARROW_SIZE});
		this.load.spritesheet('hit_frame', 'assets/hit_frame.png', {frameWidth: ARROW_SIZE, frameHeight: ARROW_SIZE});
	}


	create () {
		let scene = this.scene;

		// Start the actual game!
		scene.start('gonddr');
	}

}

class GonDDR extends Phaser.Scene {

	constructor () {

		super('gonddr');

		this.hit_frame;   // Sprite of hit window
		this.arrows;      // Currently active arrows
		this.song_script; // Hash of strings; maps a tick to a string encoding the arrow(s) to create.
		this.gondola;     // TODO
		this.combo;       // TODO
		this.score;       // TODO

		this.tps = 100; // Ticks per second.
						// A tick is the smallest time step in the song script, NOT a frame or Phaser loop.
						// Speed, position, and timing of arrows are measured in ticks.
						// Adjust this change the speed of the song.
		this.fall_ticks = 400.;
						// # of ticks for a standard arrow to fall from the top to bottom of the screen.
		this.hit_window_start = ARROW_HIT_Y - ARROW_SIZE;
		this.hit_window_end = ARROW_HIT_Y + ARROW_SIZE;
						// Margin in pixels that a player's button press registers as a hit

		this.arrow_keys = {};
						// Phaser keyboard key objects for the arrow keys/WASD?

		//TODO
	}


	create () {

		// Create game objects
		this.hit_frame = this.add.sprite(100, ARROW_HIT_Y, 'hit_frame', 0);
		this.arrows = [];
		this.arrows.push(new Arrow(this, 100, ARROW_START_Y, 0, Directions.Up, 0));
		this.add.existing(this.arrows[this.arrows.length-1]);

		// Create keyboard keys
		this.arrow_keys['Up'] = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
		this.arrow_keys['Right'] = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
		this.arrow_keys['Down'] = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
		this.arrow_keys['Left'] = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);

		// Create animations
		this.anims.create({
			key: 'hit_frame_flash',
			frames: this.anims.generateFrameNumbers('hit_frame', { frames: [ 1, 0 ] }),
			frameRate: 8,
			repeat: 0
		});

		this.feedback_array = [];

	}

	// Main game loop
	update (time) {

		let this_tick = this.time_to_tick(time);
		this.update_arrows(this_tick);
		this.update_feedback(this_tick)
	}


	//read_song_file: function()
	//{
		//TODO
	//},


	// Convert time in milliseconds to ticks
	time_to_tick (ts_ms) {
		return Math.floor(this.tps * ts_ms / 1000.);
	}

	update_feedback(this_tick) {

		console.log(this.feedback_array.length)
		// Iterate through feedback text
		this.feedback_array.filter((item, i) => {
			var current_feedback = this.feedback_array[i];

			// Destroy feedback that is too old
			if(this_tick - current_feedback.start_tick > 10) {
				current_feedback.destroy();
				console.log("Destroyed text!")
				return false;
			}

			// Otherwise make the text rise
			else {
				current_feedback.y -= 5;
				return true;
			}
		});
	}

	create_feedback_text(this_tick, offset) {
		console.log(offset);

		var feedback = this.add.text(200, 300, '', {
				fontSize: '32px',
				fill: '#00F'
		});

		if(offset <= 5) { feedback.setText("Perfect"); }
		else if(offset <= 10) { feedback.setText("Great"); }
		else if(offset <= 15) { feedback.setText("Okay"); }
		else if(offset <= 20) { feedback.setText("Poor"); }
		else if(offset > 20 ) { feedback.setText("Bad"); }
		else { this.feedback.setText("Miss"); }

		this.feedback_array.push(feedback)
	}

	// Create, move, destroy, and register hits on arrows for this loop
	update_arrows (this_tick) {

		// Create new arrow
		//if song_script[this_tick] == this_tick + fall_ticks
		if (this_tick - this.arrows[this.arrows.length-1].start_tick >= 200) { // For now, generate arrows at regular intervals
			this.arrows.push(new Arrow(this, 100, ARROW_START_Y, this_tick, (this.arrows[this.arrows.length-1].direction+1)%4, 0)); // Push new arrow to array
			this.add.existing(this.arrows[this.arrows.length-1]); // Add new arrow to Phaser scene
		}

		// Move arrow, mark as missed when leaving hit window, destroy arrows when leaving screen
		for (var i = this.arrows.length-1; i >= 0; i--) {

			let elapsed_ticks = this_tick - this.arrows[i].start_tick;
			this.arrows[i].y = ARROW_START_Y + ((elapsed_ticks/this.fall_ticks) * ARROW_DIST_TOTAL);

			// Destroy arrow if out of screen
			if (this.arrows[i].y > ARROW_END_Y) {
				let arrow_to_destroy = this.arrows.splice(i, 1);
				arrow_to_destroy[0].destroy();
			}

			// Mark arrow as missed
			if (this.arrows[i].y > this.hit_window_end && !this.arrows[i].has_hit && !this.arrows[i].has_missed) {
				console.log('PENALTY MISSED ${this_tick}');
				this.arrows[i].has_missed = true;
			}
		}

		// Check if each pressed arrow key correctly hits an arrow
		for (const [direction, arrow_key] of Object.entries(this.arrow_keys)) { // Loop through directions
			if (Phaser.Input.Keyboard.JustDown(arrow_key)) { // JustDown(key) returns true only once per key press

				let key_hit = false;
				for (var i = 0; i < this.arrows.length; i++) { // Loop through arrows
					if (Directions[direction] == this.arrows[i].direction) { // Check if arrow matches direction
						if (this.hit_window_start < this.arrows[i].y && this.arrows[i].y < this.hit_window_end) { // Check if arrow in hit window

							this.arrows[i].has_hit = true;
							this.arrows[i].visible = false;

							key_hit = true;
							this.hit_frame.play('hit_frame_flash');

							var offset = this.hit_window_start - this.arrows[i].y + ARROW_SIZE;
							console.log(this.hit_window_start)
							console.log(this.arrows[i].y)
							this.create_feedback_text(this_tick, Math.abs(offset))

							break; // Each key press should hit only one arrow, so break
						}
					}
				}
				if (!key_hit) { // If the key is pressed but had no matching arrow in the hit window, it's incorrect
					console.log('PENALTY INCORRECT ${this_tick}');
				}
			}
		}
	}
}


// Arrow class, with some extra info on top of sprite
class Arrow extends Phaser.GameObjects.Sprite {
	constructor(scene, x, y, start_tick, direction, hit_tick) {
		super(scene, x, y, 'arrows', direction);

		this.start_tick = start_tick;
		this.direction = direction;
		this.hit_tick = hit_tick;
		this.has_hit = false;
		this.has_missed = false;
	}
}

const Directions = {
	Up:    0,
	Right: 1,
	Down:  2,
	Left:  3
};

var config = {
    type: Phaser.AUTO,
    width: 640,
    height: 640,
    scene: [ Boot, GonDDR ]
};

const ARROW_SIZE    = 50;
const ARROW_START_Y = -ARROW_SIZE;
const ARROW_END_Y   = config.height + ARROW_SIZE;
const ARROW_HIT_Y   = config.height - 100

const ARROW_DIST_TOTAL  = ARROW_END_Y - ARROW_START_Y;
const ARROW_DIST_TO_HIT = ARROW_HIT_Y - ARROW_START_Y;


var game = new Phaser.Game(config);
