var stats = new Stats();
stats.showPanel(0); 
// 0: fps, 1: ms, 2: mb, 3+: custom
stats.domElement.style.position = 'absolute';
stats.domElement.style.left = '0px';
stats.domElement.style.top = '50px';
stats.domElement.id = "mystatistics";
document.body.appendChild(stats.dom);
// Load video
var vid = document.getElementById('vid');
var vidstream;
var devicewidth = (window.innerWidth > 0) ? window.innerWidth : screen.width;
var deviceheight = (window.innerHeight > 0) ? window.innerHeight : screen.height;

function noScroll(){
  window.scrollTo(0, 0);
}

var loader = document.getElementById('loader');
window.addEventListener('scroll',noScroll);

async function loadvideo() {
  if ("mediaDevices" in navigator && "getUserMedia" in navigator.mediaDevices) {
    //rect = document.getElementsByTagName('canvas')[0].getBoundingClientRect();
    vidstream = await navigator.mediaDevices.getUserMedia({
      video:{
        width: devicewidth,
        height: deviceheight
      },
      audio:false
    });
    vid.srcObject = vidstream;
  }
}

loadvideo();
// Euclidean distance function

function euclid(x, y, mx, my){
  xsquared = (x - mx) * (x - mx);
  ysquared = (y - my) * (y - my);
  sum = xsquared + ysquared;
  dist = Math.sqrt(sum);
  dist = Math.abs(dist);
  return dist;
}

// Load the model
var model;

async function loadmodel() {
  model =  await facemesh.load({detectionConfidence:0.8, maxFaces:1})

}

// Graphical User Interface


// THREE.JS Stuff

// video loaded

