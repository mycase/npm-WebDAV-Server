const config = {
    verbose: true,
    roots: ["<rootDir>/src/", "<rootDir>/test/"],
    preset: 'ts-jest',
    moduleFileExtensions: ['ts', 'tsx', 'js'],

    // jest won't work with the other tests currently
    testMatch: ["**/tests.ts/**/RequestContext.ts"]
};

module.exports = config;
