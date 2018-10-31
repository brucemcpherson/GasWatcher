function addANamedRange() {
  var doc = DocumentApp.openById("1VidXqzAzuRHUMHDu9K_hSgA46UmOWPwFRcEzDEs1J8A");
  doc.addNamedRange("Watcher", doc.newRange().addElement(doc.getBody().getParagraphs()[2]).build());
}
