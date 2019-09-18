"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const index_1 = require("../index");
describe('Schema generation', () => {
    it('Generation', async () => {
        await index_1.generateSchemas(path.join(__dirname, '..', 'data', 'xml'), path.join(__dirname, '..', 'data', 'schema.json'), 'spo', 'MPD');
    });
});
