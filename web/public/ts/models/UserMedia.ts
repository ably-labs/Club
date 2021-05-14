export default interface UserMedia {
    normalizedLandmarks1D: Uint16Array
    clientId: string,
    username: string,
    faceMeshColor: string,
    meshPointSize: number,
    usernameAnchorCoordinates: Uint16Array
}
