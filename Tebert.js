

var canvas;
var gl;

var numVertices  = 36;
var numBeethoven = 0;

var pointsArray = [];
var normalsArray = [];

// Contains all objects of type Explosion
var explosionArray = [];

var vertices = [
		vec4( -0.5, -0.5,  0.5, 1.0 ),
		vec4( -0.5,  0.5,  0.5, 1.0 ),
		vec4( 0.5,  0.5,  0.5, 1.0 ),
		vec4( 0.5, -0.5,  0.5, 1.0 ),
		vec4( -0.5, -0.5, -0.5, 1.0 ),
		vec4( -0.5,  0.5, -0.5, 1.0 ),
		vec4( 0.5,  0.5, -0.5, 1.0 ),
		vec4( 0.5, -0.5, -0.5, 1.0 )
	];

var lightPosition = vec4( -15.0, 2.0, 10.0, 0.0 );
var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 0.8, 0.1, 0.8, 1.0 );

var materialAmbient = vec4( 1.0, 0.0, 1.0, 1.0 );
var materialDiffuse = vec4( 1.0, 0.8, 0.0, 1.0);
var materialSpecular = vec4( 1.0, 0.0, 1.0, 1.0 );
var materialShininess = 500.0;


var claimedAmbient = vec4( 0.7, 0.3, 1.0, 1.0 );
var claimedDiffuse = vec4( 0.5, 0.0, 0.1, 1.0);
var claimedSpecular = vec4( 0.3, 0.0, 0.1, 1.0 );

var ctm;
var ambientColor, diffuseColor, specularColor;
var modelView, projection;
var viewerPos;
var program;

var xAxis = 0;
var yAxis = 1;
var zAxis = 2;
var axis = 0;

var thetaLoc;

var flag = true;

// ccw is true when moving between zones 1 and 8.
var ccw = false;
var level = 7;

function quad(a, b, c, d) {

	 var t1 = subtract(vertices[b], vertices[a]);
	 var t2 = subtract(vertices[c], vertices[b]);
	 var normal = cross(t1, t2);
	 var normal = vec3(normal);
	 normal = normalize(normal);

	 pointsArray.push(vertices[a]); 
	 normalsArray.push(normal); 
	 pointsArray.push(vertices[b]); 
	 normalsArray.push(normal); 
	 pointsArray.push(vertices[c]); 
	 normalsArray.push(normal);   
	 pointsArray.push(vertices[a]);  
	 normalsArray.push(normal); 
	 pointsArray.push(vertices[c]); 
	 normalsArray.push(normal); 
	 pointsArray.push(vertices[d]); 
	 normalsArray.push(normal);    
}

function colorCube()
{
	quad( 1, 0, 3, 2 );
	quad( 2, 3, 7, 6 );
	quad( 3, 0, 4, 7 );
	quad( 6, 5, 1, 2 );
	quad( 4, 5, 6, 7 );
	quad( 5, 4, 0, 1 );
}

/** Load Ply **/

function plyInit() {
	var parser = PlyReader();
	var parsed = parser.read('beethoven.ply');

	numBeethoven = parsed.points.length;

	for (var i = 0; i < parsed.points.length; ++i)
	{
		pointsArray.push(parsed.points[i]);
		normal = vec3(parsed.normals[i][0], parsed.normals[i][1], parsed.normals[i][2])
		normalsArray.push(normal);
	}
}

	/****************
	**             **
	**  Game code  **
	**             **
	*****************/


/** Draw the playing field **/

function createTable(level)
{
	var field = []
	field[level-1] = []
	field[level-1][level-1] = level;
	for(var i = 1; i < level; i++)
	{
		field[level-1][level-1 - i] = level - i;
		field[level-1][level-1 + i] = level - i;
	}
	for(var i = 1; i < level; i++)
	{
		field[level-1 - i] = [];
		field[level-1 + i] = [];
		for(var j = 0; j < (level*2)-1; j++)
		{
			var a = field[level-1][j] - i;
			field[level-1 - i][j] = (a > 0) ? a : 0;
			field[level-1 + i][j] = (a > 0) ? a : 0;
		}
	}
	return field;
}

