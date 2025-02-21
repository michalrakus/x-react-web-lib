import React from "react";
import {numberAsUI, numberFromModel} from "../../serverApi/XUtilsConversions";

// sem pride v buducnosti cely XFieldSetBase, zatial su tu skopirovane len niektore typy

// zodpoveda entite XFieldSetMeta
export interface XFieldSetMeta {
    id?: number;
    fieldSetId: string; // cez toto id bude field set referencovany v kode
    //table: string;
    xFieldMetaRoot: XFieldMeta; // root field (neda sa zmazat)
    modifDate: Date | null;
    modifXUser: any | null;
    version: number;
}

export enum XFieldType {
    rootField = "rootField", // specialny root field
    fieldGroup = "fieldGroup", // obsahuje skupinku fieldov, nema DB stlpec (neperzistentny)
    fieldGroupWithCheckbox = "fieldGroupWithCheckbox", // obsahuje skupinku fieldov, skupinka sa zobrazi ak je checkbox zaskrtnuty
    checkbox = "checkbox", // klasicky dvojstavovy checkbox
    checkboxNullable = "checkboxNullable", // trojstavovy checkbox true/false/null
    inputText = "inputText",
    inputDecimal = "inputDecimal"
}

// children layout sa da nastavit len na type, ktory ma children - rootField, fieldGroup
export enum XChildrenLayout {
    column = "column",  // default - vyrenderuje children do stlpca
    row = "row",        // vyrenderuje children do riadku
    tabView = "tabView", // ma zmysel, ak su children typu fieldGroup (labely tychto children fieldGroup-ov budu pouzite ako labely jednotlivych tab-iek)
    tabViewWithHeaderGroup = "tabViewWithHeaderGroup" // to iste co tabView ale prvy fieldGroup (0-ty tab) zobrazi nad tabView (aby bol vzdy pristupny)
}
// poznamka - tabView a tabViewWithHeaderGroup odignoruju bezne simple children - ak take budu existovat, zobrazi sa uzivatelovi warning pri nastaveni tabView

// pouzijeme len checkbox supressFieldGroupPanel
// pouziva sa len pre typ fieldGroup a len v pripade ak dany fieldGroup nie je vyrenderovany v nejakej tab-ke (jeho parent ma nastaveny layout tabView*)
// export enum XFieldGroupPanelViewStatus {
//     show = "show",  // default - vyrenderuje Panel aj s labelom a vo vnutri panelu umiestni children
//     hide = "hide"   // nerenderuje Panel, children umiestni do div elementu (label sa nepouzije) - pouziva sa na vytvorenie stlpcov v (parent) fieldGroup-e
// }

export enum XFieldPropValuesFrom {
    parent = "parent",  // field prop values preberame z parenta
    this = "this"       // field prop values preberame z current fieldu
}

export interface XFieldMeta {
    type?: XFieldType;
    childrenLayout?: XChildrenLayout; // pouziva sa len na type, ktory ma children - rootField, fieldGroup (default hodnota je "column")
    width?: string; // hodnota napr. 10rem, pouziva sa hlavne ak childrenLayout = column
    labelWidth?: string; // hodnota napr. 6rem, pouziva sa (zatial) len pre type = inputText (default nastaveny cez css je 100% - sposobi odsunutie/zarovanie inputu doprava)
    inputWidth?: string; // hodnota napr. 4rem, pouziva sa (zatial) len pre type = inputText
    suppressFieldGroupPanel?: true; // pouziva sa len pre typ fieldGroup a len v pripade ak dany fieldGroup nie je vyrenderovany v nejakej tab-ke (jeho parent ma nastaveny layout tabView*)
                                    // ak true tak nerenderuje Panel, children umiestni do div elementu (label sa nepouzije) - pouziva sa na vytvorenie stlpcov v (parent) fieldGroup-e
    field: string; // pouziva sa v kode a zaroven je to nazov stlpca - napr. obciansky_preukaz
    label: string; // pouzije sa vo formulari ako label
    tooltip?: string; // pouzije sa vo formulari ako tooltip
    decimalProps?: {scale: number;}; // pouzivane pre inputDecimal (scale = pocet des. miest), mozno v buducnosti pridame precision (pocet cifier vcetne scale) a useGrouping
    //notNull: boolean; // default false, notNull mozu byt len tie stlpce ktore su vzdy vyplnene (bud maju vyplnenu defaultValue alebo su vzdy viditelne (nemaju vyplnene dateFrom/dateTo))
    //defaultValue: String; // toto je problem, musime to tu zapisat v UI formate!
    dateFrom?: Date;
    dateTo?: Date;
    xFieldMetaList?: XFieldMeta[];
    fieldPropValuesMapForEdit?: XFieldPropValuesMapForEdit; // ak pouzijeme parameter "fieldProps", tak sem sa ukladaju hodnoty vykliknute v XEditFieldDialog
    fieldPropValuesMapCached?: XFieldPropValuesMap; // to iste co fieldPropValuesMapForEdit ale je zohladneny aj pripadny valuesFrom === parent, neuklada sa do DB, vypocitava sa po nacitani z DB
    xFieldMetaParentCached?: XFieldMeta; // pomocny atribut aby sme si zjednodusili kod a nemuseli vsade pretlacat parameter s parentom, neuklada sa do DB, vypocitava sa po nacitani z DB
}

export interface XFieldPropValuesMapForEdit {
    [field: string]: XFieldPropValuesForEdit; // id-cko je XFieldProp.id
}

export interface XFieldPropValuesMap {
    [field: string]: XFieldPropValues; // id-cko je XFieldProp.id
}

