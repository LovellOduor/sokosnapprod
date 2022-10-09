var photoMode = false;
var videoMode = false;
var vidloaded = false;
var photoLoaded = false;
var documentLoaded = true;
var setupComplete = false;
var deviceRatio = 0.5;

// Setup back navigation
var backButton = document.getElementById("backButton");
backButton.addEventListener("click",()=>{
scene = null;
window.history.back();
});


// media query for setting the canvas size based on the device screen width
var deviceMaxWidth = window.matchMedia("(max-width: 700px)");
if(deviceMaxWidth.matches){
  deviceRatio = 1;
}else{
  deviceRatio = 0.5;
}

var stats = new Stats();
stats.showPanel(0);
var results = null;

// Loader settings
var loaderElement = document.getElementById('loader');
//loaderElement.style.display = "block";
var loader = {
loading:true,
start:()=>{
  window.addEventListener('scroll',noScroll);
  loaderElement.style.display = 'block';
  this.loading = true;
},
stop:()=>{
  loaderElement.style.display = 'none';
  window.removeEventListener('scroll',noScroll);
  this.loading = false;
}
};

loader.start();


// toogle Mode buttons
var photoModeButton = document.getElementById("photoModeButton");
var videoModeButton = document.getElementById("videoModeButton");


// 0: fps, 1: ms, 2: mb, 3+: custom
stats.domElement.style.position = 'absolute';
stats.domElement.style.right = '0px';
stats.domElement.style.top = '50px';
stats.domElement.style.left = 'auto';
stats.domElement.id = "mystatistics";
document.body.appendChild(stats.dom);

// Load video
var vid = document.getElementById('vid');
var vidstream;

var devicewidth = (window.innerWidth > 0) ? window.innerWidth : screen.width;
var deviceheight = (window.innerHeight > 0) ? window.innerHeight : screen.height;
function noScroll(){
  window.scrollTo(0,0);
}

async function uploadPhoto(url = '', data = {}) {
  setPhotoMode();
  loader.start();
  // Default options are marked with *
  const response = await fetch(url, {
    method: 'POST', // *GET, POST, PUT, DELETE, etc.
    mode: 'cors', // no-cors, *cors, same-origin
    cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
    credentials: 'same-origin', // include, *same-origin, omit
    headers: {
      'Content-Type': 'application/json'
      // 'Content-Type': 'application/x-www-form-urlencoded',
    },
    redirect: 'follow', // manual, *follow, error
    referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
    body: JSON.stringify(data) // body data type must match "Content-Type" header
  });
  return response.json(); // parses JSON response into native JavaScript objects
}

var photoEditCanvas = document.createElement("canvas");
var photoEditCanvasContext= photoEditCanvas.getContext("2d");
var photoEditImage = new Image();
var material = new THREE.MeshBasicMaterial({depthTest:false});
var fr;

document.getElementById('uploadPhoto').onchange = function (evt) {
  photoMode = true;
  videoMode = false;  
  var tgt = evt.target || window.event.srcElement;
  files = tgt.files;
  // FileReader support
  if (FileReader && files && files.length) {
      fr = new FileReader();
      photoEditImage.onload = ()=> {
        photoEditCanvas.width = photoEditImage.width;
        photoEditCanvas.height= photoEditImage.height;
        photoEditCanvasContext.translate(photoEditImage.width, 0);
        photoEditCanvasContext.scale(-1,1);
        photoEditCanvasContext.drawImage(photoEditImage,0,0,photoEditImage.width,photoEditImage.height);
        var canvasImage = photoEditCanvas.toDataURL('image/jpeg',0.1);
        console.log(canvasImage);
        material = new THREE.MeshPhongMaterial({ depthTest: false });
        material.map = new THREE.TextureLoader().load(photoEditCanvas.toDataURL());
        plane.material = material;
        photoLoaded = true;
        setup();
      }

      fr.readAsDataURL(files[0]);
      fr.onload = ()=>{
          image_data = {image_data:fr.result};        
          uploadPhoto("/faceapi/",image_data).then((data)=>{
          results = JSON.parse(data);
          photoEditImage.src = fr.result;    
       });  
      }
  }else{
  // fallback -- perhaps submit the input to an iframe and temporarily store
  // them on the server until the user's session ends.
  }
}

async function loadvideo() {
  if(!vidloaded){
  if ("mediaDevices" in navigator && "getUserMedia" in navigator.mediaDevices) {
    //rect = document.getElementsByTagName('canvas')[0].getBoundingClientRect();
    vidstream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: devicewidth * deviceRatio,
        height: deviceheight * deviceRatio
      },
      audio: false
    });
    vid.srcObject = vidstream;
  }
}
}

var plane;
var cameradistance;
var fieldofview;
var scene;
var camera;
var renderer;
var root;
var occluder;
let envMapLoader;
var envMap;
var canvcontainer;
var drlight;
var omaterial;
var oader;
var goader;

