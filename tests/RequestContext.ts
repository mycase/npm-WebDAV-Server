import { HTTPRequestContext } from '../src/server/v2/RequestContext';

describe('encodeURL', () => {
    test('standard url', () => {
        const encodedUrl = HTTPRequestContext.encodeURL('http://localhost/test/item');
        expect(encodedUrl).toBe('http://localhost/test/item');
    });

    test('standard url with port', () => {
        const encodedUrl = HTTPRequestContext.encodeURL('http://localhost:1900/test/item');
        expect(encodedUrl).toBe('http://localhost:1900/test/item');
    });

    test('special characters url', () => {
        const encodedUrl = HTTPRequestContext.encodeURL('http://localhost:1900/test?&$/item*@');
        expect(encodedUrl).toBe('http://localhost:1900/test%3F%26%24/item*%40');
    });
    test('space in url', () => {
        const encodedUrl = HTTPRequestContext.encodeURL('http://localhost:1900/test yes/i tem');
        expect(encodedUrl).toBe('http://localhost:1900/test%20yes/i%20tem');
    });

    test('just root url', () => {
        const encodedUrl = HTTPRequestContext.encodeURL('http://localhost/');
        expect(encodedUrl).toBe('http://localhost/');
    });

    test('does not start with http(s)', () => {
        const encodedUrl = HTTPRequestContext.encodeURL('//localhost/test/item');
        expect(encodedUrl).toBe('localhost/test/item');
    });

    test('empty string url', () => {
        const encodedUrl = HTTPRequestContext.encodeURL('');
        expect(encodedUrl).toBe('');
    });
});
