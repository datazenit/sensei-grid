Sensei Grid
===========

Simple data grid library written in JavaScript. The data grid is part of [Datazenit](http://datazenit.com), a web-based database administration tool.

**Not intended for production use.** This is the first public release, and the project is currently under active development. 

Dependencies: jQuery and underscore.js/lodash. The example in this repository also uses Twitter Bootstrap for default styles.

## Demo and Screenshot

Demo: http://datazenit.com/static/sensei-grid/examples/

[![Sensei Grid Screenshot](http://lauris.github.io/images/blog/sensei-grid-screenshot.png)](http://datazenit.com/static/sensei-grid/examples/)

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

## Roadmap

Planned for the upcoming releases:

* Tests and full coverage
* Event callbacks (e.g., save, load, render, move, sort) for an easy extensibility
* Field types (e.g., string, int, date, float)
* Example editor for specific field types (a simple datepicker for date field and similar examples)
* Optional column definition (if the structure of data is simple, assume default column settings)
* Firefox compatibility issues (there are currently some issues with table rendering in Firefox)
* Configuration parameters for grid
* Column sorting (not sure about this just yet)