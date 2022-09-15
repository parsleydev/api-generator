# api generator

This project aims to create at least most of the backend sources needed for any project

# Getting started:
1. clone the repo
2. npm install
3. node index.js <configFile>

### Config file example:
```yaml
config:
  name: "test" # project name

tables:
  Greeting: # table's name
    # table's properties:
    message:
      type: string
      default: "Hello"
    language:
      type: string
      default: "en"
    created_at:
      type: datetime
      default: now
    people:
      # one-to-many relation
      type: one2many
      relation: Person

  Person:
    name:
      type: string

```