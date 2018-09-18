const Generator = require("yeoman-generator");
const recursive = require('inquirer-recursive');
const _ = require("lodash");
const mkdirp = require("mkdirp");
const path = require("path");
const process = require("process");
const packageJson = require("../../package.json");

module.exports = class extends Generator {
  initializing() {
    this.env.adapter.promptModule.registerPrompt('recursive', recursive);
  }
  prompting() {
    return this.prompt([
      {
        type: "input",
        name: "name",
        message: "Element name",
        validate: function (value) {
          if ((/([a-z]*)-([a-z]*)/).test(value)) { return true; }
          return 'name requires a hyphen and all lowercase';
        }
      },
      {
        type: "input",
        name: "description",
        message: "Description / purpose of the element"
      },
      {
        type: "input",
        name: "author",
        message: "Author of this element",
        store: true
      },
      {
        type: "input",
        name: "copyrightOwner",
        message: "Copyright owner of this work",
        store: true,
        default: "Red Hat, Inc."
      },
      {
        type: "list",
        name: "license",
        message: "Software License to use",
        store: true,
        default: "apache2",
        choices: [
          {
            name: "Apache 2.0",
            value: "Apache-2.0"
          },
          {
            name: "MIT",
            value: "MIT"
          },
          {
            name: "BSD 3 clause",
            value: "BSD-3-Clause"
          }
        ]
      },
      {
        type: "list",
        name: "useSass",
        message: "Do you want to use Sass in this element?",
        store: true,
        choices: [
          {
            name: "Yes",
            value: true
          },
          {
            name: "No",
            value: false
          }
        ]
      },
      {
        type: "list",
        name: "sassLibrary",
        when: answers => {
          return answers.useSass;
        },
        message: "Do want to use existing Sass dependencies?",
        choices: [
          {
            name: "rh-sass",
            value: {
              pkg: "@rhelements/rh-sass",
              path: "rh-sass/rh-sass"
            }
          },
          {
            name: "No thanks. I'll provide my own later",
            value: null
          }
        ]
      },
      {
        type: "list",
        name: "customElementClass",
        message: "Custom element base to build off of",
        store: true,
        choices: [
          {
            name: "VanillaJS, a pure HTMLElement extension, 0 dependencies",
            value: "HTMLElement"
          },
          {
            name: "RHElement, lightweight wrapper on Vanilla, 1 dependency",
            value: "RHElement"
          },
          {
            name: "SlimJS, data binding +, incredibly small",
            value: "Slim"
          },
          {
            name: "SkateJS + lit-html, data binding ++, very small",
            value: "SkateJS"
          },
          {
            name: "LitElement, data binding ++, very small",
            value: "LitElement"
          },
          {
            name: "Polymer (3), data binding +++, utilities to build complex things, relatively small",
            value: "PolymerElement"
          }
        ]
      },
      {
        type: "list",
        name: "addProps",
        message: "Do you want custom properties? (typically yes)",
        store: true,
        choices: [
          {
            name: "Yes",
            value: true
          },
          {
            name: "No",
            value: false
          }
        ]
      },
      {
        type: "list",
        name: "useHAX",
        message: "Do you want this element to work in the HAX authoring system?",
        store: true,
        when: answers => {
          return answers.addProps;
        },
        choices: [
          {
            name: "Yes",
            value: true
          },
          {
            name: "No",
            value: false
          }
        ]
      },
      {
        type: 'recursive',
        message: 'Add a new property to this element ?',
        name: 'propsList',
        when: answers => {
          return answers.addProps;
        },
        prompts: [
          {
            type: 'input',
            name: 'name',
            message: "Name of the property (examples: title, fistName, dataUrl)",
            validate: function (value) {
              if ((/\w/).test(value)) { return true; }
              return 'Property name must be a single word';
            }
          },
          {
            type: 'list',
            name: 'type',
            message: "What 'type' of value is this (the way it is used as data)",
            default: "String",
            choices: [
              {
                name: "String, text based input",
                value: "String"
              },
              {
                name: "Boolean, true/false value",
                value: "Boolean"
              },
              {
                name: "Number, pure number like 54",
                value: "Number"
              },
              {
                name: "Object, complex item storing multiple types",
                value: "Object"
              },
              {
                name: "Array, list of types",
                value: "Array"
              },
              {
                name: "Date, javascript date based object",
                value: "Date"
              },
            ]
          },
          {
            type: 'input',
            name: 'value',
            message: "Default value (leave blank for none)",
          },
          {
            type: 'list',
            name: 'reflectToAttribute',
            message: "Make available in css styles? [name=\"stuff\"] { color: blue; }",
            default: false,
            choices: [
              {
                name: "No",
                value: false
              },
              {
                name: "Yes",
                value: true
              },
            ]
          },
          {
            type: 'list',
            name: 'observer',
            message: "Notice changes to this property?",
            default: true,
            choices: [
              {
                name: "Yes",
                value: true
              },
              {
                name: "No",
                value: false
              },
            ]
          },
        ]
      }
    ]).then(answers => {
      // ensure answer is in kebabcase and lowercase
      answers.name = _.kebabCase(answers.name).toLowerCase();
      let name = answers.name.split("-")[1];
      this.capitalizeFirstLetter = (string) => {
        return string[0].toUpperCase() + string.slice(1);
      };
      this.props = {
        year: new Date().getFullYear(),
        author: answers.author,
        copyrightOwner: answers.copyrightOwner,
        license: answers.license,
        name: answers.name,
        humanName: this.capitalizeFirstLetter(answers.name.replace('-', ' ')),
        description: answers.description,
        elementName: answers.name,
        addProps: answers.addProps,
        propsListRaw: answers.propsList,
        includesString: '',
        connectedString: '',
        constructorString: '',
        propsList: {},
        propsListString: '',
        useHAX: answers.useHAX,
        haxList: {},
        haxListString: '',
        storyPropDeclaration: '',
        propsBindingFactory: '',
        storyHTMLProps: '',
        customElementClass: answers.customElementClass,
        elementClassName: _.chain(answers.name)
          .camelCase()
          .upperFirst()
          .value(),
        readmeName: _.upperFirst(name),
        lowerCaseName: name,
        camelCaseName: _.camelCase(answers.name),
        useSass: answers.useSass,
        sassLibraryPkg: false,
        sassLibraryPath: false,
        polymerLibraryPkg: false,
        litLibraryPkg: false,
        slimLibraryPkg: false,
        skateJSLibraryPkg: false,
        generatorRhelementVersion: packageJson.version
      };
      _.forEach(this.props.propsListRaw, (prop) => {
        if (prop.observer) {
          prop.observer = '_' + prop.name + 'Changed';
        }
        this.props.propsList[prop.name] = prop;
      });
      this.props.propsListString = JSON.stringify(this.props.propsList, null, '  ')
      // generate a string that can pull together the values needed for an HTML string
      _.forEach(this.props.propsListRaw, (prop) => {
        let method = 'text';
        // figure out the method to use as a knob
        switch (prop.type) {
          case 'Boolean':
          case 'Number':
          case 'Object':
          case 'Array':
          case 'Date':
            method = prop.type.toLowerCase();
          break;
          default: 
            method = 'text';
          break;
        }
        this.props.storyPropDeclaration += '  const ' + prop.name + ' = ' + method + '("' + prop.name + '", "' + prop.value + '");' + "\n";
      });
      _.forEach(this.props.propsListRaw, (prop) => {
        this.props.storyHTMLProps += _.kebabCase(prop.name) + '="${' + prop.name + '}"; ';
      });
      // work on HAX integration if requested
      if (this.props.useHAX) {
        this.props.includesString += 'import { HAXWiring } from "../hax-body-behaviors/lib/HAXWiring.js"';
        // @todo add support for props file dynamic rewriting
        //this.props.connectedString = 'this.HAXWiring = new HAXWiring;' + "\n" + '    this.HAXWiring.setHaxProperties(props, ' + this.props.elementClassName + '.tag, this);';
        // set baseline for HAX schema
        this.props.haxList = {
          'canScale': true,
          'canPosition': true,
          'canEditSource': false,
          'gizmo': {
            'title': this.props.humanName,
            'description': this.props.description,
            'icon': 'icons:android',
            'color': 'green',
            'groups': [this.props.readmeName],
            'handles': [
              {
                'type': 'todo:read-the-docs-for-usage',
              }
            ],
            'meta': {
              'author': this.props.author,
              'owner': this.props.copyrightOwner,
            }
          },
          'settings': {
            'quick': [],
            'configure': [],
            'advanced': []
          }
        };
        // wire HAX properties into the configure block by default
        _.forEach(this.props.propsListRaw, (prop) => {
          let method = 'textfield';
          let icon = 'icons:android';
          // attempt to map data type to hax inputMethod
          switch (prop.type) {
            case 'Boolean':
            case 'Array':
              method = prop.type.toLowerCase();
            break;
            case 'Object':
              method = 'array';
            break;
            case 'Date':
              method = 'datepicker';
              icon = 'icons:date-range';
            break;
          }
          let config = {
            property: prop.name,
            title: prop.humanName,
            description: '',
            inputMethod: method,
            required: false,
            icon: icon,
          };
          // guess a bit for decent starting points on some common ones we see all the time
          if (prop.name === 'source' || prop.name === 'src' || prop.name === 'url') {
            config.validationType = 'url';
            config.required = true;
            config.icon = 'icons:link';
            // make this quickly available
            this.props.haxList.settings.quick.push(config);
          }
          else if (prop.name === 'alt') {
            config.inputMethod = 'alt';
            config.required = true;
            config.icon = 'icons:accessibility';
            // make this quickly available
            this.props.haxList.settings.quick.push(config);
          }
          else if (prop.name === 'color' || prop.name === 'primaryColor' || prop.name === 'accentColor') {
            if (config.type === 'textfield') {
              config.inputMethod = 'colorpicker';
              config.icon = 'editor:format-color-fill';
              // make this quickly available by default
              this.props.haxList.settings.quick.push(config);
            }
          }
          this.props.haxList.settings.configure.push(config);
        });
      }
      // convert to string so we can write to the {name}-hax.json file
      this.props.haxListString = JSON.stringify(this.props.haxList, null, '  ')
      // mix in the template output related to customElementClass
      switch (answers.customElementClass) {
        case 'PolymerElement':
          this.props.templateReturnFunctionPart = "static get template() {\n    return html";
          _.forEach(this.props.propsListRaw, (prop) => {
            this.props.propsBindingFactory += '<div>[[' + prop.name + ']]</div>' + "\n";
          });
          this.props.polymerLibraryPkg = "@polymer/polymer";
        break;
        case 'LitElement':
          this.props.templateReturnFunctionPart = "render() {\n    return html";
          _.forEach(this.props.propsListRaw, (prop) => {
            this.props.propsBindingFactory += '<div>${this.' + prop.name + '}</div>' + "\n";
          });
          this.props.litLibraryPkg = "@polymer/lit-element";
        break;
        case 'SkateJS':
          this.props.templateReturnFunctionPart = "render() {\n    return html";
          _.forEach(this.props.propsListRaw, (prop) => {
            this.props.propsBindingFactory += '<div>${this.' + prop.name + '}</div>' + "\n";
          });
          this.props.skateJSLibraryPkg = "@skatejs/renderer-lit-html";
        break;
        case 'Slim':
          this.props.templateReturnFunctionPart = "render(tpl) {\n    this._render";
          _.forEach(this.props.propsListRaw, (prop) => {
            this.props.propsBindingFactory += '<div>{{' + prop.name + '}}</div>' + "\n";
          });
          this.props.slimLibraryPkg = "slim-js";
        break;
        case 'HTMLElement':
        case 'RHElement':
        default:
          this.props.templateReturnFunctionPart = "get html() {\n    return ";
          // vanilla element factories do not have native prop binding
          // maybe someday :(
        break;
      }
      if (answers.useSass) {
        if (answers.sassLibrary && answers.sassLibrary.pkg) {
          this.props.sassLibraryPkg = answers.sassLibrary.pkg;
        }

        if (answers.sassLibrary && answers.sassLibrary.path) {
          this.props.sassLibraryPath = answers.sassLibrary.path;
        }
      }
      mkdirp.sync(this.props.elementName);
    });
  }

  writing() {
    this.fs.copyTpl(
      this.templatePath("package.json"),
      this.destinationPath(`${this.props.elementName}/package.json`),
      this.props
    );

    this.fs.copyTpl(
      this.templatePath("index.html"),
      this.destinationPath(`${this.props.elementName}/index.html`),
      this.props
    );

    this.fs.copyTpl(
      this.templatePath(`licenses/${this.props.license}.md`),
      this.destinationPath(
        `${this.props.elementName}/LICENSE.md`
      ),
      this.props
    );
    
    this.fs.copyTpl(
      this.templatePath(`src/${this.props.customElementClass}.js`),
      this.destinationPath(
        `${this.props.elementName}/src/${this.props.elementName}.js`
      ),
      this.props
    );
    this.fs.copyTpl(
      this.templatePath(`src/properties.json`),
      this.destinationPath(
        `${this.props.elementName}/src/${this.props.elementName}-properties.json`
      ),
      this.props
    );
    this.fs.copyTpl(
      this.templatePath(`src/hax.json`),
      this.destinationPath(
        `${this.props.elementName}/src/${this.props.elementName}-hax.json`
      ),
      this.props
    );

    this.fs.copyTpl(
      this.templatePath("README.md"),
      this.destinationPath(`${this.props.elementName}/README.md`),
      this.props
    );

    this.fs.copyTpl(
      this.templatePath("gulpfile.js"),
      this.destinationPath(`${this.props.elementName}/gulpfile.js`),
      this.props
    );

    this.fs.copyTpl(
      this.templatePath("rollup.config.js"),
      this.destinationPath(`${this.props.elementName}/rollup.config.js`),
      this.props
    );

    this.fs.copyTpl(
      this.templatePath("demo/index.html"),
      this.destinationPath(`${this.props.elementName}/demo/index.html`),
      this.props
    );

    this.fs.copyTpl(
      this.templatePath("test/element_test.html"),
      this.destinationPath(
        `${this.props.elementName}/test/${this.props.elementName}_test.html`
      ),
      this.props
    );

    this.fs.copyTpl(
      this.templatePath("test/index.html"),
      this.destinationPath(`${this.props.elementName}/test/index.html`),
      this.props
    );

    this.fs.copyTpl(
      this.templatePath("element.story.js"),
      this.destinationPath(
        `${this.props.elementName}/${this.props.elementName}.story.js`
      ),
      this.props
    );

    this.fs.copy(
      this.templatePath(".*"),
      this.destinationPath(`${this.props.elementName}`)
    );

    this.fs.copy(
      this.templatePath("polymer.json"),
      this.destinationPath(`${this.props.elementName}/polymer.json`)
    )

    if (this.props.useSass) {
      this.fs.copyTpl(
        this.templatePath("src/element.scss"),
        this.destinationPath(
          `${this.props.elementName}/src/${this.props.elementName}.scss`
        ),
        this.props
      );
    } else {
      this.fs.copy(
        this.templatePath("src/element.css"),
        this.destinationPath(`${this.props.elementName}/src/${this.props.elementName}.css`)
      )
    }

    this.fs.copyTpl(
      this.templatePath("src/element.html"),
      this.destinationPath(`${this.props.elementName}/src/${this.props.elementName}.html`),
      this.props
    );
  }
  install() {
    process.chdir(this.props.elementName);

    this.installDependencies({
      npm: true,
      bower: false,
      yarn: false
    });
  }

  end() {
    this.spawnCommand("npm", ["run", "build"]);
  }
};