var playingField = createTable(level);



var opts = {
	UNCLAIMED       : 0,
	CLAIMING        : 1,
	CLAIMED         : 2,
	UNCLAIMING      : 3,
	PAINTERS_MIN    : 0.0005,
	PAINTERS_MED    : 0.0001,
	PAINTERS_MAX    : 0.005
}

// Creates an array with the same dimensions as the playing field
// which denotes whether an individual block in the field has been
// claimed by the player
function createClaims(field)
{
	var claims = [];
	for(var i = 0; i < field.length; i++)
	{
		claims[i] = [];
		for(var j = 0; j < field[i].length; j++)
		{
			if (field[i][j] === 0) continue;
			{
				claims[i][j] = opts.UNCLAIMED;
			}
		}
	}
	return claims;
}

function easeClaim(x, y)
{
	var speed = 40;
	var delta = 0.02;
	if (claims[x][y] === opts.CLAIMING)
	{
		claimColor[x][y] += (1 - claimColor[x][y]) / speed;
		if (1 - claimColor[x][y] < delta)
		{
			claimColor[x][y] = 1;
			claims[x][y] = opts.CLAIMED;
		}
	}
	else if (claims[x][y] === opts.UNCLAIMING)
	{
		//claimColor[x][y] = 0;
		//claims[x][y] = opts.UNCLAIMED;
		//return;
		claimColor[x][y] += (-claimColor[x][y]) / speed;
		if (claimColor[x][y] < delta)
		{
			claimColor[x][y] = 0;
			claims[x][y] = opts.UNCLAIMED;
		}
	}
}

var claims = createClaims(playingField);
// claimColor tracks easing color of block in transition
var claimColor = createClaims(playingField);
claims[level-1][level-1] = 1;

function claimBlock(x, y, claim)
{
	if (claim === opts.CLAIMING)
	{
		if (claims[x][y] != opts.CLAIMED)
			claims[x][y] = claim;
	}
	else if (claim === opts.UNCLAIMING)
	{
		if (claims[x][y] != opts.UNCLAIMED)
			claims[x][y] = claim;
	}
}


/** Explanation for 'regions' **/

/***
The playing field is divided to 9 regions, as follows:

/---------------\
|     |   |     |
|  1  | 2 |  3  |
|---------------|
|  8  | 0 |  4  |
|---------------|
|  7  | 6 |  5  |
|     |   |     |
\---------------/

This is to make it easier to know what the controls should do
and where to position the camera.
***/

var rows = playingField.length;
var cols = playingField[0].length;

var rowsHalf = Math.floor(rows/2);
var maxLevel = playingField[rowsHalf][rowsHalf];

// To scale the playing field
var pfScale = 0.3;
var heroScale = 0.2;
var shouldAnimate = false;

