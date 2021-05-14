import {
    BufferAttribute,
    BufferGeometry,
    Camera,
    Color,
    FontLoader,
    Mesh,
    MeshBasicMaterial,
    OrthographicCamera,
    Points,
    PointsMaterial,
    Scene,
    TextGeometry,
    WebGLRenderer
} from "three";
import MediapipeHolisticCalculator from "./MediapipeHolisticCalculator";
import Stats from 'stats.js'
import Messaging from "./Messaging";
import UserMedia from "./models/UserMedia";
import Direction from "./models/Direction";
import {Results} from "@mediapipe/holistic";

/**
 * Renders video to a three.js renderer periodically based on its internal state.
 * Update this state to change the render output for the next frame.
 * There are multiple types of state, such as local user's face mesh,
 * remote user's data, and perhaps more to come (objects).
 */
export default class VideoRenderer {
    videoElement: HTMLVideoElement
    private scene: Scene
    private camera: Camera
    private readonly renderer: WebGLRenderer
    private readonly rendererWidth: number;
    private readonly rendererHeight: number;
    private messaging: Messaging
    renderId: number | null = null
    private isRunning: boolean
    private fpsOutput: HTMLParagraphElement;
    private holisticCalculator: MediapipeHolisticCalculator;
    private meshPoints: Points<BufferGeometry, PointsMaterial>;
    private localUsernameRender: Mesh<TextGeometry, MeshBasicMaterial>
    private stats: Stats;
    private latestLandmarks: Uint16Array | null = null;
    private periodicFaceData: number;
    private faceMeshColor: string;
    private readonly uploadFramesPerSecond: number;
    private readonly cameraWidth: number;
    private readonly cameraHeight: number;
    private localFaceMeshPointSize: number;
    private usernameAnchorCoordinates: Uint16Array
    private readonly scaleFactor: number;
    private readonly setLoadingScreenCallback: (boolean) => void
    private username: string;

    constructor(videoElement: HTMLVideoElement,
                outputElement: HTMLDivElement,
                fpsOutput: HTMLDivElement,
                messaging: Messaging,
                username: string,
                videoRendererOptions: VideoRendererOptions,
                uploadFramesPerSecond = 2,
                rendererWidth = 680,
                rendererHeight = 480,
    ) {
        this.videoElement = videoElement;
        outputElement.innerHTML = "";
        this.fpsOutput = fpsOutput;
        this.messaging = messaging;
        this.username = username;
        // remove rendererWidth/ height
        this.rendererWidth = rendererWidth
        this.rendererHeight = rendererHeight
        this.uploadFramesPerSecond = uploadFramesPerSecond
        this.localFaceMeshPointSize = 1
        this.scaleFactor = 0.3
        this.faceMeshColor = videoRendererOptions.faceMeshColor
        this.setLoadingScreenCallback = videoRendererOptions.stopLoadingScreenCallback

        this.stats = new Stats()
        this.stats.dom.style.cssText = "position:relative;top:0;left:0;cursor:pointer;opacity:0.9;z-index:10000"
        this.stats.showPanel(0);
        this.fpsOutput.appendChild(this.stats.dom)

        this.renderer = new WebGLRenderer({alpha: true});
        this.renderer.setClearColor(0xEEF2FF, 1)
        this.renderer.setSize(this.rendererWidth, this.rendererHeight);
        this.renderer.domElement.style.borderRadius = "16px"
        outputElement.appendChild(this.renderer.domElement)
        this.scene = new Scene();

        const aspectRatio = rendererWidth / rendererHeight
        this.cameraWidth = Math.pow(2, 16) - 1;
        this.cameraHeight = this.cameraWidth / aspectRatio
        this.camera = new OrthographicCamera(
            0,
            this.cameraWidth,
            this.cameraHeight,
            0,
            -100000,
            100000);

        this.holisticCalculator = new MediapipeHolisticCalculator(this.updateScene);
        // https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/readyState
        if (videoElement.readyState != 4) {
            videoElement.addEventListener('canplay', async () => {
                await this.start()
            }, {once: true})
            // Render an empty canvas temporarily, to lay out the screen nicely.
            this.renderer.render(this.scene, this.camera);
            window.requestAnimationFrame(() => { /* do nothing extra */
            })
        } else {
            this.start()
        }

        this.setupKeyControls()
    }

    updateUsername = (newUsername: string): void => {
        this.username = newUsername;
        // need to delete old username text, and re-render it
        this.localUsernameRender.parent.remove(this.localUsernameRender)
        this.renderText(this.username, this.faceMeshColor, this.usernameAnchorCoordinates, (textMesh) => {
            this.localUsernameRender = textMesh
        })
    }

