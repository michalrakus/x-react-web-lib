import React, {useState} from "react";
import {XMultilineRenderType} from "./XLazyDataTable";
import {Button} from "primereact/button";

export const XHtmlRenderer = (props: {
    htmlValue: string | null; // product of Editor, e.g. <p>line 1</p><p>line 2</p><p>line 3</p>
    renderType: XMultilineRenderType;
    fewLinesCount: number;
}): JSX.Element => {

    // used only for props.renderType === "fewLines"
    const [showAllLines, setShowAllLines] = useState<boolean>(false);

    let className: string;
    let htmlValue: string = props.htmlValue ?? "";
    let buttonExpandCollapse: JSX.Element | null = null;
    if (props.renderType === "singleLine") {
        className = "x-html-content-single-line";
    }
    else {
        // "fewLines" or "allLines"
        className = "x-html-content";

        if (props.renderType === "fewLines" && htmlValue) {
            const parser = new DOMParser();
            const xmlDoc: Document = parser.parseFromString(htmlValue, "text/html");
            const pElemList: HTMLCollectionOf<HTMLParagraphElement> = xmlDoc.getElementsByTagName("p");
            if (pElemList.length > props.fewLinesCount) {
                if (!showAllLines) {
                    htmlValue = "";
                    for (let i: number = 0; i < props.fewLinesCount; i++) {
                        htmlValue += pElemList[i].outerHTML; // naspet do <p>line 1</p>
                    }
                }
                // pridame button na koniec posledneho riadku
                buttonExpandCollapse = <Button icon={showAllLines ? "pi pi-angle-double-left" : "pi pi-angle-double-right"} onClick={() => setShowAllLines(!showAllLines)}
                                               className="x-button-multiline-expand-collapse" style={{marginLeft: '0rem'}}/>;
            }
        }
    }

    return (
        <div className="p-editor-content ql-snow">
            <div className={"ql-editor " + className} dangerouslySetInnerHTML={{__html: htmlValue}}/>
            {buttonExpandCollapse}
        </div>
    );
}
