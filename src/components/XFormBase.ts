import React, {Component} from "react";
import {XObject} from "./XObject";
import {OperationType, XUtils} from "./XUtils";
import {XFieldOnChange, XFormComponent} from "./XFormComponent";
import {XTableFieldOnChange, XFormDataTable2, XRowTechData} from "./XFormDataTable2";
import {XErrorMap, XErrors} from "./XErrors";
import {XUtilsCommon} from "../serverApi/XUtilsCommon";
import {XEntity} from "../serverApi/XEntityMetadata";
import {XUtilsMetadataCommon} from "../serverApi/XUtilsMetadataCommon";
import {XFindRowByIdResponse, XUnlockRowRequest} from "../serverApi/x-lib-api";
import {dateFromModel, datetimeAsUI} from "../serverApi/XUtilsConversions";
import {xLocaleOption} from "./XLocale";

export type XOnSaveOrCancelProp = (object: XObject | null, objectChange: OperationType) => void;

// poznamka - v assoc button-e (XSearchButton, XToOneAssocButton, XFormSearchButtonColumn) je mozne zadat nazov formulara cez property assocForm={<BrandForm/>}
// pri tomto zapise sa nezadava property id (id sa doplni automaticky pri otvoreni assoc formularu cez klonovanie elementu)
// preto umoznujeme aby id mohlo byt undefined
export interface XFormProps {
    ref?: React.Ref<XFormBase>;
    id?: number;
    initValues?: object; // pri inserte (id je undefined) mozme cez tuto property poslat do formulara default hodnoty ktore sa nastavia do objektu vytvoreneho v metode this.createNewObject(): XObject
    onSaveOrCancel?: XOnSaveOrCancelProp; // pouziva sa pri zobrazeni formulara v dialogu (napr. v XAutoCompleteBase) - pri onSave odovzdava updatnuty/insertnuty objekt, pri onCancel odovzdava null,
                                            // pouziva sa aj pri navrate do browsu - v tejto metode sa zavola reread browsu
    isInDialog?: boolean; // flag, if form is opened in Dialog (usually true)
}

// class decorator ktory nastavuje property entity (dalo by sa to nastavovat v konstruktore ale decorator je menej ukecany)
// ma sa pouzivat len na triedach odvodenych od XFormBase - obmedzenie som vsak nevedel nakodit
// property sa nastavi az po zbehnuti konstruktora
// pozor - decorator je vykopirovany do projektoveho suboru XLibItems.ts, lebo ked je umiestneny tu tak nefunguje pre class-y v projekte!
export function Form(entity: string, pessimisticLocking?: boolean) {
    // sem (mozno) moze prist registracia formu-u
    return function <T extends { new(...args: any[]): {} }>(constructor: T) {
        return class extends constructor {
            entity = entity;
            pessimisticLocking = pessimisticLocking ?? false;
        }
    }
}

export abstract class XFormBase extends Component<XFormProps> {

    entity?: string; // typ objektu, napr. Car, pouziva sa pri citani objektu z DB
    xEntity: XEntity | undefined; // zistene podla this.entity

    formDataChanged: boolean; // true if user changed some attribute of the form - used (only) to create confirm if user clicks cancel

    pessimisticLocking?: boolean; // true if the form uses pessimistic locking (default is optimistic locking if the attribute "version" is available)
    rowLocked: boolean; // used by pessimistic locking, true if row was successfully locked
    readOnly: boolean; // used if the lock was not acquired (other user holds the lock)

    fields: Set<string>; // zoznam zobrazovanych fieldov (vcetne asoc. objektov) - potrebujeme koli nacitavaniu root objektu
    state: {object: XObject | null; errorMap: XErrorMap} | any; // poznamka: mohli by sme sem dat aj typ any...
    // poznamka 2: " | any" sme pridali aby sme mohli do state zapisovat aj neperzistentne atributy typu "this.state.passwordNew"

    xFormComponentList: Array<XFormComponent<any, any>>; // zoznam jednoduchych komponentov na formulari (vcetne XDropdown, XSearchButton, ...)
    xFormDataTableList: Array<XFormDataTable2>; // zoznam detailovych tabuliek (obsahuju zoznam dalsich komponentov)
    assocToValidateList: Array<string>; // zoznam oneToMany asociacii, pre ktore sa zavola spracovanie vysledku validacie ktory je ulozny v xRowTechData (pouzivane pre specialnu custom validaciu)
    assocToSortList: Array<{assoc: string; sortField: string;}>; // zoznam oneToMany asociacii, ktore po nacitani z DB zosortujeme podla daneho fieldu (zvycajne id)

    // special flag - application can set this flag if the form uses component TabView
    // as a result, the width of components XFormScrollable and XFormDataTable2 will be proper adjusted (the margin of TabPanel will be subtracted from 100vw)
    // (it is important for mobile display)
    tabViewUsed: boolean;

