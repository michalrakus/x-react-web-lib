import {Component} from "react";
import {XObject} from "./XObject";
import {XUtils} from "./XUtils";

// poznamka - v assoc button-e (XSearchButton, XToOneAssocButton, XFormSearchButtonColumn) je mozne zadat nazov formulara cez property assocForm={<BrandForm/>}
// pri tomto zapise sa nezadavaju propertiesy entity a id (tie sa doplnia automaticky pri otvoreni assoc formularu cez klonovanie elementu)
// preto umoznujeme aby entity a id mohli byt undefined
export interface FormProps {
    entity?: string;
    id?: number | null;
}

export abstract class XFormBase<T extends XObject> extends Component<FormProps> {

    entity?: string; // typ objektu, napr. Car, pouziva sa pri citani objektu z DB
    fields: Set<string>; // zoznam zobrazovanych fieldov (vcetne asoc. objektov) - potrebujeme koli nacitavaniu root objektu
    state: {object: T | null;};

    constructor(props: FormProps) {
        super(props);
        this.entity = props.entity;
        this.fields = new Set<string>();
        this.state = {
            object: null
        };
        this.onClickSave = this.onClickSave.bind(this);
        this.onClickCancel = this.onClickCancel.bind(this);
    }

    addRowOperation(): boolean {
        // formular je otvoreny na insert, ak nie je zadane id-cko
        return this.props.id === undefined || this.props.id === null;
    }

    async componentDidMount() {
        let object: T;
        if (this.entity !== undefined && this.props.id !== undefined && this.props.id !== null) {
            console.log('XFormBase.componentDidMount ide nacitat objekt');
            console.log(this.fields);
            object = await XUtils.fetchById(this.entity, Array.from(this.fields), this.props.id);
            console.log('XFormBase.componentDidMount nacital objekt:');
            console.log(object);
            // const price = (object as any).price;
            // console.log(typeof price);
            // console.log(price);
            // const date = (object as any).carDate;
            // console.log(typeof date);
            // console.log(date);
        }
        else {
            object = {} as any; // TODO - docasne, jedna sa o insert
        }
        this.setState({object: object});
    }

    getEntity(): string {
        if (this.entity === undefined) {
            throw "Entity is undefined";
        }
        return this.entity;
    }

    onFieldChange(field: string, value: any) {
        const object: T | null = this.state.object;
        (object as XObject)[field] = value;
        // TODO - tu mozno treba setnut funkciu - koli moznej asynchronicite
        this.setState({object: object});
    }

    onTableFieldChange(assocField: string, rowIndex: number, field: string, value: any) {
        const object: T | null = this.state.object;
        const rowList: any[] = (object as XObject)[assocField];
        rowList[rowIndex][field] = value;
        // TODO - tu mozno treba setnut funkciu - koli moznej asynchronicite
        this.setState({object: object});
    }

    onObjectDataChange() {
        const object: T | null = this.state.object;
        // TODO - tu mozno treba setnut funkciu - koli moznej asynchronicite
        this.setState({object: object});
    }

    onTableAddRow(assocField: string, newRow: any, dataKey?: string, selectedRow?: {}) {
        const object: T | null = this.state.object;
        const rowList: any[] = (object as XObject)[assocField];
        // ak vieme id-cko a id-cko nie je vyplnene, tak ho vygenerujeme (predpokladame ze id-cko je vzdy number)
        // id-cka potrebujeme, lebo by nam bez nich nekorektne fungovala tabulka
        // asi cistejsie by bolo citat id-cka zo sekvencie z DB, ale MySql nema sekvencie na styl Oracle
        if (dataKey !== undefined) {
            const newRowId = newRow[dataKey];
            if (newRowId === undefined || newRowId === null) {
                newRow[dataKey] = XFormBase.getNextRowId(rowList, dataKey);
                newRow.__x_generatedRowId = true; // specialny priznak, ze sme vygenerovali id-cko - pred insertom do DB toto id-cko vynullujeme aby sa vygenerovalo realne id-cko
            }
        }
        let index: number | undefined = undefined;
        if (selectedRow !== undefined) {
            const selectedRowIndex = rowList.indexOf(selectedRow);
            if (selectedRowIndex > -1) {
                index = selectedRowIndex + 1;
            }
        }
        if (index !== undefined) {
            rowList.splice(index, 0, newRow);
        }
        else {
            rowList.push(newRow); // na koniec
        }
        // TODO - tu mozno treba setnut funkciu - koli moznej asynchronicite
        this.setState({object: object});
    }

    static getNextRowId(rowList: any[], dataKey: string): number {
        let maxId: number = 0;
        for (const row of rowList) {
            const id = row[dataKey];
            if (id > maxId) {
                maxId = id;
            }
        }
        return maxId + 1;
    }

    onTableRemoveRow(assocField: string, row: {}) {
        const object: T | null = this.state.object;
        const rowList: any[] = (object as XObject)[assocField];
        // poznamka: indexOf pri vyhladavani pouziva strict equality (===), 2 objekty su rovnake len ak porovnavame 2 smerniky na totozny objekt
        const index = rowList.indexOf(row);
        if (index > -1) {
            rowList.splice(index, 1);
            // TODO - tu mozno treba setnut funkciu - koli moznej asynchronicite
            this.setState({object: object});
        }
        else {
            console.log("Neocakavana chyba - nenasiel sa element na zmazanie v poli");
        }
    }

    addField(field: string) {
        this.fields.add(field);
    }

    onClickSave() {
        console.log("zavolany onClickSave");

        // docasne na testovanie
        // const object: T | null = this.state.object;
        // if (object !== null) {
        //     const carDate = object['carDatetime'];
        //     if (carDate !== undefined && carDate !== null) {
        //         //(object as XObject)['carDate'] = dateFormat(carDate, 'yyyy-mm-dd');
        //         console.log(dateFormat(carDate, 'yyyy-mm-dd HH:MM:ss'))
        //         console.log(carDate.getHours());
        //         console.log(carDate.getMinutes());
        //         console.log(carDate.getSeconds());
        //     }
        // }

        console.log(this.state.object);
        XUtils.post(this.addRowOperation() ? 'addRow' : 'saveRow', {entity: this.props.entity, object: this.state.object});
        (this.props as any).onExitForm(null);
    }

    onClickCancel() {
        console.log("zavolany onClickCancel");

        // pre XFormNavigator:
        //this.props.onExitForm(<CarBrowse onExitForm={this.props.onExitForm}/>);
        // onExitForm pridavame automaticky v XFormNavigator2 pri renderovani komponentu
        // null - vrati sa do predchadzajuceho formularu, z ktoreho bol otvoreny
        (this.props as any).onExitForm(null);
    }
}