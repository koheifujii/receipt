
  let localVideo = document.getElementById('local_video');
  //let height = localVideo.videoHeight;
  //let  width = localVideo.videoWidth;
//let dheight = 300; -960でも行けた
//let dwidth = 400; -1280でも行けた
//データを検知する際、処理負荷を下げるために低解像度の画像で読み込み検知する
let dheight = 240;
let dwidth = 320;
 //オリジナルのカメラのサイズ 比率は検知する上記サイズと比例すること
 //macのwebカメラは3:4 960-1280が最適,ibuffaloは1080-1980 2:3
let height = 1485;
let width = 1980;

let rate = width/dwidth;


let src = null;
let origin = null;
let dstC1 = null;
let dstC3 = null;
let dstC4 = null;
let RED = [0, 0, 255];

  var localStream = null;
  let imgElement = document.getElementById('image1');
  var result = null;
  var contours = null;

  function download() {
    zipData = new JSZip();
    var canvasAscii = [];
    for( let i = 1;i< r_num;i++){
     // console.log(i+'個目のレシートデータです。'  )
      canvasAscii[i] = document.getElementById("receipt" + i).toDataURL('image/png').replace(/^.*,/, '');
      zipData.file("receipt" + i + ".png", canvasAscii[i], {
            base64: true
        });
    }

    zipData.generateAsync({
                type: "blob"
            })
            .then(function(content) {
                saveAs(content, "icons.zip");
            });
  }


  // start local video
  function startVideo() {
    navigator.mediaDevices.getUserMedia({video: true, audio: false})
    .then(function (stream) { // success
      localStream = stream;
      localVideo.srcObject = localStream;
      localVideo.play();
    }).catch(function (error) { // error
      console.error('mediaDevice.getUserMedia() error:', error);
      return;
    });
    localVideo.setAttribute("width", width);
    localVideo.setAttribute("height", height);
    startVideoProcessing();
  }
function startVideoProcessing() {
  stopVideoProcessing();
  src = new cv.Mat(height, width, cv.CV_8UC4);
  dstC1 = new cv.Mat(dheight, dwidth, cv.CV_8UC1);
  dstC3 = new cv.Mat(dheight, dwidth, cv.CV_8UC3);
  dstC4 = new cv.Mat(dheight, dwidth, cv.CV_8UC4);
  requestAnimationFrame(processVideo);
}



function processVideo(){
  vc = new cv.VideoCapture(localVideo);
  vc.read(src);
  origin = show_size(src);

  result =  gaussianBlur(origin);
  result = gray(result);
  result = threshold(result);
  //result = morphology(result);
  
  //cv.imshow("canvasOutput3", result);

  result = fcontours(result,origin,src);
  cv.imshow("canvasOutput", result);

  //result.delete();
  requestAnimationFrame(processVideo);
}

function gaussianBlur(image) {
  cv.GaussianBlur(image, dstC4, {width:5, height:5}, 0, 0, cv.BORDER_DEFAULT); //オリジナルサイズでは5,5 縮小した場合で検証中
  return dstC4;
}

function gray(image) {
  cv.cvtColor(image, dstC1, cv.COLOR_RGBA2GRAY);
  return dstC1;
}
function threshold(image) {
  cv.threshold(image, dstC4, 140, 255, cv.THRESH_BINARY); //140,255
  return dstC4;
}
function morphology(image) {
  let kernelSize = 9;  //macカメラの時は9 これは画像を白黒のブロック升として塗りつぶす。数字が大きいほど大きい升でガクガクするcontrols.morphologySize;
  let kernel = cv.getStructuringElement(cv.MORPH_RECT, {width: kernelSize, height: kernelSize}); //Number(controls.morphologyShape),
  let color = new cv.Scalar();
  let op = cv.MORPH_OPEN; //Number(controls.morphologyOp);
  cv.morphologyEx(image, dstC4, op, kernel, {x: -1, y: -1}, 1,cv.BORDER_CONSTANT, color); // Number(controls.morphologyBorderType)
  //膨張してレシートの切れを防ぐ
  /*let M = cv.Mat.ones(5, 5, cv.CV_8U);
  let anchor = new cv.Point(-1, -1);
  cv.dilate(image, dstC4, M, anchor, 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
  anchor = null;
  M.delete();*/

  kernel.delete();
  //op.delete();
  return dstC4;
}

var largestContourImg;
var largestArea = 0;
var largestAreaIndex = 0;
var r_corrected = null;

