import {Form, XFormBase} from "../components/XFormBase";
import {XInputText} from "../components/XInputText";
import {XButton} from "../components/XButton";
import React from "react";
import {XUser} from "../serverApi/XUser";
import {XInputDecimal} from "../components/XInputDecimal";

@Form("XUser")
export class XUserForm extends XFormBase {

    render() {
        return (
            <div>
                <XInputDecimal form={this} field="idXUser" label="ID" readOnly={true}/>
                <XInputText form={this} field="username" label="Username" size={20}/>
                <XInputText form={this} field="password" label="Password" size={20}/>
                <XInputText form={this} field="name" label="Name" size={30}/>
                <XButton label="Save" onClick={this.onClickSave} />
                <XButton label="Cancel" onClick={this.onClickCancel} />
            </div>
        );
    }
}
