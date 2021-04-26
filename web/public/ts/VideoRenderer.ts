import {AnnotatedPrediction} from "@tensorflow-models/face-landmarks-detection/dist/mediapipe-facemesh";
import {
    BufferAttribute,
    BufferGeometry,
    Camera,
    PerspectiveCamera,
    Points,
    PointsMaterial,
    Scene,
    WebGLRenderer
} from "three";
import {Coords3D} from "@tensorflow-models/face-landmarks-detection/dist/mediapipe-facemesh/util";
import FaceMesh from "./FaceMesh";

export default class VideoRenderer {
    videoElement: HTMLVideoElement
    scene: Scene
    camera: Camera
    renderer: WebGLRenderer
    renderId: number | null = null
    private width: number;
    private faceMesh: FaceMesh;
    private isRunning: Boolean

    constructor(videoElement: HTMLVideoElement, outputElement: HTMLDivElement, width = 400) {
        this.videoElement = videoElement
        this.scene = new Scene();
        this.camera = new PerspectiveCamera();
        this.renderer = new WebGLRenderer();
        this.width = width;
        this.renderer.setSize(width, width);
        this.faceMesh = new FaceMesh()
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

            const predictions: Array<AnnotatedPrediction> = await this.faceMesh.getKeypointsFromImage(this.videoElement)
            if (predictions.length == 0) {
                console.warn("No faces found...")
            } else if (predictions.length > 0) {
                this.renderFaceMesh(predictions);
            }
        } else {
            console.log("Video element not ready, skipping frame.")
        }

        // Setup camera nicely
        this.camera.position.z = 2
        // this.camera.rotation.x = 180
        this.camera.rotation.set(0, 0, 135)

        this.renderer.render(this.scene, this.camera);

        // TODO animate
        // const oldPosition = this.camera.position.z
        // this.camera.position.z = this.camera.position.z + 0.01
        this.renderer.render(this.scene, this.camera);
        this.renderStart()
    }

        private renderFaceMesh(predictions: Array<AnnotatedPrediction>) {
        const firstFaceOutput = predictions[0]
        const allCoordinates = firstFaceOutput.scaledMesh as Coords3D
        const geometry = new BufferGeometry()

        // Convert allCoordinates into 1-d array.
        const coordinates1D = new Float32Array(allCoordinates.length * 3);
        for (let i = 0; i < allCoordinates.length * 3; i++) {
            const meshCoordinateNumber = Math.floor(i / 3)
            const xYZIndex = i % 3
            coordinates1D[i] = (allCoordinates[meshCoordinateNumber][xYZIndex] - (this.width / 2)) / this.width
        }
        geometry.setAttribute('position', new BufferAttribute(coordinates1D, 3))

        let material = new PointsMaterial({color: 0xFFFFFF, size: 0.02})
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
