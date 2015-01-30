/**
 * Created by Jordan Brack on 10/3/14 on luke.
 */
var loaded = false;
var started = false;
var enableDraw = false;
var erase = false;
var running = false;
var canvas, context, background, bcontext, imageObj, c, postURL, reqURL;
var lastButton = 'crop';
var tempStep = -1;
var cPushArray = new Array();
var pointArray = new Array();
var strokePoints = new Array();
var undonePoints = new Array();
var redPoints = new Array();
var xPoints = new Array();
var yPoints = new Array();
var inOrderPoints = new Array();
var traceColor = "#ff0000";
var eraserSize = 12;
var r = 255;
var g = 0;
var b = 0;


function init() {
    canvas = $('#imageViewLayer1').get(0);
    context = canvas.getContext('2d');
    background = $('#imageViewLayer0').get(0);
    bcontext = background.getContext('2d');

    c = document.getElementById("imageViewLayer1");
    canvas.addEventListener('mousedown', function (e) {
        if (loaded) {
            if (erase == true) {
                context.globalCompositeOperation = "destination-out";
            }
            enableDraw = true;
        }
    }, false);
    canvas.addEventListener('mouseup', function (e) {
        if (loaded) {
            enableDraw = false;
            started = false;
            mouseUp();
        }
    }, false);

    //fit canvas to toolbar
    canvas.width = 723;
    canvas.height = 723;
    background.width = 723;
    background.height = 723;
    ;

    canvas.addEventListener('mousemove', onMouseMove, false);
    canvas.addEventListener('click', onClick, false);
    // Disable right-click context menu.
    $(document).bind("contextmenu", function (e) {
        return false;
    });

    // Add events for toolbar buttons.
    $('#draw').get(0).addEventListener('click', function (e) {
        onDraw();
    }, false);
    $('#erase').get(0).addEventListener('click', function (e) {
        onErase();
    }, false);
    $('#undo').get(0).addEventListener('click', function (e) {
        onUndo();
    }, false);
    $('#redo').get(0).addEventListener('click', function (e) {
        onRedo();
    }, false);
    $('#run').get(0).addEventListener('click', function (e) {
        onRun();
    }, false);
    $('#load').get(0).addEventListener('click', function (e) {
        onLoad();
    }, false);
    $('#incBrightness').get(0).addEventListener('click', function (e) {
        incBrightness();
    }, false);
    $('#decBrightness').get(0).addEventListener('click', function (e) {
        decBrightness();
    }, false);
    $('#incContrast').get(0).addEventListener('click', function (e) {
        incContrast();
    }, false);
    $('#decContrast').get(0).addEventListener('click', function (e) {
        decContrast();
    }, false);
    $('#reset').get(0).addEventListener('click', function (e) {
        onReset(0);
    }, false);
    $('#bcreset').get(0).addEventListener('click', function (e) {
        onReset(1);
    }, false);
    $('#preset').get(0).addEventListener('click', function (e) {
        onReset(2);
    }, false);
    $('#settings').get(0).addEventListener('click', function (e) {
        openSettings();
    }, false);
}

function onClick(ev) {
    if(running){
        var x = ev.pageX - 41;
        var y = ev.pageY - 36;
        context.arc(x,y,3,0,2*Math.PI);
        var point = [x, y];
        console.log(x + ", " + y);
        var pJSON = JSON.stringify(point);
        sendCenter(pJSON);
    }
}

function onMouseMove(ev) {
    var x, y;
    // Get the mouse position.
    if (ev.pageX >= 0) {
        // Firefox (accounting for borders/toolbar)
        x = ev.pageX - 56;
        y = ev.pageY - 51;
    }
    else if (ev.offsetX >= 0) {
        // Opera
        x = ev.offsetX;
        y = ev.offsetY;
    }
    if (enableDraw) {
        if (!started) {
            started = true;
            context.beginPath();
            context.moveTo(x, y);
            var point = [x, y];
            if(!erase) strokePoints.push(point);
        }
        else {
            context.lineTo(x, y);
            context.stroke();
            var point = [x, y];
            if(!erase) strokePoints.push(point);
        }
        $('#stats').text(x + ', ' + y);
    }
}

function openSettings() {
    document.getElementById("settingsDiv").style.visibility = "visible";
    document.getElementById("mask").style.visibility = "visible";
}

function saveForm() {
    if(loaded) var cont = confirm("WARNING: saving will reset the tracer.");
    if(cont || !loaded) {
        var form = document.getElementById("settingsForm");
        postURL = form.elements[2].value;
        reqURL = form.elements[3].value;
        eraserSize = form.elements[4].value;
        traceColor = form.elements[5].value;
        context.strokeStyle = traceColor;
        console.log(traceColor);
        function HexToR(h) {
            return parseInt((cutHex(h)).substring(0, 2), 16)
        }

        function HexToG(h) {
            return parseInt((cutHex(h)).substring(2, 4), 16)
        }

        function HexToB(h) {
            return parseInt((cutHex(h)).substring(4, 6), 16)
        }

        function cutHex(h) {
            return (h.charAt(0) == "#") ? h.substring(1, 7) : h
        }
        r = HexToR(traceColor);
        g = HexToG(traceColor);
        b = HexToB(traceColor);
        console.log(r);
        console.log(g);
        console.log(b);
        if (loaded) onReset(0);
        document.getElementById("settingsDiv").style.visibility = "hidden";
        document.getElementById("mask").style.visibility = "hidden";
    }
}

