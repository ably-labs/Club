import {
    BufferAttribute,
    BufferGeometry,
    Camera,
    OrthographicCamera,
    Points,
    PointsMaterial,
    Scene,
    WebGLRenderer
} from "three";
import FaceMeshCalculator from "./FaceMeshCalculator";
import {NormalizedLandmark} from "@mediapipe/face_mesh";

/**
 * Renders video
 */
export default class VideoRenderer {
    videoElement: HTMLVideoElement
    scene: Scene
    camera: Camera
    renderer: WebGLRenderer
    renderId: number | null = null
    private faceMesh: FaceMeshCalculator;
    private isRunning: Boolean
    private readonly viewSize: number;
    private readonly aspectRatio: number;
    lastLoop = Date.now();
    private fpsOutput: HTMLParagraphElement;

    constructor(videoElement: HTMLVideoElement, outputElement: HTMLDivElement, fpsOutput: HTMLParagraphElement, viewSize = 900, width = 680, height = 480) {
        this.videoElement = videoElement;
        outputElement.innerHTML = "";
        this.fpsOutput = fpsOutput;
        this.viewSize = viewSize
        this.aspectRatio = 680 / 480
        this.renderer = new WebGLRenderer({alpha: true});
        this.renderer.setSize(width, height);
        outputElement.appendChild(this.renderer.domElement)
        this.scene = new Scene();
        this.camera = new OrthographicCamera(
            -this.aspectRatio * viewSize / 2,
            this.aspectRatio * viewSize / 2,
            viewSize / 2,
            -viewSize / 2,
            -1000,
            1000);
        this.faceMesh = new FaceMeshCalculator(this.updateFaceMesh)
    }

    /**
     * Call this to start the rendering
     */
    startRender = () => {
        if (!this.videoElement.srcObject) {
            console.error("HTML Video element has no source object.")
        }
        this.stopRender();
        this.isRunning = true
        this.renderId = window.requestAnimationFrame(this.renderLoop)
    }

    /**
     * Call this to stop rendering, aka. clear the previously requested frame
     */
    stopRender() {
        this.isRunning = false
        if (this.renderId) {
            window.cancelAnimationFrame(this.renderId)
            this.renderId = null
        }
    }

    /**
     * This function renders the latest face mesh state, which is set by FaceMeshCalculator asynchronously.
     */
    private renderLoop = async () => {
        if (!this.isRunning) {
            return
        }
        const thisLoop = Date.now()
        const fps = 1000 / (thisLoop - this.lastLoop)
        this.lastLoop = thisLoop
        this.fpsOutput.innerText = `${fps.toFixed(0)} FPS`

        if (this.videoElement.readyState == 4) { // https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/readyState
            this.scene.remove.apply(this.scene, this.scene.children)
            await this.faceMesh.send({image: this.videoElement})
        }

        this.renderer.render(this.scene, this.camera);
        if (this.renderId) window.cancelAnimationFrame(this.renderId)
        this.renderId = window.requestAnimationFrame(this.renderLoop)
    }

    /**
     * Update the face mesh state (in the three.js scene) in this class, which is used in the render loop.
     * @param normalizedLandmarks All face landmarks for 1 face, generated by the MediaPipe FaceMesh library.
     */
    updateFaceMesh = (normalizedLandmarks: NormalizedLandmark[]) => {
        // Convert allCoordinates into 1-d array.
        const geometry = new BufferGeometry()
        const coordinates1D = new Float32Array(normalizedLandmarks.length * 3);
        for (let i = 0; i < normalizedLandmarks.length * 3; i++) {
            const meshCoordinateNumber = Math.floor(i / 3)
            const xYZIndex = i % 3
            if (xYZIndex === 0) {
                coordinates1D[i] = -(normalizedLandmarks[meshCoordinateNumber].x - 0.5) * this.aspectRatio * this.viewSize
            } else if (xYZIndex === 1) {
                coordinates1D[i] = (normalizedLandmarks[meshCoordinateNumber].y - 0.5) * this.viewSize
            } else {
                coordinates1D[i] = (normalizedLandmarks[meshCoordinateNumber].z - 0.5) * Math.max(this.aspectRatio * this.viewSize, this.viewSize)
            }
        }
        geometry.setAttribute('position', new BufferAttribute(coordinates1D, 3))
        geometry.rotateZ(Math.PI)

        let material = new PointsMaterial({color: 0xFFFFFF, size: 2});
        const meshPoints = new Points(geometry, material)
        this.scene.add(meshPoints)
    }

    dispose() {
        console.log("Disposing VideoRenderer now...")
        this.renderer.dispose()
        this.stopRender()
        this.faceMesh.close()
    }
}
