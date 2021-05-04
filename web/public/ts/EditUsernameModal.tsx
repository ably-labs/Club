import React, {useState} from 'react';

interface Props {
    handleSubmit: (string) => void
    handleClose: () => void
    show: boolean
}

export default function EditUsernameModal({handleSubmit, show, handleClose}: Props) {
    const [usernameField, setUsernameField] = useState("")

    if (!show) {
        return <></>
    }

    const randomlyGenerateUsernameHandler = () => {

    }

    const onChangeUsernameField = (event) => {
        setUsernameField(event.target.value)
    }

    return (
        <div>
            <p>Modal</p>
            <label className="text-blue-400 text-2xl" htmlFor={"usernameField"}>What is your preferred
                name:</label>
            <input value={usernameField} onChange={onChangeUsernameField} name={"usernameField"} enterKeyHint={"enter"}
                   placeholder={"Bob"}
                   aria-label={"Enter a username..."} required={true}/>
            <button onClick={randomlyGenerateUsernameHandler}>Generate</button>
        </div>
    )
        ;
}