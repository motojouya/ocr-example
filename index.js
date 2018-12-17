import * as React from 'react';
import * as ReactDOM from 'react-dom';
import styled from 'styled-components';
// import Tesseract from 'tesseract.js';

const getMediaStream = async mediaDevices => {
  const mediaDeviceInfoList = await mediaDevices.enumerateDevices();
  const videoDevices = mediaDeviceInfoList.filter(deviceInfo => {
    return deviceInfo.kind == 'videoinput';
  });
  if (videoDevices.length < 1) {
    throw new Error('no device for video.');
  }
  return mediaDevices.getUserMedia({
    audio: false,
    video: {
      deviceId: videoDevices[0].deviceId
    }
  });
};

const sharpen = (data, width) => {

  const sharpedColor = (data, width, color, i) => {
    const coefficientSub = -1;
    const coefficientMain = 10;

    const prevLine = i - (width * 4);
    const nextLine = i + (width * 4);

    const sumPrevLineColor = (data[prevLine-4+color] * coefficientSub)  +  (data[prevLine+color] * coefficientSub )  +  (data[prevLine+4+color] * coefficientSub);
    const sumCurrLineColor = (data[i       -4+color] * coefficientSub)  +  (data[i       +color] * coefficientMain)  +  (data[i       +4+color] * coefficientSub);
    const sumNextLineColor = (data[nextLine-4+color] * coefficientSub)  +  (data[nextLine+color] * coefficientSub )  +  (data[nextLine+4+color] * coefficientSub);

    return (sumPrevLineColor + sumCurrLineColor + sumNextLineColor) / 2
  };

  const dataBefore = data.slice();
  for (let i = width * 4; i + (width * 4) < data.length; i += 4) {
    if (i % (width * 4) !== 0 && i % ((width * 4) + 300) !== 0) {
      data[i]   = sharpedColor(dataBefore, width, 0, i);
      data[i+1] = sharpedColor(dataBefore, width, 1, i);
      data[i+2] = sharpedColor(dataBefore, width, 2, i);
    }
  }
};

const monochrome = data => {

  const getColor = (threshold, data, i) => {
    const avg = (data[i] + data[i+1] + data[i+2]) / 3;
    if (threshold < avg) {
      return 255;
    } else {
      return 0;
    }
  };

  const threshold = 200;
  for (let i = 0; i < data.length; i += 4) {
    const color = getColor(threshold, data, i);
    data[i] = data[i+1] = data[i+2] = color;
  }
};



class Application extends React.Component {

  constructor() {
    super();
    this.state = {
      status: 'read',
      sentence: 'Tap! Tap! Tap!',
      startX: 0,
      startY: 0,
      endX: 0,
      endY: 0,
      canvasX: 0,
      canvasY: 0,
    };
  }

  async relay() {
    if (!this.mediaDevices) {
      this.mediaDevices = navigator.mediaDevices;
    }
    const mediaStream = await getMediaStream(this.mediaDevices);
    this.videoStreamInUse = mediaStream;
    this.refs.video.srcObject = mediaStream;
    this.setState({
      status: 'relay',
    });
  };

  capture() {
    const videoElement = this.refs.video;
    const pictureElement = this.refs.picture;
    const drawingElement = this.refs.drawing;
    pictureElement.getContext('2d').drawImage(videoElement, 0, 0, videoElement.width, videoElement.height);

    this.setState({
      status: 'edit',
      canvasX: drawingElement.clientWidth,
      canvasY: drawingElement.clientHeight,
    });
    this.ctxDisplayLayer = pictureElement.getContext('2d');
    this.ctxDrowingLayer = drawingElement.getContext('2d');

    this.videoStreamInUse.getVideoTracks()[0].stop();
    // const base64img = canvasElement.toDataURL('image/jpeg');
  };

  cutStart(e) {
    this.setState({
      startX: e.clientX,
      startY: e.clientY,
      endX: e.clientX,
      endY: e.clientY,
    });
    this.moving = this.cutting;
    this.refs.picture.addEventListener("mousemove", this.cutting.bind(this), false);
  };

  cutting(e) {
    const state = this.state;
    const endX = e.clientX - state.startX;
    const endY = e.clientY - state.startY;
    this.setState({
      endX: endX,
      endY: endY,
    });
    this.ctxDrowingLayer.clearRect(0, 0, state.canvasX, state.canvasY);
    this.ctxDrowingLayer.strokeRect(state.startX, state.startY, endX, endY);
  };

  cutMoving(e) {
    if (this.moving) {
      this.moving(e);
    }
  }

  cutFinish(e) {
    const state = this.state;
    this.moving = null;
    const imgData = this.ctxDisplayLayer.getImageData(state.startX, state.startY, state.endX, state.endY);

    sharpen(imgData.data, state.canvasX);
    monochrome(imgData.data);
    this.refs.debug.src = imgData;
    this.setState({ status: 'debug' });

    // Tesseract.recognize(imgData).progress(message => {
    //   console.log(message);
    //   this.setState({
    //     sentence: 'Wait! Wait! Wait!',
    //   });
    // }).then(result => {
    //   console.log(result);
    //   this.setState({
    //     sentence: result.text,
    //   });
    // }).catch(err => {
    //   console.log(err);
    // });

    // this.ctxDrowingLayer.clearRect(0, 0, state.canvasX, state.canvasY);
    // this.ctxDisplayLayer.clearRect(0, 0, state.canvasX, state.canvasY);
    // this.setState({
    //   status: 'read',
    //   startX: 0,
    //   startY: 0,
    //   endX: 0,
    //   endY: 0,
    //   canvasX: 0,
    //   canvasY: 0,
    // });
  };

  render() {
    // style={{ height: '100%', width: '100%', backgroundColor: '#FFF', }}
    return (
      <div>
        <div style={ this.state.status === 'relay' ? {} : { display: 'none'} }>
          <video
            width="360"
            height="270"
            autoPlay
            onClick={this.capture.bind(this)}
            ref="video"
          />
        </div>
        <div style={ this.state.status === 'edit' ? {} : { display: 'none'} }>
          <canvas
            width="360"
            height="270"
            ref="picture"
            style={{
              border: 'solid 1px',
              position: 'absolute',
              left: 0,
              top: 0,
              zIndex: 0,
            }}
          />
          <canvas
            width="360"
            height="270"
            ref="drawing"
            onMouseDown={this.cutStart.bind(this)}
            onMouseUp={this.cutFinish.bind(this)}
            onMouseMove={this.cutMoving.bind(this)}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              zIndex: 1,
            }}
          />
        </div>
        <div style={ this.state.status === 'read' ? {} : { display: 'none'} }>
          <p
            onClick={this.relay.bind(this)}
            style={{
              height: '40px',
              width: '280px',
              textAlign: 'center',
              verticalAlign: 'middle',
              display: 'inline-block',
              fontSize: '2rem',
              /* margin: 10px 0 10px 0; */
            }}
          >{ this.state.sentence }</p>
        </div>
        <div style={ this.state.status === 'debug' ? {} : { display: 'none'} }>
          <img ref="debug" />
        </div>
      </div>
    );
  }
}

ReactDOM.render(<Application />, document.getElementById('content'));

