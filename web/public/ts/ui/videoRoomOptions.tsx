import React, {useRef, useState} from 'react';
import {Dialog, Menu} from "@headlessui/react";
import {FaEllipsisV} from "react-icons/fa";

interface Props {
    toggleOriginalVideoFeed: (boolean) => void
    changeFaceMeshColor: (string) => void
    changeFaceMeshSize: (number) => void
}

const VideoRoomOptions = ({toggleOriginalVideoFeed, changeFaceMeshColor, changeFaceMeshSize}: Props)
    : React.ReactElement => {
    const [colorPickerIsOpen, setColorPickerIsOpen] = useState(false)
    const [faceMeshSizePickerIsOpen, setFaceMeshSizePickerIsOpen] = useState(false)
    const colorFieldRef = useRef(null)
    const meshPointSizeRef = useRef(null)
    const [colorField, setColorField] = useState("")
    const [meshPointSizeField, setMeshPointSizeField] = useState("")

    const validRegexPattern = /^#([0-9A-F]{3}){1,2}$/i;

    function changeColor() {
        if (validRegexPattern.test(colorField) && colorField.length === 7) {
            changeFaceMeshColor(colorField)
            setColorPickerIsOpen(false)
        } else {
            // TODO show warning.
        }
    }

    function handleNewMeshSize() {
        const meshSize = parseFloat(meshPointSizeField)
        if (meshSize && meshSize <= 5 && meshSize >= 0) {
            setMeshPointSizeField("")
            changeFaceMeshSize(meshSize)
        }
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
                <Menu.Item>
                    {(active) => (
                        <button onClick={() => setFaceMeshSizePickerIsOpen(true)}
                                className={`${active && "hover:bg-gray-100"}`}>
                            Change face mesh point size...
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
                       aria-label={"Enter a hexcode color..."} required={true}/>

                <button onClick={changeColor}>Change</button>
                <button onClick={() => setColorPickerIsOpen(false)}>Cancel</button>
            </Dialog>
            <Dialog open={faceMeshSizePickerIsOpen} onClose={() => setFaceMeshSizePickerIsOpen(false)}>
                <Dialog.Overlay/>

                <Dialog.Title>Change face mesh size:</Dialog.Title>
                <Dialog.Description>
                    This will change the size of the dots representing your face.
                </Dialog.Description>
                <label className="text-2xl" htmlFor={"usernameField"}>New size (Between 0 and 5):</label>
                <input ref={meshPointSizeRef} className={"text-2xl text-white-800"} value={meshPointSizeField}
                       onChange={(event) => {
                           setMeshPointSizeField(event.target.value)
                       }} name={"colorField"} enterKeyHint={"enter"}
                       placeholder={"0.25"}
                       aria-label={"Enter a mesh size between 0 and 5..."} required={true}/>

                <button onClick={handleNewMeshSize}>Change</button>
                <button onClick={() => setColorPickerIsOpen(false)}>Cancel</button>
            </Dialog>
        </Menu>
    );
};

export default VideoRoomOptions;