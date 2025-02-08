import React, {useState} from "react";
import {XUtils} from "./XUtils";
import {Editor, EditorTextChangeEvent} from "primereact/editor";
import Quill from 'quill';

// bez tohto kodu size options nefunguju
const Size: any = Quill.import('attributors/style/size');
Size.whitelist = ['10px', '12px', '14px', '16px', '18px', '24px', '32px', '48px'];
Quill.register(Size, true);

const Font: any = Quill.import('formats/font');
Font.whitelist = [
    'sans-serif', 'serif', 'monospace',
    'times-new-roman', 'comic-sans',
];
Quill.register(Font, true);

const headerTemplate = () => {
    // poznamka - k tomuto layout-u sa este viazu css styly umiestnene v App.css
    const styleMarginRight: React.CSSProperties = {marginRight: '0.7rem'};
    return (
        <span className="ql-formats">

            <select className="ql-font" aria-label="Font">
                <option value="sans-serif" selected>Sans-Serif</option>
                <option value="serif">Serif</option>
                <option value="monospace">Monospace</option>
                <option value="times-new-roman">TimesNewRoman</option>
                <option value="comic-sans">Comic Sans</option>
            </select>

            <select className="ql-size" aria-label="Font Size" style={styleMarginRight}>
                <option value="10px">10</option>
                <option value="12px" selected>12</option>
                <option value="14px">14</option>
                <option value="16px">16</option>
                <option value="18px">18</option>
                <option value="24px">24</option>
                <option value="32px">32</option>
                <option value="48px">48</option>
            </select>

            <button className="ql-bold" aria-label="Bold"></button>
            <button className="ql-italic" aria-label="Italic"></button>
            <button className="ql-underline" aria-label="Underline"></button>
            <button className="ql-strike" aria-label="Strikethrough" style={styleMarginRight}></button>

            <select className="ql-color" aria-label="Text Color"></select>
            <select className="ql-background" aria-label="Background Color" style={styleMarginRight}></select>

            <select className="ql-align" aria-label="Text Alignment" style={styleMarginRight}>
                <option selected></option>
                <option value="center"></option>
                <option value="right"></option>
            </select>

            <button className="ql-list" value="ordered" aria-label="Ordered List"></button>
            <button className="ql-list" value="bullet" aria-label="Bullet List"></button>
            <button className="ql-indent" value="-1" aria-label="Indent to the left"></button>
            <button className="ql-indent" value="+1" aria-label="Indent to the right"></button>

        </span>
    );
};

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
                pt={{root: {style: props.style}}}
                {...XUtils.createTooltipOrErrorProps(props.error)} headerTemplate={headerTemplate()}/>
    );
}
