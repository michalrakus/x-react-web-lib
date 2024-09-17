import React, {Component} from "react";
import {Dropdown, DropdownChangeEvent} from "primereact/dropdown";
import {XUtils} from "./XUtils";
import {XCustomFilter} from "../serverApi/FindParam";
import {XUtilsMetadata} from "./XUtilsMetadata";
import {XUtilsMetadataCommon} from "../serverApi/XUtilsMetadataCommon";

export interface XDropdownForEntityProps {
    id?: string;
    entity: string;
    displayField: string;
    sortField?: string;
    value: any | null;
    onChange: (value: any | null) => void;
    readOnly?: boolean;
    isNotNull?: boolean;
    error?: string;
    filter?: XCustomFilter;
}

// vseobecny Dropdown ktoreho parametrom je entity, zobrazuje zaznamy danej entity, po selectnuti vracia zaznam danej entity
// ambicia je pouzivat ho vsade - vo formulari, vo filtroch, vo form tabulke, priamo aplikacnym programmerom
// dalo by sa vyclenit este XDropdownBase, ktory by dostaval ako parameter options (bol by nezavisly od DB), zatial ho nerobime,
// pravdepodobnost potreby XDropdownBase je nizka
// do buducna sa planuje pouzit cache pre options (plnila by sa pri otvoreni XFormBase*) - dolezite je to hlavne pre dropdowny vo form tabulke (a tiez pre dynamicky filter vo formulari - objekt sa nacita neskor ako options)
// tiez by bolo fajn podporovat dynamicky filter (vo formulari) - to by ale trebalo vytiahnut options do state formulara
// otazka je ci nepouzivat vsade len XAutoComplete a upustit od XDropdown
export class XDropdownForEntity extends Component<XDropdownForEntityProps> {

    protected idField: string;

    state: {
        options: any[];
    };

    constructor(props: XDropdownForEntityProps) {
        super(props);

        this.idField = XUtilsMetadataCommon.getXEntity(this.props.entity).idField;

        this.state = {
            options: []
        };

        this.onChange = this.onChange.bind(this);
    }

    componentDidMount() {
        this.loadOptions();
    }

    async loadOptions() {
        let options: any[] = await XUtils.fetchRows(this.props.entity, this.props.filter, this.props.sortField ?? this.props.displayField);
        if (this.props.isNotNull === undefined || !this.props.isNotNull) {
            // pridame prazdnu polozku
            options.splice(0, 0, {[this.idField]: null, [this.props.displayField]: ""}); // null polozka
        }
        this.setState({options: options});
    }

    onChange(e: DropdownChangeEvent) {
        let value: any | null;
        // specialna null polozka id field null
        if (e.value[this.idField] === null) {
            value = null;
        } else {
            value = e.value;
        }
        this.props.onChange(value);
    }

    render() {
        // TODO - mozno by nebolo od veci pouzivat InputText ak readOnly === true (chybala by len sipka (rozbalovac)) a dalo by sa copy-paste-ovat
        // propertiesy na Dropdown-e: readOnly vyseduje, disabled znemoznuje vyber polozky
        return (
            <Dropdown id={this.props.id} options={this.state.options} optionLabel={this.props.displayField} dataKey={this.idField}
                      value={this.props.value} onChange={this.onChange}
                      readOnly={this.props.readOnly} disabled={this.props.readOnly} {...XUtils.createTooltipOrErrorProps(this.props.error)}/>
        );
    }
}