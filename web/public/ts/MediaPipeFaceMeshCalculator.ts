import {FaceMesh} from "@mediapipe/face_mesh/face_mesh";

export default class MediaPipeFaceMeshCalculator {
    /**
     * Uses MediaPipe FaceMesh library to calculate the face mesh from input image (through a video html element)
     *
     * @param resultCallback - Takes 1 argument: The face mesh, Float32Array containing the 1D representation of the face
     *  mesh coordinates. Used to trigger further action after Three.js-friendly 1D representation, such as add to scene,
     *  and render.
     * @param width - The height of the output render canvas. Used rescale the face mesh to fit the render canvas.
     * @param height - The width of the output render canvas. Similar to width.
     *
     * @private
     */
    private readonly model: FaceMesh
    private readonly resultsCallback: (normalizedLandmarks1D: Float32Array) => void;
    private readonly width: number;
    private readonly height: number;

    constructor(resultsCallback: (normalizedLandmarks1D: Float32Array) => void,
                width: number,
                height: number) {
        this.resultsCallback = resultsCallback
        this.width = width
        this.height = height
        console.log("Creating FaceMeshCalculator using MediaPipe")
        this.model = new FaceMesh({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
            }
        });
        this.model.setOptions({
            maxNumFaces: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        })
        this.model.onResults(this.imageResultHandler)
    }

    /**
     * Handles results passed by MediaPipe FaceMesh library, and finally calls the callback function specified in the constructor.
     * @param results
     */
    imageResultHandler = (results) => {
        const faces = results.multiFaceLandmarks
        if (!results || !faces || faces.length == 0) {
            console.warn("No faces found...")
            return
        }
        const normalizedLandmarks = faces[0]
        // Convert allCoordinates into 1-d array.
        const normalizedLandmarks1D = new Float32Array(normalizedLandmarks.length * 3);
        for (let i = 0; i < normalizedLandmarks.length * 3; i++) {
            const meshCoordinateNumber = Math.floor(i / 3)
            const xYZIndex = i % 3
            if (xYZIndex === 0) {
                normalizedLandmarks1D[i] = (normalizedLandmarks[meshCoordinateNumber].x) * this.width
            } else if (xYZIndex === 1) {
                normalizedLandmarks1D[i] = -(normalizedLandmarks[meshCoordinateNumber].y) * this.height + (this.height)
            } else {
                normalizedLandmarks1D[i] = (normalizedLandmarks[meshCoordinateNumber].z) * Math.max(this.width, this.height)
            }
        }
        this.resultsCallback(normalizedLandmarks1D);
    }

    /**
     * Send input into the mediapipe face mesh. Results will be process by imageResultHandler
     * @param videoElement
     */
    send = async (videoElement: HTMLVideoElement): Promise<void> => {
        return this.model.send({image: videoElement})
    }

    close = () => {
        this.model.close()
    }
}