var entities = {
	hero : {
		x: rowsHalf,
		y: rowsHalf,
		oldX : rowsHalf,
		oldY : rowsHalf,
		getZ : function () {
			return playingField[this.y][this.x]-1;
		},
		// Should be 'real' render pos with x and y as target pos
		// which the real ones are easing to in every update
		x_r: 30,
		y_r: 10,
		z_r: 0,
		lastDirection: 180.0,
		direction: 180.0,
		speedFactor: 100,
		isIn: function () {
			// Hero is at top
			if ((this.x === this.y) && (this.x === Math.floor(rows/2)))
				return 0;
			if (this.x < rowsHalf) {
				if(this.y < rowsHalf)
					return 1;
				else if(this.y > rowsHalf)
					return 7;
				else
					return 8;
			}
			else if(this.x > rowsHalf) {
				if(this.y < rowsHalf)
					return 3;
				else if(this.y > rowsHalf)
					return 5;
				else
					return 4;
			}
			else {
				if(this.y < rowsHalf)
					return 2;
				else if(this.y > rowsHalf)
					return 6;
			}
		}, 
		moveUpLeft : function () {
			this.oldX = this.x;
			this.oldY = this.y;
			var i = this.isIn();
			if (this.getZ() === 0 && (this.isIn() % 2 === 0)) return;
			switch (i) {
				case 0:
				case 5:
				case 6:
					this.x--;
					break;
				case 1:
				case 2:
					this.x++;
					break;
				case 3:
				case 4:
					this.y++;
					break;
				case 7:
				case 8:
					this.y--;
					break;
			}
			this.direction = -this.isIn()*45.0;
			if (i % 2 === 0) this.direction += 45.0;
			this.direction -= 45.0;
		},
		moveUpRight : function () {
			this.oldX = this.x;
			this.oldY = this.y;
			var i = this.isIn();
			switch (i) {
				case 0:
				case 5:
				case 6:
					this.y--;
					break;
				case 1:
				case 2:
					this.y++;
					break;
				case 3:
				case 4:
					this.x--;
					break;
				case 7:
				case 8:
					this.x++;
					break;
			}
			this.direction = -this.isIn()*45.0;
			if (i % 2 === 0) this.direction += 45.0;
			this.direction -= 135.0;
		},
		moveDownLeft : function () {
			this.oldX = this.x;
			this.oldY = this.y;
			var i = this.isIn();
			if (this.getZ() === 0) return;
			switch (i) {
				case 0:
				case 5:
				case 6:
					this.y++;
					break;
				case 1:
				case 2:
					this.y--;
					break;
				case 3:
				case 4:
					this.x++;
					break;
				case 7:
				case 8:
					this.x--;
					break;
			}
			this.direction = -this.isIn()*45.0+45.0;
			if (i % 2 === 0) this.direction += 45.0;
		},
		moveDownRight : function () {
			this.oldX = this.x;
			this.oldY = this.y;
			if (this.getZ() === 0) return;
			var i = this.isIn();
			if (this.getZ() === 0 && (this.isIn() % 2 === 0)) return;
			switch (i) {
				case 0:
				case 5:
				case 6:
					this.x++;
					break;
				case 1:
				case 2:
					this.x--;
					break;
				case 3:
				case 4:
					this.y--;
					break;
				case 7:
				case 8:
					this.y++;
					break;
			}
			this.direction = -this.isIn()*45.0+45.0;
			this.direction += 90.0;
		},
		oldIn : rowsHalf,
		hasChangedRegion : function () {
			newIn = this.isIn()
			if (this.oldIn != newIn) {
				res = { oldIn : this.oldIn, newIn : newIn};
				this.oldIn = newIn
				return res;
			}
			return false;
		},
		oldZ : maxLevel,
		hasChangedLevel : function () {
			// Level refers to height level of playingField
			newZ = this.getZ();
			if (this.oldZ != newZ) {
				res = { oldZ : this.oldZ, newZ : newZ };
				this.oldZ = newZ
				return res;
			}
			return false;
		},
		isEasing : function() {
			var delta = 0.1;
			var dX = Math.abs(this.x - this.x_r);
			var dY = Math.abs(this.y - this.y_r);
			var dZ = Math.abs(this.getZ() - this.z_r);
			if (dX > delta) return true;
			if (dY > delta) return true;
			if (dZ > delta) return true;
			return false;
		},
		update : function () {
			easeToFancy(this, 5, 0.3);
		},
		render : function (modelView) {
			drawBeethovenAt(rows/2-this.x_r, this.z_r,
				cols/2-this.y_r, 0.2, modelView);
		}
	},
	camera : {
		x: 30.0,
		y: -45.0,
		z: 0.0,
		x_r: 30.0,
		y_r: 0.0,
		z_r: 0.0,
		toPosOnRegionChange : function(region) {
			if (region === 0) {
				// Special case, if on top
				this.y = 180.0;
				return
			}
			this.y = -90 + region * 45;
		},

		toPosOnLevelChange : function(level) {
			this.x = 30 + 60 * (level+1)/maxLevel;
		},
		getPos : function () {
			return [x, y, z];
		},
		update : function () {
			regionIfChanged = entities.hero.hasChangedRegion();
			levelIfChanged = entities.hero.hasChangedLevel();
			if (regionIfChanged !== false)
			{
				oldReg = regionIfChanged.oldIn;
				newReg = regionIfChanged.newIn;

				// If we are transitioning from sector 8 to sector 1
				// we move the camera to -45 degrees and ease up to 0,
				// rather than easing from 315 down to 0 
				if (oldReg === 8 && newReg === 1)
				{
					this.y = -45.0;
					this.y_r -= 360.0;
				}
				// Likewise, if we're transitioning from sector 1 to
				// sector 8, we move the camera from 360 to 315, rather
				// than from 0 to 315
				else if (oldReg === 1 && newReg == 8)
				{
				   this.y = 315.0;
				   this.y_r += 360.0;
				}
				this.toPosOnRegionChange(regionIfChanged.newIn);
			}
			if (levelIfChanged !== false)
			{
				this.toPosOnLevelChange(levelIfChanged.newZ);
			}
			easeTo(this, 20);
		},
		render : function (modelView){ return; }
	},
	painters : {
		painters : [],
		update : function() {
			if (Math.random() < opts.PAINTERS_MED) this.painters.push(new Painter());
			for (var i = 0; i < this.painters.length;)
			{
				// Painter.update() returns false if the Painter has reached lowest
				// level and should be deallocated
				if(!this.painters[i].update())
				{
					this.painters.splice(i, 1);
				}
				else
				{
					i++;
				}
			}
		},
		render : function(modelView) {
			for (var i = 0; i < this.painters.length; i++)
			{
				this.painters[i].render(modelView);
			}
		} 
	},
	snakes : {
		snakes : [],
		update : function() {
			for (var i = 0; i < this.snakes.length; i++)
			{
				this.snakes[i].update();
			}
		},
		render : function(modelView) {
			for (var i = 0; i < this.snakes.length; i++)
			{
				this.snakes[i].render(modelView);
			}
		}
	}
};

