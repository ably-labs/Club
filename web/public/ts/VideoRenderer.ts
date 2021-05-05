import {
    BufferAttribute,
    BufferGeometry,
    Camera,
    Object3D,
    OrthographicCamera,
    Points,
    PointsMaterial,
    Scene,
    WebGLRenderer
} from "three";
import MediapipeHolisticCalculator from "./MediapipeHolisticCalculator";
import Stats from 'stats.js'
import Messaging from "./Messaging";
import UserMedia from "./models/UserMedia";

/**
 * Renders video
 */
export default class VideoRenderer {
    videoElement: HTMLVideoElement
    private scene: Scene
    private camera: Camera
    private renderer: WebGLRenderer
    private messaging: Messaging
    renderId: number | null = null
    private isRunning: Boolean
    private readonly viewSize: number;
    private readonly aspectRatio: number;
    private fpsOutput: HTMLParagraphElement;
    private holisticCalculator: MediapipeHolisticCalculator;
    private readonly width: number;
    private readonly height: number;
    private meshPoints: Points<BufferGeometry, PointsMaterial>;
    private stats: Stats;
    private latestLandmarks: Float32Array | null = null;
    private periodicFaceData: number;

    constructor(videoElement: HTMLVideoElement,
                outputElement: HTMLDivElement,
                fpsOutput: HTMLDivElement,
                messaging: Messaging,
                viewSize = 900,
                width = 680,
    ) {
        this.videoElement = videoElement;
        outputElement.innerHTML = "";
        this.fpsOutput = fpsOutput;
        this.messaging = messaging;
        this.viewSize = viewSize;
        this.aspectRatio = 680 / 480
        this.width = width
        this.height = this.width / this.aspectRatio

        this.stats = new Stats()
        this.stats.dom.style.cssText = "position:relative;top:0;left:0;cursor:pointer;opacity:0.9;z-index:10000"
        this.stats.showPanel(0);
        this.fpsOutput.appendChild(this.stats.dom)

        this.renderer = new WebGLRenderer({alpha: true});
        this.renderer.setClearColor(0xffffff, 1)
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

        this.holisticCalculator = new MediapipeHolisticCalculator(this.updateScene, this.width, this.height)
        if (videoElement.readyState != 4) { // https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/readyState
            videoElement.addEventListener('canplay', () => {
                this.start()
            }, {once: true})
        } else {
            this.start()
        }
    }

    scheduleFaceDataPublishing() {
        this.periodicFaceData = window.setInterval(async () => {
            if (this.latestLandmarks) {
                await this.messaging.publishToLobby(this.latestLandmarks);
            }
        }, 1000)
    }

    cancelFaceDataPublishing() {
        window.clearInterval(this.periodicFaceData)
    }

    start = async () => {
        this.isRunning = true
        this.stats.begin()
        await this.step()
    }

    /**
     * Call this to start the rendering
     */
    step = async () => {
        if (!this.videoElement.srcObject) {
            console.log("Skipping renderHTML Video element, since the videoElement doesn't have the camera feed yet.")
        }
        if (this.isRunning) {
            this.isRunning = true
            await this.holisticCalculator.send(this.videoElement)
            // code continues in [MediaPipeFaceMeshCalculator.imageResultHandler], which eventually calls this.updateSceneWithFaceMesh
        }
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

    private faceMeshResources = new Set();

    addFaceMeshResources(...resources: any) {
        for (const resource of resources) {
            if (resource.dispose || resource instanceof Object3D) {
                this.faceMeshResources.add(resource)
            }
        }
    }

    private removePreviousFaceMesh() {
        this.faceMeshResources.forEach((resource: any) => {
            if (resource instanceof Object3D) {
                if (resource.parent) {
                    resource.parent.remove(resource);
                }
            }
            if (resource.dispose) {
                resource.dispose()
            }
        })
    }

    /**
     * Update the face mesh state (in the three.js scene) in this class, which is used in the render loop.
     * @param normalizedLandmarks1D All face landmarks for 1 face in a 1-dimensional list: x1, y1, z1, x2, y2, z2.
     */
    updateScene = (normalizedLandmarks1D: Float32Array) => {
        this.latestLandmarks = normalizedLandmarks1D
        if (normalizedLandmarks1D) {
            if (!this.meshPoints) {
                const MESH_COLOR = 0x0
                let material = new PointsMaterial({color: MESH_COLOR, size: 2});
                const geometry = new BufferGeometry()
                this.meshPoints = new Points(geometry, material)
                this.meshPoints.name = "User face mesh"
                this.meshPoints.geometry.setAttribute('position', new BufferAttribute(normalizedLandmarks1D, 3))
                this.addFaceMeshResources(geometry, material, this.meshPoints)
                this.scene.add(this.meshPoints)
            } else {
                // Shouldn't be gc'ing in render
                // this.meshPoints.geometry.dispose()
                if (this.trackingEnabled) {
                    this.meshPoints.geometry.setAttribute('position', new BufferAttribute(normalizedLandmarks1D, 3))
                    this.meshPoints.geometry.attributes["position"].needsUpdate = true;
                }
                this.addRemoteFaceToScene()
            }
            this.renderer.render(this.scene, this.camera);
        }

        if (this.renderId) window.cancelAnimationFrame(this.renderId)
        if (this.isRunning) {
            this.renderId = window.requestAnimationFrame(() => {
                this.stats.end()
                this.step()
            })
        }
    };

    private remoteUserMedias = new Map<string, UserMedia>()
    updateRemoteUserMedia = (remoteUserMedia: UserMedia) => {
        this.remoteUserMedias.set(remoteUserMedia.clientId, remoteUserMedia)
    }

    removeRemoteUser = (clientId: string) => {
        this.remoteUserMedias.delete(clientId)
        this.remoteUserMeshPoints.delete(clientId)
    }

    private remoteUserMeshPoints = new Map<string, Points>()

    private addRemoteFaceToScene() {
        this.remoteUserMedias.forEach((userMedia: UserMedia, key: string) => {
            if (this.remoteUserMeshPoints.has(userMedia.clientId)) {
                const remoteUserMeshPoints = this.remoteUserMeshPoints.get(userMedia.clientId)
                remoteUserMeshPoints.geometry.setAttribute('position', new BufferAttribute(userMedia.normalizedLandmarks1D, 3))
                remoteUserMeshPoints.geometry.attributes["position"].needsUpdate = true;
            } else {
                const MESH_COLOR = 0x33FF71
                let material = new PointsMaterial({color: MESH_COLOR, size: 2});
                const geometry = new BufferGeometry()
                geometry.setAttribute('position', new BufferAttribute(userMedia.normalizedLandmarks1D, 3))
                const remoteUserMeshPoints = new Points(geometry, material)
                remoteUserMeshPoints.name = `${userMedia.clientId} face mesh`
                this.remoteUserMeshPoints.set(userMedia.clientId, remoteUserMeshPoints)
                this.addFaceMeshResources(geometry, material, remoteUserMeshPoints)
                this.scene.add(remoteUserMeshPoints)
            }
        }, this)
    }

    dispose() {
        console.log("Disposing VideoRenderer now...")
        this.renderer.dispose()
        this.stopRender()
        this.holisticCalculator?.close()
        this.removePreviousFaceMesh()
    }

    private trackingEnabled: boolean = true
    async setTracking(enabled: boolean) {
        this.trackingEnabled = enabled
    }
}
