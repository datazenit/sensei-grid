"use strict";

module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        banner: '/**\n * <%= pkg.name %> v<%= pkg.version %>\n' +
        ' * Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author %>\n' +
        ' * Licensed under <%= pkg.license %> \n*/\n',

        concat: {
            options: {
                banner: '<%= banner %>',
                stripBanners: true
            },
            js: {
                src: ['src/<%= pkg.name %>.js', 'src/sensei-editors.js'],
                dest: 'dist/<%= pkg.name %>.js'
            },
            css: {
                src: ['src/css/reset.css', 'src/css/<%= pkg.name %>.css'],
                dest: 'dist/<%= pkg.name %>.css'
            }
        },
        uglify: {
            options: {
                banner: '<%= banner %>'
            },
            dist: {
                src: '<%= concat.js.dest %>',
                dest: 'dist/<%= pkg.name %>.min.js'
            }
        },
        jshint: {
            options: {
                curly: true,
                eqeqeq: true,
                immed: true,
                latedef: true,
                newcap: true,
                noarg: true,
                sub: true,
                undef: true,
                unused: true,
                boss: true,
                eqnull: true,
                browser: true,
                node: true,
                predef: ["_"],
                globals: {
                    jQuery: true
                }
            },
            gruntfile: {
                src: 'Gruntfile.js'
            },
            src: {
                src: 'src/*.js'
            }
        },
        cssmin: {
            minify: {
                files: {
                    'dist/sensei-grid.min.css': [
                        'src/css/reset.css',
                        'src/css/sensei-grid.css'
                    ]
                }
            }
        },
        jasmine: {
            src: ['src/sensei-grid.js', 'src/sensei-editors.js'],
            options: {
                vendor: ['lib/jquery/dist/jquery.js', 'lib/lodash/dist/lodash.js'],
                specs: 'test/*Spec.js',
                helpers: ["test/helpers.js"],
                styles: ['src/css/reset.css', 'src/css/sensei.grid']
            }
        },
        watch: {
            gruntfile: {
                files: '<%= jshint.gruntfile.src %>',
                tasks: ['jshint:gruntfile']
            },
            jasmine: {
                files: ['src/*.js', 'test/*.js'],
                tasks: ['jasmine']
            }
        }
    });

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-jasmine');

    // Tasks
    grunt.registerTask('test', ['jshint', 'jasmine']);
    grunt.registerTask('build', ['test', 'concat', 'uglify', 'cssmin']);
    grunt.registerTask('default', ['build']);

};
