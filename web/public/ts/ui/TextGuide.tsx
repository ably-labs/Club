import React from "react";

const TextGuide = (): React.ReactElement => {
    return <>
        <div className={"mt-6"}>
            <span className={"text-2xl"}>Controls</span>
            <ul>
                <li><span className={"font-bold"}>Movement: </span>You can use AWSD or arrow keys to move
                    around. Hold shift while moving to move faster.
                </li>
                <li><span className={"font-bold"}>Face shape: </span>You can change your face mesh color and
                    the size of the points.
                </li>
            </ul>
        </div>
        <div className={"mt-6"}>
            <p className={"text-2xl"}>Mobile Support</p>
            <span>{"Not currently supported because the Mediapipe library which provides the face mesh doesn't run outside of Desktop Chrome/ Brave."}</span>
        </div>
        <div className={"mt-6"}>
            <p className={"text-2xl"}>Memory leak alert</p>
            <span>There is a memory leak in this app, so it gradually takes up 2GB of memory over the course of 10 minutes, and then freezes the app. This is due to MediaPipe not cleaning up its arrays in WASM, see this <a
                className={"hover:underline text-blue-600"}
                href={"https://github.com/google/mediapipe/issues/1937"}>GitHub issue</a> for more.</span>
        </div>
    </>;
}

export default TextGuide