import React from 'react';
import {Menu} from "@headlessui/react";

const VideoRoomOptions = () => {
    return (
        <Menu>
            <Menu.Button>Options</Menu.Button>
            <Menu.Items>
                <Menu.Item>
                    {({active}) => (
                        <button className={`${active && "bg-blue-500"}`}>
                            Debug: show video feed (only you)
                        </button>
                    )}
                </Menu.Item>
                <Menu.Item>
                    {({active}) => (
                        <button className={`${active && "bg-blue-500"}`}>
                            Debug: Enable FPS Counter (refresh required)
                        </button>
                    )}
                </Menu.Item>
            </Menu.Items>
        </Menu>
    );
};

export default VideoRoomOptions;