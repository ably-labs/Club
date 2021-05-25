import {flatbuffers} from 'flatbuffers';
import {UserState} from '../flatbuffers/club2d/user-state';

// const FACE_MESH_ARRAY_LENGTH = 470 * 3 * 2;

/**
 * Representation of Face sent across the network
 *
 * Serialization formats supported
 * - 1D array (Uint8array) laid out using some custom code (data views, buffers)
 * - FlatBuffers: A efficient serialization format designed for games, and also used for machine learning on device.
 * - Previously: Protocol buffers were corrupting the buffers.
 *      Pending response: https://groups.google.com/forum/#!msg/protobuf/bYwkTAw7sUQ/LEw1K9cpEgAJ
 */
export default class FaceMessage {
    coordinates: Uint16Array;

    color: string;

    meshPointSize: number;

    usernameAnchorCoordinates: Uint16Array;

    private static encoder = new TextEncoder()

    private static decoder = new TextDecoder()

    constructor(coordinates: Uint16Array,
                color: string,
                meshPointSize: number,
                usernameAnchorCoordinates: Uint16Array) {
        this.coordinates = coordinates;
        if (color.length > 7) {
            throw new Error(`faceMeshColor needs to be 7 ASCII charaters or less, it is ${color.length}`);
        }
        this.color = color;
        this.meshPointSize = meshPointSize;
        if (usernameAnchorCoordinates.length < 2) {
            throw new Error(`usernameAnchorCoordinates needs to contain at least 2 uint16 values,
             but its only ${usernameAnchorCoordinates.length} long.`)
        }
        this.usernameAnchorCoordinates = usernameAnchorCoordinates
    }

    /**
     * Using Flatbuffers to efficiently and conveniently serialize data between clients, defined in UserState.fbs
     */
    static decodeFromFlatBuffer(array: ArrayBuffer): FaceMessage {
        const buffer = new flatbuffers.ByteBuffer(new Uint8Array(array, null, 2880));
        const userState = UserState.getRootAsUserState(buffer);
        console.log({faceMeshArray: userState.faceMeshArray()})
        return new FaceMessage(userState.faceMeshArray(),
            userState.faceMeshColor(),
            userState.faceMeshSize(),
            userState.usernameAnchorCoordinatesArray()
        );
    }

    // TODO write test for serialization
    encodeIntoFlatBuffer(): Uint8Array {
        const builder = new flatbuffers.Builder();
        const faceMesh = UserState.createFaceMeshVector(builder, this.coordinates);
        const faceMeshColor = builder.createString(this.color);
        const usernameAnchorCoordinates = UserState.createUsernameAnchorCoordinatesVector(
            builder,
            this.usernameAnchorCoordinates
        );
        const userState = UserState.createUserState(
            builder,
            faceMesh,
            faceMeshColor,
            this.meshPointSize,
            usernameAnchorCoordinates)
        builder.finish(userState)

        // Note: A new uint8array is created to prevent Ably from using the underlying buffer
        // instead of just the specific view (Uint8Array). Without this, Ably will send the whole
        // underlying buffer to other users, taking up more space on the wire, but also
        // corrupt the data, because FlatBuffers won't know how to deserialize it.
        return new Uint8Array(builder.asUint8Array())
        // Do NOT do this:
        // return builder.asUint8Array();
    }

    // The code below shows how to serialize/ deserialize data manually into/from an ArrayBuffer
    // to send data for each frame between users.
    // encode(): Uint8Array {
    //     const colorInt8 = FaceMessage.encoder.encode(this.color);
    //     if (colorInt8.length > 7) {
    //         throw new Error(`faceMeshColor needs to be 7 ASCII charaters or less, it is ${colorInt8} bytes long.`);
    //     }
    //
    //     // Converting the real data types into Uint8 so they can be saved in a 1D array
    //     const array = new Uint8Array(FACE_MESH_ARRAY_LENGTH + 7 + 4 + 4);
    //     // Maths: The floating points + hex code number + mesh size + usernameAnchorCoordinates
    //     const faceInt8 = new Uint8Array(new DataView(this.coordinates.buffer).buffer);
    //     const meshSizeDataView = new DataView(new ArrayBuffer(4));
    //     meshSizeDataView.setFloat32(0, this.meshPointSize);
    //     const meshSizeInt8 = new Uint8Array(meshSizeDataView.buffer);
    //
    //     const usernameAnchorDataView = new DataView(this.usernameAnchorCoordinates.subarray(0, 4).buffer)
    //     const usernameAnchorCoordinatesInt8 = new Uint8Array(usernameAnchorDataView.buffer)
    //
    //     if (faceInt8.length !== FACE_MESH_ARRAY_LENGTH) {
    //         throw new Error(`Face array is not ${FACE_MESH_ARRAY_LENGTH} bytes long,
    //          it is ${faceInt8.length} instead.`);
    //     }
    //
    //     array.set(faceInt8);
    //     array.set(colorInt8, faceInt8.length);
    //     array.set(meshSizeInt8, faceInt8.length + colorInt8.length);
    //     array.set(usernameAnchorCoordinatesInt8, faceInt8.length + colorInt8.length + meshSizeInt8.length)
    //     return array;
    // }
    //
    // static decode(array: ArrayBuffer): FaceMessage {
    //     const uint8Array = new Uint8Array(array);
    //     const faceMeshUInt = uint8Array.slice(0, FACE_MESH_ARRAY_LENGTH);
    //     const coordinates = new Uint16Array(new DataView(faceMeshUInt.buffer).buffer);
    //     // FIXME: we might send a 4 char (e.g. #FFF) hex code, this only has support for 7 length hexcolors.
    //     //  Then remove the .length === 7 in videoRoomOptions.tsx
    //     const color = FaceMessage.decoder.decode(uint8Array.subarray(FACE_MESH_ARRAY_LENGTH, FACE_MESH_ARRAY_LENGTH + 7));
    //     // need to slice instead of subarray, to copy the buffer.
    //     const meshSizeDataView = new DataView(uint8Array.slice(FACE_MESH_ARRAY_LENGTH + 7, FACE_MESH_ARRAY_LENGTH + 7 + 4).buffer);
    //     const meshSize = meshSizeDataView.getFloat32(0);
    //
    //     const usernameAnchorCoordinatesUint = uint8Array.slice(FACE_MESH_ARRAY_LENGTH + 7 + 4);
    //     const usernameAnchorCoordinates = new Uint16Array(new DataView(usernameAnchorCoordinatesUint.buffer).buffer);
    //     return new FaceMessage(coordinates, color, meshSize, usernameAnchorCoordinates);
    // }
}
