
import * as assert from 'assert';
import * as path from 'path';
import { generateSchemas } from '../index';



describe('Schema generation', () => {
    it('Generation', async () => {
        await generateSchemas(path.join(__dirname, '..', 'src', 'test', 'xml'), path.join(__dirname, 'schema.json'), 'spo', 'MPD');
    });

});