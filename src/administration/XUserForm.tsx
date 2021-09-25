import {Form, FormProps, XFormBase} from "../components/XFormBase";
import {XInputText} from "../components/XInputText";
import {XButton} from "../components/XButton";
import React from "react";
import {XUser} from "../serverApi/XUser";
import {XInputDecimal} from "../components/XInputDecimal";
import {Password} from "primereact/password";
import {XUtils} from "../components/XUtils";

@Form("XUser")
export class XUserForm extends XFormBase {

    constructor(props: FormProps) {
        super(props);

        this.state.usernameReadOnly = false;
        this.state.passwordNew = '';
        this.state.passwordNewConfirm = '';

        this.onClickSave = this.onClickSave.bind(this);
    }

    async componentDidMount() {
        await super.componentDidMount();

        const username = this.getXObject().username;
        if (username === XUtils.getUsername() || (XUtils.demo() && (username === 'jozko' || username === 'xman'))) {
            this.setState({usernameReadOnly: true});
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
        return (
            <div>
                <XInputDecimal form={this} field="idXUser" label="ID" readOnly={true} labelStyle={{width:'14rem'}}/>
                <XInputText form={this} field="username" label="Username" size={20} labelStyle={{width:'14rem'}} readOnly={this.state.usernameReadOnly}/>
                <XInputText form={this} field="name" label="Name" size={30} labelStyle={{width:'14rem'}}/>
                <div className="p-field p-grid">
                    <label className="p-col-fixed" style={{width:'14rem'}}>New password</label>
                    <Password value={this.state.passwordNew} onChange={(e: any) => this.setState({passwordNew: e.target.value})} feedback={false} maxLength={64} size={20} autoComplete="new-password"/>
                </div>
                <div className="p-field p-grid">
                    <label className="p-col-fixed" style={{width:'14rem', whiteSpace:'nowrap'}}>Confirm new password</label>
                    <Password value={this.state.passwordNewConfirm} onChange={(e: any) => this.setState({passwordNewConfirm: e.target.value})} feedback={false} maxLength={64} size={20} autoComplete="new-password"/>
                </div>
                <XButton label="Save" onClick={this.onClickSave} />
                <XButton label="Cancel" onClick={this.onClickCancel} />
            </div>
        );
    }
}