// entity is an object that has attributes x, y, getZ() and
// x_r, y_r, z_r. easteToFancy eases x_r, y_r to x, y.
// When they are within delta of each other, easeToFancy
// starts easying z_r to getZ().
function easeToFancy(entity, speed, delta)
{
	if (entity.getZ() > entity.z_r)
	{
		entity.z_r += (entity.getZ() - entity.z_r) / speed;
		if (entity.getZ() - entity.z_r < delta)
		{
			entity.x_r += (entity.x - entity.x_r) / speed;
			entity.y_r += (entity.y - entity.y_r) / speed;
		}
	}
	else
	{
		entity.x_r += (entity.x - entity.x_r) / speed;
		entity.y_r += (entity.y - entity.y_r) / speed;
		var deltaX = Math.abs(entity.x - entity.x_r);
		var deltaY = Math.abs(entity.y - entity.y_r);
		if (deltaX < delta && deltaY < delta)
		{
			entity.z_r += (entity.getZ() - entity.z_r) / speed;
		}
	}
}

// entity has attributes x, y, z and x_r, y_r, z_r
// easeTo eases x_r, y_r z_r to x, y, z with speed
// as an inverse speed factor.
function easeTo(entity, speed)
{
	entity.x_r += (entity.x - entity.x_r) / speed;
	entity.y_r += (entity.y - entity.y_r) / speed;
	entity.z_r += (entity.z - entity.z_r) / speed;
}

