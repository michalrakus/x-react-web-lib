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
        "./lib/components/useXToken",
        "./lib/components/XDropdown",
        "./lib/components/XFormBase",
        "./lib/components/XFormDataTable2",
        "./lib/components/XFormNavigator3",
        "./lib/components/XInputDate",
        "./lib/components/XInputDecimal",
        "./lib/components/XInputText",
        "./lib/components/XLazyDataTable",
        "./lib/components/XLoginForm",
        "./lib/components/XSearchButton",
        "./lib/components/XToken",
        "./lib/components/XToOneAssocButton",
        "./lib/components/XUtils",
        "./lib/components/XUtilsConversions",
        "./lib/components/XUtilsMetadata",

        "./lib/administration/XUserBrowse",
        "./lib/administration/XUserForm"
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