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
	function getDistance(x, y, z) {
		x += 5;
		y += 5;
		z += 5;
		var value = 0;
		for (var level = 0; level < 7; level++) {
			var twoPow = Math.pow(2, level);
			value += noise.simplex3(x * twoPow, y * twoPow, z * twoPow) / twoPow;
		}
		return value + 0.5;
	}
	function getNormal(x, y, z, distance) {
		var delta = 0.01;
		var normal = new THREE.Vector3(
			getDistance(x + delta, y, z) - distance,
			getDistance(x, y + delta, z) - distance,
			getDistance(x, y, z + delta) - distance
		);
		normal.normalize();
		return normal;
	}

	var printEvery = 1e4;
	for (var i = 0; i < particleCount; i++) {
		var x, y, z, distance;
		do {
			x = Math.random();
			y = Math.random();
			z = Math.random();
			distance = getDistance(x, y, z);
		} while (distance > 0);

		positions[i * 3 + 0] = x * 1000;
		positions[i * 3 + 1] = y * 1000;
		positions[i * 3 + 2] = z * 1000;

		var sunDirection = new THREE.Vector3(0, 1, 0);
		alphas[i] = Math.pow((getNormal(x, y, z, distance).dot(sunDirection) + 1) / 2, 4);

		if (i % printEvery === 0) console.log('Set particle ' + i);
	}

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
