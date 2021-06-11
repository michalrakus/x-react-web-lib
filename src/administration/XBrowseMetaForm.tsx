import {Form, XFormBase} from "../components/XFormBase";
import {XInputDecimal} from "../components/XInputDecimal";
import {XInputText} from "../components/XInputText";
import {XButton} from "../components/XButton";
import React from "react";
import {XFormColumn, XFormDataTable2} from "../components/XFormDataTable2";

@Form("XBrowseMeta")
export class XBrowseMetaForm extends XFormBase {

    render() {
        return (
            <div>
                <XInputDecimal form={this} field="idXBrowseMeta" label="ID" readOnly={true}/>
                <XInputText form={this} field="entity" label="Entity" size={20}/>
                <XInputText form={this} field="browseId" label="Browse ID" size={20}/>
                <XInputDecimal form={this} field="rows" label="Rows"/>
                <XFormDataTable2 form={this} assocField="columnMetaList" label="Column list">
                    <XFormColumn field="idXColumnMeta" header="ID" readOnly={true}/>
                    <XFormColumn field="field" header="Field" width="250"/>
                    <XFormColumn field="header" header="Header" width="250"/>
                    <XFormColumn field="align" header="Align"/>
                    <XFormColumn field="dropdownInFilter" header="Dropdown in filter"/>
                    <XFormColumn field="width" header="Width"/>
                    <XFormColumn field="columnOrder" header="Column order"/>
                </XFormDataTable2>
                <XButton label="Save" onClick={this.onClickSave} />
                <XButton label="Cancel" onClick={this.onClickCancel} />
            </div>
        );
    }
}