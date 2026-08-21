import React from "react";
import {XMultilineRenderType} from "./XLazyDataTable";
import {SelectButton, SelectButtonChangeEvent} from "primereact/selectbutton";
import {XUtils} from "../XUtils";

interface Option {
    icon: string;
    value: XMultilineRenderType;
}

export const XMultilineSwitch = (props: {
    value: XMultilineRenderType;
    onChange: (value: XMultilineRenderType) => void;
    className?: string;
}) => {

    const options: Option[] = [
        {icon: 'pi pi-minus', value: 'singleLine'},
        {icon: 'pi pi-bars', value: 'fewLines'},
        {icon: 'pi pi-align-justify', value: 'allLines'}
    ];

    const itemTemplate = (option: Option) => {
        return <i className={option.icon}></i>;
    }

    // for mobile version we use p-button-icon-only -> the buttons are smaller
    return (
        <SelectButton value={props.value} onChange={(e: SelectButtonChangeEvent) => props.onChange(e.value)}
                      options={options} optionValue="value" itemTemplate={itemTemplate} allowEmpty={false} className={props.className}
                      pt={XUtils.isMobile() ? {button: {className: 'p-button-icon-only'}} : undefined}/>
    );
}
