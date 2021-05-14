import React from "react";
import {CallState, User} from "./Messaging";
import {ClientId} from "./models/ClientId";


interface Props {
    callState: CallState
}

const CallStateDisplay = ({callState}: Props): React.ReactElement => {

    function renderCurrentUserList(currentUsers: Map<ClientId, User>): React.ReactElement[] {
        const list = []
        currentUsers.forEach((user) => {
            list.push(<li className={""} style={{color: user.color}} key={user.clientId}>{user.username}</li>)
        })
        return list
    }

    if (callState.connection === "connected") {
        return <div className={"text-center"}>
            <span className={"text-2xl text-indigo-800"}>{callState.currentUsers.size}</span>
            <span className={"text-2xl text-indigo-600"}>{ callState.currentUsers.size === 1 ? " user" : " users"} in the room</span>
            <ul>
                {renderCurrentUserList(callState.currentUsers)}
            </ul>
        </div>
    } else if (callState.connection === "disconnected") {
        return <p>Not connected.</p>
    }
};

export default CallStateDisplay