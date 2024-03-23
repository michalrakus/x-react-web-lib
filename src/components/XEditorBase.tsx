import React, {useState} from "react";
import {XUtils} from "./XUtils";
import {Editor, EditorTextChangeEvent} from "primereact/editor";

// koli optimalizacii - typovany text si zapisuje do svojej stavovej premennej a onChange zavola az z onBlur
// pri velkych formularoch je totiz volanie zmeny stavu this.setState({object: this.state.object, errorMap: this.state.errorMap}); pomale
export const XEditorBase = (props: {
    id?: string;
    value: string | null;
    onChange: (value: string | null) => void;
    readOnly?: boolean;
    error?: string;
    style?: React.CSSProperties;
}) => {

    // true, ak uzivatel typuje hodnotu
    // false, ak bol zavolany onBlur
    const [editorValueChanged, setEditorValueChanged] = useState<boolean>(false);
    // pouzivane, len ak editorValueChanged === true, je tu zapisana zmenena hodnota v editore
    const [editorValue, setEditorValue] = useState<string | null>(null);

    const onTextChange = (e: EditorTextChangeEvent) => {
        setEditorValueChanged(true);
        setEditorValue(e.htmlValue);
    }

    const onBlur = (e: React.FocusEvent<HTMLDivElement>) => {
        // optimalizacia - onChange volame len ak editorValueChanged === true
        if (editorValueChanged) {
            // TODO - bude vzdy onBlur volany az potom co bude setnuta editorValue? lebo ak nie tak treba hodnotu vytiahnut z "e"
            //const htmlValue: string | null = e.target.??;
            props.onChange(editorValue);
            setEditorValueChanged(false);
            setEditorValue(null); // pre poriadok
        }
    }

    const getValue = (): string | undefined => {
        let htmlValue: string | null;
        if (editorValueChanged) {
            htmlValue = editorValue;
        }
        else {
            htmlValue = props.value;
        }
        return htmlValue !== null ? htmlValue : undefined; // value v Editor nechce null, chce undefined
    }

    return (
        <Editor id={props.id} value={getValue()} onTextChange={onTextChange} onBlur={onBlur} readOnly={props.readOnly}
                style={props.style} {...XUtils.createErrorProps(props.error)}/>
    );
}
