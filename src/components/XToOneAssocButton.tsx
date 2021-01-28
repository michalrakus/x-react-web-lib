import {XFormBase} from "./XFormBase";
import {XObject} from "./XObject";
import React from "react";
import {Button} from "primereact/button";
import {XUtilsMetadata} from "./XUtilsMetadata";

export const XToOneAssocButton = (props: {form: XFormBase<XObject>; assocField: string; assocForm: any; label?: string;}) => {

    // mozno lepsie by bolo sem dat xEntityAssoc.idField ale postaci aj *FAKE*
    props.form.addField(props.assocField + '.*FAKE*');

    const label = props.label !== undefined ? props.label : props.assocField;

    const object: XObject | null = props.form.state.object;
    const assocObject = object !== null ? object[props.assocField] : null;

    const onClickButton = (e: any) => {
        const xEntity = XUtilsMetadata.getXEntity(props.form.getEntity());
        const xEntityAssoc = XUtilsMetadata.getXEntityForAssocToOne(xEntity, props.assocField)
        // OTAZKA - ziskavat id priamo z root objektu? potom ho vsak treba do root objektu pridat
        const id = assocObject !== null ? assocObject[xEntityAssoc.idField] : null;
        // klonovanim elementu pridame atributy entity a id
        const assocForm = React.cloneElement(props.assocForm, {entity: xEntityAssoc.name, id: id}, props.assocForm.children);
        (props.form.props as any).onExitForm(assocForm);
    }

    return (
        <div className="p-field p-grid">
            <label htmlFor={props.assocField} className="p-col-fixed" style={{width:'150px'}}>{label}</label>
            <Button label={label} onClick={onClickButton} disabled={assocObject === null}/>
        </div>
    );
}