    scheduleFaceDataPublishing = (): void => {
        window.clearInterval(this.periodicFaceData)
        const intervalInMilliseconds = 1000 / this.uploadFramesPerSecond
        this.periodicFaceData = window.setInterval(async () => {
            if (this.latestLandmarks) {
                await this.messaging.publishToLobby(this.latestLandmarks,
                    this.faceMeshColor,
                    this.localFaceMeshPointSize,
                    this.usernameAnchorCoordinates
                );
            }
        }, intervalInMilliseconds)
    }

    cancelFaceDataPublishing(): void {
        window.clearInterval(this.periodicFaceData)
    }

    start = async (): Promise<void> => {
        this.isRunning = true
        this.stats.begin()
        await this.step()
    }

    /**
     * Call this to start the rendering
     */
    step = async (): Promise<void> => {
        if (this.isRunning) {
            this.isRunning = true
            await this.holisticCalculator.send(this.videoElement)
            //  continues in [MediaPipeFaceMeshCalculator.imageResultHandler]
        }
    }

    /**
     * Call this to stop rendering, aka. clear the previously requested frame
     */
    stopRender(): void {
        this.isRunning = false
        if (this.renderId) {
            window.cancelAnimationFrame(this.renderId)
            this.renderId = null
        }
    }

    /**
     * Update the face mesh state (in the three.js scene) in this class, which is used in the render loop.
     * @param results Mediapipe holistic results data type, containing hands, body and face coordinates.
     */
    updateScene = (results: Results): void => {
        this.latestLandmarks = this.transform(results)
        this.updateSceneUsingLocalFaceState()
        this.updateSceneUsingRemoteFacesState()
        this.renderer.render(this.scene, this.camera);

        if (this.renderId) window.cancelAnimationFrame(this.renderId)
        if (this.isRunning) {
            this.renderId = window.requestAnimationFrame(async () => {
                this.stats.end()
                await this.step()
            })
        }
    };

    // TODO add guide to use arrow keys or WASD
    /**
     * @returns Float32Array All face landmarks for 1 face in a 1-dimensional list: x1, y1, z1, x2, y2, z2.
     * @private
     */
    private scaledCoords: Uint16Array;

    private transform(results: Results): Uint16Array {
        const poseLandmarks = results.poseLandmarks
        const normalizedLandmarks = results.faceLandmarks
        if (normalizedLandmarks) {
            if (!this.scaledCoords) {
                this.scaledCoords = new Uint16Array(normalizedLandmarks.length * 3 + 6);
            }
            // Convert allCoordinates into 1-d array.
            const xMultiplier = this.cameraWidth * this.scaleFactor
            const yMultiplier = this.cameraHeight * this.scaleFactor
            const xShift = this.offset.right
            const yShift = (this.cameraHeight * this.scaleFactor) + this.offset.up
            const zShift = 10

            let xUsernameAnchor = this.cameraWidth;
            let yUsernameAnchor = this.cameraHeight;
            for (let i = 0; i < normalizedLandmarks.length * 3; i++) {
                const meshCoordinateNumber = Math.floor(i / 3)
                const xYZIndex = i % 3
                if (xYZIndex === 0) {
                    this.scaledCoords[i] = (normalizedLandmarks[meshCoordinateNumber].x * xMultiplier) + xShift
                    if (this.scaledCoords[i] < xUsernameAnchor) { // set xAnchor to be the lowest x value
                        xUsernameAnchor = this.scaledCoords[i]
                    }
                } else if (xYZIndex === 1) {
                    this.scaledCoords[i] = -(normalizedLandmarks[meshCoordinateNumber].y) * yMultiplier + yShift
                    if (this.scaledCoords[i] < yUsernameAnchor) { // set yAnchor to be the lowest y value
                        yUsernameAnchor = this.scaledCoords[i]
                    }
                } else {
                    this.scaledCoords[i] = (normalizedLandmarks[meshCoordinateNumber].z + zShift) * xMultiplier
                }
            }

            const usernameAnchorCoordinates2D = new Uint16Array(2);
            usernameAnchorCoordinates2D[0] = xUsernameAnchor
            usernameAnchorCoordinates2D[1] = yUsernameAnchor
            this.changeLocalAnchorCoordinates(usernameAnchorCoordinates2D)

            // 2 shoulders
            this.scaledCoords[this.scaledCoords.length - 6] = poseLandmarks[12].x * xMultiplier + xShift
            this.scaledCoords[this.scaledCoords.length - 5] = -poseLandmarks[12].y * yMultiplier + yShift
            this.scaledCoords[this.scaledCoords.length - 4] = (poseLandmarks[12].z + zShift) * xMultiplier
            this.scaledCoords[this.scaledCoords.length - 3] = poseLandmarks[11].x * xMultiplier + xShift
            this.scaledCoords[this.scaledCoords.length - 2] = -poseLandmarks[11].y * yMultiplier + yShift
            this.scaledCoords[this.scaledCoords.length - 1] = (poseLandmarks[11].z + zShift) * xMultiplier
        } else {
            console.warn("Face not found...")
        }
        return this.scaledCoords
    }

