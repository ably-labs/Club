import {FaceMesh, InputMap, NormalizedLandmark} from "@mediapipe/face_mesh/face_mesh";

export default class FaceMeshCalculator {
    private readonly model: FaceMesh
    // private video: HTMLVideoElement;
    private readonly resultsCallback: (firstFace: NormalizedLandmark[]) => void;

    constructor(resultsCallback: (faceLandmarks: NormalizedLandmark[]) => void) {
        this.resultsCallback = resultsCallback
        console.log("Creating face mesh model...")
        // See load function for configuration object parameters
        this.model = new FaceMesh({locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
            }});
        // this.video = video
        this.model.setOptions({
            maxNumFaces: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        })
        this.model.onResults((results) => {
            const faces = results.multiFaceLandmarks
            if (!results || !faces || faces.length == 0) {
                console.warn("No faces found...")
                return
            }
            this.resultsCallback(faces[0])
        })
    }

    send = async (inputMap: InputMap): Promise<void> => {
        return this.model.send(inputMap)
    }

    initialize = async () => {}

    // getFacesFromImage = async (video: HTMLVideoElement): Promise<AnnotatedPrediction[]> => {
    //     const estimateFacesConfig: EstimateFacesConfig = {
    //         input: video,
    //
    //         // flipHorizontal: true // This generates hugely negative coordinates...
    //     };
    //
    //     return await this.model.estimateFaces(estimateFacesConfig)
    // }
}