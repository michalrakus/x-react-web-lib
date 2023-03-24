import React from "react";
import {InputText} from "primereact/inputtext";
import {Button} from "primereact/button";
import {XUtils} from "./XUtils";
import {Dialog} from "primereact/dialog";
import {XUtilsMetadata} from "./XUtilsMetadata";
import {XFormComponent, XFormComponentProps} from "./XFormComponent";
import {XAssoc} from "../serverApi/XEntityMetadata";

export interface XSearchButtonProps extends XFormComponentProps {
    assocField: string;
    displayField: string;
    searchTable: any;
    assocForm?: any;
    size?: number;
    inputStyle?: React.CSSProperties;
}

export class XSearchButton extends XFormComponent<XSearchButtonProps> {

    protected xAssoc: XAssoc;

    inputTextEl: any;

    state: {
        inputChanged: boolean; // priznak, ci uzivatel typovanim zmenil hodnotu v inpute
        inputValueState: any; // pouzivane, len ak inputChanged === true, je tu zapisana zmenena hodnota v inpute
        dialogOpened: boolean;
    };

    constructor(props: XSearchButtonProps) {
        super(props);

        this.xAssoc = XUtilsMetadata.getXAssocToOne(XUtilsMetadata.getXEntity(props.form.getEntity()), props.assocField);

        this.inputTextEl = React.createRef();
        // POVODNY KOD
        //this.overlayPanelEl = React.createRef();

        this.state = {
            inputChanged: false,
            inputValueState: null,
            dialogOpened: false
        };

        props.form.addField(props.assocField + '.' + props.displayField);
    }

    getField(): string {
        return this.props.assocField;
    }

    isNotNull(): boolean {
        return !this.xAssoc.isNullable;
    }

    render() {
        const props = this.props;

        const xEntityAssoc = XUtilsMetadata.getXEntity(this.xAssoc.entityName);
        const xDisplayField = XUtilsMetadata.getXFieldByPath(xEntityAssoc, props.displayField);

        // tu boli hook-y kedysi...
        const inputChanged: boolean = this.state.inputChanged;
        const setInputChanged = (inputChanged: boolean) => {this.setState({inputChanged: inputChanged});}

        const inputValueState: any = this.state.inputValueState;
        const setInputValueState = (inputValueState: any) => {this.setState({inputValueState: inputValueState});}

        const dialogOpened: boolean = this.state.dialogOpened;
        const setDialogOpened = (dialogOpened: boolean) => {this.setState({dialogOpened: dialogOpened});}

        const computeInputValue = (): any => {
            let inputValue;
            if (!inputChanged) {
                // TODO - pridat cez generikum typ fieldu (ak sa da)
                // poznamka: ak assocObject === null tak treba do inputu zapisovat prazdny retazec, ak by sme pouzili null, neprejavila by sa zmena v modeli na null
                const assocObject = this.getValueFromObject();
                inputValue = (assocObject !== null) ? assocObject[props.displayField] : "";
            }
            else {
                inputValue = inputValueState;
            }
            return inputValue;
        }

        const size = props.size ?? xDisplayField.length;

        const onInputValueChange = (e: any) => {
            setInputChanged(true);
            setInputValueState(e.target.value);
        }

        const onInputBlur = async (e: any) => {
            // optimalizacia - testujeme len ak inputChanged === true
            if (inputChanged) {
                //console.log('onBlur = ' + e.target.value + ' - ideme testovat');
                // TODO - mozno je lepsie uz na klientovi zistit entitu za asociaciou - zatial takto (findRowsForAssoc)
                if (e.target.value === '') {
                    setValueToModel(null); // prazdny retazec znamena null hodnotu
                } else {
                    const rows: any[] = await XUtils.fetchMany('findRowsForAssoc', {
                        entity: props.form.entity,
                        assocField: props.assocField,
                        displayField: props.displayField,
                        filter: e.target.value
                    });
                    if (rows.length === 0) {
                        // POVODNY KOD
                        //overlayPanelEl.current.toggle(e);
                        setDialogOpened(true);
                    } else if (rows.length === 1) {
                        // nastavime najdeny row
                        setValueToModel(rows[0]);
                        setInputChanged(false);
                    } else {
                        // POVODNY KOD
                        //overlayPanelEl.current.toggle(e);
                        setDialogOpened(true);
                    }
                }
            }
        }

        const setValueToModel = (row: any) => {
            this.onValueChangeBase(row);
            setInputChanged(false);
        }

        const onClickSearch = (e: any) => {
            console.log("zavolany onClickSearch");
            if (!this.isReadOnly()) {
                setDialogOpened(true);
                // POVODNY KOD
                //overlayPanelEl.current.toggle(e);
            } else {
                if (props.assocForm !== undefined) {
                    const assocObject = this.getValueFromObject();
                    // OTAZKA - ziskavat id priamo z root objektu? potom ho vsak treba do root objektu pridat
                    const id = (assocObject !== null) ? assocObject[xEntityAssoc.idField] : null;
                    // klonovanim elementu pridame atribut id
                    const assocForm = React.cloneElement(props.assocForm, {id: id}, props.assocForm.children);
                    (props.form.props as any).openForm(assocForm);
                }
            }
        }

        const onChoose = (chosenRow: any) => {
            console.log("zavolany onChoose");
            // zavrieme search dialog
            // POVODNY KOD
            //overlayPanelEl.current.hide();
            setDialogOpened(false);
            // zapiseme vybraty row do objektu
            setValueToModel(chosenRow);
        }

        const onHide = () => {
            setDialogOpened(false);
            // ak mame v inpute neplatnu hodnotu, musime vratit kurzor na input
            if (inputChanged) {
                this.inputTextEl.current.element.focus(); // neviem preco tu trebalo pridat "element", asi primereact wrapuje react element
            }
        }

        // {React.createElement(props.searchTable, {searchTableParams: {onChoose: onChoose, displayField: props.displayField, filter: (inputChanged ? inputValueState : undefined)}, ...props.searchTableProps}, null)}
        // <BrandSearchTable searchTableParams={{onChoose: onChoose, displayField: props.displayField, filter: (inputChanged ? inputValueState : undefined)}} qqq="fiha"/>

        // vypocitame inputValue
        const inputValue = computeInputValue();

        return (
            <div className="field grid">
                <label htmlFor={props.assocField} className="col-fixed" style={this.getLabelStyle()}>{this.getLabel()}</label>
                <div className="x-search-button-base">
                    <InputText id={props.assocField} value={inputValue} onChange={onInputValueChange} onBlur={onInputBlur}
                               readOnly={this.isReadOnly()} ref={this.inputTextEl} maxLength={xDisplayField.length} size={size} style={props.inputStyle}
                               {...this.getClassNameTooltip()}/>
                    <Button label="..." onClick={onClickSearch}/>
                </div>
                <Dialog visible={dialogOpened} /*style={{ width: '50vw' }}*/ onHide={onHide}>
                    {/* klonovanim elementu pridame atribut searchTableParams */}
                    {React.cloneElement(props.searchTable, {
                        searchTableParams: {
                            onChoose: onChoose,
                            displayField: props.displayField,
                            filter: (inputChanged ? inputValueState : undefined)
                        }
                    }, props.searchTable.children)}
                </Dialog>
            </div>
        );
    }
}