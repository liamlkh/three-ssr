"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const http_1 = __importDefault(require("http"));
const THREE = __importStar(require("three"));
const socket_io_1 = __importDefault(require("socket.io"));
const jimp_1 = __importDefault(require("jimp"));
const jsdom_1 = require("jsdom");
const OBJLoader_js_1 = require("./OBJLoader.js");
const fs_1 = __importDefault(require("fs"));
const { window } = new jsdom_1.JSDOM();
global.document = window.document;
const port = 3000;
class App {
    constructor(port) {
        this.clients = {};
        this.width = 600;
        this.height = 400;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, this.width / this.height, 0.1, 1000);
        this.gl = require('gl')(this.width, this.height, { preserveDrawingBuffer: true }); //headless-gl
        this.renderer = new THREE.WebGLRenderer({ context: this.gl });
        this.mesh = new THREE.Mesh();
        this.group = new THREE.Group();
        this.clock = new THREE.Clock();
        this.delta = 0;
        this.serverDateTime = new Date();
        this.renderStart = new Date();
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
                new jimp_1.default(this.width, this.height, (err, image) => {
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
        this.port = port;
        const app = (0, express_1.default)();
        app.use(express_1.default.static(path_1.default.join(__dirname, '../client')));
        this.server = new http_1.default.Server(app);
        this.io = new socket_io_1.default.Server(this.server);
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
        this.renderer.setSize(this.width, this.height);
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        var light1 = new THREE.PointLight();
        light1.position.set(50, 50, 50);
        this.scene.add(light1);
        var light2 = new THREE.PointLight();
        light2.position.set(-50, 50, 50);
        this.scene.add(light2);
        const material = new THREE.MeshPhysicalMaterial({
            color: 0x66ffff,
            metalness: 0.5,
            roughness: 0.1,
            transparent: false,
        });
        const group = new THREE.Group();
        const loader = new OBJLoader_js_1.OBJLoader();
        const lowerJawData = fs_1.default.readFileSync(path_1.default.resolve(__dirname, "models/LowerJaw.obj"), { encoding: 'utf8', flag: 'r' });
        const lowerJawObj = loader.parse(lowerJawData);
        group.add(lowerJawObj);
        const upperJawData = fs_1.default.readFileSync(path_1.default.resolve(__dirname, "models/UpperJaw.obj"), { encoding: 'utf8', flag: 'r' });
        const upperJawObj = loader.parse(upperJawData);
        group.add(upperJawObj);
        group.rotation.x = -Math.PI / 2;
        group.rotation.y = Math.PI;
        group.position.z = 30;
        this.group.add(group);
        this.scene.add(this.group);
        this.camera.position.z = 80;
        this.camera.zoom = 0.9;
        jimp_1.default.loadFont(jimp_1.default.FONT_SANS_16_WHITE).then(font => {
            this.font = font;
        });
        setInterval(() => {
            this.render();
        }, 100);
    }
    Start() {
        this.server.listen(this.port, () => {
            console.log(`Server listening on port ${this.port}.`);
        });
    }
}
new App(port).Start();
