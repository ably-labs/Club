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

export interface VideoRendererOptions {
    faceMeshColor: string,
    stopLoadingScreenCallback: (boolean) => void
}

/**
 * Renders video to a three.js renderer periodically based on its internal state.
 * Update this state to change the render output for the next frame.
 * There are multiple types of state, such as local user's face mesh,
 * remote user's data, and perhaps more to come (objects).
 */
export default class VideoRenderer {
    private readonly setLoadingScreenCallback: (boolean) => void
    videoElement: HTMLVideoElement
    private messaging: Messaging
    private readonly scene: Scene
    private readonly camera: Camera
    private readonly renderer: WebGLRenderer
    renderId: number | null = null

    private isRunning: boolean
    private holisticCalculator: MediapipeHolisticCalculator;
    private renderingPerformanceStats: Stats;
    private readonly uploadFramesPerSecond: number;

    private readonly cameraWidth: number;
    private readonly cameraHeight: number;

    private faceMeshColor: string;
    private readonly scaleFactor: number;
    private localFaceMeshPointSize: number;
    private latestLandmarks: Uint16Array | null = null;
    private meshPointsRender: Points<BufferGeometry, PointsMaterial>;
    private periodicFaceDataPublishingReference: number;

    private username: string;
    private usernameAnchorCoordinates: Uint16Array
    private localUsernameRender: Mesh<TextGeometry, MeshBasicMaterial>
    private clientIdsToUsername = new Map<string, string>();

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
        this.messaging = messaging;
        this.username = username;
        this.uploadFramesPerSecond = uploadFramesPerSecond
        this.localFaceMeshPointSize = 1
        this.scaleFactor = 0.3
        this.faceMeshColor = videoRendererOptions.faceMeshColor
        this.setLoadingScreenCallback = videoRendererOptions.stopLoadingScreenCallback

        this.renderingPerformanceStats = new Stats()
        this.renderingPerformanceStats.dom.style.cssText = "position:relative;top:0;left:0;cursor:pointer;opacity:0.9;z-index:10000"
        this.renderingPerformanceStats.showPanel(0);
        fpsOutput.appendChild(this.renderingPerformanceStats.dom)

