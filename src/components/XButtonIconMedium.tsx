import React from "react";
import {Button, ButtonProps} from "primereact/button";
import {IconType} from "primereact/utils";

// button trochu mensi (priblizne 30px x 30px) od klasickeho Button, pri pouziti v datatable nastavuje v TD malicky padding (cez css) -> nezvecsuje vysku riadku
export const XButtonIconMedium = (props: {icon: IconType<ButtonProps>; onClick: ((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void); disabled?: boolean; tooltip?: any;}) => {

    return (
        <Button icon={props.icon} onClick={props.onClick} disabled={props.disabled}
                className='x-button-icon-medium p-button-sm' tooltip={props.tooltip}/>
    );
}