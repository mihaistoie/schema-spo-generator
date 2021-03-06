import * as util from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { parseString } from 'xml2js';

const readdir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const lstat = util.promisify(fs.lstat);
const writeFile = util.promisify(fs.writeFile);
const mkdir = util.promisify(fs.mkdir);



const
    generateTable = (schemas: any, table: any, nameSpace: string) => {
        if (table.$.abstraite !== 'N') return;
        const td: any = {
            tableName: table.$.id,
            name: 'Spo' + table.$.nomInterne,
            title: table.$.libelle.replace(/'/g, '’'),
            type: 'object',
            primaryKey: [],
            properties: {}

        };
        // schemas.$map[table.$.id] = table.$.nomInterne || table.$.id;
        if (table.Champs && table.Champs.length && table.Champs[0].Champ && table.Champs[0].Champ.length) {

            table.Champs[0].Champ.forEach((fieldJson: any) => {
                const field = fieldJson.$;
                if (field.id === 'xmlcontext')
                    return;
                if (field.clePrimaire === 'O')
                    td.primaryKey.push(field.id);
                const fd: any = {
                    title: field.libelle.replace(/'/g, '’'),
                };
                field.type = field.type || 'String';
                if (field.type === 'String') {
                    fd.type = 'string';
                    if (field.taille) {
                        const taille = parseInt(field.taille, 10);
                        fd.maxLength = taille;
                        if (taille >= 1000) {
                            fd.format = 'memo'
                        }
                    }
                } else if (field.type === 'Entier') {
                    fd.type = 'integer'
                } else if (field.type === 'Booleen') {
                    fd.type = 'boolean'
                    fd.format = 'mgdis-boolean'
                } else if (field.type === 'DateMG') {
                    fd.type = 'string';
                    fd.format = 'mgdis-date';
                } else if (field.type === 'Monetaire') {
                    fd.type = 'number';
                    if (field.taillePartieDecimale === '4' && field.taillePartieEntiere === '13') {
                        fd.decimals = 4;
                        fd.decimals = parseInt(field.taillePartieDecimale, 10);
                    } else if (field.taillePartieDecimale) {
                        fd.decimals = parseInt(field.taillePartieDecimale, 10);
                    }
                } else if (field.type === 'Flottant') {
                    fd.type = 'number';
                    if (field.taillePartieDecimale)
                        fd.decimals = parseInt(field.taillePartieDecimale, 10);
                } else if (field.type === 'Codif') {
                    fd.type = 'string';
                    fd.maxLength = 32;
                } else {
                    fd.type = 'string';
                }
                td.properties[field.id] = fd;

            });

        }
        schemas[table.$.id] = td;

    },
    generateAssociation = (schemas: any, association: any, nameSpace: string) => {
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
            let name1: string;
            let name2: string;
            let type1 = isMany1 ? 'hasMany' : 'hasOne';
            let type2 = isMany2 ? 'hasMany' : 'hasOne';

            if (!isMany1 && !isMany2) {
                kind1 = 'composite';
                kind1 = 'composite';
                type2 = 'belongsTo'

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

            const pk: string[] = [];
            const fk: string[] = [];
            (t1.Lien || []).forEach((item: any) => {
                fk.push(item.$.idChamp)
            });
            (t2.Lien || []).forEach((item: any) => {
                pk.push(item.$.idChamp)
            });

            const rel1: any = {
                type: type1,
                aggregationKind: kind1,
                model: schemas[r2.idTable].name,
                localFields: pk.slice(0),
                foreignFields: fk.slice(0),
            };
            if (name2)
                rel1.invRel = name2
            const rel2: any = {
                type: type2,
                aggregationKind: kind2,
                model: schemas[r1.idTable].name,
                localFields: fk.slice(0),
                foreignFields: pk.slice(0),
            };
            if (name2)
                rel2.invRel = name1
            schemas[r1.idTable].relations = schemas[r1.idTable].relations || {};
            schemas[r2.idTable].relations = schemas[r2.idTable].relations || {};
            if (name1)
                schemas[r1.idTable].relations[name1] = rel1
            if (name2)
                schemas[r2.idTable].relations[name2] = rel2


        }

    },

    generateTablesRelations = (schemas: any, root: any, nameSpace: string) => {
        if (root && root.length && root[0].Classeurs && root[0].Classeurs.length && root[0].Classeurs[0].Classeur && root[0].Classeurs[0].Classeur.length) {
            root[0].Classeurs[0].Classeur.forEach((classeur: any) => {
                if (classeur.Relations && classeur.Relations.length && classeur.Relations[0].Associations && classeur.Relations[0].Associations.length) {
                    (classeur.Relations[0].Associations[0].Association || []).forEach((association: any) => {
                        generateAssociation(schemas, association, nameSpace)

                    });

                }

            })
        }

    },
    generateTables = (schemas: any, root: any, nameSpace: string) => {
        if (root && root.length && root[0].Classeurs && root[0].Classeurs.length && root[0].Classeurs[0].Classeur && root[0].Classeurs[0].Classeur.length) {
            root[0].Classeurs[0].Classeur.forEach((classeur: any) => {
                if (classeur.Tables && classeur.Tables.length && classeur.Tables[0].Table && classeur.Tables[0].Table.length) {
                    classeur.Tables[0].Table.forEach((table: any) => {
                        generateTable(schemas, table, nameSpace)

                    });

                }
                if (classeur.Vues && classeur.Vues.length && classeur.Vues[0].Vue && classeur.Vues[0].Vue.length) {
                    classeur.Vues[0].Vue.forEach((table: any) => {
                        generateTable(schemas, table, nameSpace)

                    });

                }

            })
        } else {
            delete root.$;
            console.log('XXXXXXXXXXXXXXXXXXXXXXXXXXX');
            console.log(root);
            if (root && root.length) {
                root.forEach((table: any) => {
                    generateTable(schemas, table, nameSpace)

                });
            }
        }

    },
    generateTablePropertiesSchema = (schemas: any, json: any, nameSpace: string, entryName: string): void => {
        let root = json.root[entryName];
        if (!root) {
            root = json.root;
        }
        generateTables(schemas, root, nameSpace);

    },
    generateTableRelations = (schemas: any, json: any, nameSpace: string, entryName: string): void => {
        const root = json.root[entryName];
        generateTablesRelations(schemas, root, nameSpace);

    },

    parseXmlString = (xmlSting: string): Promise<any> => {
        return new Promise((resolve, reject) => {
            parseString(xmlSting, (err: any, result: any) => {
                if (err) return reject(err);
                resolve(result)
            });
        });
    },
    generate = async (src: string, dest: string, defaultNameSpace: string, entryName: string, mapNameSpaces?: any): Promise<void> => {
        const schemas = {};
        const statsrc = await lstat(src);
        let files: string[] = [];
        let addSrc = false;
        if (statsrc.isFile()) {
            files.push(src);
        } else {
            files = await readdir(src);
            addSrc = true;
        }
        const jsons: { json: any, nameSpace: string }[] = [];
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
            const value = jsons[i]
            generateTableRelations(schemas, value.json, value.nameSpace, entryName);
            await writeFragments(dest, schemas);
            await writeFile(path.join(dest), JSON.stringify(schemas, null, '\t'), 'utf-8');
        }
    },
    writeFragments = async (dest: string, schemas: any) => {
        const ext = path.extname(dest);
        if (ext) {
            dest = dest.substring(0, dest.length - ext.length)
        }
        await mkdir(dest, { recursive: true });
        for (const schemaName of Object.getOwnPropertyNames(schemas)) {
            const fileName = path.join(dest, `${schemaName}.json`);
            await writeFile(fileName, JSON.stringify(schemas[schemaName], null, '\t'), 'utf-8');
        }
    }


export const generateSchemas = generate;