function Painter(x, y, speed, leniency, scale)
{
	this.speed = speed || Math.random()*5 + 2;
	this.l = leniency || 0.1;
	this.scale = scale || 0.1*Math.random() + 0.1;
	
	// Default to center
	this.x = x || level - 1;
	this.y = y || level - 1;
	// Unclaim the block that the Painter lands on
	claimBlock(this.y, this.x, opts.UNCLAIMING);
	this.getZ = function()
	{
		var l = playingField[this.y];
		if (l !== undefined) l = l[this.x];
		if (l !== undefined) l--;
		// If Painter has jumped off lowest level, he takes a plunge
		return (l !== undefined && l >= 0) ? l : -10;
	}
	this.x_r = this.x;
	this.y_r = this.y;
	// We let the Painter drop to the table from a height
	this.z_r = this.getZ() + 10;
	// Attempts to jump down to a block that has been claimed
	this.chooseAction = function()
	{
		if (this.getZ() == -10) return;
		options = [];
		// If Painter is on the lowest step of sections 2, 4, 6, or 8
		if (playingField[this.x][this.y-1] === undefined)
		{
			this.y--;
			return;
		}
		if (playingField[this.x][this.y+1] === undefined)
		{
			this.y++;
			return;
		}
		if (playingField[this.x-1] === undefined)
		{
			this.x--;
			return;
		}
		if (playingField[this.x+1] === undefined)
		{
			this.x++;
			return;
		}
		if (playingField[this.x][this.y-1]-1 < this.getZ()) options.push({x: this.x, y: this.y-1, claimed: false});
		if (playingField[this.x][this.y+1]-1 < this.getZ()) options.push({x: this.x, y: this.y+1, claimed: false});
		if (playingField[this.x-1][this.y]-1 < this.getZ()) options.push({x: this.x-1, y: this.y, claimed: false});
		if (playingField[this.x+1][this.y]-1 < this.getZ()) options.push({x: this.x+1, y: this.y, claimed: false});
		var claimedExists = false;
		for (var i = 0; i < options.length; i++)
		{
			if (claims[options[i].y][options[i].x] === opts.CLAIMING || claims[options[i].y][options[i].x] === opts.CLAIMED)
			{
				options[i].claimed = true;
				claimedExists = true;
			}
		}
		if (claimedExists)
		{
			// If at least one of the destination options is claimed,
			// we pop all unclaimed destination options from the array
			for (var i = 0; i < options.length; )
			{
				if (!options[i].claimed)
				{
					options.splice(i, 1);
				}
				else
				{
					i++;
				}
			}
		}
		var choice = options[Math.floor(Math.random() * options.length)];
		this.x = choice.x;
		this.y = choice.y;
		if (playingField[this.x][this.y])
			claimBlock(this.y, this.x, opts.UNCLAIMING);
	}
	this.update = function()
	{
		if (Math.abs(this.x - this.x_r) < this.l && Math.abs(this.y - this.y_r) < this.l && Math.abs(this.getZ() - this.z_r) < this.l)
		{
			this.chooseAction();
		}
		easeToFancy(this, this.speed, this.l);
		return (this.z_r + 10) > this.l;
	}
	this.render = function(modelView)
	{
		drawCubeAt(rows/2-this.x_r, this.z_r, cols/2-this.y_r, this.scale, modelView);
	}
}

