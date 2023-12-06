function generateApi(cb) {

    // const file = require('gulp-file');
    // const {dest} = require('gulp');

    // return file('XLazyDataTable.d.ts', "export * from './lib/components/XLazyDataTable';", {src: true})
    //     .pipe(file('XLazyDataTable.js', "'use strict';\n\nmodule.exports = require('./lib/components/XLazyDataTable.js');"))
    //     .pipe(dest('.'));

    // TODO - vymazat subory *.d.ts a *.js (okrem gulpfile.js)

    // toto sa mi zda jednoduchsie
    const fs = require('fs');

    const apiFileList = [
        "./lib/administration/XUserBrowse",
        "./lib/administration/XUserForm",
        "./lib/administration/XBrowseMetaBrowse",
        "./lib/administration/XBrowseMetaForm",

        "./lib/components/useXToken",
        "./lib/components/XAutoComplete",
        "./lib/components/XAutoCompleteBase",
        "./lib/components/XButton",
        "./lib/components/XButtonIconMedium",
        "./lib/components/XButtonIconNarrow",
        "./lib/components/XButtonIconSmall",
        "./lib/components/XCalendar",
        "./lib/components/XChangePasswordForm",
        "./lib/components/XCheckbox",
        "./lib/components/XDropdown",
        "./lib/components/XDropdownForEntity",
        "./lib/components/XEditBrowse",
        "./lib/components/XEnvVars",
        "./lib/components/XErrors",
        "./lib/components/XExportRowsDialog",
        "./lib/components/XFieldChangeEvent",
        "./lib/components/XFormBase",
        "./lib/components/XFormBaseModif",
        "./lib/components/XFormBaseT",
        "./lib/components/XFormDataTable2",
        "./lib/components/XFormFooter",
        "./lib/components/XFormNavigator3",
        "./lib/components/XHolders",
        "./lib/components/XInputDate",
        "./lib/components/XInputDecimal",
        "./lib/components/XInputDecimalBase",
        "./lib/components/XInputFileList",
        "./lib/components/XInputInterval",
        "./lib/components/XInputIntervalBase",
        "./lib/components/XInputText",
        "./lib/components/XInputTextarea",
        "./lib/components/XLazyDataTable",
        "./lib/components/XLocale",
        "./lib/components/XLoginDialog",
        "./lib/components/XLoginForm",
        "./lib/components/XObject",
        "./lib/components/XSearchButton",
        "./lib/components/XToken",
        "./lib/components/XToOneAssocButton",
        "./lib/components/XUtils",
        "./lib/components/XUtilsConversions",
        "./lib/components/XUtilsMetadata",

        "./lib/serverApi/ExportImportParam",
        "./lib/serverApi/FindParam",
        "./lib/serverApi/XUtilsCommon"
    ];

    for (const apiFile of apiFileList) {
        const posSlash = apiFile.lastIndexOf('/');
        let fileName;
        if (posSlash !== -1) {
            fileName = apiFile.substring(posSlash + 1);
        }
        else {
            fileName = apiFile;
        }
        fs.writeFileSync(`${fileName}.d.ts`, `// generated by gulp\n\nexport * from '${apiFile}';`);
        fs.writeFileSync(`${fileName}.js`, `// generated by gulp\n\n'use strict';\n\nmodule.exports = require('${apiFile}.js');`);
    }

    cb();
}

exports.generateApi = generateApi;