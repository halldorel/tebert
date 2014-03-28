

var canvas;
var gl;

var numVertices  = 36;

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

var lightPosition = vec4(-2.0, 2.0, 4.0, 0.0 );
var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

var materialAmbient = vec4( 1.0, 0.0, 1.0, 1.0 );
var materialDiffuse = vec4( 1.0, 0.8, 0.0, 1.0);
var materialSpecular = vec4( 1.0, 0.8, 0.0, 1.0 );
var materialShininess = 100.0;

var ctm;
var ambientColor, diffuseColor, specularColor;
var modelView, projection;
var viewerPos;
var program;

var xAxis = 0;
var yAxis = 1;
var zAxis = 2;
var axis = 0;
var theta =[30.0, 0, 0];

var thetaLoc;

var flag = true;

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


window.onload = function init() {
    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.1, 0.1, 0.1, 1.0 );
    
    gl.enable(gl.DEPTH_TEST);
	//pointsArray.push(vec3(0, 0, 0));
	//normalsArray.push(vec3(0, 0, 0));

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
    colorCube();

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
    
    projection = perspective(70.0, 1024/768, 0.01, 1000.0);
    
    ambientProduct = mult(lightAmbient, materialAmbient);
    diffuseProduct = mult(lightDiffuse, materialDiffuse);
    specularProduct = mult(lightSpecular, materialSpecular);
/*
    document.getElementById("ButtonX").onclick = function(){axis = xAxis;};
    document.getElementById("ButtonY").onclick = function(){axis = yAxis;};
    document.getElementById("ButtonZ").onclick = function(){axis = zAxis;};
    document.getElementById("ButtonT").onclick = function(){flag = !flag;};
*/
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
    
    render();

    document.getElementById("toggleAnimation").onclick = function () {
        console.log("Let's dance!");
        shouldAnimate = !shouldAnimate;

    entities.hero.moveUpLeft();
    console.log(entities.hero.isIn());
    };
}


    /****************
    **             **
    **  Game code  **
    **             **
    *****************/


/** Draw the playing field **/

// Hard-coded playing field
var playingField =  [[1, 0, 0, 0, 1, 0, 0, 0, 0],
                     [0, 0, 0, 1, 2, 1, 0, 0, 0],
                     [0, 0, 1, 2, 3, 2, 1, 0, 0],
                     [0, 1, 2, 3, 4, 3, 2, 1, 0],
                     [1, 2, 3, 4, 5, 4, 3, 2, 1],
                     [0, 1, 2, 3, 4, 3, 2, 1, 0],
                     [0, 0, 1, 2, 3, 2, 1, 0, 0],
                     [0, 0, 0, 1, 2, 1, 0, 0, 0],
                     [0, 0, 0, 0, 1, 0, 0, 0, 0]];

/** Explanation for 'regions' **/

/***
The playing field is divided to 9 regions, as follows:

/----------------\
|      |   |     |
|   1  | 2 |  3  |
|----------------|
|   8  | 0 |  4  |
|----------------|
|   7  | 6 |  5  |
|      |   |     |
\----------------/

This is to make it easier to know what the controls should do
and where to position the camera.
***/

var rows = playingField.length;
var cols = playingField[0].length;

var rows_half = Math.floor(rows/2);

// To scale the playing field
var pfScale = 0.3;
var heroScale = 0.2;
var shouldAnimate = false;