function Snakur(x, y, speed, leniency, scale)
{
	this.speed = speed || 15;
	this.l = leniency || 0.05;
	this.scale = scale || 0.3;
	
	// Default to center
	this.x = x || level - 1;
	this.y = y || level - 1;
	this.getZ = function() {return playingField[this.x][this.y]-1;};
	console.log("created")
	this.x_r = this.x;
	this.y_r = this.y;
	// We let the Snake drop to the table from a height
	this.z_r = this.getZ();// + 10;

	// Attempts to move the Snake one block closer to target
	this.chooseAction = function(target)
	{
		var dx = Math.round(Math.abs(target.x - this.x));
		var dy = Math.round(Math.abs(target.y - this.y));
		if (dx > dy)
		{
			if(this.x < target.x) this.x++;
			else this.x--;
		}
		else
		{
			if(this.y < target.y) this.y++;
			else this.y--;
		}
	}
	this.update = function()
	{
		if (Math.abs(this.x - this.x_r) < this.l && Math.abs(this.y - this.y_r) < this.l && Math.abs(this.getZ() - this.z_r) < this.l)
		{
			this.chooseAction(entities.hero);
		}
		
		easeToFancy(this, this.speed, this.l);
	}
	this.render = function(modelView)
	{
		drawCubeAt(rows/2-this.x_r, this.z_r, cols/2-this.y_r, this.scale, modelView);
	}

}

/*****************************
 *                           *
 *     Keyboard handling     *
 *                           *
 *****************************/

window.onkeydown = function (e) {
	if (entities.hero.isEasing()) return;
	var code = e.keyCode ? e.keyCode : e.which;
	if (code === 37)        // Left
		entities.hero.moveUpLeft();
	else if (code === 38)   // Up
		entities.hero.moveUpRight();
	else if (code === 39)   // Right
		entities.hero.moveDownRight();
	else if (code === 40)   // Down
		entities.hero.moveDownLeft();
	else if (code === 83)
		entities.painters.painters.push(new Painter());
	else if (code === 68)
		entities.snakes.snakes.push(new Snakur());
	claimBlock(entities.hero.y, entities.hero.x, opts.CLAIMING);
	//explosionArray.push(new Explosion([entities.hero.x, entities.hero.y, entities.hero.getZ()]));
}

/** Mouse handling stuff **/
var mouseDelta = { x : 0, y : 0 };
var lastMouse = { x : 0, y : 0 };
var button = false;

function negate() {
	button = !button;
}

window.onmouseup = negate;
window.onmousedown = negate;

window.onmousemove = function (e) {
	if (button)
	{
		entities.camera['y'] += 1.0 * mouseDelta.x;
		entities.camera['x'] += 1.0 * mouseDelta.y;

		mouseDelta.x = e.x - lastMouse.x;
		mouseDelta.y = e.y - lastMouse.y;
	}
	else
	{
		mouseDelta = { x : 0, y : 0 };
		lastMouse = { x : 0, y : 0 };
	}

	lastMouse.x = e.x;
	lastMouse.y = e.y;
};


// Draws playing field to scale
function drawPlayingField(modelView) {
	var rows = playingField.length;
	var cols = playingField[0].length;
	for (var i = 0; i < rows; ++i) {
		for (var j = 0; j < cols; ++j) {
			easeClaim(i, j);
			current = playingField[i][j];
			if (current === 0) {
				continue;
			}
			else {
				drawCubeAt(rows/2-j, playingField[i][j]-2, cols/2-i, pfScale, modelView, claims[i][j], claimColor[i][j]);
				//if (claims[i][j] === opts.CLAIMING || claims[i][j] === opts.UNCLAIMING)
				//{
					easeClaim(i, j);
				//}
			}
		}
	}
}

// Draws a single cube to scale
function drawCubeAt (x, y, z, withScale, modelView, claimed, c, thing) {
	claimed = claimed || false;
	// To get the relative center pos of cube
	x = pfScale * x - pfScale/2;
	y = pfScale * y - pfScale/2;
	z = pfScale * z - pfScale/2;
	
	modelView = mult(modelView, translate(x, y, z));
	modelView = mult(modelView, scale4(withScale, withScale, withScale));

	ambientProduct = mult(lightAmbient, add(mult([c, c, c, 1], materialAmbient), mult([1-c, 1-c, 1-c, 1], claimedAmbient)));
	diffuseProduct = mult(lightDiffuse, add(mult([c, c, c, 1], materialDiffuse), mult([1-c, 1-c, 1-c, 1], claimedDiffuse)));
	specularProduct = mult(lightSpecular, add(mult([c, c, c, 1], materialSpecular), mult([1-c, 1-c, 1-c, 1], claimedSpecular)));


	//console.log(ambientProduct);
	gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"),
		flatten(ambientProduct));
	gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"),
		flatten(diffuseProduct) );
	gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), 
		flatten(specularProduct) ); 

	gl.uniformMatrix4fv( gl.getUniformLocation(program,
			"modelViewMatrix"), false, flatten(modelView) );

	gl.drawArrays( gl.TRIANGLES, 0, numVertices );

}

