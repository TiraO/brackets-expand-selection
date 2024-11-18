
define(function (require, exports, module) {
    //lodash is needed for acorn_loose to load.
    var _ = brackets.getModule("thirdparty/lodash");

    var jsParserLoose  = require("text!vendor/acorn/acorn_loose.js");
    var jsParser = require('vendor/acorn/acorn');
  window.acorn = require('vendor/acorn/acorn');
  var jplReal = require("vendor/acorn/acorn_loose");
    var jsWalker = require('vendor/acorn/walk');
  jsParser.banana = jsParserLoose;
  var wtf = {jpl: jsParserLoose, jp: jsParser};

    var EditorManager       = brackets.getModule("editor/EditorManager"),
        CommandManager      = brackets.getModule("command/CommandManager"),
        KeyBindingManager   = brackets.getModule("command/KeyBindingManager");

    var rejectedPromise = $.Deferred().reject().promise();
    var selectionHistory = [];
    var lastExpandedSelection = null;

    function expandSelection() {
        var editor = EditorManager.getFocusedEditor();
        if(!editor){
            return rejectedPromise;
        }
        
        var documentStart = { line:0, ch:0 };
        var selection = editor.getSelection();
        var document = editor.document;
        var absoluteSelectionStart = document.getRange(documentStart,selection.start).length;
        var absoluteSelectionEnd = document.getRange(documentStart, selection.end).length;

        var documentFullText = document.getText();
        
        var doesNodeExpandSelection = function(node){
            // the new selection should be at least one char larger than the old selection.
            return ((node.start < absoluteSelectionStart && node.end >= absoluteSelectionEnd) ||
                (node.start <= absoluteSelectionStart && node.end > absoluteSelectionEnd) );
        };
        //TODO: use acorn_loose.parse_dammit instead of acorn.parse
      console.log(wtf);
        try {
          debugger
          var parsedDocument = jsParser.parse(documentFullText, {preserveParens:true});
        } catch(e){
          debugger; 
        }
        var newSelectionNode = jsWalker.findNodeAround(parsedDocument, absoluteSelectionStart, function(nodeType, node){
            console.log(node);
            console.log(document.getText().substr(node.start, node.end));
            console.log(node.start, absoluteSelectionStart, node.end, absoluteSelectionEnd);
            if(doesNodeExpandSelection(node) ){
                return true;
            } else {
                return false;
            }
        });

        if(!newSelectionNode){
            return rejectedPromise;
        }
        
        newSelectionNode = newSelectionNode.node;
        var node = newSelectionNode;
        if(node.property && doesNodeExpandSelection(node.property)){
            newSelectionNode = node.property;
        }
        
        var linesToNewStart = documentFullText.substr(0, newSelectionNode.start).split('\n');
        var newSelectionStart = { line: linesToNewStart.length - 1, ch: _.last(linesToNewStart).length };
        
        var linesToNewEnd = documentFullText.substr(0, newSelectionNode.end).split('\n');
        var newSelectionEnd = { line: linesToNewEnd.length - 1, ch: _.last(linesToNewEnd).length };
        selectionHistory.push(selection);
        lastExpandedSelection = {start:newSelectionStart, end:newSelectionEnd, editor:editor};
        editor.setSelection(newSelectionStart, newSelectionEnd);
    }
    
    var doesSelectionContainSelection = function(first, second){
        if(first.start.line < second.start.line || (first.start.line == second.start.line && first.start.ch <= second.start.ch)){
            if(first.end.line > second.end.line || (first.end.line == second.end.line && first.end.ch >= second.end.ch)){
                return true;
            }
        }
        return false;
    }
    var isSameSelection = function(first, second){
        return first.start.line == second.start.line && 
            first.start.ch == second.start.ch && 
            first.end.line == second.end.line &&
            first.end.ch == second.end.ch;
    };
    function unexpandSelection(){
        var editor = EditorManager.getFocusedEditor();
        //TODO maintain history per editor, allow switching
        if(!editor || !lastExpandedSelection || lastExpandedSelection.editor != editor){
            selectionHistory = [];
            return rejectedPromise;
        }
        var unexpandedSelection = selectionHistory.pop();
        if(!unexpandedSelection || !doesSelectionContainSelection(editor.getSelection(), unexpandedSelection)){ 
            return rejectedPromise;
        }

        editor.setSelection(unexpandedSelection.start, unexpandedSelection.end);
    }

    CommandManager.register("Expand Selection", "tirao.expandselection.expand", expandSelection);
    CommandManager.register("Expand Selection", "tirao.expandselection.shrink", unexpandSelection);
    KeyBindingManager.removeBinding("Opt-Up");
    KeyBindingManager.addBinding("tirao.expandselection.expand", "Opt-Up");
    KeyBindingManager.removeBinding("Opt-Down");
    KeyBindingManager.addBinding("tirao.expandselection.shrink", "Opt-Down");
});