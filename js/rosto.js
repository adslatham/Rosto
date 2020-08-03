let rosto = {
  "displayOption" : 0,
  "threeJSLoaded" : false,
  "loader" : true,
  "renderer" : null,
  "videoSize" : 500,
  "model": null,
  "video" : null,
  "scene" : null,
  "camera" : null,
  "mobile": isMobile(),
  "threeJSPoints" : [],
  "threeJSBounding" : [],
  "threeJSCentre" : [],
  "threeJSModelID" : 0,
  "threeJSLoadNewModel": false,
  "models":[],
  "threeJSCurrentModel":null
};

let rostoFacePoints = {
  "keypoints":[],
  "furthestLeftX": 0,
  "furthestLeftY": 0,
  "furthestRightX": 0,
  "furthestRightY": 0,
  "highestPointX": 0,
  "highestPointY": 0,
  "lowestPointX": 0,
  "lowestPointY": 0,
  "centrePointX": 0,
  "centrePointY": 0,
  "faceWidth": 0,
  "faceHeight": 0,
  "faceRotationX":0,
  "faceRotationY":0,
  "faceRotationZ":0
};

function isMobile() {
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    return isAndroid || isiOS;
}

async function setupCamera() {
  rosto.video = document.getElementById('video');

  const stream = await navigator.mediaDevices.getUserMedia({
    'audio': false,
    'video': {
      facingMode: 'user',
      width: rosto.mobile ? undefined : rosto.videoSize,
      height: rosto.mobile ? undefined : rosto.videoSize
    },
  });
  rosto.video.srcObject = stream;

  return new Promise((resolve) => {
    rosto.video.onloadedmetadata = () => {
      resolve(rosto.video);
    };
  });
}

//------------- Create THREE JS Elements -------------//
async function startThreeJS(){
  rosto.scene = new THREE.Scene();
  rosto.camera = new THREE.OrthographicCamera(rosto.videoSize/-2, rosto.videoSize/2, rosto.videoSize/-2, rosto.videoSize/2, 0.1, 1000 );
  rosto.renderer = new THREE.WebGLRenderer({alpha:true});
  rosto.renderer.setSize( rosto.videoSize, rosto.videoSize );
  document.getElementById('output').appendChild( rosto.renderer.domElement );

  var light = new THREE.SpotLight( 0xffffff, 3, 0 );
  light.position.set( 250, 0, 100 );
  rosto.scene.add( light );
  light = new THREE.SpotLight( 0xffffff, 3, 0 );
  light.position.set( -250, 0, 100 );
  rosto.scene.add( light );

  //------------- Sphere Points -------------//
  for (let i = 0; i < 468; i++) {    
    var geometry = new THREE.SphereGeometry(1,32,32);
    var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
    var point = new THREE.Mesh( geometry, material );
    point.position.z = -5;  

    rosto.scene.add(point);
    rosto.threeJSPoints.push(point);
  }

  //------------- Bouding Box -------------//
  for (let i = 0; i < 4; i++){
    var geometry = new THREE.PlaneGeometry(2,2,2,2);
    var mat = new THREE.MeshBasicMaterial( {color: 0x0000ff, side: THREE.DoubleSide} );
    var line = new THREE.Mesh( geometry, mat);
    line.position.z = -5;  

    rosto.scene.add(line);
    rosto.threeJSBounding.push(line);
  }

  //------------- Face Center -------------//
  for (let i = 0; i < 2; i++){
    var geometry = new THREE.PlaneGeometry(2,2,2,2);
    var mat = new THREE.MeshBasicMaterial( {color: 0xff0000, side: THREE.DoubleSide} );
    var line = new THREE.Mesh( geometry, mat);
    line.position.z = -5;  

    rosto.scene.add(line);
    rosto.threeJSCentre.push(line);
  }

  //------------- Load Model Data -------------//
  loadModelData()

  var videoTexture = new THREE.VideoTexture(rosto.video);
  videoTexture.minFilter = THREE.LinearFilter;
  videoTexture.magFilter = THREE.LinearFilter;
  videoTexture.format = THREE.RGBFormat;

  var geom = new THREE.PlaneGeometry(rosto.videoSize, rosto.videoSize, 2, 2);
  var mat = new THREE.MeshBasicMaterial( {side: THREE.DoubleSide, map:videoTexture} );
  var plane = new THREE.Mesh(geom, mat);
  plane.position.z = -300;
  plane.scale.x = -1;
  plane.scale.y = -1;
  plane.texture = videoTexture;
  rosto.scene.add(plane);

  rosto.camera.position.z = 100;
  rosto.threeJSLoaded = true;
}

