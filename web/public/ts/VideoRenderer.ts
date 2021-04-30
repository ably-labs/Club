import {
    AxesHelper,
    BufferAttribute,
    BufferGeometry,
    Camera,
    OrthographicCamera,
    Points,
    PointsMaterial,
    Scene,
    WebGLRenderer
} from "three";
import TfjsFaceMeshCalculator from "./TfjsFaceMeshCalculator";
import MediaPipeFaceMeshCalculator from "./MediaPipeFaceMeshCalculator";

/**
 * Renders video
 */
export default class VideoRenderer {
    videoElement: HTMLVideoElement
    scene: Scene
    camera: Camera
    renderer: WebGLRenderer
    renderId: number | null = null
    private isRunning: Boolean
    private readonly viewSize: number;
    private readonly aspectRatio: number;
    lastLoop = Date.now();
    private fpsOutput: HTMLParagraphElement;
    private mediaPipeFaceMesh: MediaPipeFaceMeshCalculator;
    private faceMesh: TfjsFaceMeshCalculator;
    private readonly width: number;
    private readonly height: number;
    private readonly useMediaPipe: boolean;

    constructor(videoElement: HTMLVideoElement,
                outputElement: HTMLDivElement,
                fpsOutput: HTMLParagraphElement,
                useMediaPipe = false,
                viewSize = 900,
                width = 680,
    ) {
        this.videoElement = videoElement;
        outputElement.innerHTML = "";
        this.fpsOutput = fpsOutput;
        this.viewSize = viewSize
        this.aspectRatio = 680 / 480
        this.width = width
        this.height = this.width / this.aspectRatio
        this.useMediaPipe = useMediaPipe

        this.renderer = new WebGLRenderer({alpha: true});
        this.renderer.setSize(this.width, this.height);
        outputElement.appendChild(this.renderer.domElement)
        this.scene = new Scene();
        this.camera = new OrthographicCamera(
            0,
            this.aspectRatio * viewSize / 2,
            viewSize / 2,
            0,
            -1000,
            1000);
        // const cameraControls = new OrbitControls(this.camera, this.renderer.domElement)
        // cameraControls.target.set()
        // this.faceMesh = new MediaPipeFaceMeshCalculator(this.updateFaceMesh, this.aspectRatio, viewSize)

        if (this.useMediaPipe) {
            this.mediaPipeFaceMesh = new MediaPipeFaceMeshCalculator(this.updateFaceMesh, this.width, this.height)
            this.startRender()
        } else {
            this.faceMesh = new TfjsFaceMeshCalculator(this.aspectRatio, viewSize)
            this.faceMesh.initialize().then(() => this.startRender())
        }
    }

    /**
     * Call this to start the rendering
     */
    startRender = async () => {
        if (!this.videoElement.srcObject) {
            console.error("HTML Video element has no source object.")
        }
        if (this.isRunning) {
            return
        }
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
     * This function renders the latest face mesh state, which is calculated by TfjsFaceMeshCalculator or
     * MediaPipeFaceMeshCalculator asynchronously.
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
            if (this.useMediaPipe) {
                await this.mediaPipeFaceMesh.send(this.videoElement) // code continues in [MediaPipeFaceMeshCalculator.imageResultHandler]
            } else {
                const normalizedLandmarks1D = await this.faceMesh.getKeypointsFromImage(this.videoElement)
                if (normalizedLandmarks1D) {
                    this.updateFaceMesh(normalizedLandmarks1D);
                    const axesHelper = new AxesHelper(100); // red is X, Y is green, Z is blue
                    this.scene.add(axesHelper);
                    this.renderer.render(this.scene, this.camera);
                } else {
                    console.warn("Camera detected 0 faces...")
                }
            }
        }

        this.renderer.render(this.scene, this.camera);
        if (this.renderId) window.cancelAnimationFrame(this.renderId)
        this.renderId = window.requestAnimationFrame(this.renderLoop)
    }

    /**
     * Update the face mesh state (in the three.js scene) in this class, which is used in the render loop.
     * @param normalizedLandmarks1D All face landmarks for 1 face in a 1-dimensional list: x1, y1, z1, x2, y2, z2.
     */
    updateFaceMesh = (normalizedLandmarks1D: Float32Array) => {
        const geometry = new BufferGeometry()
        geometry.setAttribute('position', new BufferAttribute(normalizedLandmarks1D, 3))
        // geometry.rotateZ(Math.PI)
        let material = new PointsMaterial({color: 0xFFFFFF, size: 2});
        const meshPoints = new Points(geometry, material)
        this.scene.remove.apply(this.scene, this.scene.children)
        this.scene.add(meshPoints)
    }

    dispose() {
        console.log("Disposing VideoRenderer now...")
        this.renderer.dispose()
        this.stopRender()
        this.faceMesh?.close()
        this.mediaPipeFaceMesh?.close()
    }
}
