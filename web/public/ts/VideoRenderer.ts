import {
    BoxGeometry,
    BufferAttribute,
    BufferGeometry,
    Camera, Matrix4, Mesh, MeshBasicMaterial, OrthographicCamera,
    Points,
    PointsMaterial,
    Scene,
    WebGLRenderer
} from "three";
import FaceMeshCalculator from "./FaceMeshCalculator";
import {NormalizedLandmark, NormalizedLandmarkList} from "@mediapipe/face_mesh";

export default class VideoRenderer {
    videoElement: HTMLVideoElement
    scene: Scene
    camera: Camera
    renderer: WebGLRenderer
    renderId: number | null = null
    private faceMesh: FaceMeshCalculator;
    private readonly height;
    private readonly width;
    private isRunning: Boolean
    private viewSize: number;
    private aspectRatio: number;

    constructor(videoElement: HTMLVideoElement, outputElement: HTMLDivElement, viewSize = 900, width = 680, height = 480) {
        this.viewSize = viewSize
        this.aspectRatio = 680 / 480

        this.videoElement = videoElement;
        this.scene = new Scene();
        this.height = height;
        this.width = width;
        this.camera = new OrthographicCamera(
            -this.aspectRatio * viewSize / 2,
            this.aspectRatio * viewSize / 2,
            viewSize / 2,
            -viewSize / 2,
            -1000,
            1000);
        // this.camera.rotateZ(Math.PI / 2)
        // this.camera.position.z = 3

        this.renderer = new WebGLRenderer();
        this.renderer.setSize(width, height);
        this.faceMesh = new FaceMeshCalculator(this.renderFace)
        outputElement.innerHTML = ""
        outputElement.appendChild(this.renderer.domElement)
    }

    initialize = async () => {
        await this.faceMesh.initialize()
        const constraints = {video: true};
        const mediaStream = await navigator.mediaDevices.getUserMedia(
            constraints
        );
        this.videoElement.srcObject = mediaStream;
    }

    renderFace = (faceLandmarks: NormalizedLandmark[]) => {
        this.renderFaceMesh(faceLandmarks)
    }

    renderKeypoints = () => {
        this.renderStop();
        this.isRunning = true
        this.renderStart();
    }

    private renderStart() {
        if (!this.renderId) {
            this.renderId = window.requestAnimationFrame(this.renderLoop)
        }
    }

    private renderLoop = async () => {
        if (!this.isRunning) {
            return
        }
        this.renderId = null
        if (this.videoElement.readyState == 4) { // https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/readyState
            // Clear existing items in scene
            this.scene.remove.apply(this.scene, this.scene.children)
            await this.faceMesh.send({image: this.videoElement})
        } else {
            console.log("Video element not ready, skipping frame.")
        }

        this.renderer.render(this.scene, this.camera);

        // TODO animate
        // const oldPosition = this.camera.position.z
        // this.camera.position.z = this.camera.position.z + 0.01
        this.renderer.render(this.scene, this.camera);
        this.renderStart()
    }

    private renderFaceMesh(normalizedLandmarks: NormalizedLandmark[]) {
        // Convert allCoordinates into 1-d array.
        const geometry = new BufferGeometry()
        const coordinates1D = new Float32Array(normalizedLandmarks.length * 3);
        for (let i = 0; i < normalizedLandmarks.length * 3; i++) {
            const meshCoordinateNumber = Math.floor(i / 3)
            const xYZIndex = i % 3
            if (xYZIndex === 0) {
                coordinates1D[i] = (normalizedLandmarks[meshCoordinateNumber].x - 0.5) * this.aspectRatio * this.viewSize
            } else if (xYZIndex === 1) {
                coordinates1D[i] = (normalizedLandmarks[meshCoordinateNumber].y - 0.5) * this.viewSize
            } else {
                coordinates1D[i] = (normalizedLandmarks[meshCoordinateNumber].z - 0.5) * Math.max(this.aspectRatio * this.viewSize, this.viewSize)
            }
        }
        geometry.setAttribute('position', new BufferAttribute(coordinates1D, 3))
        geometry.rotateZ(Math.PI)

        // const rotation = new Matrix4().makeRotationZ(Math.PI/2);
        // geometry.applyMatrix4(rotation)

        // const vertices = new Float32Array([
        //     0, 0, 0,
        //     50, 50, 0,
        //     100, 100, 1.0,
        //     200, 200, 2.0,
        // ]);
        // const verticesGeometry = new BufferGeometry()
        // verticesGeometry.setAttribute('position', new BufferAttribute(vertices, 3));
        // let verticesMaterial = new PointsMaterial({color: 0xFFFFFF, size: 10});
        // // verticesGeometry.rotateZ(0)
        // this.scene.add(new Points(verticesGeometry, verticesMaterial))

        const boxGeometry = new BoxGeometry(2, 1);
        const boxMaterial = new MeshBasicMaterial({color: 0x0_0ff00});
        const cube = new Mesh(boxGeometry, boxMaterial);
        this.scene.add(cube);

        let material = new PointsMaterial({color: 0xFFFFFF, size: 2});
        const meshPoints = new Points(geometry, material)
        this.scene.add(meshPoints)
    }

    renderStop() {
        this.isRunning = false
        console.log(`stopping: ${this.renderId}`)
        if (this.renderId) {
            window.cancelAnimationFrame(this.renderId)
            this.renderId = null
        }
    }

    // animate() {
    //     requestAnimationFrame(this.animate)
    //     this.renderer.render(this.scene, this.camera);
    // }
}