//------------- Main Prediction Loader -------------//
async function renderPrediction() {
    const predictions = await rosto.model.estimateFaces(rosto.video);
    if (predictions.length > 0) {
      drawFaceObjects(rosto.displayOption, predictions);
    }else{
      hideFaceObjects(rosto.displayOption);
    }
    requestAnimationFrame(renderPrediction);
    rosto.renderer.render( rosto.scene, rosto.camera );
};

function drawFaceObjects(id, predictions){
  calculateLimits(predictions);
  switch (id){
    case 1:
      break;
    case 2:
      drawFaceBoundingBox();
      break;
    case 3:
      drawFaceCentrePoint();
      break;
    case 4:
      showModelMenu();
      drawModel();
      break;
    default:
      hideFaceObjects(0);
      break;
  }
}

function hideFaceObjects(id){
  switch (id){
    case 1:
      hideFacePoints();
      break;
    case 2:
      hideFaceBoundingBox();
      break;
    case 3:
      hideFaceCentrePoint();
      break;
    case 4:
      hideModelMenu();
      hideModel(1);
      break;
    default:
      hideFacePoints();
      hideFaceBoundingBox();
      hideFaceCentrePoint();
      hideModelMenu();
      hideModel(0);
      break;
  }
}

//------------- Face Points -------------//
function hideFacePoints(){
  for (let i = 0; i < 468; i++) {
    rosto.threeJSPoints[i].scale.x = 0;
  }
}

//------------- Bouding Box -------------//
function drawFaceBoundingBox(){
  rosto.threeJSBounding[0].geometry = new THREE.PlaneGeometry(rostoFacePoints.faceWidth,2,2,2);
  rosto.threeJSBounding[0].scale.x = 1;
  rosto.threeJSBounding[0].position.x = rostoFacePoints.centrePointX;
  rosto.threeJSBounding[0].position.y = rostoFacePoints.centrePointY + (rostoFacePoints.faceHeight/2);
  rosto.threeJSBounding[1].geometry = new THREE.PlaneGeometry(2,rostoFacePoints.faceHeight,2,2);
  rosto.threeJSBounding[1].scale.x = 1;
  rosto.threeJSBounding[1].position.x = rostoFacePoints.centrePointX + (rostoFacePoints.faceWidth/2);
  rosto.threeJSBounding[1].position.y = rostoFacePoints.centrePointY;
  rosto.threeJSBounding[2].geometry = new THREE.PlaneGeometry(rostoFacePoints.faceWidth,2,2,2);
  rosto.threeJSBounding[2].scale.x = 1;
  rosto.threeJSBounding[2].position.x = rostoFacePoints.centrePointX;
  rosto.threeJSBounding[2].position.y = rostoFacePoints.centrePointY - (rostoFacePoints.faceHeight/2);
  rosto.threeJSBounding[3].geometry = new THREE.PlaneGeometry(2,rostoFacePoints.faceHeight,2,2);
  rosto.threeJSBounding[3].scale.x = 1;
  rosto.threeJSBounding[3].position.x = rostoFacePoints.centrePointX - (rostoFacePoints.faceWidth/2);
  rosto.threeJSBounding[3].position.y = rostoFacePoints.centrePointY;
}

function hideFaceBoundingBox(){
  rosto.threeJSBounding[0].scale.x = 0;
  rosto.threeJSBounding[1].scale.x = 0;
  rosto.threeJSBounding[2].scale.x = 0;
  rosto.threeJSBounding[3].scale.x = 0;
}

//------------- Centre Point -------------//
function drawFaceCentrePoint(){
  rosto.threeJSCentre[0].geometry = new THREE.PlaneGeometry(rostoFacePoints.faceWidth,2,2,2);
  rosto.threeJSCentre[0].scale.x = 1;
  rosto.threeJSCentre[0].position.x = rosto.threeJSPoints[1].position.x;
  rosto.threeJSCentre[0].position.y = rosto.threeJSPoints[1].position.y;
  rosto.threeJSCentre[1].geometry = new THREE.PlaneGeometry(2,rostoFacePoints.faceHeight,2,2);
  rosto.threeJSCentre[1].scale.x = 1;
  rosto.threeJSCentre[1].position.x = rosto.threeJSPoints[1].position.x;
  rosto.threeJSCentre[1].position.y = rosto.threeJSPoints[1].position.y;
}

function hideFaceCentrePoint(){
  rosto.threeJSCentre[0].scale.x = 0;
  rosto.threeJSCentre[1].scale.x = 0;
}

//------------- Face Augmentation -------------//
function loadModelData(){
  $.getJSON("models/modelData.json", function(json) {
    for(var i = 0; i < json.models.length; i++){
      rosto.models.push(json.models[i]);
      document.getElementById("modelsMenu").innerHTML += '<div class="modelBtn" onclick="setModelID('+ i +')"><i class="fas fa-cube"></i></div><p class="model-button-text">'+ json.models[i].name +'</p><div class="breaker"></div>';
    }
  });
}

