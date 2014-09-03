module.exports = function(grunt) {
	grunt.initConfig({
		cssmin: {
			combine: {
				files: {
					'sensei-grid.min.css': [
						'reset.css',
						'bootstrap.min.css',
						'sensei-grid.css'
					]
				}
			}
		},
		uglify: {
			sensei: {
				files: {
					'sensei-grid.min.js': ['jquery/dist/jquery.min.js', 'lodash/dist/lodash.min.js', 'sensei-grid.js', 'sensei-editors.js'],
				}
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-less');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-handlebars');
	grunt.loadNpmTasks('grunt-shell');
	grunt.loadNpmTasks('grunt-concurrent');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-requirejs');
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-html-build');
	grunt.loadNpmTasks('grunt-preprocess');

	grunt.registerTask('build', ['uglify:sensei', 'cssmin']);
};
