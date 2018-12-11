import * as React from 'react';
import * as ReactDOM from 'react-dom';
import styled from 'styled-components';
import styled from 'styled-components';
import Tesseract from 'tesseract.js';

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

class Application extends React.Component {

  constructor() {
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
    this.refs.picture.srcObject = mediaStream;
    this.state = 'relay';
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
      status: 'cut',
      startX: e.clientX,
      startY: e.clientY,
      endX: e.clientX,
      endY: e.clientY,
    });
    this.moving = this.cutting;
    this.refs.canvas.addEventListener("mousemove", this.cutting.bind(this), false);
  };

  cutting(e) {
    const state = this.state;
    const endX = e.layerX - state.startX;
    const endY = e.layerY - state.startY;
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

    Tesseract.recognize(imgData).progress(message => {
      this.setState(
        sentence: 'Wait! Wait! Wait!',
      );
    }).then(result => {
      this.setState(
        sentence: result.text,
      );
    });

    this.ctxDrowingLayer.clearRect(0, 0, state.canvasX, state.canvasY);
    this.ctxDisplayLayer.clearRect(0, 0, state.canvasX, state.canvasY);
    this.setState({
      status: 'read',
      startX: 0,
      startY: 0,
      endX: 0,
      endY: 0,
      canvasX: 0,
      canvasY: 0,
    });
  };

  render() {
    // style={{ height: '100%', width: '100%', backgroundColor: '#FFF', }}
    return (
      <div>
      { this.state.status === 'relay' &&
        <div>
          <video
            width="360"
            height="270"
            autoplay
            onclick={this.capture.bind(this)}
            ref="video"
          />
        </div>
      }
      { this.state.status === 'edit' &&
        <div>
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
            onmousedown={this.cutStart.bind(this)}
            onmouseup={this.cutFinish.bind(this)}
            onmousemove={this.cutMoving.bind(this)}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              zIndex: 1,
            }}
          />
        </div>
      }
      { this.state.status === 'read' &&
        <div>
          <p
            onclick={this.relay.bind(this)}
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
      }
      </div>
    );
  }
}

