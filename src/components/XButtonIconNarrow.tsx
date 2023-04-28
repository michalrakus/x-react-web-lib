import React from "react";
import {Button, ButtonProps} from "primereact/button";
import {XUtils} from "./XUtils";
import {IconType} from "primereact/utils";

// button s ikonkou, zuzeny na 1.5rem (21px), na mobile nezuzeny, defaultne s marginom "m-1" (0.25rem) (ako XButton), margin sa da vypnut (pouzivane pre editovatelnu tabulku)
// zmyslom narrow buttonu je setrit miesto
export const XButtonIconNarrow = (props: {icon: IconType<ButtonProps>; onClick: ((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void); disabled?: boolean; tooltip?: any; addMargin?: boolean}) => {

    let className: string = '';
    if (!XUtils.isMobile()) {
        className += 'x-button-icon-narrow';
    }
    if (props.addMargin === undefined || props.addMargin === true) {
        if (className !== '') {
            className += ' ';
        }
        className += 'm-1';
    }
    return (
        <Button icon={props.icon} onClick={props.onClick} disabled={props.disabled}
                className={className !== '' ? className : undefined} tooltip={props.tooltip}/>
    );
}