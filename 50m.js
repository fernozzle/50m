function addCommas (num) {
	return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

var camera, scene, renderer;
var geometry, material, mesh;
var controls;

var objects = [];

var particleCount = 5e5, maxDistance = Math.pow(120, 2);
var positions, alphas, particles, _particleGeom

var clock = new THREE.Clock();

var blocker = document.getElementById( 'blocker' );
var instructions = document.getElementById( 'instructions' );


function init() {

	document.getElementById('sprite-count').innerText = addCommas (particleCount);
	camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000000);

	scene = new THREE.Scene();

	controls = new THREE.FirstPersonControls( camera );
	controls.movementSpeed = 100;
	controls.lookSpeed = 0.1;

	var materials = [

		new THREE.MeshBasicMaterial( { map: THREE.ImageUtils.loadTexture( 'textures/cube/skybox/px.jpg' ) } ), // right
		new THREE.MeshBasicMaterial( { map: THREE.ImageUtils.loadTexture( 'textures/cube/skybox/nx.jpg' ) } ), // left
		new THREE.MeshBasicMaterial( { map: THREE.ImageUtils.loadTexture( 'textures/cube/skybox/py.jpg' ) } ), // top
		new THREE.MeshBasicMaterial( { map: THREE.ImageUtils.loadTexture( 'textures/cube/skybox/ny.jpg' ) } ), // bottom
		new THREE.MeshBasicMaterial( { map: THREE.ImageUtils.loadTexture( 'textures/cube/skybox/pz.jpg' ) } ), // back
		new THREE.MeshBasicMaterial( { map: THREE.ImageUtils.loadTexture( 'textures/cube/skybox/nz.jpg' ) } )  // front

	];

	mesh = new THREE.Mesh( new THREE.BoxGeometry( 10000, 10000, 10000, 7, 7, 7 ), new THREE.MeshFaceMaterial( materials ) );
	mesh.scale.x = - 1;
	scene.add(mesh);

	//

	renderer = new THREE.WebGLRenderer(); // Detector.webgl? new THREE.WebGLRenderer(): new THREE.CanvasRenderer()
	renderer.setSize( window.innerWidth, window.innerHeight );

	document.body.appendChild( renderer.domElement );

	// create the custom shader
	var imagePreviewTexture = THREE.ImageUtils.loadTexture( 'textures/crate.gif');
	imagePreviewTexture.minFilter = THREE.LinearMipMapLinearFilter;
	imagePreviewTexture.magFilter = THREE.LinearFilter;

	pointShaderMaterial = new THREE.ShaderMaterial( {
		uniforms: {
			tex1: { type: "t", value: imagePreviewTexture },
			zoom: { type: 'f', value: 9.0 },
		},
		attributes: {
			alpha: { type: 'f', value: null },
		},
		vertexShader:   document.getElementById( 'vertexshader' ).textContent,
		fragmentShader: document.getElementById( 'fragmentshader' ).textContent,
		transparent: true
	});


	//create particles with buffer geometry
	var distanceFunction = function(a, b){
		return Math.pow(a[0] - b[0], 2) +  Math.pow(a[1] - b[1], 2) +  Math.pow(a[2] - b[2], 2);
	};

	_particleGeom = new THREE.BufferGeometry();
	_particleGeom.attributes = {

		position: {
			itemSize: 3,
			array: new Float32Array( particleCount * 3 )
		},

		alpha: {
			itemSize: 1,
			array: new Float32Array( particleCount )
		}

	};
	positions = _particleGeom.attributes.position.array;
	alphas = _particleGeom.attributes.alpha.array;

	particles = new THREE.PointCloud( _particleGeom, pointShaderMaterial );
	particles.dynamic = true;

	var printEvery = 1e4;
	for (var x = 0; x < particleCount; x++) {
		do {
			positions[ x * 3 + 0 ] = Math.random() * 1000;
			positions[ x * 3 + 1 ] = Math.random() * 1000;
			positions[ x * 3 + 2 ] = Math.random() * 1000;
		} while (Math.pow(positions [x * 3 + 0] - 500, 2) + Math.pow(positions [x * 3 + 1] - 500, 2) + Math.pow(positions [x * 3 + 2] - 500, 2) > 250000);
		alphas[x] = 1.0;
		if (x % printEvery === 0) console.log( 'Set particle ' + x );
	}


	var measureStart = Date.now();

	console.log('Building kd-tree...');
	kdtree = new THREE.TypedArrayUtils.Kdtree( positions, distanceFunction, 3 );
	console.log('Built kd-tree in ' + ((Date.now() - measureStart) / 1000).toFixed(3) + ' seconds');

	// display particles after the kd-tree was generated and the sorting of the positions-array is done
	scene.add(particles);

	window.addEventListener( 'resize', onWindowResize, false );

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );

	controls.handleResize();
}

function animate() {

	requestAnimationFrame( animate );

	//
	displayNearest(camera.position);

	controls.update( clock.getDelta() )

	renderer.render( scene, camera );

}

function displayNearest(position) {

	// take the nearest 200 around him. distance^2 'cause we use the manhattan distance and no square is applied in the distance function
	var imagePositionsInRange = kdtree.nearest([position.x, position.y, position.z], 100, maxDistance);

	// We combine the nearest neighbour with a view frustum. Doesn't make sense if we change the sprites not in our view... well maybe it does. Whatever you want.
	var _frustum = new THREE.Frustum();
	var _projScreenMatrix = new THREE.Matrix4();
	camera.matrixWorldInverse.getInverse( camera.matrixWorld );

	_projScreenMatrix.multiplyMatrices( camera.projectionMatrix, camera.matrixWorldInverse );
	_frustum.setFromMatrix( _projScreenMatrix );

	for ( i = 0, il = imagePositionsInRange.length; i < il; i ++ ) {
		var object = imagePositionsInRange[i];
		var objectPoint = new THREE.Vector3(0,0,0);
		objectPoint.x = object[0].obj[0];
		objectPoint.y = object[0].obj[1];
		objectPoint.z = object[0].obj[2];

		if (_frustum.containsPoint(objectPoint)){

			var objectIndex = object[0].pos;

			// set the alpha according to distance
			alphas[ objectIndex ] = 1.0 / maxDistance * object[1];
			// update the attribute
			_particleGeom.attributes.alpha.needsUpdate = true;
		}
	}
}


init();
animate();
