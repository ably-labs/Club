import * as FaceLandmarksDetection from '@tensorflow-models/face-landmarks-detection'
import '@tensorflow/tfjs-backend-webgl';
import {
    AnnotatedPrediction,
    EstimateFacesConfig,
    MediaPipeFaceMesh
} from "@tensorflow-models/face-landmarks-detection/dist/mediapipe-facemesh";

export default class FaceMesh {
    model: MediaPipeFaceMesh

    constructor() {
        console.log("Creating face mesh model...")
    }

    async initialize() {
        // See load function for configuration object parameters
        const modelConfig = {
            maxFaces: 1,
            shouldLoadIrisModel: true,
        }
        this.model = await FaceLandmarksDetection.load(
            FaceLandmarksDetection.SupportedPackages.mediapipeFacemesh,
            modelConfig
        );
    }

    async getKeypointsFromImage(video: HTMLVideoElement): Promise<AnnotatedPrediction[]> {
        const estimateFacesConfig: EstimateFacesConfig = {
            input: video
        }
        const predictions = await this.model.estimateFaces(estimateFacesConfig)
        return predictions
    }
}