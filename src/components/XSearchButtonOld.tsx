import {XFormBase} from "./XFormBase";
import {XObject} from "./XObject";
import React, {useRef, useState} from "react";
import {InputText} from "primereact/inputtext";
import {Button} from "primereact/button";
import {XUtils} from "./XUtils";
import {Dialog} from "primereact/dialog";
import {XUtilsMetadata} from "./XUtilsMetadata";
import {XUtilsMetadataCommon} from "../serverApi/XUtilsMetadataCommon";

export const XSearchButtonOld = (props: {form: XFormBase; assocField: string; displayField: string, searchTable: any; assocForm?: any; label?: string; readOnly?: boolean; size?: number; inputStyle?: React.CSSProperties;}) => {

    props.form.addField(props.assocField + '.' + props.displayField);

    const xEntity = XUtilsMetadataCommon.getXEntity(props.form.getEntity());
    const xAssoc = XUtilsMetadataCommon.getXAssocToOne(xEntity, props.assocField);
    const xEntityAssoc = XUtilsMetadataCommon.getXEntity(xAssoc.entityName);
    const xDisplayField = XUtilsMetadataCommon.getXFieldByPath(xEntityAssoc, props.displayField);

    // POVODNY KOD
    //const overlayPanelEl = useRef<any>(null);

    const inputTextEl = useRef<any>(null);

    const [inputChanged, setInputChanged] = useState(false); // priznak, ci uzivatel typovanim zmenil hodnotu v inpute
    const [inputValueState, setInputValueState] = useState<any>(null); // pouzivane, len ak inputChanged === true, je tu zapisana zmenena hodnota v inpute

    const [dialogOpened, setDialogOpened] = useState(false);

    const computeInputValue = () : any => {
        let inputValue = null;
        if (!inputChanged) {
            const object: XObject | null = props.form.state.object;
            if (object !== null) {
                // TODO - pridat cez generikum typ fieldu (ak sa da)
                // poznamka: ak assocObject === null tak treba do inputu zapisovat prazdny retazec, ak by sme pouzili null, neprejavila by sa zmena v modeli na null
                const assocObject = object[props.assocField];
                inputValue = (assocObject !== null && assocObject !== undefined) ? assocObject[props.displayField] : "";
            }
        }
        else {
            inputValue = inputValueState;
        }
        return inputValue;
    }

    let label = props.label ?? props.assocField;
    const readOnly = props.readOnly ?? false;
    const size = props.size ?? xDisplayField.length;

    if (!xAssoc.isNullable && !readOnly) {
        label = XUtils.markNotNull(label);
    }

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
            }
            else {
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
        props.form.onFieldChange(props.assocField, row);
        setInputChanged(false);
    }

    const onClickSearch = (e: any) => {
        console.log("zavolany onClickSearch");
        if (!readOnly) {
            setDialogOpened(true);
            // POVODNY KOD
            //overlayPanelEl.current.toggle(e);
        }
        else {
            if (props.assocForm !== undefined) {
                const object: XObject | null = props.form.state.object;
                if (object !== null) {
                    const assocObject = object[props.assocField];
                    // OTAZKA - ziskavat id priamo z root objektu? potom ho vsak treba do root objektu pridat
                    const id = (assocObject !== null && assocObject !== undefined) ? assocObject[xEntityAssoc.idField] : null;
                    // klonovanim elementu pridame atribut id
                    const assocForm = React.cloneElement(props.assocForm, {id: id}, props.assocForm.children);
                    (props.form.props as any).openForm(assocForm);
                }
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
            inputTextEl.current.element.focus(); // neviem preco tu trebalo pridat "element", asi primereact wrapuje react element
        }
    }

    // {React.createElement(props.searchTable, {searchTableParams: {onChoose: onChoose, displayField: props.displayField, filter: (inputChanged ? inputValueState : undefined)}, ...props.searchTableProps}, null)}
    // <BrandSearchTable searchTableParams={{onChoose: onChoose, displayField: props.displayField, filter: (inputChanged ? inputValueState : undefined)}} qqq="fiha"/>

    // vypocitame inputValue
    const inputValue = computeInputValue();

    return (
        <div className="field grid">
            <label htmlFor={props.assocField} className="col-fixed" style={{width: XUtils.FIELD_LABEL_WIDTH}}>{label}</label>
            <InputText id={props.assocField} value={inputValue} onChange={onInputValueChange} onBlur={onInputBlur} readOnly={readOnly} ref={inputTextEl} maxLength={xDisplayField.length} size={size} style={props.inputStyle}/>
            <Button label="..." onClick={onClickSearch} />
            <Dialog visible={dialogOpened} /*style={{ width: '50vw' }}*/ onHide={onHide}>
                {/* klonovanim elementu pridame atribut searchTableParams */}
                {React.cloneElement(props.searchTable, {searchTableParams: {onChoose: onChoose, displayField: props.displayField, filter: (inputChanged ? inputValueState : undefined)}}, props.searchTable.children)}
            </Dialog>
        </div>
    );
}