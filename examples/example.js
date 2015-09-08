$(function () {

    // define select editor properties
    var authors = {"values": [{value: 1, display: "Bob"}, {value: 2, display: "John"}, {value: 3, display: "Alice"}, {value: 4, display: "Jane"}]};
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
            "author": _.shuffle(authors.values)[0].display,
			"title": "Test " + i + Math.round(Math.random() * 1000),
			"count": Math.round(Math.random() * 100)
		});
	}

    // define columns
	var columns = [
		{name: "id", type: "int"},
        {name: "is_admin", type: "boolean", editor: "BooleanEditor"},
        {name: "created_at", type: "string", editor: "DateEditor", displayName: "Created"},
        {name: "author", type: "string", editor: "SelectEditor", editorProps: authors},
        {name: "body", type: "string", editor: "TextareaEditor"},
		{name: "status", type: "string", editor: "SelectEditor", editorProps: statuses},
		{name: "title", type: "string"},
		{name: "count", type: "string"}
	];

    // initialize grid
    var options = {emptyRow: true, sortable: false, disableKeys: [], moveOnRowRemove: true};
	var grid = $(".sensei-grid-default").grid(data, columns, options);

    // register editors that are bundled with sensei grid
    grid.registerEditor(BasicEditor);
    grid.registerEditor(BooleanEditor);
    grid.registerEditor(TextareaEditor);
    grid.registerEditor(SelectEditor);
    grid.registerEditor(DateEditor);
    //grid.registerEditor(DisabledEditor);

    // register row actions
    // grid.registerRowAction(BasicRowActions);

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
    grid.events.on("row:remove", function (data, row, $row) {
        console.info("row remove:", data, row, $row);
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

    // html demo

    // generate data
    var data2 = [];
    for (var i = 0; i < 6; ++i) {
        data2.push({
            "id": i + 1,
            "body": "The <mark>quick, brown</mark> fox <b>jumps</b> over a <em>lazy</em> <u>dog</u>.",
            "title": function () {
                var num = Math.round(Math.random() * 1000);
                if (num > 500) {
                    return "<span style='color:green'>Test " + num + "</span>";
                } else {
                    return "<span style='color:red'>Test " + num + "</span>";
                }
            }
        });
    }

    var columns2 = [
        {name: "id", type: "int"},
        {name: "body", type: "string", editor: "TextareaEditor", allowHTML: true},
        {name: "title", type: "string", allowHTML: true}
    ];

    var grid2 = $(".sensei-grid-html").grid(data2, columns2, options);
    grid2.registerEditor(BasicEditor);
    grid2.registerEditor(TextareaEditor);
    grid2.render();

    // export grids for tinkering
    window.grid = grid;
    window.grid2 = grid2;
});