    /**
     * Controls for moving users face on 2D environment
     */
    private offset = {
        up: 100,
        right: 50,
    }
    // TODO handle physical edge cases. But what is the width of the camera box
    moveLocalFace = (direction: Direction, quantity: number): void => {
        switch (direction) {
            case Direction.Left:
                if (this.offset.right - quantity >= 0) {
                    this.offset.right -= quantity
                }
                break
            case Direction.Down:
                if (this.offset.up - quantity >= 0) {
                    this.offset.up -= quantity
                }
                break
            case Direction.Right:
                if (this.offset.right + quantity + this.cameraWidth * this.scaleFactor <= this.cameraWidth) {
                    this.offset.right += quantity
                }
                break
            case Direction.Up:
                if (this.offset.up + quantity + this.cameraHeight * this.scaleFactor <= this.cameraHeight) {
                    this.offset.up += quantity
                }
                break
        }
    }

    private updateSceneUsingLocalFaceState() {
        if (!this.latestLandmarks) {
            return
        }
        if (!this.meshPoints) {
            this.setLoadingScreenCallback(false)

            // Mesh points
            const material = new PointsMaterial({color: this.faceMeshColor, size: this.localFaceMeshPointSize});
            const geometry = new BufferGeometry()
            this.meshPoints = new Points(geometry, material)
            this.meshPoints.name = "User face mesh"
            this.meshPoints.geometry.setAttribute('position', new BufferAttribute(this.latestLandmarks, 3))
            this.scene.add(this.meshPoints)

            this.renderText(this.username, this.faceMeshColor, this.usernameAnchorCoordinates, (textMesh) => {
                this.localUsernameRender = textMesh
            })
        } else {
            if (this.localFaceTrackingEnabled) {
                if (this.localUsernameRender) {
                    this.localUsernameRender.position.set(
                        this.usernameAnchorCoordinates[0],
                        this.usernameAnchorCoordinates[1],
                        0
                    )
                }
                this.meshPoints.geometry.setAttribute('position', new BufferAttribute(this.latestLandmarks, 3))
                this.meshPoints.geometry.attributes["position"].needsUpdate = true;
            }
        }
    }

    changeLocalFaceMeshColor = (color: string): void => {
        this.faceMeshColor = color
        this.meshPoints.material.color = new Color(color)
        this.meshPoints.material.needsUpdate = true
        this.localUsernameRender.material.color = new Color(color)
        this.localUsernameRender.material.needsUpdate = true
    }

    changeLocalFaceMeshSize = (size: number): void => {
        this.meshPoints.material.size = size
        this.localFaceMeshPointSize = size
        this.meshPoints.material.needsUpdate = true
    }

    changeLocalAnchorCoordinates = (coordinate2d: Uint16Array): void => {
        this.usernameAnchorCoordinates = coordinate2d
    }

    updateRemoteUserMedia = (remoteUserMedia: UserMedia): void => {
        this.remoteUserMedias.set(remoteUserMedia.clientId, remoteUserMedia)
    }

    removeRemoteUser = (clientId: string): void => {
        this.remoteUserMedias.delete(clientId)
        if (this.remoteUserMeshPoints.has(clientId)) {
            const points = this.remoteUserMeshPoints.get(clientId)
            points.parent.remove(points)
            this.remoteUserMeshPoints.delete(clientId)
        }
        if (this.remoteUserNameGeometries.has(clientId)) {
            const text = this.remoteUserNameGeometries.get(clientId)
            text.parent.remove(text)
            this.remoteUserNameGeometries.delete(clientId)
        }
    }

    // TODO I should put them all in one...
    private remoteUserMedias = new Map<string, UserMedia>()
    private remoteUserMeshPoints = new Map<string, Points<BufferGeometry, PointsMaterial>>()
    private remoteUserNameGeometries = new Map<string, Mesh<TextGeometry, MeshBasicMaterial>>()

