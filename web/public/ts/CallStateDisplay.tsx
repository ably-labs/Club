import React from "react";
import {CallState} from "./Messaging";


interface Props {
    callState: CallState
}

const CallStateDisplay = ({callState}: Props) => {
    if (callState.connection === "connected") {
        return <div>
            <h2>{callState.currentUsers.length}
                { callState.currentUsers.length === 1 ? " user" : " users"} in the room:</h2>
            <ul>
                {(callState.currentUsers.length == 0) ? "No users" : <></>}
                {callState.currentUsers.map(user => <li key={user}>{user}</li>)}
            </ul>
        </div>
    } else if (callState.connection === "disconnected") {
        return <p>Not connected.</p>
    }
};

export default CallStateDisplay