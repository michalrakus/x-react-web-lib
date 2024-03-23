import React, {useState} from "react";
import {XMultilineRenderType} from "./XLazyDataTable";
import {Button} from "primereact/button";

export const XMultilineRenderer = (props: {
    valueList: React.ReactNode[];
    renderType: XMultilineRenderType;
    fewLinesCount: number;
    multilineContent?: boolean;
}): JSX.Element => {

    // used only for props.renderType === "fewLines"
    const [showAllLines, setShowAllLines] = useState<boolean>(false);

    let valueResult: JSX.Element; // musime vracat element, ak chceme XMultilineRenderer volat priamo cez jsx
    if (props.renderType === "singleLine") {
        // TODO - joinovat elementy
        valueResult = <div>{props.valueList.join(", ")}</div>; // pouziva sa hlavne pre oneToMany asociacie
    }
    else {
        let valueListLocal: React.ReactNode[] = props.valueList;
        if (props.renderType === "fewLines" && !showAllLines) {
            valueListLocal = valueListLocal.slice(0, props.fewLinesCount);
        }

        const elemList: React.ReactNode[] = valueListLocal.map((value: any, index: number) => <div key={index}>{value}</div>);
        if (props.renderType === "fewLines") {
            if (props.valueList.length > props.fewLinesCount) {
                // prepiseme posledny element v zozname - pridame mu button
                const elemListLastIndex: number = elemList.length - 1;
                elemList[elemListLastIndex] =
                    <div key={elemListLastIndex}>
                        {valueListLocal[elemListLastIndex]}
                        <Button icon={showAllLines ? "pi pi-angle-double-left" : "pi pi-angle-double-right"} onClick={() => setShowAllLines(!showAllLines)} className="x-button-multiline-expand-collapse"/>
                    </div>;
                // ak by bol nejaky problem s tym hore tak treba pouzit toto:
                // elemList[elemListLastIndex] =
                //     <div className="flex flex-row flex-wrap">
                //         <div key={elemListLastIndex}>{valueListLocal[elemListLastIndex]}</div>
                //         <Button icon={showAllLines ? "pi pi-angle-double-left" : "pi pi-angle-double-right"} onClick={() => setShowAllLines(!showAllLines)}
                //                 className="x-button-multiline-expand-collapse"/>
                //     </div>;
            }
        }
        valueResult = <div className={props.multilineContent ? "x-multiline-content" : undefined}>{elemList}</div>;
    }

    return valueResult;
}
