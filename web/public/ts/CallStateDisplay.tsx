import React from "react";
import {User} from "./Messaging";

interface Props {
    currentUsers: User[]
}

const CallStateDisplay = ({currentUsers}: Props): React.ReactElement => {

    const renderCurrentUserList = (): React.ReactElement[] => {
        const list = []
        currentUsers.forEach((user) => {
            list.push(<li className={""} style={{color: user.color.hexCode}} key={user.clientId}>{user.username}</li>)
        })
        return list
    }

    return <div className={"text-center pb-4"}>
        <span className={"text-2xl text-red-800"}>{currentUsers.length}</span>
        <span className={"text-2xl text-red-600"}>{ currentUsers.length === 1 ? " user" : " users"} in the room</span>
        <ul>
            {renderCurrentUserList()}
        </ul>
    </div>
};

export default CallStateDisplay