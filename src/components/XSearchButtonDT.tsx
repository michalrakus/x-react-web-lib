import {XFormBase} from "./XFormBase";
import React, {useRef, useState} from "react";
import {XUtils} from "./XUtils";
import {InputText} from "primereact/inputtext";
import {Button} from "primereact/button";
import {Dialog} from "primereact/dialog";
import {XSearchBrowseParams} from "./XSearchBrowseParams";
import {XTableFieldReadOnlyProp} from "./XFormDataTable2";
import {XUtilsMetadataCommon} from "../serverApi/XUtilsMetadataCommon";

export const XSearchButtonDT = (props: {form: XFormBase; entity: string; assocField: string; displayField: string, searchBrowse: JSX.Element; assocForm?: JSX.Element; rowData: any; readOnly?: XTableFieldReadOnlyProp}) => {

    const inputTextRef = useRef<any>(null);

    const [inputChanged, setInputChanged] = useState(false); // priznak, ci uzivatel typovanim zmenil hodnotu v inpute
    const [inputValueState, setInputValueState] = useState<any>(null); // pouzivane, len ak inputChanged === true, je tu zapisana zmenena hodnota v inpute

    const [dialogOpened, setDialogOpened] = useState(false);

    const computeInputValue = () : any => {
        let inputValue = null;
        if (!inputChanged) {
            if (props.rowData !== null) {
                // TODO - pridat cez generikum typ fieldu (ak sa da)
                // poznamka: ak assocObject === null tak treba do inputu zapisovat prazdny retazec, ak by sme pouzili null, neprejavila by sa zmena v modeli na null
                const assocObject = props.rowData[props.assocField];
                inputValue = (assocObject !== null && assocObject !== undefined) ? assocObject[props.displayField] : "";
            }
        }
        else {
            inputValue = inputValueState;
        }
        return inputValue;
    }

    const onInputValueChange = (e: any) => {
        setInputChanged(true);
        setInputValueState(e.target.value);
    }

    const onInputBlur = async (e: any) => {
        // optimalizacia - testujeme len ak inputChanged === true
        if (inputChanged) {
            //console.log('onBlur = ' + e.target.value + ' - ideme testovat');
            if (e.target.value === '') {
                setValueToModel(null); // prazdny retazec znamena null hodnotu
            }
            else {
                // TODO - mozno je lepsie uz na klientovi zistit entitu za asociaciou - zatial takto (findRowsForAssoc)
                const rows: any[] = await XUtils.fetchMany('findRowsForAssoc', {entity: props.entity, assocField: props.assocField, displayField: props.displayField, filter: e.target.value});
                if (rows.length === 0) {
                    setDialogOpened(true);
                }
                else if (rows.length === 1) {
                    // nastavime najdeny row
                    setValueToModel(rows[0]);
                }
                else {
                    setDialogOpened(true);
                }
            }
        }
    }

    const setValueToModel = (row: any) => {
        // zmenime hodnotu v modeli (odtial sa hodnota cita)
        props.rowData[props.assocField] = row;
        // kedze "rowData" je sucastou "props.form.state.object", tak nam staci zavolat setState({object: object}), aby sa zmena prejavila
        props.form.onObjectDataChange();
        setInputChanged(false);
    }

    const onClickSearch = (e: any) => {
        //console.log("zavolany onClickSearch");
        if (!readOnly) {
            setDialogOpened(true);
        }
        else {
            if (props.assocForm !== undefined) {
                const xEntity = XUtilsMetadataCommon.getXEntity(props.entity);
                const xEntityAssoc = XUtilsMetadataCommon.getXEntityForAssocToOne(xEntity, props.assocField)
                if (props.rowData !== null) {
                    const assocObject = props.rowData[props.assocField];
                    // OTAZKA - ziskavat id priamo z root objektu? potom ho vsak treba do root objektu pridat
                    const id = (assocObject !== null && assocObject !== undefined) ? assocObject[xEntityAssoc.idField] : null;
                    // klonovanim elementu pridame atribut id
                    const assocForm = React.cloneElement(props.assocForm, {id: id}/*, props.assocForm.children*/);
                    (props.form.props as any).openForm(assocForm);
                }
            }
        }
    }

    const onChoose = (chosenRow: any) => {
        //console.log("zavolany onChoose");
        // zavrieme search dialog
        setDialogOpened(false);
        // zapiseme vybraty row do objektu
        setValueToModel(chosenRow);
    }

    const onHide = () => {
        setDialogOpened(false);
        // ak mame v inpute neplatnu hodnotu, musime vratit kurzor na input
        if (inputChanged) {
            inputTextRef.current.focus();
        }
    }

    // vypocitame inputValue
    const inputValue = computeInputValue();

    const readOnly: boolean = XUtils.isReadOnlyTableField(undefined, props.readOnly, props.form.state.object, props.rowData);

    return (
        <div>
            <div className="x-search-button-base">
                <InputText id={props.assocField} value={inputValue} onChange={onInputValueChange} onBlur={onInputBlur} readOnly={readOnly} ref={inputTextRef}/>
                <Button icon="pi pi-search" onClick={onClickSearch} />
            </div>
            <Dialog className="x-dialog-without-header" visible={dialogOpened} /*style={{ width: '50vw' }}*/ onHide={onHide}>
                {/* klonovanim elementu pridame atribut searchBrowseParams */}
                {React.cloneElement(props.searchBrowse,
                    {
                            searchBrowseParams : {
                                onChoose: onChoose,
                                displayFieldFilter: (inputChanged ? {field: props.displayField, constraint: {value: inputValueState, matchMode: "contains"}} : undefined),
                                customFilter: undefined // TODO - dorobit
                            } satisfies XSearchBrowseParams
                        }/*, props.searchBrowse.children*/)}
            </Dialog>
        </div>
    );
}