function drawBeethovenAt(x, y, z, withScale, modelView) {    // To get the relative center pos of cube
	x = pfScale * x - pfScale/2;
	y = pfScale * y - pfScale/2;
	z = pfScale * z - pfScale/2;
	modelView = mult(modelView, translate(x, y, z));
	modelView = mult(modelView, scale4(withScale, withScale, withScale));
	modelView = mult(modelView, rotate(entities.hero.direction, [0, 1, 0]));
	modelView = mult(modelView, rotate(-55.0, [1, 0, 0]));

	ambientProduct = mult(lightAmbient, materialAmbient);
	diffuseProduct = mult(lightDiffuse, materialDiffuse);
	specularProduct = mult(lightSpecular, materialSpecular);

	//console.log(ambientProduct);
	gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"),
		flatten(ambientProduct));
	gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"),
		flatten(diffuseProduct) );
	gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), 
		flatten(specularProduct) ); 

	gl.uniformMatrix4fv( gl.getUniformLocation(program,
			"modelViewMatrix"), false, flatten(modelView) );

	gl.drawArrays( gl.TRIANGLES, numVertices, numBeethoven );
}

var update = function () {
	// Update all entities on the table
	for (var entity in entities) {
		entities[entity].update();
	}
	// Check for collisions between Snakes and Player
	var collision = collisionCheck();
	
	// Check whether all blocks have been claimed by player
	var victory = victoryCheck();
	if (collision) console.log("Tap!");
	else if (victory) console.log("Sigur!");
};

function collisionCheck()
{
	var delta = 0.1
	var h = entities.hero
	for (var i = 0; i < entities.snakes.snakes.length; i++)
	{
		var s = entities.snakes.snakes[i];
		if (Math.abs(h.x_r - s.x_r) < delta && Math.abs(h.y_r - s.y_r) < delta && Math.abs(h.getZ() - s.getZ()) < delta)
		{
			return true;
		}
	}
	return false;
}

function victoryCheck()
{
	for (var i = 0; i < claims.length; i++)
	{
		for (var j in claims[i])
		{
			if (claims[i][j] === opts.UNCLAIMED || claims[i][j] === opts.UNCLAIMING) return false;
		}
	}
	return true;
}

// Main render function
var mainIterator = function() {
	update();

	viewerPos = vec3(0.0, 0.0, -(2.5 + 0.3 * (1.5*maxLevel - entities.hero.z_r)));

	gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	modelView = mat4();
	modelView = mult(modelView, translate(viewerPos));
	modelView = mult(modelView, rotate(entities.camera['x_r'], [1, 0, 0] ));
	modelView = mult(modelView, rotate(entities.camera['y_r'], [0, 1, 0] ));
	modelView = mult(modelView, rotate(entities.camera['z_r'], [0, 0, 1] ));

	drawPlayingField(modelView);
	renderExplosions(modelView);

	for(var entity in entities) {
		entities[entity].render(modelView);
	}

	requestAnimFrame(mainIterator);
}


/**************************
 **                      **
 **  Bells and whistles  **
 **                      **
 **************************/

