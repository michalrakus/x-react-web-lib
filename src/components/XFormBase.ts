import {Component} from "react";
import {XObject} from "./XObject";
import {XUtils} from "./XUtils";

// poznamka - v assoc button-e (XSearchButton, XToOneAssocButton, XFormSearchButtonColumn) je mozne zadat nazov formulara cez property assocForm={<BrandForm/>}
// pri tomto zapise sa nezadava property id (id sa doplni automaticky pri otvoreni assoc formularu cez klonovanie elementu)
// preto umoznujeme aby id mohlo byt undefined
export interface FormProps {
    id?: number;
    object?: XObject; // pri inserte (id je undefined) mozme cez tuto property poslat do formulara objekt s uz nastavenymi niektorymi hodnotami
}

// class decorator ktory nastavuje property entity (dalo by sa to nastavovat v konstruktore ale decorator je menej ukecany)
// ma sa pouzivat len na triedach odvodenych od XFormBase - obmedzenie som vsak nevedel nakodit
// property sa nastavi az po zbehnuti konstruktora
// pozor - decorator je vykopirovany do projektoveho suboru XLibItems.ts, lebo ked je umiestneny tu tak nefunguje pre class-y v projekte!
export function Form(entity: string) {
    // sem (mozno) moze prist registracia formu-u
    return function <T extends { new(...args: any[]): {} }>(constructor: T) {
        return class extends constructor {
            entity = entity;
        }
    }
}

export abstract class XFormBase extends Component<FormProps> {

    entity?: string; // typ objektu, napr. Car, pouziva sa pri citani objektu z DB
    fields: Set<string>; // zoznam zobrazovanych fieldov (vcetne asoc. objektov) - potrebujeme koli nacitavaniu root objektu
    state: {object: XObject | null;}; // poznamka: mohli by sme sem dat aj typ any...

    constructor(props: FormProps) {
        super(props);
        // check
        if (props.id !== undefined && props.object !== undefined) {
            throw "Form cannot have both props id and object defined. Only one of them can be defined.";
        }
        //this.entity = props.entity; - nastavuje sa cez decorator @Form
        let object = null;
        if (props.id === undefined) {
            // add row operation
            if (props.object !== undefined) {
                object = props.object;
            }
            else {
                object = {}; // empty new object
            }
        }
        this.fields = new Set<string>();
        this.state = {
            object: object
        };
        this.onClickSave = this.onClickSave.bind(this);
        this.onClickCancel = this.onClickCancel.bind(this);
    }

    async componentDidMount() {
        // kontrola (musi byt tu, v konstruktore este property nie je nastavena)
        if (this.entity === undefined) {
            throw "XFormBase: Property entity is not defined - use decorator @Form.";
        }
        if (this.props.id !== undefined) {
            console.log('XFormBase.componentDidMount ide nacitat objekt');
            console.log(this.fields);
            const object: XObject = await XUtils.fetchById(this.entity, Array.from(this.fields), this.props.id);
            console.log('XFormBase.componentDidMount nacital objekt:');
            console.log(object);
            // const price = (object as any).price;
            // console.log(typeof price);
            // console.log(price);
            // const date = (object as any).carDate;
            // console.log(typeof date);
            // console.log(date);
            this.setState({object: object});
        }
    }

    getEntity(): string {
        if (this.entity === undefined) {
            throw "Entity is undefined";
        }
        return this.entity;
    }

    getXObject(): XObject {
        if (this.state.object === null) {
            throw "XFormBase: this.state.object is null";
        }
        return this.state.object;
    }

    getObject(): any {
        return this.getXObject() as any;
    }

    onFieldChange(field: string, value: any) {
        const object: XObject = this.getXObject();
        object[field] = value;
        // TODO - tu mozno treba setnut funkciu - koli moznej asynchronicite
        this.setState({object: object});
    }

    onTableFieldChange(assocField: string, rowIndex: number, field: string, value: any) {
        const object: XObject = this.getXObject();
        const rowList: any[] = object[assocField];
        rowList[rowIndex][field] = value;
        // TODO - tu mozno treba setnut funkciu - koli moznej asynchronicite
        this.setState({object: object});
    }

    onObjectDataChange() {
        const object: XObject | null = this.state.object;
        // TODO - tu mozno treba setnut funkciu - koli moznej asynchronicite
        this.setState({object: object});
    }

    onTableAddRow(assocField: string, newRow: any, dataKey?: string, selectedRow?: {}) {
        const object: XObject = this.getXObject();
        const rowList: any[] = object[assocField];
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
        const object: XObject = this.getXObject();
        const rowList: any[] = object[assocField];
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

    async onClickSave() {
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
        const response = await XUtils.post('saveRow', {entity: this.getEntity(), object: this.state.object});
        if (!response.ok) {
            const errorMessage = `Save row failed. Status: ${response.status}, status text: ${response.statusText}`;
            console.log(errorMessage);
            alert(errorMessage);
        }
        else {
            (this.props as any).openForm(null);
        }
    }

    onClickCancel() {
        console.log("zavolany onClickCancel");

        // pre XFormNavigator:
        //this.props.openForm(<CarBrowse openForm={this.props.openForm}/>);
        // openForm pridavame automaticky v XFormNavigator2 pri renderovani komponentu
        // null - vrati sa do predchadzajuceho formularu, z ktoreho bol otvoreny
        (this.props as any).openForm(null);
    }
}