/*
 * oSome Globe by Jaanga
 * https://github.com/jaanga/cookbook
 * with some minor modifications
 */

var container = document.getElementById('container');
var zoom = 2;  // OpenStreetMap level
var scale = 1.5;
var radius = 6371;  // earth
var cameraLatitude = 34.86; //37.616666;
var cameraLongitude = 2.34; //-122.36666666;
// settings for each of the 18 zom levels
var cameraDistance = [ 28000, 28000, 24000, 15000, 11000, 9000, 7500, 7000, 6600, 6500, 6450, 6430, 6395, 6380, 6376, 6375, 6373, 6372.3, 6372 ];
var cameraRotateSpeed = [ 0.3, 0.3, 0.5, 0.1, 0.1, 0.015, 0.15, 0.08, 0.03, 0.01, 0.005, 0.003, 0.0015, 0.001, 0.0005, 0.0003, 0.0002, 0.0001 ];
var tiles = [ 2, 4, 8, 5, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 8 ];  // amount of tiles to add before and after center tiles

var pi = Math.PI, pi2 = 0.5 * Math.PI;
var d2r = pi / 180, r2d = 180 / pi;  // degrees & radians
function v(x,y,z){ return new THREE.Vector3(x,y,z); }
function cos(a){ return Math.cos(a); }
function sin(a){ return Math.sin(a); }
function pow(a,b){ return Math.pow(a,b); }

// http://en.wikipedia.org/wiki/Spherical_coordinate_system
function latlon2xyz( lat, lon, radius ) {
	var rc =  radius * cos( lat );
	return  new THREE.Vector3(
		rc * cos( lon),
		radius * sin( lat ),
		rc * sin( lon)
	);
}

// http://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#Tile_servers
function long2tile( lon, zoom ) {
	return (Math.floor((lon + 180 ) / 360 * pow( 2, zoom )));
}

function lat2tile( lat, zoom ) {
	return ( Math.floor(( 1 - Math.log( Math.tan( lat * pi / 180) + 1 / cos( lat * pi / 180)) / pi )/2 * pow(2, zoom)));
}

function tile2long( x, z ) {
	return ( x / pow( 2, z ) * 360 - 180 );
}

function tile2lat(y,z) {
	var n = pi - 2 * pi * y / pow( 2, z );
	return ( 180 / pi * Math.atan( 0.5 * ( Math.exp(n) - Math.exp(-n))) );
}

var renderer, scene, camera, controls, stats, group;

if (!Detector.webgl){
      Detector.addGetWebGLMessage();
} else {
	init();
	animate();
}

function init() {
	var geometry, material, mesh, css, info;

	renderer = new THREE.WebGLRenderer( { antialias: true }  );
	//renderer.shadowMapEnabled = true;
	renderer.setSize( window.innerWidth/1.5, window.innerHeight/1.5 );
	container.appendChild( renderer.domElement );
	scene = new THREE.Scene();

	camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 40000 );
	camera.position = latlon2xyz( cameraLatitude * d2r, pi - cameraLongitude * d2r,  cameraDistance[ zoom ] );

	light = new THREE.DirectionalLight( 0xffffff, 0.5);
	light.position.set( 1, 1, 1 ).normalize();
	light.castShadow = true;
	scene.add( light );

	light = new THREE.AmbientLight( 0xaaaaaa);
	light.color.setHSL( 0.1, 0.5, 0.5 );
	scene.add( light );


	light = new THREE.SpotLight( 0xffffff, 0.5 );
	light.position.set( -20000, 200, 3000 );
	light.castShadow = true;

	light.shadowMapWidth = 1024;
	light.shadowMapHeight = 1024;
	light.shadowCameraNear = 10000;
	light.shadowCameraFar = 30000;
	light.shadowCameraFov = 1000;
light.shadowCameraVisible = true;
	scene.add( light );

	geometry = new THREE.AxisHelper( 7000 );
	//scene.add( geometry );

	zoomLevel ( zoom );
}

