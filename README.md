Sensei Grid
===========

Simple data grid library written in JavaScript. The data grid is part of [Datazenit](http://datazenit.com), a web-based database administration tool.

Dependencies: jQuery and underscore.js/lodash. The example in this repository also uses Twitter Bootstrap for default styles.

Demo: http://datazenit.com/static/sensei-grid/examples/

This is the first public release, and the project is in a development stage. Not intended for production use.

## Basic Usage

Define your data array. Each row is represented by an object.

	var data = [
		{id: 1, title: "test"},
		{id: 2, title: "foo bar"},
	];

Currently it is mandatory to define columns in a separate array for Sensei Grid to work  

	var columns = [
		{name: "id", type: "string"},
		{name: "title", type: "string"}
	}

Initialize grid with data and columns

	var grid = $(".example").grid(data, columns);

Register at least one editor (BasicEditor is bundled with Sensei Grid)

	grid.registerEditor(BasicEditor);

Render data grid in ``.example`` container.

	grid.render();