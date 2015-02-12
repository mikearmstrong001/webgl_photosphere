/*
 * Copyright (c) 2011 Brandon Jones
 *
 * This software is provided 'as-is', without any express or implied
 * warranty. In no event will the authors be held liable for any damages
 * arising from the use of this software.
 *
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 *
 *    1. The origin of this software must not be misrepresented; you must not
 *    claim that you wrote the original software. If you use this software
 *    in a product, an acknowledgment in the product documentation would be
 *    appreciated but is not required.
 *
 *    2. Altered source versions must be plainly marked as such, and must not
 *    be misrepresented as being the original software.
 *
 *    3. This notice may not be removed or altered from any source
 *    distribution.
 */

var pressed = new Array(128);
function filterDeadzone(value) {
	return Math.abs(value) > 0.35 ? value : 0;
}



function getShader(gl, id) {
    var shaderScript = document.getElementById(id);
    if (!shaderScript)
        return null;
 
    var str = '';
    var k = shaderScript.firstChild;
    while (k) {
        if (k.nodeType == 3)
            str += k.textContent;
        k = k.nextSibling;
    }
 
    var shader;
    if (shaderScript.type == 'x-shader/x-fragment') {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == 'x-shader/x-vertex') {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }
 
    gl.shaderSource(shader, str);
    gl.compileShader(shader);
 
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.debug(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
 
    return shader;
}

function createShaderProgram(gl, vertexSrc, fragmentSrc, attribs, uniforms) {
    var fragmentShader = getShader(gl, vertexSrc);
    var vertexShader = getShader(gl, fragmentSrc);

    var shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        gl.deleteProgram(shaderProgram);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        return null;
    }
    
    bindShaderVars(gl, shaderProgram, attribs, uniforms);
    
    return shaderProgram;
}

function bindShaderVars(gl, shaderProgram, attribs, uniforms) {
    if(attribs) {
        shaderProgram.attribute = {};
        for(var i in attribs) {
            var attrib = attribs[i];
            shaderProgram.attribute[attrib] = gl.getAttribLocation(shaderProgram, attrib);
        }
    }
    
    if(uniforms) {
        shaderProgram.uniform = {};
        for(var i in uniforms) {
            var uniform = uniforms[i];
            shaderProgram.uniform[uniform] = gl.getUniformLocation(shaderProgram, uniform);
        }
    }
}



// Set up event handling
// This will give us basic movement around the scene
function initEvents(canvas) {
    var movingModel = false;
    var lastX = 0;
    var lastY = 0;
    
    window.onkeydown = function(event) {
        pressed[event.keyCode] = true;
    }

    window.onkeyup = function(event) {
        pressed[event.keyCode] = false;
    }
    
    // Mouse handling code
    // When the mouse is pressed it rotates the players view
    canvas.onmousedown = function(event) {
        if(event.which == 1) {
            movingModel = true;
        }
        lastX = event.pageX;
        lastY = event.pageY;
    }
    canvas.onmouseup = function(event) {
        movingModel = false;
    }
    canvas.onmousemove = function(event) {
        var xDelta = event.pageX  - lastX;
        var yDelta = event.pageY  - lastY;
        lastX = event.pageX;
        lastY = event.pageY;
        
        if (movingModel) {
            zAngle += xDelta*0.025;
            while (zAngle < 0)
                zAngle += Math.PI*2;
            while (zAngle >= Math.PI*2)
                zAngle -= Math.PI*2;
                
            xAngle += yDelta*0.025;
            while (xAngle < -Math.PI*0.5)
                xAngle = -Math.PI*0.5;
            while (xAngle > Math.PI*0.5)
                xAngle = Math.PI*0.5;
        }
    }
}

// Normalizes requestAnimationFrame interface across browsers
var reqAnimFrame = (function(){
  return  window.requestAnimationFrame       || 
          window.webkitRequestAnimationFrame || 
          window.mozRequestAnimationFrame    || 
          window.oRequestAnimationFrame      || 
          window.msRequestAnimationFrame     || 
          function(callback, element){
            window.setTimeout(callback, 1000 / 60);
          };
})();

function requestAnimation(callback, element) {
    var startTime;
    //if(window.mozAnimationStartTime) {
    //    startTime = window.mozAnimationStartTime;
    //} else if (window.webkitAnimationStartTime) {
    //    startTime = window.webkitAnimationStartTime;
    //} else {
    startTime = new Date().getTime();
    //}
    
    var lastTimestamp = startTime;
    var lastFps = startTime;
    var framesPerSecond = 0;
    var frameCount = 0;
    
    function onFrame(timestamp){
        //if(!timestamp) {
            timestamp = new Date().getTime();
        //}

        // Update FPS if a second or more has passed since last FPS update
        if(timestamp - lastFps >= 1000) {
            framesPerSecond = frameCount;
            frameCount = 0;
            lastFps = timestamp;
        } 
        
        if(callback({
            startTime: startTime,
            timestamp: timestamp,
            elapsed: timestamp - startTime,
            frameTime: timestamp - lastTimestamp,
            framesPerSecond: framesPerSecond,
        }) !== false) {
            reqAnimFrame(onFrame, element);
            ++frameCount;
        }
    };
    
    onFrame(startTime);
};

