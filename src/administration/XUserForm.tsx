import {Form, FormProps} from "../components/XFormBase";
import {XInputText} from "../components/XInputText";
import React from "react";
import {XUser} from "../serverApi/XUser";
import {XInputDecimal} from "../components/XInputDecimal";
import {Password} from "primereact/password";
import {XUtils} from "../components/XUtils";
import {XFormFooter} from "../components/XFormFooter";
import {XCheckbox} from "../components/XCheckbox";
import {XEnvVar, XReactAppAuth} from "../components/XEnvVars";
import {XFormBaseModif} from "../components/XFormBaseModif";
import {XInputDate} from "../components/XInputDate";

@Form("XUser")
export class XUserForm extends XFormBaseModif {

    constructor(props: FormProps) {
        super(props);

        this.state.usernameEnabledReadOnly = false;
        this.state.passwordNew = '';
        this.state.passwordNewConfirm = '';

        this.onClickSave = this.onClickSave.bind(this);
    }

    async componentDidMount() {
        await super.componentDidMount();

        const username = this.getXObject().username;
        if (username === XUtils.getUsername() || (XUtils.demo() && (username === 'jozko' || username === 'xman'))) {
            this.setState({usernameEnabledReadOnly: true});
        }
    }

    async onClickSave(): Promise<void> {

        if (!this.validateSave()) {
            return;
        }

        // v deme nedovolime zmenit uzivatelov ktori sa pouzivaju na skusanie dema
        if (XUtils.demo() && (this.state.object.username === 'jozko' || this.state.object.username === 'xman')) {
            alert("Users jozko, xman can not be changed.");
            return;
        }

        // password is used only by local authorization
        if (XUtils.getEnvVarValue(XEnvVar.REACT_APP_AUTH) === XReactAppAuth.LOCAL) {
            if (this.isAddRow() && this.state.passwordNew === '') {
                alert("Password is required.");
                return;
            }

            if (this.state.passwordNew !== '' || this.state.passwordNewConfirm !== '') {

                // nedovolime tuto zmenit heslo aktualne prihlasenemu uzivatelovi, lebo by sme museli upravit aj token
                if (this.state.object.username === XUtils.getUsername()) {
                    alert("Please, change your password via option Administration -> Change password.");
                    return;
                }

                if (this.state.passwordNew !== this.state.passwordNewConfirm) {
                    alert("New password and confirmed new password are not equal.");
                    return;
                }

                // zapiseme nove heslo do objektu
                this.state.object.password = this.state.passwordNew;
            }
            else {
                // nemenime heslo (atribut s hodnotou undefined sa nezapise do DB)
                this.state.object.password = undefined;
            }
        }

        this.preSave(this.state.object);

        // zapise this.state.object do DB - samostatny servis koli hashovaniu password-u
        try {
            await XUtils.post('userSaveRow', {entity: this.getEntity(), object: this.state.object});
        }
        catch (e) {
            XUtils.showErrorMessage("Save row failed.", e);
            return; // zostavame vo formulari
        }
        (this.props as any).openForm(null); // save zbehol, ideme naspet do browsu
    }

    render() {
        // autoComplete="new-password" - bez tohto chrome predplna user/password, ak si user da ulozit user/password (pre danu url)
        let passwordElems: any[] = [];
        if (XUtils.getEnvVarValue(XEnvVar.REACT_APP_AUTH) === XReactAppAuth.LOCAL) {
            passwordElems = [
                <div className="field grid">
                    <label className="col-fixed" style={{width:'14rem'}}>New password</label>
                    <Password value={this.state.passwordNew} onChange={(e: any) => this.setState({passwordNew: e.target.value})} feedback={false} maxLength={64} size={20} autoComplete="new-password"/>
                </div>,
                <div className="field grid">
                    <label className="col-fixed" style={{width:'14rem', whiteSpace:'nowrap'}}>Confirm new password</label>
                    <Password value={this.state.passwordNewConfirm} onChange={(e: any) => this.setState({passwordNewConfirm: e.target.value})} feedback={false} maxLength={64} size={20} autoComplete="new-password"/>
                </div>
            ];
        }

        return (
            <div>
                <div className="x-form-row">
                    <div className="x-form-col">
                        <XInputDecimal form={this} field="idXUser" label="ID" readOnly={true} labelStyle={{width:'14rem'}}/>
                        <XInputText form={this} field="username" label="Username" size={30} labelStyle={{width:'14rem'}} readOnly={this.state.usernameEnabledReadOnly}/>
                        <XInputText form={this} field="name" label="Name" size={30} labelStyle={{width:'14rem'}}/>
                        <XCheckbox form={this} field="enabled" label="Enabled" labelStyle={{width:'14rem'}} readOnly={this.state.usernameEnabledReadOnly}/>
                        {passwordElems}
                        <XInputDate form={this} field="modifDate" label="Modified at" readOnly={true} labelStyle={{width:'14rem'}}/>
                        <XInputText form={this} field="modifXUser.name" label="Modified by" size={20} labelStyle={{width:'14rem'}}/>
                    </div>
                </div>
                <XFormFooter form={this}/>
            </div>
        );
    }
}
