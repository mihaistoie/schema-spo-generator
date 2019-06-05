"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const index_1 = require("../index");
describe('Schema generation', () => {
    it('Generation', async () => {
        await index_1.generateSchemas(path.join(__dirname, '..', 'src', 'test', 'xml'), path.join(__dirname, 'schema.json'), 'spo', 'MPD');
    });
});