function fcontours(image,raw,src) {
  let contours  = new cv.MatVector();
  let hierarchy = new cv.Mat();
  cv.findContours(image, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE, {x: -1, y: -1}); //Number(controls.contoursMode),Number(controls.contoursMethod)
//find largest-contour
 for (let i = 0; i<contours.size(); ++i)
 {
  if (cv.contourArea(contours.get(i)) > largestArea) {
    largestArea = cv.contourArea(contours.get(i));
     largestAreaIndex = i;
   }
 }
// cv.drawContours(raw, contours, largestAreaIndex, [0,255,255,0], 3, cv.LINE_8); //color,hierarchy
//console.log(largestAreaIndex);
  if (largestAreaIndex != 0) {
    let hull = new cv.Mat();
    let cnt = contours.get(largestAreaIndex);

    //convexHull
    cv.convexHull(cnt, hull, false, true);
    cnt.delete();
    //poly
    let poly = new cv.MatVector();
    let tmp_poly = new cv.Mat();
    let epsilon = (cv.arcLength(hull, true)*0.015);  //macのwebカメラの時は0.015
    cv.approxPolyDP(hull, tmp_poly, epsilon, true);  //認識した座標点
    //cv.drawContours(raw, hull, 0,[255,255,255,0], 1, cv.LINE_8);
    hull.delete();

    poly.push_back(tmp_poly);
    tmp_poly.delete();

    //もしレシート
     if (start_flag == true) {
       save_receipt(poly,src);
     }
    cv.drawContours(raw, poly, 0,[0,255,255,0], 3, cv.LINE_8);
    poly.delete();
  }
  contours.delete();
  hierarchy.delete();
  largestArea = 0;
  largestAreaIndex = 0;
  return raw;
}

var r_pts = [[1,1],[1,1],[1,1],[1,1]];
var pre_r_pts = [[1,1],[1,1],[1,1],[1,1]];
var temp_r_pts　= [1,1,1,1,1,1,1,1];
var poly_int32array;
var pre_ctr = [0,0];
var now_ctr = [0,0];


function save_receipt(poly,src){
    var temp =  poly.get(0);
    let dst = new cv.Mat();
    //console.log('元々の中身' + temp.data32S);
    if(temp.data32S.length == 8){
        poly_int32array = temp.data32S;

        distance_check();
       // console.log('leaveフラグは？' + leave_image_flag);
       // console.log('distanceフラグは？' + distance_flag);
        for (let i = 0;i <= 3;i++){
          for(let k = 0;k<=1;k++){
            r_pts[i][k] = poly_int32array[i*2+k];
          }
        }
        if(distance_flag == true && leave_image_flag == true){

          //レシートサイズを算出し、warpperspective　[サイズ倍率]*Math...で本来のサイズを計算している macカメラの時3.2 ibuffalo3.6
          var w = Math.ceil(rate*Math.sqrt( Math.pow( r_pts[0][0]-r_pts[1][0], 2 ) + Math.pow( r_pts[0][1]-r_pts[1][1], 2 ))) ;
          var h = Math.ceil(rate*Math.sqrt( Math.pow( r_pts[1][0]-r_pts[2][0], 2 ) + Math.pow( r_pts[1][1]-r_pts[2][1], 2 ))) ;

        //  console.log('w/h:' + w + '/' + h);

          //元の大きさの座標に変換
          /*for (let i = 0;i <= 3;i++){
            for(let k=0;k<=1;k++){
              temp_r_pts[7-(i*2+(1-k))] = poly_int32array[i*2+k]*3.2;
              }
          }*/
          for (let i = 0;i <= 7;i++){
            temp_r_pts[i] = poly_int32array[i]*rate; //ここの*の係数はdhightとhightの倍率を表す。
          }

        //  console.log('反転&拡大の修正前の座標4点' + poly_int32array);
        //  console.log('修正後の座標4点' + temp_r_pts);




          let srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, temp_r_pts);
          let dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, w, 0, w, h, 0, h]);
          let M = cv.getPerspectiveTransform(srcTri,dstTri);
          let dsize = new cv.Size(w, h);
          cv.flip(src,src,1);
          cv.warpPerspective(src, dst, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar()); //cv.INTER_LINEAR
          //ここに保存する
         // console.log('撮影しました')
          sound();
          cv.flip(dst,dst,1);
          M.delete();
          srcTri.delete();
          dstTri.delete();


          // もし横向きだったら90度回転する
          if(w > h){
            let rdsize = new cv.Size(w, w);
            let center = new cv.Point(w/ 2,w/2 );
            let dst2 = new cv.Mat();
            let rM = cv.getRotationMatrix2D(center, 90, 1);
            cv.warpAffine(dst, dst2, rM, rdsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());
            let rect = new cv.Rect(0, 0, h, w);
            dst = dst2.roi(rect);
            rM.delete();
            dst2.delete();
          }
          cv.imshow('canvasOutput2', dst);
          //copy_receipt(dst);
          copy_receipt_jpg();
          distance_flag = false;
          leave_image_flag = false;
        }
    }
    //console.log('座標格納後:' + receipt_points);
  poly_int32array = null;
  dst.delete();
}


distance_flag = false;
distance_count = 0;
leave_image_flag = true;

function distance_check(){
  for(let i = 0;i <= 3;i++){
    for(let k = 0;k <=1;k++){
      now_ctr[k] += r_pts[i][k];
      }
    }
    now_ctr[0] = now_ctr[0]/4;
    now_ctr[1] = now_ctr[1]/4;

    //console.log('今の座標' + now_ctr);
    var distance = Math.sqrt( Math.pow( pre_ctr[0] - now_ctr[0], 2 ) + Math.pow( pre_ctr[1] - now_ctr[1], 2 ));
   // console.log('レシートの移動距離' + distance);
    pre_ctr = [].concat(now_ctr);
    //now_ctr = [0,0];

    if(leave_image_flag == true){
      if (distance < 0.375){ //レシートの重心の移動距離からレシートを切り替えたかどうかを検知する。サイズが1/3.2なので小さい
        distance_count ++;
        if(distance_count = 2){
          distance_flag = true;
          distance_count = 0;
        }
      }
    }else if(distance > 14){ //サイズが1/3.2なので120ではない 41.25
      leave_image_flag = true;
    }
}

