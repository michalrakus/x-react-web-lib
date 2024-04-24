import React from "react";
import {XFormBaseModif} from "../components/XFormBaseModif";
import {Form} from "../components/XFormBase";
import {XObject} from "../components/XObject";
import {XInputDecimal} from "../components/XInputDecimal";
import {XInputDate} from "../components/XInputDate";
import {XInputText} from "../components/XInputText";
import {XFormFooter} from "../components/XFormFooter";
import {XFormHeader} from "../components/XFormHeader";

@Form("XParam")
export class XParamForm extends XFormBaseModif {

    createNewObject(): XObject {
        return {version: 0};
    }

    render() {
        return (
            <div>
                <XFormHeader label="Parameter"/>
                <div className="x-form-row">
                    <div className="x-form-col">
                        <XInputDecimal form={this} field="id" label="ID" readOnly={true}/>
                        <XInputDate form={this} field="modifDate" label="Modified at" readOnly={true}/>
                        <XInputText form={this} field="modifXUser.name" label="Modified by" inputStyle={{width:'12.5rem'}}/>
                        <XInputText form={this} field="code" label="Code" inputStyle={{width:'16rem'}}/>
                        <XInputText form={this} field="name" label="Name" inputStyle={{width:'45rem'}}/>
                        <XInputText form={this} field="value" label="Value" inputStyle={{width:'45rem'}}/>
                    </div>
                </div>
                <XFormFooter form={this}/>
            </div>
        );
    }
}
