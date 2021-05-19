import {FaPause, FaPhone, FaPhoneSlash, FaPlay, FaSpinner} from "react-icons/fa";
import React from "react";
import {TailwindColor} from "../colors";

const CallControls = (props: {
    callIsConnected: boolean,
    hangUpHandler: () => Promise<void>,
    loading: boolean,
    joinCallHandler: () => Promise<void>,
    toggleTracking: () => Promise<void>,
    trackingEnabled: boolean,
    allColors: TailwindColor[],
    toggleOriginalVideoFeed: () => void,
    changeFaceMeshSize: (newSize: number) => void,
    changeFaceMeshColor: (tailwindColor: TailwindColor) => void
}): React.ReactElement => {
    return <div className={"flex flex-col"}>
        <div className={"mx-auto"}>
            <div className={"inline-flex flex p-4 my-4 bg-red-200 rounded-full"}>
                {(props.callIsConnected) ?
                    <button
                        className={"bg-red-500 hover:bg-red-700 text-white mx-2 font-bold py-4 px-4 rounded-full disabled:bg-gray-500 disabled:cursor-not-allowed"}
                        onClick={props.hangUpHandler} disabled={!props.callIsConnected}>
                        <FaPhoneSlash/>
                    </button> :
                    (props.loading) ? <button
                        className={" bg-green-500 hover:bg-green-700 text-white mx-2 font-bold py-2 px-4 rounded-full disabled:bg-gray-500 disabled:cursor-not-allowed"}
                        disabled={true}>
                        <FaSpinner className={"animate-spin h-8"}/>
                    </button> : <button
                        aria-disabled={!props.callIsConnected}
                        className={"bg-green-500 hover:bg-green-700 text-white mx-2 font-bold py-2 px-4 rounded-full disabled:bg-gray-500 disabled:cursor-not-allowed"}
                        onClick={props.joinCallHandler} disabled={props.callIsConnected}>
                        <FaPhone className={"h-8"}/>
                    </button>
                }
                {
                    (props.loading) ? <button
                        className={" bg-green-500 hover:bg-green-700 text-white mx-2 font-bold py-2 px-4 rounded-full disabled:bg-gray-500 disabled:cursor-not-allowed"}
                        disabled={true}>
                        <FaSpinner className={"animate-spin"}/>
                    </button> : <button
                        className={"bg-indigo-500 hover:bg-indigo-700 text-white mx-2 font-bold py-4 px-4 rounded-full disabled:bg-gray-500 disabled:cursor-not-allowed"}
                        onClick={props.toggleTracking}>{props.trackingEnabled ? <FaPause/> : <FaPlay/>}
                    </button>
                }
                {/*<VideoRoomOptions toggleOriginalVideoFeed={props.toggleOriginalVideoFeed}*/}
                {/*                  changeFaceMeshSize={props.changeFaceMeshSize}/>*/}
            </div>
        </div>
        <div className={"mx-auto"}>
            <div className={"inline-flex p-4 bg-red-200 rounded-full mb-4"}>
                {props.allColors.map((tailwindColor: TailwindColor) => (
                    <div onClick={async () => {
                        await props.changeFaceMeshColor(tailwindColor)
                    }} key={tailwindColor.hexCode}
                         className={"w-12 text-xs text-center py-2 px-2 mx-2 h-12 text-white rounded-full border-solid border-black hover:opacity-40"}
                         style={{background: tailwindColor.hexCode}}>
                    </div>
                ))}
            </div>
        </div>
    </div>;
}

export default CallControls