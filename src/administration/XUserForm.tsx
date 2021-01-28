import {XFormBase} from "../components/XFormBase";
import {XInputText} from "../components/XInputText";
import {Button} from "primereact/button";
import React from "react";
import {XUser} from "../serverApi/XUser";

export class XUserForm extends XFormBase<XUser> {

    render() {
        return (
            <div>
                <XInputText form={this} field="idXUser" label="ID" readOnly={true}/>
                <XInputText form={this} field="username" label="Username"/>
                <XInputText form={this} field="password" label="Password"/>
                <XInputText form={this} field="name" label="Name"/>
                <div className="p-field p-grid">
                    <Button label="Save" onClick={this.onClickSave} />
                    <Button label="Cancel" onClick={this.onClickCancel} />
                </div>
            </div>
        );
    }
}
