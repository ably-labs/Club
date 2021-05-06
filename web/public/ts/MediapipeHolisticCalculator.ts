import {Holistic, Results} from "@mediapipe/holistic";

export default class MediapipeHolisticCalculator {
    /**
     * Uses MediaPipe FaceMesh library to calculate the face mesh from input image (through a video html element)
     *
     * @param resultCallback - Takes 1 argument: The face mesh, Float32Array containing the 1D representation of the face
     *  mesh coordinates. Used to trigger further action after Three.js-friendly 1D representation, such as add to scene,
     *  and render.
     * @param outputWidth - The outputHeight of the camera section. Used rescale the face mesh to fit the render canvas.
     * @param outputHeight - The outputWidth of the camera section. Similar to outputWidth.
     *
     * @private
     */
    private readonly holistic: Holistic
    private readonly resultsCallback: (results: Results) => void;
    private readonly outputWidth: number;
    private readonly outputHeight: number;

    constructor(resultsCallback: (results: Results) => void,
                outputWidth: number,
                outputHeight: number) {
        this.resultsCallback = resultsCallback
        this.outputWidth = outputWidth
        this.outputHeight = outputHeight

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
        this.holistic.onResults(this.resultsCallback)
    }

    /**
     * Send input into the mediapipe solution (holistic). Results will be processed by imageResultHandler
     * @param videoElement
     */
    send = async (videoElement: HTMLVideoElement): Promise<void> => {
        return await this.holistic.send({image: videoElement})
    }

    close = () => {
        this.holistic.close()
    }
}