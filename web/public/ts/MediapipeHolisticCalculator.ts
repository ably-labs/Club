import {Holistic, Results} from "@mediapipe/holistic";

export default class MediapipeHolisticCalculator {
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
    private readonly holistic: Holistic
    private readonly resultsCallback: (normalizedLandmarks1D: Float32Array) => void;
    private readonly width: number;
    private readonly height: number;
    private normalizedLandmarks1D: Float32Array;

    constructor(resultsCallback: (normalizedLandmarks1D: Float32Array) => void,
                width: number,
                height: number) {
        this.resultsCallback = resultsCallback
        this.width = width
        this.height = height

        this.holistic = new Holistic({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.1/${file}`;
            }
        });
        this.holistic.setOptions({
            selfieMode: true,
            smoothLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        })
        this.holistic.onResults(this.imageResultHandler)
    }

    /**
     * Send input into the mediapipe solution (holistic). Results will be processed by imageResultHandler
     * @param videoElement
     */
    send = async (videoElement: HTMLVideoElement): Promise<void> => {
        return await this.holistic.send({image: videoElement})
    }

    /**
     * Handles results passed by MediaPipe FaceMesh library, and finally calls the callback function specified in the constructor.
     * @param results
     */
    imageResultHandler = (results: Results) => {
        const poseLandmarks = results.poseLandmarks
        const normalizedLandmarks = results.faceLandmarks
        if (normalizedLandmarks) {
            if (!this.normalizedLandmarks1D) {
                this.normalizedLandmarks1D = new Float32Array(normalizedLandmarks.length * 3 + 6);
            }
            // Convert allCoordinates into 1-d array.
            for (let i = 0; i < normalizedLandmarks.length * 3; i++) {
                const meshCoordinateNumber = Math.floor(i / 3)
                const xYZIndex = i % 3
                if (xYZIndex === 0) {
                    this.normalizedLandmarks1D[i] = (normalizedLandmarks[meshCoordinateNumber].x) * this.width
                } else if (xYZIndex === 1) {
                    this.normalizedLandmarks1D[i] = -(normalizedLandmarks[meshCoordinateNumber].y) * this.height + (this.height)
                } else {
                    this.normalizedLandmarks1D[i] = (normalizedLandmarks[meshCoordinateNumber].z) * Math.max(this.width, this.height)
                }
            }

            // 2 shoulders
            this.normalizedLandmarks1D[this.normalizedLandmarks1D.length - 6] = poseLandmarks[12].x * this.width
            this.normalizedLandmarks1D[this.normalizedLandmarks1D.length - 5] = -poseLandmarks[12].y * this.height + (this.height)
            this.normalizedLandmarks1D[this.normalizedLandmarks1D.length - 4] = poseLandmarks[12].z
            this.normalizedLandmarks1D[this.normalizedLandmarks1D.length - 3] = poseLandmarks[11].x * this.width
            this.normalizedLandmarks1D[this.normalizedLandmarks1D.length - 2] = -poseLandmarks[11].y * this.height + (this.height)
            this.normalizedLandmarks1D[this.normalizedLandmarks1D.length - 1] = poseLandmarks[11].z
        } else {
            console.warn("Face not found...")
        }

        this.resultsCallback(this.normalizedLandmarks1D);
    }

    close = () => {
        this.holistic.close()
    }
}