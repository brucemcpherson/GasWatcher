'use strict';
/**
 * Adds a custom menu with items to show the sidebar and dialog.
 *
 * @param {Object} e The event parameter for a simple onOpen trigger.
 */
function onOpen(e) {

  try {
    SpreadsheetApp.getUi()
    .createAddonMenu()
    .addItem('Watcher', 'showTest')
    .addToUi();
  }
  catch (err) {
    DocumentApp.getUi()
    .createAddonMenu()
    .addItem('Watcher', 'showTest')
    .addToUi();
  }
}

/**
 * Runs when the add-on is installed; calls onOpen() to ensure menu creation and
 * any other initializion work is done immediately.
 *
 * @param {Object} e The event parameter for a simple onInstall trigger.
 */
function onInstall(e) {
  onOpen(e);
}


/**
 * Opens a sidebar. 
 */
function showTest() {


  try {
      var ui = HtmlService.createTemplateFromFile('index.html')
      .evaluate()
      .setSandboxMode(HtmlService.SandboxMode.IFRAME)
      .setTitle('binder test');
    SpreadsheetApp.getUi().showSidebar(ui);
  }
  catch(err) {
      var ui = HtmlService.createTemplateFromFile('indexDoc.html')
      .evaluate()
      .setSandboxMode(HtmlService.SandboxMode.IFRAME)
      .setTitle('binder test');
    DocumentApp.getUi().showSidebar(ui);
  }
}



