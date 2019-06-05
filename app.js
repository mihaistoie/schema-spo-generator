#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
const argparse_1 = require("argparse");
async function genModel(srcDir, dstFile, classes) {
    await index_1.generateSchemas(srcDir, dstFile, 'spo', 'MPD');
}
const parser = new argparse_1.ArgumentParser({
    version: '1.0.0',
    addHelp: true,
    description: 'Sql schema generator'
});
parser.addArgument(['-xml', '--xmlFile'], {
    help: './data/xml/M82-Budget_MPD.xml',
    required: true
});
parser.addArgument(['-d', '--dstFile'], {
    help: './data/json/M82-Budget_MPD3.json',
    required: true
});
parser.addArgument(['-c', '--classes'], {
    help: 'FINCONTRAT;DOMOPEFIN',
    required: false
});
const args = parser.parseArgs();
const promises = [];
promises.push(genModel(args.xmlFile, args.dstFile, args.classes));
Promise.all(promises).then(() => {
    process.exit(0);
}).catch((ex) => {
    process.exit(-1);
});
