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
            list.push(<li key={user.clientId}>{user.username}</li>)
        })
        return list
    }

    if (callState.connection === "connected") {
        return <div>
            <h2>{callState.currentUsers.size}
                { callState.currentUsers.size === 1 ? " user" : " users"} in the room</h2>
            <ul>
                {renderCurrentUserList(callState.currentUsers)}
            </ul>
        </div>
    } else if (callState.connection === "disconnected") {
        return <p>Not connected.</p>
    }
};

export default CallStateDisplay