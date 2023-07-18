import {Component} from "react";
import {XObject} from "./XObject";
import {OperationType, XUtils} from "./XUtils";
import {FieldOnChange, XFormComponent} from "./XFormComponent";
import {TableFieldOnChange, XFormDataTable2, XRowTechData} from "./XFormDataTable2";
import {XErrorMap, XErrors} from "./XErrors";

export type XOnSaveOrCancelProp = (object: XObject | null, objectChange: OperationType) => void;

// poznamka - v assoc button-e (XSearchButton, XToOneAssocButton, XFormSearchButtonColumn) je mozne zadat nazov formulara cez property assocForm={<BrandForm/>}
// pri tomto zapise sa nezadava property id (id sa doplni automaticky pri otvoreni assoc formularu cez klonovanie elementu)
// preto umoznujeme aby id mohlo byt undefined
export interface FormProps {
    id?: number;
    object?: XObject; // pri inserte (id je undefined) mozme cez tuto property poslat do formulara objekt s uz nastavenymi niektorymi hodnotami
    onSaveOrCancel?: XOnSaveOrCancelProp; // pouziva sa pri zobrazeni formulara v dialogu (napr. v XAutoCompleteBase) - pri onSave odovzdava updatnuty/insertnuty objekt, pri onCancel odovzdava null
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
    state: {object: XObject | null; errorMap: XErrorMap} | any; // poznamka: mohli by sme sem dat aj typ any...
    // poznamka 2: " | any" sme pridali aby sme mohli do state zapisovat aj neperzistentne atributy typu "this.state.passwordNew"

