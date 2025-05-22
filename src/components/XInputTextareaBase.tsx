import React, {Component} from "react";
import {stringAsUI, stringFromUI} from "../serverApi/XUtilsConversions";
import {XUtils} from "./XUtils";
import {InputTextarea} from "primereact/inputtextarea";

// koli optimalizacii - typovany text si zapisuje do svojej stavovej premennej a onChange zavola az z onBlur
// pri velkych formularoch je totiz volanie zmeny stavu this.setState({object: this.state.object, errorMap: this.state.errorMap}); pomale

// poznamka: XInputTextareaBase sme prerobili z functional component na class component, lebo sme potrebovali funkciu autoResize(),
// ktoru je mozne volat z parent componentov cez ref (functional component neumoznuje poskytovat ref, lebo nema instanciu
// (ref sa da len forwardovat cez forwardRef, co je komplikovane ak chceme mat aj funkciu autoResize()))

export interface XInputTextareaBaseProps {
    id?: string;
    value: string | null;
    onChange: (value: string | null) => void;
    rows?: number;
    cols?: number;
    autoResize?: boolean;
    readOnly?: boolean;
    error?: string;
    style?: React.CSSProperties;
    className?: string;
    maxLength?: number;
    tooltip?: string;
    placeholder?: string;
}

export class XInputTextareaBase extends Component<XInputTextareaBaseProps> {

    inputTextareaRef: any;

    state: {
        inputChanged: boolean; // priznak, ci uzivatel typovanim zmenil hodnotu v inpute
        inputValueState: string | undefined; // pouzivane, len ak inputChanged === true, je tu zapisana zmenena hodnota v inpute
    };

    constructor(props: XInputTextareaBaseProps) {
        super(props);

        this.inputTextareaRef = React.createRef();

        this.state = {
            inputChanged: false,
            inputValueState: undefined
        };

        this.onChange = this.onChange.bind(this);
        this.onBlur = this.onBlur.bind(this);
    }

    onChange(e: any) {
        this.setState({inputChanged: true, inputValueState: e.target.value});
    }

    onBlur(e: React.FocusEvent<HTMLTextAreaElement>) {
        // optimalizacia - onChange volame len ak inputChanged === true
        if (this.state.inputChanged) {
            const value: string | null = stringFromUI(e.target.value);
            this.props.onChange(value);
            // pre poriadok nastavujeme inputValueState na undefined
            this.setState({inputChanged: false, inputValueState: undefined});
        }
    }

    getInputValue(): string {
        let inputValue: string;
        if (this.state.inputChanged) {
            inputValue = this.state.inputValueState!;
        }
        else {
            inputValue = stringAsUI(this.props.value);
        }
        return inputValue;
    }

    // call this method to autoresize textarea after setting the content of XInputTextareaBase via onChange of some other attribute (e.g. onChangeClient)
    // must be called as callback (param) of the method XFormBase.setStateXForm
    autoResize() {
        // code from ChatGPT
        if (this.inputTextareaRef.current) {
            this.inputTextareaRef.current.style.height = 'auto'; // Reset height
            this.inputTextareaRef.current.style.height = `${this.inputTextareaRef.current.scrollHeight}px`; // Set height based on scrollHeight
        }
    }

    render() {
        return (
            <InputTextarea ref={this.inputTextareaRef} id={this.props.id} value={this.getInputValue()} onChange={this.onChange}
                           onBlur={this.onBlur} readOnly={this.props.readOnly}
                           maxLength={this.props.maxLength} style={this.props.style} rows={this.props.rows} cols={this.props.cols}
                           autoResize={this.props.autoResize}
                           {...XUtils.addClassName(XUtils.createTooltipOrErrorProps(this.props.error, this.props.tooltip), this.props.className)}
                           placeholder={this.props.placeholder}/>
        );
    }
}