function zoomLevel( zoom ) {
	if ( group ) {
		scene.remove( group );
	}
	zoomCamera( zoom );


// see http://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#Tile_servers
	var xCenter = long2tile( cameraLongitude, zoom);
	var yCenter = lat2tile( cameraLatitude, zoom);
	var count = pow( 2, zoom );

	var xStart = xCenter - tiles[ zoom - 1];
	if ( xStart < 0 ) xStart = 0;
	var xFinish = xCenter + tiles[zoom - 1];
	if ( xFinish > count ) xFinish = count;
	var yStart = yCenter - tiles[zoom - 1];
	if ( yStart < 0 ) yStart = 0;
	var yFinish = yCenter + tiles[zoom - 1];
	if ( yFinish > count ) yFinish = count;
// console.log( 'll', cameraLatitude, cameraLongitude, 'z', zoom, 'x', xCenter, xStart, xFinish,'y', yCenter );

	group = new THREE.Object3D();

	if ( zoom < 4 ) {
		geometry = new THREE.SphereGeometry( 6200, 50, 30)
		material = new THREE.MeshNormalMaterial( { shading: THREE.SmoothShading, opacity: 0.7, transparent: true } );
		mesh = new THREE.Mesh( geometry, material );
		group.add( mesh );
	}

	// angles
	var deltaPhi = 2.0 * pi / pow( 2, zoom );  // between longitudes
	var theta, deltaTheta, lat1, lat2; // first latitude

	var tileCount = 0;

	for (var y = yStart; y < yFinish; y++) {
		lat1 = tile2lat( y, zoom);
		lat2 = tile2lat( y + 1, zoom);
		deltaTheta = d2r * (lat1 - lat2);
		theta = pi2 - lat1 * d2r;

		for (var x = xStart; x < xFinish; x++) {
			geometry = new THREE.CubeGeometry( 200 / (zoom * 1), 200 /  (zoom * 1), 2000 /  (zoom * 1) );
			material = new THREE.MeshNormalMaterial();
			mesh = new THREE.Mesh( geometry, material );
			mesh.position = latlon2xyz(  pi2 + theta , x * deltaPhi, 6371 );
			mesh.lookAt( v( 0, 0, 0 ) );
			//group.add( mesh );
// console.log( zoom, 'lat', r2d * ( theta), 'lon',  r2d * x * deltaPhi , 0 * deltaPhi, mesh.position);

			//texture = THREE.ImageUtils.loadTexture( "http://b.tile.openstreetmap.org/" + zoom + "/" + x + "/" + y + ".png" );
			texture = THREE.ImageUtils.loadTexture( "http://d.tile.stamen.com/watercolor/" + zoom + "/" + x + "/" + y + ".jpg" );
			material = new THREE.MeshPhongMaterial( { map: texture } );
			// material = new THREE.MeshBasicMaterial( { color: 0x000000, wireframe: true } );

			if ( zoom === 1 ) {
				geometry = new THREE.SphereGeometry( radius, zoom1Steps[ tileCount], zoom1Steps[ tileCount], x * deltaPhi - pi, deltaPhi, theta, deltaTheta );
				for (var k = 0, len = geometry.vertices.length; k < len; k++) {
					var sscale = 1  + 0.00001 * scale * elevations1[ tileCount ] [ k  ];
					var b = geometry.vertices[k];
					geometry.vertices[k].set( sscale * b.x, sscale * b.y, sscale * b.z  );
				}
				tileCount++;
			} else if ( zoom === 2 ) {
				geometry = new THREE.SphereGeometry( radius, zoom2Steps[ tileCount], zoom2Steps[ tileCount], x * deltaPhi - pi, deltaPhi, theta, deltaTheta );
				for (var k = 0, len = geometry.vertices.length; k < len; k++) {
					var sscale = 1 + 0.00001 * scale * elevations2[ tileCount ] [ k  ];
					var b = geometry.vertices[k];
					geometry.vertices[k].set( sscale * b.x, sscale * b.y, sscale * b.z  );
				}
				tileCount++;
			} else if ( zoom === 3 ) {
				geometry = new THREE.SphereGeometry( radius, zoom3Steps[ tileCount], zoom3Steps[ tileCount], x * deltaPhi - pi, deltaPhi, theta, deltaTheta );
				for (var k = 0, len = geometry.vertices.length; k < len; k++) {
					var sscale = 1  + 0.00001 * scale * elevations3[ tileCount ] [ k  ];
					var b = geometry.vertices[k];
					geometry.vertices[k].set( sscale * b.x, sscale * b.y, sscale * b.z  );
				}
				tileCount++;
			} else  {
				geometry = new THREE.SphereGeometry( radius, 2, 2, x * deltaPhi - pi, deltaPhi, theta, deltaTheta );
			}
			mesh = new THREE.Mesh( geometry, material );
			mesh.receiveShadow = true;
			mesh.castShadow = true;
			group.add( mesh );
		}
	}
	scene.add( group );
}

