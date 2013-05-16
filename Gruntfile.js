module.exports = function( grunt ) {

	grunt.initConfig( {
		pkg : grunt.file.readJSON( "package.json" ),
		banner : "/*\n" +
				" * Backbone.Courier, v<%= pkg.version %>\n" +
				" * Copyright (c)2013 Rotunda Software, LLC.\n" +
				" * Distributed under MIT license\n" +
				" * http://github.com/rotundasoftware/backbone.courier\n" +
				"*/\n",

		concat : {
			options : {
				banner : "<%= banner %>",
				stripBanners : true
			},
			js : {
				src : ["src/backbone.courier.js"],
				dest : "dist/backbone.courier.js"
			}
		},
		uglify : {
			options : {
				banner : "<%= banner %>"
			},
			dist : {
				src : "<%= concat.js.dest %>",
				dest : "dist/backbone.courier.min.js"
			}
		}
	} );

	grunt.loadNpmTasks( "grunt-contrib-concat" );
	grunt.loadNpmTasks( "grunt-contrib-uglify" );

	grunt.registerTask( "default", [ "concat", "uglify" ] );
};