vid.onloadedmetadata = async function () {
  vidloaded = true;
  devicewidth = window.innerWidth;
  deviceheight = vid.videoHeight * (window.innerWidth / vid.videoWidth);

  var cameradistance = 1000;
  var fieldofview = (Math.atan((deviceheight / 2) / cameradistance));
  fieldofview = (2 * fieldofview * 180 / Math.PI);

  function mapcoords(canvx, canvy) {
    scenex = devicewidth / 2;
    sceney = deviceheight / 2;
    newx = scenex - canvx;
    newy = sceney - canvy;
    return [newx, newy];
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fieldofview, devicewidth / deviceheight, 0.1, 3000);
  left = mapcoords(0, 0)[0];
  right = mapcoords(devicewidth, 0)[0];
  top = mapcoords(0, 0)[1];
  bottom = mapcoords(0, deviceheight)[1];
  //const camera = new THREE.OrthographicCamera(left, right, top, bottom,1,500);
  const renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true });
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.setSize(devicewidth, deviceheight);
// load environment map
  let envMapLoader = new THREE.CubeTextureLoader();
  var envMap = envMapLoader.load( urls);

  var canvcontainer = document.getElementById("canvcontainer");
  canvcontainer.appendChild(renderer.domElement);

  // lights
  //scene.add( new THREE.AmbientLight(0xFFFFFF));
  var drlight = new THREE.DirectionalLight('white', 4);
  drlight.castShadows = false;
  drlight.position.set(0, 50, 20);
  scene.add(drlight);

  // Occluding sphere
  /*
  const boxgeometry = new THREE.BoxGeometry( 10, 10, 10 );
  const boxmaterial = new THREE.MeshBasicMaterial( {color: 0x00ff00} );
  const occluder = new THREE.Mesh(boxgeometry,boxmaterial);
  occluder.renderOrder = 1;
  occluder.material.colorWrite=false;
  scene.add(occluder);
  */

  var occluder;
  const omaterial = new THREE.MeshBasicMaterial({ color: 'white' });
  const oader = new THREE.GLTFLoader();
  oader.load(occluderfile, (gltf) => {
    occluder = gltf.scene;
    occluder.traverse((child) => {
      if (child.isMesh) {
        child.material = omaterial;
        child.renderOrder = 1;
        child.material.colorWrite = false;
      }
    });
    occluder.renderOrder = 1;
    scene.add(occluder);
  });

  // Import the glasses 
  var root;
  const goader = new THREE.GLTFLoader();
  goader.load(modelfile,(gltf)=>{
    root = gltf.scene;
    root.traverse((child)=>{
    if(child.isMesh){ 
      console.log(child.name);
   //   var preMaterial = child.material;
    //  preMaterial.encoding = THREE.sRGBEncoding;
     // console.log(child.material.color);
    //  color = child.material.color;
      //child.material = glassMaterial;        
     
      //child.material.color.setRGB(color.r,color.g,color.b);
     
      if(child.material.isMaterial){
      if (child.material.map) child.material.map.encoding = THREE.sRGBEncoding;
      if (child.material.emissiveMap) material.emissiveMap.encoding = THREE.sRGBEncoding;
           child.material.metalness = 1.0;
           child.material.roughness = 0.1;
           child.material.envMap = envMap;
           child.material.needsUpdate = true;
      }    
  }
  });
  root.renderOrder = 2;
  scene.add(root);
 });
  
  // root.renderOrder = 1;
  //root.scale.set(2,2,2);
  /*/ pivot */
  /*/ Red square showing face center 
  var plane2geometry= new THREE.PlaneGeometry(10,10);
  var plane2material = new THREE.MeshBasicMaterial({color:'red',depthTest:false});
  var plane2 = new THREE.Mesh(plane2geometry,plane2material);
  plane2.renderOrder = 1;
  plane2.position.x = mapcoords(0,0)[0];
  plane2.position.y = mapcoords(0,0)[1];
  plane2.position.z = 0.1;
  */
  // scene.add(plane2);
  // Video Plane
  // video texture

  const vidtexture = new THREE.VideoTexture(vid);
  const geometry = new THREE.PlaneGeometry(devicewidth, deviceheight);
  const material = new THREE.MeshPhongMaterial({ depthTest: false });
  material.map = vidtexture;
  const plane = new THREE.Mesh(geometry, material);
  plane.renderOrder = 0;
  scene.add(plane);
  camera.position.z = cameradistance;

  // Distance from virtual camera
  async function animate() {
    // Run the face model
    stats.begin();
    window.removeEventListener('scroll',noScroll);
    results = await model.estimateFaces(vid);
      loader.style.display = 'none';
      if (results.length > 0) {
          var keypoints  = results[0].scaledMesh;
         // console.log(keypoints);
          var rightCoords = keypoints[71];
          var leftCoords = keypoints[251];
          var bottomCoords = keypoints[4];
          var centerCoords = keypoints[168];
          var center = keypoints[6];

          topleftx = devicewidth - rightCoords[0];
          toplefty = rightCoords[1];

          toprightx = devicewidth - leftCoords[0];
          toprighty = leftCoords[1];

          topcenterx = devicewidth - centerCoords[0];
          topcentery = centerCoords[1];
          topcenterz = -centerCoords[2];

          bottomcenterx = devicewidth - bottomCoords[0];
          bottomcentery = bottomCoords[1];
          bottomcenterz = -bottomCoords[2];
          centerx = mapcoords(devicewidth - center[0], 0)[0];
          centery = mapcoords(0, center[1])[1];
          centerz = -center[2];

          // plane2.position.x = centerx;
          // plane2.position.y = centery;
          maskWidth = toprightx - topleftx;
          maskHeight = euclid(topcenterx, topcentery, bottomcenterx, bottomcentery);
          left = centerx - parseInt(maskWidth / 2);
          mtop = centery - parseInt(maskHeight / 2);

          // img.style.left = String(left)+"px";
          // img.style.top = String(mtop)+"px";    
          // img.style.left = String(maskX)+"px";
          // img.style.top = String(maskY)+"px";

          // Find the angle of rotation along the x-axis
          xadj = keypoints[199][1] - keypoints[151][1];
          xopos = -keypoints[151][2] - -keypoints[199][2];
          tanx = xopos / xadj;
          rotateXAngle = Math.atan(tanx + Math.PI/2);

          // Find the angle of rotation along the y-axis    
          yadj = rightCoords[0] - leftCoords[0];
          yopos = -rightCoords[2] - -leftCoords[2];
          tany = yopos / yadj;
          rotateYAngle = Math.atan(tany);

          // Find angle of rotation along the z-axis
          zadj = rightCoords[0] - leftCoords[0];
          zopos = leftCoords[1] - rightCoords[1];
          tanz = zopos / zadj;

          rotateZAngle = (Math.atan(tanz) / 2);
          // Scale the model 

          meshWidth = (yadj) /Math.cos(rotateYAngle);
          //img.style.transform = `rotateZ(${rotateAngle}deg) rotateY(${rotateYAngle}deg)`;

          if (root != undefined) {
            root.position.set(centerx, centery, centerz);
            root.scale.set(meshWidth * modeldata['modelScaleX'], meshWidth * modeldata['modelScaleY'], meshWidth * modeldata['modelScaleZ']);
            root.rotation.set(((modeldata['modelRotationX'] * (Math.PI / 180)) + rotateXAngle),-((modeldata['modelRotationY'] * (Math.PI / 180)) + rotateYAngle),-((modeldata['modelRotationZ'] * (Math.PI / 180)) + rotateZAngle));
          }

          if (occluder != undefined) {
            occluder.position.set(centerx + modeldata['occluderX'], centery + modeldata['occluderY'], centerz + modeldata['occluderZ']);
            occluder.scale.set(meshWidth * modeldata['occluderScaleX'], meshWidth * modeldata['occluderScaleY'], meshWidth * modeldata['occluderScaleZ']);
            occluder.rotation.set(((modeldata['modelRotationX'] * (Math.PI / 180)) + rotateXAngle), -((modeldata['modelRotationY'] * (Math.PI / 180)) + rotateYAngle), -((modeldata['modelRotationZ'] * (Math.PI / 180)) + rotateZAngle));
          }
          
          // Set the mask's width and height
          //img.style.width = maskWidth.toString() +"px";
          //img.style.height = maskHeight.toString() +"px";
        
      }
    
    stats.end();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  await loadmodel().then(() => {
    
    animate();
  });

}