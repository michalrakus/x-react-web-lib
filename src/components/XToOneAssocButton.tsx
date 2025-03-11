import {XFormBase} from "./XFormBase";
import {XObject} from "./XObject";
import React from "react";
import {Button} from "primereact/button";
import {XUtilsMetadata} from "./XUtilsMetadata";
import {XUtils} from "./XUtils";
import {XUtilsMetadataCommon} from "../serverApi/XUtilsMetadataCommon";

export const XToOneAssocButton = (props: {form: XFormBase; assocField: string; assocForm: any; label?: string; buttonLabel?: string;}) => {

    // mozno lepsie by bolo sem dat xEntityAssoc.idField ale postaci aj *FAKE*
    props.form.addField(props.assocField + '.*FAKE*');

    const label = props.label !== undefined ? props.label : props.assocField;

    const object: XObject | null = props.form.state.object;
    const assocObject = object !== null ? object[props.assocField] : null;

    const onClickButton = (e: any) => {
        const xEntity = XUtilsMetadataCommon.getXEntity(props.form.getEntity());
        const xEntityAssoc = XUtilsMetadataCommon.getXEntityForAssocToOne(xEntity, props.assocField)
        // OTAZKA - ziskavat id priamo z root objektu? potom ho vsak treba do root objektu pridat
        const id = assocObject !== null ? assocObject[xEntityAssoc.idField] : null;
        // klonovanim elementu pridame atribut id
        const assocForm = React.cloneElement(props.assocForm, {id: id}, props.assocForm.children);
        (props.form.props as any).openForm(assocForm);
    }

    return (
        <div className="field grid">
            <label htmlFor={props.assocField} className="col-fixed" style={{width: XUtils.FIELD_LABEL_WIDTH}}>{label}</label>
            <Button label={props.buttonLabel !== undefined ? props.buttonLabel : label} onClick={onClickButton} disabled={assocObject === null}/>
        </div>
    );
}