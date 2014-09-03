(function ($) {

    // editor interface
    window.Editor = function(grid) {
        this.grid = grid;
    };
    Editor.extend = function (props) {
        var parent = this;
        var child;

        child = function(){ return parent.apply(this, arguments); };

        var Surrogate = function(){ this.constructor = child; };
        Surrogate.prototype = parent.prototype;
        child.prototype = new Surrogate;

        if (props) { 
            _.extend(child.prototype, props);
        }

        child.__super__ = parent.prototype;

        return child;
    };
    Editor.prototype.getElement = function () {
        return $(this.editor);
    };
    Editor.prototype.isVisible = function () {
        return this.getElement() && this.getElement().is(":visible");
    };
    Editor.prototype.initialize = function () {};
    Editor.prototype.render = function () {};
    Editor.prototype.show = function () {
        this.getElement().show();
    };
    Editor.prototype.hide = function () {
        console.log("Editor hide");
        this.getElement().hide();
        this.grid.activeEditor.activeCell = null;
        this.grid.activeEditor = null;
    };
    Editor.prototype.getValue = function () {
        console.warn("Editor.getValue not implemented")
    };
    Editor.prototype.setValue = function () {
        console.warn("Editor.setValue not implemented")
    };

    $.fn.grid = function (data, columns, options) {

        var plugin = this,
            defaults = {
                sortable: true,
                tableClass: "table table-bordered table-condensed"
            };

        plugin.isEditing = false;

        $.fn.isOnScreen = function(){
    
            var win = $(window);
            
            var viewport = {
                top : win.scrollTop(),
                left : win.scrollLeft()
            };
            viewport.right = viewport.left + win.width();
            viewport.bottom = viewport.top + win.height();
            
            var bounds = this.offset();
            bounds.right = bounds.left + this.outerWidth();
            bounds.bottom = bounds.top + this.outerHeight();
            
            return (!(viewport.right < bounds.left || viewport.left > bounds.right || viewport.bottom < bounds.top || viewport.top > bounds.bottom));
            
        };

        $.fn.setActiveCell = function () {
            $("tr", plugin.$el).removeClass("activeRow");
            $("tr>.activeCell", plugin.$el).removeClass("activeCell");
            $(this).addClass("activeCell");
            $(this).parent("tr").addClass("activeRow");
        };

        // fixes inconsistent position in firefox/chrome
        // for this to work a div is needed inside table cell
        $.fn.cellPosition = function () {
            var pos = $("div", this).position();
            console.log("cell pos", pos);
            pos.left = Math.round(pos.left);
            pos.top = Math.round(pos.top);
            var paddingH = $(this).outerWidth() - $(this).width();
            var paddingV = $(this).outerHeight() - $(this).height();
            pos.top -= Math.round(paddingV / 2);
            pos.left -= Math.round(paddingH / 2);
            return pos;
        };

        plugin.events = {_events: {}};
        // need to allow multiple callbacks on single event
        plugin.events.on = function (event, callback, context) {
            if (!_.has(this._events, event)) {
                this._events[event] = [];
            }
            this._events[event].push({callback: callback, context: context});
        };
        plugin.events.trigger = function (event) {
            if (_.has(this._events, event)) {
                var events = this._events[event];
                _.each(events, function (e) {
                    console.log("trigger event", event, e);
                    _.bind(e["callback"], e["context"]);
                });
            }
        };
        plugin.events.off = function (event, callback) {
            if (_.has(this._events, event)) {
                delete this._events[event];
            }
        };

        plugin.registerEditor = function (editor) {
            var instance = new editor(plugin);
            plugin.editors[instance.name] = instance;
        };

        plugin.render = function () {
            console.log("render");

            plugin.renderBaseTable();
            plugin.renderColumns();
            plugin.renderData();
            
            _.each(plugin.editors, function (editor) { 
                editor.initialize();
                editor.render();
                // hide the editor
                editor.getElement().hide();
            });

            // plugin.renderEditor();
            plugin.bindEvents();
        };
        plugin.bindEvents = function () {
            plugin.$el.on("click", "tr>td", plugin.clickCell);
            plugin.$el.on("dblclick", "tr>td", plugin.dblClickCell);
            plugin.$el.on("blur", plugin.blur);
            $(document).on("click", plugin.editorBlur);
            plugin.$el.on("focusin", ".sensei-grid-editor", function (e) {
                console.log("focus on editor", e);
            });
            plugin.$el.on("keydown", plugin.keydown);
        };

        plugin.unbindEvents = function () {

        };

        plugin.editorBlur = function (e) {
            if(plugin.$el.has($(e.target)).length === 0) {
                console.log("editorBlur -> is grid event:", plugin.$el.has($(e.target)).length);
                plugin.exitEditor();
                plugin.deactivateCell();    
            }
        };

        plugin.hideEditors = function () {
            $(".sensei-grid-editor", plugin.$el).hide();
        }

        plugin.blur = function (e) {
            // check if focus has moved to editor
            console.log("blur", e.relatedTarget);
            // e.relatedTarget && plugin.$el.has($(e.relatedTarget))
            // not firefox compatible
            if (plugin.isEditing) {
                console.log("focus moved to editor");
            } else {
                console.log("grid blur, focus not on editor");
                plugin.exitEditor();
                this.isEditing = false;
                plugin.deactivateCell();
            }
        };

        plugin.getActiveCell = function () {
            // if editor is active, get active cell from it
            if (plugin.isEditing && plugin.activeEditor && plugin.activeEditor.activeCell) {
                // console.log("getActiveCell", plugin.activeEditor, plugin.activeEditor.activeCell);
                return plugin.activeEditor.activeCell;
            } else {
                // console.log("getActiveCell by classname")
                return $("td.activeCell", plugin.$el);                
            }
        };

        plugin.deactivateCell = function () {
            console.log("deactivateCell");
            var $td = plugin.getActiveCell();
            $td.removeClass("activeCell");
            $td.parent("tr").removeClass("activeRow");
        };

        plugin.clearActiveCell = function () {
            var $td = plugin.getActiveCell();
            $(">div", $td).empty();
        };

        plugin.moveRight = function () {

            var $td = plugin.getActiveCell();

            if ($td.next().length > 0) {
                // console.log("there is next el");
                $td.next().setActiveCell();
            } else {
                // try next row
                var $nextRow = $td.parent("tr").next();
                if ($nextRow.length > 0) {
                    // console.log("nextRow", $nextRow);
                    $("td:first", $nextRow).setActiveCell();
                } else {
                    // console.log("end of table");
                }
            }
        };

        plugin.moveUp = function () {

            var $td = plugin.getActiveCell();

            var $prevRow = $td.parent("tr").prev();
            if ($prevRow.length > 0) {
                // console.log("there is prev row");
                var index = $td.index();
                var $upCell = $("td", $prevRow).eq(index);
                if ($upCell.length > 0) {
                    // console.log("there is a cell precisely up");
                    $upCell.setActiveCell();
                } else {
                    // console.log("strange, no cell up, select last one", $upCell);
                    $("td:last", $prevRow).setActiveCell();
                }
            } else {
                // console.log("this is top row");
            }
        };

        plugin.moveLeft = function () {

            var $td = plugin.getActiveCell();

            console.log("left");
            if ($td.prev().length > 0) {
                // console.log("there is prev el");
                $td.prev().setActiveCell();
            } else {
                // try next row
                var $prevRow = $td.parent("tr").prev();
                if ($prevRow.length > 0) {
                    // console.log("prevRow", $prevRow);
                    $("td:last", $prevRow).setActiveCell();
                } else {
                    // console.log("beginning of table");
                }
            }
        };

        plugin.moveDown = function () {

            var $td = plugin.getActiveCell();

            var $nextRow = $td.parent("tr").next();
            if ($nextRow.length > 0) {
                // console.log("there is next row");
                var index = $td.index();
                var $downCell = $("td", $nextRow).eq(index);
                if ($downCell.length > 0) {
                    // console.log("there is a cell precisely down");
                    $downCell.setActiveCell();
                } else {
                    // console.log("strange, no cell down, select last one", $downCell);
                    $("td:first", $nextRow).setActiveCell();
                }
            } else {
                // console.log("this is top row");
            }
        };

        plugin.move = function (direction) {
            var directionMethod = "move" + direction.charAt(0).toUpperCase() + direction.substr(1);
            if (_.has(plugin, directionMethod)) {

                // move active cell
                plugin[directionMethod]();

                if (plugin.isEditing) {
                    // save & hide editor
                    plugin.saveEditor();   
                }

                if (plugin.isEditing) {
                    // show editor for currently active cell
                    console.log("move -> edit cell", plugin.getActiveCell());
                    plugin.editCell();
                }

                // scroll cell into viewport
                if (!plugin.getActiveCell().find(">div").isOnScreen()) {
                    if (_.contains(["up", "left"], direction)) {
                        plugin.getActiveCell().get(0).scrollIntoView(true);    
                    } else {
                        plugin.getActiveCell().get(0).scrollIntoView(false);                        
                    }
                }

            } else {
                console.warn("move method not found", directionMethod);
            }
        };

        plugin.editCell = function () {

            // var $td = plugin.getActiveCell();
            // var $editor = plugin.getEditor().getElement();

            console.log("editCell");

            plugin.showEditor();

            // $editor.css($td.cellPosition());
            // $editor.css({width: $td.outerWidth() + 1, height: $td.outerHeight() + 1});
        };

        plugin.getActiveCellType = function () {
            var $td = plugin.getActiveCell();
            return "string";
        };

        plugin.getEditor = function () {
            return plugin.activeEditor;
        };

        plugin.getEditorInstance = function () {
            var $td = plugin.getActiveCell();

            var editorName = $td.data("editor");

            // console.info("getEditor", editorName);

            if (editorName && _.has(plugin.editors, editorName)) {
                console.log("getEditor", editorName);
                return plugin.editors[editorName];
            }

            console.warn("Editor not found:", editorName);
            return null;
        };

        plugin.saveEditor = function () {
            console.log("save editor");

            var $editor = plugin.getEditor().getElement();

            // save editor if is active
            if (plugin.isEditing) {
                // var val = $("input", $editor).val();
                var val = plugin.activeEditor.getValue();
                console.log("save editor value:", val);
                plugin.getActiveCell().html($("<div>").text(val));
            }

            // hide editor
            plugin.getEditor().hide();

            // remove active editor, because it is not needed anymore
            // previously it was used for active cell reference
        };

        plugin.exitEditor = function (skipSave) {
            console.log("exit editor");
            var $td = plugin.getActiveCell();
            if (plugin.isEditing && plugin.activeEditor) {
                if (!skipSave) {
                    plugin.saveEditor();
                } else {
                    plugin.getEditor().hide();                    
                }
            }

            // need to regain focus
            console.log("need to regain focus on sensei-grid");
            $td.setActiveCell();
            plugin.$el.focus();

            plugin.isEditing = false;
        };

        plugin.moveEditor = function () {
            if (plugin.isEditing) {
                plugin.showEditor();
                console.log("editor is visible, move along");
                plugin.editCell(); // editCell was called with plugin.getActiveCell() previously
            }
        };

        plugin.showEditor = function () {

            console.log("show editor");

            // set active editor instance
            plugin.activeEditor = plugin.getEditorInstance();

            // assign element instances
            var $editor = plugin.activeEditor.getElement();
            var $td = plugin.getActiveCell();
            plugin.activeEditor.activeCell = $td;

            // set editing mode after we have gotten active cell
            plugin.isEditing = true;

            // show editor and set correct position
            $editor.show();
            $editor.css($td.cellPosition());
            $editor.css({width: $td.outerWidth() + 1, height: $td.outerHeight() + 1});

            // set value in editor
            plugin.activeEditor.setValue($td.text());

            return $editor;
        };

        plugin.isVisibleEditor = function () {
            return _.find(plugin.editors, function (editor) { return editor.isVisible(); });
        };

        plugin.keydown = function (e) {

            var preventDefault = true;

            // all keyCodes that will be used
            var codes = [8, 9, 13, 27, 37, 38, 39, 40];

             // specific keyCodes that won't be hijacked from the editor
            var editorCodes = [8, 37, 38, 39, 40];

            if ((plugin.getActiveCell().length === 0 && !plugin.isEditing) || !_.contains(codes, e.keyCode)) {
                return;
            }

            if (plugin.isEditing && _.contains(editorCodes, e.keyCode)) {
                return;
            } else {
                e.preventDefault();
            }

            switch (e.keyCode) {
                case 37: // left
                    plugin.move("left");
                    break;
                case 38: // up
                    plugin.move("up");
                    break;
                case 39: // right
                    plugin.move("right");
                    break;
                case 40: // down
                    plugin.move("down");
                    break;
                case 13: // enter
                    if (plugin.isEditing) {
                        if (e.ctrlKey && e.shiftKey) {
                            console.log("ctrl + shift + enter", "move editor up");
                            plugin.move("up");
                        } else if (e.ctrlKey && !e.shiftKey) {
                            console.log("ctrl + enter", "move editor down");
                            plugin.move("down");
                        } else {
                            console.log("enter", "exit editor");
                            plugin.exitEditor();
                        }
                    } else {
                        console.log("enter", "edit cell");
                        plugin.editCell();
                    }
                    break;
                case 27: // esc
                    if (plugin.isEditing) {
                        plugin.exitEditor(true);
                    } else {
                        // remove focus from grid
                        plugin.$el.blur();
                    }
                    break;
                case 9: // tab
                    if (e.shiftKey) {
                        plugin.move("left");
                    } else {
                        plugin.move("right");
                    }
                    break;
                case 8: // backspace
                    plugin.clearActiveCell();
                    break;
            }

            if (preventDefault) {
                e.preventDefault();
            }
        };

        plugin.clickCell = function (e) {
            e.preventDefault();
            console.log("clicked cell");
            if (plugin.isVisibleEditor()) {
                plugin.exitEditor();                
            }
            $(this).setActiveCell();
        };

        plugin.dblClickCell = function (e) {
            e.preventDefault();
            console.log("double clicked cell");
            $(this).setActiveCell();
            plugin.editCell();
        };

        plugin.renderColumns = function () {
            console.log("renderColumns");

            var $thead = $("thead", plugin.$el);
            var tr = document.createElement("tr");
            _.each(plugin.columns, function (column, key) {
                var th = document.createElement("th");
                var div = document.createElement("div");

                $(div).text(column.name);
                th.appendChild(div);

                $(th).data("type", column.type || "string");
                $(th).data("editor", column.editor || "BasicEditor");

                tr.appendChild(th);
            });
            $thead.append(tr);
        };

        plugin.renderData = function () {
            console.log("renderData");

            var $tbody = $("tbody", plugin.$el);
            _.each(plugin.data, function (item, key) {
                var tr = document.createElement("tr");
                _.each(plugin.columns, function (column) {
                    var td = document.createElement("td");
                    var div = document.createElement("div");

                    if (_.has(item, column.name)) {
                        $(div).text(item[column.name]);    
                    }

                    $(td).data("column", column.name);
                    $(td).data("type", column.type || "string");
                    $(td).data("editor", column.editor || "BasicEditor");

                    td.appendChild(div);
                    tr.appendChild(td);
                });
                $tbody.append(tr);
            });
        };

        plugin.renderBaseTable = function () {
            console.log("renderBaseTable");

            var table = document.createElement("table");
            var thead = document.createElement("thead");
            var tbody = document.createElement("tbody");

            table.appendChild(thead);
            table.appendChild(tbody);
            table.className = plugin.config.tableClass;

            plugin.$el.html(table);
            plugin.$el.attr("tabindex", -1);
        };

        plugin.init = function (data, columns, options) {
            console.log("sensei grid init");
            plugin.config = $.extend({}, defaults, options);
            plugin.data = data;
            plugin.columns = columns;
            plugin.$el = $(this);
            plugin.editors = {};
            return plugin;
        };

        return plugin.init(data, columns, options);
    };
})(jQuery);