// Utility function that tests a list of webgl contexts and returns when one can be created
// Hopefully this future-proofs us a bit
function getAvailableContext(canvas, contextList) {
    if (canvas.getContext) {
        for(var i = 0; i < contextList.length; ++i) {
            try {
                var context = canvas.getContext(contextList[i]);
                if(context != null)
                    return context;
            } catch(ex) { }
        }
    }
    return null;
}

// Create the WebGL context and set up some of the basic options. 
function setupWebGLSandbox(canvas, debug) {
    // Get the GL Context (try 'webgl' first, then fallback)
    var gl = getAvailableContext(canvas, ['webgl', 'experimental-webgl']);
    
    if(debug) {
        function throwOnGLError(err, funcName, args) {
          throw WebGLDebugUtils.glEnumToString(err) + " was caused by call to " + funcName;
        };
         
        gl = WebGLDebugUtils.makeDebugContext(gl, throwOnGLError);
    }
    
    if(!gl)
        throw "WebGL Failed to Initialize"

    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;
    
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    
    return gl;
}


// Set up event handling
function initEvents() {
	var movingModel = false;
	var lastX = 0;
	var lastY = 0;
	var lastMoveX = 0;
	var lastMoveY = 0;
	var viewport = document.getElementById("viewport");
	var viewportFrame = document.getElementById("viewport-frame");

	document.addEventListener("keydown", function (event) {
		pressed[event.keyCode] = true;
	}, false);

	document.addEventListener("keyup", function (event) {
		pressed[event.keyCode] = false;
	}, false);

	function startLook(x, y) {
		movingModel = true;

		lastX = x;
		lastY = y;
	}

	function endLook() {
		movingModel = false;
	}

	function moveLook(x, y) {
		var xDelta = x - lastX;
		var yDelta = y - lastY;
		lastX = x;
		lastY = y;

		if (movingModel) {
			moveLookLocked(xDelta, yDelta);
		}
	}

	function startMove(x, y) {
		lastMoveX = x;
		lastMoveY = y;
	}

	function moveUpdate(x, y, frameTime) {
		var xDelta = x - lastMoveX;
		var yDelta = y - lastMoveY;
		lastMoveX = x;
		lastMoveY = y;

		var dir = [xDelta, yDelta * -1, 0];

		moveViewOriented(dir, frameTime * 2);
	}

	viewport.addEventListener("click", function (event) {
		viewport.requestPointerLock();
	}, false);

	// Mouse handling code
	// When the mouse is pressed it rotates the players view
	viewport.addEventListener("mousedown", function (event) {
		if (event.which == 1) {
			startLook(event.pageX, event.pageY);
		}
	}, false);
	viewport.addEventListener("mouseup", function (event) {
		endLook();
	}, false);
	viewportFrame.addEventListener("mousemove", function (event) {
		if (document.pointerLockElement) {
			moveLookLocked(event.movementX, event.movementY);
		} else {
			moveLook(event.pageX, event.pageY);
		}
	}, false);

	// Touch handling code
	viewport.addEventListener('touchstart', function (event) {
		var touches = event.touches;
		switch (touches.length) {
			case 1: // Single finger looks around
			    startLook(touches[0].pageX, touches[0].pageY);
			    break;
			case 2: // Two fingers moves
			    startMove(touches[0].pageX, touches[0].pageY);
			    break;
			case 3: // Three finger tap jumps
			    playerMover.jump();
			    break;
			default:
			    return;
		}
		event.stopPropagation();
		event.preventDefault();
	}, false);
	viewport.addEventListener('touchend', function (event) {
		endLook();
		return false;
	}, false);
	viewport.addEventListener('touchmove', function (event) {
		var touches = event.touches;
		switch (touches.length) {
			case 1:
			    moveLook(touches[0].pageX, touches[0].pageY);
			    break;
			case 2:
			    moveUpdate(touches[0].pageX, touches[0].pageY, 16);
			    break;
			default:
			    return;
		}
		event.stopPropagation();
		event.preventDefault();
	}, false);
}

// everything below is more generic c+p stuff

function onFrame(gl, event) {
	// Update player movement @ 60hz
	// The while ensures that we update at a fixed rate even if the rendering bogs down
	updateFrame(event.frameTime,event);
	drawFrame(gl,event);
    return 0;
}

function renderLoop(gl, element) {
	var startTime = new Date().getTime();
	var lastTimestamp = startTime;
	var lastFps = startTime;
    var delta = 0;

	var frameId = 0;

	function onRequestedFrame() {
		timestamp = new Date().getTime();

		window.requestAnimationFrame(onRequestedFrame, element);

		frameId++;

		var err = onFrame(gl, {
			timestamp: timestamp,
			elapsed: timestamp - startTime,
			frameTime: (timestamp - lastTimestamp) + delta,
            frameId: frameId
		});
        delta = err;
        lastTimestamp = timestamp;
	}
	window.requestAnimationFrame(onRequestedFrame, element);
}