function cancel() {
    document.getElementById("settingsDiv").style.visibility = "hidden";
    document.getElementById("mask").style.visibility = "hidden";
}

function mouseUp() {
    tempPush();
    pointArray.push(strokePoints);
    strokePoints = new Array();
}

function tempPush() {
    //Pushes last drawn mark to the temp array.
    tempStep++;
    if (tempStep < cPushArray.length) { cPushArray.length = tempStep; }
    cPushArray.push(document.getElementById('imageViewLayer1').toDataURL());
}

function onUndo() {
    context.globalCompositeOperation = "source-over";
    if (tempStep >= 0) {
        tempStep--;
        restore();
    }
    if(pointArray.length > 0) {
        var stroke = pointArray[pointArray.length-1];
        undonePoints.push(stroke);
        pointArray.pop();
    }
    buttonHighlight('undo');
}

function onRedo() {
    context.globalCompositeOperation = "source-over";
    if (tempStep < cPushArray.length-1) {
        tempStep++;
        restore();
    }
    if (undonePoints.length > 0) {
        var stroke = undonePoints[undonePoints.length -1];
        pointArray.push(stroke);
        undonePoints.pop();
    }
    buttonHighlight('redo');
}

function restore() {
    //Restores canvas from stack
    context.clearRect(0, 0, canvas.width, canvas.height);
    var canvasPic = new Image();
    canvasPic.src = cPushArray[tempStep];
    canvasPic.onload = function () { context.drawImage(canvasPic, 0, 0); }
}

function onDraw() {
    erase = false;
    $('#canvasDiv').css("cursor", "url(images/paintcursor.png), url(images/paintcursor.png), auto");
    context.lineWidth = 1;
    context.strokeStyle = traceColor;
    context.globalCompositeOperation = "source-over";
    context.closePath();
    context.beginPath();
    buttonHighlight('draw');
}

function onErase() {
    erase = true;
    $('#canvasDiv').css("cursor", "url(images/erasercursor.png), url(images/erasercursor.png), auto");
    context.lineWidth = eraserSize;
    context.strokeStyle = "rgb(255, 255, 255)";
    context.globalCompositeOperation = "destination-out";
    context.strokeStyle = ("rgba(255,255,255,255)");
    context.closePath();
    context.beginPath();
    buttonHighlight('erase');
}

function onLoad() {
    //Draws image to canvas
    if(loaded == false) {
        loaded = true;
        $('#canvasDiv').css("cursor", "url(images/paintcursor.png), url(images/paintcursor.png), auto");
        imageObj = new Image();
        imageObj.onload = function() {bcontext.drawImage(imageObj, 0, 0);};
        //Loading image currently hard-coded for demonstrative purposes
        imageObj.src = "images/test.png";
        //imageObj.src = requestPic();
        canvas.width = imageObj.width;
        canvas.height = imageObj.height;
        background.width  = canvas.width;
        background.height = canvas.height;
        context.strokeStyle = traceColor;
        $('#' + lastButton).css("border", "1px solid black");
        $('#crop').css("border", "1px solid black");
        $('#draw').css("border", "1px dashed orange");
        lastButton = 'draw';
        tempPush();
    }
}

function onRun() {
    var imgData=context.getImageData(0,0,c.width,c.height);
    /*Puts coordinates of red pixels in 2d Array (row-major order)
     var pmatrix = [];
     for(var i=0; i<imgData.data.length; i += (imgData.width * 4)) {
     var row = [];
     for(var j=i; j<(i+imgData.width); j+=4) {
     if(imgData.data[j] == 255 && imgData.data[j+1]==0 && imgData.data[j+2]==0) row[row.length] = 1;
     else row[row.length] = 0;
     }
     pmatrix[pmatrix.length] = row;
     }

     //Parses 2d array to JSON
     var jsonArray = JSON.stringify(pmatrix);
     console.log(JSON.parse(jsonArray));*/

    getRedPoints();
    getAllPoints();
    filterPoints();
    for(var i=0; i<inOrderPoints.length; i++) {
        var point = inOrderPoints[i];
        xPoints.push(point[0]);
        yPoints.push(point[1]);
    }
    for(var i=0; i<xPoints.length; i++) {
        console.log(xPoints[i] + ", " + yPoints[i]);
    }
    var jsonX = JSON.stringify(xPoints);
    var jsonY = JSON.stringify(yPoints);
    sendTrace(jsonX, jsonY);
    context.putImageData(imgData,0,0);
    buttonHighlight('running');
    running = true;
    $('#canvasDiv').css("cursor", "url(images/crosshair.png), url(images/crosshair.png), auto");
    getNext();
}