    private updateSceneUsingRemoteFacesState() {
        this.remoteUserMedias.forEach((userMedia: UserMedia, clientId: string) => {
            if (this.remoteUserMeshPoints.has(clientId)) {
                const remoteUserMeshPoints = this.remoteUserMeshPoints.get(clientId)
                remoteUserMeshPoints.geometry.setAttribute('position',
                    new BufferAttribute(userMedia.normalizedLandmarks1D, 3))
                remoteUserMeshPoints.material.color.set(userMedia.faceMeshColor)
                remoteUserMeshPoints.material.size = userMedia.meshPointSize
                remoteUserMeshPoints.geometry.attributes["position"].needsUpdate = true;
                const textMesh = this.remoteUserNameGeometries.get(clientId)
                if (textMesh) {
                    textMesh.material.color.set(userMedia.faceMeshColor)
                    textMesh.position.set(
                        userMedia.usernameAnchorCoordinates[0],
                        userMedia.usernameAnchorCoordinates[1],
                        0
                    )
                    // TODO cache the previous color and material, to avoid updating every frame.
                    textMesh.material.needsUpdate = true
                }
                // TODO cache the previous color and material, to avoid updating every frame.
                remoteUserMeshPoints.material.needsUpdate = true
            } else {
                const meshColor = userMedia.faceMeshColor
                const material = new PointsMaterial({color: meshColor, size: userMedia.meshPointSize});
                const geometry = new BufferGeometry()
                geometry.setAttribute('position', new BufferAttribute(userMedia.normalizedLandmarks1D, 3))
                const remoteUserMeshPoints = new Points(geometry, material)
                remoteUserMeshPoints.name = `${userMedia.clientId} face mesh`
                this.remoteUserMeshPoints.set(userMedia.clientId, remoteUserMeshPoints)
                this.scene.add(remoteUserMeshPoints)

                this.renderText(userMedia.username, meshColor, userMedia.usernameAnchorCoordinates,(textMesh) => {
                    this.remoteUserNameGeometries.set(clientId, textMesh)
                })
            }
        }, this)
    }

    /**
     * @param username
     * @param color
     * @param anchorCoordinates2D
     * @param referenceHandler handle the resource after getting it: e.g. save it, and update it later
     * @private
     */
    private renderText(username: string,
                     color: string,
                     anchorCoordinates2D: Uint16Array,
                     referenceHandler: (textMesh: Mesh<TextGeometry, MeshBasicMaterial>) => void) {
        const loader = new FontLoader()
        // fonts listed at https://threejs.org/docs/#api/en/geometries/TextGeometry
        loader.load('fonts/ubuntu_mono_regular.json',
            (responseFont => {
                const textGeometry = new TextGeometry(username, {
                    font: responseFont,
                    size: 1500,
                })
                const textMaterial = new MeshBasicMaterial({color: color})
                const textMesh = new Mesh(textGeometry, textMaterial)
                textMesh.position.set(anchorCoordinates2D[0], anchorCoordinates2D[1], 0)
                this.scene.add(textMesh)
                referenceHandler(textMesh)
            }),
            (progressEvent) => { /* do nothing */ },
            (errorEvent) => {
                console.warn(`Text font didn't load, won't show username: ${username} on the render canvas.`)
                console.warn({errorEvent})
            }
        )
    }

    /**
     * Face tracking can be paused and re-enabled using this.
     * @param enabled
     */
    async setLocalFaceTrackingTracking(enabled: boolean) {
        this.localFaceTrackingEnabled = enabled
        if (enabled) {
            this.scheduleFaceDataPublishing()
        } else {
            this.cancelFaceDataPublishing()
        }
    }

    private localFaceTrackingEnabled = true

    dispose() {
        this.renderer.dispose()
        this.stopRender()
        this.holisticCalculator?.close()
    }

    /**
     * Put all your controls in here to keep them tidy.
     *
     * We keep track of keys that are pressed down in a state (this.keysPressed),
     * so that we know when multiple keys are pressed at the same time and can support holding
     * e.g. A + W to go up-and-to-the-left/ north-west.
     */
    private setupKeyControls() {

        document.addEventListener('keyup', (event) => {
            delete this.keysPressed[event.key];
        });

        document.addEventListener('keydown', (event) => {
            this.keysPressed[event.key] = true;

            let moveQuantity = 1000
            if (this.keysPressed["Shift"]) {
                moveQuantity = 10000
            }

            if (this.keysPressed["ArrowLeft"] || this.keysPressed["a"]) {
                this.moveLocalFace(Direction.Left, moveQuantity)
            }

            if (this.keysPressed["ArrowDown"] || this.keysPressed["s"]) {
                this.moveLocalFace(Direction.Down, moveQuantity)
            }

            if (this.keysPressed["ArrowRight"] || this.keysPressed["d"]) {
                this.moveLocalFace(Direction.Right, moveQuantity)
            }

            if (this.keysPressed["ArrowUp"] || this.keysPressed["w"]) {
                this.moveLocalFace(Direction.Up, moveQuantity)
            }
        });
    }

    /**
     * Setting up key controls for the user, such as moving the character
     * @private
     */
    private keysPressed = {};
}

export interface VideoRendererOptions {
    faceMeshColor: string,
    stopLoadingScreenCallback: (boolean) => void
}