export interface XFieldPropValuesForEdit {
    valuesFrom: XFieldPropValuesFrom; // hodnota dropdownu "Values from"
    values?: XFieldPropValues; // ak valuesFrom = "this" tak tu su vykliknute items, inac je tu undefined (bez atributu values)
    error?: string; // specialny atribut kam si odkladame chybu z autocomplete (iba pri editacii sa pouziva (po skonceni editacie je vzdy undefined))
}

// presny typ urcuje pouzity <Name>FieldPropEdit - moze tu byt boolean, number, object
export type XFieldPropValues = any | undefined;

// datova struktura na vytvorenie specifickych aplikacnych atributov zadavanych v XEditFieldDialog
// pole instancii tejto struktury prichadza ako parameter fieldProps do komponentu XFieldSet
export interface XFieldProp {
    id: string;
    label: string;
    fieldPropEdit?: JSX.Element; // fieldPropEdit je komponent na editaciu fieldProp, ma props typu XFieldPropEditProps
}

// specialny interface (api) pre custom komponent (nazyvany <Name>FieldPropEdit),
// vdaka tomuto interface sa v XEditFieldDialog zobrazi/zaintegruje custom component,
// ktory sluzi na editaciu custom property (tato property moze mat lubovolnu strukturu (object literal))
// (funguje to podobne ako napr. property searchBrowse v XAutoComplete - do property searchBrowse sa zapise browse component
// a XAutoComplete pouziva tento browse component)
export interface XFieldPropEditProps {
    value?: XFieldPropValues;
    onChange?: (value: XFieldPropValues) => void;
    onErrorChange?: (error: (string | undefined)) => void;
}

// datova struktura do ktorej si zapisujeme hodnoty fieldov (struktura sa zapisuje do DB do stlpca <jsonField>)
export interface XFieldSetValues {
    [field: string]: any;
}

// map sluziaci na rychle vyhladavanie XFieldMeta (hlavne pri renderovani klikaciek v browse)
export type XFieldXFieldMetaMap = Map<string, XFieldMeta>;

// zatial provizorne len na staticke metody
export class XFieldSetBase {

    // api metoda na vytvorenie Map instancie, ktora sluzi na rychle najdenie prislusneho XFieldMeta podla nazvu fieldu
    // ak je zadany filterFromParent, tak vracia len children/subchildren/... fieldu s field = filterFromParent
    // (filterFromParent je casto groupField)
    static createXFieldXFieldMetaMap(xFieldSetMeta: XFieldSetMeta, filterFromParent?: string): XFieldXFieldMetaMap {

        const xFieldXFieldMetaMap: XFieldXFieldMetaMap = new Map<string, XFieldMeta>();
        XFieldSetBase.createMapForXFieldMeta(xFieldSetMeta.xFieldMetaRoot, filterFromParent, xFieldXFieldMetaMap);
        return xFieldXFieldMetaMap;
    }

    // api metoda na vyrenderovanie field set atributu
    // logicky patri do src/serverApi/XUtilsConversions.ts a zisla by sa aj pri exporte do excelu ale XFieldXFieldMetaMap (a jeho "parent"-a XFieldSetBase) mame len na frontende
    static xFieldSetValuesAsUI(xFieldSetValues: XFieldSetValues, xFieldXFieldMetaMap: XFieldXFieldMetaMap): string {
        // budeme mat vzdy spravne poradie? nebudeme... asi najjednoduchsie zosortovat tu "valueUIList" podla abecedy
        const valueUIList: string[] = [];
        for (const [field, value] of Object.entries(xFieldSetValues)) {
            const xFieldMeta: XFieldMeta | undefined = xFieldXFieldMetaMap.get(field);
            if (xFieldMeta) {
                valueUIList.push(XFieldSetBase.xFieldSetValueAsUI(xFieldMeta, value));
            }
            else {
                // field bol z formulara odstraneny (nemalo by sa to takto pouzivat, skor by sa mala datumom ohranicit platnost fieldu)
                // zobrazime v surovom stave
                valueUIList.push(`${field}: ${typeof value === 'string' ? '"' + value + '"' : value}`);
            }
        }
        return valueUIList.join(", ");
    }

    static xFieldSetValueAsUI(xFieldMeta: XFieldMeta, value: any): string {
        let valueAsUI: string;
        if (xFieldMeta.type === XFieldType.checkbox) {
            valueAsUI = xFieldMeta.label;
        }
        else if (xFieldMeta.type === XFieldType.inputText) {
            valueAsUI = `${xFieldMeta.label}: "${value}"`;
        }
        else if (xFieldMeta.type === XFieldType.inputDecimal) {
            valueAsUI = `${xFieldMeta.label}: ${numberAsUI(numberFromModel(value), xFieldMeta.decimalProps?.scale)}`;
        }
        else {
            // neznamy typ
            valueAsUI = `${xFieldMeta.label}: "${value}"`;
        }
        return valueAsUI;
    }

    private static createMapForXFieldMeta(xFieldMeta: XFieldMeta, filterFromParent: string | undefined, xFieldXFieldMetaMap: XFieldXFieldMetaMap) {

        if (filterFromParent === undefined) {
            // no filter is used
            xFieldXFieldMetaMap.set(xFieldMeta.field, xFieldMeta);
        }
        else if (filterFromParent === xFieldMeta.field) {
            // the searched parent field has been found, all his children/subchildren/... will be added to the list (we remove the filter)
            filterFromParent = undefined;
        }

        if (xFieldMeta.xFieldMetaList) {
            for (const insideXFieldMeta of xFieldMeta.xFieldMetaList) {
                XFieldSetBase.createMapForXFieldMeta(insideXFieldMeta, filterFromParent, xFieldXFieldMetaMap);
            }
        }
    }
}