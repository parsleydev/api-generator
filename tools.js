const error = (msg) => {
    console.error('ERROR: ' + msg)
    process.exit(1)
}

const warn = (msg) => {
    console.warn('WARNING: ' + msg)
}

const getterSetterVarName = (string) => {
    var loc = string.indexOf("_")
    while (loc != -1) {
        string = string.substring(0, loc) + string.substring(loc+1, loc+2).toUpperCase() + string.substring(loc+2)
        loc = string.indexOf("_")
    }
    return string.substring(0, 1).toUpperCase() + string.substring(1)
}

module.exports = {
    generate: (table, parameters, generator) => {
        if (parameters.API_RESOURCE === undefined) {
            parameters.API_RESOURCE = true
        }
        generator.setup(getterSetterVarName(table), parameters.API_RESOURCE)
        if (parameters['id'] === undefined) {
            parameters['id'] = {
                type: 'integer',
                primaryKey: true
            }
        }
        for (let i in parameters) {
            if (i == 'API_RESOURCE' || parameters[i] == null) continue
            if (parameters[i].nullable === undefined) {
                parameters[i].nullable = true
            }
            generator.generateProperty(i, parameters[i], getterSetterVarName(i))
        }
    },
    warn: warn,
    error: error,
    getterSetterVarName: getterSetterVarName
};