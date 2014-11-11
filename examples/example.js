$(function () {

    // define select editor properties
    var authors = {"values": ["Bob", "John", "Alice", "Jane"]};
    var statuses = {"values": ["In progress", "Completed", "Done", "Verified"]};

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
			"title": "Test " + i + Math.round(Math.random() * 1000),
			"count": Math.round(Math.random() * 100)
		});
	}

    // define columns
	var columns = [
		{name: "id", type: "int"},
        {name: "is_admin", type: "boolean", editor: "BooleanEditor"},
        {name: "created_at", type: "string", editor: "DateEditor"},
        {name: "author", type: "string", editor: "SelectEditor", editorProps: authors},
        {name: "body", type: "string", editor: "TextareaEditor"},
		{name: "status", type: "string", editor: "SelectEditor", editorProps: statuses},
		{name: "title", type: "string"},
		{name: "count", type: "string"}
	];

    // initialize grid
    var options = {emptyRow: true, sortable: false};
	var grid = $(".sensei-grid").grid(data, columns, options);

    // register editors that are bundled with sensei grid
    grid.registerEditor(BasicEditor);
    grid.registerEditor(BooleanEditor);
    grid.registerEditor(TextareaEditor);
    grid.registerEditor(SelectEditor);
    grid.registerEditor(DateEditor);

    // example listeners on grid events
    grid.events.on("editor:save", function (data, $cell) {
        console.info("save cell:", data, $cell);
    });
    grid.events.on("editor:load", function (data, $cell) {
        console.info("set value in editor:", data, $cell);
    });
    grid.events.on("cell:select", function ($cell) {
        console.info("active cell:", $cell);
    });
    grid.events.on("cell:clear", function (oldValue, $cell) {
        console.info("clear cell:", oldValue, $cell);
    });
    grid.events.on("cell:deactivate", function ($cell) {
        console.info("cell deactivate:", $cell);
    });
    grid.events.on("row:select", function ($row) {
        console.info("row select:", $row);
    });
    grid.events.on("row:save", function (data, $row, source) {
        console.info("row save:", source, data);
        // save row via ajax or any other way
        // simulate delay caused by ajax and set row as saved
        setTimeout(function () {
            grid.setRowSaved($row);
        }, 1000);
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

    window.grid = grid;
});