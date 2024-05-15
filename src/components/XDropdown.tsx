import React from "react";
import {XFilterProp, XFormComponent, XFormComponentProps} from "./XFormComponent";
import {XAssoc} from "../serverApi/XEntityMetadata";
import {XObject} from "./XObject";
import {XDropdownForEntity} from "./XDropdownForEntity";
import {XUtilsMetadataCommon} from "../serverApi/XUtilsMetadataCommon";

export interface XDropdownProps extends XFormComponentProps<XObject> {
    assocField: string; // can be also path (e.g. <assoc1>.<assoc2> - dropdown will run on <assoc2>)
    displayField: string;
    sortField?: string;
    filter?: XFilterProp;
}

export class XDropdown extends XFormComponent<XObject, XDropdownProps> {

    protected xAssoc: XAssoc;

    constructor(props: XDropdownProps) {
        super(props);

        this.xAssoc = XUtilsMetadataCommon.getXAssocToOneByPath(XUtilsMetadataCommon.getXEntity(props.form.getEntity()), props.assocField);

        props.form.addField(props.assocField + '.' + props.displayField);
    }

    getField(): string {
        return this.props.assocField;
    }

    isNotNull(): boolean {
        return !this.xAssoc.isNullable;
    }

    getValue(): any | null {
        const assocObject: any | null = this.getValueFromObject();
        return assocObject;
    }

    render() {
        // POZOR!
        // this.getFilterBase(this.props.filter) - nefunguje dynamicky filter, lebo objekt potrebny vo funkcii this.props.filter sa nacitava az v XFormBase.componentDidMount()
        // a funkcia this.props.filter sa vola skor (pri vypocitavani atributu filter)
        // ani keby bola funkcia volana vo componentDidMount() tohto XDropdown, nepomohlo by to, tento componentDidMount() sa vola skor ako componentDidMount() parenta XFormBase
        // planuje sa to riesit bud zavedenim cache pre options alebo vytiahnutim options na uroven XFormBase
        return (
            <div className="field grid">
                <label htmlFor={this.props.assocField} className="col-fixed" style={this.getLabelStyle()}>{this.getLabel()}</label>
                <XDropdownForEntity id={this.props.assocField} entity={this.xAssoc.entityName} displayField={this.props.displayField} sortField={this.props.sortField}
                                    value={this.getValue()} onChange={(value: any | null) => this.onValueChangeBase(value, this.props.onChange)}
                                    readOnly={this.isReadOnly()} isNotNull={this.isNotNull()} error={this.getError()} filter={this.getFilterBase(this.props.filter)}/>
            </div>
        );
    }
}