import React, {useRef, useState} from 'react';
import {Dialog} from "@headlessui/react";
import {generateRandomUsername} from "./names";
import {FaTimes} from "react-icons/fa";
import {pickRandomTailwindColor} from "./colors";

interface Props {
    handleSubmit: (string) => void
    handleClose: () => void
    show: boolean
}

export default function EditUsernameModal({handleSubmit, show, handleClose}: Props) {
    const usernameFieldRef = useRef(null)
    const [usernameField, setUsernameField] = useState("")
    const [randomColor] = useState(pickRandomTailwindColor())

    if (!show) {
        return <></>
    }

    const randomlyGenerateUsernameHandler = () => {
        setUsernameField(generateRandomUsername())
    }

    const onChangeUsernameField = (event) => {
        setUsernameField(event.target.value)
    }

    return (
        <Dialog
            initialFocus={usernameFieldRef} open={show} onClose={handleClose}
            className={"fixed inset-0 border-2 overflow-y-auto z-10"}>
            <div
                className={`flex items-center justify-center min-h-screen flex-col bg-${randomColor.name}-500`}>
                {/*<Dialog.Overlay className={"fixed inset-0 bg-white opacity-70"}/>*/}
                <button className={"inset-0"} onClick={handleClose}><FaTimes size={48}/></button>
                <Dialog.Title className={"text-2xl"}>Edit username</Dialog.Title>
                <Dialog.Description>Others will see a new name</Dialog.Description>
                <label className="text-2xl" htmlFor={"usernameField"}>New username:</label>
                <div className={"flex"}>
                    <input ref={usernameFieldRef} className={"text-2xl text-white-800"} value={usernameField}
                           onChange={onChangeUsernameField} name={"usernameField"} enterKeyHint={"enter"}
                           placeholder={"Bald Eagle"}
                           aria-label={"Enter a username..."} required={true}/>
                    <button onClick={randomlyGenerateUsernameHandler}>Generate</button>
                </div>
                <button className={"bg-green-500 hover:bg-green-700 text-white mx-2 font-bold py-2 px-4 rounded"}
                        onClick={() => handleSubmit(usernameField)}>Save
                </button>
            </div>
        </Dialog>
    );
}