const config = {
    verbose: true,
    roots: ["<rootDir>/src/", "<rootDir>/tests/"],
    preset: 'ts-jest',
    moduleFileExtensions: ['ts', 'tsx', 'js'],

    // jest won't work with the other tests currently
    testMatch: ["**/tests/**"]
};

module.exports = config;
