"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSchemas = void 0;
const util = require("util");
const fs = require("fs");
const path = require("path");
const xml2js_1 = require("xml2js");
const readdir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const lstat = util.promisify(fs.lstat);
const writeFile = util.promisify(fs.writeFile);
const mkdir = util.promisify(fs.mkdir);
const generateTable = (schemas, table, nameSpace) => {
    if (table.$.abstraite !== 'N')
        return;
    const td = {
        tableName: table.$.id,
        name: 'Spo' + table.$.nomInterne,
        title: table.$.libelle.replace(/'/g, '’'),
        type: 'object',
        primaryKey: [],
        properties: {}
    };
    // schemas.$map[table.$.id] = table.$.nomInterne || table.$.id;
    if (table.Champs && table.Champs.length && table.Champs[0].Champ && table.Champs[0].Champ.length) {
        table.Champs[0].Champ.forEach((fieldJson) => {
            const field = fieldJson.$;
            if (field.id === 'xmlcontext')
                return;
            if (field.clePrimaire === 'O')
                td.primaryKey.push(field.id);
            const fd = {
                title: field.libelle.replace(/'/g, '’'),
            };
            field.type = field.type || 'String';
            if (field.type === 'String') {
                fd.type = 'string';
                if (field.taille) {
                    const taille = parseInt(field.taille, 10);
                    fd.maxLength = taille;
                    if (taille >= 1000) {
                        fd.format = 'memo';
                    }
                }
            }
            else if (field.type === 'Entier') {
                fd.type = 'integer';
            }
            else if (field.type === 'Booleen') {
                fd.type = 'boolean';
                fd.format = 'mgdis-boolean';
            }
            else if (field.type === 'DateMG') {
                fd.type = 'string';
                fd.format = 'mgdis-date';
            }
            else if (field.type === 'Monetaire') {
                fd.type = 'number';
                if (field.taillePartieDecimale === '4' && field.taillePartieEntiere === '13') {
                    fd.decimals = 4;
                    fd.decimals = parseInt(field.taillePartieDecimale, 10);
                }
                else if (field.taillePartieDecimale) {
                    fd.decimals = parseInt(field.taillePartieDecimale, 10);
                }
            }
            else if (field.type === 'Flottant') {
                fd.type = 'number';
                if (field.taillePartieDecimale)
                    fd.decimals = parseInt(field.taillePartieDecimale, 10);
            }
            else if (field.type === 'Codif') {
                fd.type = 'string';
                fd.maxLength = 32;
            }
            else {
                fd.type = 'string';
            }
            td.properties[field.id] = fd;
        });
    }
    schemas[table.$.id] = td;
}, generateAssociation = (schemas, association, nameSpace) => {
    if (association.Terminaison && association.Terminaison.length === 2) {
        const t1 = association.Terminaison[0];
        const t2 = association.Terminaison[1];
        const r1 = t1.$;
        const r2 = t2.$;
        if (!schemas[r1.idTable] || !schemas[r2.idTable]) {
            return;
        }
        let isMany1 = r2.cardinaliteMax === '*';
        let isMany2 = r1.cardinaliteMax === '*';
        let kind1 = 'none';
        let kind2 = 'none';
        let name1;
        let name2;
        let type1 = isMany1 ? 'hasMany' : 'hasOne';
        let type2 = isMany2 ? 'hasMany' : 'hasOne';
        if (!isMany1 && !isMany2) {
            kind1 = 'composite';
            kind1 = 'composite';
            type2 = 'belongsTo';
        }
        name1 = schemas[r2.idTable].name;
        if (name1.indexOf('Spo') === 0) {
            name1 = name1.substr(3);
        }
        name1 = name1 + (isMany1 ? 'List' : '');
        name1 = name1.charAt(0).toLowerCase() + name1.substr(1);
        name2 = schemas[r1.idTable].name;
        if (name2.indexOf('Spo') === 0) {
            name2 = name2.substr(3);
        }
        name2 = name2 + (isMany2 ? 'List' : '');
        name2 = name2.charAt(0).toLowerCase() + name2.substr(1);
        const pk = [];
        const fk = [];
        (t1.Lien || []).forEach((item) => {
            fk.push(item.$.idChamp);
        });
        (t2.Lien || []).forEach((item) => {
            pk.push(item.$.idChamp);
        });
        const rel1 = {
            type: type1,
            aggregationKind: kind1,
            model: schemas[r2.idTable].name,
            localFields: pk.slice(0),
            foreignFields: fk.slice(0),
        };
        if (name2)
            rel1.invRel = name2;
        const rel2 = {
            type: type2,
            aggregationKind: kind2,
            model: schemas[r1.idTable].name,
            localFields: fk.slice(0),
            foreignFields: pk.slice(0),
        };
        if (name2)
            rel2.invRel = name1;
        schemas[r1.idTable].relations = schemas[r1.idTable].relations || {};
        schemas[r2.idTable].relations = schemas[r2.idTable].relations || {};
        if (name1)
            schemas[r1.idTable].relations[name1] = rel1;
        if (name2)
            schemas[r2.idTable].relations[name2] = rel2;
    }
}, generateTablesRelations = (schemas, root, nameSpace) => {
    if (root && root.length && root[0].Classeurs && root[0].Classeurs.length && root[0].Classeurs[0].Classeur && root[0].Classeurs[0].Classeur.length) {
        root[0].Classeurs[0].Classeur.forEach((classeur) => {
            if (classeur.Relations && classeur.Relations.length && classeur.Relations[0].Associations && classeur.Relations[0].Associations.length) {
                (classeur.Relations[0].Associations[0].Association || []).forEach((association) => {
                    generateAssociation(schemas, association, nameSpace);
                });
            }
        });
    }
}, generateTables = (schemas, root, nameSpace) => {
    if (root && root.length && root[0].Classeurs && root[0].Classeurs.length && root[0].Classeurs[0].Classeur && root[0].Classeurs[0].Classeur.length) {
        root[0].Classeurs[0].Classeur.forEach((classeur) => {
            if (classeur.Tables && classeur.Tables.length && classeur.Tables[0].Table && classeur.Tables[0].Table.length) {
                classeur.Tables[0].Table.forEach((table) => {
                    generateTable(schemas, table, nameSpace);
                });
            }
            if (classeur.Vues && classeur.Vues.length && classeur.Vues[0].Vue && classeur.Vues[0].Vue.length) {
                classeur.Vues[0].Vue.forEach((table) => {
                    generateTable(schemas, table, nameSpace);
                });
            }
        });
    }
    else {
        delete root.$;
        console.log('XXXXXXXXXXXXXXXXXXXXXXXXXXX');
        console.log(root);
        if (root && root.length) {
            root.forEach((table) => {
                generateTable(schemas, table, nameSpace);
            });
        }
    }
}, generateTablePropertiesSchema = (schemas, json, nameSpace, entryName) => {
    let root = json.root[entryName];
    if (!root) {
        root = json.root;
    }
    generateTables(schemas, root, nameSpace);
}, generateTableRelations = (schemas, json, nameSpace, entryName) => {
    const root = json.root[entryName];
    generateTablesRelations(schemas, root, nameSpace);
}, parseXmlString = (xmlSting) => {
    return new Promise((resolve, reject) => {
        xml2js_1.parseString(xmlSting, (err, result) => {
            if (err)
                return reject(err);
            resolve(result);
        });
    });
}, generate = async (src, dest, defaultNameSpace, entryName, mapNameSpaces) => {
    const schemas = {};
    const statsrc = await lstat(src);
    let files = [];
    let addSrc = false;
    if (statsrc.isFile()) {
        files.push(src);
    }
    else {
        files = await readdir(src);
        addSrc = true;
    }
    const jsons = [];
    for (let i = 0; i < files.length; i++) {
        const fileName = addSrc ? path.join(src, files[i]) : files[i];
        const stat = await lstat(fileName);
        if (stat.isFile() && path.extname(fileName).toLowerCase() === '.xml') {
            const parsedFile = path.parse(fileName);
            const ns = mapNameSpaces && mapNameSpaces[parsedFile.name] ? mapNameSpaces[parsedFile.name] : defaultNameSpace;
            const xml = await readFile(fileName, 'utf-8');
            const json = await parseXmlString(xml);
            jsons.push({ json: json, nameSpace: ns });
            generateTablePropertiesSchema(schemas, json, ns, entryName);
        }
    }
    for (let i = 0; i < jsons.length; i++) {
        const value = jsons[i];
        generateTableRelations(schemas, value.json, value.nameSpace, entryName);
        await writeFragments(dest, schemas);
        await writeFile(path.join(dest), JSON.stringify(schemas, null, '\t'), 'utf-8');
    }
}, writeFragments = async (dest, schemas) => {
    const ext = path.extname(dest);
    if (ext) {
        dest = dest.substring(0, dest.length - ext.length);
    }
    await mkdir(dest, { recursive: true });
    for (const schemaName of Object.getOwnPropertyNames(schemas)) {
        const fileName = path.join(dest, `${schemaName}.json`);
        await writeFile(fileName, JSON.stringify(schemas[schemaName], null, '\t'), 'utf-8');
    }
};
exports.generateSchemas = generate;