function getRedPoints() {
    //Gets coordinates of red (or whatever trace color is) pixels on image
    var x, y;
    var imgData=context.getImageData(0,0,c.width,c.height);
    var w = Math.floor((imgData.width));
    for (var i=0;i<imgData.data.length;i+=4)
    {
        if(imgData.data[i] == r && imgData.data[i+1] == g && imgData.data[i+2] == b) {
            if((i/4)+1<(w+1)) {x = i/4;}
            else {
                x = (i/4)%w;
                y = Math.floor((i/4)/w);
            }
            //console.log(x + ", " + y);
            var point = [x,y];
            redPoints.push(point);
        }
    }
}

function getAllPoints() {
    //Grabs all drawn points
    for(var i=0; i < pointArray.length; i++) {
        var stroke = pointArray[i];
        for(var j=0; j < stroke.length; j++) {
            var point = stroke[j];
            if(point[0] > 0 && point[1] > 0){
                inOrderPoints.push(point);
            }
        }
    }
}

function filterPoints() {
    //Filters points that have been erased from the in-order list
    var newIPs = new Array();
    for(var i=0; i < inOrderPoints.length; i++) {
        var point1 = inOrderPoints[i];
        var found = false;
        for(var j=0; j < redPoints.length; j++) {
            var point2 = redPoints[j];
            if(compare(point1, point2)) found = true;
        }
        if(found) newIPs.push(inOrderPoints[i]);
    }
    inOrderPoints = newIPs;
}

function compare(point1, point2){
    if(point1[0] == point2[0] && point1[1] == point2[1]) return true;
    else return false;
}

function incBrightness() {
    adjustBrightness(10);
    buttonHighlight('incBrightness');
}

function decBrightness() {
    adjustBrightness(-10);
    buttonHighlight('decBrightness');
}

function adjustBrightness(value) {
    var imgData = bcontext.getImageData(0,0, c.width, c.height);
    var p = imgData.data;
    for (var i=0;i<imgData.data.length;i+=4) {
        p[i] = p[i] + value >= 0 ? p[i] + value : 0;
        p[i + 1] = p[i + 1] + value >= 0 ? p[i + 1] + value : 0;
        p[i + 2] = p[i + 2] + value >= 0 ? p[i + 2] + value : 0;
    }
    bcontext.putImageData(imgData,0,0);
}

function incContrast() {
    adjustContrast(20);
    buttonHighlight('incContrast');
}

function decContrast() {
    adjustContrast(-20);
    buttonHighlight('decContrast');
}

function adjustContrast(contrast) {
    var imageData = bcontext.getImageData(0,0, c.width, c.height);
    var p = imageData.data;
    var factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

    for(var i=0;i<p.length;i+=4)
    {
        p[i] = factor * (p[i] - 128) + 128;
        p[i + 1] = factor * (p[i + 1] - 128) + 128;
        p[i + 2] = factor * (p[i + 2] - 128) + 128;
    }
    bcontext.putImageData(imageData,0,0);
}

function onReset(toReset) {
    imageObj = new Image();
    imageObj.src = "images/test.png";
    if(toReset == 0 || toReset == 1) {
        imageObj.onload = function () {
            bcontext.drawImage(imageObj, 0, 0);
        };
        if(toReset == 0) buttonHighlight('reset');
        else buttonHighlight('bcreset');
    }
    if(toReset == 0 || toReset == 2) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        pointArray = new Array();
        if(toReset == 0) buttonHighlight('reset');
        else buttonHighlight('preset');
    }
}

function buttonHighlight(newButton) {
    $('#' + lastButton).css("border", "1px solid black");
    $('#' + newButton).css("border", "1px dashed orange");
    lastButton = newButton;
}

function requestPic() {
    //Requests image from server
    var img = $("<img />").attr('src', 'mrcbin/pick.png')
        .load(function() {
            if (!this.complete || typeof this.naturalWidth == "undefined" || this.naturalWidth == 0) {
                alert('broken image!');
            } else {
                $("#something").append(img);
            }
        });
    return img;
}

function sendTrace(xJSON, yJSON) {
    //Sends parsed trace data to server
    $.post(postURL, xJSON);
    $.post(postURL, yJSON);
}

function sendCenter(pJSON){
    $.post(postURL, pJSON, getNext());
}

function requestNext() {
    $.get(reqURL, function(data){
        var img = new Image();
        img.src = data;
        return img;
    });
}

function getNext() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    imageObj = new Image();
    imageObj.onload = function() {bcontext.drawImage(imageObj, 0, 0);};
    //Hard coded for demonstrative purposes
    //imageObj.src = requestNext();
    imageObj.src = "images/test2.png";
}