        this.renderer = new WebGLRenderer({alpha: true});
        this.renderer.setClearColor(0xEEF2FF, 1)
        this.renderer.setSize(rendererWidth, rendererHeight);
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
        this.localUsernameRender.parent.remove(this.localUsernameRender) // delete old username rendering
        this.renderText(this.username, this.faceMeshColor, this.usernameAnchorCoordinates, (textMesh) => {
            this.localUsernameRender = textMesh
        })
    }

    scheduleFaceDataPublishing = (): void => {
        window.clearInterval(this.periodicFaceDataPublishingReference)
        const intervalInMilliseconds = 1000 / this.uploadFramesPerSecond
        this.periodicFaceDataPublishingReference = window.setInterval(async () => {
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
        window.clearInterval(this.periodicFaceDataPublishingReference)
    }

    /**
     * Call this to start the rendering
     */
    start = async (): Promise<void> => {
        this.isRunning = true
        this.renderingPerformanceStats.begin()
        await this.step()
    }

    /**
     * Steps one frame in the rendering
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
        this.latestLandmarks = this.transformFaceMeshResults(results)
        this.updateSceneWithLocalFaceState()
        this.updateSceneUsingRemoteFacesState()
        this.renderer.render(this.scene, this.camera);

        if (this.renderId) window.cancelAnimationFrame(this.renderId)
        if (this.isRunning) {
            this.renderId = window.requestAnimationFrame(async () => {
                this.renderingPerformanceStats.end()
                await this.step()
            })
        }
    };

    private scaledCoords: Uint16Array;

    /**
     * Transforms the data (coordinates) from the MediaPipe holistic library running locally on the camera feed,
     * into a the right position and size to render on the three.js canvas. It updates the local state,
     * which will be used in the next render loop.
     * @param results
     * @private
     */
    private transformFaceMeshResults(results: Results): Uint16Array {
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
            this.updateLocalAnchorCoordinates(usernameAnchorCoordinates2D)

            // 2 shoulders
            this.scaledCoords[this.scaledCoords.length - 6] = poseLandmarks[12].x * xMultiplier + xShift
            this.scaledCoords[this.scaledCoords.length - 5] = -poseLandmarks[12].y * yMultiplier + yShift
            this.scaledCoords[this.scaledCoords.length - 4] = (poseLandmarks[12].z + zShift) * xMultiplier
            this.scaledCoords[this.scaledCoords.length - 3] = poseLandmarks[11].x * xMultiplier + xShift
            this.scaledCoords[this.scaledCoords.length - 2] = -poseLandmarks[11].y * yMultiplier + yShift
            this.scaledCoords[this.scaledCoords.length - 1] = (poseLandmarks[11].z + zShift) * xMultiplier
        } else {
            // TODO render some text in ThreeJS to warn face not found instead of logging
            console.warn("Face not found...")
        }
        return this.scaledCoords
    }

    private updateSceneWithLocalFaceState = () => {
        if (!this.latestLandmarks) {
            return
        }
        if (!this.meshPointsRender) {
            this.setLoadingScreenCallback(false)

            const material = new PointsMaterial({color: this.faceMeshColor, size: this.localFaceMeshPointSize});
            const geometry = new BufferGeometry()
            this.meshPointsRender = new Points(geometry, material)
            this.meshPointsRender.name = "User face mesh"
            this.meshPointsRender.geometry.setAttribute('position', new BufferAttribute(this.latestLandmarks, 3))
            this.scene.add(this.meshPointsRender)

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
                this.meshPointsRender.geometry.setAttribute('position', new BufferAttribute(this.latestLandmarks, 3))
                this.meshPointsRender.geometry.attributes["position"].needsUpdate = true;
            }
        }
    }

    updateSceneWithLocalFaceMeshColor = (hexColor: string): void => {
        this.faceMeshColor = hexColor
        this.meshPointsRender.material.color = new Color(hexColor)
        this.meshPointsRender.material.needsUpdate = true
        this.localUsernameRender.material.color = new Color(hexColor)
        this.localUsernameRender.material.needsUpdate = true
    }

    updateSceneWithLocalFaceMeshSize = (size: number): void => {
        this.meshPointsRender.material.size = size
        this.localFaceMeshPointSize = size
        this.meshPointsRender.material.needsUpdate = true
    }

    updateLocalAnchorCoordinates = (coordinate2d: Uint16Array): void => {
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
                if (this.clientIdsToUsername.get(clientId) !== userMedia.username) {
                    textMesh.parent.remove(textMesh)
                    this.renderText(userMedia.username, userMedia.faceMeshColor, userMedia.usernameAnchorCoordinates,
                        (newTextMesh) => {
                            this.remoteUserNameGeometries.set(clientId, newTextMesh)
                        })
                    // Update store
                    this.clientIdsToUsername.set(clientId, userMedia.username)
                } else if (textMesh) {
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
                this.clientIdsToUsername.set(clientId, userMedia.username)
                const meshColor = userMedia.faceMeshColor
                const material = new PointsMaterial({color: meshColor, size: userMedia.meshPointSize});
                const geometry = new BufferGeometry()
                geometry.setAttribute('position', new BufferAttribute(userMedia.normalizedLandmarks1D, 3))
                const remoteUserMeshPoints = new Points(geometry, material)
                remoteUserMeshPoints.name = `${userMedia.clientId} face mesh`
                this.remoteUserMeshPoints.set(userMedia.clientId, remoteUserMeshPoints)
                this.scene.add(remoteUserMeshPoints)

                this.renderText(userMedia.username, meshColor, userMedia.usernameAnchorCoordinates, (textMesh) => {
                    this.remoteUserNameGeometries.set(clientId, textMesh)
                })
            }
        }, this)
    }

    updateTextMeshText = (clientId: string, text: string) => {

    }

    /**
     * @param text The string to be drawn on the canvas
     * @param color The color of the text to be rendered
     * @param anchorCoordinates2D The position the text will be placed at.
     * @param referenceHandler A callback which is passed the textMesh which was generated.
     *  You should save this so you can update this in the next render loop or in the future, when necessary.
     * @private
     */
    private renderText(text: string,
                       color: string,
                       anchorCoordinates2D: Uint16Array,
                       referenceHandler: (textMesh: Mesh<TextGeometry, MeshBasicMaterial>) => void) {
        const loader = new FontLoader()
        loader.load('fonts/ubuntu_mono_regular.json', // font format https://threejs.org/docs/#api/en/geometries/TextGeometry
            (responseFont => {
                const textGeometry = new TextGeometry(text, {
                    font: responseFont,
                    size: 1500,
                })
                const textMaterial = new MeshBasicMaterial({color: color})
                const textMesh = new Mesh(textGeometry, textMaterial)
                textMesh.position.set(anchorCoordinates2D[0], anchorCoordinates2D[1], 0)
                this.scene.add(textMesh)
                referenceHandler(textMesh)
            }),
            (progressEvent) => { /* do nothing */
            },
            (errorEvent) => {
                console.warn(`Text font didn't load, won't show text: ${text} on the render canvas.`)
                console.warn({errorEvent})
            }
        )
    }

    /**
     * Face tracking can be paused and re-enabled using this.
     * @param enabled
     */
    setLocalFaceTrackingTracking = (enabled: boolean): void => {
        this.localFaceTrackingEnabled = enabled
        if (enabled) {
            this.scheduleFaceDataPublishing()
        } else {
            this.cancelFaceDataPublishing()
        }
    }

    private localFaceTrackingEnabled = true

    dispose = (): void => {
        this.renderer.dispose()
        this.stopRender()
        this.holisticCalculator?.close()
    }

    /**
     * Controls for moving users face on 2D environment
     */
    private offset = {
        up: 100,
        right: 50,
    }
    moveLocalFace = (direction: Direction, quantity: number): void => {
        const outOfBoundsMultiplier = 1.1 // To allow user's camera to be moved slightly out of boundary.
        switch (direction) {
            case Direction.Left:
                if (this.offset.right - quantity >= 0 - this.cameraWidth * 0.1) {
                    this.offset.right -= quantity
                }
                break
            case Direction.Down:
                if (this.offset.up - quantity >= 0 - this.cameraHeight * 0.1) {
                    this.offset.up -= quantity
                }
                break
            case Direction.Right:
                if (this.offset.right + quantity + this.cameraWidth * this.scaleFactor <= this.cameraWidth * outOfBoundsMultiplier) {
                    this.offset.right += quantity
                }
                break
            case Direction.Up:
                if (this.offset.up + quantity + this.cameraHeight * this.scaleFactor <= this.cameraHeight * outOfBoundsMultiplier) {
                    this.offset.up += quantity
                }
                break
        }
    }

    /**
     * Put all your controls in here to keep them tidy.
     *
     * We keep track of keys that are pressed down in a state (this.keysPressed),
     * so that we know when multiple keys are pressed at the same time and can support holding
     * e.g. A + W to go up-and-to-the-left/ north-west.
     */
    private setupKeyControls = () => {

        document.addEventListener('keyup', (event) => {
            delete this.keysPressed[event.key];
        });

        document.addEventListener('keydown', (event) => {
            this.keysPressed[event.key] = true;

            let moveQuantity = 1000
            if (this.keysPressed["Shift"]) {
                moveQuantity = 10000
            }

            if (this.keysPressed["ArrowLeft"] || this.keysPressed["a"] || this.keysPressed["A"]) {
                this.moveLocalFace(Direction.Left, moveQuantity)
            }

            if (this.keysPressed["ArrowDown"] || this.keysPressed["s"] || this.keysPressed["S"]) {
                this.moveLocalFace(Direction.Down, moveQuantity)
            }

            if (this.keysPressed["ArrowRight"] || this.keysPressed["d"] || this.keysPressed["D"]) {
                this.moveLocalFace(Direction.Right, moveQuantity)
            }

            if (this.keysPressed["ArrowUp"] || this.keysPressed["w"] || this.keysPressed["W"]) {
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