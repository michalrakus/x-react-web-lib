import React from "react";
import {XFormBase} from "./XFormBase";
import {XButton} from "./XButton";
import {xLocaleOption} from "./XLocale";
import {XDocTemplateButton} from "../modules/docTemplates/XDocTemplateButton";
import {XtDocTemplate} from "../modules/docTemplates/xt-doc-template";
import {XUtils} from "./XUtils";

// constant to be used in method formReadOnly to identify save button
export const xSaveButtonId: string = "x-save-button-id";

// helper wrapper
// hint - here after docTemplates button can come some buttons for application function if needed (new param appButtons?: any;)
export const XFormFooter = (props: {
    form: XFormBase;
    docTemplates?: true | ((entity: string) => Promise<XtDocTemplate[]>); // if true, doc template button is rendered; function param: function returning list of templates that can be used by user (for the case if we need project specific way of fetching templates)
    indentWidth?: string; // e.g. '20 rem' - moves docTemplates button to the right (for the future - when the dialog will be used for forms, we can put docTemplates button to the most right position)
}) => {

    const readOnly = props.form.formReadOnlyBase(xSaveButtonId);

    let leftCompensationElem: JSX.Element | null = null;
    let docTemplateButton: JSX.Element | null = null;
    // template button is rendered only for update (id !== undefined; row must exist in DB), not for insert
    if (props.docTemplates && !XUtils.isMobile() && props.form.props.id !== undefined) {
        docTemplateButton = <XDocTemplateButton key="docTemplates" entity={props.form.getEntity()} rowId={props.form.props.id} docTemplates={typeof props.docTemplates === 'function' ? props.docTemplates : undefined}/>;
        if (props.indentWidth) {
            // used only to create some distance between buttons Cancel and XDocTemplateButton (all content is centered), because Cancel is frequently used
            leftCompensationElem = <div style={{width: props.indentWidth}}/>;
            docTemplateButton =
                <div className="flex justify-content-end" style={{width: props.indentWidth}}>
                    {docTemplateButton}
                </div>;
        }
    }

    return (
        <div className="flex justify-content-center">
            {leftCompensationElem}
            <XButton icon="pi pi-save" label={xLocaleOption('save')} onClick={props.form.onClickSave} disabled={readOnly}/>
            <XButton icon="pi pi-times" label={xLocaleOption('cancel')} onClick={props.form.onClickCancel}/>
            {docTemplateButton}
        </div>
    );
}