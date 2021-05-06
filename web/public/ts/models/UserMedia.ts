
export default interface UserMedia {
    normalizedLandmarks1D: Float32Array
    clientId: string,
    faceMeshColor: string
}

export interface FaceMessage {
    face: Float32Array
    faceMeshColor: string
}