    xFormComponentList: Array<XFormComponent<any, any>>; // zoznam jednoduchych komponentov na formulari (vcetne XDropdown, XSearchButton, ...)
    xFormDataTableList: Array<XFormDataTable2>; // zoznam detailovych tabuliek (obsahuju zoznam dalsich komponentov)

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
            object: object,
            errorMap: {}
        };
        this.xFormComponentList = [];
        this.xFormDataTableList = [];
        this.onClickSave = this.onClickSave.bind(this);
        this.onClickCancel = this.onClickCancel.bind(this);
    }

    async componentDidMount() {
        //console.log("volany XFormBase.componentDidMount()");
        // kontrola (musi byt tu, v konstruktore este property nie je nastavena)
        if (this.entity === undefined) {
            throw "XFormBase: Property entity is not defined - use decorator @Form.";
        }
        let object: XObject;
        let operationType: OperationType.Insert | OperationType.Update;
        if (this.props.id !== undefined) {
            //console.log('XFormBase.componentDidMount ide nacitat objekt');
            //console.log(this.fields);
            object = await XUtils.fetchById(this.entity, Array.from(this.fields), this.props.id);
            operationType = OperationType.Update;
            //console.log('XFormBase.componentDidMount nacital objekt:');
            //console.log(object);
            // const price = (object as any).price;
            // console.log(typeof price);
            // console.log(price);
            // const date = (object as any).carDate;
            // console.log(typeof date);
            // console.log(date);
        }
        else {
            // add new row
            object = this.state.object;
            operationType = OperationType.Insert;
        }
        this.preInitForm(object, operationType);
        //console.log("volany XFormBase.componentDidMount() - ideme setnut object");
        this.setState({object: object}/*, () => console.log("volany XFormBase.componentDidMount() - callback setState")*/);
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

    isAddRow(): any {
        return this.props.id === undefined;
    }

    onFieldChange(field: string, value: any, error?: string | undefined, onChange?: FieldOnChange, assocObjectChange?: OperationType) {

        const object: XObject = this.getXObject();
        object[field] = value;

        const errorMap: XErrorMap = this.state.errorMap;
        errorMap[field] = {...errorMap[field], onChange: error};

        // tu zavolame onChange komponentu - object uz ma zapisanu zmenenu hodnotu, onChange nasledne zmeni dalsie hodnoty a nasledne sa zavola setState
        if (onChange) {
            onChange({object: object, assocObjectChange: assocObjectChange});
        }

        // TODO - tu mozno treba setnut funkciu - koli moznej asynchronicite
        this.setState({object: object, errorMap: errorMap});
    }

    onTableFieldChange(rowData: any, field: string, value: any, error?: string | undefined, onChange?: TableFieldOnChange, assocObjectChange?: OperationType) {

        const object: XObject = this.getXObject();
        rowData[field] = value;

        // nastavime error do rowData do tech fieldu
        const errorMap: XErrorMap = XFormBase.getXRowTechData(rowData).errorMap;
        errorMap[field] = {...errorMap[field], onChange: error};

        // tu zavolame onChange komponentu - object uz ma zapisanu zmenenu hodnotu, onChange nasledne zmeni dalsie hodnoty a nasledne sa zavola setState
        if (onChange) {
            onChange({object: object, tableRow: rowData, assocObjectChange: assocObjectChange});
        }

        // TODO - tu mozno treba setnut funkciu - koli moznej asynchronicite
        this.setState({object: object/*, errorMap: errorMap*/});
    }

    /**
     * @deprecated - mal by sa pouzivat onTableFieldChange
     */
    onObjectDataChange(row?: any, onChange?: TableFieldOnChange) {
        const object: XObject | null = this.state.object;

        // tu zavolame onChange komponentu - object uz ma zapisanu zmenenu hodnotu, onChange nasledne zmeni dalsie hodnoty a nasledne sa zavola setState
        if (onChange) {
            // TODO - assocObjectChange dorobit
            onChange({object: object, tableRow: row, assocObjectChange: undefined});
        }

        // TODO - tu mozno treba setnut funkciu - koli moznej asynchronicite
        this.setState({object: object});
    }

    // lepsi nazov ako onObjectDataChange
    // ak niekto zmenil this.state.object alebo this.state.errorMap, zmena sa prejavi vo formulari
    // pouzivame napr. po zavolani onChange na XInputText
    setStateXForm() {
        // TODO - je to ok ze object menime takto?
        // TODO - tu mozno treba setnut funkciu - koli moznej asynchronicite
        this.setState({object: this.state.object, errorMap: this.state.errorMap});
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
        if (index === -1) {
            throw "Unexpected error - element 'row' not found in 'rowList'";
        }
        rowList.splice(index, 1);
        // TODO - tu mozno treba setnut funkciu - koli moznej asynchronicite
        this.setState({object: object});
    }

    // tato metoda (aj vsetky ostatne metody precujuce s row-mi) by mali byt skor na XFormDataTable2 (ta pozna "assocField" (OneToMany asociaciu))
    static getXRowTechData(row: any): XRowTechData {
        // ak este nemame rowTechData, tak ho vytvorime
        if (row.__x_rowTechData === undefined) {
            // field '__x_rowTechData' vytvorime takymto specialnym sposobom, aby mal "enumerable: false", tympadom ho JSON.stringify nezaserializuje
            // pri posielani objektu formulara na backend (pozor, zaroven sa neda tento field iterovat cez in operator a pod.)
            const xRowTechData: XRowTechData = {xFormComponentDTList: [], errorMap: {}};
            Object.defineProperty(row, '__x_rowTechData', {
                value: xRowTechData,
                writable: false,
                enumerable: false
            });
        }
        return row.__x_rowTechData;
    }

    addField(field: string) {
        this.fields.add(field);
    }

    addXFormComponent(xFormComponent: XFormComponent<any, any>) {
        this.xFormComponentList.push(xFormComponent);
    }

    findXFormComponent(field: string): XFormComponent<any, any> | undefined {
        // TODO - vytvorit mapu (field, ref(xFormComponent)), bude to rychlejsie
        // vytvorit len mapu (a list zrusit) je problem - mozme mat pre jeden field viacero (napr. asociacnych) componentov
        for (const xFormComponent of this.xFormComponentList) {
            if (xFormComponent.getField() === field) {
                return xFormComponent;
            }
        }
        return undefined;
    }

    addXFormDataTable(xFormDataTable: XFormDataTable2) {
        this.xFormDataTableList.push(xFormDataTable);
    }

    formReadOnlyBase(field: string): boolean {
        // TODO - bude this.state.object vzdycky !== undefined?
        return this.formReadOnly(this.state.object, field);
    }

    async onClickSave() {
        //console.log("zavolany onClickSave");

        if (!this.validateSave()) {
            return;
        }

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

        this.preSave(this.state.object);

        const isAddRow = this.isAddRow();

        //console.log(this.state.object);
        let object: XObject;
        try {
            object = await this.saveRow();
        }
        catch (e) {
            XUtils.showErrorMessage("Save row failed.", e);
            return; // zostavame vo formulari
        }

        if (this.props.onSaveOrCancel !== undefined) {
            // formular je zobrazeny v dialogu
            this.props.onSaveOrCancel(object, isAddRow ? OperationType.Insert : OperationType.Update);
        }
        else {
            (this.props as any).openForm(null); // standardny rezim; save zbehol, ideme naspet do browsu
        }
    }

    onClickCancel() {
        if (this.props.onSaveOrCancel !== undefined) {
            this.props.onSaveOrCancel(null, OperationType.None); // formular je zobrazeny v dialogu
        }
        else {
            // standardny rezim
            // openForm pridavame automaticky v XFormNavigator2 pri renderovani komponentu
            // null - vrati sa do predchadzajuceho formularu, z ktoreho bol otvoreny
            (this.props as any).openForm(null);
        }
    }

    validateSave(): boolean {

        const xErrorMap: XErrorMap = this.validateForm();

        // zatial takto jednoducho
        let msg: string = XUtils.getErrorMessages(xErrorMap);

        // este spracujeme editovatelne tabulky
        for (const xFormDataTable of this.xFormDataTableList) {
            msg += xFormDataTable.getErrorMessages();
        }

        let ok: boolean = true;
        if (msg !== "") {
            alert(msg);
            ok = false;
        }

        return ok;
    }

    validateForm(): XErrorMap {
        const xErrorMap: XErrorMap = this.fieldValidation();

        // form validation
        const xErrors: XErrors = this.validate(this.getXObject());
        for (const [field, error] of Object.entries(xErrors)) {
            if (error) {
                // skusime zistit label
                const xFormComponent: XFormComponent<any, any> | undefined = this.findXFormComponent(field);
                const fieldLabel: string | undefined = xFormComponent ? xFormComponent.getLabel() : undefined;
                xErrorMap[field] = {...xErrorMap[field], form: error, fieldLabel: fieldLabel};
            }
        }

        // TODO - optimalizacia - netreba setovat stav ak by sme sli prec z formulara (ak by zbehla validacia aj save a isli by sme naspet do browsu)
        // setujeme aj this.state.object, lebo mohli pribudnut/odbudnut chyby na rowData v editovatelnych tabulkach
        this.setState({object: this.state.object, errorMap: xErrorMap});
        return xErrorMap;
    }

    fieldValidation(): XErrorMap {
        const xErrorMap: XErrorMap = {};
        for (const xFormComponent of this.xFormComponentList) {
            const errorItem = xFormComponent.validate();
            if (errorItem) {
                //console.log("Mame field = " + errorItem.field);
                xErrorMap[errorItem.field] = errorItem.xError;
            }
        }
        for (const xFormDataTable of this.xFormDataTableList) {
            xFormDataTable.validate();
        }
        return xErrorMap;
    }

    // this method can be overriden in subclass if needed
    // (the purpose is to put the whole form to read only mode (maybe with exception a few fields))
    // if returns true for the param "field", then the field is read only, otherwise the property readOnly of the XInput* is processed
    formReadOnly(object: XObject, field: string): boolean {
        return false;
    }

    // this method can be overriden in subclass if needed (to modify/save object after read from DB and before set into the form)
    preInitForm(object: XObject, operationType: OperationType.Insert | OperationType.Update) {
    }

    // this method can be overriden in subclass if needed (custom validation)
    validate(object: XObject): XErrors {
        return {};
    }

    // this method can be overriden in subclass if needed (to modify object before save)
    preSave(object: XObject) {
    }

    // this method can be overriden in subclass if needed (to use another service then default 'saveRow')
    async saveRow(): Promise<any> {
        return XUtils.fetch('saveRow', {entity: this.getEntity(), object: this.state.object, reload: this.props.onSaveOrCancel !== undefined});
    }
}