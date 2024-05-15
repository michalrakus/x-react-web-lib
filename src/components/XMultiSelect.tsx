import React from "react";
import {XFilterProp, XFormComponent, XFormComponentProps} from "./XFormComponent";
import {XAssoc} from "../serverApi/XEntityMetadata";
import {XObject} from "./XObject";
import {XUtilsMetadataCommon} from "../serverApi/XUtilsMetadataCommon";
import {XMultiSelectBase} from "./XMultiSelectBase";
import {DataTableSortMeta} from "primereact/datatable";
import {XUtilsCommon} from "../serverApi/XUtilsCommon";

// works in one of these 2 modes:
// 1. entity of form uses ManyToMany assoc to work with options
//      in this case prop "assocToMany" is ManyToMany assoc and prop "assocManyToOne" is undefined (not used)
// 2. entity of form uses OneToMany assoc to link rows (entity for link table must be created)
//      in this case prop "assocToMany" is OneToMany assoc to link rows and prop "assocManyToOne" is ManyToOne assoc from link row to option row

export interface XMultiSelectProps extends XFormComponentProps<XObject> {
    assocToMany: string; // assoc ManyToMany to option rows or assoc OneToMany to link rows; can be also path (e.g. <assoc1>.<assoc2> - multiselect will run on <assoc2>)
    assocManyToOne?: string; // assoc from link row to option row - used only if prop "assocToMany" is OneToMany assoc to link rows
    displayField: string; // field of option row
    filter?: XFilterProp; // filter for option rows
    sortField?: string | DataTableSortMeta[]; // sortField for option rows
    fields?: string[]; // ak chceme pri citani options nacitat aj asociovane objekty
    width?: string;
    scrollHeight?: string; // Maximum height of the suggestions panel.
}

export class XMultiSelect extends XFormComponent<XObject, XMultiSelectProps> {

    protected xAssocToMany: XAssoc;
    protected xAssocManyToOne?: XAssoc;

    constructor(props: XMultiSelectProps) {
        super(props);

        this.xAssocToMany = XUtilsMetadataCommon.getXAssocToManyByPath(XUtilsMetadataCommon.getXEntity(props.form.getEntity()), props.assocToMany);
        if (props.assocManyToOne) {
            this.xAssocManyToOne = XUtilsMetadataCommon.getXAssocToOneByPath(XUtilsMetadataCommon.getXEntity(this.xAssocToMany.entityName), props.assocManyToOne);
        }

        if (props.assocManyToOne) {
            props.form.addField(props.assocToMany + '.' + props.assocManyToOne + '.' + props.displayField);
        }
        else {
            props.form.addField(props.assocToMany + '.' + props.displayField);
        }

        this.onChange = this.onChange.bind(this);
    }

    getField(): string {
        return this.props.assocToMany;
    }

    isNotNull(): boolean {
        return !this.xAssocToMany.isNullable;
    }

    getValue(): any[] {
        let optionRowList: any[];
        const rowList: any[] | null = this.getValueFromObject();
        if (this.props.assocManyToOne) {
            // assoc "assocToMany" contains link rows - these link rows have to be transformed to option rows
            if (rowList !== null) {
                optionRowList = rowList.map((linkRow: any) => XUtilsCommon.getValueByPath(linkRow, this.props.assocManyToOne!));
            } else {
                // this.props.form.state.object was not initialised yet
                optionRowList = [];
            }
        }
        else {
            // assoc "assocToMany" contains option rows - no transformation needed
            optionRowList = rowList ?? [];
        }

        return optionRowList;
    }

    onChange(value: any[]) {
        // value coming from XMultiSelectBase is list of selected option rows
        let rowList: any[];
        if (this.props.assocManyToOne) {
            // assoc "assocToMany" expects link rows - we wrap options row into link rows, id is left undefined,
            // during save will be all old links deleted and these new links will be inserted (because id is undefined)
            rowList = value.map((optionRow: any) => {
                const linkRow: any = {};
                linkRow[this.props.assocManyToOne!] = optionRow;
                return linkRow;
            });
        }
        else {
            // assoc "assocToMany" expects option rows - no transformation needed
            rowList = value;
        }
        this.onValueChangeBase(rowList, this.props.onChange);
    }

    render() {
        return (
            <div className="field grid">
                <label htmlFor={this.props.assocToMany} className="col-fixed" style={this.getLabelStyle()}>{this.getLabel()}</label>
                <XMultiSelectBase value={this.getValue()} onChange={this.onChange}
                                  displayField={this.props.displayField}
                                  optionsQuery={{entity: this.xAssocManyToOne ? this.xAssocManyToOne.entityName : this.xAssocToMany.entityName, filter: () => this.getFilterBase(this.props.filter), sortField: this.props.sortField, fields: this.props.fields}}
                                  width={this.props.width} scrollHeight={this.props.scrollHeight}
                                  readOnly={this.isReadOnly()} error={this.getError()}/>
            </div>
        );
    }
}