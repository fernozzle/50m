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
	camera.position.set(-1000, 2000, -1000);

	scene = new THREE.Scene();

	controls = new THREE.FirstPersonControls( camera );
	controls.movementSpeed = 500;
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

	var noise = new Noise(1);
	var scale = 0.001;
	function getDistance(x, y, z) {
		x *= scale;
		y *= scale;
		z *= scale;
		var value = 0;
		for (var level = 0; level < 4; level++) {
			var twoPow = Math.pow(2, level);
			value += noise.simplex3(x * twoPow, y * twoPow, z * twoPow) / twoPow;
		}
		return value - 0.5;
	}

	var printEvery = 1e4;
	for (var i = 0; i < particleCount; i++) {
		var x, y, z;
		do {
			x = Math.random() * 1000;
			y = Math.random() * 1000;
			z = Math.random() * 1000;
		} while (getDistance(x, y, z) < 0);
		positions[i * 3 + 0] = x;
		positions[i * 3 + 1] = y;
		positions[i * 3 + 2] = z;

		alphas[i] = 1.0;
		if (i % printEvery === 0) console.log('Set particle ' + i);
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

	controls.update( clock.getDelta() )

	renderer.render( scene, camera );

}

init();
animate();