function updateUI() {
	zIn.title = "Zoom in. Current level: " + zoom;
	zOut.title = "Zoom out. Current level: " + zoom;
	var x=document.getElementById("selZoom").selectedIndex;
	var y=document.getElementsByTagName("option");
	y[ zoom - 1].selected = true;
	
	zoomLevel( zoom );
}
function zoomIn() {
	zoom++;
	if ( zoom > 18 ) zoom = 18;
	zoom = 3;
	updateUI();
}

function zoomOut() {
	zoom--;
	if ( zoom < 1 ) zoom = 1;
	zoom = 3;
	updateUI();
}

function zoomHome() {
	zoom = 3;
	camera.position = latlon2xyz( cameraLatitude * d2r, pi - cameraLongitude * d2r,  cameraDistance[ zoom ] );
	camera.up = v( 0, 1, 0 );
	camera.lookAt( v( 0, 0, 0 ) );
	updateUI();
}

function zoomPreset( id ) {
	var lats = [ 0, 48.7539, -32.3456, 22.3, 48.86, 37.616666, 46.8637, 52.3, 48.86 ];
	var lons = [0, 2.2975, 141.4346, 114.1667, 2.347, -122.366666, 8.1028, -3.7, 2.34 ];
	var zooms = [3, 16, 5, 12, 12, 12, 8, 8, 3 ];
	zoom = zooms[ id ];
	updateUI();
	zoomLocation( lats[id], lons[id], zooms[id] );
}


function zoomLocation( lat, lon, zoom) {
	camera.position = latlon2xyz( lat * d2r, pi - lon * d2r,  cameraDistance[ zoom ] );
	camera.up = v( 0, 1, 0 );
	camera.lookAt( v( 0, 0, 0 ) );
	updateUI();
	zoomLevel( zoom );
}

function resetCamera() {
	var c = camera.position.clone();
	camera.position.set( c.x, c.y, c.z );
	camera.up = v( 0, 1, 0 );
	camera.lookAt( v( 0, 0, 0 ) );
}

function zoomCamera( zoom ) {
	camera.lookAt( v( 0, 0, 0 ) );
	var c = camera.position.clone();
	var scale = cameraDistance[ zoom ] / camera.position.distanceTo( v( 0, 0, 0) );
	camera.position.set( scale * c.x, scale * c.y, scale * c.z  );

	if ( c.y > 0 ) {
		cameraLatitude = r2d * c.angleTo( v(c.x, 0, c.z) );
	} else {
		cameraLatitude = -r2d *  c.angleTo( v(c.x, 0, c.z) );
	}

	var xaxis = v( 1, 0, 0 );
	var xz = v( c.x, 0, c.z);
	var cos_ang = xz.dot( xaxis ) / ( xz.length() * xaxis.length() );  // where did I find this?

	cameraLongitude = pi - Math.acos( cos_ang);
	if ( c.z < 0 ) {
		cameraLongitude = -cameraLongitude;
	}
	cameraLongitude = r2d * cameraLongitude

// console.log( camera.position, cameraLatitude, cameraLongitude );
	controls = new THREE.TrackballControls( camera, renderer.domElement );
	controls.minDistance = 6371.05;
	controls.maxDistance = cameraDistance[ zoom - 1 ];
	controls.rotateSpeed = cameraRotateSpeed[ zoom  - 1] ;
	controls.panSpeed = 0.05;
	if ( zoom < 7 ) {
		controls.staticMoving = false;
		controls.dynamicDampingFactor = 0.1 * zoom ;   //0.2;
	} else {
		controls.staticMoving = true;
		controls.dynamicDampingFactor = 0.5 * zoom ;   //0.2;
		controls.zoomSpeed = 1.0 / (zoom * zoom * zoom) ;  // 1.2;;
	}
}

function animate() {
	requestAnimationFrame( animate );
	controls.update();
	renderer.render( scene, camera );
	//stats.update();
}