var entities = {
    hero : {
        x: 3,
        y: 1,
        // Should be 'real' render pos with x and y as target pos
        // which the real ones are easing to in every update
        x_r: this.x,
        y_r: this.y,
        z_r: this.z,
        getZ : function () {
            return playingField[this.y][this.x]-1;
        },
        isIn: function () {
            // Hero is at top
            if ((this.x === this.y) && (this.x === Math.floor(rows/2)))
                return 0;
            if (this.x < rows_half)
            {
                // Hero is in field no 1
                if(this.y < rows_half)
                    return 1;
                // Hero is in field no 2
                else if(this.y > rows_half)
                    return 3;
                // Hero is between fields 1 and 4
                else
                    return 8;
            }
            else if(this.x > rows_half)
            {
                // Hero is in field no 3
                if(this.y < rows_half)
                    return 5;
                // Hero is in field no 4
                else if(this.y > rows_half)
                    return 7;
                // Hero is between fields 2 and 3
                else
                    return 4;
            }
            else
            {
                // Special case 5: Hero is between fields 1 and 2
                if(this.y < rows_half)
                    return 2;
                // Special case 6: Hero is between fields 3 and 4
                else if(this.y > rows_half)
                    return 6;
            }
        }, 
        moveUpLeft : function () {
            var i = this.isIn(); 
            if (i === 1 || i === 3 || i === 8) {
                this.x++;
                return true;
            }
            else if (i === 5 || i === 7 || i === 4) {
                this.x--;
                return true;
            }
            else if (i === 2) {
                this.y++;
                return true;
            }
            else if (i === 6) {
                this.y--;
                return true;
            }
            return false;
        },
        moveUpRight : function () {
            var i = this.isIn(); 
            if (i === 7 || i === 1 || i === 2) {
                this.y++;
                return true;
            }
            else if (i === 3 || i === 5 || i === 6) {
                this.y--;
                return true;
            }
            else if (i === 8) {
                this.x++;
                return true;
            }
            else if (i === 4) {
                this.x--;
                return true;
            }
            return false;
        },
        // To be fixed ... 
        moveDownLeft : function () {
            if (this.getZ() !== 0) {
                this.x--;
                return true;
            }
            return false;
        },
        moveDownRight : function () {
            if (this.getZ() !== 0) {
                this.y--;
                return true;
            }
            return false;
        },
        oldIn : 1,
        hasChangedRegion : function () {
            if (this.oldIn != this.isIn())
            {
                this.oldIn = this.isIn()
                return this.isIn();
            }
            return false;
        },
        update : function () {
            regionIfChanged = this.hasChangedRegion();
            if (regionIfChanged !== false)
            {
                console.log(regionIfChanged);
                entities.camera.toPos(regionIfChanged);
            }
        },
        render : function (modelView) {
            drawCubeAt(rows/2-this.x, this.getZ(),
                cols/2-this.y, heroScale, modelView);
        }
    },
    camera : {
        x: 30.0,
        y: -45.0,
        z: 0.0,
        x_r: this.x,
        y_r: this.y,
        x_r: this.z,
        toPos : function(region) {
            this.y = -90 + region * 45;
        },
        getPos : function () {
            return [x, y, z];
        },
        update : function () {
            return
        }
    }
};


window.onkeydown = function (e) {
    var code = e.keyCode ? e.keyCode : e.which;
    if (code === 37)        // Left
        entities.hero.moveUpLeft();
    else if (code === 38)   // Up
        entities.hero.moveUpRight();
    else if (code === 39)   // Right
        entities.hero.moveDownRight();
    else if (code === 40)   // Down
        entities.hero.moveDownLeft();
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
            current = playingField[i][j];
            if (current === 0) {
                continue;
            }
            else {
                drawCubeAt(rows/2-j, playingField[i][j]-2, cols/2-i, pfScale, modelView);
            }
        }
    }
}

// Draws a single cube to scale
function drawCubeAt (x, y, z, withScale, modelView) {
    // To get the relative center pos of cube
    x = pfScale * x - pfScale/2;
    y = pfScale * y - pfScale/2;
    z = pfScale * z - pfScale/2;
    
    modelView = mult(modelView, translate(x, y, z));
    modelView = mult(modelView, scale4(withScale, withScale, withScale));

    gl.uniformMatrix4fv( gl.getUniformLocation(program,
            "modelViewMatrix"), false, flatten(modelView) );
    gl.drawArrays( gl.TRIANGLES, 0, numVertices );
}

var update = function () {
    for (var entity in entities) {
        entities[entity].update();
    }
};

// Main render function
var render = function() {
    update();

    viewerPos = vec3(0.0, 0.0, -3.0 + 6*(entities.camera['x'])/360 );

    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    modelView = mat4();
    modelView = mult(modelView, translate(viewerPos));
    modelView = mult(modelView, rotate(entities.camera['x'], [1, 0, 0] ));
    modelView = mult(modelView, rotate(entities.camera['y'], [0, 1, 0] ));
    modelView = mult(modelView, rotate(entities.camera['z'], [0, 0, 1] ));

    if (shouldAnimate) {
        entities.camera['y'] += 0.4;
    }

    drawPlayingField(modelView);
	//renderExplosions();

    entities.hero.render(modelView);
//    drawHeroAt(entities.hero.x, entities.hero.y, modelView);
    requestAnimFrame(render);
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
	amplitude = amplitude || 100;
	var decrement = 0.001;
	function Particle(pos, i)
	{
		var half = (i/2);
		this.pos = pos;
		this.life = Math.random();
		this.vel = vec3(Math.random()*i - half, Math.random()*i - half, Math.random()*i - half);
		this.update = function() {
			if (this.life >= 0.0)
			{
				this.pos = add(this.pos, this.vel);
				this.vel[1] -= decrement;
				this.life -= decrement;
			}
		};
		this.render = function() {
			if (this.life >= 0.0)
			{
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
				this.particles[i].render();
				this.particles[i].update();
				if (this.particles[i].life <= 0.0)
				{
					this.particles[i] = null;
				}
			}
		}
	}
}

function renderExplosions()
{
	if (explosionArray.length == 0)
	{
		console.log("new");
		explosionArray.push(new Explosion());
	}
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
