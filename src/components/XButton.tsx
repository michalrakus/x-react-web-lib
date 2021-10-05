import React from "react";
import {Button} from "primereact/button";

export const XButton = (props: {label?: string; icon?: string; onClick: ((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void); disabled?: boolean}) => {

    // zatial iba pridany class x-button, aby sme vedeli nastavit margin "m-1" (1rem)
    return (
        <Button label={props.label} icon={props.icon} onClick={props.onClick} disabled={props.disabled} className="m-1"/>
    );
}