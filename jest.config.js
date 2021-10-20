const config = {
    verbose: true,
    roots: ["<rootDir>/src/", "<rootDir>/test/unit"],
    preset: 'ts-jest',
    moduleFileExtensions: ['ts', 'tsx', 'js'],

    // jest won't work with the other tests currently
    testMatch: ["**/test/unit/**"],
    globals: {
        'ts-jest': {
            tsconfig: 'test/unit/tsconfig.json'
        }
    }
};

module.exports = config;
