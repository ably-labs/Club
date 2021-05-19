import React from "react";
import {User} from "./Messaging";

interface Props {
    currentUsers: User[] | null
}

const CallStateDisplay = ({currentUsers}: Props): React.ReactElement => {

    const renderCurrentUserList = (): React.ReactElement[] => {
        const list = []
        currentUsers.forEach((user) => {
            list.push(<li className={""} style={{color: user.color.hexCode}} key={user.clientId}>{user.username}</li>)
        })
        return list
    }

    if (!currentUsers) {
        return <></>
    }

    return <div className={"text-center"}>
        <span className={"text-2xl text-indigo-800"}>{currentUsers.length}</span>
        <span className={"text-2xl text-indigo-600"}>{ currentUsers.length === 1 ? " user" : " users"} in the room</span>
        <ul>
            {renderCurrentUserList()}
        </ul>
    </div>
};

export default CallStateDisplay