function showModelMenu(){
  if(document.getElementById("modelsMenu").offsetParent === null){
    document.getElementById("modelsMenu").className = "show";
  }
}

function hideModelMenu(){
  if(document.getElementById("modelsMenu").offsetParent !== null){
    document.getElementById("modelsMenu").className = "hide";
  }
}

function drawModel(){
  if (rosto.threeJSLoadNewModel == true){
    rosto.threeJSLoadNewModel = false;
    var loader = new THREE.GLTFLoader();
    loader.load(
      "models/" + rosto.models[rosto.threeJSModelID].filepath + "/scene.gltf",
      function (gltf) {

        rosto.threeJSCurrentModel = gltf.scene;

        rosto.scene.add(rosto.threeJSCurrentModel);

        rosto.threeJSCurrentModel.traverse(function(child){
          if (child.isMesh){
            child.position.x = parseFloat(rosto.models[rosto.threeJSModelID].modelCenterX);
            child.position.y = parseFloat(rosto.models[rosto.threeJSModelID].modelCenterY);
            child.position.z = parseFloat(rosto.models[rosto.threeJSModelID].modelCenterZ);
            child.rotation.x = child.rotation.x + THREE.Math.degToRad(parseFloat(rosto.models[rosto.threeJSModelID].modelRotationX));
            child.rotation.y = child.rotation.y + THREE.Math.degToRad(parseFloat(rosto.models[rosto.threeJSModelID].modelRotationY));
            child.rotation.z = child.rotation.z + THREE.Math.degToRad(parseFloat(rosto.models[rosto.threeJSModelID].modelRotationZ));
          }
          });
        rosto.threeJSCurrentModel.position.z = -50;
        rosto.threeJSCurrentModel.position.x = 0;
        rosto.threeJSCurrentModel.position.y = 0;

      },
      // called while loading is progressing
      function (xhr) {

        console.log((xhr.loaded / xhr.total * 100)+'% loaded');

      },
      // called when loading has errors
      function (error) {

        console.log(error);

      }
    );
  }
  if (rosto.threeJSCurrentModel != null){
    rosto.threeJSCurrentModel.position.x = (rostoFacePoints.keypoints[parseFloat(rosto.models[rosto.threeJSModelID].facePoint)][0])*-1 + (rosto.videoSize/2) + ((parseFloat(rosto.models[rosto.threeJSModelID].modelOffsetX)*-1)*((rostoFacePoints.faceWidth)/250));
    rosto.threeJSCurrentModel.position.y = rostoFacePoints.keypoints[parseFloat(rosto.models[rosto.threeJSModelID].facePoint)][1] + (rosto.videoSize/-2) + ((parseFloat(rosto.models[rosto.threeJSModelID].modelOffsetY)*-1)*((rostoFacePoints.faceWidth)/250));
    rosto.threeJSCurrentModel.position.z = ((parseFloat(rosto.models[rosto.threeJSModelID].modelOffsetZ)*-1)*((rostoFacePoints.faceWidth)/250));
    rosto.threeJSCurrentModel.scale.x = ((rostoFacePoints.faceWidth)/250 * parseFloat(rosto.models[rosto.threeJSModelID].modelScalingFactor))*-1;
    rosto.threeJSCurrentModel.scale.y = ((rostoFacePoints.faceWidth)/250 * parseFloat(rosto.models[rosto.threeJSModelID].modelScalingFactor))*-1;
    rosto.threeJSCurrentModel.rotation.y = THREE.Math.degToRad(rostoFacePoints.faceRotationX); 
    rosto.threeJSCurrentModel.rotation.z = THREE.Math.degToRad(rostoFacePoints.faceRotationY); 
    rosto.threeJSCurrentModel.rotation.x = THREE.Math.degToRad(rostoFacePoints.faceRotationZ); 
    rosto.threeJSCurrentModel.scale.z = ((rostoFacePoints.faceWidth)/250 * parseFloat(rosto.models[rosto.threeJSModelID].modelScalingFactor));
  }
}

function hideModel(type){
  if (rosto.threeJSCurrentModel != null){
    if (type == 1){
      rosto.threeJSCurrentModel.scale.x = 0;
      rosto.threeJSCurrentModel.scale.y = 0;
      rosto.threeJSCurrentModel.scale.z = 0;
    }else{
      rosto.scene.remove(rosto.threeJSCurrentModel);
      rosto.threeJSCurrentModel = null;
    }
  }
}