    constructor(props: XFormProps) {
        super(props);
        // check
        if (props.id !== undefined && props.initValues !== undefined) {
            throw "Form cannot have both props id and initValues defined. Only one of them can be defined.";
        }
        //this.entity = props.entity; - nastavuje sa cez decorator @Form
        //this.pessimisticLocking - nastavuje sa cez decorator @Form
        this.formDataChanged = false; // default
        this.rowLocked = false; // default
        this.readOnly = false; // default
        let object = null;
        // if (props.id === undefined) {
        //     // add row operation
        //     if (props.object !== undefined) {
        //         object = props.object;
        //     }
        //     else {
        //         object = {}; // empty new object
        //     }
        // }
        this.fields = new Set<string>();
        this.state = {
            object: object,
            errorMap: {}
        };
        this.xFormComponentList = [];
        this.xFormDataTableList = [];
        this.assocToValidateList = [];
        this.assocToSortList = [];
        this.tabViewUsed = false; // default
        this.onClickSave = this.onClickSave.bind(this);
        this.onClickCancel = this.onClickCancel.bind(this);
    }

    async componentDidMount() {
        //console.log("volany XFormBase.componentDidMount()");
        // kontrola (musi byt tu, v konstruktore este property nie je nastavena)
        if (this.entity === undefined || this.pessimisticLocking === undefined) {
            throw "XFormBase: Property entity is not defined - use decorator @Form.";
        }
        this.xEntity = XUtilsMetadataCommon.getXEntity(this.entity);

        let object: XObject;
        let operationType: OperationType.Insert | OperationType.Update;
        if (this.props.id !== undefined) {
            //console.log('XFormBase.componentDidMount ide nacitat objekt');
            object = await this.loadObjectLegacy(this.props.id);
            operationType = OperationType.Update;

            // sortovanie, aby sme nemuseli sortovat v DB (neviem co je efektivnejsie)
            for (const assocToSort of this.assocToSortList) {
                const assocRowList: any[] = object[assocToSort.assoc];
                if (assocRowList) {
                    object[assocToSort.assoc] = XUtilsCommon.arraySort(assocRowList, assocToSort.sortField);
                }
            }

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
            object = this.createNewObject();
            // if object is {} then call async version
            if (Object.keys(object).length === 0) {
                object = await this.createNewObjectAsync();
            }
            // pridame pripadne "init values", ktore pridu cez prop object (pouziva sa napr. pri insertovani cez XAutoComplete na predplnenie hodnoty)
            if (this.props.initValues !== undefined) {
                object = {...object, ...this.props.initValues}; // values from this.props.initValues will override values from object (if key is the same)
            }
            operationType = OperationType.Insert;
        }
        this.preInitForm(object, operationType);
        //console.log("volany XFormBase.componentDidMount() - ideme setnut object");
        this.setState({object: object}/*, () => console.log("************** volany XFormBase.componentDidMount() - callback setState")*/);
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

    setFormDataChanged(formDataChanged: boolean) {
        this.formDataChanged = formDataChanged;
    }

    isAddRow(): boolean {
        // povodny kod
        //return this.props.id === undefined;
        // aby sme mohli zmenit insert na update (napr. ak po kontrole id fieldov zistime ze zaznam existuje), tak zistujeme id-cko z this.state.object
        let isAddRow: boolean = false; // default
        if (this.state.object && this.xEntity) {
            isAddRow = this.state.object[this.xEntity.idField] === undefined;
        }
        return isAddRow;
    }

    // helper method
    isInDialog(): boolean {
        return this.props.isInDialog ?? false;
    }

    // helper method
    isTabViewUsed(): boolean {
        return this.tabViewUsed;
    }

    setTabViewUsed(tabViewUsed: boolean) {
        this.tabViewUsed = tabViewUsed;
    }

    onFieldChange(field: string, value: any, error?: string | undefined, onChange?: XFieldOnChange, assocObjectChange?: OperationType) {

        // field moze byt aj na asociovanom objekte (field length > 1, napr.: <assocX>.<fieldY>)
        // v takom pripade sa do errorMap zapise ako key cely field <assocX>.<fieldY>
        // (zlozitejsie riesenie by bolo zapisovat errors do specialneho technickeho atributu asociovaneho objektu ale zatial to nechame takto jednoducho)

        const object: XObject = this.getXObject();
        XUtilsCommon.setValueByPath(object, field, value);

        const errorMap: XErrorMap = this.state.errorMap;
        errorMap[field] = {...errorMap[field], onChange: error};

        // tu zavolame onChange komponentu - object uz ma zapisanu zmenenu hodnotu, onChange nasledne zmeni dalsie hodnoty a nasledne sa zavola setState
        if (onChange) {
            onChange({object: object, assocObjectChange: assocObjectChange});
        }

        this.setState({object: object, errorMap: errorMap});

        this.setFormDataChanged(true);
    }

    onTableFieldChange(rowData: any, field: string, value: any, error?: string | undefined, onChange?: XTableFieldOnChange, assocObjectChange?: OperationType) {

        const object: XObject = this.getXObject();
        rowData[field] = value;

        // nastavime error do rowData do tech fieldu
        const errorMap: XErrorMap = XFormBase.getXRowTechData(rowData).errorMap;
        errorMap[field] = {...errorMap[field], onChange: error};

        // tu zavolame onChange komponentu - object uz ma zapisanu zmenenu hodnotu, onChange nasledne zmeni dalsie hodnoty a nasledne sa zavola setState
        if (onChange) {
            onChange({object: object, tableRow: rowData, assocObjectChange: assocObjectChange});
        }

        this.setState({object: object/*, errorMap: errorMap*/});

        this.setFormDataChanged(true);
    }

    /**
     * @deprecated - mal by sa pouzivat onTableFieldChange
     */
    onObjectDataChange(row?: any, onChange?: XTableFieldOnChange) {
        const object: XObject | null = this.state.object;

        // tu zavolame onChange komponentu - object uz ma zapisanu zmenenu hodnotu, onChange nasledne zmeni dalsie hodnoty a nasledne sa zavola setState
        if (onChange) {
            // TODO - assocObjectChange dorobit
            onChange({object: object, tableRow: row, assocObjectChange: undefined});
        }

        this.setState({object: object});
    }

    // lepsi nazov ako onObjectDataChange
    // ak niekto zmenil this.state.object alebo this.state.errorMap, zmena sa prejavi vo formulari
    // pouzivame napr. po zavolani onChange na XInputText
    // callback je zavolany, ked dobehne update formulara (mozme pouzit na dalsi update formulara, ktory potrebuje aby boli vsetky komponenty vytvorene)
    setStateXForm(callback?: () => void) {
        // TODO - je to ok ze object menime takto?
        this.setState({object: this.state.object, errorMap: this.state.errorMap}, callback);
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
        this.setState({object: object});

        this.setFormDataChanged(true);
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

        this.setState({object: object});

        this.setFormDataChanged(true);
    }

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

    addAssocToValidate(oneToManyAssoc: string) {
        this.assocToValidateList.push(oneToManyAssoc);
    }

    addAssocToSort(oneToManyAssoc: string, sortField: string) {
        this.assocToSortList.push({assoc: oneToManyAssoc, sortField: sortField});
    }

    formReadOnlyBase(field: string): boolean {
        // TODO - bude this.state.object vzdycky !== undefined?
        return this.formReadOnly(this.state.object, field);
    }

    async onClickSave() {

        if (!await this.validateSave()) {
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
            this.openFormNull();
        }
    }

    onClickCancel() {
        this.cancelEdit();
    }

    openFormNull() {
        // deprecated functionality used when XFormNavigator (deprecated) used
        // standardny rezim
        // openForm pridavame automaticky v XFormNavigator pri renderovani komponentu
        // null - vrati sa do predchadzajuceho formularu, z ktoreho bol otvoreny
        if (typeof (this.props as any).openForm === 'function') {
            (this.props as any).openForm(null);
        }
        else {
            // warning
            console.log(`Form has no onSaveOrCancel method declared.`);
        }
    }

    // API function called upon cancel of edit/show of the form
    // also outer components call this function, e.g XFormDialog, (legacy XMenu in depaul project)
    // returns false if cancel was stopped (not confirmed) by user
    cancelEdit(): boolean {
        // confirm cancel if data was changed
        if (this.formDataChanged) {
            if (!window.confirm(xLocaleOption('cancelEditConfirm'))) {
                return false; // stops canceling editing, the form stays open (because this.props.onSaveOrCancel is not called)
            }
        }

        this.unlockRow();

        if (this.props.onSaveOrCancel !== undefined) {
            this.props.onSaveOrCancel(null, OperationType.None); // formular je zobrazeny v dialogu
        }
        else {
            this.openFormNull();
        }

        return true;
    }

    async validateSave(): Promise<boolean> {

        const xErrorMap: XErrorMap = await this.validateForm();

        // zatial takto jednoducho
        let msg: string = XUtils.getErrorMessages(xErrorMap);

        // este spracujeme editovatelne tabulky
        for (const xFormDataTable of this.xFormDataTableList) {
            //msg += xFormDataTable.getErrorMessages();
            msg += this.getErrorMessagesForAssoc(xFormDataTable.props.assocField);
        }

        // este spracujeme oneToMany asociacie, ktore boli explicitne uvedene, ze ich treba validovat
        // (validaciu treba nakodit vo formulari, zavolat z metody validate() a ukoncit zavolanim XFormBase.saveErrorsIntoXRowTechData)
        for (const assocToValidate of this.assocToValidateList) {
            msg += this.getErrorMessagesForAssoc(assocToValidate);
        }

        let ok: boolean = true;
        if (msg !== "") {
            alert(msg);
            ok = false;
        }

        return ok;
    }

    async validateForm(): Promise<XErrorMap> {
        const xErrorMap: XErrorMap = this.fieldValidation();

        // form validation
        const xErrors: XErrors = await this.validate(this.getXObject());
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

    getErrorMessagesForAssoc(oneToManyAssoc: string): string {
        let msg: string = "";
        const object: XObject = this.getXObject();
        const rowList: any[] = object[oneToManyAssoc];
        if (!Array.isArray(rowList)) {
            throw `Array for the assoc ${oneToManyAssoc} not found in the form object`;
        }
        for (const row of rowList) {
            const xRowTechData: XRowTechData = XFormBase.getXRowTechData(row);
            msg += XUtils.getErrorMessages(xRowTechData.errorMap);
        }
        return msg;
    }

    // can be called from AppForm in case of custom validation on oneToMany assoc
    static saveErrorsIntoXRowTechData(row: any, xErrors: XErrors) {
        const xErrorMap: XErrorMap = {};
        for (const [field, error] of Object.entries(xErrors)) {
            if (error) {
                xErrorMap[field] = {form: error};
            }
        }
        const xRowTechData: XRowTechData = XFormBase.getXRowTechData(row);
        xRowTechData.errorMap = xErrorMap;
    }

    // this method can be overriden in subclass if needed
    // (the purpose is to put the whole form to read only mode (maybe with exception a few fields))
    // if returns true for the param "field", then the field is read only, otherwise the property readOnly of the XInput* is processed
    formReadOnly(object: XObject, field: string): boolean {
        return this.readOnly;
    }

    // this method can be overriden in subclass if needed (to set some default values for insert)
    createNewObject(): XObject {
        return {};
    }

    // this method can be overriden in subclass if needed (to set some default values for insert)
    // if createNewObject() returns empty object {}, then createNewObjectAsync() is called
    async createNewObjectAsync(): Promise<XObject> {
        return {};
    }

    // this method can be overriden in subclass if needed (custom load object)
    // legacy way of loading object
    async loadObjectLegacy(id: number): Promise<XObject> {
        // in constructor, member pessimisticLocking is still not set, that's why here we add the "lockXUser.name"
        if (this.pessimisticLocking) {
            this.addField("lockXUser.name");
        }
        const xFindRowByIdResponse: XFindRowByIdResponse = await XUtils.fetchByIdWithLock(this.entity!, Array.from(this.fields), id, this.pessimisticLocking!);
        let object: any = xFindRowByIdResponse.row;
        if (this.pessimisticLocking) {
            if (!xFindRowByIdResponse.lockAcquired) {
                if (window.confirm(xLocaleOption('pessimisticLockNotAcquired', {lockXUser: object.lockXUser?.name, lockDate: datetimeAsUI(dateFromModel(object.lockDate))}))) {
                    // overwrite the lock in DB
                    const xFindRowByIdResponse: XFindRowByIdResponse = await XUtils.fetchByIdWithLock(this.entity!, Array.from(this.fields), id, this.pessimisticLocking, true);
                    object = xFindRowByIdResponse.row;
                    this.rowLocked = true;
                }
                else {
                    // open form in read only mode
                    this.readOnly = true;
                }
            }
            else {
                this.rowLocked = true;
            }
        }
        return object;
    }

    // this method can be overriden in subclass if needed (to modify/save object after read from DB and before set into the form)
    preInitForm(object: XObject, operationType: OperationType.Insert | OperationType.Update) {
    }

    // this method can be overriden in subclass if needed (custom validation)
    async validate(object: XObject): Promise<XErrors> {
        return {};
    }

    // this method can be overriden in subclass if needed (to modify object before save)
    preSave(object: XObject) {
    }

    // this method can be overriden in subclass if needed (to use another service then default 'saveRow')
    async saveRow(): Promise<any> {
        return XUtils.fetch('saveRow', {entity: this.getEntity(), object: this.state.object, reload: this.props.onSaveOrCancel !== undefined});
    }

    // this method can be overriden in subclass if needed (custom unlock row)
    async unlockRow() {
        if (this.rowLocked) {
            const xUnlockRowRequest: XUnlockRowRequest = {
                entity: this.getEntity(),
                id: this.state.object[this.xEntity!.idField],
                lockDate: this.state.object.lockDate,
                lockXUser: this.state.object.lockXUser
            };
            await XUtils.post('x-unlock-row', xUnlockRowRequest);
            this.rowLocked = false;
        }
    }
}