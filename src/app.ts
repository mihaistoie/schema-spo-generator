#!/usr/bin/env node
import { generateSchemas } from './index';
import { ArgumentParser } from 'argparse';

async function genModel(srcDir: string, dstFile: string, classes: string): Promise<void> {
    await generateSchemas(srcDir, dstFile, 'spo', 'MPD');
}

const parser = new ArgumentParser({
    version: '1.0.0',
    addHelp: true,
    description: 'Sql schema generator'
});

parser.addArgument(
    ['-xml', '--xmlFile'],
    {
        help: './data/xml/M82-Budget_MPD.xml',
        required: true
    }
);
parser.addArgument(
    ['-d', '--dstFile'],
    {
        help: './data/json/M82-Budget_MPD3.json',
        required: true
    }
);

parser.addArgument(
    ['-c', '--classes'],
    {
        help: 'FINCONTRAT;DOMOPEFIN',
        required: false
    }
);

const args = parser.parseArgs();

const promises: Array<Promise<void>> = [];
promises.push(genModel(args.xmlFile, args.dstFile, args.classes));
Promise.all(promises).then(() => {
    process.exit(0);
}).catch((ex) => {
    process.exit(-1);
});