function load3DModels(){
   // lights
  //scene.add( new THREE.AmbientLight(0xFFFFFF));
  drlight = new THREE.DirectionalLight('white', 4);
  drlight.castShadows = false;
  drlight.position.set(0, 55, 20);

  // Occluding sphere
  omaterial = new THREE.MeshBasicMaterial({ color: 'white' });
  oader = new THREE.GLTFLoader();
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
  });

  // Import the glasses  
  goader = new THREE.GLTFLoader();
  goader.load(modelfile,(gltf)=>{
    root = gltf.scene;
    root.traverse((child)=>{
    if(child.isMesh){ 
      console.log(child.name);
      if (child.material.isMaterial){
      if (child.material.map) child.material.map.encoding = THREE.sRGBEncoding;
      if (child.material.emissiveMap) material.emissiveMap.encoding = THREE.sRGBEncoding;
      child.material.envMap = envMap;
    
      child.material.metalness = 0.6;
           child.material.roughness = 0.1;
           child.material.envMap = envMap;
           child.material.needsUpdate = true;
      }

  }
  });
  root.renderOrder = 2;
 });

   // load environment map
   envMapLoader = new THREE.CubeTextureLoader();
   envMap = envMapLoader.load(urls);

   // Create renderer
   renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true });

}
load3DModels();
function createScene(){
  setupComplete = false;
  scene = null;
  /*
  left = mapcoords(0, 0)[0];
  right = mapcoords(devicewidth, 0)[0];
  top = mapcoords(0, 0)[1];
  bottom = mapcoords(0, deviceheight)[1];
  */
  //const camera = new THREE.OrthographicCamera(left, right, top, bottom,1,500);
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(fieldofview, devicewidth / deviceheight, 0.1, 3000);

  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.setSize(devicewidth, deviceheight);
  
  // Add the threejs scene to the DOM element
  canvcontainer = document.getElementById("canvcontainer");
  while (canvcontainer.firstChild) {
    canvcontainer.removeChild(canvcontainer.lastChild);
  }
  renderer.domElement.id = "threejscanvas";
  canvcontainer.appendChild(renderer.domElement);

 // Add the directional Light
  scene.add(drlight);

  // Add the glasses
  scene.add(root);

  // Add the occluder
  scene.add(occluder);

  // Load the image texture
  const geometry = new THREE.PlaneGeometry(devicewidth, deviceheight);
  plane = new THREE.Mesh(geometry, material);
  plane.material = material; 
  plane.renderOrder = 0;
  plane.rotation.y = (90*Math.PI);
  scene.add(plane);
  camera.position.z = cameradistance;
  setupComplete = true;
}

async function setup(){
  if(videoMode){
   devicewidth = (window.innerWidth > 0) ? window.innerWidth : screen.width;
   deviceheight = (window.innerHeight > 0) ? window.innerHeight : screen.height;
   devicewidth *= deviceRatio;
   deviceheight = vid.videoHeight * (devicewidth / vid.videoWidth);
  }else if(photoMode){
    devicewidth = (window.innerWidth > 0) ? window.innerWidth : screen.width;
    deviceheight = (window.innerHeight > 0) ? window.innerHeight : screen.height;
    devicewidth *= deviceRatio;
    deviceheight = (photoEditImage.height*0.5) * (devicewidth / (photoEditImage.width*0.5));
  }else{
    devicewidth = 10;
    deviceheight = 10;
  }
  
  cameradistance = 1000;
  fieldofview = (Math.atan((deviceheight / 2) / cameradistance));
  fieldofview = (2 * fieldofview * 180 / Math.PI);
  createScene();

  devicewidth = (window.innerWidth > 0) ? window.innerWidth : screen.width;
  deviceheight = (window.innerHeight > 0) ? window.innerHeight : screen.height;
  devicewidth *= deviceRatio;
  deviceheight *= deviceRatio;
}


//loadvideo();
// Euclidean distance function

function euclid(x, y, mx, my) {
  xsquared = (x - mx) * (x - mx);
  ysquared = (y - my) * (y - my);
  sum = xsquared + ysquared;
  dist = Math.sqrt(sum);
  dist = Math.abs(dist);
  return dist;
}

// Load the model
var model;
/*
async function loadmodel() {
  model = new FaceMesh({
    locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
    }
  });
  model.setOptions({
    selfieMode: true,
    maxNumFaces: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });
}
*/
// Graphical User Interface


// THREE.JS Stuff
function mapcoords(canvx, canvy){
  scenex = devicewidth / 2;
  sceney = deviceheight / 2;
  newx = scenex - canvx;
  newy = sceney - canvy;
  return [newx, newy];
}

var vidtexture;
function setVideoMode(){
    loader.start();
    videoMode = true;
    photoMode = false;
    photoModeButton.style.color="gray";
    videoModeButton.style.color="red";
    loadvideo();
}

