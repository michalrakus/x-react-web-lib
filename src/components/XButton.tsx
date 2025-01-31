import React from "react";
import {Button, ButtonProps} from "primereact/button";
import {IconType} from "primereact/utils";

export const XButton = (props: {
    label?: string;
    icon?: IconType<ButtonProps>;
    onClick: ((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void);
    disabled?: boolean;
    style?: React.CSSProperties;
}) => {

    // zatial iba pridany class x-button, aby sme vedeli nastavit margin "m-1" (0.25rem)
    return (
        <Button label={props.label} icon={props.icon} onClick={props.onClick} disabled={props.disabled} className="m-1" style={props.style}/>
    );
}