'use strict';

const express = require('express');
const socketIO = require('socket.io');
const path = require('path');
const http = require('http');
const THREE = require("three");
const jimp = require("jimp");
const jsdom = require("jsdom");
const { window } = new jsdom.JSDOM();
global.document = window.document;

const PORT = process.env.PORT || 3000;

class App {
  constructor(port) {
    //server
    this.port = port;
    this.clients = {};
    const app = (0, express)();
    app.use(express.static(path.join(__dirname, '/client')));
    this.server = http.Server(app);
    this.io = socketIO(this.server);
    this.io.on('connection', (socket) => {
      this.clients[socket.id] = {};
      socket.emit("id", socket.id);
      socket.on('disconnect', () => {
        console.log('socket disconnected : ' + socket.id);
        if (this.clients && this.clients[socket.id]) {
            console.log("deleting " + socket.id);
            delete this.clients[socket.id];
        }
      });
      socket.on("clientTimestamp", (t) => {
        if (this.clients[socket.id]) {
          socket.emit("timestampResponse", t);
        }
      });
    });
    // three
    this.width = 600;
    this.height = 400;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, this.width / this.height, 0.1, 1000);
    this.clock = new THREE.Clock();
    this.gl = require('gl')(this.width, this.height, { preserveDrawingBuffer: true }); //headless-gl
    this.renderer = new THREE.WebGLRenderer({ context: this.gl });
    jimp.loadFont(jimp.FONT_SANS_16_WHITE).then(font => {
      this.font = font;
    });
    this.render = () => {
      this.renderStart = new Date();
      this.delta = this.clock.getDelta();
      if (this.group) {
        this.group.rotation.y += 0.5 * this.delta;
      }
      if (Object.keys(this.clients).length > 0) {
        this.renderer.render(this.scene, this.camera);
        var bitmapData = new Uint8Array(this.width * this.height * 4);
        this.gl.readPixels(0, 0, this.width, this.height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, bitmapData);
        new jimp(this.width, this.height, (err, image) => {
          image.bitmap.data = bitmapData;
          this.serverDateTime = new Date();
          image.print(this.font, 40, 330, "Server ISO Date : " + this.serverDateTime.toISOString());
          image.print(this.font, 40, 350, "Render Delta ms: " + (new Date().getTime() - this.renderStart.getTime()));
          image.print(this.font, 40, 370, "Client Count: " + Object.keys(this.clients).length);
          image.getBuffer("image/png", (err, buffer) => {
            this.io.emit('image', Buffer.from(buffer));
          });
        });
      }
    };
    setInterval(() => {
      this.render();
    }, 100);
    // this.camera = new THREE.PerspectiveCamera(60, this.width / this.height, 0.1, 1000);
    // this.gl = require('gl')(this.width, this.height, { preserveDrawingBuffer: true }); //headless-gl
    // this.renderer = new THREE.WebGLRenderer({ context: this.gl });
  }
  Start() {
    this.server
      .listen(this.port, () => {
          console.log(`Server listening on port ${this.port}.`);
      });
  }
}

new App(PORT).Start();

// const scene = new THREE.Scene();
// const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
// const gl = require('gl')(width, height, { preserveDrawingBuffer: true }); //headless-gl
// const renderer = new THREE.WebGLRenderer({ context: this.gl });
// const light1 = new THREE.PointLight();
// light1.position.set(50, 50, 50);
// scene.add(light1);
// const light2 = new THREE.PointLight();
// light2.position.set(-50, 50, 50);
// scene.add(light2);
//     this.mesh = new THREE.Mesh();
//     this.group = new THREE.Group();
//     this.clock = new THREE.Clock();
//     this.delta = 0;
//     this.serverDateTime = new Date();
//     this.renderStart = new Date();
//     this.render = () => {
//         this.renderStart = new Date();
//         this.delta = this.clock.getDelta();
//         if (this.group) {
//             this.group.rotation.y += 0.5 * this.delta;
//         }
//         if (Object.keys(this.clients).length > 0) {
//             this.renderer.render(this.scene, this.camera);
//             var bitmapData = new Uint8Array(this.width * this.height * 4);
//             this.gl.readPixels(0, 0, this.width, this.height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, bitmapData);
//             new jimp(this.width, this.height, (err, image) => {
//                 image.bitmap.data = bitmapData;
//                 this.serverDateTime = new Date();
//                 image.print(this.font, 40, 330, "Server ISO Date : " + this.serverDateTime.toISOString());
//                 image.print(this.font, 40, 350, "Render Delta ms: " + (new Date().getTime() - this.renderStart.getTime()));
//                 image.print(this.font, 40, 370, "Client Count: " + Object.keys(this.clients).length);
//                 image.getBuffer("image/png", (err, buffer) => {
//                     this.io.emit('image', Buffer.from(buffer));
//                 });
//             });
//         }
//     };
//     this.port = port;
//     const app = (0, express_1.default)();
//     app.use(express_1.default.static(path_1.default.join(__dirname, '../client')));
//     this.server = new http_1.default.Server(app);
//     this.io = new socket_io_1.default.Server(this.server);
//     this.io.on('connection', (socket) => {
//         this.clients[socket.id] = {};
//         socket.emit("id", socket.id);
//         socket.on('disconnect', () => {
//             console.log('socket disconnected : ' + socket.id);
//             if (this.clients && this.clients[socket.id]) {
//                 console.log("deleting " + socket.id);
//                 delete this.clients[socket.id];
//             }
//         });
//         socket.on("clientTimestamp", (t) => {
//             if (this.clients[socket.id]) {
//                 socket.emit("timestampResponse", t);
//             }
//         });
//     });
//     this.renderer.setSize(this.width, this.height);
//     this.renderer.outputEncoding = THREE.sRGBEncoding;
//     const material = new THREE.MeshPhysicalMaterial({
//         color: 0x66ffff,
//         metalness: 0.5,
//         roughness: 0.1,
//         transparent: false,
//     });
//     const group = new THREE.Group();
//     const loader = new OBJLoader_js_1.OBJLoader();
//     const lowerJawData = fs_1.default.readFileSync(path_1.default.resolve(__dirname, "models/LowerJaw.obj"), { encoding: 'utf8', flag: 'r' });
//     const lowerJawObj = loader.parse(lowerJawData);
//     group.add(lowerJawObj);
//     const upperJawData = fs_1.default.readFileSync(path_1.default.resolve(__dirname, "models/UpperJaw.obj"), { encoding: 'utf8', flag: 'r' });
//     const upperJawObj = loader.parse(upperJawData);
//     group.add(upperJawObj);
//     group.rotation.x = -Math.PI / 2;
//     group.rotation.y = Math.PI;
//     group.position.z = 30;
//     this.group.add(group);
//     this.scene.add(this.group);
//     this.camera.position.z = 80;
//     this.camera.zoom = 0.9;
//     jimp.loadFont(jimp.FONT_SANS_16_WHITE).then(font => {
//         this.font = font;
//     });
//     setInterval(() => {
//         this.render();
//     }, 100);
//   }
//   Start() {
//     this.server
//         .listen(this.port, () => {
//             console.log(`Server listening on port ${this.port}.`);
//         });
//   }
// }

// const server = express()
//   .use(express.static(path.join(__dirname, '/client')))
//   .listen(PORT, () => console.log(`Listening on ${PORT}`));

// const io = socketIO(server);

// io.on('connection', (socket) => {
//   console.log('Client connected');
//   socket.on('disconnect', () => console.log('Client disconnected'));
// });

// setInterval(() => io.emit('time', new Date().toTimeString()), 1000);