vid.onloadedmetadata = async function() {
    material = new THREE.MeshPhongMaterial({ depthTest: false });
    vidtexture = new THREE.VideoTexture(vid);
    setup();
    vidloaded = true;
}

function setPhotoMode(){
    photoModeButton.style.color="red";
    videoModeButton.style.color="gray";
    videoMode = false;
    vidloaded = false;
    if(vidstream != undefined){
    vidstream.getTracks()[0].stop();
    }
    photoMode = true;
}

// Load the model
var model;

async function loadmodel() {
  model = new FaceMesh({
    locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
    }
  });
  model.setOptions({
    selfieMode: true,
    maxNumFaces: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });  
}

async function animate() {
  // Run the face model
  if(setupComplete){
  stats.begin();
  
  //await model.send({ image: vid, width: 500, height: 500 });
   
  if(videoMode && vidloaded){
  
    try{
      
      await model.send({ image: vid, width: 500, height: 500 });
      model.onResults((landmarks) => {
          results = landmarks;
      });
      
      material.map = vidtexture;
      plane.material = material;
    
    }catch(err){

      console.log(err);
      alert("Video mode may not be supported on your device, please upload a photo, or restart the browser");
      loader.stop();
      setPhotoMode();
      //photoModeButton.click();
    
    }
    
    if(loader.loading){
      loader.stop();
    }
  
  }

  if(photoMode && photoLoaded){
    if(loader.loading){
      loader.stop();
    }
    photoLoaded = false;
  }

  if(results != null){
    if (results.multiFaceLandmarks != undefined) {
      for (const keypoints of results.multiFaceLandmarks){

        rightCoords = keypoints[71];
        leftCoords = keypoints[251];
        bottomCoords = keypoints[4];
        centerCoords = keypoints[168];
        center = keypoints[6];

        topleftx = rightCoords.x * (devicewidth);
        toplefty = rightCoords.y * (deviceheight);

        toprightx = leftCoords.x * (devicewidth);
        toprighty = leftCoords.y * (deviceheight);

        topcenterx = centerCoords.x * (devicewidth);
        topcentery = centerCoords.y * (deviceheight);
        topcenterz = -centerCoords.z;

        bottomcenterx = bottomCoords.x * (devicewidth);
        bottomcentery = bottomCoords.y * (deviceheight);
        bottomcenterz = -bottomCoords.z
        centerx = mapcoords(center.x * (devicewidth), 0)[0];
        centery = mapcoords(0, center.y * (deviceheight))[1];
        centerz = -center.z;

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
        xadj = keypoints[199].y - keypoints[151].y;
        xopos = -keypoints[151].z - -keypoints[199].z;
        tanx = xopos / xadj;
        rotateXAngle = Math.atan(tanx);

        // Find the angle of rotation along the y-axis    
        yadj = leftCoords.x - rightCoords.x;
        yopos = -leftCoords.z - -rightCoords.z;
        tany = yopos / yadj;
        rotateYAngle = Math.atan(tany);

        // Find angle of rotation along the z-axis
        zadj = rightCoords.x - leftCoords.x;
        zopos = leftCoords.y - rightCoords.y;
        tanz = zopos / zadj;
        rotateZAngle = Math.atan(tanz) / 2;
        // Scale the model 

        meshWidth = (yadj * (devicewidth)) / Math.cos(rotateYAngle);
        //img.style.transform = `rotateZ(${rotateAngle}deg) rotateY(${rotateYAngle}deg)`;

        if(root != undefined) {
          root.position.set(centerx, centery, centerz);
          root.scale.set(meshWidth * modeldata['modelScaleX'], meshWidth * modeldata['modelScaleY'], meshWidth * modeldata['modelScaleZ']);
          root.rotation.set((modeldata['modelRotationX'] * (Math.PI / 180)) + rotateXAngle, (modeldata['modelRotationY'] * (Math.PI / 180)) + rotateYAngle, (modeldata['modelRotationZ'] * (Math.PI / 180)) + rotateZAngle);
        }

        if(occluder != undefined) {
          occluder.position.set(centerx + modeldata['occluderX'], centery + modeldata['occluderY'], centerz + modeldata['occluderZ']);
          occluder.scale.set(meshWidth * modeldata['occluderScaleX'], meshWidth * modeldata['occluderScaleY'], meshWidth * modeldata['occluderScaleZ']);
          occluder.rotation.set((modeldata['modelRotationX'] * (Math.PI / 180)) + rotateXAngle, (modeldata['modelRotationY'] * (Math.PI / 180)) + rotateYAngle, (modeldata['modelRotationZ'] * (Math.PI / 180)) + rotateZAngle);
        }
      
        // Set the mask's width and height
        //img.style.width = maskWidth.toString() +"px";
        //img.style.height = maskHeight.toString() +"px";
      
      }
    }
  }
  stats.end();
  renderer.render(scene, camera);
}
  requestAnimationFrame(animate);
}

loadmodel();
//setPhotoMode();
setup();
loader.stop();
//setVideoMode();
animate();