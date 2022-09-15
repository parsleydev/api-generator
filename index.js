const fs = require('fs')
const YAML = require('yaml')
const configFile = process.argv[2]
const tools = require('./tools');
// list of all generators
const generators = [require('./generator')]

if (!configFile) tools.error('Please provide a config file')

// load yaml config file
const config = YAML.parse(fs.readFileSync(configFile, 'utf8'))

// init projects
let configuration = config?.config
if (!configuration) tools.error('Please add a "config" section in your config file')
generators.forEach(generator => {
    generator.initProject(configuration.name, tools.error, tools.warn, tools.getterSetterVarName)
})

// loop in tables and generate classes
const tables = config?.tables
if (!tables) tools.error('No tables found in config file')
if (!(tables instanceof Object)) tools.error('Tables must be an object')
for (let generator of generators) {
    for (const table in tables) {
        tools.generate(table, tables[table], generator)
    }
    generator.finalize()
}