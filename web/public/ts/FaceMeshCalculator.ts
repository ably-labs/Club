import {FaceMesh, InputMap, NormalizedLandmark} from "@mediapipe/face_mesh";

export default class FaceMeshCalculator {
    model: FaceMesh
    // private video: HTMLVideoElement;
    private resultsCallback: (firstFace: NormalizedLandmark[]) => void;

    constructor(resultsCallback: (faceLandmarks: NormalizedLandmark[]) => void) {
        this.resultsCallback = resultsCallback
        console.log("Creating face mesh model...")
    }

    send = async (inputMap: InputMap): Promise<void> => {
        return this.model.send(inputMap)
    }

    initialize = async () => {
        // See load function for configuration object parameters
        this.model = new FaceMesh();
        // this.video = video
        this.model.setOptions({
            maxNumFaces: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        })
        this.model.onResults((results) => {
            const faces = results.multiFaceLandmarks
            if (faces.length == 0) {
                console.warn("No faces found...")
                return
            }
            this.resultsCallback(faces[0])
        })
        // const camera = new Camera(this.video, {
        //     onFrame: async () => {
        //         await this.model.send({image: this.video});
        //     },
        //     width: 1280,
        //     height: 720
        // })
        // await camera.start()
    }

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