function Explosion(pos, intensity, amplitude)
{
	pos = pos || vec3(0.0, 0.5, 0.0);
	intensity = intensity || 0.05;
	amplitude = amplitude || 50;
	var decrement = 0.001;
	function Particle(pos, i)
	{
		var half = (i/2);
		this.pos = pos;
		this.life = Math.random() - 0.5;
		this.vel = vec3(Math.random()*i - half, Math.random()*i - half, Math.random()*i - half);
		this.update = function() {
			if (this.life >= 0.0)
			{
				this.pos = add(this.pos, this.vel);
				this.vel[1] -= decrement;
				this.life -= decrement;
			}
		};
		this.render = function(modelView) {
			if (this.life >= 0.0)
			{
				//var mv = mult(modelView, scale4(withScale, withScale, withScale));
				var mv = mult(modelView, translate(this.pos[0], this.pos[1], this.pos[2]));
				mv = mult(mv, scale4(0.02, 0.02, 0.02));
				gl.uniformMatrix4fv( gl.getUniformLocation(program,
						"modelViewMatrix"), false, flatten(mv) );
				gl.drawArrays( gl.TRIANGLES, 0, numVertices);
			}   
		}
	}

	this.particles = [];
	for (var i = 0; i < amplitude; i++)
	{
		this.particles[i] = new Particle(pos, intensity);
	}
	this.update = function() {
		for (var i = 0; i < this.particles.length; i++)
		{
			if (this.particles[i] != null)
			{
				this.particles[i].render(modelView);
				this.particles[i].update();
				if (this.particles[i].life <= 0.0)
				{
					this.particles[i] = null;
				}
			}
		}
	}
}

function renderExplosions(modelView)
{
	for (var i = 0; i < explosionArray.length;)
	{
		explosionArray[i].update();
		var active = false;
		for (var j = 0; j < explosionArray[i].particles.length; j++)
		{
			if (explosionArray[i].particles[j] != null)
			{
				active = true;
				break;
			}
		}
		if (active)
		{
			i++;
		}
		else
		{
			explosionArray.splice(i, 1);
		}
	}	
}

window.onload = function init() {
	canvas = document.getElementById( "gl-canvas" );
	
	gl = WebGLUtils.setupWebGL( canvas );
	if ( !gl ) { alert( "WebGL isn't available" ); }

	gl.viewport( 0, 0, canvas.width, canvas.height );
	gl.clearColor( 0.1, 0.1, 0.1, 1.0 );
	
	gl.enable(gl.DEPTH_TEST);
	//
	//  Load shaders and initialize attribute buffers
	//
	program = initShaders( gl, "vertex-shader", "fragment-shader" );
	gl.useProgram( program );
	
	colorCube();
	plyInit();

	var nBuffer = gl.createBuffer();
	gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer );
	gl.bufferData( gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW );
	
	var vNormal = gl.getAttribLocation( program, "vNormal" );
	gl.vertexAttribPointer( vNormal, 3, gl.FLOAT, false, 0, 0 );
	gl.enableVertexAttribArray( vNormal );

	var vBuffer = gl.createBuffer();
	gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
	gl.bufferData( gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW );
	
	var vPosition = gl.getAttribLocation(program, "vPosition");
	gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vPosition);

	thetaLoc = gl.getUniformLocation(program, "theta"); 
	
	projection = perspective(60.0, 800/800, 0.01, 1000.0);
	
	ambientProduct = mult(lightAmbient, materialAmbient);
	diffuseProduct = mult(lightDiffuse, materialDiffuse);
	specularProduct = mult(lightSpecular, materialSpecular);
	gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"),
	   flatten(ambientProduct));
	gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"),
	   flatten(diffuseProduct) );
	gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), 
	   flatten(specularProduct) );  
	gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), 
	   flatten(lightPosition) );
	   
	gl.uniform1f(gl.getUniformLocation(program, 
	   "shininess"),materialShininess);
	
	gl.uniformMatrix4fv( gl.getUniformLocation(program, "projectionMatrix"),
	   false, flatten(projection));
	
	mainIterator();
}