function show_size(image){
  let dst = new cv.Mat();
  let dst_small = new cv.Size(dwidth,dheight);
  // You can try more different parameters
  cv.resize(image, dst, dst_small, 0, 0, cv.INTER_CUBIC); //v2はcv.INTER_AREA
  cv.flip(dst,dst,1);
  return  dst;
  //dst_small.delete();
}

var r_num = 1;
function copy_receipt(receipt) {
    var check = document.createElement("input");
    check.type = "checkbox";
    check.name = "saved"
    check.value =  r_num;
    //check.setAttribute("id", "receipt" + r_num );
    var o = document.createElement("canvas");
    o.setAttribute("id", "receipt" + r_num );
    document.getElementById("saved").appendChild(check);
    document.getElementById("saved").appendChild(o);

    cv.imshow('receipt' + r_num, receipt);
    r_num ++;
}

function copy_receipt_jpg() {
  var img_content = document.createElement("div");
  img_content.className = "img_content"
  var check = document.createElement("input");
  check.type = "checkbox";
  check.name = "saved"
  check.value =  r_num;
  
  img_content.setAttribute("id", "receipt" + r_num );
  document.getElementById("saved").appendChild(img_content);
  document.getElementById("receipt" + r_num).appendChild(check);


  //===画像に先にbase64変換する場合はこれでいい===
  //var jpg = document.getElementById("canvasOutput2").toDataURL('image/jpeg');
  //var img = document.createElement('img');
  //img.src = jpg;
  //document.getElementById("receipt" + r_num).appendChild(img);

  var o = document.createElement("canvas");
  document.getElementById("receipt" + r_num).appendChild(o);
  cv.imshow('receipt' + r_num, receipt);
 
  r_num ++;
}

function upload() {
  zipData = new JSZip();
  var canvasAscii = [];
  for( let i = 1;i< r_num;i++){
   // console.log(i+'個目のレシートデータです。'  )
    canvasAscii[i] = document.getElementById("receipt" + i).toDataURL('image/jpg').replace(/^.*,/, '');
  /*  zipData.file("receipt" + i + ".png", canvasAscii[i], {
          base64: true
      });*/
      

  }

  zipData.generateAsync({
              type: "blob"
          })
          .then(function(content) {
              saveAs(content, "icons.zip");
          });



  var cvs = document.getElementById("cv1");


}

var start_flag = false;

function auto_save(){
  if (start_flag == false ){
    start_flag = true;
  }else{
    start_flag = false;
  }
}
function delete_receipt(){
  var dom_obj = document.getElementById("receipt"+r_num);
  var flag = false; // 選択されているか否かを判定する変数

 for (var i = 0; i < document.saved.receipt.length; i++) {

   // i番目のチェックボックスがチェックされているかを判定
   if (document.saved.receipt[i].checked) {
     flag = true;
    // console.log(i + "ばんめが選択されました。");
   }
 }
}


function stopVideoProcessing() {
  if (src != null && !src.isDeleted()) src.delete();
  if (dstC1 != null && !dstC1.isDeleted()) dstC1.delete();
  if (dstC3 != null && !dstC3.isDeleted()) dstC3.delete();
  if (dstC4 != null && !dstC4.isDeleted()) dstC4.delete();
}



  // stop local video
  function stopVideo() {
    for (track of localStream.getTracks()) {
      track.stop();
    }
    localStream = null;

    localVideo.pause();
    window.URL.revokeObjectURL(localVideo.src);
    localVideo.src = '';
  }



window.AudioContext = window.AudioContext || window.webkitAudioContext;
var context = new AudioContext();

// Audio 用の buffer を読み込む
var getAudioBuffer = function(url, fn) {
  var req = new XMLHttpRequest();
  // array buffer を指定
  req.responseType = 'arraybuffer';

  req.onreadystatechange = function() {
    if (req.readyState === 4) {
      if (req.status === 0 || req.status === 200) {
        // array buffer を audio buffer に変換
        context.decodeAudioData(req.response, function(buffer) {
          // コールバックを実行
          fn(buffer);
        });
      }
    }
  };

  req.open('GET', url, true);
  req.send('');
};

// サウンドを再生
var playSound = function(buffer) {
  // source を作成
  var source = context.createBufferSource();
  // buffer をセット
  source.buffer = buffer;
  // context に connect
  source.connect(context.destination);
  // 再生
  source.start(0);
};

// main
function sound() {
  // サウンドを読み込む
  getAudioBuffer('./se.mp3', function(buffer) {
    // 読み込み完了後にボタンにクリックイベントを登録
      // サウンドを再生
      playSound(buffer);

  });
};
