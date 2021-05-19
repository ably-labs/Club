import React, {useRef, useState} from 'react';
import {Dialog} from "@headlessui/react";
import {generateRandomUsername} from "../names";
import {FaRedo, FaTimes} from "react-icons/fa";

interface Props {
    handleSubmit: (string) => void
    handleClose: () => void
    show: boolean
}

export default function EditUsernameModal({handleSubmit, show, handleClose}: Props) {
    const usernameFieldRef = useRef(null)
    const [usernameField, setUsernameField] = useState("")
    const [randomName] = useState(generateRandomUsername())

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
            className={"fixed inset-0 border-2 overflow-y-auto z-10 bg-red-900 text-red-800"}>
            <button className={"absolute right-6 top-6 hover:opacity-50"} onClick={handleClose}>
                <FaTimes size={48}/>
            </button>
            <div className={`flex min-h-screen flex-col inline-block`}>
                {/*<Dialog.Overlay className={"fixed inset-0 bg-white opacity-70"}/>*/}
                <div className={"min-w-800 bg-red-100 rounded-xl p-3 mx-auto my-auto"}>
                    <label className={"my-3"} htmlFor={"usernameField"}>Enter a new username:</label>
                    <div className={"flex my-3"}>
                        <input ref={usernameFieldRef} className={"text-2xl text-white-800 border-full"}
                               value={usernameField}
                               onChange={onChangeUsernameField} name={"usernameField"} enterKeyHint={"enter"}
                               placeholder={randomName}
                               aria-label={"Enter a username..."} required={true}/>
                        <button className={"m-3 hover:opacity-50"} onClick={randomlyGenerateUsernameHandler}><FaRedo/></button>
                    </div>
                    <div className={"flex justify-items-end"}>
                        <button
                            className={"bg-green-500 hover:bg-green-700 text-white mx-2 font-bold py-2 px-4 rounded-full"}
                            onClick={() => handleSubmit(usernameField)}>Save
                        </button>
                    </div>
                </div>
            </div>
        </Dialog>
    );
}