import * as FaceLandmarksDetection from '@tensorflow-models/face-landmarks-detection'
import '@tensorflow/tfjs-backend-webgl';
import {
    AnnotatedPrediction,
    EstimateFacesConfig,
    MediaPipeFaceMesh
} from "@tensorflow-models/face-landmarks-detection/dist/mediapipe-facemesh";
import {Coords3D} from "@tensorflow-models/face-landmarks-detection/dist/mediapipe-facemesh/util";

export default class TfjsFaceMeshCalculator {
    model: MediaPipeFaceMesh
    private readonly aspectRatio: number;
    private readonly viewSize: number;

    constructor(aspectRatio: number, viewSize: number) {
        this.aspectRatio = aspectRatio;
        this.viewSize = viewSize;
        console.log("Creating FaceMeshCalculator using TFJS")
    }

    initialize = async () => {
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

    getKeypointsFromImage = async (video: HTMLVideoElement): Promise<Float32Array> => {
        const estimateFacesConfig: EstimateFacesConfig = {
            input: video
        }
        const predictions: AnnotatedPrediction[] = await this.model.estimateFaces(estimateFacesConfig)
        if (predictions.length == 0) {
            console.warn("No faces found...")
            return null
        }
        const normalizedLandmarks = predictions[0].scaledMesh as Coords3D
        const normalizedLandmarks1D = new Float32Array(normalizedLandmarks.length * 3);
        for (let i = 0; i < normalizedLandmarks.length * 3; i++) {
            const meshCoordinateNumber = Math.floor(i / 3)
            const xYZIndex = i % 3
            if (xYZIndex === 0) {
                normalizedLandmarks1D[i] = (normalizedLandmarks[meshCoordinateNumber][xYZIndex])
            } else if (xYZIndex === 1) {
                normalizedLandmarks1D[i] = -(normalizedLandmarks[meshCoordinateNumber][xYZIndex]) + this.viewSize / 2
            } else {
                normalizedLandmarks1D[i] = (normalizedLandmarks[meshCoordinateNumber][xYZIndex])
            }
            // normalizedLandmarks1D[i] = (normalizedLandmarks[meshCoordinateNumber][xYZIndex] - (this.viewSize / 2)) / this.viewSize
        }
        return normalizedLandmarks1D
    }

    close = () => {
        console.warn("TFJS's face mesh model doesn't have a close, it might introduce a memory leak.")
        // TFJS has no close function.
    }
}