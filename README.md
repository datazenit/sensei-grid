# Sensei Grid [![Build Status](https://travis-ci.org/datazenit/sensei-grid.svg?branch=master)](https://travis-ci.org/datazenit/sensei-grid)

Simple data grid library written in JavaScript. The data grid is part of [Datazenit](http://datazenit.com), a web-based database administration tool.

**Currently not intended for production use.** This is the first public release, and the project is currently under active development.

Dependencies: jQuery and underscore.js/lodash. The example in this repository also uses Twitter Bootstrap for default styles.

## Demo and Screenshot

Demo: http://datazenit.com/static/sensei-grid/examples/

[![Sensei Grid Screenshot](http://lauris.github.io/images/blog/sensei-grid-screenshot.png)](http://datazenit.com/static/sensei-grid/examples/)

## Blog posts

* [Work and open source #2: Sensei Grid](http://lauris.github.io/datazenit/2014/08/29/open-source-work-2-sensei-grid/)
* [First public release of Sensei Grid](http://lauris.github.io/development/2014/09/03/first-public-release-sensei-grid/)
* [Sensei Grid Roadmap](http://lauris.github.io/development/2014/09/04/sensei-grid-roadmap/)
* [Sensei Grid Daily Overview](http://lauris.github.io/development/2014/09/05/sensei-grid-daily-overview/)

## Goals

* **Simplicity**: Sensei Grid will be a single purpose data grid without unrelated functionality.
* **Small code base**: Bloatware and dirty workarounds/hacks will be avoided as much as possible to keep the code base small and tidy.
* **Extensibility**: Even though Sensei Grid will be kept simple, we will put serious effort to make it easy to extend and customize.
* **Stability**: Sensei Grid is backed by [Datazenit](http://datazenit.com), meaning that the project is financially supported and will be constantly maintained and improved.

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
