/**
 * return php equalivent of database types
 */
const getType = (type, table) => {
    if (type === 'integer') {
        type = 'int'
    } else if (type === 'datetime') {
       type = '\\DateTime'
    } else if (type === 'datetime_immutable') {
       type = '\\DateTimeImmutable'
    } else if (type === 'json') {
       type = 'array'
    } else if (type === 'many2one') {
       type = table.relation
    } else if (type === 'one2many') {
        type = 'Collection'
    }
    if (type && table.nullable === true) type = `?${type}`
    return type
}

/**
 * return annotations related to a property (also handles most of relations)
 */
const annotations = (table, name, imports) => {
    var annotations = ''
    if (table.primaryKey) {
        annotations += '    #[ORM\\Id]\n    #[ORM\\GeneratedValue]\n'
    }
    if (table.notBlank) {
        imports.add("use Symfony\\Component\\Validator\\Constraints as Assert;")
        annotations += '    #[Assert\\NotBlank]\n'
    }
    if (table.nullable === false) {
        imports.add("use Symfony\\Component\\Validator\\Constraints as Assert;")
        annotations += '    #[Assert\\NotNull]\n'
    }
    if (table.type === 'many2one') {
        const plural = pluralize(this.tableName.toLowerCase())
        const pluralCamelCase = this.getterSetterVarName(plural)
        const nameCamelCase = this.getterSetterVarName(name)
        if (!contextsAdditions[table.relation])
            contextsAdditions[table.relation] = { properties: '',  constructorBody: [], gettersAndSetters: '', imports: new Set()}
        contextsAdditions[table.relation].imports.add("use Doctrine\\Common\\Collections\\ArrayCollection;")
        contextsAdditions[table.relation].imports.add("use Doctrine\\Common\\Collections\\Collection;")
        contextsAdditions[table.relation].properties += `\n\n    #[ORM\\OneToMany(mappedBy: '${name}', targetEntity: ${this.tableName}::class)]\n    private Collection $${plural};\n`
        contextsAdditions[table.relation].constructorBody.push(`        $this->${plural} = new ArrayCollection();`)
        contextsAdditions[table.relation].gettersAndSetters += `\n\n    /**
     * @return Collection<int, ${this.tableName}>
     */
    public function get${pluralCamelCase}(): Collection
    {
        return $this->${plural};
    }\n
    public function add${this.tableName}(${this.tableName} $${this.tableName.toLowerCase()}): self
    {
        if (!$this->${plural}->contains($${this.tableName.toLowerCase()})) {
            $this->${plural}->add($${this.tableName.toLowerCase()});
            $${this.tableName.toLowerCase()}->set${nameCamelCase}($this);
        }
        return $this;
    }\n
    public function remove${this.tableName}(${this.tableName} $${this.tableName.toLowerCase()}): self
    {
        if ($this->${plural}->removeElement($${this.tableName.toLowerCase()})) {
            // set the owning side to null (unless already changed)
            if ($${this.tableName.toLowerCase()}->get${nameCamelCase}() === $this) {
                $${this.tableName.toLowerCase()}->set${nameCamelCase}(null);
            }
        }
        return $this;
    }\n
    `
        return `    #[ORM\\ManyToOne(inversedBy: '${plural}')]\n` // skip adding other annotations
    } else if (table.type === 'one2many') {
        imports.add("use Doctrine\\Common\\Collections\\ArrayCollection;")
        imports.add("use Doctrine\\Common\\Collections\\Collection;")
        if (!contextsAdditions[this.tableName])
        contextsAdditions[this.tableName] = { properties: '',  constructorBody: [], gettersAndSetters: ''}
        contextsAdditions[this.tableName].constructorBody.push(`\n        $this->${name} = new ArrayCollection();`)
        if (!contextsAdditions[table.relation])
                contextsAdditions[table.relation] = { properties: '',  constructorBody: [], gettersAndSetters: ''}
        contextsAdditions[table.relation].properties += `\n\n    #[ORM\\ManyToOne(inversedBy: '${name}')]\n    private ?${this.tableName} $${this.tableName.toLowerCase()} = null;\n`
        contextsAdditions[table.relation].gettersAndSetters += `\n    public function get${this.tableName}(): ?${this.tableName}
    {
        return $this->${this.tableName.toLowerCase()};
    }
    
    public function set${this.tableName}(?${this.tableName} $${this.tableName.toLowerCase()}): self
    {
        $this->${this.tableName.toLowerCase()} = $${this.tableName.toLowerCase()};
        return $this;
    }`
        contextsAdditions[this.tableName].gettersAndSetters += `\n\n    public function add${table.relation}(${table.relation} $${name}): self
    {
        if (!$this->${name}->contains($${name})) {
            $this->${name}->add($${name});
            $${name}->setTest($this);
        }
        return $this;
    }`
        return `    #[ORM\\OneToMany(mappedBy: '${this.tableName.toLowerCase()}', targetEntity: ${table.relation}::class)]\n`
    }
    annotations += `    #[ORM\\Column(type: '${table.type}'${optionsFor(table)})]\n`
    return annotations
}

/**
 * options for ORM\Column annotation (such as length of a string)
 */
const optionsFor = (table) => {
    var options = ''
    if (table.type == 'string' && table.nullable) {
        options += ', nullable: true'
    }
    if (table.type === 'string') {
        if (table.length === undefined) {
            table.length = 255
        }
        options += `, length: ${table.length}`
    }
    return options
}

