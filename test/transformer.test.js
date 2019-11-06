import test from 'ava';

import {resolvePath} from '../transformer';

test('should resolve mapped path', t => {
    const filePath = '/any/santa-core/document-services-implementation/test/structure/structure.js';
    const pathToResolve = 'documentServices/anchors/anchors';

    const resolved = resolvePath(pathToResolve, filePath);
    const expected = '../../src/anchors/anchors';

    t.is(resolved, expected);
});

test('should resolve mapped path in deeper module', t => {
    const filePath = '/any/santa-core/document-services-implementation/test/structure/helper/helper.js';
    const pathToResolve = 'documentServices/anchors/anchors';

    const resolved = resolvePath(pathToResolve, filePath);
    const expected = '../../../src/anchors/anchors';

    t.is(resolved, expected);
});
