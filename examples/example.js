$(function() {

	// define select editor properties
	var authors = {
		"values": ["Bob", "John", "Alice", "Jane"]
	};
	var occupations = {
		"values": ["Engineer", "Programmer", "Designer", 
			"Administrator", "Manager", "Director", 
			"Accountant"]
	};
	var statuses = {
		"values": ["In progress", "Completed", "Done", "Verified"]
	};

	// generate data
	var data = [];
	for (var i = 0; i < 6; ++i) {
		data.push({
			"id": i + 1,
			"created_at": new Date().toDateString(),
			"is_admin": true,
			"status": _.shuffle(statuses.values)[0],
			"body": "The quick, brown fox jumps over a lazy dog.",
			"author": _.shuffle(authors.values)[0],
			"occupation": _.shuffle(occupations.values)[0],
			"title": "Test " + i + Math.round(Math.random() * 1000),
			"count": Math.round(Math.random() * 100)
		});
	}

	// define columns
	var columns = [{
		name: "id",
		type: "int"
	}, {
		name: "is_admin",
		type: "boolean",
		editor: "BooleanEditor",
    	display: "admin"
	}, {
		name: "created_at",
		type: "string",
    	display: "created at",
		editor: function (grid) {

			// var $td = grid.getActiveCell();
			// var data = grid.getCellData($td);
			// var $row = grid.getCellRow($td);
			// var rowData = grid.getRowData($row);

			// insert some logic here to choose editor

			return "DateEditor";
		}
	}, {
	    name: "author",
	    type: "string",
	    editor: "SelectEditor",
	    editorProps: authors
	}, {
		name: "occupation",
		type: "string",
		editor: "AutocompleteEditor",
		editorProps: occupations
	}, {
		name: "body",
		type: "string",
		editor: "TextareaEditor"
	}, {
		name: "status",
		type: "string",
		editor: "SelectEditor",
		editorProps: statuses
	}];

	// initialize grid
	var options = {
		// add an empty row at the end of grid
		emptyRow: true,
		// enable sortable callbacks
		sortable: true,
		// disable specific keys
		disableKeys: [],
		// move active cell when a row is removed
		moveOnRowRemove: true,
		// skip these cells on duplicate action
		skipOnDuplicate: ["id"],
		// set the initial order of table
		initialSort: {col: "id", order: "asc"},
		selectable: false
	};

  // initialize grid with data, column mapping and options
	var grid = $(".sensei-grid-default").grid(data, columns, options);

	// register editors that are bundled with sensei grid
	grid.registerEditor(BasicEditor);
	grid.registerEditor(BooleanEditor);
	grid.registerEditor(TextareaEditor);
	grid.registerEditor(SelectEditor);
	grid.registerEditor(DateEditor);
	grid.registerEditor(AutocompleteEditor);
	grid.registerEditor(DisabledEditor);

	// register row actions
	// grid.registerRowAction(BasicRowActions);

	// example listeners on grid events
	grid.events.on("editor:save", function(data, $cell) {
		//console.info("save cell:", data, $cell);
	});
	grid.events.on("editor:load", function(data, $cell) {
		//console.info("set value in editor:", data, $cell);
	});
	grid.events.on("cell:select", function($cell) {
		console.info("active cell:", $cell);
	});
	grid.events.on("cell:clear", function(oldValue, $cell) {
		console.info("clear cell:", oldValue, $cell);
	});
	grid.events.on("cell:deactivate", function($cell) {
		console.info("cell deactivate:", $cell);
	});
	grid.events.on("row:select", function($row) {
		console.info("row select:", $row);
	});
	grid.events.on("row:remove", function(data, row, $row) {
		console.info("row remove:", data, row, $row);
	});
  grid.events.on("row:mark", function($row) {
    console.info("row mark:", $row);
  });
  grid.events.on("row:unmark", function($row) {
    console.info("row unmark:", $row);
  });
	grid.events.on("row:save", function(data, $row, source) {
		console.info("row save:", source, data);
		// save row via ajax or any other way
		// simulate delay caused by ajax and set row as saved
		setTimeout(function() {
			grid.setRowSaved($row);
		}, 1000);
	});

  // implement basic sorting
  grid.events.on("column:sort", function(col, order, $el) {
    console.info("column sort:", col, order, $el);
    var sorted = _.sortBy(data, col);
    if (order === "desc") {
      sorted = sorted.reverse();
    }
    grid.updateData(sorted);
  });

	// render grid
	grid.render();

	// api examples
	var $row = grid.getRowByIndex(5);
	console.group("data api examples");
	console.log("grid.getRowDataByIndex(0):", grid.getRowDataByIndex(0));
	console.log("grid.getRowData($row):", grid.getRowData($row));
	console.log("grid.getCellDataByIndex(0, 1):", grid.getCellDataByIndex(0, 1));
	console.log("grid.getCellDataByKey(2, created_at):", grid.getCellDataByKey(2, "created_at"));
	console.log("grid.getGridData():", grid.getGridData());
	console.groupEnd();

	// html demo

	// generate data
	var data2 = [];
	for (i = 0; i < 6; ++i) {
		data2.push({
			"id": i + 1,
			"body": "The <mark>quick, brown</mark> fox <b>jumps</b> over a <em>lazy</em> <u>dog</u>.",
			"title": function() {
				var num = Math.round(Math.random() * 1000);
				if (num > 500) {
					return "<span style='color:green'>Test " + num + "</span>";
				} else {
					return "<span style='color:red'>Test " + num + "</span>";
				}
			}
		});
	}

	var columns2 = [{
		name: "id",
		type: "int"
	}, {
		name: "body",
		type: "string",
		editor: "TextareaEditor",
		allowHTML: true
	}, {
		name: "title",
		type: "string",
		allowHTML: true
	}];

  // disable sorting for rest of the grids
  options.sortable = false;
  options.selectable = false;
  options.toolbar = false;

	var grid2 = $(".sensei-grid-html").grid(data2, columns2, options);
	grid2.registerEditor(BasicEditor);
	grid2.registerEditor(TextareaEditor);
	grid2.render();

  options.readonly = true;
  options.emptyRow = false;
	var grid3 = $(".sensei-grid-readonly").grid(data, columns, options);
	grid3.render();

  options.readonly = false;
	var grid4 = $(".sensei-grid-rowactions").grid(data, columns2, options);
	grid4.registerEditor(BasicEditor);
	grid4.registerEditor(TextareaEditor);

  // register demo row action
  grid4.registerRowAction(DemoRowAction);
  grid4.registerRowAction(DeleteRowAction);

	grid4.render();

  window.grids = [grid,grid2,grid3,grid4];

});
