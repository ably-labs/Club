import {FaceMesh, InputMap, NormalizedLandmark} from "@mediapipe/face_mesh/face_mesh";

export default class FaceMeshCalculator {
    private readonly model: FaceMesh
    private readonly resultsCallback: (faceMesh: Float32Array) => Promise<void>;
    private aspectRatio: number;
    private viewSize: number;

    constructor(resultsCallback: (faceMesh: Float32Array) => Promise<void>, aspectRatio: number, viewSize: number) {
        this.resultsCallback = resultsCallback
        this.aspectRatio = aspectRatio
        this.viewSize = viewSize
        console.log("Creating face mesh model...")
        this.model = new FaceMesh({locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
            }});
        this.model.setOptions({
            maxNumFaces: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        })
        this.model.onResults((results) => {
            const faces = results.multiFaceLandmarks
            if (!results || !faces || faces.length == 0) {
                console.warn("No faces found...")
                return this.resultsCallback(null).then(r => console.log("New face produced..."))
            }
            const normalizedLandmarks = faces[0]
            // Convert allCoordinates into 1-d array.
            const coordinates1D = new Float32Array(normalizedLandmarks.length * 3);
            for (let i = 0; i < normalizedLandmarks.length * 3; i++) {
                const meshCoordinateNumber = Math.floor(i / 3)
                const xYZIndex = i % 3
                if (xYZIndex === 0) {
                    coordinates1D[i] = -(normalizedLandmarks[meshCoordinateNumber].x - 0.5) * this.aspectRatio * this.viewSize
                } else if (xYZIndex === 1) {
                    coordinates1D[i] = (normalizedLandmarks[meshCoordinateNumber].y - 0.5) * this.viewSize
                } else {
                    coordinates1D[i] = (normalizedLandmarks[meshCoordinateNumber].z - 0.5) * Math.max(this.aspectRatio * this.viewSize, this.viewSize)
                }
            }
            this.resultsCallback(coordinates1D).then(r => console.log("New face produced..."))

        })
    }

    send = async (inputMap: InputMap): Promise<void> => {
        return this.model.send(inputMap)
    }

    close = () => {
        this.model.close()
    }
}