import React from "react";

const TextGuide = (): React.ReactElement => {
    return <div className={"max-w-xl text-red-800 mx-auto bg-red-200 px-4 py-2 rounded-xl"}>
        <div className={""}>
            <span className={"text-2xl font-bold"}>Controls</span>
            <ul>
                <li><span className={"font-bold"}>Movement: </span>You can use AWSD or arrow keys to move
                    around. Hold shift while moving to move faster.
                </li>
            </ul>
        </div>
        <div className={"mt-6"}>
            <p className={"text-2xl font-bold"}>Mobile Support</p>
            <span>{"Not currently supported because the Mediapipe library which provides the face mesh doesn't run outside of Desktop Chrome/ Brave."}</span>
        </div>
    </div>;
}

export default TextGuide