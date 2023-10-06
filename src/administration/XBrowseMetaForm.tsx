import {Form, XFormBase} from "../components/XFormBase";
import {XInputDecimal} from "../components/XInputDecimal";
import {XInputText} from "../components/XInputText";
import React from "react";
import {XFormColumn, XFormDataTable2} from "../components/XFormDataTable2";
import {XFormFooter} from "../components/XFormFooter";

@Form("XBrowseMeta")
export class XBrowseMetaForm extends XFormBase {

    render() {
        return (
            <div>
                <div className="x-form-row">
                    <div className="x-form-col">
                        <XInputDecimal form={this} field="id" label="ID" readOnly={true}/>
                        <XInputText form={this} field="entity" label="Entity" size={20}/>
                        <XInputText form={this} field="browseId" label="Browse ID" size={20}/>
                        <XInputDecimal form={this} field="rows" label="Rows"/>
                    </div>
                </div>
                <div className="x-viewport-width">
                    <XFormDataTable2 form={this} assocField="columnMetaList" label="Column list">
                        <XFormColumn field="id" header="ID" readOnly={true}/>
                        <XFormColumn field="field" header="Field" width="17rem"/>
                        <XFormColumn field="header" header="Header" width="17rem"/>
                        <XFormColumn field="align" header="Align"/>
                        <XFormColumn field="dropdownInFilter" header="Dropdown in filter"/>
                        <XFormColumn field="width" header="Width"/>
                        <XFormColumn field="columnOrder" header="Column order"/>
                    </XFormDataTable2>
                </div>
                <XFormFooter form={this}/>
            </div>
        );
    }
}
