import React, {useRef, useState} from 'react';
import {Menu} from "@headlessui/react";
import {FaEllipsisV} from "react-icons/fa";
import {Dialog} from "@headlessui/react";

interface Props {
    toggleOriginalVideoFeed: (boolean) => void
    changeFaceMeshColor: (string) => void
}

const VideoRoomOptions = ({toggleOriginalVideoFeed, changeFaceMeshColor}: Props) => {
    const [colorPickerIsOpen, setColorPickerIsOpen] = useState(false)
    const colorFieldRef = useRef(null)
    const [colorField, setColorField] = useState("")

    const validRegexPattern = /^#([0-9A-F]{3}){1,2}$/i;
    function changeColor() {
        if (validRegexPattern.test(colorField)) {
            changeFaceMeshColor(colorField)
            setColorPickerIsOpen(false)
        } else {
            // TODO show warning.
        }
    }

    function isHexColor (hex) {
        return typeof hex === 'string'
            && hex.length <= 6
            && !isNaN(Number('0x' + hex))
    }

    return (
        <Menu>
            <Menu.Button><FaEllipsisV className={"ml-2 mr-2 rounded-full text-indigo-900"}/></Menu.Button>
            <Menu.Items className={"flex flex-col"}>
                <Menu.Item>
                    {({active}) => (
                        <button onClick={toggleOriginalVideoFeed}
                                className={`${active && "hover:bg-gray-100"}`}>
                            Debug: show video feed (only you)
                        </button>
                    )}
                </Menu.Item>
                <Menu.Item>
                    {(active) => (
                        <button onClick={() => setColorPickerIsOpen(true)}
                                className={`${active && "hover:bg-gray-100"}`}>
                            Change skin tone...
                        </button>
                    )}
                </Menu.Item>
                {/*<Menu.Item>*/}
                {/*    {({active}) => (*/}
                {/*        <button className={`${active && "hover:bg-gray-100"}`}>*/}
                {/*            Debug: Enable FPS Counter (refresh required)*/}
                {/*        </button>*/}
                {/*    )}*/}
                {/*</Menu.Item>*/}
            </Menu.Items>
            <Dialog open={colorPickerIsOpen} onClose={() => setColorPickerIsOpen(false)}>
                <Dialog.Overlay/>

                <Dialog.Title>Change skin tone:</Dialog.Title>
                <Dialog.Description>
                    This will change the skin tone for your avatar that you and others will see.
                </Dialog.Description>
                <label className="text-2xl" htmlFor={"usernameField"}>New color (Hexcode):</label>
                <input ref={colorFieldRef} className={"text-2xl text-white-800"} value={colorField}
                       onChange={(event) => {
                           setColorField(event.target.value)
                       }} name={"colorField"} enterKeyHint={"enter"}
                       placeholder={"#6f00ff"}
                       aria-label={"Enter a username..."} required={true}/>

                <button onClick={changeColor}>Change</button>
                <button onClick={() => setColorPickerIsOpen(false)}>Cancel</button>
            </Dialog>
        </Menu>
    );
};

export default VideoRoomOptions;