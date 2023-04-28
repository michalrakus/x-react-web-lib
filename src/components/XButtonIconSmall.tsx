import React from "react";
import {Button, ButtonProps} from "primereact/button";
import {XUtils} from "./XUtils";
import {IconType} from "primereact/utils";

export const XButtonIconSmall = (props: {icon: IconType<ButtonProps>; onClick: ((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void); disabled?: boolean; tooltip?: any;}) => {

    return (
        <Button icon={props.icon} onClick={props.onClick} disabled={props.disabled}
                className={XUtils.isMobile() ? undefined : 'x-button-icon-small p-button-sm'} tooltip={props.tooltip}/>
    );
}