/**
 * returns default value of a property
 */
const genDefaultValue = (tableName, table, constructorBody) => {
    if (table.type === 'datetime' && table.default == "now") {
        constructorBody.push(`        $this->${tableName} = new \\DateTime();`)
        return ''
    }
    if (typeof table.default == 'number')
        return ` = ${table.default}`
    else if (typeof table.default == 'string')
        return ` = "${table.default}"`
    else if (table.default instanceof Array)
        return ` = ${JSON.stringify(table.default)}`
    if (table.type === 'json') return ' = []'
    return ''
}

const fs = require('fs')
const exec = require('child_process').execSync;
const process = require('process');
const pluralize = require('pluralize')

const contexts = {}
const contextsAdditions = {}

module.exports = {
    /**
     * initialize project (runs composer)
     */
    initProject: (name, error, warn, getterSetterVarName) => {
        this.error = error
        this.warn = warn
        this.projectName = name
        this.getterSetterVarName = getterSetterVarName
        try {
            let stats = fs.lstatSync(`./${name}`);
            if (stats.isDirectory()) {
                warn('Project already exists writing files...');
                return
            } else {
                error('A file with this name already exists');
            }
        } catch (e) {
            fs.mkdirSync(`./${name}`);
            process.chdir(`./${name}`);
            exec(`composer create-project symfony/skeleton api`, { stdio: 'inherit', stderr: 'inherit' });
            process.chdir(`./api`);
            exec(`composer require api`, { stdio: 'inherit', stderr: 'inherit' });
            exec(`composer require symfony/maker-bundle --dev`, { stdio: 'inherit', stderr: 'inherit' });
            // undo chdir
            process.chdir(`../..`);
        }
    },
    setup: (tableName, apiResource) => {
        this.tableName = tableName
        contexts[this.tableName] = {}
        contexts[this.tableName].imports = new Set()
        contexts[this.tableName].properties = ''
        contexts[this.tableName].gettersAndSetters = ''
        contexts[this.tableName].constructorBody = []
        contexts[this.tableName].apiResource = apiResource
    },
    finalize: () => {
        for (const tableName in contexts) {
            fs.writeFileSync(`${this.projectName}/api/src/Repository/${tableName}Repository.php`, `<?php
namespace App\\Repository;

use App\\Entity\\${tableName};
use Doctrine\\Bundle\\DoctrineBundle\\Repository\\ServiceEntityRepository;
use Doctrine\\Persistence\\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<${tableName}>
 *
 * @method ${tableName}|null find($id, $lockMode = null, $lockVersion = null)
 * @method ${tableName}|null findOneBy(array $criteria, array $orderBy = null)
 * @method ${tableName}[]    findAll()
 * @method ${tableName}[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class ${tableName}Repository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ${tableName}::class);
    }

    public function add(${tableName} $entity, bool $flush = false): void
    {
        $this->getEntityManager()->persist($entity);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function remove(${tableName} $entity, bool $flush = false): void
    {
        $this->getEntityManager()->remove($entity);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

//    /**
//     * @return ${tableName}[] Returns an array of ${tableName} objects
//     */
//    public function findByExampleField($value): array
//    {
//        return $this->createQueryBuilder('p')
//            ->andWhere('p.exampleField = :val')
//            ->setParameter('val', $value)
//            ->orderBy('p.id', 'ASC')
//            ->setMaxResults(10)
//            ->getQuery()
//            ->getResult()
//        ;
//    }

//    public function findOneBySomeField($value): ?${tableName}
//    {
//        return $this->createQueryBuilder('p')
//            ->andWhere('p.exampleField = :val')
//            ->setParameter('val', $value)
//            ->getQuery()
//            ->getOneOrNullResult()
//        ;
//    }
}
`)
            fs.writeFileSync(`${this.projectName}/api/src/Entity/${tableName}.php`,
`<?php

namespace App\\Entity;

//use ApiPlatform\\Core\\Annotation\\ApiResource;
use ApiPlatform\\Metadata\\ApiResource;
use Doctrine\\ORM\\Mapping as ORM;
use App\\Repository\\${tableName}Repository;
${Array.from(contexts[tableName].imports).join('\n')}${Array.from(contextsAdditions[tableName]?.imports || []).join('\n')}

${contexts[tableName].apiResource? "#[ApiResource]" : ""}
#[ORM\\Entity(repositoryClass: ${tableName}Repository::class)]
class ${tableName} {
${contexts[tableName].properties.trimEnd()}${contextsAdditions[tableName]?.properties?.trimEnd() || ''}

    public function __construct()
    {
${contexts[tableName].constructorBody.join('\n').trimEnd()}
${contextsAdditions[tableName]?.constructorBody?.join('\n').trimEnd() || ''}
    }

${contexts[tableName].gettersAndSetters.trimEnd()}${contextsAdditions[tableName]?.gettersAndSetters?.trimEnd() || ''}
}`
            )
        }
    },
    generateProperty: (i, parameter, propertyName) => {
        let defaultValue = `${genDefaultValue(i, parameter, contexts[this.tableName].constructorBody)}`
        const type = getType(parameter.type, parameter)
        if (!type) this.error(`Unknown type ${parameter.type} for property ${parameter}`)
        contexts[this.tableName].properties += `${annotations(parameter, i, contexts[this.tableName].imports)}    public ${type} $${i}${defaultValue};\n\n`
    }
}