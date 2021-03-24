import React from "react";
import {Button} from "primereact/button";

export const XButtonIconSmall = (props: {icon: string; onClick: ((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void); disabled?: boolean; tooltip?: any;}) => {

    return (
        <Button icon={props.icon} onClick={props.onClick} disabled={props.disabled} className="p-m-1px x-button-icon-small p-button-sm" tooltip={props.tooltip}/>
    );
}