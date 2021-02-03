import React from "react";
import {Button} from "primereact/button";

export const XButton = (props: {label?: string; onClick: ((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void); disabled?: boolean}) => {

    // zatial iba pridany class x-button, aby sme vedeli nastavit margin "p-m-1" (1rem)
    return (
        <Button label={props.label} onClick={props.onClick} disabled={props.disabled} className="p-m-1"/>
    );
}