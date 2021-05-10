import {flatbuffers} from "flatbuffers";
import {UserState} from "../flatbuffers/club2d/user-state";

const FACE_MESH_ARRAY_LENGTH = 470 * 3 * 2

/**
 * Representation of Face sent across the network
 *
 * Serialization formats supported
 * - 1D array (Uint8array) laid out using some custom code (data views, buffers)
 * - FlatBuffers: A efficient serialization format designed for games, and also used for machine learning on device.
 * - Previously: Protocol buffers were corrupting the buffers.
 *      Pending response: https://groups.google.com/forum/#!msg/protobuf/bYwkTAw7sUQ/LEw1K9cpEgAJ
 */
export class FaceMessage {
    coordinates: Uint16Array
    color: string
    meshPointSize: number
    private static encoder = new TextEncoder()
    private static decoder = new TextDecoder()

    constructor(coordinates: Uint16Array, color: string, meshPointSize: number) {
        this.coordinates = coordinates
        if (color.length > 7) {
            throw new Error(`faceMeshColor needs to be 7 ASCII charaters or less, it is ${color.length}`)
        }
        this.color = color
        this.meshPointSize = meshPointSize
    }

    encode(): Uint8Array {
        const colorInt8 = FaceMessage.encoder.encode(this.color)
        if (colorInt8.length > 7) {
            throw new Error(`faceMeshColor needs to be 7 ASCII charaters or less, it is ${colorInt8} bytes long.`)
        }

        // Converting the real data types into Uint8 so they can be saved in a 1D array
        const array = new Uint8Array(FACE_MESH_ARRAY_LENGTH + 7 + 4)
        const faceInt8 = new Uint8Array(new DataView(this.coordinates.buffer).buffer)
        const meshSizeDataView = new DataView(new ArrayBuffer(4));
        meshSizeDataView.setFloat32(0, this.meshPointSize)
        const meshSizeInt8 = new Uint8Array(meshSizeDataView.buffer)

        if (faceInt8.length !== FACE_MESH_ARRAY_LENGTH) {
            throw new Error(`Face array is not ${FACE_MESH_ARRAY_LENGTH} bytes long, it is ${faceInt8.length} instead.`)
        }

        array.set(faceInt8)
        array.set(colorInt8, faceInt8.length)
        array.set(meshSizeInt8, faceInt8.length + colorInt8.length)
        return array
    }

    static decode(array: ArrayBuffer): FaceMessage {
        const uint8Array = new Uint8Array(array)
        const faceMeshUInt = uint8Array.slice(0, FACE_MESH_ARRAY_LENGTH)
        const coordinates = new Uint16Array(new DataView(faceMeshUInt.buffer).buffer)
        // FIXME: we might send a 4 char (e.g. #FFF) hex code, this only has support for 7 length hexcolors.
        const color = FaceMessage.decoder.decode(uint8Array.subarray(FACE_MESH_ARRAY_LENGTH, FACE_MESH_ARRAY_LENGTH + 7))
        // need to slice instead of subarray, to copy the buffer.
        const meshSizeDataView = new DataView(uint8Array.slice(FACE_MESH_ARRAY_LENGTH + 7).buffer)
        const meshSize = meshSizeDataView.getFloat32(0)
        return new FaceMessage(coordinates, color, meshSize)
    }

    /**
     * Using Flatbuffers, defined in UserState.fbs
     */
    static fromFlatBuffer(array: Uint8Array): FaceMessage {
        const buffer = new flatbuffers.ByteBuffer(array)
        const userState = UserState.getRootAsUserState(buffer)
        // need to create a new int8Array first to avoid using the original buffer which will not be directly useful as a DataView. This issue also happened with google-protobuf
        const coordinates = new Uint16Array(new DataView(new Int8Array(userState.faceMeshArray()).buffer).buffer)
        return new FaceMessage(coordinates, this.decoder.decode(userState.faceMeshColorArray()), userState.faceMeshSize())
    }

    encodeIntoFlatBuffer(): Uint8Array {
        const builder = new flatbuffers.Builder(6000) // TODO refine size
        const faceColor = UserState.createFaceMeshColorVector(builder, FaceMessage.encoder.encode(this.color))
        const faceMesh = UserState.createFaceMeshVector(builder, new Int8Array(new DataView(this.coordinates.buffer).buffer))
        UserState.startUserState(builder)
        UserState.addFaceMesh(builder, faceMesh)
        UserState.addFaceMeshColor(builder, faceColor)
        UserState.addFaceMeshSize(builder, this.meshPointSize)
        const userState = UserState.endUserState(builder)
        builder.finish(userState)
        return builder.asUint8Array()
    }
}