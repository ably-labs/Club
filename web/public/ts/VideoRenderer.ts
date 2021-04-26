import {AnnotatedPrediction} from "@tensorflow-models/face-landmarks-detection/dist/mediapipe-facemesh";
import {BoxGeometry, Camera, MeshBasicMaterial, PerspectiveCamera, Scene, WebGLRenderer, Mesh} from "three";

export default class VideoRenderer {
    videoElement: HTMLVideoElement
    scene: Scene
    camera: Camera
    renderer: WebGLRenderer
    renderId: number | null = null

    constructor(videoElement: HTMLVideoElement, outputElement: HTMLDivElement) {
        this.videoElement = videoElement
        this.scene = new Scene();
        this.camera = new PerspectiveCamera();
        this.renderer = new WebGLRenderer();
        this.renderer.setSize(400, 400);
        outputElement.innerHTML = ""
        outputElement.appendChild(this.renderer.domElement)
    }

    async initialize() {
        const constraints = {video: true};
        const mediaStream = await navigator.mediaDevices.getUserMedia(
            constraints
        );
        this.videoElement.srcObject = mediaStream;
    }

    renderKeypoints(predictions: AnnotatedPrediction[]) {
        console.log({predictions})
        // TODO render 3d points from predictions

        const geometry = new BoxGeometry();
        const material = new MeshBasicMaterial({color: 0x00ff00});
        const cube = new Mesh(geometry, material)
        this.scene.remove.apply(this.scene, this.scene.children)
        this.scene.add(cube)
        this.camera.position.z = 2
        this.renderer.render(this.scene, this.camera);

        this.renderStop();
        this.renderStart();
    }

    renderStart() {
        if (!this.renderId) {
            this.renderId = window.requestAnimationFrame(this.renderLoop)
        }
    }

    renderLoop = () => {
        this.renderId = null
        // TODO animate
        console.log("Rendering....")
        const oldPosition = this.camera.position.z
        this.camera.position.z = this.camera.position.z + 0.01
        this.renderer.render(this.scene, this.camera);
        console.log(`Old position: ${oldPosition}, New position: ${this.camera.position.z }`)
        this.renderStart()
    }

    renderStop() {
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
