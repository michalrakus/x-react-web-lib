import React, {Component} from "react";
import {XQuery, XUtils} from "./XUtils";
import {DataTableSortMeta} from "primereact/datatable";
import {XUtilsMetadataCommon} from "../serverApi/XUtilsMetadataCommon";
import {MultiSelect, MultiSelectChangeEvent} from "primereact/multiselect";

// Base komponent pre MultiSelect - podobna uroven ako XAutoCompleteBase, resp. XDropdownForEntity

export interface XMultiSelectBaseProps {
    value: any[];
    onChange: (value: any[]) => void;
    //options?: any[]; // ak su priamo zadane options, nepouziva sa optionsQuery (TODO - toto neviem ci potrebujeme, da sa priamo pouzit MultiSelect v tomto pripade)
    optionsQuery?: XQuery; // musi byt zadany ak nie su zadane options
    displayField: string; // field ktory zobrazujeme v input-e (niektory z fieldov objektu z value/options), moze byt aj path (napr. <assoc>.<field>)
    //idField?: string; // id field (nazov atributu) objektu z value/suggestions - pouziva sa ak mame zadane priamo options (pri optionsQuery ziskame idField podla entity)
    maxSelectedLabels?: number;
    width?: string; // (still not implemented)
    scrollHeight?: string; // Maximum height of the options panel. (still not implemented)
    readOnly?: boolean;
    error?: string; // chybova hlaska, ak chceme field oznacit za nevalidny
}

export class XMultiSelectBase extends Component<XMultiSelectBaseProps> {

    public static defaultProps = {
        //scrollHeight: '15rem'   // primereact has 200px
    };

    protected idField: string;

    state: {
        options: any[];
    };

    constructor(props: XMultiSelectBaseProps) {
        super(props);

        if (!this.props.optionsQuery) {
            throw `XMultiSelectBase.optionsQuery: unexpected error - prop optionsQuery is undefined`;
        }
        this.idField = XUtilsMetadataCommon.getXEntity(this.props.optionsQuery.entity).idField;

        this.state = {
            options: []
        };
    }

    componentDidMount() {
        this.loadOptions();
    }

    async loadOptions() {
        if (!this.props.optionsQuery) {
            throw `XMultiSelectBase.optionsQuery: unexpected error - prop optionsQuery is undefined`;
        }
        const options: any[] = await XUtils.fetchRows(
            this.props.optionsQuery.entity,
            XUtils.evalFilter(this.props.optionsQuery.filter),
            this.getSortField(),
            this.props.optionsQuery.fields
        );
        this.setState({options: options});
    }

    getSortField(): string | DataTableSortMeta[] | undefined {
        let sortField: string | DataTableSortMeta[] | undefined = this.props.optionsQuery!.sortField;
        if (!sortField) {
            // ako default pouzivame displayField
            sortField = this.props.displayField;
        }
        return sortField;
    }

    render() {
        // propertiesy na Dropdown-e: readOnly vyseduje, disabled znemoznuje vyber polozky
        return (
            <MultiSelect options={this.state.options} optionLabel={this.props.displayField} dataKey={this.idField}
                         maxSelectedLabels={this.props.maxSelectedLabels} display="chip"
                         value={this.props.value} onChange={(e: MultiSelectChangeEvent) => this.props.onChange(e.value)}
                         readOnly={this.props.readOnly} disabled={this.props.readOnly} {...XUtils.createTooltipOrErrorProps(this.props.error)}/>
        );
    }
}