//------------- Face Point Calculations -------------//
function calculateLimits(predictions){
  predictions.forEach(predictions => {
    rostoFacePoints.keypoints = predictions.scaledMesh;
    resetFaceLimits();
    for (let i = 0; i < rostoFacePoints.keypoints.length; i++) {
      if (rosto.displayOption == 1){
        rosto.threeJSPoints[i].scale.x = 1;
      }
      rosto.threeJSPoints[i].position.x = (rostoFacePoints.keypoints[i][0]-(rosto.videoSize/2))*-1;
      rosto.threeJSPoints[i].position.y = rostoFacePoints.keypoints[i][1]-(rosto.videoSize/2);
      checkFaceLimits(rosto.threeJSPoints[i].position.x,rosto.threeJSPoints[i].position.y);
    }
    setFaceRotations();
  });
}

function resetFaceLimits(){
  rostoFacePoints.lowestPointY = 10000;
  rostoFacePoints.highestPointY = -10000;
  rostoFacePoints.furthestLeftX = 10000;
  rostoFacePoints.furthestRightX = -10000;
}

function checkFaceLimits(x,y){
  if (y < rostoFacePoints.lowestPointY){
    rostoFacePoints.lowestPointX = x;
    rostoFacePoints.lowestPointY = y;
  }
  if (y > rostoFacePoints.highestPointY){
    rostoFacePoints.highestPointX = x;
    rostoFacePoints.highestPointY = y;
  }
  if (x < rostoFacePoints.furthestLeftX){
    rostoFacePoints.furthestLeftX = x;
    rostoFacePoints.furthestLeftY = y;
  }
  if (x > rostoFacePoints.furthestRightX){
    rostoFacePoints.furthestRightX = x;
    rostoFacePoints.furthestRightY = y;
  }
  rostoFacePoints.faceWidth = rostoFacePoints.furthestRightX - rostoFacePoints.furthestLeftX;
  rostoFacePoints.faceHeight = rostoFacePoints.highestPointY - rostoFacePoints.lowestPointY;
  rostoFacePoints.centrePointX = rostoFacePoints.furthestRightX - (rostoFacePoints.faceWidth/2);
  rostoFacePoints.centrePointY = rostoFacePoints.highestPointY - (rostoFacePoints.faceHeight/2);
}

function setFaceRotations(){
  var nosePoint =  rosto.threeJSPoints[168].position;
  var leftNosePoint =  rosto.threeJSPoints[130].position;
  var rightNosePoint =  rosto.threeJSPoints[359].position;

  var leftDistance = Math.sqrt(Math.pow((leftNosePoint.x - nosePoint.x), 2) + Math.pow((leftNosePoint.y - nosePoint.y), 2));
  var rightDistance = Math.sqrt(Math.pow((nosePoint.x - rightNosePoint.x), 2) + Math.pow((nosePoint.y - rightNosePoint.y), 2));

  if (leftDistance > rightDistance){
    rostoFacePoints.faceRotationX = (leftDistance-rightDistance)/((rostoFacePoints.faceWidth/250)*-1.5);
  }else{
    rostoFacePoints.faceRotationX = (rightDistance-leftDistance)/((rostoFacePoints.faceWidth/250)*1.5);
  }

  if (leftNosePoint.y > rightNosePoint.y){
    rostoFacePoints.faceRotationY = (leftNosePoint.y-rightNosePoint.y)/((rostoFacePoints.faceWidth/250)*2);
  }else{
    rostoFacePoints.faceRotationY = (rightNosePoint.y-leftNosePoint.y)/((rostoFacePoints.faceWidth/250)*-2);
  }

  var topPoint =  rosto.threeJSPoints[10].position;
  var midPoint =  rosto.threeJSPoints[1].position;
  var bottomPoint =  rosto.threeJSPoints[152].position;

  var topDistance = Math.sqrt(Math.pow((topPoint.x - midPoint.x), 2) + Math.pow((topPoint.y - midPoint.y), 2));
  var bottomDistance = Math.sqrt(Math.pow((midPoint.x - bottomPoint.x), 2) + Math.pow((midPoint.y - bottomPoint.y), 2));

  if (topDistance > bottomDistance){
    rostoFacePoints.faceRotationZ = (topDistance-bottomDistance)/((rostoFacePoints.faceWidth/250)*-1.5)+20;
  }else{
    rostoFacePoints.faceRotationZ = (bottomDistance-topDistance)/((rostoFacePoints.faceWidth/250)*1.5)+20;
  }

}

//------------- Helper Functions -------------//
function setFaceDisplay(num){
  rosto.displayOption = num;
  hideFaceObjects(0);
}

function setModelID(num){
  rosto.threeJSModelID = num;
  rosto.threeJSLoadNewModel = true;
  hideFaceObjects(0);
}

//------------- Main Function -------------//
async function main() {
    await setupCamera();

    rosto.video.play();

    if (rosto.threeJSLoaded == false){
        startThreeJS();
    }

    // Load the MediaPipe facemesh model.
    rosto.model = await facemesh.load({maxFaces: 1});
  
    renderPrediction();
  }
  
  main();